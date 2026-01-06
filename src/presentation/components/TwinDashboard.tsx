'use client';

import { Twin } from '@/domain/entities/Twin';
import { User, Activity, Power, Share2 } from 'lucide-react';
import clsx from 'clsx';

interface TwinStatusCardProps {
  twin: Twin | null;
  onDeactivate?: () => void;
}

/**
 * TwinStatusCard - Shows current twin status on dashboard
 */
export function TwinStatusCard({ twin, onDeactivate }: TwinStatusCardProps) {
  if (!twin) {
    return (
      <div className="glass-card p-6 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-500">
          <User size={32} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">No Twin Active</h3>
          <p className="text-sm text-slate-400">Create your digital twin to start matching</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative glass-card p-6 rounded-2xl overflow-hidden group">
      {/* Status Indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Active</span>
      </div>

      <div className="flex items-start gap-4">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-purple-500/30">
          {twin.publicProfile.name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0 pt-1">
          <h3 className="text-xl font-bold text-white leading-tight">{twin.publicProfile.name}</h3>
          <p className="text-sm text-slate-400 truncate mb-3">{twin.publicProfile.headline}</p>

          {twin.publicProfile.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {twin.publicProfile.skills.slice(0, 3).map((skill, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] text-indigo-300 font-medium tracking-wide uppercase">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-xs font-medium text-slate-300">
          {getDomainBadge(twin.domain)}
        </div>

        {onDeactivate && (
          <button
            onClick={onDeactivate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          >
            <Power size={14} /> Deactivate
          </button>
        )}
      </div>

      {/* Decorative bg blur */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}

function getDomainBadge(domain: string): string {
  switch (domain) {
    case 'networking': return '🤝 Networking';
    case 'events': return '🎉 Events';
    case 'dating': return '💕 Dating';
    default: return '👤 General';
  }
}

interface PrivacyDashboardProps {
  dataPoints: number;
  eventsJoined: number;
  matchesMade: number;
}

/**
 * PrivacyDashboard - Shows privacy status and data summary
 */
export function PrivacyDashboard({ dataPoints, eventsJoined, matchesMade }: PrivacyDashboardProps) {
  return (
    <div className="glass-panel p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
          <Share2 size={24} className="rotate-180" /> {/* Using share icon rotated as shield metaphor */}
        </div>
        <div>
          <h3 className="font-bold text-white leading-tight">Privacy First</h3>
          <p className="text-xs text-emerald-400/80">All data stays on your device</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-6 divide-x divide-white/5">
        <div className="text-center px-1">
          <span className="block text-xl font-bold text-white mb-1">{dataPoints}</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Points</span>
        </div>
        <div className="text-center px-1">
          <span className="block text-xl font-bold text-white mb-1">{eventsJoined}</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Events</span>
        </div>
        <div className="text-center px-1">
          <span className="block text-xl font-bold text-white mb-1">{matchesMade}</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Matches</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">✓ On-device storage</span>
        <span className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">✓ No cloud profiles</span>
        <span className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">✓ GDPR compliant</span>
      </div>
    </div>
  );
}
