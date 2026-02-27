// AI RFP Builder — Consultation Request API (PRD F3: 상담신청/파트너 받아보기)
// Supabase 저장 + Slack 알림
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const {
      ctaType, name, email, phone, company,
      preferredTime, budgetRange, rfpSummary,
    } = await req.json();

    if (!ctaType || !name || !email || !phone) {
      return NextResponse.json({ error: '필수 정보를 입력해주세요.' }, { status: 400 });
    }

    // 1. Find lead by email
    const { data: lead } = await supabase
      .from('rfp_leads')
      .select('id')
      .eq('email', email)
      .single();

    // 2. Save consultation request to Supabase
    const { error: insertError } = await supabase
      .from('rfp_consultations')
      .insert({
        lead_id: lead?.id || null,
        cta_type: ctaType,
        preferred_time: preferredTime,
        budget_range: budgetRange,
        rfp_summary: rfpSummary?.slice(0, 2000),
        status: 'pending',
      });

    if (insertError) {
      console.error('Consultation insert error:', insertError);
    }

    // 3. Slack 알림
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    const ctaLabel = ctaType === 'consultation' ? '무료 상담신청' : '맞춤 파트너 받아보기';

    const slackMessage = {
      text: `🔔 새로운 ${ctaLabel}이 접수되었습니다!`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `🔔 AI RFP Builder — ${ctaLabel} 접수` },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*이름:* ${name}` },
            { type: 'mrkdwn', text: `*이메일:* ${email}` },
            { type: 'mrkdwn', text: `*연락처:* ${phone}` },
            { type: 'mrkdwn', text: `*회사:* ${company || '미입력'}` },
            { type: 'mrkdwn', text: `*상담 희망:* ${preferredTime || '무관'}` },
            { type: 'mrkdwn', text: `*예산:* ${budgetRange || '미정'}` },
          ],
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*RFP 요약:*\n${rfpSummary?.slice(0, 500) || '없음'}` },
        },
      ],
    };

    if (slackWebhookUrl) {
      try {
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackMessage),
        });
      } catch (slackError) {
        console.error('Slack notification failed:', slackError);
      }
    } else {
      console.log('[DEV] Slack notification:', JSON.stringify(slackMessage, null, 2));
    }

    return NextResponse.json({
      success: true,
      message: ctaType === 'consultation'
        ? '상담신청이 접수되었습니다. 24시간 내에 연락드리겠습니다.'
        : '파트너 추천 요청이 접수되었습니다. 맞춤 파트너 3사를 추천해드리겠습니다.',
      requestId: `req_${Date.now()}`,
    });

  } catch (error) {
    console.error('Consultation API error:', error);
    // Don't block the user flow
    return NextResponse.json({ success: true, message: '접수되었습니다.' });
  }
}
