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

1. **대화형 시작**: "어떤 서비스를 만들고 싶으세요?"로 시작
2. **★ 핵심 항목 우선 수집**: 모든 6개 항목을 먼저 빠르게 수집한 후, 그 다음에 심화 질문
   - Phase 1 (수집): 각 미수집 항목을 1턴에 1개씩 빠르게 수집. 이 단계에서는 디깅하지 마세요.
   - Phase 2 (심화): 모든 항목 수집 후, 프로젝트의 본질적 문제(핵심 가치, 차별점, 리스크)에 대해 챌린지
3. **★ 본질적 질문만**: 세부 구현이 아닌 "왜 이 서비스인가", "핵심 차별점은 무엇인가", "가장 큰 리스크는 무엇인가" 같은 본질적 질문
4. **챌린지 스타일**: 단순 수집이 아닌 건설적 챌린지 — 단, 핵심 항목 수집 후에만

[🚨 절대 금지 — 루프 방지 규칙]
⛔ 이미 수집된 항목에 대해 다시 질문하지 마세요. "현재 수집 상태"에 있는 항목은 절대 다시 묻지 마세요.
⛔ 기능 리스트/MVP 리스트를 반복해서 묻지 마세요. coreFeatures가 이미 수집되었으면 기능 관련 질문 금지.
⛔ 같은 주제를 2턴 이상 연속으로 질문하지 마세요. 반드시 다른 미수집 항목으로 넘어가세요.
⛔ showFeatureSelector는 coreFeatures가 비어있을 때 딱 1번만 true. 이미 기능이 선택되었으면 절대 true 금지.

[대화 흐름 — 반드시 미수집 항목 우선]

★ 매 턴마다 "미수집 항목"을 확인하고, 그 중 하나에 대해서만 질문하세요.
★ 미수집 항목이 없으면 본질적 챌린지 질문 1~2개 후 completionReady=true.
★ 미수집 항목이 있는 동안에는 절대 세부 디깅/심화 질문하지 마세요. 수집 우선!

