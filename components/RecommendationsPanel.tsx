'use client';

import type { Recommendation } from '@/lib/types';

type RecommendationsPanelProps = {
  items: Recommendation[];
  sectionNumber?: number;
};

const BADGE: Record<Recommendation['category'], string> = {
  positioning:     'bg-violet-50 text-violet-700 ring-violet-200',
  gtm:             'bg-sky-50 text-sky-700 ring-sky-200',
  differentiation: 'bg-amber-50 text-amber-700 ring-amber-200',
  product:         'bg-emerald-50 text-emerald-700 ring-emerald-200',
  other:           'bg-zinc-100 text-zinc-600 ring-zinc-200',
};

const BADGE_LABEL: Record<Recommendation['category'], string> = {
  positioning: 'Positioning',
  gtm: 'GTM',
  differentiation: 'Differentiation',
  product: 'Product',
  other: 'Other',
};

export default function RecommendationsPanel({ items, sectionNumber = 5 }: RecommendationsPanelProps) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[11px] font-mono text-zinc-300 tracking-widest">0{sectionNumber}</span>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Next Steps</h2>
        <div className="flex-1 h-px bg-zinc-200" />
      </div>

      {items.length === 0 ? (
        <p className="text-sm italic text-zinc-400 font-light">No recommendations yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((r, i) => {
            const cat: Recommendation['category'] = BADGE[r.category] ? r.category : 'other';
            return (
              <div key={i} className="bg-white border border-zinc-200 rounded-xl p-6 flex flex-col shadow-sm hover:shadow-md hover:border-zinc-300 transition-all duration-150">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-black text-3xl text-zinc-100 leading-none">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${BADGE[cat]}`}>
                    {BADGE_LABEL[cat]}
                  </span>
                </div>
                <p className="mt-4 text-sm font-bold text-zinc-900 leading-snug">{r.title}</p>
                <p className="mt-1.5 text-xs text-zinc-500 font-light leading-relaxed">{r.detail}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
