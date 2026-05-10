'use client';

import type { Competitor } from '@/lib/types';

type CompetitorCardsProps = {
  competitors: Competitor[];
  sectionNumber?: number;
};

function hostname(url?: string): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}

export default function CompetitorCards({ competitors, sectionNumber = 2 }: CompetitorCardsProps) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[11px] font-mono text-zinc-300 tracking-widest">0{sectionNumber}</span>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Competitive Landscape</h2>
        <div className="flex-1 h-px bg-zinc-200" />
      </div>

      {competitors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center">
          <p className="text-zinc-400 italic text-sm font-light">No direct competitors found — this may be a blue ocean opportunity.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {competitors.map((c, i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-150">
              <div className="flex items-center gap-3">
                {c.logo ? (
                  <img src={c.logo} alt="" className="size-8 rounded-lg object-contain bg-zinc-100" />
                ) : (
                  <div className="size-8 rounded-lg bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-500 shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-bold text-sm text-zinc-900 truncate">{c.name}</span>
              </div>
              <p className="text-xs text-zinc-500 font-light leading-relaxed line-clamp-3">{c.description}</p>
              {c.url && hostname(c.url) && (
                <a href={c.url} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-zinc-300 hover:text-zinc-500 transition-colors truncate mt-auto">
                  {hostname(c.url)}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
