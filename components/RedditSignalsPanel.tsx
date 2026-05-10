'use client';

import { ArrowUp, MessageSquare } from 'lucide-react';

import type { RedditSignals } from '@/lib/types';

type RedditSignalsPanelProps = {
  signals: RedditSignals;
};

const SENTIMENT_STYLE: Record<
  NonNullable<RedditSignals['sentiment']>,
  { className: string; label: string }
> = {
  positive: {
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    label: 'Positive sentiment',
  },
  mixed: {
    className: 'bg-zinc-100 text-zinc-500',
    label: 'Mixed sentiment',
  },
  negative: {
    className: 'bg-red-50 text-red-700 border border-red-200',
    label: 'Negative sentiment',
  },
  unknown: {
    className: 'bg-zinc-100 text-zinc-500',
    label: 'Unknown sentiment',
  },
};

function formatRelative(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const sec = Math.max(1, Math.floor(diffMs / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;
  const year = Math.floor(month / 12);
  return `${year}y ago`;
}

function formatScore(score: number): string {
  const abs = Math.abs(score);
  if (abs >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${(score / 1000).toFixed(1)}k`;
  return `${score}`;
}

export default function RedditSignalsPanel({ signals }: RedditSignalsPanelProps) {
  if (!signals?.posts || signals.posts.length === 0) return null;

  const posts = signals.posts.slice(0, 6);
  const topSubs = (signals.topSubreddits ?? []).slice(0, 5);
  const sentiment = signals.sentiment;

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[11px] font-mono text-zinc-300 tracking-widest">—</span>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Community Signals</h2>
        <div className="flex-1 h-px bg-zinc-200" />
      </div>

      {/* Summary row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-zinc-500 font-light">
          {signals.posts.length} discussion{signals.posts.length === 1 ? '' : 's'}
          {topSubs.length ? ' across' : ''}
        </span>
        {topSubs.map((sub) => (
          <span
            key={sub}
            className="bg-zinc-100 text-zinc-600 rounded-full px-2 py-0.5 text-[10px] font-medium"
          >
            r/{sub}
          </span>
        ))}
        {sentiment ? (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${SENTIMENT_STYLE[sentiment].className}`}>
            {SENTIMENT_STYLE[sentiment].label}
          </span>
        ) : null}
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm divide-y divide-zinc-100">
        {posts.map((post, idx) => {
          const rel = formatRelative(post.createdAt);
          return (
            <div
              key={`${post.url}-${idx}`}
              className="p-4 flex gap-4 hover:bg-zinc-50 transition-colors"
            >
              {/* Score chip */}
              <div className="shrink-0 flex flex-col items-center gap-0.5">
                <span className="bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums">
                  {formatScore(post.score)}
                </span>
                <ArrowUp className="size-3 text-orange-400 mt-0.5" aria-hidden />
              </div>

              {/* Main content */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-zinc-100 text-zinc-600 rounded-full px-2 py-0.5 text-[10px] font-medium">
                    r/{post.subreddit}
                  </span>
                  {rel ? (
                    <span className="text-[11px] text-zinc-400">{rel}</span>
                  ) : null}
                </div>
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm font-medium text-zinc-800 leading-snug hover:underline underline-offset-2"
                >
                  {post.title}
                </a>
                {post.snippet ? (
                  <p className="text-xs text-zinc-500 font-light leading-relaxed mt-1">
                    {post.snippet}
                  </p>
                ) : null}
                {typeof post.comments === 'number' ? (
                  <div className="flex items-center gap-1 pt-0.5 text-[11px] text-zinc-400">
                    <MessageSquare className="size-3" aria-hidden />
                    <span className="tabular-nums">
                      {post.comments.toLocaleString()} comment
                      {post.comments === 1 ? '' : 's'}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
