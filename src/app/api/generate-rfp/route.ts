// AI RFP Builder — PRD Generation v7 (CEO PRD Standard)
// 결과물 = 개발사가 바로 WBS 작성 가능한 수준의 PRD
// Minimum 5 pages, 실제 외주 개발 가능한 PRD 수준

import { NextRequest, NextResponse } from 'next/server';
import { RFP_GENERATION_PROMPT } from '@/lib/prompts';
import { RFPData, FeatureItem } from '@/types/rfp';
import { supabase } from '@/lib/supabase';

const HAS_API_KEY =
  !!process.env.ANTHROPIC_API_KEY &&
  process.env.ANTHROPIC_API_KEY !== 'placeholder';

// ═══════════════════════════════════════════
// 프로젝트 유형 DB
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
  commonIntegrations: string[];
}

const PROJECT_TYPES: Record<string, ProjectTypeInfo> = {
  '모바일 앱': {
    type: '모바일 앱',
    avgBudget: '2,000~5,000만원 (MVP 기준)',
    avgDuration: '8~14주',
    successRate: '위시켓 기준 1차 출시 성공률 78%',
    commonStack: 'Flutter/React Native + NestJS + PostgreSQL',
    keyRisks: ['앱스토어 심사 리젝(평균 1~3회)', '크로스플랫폼 네이티브 기능 호환성', '푸시알림 설정 복잡도'],
    mustHaveFeatures: ['사용자 인증(소셜 로그인)', '푸시 알림', '앱 업데이트 관리', '오프라인 모드 기본 대응'],
    marketInsight: '2025년 국내 모바일 앱 시장에서 크로스플랫폼(Flutter) 채택률 60% 이상',
    commonIntegrations: ['Firebase(FCM)', 'Kakao SDK', 'Google OAuth', 'Apple Sign-In'],
  },
  '웹 서비스': {
    type: '웹 서비스',
    avgBudget: '1,500~4,000만원 (MVP 기준)',
    avgDuration: '6~10주',
    successRate: '위시켓 기준 1차 출시 성공률 85%',
    commonStack: 'Next.js + NestJS + PostgreSQL',
    keyRisks: ['브라우저 호환성(IE 지원 범위 확인)', '모바일 반응형 미흡', 'SEO 최적화 누락'],
    mustHaveFeatures: ['반응형 웹 디자인', 'SEO 기본 설정', 'SSL 인증서', 'Google Analytics'],
    marketInsight: 'Next.js가 웹 서비스 프레임워크 시장 점유율 1위(2025)',
    commonIntegrations: ['Google Analytics', 'Sentry', 'SendGrid/Mailgun'],
  },
  '이커머스 플랫폼': {
    type: '이커머스 플랫폼',
    avgBudget: '3,000~8,000만원',
    avgDuration: '12~20주',
    successRate: '위시켓 기준 1차 출시 성공률 72%',
    commonStack: 'Next.js + NestJS + PostgreSQL + Redis + 토스페이먼츠',
    keyRisks: ['PG 연동 인증(2~3주 별도 소요)', '재고 관리 시스템 복잡도', '개인정보보호법/전자상거래법 준수'],
    mustHaveFeatures: ['PG 결제(카드/간편결제)', '주문/배송 관리', '상품 관리', '회원 등급/포인트'],
    marketInsight: '간편결제(카카오페이, 네이버페이) 미지원 시 결제 전환율 40% 이상 하락',
    commonIntegrations: ['토스페이먼츠', '카카오페이', '네이버페이', 'CJ대한통운 API', 'AWS S3'],
  },
  '플랫폼': {
    type: '플랫폼 서비스',
    avgBudget: '5,000만~1.5억원',
    avgDuration: '14~24주',
    successRate: '위시켓 기준 1차 출시 성공률 68%',
    commonStack: 'Next.js + NestJS + PostgreSQL + Redis + ElasticSearch',
    keyRisks: ['양면 시장 콜드스타트', '검색/매칭 알고리즘 정확도', '수수료 모델 설계'],
    mustHaveFeatures: ['공급자/수요자 이중 회원 체계', '검색/매칭', '리뷰/평점', '대시보드'],
    marketInsight: 'MVP에서는 공급자 측을 먼저 확보하고, 수동 매칭으로 시작하는 전략이 유효',
    commonIntegrations: ['ElasticSearch', 'Redis', 'SendBird/채팅 SDK', '토스페이먼츠'],
  },
  'SaaS': {
    type: 'SaaS 서비스',
    avgBudget: '3,000~8,000만원',
    avgDuration: '10~16주',
    successRate: '위시켓 기준 1차 출시 성공률 75%',
    commonStack: 'React/Next.js + Python(FastAPI) + PostgreSQL + Stripe',
    keyRisks: ['구독 결제 시스템 복잡도', '멀티테넌시 아키텍처', 'API 설계/문서화'],
    mustHaveFeatures: ['구독 관리(플랜/과금/해지)', '대시보드/리포트', '팀 관리(권한)', 'API 연동'],
    marketInsight: '무료 체험 → 유료 전환이 핵심. 온보딩 UX에 전체 예산의 15% 투자 권장',
    commonIntegrations: ['Stripe/토스', 'Intercom', 'Slack Webhook', 'REST API'],
  },
  '매칭 플랫폼': {
    type: '매칭 플랫폼',
    avgBudget: '4,000~1억원',
    avgDuration: '12~20주',
    successRate: '위시켓 기준 1차 출시 성공률 65%',
    commonStack: 'Next.js + NestJS + PostgreSQL + Redis + ElasticSearch',
    keyRisks: ['매칭 알고리즘 정확도', '양면 시장 부트스트래핑', '분쟁 해결 프로세스'],
    mustHaveFeatures: ['프로필/포트폴리오', '검색/매칭', '실시간 채팅', '리뷰/평점', '결제/정산'],
    marketInsight: 'MVP는 수동 매칭 + 자동화 UI로 시작. 알고리즘은 데이터 축적 후 고도화',
    commonIntegrations: ['ElasticSearch', 'SendBird', '토스페이먼츠', 'Firebase FCM'],
  },
};

function getProjectTypeInfo(overview: string): ProjectTypeInfo {
  const t = (overview || '').toLowerCase();
  const mapping: [string, string][] = [
    ['앱', '모바일 앱'], ['어플', '모바일 앱'], ['모바일', '모바일 앱'],
    ['쇼핑몰', '이커머스 플랫폼'], ['커머스', '이커머스 플랫폼'], ['쇼핑', '이커머스 플랫폼'],
    ['매칭', '매칭 플랫폼'], ['연결', '매칭 플랫폼'], ['중개', '매칭 플랫폼'],
    ['플랫폼', '플랫폼'], ['마켓', '플랫폼'],
    ['saas', 'SaaS'], ['구독', 'SaaS'], ['b2b', 'SaaS'],
    ['웹', '웹 서비스'], ['사이트', '웹 서비스'], ['홈페이지', '웹 서비스'],
  ];
  for (const [k, v] of mapping) {
    if (t.includes(k) && PROJECT_TYPES[v]) return PROJECT_TYPES[v];
  }
  return PROJECT_TYPES['웹 서비스'];
}

// ═══════════════════════════════════════════
// Feature Analysis DB
// ═══════════════════════════════════════════

interface FeatureAnalysis {
  name: string;
  description: string;
  priority: string;
  complexity: number;
  estimatedWeeks: string;
  subFeatures: string[];
  acceptanceCriteria: string[];
}

interface FeatureBlueprintData {
  complexity: number;
  estimatedWeeks: string;
  subFeatures: string[];
  acceptanceCriteria: string[];
  flowDiagram: string;
  screenSpecs: { id: string; name: string; purpose: string; elements: string[]; scenarios: string[][] }[];
  businessRules: string[];
  dataEntities: { name: string; fields: string }[];
  errorCases: string[];
}

