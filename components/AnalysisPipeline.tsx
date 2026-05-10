'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Sparkles } from 'lucide-react';

type Status = 'waiting' | 'active' | 'done';

const STEPS = [
  {
    id: 'keywords',
    label: 'Extracting keywords',
    detail: 'Understanding your idea',
    activeAt: 0,
    doneAt: 1200,
  },
  {
    id: 'reddit',
    label: 'Searching Reddit',
    detail: 'Finding community discussions',
    activeAt: 1400,
    doneAt: 8000,
  },
  {
    id: 'trends',
    label: 'Fetching Google Trends',
    detail: 'Reading 12-month market signals',
    activeAt: 1600,
    doneAt: 10000,
  },
  {
    id: 'competitors',
    label: 'Scanning competitors',
    detail: 'Mapping the competitive landscape',
    activeAt: 1800,
    doneAt: 9000,
  },
  {
    id: 'youtube',
    label: 'Searching YouTube',
    detail: 'Analyzing content demand',
    activeAt: 2000,
    doneAt: 11000,
  },
  {
    id: 'scoring',
    label: 'Scoring your idea',
    detail: 'Weighing all signals',
    activeAt: 12000,
    doneAt: 13500,
  },
  {
    id: 'report',
    label: 'Building your report',
    detail: 'Almost ready…',
    activeAt: 14000,
    doneAt: 99999,
  },
];

function getStatus(elapsed: number, activeAt: number, doneAt: number): Status {
  if (elapsed >= doneAt) return 'done';
  if (elapsed >= activeAt) return 'active';
  return 'waiting';
}

export default function AnalysisPipeline() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Date.now() - start);
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-sm mx-auto py-8"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <Sparkles className="size-3.5 text-violet-500 animate-pulse" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-400 font-medium">
          Analysing
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-0">
        {STEPS.map((step, i) => {
          const status = getStatus(elapsed, step.activeAt, step.doneAt);
          const isActive = status === 'active';
          const isDone = status === 'done';
          const isWaiting = status === 'waiting';

          return (
            <motion.div
              key={step.id}
              initial={false}
              className="flex items-start gap-4 group"
            >
              {/* Left: connector line + icon */}
              <div className="flex flex-col items-center">
                {/* Icon */}
                <div className="relative flex items-center justify-center size-6 shrink-0 my-2">
                  {isDone && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="size-5 rounded-full bg-emerald-50 ring-1 ring-emerald-200 flex items-center justify-center"
                    >
                      <Check className="size-3 text-emerald-600" strokeWidth={2.5} />
                    </motion.div>
                  )}
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2 }}
                      className="size-5 rounded-full bg-violet-50 ring-1 ring-violet-200 flex items-center justify-center"
                    >
                      <Loader2 className="size-3 text-violet-600 animate-spin" />
                    </motion.div>
                  )}
                  {isWaiting && (
                    <div className="size-1.5 rounded-full bg-zinc-200" />
                  )}
                </div>

                {/* Connector line below (except last) */}
                {i < STEPS.length - 1 && (
                  <div className="w-px flex-1 min-h-[12px]">
                    <motion.div
                      className="w-full h-full"
                      animate={{
                        background: isDone
                          ? 'rgb(209 250 229)'
                          : 'rgb(244 244 245)',
                      }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                )}
              </div>

              {/* Right: text */}
              <div className="pb-5 pt-1.5 min-w-0">
                <motion.p
                  animate={{
                    color: isDone
                      ? 'rgb(161 161 170)'
                      : isActive
                      ? 'rgb(24 24 27)'
                      : 'rgb(212 212 216)',
                  }}
                  transition={{ duration: 0.3 }}
                  className={`text-sm leading-none ${isActive ? 'font-medium' : ''}`}
                >
                  {step.label}
                </motion.p>
                <AnimatePresence>
                  {isActive && (
                    <motion.p
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs text-violet-500 leading-none overflow-hidden"
                    >
                      {step.detail}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
