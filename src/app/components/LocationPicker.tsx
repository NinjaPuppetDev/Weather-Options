'use client';

import { useState } from 'react';

interface Location {
  name: string;
  latitude: string;
  longitude: string;
  emoji: string;
  description: string;
}

const POPULAR_LOCATIONS: Location[] = [
  { name: 'Medellín, Colombia', latitude: '6.25', longitude: '-75.56', emoji: '🌸', description: 'City of Eternal Spring' },
  { name: 'London, UK', latitude: '51.51', longitude: '-0.13', emoji: '☂️', description: 'Rainy City' },
  { name: 'Miami, USA', latitude: '25.76', longitude: '-80.19', emoji: '🌴', description: 'Hurricane Season' },
  { name: 'Mumbai, India', latitude: '19.08', longitude: '72.88', emoji: '🌧️', description: 'Monsoon Season' },
  { name: 'Sydney, Australia', latitude: '-33.87', longitude: '151.21', emoji: '☀️', description: 'Sunshine City' },
  { name: 'Tokyo, Japan', latitude: '35.68', longitude: '139.65', emoji: '🌸', description: 'Cherry Blossom Season' },
  { name: 'Amsterdam, Netherlands', latitude: '52.37', longitude: '4.90', emoji: '🌷', description: 'Rainy Spring' },
  { name: 'São Paulo, Brazil', latitude: '-23.55', longitude: '-46.63', emoji: '⛈️', description: 'Tropical Climate' },
];

interface LocationPickerProps {
  value: { latitude: string; longitude: string; name?: string };
  onChange: (location: { latitude: string; longitude: string; name?: string }) => void;
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const filteredLocations = POPULAR_LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectLocation = (location: Location) => {
    onChange({
      latitude: location.latitude,
      longitude: location.longitude,
      name: location.name,
    });
    setIsCustom(false);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search for a city or enter coordinates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 pl-12 rounded-2xl border-2 border-green-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-200 bg-white/80 backdrop-blur-sm"
        />
      </div>

      {/* Popular Locations Grid */}
      {!isCustom && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-green-800 flex items-center gap-2">
              <span className="text-lg">🌍</span>
              Popular Locations
            </h3>
            <button
              onClick={() => setIsCustom(true)}
              className="text-sm text-sky-600 hover:text-sky-700 font-medium transition-colors"
            >
              Enter custom coordinates →
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
            {filteredLocations.map((location) => {
              const isSelected = value.latitude === location.latitude && value.longitude === location.longitude;
              
              return (
                <button
                  key={location.name}
                  onClick={() => handleSelectLocation(location)}
                  className={`p-4 rounded-2xl text-left transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-br from-green-100 to-sky-100 border-2 border-green-400 shadow-lg'
                      : 'bg-white border-2 border-green-100 hover:border-green-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{location.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-green-900 truncate">
                        {location.name}
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">
                        {location.description}
                      </p>
                      <p className="text-xs text-green-500 mt-1 font-mono">
                        {location.latitude}°, {location.longitude}°
                      </p>
                    </div>
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          
          {filteredLocations.length === 0 && searchQuery && (
            <div className="text-center py-8 text-green-600">
              <p className="text-sm">No locations found matching "{searchQuery}"</p>
              <button
                onClick={() => setIsCustom(true)}
                className="mt-2 text-sm text-sky-600 hover:text-sky-700 font-medium"
              >
                Enter coordinates manually
              </button>
            </div>
          )}
        </div>
      )}

      {/* Custom Coordinates Input */}
      {isCustom && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-green-800 flex items-center gap-2">
              <span className="text-lg">📍</span>
              Custom Coordinates
            </h3>
            <button
              onClick={() => setIsCustom(false)}
              className="text-sm text-sky-600 hover:text-sky-700 font-medium transition-colors"
            >
              ← Back to locations
            </button>
          </div>

          <div className="p-4 bg-sky-50 rounded-2xl border border-sky-200">
            <p className="text-xs text-sky-800 mb-3">
              Enter the latitude and longitude for any location worldwide. You can find coordinates using Google Maps.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-green-700 mb-1.5">
                  Latitude
                </label>
                <input
                  type="text"
                  placeholder="e.g., 40.7128"
                  value={value.latitude}
                  onChange={(e) => onChange({ ...value, latitude: e.target.value, name: undefined })}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-green-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-200 bg-white/80 backdrop-blur-sm text-sm"
                />
                <p className="text-xs text-gray-600 mt-1">-90 to 90</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Longitude
                </label>
                <input
                  type="text"
                  placeholder="e.g., -74.0060"
                  value={value.longitude}
                  onChange={(e) => onChange({ ...value, longitude: e.target.value, name: undefined })}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-green-200 focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-200 bg-white/80 backdrop-blur-sm text-sm"
                />
                <p className="text-xs text-green-500 mt-1">-180 to 180</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Location Display */}
      {value.latitude && value.longitude && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-sky-50 border-2 border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {value.name || 'Custom Location'}
              </p>
              <p className="text-xs font-mono text-green-600">
                {value.latitude}°, {value.longitude}°
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}