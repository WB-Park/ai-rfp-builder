// AI PRD Builder — Chat API v9 (Fully AI-Driven Dynamic Conversation)
// 고정형 질문 완전 제거. Claude가 대화 맥락을 분석하여 다음 질문을 직접 생성.
// 예산 질문 제거. 기능/타겟/기술 요구사항에 집중.
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { RFPData, getTopicsCovered, isReadyToComplete } from '@/types/rfp';

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

// ═══════════════════════════════════════════════
//  Claude가 기능 리스트 생성 (기존 유지)
// ═══════════════════════════════════════════════
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

// ═══════════════════════════════════════════════
//  핵심: Claude가 대화 전체를 주도하는 메인 엔진
// ═══════════════════════════════════════════════
async function generateDynamicResponse(
  messages: ChatMessage[],
  rfpData: RFPData,
): Promise<{
  analysis: string;
  question: string;
  rfpUpdate: { section: string; value: string | object } | null;
  quickReplies: string[];
  showFeatureSelector: boolean;
  completionReady: boolean;
  progressPercent: number;
  thinkingLabel: string;
} | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  // 대화 히스토리 구성 (최근 12턴)
  const conversationContext = messages
    .slice(-12)
    .map(m => `${m.role === 'user' ? '고객' : 'AI'}: ${m.content}`)
    .join('\n');

  // 현재 수집된 정보 요약
  const collectedInfo = [];
  if (rfpData.overview) collectedInfo.push(`프로젝트 개요: ${rfpData.overview}`);
  if (rfpData.targetUsers) collectedInfo.push(`타겟 사용자: ${rfpData.targetUsers}`);
  if (rfpData.coreFeatures.length > 0) collectedInfo.push(`핵심 기능: ${rfpData.coreFeatures.map(f => f.name).join(', ')}`);
  if (rfpData.referenceServices) collectedInfo.push(`참고 서비스: ${rfpData.referenceServices}`);
  if (rfpData.techRequirements) collectedInfo.push(`기술 요구사항: ${rfpData.techRequirements}`);
  if (rfpData.additionalRequirements) collectedInfo.push(`추가 요구사항: ${rfpData.additionalRequirements}`);

  const missingInfo = [];
  if (!rfpData.overview) missingInfo.push('프로젝트 개요 (필수)');
  if (!rfpData.targetUsers) missingInfo.push('타겟 사용자');
  if (rfpData.coreFeatures.length === 0) missingInfo.push('핵심 기능 (필수)');
  if (!rfpData.referenceServices) missingInfo.push('참고 서비스/벤치마크');
  if (!rfpData.techRequirements) missingInfo.push('기술 요구사항 (웹/앱)');
  if (!rfpData.additionalRequirements) missingInfo.push('추가 요구사항');

  const isFirstMessage = messages.filter(m => m.role === 'user').length <= 1;
  const messageCount = messages.filter(m => m.role === 'user').length;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: `당신은 위시켓에서 116,000건 이상의 IT 외주 프로젝트를 분석한 수석 PM 컨설턴트입니다.
고객과 자연스러운 대화를 통해 PRD(제품 요구사항 문서)에 필요한 정보를 수집합니다.

[핵심 원칙]
- 존댓말 필수
- 고정된 질문 순서 없음. 고객의 답변 맥락에 따라 가장 자연스럽고 중요한 다음 질문을 생성
- 고객이 한 번에 여러 정보를 제공하면 모두 반영하고, 부족한 부분만 추가 질문
- 제네릭한 반응 금지. "좋은 생각이시네요" 대신 구체적으로 짚기
- 💡 인사이트는 위시켓 프로젝트 데이터 기반 사실만
- 예산/견적/비용/시장분석 관련 질문은 절대 하지 마세요. 예산은 PRD 결과에서 AI가 산출합니다.
- 한 번에 하나의 주제에 대해서만 질문하세요 (질문 폭탄 금지)

[수집해야 할 정보 - 우선순위순]
1. 프로젝트 개요: 어떤 서비스인지 (필수, 첫 번째로 수집)
2. 핵심 기능: 어떤 기능이 필요한지 (필수, 개요 파악 후 기능 선택 UI 제안)
3. 타겟 사용자: 누가 사용하는지
4. 기술 요구사항: 웹/앱/둘 다
5. 참고 서비스: 벤치마크할 서비스
6. 추가 요구사항: 소스코드 귀속, 디자인 포함 등

[중요 규칙]
- 개요를 파악한 직후에는 반드시 showFeatureSelector=true로 설정하여 기능 선택 UI를 표시하세요
- 기능 선택이 완료된 후에는 맥락상 가장 중요한 정보를 물어보세요
- overview + coreFeatures + 1개 추가 정보가 수집되면 completionReady=true
- 5개 이상 정보가 수집되면 자연스럽게 완료를 제안하세요
- 사용자가 "건너뛰기"라고 하면 해당 토픽은 넘기고 다음으로
- 사용자가 기능을 JSON 배열로 보내면 (UI 선택 결과) rfpUpdate에 coreFeatures로 반영

[현재 수집 상태]
${collectedInfo.length > 0 ? collectedInfo.join('\n') : '(아직 수집된 정보 없음)'}

[미수집 항목]
${missingInfo.length > 0 ? missingInfo.join(', ') : '(모든 필수 정보 수집 완료)'}

대화 턴 수: ${messageCount}

[응답 형식 — 반드시 아래 JSON만 출력]
{
  "analysis": "고객 답변에 대한 맥락적 피드백 (2~3문장). 구체적으로 짚되, 💡 인사이트 1문장 포함.",
  "question": "다음 질문 (1~2문장). 선택지/예시를 포함하여 답변하기 쉽게.",
  "rfpUpdate": { "section": "overview|targetUsers|coreFeatures|techRequirements|referenceServices|additionalRequirements", "value": "추출한 값" } 또는 null,
  "quickReplies": ["선택지1", "선택지2"],
  "showFeatureSelector": false,
  "completionReady": false,
  "progressPercent": 0~100,
  "thinkingLabel": "분석 중 표시할 레이블"
}

rfpUpdate.section은 반드시 위 6개 중 하나여야 합니다.
rfpUpdate.value는:
- coreFeatures일 때: 기능 배열 [{"name":"...", "description":"...", "priority":"P1|P2|P3"}]
- 그 외: 문자열

progressPercent 계산: 수집된 항목 수 / 6 * 100 (overview, targetUsers, coreFeatures, techRequirements, referenceServices, additionalRequirements)`,
      messages: [{
        role: 'user',
        content: `대화 히스토리:\n${conversationContext}\n\n고객의 마지막 답변을 분석하고, 맥락에 맞는 다음 질문을 생성하세요. 반드시 JSON 형식으로만 응답하세요.`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      analysis: parsed.analysis || '',
      question: parsed.question || '',
      rfpUpdate: parsed.rfpUpdate || null,
      quickReplies: parsed.quickReplies || [],
      showFeatureSelector: parsed.showFeatureSelector || false,
      completionReady: parsed.completionReady || false,
      progressPercent: parsed.progressPercent || 0,
      thinkingLabel: parsed.thinkingLabel || '분석 중...',
    };
  } catch (error) {
    console.error('Dynamic response error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════
//  간단한 fallback (API 실패 시)
// ═══════════════════════════════════════════════
function generateSimpleFallback(rfpData: RFPData, userMessage: string): {
  message: string;
  rfpUpdate: { section: string; value: string } | null;
  quickReplies: string[];
  completionReady: boolean;
  progressPercent: number;
} {
  // 어떤 정보가 빠져있는지 확인
  if (!rfpData.overview) {
    return {
      message: '어떤 서비스를 만들고 싶으신가요?',
      rfpUpdate: { section: 'overview', value: userMessage.trim() },
      quickReplies: [],
      completionReady: false,
      progressPercent: 0,
    };
  }
  if (rfpData.coreFeatures.length === 0) {
    return {
      message: '이 서비스에 어떤 기능이 필요한가요?',
      rfpUpdate: null,
      quickReplies: [],
      completionReady: false,
      progressPercent: 17,
    };
  }
  if (!rfpData.targetUsers) {
    return {
      message: '주 사용자는 누구인가요?',
      rfpUpdate: { section: 'targetUsers', value: userMessage.trim() },
      quickReplies: ['20~30대 직장인', '전 연령 일반 사용자', '기업 고객 (B2B)'],
      completionReady: false,
      progressPercent: 33,
    };
  }

  const covered = getTopicsCovered(rfpData);
  return {
    message: '추가 정보가 있으시면 알려주세요. 없으시면 아래 버튼으로 PRD를 생성하실 수 있습니다.',
    rfpUpdate: null,
    quickReplies: [],
    completionReady: isReadyToComplete(rfpData),
    progressPercent: Math.round((covered.length / 6) * 100),
  };
}

// ═══════════════════════════════════════════════
//  POST Handler
// ═══════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const { messages, rfpData: clientRfpData } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: '메시지가 필요합니다.' }, { status: 400 });
    }

    const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop();
    const userText = lastUserMessage?.content || '';

    // rfpData 초기화
    const rfpData: RFPData = clientRfpData || {
      overview: '', targetUsers: '', coreFeatures: [],
      referenceServices: '', techRequirements: '', budgetTimeline: '', additionalRequirements: '',
    };

    // "바로 PRD 생성하기" 명령
    if (userText === '바로 RFP 생성하기' || userText === '바로 PRD 생성하기') {
      return NextResponse.json({
        message: '지금까지 수집된 정보로 PRD 기획서를 생성합니다.\n\n아래 버튼을 눌러 완성하세요.',
        rfpUpdate: null, nextAction: 'complete',
        topicsCovered: getTopicsCovered(rfpData),
        progress: 100, canComplete: true,
      });
    }

    // 건너뛰기 처리
    if (userText === '건너뛰기') {
      // Claude에게 건너뛰기를 알리고 다음 질문 생성
      const aiResult = await generateDynamicResponse(messages as ChatMessage[], rfpData);
      if (aiResult) {
        const covered = getTopicsCovered(rfpData);
        return NextResponse.json({
          analysisMessage: '',
          questionMessage: aiResult.question,
          message: aiResult.question,
          rfpUpdate: null,
          nextAction: aiResult.completionReady ? 'complete' : 'continue',
          quickReplies: aiResult.quickReplies,
          inlineOptions: aiResult.quickReplies,
          selectableFeatures: null,
          thinkingLabel: aiResult.thinkingLabel,
          topicsCovered: covered,
          progress: aiResult.progressPercent,
          canComplete: aiResult.completionReady,
        });
      }
    }

    // ═══ 메인 플로우: Claude 동적 응답 ═══
    const aiResult = await generateDynamicResponse(messages as ChatMessage[], rfpData);

    if (aiResult) {
      // rfpUpdate 처리
      let rfpUpdate = aiResult.rfpUpdate;

      // 사용자가 JSON 기능 배열을 보낸 경우 (기능 선택 UI에서)
      if (!rfpUpdate) {
        try {
          const parsed = JSON.parse(userText);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
            rfpUpdate = {
              section: 'coreFeatures',
              value: parsed.map((f: { name: string; desc?: string; category?: string }, i: number) => ({
                name: f.name,
                description: f.desc || f.name,
                priority: f.category === 'must' ? 'P1' : i < 4 ? 'P2' : 'P3',
              })),
            };
          }
        } catch { /* not JSON */ }
      }

      // 기능 선택 UI 표시 여부 결정
      let selectableFeatures: SelectableFeature[] | null = null;
      if (aiResult.showFeatureSelector && rfpData.overview) {
        const aiFeatures = await generateAIFeatures(rfpData.overview || userText);
        if (aiFeatures && aiFeatures.length >= 3) {
          selectableFeatures = aiFeatures;
        }
      }

      // 완료 여부
      const isComplete = aiResult.completionReady;

      const covered = getTopicsCovered(rfpData);

      return NextResponse.json({
        analysisMessage: aiResult.analysis,
        questionMessage: aiResult.question,
        message: aiResult.question || aiResult.analysis,
        rfpUpdate,
        nextAction: isComplete ? 'complete' : 'continue',
        quickReplies: selectableFeatures ? [] : aiResult.quickReplies,
        inlineOptions: selectableFeatures ? [] : aiResult.quickReplies,
        selectableFeatures,
        thinkingLabel: aiResult.thinkingLabel,
        topicsCovered: covered,
        progress: aiResult.progressPercent,
        canComplete: isComplete || isReadyToComplete(rfpData),
      });
    }

    // ═══ Fallback: API 실패 시 ═══
    const fallback = generateSimpleFallback(rfpData, userText);
    return NextResponse.json({
      message: fallback.message,
      rfpUpdate: fallback.rfpUpdate,
      nextAction: fallback.completionReady ? 'complete' : 'continue',
      quickReplies: fallback.quickReplies,
      inlineOptions: fallback.quickReplies,
      topicsCovered: getTopicsCovered(rfpData),
      progress: fallback.progressPercent,
      canComplete: fallback.completionReady,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({
      message: '잠시 문제가 발생했습니다. 다시 시도해주세요.',
      rfpUpdate: null, nextAction: 'continue',
    });
  }
}
