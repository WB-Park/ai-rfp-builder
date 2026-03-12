import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

async function sendSlackNotification(data: {
  email: string;
  phone?: string;
  projectName?: string;
  projectType?: string;
  featureCount?: number;
  sessionId?: string;
}) {
  if (!SLACK_WEBHOOK_URL) return;
  try {
    const adminUrl = `https://wishket-prd.com/admin`;
    const text = [
      '🔔 *새 매칭 신청이 들어왔습니다!*',
      '',
      `📧 이메일: ${data.email}`,
      `📱 연락처: ${data.phone || '미입력'}`,
      `📋 프로젝트: ${data.projectName || '미입력'}`,
      `🔢 기능 수: ${data.featureCount || 0}개`,
      `🆔 세션: ${data.sessionId ? `\`${data.sessionId}\`` : '없음'}`,
      '',
      `👉 <${adminUrl}|어드민에서 확인하기>`,
    ].join('\n');

    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  } catch (slackErr) {
    console.error('Slack notification error:', slackErr);
    // Slack 알림 실패해도 리드 저장에는 영향 없음
  }
}

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
    }

    // Slack #알림_PRD 채널로 노티
    await sendSlackNotification({ email, phone, projectName, projectType, featureCount, sessionId });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('CTA API error:', err);
    return NextResponse.json({ success: true }); // 사용자 경험 방해하지 않음
  }
}
