export default function SectionSkeleton({ title, lines = 3 }: { title: string; lines?: number }) {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-5 h-2.5 rounded bg-white/[0.05]" />
        <div className="w-28 h-2.5 rounded bg-white/[0.05]" />
        <div className="flex-1 h-px bg-white/[0.04]" />
      </div>
      <div className="space-y-2.5 pl-8">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-2.5 rounded-full bg-white/[0.04]"
            style={{ width: `${90 - i * 10}%` }}
          />
        ))}
      </div>
    </div>
  );
}
