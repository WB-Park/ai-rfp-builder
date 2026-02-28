// AI RFP Builder — RFP Document Generation v4 (시장 최고 수준)
// 결과물 = 외주 컨설팅펌 시니어 PM이 작성한 수준
// Fallback도 WOW 수준이어야 함

import { NextRequest, NextResponse } from 'next/server';
import { RFP_GENERATION_PROMPT } from '@/lib/prompts';
import { RFPData, FeatureItem } from '@/types/rfp';
import { supabase } from '@/lib/supabase';

const HAS_API_KEY =
  !!process.env.ANTHROPIC_API_KEY &&
  process.env.ANTHROPIC_API_KEY !== 'placeholder';

// ═══════════════════════════════════════════
// 프로젝트 유형 + 시장 인텔리전스
// ═══════════════════════════════════════════

interface ProjectTypeInfo {
  type: string;
  avgBudget: string;
  avgDuration: string;
  successRate: string;
  commonStack: string;
  keyRisks: string[];
  mustHaveFeatures: string[];
  marketInsight: string;
}

const PROJECT_TYPES: Record<string, ProjectTypeInfo> = {
  '모바일 앱': {
    type: '모바일 앱',
    avgBudget: '2,000~5,000만원 (MVP 기준)',
    avgDuration: '8~14주',
    successRate: '위시켓 기준 1차 출시 성공률 78%',
    commonStack: 'Flutter/React Native(크로스플랫폼) 또는 Swift(iOS)+Kotlin(Android)',
    keyRisks: ['앱스토어 심사 리젝(평균 1~3회)', '크로스플랫폼 네이티브 기능 호환성', '푸시알림 설정 복잡도'],
    mustHaveFeatures: ['사용자 인증(소셜 로그인)', '푸시 알림', '앱 업데이트 관리'],
    marketInsight: '2025년 국내 모바일 앱 시장에서 크로스플랫폼(Flutter) 채택률이 60% 이상으로, 네이티브 대비 30~40% 비용 절감이 가능합니다.',
  },
  '웹 서비스': {
    type: '웹 서비스',
    avgBudget: '1,500~4,000만원 (MVP 기준)',
    avgDuration: '6~10주',
    successRate: '위시켓 기준 1차 출시 성공률 85%',
    commonStack: 'Next.js(프론트) + Node.js/NestJS(백엔드) + PostgreSQL',
    keyRisks: ['브라우저 호환성(IE 지원 범위 확인)', '모바일 반응형 미흡', 'SEO 최적화 누락'],
    mustHaveFeatures: ['반응형 웹 디자인', 'SEO 기본 설정', 'SSL 인증서'],
    marketInsight: 'Next.js가 웹 서비스 프레임워크 시장 점유율 1위(2025)로, SSR/SSG를 통한 SEO 최적화와 빠른 로딩 속도가 강점입니다.',
  },
  '이커머스 플랫폼': {
    type: '이커머스 플랫폼',
    avgBudget: '3,000~8,000만원',
    avgDuration: '12~20주',
    successRate: '위시켓 기준 1차 출시 성공률 72%',
    commonStack: 'Next.js + NestJS + PostgreSQL + Redis + 토스페이먼츠/이니시스',
    keyRisks: ['PG 연동 인증(2~3주 별도 소요)', '재고 관리 시스템 복잡도', '개인정보보호법/전자상거래법 준수'],
    mustHaveFeatures: ['PG 결제(카드/계좌이체/간편결제)', '주문/배송 관리', '상품 관리(카테고리/검색/필터)', '회원 등급/포인트'],
    marketInsight: '국내 이커머스는 간편결제(카카오페이, 네이버페이) 미지원 시 결제 전환율이 40% 이상 하락합니다. 반드시 포함하세요.',
  },
  '플랫폼': {
    type: '플랫폼 서비스',
    avgBudget: '5,000만~1.5억원',
    avgDuration: '14~24주',
    successRate: '위시켓 기준 1차 출시 성공률 68%',
    commonStack: 'Next.js + NestJS + PostgreSQL + Redis + ElasticSearch + AWS',
    keyRisks: ['양면 시장(공급-수요) 콜드스타트', '검색/매칭 알고리즘 정확도', '수수료 모델 설계'],
    mustHaveFeatures: ['공급자/수요자 이중 회원 체계', '검색/필터/매칭', '리뷰/평점 시스템', '대시보드(양측)'],
    marketInsight: '플랫폼은 "닭과 달걀" 문제가 가장 큰 리스크입니다. MVP에서는 공급자 측을 먼저 확보하고, 수동 매칭으로 시작하는 전략이 유효합니다.',
  },
  'SaaS': {
    type: 'SaaS 서비스',
    avgBudget: '3,000~8,000만원',
    avgDuration: '10~16주',
    successRate: '위시켓 기준 1차 출시 성공률 75%',
    commonStack: 'React/Next.js + Python(Django/FastAPI) + PostgreSQL + Stripe/토스',
    keyRisks: ['구독 결제 시스템 복잡도', '멀티테넌시 아키텍처', 'API 설계/문서화'],
    mustHaveFeatures: ['구독 관리(플랜/과금/해지)', '대시보드/리포트', '팀 관리(권한)', 'API 연동'],
    marketInsight: 'SaaS는 무료 체험 → 유료 전환이 핵심입니다. 온보딩 UX에 전체 예산의 15%를 투자하는 것이 LTV 극대화에 효과적입니다.',
  },
  '매칭 플랫폼': {
    type: '매칭 플랫폼',
    avgBudget: '4,000~1억원',
    avgDuration: '12~20주',
    successRate: '위시켓 기준 1차 출시 성공률 65%',
    commonStack: 'Next.js + NestJS + PostgreSQL + Redis + ElasticSearch',
    keyRisks: ['매칭 알고리즘 정확도', '양면 시장 부트스트래핑', '분쟁 해결 프로세스'],
    mustHaveFeatures: ['프로필/포트폴리오', '검색/필터/매칭', '실시간 채팅', '리뷰/평점', '결제/정산'],
    marketInsight: '매칭 플랫폼 MVP는 "수동 매칭 + 자동화 UI"로 시작하세요. 알고리즘은 데이터 축적 후 고도화하는 것이 효율적입니다.',
  },
};

