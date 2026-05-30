export default function MatchesLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--dark)' }}>
      <div className="max-w-[1400px] mx-auto px-7 py-12">
        {/* Header skeleton */}
        <div className="mb-10">
          <div className="h-3 w-48 mb-4 animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-16 w-80 mb-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          <div className="h-4 w-64 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>

        {/* Toggle skeleton */}
        <div className="flex gap-2 mb-8">
          <div className="h-11 w-32 animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-11 w-32 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>

        {/* Match cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-5 border animate-pulse"
              style={{
                background: 'var(--dark3)',
                borderColor: 'var(--border)',
                animationDelay: `${i * 100}ms`,
              }}
            >
              <div className="h-3 w-20 mb-4" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <div className="h-5 w-24" style={{ background: 'rgba(255,255,255,0.05)' }} />
                </div>
                <div className="h-3 w-6" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="flex-1 flex items-center justify-end gap-3">
                  <div className="h-5 w-24" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  <div className="w-8 h-8 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-28" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="h-8 w-20" style={{ background: 'rgba(255,255,255,0.05)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
