// AI RFP Builder — Dynamic Conversation Engine v8
// 핵심 변경: 고정 7단계 → 맥락 기반 동적 질문 생성
// 앞 질문의 답변에 따라 뒷 질문이 자동으로 맞춤 생성됨
// 위시켓 13년 7만+ 외주 프로젝트 데이터 기반

import { RFPData, TopicId, TOPIC_TO_STEP, STEP_TO_TOPIC, getTopicsCovered, isReadyToComplete, TOPICS } from '@/types/rfp';

interface SelectableFeature {
  name: string;
  desc: string;
  category: 'must' | 'recommended';
}

interface FallbackResponse {
  message: string;
  rfpUpdate: {
    section: string;
    value: string | { name: string; description: string; priority: string }[];
  } | null;
  nextAction: string;
  nextStep: number | null;
  quickReplies?: string[];
  inlineOptions?: string[];
  selectableFeatures?: SelectableFeature[];
  thinkingLabel?: string;
  topicsCovered?: TopicId[];
  progress?: number;
  canComplete?: boolean;
}

// ═══════════════════════════════════════════════════════
//  프로젝트 유형 인텔리전스 DB (기존 유지)
// ═══════════════════════════════════════════════════════
interface ProjectTypeInfo {
  type: string;
  avgBudget: string;
  avgDuration: string;
  successRate: string;
  keyFeatures: string[];
  mustHaveFeatures: string[];
  commonMistakes: string[];
  techTip: string;
  commonRisk: string;
  insightEmoji: string;
  marketInsight: string;
  mvpScope: string;
  competitorExample: string;
  // 동적 질문용 추가 필드
  topicPriority: TopicId[];        // 이 유형에 맞는 토픽 순서
  deepDiveQuestions: Record<TopicId, string[]>; // 토픽별 심화 질문
  quickRepliesMap: Record<TopicId, string[]>;   // 토픽별 퀵 리플라이
}

const PROJECT_TYPES: Record<string, ProjectTypeInfo> = {
  '모바일 앱': {
    type: '모바일 앱',
    avgBudget: '2,000~5,000만원',
    avgDuration: '4~8주(MVP)',
    successRate: '73%',
    keyFeatures: ['회원가입/로그인', '푸시 알림', '마이페이지'],
    mustHaveFeatures: ['소셜 로그인(카카오/네이버)', '푸시 알림', '앱 업데이트 관리'],
    commonMistakes: ['앱스토어 심사 기간(1~2주) 미반영', '디바이스 파편화 대응 미고려', '오프라인 모드 미설계'],
    techTip: 'Flutter/React Native 크로스플랫폼으로 iOS/Android 동시 개발 시 비용 30~40% 절감.',
    commonRisk: '앱스토어 심사(평균 1~2주)를 일정에 반드시 포함.',
    insightEmoji: '📱',
    marketInsight: '2025년 모바일 앱 시장은 슈퍼앱 트렌드에서 버티컬 특화 앱으로 전환 중입니다.',
    mvpScope: '핵심 기능 3개 + 소셜 로그인 + 푸시 알림',
    competitorExample: '당근마켓, 토스, 오늘의집',
    topicPriority: ['overview', 'targetUsers', 'coreFeatures', 'techRequirements', 'budgetTimeline', 'referenceServices', 'additionalRequirements'],
    deepDiveQuestions: {
      overview: ['이 앱의 핵심 가치를 한 문장으로 표현하면?', '유사한 앱이 있다면, 어떤 점이 다른가요?'],
      targetUsers: ['하루 중 언제 이 앱을 가장 많이 사용할 것 같으세요?', '앱을 처음 실행했을 때 사용자가 가장 먼저 해야 할 행동은?'],
      coreFeatures: ['이 기능들 중 "이것만 되면 출시할 수 있다"는 핵심 1가지는?', '사용자가 가장 자주 쓸 기능은 무엇인가요?'],
      referenceServices: [], techRequirements: [], budgetTimeline: [], additionalRequirements: [],
    },
    quickRepliesMap: {
      overview: [], targetUsers: ['20~30대 직장인', '전 연령 일반 사용자', '10~20대 학생/MZ세대', '40~60대 시니어'],
      coreFeatures: ['소셜 로그인', '결제 기능', '채팅/메시지', '지도/위치 기반', '푸시 알림', '예약 기능'],
      referenceServices: ['건너뛰기', '직접 입력할게요'], techRequirements: ['모바일 앱 (iOS/Android)', '웹 + 앱 둘 다', '아직 미정이에요'],
      budgetTimeline: ['1,000~3,000만원', '3,000~5,000만원', '5,000만원 이상', '아직 미정'], additionalRequirements: ['소스코드 귀속 필요', '디자인 포함', '유지보수 계약 필요', '건너뛰기'],
    },
  },
  '웹 서비스': {
    type: '웹 서비스',
    avgBudget: '1,500~4,000만원',
    avgDuration: '4~6주(MVP)',
    successRate: '78%',
    keyFeatures: ['반응형 디자인', '회원 시스템', 'SEO 최적화'],
    mustHaveFeatures: ['반응형(모바일 대응)', 'SEO 메타 태그', 'SSL 인증서'],
    commonMistakes: ['모바일 사용자 비율 과소평가', 'SEO 미고려', '브라우저 호환성 미테스트'],
    techTip: 'Next.js가 SEO, 성능, 개발 생산성 측면에서 현재 가장 검증된 선택.',
    commonRisk: '브라우저 호환성(Chrome, Safari, Edge)을 초기에 정의해야 수정 비용 절감.',
    insightEmoji: '🌐',
    marketInsight: '웹 서비스는 초기 진입장벽이 가장 낮고, 이후 앱으로 확장하기 용이합니다.',
    mvpScope: '핵심 페이지 5개 이내 + 회원 시스템 + 반응형',
    competitorExample: '노션, 슬랙, 피그마',
    topicPriority: ['overview', 'targetUsers', 'coreFeatures', 'budgetTimeline', 'referenceServices', 'techRequirements', 'additionalRequirements'],
    deepDiveQuestions: {
      overview: ['이 서비스의 수익 모델은 무엇인가요?', 'PC와 모바일 중 어디에서 더 많이 접속할 것 같으세요?'],
      targetUsers: ['사용자가 이 서비스를 얼마나 자주 방문할 것 같나요?'],
      coreFeatures: ['관리자가 직접 콘텐츠를 수정해야 하나요?', '검색 기능이 중요한가요?'],
      referenceServices: [], techRequirements: [], budgetTimeline: [], additionalRequirements: [],
    },
    quickRepliesMap: {
      overview: [], targetUsers: ['B2B 기업 고객', '일반 소비자(B2C)', '내부 직원용', '특정 전문가 그룹'],
      coreFeatures: ['회원가입/로그인', '대시보드', '게시판', '검색/필터', '관리자 패널', '결제'],
      referenceServices: ['건너뛰기', '직접 입력할게요'], techRequirements: ['웹 서비스', '웹 + 앱 둘 다', '아직 미정이에요'],
      budgetTimeline: ['1,000~3,000만원', '3,000~5,000만원', '5,000만원 이상', '아직 미정'], additionalRequirements: ['소스코드 귀속 필요', '디자인 포함', '유지보수 계약 필요', '건너뛰기'],
    },
  },
  '웹사이트': {
    type: '웹사이트',
    avgBudget: '500~2,000만원',
    avgDuration: '2~4주',
    successRate: '85%',
    keyFeatures: ['반응형 레이아웃', '콘텐츠 관리', '문의 폼'],
    mustHaveFeatures: ['모바일 반응형', '문의/연락처 폼', 'SEO 기본 설정'],
    commonMistakes: ['콘텐츠 준비 지연으로 전체 딜레이', 'CMS 없이 정적으로만 제작', '호스팅 비용 미고려'],
    techTip: 'WordPress나 Next.js로 개발 기간 50% 이상 단축 가능.',
    commonRisk: '콘텐츠(텍스트, 이미지)는 발주사가 미리 준비해야 일정이 맞습니다.',
    insightEmoji: '🏠',
    marketInsight: '웹사이트는 성공률이 85%로 가장 높습니다. 명확한 목적만 있으면 실패가 적어요.',
    mvpScope: '메인 + 소개 + 서비스 + 문의 페이지',
    competitorExample: '잘 만든 브랜드 사이트 하나가 영업사원 10명 역할',
    // 웹사이트는 간소한 플로우 (5개 질문이면 충분)
    topicPriority: ['overview', 'targetUsers', 'coreFeatures', 'budgetTimeline', 'referenceServices', 'additionalRequirements'],
    deepDiveQuestions: {
      overview: ['웹사이트의 주요 목적은 무엇인가요? (브랜딩/리드 수집/정보 제공)'],
      targetUsers: [], coreFeatures: ['콘텐츠를 직접 수정할 수 있어야 하나요? (CMS 필요 여부)'],
      referenceServices: [], techRequirements: [], budgetTimeline: [], additionalRequirements: [],
    },
    quickRepliesMap: {
      overview: [], targetUsers: ['잠재 고객', '기존 고객', '투자자/파트너', '일반 대중'],
      coreFeatures: ['콘텐츠 관리(CMS)', '문의 폼', '블로그', '포트폴리오', '뉴스/공지사항', 'FAQ'],
      referenceServices: ['건너뛰기', '직접 입력할게요'], techRequirements: ['웹사이트(반응형)', '아직 미정이에요'],
      budgetTimeline: ['500~1,000만원', '1,000~2,000만원', '2,000만원 이상', '아직 미정'], additionalRequirements: ['소스코드 귀속 필요', '디자인 포함', '유지보수 계약 필요', '건너뛰기'],
    },
  },
  '이커머스': {
    type: '이커머스',
    avgBudget: '3,000~8,000만원',
    avgDuration: '8~12주',
    successRate: '65%',
    keyFeatures: ['상품 관리', '장바구니/결제', '주문/배송 관리', '리뷰'],
    mustHaveFeatures: ['PG 결제(카드/간편결제)', '주문 상태 관리', '재고 관리', '교환/환불 처리'],
    commonMistakes: ['재고 관리 복잡도 과소평가', 'PG 심사 기간(2~3주) 미반영', '정산 시스템 후순위 처리'],
    techTip: 'PG 연동(토스페이먼츠)은 심사에 2~3주 소요. 초기 설계에 반드시 포함.',
    commonRisk: '교환/환불 프로세스와 정산 시스템이 가장 복잡한 부분.',
    insightEmoji: '🛒',
    marketInsight: '이커머스는 PG+정산+교환환불이 개발의 60%를 차지합니다.',
    mvpScope: '상품 등록 + 장바구니 + 결제 + 주문 관리',
    competitorExample: '무신사, 마켓컬리, 크림',
    topicPriority: ['overview', 'targetUsers', 'coreFeatures', 'budgetTimeline', 'techRequirements', 'referenceServices', 'additionalRequirements'],
    deepDiveQuestions: {
      overview: ['어떤 상품/서비스를 판매하시나요?', '결제 후 배송이 필요한 실물 상품인가요, 디지털 상품인가요?'],
      targetUsers: ['구매자가 주로 어떤 경로로 상품을 찾게 될까요?'],
      coreFeatures: ['교환/환불 프로세스가 필요한가요?', '판매자 정산 기능이 필요한가요?'],
      referenceServices: [], techRequirements: [], budgetTimeline: [], additionalRequirements: [],
    },
    quickRepliesMap: {
      overview: [], targetUsers: ['20~40대 온라인 쇼핑 이용자', 'B2B 도매/기업 구매자', '특정 취미/관심사 커뮤니티', '전 연령 일반 소비자'],
      coreFeatures: ['장바구니/결제', '상품 관리', '주문/배송 추적', '리뷰/평점', '쿠폰/포인트', '검색/필터'],
      referenceServices: ['건너뛰기', '직접 입력할게요'], techRequirements: ['웹 서비스', '모바일 앱', '웹 + 앱 둘 다', '아직 미정이에요'],
      budgetTimeline: ['3,000~5,000만원', '5,000~8,000만원', '1억 이상', '아직 미정'], additionalRequirements: ['소스코드 귀속 필요', '디자인 포함', '유지보수 계약 필요', '건너뛰기'],
    },
  },
  '플랫폼': {
    type: '플랫폼',
    avgBudget: '5,000만~1.5억',
    avgDuration: '8~16주',
    successRate: '58%',
    keyFeatures: ['공급/수요 매칭', '결제/정산', '리뷰/평가', '관리자 대시보드'],
    mustHaveFeatures: ['양면 사용자 가입', '매칭/검색', '결제/정산 분리', '분쟁 해결'],
    commonMistakes: ['"닭과 달걀" 문제 해결 전략 부재', '정산 시스템 후순위', '공급자/수요자 UX 미분리'],
    techTip: '양면 마켓플레이스는 초기에 한쪽에 집중하는 것이 성공률이 높습니다.',
    commonRisk: '양면 시장의 "닭과 달걀" 문제 해결 전략이 필수.',
    insightEmoji: '🔗',
    marketInsight: '플랫폼 성공의 핵심은 기술이 아니라 초기 사용자 확보 전략입니다.',
    mvpScope: '한쪽 사용자 + 매칭 + 채팅 (결제는 2차)',
    competitorExample: '위시켓, 크몽, 숨고',
    topicPriority: ['overview', 'targetUsers', 'coreFeatures', 'budgetTimeline', 'techRequirements', 'referenceServices', 'additionalRequirements'],
    deepDiveQuestions: {
      overview: ['공급자와 수요자 각각 어떤 분들인가요?', '초기에 어느 쪽을 먼저 모을 계획인가요?'],
      targetUsers: ['공급자와 수요자 중 어느 쪽의 가입 절차가 더 복잡한가요?'],
      coreFeatures: ['매칭 방식은 어떤 걸 원하시나요? (검색 기반 / 추천 기반 / 입찰 기반)'],
      referenceServices: [], techRequirements: [], budgetTimeline: [], additionalRequirements: [],
    },
    quickRepliesMap: {
      overview: [], targetUsers: ['전문가 ↔ 일반 소비자', '기업 ↔ 프리랜서', '판매자 ↔ 구매자', '서비스 제공자 ↔ 이용자'],
      coreFeatures: ['매칭/검색', '채팅/메시지', '결제/정산', '리뷰/평가', '프로필/포트폴리오', '관리자 대시보드'],
      referenceServices: ['건너뛰기', '직접 입력할게요'], techRequirements: ['웹 서비스', '모바일 앱', '웹 + 앱 둘 다', '아직 미정이에요'],
      budgetTimeline: ['3,000~5,000만원', '5,000만~1억', '1억 이상', '아직 미정'], additionalRequirements: ['소스코드 귀속 필요', '디자인 포함', '유지보수 계약 필요', '건너뛰기'],
    },
  },
  'SaaS': {
    type: 'SaaS',
    avgBudget: '3,000~8,000만원',
    avgDuration: '8~12주',
    successRate: '62%',
    keyFeatures: ['멀티테넌시', '구독/결제', '대시보드', '팀 관리'],
    mustHaveFeatures: ['구독 결제(월/연)', '팀/워크스페이스', '데이터 내보내기', '사용량 대시보드'],
    commonMistakes: ['요금 체계를 너무 복잡하게 설계', '온보딩 미설계', '멀티테넌시 보안 미고려'],
    techTip: '초기에는 단일 요금제 → PMF 검증 후 세분화. Stripe/토스페이먼츠 추천.',
    commonRisk: 'SaaS는 지속 운영이 핵심. 유지보수 계약을 사전에 반드시 협의.',
    insightEmoji: '☁️',
    marketInsight: 'SaaS는 MRR(월간 반복 매출) 구조가 핵심. 첫 100명 유료 고객이 PMF 지표.',
    mvpScope: '핵심 기능 1개 + 구독 결제 + 온보딩',
    competitorExample: '채널톡, 토스페이먼츠, 리멤버',
    topicPriority: ['overview', 'targetUsers', 'coreFeatures', 'budgetTimeline', 'techRequirements', 'referenceServices', 'additionalRequirements'],
    deepDiveQuestions: {
      overview: ['사용할 기업/팀의 규모는 어느 정도인가요?', '구매 의사결정자와 실사용자가 다른가요?'],
      targetUsers: ['유료 전환 핵심 트리거가 무엇이라 생각하세요?'],
      coreFeatures: ['팀 협업 기능이 필요한가요?', '외부 서비스 연동(API)이 필요한가요?'],
      referenceServices: [], techRequirements: [], budgetTimeline: [], additionalRequirements: [],
    },
    quickRepliesMap: {
      overview: [], targetUsers: ['스타트업/소규모 팀', '중견기업', '대기업', '1인 기업/프리랜서'],
      coreFeatures: ['대시보드/분석', '팀 관리/권한', '구독 결제', 'API 연동', '데이터 내보내기', '알림/리포트'],
      referenceServices: ['건너뛰기', '직접 입력할게요'], techRequirements: ['웹 서비스', '웹 + 앱 둘 다', '아직 미정이에요'],
      budgetTimeline: ['3,000~5,000만원', '5,000~8,000만원', '1억 이상', '아직 미정'], additionalRequirements: ['소스코드 귀속 필요', '디자인 포함', '유지보수 계약 필요', '건너뛰기'],
    },
  },
  'AI 서비스': {
    type: 'AI 기반 서비스',
    avgBudget: '3,000~1억',
    avgDuration: '8~16주',
    successRate: '60%',
    keyFeatures: ['AI 모델 연동', '데이터 처리', '결과 시각화'],
    mustHaveFeatures: ['AI API 연동', '프롬프트 관리', '결과 캐싱', '사용량 모니터링'],
    commonMistakes: ['AI 정확도 기대치 미설정', 'API 비용 과소평가', '응답 속도 미고려'],
    techTip: 'AI 모델 직접 개발보다 API(OpenAI, Claude) 활용이 초기 비용 80%+ 절감.',
    commonRisk: 'AI API 비용이 사용량 비례하므로 비용 관리 전략 필수.',
    insightEmoji: '🤖',
    marketInsight: '2025년 AI 서비스 핵심은 "AI 래퍼" — 기존 API 위에 UX를 입히는 것.',
    mvpScope: 'AI 핵심 기능 1개 + 결과 화면 + 사용량 제한',
    competitorExample: '뤼튼, 스켈터랩스, 업스테이지',
    topicPriority: ['overview', 'targetUsers', 'coreFeatures', 'techRequirements', 'budgetTimeline', 'referenceServices', 'additionalRequirements'],
    deepDiveQuestions: {
      overview: ['AI가 해결해야 할 핵심 문제는 무엇인가요?', '기존에 이 문제를 어떻게 해결하고 있었나요?'],
      targetUsers: ['사용자가 AI 결과물을 얼마나 신뢰해야 하나요? (참고용 vs 의사결정용)'],
      coreFeatures: ['AI 정확도 목표치가 있나요?', 'AI 응답 시간 요구사항은?'],
      referenceServices: [], techRequirements: [], budgetTimeline: [], additionalRequirements: [],
    },
    quickRepliesMap: {
      overview: [], targetUsers: ['일반 소비자', '전문가/전문직', '기업 직원', '콘텐츠 크리에이터'],
      coreFeatures: ['AI 챗봇/대화', '이미지 생성/분석', '문서 자동 생성', '데이터 분석', '추천 시스템', '음성 인식'],
      referenceServices: ['건너뛰기', '직접 입력할게요'], techRequirements: ['웹 서비스', '모바일 앱', '웹 + 앱 둘 다', '아직 미정이에요'],
      budgetTimeline: ['3,000~5,000만원', '5,000만~1억', '1억 이상', '아직 미정'], additionalRequirements: ['소스코드 귀속 필요', '디자인 포함', '유지보수 계약 필요', '건너뛰기'],
    },
  },
};

