// AI RFP Builder — Chat API v2 (Dynamic Conversation)
// Fallback 모드: 동적 맥락 기반 질문 생성
// AI 모드: Claude Sonnet으로 맞춤형 질문 생성
import { NextRequest, NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '@/lib/prompts';
import { generateFallbackResponse } from '@/lib/fallback';

const HAS_API_KEY = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'placeholder';

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
        message: '🎉 좋습니다! 지금까지 수집된 정보로 전문 RFP를 생성합니다.\n\n아래 버튼을 눌러 완성하세요!',
        rfpUpdate: null,
        nextAction: 'complete',
        nextStep: null,
        topicsCovered: [],
        progress: 100,
        canComplete: true,
      });
    }

    // ━━ Fallback mode (no API key) — 동적 대화 엔진 ━━
    if (!HAS_API_KEY) {
      const fallback = generateFallbackResponse(userText, currentStep, rfpData);
      return NextResponse.json(fallback);
    }

    // ━━ AI mode (with API key) — Claude Sonnet 동적 질문 ━━
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const contextMessage = `
현재 RFP 작성 상태:
- 현재 토픽 단계: ${currentStep}
- 수집된 정보: ${JSON.stringify(rfpData, null, 2)}

사용자의 답변을 처리하고, 맥락에 맞는 다음 질문을 동적으로 생성하세요.
이전 답변 내용을 참조하여 맞춤형 질문을 만드세요.
`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT + '\n\n' + contextMessage,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      const fallback = generateFallbackResponse(userText, currentStep, rfpData);
      return NextResponse.json(fallback);
    }

    let parsed;
    try {
      const jsonMatch = content.text.match(/```json\s*([\s\S]*?)\s*```/) ||
                        content.text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content.text;
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = {
        message: content.text,
        rfp_update: null,
        next_action: 'continue',
        next_step: currentStep + 1,
      };
    }

    return NextResponse.json({
      message: parsed.message,
      rfpUpdate: parsed.rfp_update,
      nextAction: parsed.next_action,
      nextStep: parsed.next_step,
      topicsCovered: parsed.topics_covered || [],
      progress: parsed.progress || 0,
      canComplete: parsed.can_complete || false,
    });

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
