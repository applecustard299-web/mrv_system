import React, { useState } from 'react';
import { ProjectMap } from '../components/map/ProjectMap';
import { Info, Map, Layers, ShieldCheck } from 'lucide-react';

interface ProjectMapPageProps {
  onSelectProject: (projectId: number) => void;
}

export const ProjectMapPage: React.FC<ProjectMapPageProps> = ({ onSelectProject }) => {
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-navy-900 tracking-tight">
              India National Blue Carbon Geospatial Map
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-semibold">
              Coastal India • Leaflet
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Explore registered mangrove, seagrass, and tidal wetland restoration project boundaries across Indian maritime states.
          </p>
        </div>
      </div>

      {/* Full-height Interactive Map */}
      <ProjectMap
        heightClass="h-[calc(100vh-16rem)] min-h-[500px]"
        onSelectProject={onSelectProject}
      />
    </div>
  );
};
