import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'status' | 'ecosystem' | 'verification';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'status', size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  // Ecosystem badge colors
  if (type === 'ecosystem') {
    if (status.toLowerCase().includes('mangrove')) {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Mangrove
        </span>
      );
    }
    if (status.toLowerCase().includes('seagrass')) {
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
          Seagrass
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        Tidal Wetland
      </span>
    );
  }

  // Verification & Status colors
  switch (status) {
    case 'Verified':
    case 'Registered & Independently Verified':
    case 'Approved':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          {status}
        </span>
      );
    case 'Active Monitoring':
    case 'Listed - Active Monitoring':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          {status}
        </span>
      );
    case 'Admin Approved':
    case 'Admin Approved - Baseline Recorded':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
          {status}
        </span>
      );
    case 'Submitted':
    case 'Under Review':
    case 'Under Administrative Review':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
          {status}
        </span>
      );
    case 'Returned for Correction':
    case 'Corrections Requested':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
          {status}
        </span>
      );
    case 'Rejected':
    case 'Application Rejected':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          {status}
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          {status}
        </span>
      );
  }
};
