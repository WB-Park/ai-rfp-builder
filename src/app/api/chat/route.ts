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
// 대화의 "깊이"로 판단, rfpData 필드 채움 여부와 무관
type DeepPhase = 'explore' | 'understand' | 'define' | 'refine';

function determineDeepPhase(messages: ChatMessage[], turnCount: number): DeepPhase {
  // Deep mode phase는 대화 턴 수 + 대화 내용의 깊이로 결정
  // Quick mode처럼 "어떤 필드가 채워졌는가"로 판단하지 않음
  if (turnCount <= 2) return 'explore';    // 탐색: 뭘 만들려는지, 왜 필요한지
  if (turnCount <= 5) return 'understand'; // 이해: 배경, 상황, 사용자, 경쟁
  if (turnCount <= 8) return 'define';     // 정의: 핵심 기능, 차별점, 기술 방향
  return 'refine';                         // 정제: 우려, 성공기준, 최종 확인
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
  readyToDefineFeatures: boolean;  // 기능 정의할 준비가 됐는지 (showFeatureSelector 대체)
  conversationComplete: boolean;   // 대화 완료 여부
} | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const conversationContext = messages
    .slice(-24)
    .map(m => `${m.role === 'user' ? '고객' : 'PM'}: ${m.content}`)
    .join('\n');

  const turnCount = messages.filter(m => m.role === 'user').length;
  const phase = determineDeepPhase(messages, turnCount);

  // 대화에서 이미 다룬 주제들 추출
  const topicsCovered = [];
  if (rfpData.overview) topicsCovered.push('프로젝트 개요/비전');
  if (rfpData.targetUsers) topicsCovered.push('타겟 사용자');
  if (rfpData.coreFeatures.length > 0) topicsCovered.push('핵심 기능');
  if (rfpData.referenceServices) topicsCovered.push('참고 서비스/경쟁사');
  if (rfpData.techRequirements) topicsCovered.push('기술 방향');
  if (rfpData.additionalRequirements) topicsCovered.push('추가 요구사항/우려');

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
• ⚠️ readyToDefineFeatures=false 고정` : ''}

${phase === 'understand' ? `[understand — 이해 단계] 배경과 맥락을 깊이 파악하는 중
• 타겟 사용자의 실제 상황과 pain point
• 현재 이 문제가 어떻게 해결되고 있는지 (경쟁/대안)
• 고객의 사업 맥락 (이미 운영 중인 사업인지, 신규인지, etc.)
• 고객이 말한 내용 중 모호한 부분을 구체화
• ⚠️ readyToDefineFeatures=false 유지 — 아직 기능을 정의할 단계가 아닙니다` : ''}

${phase === 'define' ? `[define — 정의 단계] 핵심을 구체화하는 중
• 지금까지의 대화를 기반으로 "이 서비스의 핵심은 OOO입니다" 정리
• 기능 방향성을 대화로 잡기 (이 단계에서 readyToDefineFeatures=true 가능)
• 기술 방향, 플랫폼 등을 자연스럽게 논의
• 차별점과 핵심 가치 확인` : ''}

${phase === 'refine' ? `[refine — 정제 단계] 최종 확인 중
• 우려사항, 리스크, 성공 기준 논의
• 대화 내용을 종합 정리
• 남은 궁금한 점 확인
• conversationComplete=true 가능 (충분히 이야기했다면)
• 아직 기능 정의를 안 했다면 readyToDefineFeatures=true` : ''}

═══ 응답 스타일 ═══
- 존댓말 필수
- response는 3파트로 구성하되, 줄바꿈(\\n\\n)으로 구분:
  ① 리액션 (2~3문장): 고객 답변을 재구성/확인하며 구체적으로 짚어주기
  ② 💡 인사이트 (1문장): 위시켓 데이터 기반 전문가 인사이트 (💡 prefix)
  ③ **질문** (1개): 마지막에 줄바꿈 후 **볼드**로 강조. 물음표(?) 정확히 1개.
- 예시 형식:
  "말씀하신 내용을 정리하면, OOO 서비스에서 핵심은 XXX라는 점이군요. 현재 이 문제를 겪는 분들이 YYY 방식으로 해결하고 있다는 점도 중요한 맥락입니다.\\n\\n💡 위시켓에서 유사한 프로젝트 데이터를 보면, 초기 타겟을 좁힌 프로젝트의 성공률이 82% 더 높았습니다.\\n\\n**그렇다면 이 서비스를 가장 먼저 사용하게 될 핵심 타겟은 구체적으로 어떤 상황에 있는 분인가요?**"
- ⚠️ "좋은 생각이시네요", "흥미로운 아이디어네요" 같은 제네릭 반응 절대 금지
- ⚠️ 예산/견적/비용/시장규모 질문 금지
- suggestions: 고객이 바로 클릭해서 보낼 수 있는 구체적인 답변 2~3개
  • ❌ "직접 경험한 불편함을 말해주세요" (가이드/지시 형태)
  • ✅ "직접 겪은 불편함에서 시작했어요" (고객이 바로 보낼 수 있는 답변)
  • ❌ "타겟 사용자를 구체적으로 설명해주세요"
  • ✅ "20~30대 직장인이 주요 타겟이에요"
  • 고객의 관점에서 자연스러운 1인칭 답변 형태로 작성

═══ rfpUpdates 규칙 ═══
- 고객의 자연스러운 대화에서 정보를 추출하여 배열로 반환
- 하나의 답변에서 여러 항목을 동시에 추출 가능 (예: overview + targetUsers)
- overview는 고객의 비전+배경+동기를 풍부하게 조합 (단순 서비스명이 아닌 맥락 포함)
- 추출할 정보가 없으면 빈 배열 []

═══ 완료 조건 ═══
- conversationComplete=true: 충분한 대화가 오갔고 + overview 수집됨 + coreFeatures 수집됨
- 고객이 "됐어요", "이 정도면 충분해요" 등 종료 의사 → 즉시 conversationComplete=true
- readyToDefineFeatures=true: define 단계 이후 + 대화로 서비스 방향이 잡혔을 때 (기능 선택 UI 트리거)

[이미 다룬 주제]
${topicsCovered.length > 0 ? topicsCovered.join(', ') : '(아직 없음)'}

대화 턴: ${turnCount}

[응답 형식 — 반드시 JSON만 출력]
{
  "response": "자연스러운 대화체 응답. 분석 + 인사이트 + 질문이 하나의 흐름으로.",
  "rfpUpdates": [{"section": "overview", "value": "추출값"}],
  "suggestions": ["대화 힌트1", "대화 힌트2"],
  "deepPhase": "${phase}",
  "progressPercent": 0~100,
  "thinkingLabel": "표시 레이블",
  "readyToDefineFeatures": false,
  "conversationComplete": false
}`,
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
    };
  } catch (error) {
    console.error('Deep response error:', error);
    return null;
  }
}