// 간소한 프로젝트 유형 (상세 데이터 없는 유형용 기본값)
const DEFAULT_PROJECT_TYPE: ProjectTypeInfo = {
  type: '소프트웨어 서비스',
  avgBudget: '2,000~5,000만원',
  avgDuration: '6~12주',
  successRate: '70%',
  keyFeatures: ['핵심 비즈니스 로직', '사용자 인증', '데이터 관리'],
  mustHaveFeatures: ['사용자 인증', '핵심 기능', '데이터 백업'],
  commonMistakes: ['요구사항 변경이 가장 흔한 지연 원인', 'MVP 범위 과다 설정', '테스트 기간 부족'],
  techTip: '첫 MVP는 핵심 기능 3개 이내로 제한하는 것이 성공 확률이 가장 높습니다.',
  commonRisk: '스코프 크리프(요구사항 계속 추가)가 가장 흔한 프로젝트 실패 원인.',
  insightEmoji: '⚙️',
  marketInsight: '소프트웨어 서비스 성공의 80%는 명확한 범위 정의에서 결정됩니다.',
  mvpScope: '핵심 기능 3개 이내 + 인증 + 기본 관리',
  competitorExample: '명확한 문제 해결에 집중한 서비스가 성공률이 높습니다',
  topicPriority: ['overview', 'targetUsers', 'coreFeatures', 'budgetTimeline', 'techRequirements', 'referenceServices', 'additionalRequirements'],
  deepDiveQuestions: {
    overview: [], targetUsers: [], coreFeatures: [], referenceServices: [], techRequirements: [], budgetTimeline: [], additionalRequirements: [],
  },
  quickRepliesMap: {
    overview: [], targetUsers: ['일반 소비자', '기업 고객(B2B)', '내부 직원용', '특정 전문가 그룹'],
    coreFeatures: ['회원가입/로그인', '대시보드', '검색/필터', '결제', '알림', '관리자 패널'],
    referenceServices: ['건너뛰기', '직접 입력할게요'], techRequirements: ['웹 서비스', '모바일 앱', '웹 + 앱 둘 다', '아직 미정이에요'],
    budgetTimeline: ['1,000~3,000만원', '3,000~5,000만원', '5,000만원 이상', '아직 미정'], additionalRequirements: ['소스코드 귀속 필요', '디자인 포함', '유지보수 계약 필요', '건너뛰기'],
  },
};