const FEATURE_DB: Record<string, FeatureBlueprintData> = {
  '로그인': {
    complexity: 2, estimatedWeeks: '1~2주',
    subFeatures: ['이메일/비밀번호 인증', '소셜 로그인(카카오/구글/애플)', '자동 로그인(토큰)', '비밀번호 찾기/재설정'],
    acceptanceCriteria: ['소셜 로그인 3종(카카오/구글/애플) 정상 동작', '토큰 만료 시 자동 갱신(Refresh Token)', '비밀번호 재설정 이메일 5분 이내 발송', '로그인 실패 5회 시 계정 잠금(30분)'],
    flowDiagram: `[앱 진입] → [로그인 상태 확인]
  ├─ 로그인됨 → [홈 화면]
  └─ 비로그인 → [로그인 화면]
      ├─ [이메일 로그인] → 이메일/비번 입력 → 인증 요청
      │   ├─ ✓ 성공 → JWT 발급 → [홈 화면]
      │   └─ ✗ 실패 → 에러 메시지 → [재시도 / 비번 찾기]
      ├─ [소셜 로그인] → OAuth 팝업 → 인증
      │   ├─ ✓ 기존 회원 → JWT 발급 → [홈 화면]
      │   ├─ ✓ 신규 회원 → [추가 정보 입력] → [홈 화면]
      │   └─ ✗ 인증 취소 → [로그인 화면]
      └─ [회원가입] → 정보 입력 → 약관 동의 → 인증메일 발송
          ├─ ✓ 인증 완료 → [프로필 설정] → [홈 화면]
          └─ ✗ 미인증 → 재발송 안내`,
    screenSpecs: [
      {
        id: 'SCR-AUTH-001', name: '로그인', purpose: '기존 사용자 서비스 인증',
        elements: ['이메일 입력 필드', '비밀번호 입력 필드 (마스킹 토글)', '로그인 버튼 (이메일+비번 입력 시 활성화)', '소셜 로그인 버튼 3종', '"비밀번호 찾기" 링크', '"회원가입" 링크'],
        scenarios: [
          ['정상 로그인', '유효한 계정', '이메일/비번 입력 → 로그인 탭', 'JWT 발급, 홈 이동', '✓'],
          ['비밀번호 오류', '이메일 유효', '잘못된 비번 입력', '"비밀번호가 올바르지 않습니다" 표시', '✗'],
          ['미가입 이메일', '계정 미존재', '이메일/비번 입력', '"등록되지 않은 이메일입니다" 표시', '✗'],
          ['소셜 로그인', '카카오 계정 보유', '카카오 로그인 탭', 'OAuth → JWT 발급 → 홈 이동', '✓'],
          ['5회 실패', '5회 연속 오류', '로그인 시도', '"계정이 잠겼습니다. 30분 후 재시도" 표시', '✗'],
        ],
      },
      {
        id: 'SCR-AUTH-002', name: '회원가입', purpose: '신규 사용자 계정 생성',
        elements: ['이메일 입력 (중복 실시간 검증)', '비밀번호 입력 (강도 표시)', '비밀번호 확인', '이름 입력', '전체 동의 체크박스', '개별 약관 토글 (필수/선택 구분)', '가입하기 버튼'],
        scenarios: [
          ['정상 가입', '모든 필드 유효', '정보 입력 → 가입 탭', '인증 메일 발송 → 완료 안내', '✓'],
          ['이메일 중복', '이미 등록된 이메일', '이메일 입력', '"이미 사용 중인 이메일" 실시간 표시', '✗'],
          ['비밀번호 불일치', '확인 불일치', '비밀번호 확인 입력', '"비밀번호가 일치하지 않습니다" 표시', '✗'],
          ['필수 약관 미동의', '필수 체크 누락', '가입 탭', '미동의 약관 하이라이트', '✗'],
        ],
      },
    ],
    businessRules: ['비밀번호: 최소 8자, 영문+숫자+특수문자 조합', '로그인 실패 5회 시 30분 계정 잠금', 'JWT 만료: Access 1시간, Refresh 14일', '소셜 로그인 시 이메일 미제공 → 이메일 별도 입력 요구'],
    dataEntities: [{ name: 'users', fields: 'id, email, password_hash, name, phone, profile_image, role, status, login_count, last_login_at, created_at' }],
    errorCases: ['네트워크 오류 시 "인터넷 연결을 확인해주세요" 표시', 'OAuth 서버 오류 시 "소셜 로그인 일시 불가. 이메일로 로그인해주세요" 표시', '인증 메일 미수신 시 "재발송" 버튼 제공 (60초 쿨타임)'],
  },
  '회원': {
    complexity: 2, estimatedWeeks: '1~2주',
    subFeatures: ['프로필 관리(사진/정보 수정)', '회원 등급/포인트', '이용약관/개인정보처리방침', '회원 탈퇴(데이터 처리)'],
    acceptanceCriteria: ['프로필 이미지 업로드(5MB 이하, JPG/PNG)', '프로필 정보 수정 즉시 반영', '탈퇴 시 개인정보 즉시 삭제(법적 보관 데이터 제외)', '회원 등급별 혜택 정상 적용'],
    flowDiagram: `[마이페이지] → [프로필 관리]
  ├─ [정보 수정] → 이름/연락처/프로필사진 변경 → 저장
  │   ├─ ✓ 성공 → "수정 완료" 토스트
  │   └─ ✗ 실패 → 에러 메시지
  ├─ [비밀번호 변경] → 현재 비번 확인 → 새 비번 입력 → 저장
  └─ [회원 탈퇴] → 탈퇴 사유 선택 → 비밀번호 확인 → "탈퇴하시겠습니까?" 최종 확인
      ├─ ✓ 확인 → 계정 비활성화 → 데이터 삭제 → [시작 화면]
      └─ ✗ 취소 → [마이페이지]`,
    screenSpecs: [
      {
        id: 'SCR-PROF-001', name: '마이페이지', purpose: '사용자 개인 정보 및 활동 허브',
        elements: ['프로필 사진 + 이름', '회원 등급 배지', '활동 요약 (작성 글, 포인트 등)', '메뉴 리스트 (프로필 수정, 알림 설정, 문의하기, 로그아웃 등)'],
        scenarios: [
          ['진입', '로그인 상태', '마이페이지 탭', '사용자 정보 + 메뉴 표시', '✓'],
          ['프로필 수정', '로그인 상태', '프로필 수정 탭', '편집 화면 이동', '✓'],
          ['로그아웃', '로그인 상태', '로그아웃 탭', '확인 팝업 → 토큰 삭제 → 로그인 화면', '✓'],
        ],
      },
    ],
    businessRules: ['프로필 이미지: 최대 5MB, JPG/PNG만 허용, 자동 리사이즈(400x400)', '탈퇴 후 개인정보 즉시 삭제, 거래 기록은 전자상거래법 5년 보관', '회원 등급: 활동 포인트 기반 자동 산정 (월 1회 갱신)'],
    dataEntities: [{ name: 'user_profiles', fields: 'user_id, nickname, bio, grade, points, preferences, updated_at' }],
    errorCases: ['이미지 5MB 초과 시 "파일 크기를 줄여주세요" 표시', '탈퇴 진행 중 네트워크 오류 시 재시도 안내'],
  },
  '결제': {
    complexity: 4, estimatedWeeks: '2~4주',
    subFeatures: ['PG 연동(토스페이먼츠)', '카드/계좌이체/간편결제', '결제 취소/환불', '영수증 발급', '정산(플랫폼)'],
    acceptanceCriteria: ['카드/계좌이체/간편결제(카카오페이, 네이버페이) 정상 동작', '결제 완료 후 3초 이내 확인 화면 표시', '부분/전체 환불 처리 정상 동작', 'PG 대시보드와 결제 금액 100% 일치', '결제 실패 시 재시도 UX 제공'],
    flowDiagram: `[상품/서비스 선택] → [주문서 작성]
  → [배송지 입력 (해당 시)] → [결제 수단 선택]
    ├─ [카드 결제] → PG 결제창 → 카드 인증
    │   ├─ ✓ 승인 → [결제 완료] → 확인 알림 → [주문 상세]
    │   └─ ✗ 실패 → "결제에 실패했습니다" → [재시도 / 수단 변경]
    ├─ [간편결제] → 카카오페이/네이버페이 앱 호출
    │   ├─ ✓ 승인 → [결제 완료]
    │   └─ ✗ 취소 → [결제 수단 선택]
    └─ [계좌이체] → PG 계좌이체 → 인증
        ├─ ✓ 입금 확인 → [결제 완료]
        └─ ✗ 시간 초과 → [결제 취소 안내]

[결제 취소/환불]
  [주문 상세] → [취소 요청] → [사유 선택]
    → [관리자 확인 (해당 시)] → PG 환불 요청
      ├─ ✓ 환불 완료 → 알림 발송 → [환불 내역]
      └─ ✗ 환불 실패 → 수동 처리 안내`,
    screenSpecs: [
      {
        id: 'SCR-PAY-001', name: '결제 화면', purpose: '결제 수단 선택 및 결제 실행',
        elements: ['주문 요약 (상품명, 수량, 금액)', '결제 수단 선택 (카드/계좌/간편결제)', '쿠폰/포인트 적용', '최종 결제 금액 표시', '결제하기 버튼', '이용약관 동의'],
        scenarios: [
          ['카드 결제 성공', '유효한 카드', '카드 선택 → 결제 탭', 'PG 인증 → 승인 → 완료 화면', '✓'],
          ['잔액 부족', '한도 초과', '결제 시도', '"한도 초과" PG 에러 표시', '✗'],
          ['간편결제', '카카오페이 등록됨', '카카오페이 선택', '앱 호출 → 인증 → 완료', '✓'],
          ['네트워크 오류', '결제 중 단절', '결제 진행', '"결제 상태 확인 중" → 결과 폴링', '△'],
        ],
      },
      {
        id: 'SCR-PAY-002', name: '결제 완료', purpose: '결제 성공 확인 및 다음 안내',
        elements: ['성공 아이콘 + 메시지', '주문 번호', '결제 금액', '결제 수단/일시', '영수증 보기 버튼', '주문 상세 보기 버튼', '홈으로 버튼'],
        scenarios: [
          ['결제 직후', '결제 승인됨', '자동 이동', '주문 정보 + 다음 안내 표시', '✓'],
          ['영수증 조회', '결제 완료', '영수증 보기 탭', '영수증 PDF/화면 표시', '✓'],
        ],
      },
    ],
    businessRules: ['결제 금액: 최소 100원, 최대 1,000만원', '결제 후 주문 상태: 결제완료 → 준비중 → 배송중 → 배송완료', '환불: 결제일 7일 이내 전액 환불, 이후 부분 환불 (수수료 차감)', '정산: 거래 완료 후 D+7 영업일 자동 정산 (플랫폼 수수료 차감)'],
    dataEntities: [
      { name: 'payments', fields: 'id, user_id, order_id, amount, method, status, pg_tid, pg_response, refund_amount, created_at' },
      { name: 'orders', fields: 'id, user_id, items, total_amount, discount, final_amount, status, shipping_address, created_at' },
    ],
    errorCases: ['PG 타임아웃(30초) 시 결제 상태 폴링 후 결과 표시', '이중결제 방지: 결제 버튼 연타 차단 (3초 디바운스)', '결제 중 앱 종료 시 다음 진입 시 미완료 결제 안내'],
  },
  '채팅': {
    complexity: 4, estimatedWeeks: '2~3주',
    subFeatures: ['1:1 실시간 채팅', '파일/이미지 전송', '읽음 확인', '채팅 알림(푸시)', '채팅 목록/검색'],
    acceptanceCriteria: ['메시지 전송 지연 500ms 이내', '이미지 전송(10MB 이하) 정상 동작', '읽음 확인 표시 실시간 업데이트', '오프라인 → 온라인 시 미수신 메시지 동기화'],
    flowDiagram: `[채팅 목록] → [상대방 선택] → [채팅방 진입]
  ├─ [메시지 전송] → 텍스트 입력 → 전송 버튼
  │   ├─ ✓ 전송 성공 → 상대에게 실시간 표시 + 푸시 알림
  │   └─ ✗ 전송 실패 → "재전송" 버튼 표시
  ├─ [파일 전송] → 첨부 버튼 → 파일 선택 → 업로드
  │   ├─ ✓ 성공 → 파일 미리보기 표시
  │   └─ ✗ 용량 초과 → "10MB 이하 파일만 전송 가능" 표시
  └─ [채팅 나가기] → 확인 팝업
      ├─ ✓ 확인 → 채팅방 삭제 → [채팅 목록]
      └─ ✗ 취소 → [채팅방]`,
    screenSpecs: [
      {
        id: 'SCR-CHAT-001', name: '채팅 목록', purpose: '진행 중인 대화 목록 관리',
        elements: ['채팅방 리스트 (프로필, 최근 메시지, 시간, 읽지않음 배지)', '검색 바', '정렬 (최신순/안읽음순)'],
        scenarios: [
          ['목록 조회', '채팅방 존재', '화면 진입', '시간순 채팅방 목록 표시', '✓'],
          ['새 메시지', '상대가 전송', '목록 화면', '해당 채팅방 최상단 이동 + 배지 갱신', '✓'],
          ['채팅방 없음', '신규 사용자', '화면 진입', '빈 상태 안내 메시지', '✓'],
        ],
      },
      {
        id: 'SCR-CHAT-002', name: '채팅방', purpose: '1:1 실시간 대화',
        elements: ['메시지 버블 (내 메시지 우측, 상대 좌측)', '읽음 확인 표시', '텍스트 입력 필드', '전송 버튼', '첨부 버튼', '상단 바 (상대 프로필, 뒤로가기, 메뉴)'],
        scenarios: [
          ['메시지 전송', '채팅방 진입', '텍스트 입력 → 전송', '메시지 표시 + 상대 실시간 수신', '✓'],
          ['이미지 전송', '채팅방 진입', '첨부 → 이미지 선택', '이미지 업로드 → 미리보기 표시', '✓'],
          ['읽음 확인', '메시지 전송됨', '상대가 채팅방 진입', '"읽음" 표시 업데이트', '✓'],
        ],
      },
    ],
    businessRules: ['메시지 저장 기간: 1년 (이후 자동 삭제 or 아카이브)', '파일 전송: 최대 10MB, 이미지/PDF/문서 허용', '차단된 사용자와 채팅 불가, 기존 메시지 "삭제된 사용자" 표시', '채팅방 최대 참여자: 1:1 기본 (그룹 채팅은 2차 개발)'],
    dataEntities: [
      { name: 'chat_rooms', fields: 'id, type, participant_ids, last_message, last_message_at, created_at' },
      { name: 'messages', fields: 'id, room_id, sender_id, content, type(text/image/file), file_url, read_at, created_at' },
    ],
    errorCases: ['WebSocket 연결 끊김 시 자동 재연결 (최대 5회, 백오프)', '파일 업로드 실패 시 로컬 저장 후 "재시도" 제공', '메시지 순서 보장: 서버 타임스탬프 기준 정렬'],
  },
  '관리자': {
    complexity: 3, estimatedWeeks: '2~3주',
    subFeatures: ['대시보드(핵심 KPI)', '회원 관리', '콘텐츠/상품 관리', '주문/결제 관리', '통계/리포트'],
    acceptanceCriteria: ['대시보드 로딩 3초 이내', '회원 검색/필터 정상 동작', '데이터 CSV/Excel 내보내기 동작', '권한 기반 메뉴 접근 제어'],
    flowDiagram: `[관리자 로그인] → [대시보드]
  ├─ [회원 관리] → 회원 목록/검색 → 상세 조회
  │   ├─ 상태 변경 (활성/정지/탈퇴)
  │   └─ 포인트/등급 수동 조정
  ├─ [콘텐츠 관리] → 목록 → 등록/수정/삭제
  ├─ [주문 관리] → 주문 목록 → 상태 변경 → 환불 처리
  └─ [통계] → 기간 선택 → 리포트 조회 → Excel 다운로드`,
    screenSpecs: [
      {
        id: 'SCR-ADM-001', name: '관리자 대시보드', purpose: '서비스 현황 한눈에 파악',
        elements: ['핵심 KPI 카드 (DAU, 매출, 신규가입, 전환율)', '기간별 추이 차트', '최근 활동 로그', '빠른 바로가기 메뉴'],
        scenarios: [
          ['대시보드 진입', '관리자 로그인', '메인 접속', 'KPI 카드 + 차트 표시', '✓'],
          ['기간 변경', '대시보드 표시됨', '날짜 범위 선택', '해당 기간 데이터로 갱신', '✓'],
          ['Excel 내보내기', '데이터 조회됨', '내보내기 버튼', 'CSV/Excel 파일 다운로드', '✓'],
        ],
      },
    ],
    businessRules: ['관리자 권한: 슈퍼관리자(전체) / 운영관리자(콘텐츠+회원) / CS관리자(문의+주문)', '관리자 행위 로그 전체 기록 (감사 추적)', '회원 데이터 열람 시 마스킹 처리 (이메일: a***@, 전화: 010-****-1234)'],
    dataEntities: [{ name: 'admin_logs', fields: 'id, admin_id, action, target_type, target_id, details, ip_address, created_at' }],
    errorCases: ['권한 없는 메뉴 접근 시 "접근 권한이 없습니다" 표시 + 로그 기록', '대용량 데이터 내보내기 시 백그라운드 처리 + 완료 알림'],
  },
  '알림': {
    complexity: 2, estimatedWeeks: '1~2주',
    subFeatures: ['앱 푸시 알림(FCM/APNs)', '이메일 알림', '인앱 알림(알림 센터)', '알림 설정(종류별 on/off)'],
    acceptanceCriteria: ['푸시 알림 전송 후 30초 이내 수신', '알림 종류별 on/off 설정 동작', '알림 히스토리 목록 조회', '읽음/안읽음 상태 구분'],
    flowDiagram: `[이벤트 발생] → [알림 서버]
  ├─ [푸시 알림] → FCM/APNs → 기기 수신
  │   ├─ ✓ 수신 → 알림 센터 + 앱 배지
  │   └─ ✗ 수신 불가 → 인앱 알림으로 fallback
  ├─ [이메일 알림] → 메일 서버 → 발송
  └─ [인앱 알림] → 알림 센터에 저장

[사용자] → [알림 센터 진입] → 알림 목록 조회
  ├─ 알림 탭 → 해당 화면으로 이동 + 읽음 처리
  └─ 알림 설정 → 종류별 on/off 토글`,
    screenSpecs: [
      {
        id: 'SCR-NOTI-001', name: '알림 센터', purpose: '전체 알림 히스토리 관리',
        elements: ['알림 목록 (아이콘, 제목, 내용, 시간)', '읽음/안읽음 구분 (배경색)', '전체 읽음 처리 버튼', '알림 설정 바로가기'],
        scenarios: [
          ['알림 목록', '알림 존재', '화면 진입', '최신순 알림 목록 표시 (안읽음 상단)', '✓'],
          ['알림 탭', '특정 알림 존재', '알림 항목 탭', '읽음 처리 + 해당 화면 이동', '✓'],
          ['전체 읽음', '안읽은 알림 존재', '전체 읽음 탭', '모든 알림 읽음 처리', '✓'],
        ],
      },
    ],
    businessRules: ['알림 보관 기간: 90일 (이후 자동 삭제)', '푸시 알림 허용 미설정 사용자 → 인앱 알림으로 대체', '야간 푸시(22:00~08:00) 자동 차단 (설정에서 해제 가능)', '알림 발송 빈도: 동일 유형 최소 5분 간격'],
    dataEntities: [{ name: 'notifications', fields: 'id, user_id, type, title, body, data, is_read, created_at' }],
    errorCases: ['FCM 토큰 만료 시 앱 재실행 시 갱신', '이메일 발송 실패 시 최대 3회 재시도 (5분/30분/2시간)'],
  },
  '검색': {
    complexity: 3, estimatedWeeks: '1~2주',
    subFeatures: ['키워드 검색', '필터(카테고리/가격/날짜)', '정렬(최신/인기/가격순)', '자동완성', '최근 검색어'],
    acceptanceCriteria: ['검색 결과 200ms 이내 반환', '필터 조합 정상 동작', '자동완성 300ms 이내 제안 표시', '검색 결과 0건 시 대안 키워드 제안'],
    flowDiagram: `[검색 화면] → 키워드 입력
  ├─ [자동완성] → 300ms 디바운스 → 추천 키워드 표시
  │   └─ 추천 항목 탭 → [검색 결과]
  ├─ [검색 실행] → 엔터/검색 버튼 → [검색 결과]
  │   ├─ 결과 있음 → 목록 표시 → [필터/정렬 적용]
  │   └─ 결과 없음 → "검색 결과가 없습니다" + 대안 키워드 제안
  └─ [필터 적용] → 필터 패널 열기 → 조건 선택 → 적용
      → 결과 실시간 갱신`,
    screenSpecs: [
      {
        id: 'SCR-SRCH-001', name: '검색', purpose: '콘텐츠/상품 탐색',
        elements: ['검색 입력 필드 (자동완성)', '최근 검색어 태그', '인기 검색어', '카테고리 바로가기'],
        scenarios: [
          ['키워드 검색', '검색어 입력', '검색 실행', '결과 목록 표시', '✓'],
          ['자동완성', '2글자 이상 입력', '타이핑', '300ms 후 추천 목록 표시', '✓'],
          ['결과 없음', '존재하지 않는 키워드', '검색 실행', '"결과 없음" + 대안 제안', '✓'],
          ['필터 적용', '검색 결과 표시됨', '필터 선택', '결과 실시간 갱신', '✓'],
        ],
      },
    ],
    businessRules: ['자동완성: 2글자 이상 입력 시 300ms 디바운스로 호출', '최근 검색어: 최대 10개, 개별/전체 삭제 가능', '검색어 로깅: 인기 검색어 집계 (일별/주별)', '데이터 1만건 이상 시 ElasticSearch + Nori 형태소 분석기 권장'],
    dataEntities: [{ name: 'search_logs', fields: 'id, user_id, query, result_count, filters, created_at' }],
    errorCases: ['ElasticSearch 장애 시 DB 직접 검색 fallback', '너무 긴 검색어(100자 초과) 자동 절사'],
  },
  '지도': {
    complexity: 3, estimatedWeeks: '1~2주',
    subFeatures: ['지도 표시(카카오맵)', '위치 검색/마커', '현재 위치 기반 검색', '상세 정보 바텀시트'],
    acceptanceCriteria: ['지도 로딩 2초 이내', '마커 클릭 시 상세 정보 바텀시트 표시', '현재 위치 기반 반경(1/3/5km) 검색', '지도 이동 시 자동 재검색'],
    flowDiagram: `[지도 화면] → 현재 위치 로딩
  ├─ [위치 허용] → 현재 위치 중심 지도 표시 → 주변 마커 로딩
  │   ├─ [마커 탭] → 바텀시트(상세 정보) 표시
  │   │   └─ [상세 보기] → 상세 페이지 이동
  │   └─ [지도 이동] → 영역 내 데이터 재검색 → 마커 갱신
  └─ [위치 거부] → 기본 위치(서울) 표시 → 수동 검색 안내`,
    screenSpecs: [
      {
        id: 'SCR-MAP-001', name: '지도', purpose: '위치 기반 탐색',
        elements: ['전체 화면 지도', '현재 위치 버튼', '검색 바 (상단)', '마커 클러스터', '반경 선택 (1/3/5km)', '바텀시트 (마커 선택 시)'],
        scenarios: [
          ['초기 로딩', '위치 허용', '화면 진입', '현재 위치 + 주변 마커 표시', '✓'],
          ['마커 선택', '마커 존재', '마커 탭', '바텀시트에 상세 정보 표시', '✓'],
          ['위치 거부', '권한 미허용', '화면 진입', '기본 위치 + 수동 검색 안내', '✓'],
        ],
      },
    ],
    businessRules: ['지도 API: 카카오맵 (국내 최적, 무료 쿼터 30만회/일)', '위치 데이터: 위도/경도 소수점 6자리 저장', '마커 50개 이상 → 클러스터링 자동 적용', 'GPS 정확도: 반경 50m 이내'],
    dataEntities: [{ name: 'locations', fields: 'id, name, address, latitude, longitude, category, details, created_at' }],
    errorCases: ['위치 서비스 비활성화 시 활성화 안내 팝업', 'GPS 정확도 낮을 시 "정확한 위치를 확인할 수 없습니다" 표시', '카카오맵 API 장애 시 "지도 로딩 실패. 잠시 후 다시 시도해주세요" 표시'],
  },
  'AI': {
    complexity: 5, estimatedWeeks: '3~6주',
    subFeatures: ['AI 모델 연동(GPT/Claude)', '프롬프트 엔지니어링', 'API 비용 관리', '응답 캐싱', '가드레일(부적절 응답 필터링)'],
    acceptanceCriteria: ['AI 응답 5초 이내', '부적절 응답 필터링 동작', 'API 비용 월별 모니터링', '동일 입력 캐시 히트율 30% 이상'],
    flowDiagram: `[사용자 입력] → [가드레일 검증] → [캐시 확인]
  ├─ 캐시 히트 → [캐시 응답 반환]
  └─ 캐시 미스 → [AI API 호출] → [응답 수신]
      → [후처리 필터링] → [응답 표시]
      ├─ ✓ 적절한 응답 → 캐시 저장 → [사용자에게 표시]
      └─ ✗ 부적절 응답 → "다시 시도해주세요" + 로그 기록`,
    screenSpecs: [
      {
        id: 'SCR-AI-001', name: 'AI 인터페이스', purpose: 'AI 기반 기능 사용',
        elements: ['입력 필드/프롬프트', 'AI 응답 영역', '로딩 인디케이터 (스켈레톤/타이핑)', '재생성 버튼', '피드백(좋아요/싫어요)'],
        scenarios: [
          ['정상 응답', '입력 제공', '요청 전송', '2~5초 후 AI 응답 표시', '✓'],
          ['긴 응답', '복잡한 입력', '요청 전송', '스트리밍으로 점진 표시', '✓'],
          ['응답 실패', 'API 오류', '요청 전송', '"일시적 오류" + 재시도 버튼', '✗'],
        ],
      },
    ],
    businessRules: ['AI API 호출 제한: 사용자당 일 100회', 'API 비용 알림: 월 예산 80% 도달 시 관리자 알림', '응답 캐시: 동일 입력 24시간 캐시', '가드레일: 개인정보/민감정보 포함 응답 자동 필터링'],
    dataEntities: [
      { name: 'ai_requests', fields: 'id, user_id, input, output, model, tokens_used, latency_ms, cached, created_at' },
    ],
    errorCases: ['AI API 타임아웃(30초) 시 "응답 시간이 초과되었습니다" 표시', 'API 할당량 초과 시 "오늘 사용량을 초과했습니다. 내일 다시 시도해주세요" 표시', 'Rate limit 시 지수 백오프 재시도 (최대 3회)'],
  },
  '추천': {
    complexity: 4, estimatedWeeks: '2~4주',
    subFeatures: ['콘텐츠 기반 추천', '협업 필터링', '개인화 피드', 'A/B 테스트'],
    acceptanceCriteria: ['추천 결과 3초 이내 반환', '신규 사용자에게도 추천 제공(인기 기반 fallback)', '추천 클릭률 추적', '추천 품질 주간 리포트'],
    flowDiagram: `[사용자 행동 수집] → [추천 엔진]
  ├─ [신규 사용자] → 인기도/트렌드 기반 추천
  └─ [기존 사용자] → 행동 데이터 분석 → 개인화 추천
      → [추천 결과 표시] → 사용자 반응 수집 → 모델 피드백`,
    screenSpecs: [],
    businessRules: ['추천 갱신 주기: 실시간(행동 발생 시) + 배치(일 1회 전체 재계산)', '콜드스타트: 가입 후 3일간 인기도 기반, 이후 개인화', '추천 결과 최소 5개, 최대 20개', '다양성 보장: 동일 카테고리 최대 60%'],
    dataEntities: [
      { name: 'user_actions', fields: 'id, user_id, action_type, target_id, context, created_at' },
      { name: 'recommendations', fields: 'id, user_id, items, algorithm, score, clicked, created_at' },
    ],
    errorCases: ['추천 엔진 장애 시 인기순 fallback', '데이터 부족 시 카테고리 기반 기본 추천'],
  },
};

