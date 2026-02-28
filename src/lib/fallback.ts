// AI RFP Builder — Dynamic Conversation Engine v5
// 고정형 질문 탈피 → 사용자 답변 분석 기반 동적 대화
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
//  프로젝트 유형 인텔리전스 DB (13년 위시켓 데이터)
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
  targetQuestions: string[];    // 유형별 맞춤 후속 질문
  targetQuickReplies: string[]; // 유형별 맞춤 빠른 응답
  featureQuickReplies: string[]; // 유형별 추천 기능 칩
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
    techTip: 'Flutter나 React Native로 크로스플랫폼 개발하면 iOS/Android 동시 개발 시 비용 30~40% 절감 가능.',
    commonRisk: '앱스토어 심사(평균 1~2주)를 일정에 반드시 포함해야 합니다.',
    targetQuestions: ['이 앱을 주로 사용하는 사람은 어떤 분들인가요? (예: 20~30대 직장인, 시니어 등)', '하루 중 언제 이 앱을 가장 많이 사용할 것 같으세요?'],
    targetQuickReplies: ['20~30대 직장인', '전 연령 일반 사용자', '10~20대 학생/MZ세대', '40~60대 시니어'],
    featureQuickReplies: ['소셜 로그인', '결제 기능', '채팅/메시지', '지도/위치 기반', '푸시 알림', '예약 기능'],
  },
  '웹 서비스': {
    type: '웹 서비스',
    avgBudget: '1,500~4,000만원',
    avgDuration: '4~6주(MVP)',
    successRate: '78%',
    keyFeatures: ['반응형 디자인', '회원 시스템', 'SEO 최적화'],
    mustHaveFeatures: ['반응형(모바일 대응)', 'SEO 메타 태그', 'SSL 인증서'],
    commonMistakes: ['모바일 사용자 비율 과소평가', 'SEO 미고려', '브라우저 호환성 미테스트'],
    techTip: '반응형으로 설계하면 별도 앱 없이 모바일까지 커버. Next.js가 현재 가장 검증된 선택.',
    commonRisk: '브라우저 호환성(Chrome, Safari, Edge)을 초기에 정의해야 수정 비용 절감.',
    targetQuestions: ['이 웹 서비스를 주로 사용하는 사용자는 누구인가요?', 'PC와 모바일 중 어디에서 더 많이 접속할 것 같으세요?'],
    targetQuickReplies: ['B2B 기업 고객', '일반 소비자(B2C)', '내부 직원용', '특정 전문가 그룹'],
    featureQuickReplies: ['회원가입/로그인', '대시보드', '게시판', '검색/필터', '관리자 패널', '결제'],
  },
  '웹사이트': {
    type: '웹사이트',
    avgBudget: '500~2,000만원',
    avgDuration: '2~4주',
    successRate: '85%',
    keyFeatures: ['반응형 레이아웃', '콘텐츠 관리', '문의 폼'],
    mustHaveFeatures: ['모바일 반응형', '문의/연락처 폼', 'SEO 기본 설정'],
    commonMistakes: ['콘텐츠 준비 지연으로 프로젝트 전체 딜레이', 'CMS 없이 정적으로만 제작', '호스팅 비용 미고려'],
    techTip: 'WordPress나 Next.js 같은 검증된 프레임워크로 개발 기간 50% 이상 단축 가능.',
    commonRisk: '콘텐츠(텍스트, 이미지)는 발주사가 미리 준비해야 일정이 맞습니다.',
    targetQuestions: ['이 웹사이트의 방문자는 주로 어떤 분들인가요?', '웹사이트의 주요 목적은 무엇인가요? (브랜딩, 고객 유치, 정보 제공 등)'],
    targetQuickReplies: ['잠재 고객', '기존 고객', '투자자/파트너', '일반 대중'],
    featureQuickReplies: ['콘텐츠 관리(CMS)', '문의 폼', '블로그', '포트폴리오', '뉴스/공지사항', 'FAQ'],
  },
  '이커머스': {
    type: '이커머스',
    avgBudget: '3,000~8,000만원',
    avgDuration: '8~12주',
    successRate: '65%',
    keyFeatures: ['상품 관리', '장바구니/결제', '주문/배송 관리', '리뷰'],
    mustHaveFeatures: ['PG 결제(카드/간편결제)', '주문 상태 관리', '재고 관리', '교환/환불 처리'],
    commonMistakes: ['재고 관리 복잡도 과소평가', 'PG 심사 기간(2~3주) 미반영', '정산 시스템 후순위 처리'],
    techTip: 'PG 연동(이니시스/토스페이먼츠)은 심사에 2~3주 소요. 초기 설계에 반드시 포함.',
    commonRisk: '교환/환불 프로세스와 정산 시스템이 가장 복잡한 부분입니다.',
    targetQuestions: ['어떤 상품/서비스를 판매하시나요? (실물 상품, 디지털, 서비스 등)', '구매자가 주로 어떤 경로로 상품을 찾게 될까요?'],
    targetQuickReplies: ['20~40대 온라인 쇼핑 이용자', 'B2B 도매/기업 구매자', '특정 취미/관심사 커뮤니티', '전 연령 일반 소비자'],
    featureQuickReplies: ['장바구니/결제', '상품 관리', '주문/배송 추적', '리뷰/평점', '쿠폰/포인트', '검색/필터'],
  },
  '플랫폼': {
    type: '플랫폼',
    avgBudget: '5,000만~1.5억',
    avgDuration: '8~16주',
    successRate: '58%',
    keyFeatures: ['공급/수요 매칭', '결제/정산', '리뷰/평가', '관리자 대시보드'],
    mustHaveFeatures: ['양면 사용자(공급/수요) 가입 프로세스', '매칭/검색', '결제/정산 분리', '분쟁 해결 프로세스'],
    commonMistakes: ['"닭과 달걀" 문제 해결 전략 부재', '정산 시스템 후순위 처리', '공급자/수요자 UX 미분리'],
    techTip: '양면 마켓플레이스는 초기에 한쪽(공급 또는 수요)에 집중하는 것이 성공률이 높습니다.',
    commonRisk: '양면 시장의 "닭과 달걀" 문제 해결 전략이 필수입니다.',
    targetQuestions: ['공급자(서비스 제공자)와 수요자(이용자) 각각 어떤 분들인가요?', '초기에 공급자를 먼저 모을 계획인가요, 수요자를 먼저 모을 계획인가요?'],
    targetQuickReplies: ['전문가 ↔ 일반 소비자', '기업 ↔ 프리랜서', '판매자 ↔ 구매자', '서비스 제공자 ↔ 이용자'],
    featureQuickReplies: ['매칭/검색', '채팅/메시지', '결제/정산', '리뷰/평가', '프로필/포트폴리오', '관리자 대시보드'],
  },
  'SaaS': {
    type: 'SaaS',
    avgBudget: '3,000~8,000만원',
    avgDuration: '8~12주',
    successRate: '62%',
    keyFeatures: ['멀티테넌시', '구독/결제', '대시보드', '팀 관리'],
    mustHaveFeatures: ['구독 결제(월/연)', '팀/워크스페이스 관리', '데이터 내보내기', '사용량 대시보드'],
    commonMistakes: ['요금 체계를 너무 복잡하게 설계', '온보딩 플로우 미설계', '멀티테넌시 보안 미고려'],
    techTip: '초기에는 단일 요금제로 시작 → PMF 검증 후 세분화. 결제는 Stripe 또는 토스페이먼츠 추천.',
    commonRisk: 'SaaS는 지속 운영이 핵심. 유지보수 계약을 사전에 반드시 협의.',
    targetQuestions: ['이 서비스를 사용할 기업/팀의 규모는 어느 정도인가요?', '의사결정자(구매자)와 실제 사용자가 다른가요?'],
    targetQuickReplies: ['스타트업/소규모 팀', '중견기업', '대기업', '1인 기업/프리랜서'],
    featureQuickReplies: ['대시보드/분석', '팀 관리/권한', '구독 결제', 'API 연동', '데이터 내보내기', '알림/리포트'],
  },
  '매칭 플랫폼': {
    type: '매칭 플랫폼',
    avgBudget: '4,000~1억',
    avgDuration: '8~14주',
    successRate: '55%',
    keyFeatures: ['프로필/포트폴리오', '매칭 알고리즘', '채팅', '결제/정산'],
    mustHaveFeatures: ['프로필 시스템', '검색/필터', '1:1 채팅', '결제/정산'],
    commonMistakes: ['알고리즘보다 수동 큐레이션이 초기에 더 효과적', '초기 사용자 확보 전략 부재', '리뷰/신뢰 시스템 후순위 처리'],
    techTip: '초기 매칭은 수동 큐레이션으로 시작 → 데이터 축적 후 알고리즘 전환이 리스크가 낮습니다.',
    commonRisk: '초기 사용자 확보 전략(공급자 먼저 vs 수요자 먼저)을 명확히 해야 합니다.',
    targetQuestions: ['매칭되는 양쪽은 각각 어떤 분들인가요?', '매칭 기준은 무엇인가요? (위치, 전문성, 가격 등)'],
    targetQuickReplies: ['전문가 ↔ 고객', '구직자 ↔ 기업', '튜터 ↔ 학생', '서비스 제공자 ↔ 이용자'],
    featureQuickReplies: ['프로필/포트폴리오', '매칭 검색', '채팅/메시지', '결제/정산', '리뷰/평가', '알림'],
  },
  '헬스케어': {
    type: '헬스케어',
    avgBudget: '4,000~1억',
    avgDuration: '10~16주',
    successRate: '60%',
    keyFeatures: ['건강 데이터 관리', '전문가 연결', '알림/리마인더'],
    mustHaveFeatures: ['개인정보보호(민감정보 처리)', '데이터 암호화', '접근 권한 관리'],
    commonMistakes: ['의료법/개인정보보호법 미검토', '데이터 보안 수준 부족', '규제 승인 기간 미고려'],
    techTip: '개인정보보호법(특히 민감정보)과 의료법을 초기 설계에 반드시 반영해야 합니다.',
    commonRisk: '의료 데이터 규제(PIPA)로 인해 서버 위치와 암호화 수준이 법적 요구사항입니다.',
    targetQuestions: ['서비스 이용자가 환자(일반인)인가요, 의료 전문가인가요, 아니면 양쪽 모두인가요?', '건강 데이터의 민감도는 어느 수준인가요? (일반 건강정보 vs 진료/처방 데이터)'],
    targetQuickReplies: ['일반인/환자', '의료 전문가', '보호자/가족', '기업(임직원 건강관리)'],
    featureQuickReplies: ['건강 데이터 기록', '전문가 상담', '알림/리마인더', '예약', '기기 연동(웨어러블)', '리포트/분석'],
  },
  '핀테크': {
    type: '핀테크',
    avgBudget: '5,000만~2억',
    avgDuration: '12~20주',
    successRate: '52%',
    keyFeatures: ['본인인증(KYC)', '계좌 연동', '거래 내역', '보안'],
    mustHaveFeatures: ['본인인증(KYC)', '금융보안 (2FA, 암호화)', '거래 로깅', '금융위 인허가 준비'],
    commonMistakes: ['금융 규제 준수 비용 과소평가', '보안 감사 비용 미반영', '인허가 기간(3~6개월) 미고려'],
    techTip: '금융위 인허가, 전자금융업 등록 등 규제 요건을 개발 전에 반드시 확인하세요.',
    commonRisk: '금융 규제 준수 추가 비용이 초기 예상의 30~50% 추가될 수 있습니다.',
    targetQuestions: ['금융 서비스의 구체적 유형은 무엇인가요? (송금, 투자, 보험, 대출 등)', '기존에 금융 관련 인허가를 보유하고 계신가요?'],
    targetQuickReplies: ['일반 소비자', '투자자', '소상공인/자영업자', '기업 재무팀'],
    featureQuickReplies: ['본인인증(KYC)', '결제/송금', '계좌 연동', '거래 내역/리포트', '보안(2FA)', '자산 관리'],
  },
  'AI 서비스': {
    type: 'AI 기반 서비스',
    avgBudget: '3,000~1억',
    avgDuration: '8~16주',
    successRate: '60%',
    keyFeatures: ['AI 모델 연동', '데이터 처리', '결과 시각화'],
    mustHaveFeatures: ['AI API 연동(OpenAI/Claude 등)', '프롬프트 관리', '결과 캐싱', '사용량 모니터링'],
    commonMistakes: ['AI 정확도 기대치 미설정', 'API 비용 과소평가', '응답 속도 미고려'],
    techTip: 'AI 모델은 직접 개발보다 API(OpenAI, Claude)를 활용하면 초기 비용 80% 이상 절감.',
    commonRisk: 'AI API 비용이 사용량에 비례하므로 비용 관리 전략이 필수입니다.',
    targetQuestions: ['AI가 해결해야 할 핵심 문제는 무엇인가요?', '사용자가 AI 결과의 정확도를 어느 수준으로 기대하나요?'],
    targetQuickReplies: ['일반 소비자', '전문가/전문직', '기업 직원', '콘텐츠 크리에이터'],
    featureQuickReplies: ['AI 챗봇/대화', '이미지 생성/분석', '문서 자동 생성', '데이터 분석', '추천 시스템', '음성 인식/합성'],
  },
  '예약 서비스': {
    type: '예약 서비스',
    avgBudget: '2,000~5,000만원',
    avgDuration: '6~10주',
    successRate: '72%',
    keyFeatures: ['일정 관리', '예약/취소', '알림', '결제'],
    mustHaveFeatures: ['캘린더 UI', '예약 확인/취소', '알림(SMS/푸시)', '동시 예약 방지'],
    commonMistakes: ['시간대(timezone) 처리 미고려', '동시 예약(race condition) 미방지', '취소/환불 정책 미설계'],
    techTip: '캘린더 UI가 사용자 경험의 80%를 좌우. 검증된 캘린더 라이브러리 선택이 핵심.',
    commonRisk: '동시 예약 방지(동시성 제어)는 반드시 서버 단에서 처리해야 합니다.',
    targetQuestions: ['어떤 종류의 예약인가요? (병원, 식당, 미용실, 숙박, 레슨 등)', '예약 관리자(사업자)와 예약자(고객) 중 어디에 먼저 집중하시나요?'],
    targetQuickReplies: ['일반 소비자/고객', '매장/사업자', '전문가(의사/트레이너 등)', '기업 관리자'],
    featureQuickReplies: ['캘린더/일정', '예약/취소', '결제', '알림/리마인더', '리뷰/평가', '관리자 대시보드'],
  },
  '에듀테크': {
    type: '에듀테크',
    avgBudget: '3,000~7,000만원',
    avgDuration: '8~14주',
    successRate: '65%',
    keyFeatures: ['강의 관리', '학습 진도 추적', '퀴즈/평가'],
    mustHaveFeatures: ['동영상 스트리밍', '학습 진도 대시보드', '퀴즈/테스트', '수료증 발급'],
    commonMistakes: ['동영상 호스팅 비용 과소평가', '콘텐츠 DRM(불법 복제 방지) 미고려', '오프라인 학습 미지원'],
    techTip: '동영상 스트리밍은 AWS MediaConvert 등 클라우드 서비스로 인프라 비용 절감 가능.',
    commonRisk: '동영상 호스팅/CDN 비용이 예상보다 높을 수 있으니 사전 산정 필수.',
    targetQuestions: ['학습 대상은 누구인가요? (학생, 직장인, 전문가 등)', '학습 방식은 어떤 형태인가요? (동영상, 라이브, 텍스트 등)'],
    targetQuickReplies: ['학생(초중고)', '대학생/취준생', '직장인/전문가', '시니어/평생교육'],
    featureQuickReplies: ['강의 콘텐츠 관리', '학습 진도 추적', '퀴즈/평가', '수료증 발급', '결제/구독', '커뮤니티/Q&A'],
  },
  '소프트웨어 서비스': {
    type: '소프트웨어 서비스',
    avgBudget: '2,000~5,000만원',
    avgDuration: '6~12주',
    successRate: '70%',
    keyFeatures: ['핵심 비즈니스 로직', '사용자 인증', '데이터 관리'],
    mustHaveFeatures: ['사용자 인증', '핵심 기능', '데이터 백업'],
    commonMistakes: ['요구사항 변경(스코프 크리프)이 가장 흔한 지연 원인', 'MVP 범위 과다 설정', '테스트 기간 부족'],
    techTip: '첫 MVP는 핵심 기능 3개 이내로 제한하는 것이 성공 확률이 가장 높습니다.',
    commonRisk: '스코프 크리프(요구사항 계속 추가)가 가장 흔한 프로젝트 실패 원인.',
    targetQuestions: ['이 서비스를 주로 사용하는 분들은 누구인가요?'],
    targetQuickReplies: ['일반 소비자', '기업 고객(B2B)', '내부 직원용', '특정 전문가 그룹'],
    featureQuickReplies: ['회원가입/로그인', '대시보드', '검색/필터', '결제', '알림', '관리자 패널'],
  },
};