// ═══════════════════════════════════════════════════════
//  기능 분석 DB
// ═══════════════════════════════════════════════════════
const FEATURE_DB: Record<string, { desc: string; complexity: string; weeks: string; subFeatures: string[]; risks: string; acceptance: string }> = {
  '로그인': { desc: '이메일/소셜(카카오·네이버·구글) 로그인, 자동 로그인, 비밀번호 찾기', complexity: '★★☆☆☆', weeks: '1~2주', subFeatures: ['이메일 회원가입', '소셜 로그인', '비밀번호 찾기/재설정', '자동 로그인(토큰)', '로그인 실패 처리(5회 잠금)'], risks: '소셜 로그인 API 정책 변경 시 대응 필요', acceptance: '회원가입→로그인→토큰발급→자동로그인 전체 플로우 정상' },
  '회원': { desc: '회원가입(약관 동의, 프로필), 회원 등급, 마이페이지', complexity: '★★☆☆☆', weeks: '1~1.5주', subFeatures: ['약관 동의', '프로필 설정/수정', '회원 탈퇴', '회원 등급'], risks: '개인정보 수집 동의 법적 검토 필요', acceptance: '가입→프로필설정→수정→탈퇴 라이프사이클 정상' },
  '결제': { desc: 'PG 연동(토스페이먼츠/이니시스), 카드·계좌이체·간편결제', complexity: '★★★★☆', weeks: '2~3주', subFeatures: ['PG 연동', '신용카드/계좌이체', '간편결제(카카오페이·네이버페이)', '결제 내역', '환불 처리'], risks: 'PG 심사에 2~3주 소요', acceptance: '결제 요청→승인→완료→내역조회→환불 전체 플로우 정상' },
  '채팅': { desc: 'WebSocket 기반 실시간 1:1/그룹 메시징, 읽음 확인', complexity: '★★★★☆', weeks: '2~4주', subFeatures: ['1:1 채팅', '그룹 채팅', '읽음 확인', '파일/이미지 첨부', '채팅 알림'], risks: 'WebSocket 서버 별도 필요, 동시접속자 수 따른 인프라 비용', acceptance: '메시지 전송→수신→읽음확인→파일첨부→알림 1초 이내' },
  '관리자': { desc: '사용자/콘텐츠 관리, 통계 대시보드, 공지사항', complexity: '★★★★☆', weeks: '2~4주', subFeatures: ['사용자 관리', '콘텐츠 관리', '통계 대시보드', '공지사항', '신고 처리'], risks: '관리자 권한 분리 설계 필요', acceptance: '사용자검색→상태변경→통계확인→공지등록 전체 정상' },
  '알림': { desc: '푸시(FCM/APNs), 인앱 알림, 이메일/SMS', complexity: '★★☆☆☆', weeks: '1~2주', subFeatures: ['푸시 알림(FCM/APNs)', '인앱 알림 센터', '이메일 알림', 'SMS 알림', '알림 설정'], risks: '푸시 토큰 관리와 알림 실패 대응 필요', acceptance: '이벤트→알림전송→수신→읽음처리→설정변경 정상' },
  '검색': { desc: '키워드·자동완성·다중 필터, 최근/인기 검색어', complexity: '★★★☆☆', weeks: '1~2주', subFeatures: ['키워드 검색', '자동완성', '다중 조건 필터', '최근 검색어', '인기 검색어'], risks: '데이터량 증가 시 Elasticsearch 검토', acceptance: '검색→필터→정렬→자동완성 0.5초 이내 응답' },
  '지도': { desc: 'GPS 현재 위치, 장소 검색(카카오맵/구글맵), 마커·경로', complexity: '★★★☆☆', weeks: '1~2주', subFeatures: ['현재 위치 탐지', '장소 검색', '마커 표시', '경로 안내', '주변 검색'], risks: '지도 API 사용량 기반 과금 주의', acceptance: '위치탐지→검색→마커표시→경로안내 정상' },
  '예약': { desc: '캘린더 UI, 실시간 가용성, 예약/취소/변경, 리마인더', complexity: '★★★★☆', weeks: '2~3주', subFeatures: ['캘린더 UI', '시간 슬롯 선택', '실시간 가용성', '예약 확인/취소', '리마인더'], risks: '동시 예약 방지 필수', acceptance: '날짜선택→시간→예약→확인→취소 전체 정상' },
  '리뷰': { desc: '별점(1~5), 텍스트/사진 리뷰, 평균 별점', complexity: '★★☆☆☆', weeks: '1주', subFeatures: ['별점 평가', '텍스트 리뷰', '사진 첨부', '리뷰 신고', '정렬/필터'], risks: '허위 리뷰 방지(구매 인증) 필요', acceptance: '리뷰작성→별점→사진→목록→정렬 정상' },
  '게시판': { desc: 'WYSIWYG 에디터, 댓글/대댓글, 좋아요, 신고', complexity: '★★★☆☆', weeks: '1~2주', subFeatures: ['글 작성/수정/삭제', 'WYSIWYG 에디터', '이미지/파일 첨부', '댓글/대댓글', '좋아요'], risks: '에디터 선택에 따라 구현 범위 차이', acceptance: '글작성→이미지→댓글→좋아요→신고 전체 정상' },
  '장바구니': { desc: '상품 담기/삭제, 수량·옵션 변경, 합계 계산', complexity: '★★☆☆☆', weeks: '1~1.5주', subFeatures: ['상품 담기/삭제', '수량 변경', '옵션 선택', '합계 자동 계산'], risks: '비회원↔회원 전환 시 장바구니 병합 필요', acceptance: '상품추가→수량변경→옵션→합계→결제연동 정상' },
  '대시보드': { desc: 'KPI 시각화(차트), 실시간 모니터링, 리포트', complexity: '★★★★☆', weeks: '2~3주', subFeatures: ['핵심 KPI 차트', '기간별 필터', '실시간 갱신', '리포트 다운로드'], risks: '데이터 양에 따라 쿼리 최적화 필요', acceptance: '데이터로딩→차트→필터→리포트다운로드 3초 이내' },
  '정산': { desc: '판매자 정산, 수수료 계산, 정산 주기, 세금계산서', complexity: '★★★★★', weeks: '3~4주', subFeatures: ['판매자별 정산', '수수료 자동 계산', '정산 주기', '정산 리포트', '세금계산서'], risks: '세무/회계 규정 준수, 오차 0원 정밀도', acceptance: '매출집계→수수료→정산금→세금계산서 정상' },
  '추천': { desc: '사용자 행동 기반 추천, 유사 아이템, 개인화 피드', complexity: '★★★★☆', weeks: '2~4주', subFeatures: ['행동 데이터 수집', '유사 아이템 추천', '개인화 피드', '추천 성과 분석'], risks: '초기 규칙 기반 → 데이터 축적 후 ML 전환', acceptance: '행동수집→추천생성→피드노출→성과측정 정상' },
  '쿠폰': { desc: '쿠폰 발급/사용/만료, 할인율/금액, 사용 조건', complexity: '★★☆☆☆', weeks: '1주', subFeatures: ['쿠폰 코드 생성', '할인 적용', '유효기간', '사용 조건', '사용 내역'], risks: '쿠폰 중복 사용 방지 필수', acceptance: '쿠폰발급→적용→할인반영→사용내역 정상' },
};

// ═══════════════════════════════════════════════════════
//  🆕 v12: 문장 심층 분석 기반 기능 추천 시스템
//  카테고리 분류 X → 입력 문장의 키워드를 전부 분석하여 기능 조합
//  유명 서비스명이면 해당 서비스의 실제 기능 목록 반환
// ═══════════════════════════════════════════════════════

