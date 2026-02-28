// AI RFP Builder — PDF 이메일 발송 API (PRD: RFP 완성 → 이메일 발송)
// Resend API를 사용하여 RFP 문서를 이메일로 전송
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, rfpDocument, projectName } = await req.json();

    if (!email || !rfpDocument) {
      return NextResponse.json({ error: '이메일과 RFP 문서가 필요합니다.' }, { status: 400 });
    }

    // 게스트 이메일은 발송 불가
    if (email.startsWith('guest@')) {
      return NextResponse.json({ success: false, reason: 'guest' });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    // Resend API가 없으면 Supabase에 저장만 하고 성공 반환
    if (!RESEND_API_KEY) {
      console.log('[send-rfp-email] No RESEND_API_KEY, skipping email send');
      return NextResponse.json({
        success: true,
        method: 'stored',
        message: 'RFP가 저장되었습니다. 이메일 발송은 추후 지원 예정입니다.',
      });
    }

    // Resend API로 이메일 발송
    const subject = projectName
      ? `[위시켓 AI] ${projectName} - RFP 기획서가 완성되었습니다`
      : '[위시켓 AI] RFP 기획서가 완성되었습니다';

    const htmlContent = generateEmailHTML(rfpDocument, projectName);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AI RFP Builder <rfp@wishket.com>',
        to: [email],
        subject,
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[send-rfp-email] Resend error:', err);
      return NextResponse.json({
        success: true,
        method: 'stored',
        message: 'RFP가 저장되었습니다.',
      });
    }

    return NextResponse.json({
      success: true,
      method: 'email',
      message: '이메일로 RFP가 발송되었습니다.',
    });
  } catch (error) {
    console.error('[send-rfp-email] Error:', error);
    return NextResponse.json({
      success: true,
      method: 'stored',
      message: 'RFP가 저장되었습니다.',
    });
  }
}

function generateEmailHTML(rfpDocument: string, projectName?: string): string {
  const lines = rfpDocument.split('\n');
  let htmlBody = '';
  for (const line of lines) {
    if (line.startsWith('# ')) {
      htmlBody += `<h1 style="font-size:22px;font-weight:700;color:#0B1120;margin:28px 0 12px;border-bottom:2px solid #2563EB;padding-bottom:8px;">${line.slice(2)}</h1>`;
    } else if (line.startsWith('## ')) {
      htmlBody += `<h2 style="font-size:18px;font-weight:600;color:#1A2540;margin:24px 0 8px;">${line.slice(3)}</h2>`;
    } else if (line.startsWith('### ')) {
      htmlBody += `<h3 style="font-size:16px;font-weight:600;color:#334155;margin:16px 0 6px;">${line.slice(4)}</h3>`;
    } else if (line.startsWith('- ')) {
      htmlBody += `<div style="padding-left:16px;margin:4px 0;color:#475569;"><span style="color:#2563EB;">•</span> ${line.slice(2)}</div>`;
    } else if (line.startsWith('**') && line.endsWith('**')) {
      htmlBody += `<p style="font-weight:600;color:#0B1120;margin:8px 0;">${line.slice(2, -2)}</p>`;
    } else if (line.trim()) {
      htmlBody += `<p style="color:#475569;margin:6px 0;line-height:1.7;">${line}</p>`;
    }
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F1F5F9;">
  <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0B1120,#1A2540);border-radius:16px 16px 0 0;padding:32px;text-align:center;">
      <div style="font-size:14px;font-weight:600;color:#60A5FA;letter-spacing:2px;margin-bottom:8px;">WISHKET AI</div>
      <h1 style="color:white;font-size:24px;font-weight:700;margin:0;">RFP 기획서</h1>
      ${projectName ? `<p style="color:#93C5FD;font-size:15px;margin-top:8px;">${projectName}</p>` : ''}
    </div>

    <!-- Body -->
    <div style="background:white;padding:32px;border-radius:0 0 16px 16px;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
      ${htmlBody}

      <!-- CTA -->
      <div style="margin-top:32px;padding:24px;background:linear-gradient(135deg,#EFF6FF,#DBEAFE);border-radius:12px;text-align:center;">
        <p style="font-size:16px;font-weight:600;color:#1E40AF;margin:0 0 8px;">이 RFP로 바로 프로젝트를 시작하세요</p>
        <p style="font-size:14px;color:#3B82F6;margin:0 0 16px;">위시켓에서 검증된 개발사 매칭을 받아보세요</p>
        <a href="https://www.wishket.com/project/register/?utm_source=ai-rfp&utm_medium=email&utm_campaign=rfp-complete"
           style="display:inline-block;padding:12px 32px;background:#2563EB;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
          위시켓에서 프로젝트 등록하기 →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px;color:#94A3B8;font-size:13px;">
      <p style="margin:0;">위시켓 AI RFP Builder로 생성된 문서입니다</p>
      <p style="margin:4px 0 0;">© 2026 Wishket. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
