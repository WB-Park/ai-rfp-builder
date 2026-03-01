// AI RFP Builder — PRD Generation v8 (Full AI-Driven)
// 핵심 변경: 하드코딩 템플릿 전면 제거, Claude API가 PRD 전체를 프로젝트 맥락에 맞춰 직접 생성

import { NextRequest, NextResponse } from 'next/server';
import { RFPData, FeatureItem } from '@/types/rfp';
import { supabase } from '@/lib/supabase';

const HAS_API_KEY =
  !!process.env.ANTHROPIC_API_KEY &&
  process.env.ANTHROPIC_API_KEY !== 'placeholder';

export const maxDuration = 60;

// ═══════════════════════════════════════════
// PRD Result Interface (UI 호환 유지)
// ═══════════════════════════════════════════

interface PRDResult {
  projectName: string;
  documentMeta: { version: string; createdAt: string; generatedBy: string };
  executiveSummary: string;
  projectOverview: string;
  problemStatement: string;
  projectGoals: { goal: string; metric: string }[];
  targetUsers: string;
  userPersonas: { name: string; role: string; needs: string; painPoints: string }[];
  scopeInclusions: string[];
  scopeExclusions: string[];
  techStack: { category: string; tech: string; rationale: string }[];
  referenceServices: string;
  additionalRequirements: string;
  featureModules: {
    id: number;
    name: string;
    priority: 'P0' | 'P1' | 'P2';
    priorityLabel: string;
    features: {
      id: string;
      name: string;
      description: string;
      subFeatures: string[];
      acceptanceCriteria: string[];
      userFlow: string;
      screenSpecs: { id: string; name: string; purpose: string; elements: string[]; scenarios: string[][] }[];
      businessRules: string[];
      dataEntities: { name: string; fields: string }[];
      errorCases: string[];
    }[];
  }[];
  nonFunctionalRequirements: { category: string; items: string[] }[];
  timeline: { phase: string; duration: string; deliverables: string[] }[];
  assumptions: string[];
  constraints: string[];
  risks: { risk: string; impact: string; mitigation: string; probability?: string }[];
  glossary: { term: string; definition: string }[];
  expertInsight: string;
  informationArchitecture: {
    sitemap: { id: string; label: string; children?: { id: string; label: string; children?: { id: string; label: string }[] }[] }[];
  };
  originalDescription?: string;
  apiEndpoints?: { method: string; path: string; description: string; feature: string }[];
  dataModel?: { entity: string; fields: string[]; relationships: string[] }[];
  competitorAnalysis?: { name: string; strengths: string; weaknesses: string; differentiation: string }[];
  approvalProcess?: { stage: string; approver: string; criteria: string }[];
  qaStrategy?: { type: string; scope: string; tools: string; criteria: string }[];
}

// ═══════════════════════════════════════════
// Feature Sanitization
// ═══════════════════════════════════════════

function sanitizeFeatures(features: FeatureItem[]): FeatureItem[] {
  const conversationalPatterns = ['입니다', '싶습니다', '있습니다', '했습니다', '해요', '거예요', '거든요'];
  return features.filter(f => {
    const name = f.name || '';
    if (name.length > 30 || /^\d+$/.test(name.trim())) return false;
    for (const p of conversationalPatterns) { if (name.includes(p)) return false; }
    return true;
  }).map(f => ({ ...f, name: f.name.slice(0, 30) }));
}

// ═══════════════════════════════════════════
// Full AI PRD Generation — Single comprehensive prompt
// ═══════════════════════════════════════════

