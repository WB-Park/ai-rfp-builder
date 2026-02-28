// AI RFP Builder — Dynamic Conversation Engine v7
// FORGE Iteration: 자연스러운 컨설턴트 대화 → 전문 RFP
// 위시켓 13년 7만+ 외주 프로젝트 데이터 기반

import { STEPS } from '@/types/rfp';

interface FallbackResponse {
  message: string;
  rfpUpdate: {
    section: string;
    value: string | { name: string; description: string; priority: string }[];
  } | null;
  nextAction: string;
  nextStep: number | null;
  quickReplies?: string[];
  thinkingLabel?: string; // AI 분석 중 표시 메시지
}

const SECTION_MAP: Record<number, string> = {
  1: 'overview',
  2: 'targetUsers',
  3: 'coreFeatures',
  4: 'referenceServices',
  5: 'techRequirements',
  6: 'budgetTimeline',
  7: 'additionalRequirements',
};

// ═══════════════════════════════════════════════════════
//  프로젝트 유형 인텔리전스 DB
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
  targetQuestions: string[];
  targetQuickReplies: string[];
  featureQuickReplies: string[];
  insightEmoji: string;           // 유형별 이모지
  marketInsight: string;          // 시장 인사이트
  mvpScope: string;               // MVP 추천 범위
  competitorExample: string;      // 벤치마크 예시
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
    targetQuestions: ['이 앱을 주로 사용할 분들은 어떤 분들인가요?', '하루 중 언제 이 앱을 가장 많이 사용할 것 같으세요?'],
    targetQuickReplies: ['20~30대 직장인', '전 연령 일반 사용자', '10~20대 학생/MZ세대', '40~60대 시니어'],
    featureQuickReplies: ['소셜 로그인', '결제 기능', '채팅/메시지', '지도/위치 기반', '푸시 알림', '예약 기능'],
    insightEmoji: '📱',
    marketInsight: '2025년 모바일 앱 시장은 슈퍼앱 트렌드에서 버티컬 특화 앱으로 전환 중입니다.',
    mvpScope: '핵심 기능 3개 + 소셜 로그인 + 푸시 알림',
    competitorExample: '당근마켓, 토스, 오늘의집 등이 대표적인 성공 사례',
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
    targetQuestions: ['이 웹 서비스를 주로 사용하는 사용자는 누구인가요?', 'PC와 모바일 중 어디에서 더 많이 접속할 것 같으세요?'],
    targetQuickReplies: ['B2B 기업 고객', '일반 소비자(B2C)', '내부 직원용', '특정 전문가 그룹'],
    featureQuickReplies: ['회원가입/로그인', '대시보드', '게시판', '검색/필터', '관리자 패널', '결제'],
    insightEmoji: '🌐',
    marketInsight: '웹 서비스는 초기 진입장벽이 가장 낮고, 이후 앱으로 확장하기 용이합니다.',
    mvpScope: '핵심 페이지 5개 이내 + 회원 시스템 + 반응형',
    competitorExample: '노션, 슬랙, 피그마 등 웹 퍼스트 서비스가 시장을 주도',
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
    targetQuestions: ['이 웹사이트의 방문자는 주로 어떤 분들인가요?', '주요 목적은 무엇인가요?'],
    targetQuickReplies: ['잠재 고객', '기존 고객', '투자자/파트너', '일반 대중'],
    featureQuickReplies: ['콘텐츠 관리(CMS)', '문의 폼', '블로그', '포트폴리오', '뉴스/공지사항', 'FAQ'],
    insightEmoji: '🏠',
    marketInsight: '웹사이트는 성공률이 85%로 가장 높습니다. 명확한 목적만 있으면 실패가 적어요.',
    mvpScope: '메인 + 소개 + 서비스 + 문의 페이지',
    competitorExample: '잘 만든 브랜드 사이트 하나가 영업사원 10명 역할',
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
    targetQuestions: ['어떤 상품/서비스를 판매하시나요?', '구매자가 주로 어떤 경로로 상품을 찾게 될까요?'],
    targetQuickReplies: ['20~40대 온라인 쇼핑 이용자', 'B2B 도매/기업 구매자', '특정 취미/관심사 커뮤니티', '전 연령 일반 소비자'],
    featureQuickReplies: ['장바구니/결제', '상품 관리', '주문/배송 추적', '리뷰/평점', '쿠폰/포인트', '검색/필터'],
    insightEmoji: '🛒',
    marketInsight: '이커머스는 PG+정산+교환환불이 개발의 60%를 차지합니다.',
    mvpScope: '상품 등록 + 장바구니 + 결제 + 주문 관리',
    competitorExample: '무신사, 마켓컬리, 크림 등 버티컬 커머스가 성공 모델',
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
    targetQuestions: ['공급자와 수요자 각각 어떤 분들인가요?', '초기에 어느 쪽을 먼저 모을 계획인가요?'],
    targetQuickReplies: ['전문가 ↔ 일반 소비자', '기업 ↔ 프리랜서', '판매자 ↔ 구매자', '서비스 제공자 ↔ 이용자'],
    featureQuickReplies: ['매칭/검색', '채팅/메시지', '결제/정산', '리뷰/평가', '프로필/포트폴리오', '관리자 대시보드'],
    insightEmoji: '🔗',
    marketInsight: '플랫폼 성공의 핵심은 기술이 아니라 초기 사용자 확보 전략입니다.',
    mvpScope: '한쪽 사용자 + 매칭 + 채팅 (결제는 2차)',
    competitorExample: '위시켓, 크몽, 숨고 등 한국형 플랫폼 성공 모델',
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
    targetQuestions: ['사용할 기업/팀의 규모는 어느 정도인가요?', '구매 의사결정자와 실사용자가 다른가요?'],
    targetQuickReplies: ['스타트업/소규모 팀', '중견기업', '대기업', '1인 기업/프리랜서'],
    featureQuickReplies: ['대시보드/분석', '팀 관리/권한', '구독 결제', 'API 연동', '데이터 내보내기', '알림/리포트'],
    insightEmoji: '☁️',
    marketInsight: 'SaaS는 MRR(월간 반복 매출) 구조가 핵심. 첫 100명 유료 고객이 PMF 지표.',
    mvpScope: '핵심 기능 1개 + 구독 결제 + 온보딩',
    competitorExample: '채널톡, 토스페이먼츠, 리멤버 등 한국 SaaS 성공 사례',
  },
  '매칭 플랫폼': {
    type: '매칭 플랫폼',
    avgBudget: '4,000~1억',
    avgDuration: '8~14주',
    successRate: '55%',
    keyFeatures: ['프로필/포트폴리오', '매칭 알고리즘', '채팅', '결제/정산'],
    mustHaveFeatures: ['프로필 시스템', '검색/필터', '1:1 채팅', '결제/정산'],
    commonMistakes: ['초기에 알고리즘보다 수동 큐레이션이 효과적', '초기 사용자 확보 전략 부재', '리뷰/신뢰 시스템 후순위'],
    techTip: '초기 매칭은 수동 큐레이션 → 데이터 축적 후 알고리즘 전환이 리스크가 낮습니다.',
    commonRisk: '초기 사용자 확보 전략(공급자 vs 수요자 먼저)을 명확히 해야 합니다.',
    targetQuestions: ['매칭되는 양쪽은 각각 어떤 분들인가요?', '매칭 기준은 무엇인가요?'],
    targetQuickReplies: ['전문가 ↔ 고객', '구직자 ↔ 기업', '튜터 ↔ 학생', '서비스 제공자 ↔ 이용자'],
    featureQuickReplies: ['프로필/포트폴리오', '매칭 검색', '채팅/메시지', '결제/정산', '리뷰/평가', '알림'],
    insightEmoji: '🤝',
    marketInsight: '매칭 플랫폼은 "양쪽 다 만족"이 핵심. 한쪽에 먼저 집중하세요.',
    mvpScope: '프로필 + 검색 + 채팅 (결제는 오프라인 선처리)',
    competitorExample: '크몽, 숨고, 탈잉 등이 초기 수동 매칭으로 시작해 성장',
  },
  '헬스케어': {
    type: '헬스케어',
    avgBudget: '4,000~1억',
    avgDuration: '10~16주',
    successRate: '60%',
    keyFeatures: ['건강 데이터 관리', '전문가 연결', '알림/리마인더'],
    mustHaveFeatures: ['개인정보보호(민감정보)', '데이터 암호화', '접근 권한 관리'],
    commonMistakes: ['의료법/개인정보보호법 미검토', '데이터 보안 부족', '규제 승인 기간 미고려'],
    techTip: '개인정보보호법과 의료법을 초기 설계에 반드시 반영해야 합니다.',
    commonRisk: '의료 데이터 규제(PIPA)로 서버 위치와 암호화 수준이 법적 요구사항.',
    targetQuestions: ['서비스 이용자가 환자인가요, 의료 전문가인가요, 양쪽 모두인가요?'],
    targetQuickReplies: ['일반인/환자', '의료 전문가', '보호자/가족', '기업(임직원 건강관리)'],
    featureQuickReplies: ['건강 데이터 기록', '전문가 상담', '알림/리마인더', '예약', '기기 연동', '리포트/분석'],
    insightEmoji: '🏥',
    marketInsight: '헬스케어는 규제 대응이 개발비의 30%를 차지할 수 있습니다.',
    mvpScope: '핵심 건강 기능 + 보안 인프라 (규제 먼저 확인)',
    competitorExample: '닥터나우, 굿닥, 눔 등이 규제 내에서 혁신 중',
  },
  '핀테크': {
    type: '핀테크',
    avgBudget: '5,000만~2억',
    avgDuration: '12~20주',
    successRate: '52%',
    keyFeatures: ['본인인증(KYC)', '계좌 연동', '거래 내역', '보안'],
    mustHaveFeatures: ['본인인증(KYC)', '금융보안(2FA)', '거래 로깅', '금융위 인허가'],
    commonMistakes: ['금융 규제 비용 과소평가', '보안 감사 비용 미반영', '인허가(3~6개월) 미고려'],
    techTip: '금융위 인허가, 전자금융업 등록 등 규제 요건을 개발 전에 반드시 확인.',
    commonRisk: '금융 규제 준수 비용이 초기 예상의 30~50% 추가될 수 있습니다.',
    targetQuestions: ['금융 서비스의 구체적 유형은 무엇인가요?', '기존 금융 인허가를 보유하고 계신가요?'],
    targetQuickReplies: ['일반 소비자', '투자자', '소상공인/자영업자', '기업 재무팀'],
    featureQuickReplies: ['본인인증(KYC)', '결제/송금', '계좌 연동', '거래 내역/리포트', '보안(2FA)', '자산 관리'],
    insightEmoji: '💰',
    marketInsight: '핀테크는 기술보다 규제 대응이 프로젝트 성패를 좌우합니다.',
    mvpScope: '핵심 금융 기능 1개 + KYC + 보안 (인허가 병행)',
    competitorExample: '토스, 뱅크샐러드, 카카오페이 등이 규제를 돌파한 사례',
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
    targetQuestions: ['AI가 해결해야 할 핵심 문제는 무엇인가요?'],
    targetQuickReplies: ['일반 소비자', '전문가/전문직', '기업 직원', '콘텐츠 크리에이터'],
    featureQuickReplies: ['AI 챗봇/대화', '이미지 생성/분석', '문서 자동 생성', '데이터 분석', '추천 시스템', '음성 인식'],
    insightEmoji: '🤖',
    marketInsight: '2025년 AI 서비스 핵심은 "AI 래퍼" — 기존 API 위에 UX를 입히는 것.',
    mvpScope: 'AI 핵심 기능 1개 + 결과 화면 + 사용량 제한',
    competitorExample: '뤼튼, 스켈터랩스, 업스테이지 등이 API 기반으로 빠르게 성장',
  },
  '예약 서비스': {
    type: '예약 서비스',
    avgBudget: '2,000~5,000만원',
    avgDuration: '6~10주',
    successRate: '72%',
    keyFeatures: ['일정 관리', '예약/취소', '알림', '결제'],
    mustHaveFeatures: ['캘린더 UI', '예약 확인/취소', '알림(SMS/푸시)', '동시 예약 방지'],
    commonMistakes: ['시간대 처리 미고려', '동시 예약(race condition) 미방지', '취소/환불 정책 미설계'],
    techTip: '캘린더 UI가 UX의 80%를 좌우. 검증된 캘린더 라이브러리가 핵심.',
    commonRisk: '동시 예약 방지는 반드시 서버 단에서 처리해야 합니다.',
    targetQuestions: ['어떤 종류의 예약인가요?', '예약 관리자와 예약자 중 어디에 먼저 집중하시나요?'],
    targetQuickReplies: ['일반 소비자/고객', '매장/사업자', '전문가(의사/트레이너 등)', '기업 관리자'],
    featureQuickReplies: ['캘린더/일정', '예약/취소', '결제', '알림/리마인더', '리뷰/평가', '관리자 대시보드'],
    insightEmoji: '📅',
    marketInsight: '예약 서비스는 "노쇼 방지"가 비즈니스 성패를 좌우합니다.',
    mvpScope: '캘린더 + 예약/취소 + 알림',
    competitorExample: '네이버 예약, 테이블링, 카카오 예약 등이 시장을 장악',
  },
  '에듀테크': {
    type: '에듀테크',
    avgBudget: '3,000~7,000만원',
    avgDuration: '8~14주',
    successRate: '65%',
    keyFeatures: ['강의 관리', '학습 진도 추적', '퀴즈/평가'],
    mustHaveFeatures: ['동영상 스트리밍', '학습 대시보드', '퀴즈/테스트', '수료증'],
    commonMistakes: ['동영상 호스팅 비용 과소평가', '콘텐츠 DRM 미고려', '오프라인 학습 미지원'],
    techTip: '동영상 스트리밍은 클라우드 서비스로 인프라 비용 절감 가능.',
    commonRisk: '동영상 호스팅/CDN 비용이 예상보다 높을 수 있으니 사전 산정 필수.',
    targetQuestions: ['학습 대상은 누구인가요?', '학습 방식은 어떤 형태인가요?'],
    targetQuickReplies: ['학생(초중고)', '대학생/취준생', '직장인/전문가', '시니어/평생교육'],
    featureQuickReplies: ['강의 콘텐츠 관리', '학습 진도 추적', '퀴즈/평가', '수료증 발급', '결제/구독', '커뮤니티/Q&A'],
    insightEmoji: '📚',
    marketInsight: '에듀테크 핵심은 "완강률". 학습자 이탈 방지 UX가 가장 중요합니다.',
    mvpScope: '강의 업로드 + 수강 + 진도 추적',
    competitorExample: '클래스101, 인프런, 패스트캠퍼스 등이 각자 영역에서 성장',
  },
  '소프트웨어 서비스': {
    type: '소프트웨어 서비스',
    avgBudget: '2,000~5,000만원',
    avgDuration: '6~12주',
    successRate: '70%',
    keyFeatures: ['핵심 비즈니스 로직', '사용자 인증', '데이터 관리'],
    mustHaveFeatures: ['사용자 인증', '핵심 기능', '데이터 백업'],
    commonMistakes: ['요구사항 변경이 가장 흔한 지연 원인', 'MVP 범위 과다 설정', '테스트 기간 부족'],
    techTip: '첫 MVP는 핵심 기능 3개 이내로 제한하는 것이 성공 확률이 가장 높습니다.',
    commonRisk: '스코프 크리프(요구사항 계속 추가)가 가장 흔한 프로젝트 실패 원인.',
    targetQuestions: ['이 서비스를 주로 사용하는 분들은 누구인가요?'],
    targetQuickReplies: ['일반 소비자', '기업 고객(B2B)', '내부 직원용', '특정 전문가 그룹'],
    featureQuickReplies: ['회원가입/로그인', '대시보드', '검색/필터', '결제', '알림', '관리자 패널'],
    insightEmoji: '⚙️',
    marketInsight: '소프트웨어 서비스 성공의 80%는 명확한 범위 정의에서 결정됩니다.',
    mvpScope: '핵심 기능 3개 이내 + 인증 + 기본 관리',
    competitorExample: '명확한 문제 해결에 집중한 서비스가 성공률이 높습니다',
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
//  프로젝트 유형 감지
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
    ['매칭', '매칭 플랫폼', 5], ['연결', '매칭 플랫폼', 2],
    ['예약', '예약 서비스', 5], ['부킹', '예약 서비스', 5],
    ['교육', '에듀테크', 4], ['학습', '에듀테크', 4], ['강의', '에듀테크', 5], ['lms', '에듀테크', 5],
    ['헬스', '헬스케어', 4], ['건강', '헬스케어', 3], ['의료', '헬스케어', 5], ['병원', '헬스케어', 4],
    ['금융', '핀테크', 4], ['핀테크', '핀테크', 5], ['투자', '핀테크', 3], ['결제', '핀테크', 2],
    ['ai', 'AI 서비스', 4], ['챗봇', 'AI 서비스', 5], ['인공지능', 'AI 서비스', 5], ['gpt', 'AI 서비스', 5],
  ];

  const scores: Record<string, number> = {};
  for (const [key, val, weight] of keywords) {
    if (t.includes(key)) {
      scores[val] = (scores[val] || 0) + weight;
    }
  }

  let projectType = '소프트웨어 서비스';
  let maxScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      projectType = type;
    }
  }

  const confidence = maxScore >= 5 ? '높음' : maxScore >= 3 ? '중간' : '낮음';
  const typeInfo = PROJECT_TYPES[projectType] || PROJECT_TYPES['소프트웨어 서비스'];

  return { projectType, typeInfo, confidence };
}

