// AI PRD Builder — Chat API v12
// Quick Mode: 빠른 항목 수집 (4~5턴)
// Deep Mode: 완전 독립 — 고객의 목적과 생각을 알아내서 구체화하는 PM 컨설팅
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
//  공통: Claude가 기능 리스트 생성
// ═══════════════════════════════════════════════
async function generateAIFeatures(overview: string, conversationContext?: string): Promise<SelectableFeature[] | null> {
  if (!process.env.ANTHROPIC_API_KEY || !overview || overview.length < 2) return null;

  const contextBlock = conversationContext
    ? `\n\n[고객과의 대화 내용 — 이 대화에서 언급된 구체적 니즈, 문제점, 원하는 기능을 반드시 반영하세요]\n${conversationContext.slice(0, 3000)}\n`
    : '';

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `서비스 설명과 고객 대화를 분석하여 개발에 필요한 기능 리스트를 JSON 배열로 생성하세요.

서비스 설명: "${overview}"${contextBlock}

규칙:
1. 이 서비스에 실제로 필요한 기능만 추천 (8~15개)
2. must: 서비스 동작에 반드시 필요한 핵심 기능
3. recommended: 있으면 좋지만 MVP에서 생략 가능한 기능
4. 기능명은 한국어, 간결하게
5. 설명은 한 문장으로 핵심만
6. 서비스와 관련 없는 기능 절대 포함 금지
7. ★★★ 대화에서 고객이 직접 언급한 기능/니즈를 최우선으로 포함 ★★★
8. 대화 맥락과 무관한 일반적인 기능(예: 회원가입, 관리자 대시보드 등)은 반드시 제외
9. 고객의 비즈니스 도메인(업종, 타겟, 상황)에 특화된 기능 위주로 구성

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


// ═══════════════════════════════════════════════════════════════════
//  ██████╗ ██╗   ██╗██╗ ██████╗██╗  ██╗    ███╗   ███╗ ██████╗ ██████╗ ███████╗
//  ██╔═══██╗██║   ██║██║██╔════╝██║ ██╔╝    ████╗ ████║██╔═══██╗██╔══██╗██╔════╝
//  ██║   ██║██║   ██║██║██║     █████╔╝     ██╔████╔██║██║   ██║██║  ██║█████╗
//  ██║▄▄ ██║██║   ██║██║██║     ██╔═██╗     ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝
//  ╚██████╔╝╚██████╔╝██║╚██████╗██║  ██╗    ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗
//   ╚══▀▀═╝  ╚═════╝ ╚═╝ ╚═════╝╚═╝  ╚═╝    ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
//  Quick Mode: 핵심 항목 빠르게 수집 → 4~5턴 완료
// ═══════════════════════════════════════════════════════════════════

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
Quick Mode — 핵심을 빠르게 수집합니다. 4~5턴 안에 마무리하세요.

[핵심 원칙]
- 존댓말 필수
- ★★★ Quick Mode는 최대 5턴 안에 끝내야 합니다 ★★★
- 고객이 한 번에 여러 정보를 제공하면 모두 반영
- 제네릭한 반응 금지. 구체적으로 짚기
- 💡 인사이트는 위시켓 데이터 기반으로 1문장만
- 예산/견적/비용/시장분석 관련 질문 절대 금지
- question에는 물음표(?)가 정확히 1개. 복합질문 절대 금지.

[Quick Mode 수집 항목 — 4개]
1. 프로젝트 개요 (필수) → 첫 질문
2. 핵심 기능 (필수) → 개요 파악 후 자동으로 기능 선택 UI 표시
3. 타겟 사용자 → 기능 선택 후 질문
4. 기술 요구사항 (웹/앱/플랫폼) → 마지막 질문

★ 4개 수집되면 즉시 completionReady=true. 참고서비스, 추가요구사항은 Quick Mode에서 묻지 마세요.
★ 각 항목에 대해 후속/심화 질문 하지 마세요. 1항목 = 1턴으로 끝내세요.

[🚨 루프 방지]
⛔ 이미 수집된 항목 재질문 금지
⛔ coreFeatures 수집 후 기능 관련 질문 금지
⛔ 3턴 넘어가면 무조건 completionReady=true

[★ rfpUpdate 필수 규칙]
- 고객의 답변에서 정보를 추출할 수 있으면 반드시 rfpUpdate 반환
- null은 추출 완전 불가능한 경우만

[중요 규칙]
- 개요 파악 직후 showFeatureSelector=true (coreFeatures 비어있을 때만)
- overview + coreFeatures 수집되면 즉시 completionReady=true 가능
- 대화 턴 수 3 이상이면 무조건 completionReady=true

[현재 수집 상태]
${collectedInfo.length > 0 ? collectedInfo.join('\n') : '(아직 수집된 정보 없음)'}

[미수집 항목]
${missingInfo.length > 0 ? missingInfo.join(', ') : '(모든 필수 정보 수집 완료 → completionReady=true 반환하세요)'}

대화 턴 수: ${messageCount}

[응답 형식 — 반드시 JSON만 출력]
{
  "analysis": "고객 답변에 대한 서술형 피드백 (1~2문장). 💡 인사이트 1문장. ⚠️ 물음표 절대 금지.",
  "question": "물음표(?)가 정확히 1개인 단일 질문.",
  "rfpUpdate": { "section": "overview|targetUsers|coreFeatures|techRequirements|referenceServices|additionalRequirements", "value": "추출한 값" },
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

// Quick Mode fallback (API 실패 시)
function generateQuickFallback(rfpData: RFPData, userMessage: string): {
  message: string;
  rfpUpdate: { section: string; value: string | object } | null;
  quickReplies: string[];
  completionReady: boolean;
  progressPercent: number;
} {
  const msg = userMessage.trim();
  const isSkip = msg === '건너뛰기' || msg === '';

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
      completionReady: true,
      progressPercent: 80,
    };
  }
  if (!rfpData.techRequirements) {
    return {
      message: '어떤 플랫폼으로 개발을 원하시나요?',
      rfpUpdate: isSkip ? null : { section: 'techRequirements', value: msg },
      quickReplies: ['모바일 앱 (iOS/Android)', '반응형 웹', '웹 + 앱 모두'],
      completionReady: true,
      progressPercent: 90,
    };
  }

  return {
    message: '모든 정보가 수집되었습니다. PRD를 생성하시겠습니까?',
    rfpUpdate: null,
    quickReplies: [],
    completionReady: true,
    progressPercent: 100,
  };
}


// ═══════════════════════════════════════════════════════════════════
//  ██████╗ ███████╗███████╗██████╗     ███╗   ███╗ ██████╗ ██████╗ ███████╗
//  ██╔══██╗██╔════╝██╔════╝██╔══██╗    ████╗ ████║██╔═══██╗██╔══██╗██╔════╝
//  ██║  ██║█████╗  █████╗  ██████╔╝    ██╔████╔██║██║   ██║██║  ██║█████╗
//  ██║  ██║██╔══╝  ██╔══╝  ██╔═══╝     ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝
//  ██████╔╝███████╗███████╗██║         ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗
//  ╚═════╝ ╚══════╝╚══════╝╚═╝         ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
//
//  Deep Mode: Quick Mode와 완전히 독립된 PM 컨설팅 인터뷰
//  목적: 고객의 목적과 생각을 알아내서 구체화하기
//  Quick mode의 "항목 수집"이 아닌, "생각 정리"에 초점
// ═══════════════════════════════════════════════════════════════════

// Deep mode 전용 phase 정의 — Quick mode의 field 수집과 완전히 다름
// ★ 턴 수가 아닌 "수집된 정보의 충분성"으로 판단
type DeepPhase = 'explore' | 'understand' | 'define' | 'refine' | 'wrapup';

// 핵심 정보 수집 현황 분석
function analyzeInfoCompleteness(rfpData: RFPData) {
  const collected: string[] = [];
  const missing: string[] = [];

  if (rfpData.overview && rfpData.overview.length > 20) collected.push('프로젝트 비전/개요');
  else missing.push('프로젝트 비전/개요');

  if (rfpData.targetUsers && rfpData.targetUsers.length > 10) collected.push('타겟 사용자');
  else missing.push('타겟 사용자');

  if (rfpData.coreFeatures && rfpData.coreFeatures.length > 0) collected.push('핵심 기능');
  else missing.push('핵심 기능');

  if (rfpData.referenceServices && rfpData.referenceServices.length > 5) collected.push('참고 서비스/경쟁사');
  // 참고 서비스는 optional — missing에 넣지 않음

  if (rfpData.techRequirements && rfpData.techRequirements.length > 5) collected.push('기술 방향');
  // 기술 방향도 optional

  if (rfpData.additionalRequirements && rfpData.additionalRequirements.length > 5) collected.push('추가 맥락');

  // 필수: 비전 + 타겟 → 충분성 판단 (기능은 대화 후 자동 수집)
  const essentialCount = [rfpData.overview, rfpData.targetUsers].filter(Boolean).length
    + (rfpData.coreFeatures.length > 0 ? 1 : 0);

  // ★ overview + targetUsers만 있으면 충분 (coreFeatures는 대화 후 기능 선택에서 수집)
  const isCoreSufficient = !!(rfpData.overview && rfpData.overview.length > 20 && rfpData.targetUsers && rfpData.targetUsers.length > 5);

  return { collected, missing, essentialCount, isCoreSufficient, totalCollected: collected.length };
}

function determineDeepPhase(messages: ChatMessage[], turnCount: number, rfpData: RFPData): DeepPhase {
  // ★ coreFeatures는 대화 완료 후 기능 선택에서 수집되므로 phase 판단에서 제외

  // 1단계: 최소 2턴은 탐색 (첫 인사 + 첫 대화)
  if (turnCount <= 2) return 'explore';

  // 2단계: overview 수집 전이면 아직 이해 단계
  if (!rfpData.overview) return 'understand';

  // 3단계: overview 있지만 타겟 미파악 → 정의 단계
  if (!rfpData.targetUsers && turnCount <= 8) return 'define';

  // 4단계: 10턴 이상이거나 overview+타겟 둘 다 있으면 → 정제/마무리
  if (turnCount >= 10) return 'refine';
  if (rfpData.targetUsers) return 'refine';

  return 'define';
}

async function generateDeepResponse(
  messages: ChatMessage[],
  rfpData: RFPData,
  clientPhase: string,
): Promise<{
  response: string;          // 분석 + 질문이 자연스럽게 합쳐진 단일 응답
  rfpUpdates: Array<{ section: string; value: string | object }>;  // 복수 추출 가능
  suggestions: string[];     // 대화 이어갈 힌트 (quickReplies와 다른 개념 — "선택지"가 아닌 "대화 힌트")
  deepPhase: DeepPhase;
  progressPercent: number;
  thinkingLabel: string;
  readyToDefineFeatures: boolean;
  conversationComplete: boolean;   // 대화 완료 여부
  insightSummary: string;    // ★ 이 턴에서 발견한 핵심 인사이트 1줄
  insightCategory: string;   // ★ 인사이트 카테고리 (vision/user/problem/solution/market/tech/strategy)
} | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const conversationContext = messages
    .slice(-24)
    .map(m => `${m.role === 'user' ? '고객' : 'PM'}: ${m.content}`)
    .join('\n');

  const turnCount = messages.filter(m => m.role === 'user').length;
  const phase = determineDeepPhase(messages, turnCount, rfpData);
  const info = analyzeInfoCompleteness(rfpData);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `당신은 위시켓에서 13년간 116,000건의 IT 외주 프로젝트를 직접 리뷰한 수석 PM 디렉터입니다.

═══ Deep Mode란? ═══
고객의 머릿속에 있는 막연한 아이디어를 **구체적인 제품 정의**로 만들어내는 1:1 컨설팅입니다.
항목을 수집하는 게 아닙니다. 고객이 스스로도 정리하지 못한 생각을 대화를 통해 끌어내고 구체화하는 것입니다.

Quick Mode와의 차이:
- Quick: "뭘 만들 건가요?" → 답변 → "기능은요?" → 답변 → "타겟은요?" → 끝 (폼 채우기)
- Deep: "왜 이걸 만들려 하시나요?" → 대화 → "그 문제를 겪는 사람들은 현재 어떻게 하고 있나요?" → 대화 → "그렇다면 핵심은 이거군요..." (생각 정리)

═══ 대화 철학 ═══
1. **고객의 "왜"를 끝까지 파고들기**: "뭘 만들 건가요?"가 아니라 "이걸 왜 만들어야 하나요? 어떤 문제를 풀려는 건가요?"
2. **고객의 답변을 재구성해서 돌려주기**: 고객이 두서없이 말해도, PM이 정리해서 "정리하면 이런 말씀이신 거죠?"라고 확인
3. **숨은 전제를 찾기**: 고객이 당연하다고 생각하는 것들을 질문으로 드러내기 ("왜 웹이 아닌 앱이어야 하나요?", "사용자가 정말 그 기능을 원할까요?")
4. **하나의 주제를 깊이 파기**: 이것저것 빠르게 넘어가지 말고, 고객의 답변에서 가장 중요한 포인트를 잡아서 2~3번 더 파고들기

═══ 현재 대화 단계: ${phase} ═══

${phase === 'explore' ? `[explore — 탐색 단계] 고객의 아이디어를 처음 듣는 중
• 고객이 뭘 만들려는지 큰 그림을 파악
• "왜" 이것을 만들려 하는지 동기를 탐색
• 고객의 문제의식, 기회 인식을 이해
• ⚠️ 기능이나 기술 이야기는 아직 하지 마세요
• ⚠️ 기능 리스트는 대화에서 절대 묻지 마세요 — 시스템이 자동 처리합니다` : ''}

${phase === 'understand' ? `[understand — 이해 단계] 비전은 들었지만 배경/맥락이 부족
• 타겟 사용자의 실제 상황과 pain point
• 현재 이 문제가 어떻게 해결되고 있는지 (경쟁/대안)
• 고객의 사업 맥락 (이미 운영 중인 사업인지, 신규인지, etc.)
• 고객이 말한 내용 중 모호한 부분을 구체화` : ''}

${phase === 'define' ? `[define — 정의 단계] 핵심을 구체화하는 중
• 지금까지의 대화를 기반으로 "이 서비스의 핵심은 OOO입니다" 정리
• 기능 방향성을 대화로 자연스럽게 잡기
• 기술 방향, 플랫폼 등을 자연스럽게 논의
• 차별점과 핵심 가치 확인
• ⚠️ 기능 리스트를 직접 묻지 마세요 — 대화 완료 후 시스템이 자동 제시합니다` : ''}

${phase === 'refine' ? `[refine — 정제/마무리 단계] 핵심 정보가 충분히 수집됨
• 지금까지 대화를 종합하여 프로젝트 핵심을 정리해주세요
• 새로운 큰 주제를 꺼내지 말고, 빠뜨린 게 있는지만 확인
• 고객에게 "이 내용으로 PRD를 생성하면 좋은 결과물이 나올 것 같습니다" 라고 안내
• conversationComplete=true를 적극 설정하세요` : ''}

${turnCount >= 10 ? `
🚨 ${turnCount}턴째입니다. 마무리를 준비하세요.
• 새로운 주제를 꺼내지 마세요
• 지금까지 파악한 내용을 종합 정리하며 자연스럽게 마무리하세요
• conversationComplete=true를 적극 검토하세요
` : ''}

═══ 정보 수집 현황 ═══
✅ 수집 완료: ${info.collected.length > 0 ? info.collected.join(', ') : '(없음)'}
${info.missing.length > 0 ? `❌ 아직 부족: ${info.missing.join(', ')}` : '✅ 핵심 정보 모두 수집 완료!'}
필수 항목(비전/타겟/기능) 충족: ${info.isCoreSufficient ? '✅ YES' : `❌ NO (${info.essentialCount}/3)`}

${info.isCoreSufficient ? `
★★★ 핵심 정보가 충분히 수집되었습니다 ★★★
- 더 깊이 파고들 가치가 있다고 판단되면 계속하되, 지엽적인 내용은 피하세요
- 고객에게 "지금까지 파악된 내용만으로도 좋은 PRD를 생성할 수 있습니다"라고 알려주세요
- 고객이 원하면 더 대화를 이어갈 수 있지만, PM에서 적극적으로 마무리를 제안하세요
- conversationComplete=true 설정을 고려하세요
` : `
[아직 부족한 정보를 자연스럽게 파악하세요]
- 부족한 항목: ${info.missing.join(', ')}
- 이 정보들을 직접적으로 묻지 말고, 대화 흐름 속에서 자연스럽게 끌어내세요
`}

═══ 응답 스타일 ═══
- 존댓말 필수
- response는 3파트로 구성하되, 줄바꿈(\\n\\n)으로 구분:
  ① 리액션 (2~3문장): 고객 답변을 재구성/확인하며 구체적으로 짚어주기
  ② 💡 인사이트 (1문장): 위시켓 데이터 기반 전문가 인사이트 (💡 prefix)
  ③ ${info.isCoreSufficient
    ? '**마무리 또는 질문**: 핵심 정보가 충분하면 마무리 제안, 부족하면 질문'
    : '**질문** (1개): 마지막에 줄바꿈 후 **볼드**로 강조. 물음표(?) 정확히 1개.'}
- ⚠️ "좋은 생각이시네요", "흥미로운 아이디어네요" 같은 제네릭 반응 절대 금지
- ⚠️ 예산/견적/비용/시장규모 질문 금지
- suggestions: 고객이 바로 클릭해서 보낼 수 있는 구체적인 답변 2~3개
  • ❌ "직접 경험한 불편함을 말해주세요" (가이드/지시 형태)
  • ✅ "직접 겪은 불편함에서 시작했어요" (고객이 바로 보낼 수 있는 답변)
  • 고객의 관점에서 자연스러운 1인칭 답변 형태로 작성
  ${info.isCoreSufficient ? '• 마무리 시: "네, 이 정도면 충분해요" 같은 종료 옵션도 포함' : ''}

═══ rfpUpdates 규칙 ═══
★★★ 매 턴마다 반드시 1개 이상의 rfpUpdate를 추출하세요 ★★★
- 첫 번째 답변 → 반드시 overview 추출 (서비스 설명 + 배경 + 동기를 풍부하게 조합)
- 이후 답변 → 대화에서 새로 알게 된 정보를 적절한 section에 매핑
- 하나의 답변에서 여러 항목 동시 추출 가능
- overview는 대화가 진행될수록 더 풍부하게 업데이트 (이전 overview + 새 맥락 합산)
- ⚠️ 빈 배열 [] 반환은 고객이 "건너뛰기" 등 정보가 전혀 없는 경우만

[사용 가능한 section]
overview, targetUsers, coreFeatures, techRequirements, referenceServices, additionalRequirements

═══ 완료 조건 ═══
- conversationComplete=true 조건:
  1. 고객이 "됐어요", "이 정도면 충분해요" 등 종료 의사 → 즉시 true
  2. refine 단계에서는 → true
  3. 프로젝트 비전(overview) + 타겟(targetUsers) 모두 충분히 파악되면 → true
- ★ 핵심 원칙: 대화가 깊이 있게 진행되되, 같은 주제를 반복하거나 지엽적 주제를 끌지 않기
- ⚠️ 기능 리스트(coreFeatures)는 대화 완료 후 시스템이 자동 제시하므로, 대화에서 수집 불필요
- ⚠️ readyToDefineFeatures는 항상 false (서버 자동 관리)

[수집된 주제] ${info.collected.length > 0 ? info.collected.join(', ') : '(아직 없음)'}
[부족한 주제] ${info.missing.length > 0 ? info.missing.join(', ') : '(없음 — 충분!)'}
대화 턴: ${turnCount}

[응답 형식 — 반드시 JSON만 출력]
{
  "response": "자연스러운 대화체 응답",
  "rfpUpdates": [{"section": "overview", "value": "추출값"}],
  "suggestions": ["대화 힌트1", "대화 힌트2"],
  "deepPhase": "${phase}",
  "progressPercent": 0~100,
  "thinkingLabel": "표시 레이블",
  "readyToDefineFeatures": false,
  "conversationComplete": false,
  "insightSummary": "★ 이 턴에서 새로 발견한 핵심 인사이트 1문장 (예: '단체복 시장의 사이즈 불일치가 핵심 페인포인트'). 반드시 고객의 답변에서 추출된 구체적 사실. 고객이 처음 말한 경우 '비전:' prefix, 문제점이면 '문제:' prefix, 해결방향이면 '해결:', 타겟 관련이면 '타겟:' prefix",
  "insightCategory": "vision|user|problem|solution|market|tech|strategy 중 1개. 이 인사이트의 성격."
}

★★★ insightSummary 필수 규칙 ★★★
- 매 턴마다 반드시 1개의 인사이트를 추출하세요
- 고객의 답변에서 구체적인 사실/판단/의견을 압축한 1문장
- 제네릭하면 안 됨: ❌ "고객의 니즈를 파악함" / ✅ "단체복 주문 시 개인별 사이즈 측정이 가장 큰 병목"
- 이 인사이트가 우측 패널에 실시간으로 쌓여서, 고객에게 "대화가 가치 있다"는 걸 보여줍니다`,
      messages: [{
        role: 'user',
        content: `대화 히스토리:\n${conversationContext}\n\n고객의 마지막 답변을 분석하세요. 고객이 아직 스스로 정리하지 못한 생각을 끌어내주세요. 반드시 JSON 형식으로만 응답하세요.`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      response: parsed.response || '',
      rfpUpdates: Array.isArray(parsed.rfpUpdates) ? parsed.rfpUpdates : [],
      suggestions: parsed.suggestions || [],
      deepPhase: parsed.deepPhase || phase,
      progressPercent: parsed.progressPercent || 0,
      thinkingLabel: parsed.thinkingLabel || '프로젝트를 심층 분석하고 있어요...',
      readyToDefineFeatures: parsed.readyToDefineFeatures || false,
      conversationComplete: parsed.conversationComplete || false,
      insightSummary: parsed.insightSummary || '',
      insightCategory: parsed.insightCategory || 'vision',
    };
  } catch (error) {
    console.error('Deep response error:', error);
    return null;
  }
}

// Deep Mode fallback — 정보 충분성 기반
function generateDeepFallback(rfpData: RFPData, userMessage: string, turnCount: number): {
  response: string;
  rfpUpdates: Array<{ section: string; value: string | object }>;
  suggestions: string[];
  deepPhase: DeepPhase;
  progressPercent: number;
  readyToDefineFeatures: boolean;
  conversationComplete: boolean;
} {
  const msg = userMessage.trim();
  const info = analyzeInfoCompleteness(rfpData);

  // 첫 답변: 프로젝트 개요 추출
  if (turnCount <= 1) {
    return {
      response: `말씀하신 내용을 정리해보겠습니다. 이 서비스를 만들게 된 계기가 궁금한데요 — 직접 겪으신 불편함에서 출발한 건가요, 아니면 사업 기회를 발견하신 건가요?`,
      rfpUpdates: msg.length > 1 ? [{ section: 'overview', value: msg }] : [],
      suggestions: ['직접 경험한 불편함에서 시작했어요', '시장에서 기회를 봤어요', '기존 사업을 디지털로 전환하려고요'],
      deepPhase: 'explore',
      progressPercent: 10,
      readyToDefineFeatures: false,
      conversationComplete: false,
    };
  }

  // 핵심 정보 충분 → 마무리 제안
  if (info.isCoreSufficient) {
    return {
      response: `지금까지 말씀해주신 내용을 정리하면, 프로젝트의 핵심 비전과 타겟, 주요 기능 방향이 충분히 파악되었습니다. 이 내용을 바탕으로 PRD를 생성하면 좋은 결과물이 나올 것 같습니다.\n\n💡 위시켓 경험상, 이 정도 수준의 요구사항 정리가 되어있으면 개발 파트너 매칭 시 정확도가 크게 올라갑니다.\n\n**혹시 추가로 반영하고 싶으신 내용이 있으신가요? 없으시다면 PRD 생성을 시작하겠습니다.**`,
      rfpUpdates: msg.length > 1 ? [{ section: 'additionalRequirements', value: msg }] : [],
      suggestions: ['네, 이 정도면 충분해요', '하나만 더 말씀드릴게요'],
      deepPhase: 'refine',
      progressPercent: 90,
      readyToDefineFeatures: rfpData.coreFeatures.length === 0,
      conversationComplete: true,
    };
  }

  // overview 없으면 아직 탐색 단계
  if (!rfpData.overview) {
    return {
      response: `이해했습니다. 그렇다면 이 서비스를 가장 먼저 사용하게 될 사람은 어떤 상황에 있는 분인가요?`,
      rfpUpdates: msg.length > 1 ? [{ section: 'additionalRequirements', value: msg }] : [],
      suggestions: ['20~30대 직장인이 주 타겟이에요', '아직 명확하게 정하진 못했어요', 'B2B, 기업 고객 대상이에요'],
      deepPhase: 'understand',
      progressPercent: 30,
      readyToDefineFeatures: false,
      conversationComplete: false,
    };
  }

  // overview 있지만 타겟/기능 부족
  const missingText = info.missing.length > 0 ? info.missing.join(', ') : '';
  return {
    response: `지금까지 말씀하신 내용을 종합하면, 프로젝트의 큰 방향은 잡혔습니다. 아직 ${missingText} 부분이 좀 더 구체화되면 더 좋은 PRD가 나올 수 있을 것 같은데요.\n\n**이 서비스에서 사용자가 가장 자주 하게 될 핵심 행동은 무엇일까요?**`,
    rfpUpdates: msg.length > 1 ? [{ section: 'additionalRequirements', value: msg }] : [],
    suggestions: ['검색하고 비교하는 게 핵심이에요', '이 정도면 충분해요, PRD 만들어주세요'],
    deepPhase: 'define',
    progressPercent: 55,
    readyToDefineFeatures: true,
    conversationComplete: false,
  };
}


// ═══════════════════════════════════════════════
//  POST Handler
// ═══════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const { messages, rfpData: clientRfpData, chatMode, deepPhase: clientDeepPhase, featureSelectorShown: clientFeatureSelectorShown } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: '메시지가 필요합니다.' }, { status: 400 });
    }

    const mode: ChatMode = chatMode === 'deep' ? 'deep' : 'quick';
    const deepPhase: string = clientDeepPhase || 'conversation';
    const featureSelectorAlreadyShown: boolean = clientFeatureSelectorShown === true;

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

    // 공통: JSON 기능 배열 파싱 (기능 선택 완료 시)
    let featureJustSubmitted = false;
    let featureSubmitUpdate: { section: string; value: string | object } | null = null;
    try {
      const parsed = JSON.parse(userText);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
        featureSubmitUpdate = {
          section: 'coreFeatures',
          value: parsed.map((f: { name: string; desc?: string; category?: string }, i: number) => ({
            name: f.name,
            description: f.desc || f.name,
            priority: f.category === 'must' ? 'P1' : i < 4 ? 'P2' : 'P3',
          })),
        };
        featureJustSubmitted = true;
        rfpData.coreFeatures = featureSubmitUpdate.value as RFPData['coreFeatures'];
      }
    } catch { /* not JSON */ }

    // ═══════════════════════════════════════════════════════
    //  ★★★ QUICK MODE ★★★
    // ═══════════════════════════════════════════════════════
    if (mode === 'quick') {
      // 건너뛰기 처리
      if (userText === '건너뛰기') {
        const aiResult = await generateQuickResponse(messages as ChatMessage[], rfpData);
        if (aiResult) {
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
            topicsCovered: getTopicsCovered(rfpData),
            progress: aiResult.progressPercent,
            canComplete: aiResult.completionReady,
          });
        }
      }

      const featureConversationCtx = messages
        .slice(-20)
        .map((m: { role: string; content: string }) => `${m.role === 'user' ? '고객' : 'AI PM'}: ${m.content}`)
        .join('\n');

      const aiResult = await generateQuickResponse(messages as ChatMessage[], rfpData);

      if (aiResult) {
        let rfpUpdate = aiResult.rfpUpdate;
        if (!rfpUpdate && featureSubmitUpdate) {
          rfpUpdate = featureSubmitUpdate;
        }

        // Quick 전용: 기능 선택 UI (4중 게이트)
        let selectableFeatures: SelectableFeature[] | null = null;
        const canShowFeatureSelector = !featureSelectorAlreadyShown   // 1. 이전에 표시한 적 없음
          && !featureJustSubmitted                                     // 2. 방금 기능 제출하지 않음
          && rfpData.coreFeatures.length === 0                         // 3. 기능이 아직 없음
          && !!(rfpData.overview || (rfpUpdate?.section === 'overview' && rfpUpdate.value));  // 4. ★ overview 수집 완료 후에만

        if (canShowFeatureSelector) {
          const currentOverview = rfpUpdate?.section === 'overview' ? (rfpUpdate.value as string) : rfpData.overview;
          const featureSourceText = currentOverview || rfpData.overview || userText;
          if (featureSourceText && featureSourceText.length >= 2) {
            try {
              const aiFeatures = await generateAIFeatures(featureSourceText, featureConversationCtx);
              if (aiFeatures && aiFeatures.length >= 3) {
                selectableFeatures = aiFeatures;
              }
            } catch (e) { console.error('Quick: Feature generation failed:', e); }
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

        // Quick 전용: 강제 완료
        let isComplete = aiResult.completionReady;
        const userTurnCount = messages.filter((m: { role: string }) => m.role === 'user').length;
        if (userTurnCount >= 5) {
          isComplete = true;
        } else if (userTurnCount >= 4 && rfpData.overview && rfpData.coreFeatures.length > 0) {
          isComplete = true;
        }

        // Quick 전용: 완료 직전 기능 미수집이면 한 번 더 시도
        if (isComplete && rfpData.coreFeatures.length === 0 && !selectableFeatures && canShowFeatureSelector) {
          const featureSourceText = rfpData.overview || userText;
          if (featureSourceText && featureSourceText.length >= 2) {
            try {
              const aiFeatures = await generateAIFeatures(featureSourceText, featureConversationCtx);
              if (aiFeatures && aiFeatures.length >= 3) {
                selectableFeatures = aiFeatures;
                isComplete = false;
                finalQuestion = '기능 목록을 확인하고 선택해주세요. 선택하신 기능들을 기반으로 PRD를 생성합니다.';
              }
            } catch (e) { console.error('Quick: Feature re-generation failed:', e); }
          }
        }

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
          featureSelectorShown: selectableFeatures !== null && selectableFeatures.length > 0,
          thinkingLabel: aiResult.thinkingLabel,
          topicsCovered: covered,
          progress: aiResult.progressPercent,
          canComplete: isComplete || isReadyToComplete(rfpData),
          deepPhase: undefined,
        });
      }

      // Quick Fallback
      const fallback = generateQuickFallback(rfpData, userText);
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
    }

    // ═══════════════════════════════════════════════════════
    //  ★★★ DEEP MODE — 완전 독립 플로우 ★★★
    // ═══════════════════════════════════════════════════════
    {
      const turnCount = messages.filter((m: { role: string }) => m.role === 'user').length;

      // 건너뛰기 처리
      if (userText === '건너뛰기') {
        const aiResult = await generateDeepResponse(messages as ChatMessage[], rfpData, deepPhase);
        if (aiResult) {
          return NextResponse.json({
            analysisMessage: '',
            questionMessage: aiResult.response,
            message: aiResult.response,
            rfpUpdate: null,
            nextAction: 'continue',
            quickReplies: aiResult.suggestions,
            inlineOptions: aiResult.suggestions,
            selectableFeatures: null,
            thinkingLabel: aiResult.thinkingLabel,
            topicsCovered: getTopicsCovered(rfpData),
            progress: aiResult.progressPercent,
            canComplete: false,
            deepPhase: aiResult.deepPhase,
          });
        }
      }

      const aiResult = await generateDeepResponse(messages as ChatMessage[], rfpData, deepPhase);

      if (aiResult) {
        // Deep 전용: rfpUpdates 적용 (복수)
        let primaryRfpUpdate: { section: string; value: string | object } | null = null;
        if (featureSubmitUpdate) {
          primaryRfpUpdate = featureSubmitUpdate;
        } else if (aiResult.rfpUpdates.length > 0) {
          primaryRfpUpdate = aiResult.rfpUpdates[0];
          // 2번째 이후 업데이트도 rfpData에 즉시 반영 (다음 턴에서 활용)
          for (let i = 1; i < aiResult.rfpUpdates.length; i++) {
            const u = aiResult.rfpUpdates[i];
            if (u.section === 'overview' && typeof u.value === 'string') rfpData.overview = u.value;
            else if (u.section === 'targetUsers' && typeof u.value === 'string') rfpData.targetUsers = u.value;
            else if (u.section === 'referenceServices' && typeof u.value === 'string') rfpData.referenceServices = u.value;
            else if (u.section === 'techRequirements' && typeof u.value === 'string') rfpData.techRequirements = u.value;
            else if (u.section === 'additionalRequirements' && typeof u.value === 'string') rfpData.additionalRequirements = u.value;
          }
        }

        // ═══ Deep mode: 기능 선택은 대화 완료 후 PRD 생성 직전에만 ═══
        let selectableFeatures: SelectableFeature[] | null = null;

        // ═══ 1단계: 강제 완료 조건 먼저 판단 ═══
        const hasOverview = !!rfpData.overview && rfpData.overview.length > 20;
        const hasTarget = !!rfpData.targetUsers && rfpData.targetUsers.length > 5;

        let isComplete = false;
        // 1) AI가 complete 판단 + overview 있으면 → 완료
        if (aiResult.conversationComplete && hasOverview) {
          isComplete = true;
        }
        // 2) overview + targetUsers + 8턴 이상 → 마무리
        if (hasOverview && hasTarget && turnCount >= 8) {
          isComplete = true;
        }
        // 3) overview만 있어도 12턴이면 → 강제 완료
        if (hasOverview && turnCount >= 12) {
          isComplete = true;
        }
        // 4) 15턴 절대 상한
        if (turnCount >= 15) {
          isComplete = true;
        }

        // ═══ 2단계: 완료 확정 후, 기능 미수집이면 기능 선택 먼저 ═══
        // 이 블록이 isComplete=false로 바꾸면 강제 완료가 다시 덮어쓸 수 없음
        if (isComplete && rfpData.coreFeatures.length === 0 && !featureSelectorAlreadyShown && !featureJustSubmitted && !featureSubmitUpdate) {
          const featureConversationCtx = messages
            .slice(-20)
            .map((m: { role: string; content: string }) => `${m.role === 'user' ? '고객' : 'PM'}: ${m.content}`)
            .join('\n');
          const featureSourceText = rfpData.overview || userText;
          if (featureSourceText && featureSourceText.length >= 2) {
            try {
              const aiFeatures = await generateAIFeatures(featureSourceText, featureConversationCtx);
              if (aiFeatures && aiFeatures.length >= 3) {
                selectableFeatures = aiFeatures;
                isComplete = false; // 기능 선택 완료까지 대기 — 이후 덮어쓸 코드 없음
              }
            } catch (e) { console.error('Deep: Feature pre-complete generation failed:', e); }
          }
        }

        // Deep mode 응답
        const covered = getTopicsCovered(rfpData);
        const hasFeatures = selectableFeatures !== null && selectableFeatures.length > 0;

        // 기능 선택 UI가 나올 때는 AI 질문이 아닌 안내 메시지로 교체
        const finalMessage = hasFeatures
          ? '지금까지 대화를 바탕으로 필요한 기능을 정리했습니다. 아래에서 원하시는 기능을 선택해주세요.'
          : aiResult.response;

        return NextResponse.json({
          analysisMessage: '',
          questionMessage: finalMessage,
          message: finalMessage,
          rfpUpdate: primaryRfpUpdate,
          multiUpdates: aiResult.rfpUpdates.slice(1),
          nextAction: isComplete ? 'complete' : 'continue',
          quickReplies: hasFeatures ? [] : aiResult.suggestions,
          inlineOptions: hasFeatures ? [] : aiResult.suggestions,
          selectableFeatures,
          featureSelectorShown: hasFeatures,
          thinkingLabel: aiResult.thinkingLabel,
          topicsCovered: covered,
          progress: hasFeatures ? 90 : aiResult.progressPercent,
          canComplete: isComplete || isReadyToComplete(rfpData),
          deepPhase: hasFeatures ? 'feature_selection' : aiResult.deepPhase,
          insightSummary: aiResult.insightSummary || '',
          insightCategory: aiResult.insightCategory || 'vision',
        });
      }

      // Deep Fallback
      const fallback = generateDeepFallback(rfpData, userText, turnCount);
      return NextResponse.json({
        analysisMessage: '',
        questionMessage: fallback.response,
        message: fallback.response,
        rfpUpdate: fallback.rfpUpdates.length > 0 ? fallback.rfpUpdates[0] : null,
        nextAction: fallback.conversationComplete ? 'complete' : 'continue',
        quickReplies: fallback.suggestions,
        inlineOptions: fallback.suggestions,
        selectableFeatures: null,
        topicsCovered: getTopicsCovered(rfpData),
        progress: fallback.progressPercent,
        canComplete: fallback.conversationComplete,
        deepPhase: fallback.deepPhase,
      });
    }

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({
      message: '잠시 문제가 발생했습니다. 다시 시도해주세요.',
      rfpUpdate: null, nextAction: 'continue',
    });
  }
}
