import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { api } from '../../api';
import { StatusBadge } from '../common/StatusBadge';
import { Filter, Layers, Info } from 'lucide-react';

interface ProjectMapProps {
  onSelectProject?: (projectId: number) => void;
  heightClass?: string;
}

export const ProjectMap: React.FC<ProjectMapProps> = ({
  onSelectProject,
  heightClass = 'h-[540px]'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [ecosystemFilter, setEcosystemFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map centered on India
      const indiaBounds = L.latLngBounds(
        L.latLng(6.0, 68.0),   // SW (Kanyakumari / Lakshadweep / Arabian Sea)
        L.latLng(36.0, 97.5)  // NE (Himalayas / Bay of Bengal)
      );

      const map = L.map(mapContainerRef.current, {
        center: [20.5937, 78.9629],
        zoom: 5,
        minZoom: 4,
        maxBounds: indiaBounds,
        zoomControl: true,
      });

      map.fitBounds(indiaBounds, { padding: [15, 15] });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    // Load GeoJSON data
    const loadData = async () => {
      setIsLoading(true);
      try {
        const geojson = await api.getMapGeoJSON(ecosystemFilter, statusFilter);
        if (layerGroupRef.current && mapInstanceRef.current) {
          layerGroupRef.current.clearLayers();

          const markers: L.Marker[] = [];

          geojson.features.forEach((feat: any) => {
            const props = feat.properties;
            const geom = feat.geometry;

            if (props.featureType === 'marker' && geom.type === 'Point') {
              const [lng, lat] = geom.coordinates;
              const color = props.color || '#0F766E';

              // Create custom pulsing SVG marker
              const iconHtml = `
                <div style="background-color: ${color}; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
                  <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
                </div>
              `;

              const customIcon = L.divIcon({
                html: iconHtml,
                className: 'custom-leaflet-marker',
                iconSize: [28, 28],
                iconAnchor: [14, 14],
                popupAnchor: [0, -14],
              });

              const marker = L.marker([lat, lng], { icon: customIcon });

              // Construct popup content
              const popupContent = document.createElement('div');
              popupContent.className = 'p-1 text-slate-800 text-xs font-sans';
              popupContent.innerHTML = `
                <div style="font-weight: 700; font-size: 13px; color: #0B192C; margin-bottom: 4px;">
                  ${props.name}
                </div>
                <div style="color: #64748B; margin-bottom: 6px;">
                  ${props.site_name}, ${props.region}, ${props.country}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #F8FAFC; padding: 6px; border-radius: 6px; margin-bottom: 8px; border: 1px solid #E2E8F0;">
                  <div>
                    <div style="font-size: 10px; color: #64748B;">Total Area:</div>
                    <div style="font-weight: 600; color: #0F766E;">${(props.total_area_ha ?? 0).toLocaleString()} ha</div>
                  </div>
                  <div>
                    <div style="font-size: 10px; color: #64748B;">Status:</div>
                    <div style="font-weight: 600; color: #0B192C;">${props.status ?? 'Unknown'}</div>
                  </div>
                </div>
                <div style="margin-bottom: 8px;">
                  <span style="font-size: 10px; color: #64748B;">Est. Net Removals:</span>
                  <span style="font-weight: 700; color: #15803D;"> ${(props.net_tco2e ?? 0).toLocaleString()} tCO₂e</span>
                </div>
                <button id="view-proj-${props.id}" style="width: 100%; background: #0F766E; color: white; border: none; padding: 5px 8px; border-radius: 4px; font-weight: 600; cursor: pointer;">
                  View Project Records →
                </button>
              `;

              marker.bindPopup(popupContent);
              marker.on('popupopen', () => {
                const btn = document.getElementById(`view-proj-${props.id}`);
                if (btn && onSelectProject) {
                  btn.onclick = () => onSelectProject(props.id);
                }
              });

              layerGroupRef.current?.addLayer(marker);
              markers.push(marker);
            } else if (props.featureType === 'boundary' && geom.type === 'Polygon') {
              // Add polygon boundary
              const polyLayer = L.geoJSON(feat, {
                style: {
                  color: props.color || '#0F766E',
                  weight: 2,
                  opacity: 0.8,
                  fillColor: props.color || '#0F766E',
                  fillOpacity: 0.25,
                },
              });
              polyLayer.bindTooltip(`${props.name} (${props.area_ha} ha)`, { sticky: true });
              layerGroupRef.current?.addLayer(polyLayer);
            }
          });
        }
      } catch (err) {
        console.error('Failed to load map data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [ecosystemFilter, statusFilter]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Map Filter Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-700" />
          <span className="font-bold text-navy-900">India National Blue Carbon Geospatial Map</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">Coastal Maritime States (OpenStreetMap)</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Ecosystem Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Ecosystem:</span>
            <select
              value={ecosystemFilter}
              onChange={(e) => setEcosystemFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-navy-900 font-medium focus:ring-1 focus:ring-teal-500"
            >
              <option value="All">All Ecosystems</option>
              <option value="Mangrove restoration">Mangrove restoration</option>
              <option value="Seagrass conservation or restoration">Seagrass conservation</option>
              <option value="Tidal wetland conservation or restoration">Tidal wetland</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-navy-900 font-medium focus:ring-1 focus:ring-teal-500"
            >
              <option value="All">All Statuses</option>
              <option value="Verified">Verified</option>
              <option value="Active Monitoring">Active Monitoring</option>
              <option value="Admin Approved">Admin Approved</option>
              <option value="Submitted">Submitted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative">
        <div ref={mapContainerRef} className={`${heightClass} w-full`} />
        
        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-lg p-2.5 shadow-lg text-[11px] space-y-1.5 pointer-events-auto">
          <p className="font-bold text-navy-900 uppercase tracking-wider text-[10px]">Ecosystem Legend</p>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white"></span>
            <span className="text-slate-700">Mangrove Restoration</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-sky-600 border border-white"></span>
            <span className="text-slate-700">Seagrass Conservation</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-600 border border-white"></span>
            <span className="text-slate-700">Tidal Wetland</span>
          </div>
          <div className="pt-1 border-t border-slate-100 flex items-center gap-2">
            <span className="w-3 h-1.5 bg-teal-500/40 border border-teal-600"></span>
            <span className="text-slate-500">Polygon Boundary</span>
          </div>
        </div>

        {/* Disclaimer Note */}
        <div className="absolute top-3 right-3 z-20 bg-navy-900/90 text-white backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-[10px] max-w-xs shadow">
          <div className="flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
            <span>Demonstration project locations with OpenStreetMap tiles. Real-time satellite validation requires live orbital radar/optical feeds.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
