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

[🚨 루프 방지]
⛔ 이미 수집된 항목에 대해 다시 질문하지 마세요.
⛔ 기능 리스트를 반복해서 묻지 마세요. coreFeatures가 수집되었으면 기능 관련 질문 금지.
⛔ 매 턴 "미수집 항목"을 확인하고, 그 중 하나에 대해서만 질문하세요.

[★ rfpUpdate 필수 규칙]
- 고객의 답변에서 정보를 추출할 수 있으면 반드시 rfpUpdate를 반환하세요.
- null은 정보 추출이 완전히 불가능한 경우만.

[중요 규칙]
- 개요를 파악한 직후, coreFeatures가 아직 비어있을 때만 showFeatureSelector=true
- overview + coreFeatures + 1개 추가 정보가 수집되면 completionReady=true
- 미수집 항목이 0이면 즉시 completionReady=true

[현재 수집 상태]
${collectedInfo.length > 0 ? collectedInfo.join('\n') : '(아직 수집된 정보 없음)'}

[미수집 항목]
${missingInfo.length > 0 ? missingInfo.join(', ') : '(모든 필수 정보 수집 완료 → completionReady=true 반환하세요)'}

대화 턴 수: ${messageCount}

[응답 형식 — 반드시 JSON만 출력]
{
  "analysis": "고객 답변에 대한 서술형 피드백 (2~3문장). 💡 인사이트 1문장 포함. ⚠️ 물음표(?) 절대 금지. 서술문만 사용.",
  "question": "물음표(?)가 정확히 1개인 단일 질문. ★ 반드시 미수집 항목 중 하나에 대해서만 질문.",
  "rfpUpdate": { "section": "overview|targetUsers|coreFeatures|techRequirements|referenceServices|additionalRequirements", "value": "추출한 값" } ← ★ 가능하면 반드시 반환,
  "quickReplies": ["선택지1", "선택지2"] ⚠️ 질문에 대한 구체적 답변 선택지만. 완료/생성 관련 텍스트 절대 금지.,
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
2. **토픽별 깊이 파기**: 고객이 답변하면, 해당 토픽에 대해 1~2번 후속 질문으로 파고듦
   - Depth 1: 고객의 답변 확인 + 핵심 포인트 짚기
   - Depth 2: 데이터 기반 챌린지 또는 엣지 케이스 제시
3. **자연스러운 전환**: 한 토픽이 충분히 깊어지면, 자연스럽게 다음 미수집 토픽으로 넘어감
4. **챌린지 스타일**: 단순 수집이 아닌 건설적 챌린지

[🚨 절대 금지 — 루프 방지 규칙]
⛔ 이미 수집된 항목에 대해 다시 질문하지 마세요. "현재 수집 상태"에 있는 항목은 절대 다시 묻지 마세요.
⛔ 기능 리스트/MVP 리스트를 반복해서 묻지 마세요. coreFeatures가 이미 수집되었으면 기능 관련 질문 금지.
⛔ 같은 주제를 2턴 이상 연속으로 질문하지 마세요. 반드시 다른 미수집 항목으로 넘어가세요.
⛔ showFeatureSelector는 coreFeatures가 비어있을 때 딱 1번만 true. 이미 기능이 선택되었으면 절대 true 금지.

[대화 흐름 — 반드시 미수집 항목 우선]

★ 매 턴마다 "미수집 항목"을 확인하고, 그 중 하나에 대해서만 질문하세요.
★ 미수집 항목이 없으면 completionReady=true를 반환하세요.

일반적 순서 (참고용, 고정은 아님):
1. 프로젝트 개요 → 2. 타겟 사용자 → 3. 핵심 기능 (showFeatureSelector=true) → 4. 기술 요구사항 → 5. 참고 서비스 → 6. 추가 요구사항

[응답 스타일]
- 존댓말 필수
- analysis: 2~4문장. 고객 답변에 대한 서술형 피드백 + 💡 위시켓 데이터 인사이트 1개 이상
  ⚠️ analysis에는 물음표(?) 절대 금지. 오직 서술문/평서문만 사용.
- question: ⚠️ 반드시 물음표(?)가 정확히 1개인 단일 질문. 복합질문 절대 금지.
  선택지/예시 포함. 유저가 "이것만 답하면 된다"고 바로 알 수 있게.
- 제네릭 반응 금지 ("좋은 생각이시네요" ❌ → 구체적으로 짚기)
- 예산/견적/비용 질문 절대 금지
- 한 번에 하나의 주제에 집중

[★ rfpUpdate 필수 규칙]
- 고객의 답변에서 정보를 추출할 수 있으면 반드시 rfpUpdate를 반환하세요.
- 고객이 한 마디라도 프로젝트 관련 정보를 말하면 해당 section에 value를 채우세요.
- rfpUpdate를 null로 보내는 경우는 고객이 "건너뛰기"나 완전 무관한 답변을 한 경우만 해당합니다.
- 이미 수집된 section도 더 풍부한 정보가 있으면 업데이트(append) 가능합니다.

[중요 규칙]
- 개요를 파악한 직후, coreFeatures가 아직 비어있을 때만 showFeatureSelector=true
- overview + coreFeatures + 1개 추가 정보가 수집되면 completionReady=true
- 미수집 항목이 0이면 즉시 completionReady=true
- deepPhase는 항상 "conversation" 유지

[현재 수집 상태]
${collectedInfo.length > 0 ? collectedInfo.join('\n') : '(아직 수집된 정보 없음)'}

[미수집 항목]
${missingInfo.length > 0 ? missingInfo.join(', ') : '(모든 필수 정보 수집 완료 → completionReady=true 반환하세요)'}

대화 턴 수: ${messageCount}

[응답 형식 — 반드시 JSON만 출력]
{
  "analysis": "고객 답변에 대한 서술형 피드백 (2~4문장). 💡 인사이트 포함. ⚠️ 물음표(?) 절대 금지.",
  "question": "물음표(?)가 정확히 1개인 단일 질문. ★ 반드시 미수집 항목 중 하나에 대해서만 질문.",
  "rfpUpdate": { "section": "overview|targetUsers|coreFeatures|techRequirements|referenceServices|additionalRequirements", "value": "추출한 값" } ← ★ 가능하면 반드시 반환,
  "quickReplies": ["선택지1", "선택지2", "선택지3"] ⚠️ 질문에 대한 구체적 답변 선택지만. 완료/생성 관련 텍스트 절대 금지.,
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
  rfpUpdate: { section: string; value: string | object } | null;
  quickReplies: string[];
  completionReady: boolean;
  progressPercent: number;
} {
  const msg = userMessage.trim();
  const isSkip = msg === '건너뛰기' || msg === '';

  // ★ 미수집 항목 순서대로 진행 (항상 다음 단계로 넘어감)
  if (!rfpData.overview) {
    return {
      message: '어떤 서비스를 만들고 싶으신가요?',
      rfpUpdate: isSkip ? null : { section: 'overview', value: msg },
      quickReplies: [],
      completionReady: false,
      progressPercent: 0,
    };
  }
  if (rfpData.coreFeatures.length === 0) {
    // ★ 핵심 수정: 유저 답변을 기능으로 캡처 (AI 실패 시에도 진행 가능)
    if (!isSkip && msg.length > 1) {
      const features = msg.split(/[,，、\n]/).filter(f => f.trim().length > 0).map((f, i) => ({
        name: f.trim().substring(0, 50),
        description: f.trim(),
        priority: i < 3 ? 'P1' as const : 'P2' as const,
      }));
      if (features.length > 0) {
        return {
          message: '기능을 확인했습니다. 주요 사용자는 누구인가요?',
          rfpUpdate: { section: 'coreFeatures', value: features },
          quickReplies: ['20~30대 직장인', '전 연령 일반 사용자', '기업 고객 (B2B)'],
          completionReady: false,
          progressPercent: 33,
        };
      }
    }
    return {
      message: '이 서비스에 어떤 핵심 기능이 필요한가요? 쉼표로 구분해 입력해주세요.',
      rfpUpdate: null,
      quickReplies: ['회원가입/로그인', '검색/필터', '결제 시스템', '채팅/메시징'],
      completionReady: false,
      progressPercent: 17,
    };
  }
  if (!rfpData.targetUsers) {
    return {
      message: '주 사용자는 누구인가요?',
      rfpUpdate: isSkip ? null : { section: 'targetUsers', value: msg },
      quickReplies: ['20~30대 직장인', '전 연령 일반 사용자', '기업 고객 (B2B)'],
      completionReady: false,
      progressPercent: 33,
    };
  }
  if (!rfpData.techRequirements) {
    return {
      message: '어떤 플랫폼으로 개발을 원하시나요?',
      rfpUpdate: isSkip ? null : { section: 'techRequirements', value: msg },
      quickReplies: ['모바일 앱 (iOS/Android)', '반응형 웹', '웹 + 앱 모두'],
      completionReady: true,
      progressPercent: 50,
    };
  }
  if (!rfpData.referenceServices) {
    return {
      message: '참고하고 싶은 서비스가 있으신가요?',
      rfpUpdate: isSkip ? null : { section: 'referenceServices', value: msg },
      quickReplies: ['특별히 없음', '직접 입력할게요'],
      completionReady: true,
      progressPercent: 67,
    };
  }
  if (!rfpData.additionalRequirements) {
    return {
      message: '추가로 전달하고 싶은 요구사항이 있으신가요?',
      rfpUpdate: isSkip ? null : { section: 'additionalRequirements', value: msg },
      quickReplies: ['특별히 없음'],
      completionReady: true,
      progressPercent: 83,
    };
  }

  const covered = getTopicsCovered(rfpData);
  return {
    message: '모든 정보가 수집되었습니다. PRD를 생성하시겠습니까?',
    rfpUpdate: null,
    quickReplies: [],
    completionReady: true,
    progressPercent: 100,
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

      // 사용자가 JSON 기능 배열을 보낸 경우 (기능 선택 완료)
      let featureJustSubmitted = false;
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
            featureJustSubmitted = true;
            // ★ 핵심 수정: rfpData에 즉시 반영하여 이후 로직에서 coreFeatures 인식
            rfpData.coreFeatures = rfpUpdate.value as RFPData['coreFeatures'];
          }
        } catch { /* not JSON */ }
      }

      // 기능 선택 UI 표시 여부
      // ★ featureJustSubmitted면 절대 다시 표시하지 않음 (무한루프 방지)
      // ★ coreFeatures가 이미 있으면 표시하지 않음
      let selectableFeatures: SelectableFeature[] | null = null;
      if (!featureJustSubmitted && rfpData.coreFeatures.length === 0) {
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
      }

      let finalQuestion = aiResult.question;
      if (aiResult.showFeatureSelector && !selectableFeatures) {
        finalQuestion = finalQuestion
          .replace(/기능을?\s*선택해\s*주세요[.!]?/g, '')
          .replace(/아래에서?\s*기능을?\s*선택[^.]*[.!]?/g, '')
          .replace(/기능\s*리스트를?\s*확인[^.]*[.!]?/g, '')
          .trim();
        if (!finalQuestion) {
          finalQuestion = featureJustSubmitted
            ? '기능 선택이 완료되었습니다. 다음 단계로 넘어가겠습니다.'
            : '프로젝트에 필요한 핵심 기능들을 알려주세요. 어떤 기능이 가장 중요한가요?';
        }
      }

      let isComplete = aiResult.completionReady;
      const covered = getTopicsCovered(rfpData);

      // ★ 방어 로직 개선: featureJustSubmitted면 스킵
      // completionReady인데 coreFeatures가 비어있고, 방금 기능 제출이 아닌 경우에만 트리거
      if (isComplete && rfpData.coreFeatures.length === 0 && !selectableFeatures && !featureJustSubmitted) {
        const featureSourceText = rfpData.overview || userText;
        if (featureSourceText && featureSourceText.length >= 2) {
          try {
            const aiFeatures = await generateAIFeatures(featureSourceText);
            if (aiFeatures && aiFeatures.length >= 3) {
              selectableFeatures = aiFeatures;
              isComplete = false;
              finalQuestion = '기능 목록을 확인하고 선택해주세요. 선택하신 기능들을 기반으로 PRD를 생성합니다.';
            }
          } catch (e) {
            console.error('Feature re-generation failed:', e);
          }
        }
      }

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