function getProjectTypeInfo(overview: string): ProjectTypeInfo {
  const t = (overview || '').toLowerCase();
  const mapping: [string, string][] = [
    ['앱', '모바일 앱'], ['어플', '모바일 앱'], ['모바일', '모바일 앱'],
    ['쇼핑몰', '이커머스 플랫폼'], ['커머스', '이커머스 플랫폼'], ['쇼핑', '이커머스 플랫폼'],
    ['플랫폼', '플랫폼'], ['마켓', '플랫폼'], ['중개', '매칭 플랫폼'],
    ['매칭', '매칭 플랫폼'], ['연결', '매칭 플랫폼'],
    ['saas', 'SaaS'], ['구독', 'SaaS'], ['b2b', 'SaaS'],
    ['웹', '웹 서비스'], ['사이트', '웹 서비스'], ['홈페이지', '웹 서비스'],
  ];
  for (const [k, v] of mapping) {
    if (t.includes(k) && PROJECT_TYPES[v]) return PROJECT_TYPES[v];
  }
  return PROJECT_TYPES['웹 서비스'];
}

// ═══════════════════════════════════════════
// 기능별 상세 분석 엔진
// ═══════════════════════════════════════════

interface FeatureAnalysis {
  name: string;
  description: string;
  priority: string;
  complexity: number; // 1-5
  estimatedWeeks: string;
  subFeatures: string[];
  considerations: string[];
  acceptanceCriteria: string[];
}

