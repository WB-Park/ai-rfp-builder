import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lwecmebszyqgomzvexxt.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wishket2024!';

export async function POST(req: NextRequest) {
  try {
    const { action, password, sessionId } = await req.json();

    // 인증 확인
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 });
    }

    if (action === 'dashboard') {
      // 대시보드 요약 통계 — PRD 빌더 전용 테이블만
      const [sessionsRes, rfpLeadsRes, sharedRes, consultRes, ctaLeadsRes] = await Promise.all([
        supabase.from('rfp_sessions').select('id, lead_id, current_step, completed, created_at, updated_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
        supabase.from('rfp_leads').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
        supabase.from('shared_prds').select('id, share_id, project_name, created_at, view_count', { count: 'exact' }).order('created_at', { ascending: false }).limit(50),
        supabase.from('rfp_consultations').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(50),
        supabase.from('cta_leads').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
      ]);

      return NextResponse.json({
        sessions: {
          data: sessionsRes.data || [],
          total: sessionsRes.count || 0,
        },
        rfpLeads: {
          data: rfpLeadsRes.data || [],
          total: rfpLeadsRes.count || 0,
        },
        sharedPrds: {
          data: sharedRes.data || [],
          total: sharedRes.count || 0,
        },
        consultations: {
          data: consultRes.data || [],
          total: consultRes.count || 0,
        },
        ctaLeads: {
          data: ctaLeadsRes.data || [],
          total: ctaLeadsRes.count || 0,
        },
      });
    }

    if (action === 'session-detail') {
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId 필요' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('rfp_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        return NextResponse.json({ error: '세션을 찾을 수 없습니다' }, { status: 404 });
      }

      return NextResponse.json({ session: data });
    }

    return NextResponse.json({ error: '알 수 없는 action' }, { status: 400 });
  } catch (err) {
    console.error('Admin API error:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
