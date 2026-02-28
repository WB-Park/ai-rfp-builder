// AI RFP Builder — Chat API v3 (Hybrid: Fallback UI + AI Enhancement)
// 항상 fallback 엔진으로 UI 구조(selectableFeatures, quickReplies 등) 생성
// Claude AI는 메시지 텍스트만 강화 (전문가 인사이트, 맞춤 피드백)
import { NextRequest, NextResponse } from 'next/server';
import { generateFallbackResponse } from '@/lib/fallback';

const HAS_API_KEY = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'placeholder';

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
        message: '🎉 좋습니다! 지금까지 수집된 정보로 전문 PRD 기획서를 생성합니다.\n\n아래 버튼을 눌러 완성하세요!',
        rfpUpdate: null,
        nextAction: 'complete',
        nextStep: null,
        topicsCovered: [],
        progress: 100,
        canComplete: true,
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1단계: 항상 fallback 엔진 실행 → UI 구조 확보
    //   (selectableFeatures, quickReplies, inlineOptions,
    //    thinkingLabel, rfpUpdate, nextStep 등)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const fallback = generateFallbackResponse(userText, currentStep, rfpData);

    // API 키 없으면 fallback 그대로 반환
    if (!HAS_API_KEY) {
      return NextResponse.json(fallback);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2단계: Claude AI로 메시지 텍스트만 강화
    //   UI 구조(selectableFeatures 등)는 fallback 것을 유지
    //   Claude는 전문가 인사이트, 맞춤 피드백만 생성
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const enhancePrompt = `당신은 위시켓 13년 경험의 IT 외주 컨설턴트입니다.

사용자의 답변에 대해 짧고 전문적인 피드백을 한국어로 작성하세요.

규칙:
1. 존댓말 사용 (절대 반말 금지)
2. 첫 줄: 사용자 답변에 대한 짧은 긍정 피드백 (1문장)
3. 💡 전문가 인사이트: 실제 위시켓 프로젝트 데이터 기반 조언 (2-3문장)
4. 다음 질문은 시스템이 자동 생성하므로, 질문을 하지 마세요
5. 총 4-5문장 이내로 간결하게

사용자 답변: "${userText}"
현재까지 수집된 정보: ${JSON.stringify(rfpData, null, 2)}
현재 토픽: ${currentStep}`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{ role: 'user', content: enhancePrompt }],
      });

      const content = response.content[0];
      if (content.type === 'text' && content.text.trim().length > 20) {
        // Claude의 전문가 피드백 + fallback의 질문을 합침
        const aiInsight = content.text.trim();

        // fallback 메시지에서 질문 부분만 추출 (마지막 질문)
        const fallbackMsg = fallback.message || '';
        const questionMatch = fallbackMsg.match(/(?:다음 질문입니다\.|이제[^.]*질문[^.]*\.|각 기능[^.]*\.)[\s\S]*/);
        const questionPart = questionMatch ? '\n\n' + questionMatch[0] : '';

        // AI 인사이트 + fallback 질문 결합
        fallback.message = aiInsight + questionPart;
      }
    } catch (aiError) {
      console.error('AI enhancement error (using fallback message):', aiError);
      // AI 실패해도 fallback 메시지 유지
    }

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