// ── 1) 유명 서비스 DB: 서비스명 → 실제 핵심 기능 ──
const KNOWN_SERVICES: Record<string, { label: string; features: { name: string; desc: string; must: boolean }[] }> = {
  '위시켓': {
    label: '위시켓 (IT 외주 매칭 플랫폼)',
    features: [
      { name: '프로젝트 등록', desc: '의뢰인이 프로젝트 요구사항/예산/기간 작성하여 등록', must: true },
      { name: '파트너스 지원 시스템', desc: '개발사/프리랜서가 프로젝트에 지원서 제출', must: true },
      { name: '매칭 알고리즘', desc: '프로젝트 요건과 파트너스 역량 기반 자동 매칭', must: true },
      { name: '에스크로 안전결제', desc: '중개 수수료 + 단계별 안전결제 (마일스톤 정산)', must: true },
      { name: '파트너스 프로필/포트폴리오', desc: '경력, 기술 스택, 과거 작업물, 평점 표시', must: true },
      { name: '프로젝트 관리 대시보드', desc: '진행 상태, 일정, 산출물, 커뮤니케이션 관리', must: true },
      { name: '의뢰인/파트너스 채팅', desc: '프로젝트별 1:1 메시지, 파일 공유', must: false },
      { name: '리뷰/평판 시스템', desc: '프로젝트 완료 후 상호 평가 (별점+텍스트)', must: false },
      { name: '분쟁 해결 시스템', desc: '중재 요청, 증거 제출, 위시켓 중재 처리', must: false },
      { name: '알림', desc: '새 프로젝트, 지원서, 메시지, 정산 알림', must: false },
      { name: '관리자 백오피스', desc: '프로젝트/유저/정산/분쟁 관리, 통계', must: false },
      { name: '검색/필터', desc: '기술스택, 예산, 기간, 지역별 프로젝트/파트너 검색', must: false },
    ],
  },
  '배달의민족': {
    label: '배달의민족 (음식 배달 플랫폼)',
    features: [
      { name: '매장/메뉴 관리', desc: '업주가 메뉴, 가격, 옵션, 품절 상태 관리', must: true },
      { name: '실시간 주문 시스템', desc: '주문 접수→조리→배달 상태 실시간 관리', must: true },
      { name: '배달 추적 (GPS)', desc: '라이더 위치 실시간 지도 표시', must: true },
      { name: '결제', desc: 'PG 연동 (카드/간편결제/계좌이체)', must: true },
      { name: '라이더 배차 시스템', desc: '주문별 라이더 자동/수동 배정', must: true },
      { name: '리뷰/별점', desc: '음식, 배달 서비스 별점 및 리뷰', must: false },
      { name: '쿠폰/프로모션', desc: '할인 쿠폰, 첫 주문 혜택, 이벤트', must: false },
      { name: '주문 내역/재주문', desc: '과거 주문 조회, 원클릭 재주문', must: false },
      { name: '찜/즐겨찾기', desc: '자주 시키는 매장 저장', must: false },
      { name: '푸시 알림', desc: '주문 상태, 프로모션 알림', must: false },
      { name: '사장님 앱 (업주 관리)', desc: '주문 접수, 메뉴 관리, 매출 확인', must: false },
      { name: '정산 시스템', desc: '업주·라이더 수수료 계산, 정산 주기 관리', must: false },
    ],
  },
  '배민': { label: '배달의민족', features: [] }, // alias → 배달의민족
  '당근마켓': {
    label: '당근마켓 (지역 기반 중고거래)',
    features: [
      { name: '중고 물품 등록', desc: '사진, 설명, 가격, 카테고리, 거래 방식', must: true },
      { name: '위치 기반 피드', desc: 'GPS 기반 동네 설정, 주변 매물 노출', must: true },
      { name: '1:1 채팅', desc: '판매자-구매자 실시간 대화, 가격 흥정', must: true },
      { name: '매너 온도/프로필', desc: '거래 평가 기반 신뢰도 점수', must: true },
      { name: '검색/필터', desc: '키워드, 카테고리, 가격대, 거리 필터', must: false },
      { name: '찜/관심 목록', desc: '관심 상품 저장, 가격 변동 알림', must: false },
      { name: '동네 인증', desc: 'GPS 기반 거주지 인증', must: false },
      { name: '동네생활 (커뮤니티)', desc: '동네 게시판, 정보 공유', must: false },
      { name: '안전결제', desc: '택배 거래 시 에스크로 결제', must: false },
      { name: '푸시 알림', desc: '채팅, 관심상품, 키워드 알림', must: false },
      { name: '신고/차단', desc: '사기 의심 신고, 비매너 사용자 차단', must: false },
    ],
  },
  '에어비앤비': {
    label: '에어비앤비 (숙소 예약 플랫폼)',
    features: [
      { name: '숙소 등록/관리', desc: '호스트가 사진, 설명, 가격, 규칙, 가용일 관리', must: true },
      { name: '예약 시스템', desc: '날짜 선택, 실시간 가용성, 즉시/승인 예약', must: true },
      { name: '결제/환불', desc: 'PG 연동, 호스트 정산, 환불 정책 적용', must: true },
      { name: '검색/지도', desc: '위치·날짜·인원·가격 필터, 지도 기반 탐색', must: true },
      { name: '호스트-게스트 메시지', desc: '예약 전후 1:1 채팅', must: false },
      { name: '리뷰/별점', desc: '숙소·호스트·게스트 상호 평가', must: false },
      { name: '위시리스트', desc: '관심 숙소 저장, 공유', must: false },
      { name: '호스트 대시보드', desc: '예약 관리, 수익 통계, 캘린더', must: false },
      { name: '알림', desc: '예약 확인, 메시지, 리뷰 알림', must: false },
      { name: '슈퍼호스트 배지', desc: '우수 호스트 인증 시스템', must: false },
    ],
  },
  '클래스101': {
    label: '클래스101 (온라인 클래스 플랫폼)',
    features: [
      { name: '강의 영상 스트리밍', desc: '동영상 플레이어, 배속, 이어보기, 챕터', must: true },
      { name: '수강 관리', desc: '수강신청, 진도율 추적, 수료증', must: true },
      { name: '결제/구독', desc: '단건 구매, 올클래스 구독, 쿠폰', must: true },
      { name: '크리에이터 스튜디오', desc: '강사 강의 등록, 수익 관리', must: true },
      { name: '키트(재료) 배송', desc: '수강에 필요한 재료 키트 주문/배송', must: false },
      { name: '커뮤니티/댓글', desc: '강의별 질문, 수강생 소통', must: false },
      { name: '리뷰/별점', desc: '강의 후기, 평점', must: false },
      { name: '검색/카테고리', desc: '분야별 강의 탐색, 추천', must: false },
      { name: '알림', desc: '새 강의, 할인, 댓글 알림', must: false },
      { name: '챌린지/미션', desc: '학습 동기부여 미션, 인증', must: false },
    ],
  },
  '토스': {
    label: '토스 (금융 슈퍼앱)',
    features: [
      { name: '간편 송금', desc: '계좌번호/연락처로 즉시 송금', must: true },
      { name: '내 계좌 조회', desc: '전 금융사 계좌/카드/대출 통합 조회', must: true },
      { name: '결제', desc: 'QR/바코드 결제, 온라인 결제', must: true },
      { name: '본인 인증', desc: '생체인증, PIN, 공동인증서', must: true },
      { name: '소비 분석', desc: '카테고리별 지출 통계, 예산 관리', must: false },
      { name: '투자', desc: '주식, 펀드, 가상화폐 매매', must: false },
      { name: '대출 비교', desc: '금리 비교, 비대면 대출 신청', must: false },
      { name: '보험', desc: '보험 분석, 추천, 가입', must: false },
      { name: '알림', desc: '입출금, 결제, 이벤트 알림', must: false },
      { name: '이벤트/혜택', desc: '포인트, 만보기, 행운퀴즈', must: false },
    ],
  },
  '야놀자': {
    label: '야놀자 (숙소/레저 예약)',
    features: [
      { name: '숙소 예약', desc: '호텔/펜션/모텔 날짜·인원별 검색 및 예약', must: true },
      { name: '결제/환불', desc: '선결제, 현장결제, 취소/환불 정책', must: true },
      { name: '숙소 상세/사진', desc: '객실 정보, 어메니티, 사진 갤러리', must: true },
      { name: '검색/필터', desc: '지역, 날짜, 가격, 평점, 부대시설 필터', must: true },
      { name: '리뷰/별점', desc: '숙박 후기, 사진 리뷰', must: false },
      { name: '쿠폰/할인', desc: '특가, 쿠폰, 포인트 적립', must: false },
      { name: '레저/액티비티 예약', desc: '워터파크, 스파, 체험 예약', must: false },
      { name: '찜/위시리스트', desc: '관심 숙소 저장', must: false },
      { name: '알림', desc: '예약 확인, 체크인 안내, 프로모션', must: false },
      { name: '업주 관리 시스템', desc: '객실 관리, 예약 현황, 정산', must: false },
    ],
  },
  '크몽': {
    label: '크몽 (프리랜서 서비스 마켓)',
    features: [
      { name: '서비스(전문가 상품) 등록', desc: '프리랜서가 서비스 설명/가격/옵션 등록', must: true },
      { name: '주문/구매', desc: '서비스 선택, 옵션, 결제', must: true },
      { name: '에스크로 결제', desc: '작업 완료 확인 후 정산', must: true },
      { name: '1:1 상담 채팅', desc: '구매 전/후 의뢰인-전문가 대화', must: true },
      { name: '전문가 프로필/포트폴리오', desc: '경력, 작업물, 평점, 판매 실적', must: true },
      { name: '리뷰/별점', desc: '거래 완료 후 서비스 평가', must: false },
      { name: '검색/카테고리', desc: '분야별 서비스 탐색, 키워드 검색', must: false },
      { name: '알림', desc: '주문, 메시지, 작업 상태 알림', must: false },
      { name: '정산 시스템', desc: '수수료 차감, 출금 관리', must: false },
      { name: '분쟁/환불 처리', desc: '작업물 불만 시 중재 절차', must: false },
    ],
  },
  '오늘의집': {
    label: '오늘의집 (인테리어 커머스+커뮤니티)',
    features: [
      { name: '인테리어 콘텐츠 피드', desc: '사진/영상 인테리어 사례 공유', must: true },
      { name: '상품 커머스', desc: '가구/소품 판매, 장바구니, 결제', must: true },
      { name: '검색/필터', desc: '스타일, 공간, 가격별 상품/콘텐츠 탐색', must: true },
      { name: '리뷰/별점', desc: '상품 리뷰, 포토 리뷰', must: false },
      { name: '스크랩/북마크', desc: '사진, 상품 저장', must: false },
      { name: '시공 전문가 매칭', desc: '인테리어 시공업체 견적, 매칭', must: false },
      { name: '집들이 게시판', desc: '사용자 인테리어 후기 커뮤니티', must: false },
      { name: '3D 인테리어', desc: '공간 시뮬레이션', must: false },
      { name: '알림', desc: '할인, 배송, 새 콘텐츠 알림', must: false },
    ],
  },
  '번개장터': {
    label: '번개장터 (중고거래 마켓)',
    features: [
      { name: '상품 등록', desc: '사진, 설명, 가격, 카테고리, 상태', must: true },
      { name: '검색/필터', desc: '키워드, 카테고리, 가격대, 상태 필터', must: true },
      { name: '1:1 채팅', desc: '판매자-구매자 흥정, 거래 약속', must: true },
      { name: '번개페이 (안전결제)', desc: '에스크로 결제, 택배/직거래', must: true },
      { name: '리뷰/평점', desc: '거래 후 판매자 평가', must: false },
      { name: '찜/알림', desc: '관심 상품, 가격 변동 알림', must: false },
      { name: '택배 연동', desc: '배송 조회, 송장 입력', must: false },
      { name: '신고/차단', desc: '사기 방지, 비매너 신고', must: false },
    ],
  },
};
// ── 별명(alias) 매핑: 축약어, 영문명 등 ──
// 배달
KNOWN_SERVICES['배민'] = KNOWN_SERVICES['배달의민족'];
KNOWN_SERVICES['baemin'] = KNOWN_SERVICES['배달의민족'];
// 중고거래
KNOWN_SERVICES['당근'] = KNOWN_SERVICES['당근마켓'];
KNOWN_SERVICES['daangn'] = KNOWN_SERVICES['당근마켓'];
KNOWN_SERVICES['번장'] = KNOWN_SERVICES['번개장터'];
// 숙소/여행
KNOWN_SERVICES['airbnb'] = KNOWN_SERVICES['에어비앤비'];
KNOWN_SERVICES['에어비엔비'] = KNOWN_SERVICES['에어비앤비'];
KNOWN_SERVICES['야놀자'] = KNOWN_SERVICES['야놀자']; // 이미 있지만 명시
// 교육
KNOWN_SERVICES['클래스'] = KNOWN_SERVICES['클래스101'];
KNOWN_SERVICES['class101'] = KNOWN_SERVICES['클래스101'];
// 금융
KNOWN_SERVICES['toss'] = KNOWN_SERVICES['토스'];
// 프리랜서 마켓
KNOWN_SERVICES['kmong'] = KNOWN_SERVICES['크몽'];
// 인테리어
KNOWN_SERVICES['오집'] = KNOWN_SERVICES['오늘의집'];
// 위시켓 관련
KNOWN_SERVICES['wishket'] = KNOWN_SERVICES['위시켓'];

// ── 추가 유명 서비스 DB ──
KNOWN_SERVICES['숨고'] = {
  label: '숨고 (전문가 매칭 플랫폼)',
  features: [
    { name: '고수 프로필/포트폴리오', desc: '전문가 경력, 작업 사진, 자격증, 리뷰', must: true },
    { name: '견적 요청 폼', desc: '서비스 종류별 맞춤 견적 요청 양식', must: true },
    { name: '자동 매칭/견적 발송', desc: '요청 조건에 맞는 고수에게 자동 견적 요청', must: true },
    { name: '1:1 채팅', desc: '고객-고수 직접 상담, 파일 공유', must: true },
    { name: '결제', desc: 'PG 연동, 서비스 비용 결제', must: true },
    { name: '리뷰/평점', desc: '서비스 완료 후 별점+텍스트 리뷰', must: false },
    { name: '카테고리/검색', desc: '서비스 분야별 탐색, 키워드 검색', must: false },
    { name: '알림', desc: '견적 도착, 채팅, 예약 알림', must: false },
    { name: '고수 랭킹', desc: '분야별 상위 고수 노출', must: false },
    { name: '정산 시스템', desc: '고수 수수료 차감, 정산 관리', must: false },
  ],
};
KNOWN_SERVICES['soomgo'] = KNOWN_SERVICES['숨고'];
KNOWN_SERVICES['탈잉'] = {
  label: '탈잉 (취미/실무 클래스 플랫폼)',
  features: [
    { name: '클래스 등록/관리', desc: '튜터가 클래스 설명, 일정, 가격 등록', must: true },
    { name: '예약/수강신청', desc: '일정 선택, 인원 확인, 결제', must: true },
    { name: '결제/환불', desc: 'PG 연동, 취소/환불 정책 적용', must: true },
    { name: '튜터 프로필', desc: '경력, 리뷰, 개설 클래스 목록', must: true },
    { name: '리뷰/별점', desc: '수강 후기, 사진 리뷰', must: false },
    { name: '검색/카테고리', desc: '지역, 분야, 일정별 클래스 탐색', must: false },
    { name: '1:1 문의', desc: '튜터에게 직접 질문', must: false },
    { name: '알림', desc: '수업 리마인더, 새 클래스 알림', must: false },
    { name: '정산', desc: '튜터 수수료 차감, 정산 주기', must: false },
  ],
};
KNOWN_SERVICES['무신사'] = {
  label: '무신사 (패션 커머스)',
  features: [
    { name: '상품 등록/관리', desc: '상품 정보, 이미지, 사이즈, 재고 관리', must: true },
    { name: '장바구니/결제', desc: '장바구니, PG 결제, 간편결제', must: true },
    { name: '검색/필터', desc: '브랜드, 카테고리, 가격, 사이즈 필터', must: true },
    { name: '주문/배송 관리', desc: '주문 상태, 배송 추적, 교환/환불', must: true },
    { name: '리뷰/스타일링', desc: '상품 리뷰, 코디 사진 공유', must: false },
    { name: '쿠폰/포인트', desc: '할인 쿠폰, 적립금, 등급별 혜택', must: false },
    { name: '매거진/콘텐츠', desc: '패션 매거진, 스타일 가이드', must: false },
    { name: '브랜드 스토어', desc: '브랜드별 전용 페이지', must: false },
    { name: '찜/위시리스트', desc: '관심 상품 저장, 가격 변동 알림', must: false },
  ],
};
KNOWN_SERVICES['musinsa'] = KNOWN_SERVICES['무신사'];

