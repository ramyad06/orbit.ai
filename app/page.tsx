'use client';

import { motion } from 'framer-motion';
import { IdeaInput } from '@/components/IdeaInput';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Home() {
  return (
    <div className="relative flex flex-1 w-full min-h-screen overflow-hidden">
      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } }}
          className="flex w-full flex-col items-center"
        >
          {/* Eyebrow */}
          <motion.div variants={fadeUp} transition={{ duration: 0.4, ease: 'easeOut' }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-medium text-zinc-500 tracking-wide mb-10 shadow-sm">
              <span className="size-1.5 rounded-full bg-violet-500 animate-pulse" />
              AI Startup Validator
            </span>
          </motion.div>

          {/* Headline — bold Helvetica */}
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-5xl md:text-7xl leading-[1.0] tracking-tight"
          >
            <span className="font-black text-zinc-900 block">Validate your idea.</span>
            <span className="font-black text-zinc-300 block mt-1">Before you build it.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mt-8 max-w-md text-base leading-relaxed text-zinc-500 font-light"
          >
            Live Reddit signals, Google Trends data, and competitor
            intelligence — synthesised into a validation score in seconds.
          </motion.p>

          {/* Input */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mt-10 flex w-full justify-center"
          >
            <IdeaInput />
          </motion.div>

          {/* Proof chips */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mt-8 flex items-center gap-2 flex-wrap justify-center"
          >
            <span className="text-[11px] text-zinc-400 font-light">Powered by</span>
            {['Reddit signals', 'Google Trends', 'Competitor intel', 'YouTube trends'].map((label) => (
              <span key={label} className="text-[11px] text-zinc-500 bg-white rounded-full px-3 py-1 border border-zinc-200 font-medium shadow-sm">
                {label}
              </span>
            ))}
          </motion.div>

          {/* Tagline */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mt-16 text-[11px] uppercase tracking-[0.22em] text-zinc-300 font-light"
          >
            Built for founders who ship before they raise
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
