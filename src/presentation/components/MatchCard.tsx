'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Match } from '@/domain/entities/Match';
import { Sparkles, MessageCircle, ExternalLink, ChevronDown } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  rank: number;
  onConnect: (matchedTwinId: string) => void;
}

export function MatchCard({ match, rank, onConnect }: MatchCardProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExplain = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (explanation) {
      setIsExpanded(!isExpanded);
      return;
    }

    setLoadingAI(true);
    setIsExpanded(true);
    try {
      const { localLLM } = await import('@/infrastructure/ai/LocalLLMService');
      const myTwinMock = { publicProfile: match.matchedProfile } as any;
      const theirTwinMock = { publicProfile: match.matchedProfile } as any;
      const result = await localLLM.explainMatch(theirTwinMock, theirTwinMock, match.score);
      setExplanation(result);
    } catch (e) {
      console.error(e);
      setExplanation("Could not generate explanation locally.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className="group relative"
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="glass-card relative rounded-2xl p-5 border border-white/5 bg-black/40 backdrop-blur-xl overflow-hidden">
        {/* Rank Badge */}
        <div className="absolute top-0 left-0 px-4 py-1.5 bg-gradient-to-br from-cyan-500/80 to-blue-600/80 rounded-br-2xl text-xs font-bold text-white shadow-lg shadow-cyan-500/20 z-10">
          #{rank} Match
        </div>

        <div className="flex items-start gap-5 mt-4">
          {/* Avatar */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-2xl font-bold text-white shadow-inner border border-white/10 group-hover:scale-105 transition-transform duration-300">
              {match.matchedProfile.name.charAt(0)}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center text-[10px] font-bold ${getScoreColorClass(match.score)} shadow-sm`}>
              %
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-lg font-bold text-white leading-tight group-hover:text-cyan-400 transition-colors">
              {match.matchedProfile.name}
            </h3>
            <p className="text-sm text-slate-400 truncate mb-3">
              {match.matchedProfile.headline}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {match.sharedInterests.slice(0, 3).map((interest, i) => (
                <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] text-indigo-300 font-medium tracking-wide uppercase">
                  {interest}
                </span>
              ))}
              {match.sharedInterests.length > 3 && (
                <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-slate-500">
                  +{match.sharedInterests.length - 3}
                </span>
              )}
            </div>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center justify-center pl-2">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                <path
                  className={getScoreStrokeClass(match.score)}
                  strokeDasharray={`${match.score}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-sm font-bold text-white">{match.score}</span>
            </div>
          </div>
        </div>

        {/* AI Explanation Area */}
        <AnimatePresence>
          {(isExpanded || loadingAI) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50" />
                <div className="flex gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-indigo-100/90 leading-relaxed">
                    {loadingAI ? 'Analyzing deep compatibility vectors...' : explanation}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
          <button
            onClick={handleExplain}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/5 hover:border-white/20"
          >
            {loadingAI ? (
              <span className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles size={14} className={explanation ? "text-indigo-400" : ""} />
            )}
            {explanation ? (isExpanded ? 'Hide AI' : 'Show AI') : 'Why Match?'}
          </button>

          <button
            onClick={() => onConnect(match.matchedTwinId)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:enabled:from-cyan-400 hover:enabled:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <MessageCircle size={14} /> Connect
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function MatchList({ matches, onConnect, loading }: { matches: Match[], onConnect: any, loading?: boolean }) {
  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-cyan-500 animate-spin" />
        </div>
        <p className="mt-4 text-cyan-400/80 font-medium animate-pulse">Running Neural Match...</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="py-20 text-center glass-card rounded-2xl border-dashed border-2 border-white/10">
        <span className="text-4xl block mb-4 opacity-50">🔭</span>
        <p className="text-slate-400">No matches found yet.</p>
        <p className="text-slate-500 text-sm mt-2">Try expanding your interests or joining more events.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <AnimatePresence>
        {matches.map((match, index) => (
          <MatchCard
            key={match.matchedTwinId}
            match={match}
            rank={index + 1}
            onConnect={onConnect}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Helpers
function getScoreColorClass(score: number) {
  if (score >= 90) return 'bg-emerald-500 text-emerald-950';
  if (score >= 80) return 'bg-cyan-500 text-cyan-950';
  if (score >= 60) return 'bg-yellow-500 text-yellow-950';
  return 'bg-red-500 text-red-950';
}

function getScoreStrokeClass(score: number) {
  if (score >= 90) return 'text-emerald-500';
  if (score >= 80) return 'text-cyan-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
}
