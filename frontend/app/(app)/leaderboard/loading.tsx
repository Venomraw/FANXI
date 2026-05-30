export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--dark)' }}>
      <div className="max-w-[900px] mx-auto px-7 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="h-3 w-52 mb-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-14 w-72 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>

        {/* Table skeleton */}
        <div className="border" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          {/* Header row */}
          <div
            className="flex items-center gap-4 px-5 py-3 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="w-8 h-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="w-9" />
            <div className="flex-1 h-3 w-12 animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="h-3 w-12 animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-4 border-b animate-pulse"
              style={{
                borderColor: 'rgba(255,255,255,0.05)',
                animationDelay: `${i * 80}ms`,
              }}
            >
              <div className="w-8 h-6" style={{ background: 'rgba(255,255,255,0.05)' }} />
              <div className="w-10 h-10" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="flex-1">
                <div className="h-4 w-28 mb-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-3 w-16" style={{ background: 'rgba(255,255,255,0.04)' }} />
              </div>
              <div className="h-7 w-14" style={{ background: 'rgba(255,255,255,0.05)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
