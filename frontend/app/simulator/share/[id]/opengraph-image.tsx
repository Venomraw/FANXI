import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'WC2026 Bracket — FanXI';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// Flag emoji lookup for common WC2026 teams (edge runtime can't import full data module)
const FLAGS: Record<string, string> = {
  Argentina: '🇦🇷', Brazil: '🇧🇷', France: '🇫🇷', Germany: '🇩🇪', Spain: '🇪🇸',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Portugal: '🇵🇹', Netherlands: '🇳🇱', Belgium: '🇧🇪', Italy: '🇮🇹',
  Croatia: '🇭🇷', Morocco: '🇲🇦', Japan: '🇯🇵', USA: '🇺🇸', Mexico: '🇲🇽',
  Uruguay: '🇺🇾', Colombia: '🇨🇴', Senegal: '🇸🇳', Switzerland: '🇨🇭', Canada: '🇨🇦',
  'South Korea': '🇰🇷', Ecuador: '🇪🇨', Turkey: '🇹🇷', Egypt: '🇪🇬',
  'Saudi Arabia': '🇸🇦', Iran: '🇮🇷', Nigeria: '🇳🇬', Ghana: '🇬🇭',
  Poland: '🇵🇱', Ukraine: '🇺🇦', Romania: '🇷🇴', Serbia: '🇷🇸',
  'South Africa': '🇿🇦', Tunisia: '🇹🇳', Australia: '🇦🇺', Qatar: '🇶🇦',
  Iraq: '🇮🇶', Panama: '🇵🇦', 'New Zealand': '🇳🇿', 'DR Congo': '🇨🇩',
  'Costa Rica': '🇨🇷', Honduras: '🇭🇳', Indonesia: '🇮🇩', Paraguay: '🇵🇾',
  Peru: '🇵🇪', Chile: '🇨🇱', Bolivia: '🇧🇴', Venezuela: '🇻🇪',
  Cameroon: '🇨🇲', Algeria: '🇩🇿', 'Ivory Coast': '🇨🇮', 'Cape Verde': '🇨🇻',
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let champion = 'Unknown';
  let finalist = 'Unknown';
  let displayName = '';
  let champFlag = '🏆';

  try {
    const res = await fetch(`${API}/simulator/share/${id}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      champion = data.champion ?? 'Unknown';
      finalist = data.finalist ?? 'Unknown';
      displayName = data.display_name ?? '';
      champFlag = FLAGS[champion] ?? '🏆';
    }
  } catch {
    // Fall back to defaults
  }

  const heading = displayName ? `${displayName}'s Bracket` : 'WC2026 Bracket';

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
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          display: 'flex',
        }} />

        {/* Glow */}
        <div style={{
          position: 'absolute',
          top: '45%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 400,
          background: 'radial-gradient(ellipse, rgba(220,38,38,0.15) 0%, transparent 65%)',
          display: 'flex',
        }} />

        {/* Content */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, zIndex: 1 }}>
          {/* Logo */}
          <div style={{ fontSize: 32, fontWeight: 700, display: 'flex' }}>
            <span style={{ color: '#dc2626' }}>FanXI</span>
          </div>

          {/* Heading */}
          <div style={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            display: 'flex',
          }}>
            {heading}
          </div>

          {/* Champion */}
          <div style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            marginTop: 8,
            display: 'flex',
          }}>
            CHAMPION
          </div>

          <div style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#f59e0b',
            letterSpacing: '-1px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <span>{champFlag}</span>
            <span>{champion}</span>
          </div>

          {/* Final matchup */}
          <div style={{
            fontSize: 22,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '1px',
            marginTop: 8,
            display: 'flex',
          }}>
            Final: {champion} vs {finalist}
          </div>
        </div>

        {/* Bottom CTA */}
        <div style={{
          position: 'absolute',
          bottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            background: 'rgba(220,38,38,0.12)',
            border: '1px solid rgba(220,38,38,0.3)',
            padding: '6px 18px',
            fontSize: 14,
            color: '#dc2626',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            display: 'flex',
          }}>
            Build yours at fanxi.app/simulator
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
