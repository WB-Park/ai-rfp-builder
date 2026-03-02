// OG Image — 랜딩 히어로 메인카피 심플 디자인 (1200×630)
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'AI PRD 빌더 — 대화만으로 완성하는 전문 기획서 | 위시켓';
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
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #0B1120 0%, #131C31 60%, #1A2540 100%)',
          padding: '60px 80px',
          fontFamily: '"Pretendard", "Inter", sans-serif',
        }}
      >
        {/* Top badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#60A5FA',
              letterSpacing: '3px',
            }}
          >
            WISHKET AI
          </span>
        </div>

        {/* Main headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.03em',
              lineHeight: 1.25,
            }}
          >
            소프트웨어 기획서(PRD),
          </span>
          <span
            style={{
              fontSize: '52px',
              fontWeight: 800,
              color: '#60A5FA',
              letterSpacing: '-0.03em',
              lineHeight: 1.25,
            }}
          >
            AI와 대화 몇 번이면 끝
          </span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '22px',
            fontWeight: 400,
            color: '#94A3B8',
            marginTop: '28px',
            lineHeight: 1.5,
            textAlign: 'center',
            maxWidth: '900px',
          }}
        >
          아이디어만 말하면 개발사에 바로 전달 가능한 기획서가 완성됩니다
        </p>

        {/* CTA pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: '40px',
            padding: '14px 36px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
            boxShadow: '0 8px 32px rgba(37, 99, 235, 0.35)',
          }}
        >
          <span
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#FFFFFF',
            }}
          >
            무료로 기획서 만들기 →
          </span>
        </div>

        {/* Bottom domain */}
        <span
          style={{
            position: 'absolute',
            bottom: '28px',
            right: '40px',
            fontSize: '16px',
            fontWeight: 500,
            color: '#475569',
          }}
        >
          wishket-prd.com
        </span>
      </div>
    ),
    { ...size }
  );
}