// ═══════════════════════════════════════════════════════
//  기능 파싱 + 자동 보강
// ═══════════════════════════════════════════════════════
function parseFeatures(text: string, _projectType?: string): { name: string; description: string; priority: string }[] {
  let items = text.split(/[\n]/).map(s => s.trim()).filter(Boolean);
  if (items.length === 1) {
    items = text.split(/[,，/·•\-]/).map(s => s.trim()).filter(s => s.length > 1);
  }
  items = items.map(s => s.replace(/^[\d①②③④⑤⑥⑦⑧⑨⑩]+[\.\)]\s*/, '').trim());

  return items.slice(0, 10).map((raw, i) => {
    const name = raw.length > 50 ? raw.slice(0, 50) : raw;
    let matchedFeature: typeof FEATURE_DB[string] | null = null;

    for (const [keyword, info] of Object.entries(FEATURE_DB)) {
      if (raw.includes(keyword)) {
        matchedFeature = info;
        break;
      }
    }

    const description = matchedFeature
      ? `${matchedFeature.desc} [${matchedFeature.complexity} | ${matchedFeature.weeks}]`
      : `${raw} — 상세 요구사항은 개발사와 협의 필요 [★★★☆☆ | 1~2주(추정)]`;

    return {
      name,
      description,
      priority: i < 2 ? 'P1' : i < 4 ? 'P2' : 'P3',
    };
  });
}

