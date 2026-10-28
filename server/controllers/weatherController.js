/**
 * Weather & Rain Alert Controller (Integration 12)
 * Uses OpenWeather API (OPENWEATHER_API_KEY), cached for 30 minutes,
 * with graceful fallback and automatic rain alert notification for farmers.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createNotification } = require('../utils/notificationHelper');

const weatherCache = new Map();
const WEATHER_TTL_MS = 30 * 60 * 1000; // 30 minutes
const rainAlertCooldown = new Map(); // userId -> expiresAt

function isRealKey(val) {
  if (!val || typeof val !== 'string') return false;
  const t = val.trim();
  return t.length > 0 && !t.startsWith('your_') && t !== 'DEMO_KEY';
}

function buildFallbackWeather(locationName = 'Guntur, IN') {
  const nowSec = Math.floor(Date.now() / 1000);
  const daySec = 86400;
  return {
    source: 'sample',
    current: {
      name: locationName.replace(/,IN$/i, ''),
      main: { temp: 31, feels_like: 33, humidity: 64 },
      wind: { speed: 3.4 },
      weather: [{ main: 'Clouds', description: 'partly cloudy (sample forecast)', icon: '02d' }]
    },
    forecast: [
      { dt: nowSec + daySec * 1, main: { temp: 31 }, weather: [{ main: 'Clouds', icon: '02d', description: 'scattered clouds' }] },
      { dt: nowSec + daySec * 2, main: { temp: 30 }, weather: [{ main: 'Rain', icon: '10d', description: 'light rain showers' }] },
      { dt: nowSec + daySec * 3, main: { temp: 29 }, weather: [{ main: 'Clouds', icon: '03d', description: 'broken clouds' }] },
      { dt: nowSec + daySec * 4, main: { temp: 32 }, weather: [{ main: 'Clear', icon: '01d', description: 'clear sky' }] },
      { dt: nowSec + daySec * 5, main: { temp: 32 }, weather: [{ main: 'Clear', icon: '01d', description: 'sunny' }] }
    ],
    rainAlert: {
      willRain: true,
      advisory:
        'Light rain showers expected within 48 hours. Cover harvested produce on drying floors and postpone foliar pesticide sprays.'
    }
  };
}

function groupForecastByDay(list = []) {
  const days = {};
  for (const item of list) {
    const date = new Date(item.dt * 1000);
    const key = date.toDateString();
    if (
      !days[key] ||
      Math.abs(date.getHours() - 12) <
        Math.abs(new Date(days[key].dt * 1000).getHours() - 12)
    ) {
      days[key] = item;
    }
  }
  return Object.values(days).slice(0, 5);
}

/**
 * @desc    Get current weather, 5-day forecast & rain alert (cached 30 min)
 * @route   GET /api/weather?district=&state=&lat=&lon=
 * @access  Public (triggers rain alert notification if authenticated farmer)
 */
const getWeather = async (req, res, next) => {
  try {
    const { district = '', state = '', lat, lon } = req.query;
    const queryStr = [district, state].filter(Boolean).join(', ') || 'Guntur, Andhra Pradesh';
    const cacheKey = lat && lon ? `coords:${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}` : `city:${queryStr.toLowerCase()}`;

    let weatherData = null;
    const cached = weatherCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      weatherData = { ...cached.data, cached: true };
    } else {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (isRealKey(apiKey)) {
        try {
          const qParam =
            lat && lon
              ? `lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
              : `q=${encodeURIComponent(`${district || state || 'Hyderabad'},IN`)}`;

          const [currRes, foreRes] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?${qParam}&units=metric&appid=${apiKey.trim()}`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?${qParam}&units=metric&appid=${apiKey.trim()}`)
          ]);

          if (currRes.ok && foreRes.ok) {
            const curr = await currRes.json();
            const fore = await foreRes.json();
            const daily = groupForecastByDay(fore.list || []);

            const rainDetected =
              ['Rain', 'Drizzle', 'Thunderstorm'].includes(curr.weather?.[0]?.main) ||
              daily.slice(0, 2).some((d) =>
                ['Rain', 'Drizzle', 'Thunderstorm'].includes(d.weather?.[0]?.main)
              );

            weatherData = {
              source: 'openweather',
              current: curr,
              forecast: daily,
              rainAlert: {
                willRain: rainDetected,
                advisory: rainDetected
                  ? `Rain or thunderstorm forecast in ${curr.name || queryStr}. Protect harvested grain/spices with tarpaulins and pause chemical spraying.`
                  : 'Clear/dry conditions expected over the next 48 hours — suitable for harvesting and transport.'
              }
            };
          }
        } catch (err) {
          console.warn('[Weather] OpenWeather API fallback to sample:', err.message);
        }
      }

      if (!weatherData) {
        weatherData = buildFallbackWeather(district || state || 'Guntur');
      }

      weatherCache.set(cacheKey, {
        data: weatherData,
        expiresAt: Date.now() + WEATHER_TTL_MS
      });
    }

    // Optional Rain Alert Notification for logged-in farmer (max once per 12h)
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token && weatherData.rainAlert?.willRain) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const cooldownUntil = rainAlertCooldown.get(decoded.id) || 0;
        if (Date.now() > cooldownUntil) {
          const u = await User.findById(decoded.id).select('role');
          if (u && u.role === 'farmer') {
            rainAlertCooldown.set(decoded.id, Date.now() + 12 * 3600 * 1000);
            await createNotification({
              userId: decoded.id,
              type: 'weather_alert',
              title: 'Weather Advisory: Rain Expected 🌧️',
              message: weatherData.rainAlert.advisory,
              link: '/farmer/dashboard'
            });
          }
        }
      } catch {
        // ignore invalid token
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Weather data loaded',
      data: weatherData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWeather
};

