'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TwinCreationForm } from '@/presentation/components/TwinCreationForm';
import { TwinDomain, createTwin } from '@/domain/entities/Twin';
import { getTwinBrain } from '@/lib/twin-brain';
import Link from 'next/link';
import { ArrowRight, Shield, Zap, QrCode, Sparkles } from 'lucide-react';

interface TwinProfile {
  name: string;
  headline: string;
  skills: string[];
  interests: string[];
  domain: TwinDomain;
}

export default function Home() {
  const [twin, setTwin] = useState<TwinProfile | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const checkExistingTwin = async () => {
      try {
        const brain = getTwinBrain();
        const unlocked = await brain.unlock('demo-privacy-key');
        if (unlocked) {
          const loadedTwin = await brain.getTwin();
          if (loadedTwin && loadedTwin.active) {
            setTwin({
              name: loadedTwin.publicProfile.name,
              headline: loadedTwin.publicProfile.headline,
              skills: loadedTwin.publicProfile.skills,
              interests: loadedTwin.publicProfile.interests,
              domain: loadedTwin.domain
            });
          }
        }
      } catch (e) {
        console.error("Failed to load local twin", e);
      }
    };
    checkExistingTwin();
  }, []);

  const handleTwinCreated = async (profile: TwinProfile) => {
    try {
      const brain = getTwinBrain();
      if (!brain.isUnlocked()) await brain.unlock('demo-privacy-key');

      const newTwin = createTwin({
        userId: 'local-' + Date.now(),
        domain: profile.domain,
        publicProfile: profile
      });

      await brain.saveTwin(newTwin);
      setTwin(profile);
      setShowForm(false);
    } catch (err) {
      alert("Privacy Error: Could not save to local secure storage.");
    }
  };

  return (
    <main className="landing overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <section className="container min-h-screen flex items-center justify-center py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">

          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-8 text-sm font-medium text-cyan-400"
            >
              <Sparkles size={16} /> Privacy-First AI Networking
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight">
              Your Twin Finds <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 text-glow">
                Perfect People
              </span>
            </h1>

            <p className="text-lg text-slate-400 mb-10 max-w-lg leading-relaxed">
              Skip the small talk. Get matched with the right people at events in 30 seconds using on-device AI. Zero cloud data.
            </p>

            <AnimatePresence mode="wait">
              {twin ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card p-2 rounded-2xl inline-flex items-center gap-4 pr-6"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-xl font-bold shadow-lg shadow-green-500/20">
                    {twin.name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-green-400 font-bold tracking-wider uppercase flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Active
                    </span>
                    <span className="font-semibold text-white">{twin.name}</span>
                  </div>
                  <Link href="/dashboard" className="ml-4 btn-neon px-6 py-2.5 flex items-center gap-2 text-sm">
                    Dashboard <ArrowRight size={16} />
                  </Link>
                </motion.div>
              ) : (
                <div className="flex gap-4 flex-wrap">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-neon px-8 py-4 text-lg flex items-center gap-3 shadow-lg shadow-purple-500/25"
                    onClick={() => setShowForm(true)}
                  >
                    <Zap size={20} className="fill-white" /> Create Your Twin
                  </motion.button>
                  <Link href="/cic-demo">
                    <motion.button
                      whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 rounded-xl border border-white/10 font-medium hover:border-white/30 transition-colors flex items-center gap-2"
                    >
                      <Sparkles size={18} className="text-cyan-400" /> Enter Guest Demo
                    </motion.button>
                  </Link>
                </div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative h-[600px] flex items-center justify-center perspective-1000"
          >
            {showForm ? (
              <motion.div
                initial={{ opacity: 0, rotateY: 90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                className="w-full max-w-md"
              >
                <div className="glass-panel p-8 rounded-3xl border-t border-white/20">
                  <TwinCreationForm onTwinCreated={handleTwinCreated} />
                </div>
              </motion.div>
            ) : twin ? (
              <GlassTwinCard twin={twin} />
            ) : (
              <FloatingCardsAnimation />
            )}
          </motion.div>

        </div>
      </section>

      {/* Features Grid */}
      <section className="container py-32 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl font-bold mb-6">Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">Networking</span></h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Powered by Gemini Nano and local embeddings. Your data never leaves your pocket until you say so.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<QrCode size={32} className="text-cyan-400" />}
            title="Instant Sync"
            desc="Scan one QR code to sync with 50+ attendees instantly via P2P mesh."
            delay={0}
          />
          <FeatureCard
            icon={<Sparkles size={32} className="text-purple-400" />}
            title="AI Matchmaking"
            desc="On-device LLM analyzes interests to find your top 3 matches in seconds."
            delay={0.2}
          />
          <FeatureCard
            icon={<Shield size={32} className="text-pink-400" />}
            title="Zero-Knowledge"
            desc="Your raw data stays encrypted. Only matches are revealed."
            delay={0.4}
          />
        </div>
      </section>
    </main>
  );
}

// Components

function GlassTwinCard({ twin }: { twin: TwinProfile }) {
  return (
    <motion.div
      className="glass-card p-8 rounded-[2rem] w-full max-w-sm border-t border-white/20 relative overflow-hidden"
      whileHover={{ y: -5 }}
    >
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-500/20 to-transparent pointer-events-none" />

      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 mx-auto flex items-center justify-center text-4xl font-bold text-white shadow-xl shadow-cyan-500/30 mb-6 relative z-10">
        {twin.name.charAt(0)}
      </div>

      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">{twin.name}</h3>
        <p className="text-purple-300 font-medium">{twin.headline}</p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center mb-8">
        {twin.skills.slice(0, 3).map((skill, i) => (
          <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-slate-300">
            {skill}
          </span>
        ))}
      </div>

      <div className="text-center text-xs text-slate-500 font-mono uppercase tracking-widest">
        {twin.domain} Twin Active
      </div>
    </motion.div>
  );
}

function FloatingCardsAnimation() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent rounded-full blur-3xl" />

      {/* Central Identity */}
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="w-32 h-32 rounded-3xl bg-glass border border-white/20 flex items-center justify-center text-6xl shadow-2xl z-20 relative glass-panel"
      >
        <span className="drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">🤖</span>
      </motion.div>

      {/* Satellites */}
      <FloatingCard name="Anna K." score="98%" x={120} y={-80} delay={0} color="from-green-400 to-emerald-600" />
      <FloatingCard name="Max S." score="85%" x={-140} y={20} delay={1} color="from-blue-400 to-indigo-600" />
      <FloatingCard name="Lisa M." score="92%" x={100} y={100} delay={2} color="from-purple-400 to-pink-600" />
    </div>
  );
}

function FloatingCard({ name, score, x, y, delay, color }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [y, y - 15, y],
      }}
      transition={{
        scale: { delay, duration: 0.5 },
        y: { delay, duration: 3 + Math.random(), repeat: Infinity, ease: "easeInOut" }
      }}
      style={{ translateX: x, translateY: y }}
      className="absolute z-10 glass-card p-3 rounded-xl flex items-center gap-3 pr-4"
    >
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-sm shadow-lg`}>
        {score}
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Match</span>
        <span className="text-sm font-semibold">{name}</span>
      </div>
    </motion.div>
  );
}

function FeatureCard({ icon, title, desc, delay }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay }}
      whileHover={{ y: -10 }}
      className="glass-panel p-8 rounded-3xl group"
    >
      <div className="mb-6 p-4 rounded-2xl bg-white/5 w-fit group-hover:bg-white/10 transition-colors">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white group-hover:text-cyan-400 transition-colors">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </motion.div>
  );
}
