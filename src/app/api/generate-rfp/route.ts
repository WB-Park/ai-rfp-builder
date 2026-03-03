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
      estimatedManDays?: number;
      dependencies?: string[];
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
  // Deep Mode Premium Sections
  deepModeInsights?: {
    strategicNarrative: string;
    customerVoiceHighlights: { quote: string; insight: string; implication: string }[];
    decisionLog: { decision: string; rationale: string; alternatives: string }[];
    mvpRationale: string;
    implementationStrategy: string;
    successFramework: { category: string; baseline: string; target: string; stretch: string }[];
    problemSolutionFit: string;
    marketContext: string;
  };
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
// Deep Mode PRD — 심층 컨설팅 기반 프리미엄 PRD
// ═══════════════════════════════════════════

async function generateDeepModePRD(
  anthropic: any,
  rfpData: RFPData,
  features: FeatureItem[],
  featureList: string,
  conversationContext: string,
  now: string,
  startTime: number = Date.now()
): Promise<PRDResult> {
  // Vercel 60초 제한 대비: 남은 시간 계산하여 타임아웃 설정
  const elapsed = Date.now() - startTime;
  const remaining = Math.max(55000 - elapsed, 15000); // 최소 15초는 보장
  const callTimeout = Math.min(remaining - 2000, 48000); // 2초 여유, 최대 48초

  function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('API_TIMEOUT')), ms)),
    ]);
  }

  console.log(`[DEEP PRD] Timeout budget: elapsed=${elapsed}ms, callTimeout=${callTimeout}ms`);

  // Deep mode: 대화 컨텍스트 (5000자 — 속도 최적화)
  const fullConversation = conversationContext.slice(0, 5000);
  const projectInfo = `서비스: ${rfpData.overview || '(미입력)'}\n타겟: ${rfpData.targetUsers || '(미입력)'}\n기능:\n${featureList || '(미입력)'}`;

  console.log(`[DEEP PRD] Starting. Conversation: ${fullConversation.length} chars, Features: ${features.length}`);

  // ── 3개 병렬 호출 (각 max_tokens: 2500 → 20초 이내 완료) ──

  // Call 1a: 핵심 PRD 구조 (executiveSummary, goals, personas, timeline 등)
  const deepCall1a = anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2500,
    system: `위시켓 수석 IT 컨설턴트. 고객 인터뷰 기반 PRD 작성. 유효한 JSON만 출력. 마크다운 금지.`,
    messages: [{
      role: 'user',
      content: `[인터뷰]\n${fullConversation}\n\n[프로젝트]\n${projectInfo}\n\nJSON:\n{"projectName":"프로젝트명15자","executiveSummary":"200자.핵심+배경+차별점","problemSolutionFit":"100자.문제→해결","targetUsersAnalysis":"100자.사용자+PainPoint","expertInsight":"200자.위시켓PM의 성공요인3+실패패턴3+개발사팁3","projectGoals":[{"goal":"목표","metric":"지표"}],"userPersonas":[{"name":"이름","role":"역할","needs":"니즈","painPoints":"문제"}],"timeline":[{"phase":"단계","duration":"기간","deliverables":["산출물"]}],"risks":[{"risk":"위험","impact":"높음/중간","mitigation":"대응"}],"techStack":[{"category":"분류","tech":"기술","rationale":"근거"}],"assumptions":["전제"],"constraints":["제약"],"scopeExclusions":["제외"],"glossary":[{"term":"용어","definition":"설명"}]}\n\ngoals:3개,personas:2명,timeline:4단계,risks:3개,techStack:3개,glossary:5개.`
    }],
  });

  // Call 1b: Deep mode 프리미엄 인사이트
  const deepCall1b = anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3500,
    system: `위시켓 수석 컨설턴트. 전략적 인사이트 추출. 유효한 JSON만 출력.`,
    messages: [{
      role: 'user',
      content: `[인터뷰]\n${fullConversation}\n\n[프로젝트]: ${rfpData.overview || ''}\n\nJSON:\n{"strategicNarrative":"200자.본질적문제+비전+전략방향","customerVoiceHighlights":[{"quote":"발언","insight":"인사이트","implication":"시사점"}],"decisionLog":[{"decision":"결정","rationale":"근거","alternatives":"대안"}],"mvpRationale":"100자.MVP범위근거","implementationStrategy":"100자.구현전략","successFramework":[{"category":"카테고리","baseline":"현재","target":"6개월","stretch":"12개월"}],"problemSolutionFit_detail":"100자.적합성상세","marketContext":"시장정보 또는 '직접언급없음'"}\n\nvoices:3개,decisions:3개,framework:3개.`
    }],
  });

  // Call 2: 기능 상세 명세
  const deepCall2 = anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2500,
    system: `시니어 아키텍트. 기능 명세. 유효한 JSON만 출력.`,
    messages: [{
      role: 'user',
      content: `[인터뷰]\n${fullConversation.slice(0, 3000)}\n\n[프로젝트]: ${rfpData.overview || ''}\n${featureList ? `[기능]\n${featureList}` : '[지시] 인터뷰 대화에서 핵심 기능 6~10개를 직접 추출하여 상세 명세를 작성하세요. P1(핵심 3~5개), P2(중요 2~3개), P3(부가 1~2개)로 분류.'}\n\nJSON:\n{"featureSpecs":[{"name":"기능명","description":"설명1~2문장","priority":"P1","subFeatures":["서브3~4개"],"acceptanceCriteria":["기준2~3개"],"userFlow":"[시작]→[결과]","screenSpecs":[{"id":"SCR-001","name":"화면","purpose":"목적","elements":["요소3~4개"]}],"businessRules":["규칙2개"],"dataEntities":[{"name":"테이블","fields":"컬럼"}],"errorCases":["에러2개"],"estimatedManDays":0}]}`
    }],
  });

  // 3개 병렬 (각 2500 토큰 → 개별 15~20초, 병렬이므로 최대 20초)
  const [result1a, result1b, result2] = await Promise.allSettled([
    withTimeout(deepCall1a, callTimeout),
    withTimeout(deepCall1b, callTimeout),
    withTimeout(deepCall2, callTimeout),
  ]);

  function parseResult(result: PromiseSettledResult<any>): Record<string, any> {
    if (result.status !== 'fulfilled') {
      console.error(`[DEEP PRD] Call failed:`, result.status === 'rejected' ? result.reason?.message : 'unknown');
      return {};
    }
    const stopReason = result.value.stop_reason;
    const content = result.value.content[0];
    if (content.type !== 'text') return {};
    const text = content.text;
    console.log(`[DEEP PRD] Response: ${text.length} chars, stop_reason=${stopReason}`);

    // 1차: 완전한 JSON 추출 (가장 바깥쪽 {} 찾기)
    let depth = 0, start = -1;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') { if (start === -1) start = i; depth++; }
      else if (text[i] === '}') { depth--; if (depth === 0 && start !== -1) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch { /* continue scanning */ start = -1; }
      }}
    }

    // 2차: max_tokens로 잘린 경우 → 열린 중괄호 닫아서 복구 시도
    if (stopReason === 'max_tokens' && start !== -1 && depth > 0) {
      console.log(`[DEEP PRD] Truncated JSON detected (depth=${depth}). Attempting recovery...`);
      let truncated = text.slice(start);
      // 마지막 완전한 값 뒤에서 자르기 (불완전한 문자열/값 제거)
      const lastComplete = truncated.lastIndexOf('",');
      if (lastComplete > truncated.length * 0.5) {
        truncated = truncated.slice(0, lastComplete + 1);
      }
      // 열린 배열/객체 닫기
      for (let i = 0; i < depth; i++) truncated += '}';
      // 열린 배열 닫기
      const openBrackets = (truncated.match(/\[/g) || []).length;
      const closeBrackets = (truncated.match(/\]/g) || []).length;
      for (let i = 0; i < openBrackets - closeBrackets; i++) truncated += ']';
      try {
        const recovered = JSON.parse(truncated);
        console.log(`[DEEP PRD] ✅ Recovered truncated JSON (${Object.keys(recovered).length} keys)`);
        return recovered;
      } catch (e) { console.error(`[DEEP PRD] Recovery failed:`, (e as Error).message); }
    }

    // 3차: regex fallback
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) { console.error(`[DEEP PRD] No JSON found in response (${text.length} chars)`); return {}; }
    try { return JSON.parse(match[0]); } catch (e) { console.error(`[DEEP PRD] JSON parse failed:`, (e as Error).message); return {}; }
  }

  const data1a = parseResult(result1a);
  const data1b = parseResult(result1b);
  const data2 = parseResult(result2);

  // Call 1a + 1b 병합 (1a: 핵심 PRD 구조, 1b: 프리미엄 인사이트)
  const data1 = { ...data1a, ...data1b };
  // problemSolutionFit_detail → problemSolutionFit 매핑 (1b에서 충돌 방지용 필드명)
  if (data1.problemSolutionFit_detail && !data1a.problemSolutionFit) {
    data1.problemSolutionFit = data1.problemSolutionFit_detail;
  }

  const call1aKeys = Object.keys(data1a);
  const call1bKeys = Object.keys(data1b);
  const call2Specs = (data2.featureSpecs || []).length;
  console.log(`[DEEP PRD] Call1a keys(${call1aKeys.length}): ${call1aKeys.join(',')}, Call1b keys(${call1bKeys.length}): ${call1bKeys.join(',')}, Call2 featureSpecs: ${call2Specs}`);

  // ── 실패 감지: Call1a가 핵심 필드 전부 비어있으면 실패로 판정 ──
  const criticalFields = ['executiveSummary', 'projectGoals', 'expertInsight'];
  const hasCritical = criticalFields.filter(f => data1[f] && (typeof data1[f] === 'string' ? data1[f].length > 10 : Array.isArray(data1[f]) && data1[f].length > 0)).length;
  if (hasCritical === 0) {
    console.error(`[DEEP PRD] ⚠️ Call1a critically failed (0/${criticalFields.length} fields). Throwing error.`);
    throw new Error('DEEP_MODE_CALL1_FAILED');
  }
  if (hasCritical < 2) {
    console.warn(`[DEEP PRD] ⚠️ Call1a partially succeeded (${hasCritical}/${criticalFields.length} fields). Proceeding with available data.`);
  }

  // ── Feature Modules 조립 ──
  const projectName = data1.projectName || rfpData.overview?.slice(0, 15) || '프로젝트';
  const featureSpecs = data2.featureSpecs || [];
  const featureModules: PRDResult['featureModules'] = [];
  const p0Features = features.filter(f => f.priority === 'P1');
  const p1Features = features.filter(f => f.priority === 'P2');
  const p2Features = features.filter(f => f.priority === 'P3');

  function normalize(s: string): string {
    return (s || '').replace(/[\s\/\-·,.()\[\]]/g, '').toLowerCase();
  }
  function fuzzyMatch(a: string, b: string): boolean {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return false;
    if (na.includes(nb) || nb.includes(na)) return true;
    const keywords = a.split(/[\s\/\-·,.]+/).filter(k => k.length >= 2);
    for (const kw of keywords) { if (nb.includes(normalize(kw))) return true; }
    return false;
  }
  function findBestSpec(featureName: string): Record<string, any> {
    let spec = featureSpecs.find((s: any) => s.name === featureName);
    if (spec) return spec;
    spec = featureSpecs.find((s: any) => normalize(s.name) === normalize(featureName));
    if (spec) return spec;
    spec = featureSpecs.find((s: any) => fuzzyMatch(s.name, featureName));
    if (spec) return spec;
    return {};
  }

  if (featureSpecs.length > 0 && featureSpecs.length === features.length) {
    const matchedCount = features.filter(f => findBestSpec(f.name) && Object.keys(findBestSpec(f.name)).length > 0).length;
    if (matchedCount < features.length * 0.5) {
      features.forEach((f, i) => { if (featureSpecs[i]) featureSpecs[i]._mappedName = f.name; });
    }
  }

  function buildFeatureModule(id: number, name: string, priority: 'P0' | 'P1' | 'P2', label: string, feats: FeatureItem[]) {
    if (feats.length === 0) return;
    featureModules.push({
      id, name, priority, priorityLabel: label,
      features: feats.map((f, i) => {
        const spec = findBestSpec(f.name);
        return {
          id: `${priority}-${i + 1}`,
          name: f.name,
          description: spec.description || f.description || `${f.name} 기능 구현`,
          subFeatures: Array.isArray(spec.subFeatures) && spec.subFeatures.length > 0 ? spec.subFeatures : [`${f.name} 기본 기능`, '관련 UI/UX 설계', 'QA/테스트'],
          acceptanceCriteria: Array.isArray(spec.acceptanceCriteria) && spec.acceptanceCriteria.length > 0 ? spec.acceptanceCriteria : [`${f.name} 기능 정상 동작`],
          userFlow: spec.userFlow || '',
          screenSpecs: Array.isArray(spec.screenSpecs) ? spec.screenSpecs : [],
          businessRules: Array.isArray(spec.businessRules) ? spec.businessRules : [],
          dataEntities: Array.isArray(spec.dataEntities) ? spec.dataEntities : [],
          errorCases: Array.isArray(spec.errorCases) ? spec.errorCases : [],
          estimatedManDays: spec.estimatedManDays ? parseFloat(spec.estimatedManDays) || 0 : 0,
          dependencies: Array.isArray(spec.dependencies) ? spec.dependencies : [],
        };
      }),
    });
  }

  buildFeatureModule(1, 'MVP 필수 기능', 'P0', 'MVP 필수', p0Features);
  buildFeatureModule(2, '우선 기능', 'P1', '우선순위 1', p1Features);
  buildFeatureModule(3, '선택 기능', 'P2', '우선순위 2', p2Features);

  // ── 폴백: features가 비어서 featureModules가 빈 경우, featureSpecs에서 직접 빌드 ──
  if (featureModules.length === 0 && featureSpecs.length > 0) {
    console.log(`[DEEP PRD] ⚠️ featureModules empty but ${featureSpecs.length} featureSpecs available. Building from specs directly.`);
    const specP0: FeatureItem[] = [];
    const specP1: FeatureItem[] = [];
    const specP2: FeatureItem[] = [];
    featureSpecs.forEach((spec: any, idx: number) => {
      const item: FeatureItem = { name: spec.name || `기능 ${idx + 1}`, description: spec.description || '', priority: 'P1' };
      // featureSpecs에 priority가 있으면 활용, 없으면 순서 기반 배분
      const specPriority = spec.priority || '';
      if (specPriority === 'P1' || (!specPriority && idx < Math.ceil(featureSpecs.length * 0.5))) { item.priority = 'P1'; specP0.push(item); }
      else if (specPriority === 'P2' || (!specPriority && idx < Math.ceil(featureSpecs.length * 0.8))) { item.priority = 'P2'; specP1.push(item); }
      else { item.priority = 'P3'; specP2.push(item); }
    });
    // features도 재설정 (scopeInclusions, IA, API endpoints 등에 사용)
    features = [...specP0, ...specP1, ...specP2];
    buildFeatureModule(1, 'MVP 필수 기능', 'P0', 'MVP 필수', specP0);
    buildFeatureModule(2, '우선 기능', 'P1', '우선순위 1', specP1);
    buildFeatureModule(3, '선택 기능', 'P2', '우선순위 2', specP2);
  }

  // ── 폴백 2: featureSpecs도 비어있으면 대화에서 간단히 키워드 추출 ──
  if (featureModules.length === 0) {
    console.log(`[DEEP PRD] ⚠️ Both features and featureSpecs empty. Extracting from Call1a data.`);
    // Call1a의 projectGoals나 기타 데이터에서 최소한의 기능 추출 시도
    const goalFeatures: FeatureItem[] = (Array.isArray(data1.projectGoals) ? data1.projectGoals : [])
      .slice(0, 5)
      .map((g: any, i: number) => ({
        name: (g.goal || `핵심 기능 ${i + 1}`).slice(0, 30),
        description: g.metric || g.goal || '',
        priority: i < 2 ? 'P1' as const : 'P2' as const,
      }));
    if (goalFeatures.length > 0) {
      features = goalFeatures;
      const gP0 = goalFeatures.filter(f => f.priority === 'P1');
      const gP1 = goalFeatures.filter(f => f.priority === 'P2');
      if (gP0.length > 0) buildFeatureModule(1, 'MVP 필수 기능', 'P0', 'MVP 필수', gP0);
      if (gP1.length > 0) buildFeatureModule(2, '우선 기능', 'P1', '우선순위 1', gP1);
      console.log(`[DEEP PRD] ✅ Built ${featureModules.length} modules from projectGoals fallback`);
    }
  }

  const scopeInclusions = features.map(f => `${f.name}${f.description ? ` — ${f.description}` : ''}`);

  const nonFunctionalRequirements: PRDResult['nonFunctionalRequirements'] = [
    { category: '성능 (Performance)', items: ['API 응답: 평균 < 200ms, 99th < 1초', '페이지 로딩: FCP < 2초, LCP < 3초', '동시 접속: 최소 1,000명', '이미지: WebP + lazy loading'] },
    { category: '보안 (Security)', items: ['HTTPS/TLS 1.3 전 구간 암호화', '비밀번호: bcrypt, 8자+ 복잡도', 'JWT: Access 1시간, Refresh 14일', 'SQL Injection/XSS 방지', '개인정보보호법 준수'] },
    { category: '인프라/운영', items: ['가용성: 99.5% (월 다운타임 < 3.6시간)', '자동 백업: 일 1회, 30일 보관', 'CI/CD: GitHub Actions', '모니터링: Sentry + 메트릭'] },
  ];

  const defaultGlossary = [
    { term: 'MVP', definition: 'Minimum Viable Product — 핵심 기능만으로 시장 검증하는 첫 버전' },
    { term: 'PRD', definition: 'Product Requirements Document — 제품 요구사항 정의서' },
    { term: 'UAT', definition: 'User Acceptance Testing — 사용자 인수 테스트' },
    { term: 'SLA', definition: 'Service Level Agreement — 서비스 수준 약정' },
    { term: 'WBS', definition: 'Work Breakdown Structure — 업무 분류 체계' },
  ];
  const aiGlossary = Array.isArray(data1.glossary) && data1.glossary.length > 0 ? data1.glossary.filter((g: any) => g.term && g.definition) : [];
  const glossary = aiGlossary.length >= 5 ? aiGlossary : [...aiGlossary, ...defaultGlossary.filter(dg => !aiGlossary.some((ag: any) => ag.term === dg.term))];

  const informationArchitecture: PRDResult['informationArchitecture'] = {
    sitemap: [{
      id: 'root', label: projectName,
      children: [
        { id: 'main', label: '주요 섹션', children: [{ id: 'home', label: '홈' }, ...features.slice(0, 5).map((f, i) => ({ id: `feat-${i}`, label: f.name })), { id: 'mypage', label: '마이페이지' }] },
        { id: 'auth', label: '인증', children: [{ id: 'login', label: '로그인' }, { id: 'signup', label: '회원가입' }] },
      ],
    }],
  };

  const apiEndpoints: PRDResult['apiEndpoints'] = [];
  for (const f of features.slice(0, 6)) {
    const slug = f.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9가-힣-]/g, '');
    apiEndpoints.push(
      { method: 'GET', path: `/api/${slug}`, description: `${f.name} 목록 조회`, feature: f.name },
      { method: 'POST', path: `/api/${slug}`, description: `${f.name} 생성`, feature: f.name },
      { method: 'PUT', path: `/api/${slug}/:id`, description: `${f.name} 수정`, feature: f.name },
    );
  }

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

  // Deep Mode Insights 조립 — data1에서 모두 가져옴
  const deepModeInsights: PRDResult['deepModeInsights'] = {
    strategicNarrative: data1.strategicNarrative || '',
    customerVoiceHighlights: Array.isArray(data1.customerVoiceHighlights) ? data1.customerVoiceHighlights.filter((c: any) => c.quote && c.insight) : [],
    decisionLog: Array.isArray(data1.decisionLog) ? data1.decisionLog.filter((d: any) => d.decision) : [],
    mvpRationale: data1.mvpRationale || '',
    implementationStrategy: data1.implementationStrategy || '',
    successFramework: Array.isArray(data1.successFramework) ? data1.successFramework.filter((s: any) => s.category) : [],
    problemSolutionFit: data1.problemSolutionFit || '',
    marketContext: data1.marketContext || '',
  };

  console.log(`[DEEP PRD] ✅ Success. Insights: narrative=${!!deepModeInsights.strategicNarrative}, voices=${deepModeInsights.customerVoiceHighlights.length}, decisions=${deepModeInsights.decisionLog.length}`);

  return {
    projectName,
    documentMeta: { version: '2.0 Deep', createdAt: now, generatedBy: 'Wishket AI PRD Builder — Deep Analysis' },
    executiveSummary: data1.executiveSummary || `${rfpData.overview || '프로젝트'} — 심층 분석 기반 PRD`,
    projectOverview: '',
    problemStatement: data1.problemSolutionFit || '',
    projectGoals: (Array.isArray(data1.projectGoals) && data1.projectGoals.length > 0) ? data1.projectGoals : [{ goal: 'MVP 출시', metric: '핵심 기능 구현 완료' }],
    targetUsers: data1.targetUsersAnalysis || rfpData.targetUsers || '',
    userPersonas: Array.isArray(data1.userPersonas) ? data1.userPersonas : [],
    scopeInclusions,
    scopeExclusions: Array.isArray(data1.scopeExclusions) ? data1.scopeExclusions : [],
    techStack: (Array.isArray(data1.techStack) && data1.techStack.length > 0) ? data1.techStack : [
      { category: '프론트엔드', tech: 'Next.js', rationale: '빠른 개발과 SEO' },
      { category: '백엔드', tech: 'NestJS', rationale: '안정적 API' },
      { category: 'DB', tech: 'PostgreSQL', rationale: '데이터 무결성' },
    ],
    referenceServices: rfpData.referenceServices || '해당 없음',
    additionalRequirements: rfpData.additionalRequirements || '',
    featureModules,
    nonFunctionalRequirements,
    timeline: (Array.isArray(data1.timeline) && data1.timeline.length > 0) ? data1.timeline : [
      { phase: 'Phase 1 — 기획·설계', duration: '2~3주', deliverables: ['요구사항 확정', '와이어프레임'] },
      { phase: 'Phase 2 — UI 디자인', duration: '2주', deliverables: ['디자인 시안'] },
      { phase: 'Phase 3 — MVP 개발', duration: '4~6주', deliverables: ['핵심 기능 구현'] },
      { phase: 'Phase 4 — 추가 개발', duration: '2~4주', deliverables: ['추가 기능'] },
      { phase: 'Phase 5 — QA·출시', duration: '1~2주', deliverables: ['테스트', '배포'] },
    ],
    assumptions: Array.isArray(data1.assumptions) ? data1.assumptions : [],
    constraints: Array.isArray(data1.constraints) ? data1.constraints : [],
    risks: (Array.isArray(data1.risks) ? data1.risks : []).map((r: any) => ({
      ...r,
      probability: r.probability || (r.impact === '높음' ? '높음' : '중간'),
    })),
    glossary,
    expertInsight: data1.expertInsight || '',
    informationArchitecture,
    originalDescription: rfpData.overview || '',
    apiEndpoints,
    dataModel,
    competitorAnalysis: Array.isArray(data1.competitorAnalysis) ? data1.competitorAnalysis : [],
    approvalProcess: data1.approvalProcess || [],
    qaStrategy: data1.qaStrategy || [],
    deepModeInsights,
  };
}