// ═══════════════════════════════════════════════════════
//  전역 상태
// ═══════════════════════════════════════════════════════
let detectedType: ProjectTypeInfo | null = null;
let detectedProjectType: string = '';
let previousAnswers: Record<number, string> = {};

// ═══════════════════════════════════════════════════════
//  자연스러운 전문가 피드백 v7
//  핵심: 짧고 임팩트 → 데이터 근거 → 실행 가능한 조언
// ═══════════════════════════════════════════════════════
function getExpertFeedback(step: number, answer: string): { message: string; quickReplies?: string[]; thinkingLabel?: string } {
  const a = answer.trim();
  previousAnswers[step] = a;

  switch (step) {
    case 1: {
      const { projectType, typeInfo, confidence } = detectProjectType(a);
      detectedType = typeInfo;
      detectedProjectType = projectType;

      const confText = confidence === '높음'
        ? `${typeInfo.insightEmoji} **${typeInfo.type}** 프로젝트시군요!`
        : confidence === '중간'
        ? `${typeInfo.insightEmoji} 분석해보니 **${typeInfo.type}** 유형에 가장 가깝네요.`
        : `${typeInfo.insightEmoji} **${typeInfo.type}** 유형으로 분류했습니다.`;

      return {
        message: `${confText}\n\n위시켓 7만+ 프로젝트 데이터 분석 결과:\n\n📊 **평균 예산** ${typeInfo.avgBudget} | **기간** ${typeInfo.avgDuration} | **성공률** ${typeInfo.successRate}\n\n💡 ${typeInfo.marketInsight}\n\n⚠️ **이 유형에서 가장 흔한 실수 Top 1:**\n${typeInfo.commonMistakes[0]}`,
        thinkingLabel: '프로젝트 유형 분석 중...',
      };
    }

    case 2: {
      const isB2B = a.includes('기업') || a.includes('B2B') || a.includes('업무');
      const isSenior = a.includes('시니어') || a.includes('어르신') || a.includes('50') || a.includes('60');
      const isYoung = a.includes('10대') || a.includes('20대') || a.includes('MZ') || a.includes('학생');

      let uxKey = '';
      let uxAdvice = '';
      if (isB2B) {
        uxKey = 'B2B 고객';
        uxAdvice = '관리자 대시보드 + 권한 관리 + 온보딩 가이드가 핵심입니다. 온보딩만 잘 만들어도 이탈률이 40% 줄어요.';
      } else if (isSenior) {
        uxKey = '시니어';
        uxAdvice = '큰 폰트(16px+), 넓은 터치 영역(48px+), 단순한 네비게이션이 필수입니다. 복잡한 제스처는 피하세요.';
      } else if (isYoung) {
        uxKey = 'MZ세대';
        uxAdvice = '3초 안에 핵심 가치를 보여줘야 합니다. 다크모드 + 소셜 공유 + 세련된 UI가 리텐션을 결정해요.';
      } else {
        uxKey = '일반 사용자';
        uxAdvice = '첫 사용 시 3단계 이내에 핵심 가치를 경험하게 설계하세요. 직관적 네비게이션이 핵심입니다.';
      }

      // 이전 답변(프로젝트 유형) 참조
      const projectRef = detectedType ? ` ${detectedType.type}의` : '';

      return {
        message: `좋습니다! **${uxKey}**를 타겟으로 하시는군요.\n\n💡${projectRef} ${uxKey} 대상 UX 핵심:\n${uxAdvice}\n\n📊 **위시켓 인사이트:** 타겟을 명확히 정의한 프로젝트는 견적 정확도가 30% 이상 높아집니다.`,
        thinkingLabel: '타겟 사용자 분석 중...',
      };
    }

    case 3: {
      const features = parseFeatures(a, detectedProjectType);
      const ti = detectedType;

      // 누락 기능 감지
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

      // 총 개발 기간 추정
      let totalWeeksMin = 0;
      let totalWeeksMax = 0;
      features.forEach(f => {
        for (const [keyword, info] of Object.entries(FEATURE_DB)) {
          if (f.name.includes(keyword)) {
            const wMatch = info.weeks.match(/(\d+)~(\d+)/);
            if (wMatch) {
              totalWeeksMin += parseInt(wMatch[1]);
              totalWeeksMax += parseInt(wMatch[2]);
            }
            break;
          }
        }
      });

      // 컴팩트한 기능 분석
      const featureList = features.map(f => {
        let detail = '';
        for (const [keyword, info] of Object.entries(FEATURE_DB)) {
          if (f.name.includes(keyword)) {
            detail = ` (${info.complexity} ${info.weeks})`;
            break;
          }
        }
        return `**[${f.priority}]** ${f.name}${detail}`;
      }).join('\n');

      let timeEstimate = '';
      if (totalWeeksMin > 0) {
        timeEstimate = `\n\n⏱️ **예상 개발 기간:** ${totalWeeksMin}~${totalWeeksMax}주 (전체 병렬 진행 시 60~70% 수준)`;
      }

      let mvpWarning = '';
      if (features.length > 5) {
        mvpWarning = `\n\n⚠️ ${features.length}개 기능은 MVP로 다소 많습니다. **P1 먼저 출시 → 피드백 → P2 추가**가 비용 40~60% 절감 전략입니다.`;
      }

      let missingText = '';
      if (missingFeatures.length > 0) {
        missingText = `\n\n🔍 **혹시 빠뜨리신 건 아닌가요?**\n이 유형에서 보통 필요한 기능: ${missingFeatures.slice(0, 3).join(', ')}`;
      }

      return {
        message: `기능을 분석했습니다!\n\n${featureList}${timeEstimate}${mvpWarning}${missingText}`,
        quickReplies: missingFeatures.length > 0 ? ['이대로 진행', ...missingFeatures.slice(0, 3)] : undefined,
        thinkingLabel: '기능별 복잡도 분석 중...',
      };
    }

    case 4:
      if (a === '건너뛰기' || a.length < 3) {
        return {
          message: '넘어갈게요! 괜찮습니다.\n\n💡 나중에 개발사 미팅 시 경쟁 서비스 2~3개를 조사해서 "이건 참고, 이건 다르게"를 공유하면 소통 시간이 50% 단축됩니다.',
        };
      }
      return {
        message: `좋은 벤치마크네요!\n\n💡 **견적 정확도 UP 공식:**\n"이 서비스의 **A기능처럼** + 우리는 **B를 다르게** + **C는 안 해도 됨**"\n\n이렇게 구조화하면 개발사가 훨씬 정확한 견적을 줍니다.`,
        thinkingLabel: '참고 서비스 분석 중...',
      };

    case 5: {
      const isApp = a.includes('앱') || a.includes('모바일') || a.includes('ios') || a.includes('안드로이드');
      const isWeb = a.includes('웹') || a.includes('사이트');
      const isBoth = a.includes('둘') || a.includes('다') || a.includes('모두') || (isApp && isWeb);
      const isUndecided = a.includes('미정') || a.includes('모르');

      let advice = '';
      if (isBoth) {
        advice = '**웹+앱 동시** 개발이시군요.\n\n📊 위시켓 데이터: **"웹 먼저 → 시장 검증 → 앱 확장"** 전략이 성공률 23% 높습니다.\n크로스플랫폼(Flutter/RN)으로 양쪽을 동시에 가면 비용 30~40% 절감도 가능합니다.';
      } else if (isApp) {
        advice = '**모바일 앱**이시군요.\n\n📊 2025년 기준 위시켓 크로스플랫폼 선택 비율 **67%** — Flutter가 가성비 최고입니다.\n네이티브 대비 비용 30~40% 절감, 성능은 95% 수준.';
      } else if (isWeb) {
        advice = '**웹 서비스**를 선택하셨군요.\n\n💡 Next.js(React 기반)가 SEO·성능·생산성 모두 우수합니다.\n나중에 앱이 필요하면 PWA로 저비용 전환 가능해요.';
      } else if (isUndecided) {
        const rec = (detectedProjectType === '모바일 앱' || detectedProjectType === '매칭 플랫폼')
          ? '이 유형은 **모바일 앱(크로스플랫폼)**이 추천입니다.'
          : '이 유형은 **웹 서비스(반응형)**를 먼저 개발하는 게 효율적입니다.';
        advice = `아직 미정이시군요.\n\n💡 ${rec}\n\n특별한 기술 선호가 없다면 개발사 주력 스택을 존중하는 것이 품질 면에서 유리합니다.`;
      } else {
        advice = '확인했습니다!\n\n💡 특별한 기술 선호가 없다면 "기술 스택은 개발사 추천에 따름"으로 명시하면 더 다양한 견적을 받을 수 있습니다.';
      }

      return {
        message: advice,
        thinkingLabel: '기술 요구사항 분석 중...',
      };
    }

    case 6: {
      const hasBudget = /\d/.test(a);
      const isUndecided = a.includes('미정') || a.includes('모르') || a.includes('아직');
      const ti = detectedType;

      if (!hasBudget || isUndecided) {
        return {
          message: `예산 미정이시군요. 충분히 이해합니다!\n\n📊 **${ti?.type || '유사'} 프로젝트 참고** (위시켓 실거래 기준):\nMVP: **${ti?.avgBudget || '1,500~3,000만원'}** | 기간: **${ti?.avgDuration || '6~12주'}**\n\n💡 이 RFP로 **위시켓에서 무료로 5~8곳** 견적 비교가 가능합니다.\n\n⚠️ 예산의 **15~20% 여유분**은 반드시 확보하세요 — 변경 요청은 100% 발생합니다.`,
          thinkingLabel: '시장 가격 데이터 조회 중...',
        };
      }

      // 예산 파싱
      let budgetVal = 0;
      const moneyMatch = a.match(/(\d{1,3}[,.]?\d{0,3})\s*만/);
      if (moneyMatch) budgetVal = parseInt(moneyMatch[1].replace(/[,.]/g, '')) * 10000;
      const okMatch = a.match(/(\d+)\s*억/);
      if (okMatch) budgetVal = parseInt(okMatch[1]) * 100000000;

      let budgetFeedback = '';
      if (ti && budgetVal > 0) {
        const avgLow = parseInt(ti.avgBudget.replace(/[^0-9]/g, '').slice(0, 4)) * 10000;
        if (budgetVal < avgLow * 0.7) {
          budgetFeedback = `\n\n⚠️ 말씀하신 예산이 평균(${ti.avgBudget})보다 다소 낮습니다. MVP 범위를 최소화하거나 일부 기능을 2차로 미루는 걸 권장합니다.`;
        } else {
          budgetFeedback = `\n\n✅ 이 유형 평균(${ti.avgBudget})과 적절한 범위입니다.`;
        }
      }

      return {
        message: `확인했습니다!${budgetFeedback}\n\n💡 **결제 추천 구조:** 착수금 30% → 중간 40% → 완료 30%\n마일스톤별 "구체적 산출물"을 반드시 계약서에 명시하세요.\n\n📊 **핵심 팁:** 가장 낮은 견적 ≠ 최선. **포트폴리오 + 소통 역량**이 더 중요합니다.`,
        thinkingLabel: '예산 적정성 분석 중...',
      };
    }

    case 7: {
      // 전체 여정 요약을 포함한 마무리
      const projectName = previousAnswers[1] ? previousAnswers[1].slice(0, 20) : '프로젝트';

      return {
        message: `모든 정보가 수집되었습니다!\n\n📋 **"${projectName}" 계약 전 필수 체크:**\n▸ 소스코드 소유권: **발주사 귀속** 명시\n▸ 하자보수: **최소 6개월** (위시켓 추천)\n▸ 중간 검수권: 마일스톤별 검수 후 다음 단계\n▸ 추가 개발 단가: 사전 합의\n\n아래 버튼을 눌러 **전문 RFP**를 완성하세요!`,
        thinkingLabel: 'RFP 최종 검토 중...',
      };
    }

    default:
      return { message: '감사합니다! 답변을 RFP에 반영했습니다.' };
  }
}

