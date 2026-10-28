/**
 * Distance (Haversine) & Transport Cost Estimator (Integration 8)
 * Env:
 *   TRANSPORT_RATE_PER_KM_PER_TONNE (default: 18 INR / km / tonne)
 *   TRANSPORT_MIN_CHARGE_INR (default: 350 INR)
 *   TRANSPORT_BOOKING_URL (default: https://porter.in/trucks)
 */

// Reference coordinates for major Indian agricultural districts (fallback when exact GPS is 0,0)
const DISTRICT_COORDS = {
  guntur: { lat: 16.3067, lng: 80.4365 },
  krishna: { lat: 16.5062, lng: 80.6480 },
  vijayawada: { lat: 16.5062, lng: 80.6480 },
  chittoor: { lat: 13.2172, lng: 79.1003 },
  anantapur: { lat: 14.6819, lng: 77.6006 },
  kadapa: { lat: 14.4673, lng: 78.8242 },
  kurnool: { lat: 15.8281, lng: 78.0373 },
  visakhapatnam: { lat: 17.6868, lng: 83.2185 },
  'east godavari': { lat: 16.9891, lng: 81.7840 },
  'west godavari': { lat: 16.7107, lng: 81.0952 },
  nellore: { lat: 14.4426, lng: 79.9865 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  rangareddy: { lat: 17.3000, lng: 78.4000 },
  warangal: { lat: 17.9689, lng: 79.5941 },
  nizamabad: { lat: 18.6725, lng: 78.0941 },
  karimnagar: { lat: 18.4386, lng: 79.1288 },
  khammam: { lat: 17.2473, lng: 80.1514 },
  nalgonda: { lat: 17.0575, lng: 79.2684 },
  nashik: { lat: 19.9975, lng: 73.7898 },
  pune: { lat: 18.5204, lng: 73.8567 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  indore: { lat: 22.7196, lng: 75.8577 },
  agra: { lat: 27.1767, lng: 78.0081 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  chennai: { lat: 13.0827, lng: 80.2707 }
};

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine distance in kilometers between two { lat, lng } coordinates.
 */
function haversineDistanceKm(coord1, coord2) {
  if (
    !coord1 ||
    !coord2 ||
    typeof coord1.lat !== 'number' ||
    typeof coord1.lng !== 'number' ||
    typeof coord2.lat !== 'number' ||
    typeof coord2.lng !== 'number'
  ) {
    return null;
  }

  const R = 6371; // Earth radius in km
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLng = toRad(coord2.lng - coord1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.lat)) *
      Math.cos(toRad(coord2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Resolves coordinates from explicit { lat, lng }, GeoJSON [lng, lat], or district/address string.
 */
function resolveCoordinates({ lat, lng, geoLocation, district, address, state } = {}) {
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  if (!Number.isNaN(numLat) && !Number.isNaN(numLng) && (numLat !== 0 || numLng !== 0)) {
    return { lat: numLat, lng: numLng, source: 'gps' };
  }

  if (
    geoLocation &&
    Array.isArray(geoLocation.coordinates) &&
    geoLocation.coordinates.length === 2
  ) {
    const [gLng, gLat] = geoLocation.coordinates;
    if ((gLat !== 0 || gLng !== 0) && !Number.isNaN(gLat) && !Number.isNaN(gLng)) {
      return { lat: Number(gLat), lng: Number(gLng), source: 'crop_gps' };
    }
  }

  const searchStr = `${district || ''} ${address || ''} ${state || ''}`.toLowerCase();
  for (const [key, coords] of Object.entries(DISTRICT_COORDS)) {
    if (searchStr.includes(key)) {
      return { ...coords, source: `district (${key})` };
    }
  }

  return null;
}

/**
 * Converts quantity + unit into tonnes for transport rate calculation.
 */
function convertToTonnes(quantity = 1, unit = 'kg') {
  const qty = Math.max(0.001, Number(quantity) || 1);
  const u = (unit || 'kg').toLowerCase();
  if (u === 'ton' || u === 'tonne') return qty;
  if (u === 'quintal') return qty * 0.1;
  if (u === 'kg' || u === 'litre') return qty * 0.001;
  // dozen / piece rough weight
  return qty * 0.002;
}

/**
 * Computes distance and rough transport cost between farmer and buyer.
 */
function estimateTransport({
  farmerCoords,
  buyerCoords,
  quantity = 100,
  unit = 'kg'
}) {
  const ratePerKmPerTonne =
    parseFloat(process.env.TRANSPORT_RATE_PER_KM_PER_TONNE) || 18;
  const minCharge = parseFloat(process.env.TRANSPORT_MIN_CHARGE_INR) || 350;
  const bookingUrl = (
    process.env.TRANSPORT_BOOKING_URL || 'https://porter.in/trucks'
  ).trim();

  const distanceKm = haversineDistanceKm(farmerCoords, buyerCoords);
  const weightTonnes = convertToTonnes(quantity, unit);
  // Apply a minimum billable weight of 0.25 tonne (mini-truck / LCV share)
  const billableTonnes = Math.max(0.25, weightTonnes);

  if (distanceKm === null) {
    return {
      available: false,
      distanceKm: null,
      weightTonnes: Number(weightTonnes.toFixed(3)),
      ratePerKmPerTonne,
      estimatedCost: null,
      bookingUrl,
      note: 'Enter a known district or allow GPS location to calculate exact distance.'
    };
  }

  const rawCost = distanceKm * billableTonnes * ratePerKmPerTonne;
  const estimatedCost = Math.max(minCharge, Math.round(rawCost));

  return {
    available: true,
    distanceKm,
    weightTonnes: Number(weightTonnes.toFixed(3)),
    billableTonnes: Number(billableTonnes.toFixed(2)),
    ratePerKmPerTonne,
    minCharge,
    estimatedCost,
    bookingUrl,
    note: `Rough estimate at ₹${ratePerKmPerTonne}/km/tonne (min ₹${minCharge}). Settled directly with transporter.`
  };
}

module.exports = {
  haversineDistanceKm,
  resolveCoordinates,
  convertToTonnes,
  estimateTransport
};