// ── 2) 키워드→기능 원자 DB: 문장에서 키워드가 발견되면 해당 기능 추가 ──
interface FeatureAtom { name: string; desc: string; priority: number } // priority: 낮을수록 필수에 가까움
const FEATURE_KEYWORDS: [string[], FeatureAtom][] = [
  // 매칭/중개 관련
  [['매칭', '연결', '중개', '마켓플레이스'], { name: '매칭 알고리즘', desc: '조건 기반 공급자-수요자 자동 매칭', priority: 1 }],
  [['프리랜서', '외주', '개발자 찾기', '전문가'], { name: '전문가 프로필/포트폴리오', desc: '경력, 기술 스택, 과거 작업물 표시', priority: 1 }],
  [['프리랜서', '외주', '의뢰', '프로젝트 등록'], { name: '프로젝트/의뢰 등록', desc: '요구사항, 예산, 기간 작성하여 등록', priority: 1 }],
  [['지원', '제안', '견적', '입찰'], { name: '지원서/견적 제출', desc: '프로젝트에 대한 제안서, 견적 제출 기능', priority: 1 }],
  // 결제/정산
  [['결제', '구매', '과금', '유료'], { name: '결제 시스템', desc: 'PG 연동 (카드/간편결제/계좌이체)', priority: 1 }],
  [['에스크로', '안전결제', '안전거래'], { name: '에스크로 안전결제', desc: '작업/거래 완료 확인 후 대금 정산', priority: 1 }],
  [['정산', '수수료', '수익'], { name: '정산 시스템', desc: '판매자/공급자 수수료 계산, 정산 주기 관리', priority: 2 }],
  [['구독', '멤버십', '월정액'], { name: '구독/과금', desc: '플랜별 과금, 정기 결제, 해지', priority: 1 }],
  // 커뮤니케이션
  [['채팅', '메시지', '대화', '문의'], { name: '1:1 채팅/메시지', desc: '실시간 대화, 파일 공유, 읽음 확인', priority: 1 }],
  [['알림', '푸시', '노티'], { name: '알림 시스템', desc: '푸시/인앱/이메일 알림, 설정 관리', priority: 2 }],
  // 사용자 관리
  [['회원', '로그인', '가입'], { name: '회원/로그인', desc: '소셜 로그인(카카오/네이버/구글), 프로필', priority: 1 }],
  [['관리자', '백오피스', '어드민'], { name: '관리자 대시보드', desc: '유저, 콘텐츠, 주문, 통계 관리', priority: 2 }],
  [['역할', '권한', '공급자', '수요자'], { name: '역할 분리 시스템', desc: '사용자 유형별 (공급/수요/관리) 별도 화면·권한', priority: 1 }],
  // 리뷰/평가
  [['리뷰', '별점', '평가', '후기'], { name: '리뷰/평판 시스템', desc: '거래·서비스 완료 후 별점+텍스트 평가', priority: 2 }],
  // 검색/탐색
  [['검색', '필터', '탐색', '찾기'], { name: '검색/필터', desc: '키워드 검색, 다중 조건 필터, 정렬', priority: 2 }],
  // 콘텐츠/게시
  [['게시판', '커뮤니티', '피드', '글'], { name: '게시판/커뮤니티', desc: '글 작성, 댓글, 좋아요, 이미지 첨부', priority: 2 }],
  [['콘텐츠', '블로그', '뉴스', '기사'], { name: '콘텐츠 관리(CMS)', desc: '콘텐츠 등록, 에디터, 카테고리, 태그', priority: 2 }],
  // 배달/물류
  [['배달', '배송', '택배', '물류'], { name: '배달/배송 추적', desc: '실시간 위치 추적, 배송 상태 관리', priority: 1 }],
  [['라이더', '배차', '기사'], { name: '배차/라이더 매칭', desc: '주문별 배달원 자동/수동 배정', priority: 1 }],
  // 위치/지도
  [['지도', '위치', 'GPS', '길찾기'], { name: '지도/위치 서비스', desc: 'GPS 현재 위치, 장소 검색, 경로 안내', priority: 2 }],
  // 예약
  [['예약', '부킹', '스케줄'], { name: '예약 시스템', desc: '캘린더 기반 날짜/시간 선택, 실시간 가용성', priority: 1 }],
  // 쇼핑/커머스
  [['상품', '판매', '쇼핑', '구매', '커머스'], { name: '상품 등록/관리', desc: '상품 정보, 이미지, 옵션, 재고, 가격', priority: 1 }],
  [['장바구니', '카트'], { name: '장바구니', desc: '상품 담기, 수량 변경, 합계 계산', priority: 2 }],
  [['주문', '주문관리'], { name: '주문 관리', desc: '주문 접수, 상태 변경, 취소/환불', priority: 1 }],
  [['쿠폰', '할인', '프로모션', '이벤트'], { name: '쿠폰/프로모션', desc: '할인 쿠폰, 적립금, 이벤트 관리', priority: 3 }],
  // 교육/학습
  [['강의', '수강', '학습', '교육', '인강'], { name: '강의/학습 관리', desc: '영상 스트리밍, 진도율, 수료증', priority: 1 }],
  [['과제', '퀴즈', '시험'], { name: '과제/퀴즈', desc: '과제 제출, 자동 채점, 퀴즈', priority: 2 }],
  // AI
  [['ai', '인공지능', 'gpt', '챗봇', 'llm'], { name: 'AI 처리 엔진', desc: 'AI/ML 모델 연동, 자동 분석/생성', priority: 1 }],
  // 대시보드/분석
  [['대시보드', '통계', '분석', '리포트'], { name: '대시보드/통계', desc: 'KPI 시각화, 차트, 리포트 다운로드', priority: 2 }],
  // 찜/위시리스트
  [['찜', '즐겨찾기', '위시리스트', '관심'], { name: '찜/위시리스트', desc: '관심 항목 저장, 변동 알림', priority: 3 }],
  // 신고/안전
  [['신고', '차단', '분쟁', '중재'], { name: '신고/분쟁 처리', desc: '악성 사용자 신고, 분쟁 중재 절차', priority: 3 }],
  // SaaS 특화
  [['팀', '워크스페이스', '조직', '멤버'], { name: '팀/워크스페이스 관리', desc: '조직 생성, 멤버 초대, 권한 설정', priority: 1 }],
  [['api', '연동', '웹훅', '플러그인'], { name: 'API/외부 연동', desc: 'REST API, 웹훅, 서드파티 연동', priority: 2 }],
  // 중고거래
  [['중고', '중고거래', '리셀', '판매'], { name: '중고 물품 등록', desc: '사진, 설명, 가격, 상태 등록', priority: 1 }],
  [['직거래', '택배거래'], { name: '거래 방식 선택', desc: '직거래(위치 약속) / 택배거래(안전결제)', priority: 2 }],
  // 숙소/여행
  [['숙소', '호텔', '펜션', '모텔', '숙박'], { name: '숙소 등록/관리', desc: '숙소 정보, 사진, 가격, 가용일 관리', priority: 1 }],
  [['체크인', '체크아웃'], { name: '체크인/체크아웃 관리', desc: '무인 체크인, 키 관리, 규칙 안내', priority: 2 }],
  // 건강/운동
  [['운동', '헬스', '피트니스', '트레이닝'], { name: '운동/건강 기록', desc: '운동 루틴, 기록, 통계, 목표 관리', priority: 1 }],
  [['진료', '의료', '병원'], { name: '진료 예약/관리', desc: '의사 선택, 진료 예약, 진료 기록', priority: 1 }],
  // 소셜/SNS
  [['sns', '소셜', '팔로우', '피드'], { name: '소셜 피드', desc: '게시물 작성, 좋아요, 댓글, 팔로우', priority: 1 }],
  [['스토리', '숏폼', '릴스'], { name: '스토리/숏폼 콘텐츠', desc: '짧은 영상/사진 콘텐츠 업로드', priority: 2 }],
];

// ── NEW: 컨텍스트 패턴 인터페이스 ──
interface ContextPattern {
  triggers: string[];
  features: FeatureAtom[];
  suppressKeywords: string[];
}

