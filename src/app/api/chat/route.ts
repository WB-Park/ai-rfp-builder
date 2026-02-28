// AI RFP Builder — Chat API v6
// 모든 채팅을 Claude AI가 주도. fallback은 UI 구조 + 안전장치.
// Claude가 서비스를 이해하고 맞춤 질문/기능 추천/피드백 제공.
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { generateFallbackResponse } from '@/lib/fallback';
import { STEP_TO_TOPIC } from '@/types/rfp';

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SelectableFeature {
  name: string;
  desc: string;
  category: 'must' | 'recommended';
}

/**
 * Claude AI에게 RFP 정보수집 대화를 위임
 * - 사용자의 서비스 설명을 이해하고 맞춤 질문
 * - 기능 리스트를 분석 기반으로 생성
 * - 모든 답변에 맞춤형 짧은 피드백 + 다음 질문
 */
async function generateAIResponse(
  messages: ChatMessage[],
  currentStep: number,
  rfpData: Record<string, unknown> | undefined
): Promise<{
  message: string;
  selectableFeatures?: SelectableFeature[];
} | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const topicId = STEP_TO_TOPIC[currentStep] || 'overview';
  const overview = (rfpData?.overview as string) || '';

  // 대화 이력에서 컨텍스트 구성
  const conversationContext = messages
    .slice(-10) // 최근 10개 메시지만
    .map(m => `${m.role === 'user' ? '고객' : 'AI'}: ${m.content}`)
    .join('\n');

  const systemPrompt = `당신은 위시켓(Wishket)의 AI 프로젝트 컨설턴트입니다.
고객이 만들고 싶은 서비스에 대해 대화하면서, PRD(제품 요구사항 정의서) 작성에 필요한 정보를 수집합니다.

핵심 원칙:
- 반드시 존댓말 사용
- 전문가 인사이트, 코칭, 교육적 설명 절대 금지
- 짧고 핵심적인 피드백만 (1~2문장)
- 바로 다음 질문으로 넘어가기
- 견적/예산/비용/시장 분석 언급 금지
- 고객의 답변을 정확히 이해하고 맥락에 맞는 질문

현재 수집 단계: ${topicId}
고객이 설명한 서비스: ${overview || '(아직 입력 전)'}

수집해야 할 정보 순서:
1. overview: 어떤 서비스를 만들고 싶은지
2. coreFeatures: 필요한 핵심 기능들 (이 단계에서는 반드시 selectableFeatures JSON 포함)
3. targetUsers: 주 사용자/타겟
4. referenceServices: 참고 서비스
5. techRequirements: 웹/앱/플랫폼 선택
6. budgetTimeline: 희망 일정과 예산
7. additionalRequirements: 추가 요구사항

${topicId === 'coreFeatures' ? `
**중요 — 기능 리스트 생성 규칙:**
서비스 설명("${overview}")을 분석하여 이 서비스에 실제로 필요한 기능을 8~15개 추천하세요.
반드시 아래 JSON 블록을 응답에 포함하세요:

\`\`\`features
[
  {"name": "기능명", "desc": "한 줄 설명", "category": "must"},
  {"name": "기능명", "desc": "한 줄 설명", "category": "recommended"}
]
\`\`\`

- must: 서비스 작동에 필수인 기능
- recommended: 있으면 좋지만 MVP에서는 선택적인 기능
- 기능명은 한국어, 간결하게
- 서비스 설명에 맞는 기능만 (관계없는 기능 추천 금지)
` : ''}

응답 형식:
- 짧은 피드백(1~2문장) + 다음 질문
- 피드백은 고객의 답변에 대한 맞춤 반응 (제네릭 금지)
- 질문은 명확하고 구체적으로`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `대화 이력:\n${conversationContext}\n\n위 대화를 바탕으로, "${topicId}" 단계에 맞는 응답을 생성하세요.`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    if (!text) return null;

    // features JSON 파싱
    let selectableFeatures: SelectableFeature[] | undefined;
    const featuresMatch = text.match(/```features\s*([\s\S]*?)```/);
    if (featuresMatch) {
      try {
        const parsed = JSON.parse(featuresMatch[1]);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          selectableFeatures = parsed
            .filter((f: { name?: string; desc?: string }) => f.name && f.desc)
            .map((f: { name: string; desc: string; category?: string }) => ({
              name: f.name,
              desc: f.desc,
              category: f.category === 'must' ? 'must' as const : 'recommended' as const,
            }));
        }
      } catch {
        // JSON 파싱 실패 → selectableFeatures 없이 진행
      }
    }

    // features JSON 블록 제거한 메시지 텍스트
    const message = text.replace(/```features[\s\S]*?```/g, '').trim();

    return { message, selectableFeatures };
  } catch (error) {
    console.error('AI response generation error:', error);
    return null;
  }
}

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

    // 1. fallback 엔진 → UI 구조 (rfpUpdate, nextStep, progress 등)
    const fallback = generateFallbackResponse(userText, currentStep, rfpData);

    // 2. Claude AI → 대화 메시지 + 기능 리스트 생성
    const aiResponse = await generateAIResponse(
      messages as ChatMessage[],
      currentStep,
      rfpData as Record<string, unknown> | undefined
    );

    if (aiResponse) {
      // AI 응답으로 메시지 교체
      fallback.message = aiResponse.message;

      // AI가 생성한 기능 리스트가 있으면 교체
      if (aiResponse.selectableFeatures && aiResponse.selectableFeatures.length >= 3) {
        fallback.selectableFeatures = aiResponse.selectableFeatures;
      }

      // AI 응답이 있으면 quickReplies/inlineOptions는 fallback 것 유지 (UI 구조)
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
