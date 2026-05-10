'use client';

type RisksListProps = {
  items: string[];
  sectionNumber?: number;
};

export default function RisksList({ items, sectionNumber = 4 }: RisksListProps) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[11px] font-mono text-zinc-300 tracking-widest">0{sectionNumber}</span>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Risks</h2>
        <div className="flex-1 h-px bg-zinc-200" />
      </div>

      {items.length === 0 ? (
        <p className="text-sm italic text-zinc-400 font-light">No standout risks surfaced.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex gap-0 group">
              <div className="w-[3px] shrink-0 rounded-full bg-red-500 mr-4" />
              <p className="text-zinc-700 font-light text-sm leading-relaxed py-3 hover:bg-zinc-50 rounded-r-lg transition-colors flex-1">{item}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
