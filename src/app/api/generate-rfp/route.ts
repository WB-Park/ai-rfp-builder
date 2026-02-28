// AI RFP Builder — RFP Document Generation API v3 (PRD F2 + G3)
// GPT 대비 차별화: 위시켓 외주 전문가 수준의 문서 품질
// Fallback: API 키 없어도 고품질 분석 기반 문서 생성

import { NextRequest, NextResponse } from 'next/server';
import { RFP_GENERATION_PROMPT } from '@/lib/prompts';
import { RFPData } from '@/types/rfp';
import { supabase } from '@/lib/supabase';

const HAS_API_KEY =
  !!process.env.ANTHROPIC_API_KEY &&
  process.env.ANTHROPIC_API_KEY !== 'placeholder';

// ─── 프로젝트 유형 감지 ───
function detectProjectType(overview: string): string {
  const t = overview.toLowerCase();
  const types: [string, string][] = [
    ['앱', '모바일 앱'], ['어플', '모바일 앱'], ['모바일', '모바일 앱'],
    ['웹사이트', '웹사이트'], ['홈페이지', '웹사이트'],
    ['웹', '웹 서비스'], ['사이트', '웹 서비스'],
    ['쇼핑몰', '이커머스 플랫폼'], ['커머스', '이커머스 플랫폼'],
    ['플랫폼', '플랫폼'], ['마켓', '마켓플레이스'],
    ['saas', 'SaaS'], ['구독', 'SaaS 서비스'],
    ['매칭', '매칭 플랫폼'], ['중개', '중개 플랫폼'],
    ['예약', '예약 서비스'], ['교육', '에듀테크'],
    ['ai', 'AI 기반 서비스'], ['챗봇', 'AI 챗봇'],
    ['헬스', '헬스케어'], ['건강', '헬스케어'],
    ['금융', '핀테크'], ['핀테크', '핀테크'],
    ['게임', '게임'], ['sns', 'SNS/소셜'],
    ['소셜', '소셜 서비스'], ['물류', '물류 서비스'],
    ['배달', '배달/물류'], ['부동산', '프롭테크'],
    ['관리', '관리 시스템'], ['erp', 'ERP'], ['crm', 'CRM'],
  ];
  for (const [k, v] of types) { if (t.includes(k)) return v; }
  return '소프트웨어 서비스';
}

// ─── 복잡도 추정 ───
function estimateComplexity(data: RFPData): { level: string; score: number; details: string[] } {
  const details: string[] = [];
  let score = 0;

  score += data.coreFeatures.length;
  details.push(`기능 ${data.coreFeatures.length}개`);

  const hasAuth = data.coreFeatures.some(f =>
    f.name.includes('로그인') || f.name.includes('회원') || f.name.includes('인증'));
  const hasPayment = data.coreFeatures.some(f =>
    f.name.includes('결제') || f.name.includes('구매') || f.name.includes('주문'));
  const hasChat = data.coreFeatures.some(f =>
    f.name.includes('채팅') || f.name.includes('메시지'));
  const hasMap = data.coreFeatures.some(f =>
    f.name.includes('지도') || f.name.includes('위치') || f.name.includes('GPS'));
  const hasAdmin = data.coreFeatures.some(f =>
    f.name.includes('관리자') || f.name.includes('대시보드') || f.name.includes('어드민'));
  const hasAI = data.coreFeatures.some(f =>
    f.name.includes('AI') || f.name.includes('추천') || f.name.includes('분석'));

  if (hasAuth) { score += 2; details.push('사용자 인증 시스템'); }
  if (hasPayment) { score += 3; details.push('결제 시스템(PG 연동)'); }
  if (hasChat) { score += 3; details.push('실시간 채팅(WebSocket)'); }
  if (hasMap) { score += 2; details.push('위치 기반 서비스'); }
  if (hasAdmin) { score += 2; details.push('관리자 대시보드'); }
  if (hasAI) { score += 3; details.push('AI/ML 기능'); }

  if (score >= 12) return { level: '높음', score, details };
  if (score >= 7) return { level: '중간~높음', score, details };
  if (score >= 4) return { level: '중간', score, details };
  return { level: '보통', score, details };
}