// ── NEW: 컨텍스트 패턴 데이터베이스 ──
const CONTEXT_PATTERNS: ContextPattern[] = [
  // 챗봇 / AI 서비스 (최우선 매칭)
  {
    triggers: ['챗봇', 'chatbot', 'ai 챗봇', '인공지능 챗봇', '대화형 ai', 'ai 상담', '자동 상담', 'ai 서비스', 'gpt', 'llm', '인공지능 서비스'],
    features: [
      { name: 'AI 챗봇 엔진', desc: '자연어 이해(NLU) 기반 대화 처리, 의도 분석, 시나리오 설계', priority: 1 },
      { name: '대화 시나리오 관리', desc: '질문-응답 흐름 설계, 분기 처리, 폴백 응답', priority: 1 },
      { name: 'AI 모델 연동(API)', desc: 'OpenAI/Claude 등 LLM API 연동, 프롬프트 관리', priority: 1 },
      { name: '대화 이력 관리', desc: '사용자별 대화 기록 저장, 컨텍스트 유지', priority: 1 },
      { name: '관리자 대시보드', desc: '대화 통계, 응답 정확도, 사용량 모니터링', priority: 2 },
      { name: '사용자 인증', desc: '회원가입/로그인, 사용자별 대화 관리', priority: 2 },
      { name: '피드백/학습 데이터', desc: '사용자 피드백 수집, AI 응답 품질 개선 데이터', priority: 2 },
      { name: '멀티채널 연동', desc: '웹, 카카오톡, 슬랙 등 다양한 채널 연동', priority: 3 },
    ],
    suppressKeywords: ['상품', '판매', '쇼핑', '구매', '커머스', '장바구니', '배달', '배송', '주문'],
  },
  // FAQ / 자주 묻는 질문 자동화
  {
    triggers: ['자주 물어보는', '자주 묻는', 'faq', '자동 응답', '자동 답변', '문의 자동', '반복 문의', '반복되는 질문', '자주 오는 질문'],
    features: [
      { name: 'FAQ 자동응답 시스템', desc: '자주 묻는 질문 등록, 카테고리별 분류, 키워드 기반 자동 답변', priority: 1 },
      { name: 'AI 챗봇', desc: '자연어 이해 기반 고객 질문 자동 응답, 시나리오 설계', priority: 1 },
      { name: '고객 문의 관리', desc: '문의 접수, 상태 추적, 담당자 배정, 답변 템플릿', priority: 1 },
      { name: '카테고리별 FAQ 관리', desc: '상품/배송/교환 등 카테고리별 FAQ 등록 및 관리', priority: 2 },
      { name: '문의 통계/분석', desc: '자주 묻는 질문 유형 분석, 응답률, 처리 시간 통계', priority: 2 },
    ],
    suppressKeywords: ['문의', '대화', '메시지'],
  },
  // 고객 상담/CS 센터
  {
    triggers: ['고객 상담', '고객 센터', 'cs센터', 'cs 센터', '상담 시스템', '상담원', '콜센터', '고객 지원', '고객 응대'],
    features: [
      { name: '고객 상담 시스템', desc: '실시간 상담, 상담 이력, 상담원 배정, 상담 카테고리', priority: 1 },
      { name: '상담 티켓 관리', desc: '문의 접수→처리→완료 워크플로우, SLA 관리', priority: 1 },
      { name: '상담 채널 통합', desc: '전화, 채팅, 이메일 등 멀티채널 상담 통합 관리', priority: 2 },
      { name: '상담 통계/리포트', desc: '상담 유형, 처리 시간, 만족도 통계', priority: 2 },
      { name: 'FAQ/자동 응답', desc: '반복 문의 자동 처리, 셀프서비스 가이드', priority: 2 },
    ],
    suppressKeywords: ['채팅', '메시지', '대화'],
  },
  // 예약 + 일정 관리 (단순 예약 키워드와 다름)
  {
    triggers: ['예약 관리', '예약 시스템', '일정 관리', '스케줄 관리', '예약 받', '온라인 예약'],
    features: [
      { name: '예약 캘린더', desc: '날짜/시간별 가용성 확인, 실시간 예약', priority: 1 },
      { name: '예약 알림/리마인더', desc: '예약 확인, 변경, 취소 알림, 리마인더 발송', priority: 1 },
      { name: '예약 대시보드', desc: '일별/주별/월별 예약 현황, 통계', priority: 2 },
      { name: '고객 관리(CRM)', desc: '예약 고객 정보, 방문 이력, 메모', priority: 2 },
      { name: '결제/선결제', desc: '예약 시 선결제, 노쇼 방지 보증금', priority: 2 },
    ],
    suppressKeywords: ['예약', '부킹', '스케줄'],
  },
  // 주문/배달 시스템 (음식점, 카페 등)
  {
    triggers: ['주문 받', '주문 시스템', '배달 주문', '온라인 주문', '모바일 주문', '테이블 주문', '포장 주문'],
    features: [
      { name: '메뉴/상품 관리', desc: '메뉴 등록, 가격 설정, 품절 관리, 옵션 설정', priority: 1 },
      { name: '온라인 주문', desc: '메뉴 선택, 옵션 선택, 장바구니, 결제', priority: 1 },
      { name: '주문 접수/관리', desc: '실시간 주문 알림, 접수/조리/완료 상태 관리', priority: 1 },
      { name: '배달/포장 관리', desc: '배달/포장/매장식사 선택, 배달 추적', priority: 2 },
      { name: '매출 통계', desc: '일별/월별 매출, 인기 메뉴, 주문 통계', priority: 2 },
    ],
    suppressKeywords: ['주문', '배달', '상품', '판매'],
  },
  // 콘텐츠 구독/멤버십
  {
    triggers: ['구독 서비스', '멤버십 서비스', '유료 콘텐츠', '프리미엄 콘텐츠', '구독형', '월정액 서비스'],
    features: [
      { name: '구독 플랜 관리', desc: '무료/베이직/프리미엄 등급, 가격, 혜택 설정', priority: 1 },
      { name: '콘텐츠 접근 제어', desc: '등급별 콘텐츠 열람 권한, 미리보기', priority: 1 },
      { name: '정기 결제', desc: '자동 갱신, 결제 수단 관리, 해지', priority: 1 },
      { name: '콘텐츠 관리(CMS)', desc: '콘텐츠 등록, 에디터, 카테고리, 태그', priority: 2 },
      { name: '이용 통계', desc: '구독자 현황, 이탈률, 인기 콘텐츠 분석', priority: 2 },
    ],
    suppressKeywords: ['구독', '멤버십', '월정액', '콘텐츠'],
  },
  // 매칭/중개 플랫폼
  {
    triggers: ['매칭 플랫폼', '중개 플랫폼', '연결해주는', '매칭 서비스', '연결 서비스', '중개 서비스', '공급자와 수요자'],
    features: [
      { name: '매칭 알고리즘', desc: '조건 기반 공급자-수요자 자동 매칭, 추천', priority: 1 },
      { name: '프로필/포트폴리오', desc: '공급자 프로필, 경력, 작업물, 인증', priority: 1 },
      { name: '견적/제안 시스템', desc: '요청서 작성, 견적 수신, 비교', priority: 1 },
      { name: '리뷰/평가', desc: '거래 완료 후 상호 평가, 별점', priority: 2 },
      { name: '에스크로 결제', desc: '작업 완료 확인 후 대금 정산', priority: 2 },
    ],
    suppressKeywords: ['매칭', '연결', '중개'],
  },
  // 사내 업무 도구 / 내부 시스템
  {
    triggers: ['사내 시스템', '내부 시스템', '업무 도구', '사내 도구', '그룹웨어', '인트라넷', '업무 관리', '백오피스'],
    features: [
      { name: '직원 관리', desc: '직원 정보, 조직도, 권한 관리', priority: 1 },
      { name: '업무 관리(태스크)', desc: '할 일 등록, 배정, 상태 추적, 기한 관리', priority: 1 },
      { name: '결재/승인 시스템', desc: '전자결재, 승인 워크플로우, 이력 관리', priority: 1 },
      { name: '공지/게시판', desc: '사내 공지, 자료 공유, 의견 게시판', priority: 2 },
      { name: '근태/출퇴근', desc: '출퇴근 기록, 휴가 신청, 근무 통계', priority: 2 },
    ],
    suppressKeywords: ['관리자', '팀', '조직'],
  },
  // 커뮤니티/포럼
  {
    triggers: ['커뮤니티 사이트', '커뮤니티 플랫폼', '포럼', '동호회', '모임 사이트', '팬 커뮤니티', '사용자 커뮤니티'],
    features: [
      { name: '게시판/포럼', desc: '카테고리별 게시판, 글 작성, 댓글, 대댓글', priority: 1 },
      { name: '회원 등급/포인트', desc: '활동 기반 등급, 포인트 적립, 뱃지', priority: 1 },
      { name: '채팅/DM', desc: '회원 간 1:1 메시지, 그룹 채팅', priority: 2 },
      { name: '검색', desc: '게시글 검색, 태그, 필터', priority: 2 },
      { name: '신고/관리', desc: '부적절 콘텐츠 신고, 관리자 모더레이션', priority: 2 },
    ],
    suppressKeywords: ['게시판', '커뮤니티', '피드'],
  },
  // 쇼핑몰 / 자사몰
  {
    triggers: ['쇼핑몰', '자사몰', '온라인 스토어', '온라인몰', '인터넷 쇼핑몰', '브랜드몰'],
    features: [
      { name: '상품 등록/관리', desc: '상품 정보, 이미지, 옵션(사이즈/색상), 재고', priority: 1 },
      { name: '장바구니/결제', desc: '장바구니, PG 결제(카드/간편결제/계좌이체)', priority: 1 },
      { name: '주문/배송 관리', desc: '주문 접수, 배송 추적, 교환/환불', priority: 1 },
      { name: '회원/등급', desc: '회원가입, 등급별 혜택, 적립금', priority: 2 },
      { name: '리뷰/상품 후기', desc: '구매 후기, 포토 리뷰, 별점', priority: 2 },
      { name: '쿠폰/프로모션', desc: '할인 쿠폰, 기획전, 이벤트', priority: 3 },
    ],
    suppressKeywords: ['상품', '판매', '쇼핑', '구매', '커머스', '장바구니'],
  },
  // 포트폴리오/브랜딩 사이트
  {
    triggers: ['포트폴리오 사이트', '브랜드 사이트', '회사 소개', '기업 소개', '홍보 사이트', '회사 홈페이지'],
    features: [
      { name: '서비스/제품 소개', desc: '핵심 서비스, 제품 라인업, 특장점 페이지', priority: 1 },
      { name: '회사 소개', desc: '비전, 연혁, 팀 소개, 오시는 길', priority: 1 },
      { name: '포트폴리오/사례', desc: '프로젝트 사례, 고객사, 성과 갤러리', priority: 1 },
      { name: '문의/상담 신청', desc: '문의 폼, 상담 예약, 연락처', priority: 2 },
      { name: '뉴스/블로그', desc: '회사 소식, 인사이트, SEO 콘텐츠', priority: 2 },
    ],
    suppressKeywords: ['게시판', '커뮤니티'],
  },
];

// ── NEW: 비즈니스 도메인 인터페이스 ──
interface BusinessDomain {
  triggers: string[];
  domainName: string;
  additionalFeatures: FeatureAtom[];
}

// ── NEW: 비즈니스 도메인 데이터베이스 ──
const BUSINESS_DOMAINS: BusinessDomain[] = [
  {
    triggers: ['수영복', '의류', '패션', '옷', '신발', '가방', '액세서리', '뷰티', '화장품'],
    domainName: '패션/뷰티',
    additionalFeatures: [
      { name: '사이즈 가이드', desc: '사이즈 표, 체형별 추천, 실측 정보', priority: 2 },
      { name: '상품 문의 게시판', desc: '상품별 Q&A, 재입고 알림', priority: 2 },
      { name: '코디/스타일링', desc: '관련 상품 추천, 코디 제안', priority: 3 },
    ],
  },
  {
    triggers: ['음식점', '카페', '식당', '레스토랑', '베이커리', '치킨', '피자', '배달'],
    domainName: '요식업',
    additionalFeatures: [
      { name: '메뉴 관리', desc: '메뉴 등록, 가격, 사진, 품절 관리', priority: 1 },
      { name: '영업시간 관리', desc: '요일별 영업시간, 임시 휴무, 공휴일 설정', priority: 2 },
      { name: '테이블/좌석 관리', desc: '테이블 배치, 예약 관리, 대기열', priority: 2 },
    ],
  },
  {
    triggers: ['병원', '의원', '클리닉', '치과', '한의원', '의료', '진료', '피부과'],
    domainName: '의료/헬스케어',
    additionalFeatures: [
      { name: '진료 예약', desc: '의사별 진료 스케줄, 온라인 예약', priority: 1 },
      { name: '환자 관리', desc: '환자 정보, 진료 이력, 차트', priority: 1 },
      { name: '진료 안내', desc: '진료과목, 의료진 소개, 진료 절차 안내', priority: 2 },
    ],
  },
  {
    triggers: ['학원', '교습소', '과외', '학습', '교육', '강의', '수업', '수강'],
    domainName: '교육',
    additionalFeatures: [
      { name: '수강 관리', desc: '수강 신청, 반 배정, 출석 관리', priority: 1 },
      { name: '학습 콘텐츠', desc: '강의 영상, 자료 배포, 과제', priority: 1 },
      { name: '학부모 알림', desc: '출석, 성적, 공지 알림', priority: 2 },
    ],
  },
  {
    triggers: ['부동산', '중개', '매물', '임대', '월세', '전세', '아파트'],
    domainName: '부동산',
    additionalFeatures: [
      { name: '매물 등록/관리', desc: '매물 정보, 사진, 가격, 위치', priority: 1 },
      { name: '매물 검색/필터', desc: '지역, 가격, 평수, 유형별 검색', priority: 1 },
      { name: '방문 예약', desc: '매물 방문 일정 잡기, 중개사 매칭', priority: 2 },
    ],
  },
  {
    triggers: ['업체', '회사', 'b2b', '기업', '비즈니스', '사업', '사업자'],
    domainName: '비즈니스(B2B/B2C)',
    additionalFeatures: [
      { name: '고객 문의 관리', desc: '문의 접수, 답변, 이력 관리', priority: 2 },
      { name: '관리자 대시보드', desc: '주요 지표, 현황 모니터링', priority: 2 },
    ],
  },
  {
    triggers: ['미용실', '헤어', '네일', '속눈썹', '왁싱', '마사지', '스파', '에스테틱'],
    domainName: '뷰티/웰니스',
    additionalFeatures: [
      { name: '시술/서비스 메뉴', desc: '시술 종류, 가격, 소요 시간, 사진', priority: 1 },
      { name: '디자이너/시술사 프로필', desc: '경력, 포트폴리오, 리뷰', priority: 2 },
      { name: '예약 관리', desc: '시간대별 예약, 디자이너 지정 예약', priority: 1 },
    ],
  },
  {
    triggers: ['펫', '반려동물', '강아지', '고양이', '동물', '펫시터', '동물병원'],
    domainName: '반려동물',
    additionalFeatures: [
      { name: '반려동물 프로필', desc: '반려동물 정보, 건강 기록, 사진', priority: 2 },
      { name: '서비스 예약', desc: '미용, 호텔, 산책 등 서비스 예약', priority: 1 },
    ],
  },
];

/**
 * v16: 컨텍스트 인식 기반 기능 추천 엔진
 * 4단계 분석: 유명 서비스 매칭 → 컨텍스트 패턴 → 비즈니스 도메인 → 키워드 원자 조합
 */