function analyzeFeature(feature: FeatureItem): FeatureAnalysis {
  const name = feature.name;
  const lower = name.toLowerCase();

  let matched: FeatureBlueprintData | null = null;
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
    complexity: matched?.complexity || 3,
    estimatedWeeks: matched?.estimatedWeeks || '2~3주',
    subFeatures: matched?.subFeatures || [`${feature.name} 기본 기능`, '관련 UI/UX 설계', '테스트/QA'],
    acceptanceCriteria: matched?.acceptanceCriteria || [`${feature.name} 기능 정상 동작`, 'UI/UX 사용성 테스트 통과', '에러 핸들링 완료'],
  };
}

function getFeatureBlueprint(featureName: string): FeatureBlueprintData | null {
  const lower = featureName.toLowerCase();
  for (const [key, val] of Object.entries(FEATURE_DB)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  return null;
}

// ═══════════════════════════════════════════
// PRD Section Generators
// ═══════════════════════════════════════════

function generateOneLiner(rfpData: RFPData, projectInfo: ProjectTypeInfo): string {
  const target = rfpData.targetUsers || '사용자';
  const overview = rfpData.overview || '';
  const firstLine = overview.split('\n')[0]?.trim().slice(0, 60) || '서비스';
  return `"${firstLine}"은(는) ${target}을 위한 ${projectInfo.type}으로, 핵심 기능 ${(rfpData.coreFeatures || []).length}개를 포함하는 ${rfpData.coreFeatures?.some(f => f.priority === 'P1') ? 'MVP' : ''} 프로젝트입니다.`;
}

function generateOverview(rfpData: RFPData, projectInfo: ProjectTypeInfo): string {
  const overview = rfpData.overview || '(프로젝트 개요 미입력)';
  const target = rfpData.targetUsers || '일반 사용자';

  const whySection = `왜 만드는가
  ${overview}

  ${projectInfo.marketInsight}`;

  const whoSection = `누가 쓰는가
  주 사용자: ${target}
  ${target.includes('B2B') || target.includes('기업') ? '  사용 환경: 데스크톱 중심 (업무 시간 내 사용)\n  핵심 니즈: 효율성, 데이터 정확성, 권한 관리' : ''}${target.includes('MZ') || target.includes('20') || target.includes('30') ? '  사용 환경: 모바일 퍼스트\n  핵심 니즈: 빠른 온보딩, 직관적 UX, 소셜 연동' : ''}${!target.includes('B2B') && !target.includes('MZ') && !target.includes('20') && !target.includes('30') && !target.includes('기업') ? '  사용 환경: 모바일/데스크톱 병행\n  핵심 니즈: 직관적인 사용성, 빠른 응답 속도' : ''}`;

  const features = rfpData.coreFeatures || [];
  const whatSection = `무엇이 좋아지는가
  • ${features.length > 0 ? features.slice(0, 3).map(f => f.name).join(', ') + ' 등 핵심 기능을 통해 사용자 경험 혁신' : '핵심 기능을 통한 사용자 경험 개선'}
  • 기존 수동 프로세스의 자동화 및 디지털 전환
  • 데이터 기반 의사결정 지원`;

  return `${whySection}

${whoSection}

${whatSection}`;
}

function generateScope(rfpData: RFPData, features: FeatureItem[], projectInfo: ProjectTypeInfo): string {
  const included = features.map(f => `  ✅ ${f.name}${f.description ? ` — ${f.description}` : ''}`).join('\n');

  // Auto-detect missing common features
  const featureNames = features.map(f => f.name.toLowerCase()).join(' ');
  const excluded: string[] = [];

  const checkMissing = (keyword: string, label: string) => {
    if (!featureNames.includes(keyword)) excluded.push(`  ❌ ${label} — 이번 스코프에 미포함`);
  };

  for (const must of projectInfo.mustHaveFeatures) {
    const kw = must.split('(')[0].trim().toLowerCase();
    if (!featureNames.includes(kw.slice(0, 3))) {
      excluded.push(`  ❌ ${must} — 이번 스코프에 미포함 (향후 검토 필요)`);
    }
  }
  checkMissing('다국어', '다국어 지원 (i18n)');
  checkMissing('접근성', '접근성 고도화 (WCAG AAA)');
  checkMissing('오프라인', '오프라인 모드');

  if (excluded.length === 0) {
    excluded.push('  ❌ 고급 분석/BI 대시보드 — 향후 검토');
    excluded.push('  ❌ 다국어 지원 — 향후 검토');
  }

  return `포함 ✅
${included}

미포함 ❌
${excluded.join('\n')}

  ※ 미포함 항목은 1차 출시 이후 우선순위에 따라 추가 개발 가능`;
}

function generateWorkType(rfpData: RFPData): string {
  return `  유형: 신규 개발 (New Development)
  UI 디자인: 포함 (별도 디자이너 or 개발사 내부)
  플랫폼: ${rfpData.techRequirements?.includes('앱') ? '모바일 앱 (iOS + Android)' : rfpData.techRequirements?.includes('웹') ? '웹 서비스 (반응형)' : '웹 + 모바일 (반응형 우선)'}`;
}

function generateFeatureTable(analyzedFeatures: FeatureAnalysis[]): string {
  let table = `| # | 기능명 | 우선순위 | 예상 공수 |
| --- | --- | --- | --- |
`;

  analyzedFeatures.forEach((f, i) => {
    const priority = f.priority === 'P1' ? 'P0 (필수)' : f.priority === 'P2' ? 'P1 (우선)' : 'P2 (선택)';
    table += `| ${i + 1} | ${f.name} | ${priority} | ${f.estimatedWeeks} |\n`;
  });

  // Detailed breakdown per feature with structured markdown
  let details = '\n\n---FEATURE_DETAIL_START---\n';
  analyzedFeatures.forEach((f, i) => {
    const priorityLabel = f.priority === 'P1' ? 'P0 필수' : f.priority === 'P2' ? 'P1 우선' : 'P2 선택';
    const blueprint = getFeatureBlueprint(f.name);

    details += `
### ${i + 1}. ${f.name}
**우선순위:** ${priorityLabel} | **예상 공수:** ${f.estimatedWeeks}

**설명**
${f.description}
`;

    if (f.subFeatures && f.subFeatures.length > 0) {
      details += `
**서브 기능**
${f.subFeatures.map(sf => `- ${sf}`).join('\n')}
`;
    }

    if (f.acceptanceCriteria && f.acceptanceCriteria.length > 0) {
      details += `
**수용 기준 (Acceptance Criteria)**
${f.acceptanceCriteria.map((ac, j) => `${j + 1}. ${ac}`).join('\n')}
`;
    }

    if (blueprint?.flowDiagram) {
      details += `
**사용자 흐름**
\`\`\`
${blueprint.flowDiagram}
\`\`\`
`;
    }

    if (blueprint?.screenSpecs && blueprint.screenSpecs.length > 0) {
      details += `
**화면 상세**
${blueprint.screenSpecs.map(s => `- ${s.id}: ${s.name} — ${s.purpose}`).join('\n')}
`;
    }

    if (blueprint?.businessRules && blueprint.businessRules.length > 0) {
      details += `
**비즈니스 규칙**
${blueprint.businessRules.map(rule => `- ${rule}`).join('\n')}
`;
    }

    if (blueprint?.dataEntities && blueprint.dataEntities.length > 0) {
      details += `
**데이터 모델**
${blueprint.dataEntities.map(de => `- ${de.name}: ${de.fields}`).join('\n')}
`;
    }

    if (blueprint?.errorCases && blueprint.errorCases.length > 0) {
      details += `
**에러 처리**
${blueprint.errorCases.map(ec => `- ${ec}`).join('\n')}
`;
    }

    details += '\n';
  });

  details += '---FEATURE_DETAIL_END---\n';

  return table + details;
}

function generateFlowsAndScreens(features: FeatureItem[], rfpData: RFPData): string {
  let content = '';

  // 5.1 Overall flow - summary only
  const featureNames = features.map(f => f.name).join(', ');
  content += `  5.1 전체 흐름

  기호 설명: → 이동 | ✓ 성공 | ✗ 실패 | [조건] 분기

  [서비스 진입] → [로그인/회원가입] → [홈 화면]
    → [핵심 기능 사용 (${featureNames})]
    → [결과 확인/관리] → [마이페이지]

  ※ 각 기능별 상세 사용자 흐름은 4. 기능 명세서 섹션에서 확인하세요.
`;

  // 5.2 Common screens only (feature-specific screens are in feature details)
  content += `
  5.2 주요 공통 화면

  ── SCR-COMMON-001: 홈 화면 ──
  목적: 서비스 메인 진입점, 핵심 기능 허브
  주요 UI 요소:
    • 상단 검색 바
    • 주요 콘텐츠/기능 바로가기
    • 최근 활동 / 추천 영역
    • 하단 탭 바 (홈, 검색, 알림, 마이페이지)

| 시나리오 | 사전 조건 | 사용자 동작 | 시스템 반응 | 결과 |
| --- | --- | --- | --- | --- |
| 홈 진입 | 로그인 완료 | 앱/서비스 실행 | 개인화 홈 화면 표시 | ✓ |
| 기능 탐색 | 홈 표시됨 | 메뉴 탭 | 해당 기능 화면 이동 | ✓ |

  ── SCR-COMMON-002: 마이페이지 ──
  목적: 사용자 정보 관리 및 설정
  주요 UI 요소:
    • 사용자 프로필 정보
    • 계정 설정
    • 로그아웃 버튼

| 시나리오 | 사전 조건 | 사용자 동작 | 시스템 반응 | 결과 |
| --- | --- | --- | --- | --- |
| 프로필 조회 | 로그인 상태 | 마이페이지 진입 | 개인 정보 표시 | ✓ |
| 프로필 수정 | 로그인 상태 | 수정 → 저장 | 변경사항 저장 | ✓ |
| 로그아웃 | 로그인 상태 | 로그아웃 탭 | 세션 종료 → 로그인 화면 | ✓ |

  예상 총 화면 수: 약 ${features.length + 5}개 (공통 화면 포함, 상세는 기능 명세 참조)`;

  return content;
}

function generateBusinessRules(rfpData: RFPData, features: FeatureItem[], projectInfo: ProjectTypeInfo): string {
  let content = '';

  // 6.1 Data Items - Summary overview
  content += '  6.1 주요 데이터 항목 (요약)\n\n';
  content += '| 데이터 | 설명 | 비고 |\n| --- | --- | --- |\n';
  content += '| 사용자 (users) | 인증, 프로필, 권한 관리 | 핵심 엔티티 |\n';

  // Collect unique data entity types across features
  const dataEntitySummary = new Set<string>();
  features.forEach((f) => {
    const bp = getFeatureBlueprint(f.name);
    if (bp) {
      bp.dataEntities.forEach(de => {
        if (de.name !== 'users') {
          dataEntitySummary.add(`| ${de.name} | ${f.name} 관련 데이터 | 기능 명세 참조 |\n`);
        }
      });
    }
  });

  dataEntitySummary.forEach(entry => content += entry);

  if (dataEntitySummary.size === 0) {
    content += '| (프로젝트 특성에 따라 추가 정의) | — | 기능 명세에서 상세 확인 |\n';
  }

  // 6.2 Business Rules - Summary, detailed rules are in feature specs
  content += `
  6.2 비즈니스 규칙 (요약)

  ※ 각 기능별 상세 비즈니스 규칙은 4. 기능 명세서 섹션에서 확인하세요.

  **공통 규칙:**
  - BR-001: 사용자 계정 — 이메일 또는 소셜 로그인으로 가입, 유일한 사용자 식별
  - BR-002: 권한 관리 — 사용자 역할(일반/관리)에 따른 기능 접근 제어
  - BR-003: 데이터 무결성 — 모든 주요 데이터는 타임스탬프(created_at, updated_at) 포함
  - BR-004: 감시 로그 — 보안 관련 작업(로그인, 권한 변경, 데이터 삭제)은 별도 로그 기록
`;

  // 6.3 External Integrations
  content += '\n  6.3 외부 연동\n\n';
  content += '| 연동 대상 | 용도 | 비고 |\n| --- | --- | --- |\n';
  const integrations = new Set<string>();
  projectInfo.commonIntegrations.forEach(i => integrations.add(i));
  features.forEach(f => {
    const bp = getFeatureBlueprint(f.name);
    if (bp) bp.dataEntities.forEach(() => {}); // trigger matching
    if (f.name.includes('결제')) { integrations.add('토스페이먼츠'); integrations.add('카카오페이'); }
    if (f.name.includes('채팅')) integrations.add('SendBird 또는 Firebase Chat');
    if (f.name.includes('알림')) { integrations.add('Firebase FCM'); integrations.add('APNs'); }
    if (f.name.includes('지도')) integrations.add('카카오맵 API');
    if (f.name.includes('AI')) integrations.add('Claude/GPT API');
  });
  integrations.forEach(intg => {
    content += `| ${intg} | ${intg.includes('결제') || intg.includes('토스') || intg.includes('카카오페이') ? '결제 처리' : intg.includes('FCM') || intg.includes('APNs') ? '푸시 알림' : intg.includes('Chat') || intg.includes('SendBird') ? '실시간 채팅' : intg.includes('맵') || intg.includes('Map') ? '지도/위치' : intg.includes('Claude') || intg.includes('GPT') ? 'AI 기능' : '서비스 연동'} | 별도 계약/키 발급 필요 |\n`;
  });

  // 6.4 Error Handling - Common patterns only
  content += `
  6.4 에러 처리 원칙

  **공통 에러 처리 패턴:**
  - ERR-001: 네트워크 오류 — "인터넷 연결을 확인해주세요" 토스트 + 재시도 버튼
  - ERR-002: 서버 오류 (5xx) — "잠시 후 다시 시도해주세요" + 자동 재시도 (3회)
  - ERR-003: 인증 오류 (401) — "로그인이 필요합니다" + 로그인 화면 이동
  - ERR-004: 권한 없음 (403) — "이 작업을 수행할 권한이 없습니다"
  - ERR-005: 잘못된 입력 (4xx) — 필드별 유효성 검증 메시지 표시

  ※ 각 기능별 상세 에러 처리는 4. 기능 명세서 섹션에서 확인하세요.`;

  return content;
}

function generateNFR(projectInfo: ProjectTypeInfo): string {
  return `| 항목 | 기준 | 측정 방법 |
| --- | --- | --- |
| 응답 속도 | API < 500ms, 페이지 로딩 < 3초 | Lighthouse, 서버 모니터링 |
| 동시 접속 | 최소 1,000명 동시 접속 | 부하 테스트 (k6/JMeter) |
| 가용성 | 99.5% 이상 (월 3.6시간 이내 다운타임) | 업타임 모니터링 |
| 확장성 | MAU 10,000명까지 인프라 변경 없이 대응 | 아키텍처 리뷰 |
| 보안 | HTTPS(TLS 1.3), 개인정보 AES-256 암호화 | 보안 점검 |
| 인증 | JWT + Refresh Token, 소셜 로그인 | 기능 테스트 |
| 백업 | 일 1회 자동 백업, 30일 보관 | 백업/복원 테스트 |
| 접근성 | WCAG 2.1 AA 등급 이상 | 접근성 감사 도구 |
| 브라우저 | Chrome, Safari, Edge 최신 2개 버전 | 크로스브라우저 테스트 |
| 모바일 | iOS 15+, Android 12+ | 기기 테스트 |
| 코드 품질 | 테스트 커버리지 60% 이상, 린트 통과 | CI/CD 파이프라인 |
| 모니터링 | Sentry(에러 추적) + 서버 모니터링 | 대시보드 구축 |

  [기술 스택 권장]
  • 프론트엔드: ${projectInfo.commonStack.split('+')[0]?.trim() || 'Next.js'}
  • 백엔드: ${projectInfo.commonStack.split('+')[1]?.trim() || 'NestJS'}
  • 데이터베이스: ${projectInfo.commonStack.includes('PostgreSQL') ? 'PostgreSQL + Redis' : 'PostgreSQL'}
  • 인프라: AWS 또는 Vercel + AWS
  • CI/CD: GitHub Actions
  • 모니터링: Sentry + LogRocket/Datadog`;
}

function generateReferences(rfpData: RFPData): string {
  let content = '| # | 자료명 | 설명 | 링크/비고 |\n| --- | --- | --- | --- |\n';
  let refNum = 1;

  if (rfpData.referenceServices && rfpData.referenceServices.trim() && !rfpData.referenceServices.includes('없') && !rfpData.referenceServices.includes('건너')) {
    const refs = rfpData.referenceServices.split(/[,\n]/).filter(r => r.trim());
    refs.forEach(ref => {
      content += `| ${refNum++} | 참고 서비스: ${ref.trim()} | 벤치마크 대상 | 개발사에 화면 캡처 첨부 권장 |\n`;
    });
  }

  content += `| ${refNum++} | 본 PRD 문서 | 프로젝트 요구사항 정의서 | 본 문서 |\n`;
  content += `| ${refNum++} | 와이어프레임 | UI/UX 설계 (개발 착수 전 작성) | Figma 링크 (TBD) |\n`;
  content += `| ${refNum++} | API 문서 | 백엔드 API 명세 | Swagger/Postman (TBD) |\n`;
  content += `| ${refNum} | 디자인 시스템 | 컬러/타이포/컴포넌트 가이드 | Figma 링크 (TBD) |\n`;

  content += `\n  [벤치마크 활용 가이드]
  • 개발사 미팅 시 "이 부분은 참고, 이 부분은 다르게"를 명확히 구분하세요
  • 화면 캡처 + 메모를 첨부하면 견적 정확도가 크게 올라갑니다`;

  return content;
}

function generateOpenItems(rfpData: RFPData, features: FeatureItem[], projectInfo: ProjectTypeInfo): string {
  let content = '| # | 항목 | 설명 | 담당 | 기한 |\n| --- | --- | --- | --- | --- |\n';
  let itemNum = 1;

  // Auto-detect open items based on missing data
  if (!rfpData.budgetTimeline || rfpData.budgetTimeline.includes('미정')) {
    content += `| ${itemNum++} | 예산 확정 | 개발사 견적 수령 후 최종 예산 결정 | 발주사 | 견적 수령 후 1주 내 |\n`;
  }
  if (!rfpData.referenceServices || rfpData.referenceServices.includes('없')) {
    content += `| ${itemNum++} | 참고 서비스 선정 | 유사 서비스 2~3개 벤치마크 분석 | 발주사 | 킥오프 전 |\n`;
  }

  content += `| ${itemNum++} | 디자인 방향 확정 | 디자인 시안 검토 및 확정 | 발주사 + 디자이너 | M2 종료 시 |\n`;
  content += `| ${itemNum++} | 테스트 계정 준비 | 외부 서비스 연동용 계정/키 | 발주사 | 개발 착수 전 |\n`;

  const hasPayment = features.some(f => f.name.includes('결제') || f.name.includes('구매'));
  if (hasPayment) {
    content += `| ${itemNum++} | PG 사업자 인증 | 사업자등록증 기반 PG 인증 (2~3주 소요) | 발주사 | ASAP |\n`;
  }

  content += `| ${itemNum++} | 런칭 일정 확정 | 마케팅/운영과 연계한 최종 런칭일 | 발주사 | M4 종료 시 |\n`;
  content += `| ${itemNum} | 유지보수 계약 | 런칭 후 유지보수 범위/비용 협의 | 양측 | 런칭 2주 전 |\n`;

  return content;
}

// ═══════════════════════════════════════════
// Main PRD Document Generator (v7 — CEO PRD Standard)
// ═══════════════════════════════════════════

function generateSmartProjectName(overview: string, features: FeatureItem[], projectType: string): string {
  // Extract core service keywords from overview
  const overviewText = (overview || '').toLowerCase();

  // Service type mapping
  const serviceTypeMap: Record<string, string> = {
    'chatbot': '챗봇',
    'chat': '채팅',
    'delivery': '배달',
    'marketplace': '마켓플레이스',
    'platform': '플랫폼',
    'app': '앱',
    'service': '서비스',
    'booking': '예약',
    'reservation': '예약',
    'payment': '결제',
    'ecommerce': '이커머스',
    'shopping': '쇼핑',
    'social': '소셜',
    'education': '교육',
    'learning': '학습',
    'training': '학습',
  };

  let serviceType = '';
  for (const [key, label] of Object.entries(serviceTypeMap)) {
    if (overviewText.includes(key)) {
      serviceType = label;
      break;
    }
  }

  if (!serviceType) {
    serviceType = projectType.split(' ')[0]; // Use first word of project type
  }

  // Extract keywords from overview (split by common delimiters and filter)
  const keywords = overviewText
    .split(/[,\s\-()।।]/g)
    .filter(w => w.length > 1 && w.length < 15 && !['을', '를', '이', '가', '의', '과', '와', '및', 'the', 'a', 'an', 'and', 'or'].includes(w))
    .slice(0, 5);

  // Extract core concept (longest meaningful keyword or feature name)
  let coreKeyword = '';
  if (keywords.length > 0) {
    coreKeyword = keywords[0];
  } else if (features.length > 0) {
    coreKeyword = features[0].name.split(' ')[0];
  }

  // Format: "[서비스유형] [핵심키워드]"
  let projectName = serviceType;
  if (coreKeyword && coreKeyword !== serviceType && coreKeyword.length > 0) {
    projectName = `${serviceType} ${coreKeyword}`;
  }

  // Ensure max 20 characters
  if (projectName.length > 20) {
    projectName = projectName.slice(0, 20);
  }

  return projectName || '프로젝트';
}

function generateFallbackRFP(rfpData: RFPData): string {
  const date = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const projectInfo = getProjectTypeInfo(rfpData.overview);

  const features = rfpData.coreFeatures || [];
  const analyzedFeatures = features.map(f => analyzeFeature(f));
  const totalComplexity = analyzedFeatures.reduce((sum, f) => sum + f.complexity, 0);
  const complexityLevel = totalComplexity >= 15 ? '높음' : totalComplexity >= 8 ? '중간~높음' : totalComplexity >= 4 ? '중간' : '보통';

  // Calculate timeline
  const weekEstimates = analyzedFeatures.map(f => {
    const match = f.estimatedWeeks.match(/(\d+)~(\d+)/);
    return match ? [parseInt(match[1]), parseInt(match[2])] : [2, 3];
  });
  const totalWeeksMin = Math.max(weekEstimates.reduce((s, w) => s + w[0], 0) * 0.6, 4);
  const totalWeeksMax = Math.max(weekEstimates.reduce((s, w) => s + w[1], 0) * 0.7, 6);

  const projectName = generateSmartProjectName(rfpData.overview || '', features, projectInfo.type);

  const featuresP0 = features.filter(f => f.priority === 'P1');
  const featuresP1 = features.filter(f => f.priority === 'P2');
  const featuresP2 = features.filter(f => f.priority === 'P3');

  // Budget analysis
  let budgetText = '';
  if (rfpData.budgetTimeline && !rfpData.budgetTimeline.includes('미정') && rfpData.budgetTimeline.trim() !== '') {
    budgetText = rfpData.budgetTimeline;
  }

  return `
─── 한 줄 요약 ─────────────────────────────────

  ${generateOneLiner(rfpData, projectInfo)}

  프로젝트명: ${projectName}
  작성일: ${date}
  문서 버전: v1.0
  작성 도구: 위시켓 AI PRD Builder
  기밀 등급: Confidential


─── 1. 개요 ─────────────────────────────────────

${generateOverview(rfpData, projectInfo)}

  [프로젝트 핵심 수치]
  • 프로젝트 유형: ${projectInfo.type}
  • 예상 기간: ${Math.round(totalWeeksMin)}~${Math.round(totalWeeksMax)}주
  • 핵심 기능: ${features.length}개 (P0: ${featuresP0.length} / P1: ${featuresP1.length} / P2: ${featuresP2.length})
  • 프로젝트 복잡도: ${complexityLevel} (${totalComplexity}/25점)
  • 참고 평균 예산: ${projectInfo.avgBudget}


─── 2. 스코프 ───────────────────────────────────

${generateScope(rfpData, features, projectInfo)}


─── 3. 작업 타입 ─────────────────────────────────

${generateWorkType(rfpData)}


─── 4. 기능 목록 ─────────────────────────────────

  총 ${features.length}개 기능 (P0 필수: ${featuresP0.length}개 / P1 우선: ${featuresP1.length}개 / P2 선택: ${featuresP2.length}개)

${generateFeatureTable(analyzedFeatures)}


─── 5. 화면 및 사용자 흐름 ────────────────────────

${generateFlowsAndScreens(features, rfpData)}


─── 6. 비즈니스 규칙 ─────────────────────────────

${generateBusinessRules(rfpData, features, projectInfo)}


─── 7. 비기능 요구사항 ───────────────────────────

${generateNFR(projectInfo)}


─── 8. 일정 및 예산 ──────────────────────────────

  ${budgetText ? `예산: ${budgetText}` : `예산 미정 — 개발사 견적 기반 결정`}

  [AI 분석 기반 예상치]
  • ${projectInfo.type} 평균 예산: ${projectInfo.avgBudget}
  • ${projectInfo.type} 평균 기간: ${projectInfo.avgDuration}
  • 이 프로젝트 예상: ${Math.round(totalWeeksMin)}~${Math.round(totalWeeksMax)}주 (기능 ${features.length}개, 복잡도 ${complexityLevel})

  [마일스톤]

| 단계 | 기간 | 산출물 | 결제 비율 |
| --- | --- | --- | --- |
| M1. 기획/설계 | 1~2주 | 와이어프레임, IA, DB 스키마 | 착수금 30% |
| M2. UI/UX 디자인 | 2~3주 | 디자인 시안, 디자인 시스템 | - |
| M3. 프론트엔드 개발 | ${Math.round(totalWeeksMin * 0.4)}~${Math.round(totalWeeksMax * 0.4)}주 | 화면 구현, API 연동 | 중도금 30% |
| M4. 백엔드 개발 | ${Math.round(totalWeeksMin * 0.4)}~${Math.round(totalWeeksMax * 0.4)}주 | API, DB, 외부 연동 | - |
| M5. 통합 테스트/QA | 1~2주 | 버그 리포트, 성능 테스트 | - |
| M6. 배포/런칭 | 1주 | 라이브 서비스, 운영 문서 | 잔금 40% |


─── 9. 참고 자료 ─────────────────────────────────

${generateReferences(rfpData)}


─── 10. 미결 사항 ────────────────────────────────

${generateOpenItems(rfpData, features, projectInfo)}


─── 11. 리스크 및 대응 ───────────────────────────

| # | 리스크 | 발생확률 | 영향도 | 대응 방안 |
| --- | --- | --- | --- | --- |
${projectInfo.keyRisks.map((r, i) => `| ${i + 1} | ${r} | 중~높음 | 높음 | 사전 일정 반영 + 대안 기술 검토 |`).join('\n')}
| ${projectInfo.keyRisks.length + 1} | 스코프 크리프 (요구사항 증가) | 높음 | 매우 높음 | MVP(P0) 우선 출시, 추가 기능은 2차 개발 |
| ${projectInfo.keyRisks.length + 2} | 커뮤니케이션 단절 | 중간 | 높음 | 주 1~2회 정기 미팅, 마일스톤별 리뷰 |


─── 12. 산출물 및 계약 조건 ──────────────────────

  [필수 산출물]
  • 소스코드 전체 (Git Repository)
  • 기술 문서 (아키텍처, API 문서)
  • DB 스키마 문서
  • 배포 가이드
  • 관리자 매뉴얼

  [계약 필수 조건]
  • 소스코드 소유권: 모든 소스코드의 저작재산권은 발주사에 귀속
  • 하자보수: 납품일로부터 6개월간 무상 하자보수
  • 추가 개발: 추가 기능 요청 시 개발자 1인/일 단가 기준 협의
  • 보안/기밀: NDA(비밀유지계약) 별도 체결
  • 커뮤니케이션: 주 1~2회 진행 보고서 + 격주 화상 미팅
  • 프로젝트 관리: Jira/Notion 등 협업 도구 필수 사용
  • 코드 관리: Git 기반 버전 관리, 코드 리뷰 프로세스 적용


─── 다음 단계 안내 ──────────────────────────────

  본 PRD는 위시켓 AI PRD Builder로 생성되었습니다.
  이 문서를 개발사에 바로 전달하여 정확한 견적을 받아보세요.

  위시켓 | wishket.com
  13년간 7만+ IT 프로젝트 매칭, 국내 최대 IT 외주 플랫폼

  [추천 진행 순서]
  1단계: 위시켓에 프로젝트 등록 → 48시간 내 검증된 개발사 3~5곳 제안 수령
  2단계: 개발사 포트폴리오 및 리뷰 확인 → 면접 2~3곳 선정
  3단계: 이 PRD 기반 개발사 미팅 → 최종 선정 및 계약
  4단계: 킥오프 미팅 → 상세 요구사항 확정 → 개발 착수`.trim();
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

      const analyzedFeatures = (rfpData.coreFeatures || []).map(f => analyzeFeature(f));
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
            content: `아래 데이터로 개발사가 바로 WBS를 작성할 수 있는 수준의 전문 PRD 문서를 작성해주세요. 최소 5페이지 분량으로, 화면 상세, 사용자 흐름, 수용 기준, 비즈니스 규칙이 모두 포함되어야 합니다.\n\n${contextData}`,
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

    // Save to Supabase
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
