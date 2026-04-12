import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FanXI — World Cup 2026 Bracket Simulator';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #050810 0%, #0a1020 40%, #050810 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          display: 'flex',
        }} />

        {/* Glow orb */}
        <div style={{
          position: 'absolute',
          top: '40%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700, height: 500,
          background: 'radial-gradient(ellipse, rgba(220,38,38,0.12) 0%, transparent 65%)',
          display: 'flex',
        }} />

        {/* Background trophy */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 280,
          opacity: 0.06,
          lineHeight: 1,
          display: 'flex',
        }}>
          🏆
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, zIndex: 1 }}>
          {/* Logo */}
          <div style={{
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: '-1px',
            display: 'flex',
          }}>
            <span style={{ color: '#dc2626' }}>Fan</span>
            <span style={{ color: '#dc2626' }}>XI</span>
          </div>

          {/* Main title */}
          <div style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-2px',
            lineHeight: 1,
            textAlign: 'center',
            display: 'flex',
          }}>
            WORLD CUP 2026
          </div>

          {/* Subtitle */}
          <div style={{
            fontSize: 36,
            fontWeight: 700,
            color: '#f59e0b',
            letterSpacing: '6px',
            textTransform: 'uppercase',
            display: 'flex',
          }}>
            BRACKET SIMULATOR
          </div>

          {/* Divider */}
          <div style={{
            width: 100, height: 2,
            background: 'linear-gradient(90deg, transparent, #dc2626, transparent)',
            marginTop: 4,
            display: 'flex',
          }} />

          {/* Tagline */}
          <div style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            display: 'flex',
          }}>
            Pick winners · Predict upsets · Share your bracket
          </div>
        </div>

        {/* Bottom URL */}
        <div style={{
          position: 'absolute',
          bottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
            background: 'rgba(220,38,38,0.1)',
            border: '1px solid rgba(220,38,38,0.25)',
            padding: '6px 18px',
            fontSize: 14,
            color: '#dc2626',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            display: 'flex',
          }}>
            fanxi.app/simulator
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