// ═══════════════════════════════════════════════════════
//  기능 분석 데이터베이스
// ═══════════════════════════════════════════════════════
const FEATURE_DB: Record<string, { desc: string; complexity: string; weeks: string; subFeatures: string[]; risks: string; acceptance: string }> = {
  '로그인': { desc: '이메일/소셜(카카오·네이버·구글) 로그인, 자동 로그인, 비밀번호 찾기', complexity: '★★☆☆☆', weeks: '1~2주', subFeatures: ['이메일 회원가입', '소셜 로그인(카카오/네이버/구글)', '비밀번호 찾기/재설정', '자동 로그인(토큰)', '로그인 실패 처리(5회 잠금)'], risks: '소셜 로그인 API 정책 변경 시 대응 필요', acceptance: '회원가입 → 로그인 → 토큰 발급 → 자동 로그인까지 전체 플로우 정상 동작' },
  '회원': { desc: '회원가입(약관 동의, 프로필), 회원 등급, 마이페이지', complexity: '★★☆☆☆', weeks: '1~1.5주', subFeatures: ['약관 동의(필수/선택)', '프로필 설정/수정', '회원 탈퇴', '회원 등급'], risks: '개인정보 수집 동의 항목 법적 검토 필요', acceptance: '가입→프로필설정→수정→탈퇴 전체 라이프사이클 정상 동작' },
  '결제': { desc: 'PG 연동(토스페이먼츠/이니시스), 카드·계좌이체·간편결제 지원', complexity: '★★★★☆', weeks: '2~3주', subFeatures: ['PG 연동(토스페이먼츠/이니시스)', '신용카드/계좌이체', '간편결제(카카오페이·네이버페이)', '결제 내역 관리', '환불 처리'], risks: 'PG 심사에 2~3주 소요. 테스트→운영 전환 시 별도 심사', acceptance: '결제 요청→승인→완료→내역 조회→환불까지 전체 플로우 정상' },
  '채팅': { desc: 'WebSocket 기반 실시간 1:1/그룹 메시징, 읽음 확인', complexity: '★★★★☆', weeks: '2~4주', subFeatures: ['1:1 채팅', '그룹 채팅(선택)', '읽음 확인', '파일/이미지 첨부', '채팅 알림', '채팅 내역 검색'], risks: 'WebSocket 서버 별도 필요, 동시 접속자 수에 따른 인프라 비용 증가', acceptance: '메시지 전송→수신→읽음 확인→파일 첨부→알림까지 1초 이내 처리' },
  '관리자': { desc: '사용자/콘텐츠 관리, 통계 대시보드, 공지사항', complexity: '★★★★☆', weeks: '2~4주', subFeatures: ['사용자 관리(목록/정지/삭제)', '콘텐츠 관리(승인/삭제)', '통계 대시보드(DAU/MAU, 매출)', '공지사항 관리', '신고 처리'], risks: '관리자 권한 분리(슈퍼관리자/일반관리자) 설계 필요', acceptance: '사용자 검색→상태 변경→통계 확인→공지 등록까지 전체 기능 정상' },
  '알림': { desc: '푸시(FCM/APNs), 인앱 알림, 이메일/SMS 알림', complexity: '★★☆☆☆', weeks: '1~2주', subFeatures: ['푸시 알림(FCM/APNs)', '인앱 알림 센터', '이메일 알림', 'SMS 알림(선택)', '알림 설정(ON/OFF)'], risks: '푸시 토큰 관리와 알림 실패 대응 로직 필요', acceptance: '이벤트 발생→알림 전송→수신→읽음 처리→설정 변경까지 정상' },
  '검색': { desc: '키워드·자동완성·다중 조건 필터, 최근/인기 검색어', complexity: '★★★☆☆', weeks: '1~2주', subFeatures: ['키워드 검색', '자동완성', '다중 조건 필터', '최근 검색어', '인기 검색어', '정렬 옵션'], risks: '데이터량 증가 시 검색 속도 저하 — Elasticsearch 도입 검토', acceptance: '검색→필터→정렬→자동완성까지 0.5초 이내 응답' },
  '지도': { desc: 'GPS 현재 위치, 장소 검색(카카오맵/구글맵), 마커·경로', complexity: '★★★☆☆', weeks: '1~2주', subFeatures: ['현재 위치 탐지(GPS)', '장소 검색', '마커 표시/클러스터링', '경로 안내(선택)', '주변 검색'], risks: '지도 API 사용량 기반 과금 — 월 비용 사전 산정 필요', acceptance: '위치 탐지→검색→마커 표시→경로 안내까지 정상' },
  '예약': { desc: '캘린더 UI, 실시간 가용성, 예약/취소/변경, 리마인더', complexity: '★★★★☆', weeks: '2~3주', subFeatures: ['캘린더 UI', '시간 슬롯 선택', '실시간 가용성 확인', '예약 확인/취소/변경', '리마인더 알림'], risks: '동시 예약(race condition) 방지 필수, 시간대 처리 주의', acceptance: '날짜 선택→시간 선택→예약→확인→취소까지 전체 플로우 정상' },
  '리뷰': { desc: '별점(1~5), 텍스트/사진 리뷰, 평균 별점, 정렬/필터', complexity: '★★☆☆☆', weeks: '1주', subFeatures: ['별점 평가(1~5)', '텍스트 리뷰', '사진 첨부', '리뷰 신고', '평균 별점 계산', '정렬/필터'], risks: '허위 리뷰 방지 로직(구매 인증) 필요', acceptance: '리뷰 작성→별점→사진첨부→목록 조회→정렬까지 정상' },
  '게시판': { desc: 'WYSIWYG 에디터, 댓글/대댓글, 좋아요, 신고, 페이지네이션', complexity: '★★★☆☆', weeks: '1~2주', subFeatures: ['글 작성/수정/삭제', 'WYSIWYG 에디터', '이미지/파일 첨부', '댓글/대댓글', '좋아요', '신고'], risks: '에디터 선택(TipTap, Quill 등)에 따라 구현 범위 차이', acceptance: '글 작성→이미지 첨부→댓글→좋아요→신고까지 전체 기능 정상' },
  '장바구니': { desc: '상품 담기/삭제, 수량·옵션 변경, 합계 계산', complexity: '★★☆☆☆', weeks: '1~1.5주', subFeatures: ['상품 담기/삭제', '수량 변경', '옵션 선택', '합계 자동 계산', '비회원 장바구니(로컬 저장)'], risks: '비회원↔회원 전환 시 장바구니 병합 로직 필요', acceptance: '상품 추가→수량 변경→옵션 변경→합계 계산→결제 연동까지 정상' },
  '대시보드': { desc: 'KPI 시각화(차트), 실시간 모니터링, 리포트/내보내기', complexity: '★★★★☆', weeks: '2~3주', subFeatures: ['핵심 KPI 차트/그래프', '기간별 필터', '실시간 데이터 갱신', '리포트 다운로드(PDF/CSV)', '위젯 커스터마이징'], risks: '데이터 양이 많으면 쿼리 최적화와 캐싱 전략 필요', acceptance: '데이터 로딩→차트 렌더링→필터 적용→리포트 다운로드까지 3초 이내' },
  '정산': { desc: '판매자 정산, 수수료 계산, 정산 주기, 세금계산서 연동', complexity: '★★★★★', weeks: '3~4주', subFeatures: ['판매자별 정산 집계', '수수료 자동 계산', '정산 주기 설정', '정산 내역 리포트', '세금계산서 발행 연동'], risks: '세무/회계 규정 준수 필수, 오차 0원 정밀도 요구', acceptance: '매출 집계→수수료 계산→정산금 확인→세금계산서 발행까지 정상' },
  '추천': { desc: '사용자 행동 기반 추천, 유사 아이템, 개인화 피드', complexity: '★★★★☆', weeks: '2~4주', subFeatures: ['행동 데이터 수집(열람/구매/좋아요)', '유사 아이템 추천', '개인화 피드', '추천 성과 분석'], risks: '초기에는 규칙 기반 추천으로 시작, 데이터 축적 후 ML 전환', acceptance: '사용자 행동 수집→추천 결과 생성→피드 노출→성과 측정까지 정상' },
  '쿠폰': { desc: '쿠폰 발급/사용/만료, 할인율/금액, 사용 조건', complexity: '★★☆☆☆', weeks: '1주', subFeatures: ['쿠폰 코드 생성/발급', '할인율/금액 할인', '유효기간 설정', '사용 조건(최소 금액/특정 상품)', '사용 내역 관리'], risks: '쿠폰 중복 사용 방지 로직 필수', acceptance: '쿠폰 발급→적용→할인 반영→사용 내역 조회까지 정상' },
};