순서: 1. 프로젝트 개요 → 2. 핵심 기능 (showFeatureSelector=true) → 3. 타겟 사용자 → 4. 기술 요구사항 → 5. 참고 서비스 → 6. 추가 요구사항
⚠️ 세부 구현 질문 금지 예시: "로그인 방식은?" "DB는 뭘 쓸 건가요?" → 이런 건 PRD에서 AI가 알아서 채웁니다.
⚠️ 본질적 질문 예시: "이 서비스의 핵심 차별점은?" "경쟁 서비스 대비 우위는?" → 이런 질문만 하세요.

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
//  Quick Mode fallback (API 실패 시) — Quick 전용
// ═══════════════════════════════════════════════
function generateQuickFallback(rfpData: RFPData, userMessage: string): {
  message: string;
  rfpUpdate: { section: string; value: string | object } | null;
  quickReplies: string[];
  completionReady: boolean;
  progressPercent: number;
} {
  const msg = userMessage.trim();
  const isSkip = msg === '건너뛰기' || msg === '';

  // Quick: 4개 항목만 수집 (개요, 기능, 타겟, 기술)
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

// ═══════════════════════════════════════════════
//  Deep Mode fallback (API 실패 시) — Deep 전용
// ═══════════════════════════════════════════════
function generateDeepFallback(rfpData: RFPData, userMessage: string): {
  message: string;
  rfpUpdate: { section: string; value: string | object } | null;
  quickReplies: string[];
  completionReady: boolean;
  progressPercent: number;
} {
  const msg = userMessage.trim();
  const isSkip = msg === '건너뛰기' || msg === '';

  // Deep: 6개 항목 모두 수집 (개요, 기능, 타겟, 기술, 참고서비스, 추가요구사항)
  if (!rfpData.overview) {
    return {
      message: '어떤 서비스를 만들고 싶으신가요? 구상하고 계신 내용을 자유롭게 말씀해주세요.',
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
          message: '기능을 확인했습니다. 이 서비스의 주요 타겟 사용자는 누구인가요?',
          rfpUpdate: { section: 'coreFeatures', value: features },
          quickReplies: ['20~30대 직장인', '전 연령 일반 사용자', '기업 고객 (B2B)'],
          completionReady: false,
          progressPercent: 28,
        };
      }
    }
    return {
      message: '이 서비스에 어떤 핵심 기능이 필요한가요? 쉼표로 구분해 입력해주세요.',
      rfpUpdate: null,
      quickReplies: ['회원가입/로그인', '검색/필터', '결제 시스템', '채팅/메시징'],
      completionReady: false,
      progressPercent: 14,
    };
  }
  if (!rfpData.targetUsers) {
    return {
      message: '이 서비스의 주요 타겟 사용자는 누구인가요?',
      rfpUpdate: isSkip ? null : { section: 'targetUsers', value: msg },
      quickReplies: ['20~30대 직장인', '전 연령 일반 사용자', '기업 고객 (B2B)'],
      completionReady: false,
      progressPercent: 42,
    };
  }
  if (!rfpData.techRequirements) {
    return {
      message: '어떤 플랫폼으로 개발을 원하시나요?',
      rfpUpdate: isSkip ? null : { section: 'techRequirements', value: msg },
      quickReplies: ['모바일 앱 (iOS/Android)', '반응형 웹', '웹 + 앱 모두'],
      completionReady: false,
      progressPercent: 56,
    };
  }
  if (!rfpData.referenceServices) {
    return {
      message: '참고하거나 벤치마킹하고 싶은 서비스가 있으신가요?',
      rfpUpdate: isSkip ? null : { section: 'referenceServices', value: msg },
      quickReplies: ['특별히 없음', '직접 입력할게요'],
      completionReady: false,
      progressPercent: 70,
    };
  }
  if (!rfpData.additionalRequirements) {
    return {
      message: '추가로 고려해야 할 요구사항이 있으신가요? (보안, 성능, 디자인 등)',
      rfpUpdate: isSkip ? null : { section: 'additionalRequirements', value: msg },
      quickReplies: ['특별히 없음', '직접 입력할게요'],
      completionReady: true,
      progressPercent: 85,
    };
  }

  return {
    message: '모든 항목이 수집되었습니다. PRD를 생성하시겠습니까?',
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
    const { messages, rfpData: clientRfpData, chatMode, deepPhase: clientDeepPhase, featureSelectorShown: clientFeatureSelectorShown } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: '메시지가 필요합니다.' }, { status: 400 });
    }

    const mode: ChatMode = chatMode === 'deep' ? 'deep' : 'quick';
    const deepPhase: string = clientDeepPhase || 'conversation';
    // ★ 근본적 루프 방지: 클라이언트가 이미 기능 선택 UI를 표시했으면 절대 다시 표시하지 않음
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

    // 건너뛰기 처리 — 모드별 분리
    if (userText === '건너뛰기') {
      if (mode === 'quick') {
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
      } else {
        const aiResult = await generateDeepResponse(messages as ChatMessage[], rfpData, deepPhase);
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
            deepPhase: aiResult.deepPhase || deepPhase,
          });
        }
      }
    }

    // ═══════════════════════════════════════════════════════
    //  공통: JSON 기능 배열 파싱 (기능 선택 완료 시)
    // ═══════════════════════════════════════════════════════
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
    //  ★★★ QUICK MODE 전용 플로우 ★★★
    // ═══════════════════════════════════════════════════════
    if (mode === 'quick') {
      const aiResult = await generateQuickResponse(messages as ChatMessage[], rfpData);

      if (aiResult) {
        let rfpUpdate = aiResult.rfpUpdate;
        if (!rfpUpdate && featureSubmitUpdate) {
          rfpUpdate = featureSubmitUpdate;
        }

        // ═══ Quick 전용: 기능 선택 UI (3중 게이트) ═══
        let selectableFeatures: SelectableFeature[] | null = null;
        const canShowFeatureSelector = !featureSelectorAlreadyShown && !featureJustSubmitted && rfpData.coreFeatures.length === 0;

        if (canShowFeatureSelector) {
          const currentOverview = rfpUpdate?.section === 'overview' ? (rfpUpdate.value as string) : rfpData.overview;
          const featureSourceText = currentOverview || rfpData.overview || userText;
          if (featureSourceText && featureSourceText.length >= 2) {
            try {
              const aiFeatures = await generateAIFeatures(featureSourceText);
              if (aiFeatures && aiFeatures.length >= 3) {
                selectableFeatures = aiFeatures;
              }
            } catch (e) { console.error('Quick: Feature generation failed:', e); }
          }
        }

        // Quick 전용: question 정리
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

        // Quick 전용: 강제 완료 (5턴 무조건, 4턴+핵심정보)
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
              const aiFeatures = await generateAIFeatures(featureSourceText);
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
          deepPhase: undefined,  // Quick 모드는 deepPhase 없음
        });
      }

      // Quick 전용 Fallback
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
    //  ★★★ DEEP MODE 전용 플로우 ★★★
    // ═══════════════════════════════════════════════════════
    {
      const aiResult = await generateDeepResponse(messages as ChatMessage[], rfpData, deepPhase);

      if (aiResult) {
        let rfpUpdate = aiResult.rfpUpdate;
        if (!rfpUpdate && featureSubmitUpdate) {
          rfpUpdate = featureSubmitUpdate;
        }

        // ═══ Deep 전용: 기능 선택 UI (3중 게이트) ═══
        let selectableFeatures: SelectableFeature[] | null = null;
        const canShowFeatureSelector = !featureSelectorAlreadyShown && !featureJustSubmitted && rfpData.coreFeatures.length === 0;

        if (canShowFeatureSelector) {
          const currentOverview = rfpUpdate?.section === 'overview' ? (rfpUpdate.value as string) : rfpData.overview;
          const featureSourceText = currentOverview || rfpData.overview || userText;
          if (featureSourceText && featureSourceText.length >= 2) {
            try {
              const aiFeatures = await generateAIFeatures(featureSourceText);
              if (aiFeatures && aiFeatures.length >= 3) {
                selectableFeatures = aiFeatures;
              }
            } catch (e) { console.error('Deep: Feature generation failed:', e); }
          }
        }

        // Deep 전용: question 정리
        let finalQuestion = aiResult.question;
        if (aiResult.showFeatureSelector && !selectableFeatures) {
          finalQuestion = finalQuestion
            .replace(/기능을?\s*선택해\s*주세요[.!]?/g, '')
            .replace(/아래에서?\s*기능을?\s*선택[^.]*[.!]?/g, '')
            .replace(/기능\s*리스트를?\s*확인[^.]*[.!]?/g, '')
            .trim();
          if (!finalQuestion) {
            finalQuestion = featureJustSubmitted
              ? '기능 선택이 완료되었습니다. 다음으로 넘어가겠습니다.'
              : '프로젝트에 필요한 핵심 기능들을 알려주세요.';
          }
        }

        // Deep 전용: 완료 조건 — AI 판단 존중 (Quick처럼 턴 수 강제 없음)
        let isComplete = aiResult.completionReady;

        // Deep 전용: 완료 직전 기능 미수집이면 한 번 더 시도
        if (isComplete && rfpData.coreFeatures.length === 0 && !selectableFeatures && canShowFeatureSelector) {
          const featureSourceText = rfpData.overview || userText;
          if (featureSourceText && featureSourceText.length >= 2) {
            try {
              const aiFeatures = await generateAIFeatures(featureSourceText);
              if (aiFeatures && aiFeatures.length >= 3) {
                selectableFeatures = aiFeatures;
                isComplete = false;
                finalQuestion = '기능 목록을 확인하고 선택해주세요. 선택하신 기능들을 기반으로 PRD를 생성합니다.';
              }
            } catch (e) { console.error('Deep: Feature re-generation failed:', e); }
          }
        }

        // Deep 전용: 안전장치 — 12턴 넘으면 강제 완료
        const userTurnCount = messages.filter((m: { role: string }) => m.role === 'user').length;
        if (userTurnCount >= 12 && rfpData.overview && rfpData.coreFeatures.length > 0) {
          isComplete = true;
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
          deepPhase: aiResult.deepPhase || deepPhase,
        });
      }

      // Deep 전용 Fallback
      const fallback = generateDeepFallback(rfpData, userText);
      return NextResponse.json({
        message: fallback.message,
        rfpUpdate: fallback.rfpUpdate,
        nextAction: fallback.completionReady ? 'complete' : 'continue',
        quickReplies: fallback.quickReplies,
        inlineOptions: fallback.quickReplies,
        topicsCovered: getTopicsCovered(rfpData),
        progress: fallback.progressPercent,
        canComplete: fallback.completionReady,
        deepPhase: deepPhase,
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
