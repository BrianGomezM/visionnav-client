interface NarrativeCardProps {
  narrative: string
}

export function NarrativeCard({ narrative }: NarrativeCardProps) {
  return (
    <div
      className="relative rounded-xl bg-zinc-900 dark:bg-zinc-950 p-6 overflow-hidden animate-fade-in-up"
      style={{ animationDelay: '0ms' }}
    >
      {/* Subtle teal glow in top-right */}
      <div
        className="absolute top-0 right-0 w-48 h-48 opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 100% 0%, #1D9E75 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />
      
      <div className="relative">
        {/* Label row */}
        <div className="flex items-center gap-2 mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-[#1D9E75] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1D9E75]" />
          </span>
          <span className="text-xs uppercase tracking-wider text-[#1D9E75] font-medium">
            narrativa egocéntrica generada
          </span>
        </div>

        {/* Narrative text */}
        <p className="text-lg md:text-xl font-serif italic text-zinc-100 leading-relaxed">
          {narrative}
        </p>
      </div>
    </div>
  )
}
