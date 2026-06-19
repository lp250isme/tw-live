// Matches the dense-list layout: a summary-bar line + one-line rows
// (1-col mobile / 2-col wide), so loading state lines up with real content.
export default function LoadingSkeleton() {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="h-4 w-16 rounded bg-muted/50 animate-pulse" />
        <div className="h-5 w-24 rounded-full bg-muted/40 animate-pulse" />
        <div className="h-4 w-32 rounded bg-muted/40 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/30 px-3.5 py-2.5">
            <div className="h-2 w-2 shrink-0 rounded-full bg-muted/50 animate-pulse" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3.5 w-28 rounded bg-muted/50 animate-pulse" />
              <div className="h-2.5 w-20 rounded bg-muted/30 animate-pulse" />
            </div>
            <div className="h-5 w-12 rounded bg-muted/50 animate-pulse" />
            <div className="h-5 w-14 rounded-full bg-muted/40 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
