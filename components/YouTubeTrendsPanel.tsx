'use client';

import { useState } from 'react';
import { Video } from 'lucide-react';

import type { YouTubeSignals, YouTubeVideo } from '@/lib/types';

type YouTubeTrendsPanelProps = {
  signals: YouTubeSignals;
};

function formatViews(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
}

function VideoThumb({ video }: { video: YouTubeVideo }) {
  const [errored, setErrored] = useState(false);

  if (!video.thumbnail || errored) {
    return (
      <div className="aspect-video bg-zinc-100 flex items-center justify-center">
        <Video className="text-zinc-300 size-8" aria-hidden />
      </div>
    );
  }

  return (
    <div className="aspect-video bg-zinc-100 relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={video.thumbnail}
        alt=""
        loading="lazy"
        onError={() => setErrored(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

export default function YouTubeTrendsPanel({ signals }: YouTubeTrendsPanelProps) {
  if (!signals?.videos || signals.videos.length === 0) return null;

  const videos = signals.videos.slice(0, 6);
  const totalResults = signals.totalResults;

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[11px] font-mono text-zinc-300 tracking-widest">—</span>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Content Trends</h2>
        <div className="flex-1 h-px bg-zinc-200" />
      </div>

      {typeof totalResults === 'number' && totalResults > 0 ? (
        <p className="text-xs text-zinc-500 font-light mb-4">
          Creator activity around this idea &middot;{' '}
          {totalResults.toLocaleString()} result{totalResults === 1 ? '' : 's'}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {videos.map((video, idx) => (
          <a
            key={`${video.url}-${idx}`}
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-150 flex flex-col"
          >
            <div className="aspect-video bg-zinc-100 relative overflow-hidden">
              <VideoThumb video={video} />
            </div>
            <p className="text-sm font-bold text-zinc-900 line-clamp-2 leading-snug px-4 pt-3">
              {video.title}
            </p>
            <p className="text-xs text-zinc-500 font-light px-4 pb-1">{video.channel}</p>
            {typeof video.views === 'number' ? (
              <p className="text-xs text-zinc-400 font-mono px-4 pb-3">
                {formatViews(video.views)} views
              </p>
            ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}
