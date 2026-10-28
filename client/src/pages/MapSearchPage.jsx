import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cropService } from '../services/api';
import { MapPin, Filter, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

// Fix leaflet default icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const farmerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component that updates map center when userLocation changes
function MapUpdater({ center }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

const RADII = [10, 25, 50, 100];
const CATEGORIES = ['All', 'Vegetables', 'Fruits', 'Grains', 'Pulses', 'Spices', 'Others'];

export default function MapSearchPage() {
  const [userLocation, setUserLocation] = useState(null);
  const [crops, setCrops] = useState([]);
  const [radius, setRadius] = useState(50);
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [locating, setLocating] = useState(false);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setGeoError('Unable to detect location. Please allow location access.');
        setLocating(false);
        // Default to India center
        setUserLocation({ lat: 20.5937, lng: 78.9629 });
      }
    );
  };

  useEffect(() => {
    detectLocation();
  }, []);

  useEffect(() => {
    if (userLocation) fetchNearbyCrops();
  }, [userLocation, radius, category]);

  const fetchNearbyCrops = async () => {
    if (!userLocation) return;
    setLoading(true);
    try {
      const res = await cropService.getNearbyCrops({
        lat: userLocation.lat,
        lng: userLocation.lng,
        radius,
        category: category !== 'All' ? category : undefined
      });
      setCrops(res.data.data.crops || []);
    } catch {
      setCrops([]);
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [20.5937, 78.9629];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <MapPin className="text-green-600" size={28} /> Map-Based Crop Search
        </h1>
        <p className="text-gray-500 text-sm mb-6">Find crops near you from local farmers</p>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 flex flex-wrap items-center gap-4">
          {/* Radius */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-green-600" />
            <span className="text-sm font-medium text-gray-700">Radius:</span>
            <div className="flex gap-1">
              {RADII.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all
                    ${radius === r
                      ? 'bg-green-600 text-white shadow'
                      : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                    }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>
          {/* Category */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Category:</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-green-300 bg-white"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {/* Detect location button */}
          <button
            onClick={detectLocation}
            disabled={locating}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-all disabled:opacity-60"
          >
            {locating ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
            {locating ? 'Locating...' : 'Use My Location'}
          </button>
        </div>

        {geoError && (
          <div className="mb-4 flex items-center gap-2 bg-amber-50 text-amber-700 text-sm px-4 py-2 rounded-xl border border-amber-200">
            <AlertCircle size={16} /> {geoError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden shadow-lg border border-gray-200" style={{ height: '500px' }}>
            <MapContainer
              center={mapCenter}
              zoom={10}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapUpdater center={userLocation ? [userLocation.lat, userLocation.lng] : null} />

              {/* User location marker */}
              {userLocation && (
                <>
                  <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                    <Popup><strong>Your Location</strong></Popup>
                  </Marker>
                  <Circle
                    center={[userLocation.lat, userLocation.lng]}
                    radius={radius * 1000}
                    pathOptions={{ color: 'green', fillColor: 'green', fillOpacity: 0.05, weight: 1 }}
                  />
                </>
              )}

              {/* Crop markers */}
              {crops.map((crop) => {
                const [lng, lat] = crop.geoLocation?.coordinates || [0, 0];
                if (!lat || !lng) return null;
                return (
                  <Marker key={crop._id} position={[lat, lng]} icon={farmerIcon}>
                    <Popup>
                      <div className="text-sm">
                        <strong>{crop.name}</strong><br />
                        <span className="text-gray-500">{crop.category}</span><br />
                        ₹{crop.pricePerUnit}/{crop.unit}<br />
                        {crop.quantity} {crop.unit} available<br />
                        <span className="text-gray-400">Distance: {Math.round((crop.distance || 0) / 100) / 10} km</span>
                        <br />
                        <a href={`/crops/${crop._id}`} className="text-green-600 font-medium hover:underline mt-1 inline-block">
                          View Details →
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Crop List */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-y-auto" style={{ height: '500px' }}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">
                {loading ? 'Searching...' : `${crops.length} Crops Found`}
              </h3>
              {loading && <Loader2 size={16} className="animate-spin text-green-500" />}
            </div>
            <div className="divide-y divide-gray-50">
              {crops.length === 0 && !loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm gap-2">
                  <MapPin size={36} className="text-gray-200" />
                  <p>No crops found in this area</p>
                  <p className="text-xs text-gray-300">Try increasing the radius</p>
                </div>
              ) : (
                crops.map((crop) => (
                  <Link
                    key={crop._id}
                    to={`/crops/${crop._id}`}
                    className="flex items-center gap-3 p-4 hover:bg-green-50 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-green-100 flex-shrink-0">
                      {crop.images?.[0] ? (
                        <img src={crop.images[0]} alt={crop.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🌾</div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{crop.name}</p>
                      <p className="text-xs text-gray-500">{crop.category} • ₹{crop.pricePerUnit}/{crop.unit}</p>
                      <p className="text-xs text-green-600 mt-0.5">
                        📍 {Math.round((crop.distance || 0) / 100) / 10} km away
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