// ═══════════════════════════════════════════════════════
//  프로젝트 유형 감지 (NLP-like)
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
//  기능 스마트 파싱 + 자동 보강
// ═══════════════════════════════════════════════════════
function parseFeatures(text: string, projectType?: string): { name: string; description: string; priority: string }[] {
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
//  동적 전문가 피드백 (프로젝트 유형 연동)
// ═══════════════════════════════════════════════════════

// 전역 상태: 프로젝트 유형 (step 1에서 설정)
let detectedType: ProjectTypeInfo | null = null;
let detectedProjectType: string = '';

function getExpertFeedback(step: number, answer: string): { message: string; quickReplies?: string[] } {
  const a = answer.trim();

  switch (step) {
    case 1: {
      const { projectType, typeInfo, confidence } = detectProjectType(a);
      detectedType = typeInfo;
      detectedProjectType = projectType;

      const confText = confidence === '높음'
        ? `**${typeInfo.type}** 프로젝트로 정확히 파악했습니다!`
        : confidence === '중간'
        ? `말씀하신 내용을 분석해보니 **${typeInfo.type}** 유형에 가장 가깝습니다.`
        : `**${typeInfo.type}** 유형으로 분류했습니다. 혹시 다른 유형이라면 알려주세요.`;

      return {
        message: `${confText}\n\n위시켓에서 이 유형의 프로젝트를 수천 건 매칭해왔는데요:\n\n▸ **평균 예산**: ${typeInfo.avgBudget}\n▸ **평균 기간**: ${typeInfo.avgDuration} (MVP 기준)\n▸ **프로젝트 성공률**: ${typeInfo.successRate}\n▸ **필수 기능**: ${typeInfo.mustHaveFeatures.join(', ')}\n\n⚠️ **이 유형에서 가장 흔한 실수:**\n${typeInfo.commonMistakes.map(m => `▸ ${m}`).join('\n')}\n\n💡 **전문가 팁:** ${typeInfo.techTip}`,
      };
    }

    case 2: {
      const ti = detectedType;
      const isB2B = a.includes('기업') || a.includes('B2B') || a.includes('업무');
      const isSenior = a.includes('시니어') || a.includes('어르신') || a.includes('50') || a.includes('60');
      const isYoung = a.includes('10대') || a.includes('20대') || a.includes('MZ') || a.includes('학생');

      let uxInsight = '';
      if (isB2B) {
        uxInsight = '▸ B2B는 **관리자 대시보드**와 **권한 관리**가 핵심입니다\n▸ 온보딩 가이드(첫 사용 안내)를 포함하면 이탈률이 40% 감소합니다\n▸ 데이터 내보내기(CSV/Excel) 기능은 거의 필수입니다';
      } else if (isSenior) {
        uxInsight = '▸ **최소 16px 폰트**, 큰 터치 영역(48px+), 간결한 네비게이션 필수\n▸ 복잡한 제스처(스와이프 등) 대신 명확한 버튼 사용\n▸ 접근성(a11y) 기준 준수하면 더 넓은 사용자 커버 가능';
      } else if (isYoung) {
        uxInsight = '▸ 빠른 로딩(3초 이내), **세련된 UI/UX**가 핵심 (첫인상에서 판단)\n▸ 소셜 공유, 알림 뱃지 등 **소셜 기능**이 리텐션에 큰 영향\n▸ 다크모드 지원을 고려하세요 — MZ세대의 60%+ 가 선호';
      } else {
        uxInsight = '▸ 직관적인 네비게이션과 명확한 CTA(행동 유도 버튼)가 핵심\n▸ 첫 사용 시 3단계 이내에 핵심 가치를 경험하게 설계하세요\n▸ 모바일 사용 비중을 고려한 반응형 설계 필수';
      }

      return {
        message: `타겟 사용자를 잘 파악하고 계시네요!\n\n📊 **타겟 맞춤 UI/UX 전략:**\n${uxInsight}\n\n💡 **위시켓 데이터 인사이트:** 타겟 사용자의 기술 수준에 따라 개발 복잡도와 비용이 20~30% 차이날 수 있습니다. 명확한 타겟 정의가 견적 정확도를 크게 높입니다.`,
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

      // 기능별 상세 분석
      const featureAnalysis = features.map(f => {
        let detail = '';
        for (const [keyword, info] of Object.entries(FEATURE_DB)) {
          if (f.name.includes(keyword)) {
            detail = `\n    서브기능: ${info.subFeatures.slice(0, 3).join(', ')}\n    주의: ${info.risks}`;
            break;
          }
        }
        return `▸ **[${f.priority}] ${f.name}** ${detail}`;
      }).join('\n');

      let warnings = '';
      if (features.length > 5) {
        warnings += `\n\n⚠️ **주의:** ${features.length}개 기능은 MVP로는 다소 많습니다. P1 기능만으로 먼저 출시하는 것을 **강력 추천**합니다.`;
      }

      let missingText = '';
      if (missingFeatures.length > 0) {
        missingText = `\n\n🔍 **누락 가능성 있는 기능:**\n이 유형의 프로젝트에서는 보통 아래 기능이 필요합니다:\n${missingFeatures.map(m => `▸ ${m}`).join('\n')}\n추가하실 건가요? 아니면 이대로 진행할까요?`;
      }

      return {
        message: `핵심 기능을 분석했습니다!\n\n${featureAnalysis}${warnings}\n\n💡 **MVP 전략:** P1 기능만으로 먼저 출시 → 사용자 피드백 반영 → P2/P3 순차 추가\n이 방식이 개발 비용을 40~60% 절감하면서 시장 검증도 가능합니다.${missingText}`,
        quickReplies: missingFeatures.length > 0 ? ['이대로 진행', ...missingFeatures.slice(0, 3)] : undefined,
      };
    }

    case 4:
      if (a === '건너뛰기' || a.length < 3) {
        return {
          message: '건너뛸게요! 참고 서비스가 없어도 충분합니다.\n\n💡 **팁:** 나중에 개발사 미팅 시 경쟁 서비스 2~3개를 조사해서 "이 부분은 참고, 이 부분은 다르게"를 공유하면 소통 시간이 50% 이상 단축됩니다.',
        };
      }
      return {
        message: `좋은 벤치마크입니다!\n\n💡 **위시켓 실전 팁:** 참고 서비스를 개발사에 전달할 때 이렇게 구조화하면 견적 정확도가 크게 올라갑니다:\n\n▸ **이 서비스처럼 할 부분**: 어떤 기능/디자인을 참고할 것인가\n▸ **우리는 다르게 할 부분**: 어떤 점을 차별화할 것인가\n▸ **빼도 되는 부분**: 필요 없는 기능\n\n이 구조가 RFP에 포함되면 개발사가 "아, 이분은 잘 아시는 분이다"라고 판단합니다.`,
      };

    case 5: {
      const isApp = a.includes('앱') || a.includes('모바일') || a.includes('ios') || a.includes('안드로이드');
      const isWeb = a.includes('웹') || a.includes('사이트');
      const isBoth = a.includes('둘') || a.includes('다') || a.includes('모두') || (isApp && isWeb);
      const isUndecided = a.includes('미정') || a.includes('모르');

      let advice = '';
      if (isBoth) {
        advice = '웹+앱 동시 개발을 원하시는군요!\n\n▸ **방식 A (비용 최적화)**: React Native/Flutter → 하나의 코드베이스로 양쪽 커버, 비용 30~40% 절감\n▸ **방식 B (품질 최적화)**: 웹 먼저 반응형 → 시장 검증 후 네이티브 앱\n\n위시켓 데이터상 **방식 B가 성공률이 23% 더 높습니다.** 시장 검증 없이 양쪽 동시 개발하면 리스크가 큽니다.';
      } else if (isApp) {
        advice = '모바일 앱 개발이군요!\n\n▸ **네이티브** (Swift/Kotlin): 최고 성능, 단 iOS/Android 각각 개발 → 비용 1.8~2배\n▸ **크로스플랫폼** (Flutter/React Native): 하나의 코드로 양쪽 → 비용 30~40% 절감, 성능 95% 수준\n\n💡 대부분의 외주 프로젝트에서는 **Flutter가 가성비 최고**입니다. (위시켓 2025년 기준 크로스플랫폼 선택 비율 67%)';
      } else if (isWeb) {
        advice = '웹 서비스를 선택하셨군요!\n\n▸ **프레임워크**: Next.js(React 기반)가 현재 가장 검증된 선택 — SEO, 성능, 개발 생산성 모두 우수\n▸ **반응형 필수**: 모바일 트래픽이 70%+ 이므로 반응형 설계는 선택이 아닌 필수\n\n💡 나중에 앱이 필요해지면 **PWA(프로그레시브 웹앱)**로 저비용 전환 가능합니다.';
      } else if (isUndecided) {
        const ti = detectedType;
        const recommendation = (detectedProjectType === '모바일 앱' || detectedProjectType === '매칭 플랫폼')
          ? '이 프로젝트 유형에서는 **모바일 앱(크로스플랫폼)**을 추천합니다. 사용자 접점이 모바일에 집중되는 특성이 있습니다.'
          : '이 프로젝트 유형에서는 **웹 서비스(반응형)**를 먼저 개발하는 것을 추천합니다. 비용 효율적이고 시장 검증이 빠릅니다.';
        advice = `아직 미정이시군요. 제 경험을 기반으로 추천드릴게요:\n\n💡 ${recommendation}\n\n단, 특별한 기술 선호가 없다면 개발사의 주력 스택을 존중하는 것이 품질 면에서 유리합니다.`;
      } else {
        advice = `플랫폼 선택을 확인했습니다!\n\n💡 **핵심 조언:** 특별한 기술 선호가 없다면 개발사의 주력 기술 스택을 존중하는 것이 품질과 일정 면에서 가장 유리합니다. 견적 요청 시 "기술 스택은 개발사 추천에 따름"으로 명시하면 더 다양한 견적을 받을 수 있습니다.`;
      }

      return {
        message: `기술 요구사항을 확인했습니다!\n\n${advice}`,
      };
    }

    case 6: {
      const hasBudget = /\d/.test(a);
      const isUndecided = a.includes('미정') || a.includes('모르') || a.includes('아직');
      const ti = detectedType;

      if (!hasBudget || isUndecided) {
        return {
          message: `예산이 아직 미정이시군요. 충분히 이해합니다!\n\n💡 **위시켓 추천 전략:**\n\n▸ 이 RFP로 최소 **3곳 이상** 견적을 비교하세요\n▸ 위시켓에서는 평균 5~8곳의 견적을 **무료**로 받을 수 있습니다\n\n📊 **${ti?.type || '유사'} 프로젝트 참고 예산** (위시켓 실거래 기준):\n▸ MVP(핵심만): ${ti?.avgBudget || '1,500~3,000만원'}\n▸ 본격 서비스: 위 금액의 1.5~2배\n▸ 기간: ${ti?.avgDuration || '6~12주'}\n\n⚠️ **견적 비교 시 반드시 확인:**\n▸ "총 비용"뿐 아니라 "마일스톤별 산출물"을 비교하세요\n▸ 가장 낮은 견적이 최선은 아닙니다 — 포트폴리오와 소통 역량이 더 중요합니다`,
        };
      }

      // 예산 파싱
      let budgetVal = 0;
      const moneyMatch = a.match(/(\d{1,3}[,.]?\d{0,3})\s*만/);
      if (moneyMatch) budgetVal = parseInt(moneyMatch[1].replace(/[,.]/g, '')) * 10000;
      const okMatch = a.match(/(\d+)\s*억/);
      if (okMatch) budgetVal = parseInt(okMatch[1]) * 100000000;

      let budgetAdvice = '';
      if (ti && budgetVal > 0) {
        const avgLow = parseInt(ti.avgBudget.replace(/[^0-9]/g, '').slice(0, 4)) * 10000;
        if (budgetVal < avgLow * 0.7) {
          budgetAdvice = `\n\n⚠️ **주의:** 말씀하신 예산이 이 유형(${ti.type}) 평균(${ti.avgBudget})보다 다소 낮습니다. MVP 범위를 최소화하거나, 일부 기능을 2차 개발로 미루는 것을 권장합니다.`;
        }
      }

      return {
        message: `예산과 일정을 확인했습니다!\n\n💡 **외주 프로젝트 예산 관리 핵심:**\n\n▸ 예상 예산의 **15~20% 여유분** 반드시 확보 — 변경 요청은 100% 발생합니다\n▸ 전체의 **10~15%**는 출시 후 버그 수정/개선에 예약\n▸ 결제는 **마일스톤별 분할** 추천: 착수금 30% → 중간 40% → 완료 30%\n\n📋 **결제 시 반드시 확인:**\n▸ 마일스톤별 구체적 산출물(뭘 받을 수 있는지) 명시\n▸ 추가 개발 발생 시 단가 기준 사전 합의\n▸ 검수 기간(보통 5영업일) 명시${budgetAdvice}`,
      };
    }

    case 7: {
      return {
        message: `모든 정보를 잘 정리했습니다!\n\n📋 **계약 전 필수 체크리스트 (위시켓 추천):**\n\n▸ **소스코드 소유권**: 발주사 귀속 (반드시 계약서에 명시)\n▸ **하자보수**: 최소 3개월 (위시켓 추천: 6개월)\n▸ **마일스톤 산출물**: 각 단계별 "뭘 받을 수 있는지" 명확히\n▸ **추가 개발 단가**: 사전 합의 (보통 1인/월 400~600만원)\n▸ **커뮤니케이션**: 주 1~2회 진행 리포트 의무화\n▸ **중간 검수권**: 마일스톤별 검수 후 다음 단계 착수\n▸ **지연 시 패널티**: 일정 초과 시 조건 사전 합의\n\n아래 버튼을 눌러 **전문 RFP 문서**를 완성하세요!`,
      };
    }

    default:
      return { message: '감사합니다! 답변 내용을 RFP에 반영했습니다.' };
  }
}

// ═══════════════════════════════════════════════════════
//  동적 다음 질문 생성 (고정형 탈피 핵심)
// ═══════════════════════════════════════════════════════
function getDynamicNextQuestion(nextStep: number): { question: string; quickReplies?: string[] } {
  const ti = detectedType;

  switch (nextStep) {
    case 2: {
      // 프로젝트 유형에 맞는 맞춤 질문
      const customQ = ti?.targetQuestions?.[0];
      return {
        question: customQ || '이 서비스를 주로 누가 사용하게 될까요? (연령, 직업, 특성 등)',
        quickReplies: ti?.targetQuickReplies || ['20~30대 직장인', '전 연령 일반 사용자', 'B2B 기업 고객', '10~20대 학생'],
      };
    }

    case 3: {
      return {
        question: `가장 중요한 핵심 기능을 말씀해주세요. (3~5개 추천)\n\n${ti ? `💡 이 유형에서 자주 포함되는 기능: ${ti.keyFeatures.join(', ')}` : ''}`,
        quickReplies: ti?.featureQuickReplies || ['회원가입/로그인', '결제', '채팅', '검색/필터', '관리자 패널', '알림'],
      };
    }

    case 4: {
      return {
        question: '비슷하게 만들고 싶은 서비스나 앱이 있나요?\n"이 서비스의 이 부분처럼" 식으로 말씀해주시면 개발사가 정확히 이해합니다.',
        quickReplies: ['건너뛰기', '직접 입력할게요'],
      };
    }

    case 5: {
      const recommendation = (detectedProjectType === '모바일 앱' || detectedProjectType === '매칭 플랫폼')
        ? '\n💡 이 프로젝트 유형에서는 모바일 앱이 일반적입니다.'
        : (detectedProjectType === '웹사이트' || detectedProjectType === '웹 서비스' || detectedProjectType === 'SaaS')
        ? '\n💡 이 프로젝트 유형에서는 웹 서비스가 가장 효율적입니다.'
        : '';
      return {
        question: `웹으로 만들까요, 앱으로 만들까요, 아니면 둘 다?${recommendation}`,
        quickReplies: ['모바일 앱 (iOS/Android)', '웹 서비스', '웹 + 앱 둘 다', '아직 미정이에요'],
      };
    }

    case 6: {
      const budgetRef = ti ? `\n💡 참고: ${ti.type} 프로젝트 평균 예산은 ${ti.avgBudget}, 기간은 ${ti.avgDuration}입니다.` : '';
      return {
        question: `예산 범위와 희망 완료 시점이 있으신가요? 대략적이어도 괜찮습니다.${budgetRef}`,
        quickReplies: ['1,000~3,000만원', '3,000~5,000만원', '5,000만원 이상', '아직 미정'],
      };
    }

    case 7: {
      return {
        question: '마지막으로, 개발사에 꼭 전달하고 싶은 사항이 있나요?\n(소스코드 소유권, 보안, 디자인 포함 여부, 유지보수 등)',
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

  if (isComplete) {
    message = '모든 정보 수집이 완료되었습니다!\n\n지금까지 답변해주신 내용을 기반으로 **맥킨지/BCG급 전문 RFP 문서**를 생성합니다.\n\n포함 내용:\n▸ 기능별 상세 분석 (복잡도, 소요기간, 수락기준)\n▸ MVP 로드맵\n▸ 리스크 매트릭스\n▸ 개발사 선정 가이드\n▸ 계약 체크리스트\n\n아래 버튼을 눌러 RFP를 완성하세요!';
  } else if (nextStep && nextStep <= 7) {
    const { message: feedback, quickReplies: feedbackReplies } = getExpertFeedback(currentStep, userMessage);
    const { question: nextQuestion, quickReplies: nextQR } = getDynamicNextQuestion(nextStep);
    message = `${feedback}\n\n---\n\n**${STEPS[nextStep - 1].label}** (${nextStep}/7)\n${nextQuestion}`;
    quickReplies = feedbackReplies || nextQR;
  } else {
    message = '감사합니다! 답변 내용을 RFP에 반영했습니다.';
  }

  return {
    message,
    rfpUpdate,
    nextAction: isComplete ? 'complete' : 'continue',
    nextStep,
    quickReplies,
  };
}