// ─── 기술 스택 추천 ───
function generateTechRecommendation(data: RFPData): string {
  const tech = (data.techRequirements || '').toLowerCase();
  const overview = (data.overview || '').toLowerCase();
  const lines: string[] = ['  [AI 기술 스택 추천]'];

  const isApp = tech.includes('앱') || tech.includes('모바일') || overview.includes('앱');
  const isWeb = tech.includes('웹') || overview.includes('웹') || overview.includes('사이트');
  const isBoth = tech.includes('둘') || tech.includes('다') || (isApp && isWeb);

  if (isBoth) {
    lines.push('  ▸ 프론트엔드: React Native 또는 Flutter (크로스플랫폼) + Next.js (웹)');
    lines.push('    → 하나의 코드베이스로 iOS/Android/웹 커버, 비용 30~40% 절감');
  } else if (isApp) {
    lines.push('  ▸ 프론트엔드: Flutter 또는 React Native (크로스플랫폼 추천)');
    lines.push('    → 네이티브 대비 개발 기간 40% 단축, 유지보수 비용 절감');
  } else {
    lines.push('  ▸ 프론트엔드: Next.js (React) 또는 Nuxt.js (Vue) — 반응형 설계');
    lines.push('    → SEO 최적화와 빠른 로딩을 위한 SSR/SSG 지원');
  }

  lines.push('  ▸ 백엔드: Node.js(Express/NestJS) 또는 Python(Django/FastAPI)');
  lines.push('  ▸ 데이터베이스: PostgreSQL(관계형) + Redis(캐시)');
  lines.push('  ▸ 인프라: AWS 또는 GCP (자동 스케일링, 99.9% 가용성)');

  const hasPayment = data.coreFeatures.some(f =>
    f.name.includes('결제') || f.name.includes('구매'));
  if (hasPayment) {
    lines.push('');
    lines.push('  [결제 시스템 연동]');
    lines.push('  ▸ PG: 토스페이먼츠 또는 이니시스 (인증 기간 2~3주 소요)');
    lines.push('  ▸ 간편결제: 카카오페이, 네이버페이, 애플페이 연동 권장');
    lines.push('  ▸ 주의: 에스크로/정산 기능 포함 시 추가 2~3주 소요');
  }

  const hasChat = data.coreFeatures.some(f =>
    f.name.includes('채팅') || f.name.includes('메시지'));
  if (hasChat) {
    lines.push('');
    lines.push('  [실시간 통신]');
    lines.push('  ▸ WebSocket 기반 실시간 메시징 (Socket.IO 또는 자체 구현)');
    lines.push('  ▸ 또는 채팅 SDK(SendBird, Firebase) 활용 시 개발 기간 50% 단축');
    lines.push('  ▸ 주의: 동시 접속자 수에 따라 서버 비용 별도 산정 필요');
  }

  return lines.join('\n');
}

// ─── 예산 분석 ───
function analyzeBudget(budget: string, featureCount: number, complexity: string): string {
  const lines: string[] = [];
  const amounts = budget.match(/(\d{1,3}[,.]?\d{0,3})\s*(만|억)/g);

  lines.push('');
  lines.push('  [AI 예산/일정 분석]');

  if (amounts && amounts.length > 0) {
    lines.push(`  ▸ 기능 ${featureCount}개, 복잡도 "${complexity}" 기준 분석:`);
    lines.push(`  ▸ 예상 예산의 15~20% 여유분 확보를 권장합니다 (변경 요청 대응)`);
    lines.push(`  ▸ 전체 예산의 10~15%는 출시 후 안정화/개선 비용으로 예약하세요`);
  } else {
    lines.push(`  ▸ 유사 프로젝트 기준 예상 범위:`);
    if (featureCount <= 3) {
      lines.push(`    - MVP(핵심만): 1,500~3,000만원 / 4~6주`);
    } else if (featureCount <= 5) {
      lines.push(`    - MVP: 2,000~4,000만원 / 6~8주`);
      lines.push(`    - 풀 버전: 4,000~7,000만원 / 10~14주`);
    } else {
      lines.push(`    - MVP: 3,000~5,000만원 / 8~10주`);
      lines.push(`    - 풀 버전: 5,000만~1.2억 / 12~20주`);
    }
  }

  lines.push('');
  lines.push('  [결제 조건 추천]');
  lines.push('  ▸ 착수금 30% → 중간 산출물 확인 후 40% → 최종 납품 후 30%');
  lines.push('  ▸ 마일스톤별 산출물을 명확히 정의하여 진행 상황을 투명하게 관리');

  return lines.join('\n');
}