async function generateFullAIPRD(rfpData: RFPData): Promise<PRDResult> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let features = sanitizeFeatures(rfpData.coreFeatures || []);
  const featureList = features.map((f, i) => `${i + 1}. ${f.name} (${f.priority}) — ${f.description || '설명 없음'}`).join('\n');
  const now = new Date().toISOString().split('T')[0];

  // 개별 API 호출에 타임아웃 적용 (45초)
  function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('API_TIMEOUT')), ms)),
    ]);
  }

  // ── Call A: 프로젝트 스코프 + 사용자 분석 + 전문가 인사이트 ──
  const callA = anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2500,
    system: `당신은 위시켓 13년차 수석 IT외주 PM 컨설턴트입니다. 116,000건 프로젝트 경험 기반으로 PRD를 작성합니다.

[절대 규칙]
- 사용자가 입력한 정보 기반의 팩트만 정리. 추측성 비즈니스 분석/시장 규모/성장률 금지
- "좋은", "효율적인", "혁신적" 같은 추상적 수식어 → 금지
- 존댓말 필수
- 반드시 유효한 JSON만 출력 (마크다운/추가 텍스트 절대 금지)`,
    messages: [{
      role: 'user',
      content: `다음 프로젝트의 PRD 핵심 섹션을 작성해주세요.

[프로젝트 정보]
- 서비스 설명: ${rfpData.overview || '(미입력)'}
- 타겟 사용자: ${rfpData.targetUsers || '(미입력)'}
- 핵심 기능:\n${featureList || '(미입력)'}
- 참고 서비스: ${rfpData.referenceServices || '없음'}
- 기술 요구사항: ${rfpData.techRequirements || '없음'}
- 추가 요구사항: ${rfpData.additionalRequirements || '없음'}

JSON 형식으로 응답하세요:
{
  "projectName": "서비스 성격이 드러나는 프로젝트명 15자 이내 (예: '펫케어 매칭 플랫폼')",
  "projectScope": "프로젝트 정의 요약문 (200~300자). 아래 구조를 자연스러운 문장형으로 작성:\n\n1문단: 이 프로젝트가 무엇인지 한 문장으로 정의. (예: '소상공인을 위한 재고 관리 SaaS 웹 애플리케이션입니다.')\n2문단: 대상 사용자와 핵심 기능 범위를 명시. (예: '주요 사용자는 OO이며, 핵심 기능 N개(A, B, C 등)를 포함합니다.')\n3문단: 기술 방향 또는 플랫폼. (예: 'React 기반 웹앱으로, PostgreSQL + REST API 구조를 채택합니다.')\n\n⚠️ 규칙: 시장 규모, 경쟁 우위, 비전, 기대효과 등 추상적 비즈니스 분석 절대 금지. 사용자가 입력한 정보를 명확하게 정리하는 것이 목적. 마크다운 불릿 금지, 순수 문장형으로만 작성.",
  "targetUsersAnalysis": "400자 이상. (1) Primary 사용자: 인구통계 + 핵심 Pain Point 3개 (2) Secondary 사용자 1그룹 (3) 사용자 여정 핵심 5단계별 이탈 방지 포인트",
  "expertInsight": "800자 이상. ★PRD에서 가장 가치있는 섹션★ (1) 💡 이 유형 프로젝트 성공 요인 TOP 3 — 위시켓 실제 데이터 기반 수치 포함 (2) ⚠️ 실패 원인 TOP 3 — 사례+금액 영향 (3) 📋 개발사 선정 체크리스트 5개 (4) 💰 이 프로젝트의 예산 최적화 전략 3개 — 각 절감비율 (5) 📝 계약 시 필수 조항 3개"
}`
    }],
  });

  // ── Call B: 구조화 데이터 (배열/객체 중심 필드) ──
  const callB = anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2500,
    system: `당신은 위시켓 13년차 수석 IT외주 PM 컨설턴트입니다. 이 프로젝트에 특화된 구체적 내용만 작성합니다.

[절대 규칙]
- 일반론/범용 내용 금지. 이 프로젝트만의 특수성 반영 필수
- 구체적 수치, 실제 서비스명, 한국 시장 맥락 필수
- 반드시 유효한 JSON만 출력`,
    messages: [{
      role: 'user',
      content: `다음 프로젝트의 PRD 구조화 데이터를 생성해주세요.

[프로젝트 정보]
- 서비스: ${rfpData.overview || '(미입력)'}
- 타겟: ${rfpData.targetUsers || '(미입력)'}
- 핵심 기능:\n${featureList || '(미입력)'}
- 참고 서비스: ${rfpData.referenceServices || '없음'}
- 기술: ${rfpData.techRequirements || '없음'}

JSON 형식으로 응답하세요:
{
  "projectGoals": [
    {"goal": "구체적 비즈니스 목표", "metric": "측정 지표+목표값+기간"}
  ],
  "userPersonas": [
    {"name": "한국 이름", "role": "직업+나이+상황(예: 스타트업 대표, 35세, 5인 팀 운영)", "needs": "구체적 니즈 2~3개. 시간/빈도/맥락 포함", "painPoints": "현재 문제 2~3개. 기존 도구명 포함"}
  ],
  "timeline": [
    {"phase": "Phase 1 — 기획·설계", "duration": "2~3주", "deliverables": ["구체적 산출물 3~4개"]}
  ],
  "risks": [
    {"risk": "이 프로젝트 특유의 위험 요소를 구체적으로", "impact": "높음/중간/낮음", "mitigation": "구체적 대응 방안", "probability": "높음/중간/낮음"}
  ],
  "assumptions": ["★필수★ 이 프로젝트가 성립하기 위한 전제 5개. 예: '사용자가 스마트폰 사용 가능', 'API 연동 대상 서비스가 안정적으로 운영 중' 등 구체적으로"],
  "constraints": ["★필수★ 이 프로젝트의 기술적/비즈니스적 제약 5개. 예: '초기 버전은 한국어만 지원', 'iOS/Android 동시 출시 필요', 'GDPR/개인정보보호법 준수 필수' 등 구체적으로"],
  "techStack": [
    {"category": "프론트엔드/백엔드/DB/인프라", "tech": "기술명", "rationale": "이 프로젝트에서 이 기술을 선택한 이유"}
  ],
  "competitorAnalysis": [
    {"name": "실제 경쟁 서비스명", "strengths": "강점", "weaknesses": "약점", "differentiation": "우리 서비스의 차별점"}
  ],
  "scopeExclusions": ["1차 MVP에서 제외할 기능/범위 5개 — 각각 제외 이유 포함"],
  "approvalProcess": [
    {"stage": "단계명 (예: 기획 승인, 디자인 리뷰, QA 통과)", "approver": "담당자/역할", "criteria": "승인 기준 구체적으로"}
  ],
  "qaStrategy": [
    {"type": "테스트 유형 (단위/통합/E2E/성능/보안)", "scope": "테스트 대상 범위", "tools": "도구명", "criteria": "통과 기준"}
  ]
}

projectGoals: 정확히 4개. SMART 원칙 적용.
userPersonas: 정확히 3명. 최소 1명은 서비스 운영자/관리자.
timeline: 정확히 5단계 (기획설계/UI디자인/MVP개발/추가기능/QA출시).
risks: 정확히 5개. 기술/비즈니스/운영 골고루. ★이 필드는 반드시 비어있지 않은 배열로 생성★
assumptions: 정확히 5개. ★이 필드는 반드시 비어있지 않은 배열로 생성★
constraints: 정확히 5개. ★이 필드는 반드시 비어있지 않은 배열로 생성★
techStack: 4~6개. 프론트엔드, 백엔드, DB, 인프라 필수.
competitorAnalysis: 3개. 실제 한국 서비스명 사용.
approvalProcess: 정확히 4단계. 기획승인/디자인리뷰/개발완료/출시승인 단계 필수.
qaStrategy: 정확히 5개. 단위테스트, 통합테스트, E2E, 성능, 보안 반드시 포함.`
    }],
  });

  // ── Call C: 기능 상세 명세 (가장 중요) ──
  const callC = anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2500,
    system: `당신은 시니어 소프트웨어 아키텍트입니다. 각 기능에 대해 개발사가 바로 WBS를 작성할 수 있을 정도로 상세한 명세를 작성합니다.

[절대 규칙]
- 각 기능별 최소 5개 이상의 서브기능, 4개 이상의 수용기준 작성
- 사용자 흐름은 ASCII 다이어그램 형태로 상세하게
- 화면 명세는 실제 UI 요소와 시나리오 포함
- 비즈니스 규칙은 구체적 숫자/조건 포함 (예: "비밀번호 8자 이상, 영문+숫자+특수문자")
- 반드시 유효한 JSON만 출력`,
    messages: [{
      role: 'user',
      content: `다음 기능들의 상세 명세를 작성해주세요.

[프로젝트]: ${rfpData.overview || ''}
[타겟 사용자]: ${rfpData.targetUsers || ''}

[기능 목록]
${featureList}

JSON 형식으로 응답:
{
  "featureSpecs": [
    {
      "name": "기능명 (위 목록과 정확히 일치)",
      "description": "이 프로젝트 맥락에서 이 기능이 하는 일을 2~3문장으로 구체적으로 설명",
      "subFeatures": ["서브기능 5~8개. 각각 구체적 기능 단위"],
      "acceptanceCriteria": ["수용기준 4~6개. 각각 측정 가능한 조건 (예: '검색 결과 200ms 이내 반환')"],
      "userFlow": "ASCII 다이어그램:\n[시작] → [단계1] → [단계2]\n  ├─ ✓ 성공 → [결과]\n  └─ ✗ 실패 → [에러 처리]",
      "screenSpecs": [
        {
          "id": "SCR-001",
          "name": "화면명",
          "purpose": "이 화면의 목적",
          "elements": ["UI 요소 5~8개"],
          "scenarios": [
            ["시나리오명", "사전조건", "사용자 동작", "시스템 반응", "✓/✗"]
          ]
        }
      ],
      "businessRules": ["비즈니스 규칙 3~5개. 구체적 숫자/조건 필수"],
      "dataEntities": [
        {"name": "테이블명", "fields": "컬럼들 (id, name, ...)"}
      ],
      "errorCases": ["에러 케이스 3~5개. 각각 사용자에게 보여줄 메시지 포함"]
    }
  ]
}

중요: 각 기능이 이 프로젝트("${rfpData.overview}")에서 어떻게 동작하는지 맥락에 맞춰 작성하세요.
예를 들어 "검색" 기능이라면, 단순히 일반적인 검색이 아니라 이 서비스에서 무엇을 검색하는지 구체적으로.`
    }],
  });

  // 3개 호출 병렬 실행 (각 45초 타임아웃)
  const [resultA, resultB, resultC] = await Promise.allSettled([
    withTimeout(callA, 45000),
    withTimeout(callB, 45000),
    withTimeout(callC, 45000),
  ]);

  // 결과 파싱
  function parseResult(result: PromiseSettledResult<any>): Record<string, any> {
    if (result.status !== 'fulfilled') return {};
    const content = result.value.content[0];
    if (content.type !== 'text') return {};
    const match = content.text.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try { return JSON.parse(match[0]); } catch { return {}; }
  }

  const dataA = parseResult(resultA);
  const dataB = parseResult(resultB);
  const dataC = parseResult(resultC);

  // ── PRDResult 조립 ──
  const projectName = dataA.projectName || rfpData.overview?.slice(0, 15) || '프로젝트';

  // Feature Modules 조립
  const featureSpecs = dataC.featureSpecs || [];
  const featureModules: PRDResult['featureModules'] = [];
  const p0Features = features.filter(f => f.priority === 'P1');
  const p1Features = features.filter(f => f.priority === 'P2');
  const p2Features = features.filter(f => f.priority === 'P3');

  // Fuzzy matching: 슬래시, 공백, 특수문자 제거 후 비교 + 핵심 키워드 2글자 이상 매칭
  function normalize(s: string): string {
    return (s || '').replace(/[\s\/\-·,.()\[\]]/g, '').toLowerCase();
  }
  function fuzzyMatch(a: string, b: string): boolean {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return false;
    // 정규화 후 포함 관계
    if (na.includes(nb) || nb.includes(na)) return true;
    // 핵심 키워드 2글자 이상 매칭 (예: "회원가입" in "회원가입/로그인")
    const keywords = a.split(/[\s\/\-·,.]+/).filter(k => k.length >= 2);
    for (const kw of keywords) {
      if (nb.includes(normalize(kw))) return true;
    }
    return false;
  }

  function findBestSpec(featureName: string): Record<string, any> {
    // 1차: 정확히 일치
    let spec = featureSpecs.find((s: any) => s.name === featureName);
    if (spec) return spec;
    // 2차: 정규화 후 일치
    spec = featureSpecs.find((s: any) => normalize(s.name) === normalize(featureName));
    if (spec) return spec;
    // 3차: fuzzy 매칭
    spec = featureSpecs.find((s: any) => fuzzyMatch(s.name, featureName));
    if (spec) return spec;
    // 4차: _mappedName 기반 (인덱스 매핑된 경우)
    spec = featureSpecs.find((s: any) => s._mappedName === featureName);
    if (spec) return spec;
    return {};
  }

  function buildFeatureModule(
    id: number, name: string, priority: 'P0' | 'P1' | 'P2', label: string, feats: FeatureItem[]
  ) {
    if (feats.length === 0) return;
    featureModules.push({
      id, name, priority, priorityLabel: label,
      features: feats.map((f, i) => {
        // AI가 생성한 상세 명세 매칭 (개선된 fuzzy matching)
        const spec = findBestSpec(f.name);
        return {
          id: `${priority}-${i + 1}`,
          name: f.name,
          description: spec.description || f.description || `${f.name} 기능 구현`,
          subFeatures: Array.isArray(spec.subFeatures) && spec.subFeatures.length > 0
            ? spec.subFeatures
            : [`${f.name} 기본 기능`, '관련 UI/UX 설계', 'QA/테스트'],
          acceptanceCriteria: Array.isArray(spec.acceptanceCriteria) && spec.acceptanceCriteria.length > 0
            ? spec.acceptanceCriteria
            : [`${f.name} 기능 정상 동작`],
          userFlow: spec.userFlow || '',
          screenSpecs: Array.isArray(spec.screenSpecs) ? spec.screenSpecs : [],
          businessRules: Array.isArray(spec.businessRules) ? spec.businessRules : [],
          dataEntities: Array.isArray(spec.dataEntities) ? spec.dataEntities : [],
          errorCases: Array.isArray(spec.errorCases) ? spec.errorCases : [],
        };
      }),
    });
  }

  // featureSpecs가 featureList와 동일 순서인 경우를 위한 인덱스 매핑 보강
  // AI가 이름을 약간 변형해 생성한 경우에도 순서 기반으로 매칭
  if (featureSpecs.length > 0 && featureSpecs.length === features.length) {
    // 매칭 안 된 스펙이 많으면 인덱스 기반으로 전체 매핑
    const matchedCount = features.filter(f => {
      const spec = findBestSpec(f.name);
      return spec && Object.keys(spec).length > 0;
    }).length;
    if (matchedCount < features.length * 0.5) {
      // 이름 매칭률이 50% 미만이면, 인덱스 기반 매핑 (AI가 순서대로 생성)
      features.forEach((f, i) => {
        if (featureSpecs[i] && !findBestSpec(f.name).description) {
          featureSpecs[i]._mappedName = f.name;
        }
      });
    }
  }

  buildFeatureModule(1, 'MVP 필수 기능', 'P0', 'MVP 필수', p0Features);
  buildFeatureModule(2, '우선 기능', 'P1', '우선순위 1', p1Features);
  buildFeatureModule(3, '선택 기능', 'P2', '우선순위 2', p2Features);

  // Scope inclusions
  const scopeInclusions = features.map(f => `${f.name}${f.description ? ` — ${f.description}` : ''}`);

  // NFR (이건 프로젝트 유형에 크게 의존하지 않으므로 표준 세트 유지)
  const nonFunctionalRequirements: PRDResult['nonFunctionalRequirements'] = [
    {
      category: '성능 (Performance)',
      items: [
        'API 응답: 평균 < 200ms, 99th percentile < 1초',
        '페이지 로딩: FCP < 2초, LCP < 3초',
        '동시 접속: 최소 1,000명 처리',
        '이미지 최적화: WebP + lazy loading',
      ],
    },
    {
      category: '보안 (Security)',
      items: [
        'HTTPS/TLS 1.3 전 구간 암호화',
        '비밀번호: bcrypt 해싱, 8자+ 복잡도 요구',
        'JWT: Access 1시간, Refresh 14일',
        'SQL Injection/XSS 방지',
        '개인정보보호법 준수',
      ],
    },
    {
      category: '인프라/운영',
      items: [
        '가용성: 99.5% (월 다운타임 < 3.6시간)',
        '자동 백업: 일 1회, 30일 보관',
        'CI/CD: GitHub Actions 기반',
        '모니터링: Sentry + 서버 메트릭',
      ],
    },
  ];

  // Glossary
  const glossary: PRDResult['glossary'] = [
    { term: 'MVP', definition: 'Minimum Viable Product — 핵심 기능만으로 시장 검증하는 첫 번째 버전' },
    { term: 'P0/P1/P2', definition: '우선순위 등급. P0=필수(MVP), P1=우선(2차), P2=선택(향후)' },
    { term: 'PRD', definition: 'Product Requirements Document — 제품 요구사항 정의서' },
    { term: 'UAT', definition: 'User Acceptance Testing — 사용자 인수 테스트' },
    { term: 'SLA', definition: 'Service Level Agreement — 가용성/응답시간 등 서비스 수준 약정' },
    { term: 'QA', definition: 'Quality Assurance — 품질 보증 및 테스트' },
    { term: 'WBS', definition: 'Work Breakdown Structure — 업무 분류 체계 (일정/공수 산정 기초)' },
    { term: 'API', definition: 'Application Programming Interface — 소프트웨어 간 통신 규약' },
  ];

  // IA (Sitemap)
  const informationArchitecture: PRDResult['informationArchitecture'] = {
    sitemap: [{
      id: 'root',
      label: projectName,
      children: [
        {
          id: 'main',
          label: '주요 섹션',
          children: [
            { id: 'home', label: '홈' },
            ...features.slice(0, 5).map((f, i) => ({ id: `feat-${i}`, label: f.name })),
            { id: 'mypage', label: '마이페이지' },
          ],
        },
        {
          id: 'auth',
          label: '인증',
          children: [
            { id: 'login', label: '로그인' },
            { id: 'signup', label: '회원가입' },
          ],
        },
      ],
    }],
  };

  // API Endpoints (from budget breakdown features)
  const apiEndpoints: PRDResult['apiEndpoints'] = [];
  for (const f of features.slice(0, 6)) {
    const slug = f.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '');
    apiEndpoints.push(
      { method: 'GET', path: `/api/${slug}`, description: `${f.name} 목록 조회`, feature: f.name },
      { method: 'POST', path: `/api/${slug}`, description: `${f.name} 생성`, feature: f.name },
      { method: 'PUT', path: `/api/${slug}/:id`, description: `${f.name} 수정`, feature: f.name },
    );
  }

  // Data model from feature specs
  const dataModel: PRDResult['dataModel'] = [];
  const seen = new Set<string>();
  for (const spec of featureSpecs) {
    if (spec.dataEntities) {
      for (const de of spec.dataEntities) {
        if (de.name && !seen.has(de.name)) {
          seen.add(de.name);
          const fields = typeof de.fields === 'string' ? de.fields.split(',').map((f: string) => f.trim()) : de.fields || [];
          dataModel.push({ entity: de.name, fields, relationships: [] });
        }
      }
    }
  }

  const result: PRDResult = {
    projectName,
    documentMeta: { version: '1.0', createdAt: now, generatedBy: 'Wishket AI PRD Builder' },
    executiveSummary: dataA.projectScope || dataA.executiveSummary || `• 서비스 유형: ${rfpData.techRequirements || '웹 서비스'}\n• 대상 사용자: ${rfpData.targetUsers || '(미정)'}\n• 핵심 기능: ${features.length}개\n• 기술 방향: ${rfpData.techRequirements || '미정'}`,
    projectOverview: '',
    problemStatement: '',
    projectGoals: dataB.projectGoals || [{ goal: 'MVP 출시', metric: '핵심 기능 구현 완료' }],
    targetUsers: dataA.targetUsersAnalysis || rfpData.targetUsers || '',
    userPersonas: dataB.userPersonas || [],
    scopeInclusions,
    scopeExclusions: dataB.scopeExclusions || ['다국어 지원 — 1차 제외', '오프라인 모드 — 1차 제외'],
    techStack: dataB.techStack || [
      { category: '프론트엔드', tech: 'Next.js', rationale: '빠른 개발과 SEO' },
      { category: '백엔드', tech: 'NestJS', rationale: '안정적 API 구현' },
      { category: 'DB', tech: 'PostgreSQL', rationale: '데이터 무결성' },
    ],
    referenceServices: rfpData.referenceServices || '해당 없음',
    additionalRequirements: rfpData.additionalRequirements || '추가 요구사항 없음',
    featureModules,
    nonFunctionalRequirements,
    timeline: dataB.timeline || [
      { phase: 'Phase 1 — 기획·설계', duration: '2~3주', deliverables: ['요구사항 확정', '와이어프레임', 'API 설계'] },
      { phase: 'Phase 2 — UI 디자인', duration: '2주', deliverables: ['디자인 시안', '디자인 시스템'] },
      { phase: 'Phase 3 — MVP 개발', duration: '4~6주', deliverables: ['핵심 기능 구현', 'API 개발'] },
      { phase: 'Phase 4 — 추가 개발', duration: '2~4주', deliverables: ['추가 기능', '통합 테스트'] },
      { phase: 'Phase 5 — QA·출시', duration: '1~2주', deliverables: ['버그 수정', '배포', '모니터링'] },
    ],
    assumptions: (dataB.assumptions && dataB.assumptions.length > 0) ? dataB.assumptions : [
      `타겟 사용자(${rfpData.targetUsers || '미정'})가 서비스에 접근 가능한 디바이스를 보유`,
      '외부 연동 API/서비스가 안정적으로 운영 중',
      '초기 출시 시 동시 접속자 1,000명 이하 가정',
      '디자인 가이드/브랜딩 에셋은 별도 제공 예정',
      '운영/CS 인력이 서비스 출시 전 확보됨',
    ],
    constraints: (dataB.constraints && dataB.constraints.length > 0) ? dataB.constraints : [
      '1차 MVP는 한국어만 지원',
      `개발 기간 내 핵심 기능(${features.length}개) 우선 구현`,
      '개인정보보호법 및 관련 법규 준수 필수',
      '초기 인프라 비용 월 50만원 이내 운영 가능해야 함',
      '기존 레거시 시스템과의 연동 범위 1차 제외',
    ],
    risks: ((dataB.risks && dataB.risks.length > 0) ? dataB.risks : [
      { risk: '핵심 기능 개발 복잡도가 예상보다 높을 수 있음', impact: '높음', mitigation: 'MVP 범위를 최소화하고 기능별 개발 스프린트 운영', probability: '중간' },
      { risk: '외부 API 연동 시 스펙 변경/장애 발생 가능', impact: '중간', mitigation: 'API 연동 모듈 추상화 및 fallback 로직 구현', probability: '중간' },
      { risk: '출시 후 사용자 피드백으로 대규모 수정 필요', impact: '중간', mitigation: '베타 테스트 기간 확보, 피드백 수집 체계 구축', probability: '높음' },
      { risk: '보안 취약점으로 인한 개인정보 유출', impact: '높음', mitigation: '보안 코드 리뷰 + 침투 테스트 필수 포함', probability: '낮음' },
      { risk: '개발사 커뮤니케이션 지연으로 일정 초과', impact: '높음', mitigation: '주 2회 정기 미팅 + 이슈 트래커 기반 관리', probability: '중간' },
    ]).map((r: any) => ({
      ...r,
      probability: r.probability || (r.impact === '높음' ? '높음' : '중간'),
    })),
    glossary,
    expertInsight: dataA.expertInsight || '',
    informationArchitecture,
    originalDescription: rfpData.overview || '',
    apiEndpoints,
    dataModel,
    competitorAnalysis: dataB.competitorAnalysis || [],
    approvalProcess: dataB.approvalProcess || [],
    qaStrategy: dataB.qaStrategy || [],
  };

  return result;
}

