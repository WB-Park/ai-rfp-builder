// AI RFP Builder — Chat API (PRD F1: 대화형 RFP 작성)
// Fallback 모드: API 키 없으면 사전 정의된 질문으로 진행
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

    // ━━ Fallback mode (no API key) ━━
    if (!HAS_API_KEY) {
      const fallback = generateFallbackResponse(userText, currentStep);
      return NextResponse.json(fallback);
    }

    // ━━ AI mode (with API key) ━━
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const contextMessage = `
현재 RFP 작성 상태:
- 현재 단계: ${currentStep}/7
- 수집된 정보: ${JSON.stringify(rfpData, null, 2)}

사용자의 다음 답변을 처리하고, 다음 질문으로 진행하세요.
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
      const fallback = generateFallbackResponse(userText, currentStep);
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
    });

  } catch (error) {
    console.error('Chat API error:', error);
    // PRD 8.1: Fallback
    try {
      const body = await req.clone().json();
      const userMsg = body.messages?.filter((m: { role: string }) => m.role === 'user').pop()?.content || '';
      const fallback = generateFallbackResponse(userMsg, body.currentStep || 1);
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
