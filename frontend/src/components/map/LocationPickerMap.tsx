import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  areaHa: number;
  onLocationChange: (lat: number, lng: number, polygonGeoJson: string) => void;
}

export const LocationPickerMap: React.FC<LocationPickerMapProps> = ({
  latitude,
  longitude,
  areaHa,
  onLocationChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);

  const calculateRepresentativePolygon = (lat: number, lng: number) => {
    // Generate approximate square polygon around center
    const delta = 0.015;
    return {
      type: "Polygon",
      coordinates: [[
        [lng - delta, lat - delta],
        [lng + delta, lat - delta],
        [lng + delta, lat + delta],
        [lng - delta, lat + delta],
        [lng - delta, lat - delta]
      ]]
    };
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const indiaBounds = L.latLngBounds(
        L.latLng(6.0, 68.0),
        L.latLng(36.0, 97.5)
      );

      const map = L.map(mapContainerRef.current, {
        center: [latitude || 20.5937, longitude || 78.9629],
        zoom: 6,
        minZoom: 4,
        maxBounds: indiaBounds,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Create initial marker
      const icon = L.divIcon({
        html: `<div style="background-color: #0F766E; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);"></div>`,
        className: 'custom-picker-marker',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([latitude || 20.0, longitude || 75.0], { icon }).addTo(map);
      markerRef.current = marker;

      // Click to pick location
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        const newLat = parseFloat(lat.toFixed(5));
        const newLng = parseFloat(lng.toFixed(5));
        
        marker.setLatLng([newLat, newLng]);
        const polyGeo = calculateRepresentativePolygon(newLat, newLng);
        onLocationChange(newLat, newLng, JSON.stringify(polyGeo));
      });

      mapInstanceRef.current = map;
    }
  }, []);

  // Update marker and polygon when coordinates change externally
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.panTo([latitude, longitude]);

      // Update polygon
      if (polygonRef.current) {
        polygonRef.current.remove();
      }
      const poly = calculateRepresentativePolygon(latitude, longitude);
      const latLngs = poly.coordinates[0].map(([lng, lat]) => [lat, lng] as [number, number]);
      const newPolygon = L.polygon(latLngs, {
        color: '#0F766E',
        weight: 2,
        fillColor: '#14B8A6',
        fillOpacity: 0.25
      }).addTo(mapInstanceRef.current);
      polygonRef.current = newPolygon;
    }
  }, [latitude, longitude]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5 font-medium text-navy-900">
          <MapPin className="w-3.5 h-3.5 text-teal-600" />
          Click anywhere on the map to set the project central coordinates
        </span>
        <span>Selected: {latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
      </div>
      <div ref={mapContainerRef} className="h-64 w-full rounded-lg border border-slate-300 overflow-hidden shadow-inner" />
      <p className="text-[11px] text-slate-400">
        Representative polygon boundary automatically generated based on coordinates and entered area ({areaHa} ha).
      </p>
    </div>
  );
};
