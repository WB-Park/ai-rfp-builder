// AI PRD Builder — Chat API v10 (Quick Start + Deep Mode)
// Quick Start: 기존 가이드 질문형 (가벼운 사용자)
// Deep Mode: 자유 브리핑 → AI 구조화 → 갭 분석 챌린지 → 후속 질문 depth 2-3
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
  "analysis": "고객 답변에 대한 맥락적 피드백 (2~3문장). 💡 인사이트 1문장 포함.",
  "question": "다음 질문 (1~2문장). 선택지/예시 포함.",
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
//  Deep Mode: AI PM 킥오프 엔진
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
  structuredBriefing?: object;
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

  const messageCount = messages.filter(m => m.role === 'user').length;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `당신은 위시켓에서 116,000건 이상의 IT 외주 프로젝트를 분석한 시니어 PM 디렉터입니다.
Deep Mode에서는 프로젝트 킥오프 미팅을 이끄는 것처럼 깊이 있게 대화합니다.

[Deep Mode 페이즈]
현재 페이즈: ${deepPhase}

Phase 1 (briefing): 자유 브리핑 수신 → 구조화 정리
- 고객이 길게 작성한 브리핑을 받아서 구조화합니다
- "제가 이해한 내용을 정리했습니다:" 형식으로 핵심 정보를 카테고리별 정리
- 빠진 부분을 "⚠️ 아직 파악되지 않은 부분:" 으로 명시
- rfpUpdate에 최대한 많은 정보를 분배 저장
- structuredBriefing 객체로 정리 결과 반환
- 정리 후 deepPhase를 "gap_analysis"로 전환

Phase 2 (gap_analysis): 갭 분석 + AI 챌린지
- 수집되지 않은 정보를 질문하되, **단순 질문이 아닌 챌린지 형태**로
- 예: "수의사 상담을 핵심으로 잡으셨는데, 실제로 원격상담 서비스 중 텍스트 vs 화상 비율이 7:3입니다. 어떤 방식을 고려하고 계신가요?"
- 한 주제에 대해 depth 2~3까지 파고들기
- 고객의 가정에 대해 건설적으로 반박 가능
- MVP 스코프 질문: "이 기능들을 모두 MVP에 넣으시려는 건가요? 위시켓 데이터 기준, MVP에서 기능 5개 이하가 성공률이 2.3배 높습니다."
- 후속 질문은 번호를 매겨 2~4개 제시
- 각 질문에 답하면 다음 갭으로 이동
- 모든 핵심 갭이 채워지면 deepPhase를 "feature_select"로 전환

Phase 3 (feature_select): 기능 선택
- showFeatureSelector=true로 기능 선택 UI 표시
- 기능 선택 후 deepPhase를 "refinement"로 전환

Phase 4 (refinement): 심화 보강
- 수집된 정보 기반으로 빠진 디테일을 짚어줌
- 예: "결제 시스템에서 정산 주기가 언급 안 되었는데, B2B는 보통 월 1회 정산인데 어떻게 생각하세요?"
- 모든 핵심 정보가 풍부하면 completionReady=true

[핵심 원칙]
- 존댓말 필수
- 챌린지는 건설적으로. "그건 안 됩니다" ❌ → "이 방향도 고려해보셨나요?" ✅
- 위시켓 프로젝트 데이터 기반 인사이트 적극 활용
- 예산/견적/비용 관련 질문 금지
- analysis는 3~5문장으로 깊이 있게
- question은 2~3문장, 구체적 선택지 제시
- 후속 질문 시 번호 매기기 (1. 2. 3.)

[현재 수집 상태]
${collectedInfo.length > 0 ? collectedInfo.join('\n') : '(아직 수집된 정보 없음)'}

대화 턴 수: ${messageCount}

[응답 형식 — 반드시 JSON만 출력]
{
  "analysis": "고객 답변에 대한 깊이 있는 피드백 (3~5문장). 💡 인사이트 포함. 챌린지 포함.",
  "question": "다음 질문/챌린지. 후속 질문은 번호 매기기.",
  "rfpUpdate": { "section": "...", "value": "..." } 또는 null,
  "quickReplies": ["선택지1", "선택지2"],
  "showFeatureSelector": false,
  "completionReady": false,
  "progressPercent": 0~100,
  "thinkingLabel": "분석 중 표시할 레이블",
  "deepPhase": "${deepPhase}",
  "structuredBriefing": null
}

structuredBriefing은 Phase 1에서만 사용:
{
  "overview": "프로젝트 개요 요약",
  "targetUsers": "타겟 유저 요약",
  "features": "언급된 기능들",
  "tech": "기술 요구사항",
  "reference": "참고 서비스",
  "additional": "추가 정보",
  "gaps": ["파악되지 않은 부분1", "파악되지 않은 부분2"]
}`,
      messages: [{
        role: 'user',
        content: `대화 히스토리:\n${conversationContext}\n\n고객의 마지막 답변을 분석하고, Deep Mode 페이즈(${deepPhase})에 맞는 응답을 생성하세요. 반드시 JSON 형식으로만 응답하세요.`
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
      deepPhase: parsed.deepPhase || deepPhase,
      structuredBriefing: parsed.structuredBriefing || null,
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
    const deepPhase: string = clientDeepPhase || 'briefing';

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

      // Deep Mode: structuredBriefing에서 다중 rfpUpdate 추출
      if (mode === 'deep' && 'structuredBriefing' in aiResult && aiResult.structuredBriefing) {
        const sb = aiResult.structuredBriefing as Record<string, string>;
        // 가장 큰 단일 rfpUpdate를 기본으로 하되, 나머지도 multiUpdate로 전달
        const multiUpdates: Array<{ section: string; value: string }> = [];
        if (sb.overview && !rfpData.overview) multiUpdates.push({ section: 'overview', value: sb.overview });
        if (sb.targetUsers && !rfpData.targetUsers) multiUpdates.push({ section: 'targetUsers', value: sb.targetUsers });
        if (sb.tech && !rfpData.techRequirements) multiUpdates.push({ section: 'techRequirements', value: sb.tech });
        if (sb.reference && !rfpData.referenceServices) multiUpdates.push({ section: 'referenceServices', value: sb.reference });
        if (sb.additional && !rfpData.additionalRequirements) multiUpdates.push({ section: 'additionalRequirements', value: sb.additional });

        if (multiUpdates.length > 0 && !rfpUpdate) {
          rfpUpdate = multiUpdates[0];
        }

        // multiUpdates를 응답에 추가
        if (multiUpdates.length > 1) {
          const covered = getTopicsCovered(rfpData);
          return NextResponse.json({
            analysisMessage: aiResult.analysis,
            questionMessage: aiResult.question,
            message: aiResult.question || aiResult.analysis,
            rfpUpdate,
            multiUpdates,
            nextAction: aiResult.completionReady ? 'complete' : 'continue',
            quickReplies: aiResult.quickReplies,
            inlineOptions: aiResult.quickReplies,
            selectableFeatures: null,
            thinkingLabel: aiResult.thinkingLabel,
            topicsCovered: covered,
            progress: aiResult.progressPercent,
            canComplete: aiResult.completionReady,
            deepPhase: 'deepPhase' in aiResult ? aiResult.deepPhase : deepPhase,
            structuredBriefing: 'structuredBriefing' in aiResult ? aiResult.structuredBriefing : null,
          });
        }
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
        structuredBriefing: 'structuredBriefing' in aiResult ? aiResult.structuredBriefing : null,
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