// ═══════════════════════════════════════════
// Full AI PRD Generation — Single comprehensive prompt
// ═══════════════════════════════════════════

async function generateFullAIPRD(rfpData: RFPData, chatMessages?: { role: string; content: string }[], chatMode?: string): Promise<PRDResult> {
  const isDeepMode = chatMode === 'deep';
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const globalStartTime = Date.now();

  let features = sanitizeFeatures(rfpData.coreFeatures || []);

  // ★ 대화 히스토리 전체를 PRD에 반영 (최대 40턴, 내용 잘리지 않도록)
  const conversationContext = (chatMessages && chatMessages.length > 0)
    ? chatMessages
        .slice(-40)
        .map(m => `${m.role === 'user' ? '고객' : 'AI PM'}: ${m.content}`)
        .join('\n')
    : '';
  const hasConversation = conversationContext.length > 50;
  console.log(`[generate-rfp] Conversation context: ${hasConversation ? `${chatMessages?.length || 0} messages, ${conversationContext.length} chars` : 'none'}, Features: ${features.length}`);

  // ★ 핵심: coreFeatures가 비어있으면 대화 컨텍스트에서 AI로 기능 추출
  // 타임아웃: 10초 (Vercel 60초 중 최대 10초만 기능추출에 사용)
  if (features.length === 0 && (hasConversation || (rfpData.overview && rfpData.overview.length >= 5))) {
    console.log('[generate-rfp] coreFeatures empty — auto-extracting from conversation');
    try {
      const featureExtractionPromise = anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `${hasConversation ? `다음은 고객과 AI PM이 나눈 대화입니다. 이 대화 전체를 분석하여 이 프로젝트에 필요한 핵심 기능을 추출하세요.

[대화 내용]
${conversationContext}

[프로젝트 정보 요약]` : '다음 프로젝트 정보에서 핵심 기능을 추출하세요.\n\n[프로젝트 정보]'}
- 서비스: ${rfpData.overview || '(미입력)'}
- 타겟: ${rfpData.targetUsers || '(미입력)'}
- 기술: ${rfpData.techRequirements || '(미입력)'}
- 추가 요구: ${rfpData.additionalRequirements || '(미입력)'}

규칙:
1. 대화에서 논의된 모든 기능을 빠짐없이 추출 (6~12개)
2. 대화에서 고객이 중요하다고 언급한 기능은 반드시 P1
3. P1: 서비스 핵심 기능 (3~5개), P2: 중요 기능 (2~4개), P3: 부가 기능 (1~3개)
4. 기능명은 한국어, 간결하게 (15자 이내)
5. 설명은 대화 맥락을 반영한 구체적 한 문장

JSON 배열만 출력:
[{"name": "기능명", "description": "대화에서 논의된 맥락 반영한 설명", "priority": "P1"}]`
        }],
      });
      const featureGenResponse = await Promise.race([
        featureExtractionPromise,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('FEATURE_EXTRACTION_TIMEOUT')), 20000)),
      ]);
      const featureText = featureGenResponse.content[0].type === 'text' ? featureGenResponse.content[0].text : '';
      const featureMatch = featureText.match(/\[[\s\S]*\]/);
      if (featureMatch) {
        const parsed = JSON.parse(featureMatch[0]);
        if (Array.isArray(parsed) && parsed.length >= 3) {
          features = parsed.map((f: { name: string; description?: string; priority?: string }) => ({
            name: (f.name || '').slice(0, 30),
            description: f.description || f.name,
            priority: f.priority === 'P1' ? 'P1' : f.priority === 'P2' ? 'P2' : 'P3',
          }));
          console.log(`[generate-rfp] Auto-extracted ${features.length} features from ${hasConversation ? 'conversation' : 'overview'}`);
        }
      }
    } catch (featureError) {
      console.error('[generate-rfp] Feature auto-extraction failed:', featureError);
    }
  }

  const featureList = features.map((f, i) => `${i + 1}. ${f.name} (${f.priority}) — ${f.description || '설명 없음'}`).join('\n');
  const now = new Date().toISOString().split('T')[0];

  // ★ Deep mode는 완전히 다른 프롬프트 체계로 PRD 생성
  if (isDeepMode && hasConversation) {
    try {
      return await generateDeepModePRD(anthropic, rfpData, features, featureList, conversationContext, now, globalStartTime);
    } catch (deepError: any) {
      console.error(`[generate-rfp] ⚠️ Deep mode failed (${deepError?.message}) after ${Date.now() - globalStartTime}ms. Falling back to Quick mode.`);
      // Deep mode 실패 시 Quick mode로 폴백하여 사용자에게 결과를 반환
      // (500 에러보다 Quick mode 결과라도 주는 것이 UX에 유리)
    }
  }

  // ★ 대화 컨텍스트 삽입 문자열 — 전체 대화를 최대한 반영
  const conversationBlock = hasConversation
    ? `\n\n[고객과의 전체 대화 내용 — ★ 대화에서 나온 모든 정보를 빠짐없이 PRD에 반영하세요 ★]\n${conversationContext.slice(0, 8000)}\n`
    : '';

  // 개별 API 호출에 타임아웃 적용 (남은 시간 기반 동적 설정)
  const quickElapsed = Date.now() - globalStartTime;
  const quickRemaining = Math.max(55000 - quickElapsed, 15000);
  const quickCallTimeout = Math.min(quickRemaining - 2000, 45000);
  console.log(`[generate-rfp] Quick mode timeout: elapsed=${quickElapsed}ms, callTimeout=${quickCallTimeout}ms`);

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
${conversationBlock}
JSON 형식으로 응답하세요:
{
  "projectName": "서비스 성격이 드러나는 프로젝트명 15자 이내 (예: '펫케어 매칭 플랫폼')",
  "projectScope": "프로젝트 정의 요약문 (200~300자). 아래 구조를 자연스러운 문장형으로 작성:\n\n1문단: 이 프로젝트가 무엇인지 한 문장으로 정의. (예: '소상공인을 위한 재고 관리 SaaS 웹 애플리케이션입니다.')\n2문단: 대상 사용자와 핵심 기능 범위를 명시. (예: '주요 사용자는 OO이며, 핵심 기능 N개(A, B, C 등)를 포함합니다.')\n3문단: 기술 방향 또는 플랫폼. (예: 'React 기반 웹앱으로, PostgreSQL + REST API 구조를 채택합니다.')\n\n⚠️ 규칙: 시장 규모, 경쟁 우위, 비전, 기대효과 등 추상적 비즈니스 분석 절대 금지. 사용자가 입력한 정보를 명확하게 정리하는 것이 목적. 마크다운 불릿 금지, 순수 문장형으로만 작성.",
  "targetUsersAnalysis": "400자 이상. (1) Primary 사용자: 인구통계 + 핵심 Pain Point 3개 (2) Secondary 사용자 1그룹 (3) 사용자 여정 핵심 5단계별 이탈 방지 포인트",
  "expertInsight": "800자 이상. ★PRD에서 가장 가치있는 섹션★ (1) 💡 이 유형 프로젝트 성공 요인 TOP 3 — 위시켓 실제 데이터 기반 수치 포함 (2) ⚠️ 실패 원인 TOP 3 — 사례+금액 영향 (3) 📋 개발사 선정 체크리스트 5개 (4) 💰 이 프로젝트의 예산 최적화 전략 3개 — 각 절감비율 (5) 📝 계약 시 필수 조항 3개"
}