const FEATURE_DB: Record<string, Partial<FeatureAnalysis>> = {
  '로그인': {
    complexity: 2, estimatedWeeks: '1~2주',
    subFeatures: ['이메일/비밀번호 인증', '소셜 로그인(카카오/구글/애플)', '자동 로그인(토큰 관리)', '비밀번호 찾기/재설정'],
    considerations: ['소셜 로그인 API 키 발급(각 플랫폼별 3~5일)', 'JWT vs Session 기반 인증 결정', '개인정보 수집 동의 UI 필수'],
    acceptanceCriteria: ['3가지 이상 소셜 로그인 동작', '토큰 만료 시 자동 갱신', '비밀번호 재설정 이메일 발송 확인'],
  },
  '회원': {
    complexity: 2, estimatedWeeks: '1~2주',
    subFeatures: ['회원가입/탈퇴', '프로필 관리(사진/정보 수정)', '회원 등급/포인트', '이용약관/개인정보처리방침'],
    considerations: ['회원 유형이 2개 이상이면 복잡도 2배', '개인정보보호법 준수 필수', '탈퇴 시 데이터 처리 정책'],
    acceptanceCriteria: ['회원가입 → 인증 → 프로필 완성 플로우', '탈퇴 시 개인정보 즉시 삭제'],
  },
  '결제': {
    complexity: 4, estimatedWeeks: '2~4주',
    subFeatures: ['PG 연동(토스페이먼츠/이니시스)', '카드/계좌이체/간편결제', '결제 취소/환불 처리', '에스크로(필요 시)', '정산 시스템(플랫폼인 경우)'],
    considerations: ['PG사 인증에 2~3주 별도 소요 (사업자등록증 필수)', '간편결제(카카오페이/네이버페이) 미지원 시 전환율 40% 하락', '정기결제(구독)는 별도 모듈 필요'],
    acceptanceCriteria: ['카드 결제 → 승인 → 확인 알림', '결제 취소/환불 정상 동작', 'PG 대시보드와 금액 일치'],
  },
  '채팅': {
    complexity: 4, estimatedWeeks: '2~3주',
    subFeatures: ['1:1 실시간 채팅', '그룹 채팅(필요 시)', '파일/이미지 전송', '읽음 확인', '채팅 알림(푸시)'],
    considerations: ['WebSocket 서버 인프라 비용 별도', 'SendBird/Firebase Chat SDK 사용 시 개발 50% 단축 (월 비용 발생)', '동시 접속자 수에 따른 서버 스케일링'],
    acceptanceCriteria: ['메시지 전송 지연 < 500ms', '오프라인 → 온라인 시 미수신 메시지 동기화', '파일 전송(10MB 이하) 정상 동작'],
  },
  '관리자': {
    complexity: 3, estimatedWeeks: '2~3주',
    subFeatures: ['대시보드(핵심 지표)', '회원 관리(목록/검색/상태 변경)', '콘텐츠 관리(등록/수정/삭제)', '주문/결제 관리', '통계/리포트'],
    considerations: ['관리자 화면은 디자인 간소화로 비용 절감 가능', '권한 관리(슈퍼관리자/일반관리자) 필요 여부 확인', '대시보드 데이터 실시간 vs 배치 결정'],
    acceptanceCriteria: ['핵심 KPI 대시보드 로딩 < 3초', '회원 목록 검색/필터 동작', '데이터 export(CSV/Excel)'],
  },
  '알림': {
    complexity: 2, estimatedWeeks: '1~2주',
    subFeatures: ['앱 푸시 알림(FCM/APNs)', '이메일 알림', 'SMS 알림(선택)', '인앱 알림(알림 센터)'],
    considerations: ['푸시 알림 허용률이 50% 미만이므로 인앱 알림 병행 필수', 'SMS는 건당 비용(15~20원) 발생', '알림 빈도가 너무 높으면 앱 삭제율 증가'],
    acceptanceCriteria: ['알림 전송 후 30초 이내 수신', '알림 종류별 on/off 설정', '알림 히스토리 조회'],
  },
  '검색': {
    complexity: 3, estimatedWeeks: '1~2주',
    subFeatures: ['키워드 검색', '필터(카테고리/가격/날짜 등)', '정렬(최신/인기/가격순)', '자동완성', '검색 결과 하이라이팅'],
    considerations: ['데이터 1만건 이상이면 ElasticSearch 도입 권장', '한국어 형태소 분석기(Nori) 필수', '검색 속도 < 200ms 목표'],
    acceptanceCriteria: ['검색 결과 200ms 이내 반환', '필터 조합 정상 동작', '검색어 하이라이팅'],
  },
  '지도': {
    complexity: 3, estimatedWeeks: '1~2주',
    subFeatures: ['지도 표시(카카오맵/네이버맵/구글맵)', '위치 검색/마커 표시', '현재 위치 기반 검색', '경로 안내(선택)'],
    considerations: ['카카오맵이 국내 서비스에 최적(무료 쿼터 넉넉)', '위치 권한 거부 시 대체 UX 필요', 'GPS 배터리 소모 최적화'],
    acceptanceCriteria: ['지도 로딩 < 2초', '마커 클릭 시 상세 정보 표시', '현재 위치 기반 반경 검색'],
  },
  'AI': {
    complexity: 5, estimatedWeeks: '3~6주',
    subFeatures: ['AI 모델 선정/연동(GPT/Claude/자체 모델)', '프롬프트 엔지니어링', 'API 비용 관리', '응답 캐싱/최적화'],
    considerations: ['AI API 호출 비용이 트래픽에 비례하여 증가', '응답 지연(2~5초)에 대한 UX 설계 필수', '환각(hallucination) 방지를 위한 가드레일 설계'],
    acceptanceCriteria: ['AI 응답 지연 < 5초', '부적절한 응답 필터링 동작', 'API 비용 모니터링 대시보드'],
  },
  '추천': {
    complexity: 4, estimatedWeeks: '2~4주',
    subFeatures: ['협업 필터링(사용자 기반)', '콘텐츠 기반 필터링', '하이브리드 추천', '개인화 피드'],
    considerations: ['초기 데이터 부족(콜드스타트) 시 규칙 기반 추천으로 시작', '추천 정확도 평가 기준 사전 정의', 'A/B 테스트 인프라 병행 구축'],
    acceptanceCriteria: ['추천 결과 3초 이내 반환', '신규 사용자에게도 추천 결과 제공', '추천 클릭률 추적 가능'],
  },
};

function analyzeFeature(feature: FeatureItem): FeatureAnalysis {
  const name = feature.name;
  const lower = name.toLowerCase();

  // DB에서 매칭되는 기능 찾기
  let matched: Partial<FeatureAnalysis> = {};
  for (const [key, val] of Object.entries(FEATURE_DB)) {
    if (lower.includes(key.toLowerCase()) || lower.includes(key)) {
      matched = val;
      break;
    }
  }

  return {
    name: feature.name,
    description: feature.description || feature.name,
    priority: feature.priority,
    complexity: matched.complexity || 3,
    estimatedWeeks: matched.estimatedWeeks || '2~3주',
    subFeatures: matched.subFeatures || [`${feature.name} 기본 기능`, '관련 UI/UX 설계', '테스트/QA'],
    considerations: matched.considerations || ['구현 범위를 사전에 명확히 정의하세요', '유사 서비스의 해당 기능을 벤치마크하세요'],
    acceptanceCriteria: matched.acceptanceCriteria || [`${feature.name} 기능 정상 동작`, 'UI/UX 사용성 테스트 통과', '에러 핸들링 완료'],
  };
}

