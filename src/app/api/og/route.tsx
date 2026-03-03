import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Google Fonts에서 Noto Sans KR 폰트 로드
async function loadFont(): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(
      'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgms3VYcOA-vvnIzzuoyeLTq8H4hfeE.ttf'
    );
    if (res.ok) return await res.arrayBuffer();
  } catch {}
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title');
  const isShare = !!title;

  const fontData = await loadFont();

  const fonts = fontData
    ? [{ name: 'NotoSansKR', data: fontData, weight: 800 as const, style: 'normal' as const }]
    : [];

  const fontFamily = fontData
    ? 'NotoSansKR, sans-serif'
    : '-apple-system, BlinkMacSystemFont, sans-serif';

  // 공유 PRD 페이지용 OG (프로젝트명 표시)
  if (isShare) {
    const featureCount = searchParams.get('features') || '';
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(180deg, #0B1120 0%, #131C31 60%, #1A2540 100%)',
            padding: '60px 80px',
            fontFamily,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#60A5FA', letterSpacing: '2px' }}>WISHKET AI PRD</span>
          </div>
          <div style={{ display: 'flex', padding: '8px 20px', borderRadius: '20px', background: 'rgba(37, 99, 235, 0.15)', border: '1px solid rgba(96, 165, 250, 0.25)', marginBottom: '24px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#60A5FA' }}>AI 자동 생성 기획서</span>
          </div>
          <span style={{ fontSize: title.length > 20 ? '42px' : '50px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em', lineHeight: 1.25, textAlign: 'center', maxWidth: '1000px' }}>
            {title}
          </span>
          {featureCount && (
            <span style={{ fontSize: '20px', fontWeight: 500, color: '#94A3B8', marginTop: '20px' }}>
              기능 {featureCount}개 포함
            </span>
          )}
          <div style={{ position: 'absolute', bottom: '28px', left: '40px', right: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: 500, color: '#475569' }}>wishket-prd.com</span>
            <span style={{ fontSize: '15px', fontWeight: 500, color: '#475569' }}>Powered by 위시켓</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630, fonts }
    );
  }

  // 메인 랜딩 OG 이미지 — 히어로 메인카피
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #0B1120 0%, #131C31 60%, #1A2540 100%)',
          padding: '60px 80px',
          fontFamily,
        }}
      >
        {/* Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #2563EB, #3B82F6)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontSize: '22px', fontWeight: 700, color: '#60A5FA', letterSpacing: '3px' }}>WISHKET AI</span>
        </div>

        {/* Main headline */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px' }}>
          <span style={{ fontSize: '64px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            소프트웨어 기획서(PRD),
          </span>
          <span style={{ fontSize: '64px', fontWeight: 800, color: '#60A5FA', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            AI와 대화 몇 번이면 끝
          </span>
        </div>

        {/* Subtitle */}
        <p style={{ fontSize: '26px', fontWeight: 400, color: '#94A3B8', marginTop: '24px', lineHeight: 1.5, textAlign: 'center', maxWidth: '1000px' }}>
          아이디어만 말하면 개발사에 바로 전달 가능한 기획서가 완성됩니다
        </p>

        {/* CTA pill */}
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '36px', padding: '16px 42px', borderRadius: '16px', background: 'linear-gradient(135deg, #2563EB, #3B82F6)', boxShadow: '0 8px 32px rgba(37, 99, 235, 0.35)' }}>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#FFFFFF' }}>무료로 기획서 만들기 →</span>
        </div>

        {/* Bottom domain */}
        <span style={{ position: 'absolute', bottom: '28px', right: '40px', fontSize: '16px', fontWeight: 500, color: '#475569' }}>
          wishket-prd.com
        </span>
      </div>
    ),
    { width: 1200, height: 630, fonts }
  );
}
