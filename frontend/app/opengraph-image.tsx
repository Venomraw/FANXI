import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FanXI — World Cup 2026 Tactical Hub';
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
          background: 'linear-gradient(135deg, #060A06 0%, #0D130D 50%, #060A06 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Grid lines */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(0,255,133,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,133,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          display: 'flex',
        }} />

        {/* Glow orb */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 400,
          background: 'radial-gradient(ellipse, rgba(0,255,133,0.12) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Logo + tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, zIndex: 1 }}>
          <div style={{
            fontSize: 96,
            fontWeight: 700,
            color: '#E8F5E8',
            letterSpacing: '-2px',
            lineHeight: 1,
          }}>
            Fan<span style={{ color: '#00FF85' }}>XI</span>
          </div>

          <div style={{
            fontSize: 22,
            color: 'rgba(232,245,232,0.5)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
          }}>
            World Cup 2026 · Tactical Hub
          </div>

          {/* Divider */}
          <div style={{
            width: 80, height: 2,
            background: 'linear-gradient(90deg, transparent, #00FF85, transparent)',
            marginTop: 8,
            display: 'flex',
          }} />

          <div style={{
            fontSize: 18,
            color: 'rgba(232,245,232,0.4)',
            letterSpacing: '1px',
          }}>
            Build your XI · Predict the lineup · Prove your IQ
          </div>
        </div>

        {/* Bottom badge */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
            background: 'rgba(0,255,133,0.1)',
            border: '1px solid rgba(0,255,133,0.2)',
            padding: '6px 16px',
            fontSize: 13,
            color: '#00FF85',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}>
            fanxi.vercel.app
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
