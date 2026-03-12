import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

// Task 3: Deduplication map to prevent double-shares
const recentSharesMap = new Map<string, { shareId: string; timestamp: number }>();

function getDocumentHash(doc: string): string {
  return crypto.createHash('md5').update(doc).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { rfpDocument, rfpData, projectName } = await req.json();

    if (!rfpDocument) {
      return NextResponse.json({ error: 'PRD 문서가 필요합니다.' }, { status: 400 });
    }

    // Task 3: Check if this share already exists within last 10 seconds
    const docHash = getDocumentHash(rfpDocument);
    const dedupeKey = `${projectName}_${docHash}`;
    const existingShare = recentSharesMap.get(dedupeKey);
    const now = Date.now();

    if (existingShare && now - existingShare.timestamp < 10000) {
      // Return existing share instead of creating duplicate
      return NextResponse.json({ success: true, shareId: existingShare.shareId });
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

    // Task 3: Store in dedup map
    recentSharesMap.set(dedupeKey, { shareId, timestamp: now });

    // Task 3: Clean up old entries (older than 10 seconds)
    for (const [key, value] of recentSharesMap.entries()) {
      if (now - value.timestamp > 10000) {
        recentSharesMap.delete(key);
      }
    }

    return NextResponse.json({ success: true, shareId });
  } catch (err) {
    console.error('Share PRD error:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
