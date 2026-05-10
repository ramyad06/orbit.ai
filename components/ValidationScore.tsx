'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type Breakdown = {
  demand: number;
  differentiation: number;
  competition: number;
  feasibility: number;
};

type ValidationScoreProps = {
  score: number;
  breakdown: Breakdown;
  verdict: string;
};

function useCountUp(target: number, durationMs = 1200): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const safeTarget = Number.isFinite(target) ? target : 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(safeTarget * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

function ringStroke(score: number): string {
  if (score >= 75) return '#059669';
  if (score >= 50) return '#D97706';
  return '#DC2626';
}

function scoreTextClass(score: number): string {
  if (score >= 75) return 'text-emerald-700';
  if (score >= 50) return 'text-amber-700';
  return 'text-red-700';
}

const CIRCUMFERENCE = 502.65;

const BREAKDOWN_ROWS: { key: keyof Breakdown; label: string }[] = [
  { key: 'demand', label: 'Demand' },
  { key: 'differentiation', label: 'Differentiation' },
  { key: 'competition', label: 'Competition' },
  { key: 'feasibility', label: 'Feasibility' },
];

export default function ValidationScore({ score, breakdown, verdict }: ValidationScoreProps) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score ?? 0)));
  const animated = useCountUp(safeScore);

  return (
    <div className="rounded-2xl bg-white border border-zinc-200 shadow-sm p-8 md:p-10">
      <div className="grid md:grid-cols-[220px_1fr] gap-10 items-center">
        {/* Left column — SVG Ring Gauge */}
        <div className="flex flex-col items-center">
          <svg
            viewBox="0 0 200 200"
            width="100%"
            style={{ maxWidth: 220 }}
          >
            {/* Track */}
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#E4E4E7"
              strokeWidth="14"
            />
            {/* Progress */}
            <motion.circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              transform="rotate(-90 100 100)"
              stroke={ringStroke(safeScore)}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: CIRCUMFERENCE - (safeScore / 100) * CIRCUMFERENCE }}
              transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
            />
            {/* Center text via foreignObject */}
            <foreignObject x="50" y="70" width="100" height="60">
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}
              >
                <span className={`text-4xl font-black text-center ${scoreTextClass(safeScore)}`}>
                  {animated}
                </span>
                <span className="text-xs text-zinc-300 text-center">/100</span>
              </div>
            </foreignObject>
          </svg>
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-light text-center mt-3">
            Validation Score
          </p>
        </div>

        {/* Right column — Verdict + Breakdown */}
        <div>
          <p className="italic text-lg text-zinc-700 leading-relaxed font-light">
            &ldquo;{verdict}&rdquo;
          </p>
          <div className="border-t border-zinc-100 my-5" />
          <div className="flex flex-col gap-3">
            {BREAKDOWN_ROWS.map(({ key, label }, i) => {
              const raw = breakdown?.[key] ?? 0;
              const v = Math.max(0, Math.min(100, Math.round(raw)));
              return (
                <motion.div
                  key={key}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 + i * 0.08 }}
                >
                  <span className="text-xs uppercase tracking-wider text-zinc-400 w-28 shrink-0 font-light">
                    {label}
                  </span>
                  <div className="flex-1 h-[3px] rounded-full bg-zinc-100 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-zinc-800"
                      initial={{ width: 0 }}
                      animate={{ width: `${v}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 + i * 0.1 }}
                    />
                  </div>
                  <span className="text-xs font-mono text-zinc-500 w-8 text-right">{v}</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