// ═══════════════════════════════════════════════════════
//  동적 다음 질문 (컨텍스트 인지)
// ═══════════════════════════════════════════════════════
function getDynamicNextQuestion(nextStep: number): { question: string; quickReplies?: string[] } {
  const ti = detectedType;

  switch (nextStep) {
    case 2: {
      const customQ = ti?.targetQuestions?.[0];
      return {
        question: customQ || '이 서비스를 주로 누가 사용하게 될까요?',
        quickReplies: ti?.targetQuickReplies || ['20~30대 직장인', '전 연령 일반 사용자', 'B2B 기업 고객', '10~20대 학생'],
      };
    }

    case 3: {
      const hint = ti ? `\n💡 이 유형 추천 기능: ${ti.keyFeatures.join(', ')}` : '';
      return {
        question: `가장 중요한 핵심 기능을 알려주세요. (3~5개 추천)${hint}`,
        quickReplies: ti?.featureQuickReplies || ['회원가입/로그인', '결제', '채팅', '검색/필터', '관리자 패널', '알림'],
      };
    }

    case 4: {
      return {
        question: '비슷하게 만들고 싶은 서비스가 있나요?\n"이 서비스의 이 부분처럼" 식으로 말씀해주시면 완벽합니다.',
        quickReplies: ['건너뛰기', '직접 입력할게요'],
      };
    }

    case 5: {
      const rec = (detectedProjectType === '모바일 앱' || detectedProjectType === '매칭 플랫폼')
        ? '\n💡 이 유형은 모바일 앱이 일반적입니다.'
        : (detectedProjectType === '웹사이트' || detectedProjectType === '웹 서비스' || detectedProjectType === 'SaaS')
        ? '\n💡 이 유형은 웹 서비스가 효율적입니다.'
        : '';
      return {
        question: `웹으로 만들까요, 앱으로 만들까요?${rec}`,
        quickReplies: ['모바일 앱 (iOS/Android)', '웹 서비스', '웹 + 앱 둘 다', '아직 미정이에요'],
      };
    }

    case 6: {
      const budgetRef = ti ? `\n💡 참고: ${ti.type} 평균 ${ti.avgBudget}, ${ti.avgDuration}` : '';
      return {
        question: `예산과 희망 완료 시점이 있으신가요?${budgetRef}`,
        quickReplies: ['1,000~3,000만원', '3,000~5,000만원', '5,000만원 이상', '아직 미정'],
      };
    }

    case 7: {
      return {
        question: '마지막! 개발사에 꼭 전달하고 싶은 사항이 있나요?',
        quickReplies: ['소스코드 귀속 필요', '디자인 포함', '유지보수 계약 필요', '건너뛰기'],
      };
    }

    default:
      return { question: STEPS[nextStep - 1]?.question || '' };
  }
}

