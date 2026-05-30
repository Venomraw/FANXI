export default function ProfileLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--dark)' }}>
      <div className="max-w-[900px] mx-auto px-7 py-12">
        {/* Profile header skeleton */}
        <div className="flex items-center gap-6 mb-10">
          <div
            className="w-20 h-20 animate-pulse"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          />
          <div className="flex-1">
            <div className="h-7 w-40 mb-2 animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-4 w-28 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-5 border animate-pulse"
              style={{
                background: 'var(--dark3)',
                borderColor: 'var(--border)',
                animationDelay: `${i * 100}ms`,
              }}
            >
              <div className="h-3 w-16 mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-8 w-12" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>
          ))}
        </div>

        {/* History skeleton */}
        <div className="h-3 w-32 mb-4 animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-4 border animate-pulse"
              style={{
                background: 'var(--dark3)',
                borderColor: 'var(--border)',
                animationDelay: `${i * 80}ms`,
              }}
            >
              <div className="flex justify-between mb-2">
                <div className="h-4 w-36" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-4 w-16" style={{ background: 'rgba(255,255,255,0.05)' }} />
              </div>
              <div className="h-3 w-24" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
