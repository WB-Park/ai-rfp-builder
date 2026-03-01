import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req: NextRequest) {
  try {
    const { email, phone, projectName, projectType, featureCount, sessionId } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 });
    }

    const { error } = await supabase.from('cta_leads').insert({
      email,
      phone: phone || null,
      project_name: projectName || '미입력',
      project_type: projectType || 'unknown',
      feature_count: featureCount || 0,
      session_id: sessionId || null,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('CTA lead save error:', error);
      // 테이블이 없어도 에러 무시 — 리드는 나중에 수집 가능
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('CTA API error:', err);
    return NextResponse.json({ success: true }); // 사용자 경험 방해하지 않음
  }
}
