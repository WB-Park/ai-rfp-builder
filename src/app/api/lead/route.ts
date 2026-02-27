// AI RFP Builder — Lead Collection API (PRD 2.3 리드 수집 정책)
// Supabase 실제 연동 + Slack 알림

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Slack 알릸 헬퍼
async function notifySlack(type: string, data: Record<string, string>) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    let text = '';
    if (type === 'new_lead') {
      text = [
        '\u2728 *새로운 리드가 등록되었습니다!*',
        '',
        `> \ud83d\udce7 *이메일:* ${data.email || '미입력'}`,
        '',
        `\ud83d\udd52 ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
        '_AI RFP Builder_',
      ].join('\n');
    } else if (type === 'rfp_completed') {
      text = [
        '\ud83c\udf89 *RFP가 완성되었습니다!*',
        '',
        `> \ud83d\udc64 *이름:* ${data.name || '미입력'}`,
        `> \ud83d\udce7 *이메일:* ${data.email || '미입력'}`,
        `> \ud83d\udcde *연락처:* ${data.phone || '미입력'}`,
        `> \ud83c\udfe2 *회사명:* ${data.company || '미입력'}`,
        '',
        `\ud83d\udd52 ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
        '_AI RFP Builder_',
      ].join('\n');
    }

    if (text) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
    }
  } catch (err) {
    console.error('Slack notification failed:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, name, phone, company, step } = await req.json();

    if (step === 'email') {
      // PRD: 이메일 수집 (서비스 시작 시 필수)
      if (!email || !email.includes('@')) {
        return NextResponse.json(
          { error: '유효한 이메일을 입력해주세요.' },
          { status: 400 }
        );
      }

      // Check if lead already exists
      const { data: existing } = await supabase
        .from('rfp_leads')
        .select('id')
        .eq('email', email)
        .single();

      let leadId: string;
      let isNewLead = false;

      if (existing) {
        leadId = existing.id;
        await supabase
          .from('rfp_leads')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', leadId);
      } else {
        isNewLead = true;
        const { data: newLead, error } = await supabase
          .from('rfp_leads')
          .insert({ email, source: 'ai-rfp-builder' })
          .select('id')
          .single();

        if (error) {
          console.error('Supabase insert error:', error);
          leadId = `temp_${Date.now()}`;
        } else {
          leadId = newLead.id;
        }
      }

      // Create RFP session
      const { data: session } = await supabase
        .from('rfp_sessions')
        .insert({
          lead_id: !leadId.startsWith('temp_') ? leadId : null,
        })
        .select('id')
        .single();

      // 새 리드일 때 Slack 알림 (non-blocking)
      if (isNewLead) {
        notifySlack('new_lead', { email });
      }

      return NextResponse.json({
        leadId,
        sessionId: session?.id || `session_${Date.now()}`,
      });
    }

    if (step === 'contact') {
      // PRD: 연락처 수집 (PDF 다운로드 전 필수)
      if (!name || !phone) {
        return NextResponse.json(
          { error: '이름과 연락처를 입력해주세요.' },
          { status: 400 }
        );
      }

      // Update lead with contact info
      if (email) {
        const { error } = await supabase
          .from('rfp_leads')
          .update({
            name,
            phone,
            company,
            updated_at: new Date().toISOString(),
          })
          .eq('email', email);

        if (error) {
          console.error('Supabase update error:', error);
        }
      }

      // RFP 완성 Slack 알림 (non-blocking)
      notifySlack('rfp_completed', { name, email, phone, company: company || '' });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: '잘못된 요청입니다.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Lead API error:', error);
    return NextResponse.json({
      leadId: `fallback_${Date.now()}`,
      sessionId: `session_${Date.now()}`,
    });
  }
}
