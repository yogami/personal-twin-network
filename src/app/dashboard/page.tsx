'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TwinStatusCard, PrivacyDashboard } from '@/presentation/components/TwinDashboard';
import { MatchList } from '@/presentation/components/MatchCard';
import { QRScanner, QRCodeGenerator } from '@/presentation/components/QRCode';
import { PWAInstallBanner, OfflineBanner } from '@/presentation/components/PWABanners';
import { TwinPersonality, TwinActivityCounter } from '@/presentation/components/TwinPersonality';
import { PrivacyIndicator } from '@/presentation/components/PrivacyIndicator';
import { usePWA } from '@/presentation/hooks/usePWA';
import { Twin } from '@/domain/entities/Twin';
import { Match } from '@/domain/entities/Match';
import { getTwinBrain } from '@/lib/twin-brain';
import { getEdgeMatchingService, initializeEdgeMatching } from '@/lib/edge-matching';
import Link from 'next/link';
import { Activity, Bell, Grid, Plus, QrCode, RefreshCw, Smartphone, Zap } from 'lucide-react';
import clsx from 'clsx';

// Demo data for MVP demonstration
const demoTwin: Twin = {
  id: 'twin-demo',
  userId: 'user-demo',
  domain: 'networking',
  publicProfile: {
    name: 'Demo User',
    headline: 'Software Engineer & AI Enthusiast',
    skills: ['TypeScript', 'React', 'AI/ML', 'Node.js'],
    interests: ['Startups', 'Tech', 'Innovation'],
  },
  active: true,
  createdAt: new Date(),
};

const demoCandidates = [
  {
    name: 'Anna Kowalski',
    headline: 'AI Research Lead at TechLab Berlin',
    skills: ['Machine Learning', 'Python', 'TensorFlow', 'NLP'],
    interests: ['AI Ethics', 'Startups', 'Climate Tech'],
  },
  {
    name: 'Max Richter',
    headline: 'Founder & CEO @ InnoScale',
    skills: ['Leadership', 'Strategy', 'Fundraising', 'Product'],
    interests: ['Startups', 'SaaS', 'Venture Capital'],
  },
  {
    name: 'Lisa Chen',
    headline: 'Senior Product Manager at Stripe',
    skills: ['Product Management', 'Agile', 'Fintech', 'UX'],
    interests: ['Fintech', 'B2B SaaS', 'Design'],
  },
  {
    name: 'David Mueller',
    headline: 'Full Stack Engineer at Vercel',
    skills: ['TypeScript', 'React', 'Node.js', 'Next.js'],
    interests: ['Open Source', 'DevTools', 'Web3'],
  },
  {
    name: 'Sophia Wagner',
    headline: 'UX Director at Figma',
    skills: ['Design Systems', 'User Research', 'Prototyping'],
    interests: ['Design', 'Accessibility', 'Creative Tech'],
  },
];

