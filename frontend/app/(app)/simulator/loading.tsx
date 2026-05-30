export default function SimulatorLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--dark)' }}>
      <div className="max-w-[1200px] mx-auto px-7 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="h-3 w-44 mb-4 animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-14 w-64 mb-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          <div className="h-4 w-80 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>

        {/* Group grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="p-4 border animate-pulse"
              style={{
                background: 'var(--dark3)',
                borderColor: 'var(--border)',
                animationDelay: `${i * 60}ms`,
              }}
            >
              <div className="h-4 w-16 mb-3" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <div className="flex flex-col gap-2">
                <div className="h-3 w-full" style={{ background: 'rgba(255,255,255,0.05)' }} />
                <div className="h-3 w-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="h-3 w-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
                <div className="h-3 w-3/4" style={{ background: 'rgba(255,255,255,0.03)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