// ═══════════════════════════════════════════
// Minimal Fallback (API 없을 때만 사용)
// ═══════════════════════════════════════════

function generateMinimalFallback(rfpData: RFPData): PRDResult {
  const features = sanitizeFeatures(rfpData.coreFeatures || []);
  const now = new Date().toISOString().split('T')[0];
  const projectName = rfpData.overview?.slice(0, 15) || '프로젝트';

  const featureModules: PRDResult['featureModules'] = [];
  const p0 = features.filter(f => f.priority === 'P1');
  const p1 = features.filter(f => f.priority === 'P2');
  const p2 = features.filter(f => f.priority === 'P3');

  function addModule(id: number, name: string, priority: 'P0' | 'P1' | 'P2', label: string, feats: FeatureItem[]) {
    if (feats.length === 0) return;
    featureModules.push({
      id, name, priority, priorityLabel: label,
      features: feats.map((f, i) => ({
        id: `${priority}-${i + 1}`,
        name: f.name,
        description: f.description || `${f.name} 기능`,
        subFeatures: [`${f.name} 기본 기능`, 'UI/UX 설계', 'QA'],
        acceptanceCriteria: [`${f.name} 정상 동작`],
        userFlow: '',
        screenSpecs: [],
        businessRules: [],
        dataEntities: [],
        errorCases: [],
      })),
    });
  }

  addModule(1, 'MVP 필수 기능', 'P0', 'MVP 필수', p0);
  addModule(2, '우선 기능', 'P1', '우선순위 1', p1);
  addModule(3, '선택 기능', 'P2', '우선순위 2', p2);

  return {
    projectName,
    documentMeta: { version: '1.0', createdAt: now, generatedBy: 'Wishket AI PRD Builder' },
    executiveSummary: `${rfpData.targetUsers || '사용자'}를 위한 ${projectName} 프로젝트입니다. 핵심 기능 ${features.length}개를 포함합니다.`,
    projectOverview: rfpData.overview || '',
    problemStatement: `${rfpData.targetUsers || '사용자'}가 겪는 문제를 해결하기 위한 프로젝트입니다.`,
    projectGoals: [{ goal: 'MVP 출시', metric: '핵심 기능 구현 완료' }],
    targetUsers: rfpData.targetUsers || '',
    userPersonas: [],
    scopeInclusions: features.map(f => f.name),
    scopeExclusions: ['다국어 지원', '오프라인 모드'],
    techStack: [
      { category: '프론트엔드', tech: 'Next.js', rationale: '빠른 개발' },
      { category: '백엔드', tech: 'NestJS', rationale: '안정적 API' },
      { category: 'DB', tech: 'PostgreSQL', rationale: '데이터 무결성' },
    ],
    referenceServices: rfpData.referenceServices || '해당 없음',
    additionalRequirements: rfpData.additionalRequirements || '',
    featureModules,
    nonFunctionalRequirements: [],
    timeline: [
      { phase: '기획·설계', duration: '2~3주', deliverables: ['요구사항 확정'] },
      { phase: '개발', duration: '6~10주', deliverables: ['기능 구현'] },
      { phase: 'QA·출시', duration: '1~2주', deliverables: ['테스트', '배포'] },
    ],
    assumptions: [],
    constraints: [],
    risks: [],
    glossary: [{ term: 'MVP', definition: '최소 기능 제품' }],
    expertInsight: '',
    informationArchitecture: { sitemap: [] },
    originalDescription: rfpData.overview || '',
    apiEndpoints: [],
    dataModel: [],
    competitorAnalysis: [],
    approvalProcess: [],
    qaStrategy: [],
  };
}

