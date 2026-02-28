// AI RFP Builder — RFP Document Generation API (PRD F2)
// Fallback: API 키 없으면 고품질 템플릿 기반 문서 생성
// + 세션 업데이트

import { NextRequest, NextResponse } from 'next/server';
import { RFP_GENERATION_PROMPT } from '@/lib/prompts';
import { RFPData } from '@/types/rfp';
import { supabase } from '@/lib/supabase';

const HAS_API_KEY =
  !!process.env.ANTHROPIC_API_KEY &&
  process.env.ANTHROPIC_API_KEY !== 'placeholder';

function generateFallbackRFP(rfpData: RFPData): string {
  const date = new Date().toLocaleDateString('ko-KR');

  // 기능 목록 포맷팅
  const featuresP1 = rfpData.coreFeatures.filter(f => f.priority === 'P1');
  const featuresP2 = rfpData.coreFeatures.filter(f => f.priority === 'P2');
  const featuresP3 = rfpData.coreFeatures.filter(f => f.priority === 'P3');

  const formatFeatures = (features: typeof rfpData.coreFeatures, label: string) => {
    if (features.length === 0) return '';
    return `\n  [${label}]\n${features.map((f, i) =>
      `  ${i + 1}. ${f.name}\n     → ${f.description !== f.name ? f.description : '세부 사항은 개발사와 협의'}`
    ).join('\n')}`;
  };

  // 예산 분석
  const budgetAnalysis = rfpData.budgetTimeline
    ? analyzeBudget(rfpData.budgetTimeline, rfpData.coreFeatures.length)
    : '';

  // 기술 스택 추천
  const techRecommendation = generateTechRecommendation(rfpData);

  // MVP 스코프 추천
  const mvpScope = generateMVPScope(rfpData);

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
       소프트웨어 개발 제안요청서 (RFP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  작성일: ${date}
  작성 도구: 위시켓 AI RFP Builder
  문서 버전: 1.0


━━ 1. 프로젝트 개요 ━━━━━━━━━━━━━━━━━━━

  ${rfpData.overview || '(미입력)'}

  ${rfpData.overview ? `
  ▸ 프로젝트 유형: ${detectProjectType(rfpData.overview)}
  ▸ 예상 복잡도: ${estimateComplexity(rfpData)}` : ''}


━━ 2. 서비스 대상 (타겟 사용자) ━━━━━━━

  ${rfpData.targetUsers || '별도 지정 없음 (일반 사용자 대상)'}


━━ 3. 기능 요구사항 ━━━━━━━━━━━━━━━━━━━

  총 ${rfpData.coreFeatures.length}개 기능 (필수 ${featuresP1.length}개, 우선 ${featuresP2.length}개, 선택 ${featuresP3.length}개)
${formatFeatures(featuresP1, '필수 — MVP에 반드시 포함')}
${formatFeatures(featuresP2, '우선 — 1차 출시 후 우선 개발')}
${formatFeatures(featuresP3, '선택 — 사용자 피드백 기반 결정')}


━━ 4. 참고 서비스 / 벤치마크 ━━━━━━━━━

  ${rfpData.referenceServices || '별도 참고 서비스 없음'}


━━ 5. 기술 요구사항 ━━━━━━━━━━━━━━━━━━━

  ${rfpData.techRequirements || '기술 스택은 개발사 재량에 위임'}

${techRecommendation}


━━ 6. 예산 및 일정 ━━━━━━━━━━━━━━━━━━━

  ${rfpData.budgetTimeline || '예산 미정 — 개발사 견적 요청'}
${budgetAnalysis}


━━ 7. 기타 요구사항 ━━━━━━━━━━━━━━━━━━━

  ${rfpData.additionalRequirements || '추가 요구사항 없음'}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  AI 전문가 분석 & 추천 사항
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${mvpScope}

  ▸ 개발사 선정 팁
    - 유사 프로젝트 포트폴리오를 반드시 확인하세요
    - 최소 3개 이상의 개발사 견적을 비교하세요
    - 유지보수 계약 조건을 사전에 협의하세요
    - 소통 빈도와 방식(주간 리포트 등)을 미리 정하세요

  ▸ 계약 시 체크리스트
    - [ ] 소스코드 소유권 명시
    - [ ] 중간 마일스톤별 산출물 정의
    - [ ] 하자보수 기간 및 범위 합의
    - [ ] 추가 개발 시 단가 기준 명시


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  본 RFP는 위시켓 AI RFP Builder로 생성되었습니다.
  이 문서를 개발사에 바로 전달하여 정확한 견적을 받아보세요.

  위시켓 | wishket.com
  IT 프로젝트, 전문가에게 맡기세요.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();
}

// ─── 프로젝트 유형 감지 ───
function detectProjectType(overview: string): string {
  const t = overview.toLowerCase();
  const types: [string, string][] = [
    ['앱', '모바일 앱'],
    ['어플', '모바일 앱'],
    ['웹', '웹 서비스'],
    ['사이트', '웹사이트'],
    ['플랫폼', '플랫폼'],
    ['쇼핑몰', '이커머스'],
    ['커머스', '이커머스'],
    ['saas', 'SaaS'],
    ['관리', '관리 시스템'],
    ['erp', 'ERP'],
    ['crm', 'CRM'],
    ['매칭', '매칭 플랫폼'],
    ['예약', '예약 서비스'],
    ['ai', 'AI 기반 서비스'],
    ['교육', '에듀테크'],
    ['헬스', '헬스케어'],
    ['금융', '핀테크'],
    ['게임', '게임'],
  ];
  for (const [k, v] of types) { if (t.includes(k)) return v; }
  return '소프트웨어 서비스';
}

// ─── 복잡도 추정 ───
function estimateComplexity(data: RFPData): string {
  const featureCount = data.coreFeatures.length;
  const hasAuth = data.coreFeatures.some(f =>
    f.name.includes('로그인') || f.name.includes('회원') || f.name.includes('인증'));
  const hasPayment = data.coreFeatures.some(f =>
    f.name.includes('결제') || f.name.includes('구매') || f.name.includes('주문'));
  const hasChat = data.coreFeatures.some(f =>
    f.name.includes('채팅') || f.name.includes('메시지'));

  let complexity = 0;
  complexity += featureCount;
  if (hasAuth) complexity += 2;
  if (hasPayment) complexity += 3;
  if (hasChat) complexity += 2;

  if (complexity >= 8) return '높음 (전문 개발팀 권장)';
  if (complexity >= 5) return '중간 (경험 있는 개발사 권장)';
  return '보통 (소규모 팀으로도 가능)';
}

// ─── 기술 스택 추천 ───
function generateTechRecommendation(data: RFPData): string {
  const tech = (data.techRequirements || '').toLowerCase();
  const overview = (data.overview || '').toLowerCase();

  const lines: string[] = [];

  if (tech.includes('앱') || tech.includes('모바일') || overview.includes('앱')) {
    lines.push('  ▸ 크로스플랫폼(Flutter/React Native) 권장 — 비용 30~40% 절감 가능');
  }
  if (tech.includes('웹') || overview.includes('웹')) {
    lines.push('  ▸ 반응형 웹 설계 권장 — 모바일 사용자 커버 가능');
  }

  const hasPayment = data.coreFeatures.some(f =>
    f.name.includes('결제') || f.name.includes('구매'));
  if (hasPayment) {
    lines.push('  ▸ PG 연동(이니시스/토스페이먼츠 등) 필요 — 인증 기간 2~3주 소요');
  }

  const hasChat = data.coreFeatures.some(f =>
    f.name.includes('채팅') || f.name.includes('메시지'));
  if (hasChat) {
    lines.push('  ▸ 실시간 통신(WebSocket) 필요 — 서버 비용 별도 고려');
  }

  if (lines.length === 0) {
    lines.push('  ▸ 기술 스택은 개발사의 전문성에 따라 결정 권장');
  }

  return lines.length > 0 ? `\n  [AI 기술 추천]\n${lines.join('\n')}` : '';
}

// ─── 예산 분석 ───
function analyzeBudget(budget: string, featureCount: number): string {
  const lines: string[] = [];

  // 숫자 추출
  const amounts = budget.match(/(\d{1,3}[,.]?\d{0,3})\s*(만|억)/g);
  if (amounts && amounts.length > 0) {
    lines.push(`\n  [AI 예산 분석]`);
    lines.push(`  ▸ 기능 ${featureCount}개 기준, 예상 예산의 10~20% 여유분 확보를 권장합니다`);
    lines.push(`  ▸ MVP(필수 기능만) 선 개발 시 초기 비용을 50~60% 수준으로 줄일 수 있습니다`);
  }

  return lines.join('\n');
}

// ─── MVP 스코프 추천 ───
function generateMVPScope(data: RFPData): string {
  const p1 = data.coreFeatures.filter(f => f.priority === 'P1');
  const p2p3 = data.coreFeatures.filter(f => f.priority !== 'P1');

  const lines: string[] = [
    '  ▸ MVP (최소 기능 제품) 전략 추천',
  ];

  if (p1.length > 0) {
    lines.push(`    1단계: ${p1.map(f => f.name).join(', ')} → 4~8주`);
    lines.push(`    → 시장 검증 후 사용자 피드백 수집`);
  }
  if (p2p3.length > 0) {
    lines.push(`    2단계: ${p2p3.map(f => f.name).join(', ')} → 피드백 기반 추가 개발`);
    lines.push(`    → 우선순위 재조정 후 점진적 확장`);
  }
  if (p1.length === 0 && p2p3.length === 0) {
    lines.push(`    핵심 기능 우선 개발 후 점진적 확장을 권장합니다`);
  }

  return lines.join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const { rfpData, sessionId }: { rfpData: RFPData; sessionId?: string } =
      await req.json();

    if (!rfpData || !rfpData.overview) {
      return NextResponse.json(
        { error: 'RFP 데이터가 필요합니다.' },
        { status: 400 }
      );
    }

    let rfpDocument: string;

    // Fallback mode
    if (!HAS_API_KEY) {
      rfpDocument = generateFallbackRFP(rfpData);
    } else {
      // AI mode
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: RFP_GENERATION_PROMPT,
        messages: [
          {
            role: 'user',
            content: `아래 수집된 정보로 RFP 문서를 작성해주세요:\n\n${JSON.stringify(rfpData, null, 2)}`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        rfpDocument = generateFallbackRFP(rfpData);
      } else {
        rfpDocument = content.text;
      }
    }

    // 세션에 완성된 RFP 문서 저장 (non-blocking)
    if (sessionId) {
      supabase
        .from('rfp_sessions')
        .update({
          rfp_data: rfpData,
          rfp_document: rfpDocument.slice(0, 10000),
          completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .then(({ error }) => {
          if (error) console.error('Session RFP save error:', error);
        });
    }

    return NextResponse.json({
      rfpDocument,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('RFP generation error:', error);
    try {
      const body = await req.clone().json();
      return NextResponse.json({
        rfpDocument: generateFallbackRFP(body.rfpData),
        generatedAt: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json(
        { error: 'RFP 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
  }
}