// ═══════════════════════════════════════════
// WOW 수준 Fallback RFP 문서 생성
// ═══════════════════════════════════════════

function generateFallbackRFP(rfpData: RFPData): string {
  const date = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const projectInfo = getProjectTypeInfo(rfpData.overview);

  const features = rfpData.coreFeatures || [];
  const featuresP1 = features.filter(f => f.priority === 'P1');
  const featuresP2 = features.filter(f => f.priority === 'P2');
  const featuresP3 = features.filter(f => f.priority === 'P3');

  const analyzedFeatures = features.map(f => analyzeFeature(f));
  const totalComplexity = analyzedFeatures.reduce((sum, f) => sum + f.complexity, 0);
  const complexityLevel = totalComplexity >= 15 ? '높음' : totalComplexity >= 8 ? '중간~높음' : totalComplexity >= 4 ? '중간' : '보통';

  // 총 예상 기간 계산
  const weekEstimates = analyzedFeatures.map(f => {
    const match = f.estimatedWeeks.match(/(\d+)~(\d+)/);
    return match ? [parseInt(match[1]), parseInt(match[2])] : [2, 3];
  });
  const totalWeeksMin = Math.max(weekEstimates.reduce((s, w) => s + w[0], 0) * 0.6, 4); // 병렬 고려
  const totalWeeksMax = Math.max(weekEstimates.reduce((s, w) => s + w[1], 0) * 0.7, 6);

  // 기능 섹션 생성
  const formatDetailedFeatures = (featureList: FeatureItem[], label: string) => {
    if (featureList.length === 0) return '';
    const analyzed = featureList.map(f => analyzeFeature(f));
    let section = `\n  *** ${label} ***\n`;
    analyzed.forEach((f, i) => {
      const stars = '★'.repeat(f.complexity) + '☆'.repeat(5 - f.complexity);
      section += `
  ${i + 1}. ${f.name}
     상세 설명: ${f.description}
     서브 기능: ${f.subFeatures.join(' / ')}
     복잡도: ${stars} (${f.complexity}/5)
     예상 소요: ${f.estimatedWeeks}
     핵심 고려사항:
${f.considerations.map(c => `       → ${c}`).join('\n')}
     수락 기준:
${f.acceptanceCriteria.map(c => `       ✓ ${c}`).join('\n')}
`;
    });
    return section;
  };

  // 타겟 사용자 분석
  const targetText = rfpData.targetUsers || '';
  let targetAnalysis = '';
  if (targetText) {
    targetAnalysis = `  주 타겟 사용자: ${targetText}`;
    if (targetText.includes('시니어') || targetText.includes('50') || targetText.includes('60')) {
      targetAnalysis += `\n\n  [UI/UX 가이드라인 — 시니어 타겟]
  ▸ 최소 폰트 사이즈: 16px (본문), 20px (제목)
  ▸ 버튼 최소 크기: 48×48px (터치 영역)
  ▸ 간결한 네비게이션 (3depth 이내)
  ▸ 고대비 컬러 사용 (접근성 AAA 등급)
  ▸ 회원가입 단계 최소화 (전화번호 인증 위주)`;
    } else if (targetText.includes('MZ') || targetText.includes('20') || targetText.includes('30')) {
      targetAnalysis += `\n\n  [UI/UX 가이드라인 — MZ세대 타겟]
  ▸ 모바일 퍼스트 설계 (데스크톱은 반응형으로 대응)
  ▸ 소셜 로그인 필수 (카카오 > 구글 > 애플)
  ▸ 다크모드 지원 권장
  ▸ 마이크로 인터랙션과 모션 UI
  ▸ 공유 기능 (인스타그램/카카오톡)`;
    } else if (targetText.includes('B2B') || targetText.includes('기업') || targetText.includes('사업자')) {
      targetAnalysis += `\n\n  [UI/UX 가이드라인 — B2B 타겟]
  ▸ 데스크톱 우선 설계 (모바일은 핵심 기능만)
  ▸ 대시보드/리포트 중심 UI
  ▸ 다중 사용자 권한 관리 필수
  ▸ 엔터프라이즈 보안 요구(SSO, 2FA)
  ▸ API 문서/연동 가이드 제공`;
    } else {
      targetAnalysis += `\n\n  [UI/UX 가이드라인]
  ▸ 모바일/데스크톱 동시 고려 (반응형 설계)
  ▸ 직관적인 온보딩 (3단계 이내 핵심 가치 전달)
  ▸ 로딩 시간 최적화 (First Contentful Paint < 2초)`;
    }
  } else {
    targetAnalysis = `  (타겟 미지정 — 일반 사용자 대상으로 가정)

  [UI/UX 가이드라인]
  ▸ 모바일/데스크톱 반응형 설계
  ▸ 직관적인 온보딩 (3단계 이내 핵심 가치 전달)
  ▸ 접근성 AA 등급 이상 권장`;
  }

  // 기술 스택 추천
  const techInput = (rfpData.techRequirements || '').toLowerCase();
  const overviewLower = (rfpData.overview || '').toLowerCase();
  const isApp = techInput.includes('앱') || techInput.includes('모바일') || overviewLower.includes('앱');
  const isWeb = techInput.includes('웹') || overviewLower.includes('웹') || overviewLower.includes('사이트');
  const isBoth = techInput.includes('둘') || (isApp && isWeb);

  let techRecommendation = '';
  if (isBoth) {
    techRecommendation = `  ▸ 플랫폼: 웹 + 모바일(iOS/Android)

  [AI 기술 스택 추천 — A안: 비용 효율]
  • 프론트엔드: Flutter 3.x (모바일) + Next.js 14 (웹)
    → 하나의 Dart 코드로 iOS/Android 동시 커버, 개발비 35% 절감
  • 백엔드: NestJS (TypeScript) + PostgreSQL
    → 프론트와 동일 언어(TS)로 풀스택 개발 가능, 인력 효율 ↑
  • 인프라: AWS (ECS + RDS + CloudFront + S3)
    → 초기 월 30~50만원, 트래픽 증가 시 자동 스케일링

  [AI 기술 스택 추천 — B안: 퍼포먼스 우선]
  • 프론트엔드: React Native (모바일) + Next.js (웹)
    → React 생태계 통일, 웹-앱 코드 재사용 극대화
  • 백엔드: Python FastAPI + PostgreSQL + Redis
    → AI/ML 기능 확장에 유리, 비동기 처리 성능 우수`;
  } else if (isApp) {
    techRecommendation = `  ▸ 플랫폼: 모바일 앱 (iOS + Android)

  [AI 기술 스택 추천]
  • 프론트엔드: Flutter 3.x (크로스플랫폼)
    → 네이티브 대비 개발 기간 40% 단축, 유지보수 비용 절감
    → 대안: React Native (JavaScript 생태계 활용 시)
  • 백엔드: NestJS (TypeScript) 또는 FastAPI (Python)
  • 데이터베이스: PostgreSQL + Redis (캐시)
  • 인프라: AWS (ECS Fargate + RDS + S3)
  • 모니터링: Firebase Crashlytics + Sentry`;
  } else {
    techRecommendation = `  ▸ 플랫폼: 웹 서비스 (반응형)

  [AI 기술 스택 추천]
  • 프론트엔드: Next.js 14+ (React)
    → SSR/SSG로 SEO 최적화, Vercel 배포 시 자동 CDN
    → 대안: Nuxt.js (Vue 선호 시)
  • 백엔드: NestJS (TypeScript) 또는 Django (Python)
  • 데이터베이스: PostgreSQL + Redis (캐시)
  • 인프라: Vercel(프론트) + AWS(백엔드) 또는 Railway
  • 모니터링: Sentry + LogRocket`;
  }

  // 결제 연동
  const hasPayment = features.some(f =>
    f.name.includes('결제') || f.name.includes('구매') || f.name.includes('주문'));
  if (hasPayment) {
    techRecommendation += `

  [결제 시스템 상세]
  • PG사: 토스페이먼츠 (추천) 또는 이니시스
    → 토스페이먼츠: 개발자 친화적 API, 연동 기간 단축
    → 이니시스: 국내 점유율 1위, 레퍼런스 풍부
  • 간편결제: 카카오페이, 네이버페이, 애플페이 (필수 권장)
  • ⚠️ PG 인증에 사업자등록증 기준 2~3주 별도 소요
  • ⚠️ 에스크로/정산 기능 포함 시 추가 2~3주`;
  }

  // 보안 요구사항
  let securitySection = `
  [보안 요구사항]
  • 통신 암호화: HTTPS (TLS 1.3) 필수
  • 데이터 암호화: 개인정보 AES-256 암호화 저장
  • 인증: JWT + Refresh Token (만료 시 자동 갱신)
  • 개인정보: 개인정보보호법 준수 (수집/이용 동의, 처리방침 고지)`;

  if (hasPayment) {
    securitySection += `
  • 결제: PCI-DSS 준수 (PG사 위임)
  • 금융: 전자금융거래법 준수`;
  }

  // 예산/일정 분석
  const budgetText = rfpData.budgetTimeline || '';
  let budgetSection = '';
  if (budgetText && !budgetText.includes('미정') && budgetText.trim() !== '') {
    budgetSection = `  사용자 입력: ${budgetText}`;
  } else {
    budgetSection = `  예산 미정 — 아래 AI 분석을 참고하세요`;
  }

  budgetSection += `

  [AI 예산/일정 분석]
  • ${projectInfo.type} 프로젝트 평균 예산: ${projectInfo.avgBudget}
  • ${projectInfo.type} 프로젝트 평균 기간: ${projectInfo.avgDuration}
  • 이 프로젝트 예상 기간: ${Math.round(totalWeeksMin)}~${Math.round(totalWeeksMax)}주 (기능 ${features.length}개, 복잡도 ${complexityLevel})

  [마일스톤 일정표]
  M1 (1~2주): 기획/설계
     산출물: 와이어프레임, 정보구조(IA), DB 스키마
     ─────────────────────────────────────────
  M2 (2~3주): UI/UX 디자인
     산출물: 디자인 시안(주요 화면), 디자인 시스템
     ─────────────────────────────────────────
  M3 (${Math.round(totalWeeksMin * 0.4)}~${Math.round(totalWeeksMax * 0.4)}주): 프론트엔드 개발
     산출물: 주요 화면 구현, API 연동
     ─────────────────────────────────────────
  M4 (${Math.round(totalWeeksMin * 0.4)}~${Math.round(totalWeeksMax * 0.4)}주): 백엔드 개발
     산출물: API 완성, 외부 연동, 데이터 마이그레이션
     ─────────────────────────────────────────
  M5 (1~2주): 통합 테스트/QA
     산출물: 버그 리포트, 성능 테스트 결과
     ─────────────────────────────────────────
  M6 (1주): 배포/런칭
     산출물: 라이브 서비스, 운영 문서

  [결제 조건 추천]
  • 착수금 30% → 디자인 완료 시 30% → 최종 납품 시 40%
  • 또는: 마일스톤별 균등 분할 (M1~M6 각 16.7%)
  • ⚠️ 착수금 50% 이상 요구 시 주의 (업계 표준은 30%)`;

  // 참고 서비스 분석
  let referenceSection = '';
  if (rfpData.referenceServices && rfpData.referenceServices.trim() !== '' &&
      !rfpData.referenceServices.includes('없') && !rfpData.referenceServices.includes('건너')) {
    referenceSection = `  ${rfpData.referenceServices}

  [벤치마크 활용 가이드]
  ▸ 개발사 미팅 시 "이 부분은 참고, 이 부분은 다르게"를 명확히 구분하세요
  ▸ 화면 캡처 + 메모를 첨부하면 견적 정확도가 크게 올라갑니다
  ▸ "그냥 이것처럼 만들어주세요"는 가장 위험한 요청입니다 — 구체적으로 설명하세요`;
  } else {
    referenceSection = `  별도 참고 서비스 없음

  [위시켓 추천]
  ▸ 유사 서비스 2~3개를 찾아 개발사에 함께 전달하면 커뮤니케이션 오류를 크게 줄일 수 있습니다
  ▸ 참고 서비스의 스크린샷 + "이 부분을 참고"라는 메모가 가장 효과적입니다`;
  }

  // 추가 요구사항
  let additionalSection = rfpData.additionalRequirements || '';
  if (!additionalSection || additionalSection.includes('없') || additionalSection.trim() === '') {
    additionalSection = '별도 추가 요구사항 없음';
  }

  // ═══════════════════════════════════════════
  // 최종 RFP 문서 조립
  // ═══════════════════════════════════════════

  const projectName = rfpData.overview?.split('\n')[0]?.split('.')[0]?.trim().slice(0, 30) || '프로젝트';

  return `
═══════════════════════════════════════════════════════════
              소프트웨어 개발 제안요청서 (RFP)
═══════════════════════════════════════════════════════════

  작성일: ${date}
  작성 도구: 위시켓 AI RFP Builder (v4)
  문서 버전: 1.0
  기밀 등급: Confidential


─── 1. Executive Summary ─────────────────────────────────

  "${projectName}" 프로젝트는 ${projectInfo.type} 형태의 서비스로,
  ${rfpData.targetUsers || '일반 사용자'}를 대상으로 합니다.

  핵심 기능 ${features.length}개를 포함하며, 프로젝트 복잡도는 "${complexityLevel}"으로
  평가됩니다. ${projectInfo.type} 프로젝트의 평균 기간은 ${projectInfo.avgDuration}이며,
  이 프로젝트의 예상 기간은 ${Math.round(totalWeeksMin)}~${Math.round(totalWeeksMax)}주입니다.

  ${projectInfo.marketInsight}


─── 2. 프로젝트 개요 ─────────────────────────────────────

  ${rfpData.overview || '(프로젝트 개요)'}

  ▸ 프로젝트 유형: ${projectInfo.type}
  ▸ 예상 복잡도: ${complexityLevel} (총점 ${totalComplexity}/25)
    구성: ${analyzedFeatures.map(f => `${f.name}(${'★'.repeat(f.complexity)})`).join(', ')}

  [위시켓 시장 데이터]
  • 유사 ${projectInfo.type} 프로젝트 평균 예산: ${projectInfo.avgBudget}
  • 유사 프로젝트 평균 기간: ${projectInfo.avgDuration}
  • ${projectInfo.successRate}

  [핵심 성공 지표(KPI) 제안]
  • MAU (월간 활성 사용자): 출시 3개월 내 목표 설정
  • 리텐션율: D1 > 40%, D7 > 20%, D30 > 10% 목표
  • 핵심 전환율: 회원가입 → 핵심 액션 전환율 목표 설정


─── 3. 서비스 대상 ───────────────────────────────────────

${targetAnalysis}


─── 4. 기능 요구사항 ─────────────────────────────────────

  총 ${features.length}개 기능
  (필수 ${featuresP1.length}개 · 우선 ${featuresP2.length}개 · 선택 ${featuresP3.length}개)
${formatDetailedFeatures(featuresP1, '필수 기능 (P1) — MVP에 반드시 포함')}
${formatDetailedFeatures(featuresP2, '우선 기능 (P2) — 2차 개발 범위')}
${formatDetailedFeatures(featuresP3, '선택 기능 (P3) — 사용자 피드백 기반 결정')}

  [누락 가능성이 높은 기능 — 위시켓 경험 기반]
${projectInfo.mustHaveFeatures.map(f => `  ⚠️ ${f}`).join('\n')}


─── 5. 참고 서비스 / 벤치마크 ────────────────────────────

${referenceSection}


─── 6. 기술 요구사항 ─────────────────────────────────────

  ${rfpData.techRequirements || '기술 스택은 개발사 재량에 위임 (아래 AI 추천 참고)'}

${techRecommendation}
${securitySection}

  [비기능 요구사항]
  • 성능: 페이지 로딩 < 3초, API 응답 < 500ms
  • 확장성: MAU 10,000명까지 별도 인프라 변경 없이 대응
  • 가용성: 99.5% 이상 (월간 다운타임 3.6시간 이내)
  • 백업: 일 1회 자동 백업, 30일 보관


─── 7. 디자인 요구사항 ───────────────────────────────────

  • 디자인 포함 여부: 개발사와 협의 (별도 디자이너 or 개발사 내부)
  • 반응형: 모바일(375px~) / 태블릿(768px~) / 데스크톱(1200px~)
  • 디자인 시스템: 주요 컬러, 타이포그래피, 컴포넌트 라이브러리 정의
  • 프로토타입: Figma 기반 인터랙티브 프로토타입 권장


─── 8. 일정 및 예산 ─────────────────────────────────────

${budgetSection}


─── 9. 기타 요구사항 ─────────────────────────────────────

  ${additionalSection}

  [필수 확인 사항 — 위시켓 추천]
  • 소스코드 소유권: 발주사에 귀속 (계약서에 반드시 명시)
  • 하자보수 기간: 최소 3개월 (6개월 권장)
  • 유지보수: 월 정액 또는 시간제 유지보수 별도 계약
  • 커뮤니케이션: 주 1~2회 진행 보고서 + 격주 화상 미팅
  • 산출물: 소스코드 + 기술문서 + DB 스키마 + API 문서 + 배포 가이드


═══════════════════════════════════════════════════════════
          위시켓 AI 전문가 분석 & 추천 사항
═══════════════════════════════════════════════════════════


─── MVP 로드맵 ───────────────────────────────────────────

  [1단계 — MVP 출시 (${Math.round(totalWeeksMin)}~${Math.round(totalWeeksMax * 0.6)}주)]
  범위: ${featuresP1.map(f => f.name).join(', ') || '핵심 기능'}
  목표: 시장 검증 + 초기 사용자 확보 + 핵심 가설 검증
  예산: 전체의 45~55%

  [2단계 — 기능 확장 (MVP 출시 후 4~6주)]
  범위: ${featuresP2.map(f => f.name).join(', ') || '우선순위 기능'}
  목표: 사용자 피드백 반영 + 리텐션 개선
  예산: 전체의 25~35%

  [3단계 — 고도화 (2단계 이후)]
  범위: ${featuresP3.map(f => f.name).join(', ') || '선택 기능 + 성능 최적화'}
  목표: 차별화 + 수익 모델 강화
  예산: 전체의 15~25%


─── 예산 최적화 가이드 ───────────────────────────────────

  1. 크로스플랫폼 활용 → 네이티브 대비 30~40% 절감
     (Flutter/React Native로 iOS+Android 동시 개발)

  2. MVP 우선 전략 → 초기 리스크 50% 이상 감소
     (P1 기능만 먼저 출시, 시장 반응 확인 후 확장)

  3. 관리자 화면 간소화 → 전체 비용 10~15% 절감
     (초기에는 최소 기능만, 필요에 따라 확장)


─── 리스크 매트릭스 ──────────────────────────────────────

${projectInfo.keyRisks.map((r, i) => `  ${i + 1}. ${r}
     발생확률: 중~높음 | 영향도: 높음
     대응: 사전 일정에 반영 + 대안 기술 검토`).join('\n\n')}

  ${features.length > 5 ? `${projectInfo.keyRisks.length + 1}. 기능 과다에 의한 스코프 크리프
     발생확률: 높음 | 영향도: 매우 높음
     대응: MVP(P1) 먼저 출시, 추가 기능은 2차 개발로 분리` : ''}

  ${projectInfo.keyRisks.length + (features.length > 5 ? 2 : 1)}. 커뮤니케이션 단절
     발생확률: 중간 | 영향도: 높음
     대응: 주 1~2회 정기 미팅, 마일스톤별 산출물 리뷰


─── 개발사 선정 가이드 ───────────────────────────────────

  [이 프로젝트에 적합한 개발사]
  • 유사 ${projectInfo.type} 포트폴리오 3건 이상
  • ${projectInfo.commonStack} 경험
  • 5인 이상 팀 구성 가능 (PM + 디자이너 + 프론트 + 백엔드 + QA)

  [면접 시 반드시 물어볼 질문 5가지]
  1. "유사 프로젝트를 진행한 경험이 있나요? 결과물을 볼 수 있을까요?"
  2. "프로젝트 매니저가 전담 배정되나요? 주간 보고는 어떤 형식인가요?"
  3. "개발 중 요구사항이 변경되면 어떻게 처리하나요? (비용/일정 영향)"
  4. "QA 프로세스는 어떻게 되나요? 테스트 범위와 기준은?"
  5. "소스코드와 산출물 인수인계는 어떤 형식으로 진행하나요?"


─── 계약 시 체크리스트 ───────────────────────────────────

  ☐ 소스코드 소유권 → "모든 소스코드의 저작재산권은 발주사에 귀속"
  ☐ 중간 산출물 정의 → 마일스톤별 산출물과 승인 기준 명시
  ☐ 하자보수 기간 → "납품일로부터 6개월간 무상 하자보수"
  ☐ 추가 개발 단가 → "추가 기능 요청 시 개발자 1인/일 단가 기준 협의"
  ☐ 지연 시 패널티 → "귀책 사유에 의한 지연 시 주당 N% 감액" 조건
  ☐ 보안/기밀유지 → NDA(비밀유지계약) 별도 체결
  ☐ 분쟁 해결 → "대한상사중재원 중재에 따른다" 등 분쟁 해결 조항


═══════════════════════════════════════════════════════════
  본 RFP는 위시켓 AI RFP Builder (v4)로 생성되었습니다.
  이 문서를 개발사에 바로 전달하여 정확한 견적을 받아보세요.

  위시켓 | wishket.com
  13년간 7만+ IT 프로젝트 매칭, 국내 최대 IT 외주 플랫폼

  📌 다음 단계:
  1. 위시켓에 프로젝트 등록 → 평균 48시간 내 3~5곳 개발사 제안 수령
  2. 개발사 포트폴리오 및 리뷰 확인 → 면접 2~3곳 선정
  3. 개발사 미팅 (이 RFP 기반) → 최종 선정 및 계약
═══════════════════════════════════════════════════════════`.trim();
}

