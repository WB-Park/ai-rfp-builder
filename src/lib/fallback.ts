// AI RFP Builder — Dynamic Conversation Engine v8
// 핵심 변경: 고정 7단계 → 맥락 기반 동적 질문 생성
// 앞 질문의 답변에 따라 뒷 질문이 자동으로 맞춤 생성됨
// 위시켓 13년 7만+ 외주 프로젝트 데이터 기반

import { RFPData, TopicId, TOPIC_TO_STEP, STEP_TO_TOPIC, getTopicsCovered, isReadyToComplete, TOPICS } from '@/types/rfp';

interface FallbackResponse {
  message: string;
  rfpUpdate: {
    section: string;
    value: string | { name: string; description: string; priority: string }[];
  } | null;
  nextAction: string;
  nextStep: number | null;
  quickReplies?: string[];
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
    topicPriority: ['overview', 'coreFeatures', 'targetUsers', 'techRequirements', 'budgetTimeline', 'referenceServices', 'additionalRequirements'],
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
    topicPriority: ['overview', 'coreFeatures', 'targetUsers', 'budgetTimeline', 'referenceServices', 'techRequirements', 'additionalRequirements'],
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
    topicPriority: ['overview', 'coreFeatures', 'budgetTimeline', 'referenceServices', 'additionalRequirements'],
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
    topicPriority: ['overview', 'coreFeatures', 'targetUsers', 'budgetTimeline', 'techRequirements', 'referenceServices', 'additionalRequirements'],
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
    topicPriority: ['overview', 'coreFeatures', 'targetUsers', 'techRequirements', 'budgetTimeline', 'referenceServices', 'additionalRequirements'],
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
  topicPriority: ['overview', 'coreFeatures', 'targetUsers', 'budgetTimeline', 'techRequirements', 'referenceServices', 'additionalRequirements'],
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
function generateContextualQuestion(topicStep: number, rfpData: RFPData): { question: string; quickReplies?: string[] } {
  const ti = detectedType || DEFAULT_PROJECT_TYPE;
  const topicId = STEP_TO_TOPIC[topicStep];
  const projectName = previousAnswers[1] ? previousAnswers[1].slice(0, 20) : '프로젝트';

  // ────────────────────────────────────────────
  // 핵심 원칙: "왜 이 정보가 필요한지 이유"를 먼저 말하고,
  // 구체적으로 어떤 정보를 달라고 요청한다.
  // 팁/인사이트는 최소화. 정보수집이 목적.
  // ────────────────────────────────────────────

  switch (topicId) {
    case 'targetUsers': {
      if (detectedProjectType === '플랫폼') {
        return {
          question: `플랫폼은 **공급자와 수요자 양쪽의 화면을 별도 설계**해야 하기 때문에, 양쪽 사용자가 누구인지 알아야 합니다.\n\n**${projectName}**에서 매칭되는 양쪽은 각각 누구인가요?\n예: "프리랜서 개발자 ↔ IT 외주를 원하는 기업"`,
          quickReplies: ti.quickRepliesMap.targetUsers,
        };
      } else if (detectedProjectType === '이커머스') {
        return {
          question: `쇼핑몰은 타겟 고객에 따라 **상품 정렬 방식, 결제 수단, UI 톤**이 완전히 달라집니다.\n\n**${projectName}**의 주 구매자는 어떤 분들인가요?\n연령대, 성별, 주 구매 상황 등을 알려주세요.`,
          quickReplies: ti.quickRepliesMap.targetUsers,
        };
      } else if (detectedProjectType === 'SaaS') {
        return {
          question: `SaaS는 **구매 결정자와 실사용자가 다른 경우**가 많아, 양쪽을 모두 파악해야 정확한 기능 설계가 가능합니다.\n\n**${projectName}**을 사용할 기업 규모와 실사용자는 누구인가요?\n(예: "50인 이하 스타트업의 마케터")`,
          quickReplies: ti.quickRepliesMap.targetUsers,
        };
      } else if (detectedProjectType === 'AI 서비스') {
        return {
          question: `AI 서비스는 사용자의 기술 수준에 따라 **UI 복잡도와 결과 표시 방식**이 크게 달라집니다.\n\n**${projectName}**의 사용자는 AI에 익숙한 전문가인가요, 아니면 일반인인가요?`,
          quickReplies: ti.quickRepliesMap.targetUsers,
        };
      }
      return {
        question: `타겟 사용자를 명확히 정의해야 **화면 구성, 기능 우선순위, UX 난이도**를 정할 수 있습니다.\n\n**${projectName}**을 주로 누가 사용하게 될까요?\n연령대, 직업, 기술 수준 등을 알려주세요.`,
        quickReplies: ti.quickRepliesMap.targetUsers,
      };
    }

    case 'coreFeatures': {
      const overviewText = rfpData.overview?.toLowerCase() || '';
      let contextHint = '';
      if (overviewText.includes('배달') || overviewText.includes('음식')) {
        contextHint = '\n\n이 유형이면 보통 주문 접수, 실시간 추적, 리뷰 기능이 포함됩니다.';
      } else if (overviewText.includes('교육') || overviewText.includes('강의')) {
        contextHint = '\n\n이 유형이면 보통 강의 관리, 진도 추적, 퀴즈/평가가 포함됩니다.';
      } else if (overviewText.includes('예약')) {
        contextHint = '\n\n이 유형이면 보통 캘린더, 실시간 가용성, 알림 기능이 포함됩니다.';
      }

      return {
        question: `핵심 기능 목록이 있어야 개발사가 **정확한 견적과 일정**을 산출할 수 있습니다.\n\n**${projectName}**에 꼭 들어가야 할 핵심 기능 3~5개를 알려주세요.${contextHint}\n\n여러 개를 한 번에 나열하셔도 되고, 하나씩 말씀해주셔도 됩니다.`,
        quickReplies: ti.quickRepliesMap.coreFeatures,
      };
    }

    case 'referenceServices': {
      const typeExample = ti.competitorExample;
      return {
        question: `참고 서비스를 알려주시면 개발사가 **디자인 수준과 기능 범위를 즉시 이해**할 수 있어, 커뮤니케이션 비용이 크게 줄어듭니다.\n\n비슷하게 만들고 싶은 서비스가 있나요?\n"${typeExample}의 **이 부분처럼**" 식으로 말씀해주시면 가장 좋습니다.`,
        quickReplies: ti.quickRepliesMap.referenceServices,
      };
    }

    case 'techRequirements': {
      return {
        question: `웹인지 앱인지에 따라 **개발 기간, 비용, 필요한 개발사 역량**이 완전히 달라집니다.\n\n**${projectName}**을(를) 웹으로 만들까요, 앱으로 만들까요?\n특별한 선호가 없으시면 "개발사 추천에 따름"도 괜찮습니다.`,
        quickReplies: ti.quickRepliesMap.techRequirements,
      };
    }

    case 'budgetTimeline': {
      const featureCount = rfpData.coreFeatures.length;
      let featureContext = featureCount > 0
        ? `\n\n현재 ${featureCount}개 기능 기준, ${ti.type} 평균 예산은 **${ti.avgBudget}**, 기간은 **${ti.avgDuration}**입니다.`
        : `\n\n${ti.type} 프로젝트 평균: **${ti.avgBudget}**, **${ti.avgDuration}**`;
      return {
        question: `예산과 일정이 있어야 개발사가 **실현 가능한 범위를 조율**해서 제안할 수 있습니다.${featureContext}\n\n희망 예산 범위와 완료 시점이 있으신가요? 대략적이어도 괜찮습니다.`,
        quickReplies: ti.quickRepliesMap.budgetTimeline,
      };
    }

    case 'additionalRequirements': {
      return {
        question: `마지막으로 개발사에 **미리 전달해야 분쟁을 예방**할 수 있는 사항들이 있습니다.\n\n소스코드 소유권, 하자보수 기간, 디자인 포함 여부 등 꼭 전달할 내용이 있으신가요?`,
        quickReplies: ti.quickRepliesMap.additionalRequirements,
      };
    }

    default:
      return { question: '다음 단계를 진행해볼까요?' };
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
  // 핵심 원칙: 피드백은 짧게. 팁/코칭 최소화.
  // "잘 반영했습니다" + 핵심 확인사항 1개만.
  // ────────────────────────────────────────────

  switch (topicId) {
    case 'overview': {
      const { projectType, typeInfo, confidence } = detectProjectType(a);
      detectedType = typeInfo;
      detectedProjectType = projectType;

      return {
        message: `${typeInfo.insightEmoji} **${typeInfo.type}** 프로젝트로 파악했습니다. 이 유형 평균 예산은 ${typeInfo.avgBudget}, 기간은 ${typeInfo.avgDuration}입니다.`,
        thinkingLabel: '프로젝트 유형 분석 중...',
      };
    }

    case 'targetUsers': {
      return {
        message: '타겟 사용자 정보를 반영했습니다.',
        thinkingLabel: '타겟 사용자 반영 중...',
      };
    }

    case 'coreFeatures': {
      const features = parseFeatures(a);
      const ti = detectedType;

      // 누락 기능 감지 — 이건 실질적으로 유용하므로 유지
      const missingFeatures: string[] = [];
      if (ti) {
        for (const must of ti.mustHaveFeatures) {
          const hasIt = features.some(f => {
            const fn = f.name.toLowerCase();
            const ml = must.toLowerCase();
            return fn.includes(ml.slice(0, 3)) || ml.includes(fn.slice(0, 3));
          });
          if (!hasIt) missingFeatures.push(must);
        }
      }

      const featureList = features.map(f => `• ${f.name}`).join('\n');
      let missingText = missingFeatures.length > 0
        ? `\n\n이 유형에서 보통 포함하는 기능 중 빠진 것이 있습니다: **${missingFeatures.slice(0, 3).join(', ')}**\n추가하시겠어요?`
        : '';

      return {
        message: `${features.length}개 기능을 반영했습니다.\n\n${featureList}${missingText}`,
        quickReplies: missingFeatures.length > 0 ? ['이대로 진행', ...missingFeatures.slice(0, 3)] : undefined,
        thinkingLabel: '기능 목록 반영 중...',
      };
    }

    case 'referenceServices': {
      if (a === '건너뛰기' || a.length < 3) {
        return { message: '넘어갈게요.' };
      }
      return {
        message: '참고 서비스를 반영했습니다. 개발사에 전달할 때 큰 도움이 됩니다.',
        thinkingLabel: '참고 서비스 반영 중...',
      };
    }

    case 'techRequirements': {
      return {
        message: '기술 요구사항을 반영했습니다.',
        thinkingLabel: '기술 요구사항 반영 중...',
      };
    }

    case 'budgetTimeline': {
      const hasBudget = /\d/.test(a);
      const isUndecided = a.includes('미정') || a.includes('모르');
      const ti = detectedType;

      if (!hasBudget || isUndecided) {
        return {
          message: `예산 미정으로 반영합니다. 참고로 ${ti?.type || '유사'} 프로젝트 평균은 **${ti?.avgBudget || '1,500~3,000만원'}**입니다.`,
          thinkingLabel: '예산 정보 반영 중...',
        };
      }

      return {
        message: '예산 및 일정 정보를 반영했습니다.',
        thinkingLabel: '예산 정보 반영 중...',
      };
    }

    case 'additionalRequirements': {
      return {
        message: '추가 요구사항을 반영했습니다.',
        thinkingLabel: 'RFP 최종 정리 중...',
      };
    }

    default:
      return { message: '답변을 반영했습니다.' };
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
  const isSkip = userMessage.trim() === '건너뛰기' || userMessage.trim() === '이대로 진행';

  // ─── 1. RFP 데이터 업데이트 ───
  let rfpUpdate: FallbackResponse['rfpUpdate'] = null;

  if (!isSkip) {
    if (topicId === 'coreFeatures') {
      rfpUpdate = { section: topicId, value: parseFeatures(userMessage) };
    } else if (topicId === 'overview') {
      const { typeInfo } = detectProjectType(userMessage);
      rfpUpdate = { section: topicId, value: `${userMessage.trim()} — ${typeInfo.type} 프로젝트` };
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

  // ─── 4. 🆕 동적 다음 토픽 결정 ───
  const nextStepNumber = determineNextTopic(simulatedRfpData, currentStep);
  const shouldComplete = nextStepNumber === null;
  const covered = getTopicsCovered(simulatedRfpData);
  const progress = Math.round((covered.length / TOPICS.length) * 100);

  // ─── 5. 응답 조합 ───
  let message: string;
  let quickReplies: string[] | undefined = feedback.quickReplies;
  let thinkingLabel: string | undefined = feedback.thinkingLabel;

  if (shouldComplete) {
    // 완료 상태
    const projectName = previousAnswers[1] ? previousAnswers[1].slice(0, 30) : '프로젝트';
    const ti = detectedType;

    message = `${feedback.message}\n\n---\n\n🎉 **"${projectName}" RFP 생성 준비 완료!**\n\n📋 수집된 정보:\n${covered.map(t => {
      const topic = TOPICS.find(tp => tp.id === t);
      return topic ? `✅ ${topic.icon} ${topic.label}` : '';
    }).filter(Boolean).join('\n')}${ti ? `\n\n📊 이 ${ti.type} 프로젝트 추천 MVP: ${ti.mvpScope}` : ''}\n\n아래 버튼을 눌러 **전문 PRD**를 완성하세요!`;
    thinkingLabel = 'RFP 문서 구조 설계 중...';
  } else {
    // 다음 질문으로 진행
    const nextQ = generateContextualQuestion(nextStepNumber, simulatedRfpData);
    const nextTopic = TOPICS.find(t => t.stepNumber === nextStepNumber);
    const topicLabel = nextTopic ? `${nextTopic.icon} ${nextTopic.label}` : '';

    // 완료 가능 여부 표시
    const canCompleteNow = isReadyToComplete(simulatedRfpData);
    const completeHint = canCompleteNow ? '\n\n💬 이미 충분한 정보가 수집되었어요. "RFP 생성"을 눌러 바로 완성할 수도 있습니다.' : '';

    message = `${feedback.message}\n\n---\n\n**${topicLabel}**\n${nextQ.question}${completeHint}`;
    quickReplies = feedback.quickReplies || nextQ.quickReplies;
    if (canCompleteNow && quickReplies) {
      quickReplies = ['바로 RFP 생성하기', ...quickReplies];
    }
  }

  return {
    message,
    rfpUpdate,
    nextAction: shouldComplete ? 'complete' : 'continue',
    nextStep: nextStepNumber,
    quickReplies,
    thinkingLabel,
    topicsCovered: covered,
    progress,
    canComplete: isReadyToComplete(simulatedRfpData),
  };
}
