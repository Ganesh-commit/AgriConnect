/**
 * Mandi Price, Trend Forecast & AI Price Insight Service (Integration 5)
 * - Integrates Agmarknet / data.gov.in API (DATA_GOV_API_KEY, DATA_GOV_RESOURCE_ID)
 * - Caches responses for 6 hours
 * - Falls back gracefully to server/data/samplePrices.json
 * - Computes 7-day linear-regression / moving-average price projection
 * - Generates LLM price insight strictly grounded in the 30-day data
 */

const fs = require('fs');
const path = require('path');
const llm = require('../services/llm');

const mandiCache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

const DEFAULT_RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';

function loadSamplePrices() {
  try {
    const filePath = path.join(__dirname, '..', 'data', 'samplePrices.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { commodities: [] };
  }
}

function isRealApiKey(key) {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  return trimmed.length > 0 && !trimmed.startsWith('your_');
}

/**
 * Generates ISO date strings (YYYY-MM-DD) for the past `n` days ending today.
 */
function buildPastDates(n) {
  const dates = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * Generates future ISO date strings (YYYY-MM-DD) starting tomorrow for `n` days.
 */
function buildFutureDates(n) {
  const dates = [];
  const today = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/**
 * Matches a crop/state/district in samplePrices.json and builds a `days`-long time series.
 */
function getSampleSeries(cropName = 'Wheat', state = '', district = '', days = 30) {
  const dataset = loadSamplePrices();
  const list = dataset.commodities || [];
  const cleanCrop = (cropName || 'Wheat').trim().toLowerCase();
  const cleanState = (state || '').trim().toLowerCase();
  const cleanDistrict = (district || '').trim().toLowerCase();

  let match = list.find(
    (item) =>
      (cleanCrop.includes(item.crop.toLowerCase()) ||
        item.crop.toLowerCase().includes(cleanCrop)) &&
      (!cleanState || item.state.toLowerCase().includes(cleanState))
  );

  if (!match) {
    match = list.find(
      (item) =>
        cleanCrop.includes(item.crop.toLowerCase()) ||
        item.crop.toLowerCase().includes(cleanCrop)
    );
  }

  if (!match) {
    match = list[0] || {
      crop: cropName || 'Wheat',
      state: state || 'Andhra Pradesh',
      district: district || 'Guntur',
      market: 'Local APMC Mandi',
      dailyPrices: Array.from({ length: 30 }, (_, i) => 2200 + i * 10)
    };
  }

  const rawPrices = match.dailyPrices || [];
  const count = Math.min(Math.max(Number(days) || 30, 5), 60);
  const dates = buildPastDates(count);

  const prices = dates.map((date, idx) => {
    const sampleIdx = idx % rawPrices.length;
    return {
      date,
      price: rawPrices[sampleIdx],
      market: match.market,
      district: district || match.district,
      state: state || match.state
    };
  });

  return {
    crop: match.crop,
    state: state || match.state,
    district: district || match.district,
    market: match.market,
    unit: 'INR/quintal',
    prices
  };
}

/**
 * Fetch real mandi records from data.gov.in Agmarknet API when DATA_GOV_API_KEY is configured.
 */
async function fetchFromDataGovIn(cropName, state = '', district = '', days = 30) {
  const apiKey = process.env.DATA_GOV_API_KEY;
  if (!isRealApiKey(apiKey)) return null;

  const resourceId = (process.env.DATA_GOV_RESOURCE_ID || DEFAULT_RESOURCE_ID).trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const url = new URL(`https://api.data.gov.in/resource/${encodeURIComponent(resourceId)}`);
    url.searchParams.set('api-key', apiKey.trim());
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '200');
    if (cropName) url.searchParams.set('filters[commodity]', cropName);
    if (state) url.searchParams.set('filters[state]', state);
    if (district) url.searchParams.set('filters[district]', district);

    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) return null;

    const result = await response.json();
    if (!Array.isArray(result.records) || result.records.length === 0) return null;

    const byDate = {};
    let resolvedMarket = '';
    let resolvedState = state;
    let resolvedDistrict = district;

    for (const rec of result.records) {
      const rawDate = rec.arrival_date || rec.date;
      const modalPrice = parseFloat(rec.modal_price || rec.price || 0);
      if (!rawDate || !modalPrice) continue;

      // Normalize DD/MM/YYYY if needed
      let isoDate = rawDate;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
        const [dd, mm, yyyy] = rawDate.split('/');
        isoDate = `${yyyy}-${mm}-${dd}`;
      }

      if (!byDate[isoDate]) byDate[isoDate] = [];
      byDate[isoDate].push(modalPrice);
      if (!resolvedMarket && rec.market) resolvedMarket = rec.market;
      if (!resolvedState && rec.state) resolvedState = rec.state;
      if (!resolvedDistrict && rec.district) resolvedDistrict = rec.district;
    }

    const sorted = Object.entries(byDate)
      .map(([date, vals]) => ({
        date,
        price: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
        market: resolvedMarket || 'Agmarknet APMC',
        district: resolvedDistrict,
        state: resolvedState
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-days);

    if (sorted.length === 0) return null;

    return {
      crop: cropName,
      state: resolvedState,
      district: resolvedDistrict,
      market: resolvedMarket || 'Agmarknet APMC',
      unit: 'INR/quintal',
      prices: sorted
    };
  } catch (err) {
    console.warn('[MandiService] Agmarknet API fallback to samplePrices.json:', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Simple Linear Regression + Moving Average Forecast in Node (no heavy ML)
 * Returns 7-day projected points [{ date, forecastPrice }] and slope statistics.
 */
function computePriceForecast(prices = [], forecastDays = 7) {
  if (!Array.isArray(prices) || prices.length < 2) {
    return { forecast: [], slopePerDay: 0, trendDirection: 'stable', changePercent: 0 };
  }

  const n = prices.length;
  const y = prices.map((p) => Number(p.price) || 0);

  // Ordinary Least Squares (OLS) linear regression: y = a + b*x
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += y[i];
    sumXY += i * y[i];
    sumXX += i * i;
  }

  const denom = n * sumXX - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  // Recent 5-day moving average for smoothing
  const windowSize = Math.min(5, n);
  const recentAvg =
    y.slice(-windowSize).reduce((acc, v) => acc + v, 0) / windowSize;

  const futureDates = buildFutureDates(forecastDays);
  const forecast = futureDates.map((date, idx) => {
    const x = n + idx;
    const regVal = intercept + slope * x;
    // Blend 70% linear regression + 30% recent moving average drift
    const blended = Math.max(100, Math.round(0.7 * regVal + 0.3 * (recentAvg + slope * (idx + 1))));
    return {
      date,
      forecastPrice: blended
    };
  });

  const firstPrice = y[0] || 1;
  const lastPrice = y[n - 1] || 1;
  const changePercent = Number((((lastPrice - firstPrice) / firstPrice) * 100).toFixed(1));

  let trendDirection = 'stable';
  if (changePercent >= 2.5) trendDirection = 'rising';
  else if (changePercent <= -2.5) trendDirection = 'falling';

  return {
    forecast,
    slopePerDay: Number(slope.toFixed(2)),
    trendDirection,
    changePercent,
    minPrice: Math.min(...y),
    maxPrice: Math.max(...y),
    avgPrice: Math.round(sumY / n),
    latestPrice: lastPrice,
    suggestedPricePerKg: Math.max(1, Math.round(lastPrice / 100))
  };
}

/**
 * Generates an AI Insight strictly summarizing the 30-day price dataset.
 * Never invents numbers; falls back to statistical summary if LLM is offline.
 */
async function generatePriceInsight({ crop, state, district, prices, stats }) {
  const deterministicInsight = () => {
    const dir = stats.trendDirection;
    const pct = stats.changePercent;
    const sign = pct > 0 ? `+${pct}%` : `${pct}%`;

    let sellHint =
      'Prices are relatively steady. Selling in staggered lots can help manage mandi fluctuations.';
    if (dir === 'rising') {
      sellHint =
        'Prices have been trending upward over this period. If your produce can be stored safely without quality loss, current mandi momentum is favourable.';
    } else if (dir === 'falling') {
      sellHint =
        'Prices have softened recently. Consider selling perishable stock promptly or checking nearby district mandis for better rates.';
    }

    return {
      trend: dir,
      summary: `Over the last ${prices.length} days in ${district || state || 'the region'}, ${crop} traded between ₹${stats.minPrice} and ₹${stats.maxPrice}/quintal (average ₹${stats.avgPrice}/quintal), with an overall change of ${sign} and latest modal price at ₹${stats.latestPrice}/quintal.`,
      sellHint,
      disclaimer: 'Not financial advice. AI replies are suggestions and may be imperfect.'
    };
  };

  const insightSchema = llm.z.object({
    trend: llm.z.enum(['rising', 'falling', 'stable']),
    summary: llm.z.string(),
    sellHint: llm.z.string()
  });

  const compactSeries = prices.map((p) => `${p.date}: ₹${p.price}`).join(', ');
  const prompt = `Analyze the following verified Agmarknet mandi price series for "${crop}" (${state || 'India'}):
Data points (${prices.length} days, in INR/quintal): ${compactSeries}
Computed stats: Min=₹${stats.minPrice}, Max=₹${stats.maxPrice}, Average=₹${stats.avgPrice}, Latest=₹${stats.latestPrice}, 30-day change=${stats.changePercent}%, Trend=${stats.trendDirection}.

Rules:
1. You may ONLY summarize the exact numbers given above. NEVER invent or extrapolate numbers not present in the data.
2. Return JSON with:
   - "trend": "${stats.trendDirection}" ("rising" | "falling" | "stable")
   - "summary": 1-2 short sentences summarizing the price movement using only the provided figures.
   - "sellHint": A practical 1-sentence "good time to sell?" hint for the farmer without giving financial guarantees.`;

  try {
    const res = await llm.json({
      prompt,
      schema: insightSchema,
      system:
        'You are an agricultural market analyst for Indian farmers. Summarize only the provided mandi numbers accurately. Never invent prices.',
      temperature: 0.1,
      useCache: true,
      cacheTtlSeconds: 6 * 3600,
      mockFallback: deterministicInsight
    });

    return {
      ...res.data,
      disclaimer: 'Not financial advice. AI replies are suggestions and may be imperfect.',
      meta: res.meta
    };
  } catch {
    return {
      ...deterministicInsight(),
      meta: { provider: 'statistical-fallback', model: 'ols-regression', latencyMs: 1 }
    };
  }
}

/**
 * Full 30-day trend + forecast + AI insight
 */
async function getPriceTrend({ crop = 'Wheat', state = '', district = '', days = 30 }) {
  const numDays = Math.min(Math.max(parseInt(days, 10) || 30, 7), 60);
  const cacheKey = `trend_${crop.toLowerCase()}_${state.toLowerCase()}_${district.toLowerCase()}_${numDays}`;

  let baseSeries = null;
  let source = 'api';

  const cached = mandiCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    baseSeries = cached.data;
    source = `${cached.source} (cached)`;
  } else {
    const apiData = await fetchFromDataGovIn(crop, state, district, numDays);
    if (apiData && apiData.prices.length > 0) {
      baseSeries = apiData;
      source = 'agmarknet-api';
    } else {
      baseSeries = getSampleSeries(crop, state, district, numDays);
      source = 'sample';
    }
    mandiCache.set(cacheKey, {
      data: baseSeries,
      source,
      expiresAt: Date.now() + CACHE_TTL
    });
  }

  const stats = computePriceForecast(baseSeries.prices, 7);
  const insight = await generatePriceInsight({
    crop: baseSeries.crop,
    state: baseSeries.state,
    district: baseSeries.district,
    prices: baseSeries.prices,
    stats
  });

  // Merge historical + forecast series for Recharts (historical has `price`, forecast has `forecastPrice`, bridge point has both)
  const chartSeries = baseSeries.prices.map((pt, idx) => {
    const isLast = idx === baseSeries.prices.length - 1;
    return {
      date: pt.date,
      price: pt.price,
      ...(isLast ? { forecastPrice: pt.price } : {})
    };
  });

  for (const f of stats.forecast) {
    chartSeries.push({
      date: f.date,
      price: null,
      forecastPrice: f.forecastPrice
    });
  }

  return {
    crop: baseSeries.crop,
    state: baseSeries.state,
    district: baseSeries.district,
    market: baseSeries.market,
    unit: baseSeries.unit,
    source,
    latestPrice: stats.latestPrice,
    suggestedPricePerKg: stats.suggestedPricePerKg,
    minPrice: stats.minPrice,
    maxPrice: stats.maxPrice,
    avgPrice: stats.avgPrice,
    changePercent: stats.changePercent,
    trendDirection: stats.trendDirection,
    prices: baseSeries.prices,
    forecast: stats.forecast,
    chartSeries,
    insight
  };
}

/**
 * Backward-compatible getMandiPrice(cropName, state, district)
 */
async function getMandiPrice(cropName = 'Wheat', state = '', district = '') {
  const trend = await getPriceTrend({ crop: cropName, state, district, days: 30 });
  return {
    crop: trend.crop,
    state: trend.state,
    district: trend.district,
    market: trend.market,
    unit: trend.unit,
    source: trend.source,
    latestPrice: trend.latestPrice,
    suggestedPricePerKg: trend.suggestedPricePerKg,
    changePercent: trend.changePercent,
    trendDirection: trend.trendDirection,
    prices: trend.prices,
    forecast: trend.forecast,
    chartSeries: trend.chartSeries,
    insight: trend.insight
  };
}

module.exports = {
  getMandiPrice,
  getPriceTrend,
  computePriceForecast
};
