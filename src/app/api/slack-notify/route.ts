import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, leadData, rfpSummary } = body;

    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.log('Slack webhook URL not configured, skipping notification');
      return NextResponse.json({ success: true, skipped: true });
    }

    let message = '';

    if (type === 'new_lead') {
      message = [
        ':sparkles: *새로운 리드가 등록되었습니다!*',
        '',
        `> :bust_in_silhouette: *이름:* ${leadData?.name || '미입력'}`,
        `> :email: *이메일:* ${leadData?.email || '미입력'}`,
        `> :telephone_receiver: *연락처:* ${leadData?.phone || '미입력'}`,
        `> :office: *회사명:* ${leadData?.company || '미입력'}`,
        '',
        `:clock3: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
      ].join('\n');
    } else if (type === 'rfp_completed') {
      message = [
        ':tada: *RFP가 완성되었습니다!*',
        '',
        `> :bust_in_silhouette: *이름:* ${leadData?.name || '미입력'}`,
        `> :email: *이메일:* ${leadData?.email || '미입력'}`,
        `> :telephone_receiver: *연락처:* ${leadData?.phone || '미입력'}`,
        `> :office: *회사명:* ${leadData?.company || '미입력'}`,
        '',
        rfpSummary ? `> :page_facing_up: *프로젝트:* ${rfpSummary}` : '',
        '',
        `:clock3: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
        '',
        '_AI RFP Builder에서 자동 생성된 알림입니다._',
      ].filter(Boolean).join('\n');
    } else if (type === 'consultation_request') {
      message = [
        ':phone: *상담 신청이 접수되었습니다!*',
        '',
        `> :bust_in_silhouette: *이름:* ${leadData?.name || '미입력'}`,
        `> :email: *이메일:* ${leadData?.email || '미입력'}`,
        `> :telephone_receiver: *연락처:* ${leadData?.phone || '미입력'}`,
        `> :office: *회사명:* ${leadData?.company || '미입력'}`,
        '',
        rfpSummary ? `> :page_facing_up: *프로젝트:* ${rfpSummary}` : '',
        '',
        ':rotating_light: *24시간 내 연락 필요합니다!*',
        '',
        `:clock3: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
      ].filter(Boolean).join('\n');
    }

    if (message) {
      // 기존 텍스트 알림
      const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      });

      if (!resp.ok) {
        console.error('Slack notification failed:', resp.status);
        return NextResponse.json(
          { success: false, error: 'Slack notification failed' },
          { status: 500 }
        );
      }

      // ━━ 강화 Block Kit 알림 (리드 관련 타입만) ━━
      if (type === 'new_lead' || type === 'consultation_request') {
        const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
        const adminUrl = 'https://wishket-prd.com/admin';
        const isConsultation = type === 'consultation_request';

        const strongBlocks = [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: isConsultation ? '🚨 상담 신청! 즉시 연락 필요' : '🚨 새 리드 수집! 즉시 확인 필요',
              emoji: true,
            },
          },
          { type: 'divider' },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*📧 이메일*\n${leadData?.email || '미입력'}` },
              { type: 'mrkdwn', text: `*📱 연락처*\n${leadData?.phone || '미입력'}` },
            ],
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*👤 이름*\n${leadData?.name || '미입력'}` },
              { type: 'mrkdwn', text: `*🏢 회사*\n${leadData?.company || '미입력'}` },
            ],
          },
          ...(rfpSummary ? [{
            type: 'section' as const,
            text: { type: 'mrkdwn' as const, text: `*📋 프로젝트*\n${rfpSummary}` },
          }] : []),
          { type: 'divider' },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `⚡ *${isConsultation ? '24시간 내 연락 필수!' : '빠른 후속 조치가 전환율을 높입니다!'}* — 🕐 ${now} — <${adminUrl}|👉 어드민 확인>`,
              },
            ],
          },
        ];

        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🚨 ${isConsultation ? '상담 신청' : '새 리드'}: ${leadData?.email || '미입력'} — ${leadData?.name || ''}`,
              blocks: strongBlocks,
            }),
          });
        } catch (strongErr) {
          console.error('Strong Slack notification error:', strongErr);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Slack notify error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
