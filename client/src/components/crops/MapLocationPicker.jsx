import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

function LocationMarker({ position, onPositionChange }) {
  useMapEvents({
    click(e) {
      onPositionChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return position ? <Marker position={[position.lat, position.lng]} /> : null;
}

export default function MapLocationPicker({ onChange, initialPosition }) {
  const [position, setPosition] = useState(initialPosition || null);
  const [locating, setLocating] = useState(false);

  const handlePositionChange = (pos) => {
    setPosition(pos);
    onChange(pos);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        handlePositionChange(p);
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  const center = position
    ? [position.lat, position.lng]
    : [17.3850, 78.4867]; // Hyderabad default

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <MapPin size={14} className="text-green-600" />
          Pin Crop Location on Map
        </label>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="text-xs text-green-600 hover:text-green-700 font-medium"
        >
          {locating ? 'Locating...' : '📍 Use my location'}
        </button>
      </div>
      <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: '220px' }}>
        <MapContainer
          center={center}
          zoom={position ? 13 : 8}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} onPositionChange={handlePositionChange} />
        </MapContainer>
      </div>
      {position && (
        <p className="text-xs text-gray-500">
          📌 {position.lat.toFixed(5)}, {position.lng.toFixed(5)} — Click on the map to change
        </p>
      )}
      {!position && (
        <p className="text-xs text-gray-400">Click on the map to pin your crop location</p>
      )}
    </div>
  );
}