function getServiceFeatures(overviewText: string): { label: string; features: SelectableFeature[] } | null {
  const t = overviewText.toLowerCase().trim();
  if (!t || t.length < 2) return null;

  // ── Step 1: 유명 서비스명 매칭 (가장 우선) ──
  for (const [serviceName, data] of Object.entries(KNOWN_SERVICES)) {
    if (data.features.length === 0) continue;
    if (t.includes(serviceName.toLowerCase()) || t.includes(serviceName)) {
      return {
        label: data.label,
        features: data.features.map(f => ({
          name: f.name,
          desc: f.desc,
          category: f.must ? 'must' as const : 'recommended' as const,
        })),
      };
    }
  }

  // ── Step 2: 컨텍스트 패턴 매칭 (복합 구문 우선) ──
  const matchedPatterns: { pattern: ContextPattern; matchCount: number }[] = [];
  const suppressedKeywords = new Set<string>();

  for (const pattern of CONTEXT_PATTERNS) {
    let matchCount = 0;
    for (const trigger of pattern.triggers) {
      if (t.includes(trigger.toLowerCase())) matchCount++;
    }
    if (matchCount > 0) {
      matchedPatterns.push({ pattern, matchCount });
      // Suppress individual keywords that would give wrong results
      for (const kw of pattern.suppressKeywords) {
        suppressedKeywords.add(kw.toLowerCase());
      }
    }
  }

  // Sort by match count (more trigger matches = more relevant)
  matchedPatterns.sort((a, b) => b.matchCount - a.matchCount);

  // ── Step 3: 비즈니스 도메인 감지 ──
  const matchedDomains: BusinessDomain[] = [];
  for (const domain of BUSINESS_DOMAINS) {
    for (const trigger of domain.triggers) {
      if (t.includes(trigger.toLowerCase())) {
        matchedDomains.push(domain);
        break;
      }
    }
  }

  // ── Step 4: 키워드 원자 매칭 (suppressed 키워드 제외) ──
  const keywordMatched: Map<string, { feat: FeatureAtom; matchCount: number }> = new Map();

  for (const [keywords, feat] of FEATURE_KEYWORDS) {
    let matchCount = 0;
    let allSuppressed = true;
    for (const kw of keywords) {
      if (t.includes(kw.toLowerCase())) {
        matchCount++;
        if (!suppressedKeywords.has(kw.toLowerCase())) {
          allSuppressed = false;
        }
      }
    }
    // Only add if has matches AND not all matched keywords are suppressed
    if (matchCount > 0 && !allSuppressed) {
      const existing = keywordMatched.get(feat.name);
      if (!existing || matchCount > existing.matchCount) {
        keywordMatched.set(feat.name, { feat, matchCount });
      }
    }
  }

  // ── Combine all results ──
  const allFeatures: Map<string, { feat: SelectableFeature; score: number }> = new Map();

  // Context pattern features get highest score (100 + matchCount)
  for (const { pattern, matchCount } of matchedPatterns) {
    for (const feat of pattern.features) {
      const existing = allFeatures.get(feat.name);
      const score = 100 + matchCount * 10 - feat.priority;
      if (!existing || score > existing.score) {
        allFeatures.set(feat.name, {
          feat: { name: feat.name, desc: feat.desc, category: feat.priority <= 1 ? 'must' as const : 'recommended' as const },
          score,
        });
      }
    }
  }

  // Domain features get medium score (50)
  for (const domain of matchedDomains) {
    for (const feat of domain.additionalFeatures) {
      const existing = allFeatures.get(feat.name);
      const score = 50 - feat.priority;
      if (!existing || score > existing.score) {
        allFeatures.set(feat.name, {
          feat: { name: feat.name, desc: feat.desc, category: feat.priority <= 1 ? 'must' as const : 'recommended' as const },
          score,
        });
      }
    }
  }

  // Keyword matches get lower score (matchCount * 10)
  for (const [, { feat, matchCount }] of keywordMatched) {
    const existing = allFeatures.get(feat.name);
    const score = matchCount * 10 - feat.priority;
    if (!existing || score > existing.score) {
      allFeatures.set(feat.name, {
        feat: { name: feat.name, desc: feat.desc, category: feat.priority <= 1 ? 'must' as const : 'recommended' as const },
        score,
      });
    }
  }

  if (allFeatures.size === 0) return null;

  // Sort by score (highest first), take top features
  const sorted = [...allFeatures.values()].sort((a, b) => b.score - a.score);

  // Top 40% or minimum 3 are must-have
  const mustCount = Math.max(3, Math.ceil(sorted.length * 0.4));
  const features: SelectableFeature[] = sorted.map((item, i) => ({
    name: item.feat.name,
    desc: item.feat.desc,
    category: i < mustCount ? 'must' as const : 'recommended' as const,
  }));

  // Generate descriptive label
  const domainLabel = matchedDomains.length > 0 ? matchedDomains[0].domainName + ' · ' : '';
  const patternLabel = matchedPatterns.length > 0
    ? matchedPatterns[0].pattern.features[0].name
    : '';
  const label = domainLabel + (patternLabel || `"${overviewText.slice(0, 30)}" 분석 결과`);

  return { label, features };
}

// ═══════════════════════════════════════════════════════
//  프로젝트 유형 감지 (기존 유지)
// ═══════════════════════════════════════════════════════
function detectProjectType(text: string): { projectType: string; typeInfo: ProjectTypeInfo; confidence: string } {
  const t = text.trim().toLowerCase();
  const keywords: [string, string, number][] = [
    ['앱', '모바일 앱', 3], ['어플', '모바일 앱', 5], ['모바일', '모바일 앱', 4], ['ios', '모바일 앱', 5], ['안드로이드', '모바일 앱', 5],
    ['웹사이트', '웹사이트', 5], ['홈페이지', '웹사이트', 5], ['랜딩', '웹사이트', 4],
    ['웹', '웹 서비스', 3], ['사이트', '웹 서비스', 2],
    ['쇼핑몰', '이커머스', 5], ['커머스', '이커머스', 5], ['쇼핑', '이커머스', 4], ['판매', '이커머스', 3], ['상품', '이커머스', 3],
    ['플랫폼', '플랫폼', 3], ['마켓플레이스', '플랫폼', 5], ['중개', '플랫폼', 3],
    ['saas', 'SaaS', 5], ['구독', 'SaaS', 3], ['b2b', 'SaaS', 3], ['대시보드', 'SaaS', 2],
    ['매칭', '플랫폼', 5], ['연결', '플랫폼', 2],
    ['예약', '웹 서비스', 3], ['부킹', '웹 서비스', 3],
    ['교육', '웹 서비스', 3], ['학습', '웹 서비스', 3], ['강의', '웹 서비스', 4],
    ['헬스', '웹 서비스', 3], ['건강', '웹 서비스', 2], ['의료', '웹 서비스', 4],
    ['금융', '웹 서비스', 3], ['핀테크', '웹 서비스', 4], ['투자', '웹 서비스', 2],
    ['ai', 'AI 서비스', 4], ['챗봇', 'AI 서비스', 5], ['인공지능', 'AI 서비스', 5], ['gpt', 'AI 서비스', 5],
  ];

  const scores: Record<string, number> = {};
  for (const [key, val, weight] of keywords) {
    if (t.includes(key)) scores[val] = (scores[val] || 0) + weight;
  }

  let projectType = '소프트웨어 서비스';
  let maxScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) { maxScore = score; projectType = type; }
  }

  const confidence = maxScore >= 5 ? '높음' : maxScore >= 3 ? '중간' : '낮음';
  const typeInfo = PROJECT_TYPES[projectType] || DEFAULT_PROJECT_TYPE;

  return { projectType, typeInfo, confidence };
}

// ═══════════════════════════════════════════════════════
//  기능 파싱 (기존 유지)
// ═══════════════════════════════════════════════════════
function parseFeatures(text: string): { name: string; description: string; priority: 'P1' | 'P2' | 'P3' }[] {
  let items = text.split(/[\n]/).map(s => s.trim()).filter(Boolean);
  if (items.length === 1) items = text.split(/[,，/·•\-]/).map(s => s.trim()).filter(s => s.length > 1);
  items = items.map(s => s.replace(/^[\d①②③④⑤⑥⑦⑧⑨⑩]+[\.\)]\s*/, '').trim());

  return items.slice(0, 10).map((raw, i) => {
    const name = raw.length > 50 ? raw.slice(0, 50) : raw;
    let matchedFeature: (typeof FEATURE_DB)[string] | null = null;
    for (const [keyword, info] of Object.entries(FEATURE_DB)) {
      if (raw.includes(keyword)) { matchedFeature = info; break; }
    }
    const description = matchedFeature
      ? `${matchedFeature.desc} [${matchedFeature.complexity} | ${matchedFeature.weeks}]`
      : `${raw} — 상세 요구사항은 개발사와 협의 필요 [★★★☆☆ | 1~2주(추정)]`;
    return { name, description, priority: i < 2 ? 'P1' : i < 4 ? 'P2' : 'P3' };
  });
}

// ═══════════════════════════════════════════════════════
//  전역 대화 상태
// ═══════════════════════════════════════════════════════
let detectedType: ProjectTypeInfo | null = null;
let detectedProjectType: string = '';
let previousAnswers: Record<number, string> = {};
let followUpCount: Record<number, number> = {};
// 🆕 기능 선택 시스템 상태
let accumulatedFeatures: { name: string; description: string; priority: 'P1' | 'P2' | 'P3' }[] = [];
let featureSelectionActive: boolean = false;

// ═══════════════════════════════════════════════════════
//  🆕 동적 다음 토픽 결정 엔진
//  rfpData를 분석하여 가장 가치 있는 다음 질문을 결정
// ═══════════════════════════════════════════════════════
function determineNextTopic(rfpData: RFPData, currentTopicStep: number): number | null {
  const ti = detectedType || DEFAULT_PROJECT_TYPE;
  const covered = getTopicsCovered(rfpData);

  // 완료 가능 여부 체크
  if (isReadyToComplete(rfpData) && covered.length >= 5) {
    return null; // 완료 제안
  }

  // 프로젝트 유형별 우선순위에 따라 다음 토픽 선택
  const topicOrder = ti.topicPriority;

  for (const topicId of topicOrder) {
    if (!covered.includes(topicId)) {
      return TOPIC_TO_STEP[topicId];
    }
  }

  // 모든 토픽이 커버되면 완료
  return null;
}

// ═══════════════════════════════════════════════════════
//  🆕 맥락 기반 동적 질문 생성
//  이전 답변을 참조하여 맞춤형 질문 생성
// ═══════════════════════════════════════════════════════
function generateContextualQuestion(topicStep: number, rfpData: RFPData): { question: string; quickReplies?: string[]; selectableFeatures?: SelectableFeature[]; inlineOptions?: string[] } {
  const ti = detectedType || DEFAULT_PROJECT_TYPE;
  const topicId = STEP_TO_TOPIC[topicStep];
  const projectName = previousAnswers[1] ? previousAnswers[1].slice(0, 20) : '프로젝트';

  // ────────────────────────────────────────────
  // 핵심 원칙: PRD 요구사항 정의에만 집중.
  // 견적, 예산, 비용, 시장 인사이트 언급 금지.
  // "왜 이 정보가 PRD에 필요한지" 이유만 말하고 질문.
  // ────────────────────────────────────────────

  switch (topicId) {
    case 'targetUsers': {
      return {
        question: '주 사용자는 누구인가요?',
        inlineOptions: ti.quickRepliesMap.targetUsers,
      };
    }

    case 'coreFeatures': {
      // 🆕 v11: 서비스 설명(overview) 기반 맞춤 기능 추천
      // CEO: "어떤 서비스를 만들고 싶은가요?의 대답에 맞는 기능 리스트를 만들어야지"
      const overviewText = previousAnswers[1] || rfpData?.overview || '';
      const serviceMatch = getServiceFeatures(overviewText);

      featureSelectionActive = true;
      accumulatedFeatures = [];

      if (serviceMatch) {
        // 서비스 키워드 매칭 성공 → 맞춤 기능 목록
        const question = `**${serviceMatch.label}** 기반 추천 기능입니다. 필요한 기능을 선택하세요.`;

        return {
          question,
          selectableFeatures: serviceMatch.features,
        };
      } else {
        // 매칭 실패 → 카테고리 기반 폴백 + selectableFeatures
        const mustHave = ti.mustHaveFeatures;
        const quickFeatures = ti.quickRepliesMap.coreFeatures;

        const features: SelectableFeature[] = [
          ...mustHave.map(f => ({ name: f, desc: FEATURE_DB[f.split('(')[0].trim()]?.desc || f, category: 'must' as const })),
          ...quickFeatures.filter(f => !mustHave.includes(f)).map(f => ({ name: f, desc: FEATURE_DB[f.split('(')[0].trim()]?.desc || f, category: 'recommended' as const })),
        ];

        const question = `추천 기능 목록입니다. 필요한 기능을 선택하세요.`;

        return {
          question,
          selectableFeatures: features,
        };
      }
    }

    case 'referenceServices': {
      return {
        question: '참고하고 싶은 서비스가 있나요?\n예: "당근마켓의 채팅처럼"',
        inlineOptions: ['없음', '직접 입력'],
      };
    }

    case 'techRequirements': {
      return {
        question: '웹, 앱, 또는 둘 다 필요한가요?',
        inlineOptions: ti.quickRepliesMap.techRequirements,
      };
    }

    case 'budgetTimeline': {
      return {
        question: '희망 일정과 예산이 있나요?',
        inlineOptions: ti.quickRepliesMap.budgetTimeline,
      };
    }

    case 'additionalRequirements': {
      return {
        question: '추가 요구사항이 있나요?\n예: 소스코드 소유권, 디자인 포함 여부',
        inlineOptions: ti.quickRepliesMap.additionalRequirements,
      };
    }

    default:
      return { question: '다음으로 넘어갈게요.' };
  }
}

