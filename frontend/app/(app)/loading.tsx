export default function AppLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--dark)' }}>
      <div className="flex flex-col items-center gap-5">
        {/* Pulsing logo mark */}
        <div
          className="w-10 h-10 border-2 animate-pulse"
          style={{
            borderColor: 'var(--team-primary)',
            background: 'color-mix(in srgb, var(--team-primary) 10%, transparent)',
            boxShadow: '0 0 20px color-mix(in srgb, var(--team-primary) 25%, transparent)',
          }}
        />
        <p
          className="font-mono text-xs uppercase tracking-[3px]"
          style={{ color: 'var(--muted)' }}
        >
          Loading
        </p>
      </div>
    </div>
  );
}