// ─── MVP 스코프 추천 ───
function generateMVPScope(data: RFPData): string {
  const p1 = data.coreFeatures.filter(f => f.priority === 'P1');
  const p2 = data.coreFeatures.filter(f => f.priority === 'P2');
  const p3 = data.coreFeatures.filter(f => f.priority === 'P3');

  const lines: string[] = [
    '  [MVP (최소 기능 제품) 전략]',
    '',
  ];

  if (p1.length > 0) {
    lines.push(`  ▸ 1단계 — MVP 출시 (4~8주)`);
    lines.push(`    기능: ${p1.map(f => f.name).join(', ')}`);
    lines.push(`    목표: 시장 검증, 초기 사용자 확보, 핵심 가설 검증`);
    lines.push(`    예상 비용: 전체 예산의 40~50%`);
  }
  if (p2.length > 0) {
    lines.push('');
    lines.push(`  ▸ 2단계 — 기능 확장 (MVP 출시 후 4~6주)`);
    lines.push(`    기능: ${p2.map(f => f.name).join(', ')}`);
    lines.push(`    목표: 사용자 피드백 기반 개선, 리텐션 향상`);
    lines.push(`    예상 비용: 전체 예산의 30~35%`);
  }
  if (p3.length > 0) {
    lines.push('');
    lines.push(`  ▸ 3단계 — 고도화 (2단계 이후)`);
    lines.push(`    기능: ${p3.map(f => f.name).join(', ')}`);
    lines.push(`    목표: 차별화, 수익 모델 강화`);
    lines.push(`    예상 비용: 전체 예산의 15~25%`);
  }

  if (p1.length === 0 && p2.length === 0) {
    lines.push(`  핵심 기능 우선 개발 → 사용자 검증 → 점진적 확장을 권장합니다`);
  }

  return lines.join('\n');
}

// ─── 리스크 분석 ───
function analyzeRisks(data: RFPData): string {
  const risks: string[] = [];

  if (data.coreFeatures.length > 5) {
    risks.push('기능 과다 — MVP에서 P1 기능만 먼저 개발하여 리스크 분산 권장');
  }

  const hasPayment = data.coreFeatures.some(f =>
    f.name.includes('결제') || f.name.includes('구매'));
  if (hasPayment) {
    risks.push('PG 연동 — 인증 절차(2~3주)가 별도 소요, 일정에 반드시 반영');
  }

  const hasChat = data.coreFeatures.some(f =>
    f.name.includes('채팅') || f.name.includes('메시지'));
  if (hasChat) {
    risks.push('실시간 채팅 — WebSocket 인프라 비용과 동시 접속자 처리 계획 필요');
  }

  if (!data.budgetTimeline || data.budgetTimeline.includes('미정')) {
    risks.push('예산 미정 — 최소 3곳 이상의 개발사 견적 비교 후 예산 확정 권장');
  }

  risks.push('스코프 크리프 — 개발 중 추가 요구사항 발생은 매우 일반적, 변경 관리 프로세스 사전 합의');
  risks.push('커뮤니케이션 — 주 1~2회 진행 보고서와 중간 산출물 리뷰 일정을 계약서에 명시');

  return risks.map((r, i) => `  ${i + 1}. ${r}`).join('\n');
}

