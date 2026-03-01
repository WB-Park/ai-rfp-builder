// AI RFP Builder — Chat API v8
// 전체 대화를 Claude가 주도. fallback은 UI 구조 + 데이터 파싱만.
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
 * Claude가 서비스 설명 분석 → 맞춤 기능 리스트 생성
 */
async function generateAIFeatures(overview: string): Promise<SelectableFeature[] | null> {
  if (!process.env.ANTHROPIC_API_KEY || !overview || overview.length < 2) return null;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `서비스 설명을 분석하여 개발에 필요한 기능 리스트를 JSON 배열로 생성하세요.

서비스 설명: "${overview}"

규칙:
1. 이 서비스에 실제로 필요한 기능만 추천 (8~15개)
2. must: 서비스 동작에 반드시 필요한 핵심 기능
3. recommended: 있으면 좋지만 MVP에서 생략 가능한 기능
4. 기능명은 한국어, 간결하게
5. 설명은 한 문장으로 핵심만
6. 서비스와 관련 없는 기능 절대 포함 금지

JSON 배열만 출력:
[{"name": "기능명", "desc": "설명", "category": "must"}]`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed) || parsed.length < 3) return null;

    return parsed
      .filter((f: { name?: string; desc?: string }) => f.name && f.desc)
      .map((f: { name: string; desc: string; category?: string }) => ({
        name: f.name,
        desc: f.desc,
        category: f.category === 'must' ? 'must' as const : 'recommended' as const,
      }));
  } catch (error) {
    console.error('AI feature generation error:', error);
    return null;
  }
}

/**
 * Claude가 대화 메시지 생성 — 분석 + 질문을 분리하여 반환
 */
async function generateAIMessage(
  messages: ChatMessage[],
  currentTopicId: string,
  nextTopicId: string,
  overview: string,
  hasFeatures: boolean
): Promise<{ analysis: string; question: string } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const conversationContext = messages
    .slice(-8)
    .map(m => `${m.role === 'user' ? '고객' : 'AI'}: ${m.content}`)
    .join('\n');

  const topicNames: Record<string, string> = {
    overview: '프로젝트 설명',
    coreFeatures: '핵심 기능',
    targetUsers: '타겟 사용자',
    referenceServices: '참고 서비스',
    techRequirements: '기술 요구사항 (웹/앱)',
    budgetTimeline: '예산과 일정',
    additionalRequirements: '추가 요구사항',
  };

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `당신은 위시켓에서 10,000건 이상의 IT 외주 프로젝트를 분석한 수석 PM 컨설턴트입니다.
고객의 프로젝트 기획을 돕는 PRD 정보수집 대화를 진행합니다.

[핵심 원칙]
- 존댓말 필수
- 고객 답변에서 모호하거나 구체성이 부족한 부분을 정확히 짚어주기
- 제네릭한 반응 금지 (예: "좋은 생각이시네요" → 금지)
- 견적/비용/시장분석/코칭/교육/조언은 언급 금지

[중요: 응답 형식]
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "analysis": "고객 답변에 대한 구체적 피드백 (2~3문장). 답변에서 좋은 점을 짚되, 부족한 부분이 있다면 구체화 방향을 안내. 💡 인사이트를 한 문장 포함.",
  "question": "다음 토픽에 대한 자연스러운 질문 (1~2문장)"
}

고객 서비스: ${overview || '(미입력)'}
방금 답변한 항목: ${topicNames[currentTopicId] || currentTopicId}
다음 질문할 항목: ${topicNames[nextTopicId] || nextTopicId}${hasFeatures ? '\n\n[주의: 기능 리스트는 별도로 UI에 표시됩니다. 메시지에서는 기능을 나열하지 마세요. "아래에서 필요한 기능을 선택해주세요" 정도만 안내하세요.]' : ''}`,
      messages: [{
        role: 'user',
        content: `대화 히스토리:\n${conversationContext}\n\n위 대화를 바탕으로, 고객의 마지막 답변에 대한 분석(analysis)과 다음 질문(question)을 JSON으로 분리하여 응답하세요.`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    if (!text) return null;

    // JSON 파싱 시도
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.analysis && parsed.question) {
          return { analysis: parsed.analysis, question: parsed.question };
        }
      } catch { /* fallback below */ }
    }

    // JSON 파싱 실패 시 텍스트를 분리 시도 (줄바꿈 기준)
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length >= 2) {
      const midPoint = Math.ceil(lines.length * 0.6);
      return {
        analysis: lines.slice(0, midPoint).join('\n'),
        question: lines.slice(midPoint).join('\n'),
      };
    }

    return { analysis: text, question: '' };
  } catch (error) {
    console.error('AI message error:', error);
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

    if (userText === '바로 RFP 생성하기') {
      return NextResponse.json({
        message: '지금까지 수집된 정보로 PRD 기획서를 생성합니다.\n\n아래 버튼을 눌러 완성하세요.',
        rfpUpdate: null, nextAction: 'complete', nextStep: null,
        topicsCovered: [], progress: 100, canComplete: true,
      });
    }

    // 1. fallback 엔진 → UI 구조 (rfpUpdate, nextStep, progress, quickReplies)
    const fallback = generateFallbackResponse(userText, currentStep, rfpData);

    const overview = (rfpData?.overview as string) || userText; // 첫 단계면 userText가 overview
    const currentTopicId = STEP_TO_TOPIC[currentStep] || 'overview';
    const nextTopicId = fallback.nextStep ? (STEP_TO_TOPIC[fallback.nextStep] || '') : '';
    const hasFeatures = !!(fallback.selectableFeatures && fallback.selectableFeatures.length > 0);

    // 2. 기능 리스트 → Claude가 새로 생성
    if (hasFeatures && overview.length >= 2) {
      const aiFeatures = await generateAIFeatures(overview);
      if (aiFeatures && aiFeatures.length >= 3) {
        fallback.selectableFeatures = aiFeatures;
      }
    }

    // 3. 대화 메시지 → Claude가 분석 + 질문 분리 생성
    if (nextTopicId || hasFeatures) {
      const aiResult = await generateAIMessage(
        messages as ChatMessage[],
        currentTopicId,
        nextTopicId || 'coreFeatures',
        overview,
        hasFeatures
      );
      if (aiResult) {
        fallback.analysisMessage = aiResult.analysis;
        fallback.questionMessage = aiResult.question;
        // 기존 message 필드도 유지 (호환성) — 질문 메시지만
        fallback.message = aiResult.question || aiResult.analysis;
      }
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
        rfpUpdate: null, nextAction: 'continue', nextStep: null,
      });
    }
  }
}