// ═══════════════════════════════════════════
// API Handler
// ═══════════════════════════════════════════

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
    const projectInfo = getProjectTypeInfo(rfpData.overview);

    if (!HAS_API_KEY) {
      rfpDocument = generateFallbackRFP(rfpData);
    } else {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const analyzedFeatures = rfpData.coreFeatures.map(f => analyzeFeature(f));
      const totalComplexity = analyzedFeatures.reduce((s, f) => s + f.complexity, 0);
      const complexityLevel = totalComplexity >= 15 ? '높음' : totalComplexity >= 8 ? '중간~높음' : '중간';

      const contextData = `
프로젝트 유형: ${projectInfo.type}
시장 데이터: 평균 예산 ${projectInfo.avgBudget}, 평균 기간 ${projectInfo.avgDuration}
복잡도: ${complexityLevel} (점수 ${totalComplexity}/25)
시장 인사이트: ${projectInfo.marketInsight}
주요 리스크: ${projectInfo.keyRisks.join(', ')}
필수 기능 체크: ${projectInfo.mustHaveFeatures.join(', ')}

수집 데이터:
${JSON.stringify(rfpData, null, 2)}

기능별 분석:
${analyzedFeatures.map(f =>
  `- ${f.name}: 복잡도 ${f.complexity}/5, 예상 ${f.estimatedWeeks}, 서브기능: ${f.subFeatures.join('/')}`
).join('\n')}`;

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: RFP_GENERATION_PROMPT,
        messages: [
          {
            role: 'user',
            content: `아래 데이터로 시장 최고 수준의 전문 RFP 문서를 작성해주세요. 맥킨지 수준의 구조화, 실제 개발사 PM이 바로 WBS를 작성할 수 있는 구체성, 비개발자도 이해할 수 있는 완결성이 필요합니다.\n\n${contextData}`,
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

    // 세션에 완성된 RFP 문서 저장
    if (sessionId) {
      supabase
        .from('rfp_sessions')
        .update({
          rfp_data: rfpData,
          rfp_document: rfpDocument.slice(0, 30000),
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