${hasConversation ? `⚠️ 중요: 위 대화는 고객과 시니어 PM이 나눈 컨설팅 인터뷰입니다.
대화에서 고객이 언급한 모든 내용을 PRD에 반영하세요:
- 서비스를 만들게 된 동기/배경
- 현재 문제 상황과 기존 해결 방법
- 타겟 사용자의 구체적 상황과 Pain Point
- 경쟁 서비스 경험과 아쉬운 점
- 핵심 가치와 차별점
- 우려 사항과 성공 기준
- 개발 파트너에게 전달할 메시지
이 정보들이 projectScope, targetUsersAnalysis, expertInsight에 녹아들어야 합니다.` : ''}`
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
${conversationBlock}
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
    {"risk": "★이 프로젝트 도메인/기술에 특화된 구체적 위험. 예: '실시간 채팅 동시접속 1000명 이상 시 서버 과부하', '결제 PG사 장애 시 주문 유실 가능성' 등. 추상적 표현 금지(예: '일정 지연 위험' X)★", "impact": "높음/중간/낮음", "mitigation": "★실행 가능한 구체적 대응책. 예: 'WebSocket 연결풀 200개 + Redis pub/sub 분산처리', 'PG사 이중화(토스+NHN) + 결제 실패 시 임시저장 후 재시도' 등★", "probability": "높음/중간/낮음"}
  ],
  "assumptions": ["${isDeepMode
    ? '★대화에서 고객이 직접 언급하거나 암시한 전제만 작성★ 대화에 근거가 없는 내용은 절대 포함하지 마세요. 대화에서 전제를 파악할 수 없으면 빈 배열 [] 반환. 예: 고객이 "모바일 앱"이라고 했으면 → "사용자가 스마트폰 사용 가능"'
    : '이 프로젝트가 성립하기 위한 전제 5개. 대화에서 고객이 언급한 상황/환경을 근거로 작성'}"],
  "constraints": ["${isDeepMode
    ? '★대화에서 고객이 직접 언급한 제약만 작성★ 고객이 예산/기간/기술/인력 제약을 언급하지 않았으면 빈 배열 [] 반환. 추측 금지. 대화에 없는 내용 생성 금지.'
    : '대화에서 파악된 이 프로젝트 고유의 제약사항 5개. 고객이 언급한 예산/기간/기술/인력/법규 등의 실제 제약을 반영'}"],
  "techStack": [
    {"category": "프론트엔드/백엔드/DB/인프라", "tech": "기술명", "rationale": "이 프로젝트에서 이 기술을 선택한 이유"}
  ],
  "competitorAnalysis": [
    {"name": "실제 경쟁 서비스명", "strengths": "강점", "weaknesses": "약점", "differentiation": "우리 서비스의 차별점"}
  ],
  "scopeExclusions": ["★ 대화에서 사용자가 명시적으로 '이건 빼주세요', '이건 필요없어요'라고 언급한 항목만. 사용자가 제외를 언급하지 않았으면 빈 배열 [] 반환. 절대 임의로 생성하지 마세요."],
  "approvalProcess": [
    {"stage": "단계명 (예: 기획 승인, 디자인 리뷰, QA 통과)", "approver": "담당자/역할", "criteria": "승인 기준 구체적으로"}
  ],
  "qaStrategy": [
    {"type": "테스트 유형 (단위/통합/E2E/성능/보안)", "scope": "테스트 대상 범위", "tools": "도구명", "criteria": "통과 기준"}
  ],
  "glossary": [
    {"term": "이 프로젝트에서 사용되는 전문 용어/약어", "definition": "비개발자도 이해할 수 있는 명확한 설명"}
  ]
}

projectGoals: 정확히 4개. SMART 원칙 적용.
userPersonas: 정확히 3명. 최소 1명은 서비스 운영자/관리자.
timeline: 정확히 5단계 (기획설계/UI디자인/MVP개발/추가기능/QA출시).
risks: 정확히 5개. 기술/비즈니스/운영 골고루. ★추상적 리스크 금지. 이 프로젝트의 도메인·기술·비즈니스 모델에 특화된 위험만. mitigation은 반드시 실행 가능한 구체적 대응책(도구명, 수치, 방법론 포함)★
${isDeepMode
  ? `assumptions: 대화에서 파악된 것만 0~5개. 대화에 근거가 없으면 빈 배열 []. ★절대 추측하지 마세요★
