// AI RFP Builder — Chat API v4
// fallback 엔진으로 UI 구조 + 질문 생성. AI 인사이트/코칭 없음.
// 채팅은 RFP 정보수집에만 집중.
import { NextRequest, NextResponse } from 'next/server';
import { generateFallbackResponse } from '@/lib/fallback';

// Vercel serverless function timeout: 60초
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { messages, currentStep, rfpData } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: '메시지가 필요합니다.' }, { status: 400 });
    }

    const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop();
    const userText = lastUserMessage?.content || '';

    // "바로 RFP 생성하기" 처리
    if (userText === '바로 RFP 생성하기') {
      return NextResponse.json({
        message: '지금까지 수집된 정보로 PRD 기획서를 생성합니다.\n\n아래 버튼을 눌러 완성하세요.',
        rfpUpdate: null,
        nextAction: 'complete',
        nextStep: null,
        topicsCovered: [],
        progress: 100,
        canComplete: true,
      });
    }

    // fallback 엔진 실행 → UI 구조 + 질문 생성
    const fallback = generateFallbackResponse(userText, currentStep, rfpData);

    return NextResponse.json(fallback);

  } catch (error) {
    console.error('Chat API error:', error);
    try {
      const body = await req.clone().json();
      const userMsg = body.messages?.filter((m: { role: string }) => m.role === 'user').pop()?.content || '';
      const fallback = generateFallbackResponse(userMsg, body.currentStep || 1, body.rfpData);
      return NextResponse.json(fallback);
    } catch {
      return NextResponse.json({
        message: '잠시 문제가 발생했습니다. 다시 시도해주세요.',
        rfpUpdate: null,
        nextAction: 'continue',
        nextStep: null,
      });
    }
  }
}
