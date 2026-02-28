// AI RFP Builder — Chat API v7
// Claude AI가 대화 주도 + 기능 리스트 동적 생성.
// fallback은 UI 구조(nextStep, progress, rfpUpdate) + 안전장치.
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
 * Claude가 서비스 설명을 분석하여 맞춤 기능 리스트 생성
 * fallback에서 selectableFeatures가 나올 때 호출
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
2. must: 서비스가 동작하기 위해 반드시 필요한 핵심 기능
3. recommended: 있으면 좋지만 MVP에서는 생략 가능한 기능
4. 기능명은 한국어, 간결하게 (예: "실시간 채팅", "AI 자동응답")
5. 설명은 한 문장으로 핵심만
6. 서비스 설명과 관련 없는 기능은 절대 포함하지 마세요

JSON 배열만 출력 (다른 텍스트 없이):
[
  {"name": "기능명", "desc": "설명", "category": "must"},
  {"name": "기능명", "desc": "설명", "category": "recommended"}
]`
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
 * Claude AI가 맞춤 피드백 + 질문 생성
 * 기능 리스트가 아닌 일반 대화 단계에서 사용
 */
async function generateAIMessage(
  messages: ChatMessage[],
  nextTopicId: string,
  overview: string
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const conversationContext = messages
    .slice(-8)
    .map(m => `${m.role === 'user' ? '고객' : 'AI'}: ${m.content}`)
    .join('\n');

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: `위시켓 AI 프로젝트 컨설턴트. PRD 정보수집 대화 중.
규칙: 존댓말 필수. 인사이트/코칭/교육 금지. 짧은 피드백(1문장) + 다음 질문만.
견적/비용/시장분석 언급 금지. 고객 답변에 맞춤 반응.
고객 서비스: ${overview || '(미입력)'}
다음 질문 단계: ${nextTopicId}`,
      messages: [{
        role: 'user',
        content: `대화:\n${conversationContext}\n\n고객의 마지막 답변에 짧게 반응하고, "${nextTopicId}" 에 대해 질문하세요.`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return text || null;
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

    // 1. fallback 엔진 → UI 구조 (rfpUpdate, nextStep, progress, quickReplies 등)
    const fallback = generateFallbackResponse(userText, currentStep, rfpData);

    const overview = (rfpData?.overview as string) || '';
    const nextTopicId = fallback.nextStep ? (STEP_TO_TOPIC[fallback.nextStep] || '') : '';

    // 2. 기능 리스트가 나오는 단계 → Claude가 기능 리스트 새로 생성
    if (fallback.selectableFeatures && fallback.selectableFeatures.length > 0 && overview.length >= 2) {
      const aiFeatures = await generateAIFeatures(overview);
      if (aiFeatures && aiFeatures.length >= 3) {
        fallback.selectableFeatures = aiFeatures;
        fallback.message = `서비스 분석 결과, 아래 기능들을 추천드립니다. 필요한 기능을 선택해주세요.`;
      }
    }
    // 3. 일반 대화 단계 → Claude가 맞춤 피드백 + 질문 생성
    else if (nextTopicId && overview.length >= 2) {
      const aiMessage = await generateAIMessage(
        messages as ChatMessage[],
        nextTopicId,
        overview
      );
      if (aiMessage) {
        fallback.message = aiMessage;
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