constraints: 대화에서 고객이 직접 언급한 것만 0~5개. 언급 없으면 빈 배열 []. ★일반론/추측 금지★`
  : `assumptions: 정확히 5개. 대화에서 파악된 고객 상황을 근거로 작성.
constraints: 정확히 5개. 대화에서 고객이 언급하거나 암시한 실제 제약만 작성. 일반론 금지.`}
techStack: 4~6개. 프론트엔드, 백엔드, DB, 인프라 필수.
competitorAnalysis: 3개. 실제 한국 서비스명 사용.
approvalProcess: 정확히 4단계. 기획승인/디자인리뷰/개발완료/출시승인 단계 필수.
qaStrategy: 정확히 5개. 단위테스트, 통합테스트, E2E, 성능, 보안 반드시 포함.
glossary: 8~12개. PRD/MVP/SLA 같은 공통 용어 + 이 프로젝트 도메인 특화 용어 포함. 비개발자 독자 대상.

${hasConversation ? `⚠️ 중요: 대화 내용을 철저히 분석하여 반영하세요:
- 고객이 언급한 사업 배경/동기 → projectGoals에 반영
- 고객이 설명한 타겟 사용자의 상황 → userPersonas에 구체적으로
- 고객이 언급한 경쟁/참고 서비스 경험 → competitorAnalysis에 반영
- 고객이 표현한 우려/걱정 → risks에 구체적으로 반영 (추상적 리스크 금지)
- 고객이 말한 성공 기준 → projectGoals의 metric에 반영
- 고객이 언급한 제약 조건 (예산, 기간, 기존 시스템) → constraints에 반영
- constraints와 risks는 대화에서 파악된 프로젝트 맥락에 특화. 어떤 프로젝트에나 해당하는 일반적 내용 금지.
대화에서 나온 정보와 일치하지 않는 내용을 임의로 생성하지 마세요.
${isDeepMode ? `\n★★★ DEEP MODE 특별 규칙 ★★★
이 PRD는 고객과 시니어 PM이 깊이 있는 1:1 컨설팅 대화를 나눈 결과물입니다.
- assumptions: 대화에서 고객이 언급한 내용에 근거가 있는 것만 포함. 근거 없으면 빈 배열 [].
- constraints: 고객이 직접 언급한 제약만 포함. "예산 X원 이내", "기간 Y개월" 등 대화에서 나온 것만. 없으면 빈 배열 [].
- risks: 대화에서 고객이 우려한 내용 위주. 일반론(보안 위험, 성능 이슈 등) 금지.
- ⚠️ 대화에 없는 내용을 추측하여 생성하는 것은 이 PRD의 신뢰도를 떨어뜨립니다.` : ''}` : ''}`
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
${conversationBlock}
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
      "errorCases": ["에러 케이스 3~5개. 각각 사용자에게 보여줄 메시지 포함"],
      "estimatedManDays": "숫자. 이 기능 구현에 필요한 예상 공수 (Man-Day). 시니어 개발자 기준 1MD=8시간. 프론트+백엔드+테스트 포함. 소수점 가능 (예: 3.5)",
      "dependencies": ["이 기능이 의존하는 다른 기능명 (위 목록에서). 없으면 빈 배열"]
    }
  ]
}

