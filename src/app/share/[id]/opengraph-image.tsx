// 공유 PRD 전용 동적 OG Image (프로젝트명 표시)
import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const alt = 'AI PRD 기획서 | 위시켓';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let projectName = 'PRD 기획서';
  let featureCount = 0;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lwecmebszyqgomzvexxt.supabase.co',
      process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    const { data } = await supabase
      .from('shared_prds')
      .select('project_name, rfp_document')
      .eq('share_id', id)
      .single();

    if (data?.project_name) projectName = data.project_name;
    try {
      const parsed = JSON.parse(data?.rfp_document || '{}');
      featureCount =
        parsed?.featureModules?.reduce(
          (sum: number, m: { features?: unknown[] }) => sum + (m.features?.length || 0),
          0
        ) || 0;
    } catch {
      // ignore
    }
  } catch {
    // fallback to defaults
  }

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
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #2563EB, #3B82F6)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#60A5FA', letterSpacing: '2px' }}>
            WISHKET AI PRD
          </span>
        </div>

        {/* Label */}
        <div
          style={{
            display: 'flex',
            padding: '8px 20px',
            borderRadius: '20px',
            background: 'rgba(37, 99, 235, 0.15)',
            border: '1px solid rgba(96, 165, 250, 0.25)',
            marginBottom: '24px',
          }}
        >
          <span style={{ fontSize: '16px', fontWeight: 600, color: '#60A5FA' }}>
            AI 자동 생성 기획서
          </span>
        </div>

        {/* Project name */}
        <span
          style={{
            fontSize: projectName.length > 20 ? '42px' : '50px',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.03em',
            lineHeight: 1.25,
            textAlign: 'center',
            maxWidth: '1000px',
          }}
        >
          {projectName}
        </span>

        {/* Feature count */}
        {featureCount > 0 && (
          <span
            style={{
              fontSize: '20px',
              fontWeight: 500,
              color: '#94A3B8',
              marginTop: '20px',
            }}
          >
            기능 {featureCount}개 포함
          </span>
        )}

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            left: '40px',
            right: '40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '15px', fontWeight: 500, color: '#475569' }}>
            wishket-prd.com
          </span>
          <span style={{ fontSize: '15px', fontWeight: 500, color: '#475569' }}>
            Powered by 위시켓
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