// ═══════════════════════════════════════════
// API Handler
// ═══════════════════════════════════════════

export async function POST(req: NextRequest) {
  let rfpData: RFPData | null = null;
  let sessionId: string | undefined;

  try {
    const body = await req.json();
    rfpData = body.rfpData;
    sessionId = body.sessionId;

    if (!rfpData || !rfpData.overview) {
      return NextResponse.json({ error: 'RFP 데이터가 필요합니다.' }, { status: 400 });
    }

    let result: PRDResult;

    if (HAS_API_KEY) {
      try {
        result = await generateFullAIPRD(rfpData);
      } catch (aiError: any) {
        console.error('AI PRD generation failed, using fallback:', aiError?.message || aiError);
        result = generateMinimalFallback(rfpData);
      }
    } else {
      result = generateMinimalFallback(rfpData);
    }

    const rfpDocument = JSON.stringify(result);

    // Save to Supabase (fire-and-forget)
    if (sessionId) {
      supabase
        .from('rfp_sessions')
        .update({
          rfp_data: rfpData,
          rfp_document: rfpDocument.slice(0, 50000),
          completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .then(({ error }) => {
          if (error) console.error('Session save error:', error);
        });
    }

    return NextResponse.json({
      rfpDocument,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('RFP generation error:', error?.message || error);
    // rfpData가 이미 파싱됐으면 fallback 생성 가능
    if (rfpData) {
      return NextResponse.json({
        rfpDocument: JSON.stringify(generateMinimalFallback(rfpData)),
        generatedAt: new Date().toISOString(),
      });
    }
    return NextResponse.json({ error: 'RFP 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
