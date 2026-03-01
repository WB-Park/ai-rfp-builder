import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PUT: 기존 세션 업데이트
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, rfpData, messages, currentStep, completed } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (rfpData !== undefined) updateData.rfp_data = rfpData;
    if (messages !== undefined) updateData.messages = messages;
    if (currentStep !== undefined) updateData.current_step = currentStep;
    if (completed !== undefined) updateData.completed = completed;

    const { data, error } = await supabase
      .from('rfp_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Session update error:', error);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Session API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: 세션 자동저장 (chat_sessions 테이블에 upsert)
export async function POST(req: NextRequest) {
  try {
    const { sessionId, email, messages, currentStep, rfpData } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId 필요' }, { status: 400 });
    }

    // rfp_sessions 테이블에 messages/rfpData 저장 (기존 세션이면 업데이트)
    const { error } = await supabase
      .from('rfp_sessions')
      .update({
        messages: JSON.stringify(messages || []),
        current_step: currentStep || 1,
        rfp_data: typeof rfpData === 'string' ? rfpData : JSON.stringify(rfpData || {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Session autosave error:', error);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Session autosave API error:', err);
    return NextResponse.json({ success: true });
  }
}

// GET: 세션 불러오기
export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('id');
    if (!sessionId) {
      return NextResponse.json({ error: 'id 필요' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('rfp_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return NextResponse.json({ found: false });
    }

    let messages = [];
    try { messages = typeof data.messages === 'string' ? JSON.parse(data.messages) : (data.messages || []); } catch { /* empty */ }

    let rfpData = {};
    try { rfpData = typeof data.rfp_data === 'string' ? JSON.parse(data.rfp_data) : (data.rfp_data || {}); } catch { /* empty */ }

    return NextResponse.json({
      found: true,
      messages,
      currentStep: data.current_step || 1,
      rfpData,
      email: data.email,
      updatedAt: data.updated_at,
    });
  } catch (err) {
    console.error('Session load error:', err);
    return NextResponse.json({ found: false });
  }
}