// ═══════════════════════════════════════════════════════
//  🆕 맥락 인지 전문가 피드백 v8
//  이전 모든 답변을 참조한 맞춤 인사이트
// ═══════════════════════════════════════════════════════
function getContextualFeedback(topicStep: number, answer: string, rfpData: RFPData): { message: string; quickReplies?: string[]; thinkingLabel?: string } {
  const a = answer.trim();
  previousAnswers[topicStep] = a;
  const topicId = STEP_TO_TOPIC[topicStep];

  // ────────────────────────────────────────────
  // 핵심 원칙: PRD 정의에만 집중.
  // 견적/예산/비용/시장인사이트 절대 언급 금지.
  // 피드백은 "반영했습니다" 수준으로 짧게.
  // ────────────────────────────────────────────

  switch (topicId) {
    case 'overview': {
      const { projectType, typeInfo } = detectProjectType(a);
      detectedType = typeInfo;
      detectedProjectType = projectType;

      return {
        message: '',
        thinkingLabel: '프로젝트 유형 분석 중...',
      };
    }

    case 'targetUsers': {
      return {
        message: '',
        thinkingLabel: '반영 중...',
      };
    }

    case 'coreFeatures': {
      // 🆕 v11: 복수선택 UI에서 한 번에 제출되므로 단순화
      // 입력: JSON 배열 (UI에서 선택) 또는 자유 텍스트

      // JSON 배열로 온 경우 (UI 복수선택)
      let selectedFeatures: { name: string; desc: string; category: string }[] = [];
      try {
        const parsed = JSON.parse(a);
        if (Array.isArray(parsed)) {
          selectedFeatures = parsed;
        }
      } catch {
        // JSON이 아닌 경우 — 자유 텍스트 입력
      }

      if (selectedFeatures.length > 0) {
        // UI에서 선택된 기능 → accumulatedFeatures로 변환
        accumulatedFeatures = selectedFeatures.map((f, i) => ({
          name: f.name,
          description: f.desc || f.name,
          priority: (f.category === 'must' ? 'P1' : i < 4 ? 'P2' : 'P3') as 'P1' | 'P2' | 'P3',
        }));
        featureSelectionActive = false;
        return {
          message: '',
          thinkingLabel: '기능 목록 반영 중...',
        };
      } else if (a === '직접 입력할게요') {
        return {
          message: '원하시는 기능을 자유롭게 입력해주세요.\n여러 개를 콤마(,)나 줄바꿈으로 구분하시면 됩니다.',
          thinkingLabel: '입력 대기 중...',
        };
      } else if (a !== '이대로 진행' && a !== '건너뛰기') {
        // 자유 텍스트 입력
        const newFeatures = parseFeatures(a);
        accumulatedFeatures = newFeatures;
        featureSelectionActive = false;
        return {
          message: '',
          thinkingLabel: '기능 목록 반영 중...',
        };
      }

      featureSelectionActive = false;
      return { message: '', thinkingLabel: '반영 중...' };
    }

    case 'referenceServices': {
      if (a === '건너뛰기' || a.length < 3) {
        return { message: '' };
      }
      return {
        message: '',
        thinkingLabel: '반영 중...',
      };
    }

    case 'techRequirements': {
      return {
        message: '',
        thinkingLabel: '반영 중...',
      };
    }

    case 'budgetTimeline': {
      return {
        message: '',
        thinkingLabel: '반영 중...',
      };
    }

    case 'additionalRequirements': {
      return {
        message: '',
        thinkingLabel: '반영 중...',
      };
    }

    default:
      return { message: '' };
  }
}

// ═══════════════════════════════════════════════════════
//  데이터 파서 (기존 유지)
// ═══════════════════════════════════════════════════════
function parseTargetUsers(text: string): string {
  const t = text.trim();
  const segments: string[] = [];
  const ageMatch = t.match(/(\d{1,2})\s*[~\-대]\s*(\d{1,2})?/);
  if (ageMatch) segments.push(`연령대: ${ageMatch[0]}`);
  const roles = ['직장인', '학생', '주부', '프리랜서', '사업자', '소상공인', '기업', 'B2B', 'B2C', '개발자', '디자이너', '마케터', '의사', '환자', '시니어', '어린이', '부모', '자영업', '창업자', '투자자'];
  for (const role of roles) { if (t.includes(role)) segments.push(role); }
  return segments.length > 0 ? `${t}\n\n[타겟 세그먼트: ${segments.join(', ')}]` : t;
}

function parseTechRequirements(text: string): string {
  const t = text.trim().toLowerCase();
  const techs: string[] = [];
  if (t.includes('앱') || t.includes('모바일') || t.includes('ios') || t.includes('안드로이드') || t.includes('android')) techs.push('모바일 앱 (iOS/Android)');
  if (t.includes('웹') || t.includes('사이트') || t.includes('반응형')) techs.push('웹 (반응형)');
  if (t.includes('둘') || t.includes('다') || t.includes('모두')) techs.push('웹 + 모바일 앱 (크로스플랫폼 추천)');
  return techs.length > 0 ? `${text.trim()}\n\n[플랫폼: ${techs.join(', ')}]` : text.trim();
}

function parseBudgetTimeline(text: string): string {
  const t = text.trim();
  const extras: string[] = [];
  const moneyPatterns = [/(\d{1,3}[,.]?\d{0,3})\s*만\s*원/g, /(\d{1,3}[,.]?\d{0,3})\s*억/g, /(\d{1,4})\s*만/g];
  for (const p of moneyPatterns) { for (const m of t.matchAll(p)) extras.push(m[0]); }
  const periodPatterns = [/(\d{1,2})\s*개월/g, /(\d{1,2})\s*주/g, /(\d{4})\s*년\s*(\d{1,2})\s*월/g];
  for (const p of periodPatterns) { for (const m of t.matchAll(p)) extras.push(m[0]); }
  return extras.length > 0 ? `${t}\n\n[파싱: ${extras.join(', ')}]` : t;
}

// ═══════════════════════════════════════════════════════
//  🆕 메인 함수 v8 — 동적 대화 엔진
// ═══════════════════════════════════════════════════════
export function generateFallbackResponse(
  userMessage: string,
  currentStep: number,
  rfpData?: RFPData
): FallbackResponse {
  const topicId = STEP_TO_TOPIC[currentStep] || 'overview';
  const trimmed = userMessage.trim();
  const isSkip = trimmed === '건너뛰기';
  const isCoreFeatureFinalize = topicId === 'coreFeatures' && trimmed === '이대로 진행';

  // ─── 1. RFP 데이터 업데이트 ───
  let rfpUpdate: FallbackResponse['rfpUpdate'] = null;

  if (topicId === 'coreFeatures') {
    // 🆕 기능 선택 — feedback에서 accumulatedFeatures를 관리하므로 여기서는 나중에 설정
    // rfpUpdate는 feedback 이후에 설정됨
  } else if (!isSkip) {
    if (topicId === 'overview') {
      const { typeInfo } = detectProjectType(userMessage);
      // Generate concise project title from user's description
      const words = userMessage.trim().split(/\s+/).slice(0, 6).join(' ');
      const titleSuffix = typeInfo.type !== '소프트웨어 서비스' ? ` (${typeInfo.type})` : '';
      const projectTitle = words.length > 20 ? words.slice(0, 20) + '...' : words;
      rfpUpdate = { section: topicId, value: `${projectTitle}${titleSuffix}` };
    } else if (topicId === 'targetUsers') {
      rfpUpdate = { section: topicId, value: parseTargetUsers(userMessage) };
    } else if (topicId === 'techRequirements') {
      rfpUpdate = { section: topicId, value: parseTechRequirements(userMessage) };
    } else if (topicId === 'budgetTimeline') {
      rfpUpdate = { section: topicId, value: parseBudgetTimeline(userMessage) };
    } else {
      rfpUpdate = { section: topicId, value: userMessage.trim() };
    }
  }

  // ─── 2. 현재 rfpData 시뮬레이션 (서버에서 안 보내줬을 때) ───
  const simulatedRfpData: RFPData = rfpData || {
    overview: currentStep >= 1 ? previousAnswers[1] || '' : '',
    targetUsers: currentStep >= 2 ? previousAnswers[2] || '' : '',
    coreFeatures: currentStep >= 3 ? (previousAnswers[3] ? parseFeatures(previousAnswers[3]) : []) : [],
    referenceServices: currentStep >= 4 ? previousAnswers[4] || '' : '',
    techRequirements: currentStep >= 5 ? previousAnswers[5] || '' : '',
    budgetTimeline: currentStep >= 6 ? previousAnswers[6] || '' : '',
    additionalRequirements: currentStep >= 7 ? previousAnswers[7] || '' : '',
  };

  // rfpUpdate 반영
  if (rfpUpdate && !isSkip) {
    if (rfpUpdate.section === 'coreFeatures' && Array.isArray(rfpUpdate.value)) {
      simulatedRfpData.coreFeatures = rfpUpdate.value as RFPData['coreFeatures'];
    } else if (rfpUpdate.section in simulatedRfpData) {
      (simulatedRfpData as unknown as Record<string, unknown>)[rfpUpdate.section] = rfpUpdate.value;
    }
  }

  // ─── 3. 전문가 피드백 ───
  const feedback = getContextualFeedback(currentStep, userMessage, simulatedRfpData);

  // ─── 3.5. 🆕 coreFeatures 누적 처리 (feedback 이후) ───
  if (topicId === 'coreFeatures') {
    if (accumulatedFeatures.length > 0) {
      rfpUpdate = { section: 'coreFeatures', value: accumulatedFeatures };
      simulatedRfpData.coreFeatures = accumulatedFeatures;
    } else if (isCoreFeatureFinalize || isSkip) {
      rfpUpdate = { section: 'coreFeatures', value: [] };
    }
  }

  // ─── 4. 🆕 동적 다음 토픽 결정 ───
  let nextStepNumber = determineNextTopic(simulatedRfpData, currentStep);

  // 🆕 기능 선택 멀티라운드: 아직 선택 중이면 coreFeatures에 머무름
  if (topicId === 'coreFeatures' && featureSelectionActive && !isCoreFeatureFinalize && !isSkip) {
    nextStepNumber = currentStep;
  }

  const shouldComplete = nextStepNumber === null;
  const covered = getTopicsCovered(simulatedRfpData);
  const progress = Math.round((covered.length / TOPICS.length) * 100);

  // ─── 5. 응답 조합 ───
  let message: string;
  let quickReplies: string[] | undefined = feedback.quickReplies;
  let thinkingLabel: string | undefined = feedback.thinkingLabel;
  let selectableFeatures: SelectableFeature[] | undefined;

  if (shouldComplete) {
    // 완료 상태
    message = 'PRD 생성 준비가 완료되었습니다.\n아래 버튼을 눌러 PRD를 완성하세요.';
    thinkingLabel = 'RFP 문서 구조 설계 중...';
  } else {
    // 다음 질문으로 진행
    const nextQ = generateContextualQuestion(nextStepNumber!, simulatedRfpData);

    message = nextQ.question;
    quickReplies = nextQ.inlineOptions || undefined;

    // 🆕 selectableFeatures 전달 (coreFeatures 토픽일 때)
    if (nextQ.selectableFeatures) {
      selectableFeatures = nextQ.selectableFeatures;
      quickReplies = undefined; // selectableFeatures가 있으면 quickReplies 숨김
    }
  }

  return {
    message,
    rfpUpdate,
    nextAction: shouldComplete ? 'complete' : 'continue',
    nextStep: nextStepNumber,
    quickReplies,
    inlineOptions: quickReplies,
    selectableFeatures,
    thinkingLabel,
    topicsCovered: covered,
    progress,
    canComplete: isReadyToComplete(simulatedRfpData),
  };
}