// ─── Fallback RFP 문서 생성 (고품질) ───
function generateFallbackRFP(rfpData: RFPData): string {
  const date = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const projectType = detectProjectType(rfpData.overview);
  const { level: complexityLevel, details: complexityDetails } = estimateComplexity(rfpData);

  const featuresP1 = rfpData.coreFeatures.filter(f => f.priority === 'P1');
  const featuresP2 = rfpData.coreFeatures.filter(f => f.priority === 'P2');
  const featuresP3 = rfpData.coreFeatures.filter(f => f.priority === 'P3');

  const formatFeatures = (features: typeof rfpData.coreFeatures, label: string) => {
    if (features.length === 0) return '';
    return `\n  [${label}]\n${features.map((f, i) =>
      `  ${i + 1}. ${f.name}\n     → ${f.description !== f.name ? f.description : '세부 사항은 개발사와 협의'}`
    ).join('\n')}`;
  };

  const techRecommendation = generateTechRecommendation(rfpData);
  const budgetAnalysis = analyzeBudget(
    rfpData.budgetTimeline || '',
    rfpData.coreFeatures.length,
    complexityLevel
  );
  const mvpScope = generateMVPScope(rfpData);
  const riskAnalysis = analyzeRisks(rfpData);

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          소프트웨어 개발 제안요청서 (RFP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  작성일: ${date}
  작성 도구: 위시켓 AI RFP Builder
  문서 버전: 1.0


━━ 1. 프로젝트 개요 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ${rfpData.overview || '(미입력)'}

  ▸ 프로젝트 유형: ${projectType}
  ▸ 예상 복잡도: ${complexityLevel} (${complexityDetails.join(', ')})


━━ 2. 서비스 대상 (타겟 사용자) ━━━━━━━━━━━━━━━━━

  ${rfpData.targetUsers || '별도 지정 없음 (일반 사용자 대상)'}


━━ 3. 기능 요구사항 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  총 ${rfpData.coreFeatures.length}개 기능
  (필수 ${featuresP1.length}개 · 우선 ${featuresP2.length}개 · 선택 ${featuresP3.length}개)
${formatFeatures(featuresP1, '필수 (P1) — MVP에 반드시 포함')}
${formatFeatures(featuresP2, '우선 (P2) — 1차 출시 후 우선 개발')}
${formatFeatures(featuresP3, '선택 (P3) — 사용자 피드백 기반 결정')}


━━ 4. 참고 서비스 / 벤치마크 ━━━━━━━━━━━━━━━━━━━

  ${rfpData.referenceServices || '별도 참고 서비스 없음'}


━━ 5. 기술 요구사항 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ${rfpData.techRequirements || '기술 스택은 개발사 재량에 위임'}

${techRecommendation}


━━ 6. 예산 및 일정 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ${rfpData.budgetTimeline || '예산 미정 — 개발사 견적 요청'}
${budgetAnalysis}


━━ 7. 기타 요구사항 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ${rfpData.additionalRequirements || '추가 요구사항 없음'}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  위시켓 AI 전문가 분석 & 추천 사항
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${mvpScope}


  [프로젝트 리스크 분석]
${riskAnalysis}


  [개발사 선정 가이드]
  ▸ 이 프로젝트에 적합한 개발사 유형:
    - 유사 ${projectType} 프로젝트 포트폴리오 보유 업체
    - 최소 3년 이상 경력의 개발팀
    - 명확한 커뮤니케이션 프로세스를 갖춘 업체

  ▸ 견적 비교 체크리스트:
    - [ ] 최소 3개 이상 개발사 견적 비교
    - [ ] 포트폴리오에서 유사 프로젝트 확인
    - [ ] 총 비용뿐 아니라 마일스톤별 산출물 확인
    - [ ] 개발 기간과 투입 인력 비교
    - [ ] 커뮤니케이션 방식(주간 리포트 등) 확인

  ▸ 계약 시 필수 확인사항:
    - [ ] 소스코드 소유권 → 귀사에 귀속 명시
    - [ ] 중간 마일스톤별 산출물 정의
    - [ ] 하자보수 기간 → 최소 3개월 (6개월 권장)
    - [ ] 추가 개발 시 단가 기준 사전 합의
    - [ ] 보안 요구사항 및 개인정보 처리 방침
    - [ ] 테스트 범위와 QA 기준 명시


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  본 RFP는 위시켓 AI RFP Builder로 생성되었습니다.
  이 문서를 개발사에 바로 전달하여 정확한 견적을 받아보세요.

  위시켓 | wishket.com
  IT 프로젝트, 전문가에게 맡기세요.

  다음 단계:
  1. 위시켓에 프로젝트 등록 → 평균 5~8곳 개발사 견적 수령
  2. 개발사 포트폴리오 및 리뷰 확인
  3. 미팅 후 최종 개발사 선정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();
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

    if (!HAS_API_KEY) {
      rfpDocument = generateFallbackRFP(rfpData);
    } else {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6144,
        system: RFP_GENERATION_PROMPT,
        messages: [
          {
            role: 'user',
            content: `아래 수집된 정보로 전문 RFP 문서를 작성해주세요.\n\n프로젝트 유형: ${detectProjectType(rfpData.overview)}\n복잡도: ${estimateComplexity(rfpData).level}\n\n수집 데이터:\n${JSON.stringify(rfpData, null, 2)}`,
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
          rfp_document: rfpDocument.slice(0, 15000),
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
