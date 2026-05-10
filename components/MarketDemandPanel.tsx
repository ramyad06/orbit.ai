'use client';

import { MapPin } from 'lucide-react';
import { useId } from 'react';

import type { MarketDemand } from '@/lib/types';
import { cn } from '@/lib/utils';

type MarketDemandPanelProps = {
  demand: MarketDemand;
};

const MOMENTUM_STYLE: Record<MarketDemand['momentum'], string> = {
  rising: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  flat: 'bg-zinc-100 text-zinc-600 border border-zinc-200',
  declining: 'bg-red-50 text-red-700 border border-red-200',
  unknown: 'bg-zinc-50 text-zinc-400 border border-zinc-200',
};

const MOMENTUM_LABEL: Record<MarketDemand['momentum'], string> = {
  rising: 'Rising',
  flat: 'Flat',
  declining: 'Declining',
  unknown: 'Unknown',
};

function Sparkline({ points }: { points: { date: string; value: number }[] }) {
  const gradId = useId();
  const W = 320;
  const H = 80;
  const PAD_X = 4;
  const PAD_Y = 6;

  if (!points || points.length < 2) {
    return (
      <div className="flex h-[80px] w-full items-center justify-center rounded-md bg-zinc-50 border border-zinc-100 text-xs text-zinc-400">
        Trend data unavailable
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const stepX = (W - PAD_X * 2) / (points.length - 1);
  const innerH = H - PAD_Y * 2;

  const coords = points.map((p, i) => {
    const x = PAD_X + i * stepX;
    const y = PAD_Y + innerH - ((p.value - min) / range) * innerH;
    return [x, y] as const;
  });

  const polyline = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const fillPath =
    `M ${coords[0][0].toFixed(1)},${(H - PAD_Y).toFixed(1)} ` +
    coords.map(([x, y]) => `L ${x.toFixed(1)},${y.toFixed(1)}`).join(' ') +
    ` L ${coords[coords.length - 1][0].toFixed(1)},${(H - PAD_Y).toFixed(1)} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(124 58 237)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="rgb(124 58 237)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke="rgb(124 58 237)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MarketDemandPanel({ demand }: MarketDemandPanelProps) {
  const momentum = demand?.momentum ?? 'unknown';
  const timeline = demand?.timeline ?? [];
  const related = (demand?.relatedQueries ?? []).slice(0, 6);
  const rising = demand?.risingQueries ?? [];
  const regions = demand?.topRegions ?? [];

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[11px] font-mono text-zinc-300 tracking-widest">01</span>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Market Demand</h2>
        <div className="flex-1 h-px bg-zinc-200" />
      </div>

      {/* Momentum badge */}
      <div className="mb-4">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium',
            MOMENTUM_STYLE[momentum],
          )}
        >
          {MOMENTUM_LABEL[momentum]}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Sparkline */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
            12-month interest
          </p>
          <div className="bg-white border border-zinc-100 rounded-xl p-4 shadow-sm">
            <Sparkline points={timeline} />
          </div>
        </div>

        {/* Queries */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
              Related searches
            </p>
            {related.length ? (
              <div className="flex flex-wrap gap-1.5">
                {related.map((q) => (
                  <span key={q} className="bg-zinc-100 text-zinc-600 border-0 rounded-full px-2.5 py-1 text-xs font-medium">
                    {q}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">No related searches found.</p>
            )}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">
              Rising queries
            </p>
            {rising.length ? (
              <div className="flex flex-wrap gap-1.5">
                {rising.map((q) => (
                  <span
                    key={q}
                    className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1 text-xs font-medium"
                  >
                    {q}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">No rising queries surfaced.</p>
            )}
          </div>
        </div>
      </div>

      {regions.length > 0 ? (
        <div className="pt-4 mt-4 border-t border-zinc-100">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-1.5">
            <MapPin className="size-3" />
            Top regions
          </p>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {regions.map((r) => {
              const v = Math.max(0, Math.min(100, Math.round(r.score)));
              return (
                <div key={r.name} className="flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 truncate text-zinc-600">{r.name}</span>
                  <div className="flex-1 h-1 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full bg-zinc-800"
                      style={{ width: `${v}%` }}
                    />
                  </div>
                  <span className="w-7 text-right font-mono text-zinc-400 text-xs">{v}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}
