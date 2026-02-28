import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lwecmebszyqgomzvexxt.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

function generateShareId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { rfpDocument, rfpData, projectName } = await req.json();

    if (!rfpDocument) {
      return NextResponse.json({ error: 'PRD 문서가 필요합니다.' }, { status: 400 });
    }

    const shareId = generateShareId();

    const { error } = await supabase.from('shared_prds').insert({
      share_id: shareId,
      project_name: projectName || 'PRD 기획서',
      rfp_document: rfpDocument,
      rfp_data: rfpData || null,
    });

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: '공유 링크 생성 실패' }, { status: 500 });
    }

    return NextResponse.json({ success: true, shareId });
  } catch (err) {
    console.error('Share PRD error:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