// Deep Mode fallback — Quick mode의 순차 수집이 아닌, 대화 깊이 기반
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

  // Phase 기반 fallback — 수집 항목이 아닌 대화 깊이 기준
  if (turnCount <= 1) {
    // 첫 답변: 프로젝트 개요 추출
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

  if (turnCount <= 3) {
    return {
      response: `이해했습니다. 그렇다면 이 서비스를 가장 먼저 사용하게 될 사람은 어떤 상황에 있는 분인가요? 그 분의 하루에서 이 서비스가 어느 시점에 필요할까요?`,
      rfpUpdates: msg.length > 1 ? [{ section: 'additionalRequirements', value: msg }] : [],
      suggestions: ['20~30대 직장인이 주 타겟이에요', '아직 명확하게 정하진 못했어요', 'B2B, 기업 고객 대상이에요'],
      deepPhase: 'understand',
      progressPercent: 30,
      readyToDefineFeatures: false,
      conversationComplete: false,
    };
  }

  if (turnCount <= 6) {
    return {
      response: `지금까지 말씀하신 내용을 종합하면, 이 서비스에서 사용자가 가장 자주 하게 될 핵심 행동은 무엇일까요?`,
      rfpUpdates: msg.length > 1 ? [{ section: 'additionalRequirements', value: msg }] : [],
      suggestions: ['검색하고 비교하는 게 핵심이에요', '참고하는 서비스가 있어요'],
      deepPhase: 'define',
      progressPercent: 55,
      readyToDefineFeatures: true,
      conversationComplete: false,
    };
  }

  return {
    response: `충분한 대화가 이루어졌습니다. 정리하신 내용을 바탕으로 제품 요구사항 정의서를 생성하시겠습니까?`,
    rfpUpdates: [],
    suggestions: [],
    deepPhase: 'refine',
    progressPercent: 90,
    readyToDefineFeatures: rfpData.coreFeatures.length === 0,
    conversationComplete: true,
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

        // Quick 전용: 기능 선택 UI (3중 게이트)
        let selectableFeatures: SelectableFeature[] | null = null;
        const canShowFeatureSelector = !featureSelectorAlreadyShown && !featureJustSubmitted && rfpData.coreFeatures.length === 0;

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

        // Deep 전용: 기능 선택 UI — Quick mode의 게이트 시스템 대신
        // AI의 readyToDefineFeatures 판단 + 대화 깊이로 결정
        let selectableFeatures: SelectableFeature[] | null = null;
        const shouldShowFeatures = !featureSelectorAlreadyShown
          && !featureJustSubmitted
          && rfpData.coreFeatures.length === 0
          && aiResult.readyToDefineFeatures
          && turnCount >= 3;  // 최소 3턴 이상 대화 후

        if (shouldShowFeatures) {
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
              }
            } catch (e) { console.error('Deep: Feature generation failed:', e); }
          }
        }

        // Deep 전용: 완료 조건
        let isComplete = aiResult.conversationComplete;

        // 안전장치: 완료 시 기능 미수집이면 기능 선택 먼저
        if (isComplete && rfpData.coreFeatures.length === 0 && !selectableFeatures && !featureSelectorAlreadyShown && !featureJustSubmitted) {
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
                isComplete = false;
              }
            } catch (e) { console.error('Deep: Feature pre-complete generation failed:', e); }
          }
        }

        // 안전장치: 12턴 + overview + features → 강제 완료
        if (turnCount >= 12 && rfpData.overview && rfpData.coreFeatures.length > 0) {
          isComplete = true;
        }

        // Deep mode 응답: analysis/question 분리 없이 하나의 response
        // 하위 호환: analysisMessage와 questionMessage로도 전달
        const covered = getTopicsCovered(rfpData);
        return NextResponse.json({
          // Deep mode 전용 필드
          analysisMessage: '',  // Deep mode는 analysis/question 분리 안 함
          questionMessage: aiResult.response,  // 단일 자연스러운 응답
          message: aiResult.response,
          rfpUpdate: primaryRfpUpdate,
          // 추가 rfpUpdates (2번째 이후) — 클라이언트에서 활용 가능
          additionalRfpUpdates: aiResult.rfpUpdates.slice(1),
          nextAction: isComplete ? 'complete' : 'continue',
          quickReplies: selectableFeatures ? [] : aiResult.suggestions,
          inlineOptions: selectableFeatures ? [] : aiResult.suggestions,
          selectableFeatures,
          featureSelectorShown: selectableFeatures !== null && selectableFeatures.length > 0,
          thinkingLabel: aiResult.thinkingLabel,
          topicsCovered: covered,
          progress: aiResult.progressPercent,
          canComplete: isComplete || isReadyToComplete(rfpData),
          deepPhase: aiResult.deepPhase,
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
