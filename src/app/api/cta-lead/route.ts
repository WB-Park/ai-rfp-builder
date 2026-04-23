import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

async function sendSlackNotification(data: {
  name?: string;
  email: string;
  phone?: string;
  projectName?: string;
  projectType?: string;
  featureCount?: number;
  sessionId?: string;
  source?: string;
}) {
  if (!SLACK_WEBHOOK_URL) return;
  try {
    const adminUrl = `https://wishket-prd.com/admin`;
    const sourceLabel = data.source === 'shared_prd' ? '📤 공유 PRD 페이지'
      : data.source === 'download_gate' ? '📥 다운로드 게이팅'
      : data.source === 'exit_modal' ? '🚪 이탈 방지 모달'
      : data.source === 'prd_complete' ? '✅ PRD 완성 페이지'
      : data.source === 'prd_unlock_gate' ? '🔓 리포트 잠금 해제'
      : data.source === 'shared_prd_unlock' ? '🔗🔓 공유 PRD 잠금 해제'
      : `🔗 ${data.source || '알 수 없음'}`;
    const text = [
      '🔔 *새 매칭 신청이 들어왔습니다!*',
      '',
      ...(data.name ? [`👤 이름: ${data.name}`] : []),
      `📧 이메일: ${data.email}`,
      `📱 연락처: ${data.phone || '미입력'}`,
      `📋 프로젝트: ${data.projectName || '미입력'}`,
      `🔢 기능 수: ${data.featureCount || 0}개`,
      `🏷️ 유입 경로: ${sourceLabel}`,
      `🆔 세션: ${data.sessionId ? `\`${data.sessionId}\`` : '없음'}`,
      '',
      `👉 <${adminUrl}|어드민에서 확인하기>`,
    ].join('\n');

    const resp = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!resp.ok) {
      console.error(`Slack notification failed: ${resp.status} ${resp.statusText}`, await resp.text().catch(() => ''));
    } else {
      console.log(`[Slack CTA] ✅ 기본 알림 전송 완료 (${data.source}, ${data.email})`);
    }
  } catch (slackErr) {
    console.error('Slack notification error:', slackErr);
  }
}

// ━━ 강화 Slack 알림 (Block Kit) ━━
async function sendStrongSlackNotification(data: {
  name?: string;
  email: string;
  phone?: string;
  projectName?: string;
  projectType?: string;
  featureCount?: number;
  sessionId?: string;
  source?: string;
}) {
  if (!SLACK_WEBHOOK_URL) return;
  try {
    const adminUrl = `https://wishket-prd.com/admin`;
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    const sourceLabel = data.source === 'shared_prd' ? '공유 PRD 페이지'
      : data.source === 'download_gate' ? '다운로드 게이팅'
      : data.source === 'exit_modal' ? '이탈 방지 모달'
      : data.source === 'prd_complete' ? 'PRD 완성 페이지'
      : data.source === 'prd_unlock_gate' ? '🔓 리포트 잠금 해제 (세일즈 동의)'
      : data.source === 'shared_prd_unlock' ? '🔗🔓 공유 PRD 잠금 해제 (세일즈 동의)'
      : data.source || '직접 유입';

    const featureText = data.featureCount && data.featureCount > 0
      ? `${data.featureCount}개 기능`
      : '미확인';

    // 프로젝트 규모 판별
    const scaleEmoji = (data.featureCount || 0) >= 10 ? '🔥🔥🔥 대형'
      : (data.featureCount || 0) >= 5 ? '🔥🔥 중형'
      : (data.featureCount || 0) >= 1 ? '🔥 소형'
      : '📌 미확인';

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: data.source === 'prd_unlock_gate' ? '🚨 리포트 잠금 해제! 세일즈 동의 리드' : '🚨 새 리드 수집! 즉시 확인 필요',
          emoji: true,
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*👤 이름*\n${data.name || '미입력'}` },
          { type: 'mrkdwn', text: `*📧 이메일*\n${data.email}` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*📱 연락처*\n${data.phone || '미입력'}` },
          { type: 'mrkdwn', text: `*📋 프로젝트명*\n${data.projectName || '미입력'}` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*📊 프로젝트 규모*\n${scaleEmoji} (${featureText})` },
          { type: 'mrkdwn', text: `*🏷️ 유입 경로*\n${sourceLabel}` },
        ],
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*🕐 수집 시각*\n${now}` },
        ],
      },
      { type: 'divider' },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `⚡ *빠른 후속 조치가 전환율을 높입니다!* — <${adminUrl}|👉 어드민에서 리드 상세 확인>`,
          },
        ],
      },
    ];

    const resp = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 새 리드 수집: ${data.email} — ${data.projectName || '프로젝트 미입력'} (${featureText})`,
        blocks,
      }),
    });
    if (!resp.ok) {
      console.error(`Strong Slack notification failed: ${resp.status} ${resp.statusText}`, await resp.text().catch(() => ''));
    } else {
      console.log(`[Slack CTA] ✅ Block Kit 알림 전송 완료 (${data.source}, ${data.email})`);
    }
  } catch (slackErr) {
    console.error('Strong Slack notification error:', slackErr);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, projectName, projectType, featureCount, sessionId, source, marketing_consent } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: '이메일이 필요합니다.' }, { status: 400 });
    }

    const insertData: Record<string, unknown> = {
      email,
      phone: phone || null,
      project_name: projectName || '미입력',
      project_type: projectType || 'unknown',
      feature_count: featureCount || 0,
      session_id: sessionId || null,
      marketing_consent: marketing_consent || false,
      source: source || 'unknown',
      created_at: new Date().toISOString(),
    };
    // name 컬럼이 있으면 저장 (없어도 에러 무시)
    if (name) insertData.name = name;

    const { error } = await supabase.from('cta_leads').insert(insertData);

    if (error) {
      console.error('CTA lead save error:', error);
    }

    // Slack #알림_PRD 채널로 노티 (기존 알림 + 강화 알림 동시 발송)
    await Promise.all([
      sendSlackNotification({ name, email, phone, projectName, projectType, featureCount, sessionId, source }),
      sendStrongSlackNotification({ name, email, phone, projectName, projectType, featureCount, sessionId, source }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('CTA API error:', err);
    return NextResponse.json({ success: true }); // 사용자 경험 방해하지 않음
  }
}