중요: 각 기능이 이 프로젝트("${rfpData.overview}")에서 어떻게 동작하는지 맥락에 맞춰 작성하세요.
예를 들어 "검색" 기능이라면, 단순히 일반적인 검색이 아니라 이 서비스에서 무엇을 검색하는지 구체적으로.

${hasConversation ? `⚠️ 중요: 대화에서 고객이 언급한 내용을 기능별 명세에 반영하세요:
- 고객이 "이 기능에서 가장 중요한 것"이라고 언급한 내용 → subFeatures 최상단
- 고객이 설명한 사용 시나리오 → userFlow에 구체적으로
- 고객이 언급한 기존 서비스의 아쉬운 점 → 해당 기능의 개선점으로
- 고객이 말한 타겟 사용자의 행동 패턴 → screenSpecs의 시나리오에
대화에서 나온 맥락 없이 일반론만 쓰지 마세요. 이 프로젝트만의 특수성을 반영하세요.` : ''}`
    }],
  });

  // 3개 호출 병렬 실행 (동적 타임아웃)
  const [resultA, resultB, resultC] = await Promise.allSettled([
    withTimeout(callA, quickCallTimeout),
    withTimeout(callB, quickCallTimeout),
    withTimeout(callC, quickCallTimeout),
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
          estimatedManDays: spec.estimatedManDays ? parseFloat(spec.estimatedManDays) || 0 : 0,
          dependencies: Array.isArray(spec.dependencies) ? spec.dependencies : [],
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

  // #10: Glossary — AI 생성 우선, 폴백으로 기본 용어
  const defaultGlossary: PRDResult['glossary'] = [
    { term: 'MVP', definition: 'Minimum Viable Product — 핵심 기능만으로 시장 검증하는 첫 번째 버전' },
    { term: 'P0/P1/P2', definition: '우선순위 등급. P0=필수(MVP), P1=우선(2차), P2=선택(향후)' },
    { term: 'PRD', definition: 'Product Requirements Document — 제품 요구사항 정의서' },
    { term: 'UAT', definition: 'User Acceptance Testing — 사용자 인수 테스트' },
    { term: 'SLA', definition: 'Service Level Agreement — 가용성/응답시간 등 서비스 수준 약정' },
    { term: 'QA', definition: 'Quality Assurance — 품질 보증 및 테스트' },
    { term: 'WBS', definition: 'Work Breakdown Structure — 업무 분류 체계 (일정/공수 산정 기초)' },
    { term: 'API', definition: 'Application Programming Interface — 소프트웨어 간 통신 규약' },
  ];
  const aiGlossary = Array.isArray(dataB.glossary) && dataB.glossary.length > 0
    ? dataB.glossary.filter((g: any) => g.term && g.definition)
    : [];
  const glossary: PRDResult['glossary'] = aiGlossary.length >= 5 ? aiGlossary : [...aiGlossary, ...defaultGlossary.filter(dg => !aiGlossary.some((ag: any) => ag.term === dg.term))];

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
    scopeExclusions: dataB.scopeExclusions || [],
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
    scopeExclusions: [],
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
    const chatMessages: { role: string; content: string }[] = body.chatMessages || [];
    const chatMode: string = body.chatMode || 'quick';

    if (!rfpData || !rfpData.overview) {
      return NextResponse.json({ error: 'RFP 데이터가 필요합니다.' }, { status: 400 });
    }

    console.log(`[generate-rfp POST] chatMode: ${chatMode}, chatMessages: ${chatMessages.length}, features: ${rfpData.coreFeatures?.length || 0}`);

    let result: PRDResult;

    if (HAS_API_KEY) {
      try {
        result = await generateFullAIPRD(rfpData, chatMessages, chatMode);
      } catch (aiError: any) {
        console.error('AI PRD generation failed:', aiError?.message || aiError);
        // Deep/Quick 모두 실패 시 minimal fallback으로 결과 반환
        console.warn(`[generate-rfp] AI failed (${chatMode}): ${aiError?.message}. Using minimal fallback.`);
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
          rfp_document: rfpDocument.slice(0, 100000),
          completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .then(({ error }) => {
          if (error) console.error('Session save error:', error);
        });
    }

    // ── 슬랙 #알림_prd 알림: 공유 링크 자동 생성 + 푸시 (fire-and-forget) ──
    notifySlackPRD(result, rfpData, rfpDocument, chatMode).catch((e) =>
      console.error('[Slack PRD notify] error:', e)
    );

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

// ═══════════════════════════════════════════
// Slack #알림_prd 자동 알림
// ═══════════════════════════════════════════

async function notifySlackPRD(
  result: PRDResult,
  rfpData: RFPData,
  rfpDocument: string,
  chatMode: string
) {
  const webhookUrl = process.env.SLACK_PRD_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('[Slack PRD notify] No webhook URL configured, skipping');
    return;
  }

  try {
    // 1) 공유 링크 자동 생성
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let shareId = '';
    for (let i = 0; i < 8; i++) shareId += chars[Math.floor(Math.random() * chars.length)];

    const { error: shareError } = await supabase.from('shared_prds').insert({
      share_id: shareId,
      project_name: result.projectName || 'PRD 기획서',
      rfp_document: rfpDocument.slice(0, 100000),
      rfp_data: rfpData || null,
    });

    if (shareError) {
      console.error('[Slack PRD notify] share insert error:', shareError);
    }

    // 2) 기능 수 / 요약 추출
    const featureCount = result.featureModules?.reduce(
      (sum, m) => sum + (m.features?.length || 0),
      0
    ) || 0;
    const summary = (result.executiveSummary || '').slice(0, 200);
    const modeLabel = chatMode === 'deep' ? '🔬 Deep Mode' : '⚡ Quick Mode';
    const shareUrl = `https://wishket-prd.com/share/${shareId}`;
    const adminUrl = 'https://wishket-prd.com/admin';
    const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    // 3) 슬랙 메시지 구성
    const message = [
      `📋 *새 PRD가 생성되었습니다* ${modeLabel}`,
      '',
      `> *프로젝트:* ${result.projectName || '(이름 없음)'}`,
      `> *기능:* ${featureCount}개`,
      summary ? `> *요약:* ${summary}${summary.length >= 200 ? '...' : ''}` : '',
      '',
      `🔗 *공유 URL:* <${shareUrl}|PRD 보기>`,
      `🛠️ *어드민:* <${adminUrl}|어드민 대시보드>`,
      '',
      `🕐 ${now}`,
      '_AIDP(AI Development Planner) 자동 알림_',
    ]
      .filter(Boolean)
      .join('\n');

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });

    if (!resp.ok) {
      console.error('[Slack PRD notify] webhook failed:', resp.status);
    } else {
      console.log(`[Slack PRD notify] ✅ Sent for "${result.projectName}" → ${shareUrl}`);
    }
  } catch (e) {
    console.error('[Slack PRD notify] unexpected error:', e);
  }
}