export default function DashboardPage() {
  const [twin, setTwin] = useState<Twin | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'matches' | 'scan' | 'create'>('matches');
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchSource, setMatchSource] = useState<'edge' | 'server'>('edge');
  const [matchCount, setMatchCount] = useState(0);
  const [negotiationCount, setNegotiationCount] = useState(0);

  const {
    isInstalled,
    swReady,
    twinBrainActive,
    activateTwinBrain,
    lastSyncTime,
  } = usePWA();

  const performEdgeMatching = useCallback(async (userTwin: Twin) => {
    setIsProcessing(true);
    try {
      const edgeService = getEdgeMatchingService();
      const result = await edgeService.findMatches({
        userTwin,
        candidates: demoCandidates,
        eventContext: { theme: 'Berlin Tech Meetup', description: 'AI and Startups networking event' },
      });

      setMatches(result.matches.slice(0, 5));
      setMatchSource(result.source === 'gemini' ? 'edge' : 'edge');
      setMatchCount((prev) => prev + result.matches.length);
    } catch (error) {
      console.error('Edge matching failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        initializeEdgeMatching();
        getTwinBrain();
        setTwin(demoTwin);
        if (swReady) await activateTwinBrain(demoTwin);
        await performEdgeMatching(demoTwin);
      } catch (error) {
        console.error('Failed to initialize:', error);
        setTwin(demoTwin);
      } finally {
        setLoading(false);
      }
    };
    initializeApp();
  }, [swReady, activateTwinBrain, performEdgeMatching]);

  const handleEventJoin = useCallback(async (eventId: string) => {
    if (!twin) return;
    setLoading(true);
    setNegotiationCount((prev) => prev + 1);
    try {
      await performEdgeMatching(twin);
      setActiveTab('matches');
    } catch (error) {
      console.error('Event join failed:', error);
    } finally {
      setLoading(false);
    }
  }, [twin, performEdgeMatching]);

  const handleConnect = useCallback((matchedTwinId: string) => {
    setNegotiationCount((prev) => prev + 1);
    alert('🤝 Connection request sent! Your twin will negotiate.');
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!twin) return;
    await performEdgeMatching(twin);
  }, [twin, performEdgeMatching]);

  if (loading && !twin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#030014]">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-cyan-500 animate-spin" />
        </div>
        <p className="mt-8 text-cyan-400 font-medium tracking-wide animate-pulse">Initializing Neural Digital Twin...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030014] text-white pb-24 overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 backdrop-blur-xl px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-sm shadow-lg shadow-purple-500/20">TN</span>
            Twin Net
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isProcessing}
              className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={isProcessing ? "animate-spin text-cyan-400" : "text-slate-300"} />
            </button>
            <div className="relative">
              <button className="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors">
                <Bell size={20} className="text-slate-300" />
              </button>
              {matches.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold border-2 border-[#030014]">
                  {matches.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-md mx-auto px-4 pt-6 space-y-6">
        <OfflineBanner />
        {!isInstalled && <PWAInstallBanner />}

        {/* Hero UX Component */}
        <TwinPersonality
          twinName={twin?.publicProfile.name || 'Your Twin'}
          isActive={twinBrainActive}
          latestMatch={matches[0]}
          matchCount={matchCount}
          isProcessing={isProcessing}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center gap-1 group">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 mb-1 group-hover:scale-110 transition-transform">
              <Zap size={20} />
            </div>
            <span className="text-2xl font-bold">{matchCount}</span>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Matches</span>
          </div>
          <div className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center gap-1 group">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 mb-1 group-hover:scale-110 transition-transform">
              <Activity size={20} />
            </div>
            <span className="text-2xl font-bold">{negotiationCount}</span>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Talks</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="glass-panel p-1 rounded-xl flex items-center justify-between relative">
          {/* Active Indicator Background */}
          <motion.div
            layoutId="activeTab"
            className="absolute bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg"
            style={{
              width: '33.33%',
              height: 'calc(100% - 8px)',
              left: activeTab === 'matches' ? '4px' : activeTab === 'scan' ? '33.33%' : '66.66%',
              top: '4px'
            }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />

          <TabButton
            active={activeTab === 'matches'}
            onClick={() => setActiveTab('matches')}
            icon={<Grid size={18} />}
            label="Matches"
          />
          <TabButton
            active={activeTab === 'scan'}
            onClick={() => setActiveTab('scan')}
            icon={<QrCode size={18} />}
            label="Scan"
          />
          <TabButton
            active={activeTab === 'create'}
            onClick={() => setActiveTab('create')}
            icon={<Plus size={18} />}
            label="Create"
          />
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="min-h-[400px]"
          >
            {activeTab === 'matches' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-lg font-bold text-white">Top Matches</h2>
                  <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 ${matchSource === 'edge' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${matchSource === 'edge' ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
                    {matchSource === 'edge' ? 'On-Device' : 'Cloud'}
                  </div>
                </div>
                <MatchList matches={matches} onConnect={handleConnect} loading={isProcessing} />
              </div>
            )}

            {activeTab === 'scan' && (
              <div className="glass-card p-6 rounded-3xl flex flex-col items-center justify-center min-h-[400px]">
                <QRScanner onScan={handleEventJoin} onError={console.error} />
                <p className="mt-6 text-center text-sm text-slate-400 w-2/3">
                  Scan an event QR code to instantly sync and find matches nearby.
                </p>
              </div>
            )}

            {activeTab === 'create' && (
              <div className="glass-card p-8 rounded-3xl flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/30 mb-6">
                  <QrCode size={32} />
                </div>
                <h2 className="text-xl font-bold mb-2">Event QR Code</h2>
                <p className="text-sm text-slate-400 mb-8">Share this code to let others join your mesh.</p>
                <QRCodeGenerator eventId="demo-event-123" eventName="Berlin AI Meetup" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Privacy Status Footer */}
        <div className="pt-8 pb-4">
          <PrivacyIndicator
            isEdgeMatching={matchSource === 'edge'}
            isP2PActive={false}
            bytesTransmitted={0}
            isEncrypted={true}
            lastSyncTime={lastSyncTime}
          />
          <div className="mt-6 border-t border-white/5 pt-6">
            <PrivacyDashboard
              dataPoints={twin?.publicProfile.skills.length ?? 0 + (twin?.publicProfile.interests.length ?? 0)}
              eventsJoined={1}
              matchesMade={matches.length}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative z-10 flex-1 flex flex-col items-center justify-center gap-1.5 py-2 transition-colors duration-300",
        active ? "text-white" : "text-slate-500 hover:text-slate-300"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
    </button>
  );
}