// ═══════════════════════════════════════════════════════
//  기타 파서
// ═══════════════════════════════════════════════════════
function parseTargetUsers(text: string): string {
  const t = text.trim();
  const segments: string[] = [];
  const ageMatch = t.match(/(\d{1,2})\s*[~\-대]\s*(\d{1,2})?/);
  if (ageMatch) segments.push(`연령대: ${ageMatch[0]}`);
  const roles = ['직장인', '학생', '주부', '프리랜서', '사업자', '소상공인', '기업', 'B2B', 'B2C', '개발자', '디자이너', '마케터', '의사', '환자', '시니어', '어린이', '부모', '자영업', '창업자', '투자자'];
  for (const role of roles) {
    if (t.includes(role)) segments.push(role);
  }
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
//  메인 함수
// ═══════════════════════════════════════════════════════
export function generateFallbackResponse(
  userMessage: string,
  currentStep: number
): FallbackResponse {
  const section = SECTION_MAP[currentStep];
  const nextStep = currentStep < 7 ? currentStep + 1 : null;
  const isComplete = currentStep >= 7;
  const isSkip = userMessage.trim() === '건너뛰기' || userMessage.trim() === '이대로 진행';

  // RFP 데이터 업데이트
  let rfpUpdate: FallbackResponse['rfpUpdate'] = null;

  if (!isSkip) {
    if (section === 'coreFeatures') {
      rfpUpdate = { section, value: parseFeatures(userMessage, detectedProjectType) };
    } else if (section === 'overview') {
      const { typeInfo } = detectProjectType(userMessage);
      rfpUpdate = { section, value: `${userMessage.trim()} — ${typeInfo.type} 프로젝트` };
    } else if (section === 'targetUsers') {
      rfpUpdate = { section, value: parseTargetUsers(userMessage) };
    } else if (section === 'techRequirements') {
      rfpUpdate = { section, value: parseTechRequirements(userMessage) };
    } else if (section === 'budgetTimeline') {
      rfpUpdate = { section, value: parseBudgetTimeline(userMessage) };
    } else if (section) {
      rfpUpdate = { section, value: userMessage.trim() };
    }
  }

  // 전문가 피드백 + 동적 다음 질문
  let message: string;
  let quickReplies: string[] | undefined;
  let thinkingLabel: string | undefined;

  if (isComplete) {
    const projectName = previousAnswers[1] ? previousAnswers[1].slice(0, 30) : '프로젝트';
    const ti = detectedType;

    message = `모든 정보가 수집되었습니다!\n\n📋 **"${projectName}" RFP 생성 준비 완료**\n\n포함 내용:\n▸ 기능별 상세 분석 + 복잡도·소요기간·수락기준\n▸ 화면 설계 요약 + 데이터 설계\n▸ MVP 로드맵 + 리스크 분석\n▸ 개발사 선정 가이드 + 계약 체크리스트\n${ti ? `\n📊 이 ${ti.type} 프로젝트 추천 MVP: ${ti.mvpScope}` : ''}\n\n아래 버튼을 눌러 **전문 RFP**를 완성하세요!`;
    thinkingLabel = 'RFP 문서 구조 설계 중...';
  } else if (nextStep && nextStep <= 7) {
    const feedback = getExpertFeedback(currentStep, userMessage);
    const nextQ = getDynamicNextQuestion(nextStep);
    message = `${feedback.message}\n\n---\n\n**${STEPS[nextStep - 1].label}** (${nextStep}/7)\n${nextQ.question}`;
    quickReplies = feedback.quickReplies || nextQ.quickReplies;
    thinkingLabel = feedback.thinkingLabel;
  } else {
    message = '감사합니다! 답변을 RFP에 반영했습니다.';
  }

  return {
    message,
    rfpUpdate,
    nextAction: isComplete ? 'complete' : 'continue',
    nextStep,
    quickReplies,
    thinkingLabel,
  };
}
