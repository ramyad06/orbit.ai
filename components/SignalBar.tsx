'use client';

import { TrendingUp, TrendingDown, Minus, HelpCircle, MessageSquare, Building2, Video } from 'lucide-react';

type SignalBarProps = {
  momentum: 'rising' | 'flat' | 'declining' | 'unknown';
  redditCount: number;
  competitorCount: number;
  youtubeCount: number;
};

const momentumLabels: Record<SignalBarProps['momentum'], string> = {
  rising: 'Rising ↑',
  flat: 'Flat',
  declining: 'Declining ↓',
  unknown: 'Unknown',
};

function MomentumIcon({ momentum }: { momentum: SignalBarProps['momentum'] }) {
  if (momentum === 'rising') return <TrendingUp className="size-3.5 text-emerald-600" />;
  if (momentum === 'flat') return <Minus className="size-3.5 text-zinc-400" />;
  if (momentum === 'declining') return <TrendingDown className="size-3.5 text-red-500" />;
  return <HelpCircle className="size-3.5 text-zinc-300" />;
}

export default function SignalBar({ momentum, redditCount, competitorCount, youtubeCount }: SignalBarProps) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {/* Trend */}
      <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs bg-white border border-zinc-200 shadow-sm font-medium">
        <MomentumIcon momentum={momentum} />
        <span className="text-zinc-400 font-light">Trend</span>{' '}
        <span className="text-zinc-700 font-medium">{momentumLabels[momentum]}</span>
      </span>

      {/* Reddit */}
      <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs bg-white border border-zinc-200 shadow-sm font-medium">
        <MessageSquare className="size-3.5 text-orange-500" />
        <span className="text-zinc-400 font-light">Reddit</span>{' '}
        <span className="text-zinc-700 font-medium">{redditCount} discussion{redditCount !== 1 ? 's' : ''}</span>
      </span>

      {/* Competitors */}
      <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs bg-white border border-zinc-200 shadow-sm font-medium">
        <Building2 className="size-3.5 text-sky-600" />
        <span className="text-zinc-400 font-light">Competitors</span>{' '}
        <span className="text-zinc-700 font-medium">{competitorCount} found</span>
      </span>

      {/* YouTube */}
      <span className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs bg-white border border-zinc-200 shadow-sm font-medium">
        <Video className="size-3.5 text-red-500" />
        <span className="text-zinc-400 font-light">YouTube</span>{' '}
        <span className="text-zinc-700 font-medium">{youtubeCount} video{youtubeCount !== 1 ? 's' : ''}</span>
      </span>
    </div>
  );
}
