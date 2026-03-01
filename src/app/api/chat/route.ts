// AI PRD Builder — Chat API v11 (Quick Start + Deep Mode v2)
// Quick Start: 기존 가이드 질문형 (가벼운 사용자)
// Deep Mode v2: Quick과 동일한 대화형 시작 → AI가 각 토픽 2~3 depth로 파고듦 + 챌린지/인사이트
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

type ChatMode = 'quick' | 'deep';

// ═══════════════════════════════════════════════
//  Claude가 기능 리스트 생성
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
//  Quick Mode: 기존 가이드 질문형 응답 엔진
// ═══════════════════════════════════════════════
async function generateQuickResponse(
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

  const conversationContext = messages
    .slice(-12)
    .map(m => `${m.role === 'user' ? '고객' : 'AI'}: ${m.content}`)
    .join('\n');

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
- 예산/견적/비용/시장분석 관련 질문은 절대 하지 마세요
- 한 번에 하나의 주제에 대해서만 질문하세요
- question에는 물음표(?)가 정확히 1개만 있어야 합니다. "A인가요? B는요?" 같은 복합질문 절대 금지.

[수집해야 할 정보]
1. 프로젝트 개요 (필수)
2. 핵심 기능 (필수, 개요 파악 후 기능 선택 UI 제안)
3. 타겟 사용자
4. 기술 요구사항
5. 참고 서비스
6. 추가 요구사항

[중요 규칙]
- 개요를 파악한 직후에는 반드시 showFeatureSelector=true
- overview + coreFeatures + 1개 추가 정보가 수집되면 completionReady=true
- 5개 이상 정보가 수집되면 자연스럽게 완료를 제안

[현재 수집 상태]
${collectedInfo.length > 0 ? collectedInfo.join('\n') : '(아직 수집된 정보 없음)'}

[미수집 항목]
${missingInfo.length > 0 ? missingInfo.join(', ') : '(모든 필수 정보 수집 완료)'}

대화 턴 수: ${messageCount}

[응답 형식 — 반드시 JSON만 출력]
{
  "analysis": "고객 답변에 대한 서술형 피드백 (2~3문장). 💡 인사이트 1문장 포함. ⚠️ 물음표(?) 절대 금지. 서술문만 사용.",
  "question": "물음표(?)가 정확히 1개인 단일 질문. 복합질문 금지. 선택지/예시 포함.",
  "rfpUpdate": { "section": "overview|targetUsers|coreFeatures|techRequirements|referenceServices|additionalRequirements", "value": "추출한 값" } 또는 null,
  "quickReplies": ["선택지1", "선택지2"],
  "showFeatureSelector": false,
  "completionReady": false,
  "progressPercent": 0~100,
  "thinkingLabel": "분석 중 표시할 레이블"
}`,
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
    console.error('Quick response error:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════
//  Deep Mode v2: 대화형 시작 → 토픽별 2~3 depth 파고들기
// ═══════════════════════════════════════════════
async function generateDeepResponse(
  messages: ChatMessage[],
  rfpData: RFPData,
  deepPhase: string,
): Promise<{
  analysis: string;
  question: string;
  rfpUpdate: { section: string; value: string | object } | null;
  quickReplies: string[];
  showFeatureSelector: boolean;
  completionReady: boolean;
  progressPercent: number;
  thinkingLabel: string;
  deepPhase: string;
} | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const conversationContext = messages
    .slice(-16)
    .map(m => `${m.role === 'user' ? '고객' : 'AI'}: ${m.content}`)
    .join('\n');

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

  const messageCount = messages.filter(m => m.role === 'user').length;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `당신은 위시켓에서 116,000건 이상의 IT 외주 프로젝트를 분석한 시니어 PM 디렉터입니다.
Deep Mode에서는 Quick Mode와 동일하게 대화형으로 시작하되, 각 주제에 대해 **2~3단계 깊이로 파고들고 챌린지**합니다.

[Deep Mode v2 핵심 원칙]

1. **대화형 시작**: Quick Mode처럼 "어떤 서비스를 만들고 싶으세요?"로 시작
2. **토픽별 깊이 파기**: 고객이 답변하면, 해당 토픽에 대해 2~3번 후속 질문으로 파고듦
   - Depth 1: 고객의 답변 확인 + 핵심 포인트 짚기
   - Depth 2: "왜?"를 물어보거나, 데이터 기반 챌린지 제시
   - Depth 3: 놓친 엣지 케이스나 경쟁 서비스 대비 차별점 질문
3. **자연스러운 전환**: 한 토픽이 충분히 깊어지면, 자연스럽게 다음 토픽으로 넘어감
4. **챌린지 스타일**: 단순 수집이 아닌 건설적 챌린지
   - ❌ "타겟 사용자가 누구인가요?"
   - ✅ "20대 여성을 타겟으로 잡으셨는데, 위시켓 데이터 기준 이 분야에서 25~34세가 구매 전환율이 2.1배 높습니다. 연령대를 좀 더 넓히는 건 어떠세요?"

[대화 흐름 — 자연스럽게 진행]

턴 1~2: 프로젝트 개요 파악 (무엇을 만드는지)
- 고객의 한 줄 설명에서 핵심 컨셉 추출
- "이 서비스의 핵심 가치가 무엇인가요?" 같은 depth 질문

턴 3~4: 타겟 사용자 + 핵심 문제
- 누구를 위한 서비스인지
- 데이터 기반으로 타겟의 행동 패턴 제시 + 챌린지

턴 5~6: 핵심 기능 설계
- 개요 파악 후 showFeatureSelector=true로 기능 선택 UI 제안
- MVP 스코프 챌린지: "이 기능들을 모두 MVP에 넣으시려는 건가요? 위시켓 데이터 기준, MVP 기능 5개 이하가 성공률이 2.3배 높습니다."

턴 7~8: 기술/플랫폼 + 참고 서비스
- 웹/앱/하이브리드 선택
- 경쟁 서비스 대비 차별점 질문

턴 9+: 마무리 보강
- 빠진 디테일 짚기
- 충분히 수집되면 completionReady=true

[응답 스타일]
- 존댓말 필수
- analysis: 2~4문장. 고객 답변에 대한 서술형 피드백 + 💡 위시켓 데이터 인사이트 1개 이상
  ⚠️ analysis에는 물음표(?) 절대 금지. 질문처럼 보이는 표현도 금지. 오직 서술문/평서문만 사용.
  ✅ "~한 경향이 있습니다", "~점이 인상적입니다", "~를 고려해볼 수 있습니다"
  ❌ "~는 어떠세요?", "~하신 건가요?", "~해보셨나요?"
- question: ⚠️ 반드시 물음표(?)가 정확히 1개인 단일 질문. "A인가요? 그리고 B는요?" 같은 복합질문 절대 금지.
  ✅ "이 세 기능 중 가장 핵심이 되는 기능은 무엇인가요?" (물음표 1개)
  ❌ "핵심 기능은 무엇인가요? 그리고 어떤 문제를 해결하고 싶으세요?" (물음표 2개 — 금지)
  선택지/예시 포함. 유저가 "이것만 답하면 된다"고 바로 알 수 있게.
- 제네릭 반응 금지 ("좋은 생각이시네요" ❌ → 구체적으로 짚기)
- 예산/견적/비용 질문 절대 금지
- 한 번에 하나의 주제에 집중 (토픽 점프 금지)

[중요 규칙]
- 개요를 파악한 직후에는 반드시 showFeatureSelector=true
- overview + coreFeatures + 2개 추가 정보가 수집되면 completionReady=true
- 6개 이상 수집되면 자연스럽게 완료 제안
- deepPhase는 항상 "conversation" 유지 (phase 전환 없음)

[현재 수집 상태]
${collectedInfo.length > 0 ? collectedInfo.join('\n') : '(아직 수집된 정보 없음)'}

[미수집 항목]
${missingInfo.length > 0 ? missingInfo.join(', ') : '(모든 필수 정보 수집 완료)'}

대화 턴 수: ${messageCount}

[응답 형식 — 반드시 JSON만 출력]
{
  "analysis": "고객 답변에 대한 서술형 피드백 (2~4문장). 💡 인사이트 포함. ⚠️ 물음표(?) 절대 금지.",
  "question": "물음표(?)가 정확히 1개인 단일 질문. 복합질문 금지. 선택지/예시 포함.",
  "rfpUpdate": { "section": "overview|targetUsers|coreFeatures|techRequirements|referenceServices|additionalRequirements", "value": "추출한 값" } 또는 null,
  "quickReplies": ["선택지1", "선택지2", "선택지3"],
  "showFeatureSelector": false,
  "completionReady": false,
  "progressPercent": 0~100,
  "thinkingLabel": "분석 중 표시할 레이블",
  "deepPhase": "conversation"
}`,
      messages: [{
        role: 'user',
        content: `대화 히스토리:\n${conversationContext}\n\n고객의 마지막 답변을 분석하고, Deep Mode v2 방식으로 깊이 있는 응답을 생성하세요. 반드시 JSON 형식으로만 응답하세요.`
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
      thinkingLabel: parsed.thinkingLabel || '프로젝트를 심층 분석하고 있어요...',
      deepPhase: parsed.deepPhase || 'conversation',
    };
  } catch (error) {
    console.error('Deep response error:', error);
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
    const { messages, rfpData: clientRfpData, chatMode, deepPhase: clientDeepPhase } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: '메시지가 필요합니다.' }, { status: 400 });
    }

    const mode: ChatMode = chatMode === 'deep' ? 'deep' : 'quick';
    const deepPhase: string = clientDeepPhase || 'conversation';

    const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop();
    const userText = lastUserMessage?.content || '';

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
      const aiResult = mode === 'deep'
        ? await generateDeepResponse(messages as ChatMessage[], rfpData, deepPhase)
        : await generateQuickResponse(messages as ChatMessage[], rfpData);
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
          deepPhase: 'deepPhase' in aiResult ? aiResult.deepPhase : deepPhase,
        });
      }
    }

    // ═══ 메인 플로우 ═══
    const aiResult = mode === 'deep'
      ? await generateDeepResponse(messages as ChatMessage[], rfpData, deepPhase)
      : await generateQuickResponse(messages as ChatMessage[], rfpData);

    if (aiResult) {
      // rfpUpdate 처리
      let rfpUpdate = aiResult.rfpUpdate;

      // 사용자가 JSON 기능 배열을 보낸 경우
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

      // 기능 선택 UI 표시 여부
      let selectableFeatures: SelectableFeature[] | null = null;
      const featureSourceText = rfpData.overview || userText;
      if (aiResult.showFeatureSelector && featureSourceText && featureSourceText.length >= 2) {
        try {
          const aiFeatures = await generateAIFeatures(featureSourceText);
          if (aiFeatures && aiFeatures.length >= 3) {
            selectableFeatures = aiFeatures;
          }
        } catch (e) {
          console.error('Feature generation failed:', e);
        }
      }

      let finalQuestion = aiResult.question;
      if (aiResult.showFeatureSelector && !selectableFeatures) {
        finalQuestion = finalQuestion
          .replace(/기능을?\s*선택해\s*주세요[.!]?/g, '')
          .replace(/아래에서?\s*기능을?\s*선택[^.]*[.!]?/g, '')
          .replace(/기능\s*리스트를?\s*확인[^.]*[.!]?/g, '')
          .trim();
        if (!finalQuestion) {
          finalQuestion = '프로젝트에 필요한 핵심 기능들을 알려주세요. 어떤 기능이 가장 중요한가요?';
        }
      }

      const isComplete = aiResult.completionReady;
      const covered = getTopicsCovered(rfpData);

      return NextResponse.json({
        analysisMessage: aiResult.analysis,
        questionMessage: finalQuestion,
        message: finalQuestion || aiResult.analysis,
        rfpUpdate,
        nextAction: isComplete ? 'complete' : 'continue',
        quickReplies: selectableFeatures ? [] : aiResult.quickReplies,
        inlineOptions: selectableFeatures ? [] : aiResult.quickReplies,
        selectableFeatures,
        thinkingLabel: aiResult.thinkingLabel,
        topicsCovered: covered,
        progress: aiResult.progressPercent,
        canComplete: isComplete || isReadyToComplete(rfpData),
        deepPhase: 'deepPhase' in aiResult ? aiResult.deepPhase : deepPhase,
      });
    }

    // ═══ Fallback ═══
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
