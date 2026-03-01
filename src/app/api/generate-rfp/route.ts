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

// ═══════════════════════════════════════════
// API Endpoints DB
// ═══════════════════════════════════════════

const API_ENDPOINTS_DB: Record<string, { method: string; path: string; description: string }[]> = {
  '로그인': [
    { method: 'POST', path: '/api/auth/login', description: '이메일/비밀번호 로그인' },
    { method: 'POST', path: '/api/auth/register', description: '신규 사용자 회원가입' },
    { method: 'POST', path: '/api/auth/refresh', description: 'JWT Refresh Token 갱신' },
  ],
  '회원': [
    { method: 'GET', path: '/api/users/:id', description: '사용자 프로필 조회' },
    { method: 'PUT', path: '/api/users/:id', description: '사용자 정보 수정' },
    { method: 'DELETE', path: '/api/users/:id', description: '회원 탈퇴' },
  ],
  '결제': [
    { method: 'POST', path: '/api/payments', description: '결제 요청' },
    { method: 'GET', path: '/api/payments/:id', description: '결제 정보 조회' },
    { method: 'POST', path: '/api/payments/:id/refund', description: '환불 요청' },
  ],
  '채팅': [
    { method: 'GET', path: '/api/chats', description: '채팅 목록 조회' },
    { method: 'POST', path: '/api/chats/:id/messages', description: '메시지 전송' },
    { method: 'WebSocket', path: '/ws/chat/:roomId', description: '실시간 채팅 연결' },
  ],
  '검색': [
    { method: 'GET', path: '/api/search', description: '키워드 검색' },
    { method: 'GET', path: '/api/search/filters', description: '검색 필터 옵션 조회' },
    { method: 'GET', path: '/api/search/autocomplete', description: '자동완성 제안' },
  ],
  '관리자': [
    { method: 'GET', path: '/api/admin/dashboard', description: '관리자 대시보드 데이터' },
    { method: 'GET', path: '/api/admin/users', description: '회원 목록 조회' },
    { method: 'POST', path: '/api/admin/logs', description: '관리 활동 로그 기록' },
  ],
  '알림': [
    { method: 'GET', path: '/api/notifications', description: '알림 목록 조회' },
    { method: 'PUT', path: '/api/notifications/:id/read', description: '알림 읽음 처리' },
    { method: 'POST', path: '/api/notifications/subscribe', description: '푸시 알림 구독' },
  ],
  '지도': [
    { method: 'GET', path: '/api/locations', description: '위치 목록 조회' },
    { method: 'GET', path: '/api/locations/nearby', description: '주변 위치 검색' },
    { method: 'POST', path: '/api/locations', description: '위치 추가' },
  ],
  'AI': [
    { method: 'POST', path: '/api/ai/generate', description: 'AI 응답 생성 요청' },
    { method: 'GET', path: '/api/ai/usage', description: 'AI API 사용량 조회' },
    { method: 'POST', path: '/api/ai/feedback', description: 'AI 응답 피드백' },
  ],
  '추천': [
    { method: 'GET', path: '/api/recommendations', description: '개인화 추천 조회' },
    { method: 'POST', path: '/api/recommendations/feedback', description: '추천 피드백' },
    { method: 'GET', path: '/api/recommendations/trending', description: '인기 추천 조회' },
  ],
};

// ═══════════════════════════════════════════
// Competitor Analysis DB
// ═══════════════════════════════════════════

const COMPETITOR_DB: Record<string, { name: string; strengths: string; weaknesses: string; differentiation: string }[]> = {
  '모바일 앱': [
    { name: 'Kakao Map', strengths: '정확한 국내 지도, 강력한 POI DB, 대규모 사용자 기반', weaknesses: '높은 API 비용, 기능 커스터마이징 제한', differentiation: '오픈 소스 기반 더 저렴한 지도 라이브러리, 고급 필터링 기능' },
    { name: 'Naver App', strengths: '통합 에코시스템, 높은 검색 정확도', weaknesses: '무거운 앱 크기, 배터리 소모 많음', differentiation: '경량 앱 구조, 배터리 최적화, 더 빠른 로딩 속도' },
    { name: 'Toss App', strengths: '직관적 UX, 금융 기능 강화', weaknesses: '제한된 기능, 확장성 부족', differentiation: '더 많은 커스터마이징 옵션, 모듈화 아키텍처' },
  ],
  '웹 서비스': [
    { name: 'Airbnb', strengths: '글로벌 규모, 강력한 신뢰 시스템, 풍부한 기능', weaknesses: '복잡한 인터페이스, 높은 수수료', differentiation: '심플한 UI/UX, 저렴한 수수료 정책, 로컬 맞춤형 기능' },
    { name: 'Booking.com', strengths: '대규모 인벤토리, 다국어 지원', weaknesses: '느린 로딩, 모바일 UX 미흡', differentiation: '극빠른 페이지 로딩, 모바일 최적화, AI 기반 추천' },
    { name: 'Expedia', strengths: '통합 예약 시스템, 높은 신뢰도', weaknesses: '복잡한 결제 프로세스, 높은 가격', differentiation: '간단한 예약 프로세스, 투명한 가격, 지역 할인 프로그램' },
  ],
  '이커머스 플랫폼': [
    { name: '쿠팡', strengths: '빠른 배송, 대규모 상품, 강한 브랜드', weaknesses: '높은 배송료, 판매자 기준 엄격', differentiation: '소상공인 친화적 정책, 저배송료, 유연한 판매자 조건' },
    { name: '네이버 쇼핑', strengths: '검색 유입 강함, 광고 시스템 발달', weaknesses: '수수료 높음, 시스템 복잡함', differentiation: '간단한 판매자 대시보드, 저수수료, 자동화 도구' },
    { name: '당근마켓', strengths: '로컬 커뮤니티, 신뢰 시스템', weaknesses: '제한된 상품군, 느린 배송', differentiation: '글로벌 배송 지원, 더 많은 카테고리, 빠른 배송 네트워크' },
  ],
  '플랫폼': [
    { name: '당근마켓', strengths: '로컬 네트워크, 강한 커뮤니티', weaknesses: '지역 한정, 상품 다양성 부족', differentiation: '글로벌 확장, 더 많은 카테고리, 높은 신뢰도' },
    { name: '오늘의 집', strengths: '디자인 피드, 시공업체 연결', weaknesses: '가격 범위 제한, 지역 제한', differentiation: '전국 서비스, AI 인테리어 추천, 저가 옵션' },
    { name: '무시옥', strengths: '맞춤형 매칭, 프리미엄 이미지', weaknesses: '높은 수수료, 제한된 시장', differentiation: '저수수료, 더 큰 시장, AI 매칭 알고리즘' },
  ],
  'SaaS': [
    { name: 'Notion', strengths: '유연한 데이터베이스, 강력한 커뮤니티', weaknesses: '높은 학습곡선, 느린 성능', differentiation: '빠른 성능, 간단한 인터페이스, 더 나은 협업 도구' },
    { name: 'Monday.com', strengths: '직관적 UI, 풍부한 통합', weaknesses: '높은 가격, 과도한 기능', differentiation: '저렴한 가격, 심플한 기능, 빠른 온보딩' },
    { name: 'Asana', strengths: '강력한 프로젝트 관리, 대규모 팀 지원', weaknesses: '복잡한 UI, 높은 러닝 커브', differentiation: '간단한 작업 관리, 직관적 인터페이스, AI 자동화' },
  ],
  '매칭 플랫폼': [
    { name: '크몽', strengths: '대규모 프리랜서 풀, 강한 신뢰 시스템', weaknesses: '높은 수수료, 느린 매칭', differentiation: '저수수료, AI 기반 빠른 매칭, 더 나은 커뮤니케이션' },
    { name: '숨고', strengths: '지역 기반, 신뢰도 높음', weaknesses: '제한된 카테고리, 느린 응답', differentiation: '더 많은 서비스 카테고리, 빠른 응답, 가격 비교 기능' },
    { name: '오늘의집', strengths: '높은 품질, 인기 기업', weaknesses: '높은 가격, 제한된 선택지', differentiation: '경제적 가격, 더 많은 선택지, AI 추천' },
  ],
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

  // description이 비어있거나 name과 동일하면 의미있는 설명 자동 생성
  let description = feature.description;
  if (!description || description === feature.name || description.trim() === '') {
    if (matched?.subFeatures && matched.subFeatures.length > 0) {
      description = `${matched.subFeatures.slice(0, 3).join(', ')} 등을 포함하는 핵심 기능`;
    } else {
      description = `${feature.name} 관련 기능 구현 및 사용자 인터페이스 설계`;
    }
  }

  return {
    name: feature.name,
    description,
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

// ═══════════════════════════════════════════
// Q1: Feature Sanitization
// ═══════════════════════════════════════════

function sanitizeFeatures(features: FeatureItem[]): FeatureItem[] {
  const conversationalPatterns = ['입니다', '싶습니다', '있습니다', '했습니다', '하고', '해요', '거예요', '거든요', '그래요'];

  return features.filter(feature => {
    const name = feature.name || '';

    // Filter out entries longer than 30 chars
    if (name.length > 30) return false;

    // Filter out pure numbers
    if (/^\d+$/.test(name.trim())) return false;

    // Filter out conversational Korean (entries containing conversational endings)
    for (const pattern of conversationalPatterns) {
      if (name.includes(pattern)) return false;
    }

    return true;
  }).map(feature => ({
    ...feature,
    name: feature.name.length > 30 ? feature.name.slice(0, 30) : feature.name,
  }));
}

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

interface PRDResult {
  projectName: string;
  documentMeta: {
    version: string;
    createdAt: string;
    generatedBy: string;
  };
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
      screenSpecs: {
        id: string;
        name: string;
        purpose: string;
        elements: string[];
        scenarios: string[][];
      }[];
      businessRules: string[];
      dataEntities: { name: string; fields: string }[];
      errorCases: string[];
    }[];
  }[];

  nonFunctionalRequirements: {
    category: string;
    items: string[];
  }[];

  timeline: { phase: string; duration: string; deliverables: string[] }[];
  assumptions: string[];
  constraints: string[];
  risks: { risk: string; impact: string; mitigation: string; probability?: string }[];
  glossary: { term: string; definition: string }[];
  expertInsight: string;
  informationArchitecture: {
    sitemap: { id: string; label: string; children?: { id: string; label: string; children?: { id: string; label: string }[] }[] }[];
  };

  // FORGE Quality Upgrade — New Fields
  originalDescription: string;
  budgetBreakdown: { feature: string; percentage: number; estimatedCost: string; effort: string }[];
  apiEndpoints: { method: string; path: string; description: string; feature: string }[];
  dataModel: { entity: string; fields: string[]; relationships: string[] }[];
  competitorAnalysis: { name: string; strengths: string; weaknesses: string; differentiation: string }[];
}

function generateFallbackRFP(rfpData: RFPData): string {
  const projectInfo = getProjectTypeInfo(rfpData.overview);
  let features = rfpData.coreFeatures || [];

  // Q1: Sanitize features to remove garbage data
  features = sanitizeFeatures(features);

  const analyzedFeatures = features.map(f => analyzeFeature(f));
  const overview = rfpData.overview || '';
  const target = rfpData.targetUsers || '일반 사용자';

  // Generate project name
  const projectName = generateSmartProjectName(overview, features, projectInfo.type);
  const now = new Date();

  // Document metadata
  const documentMeta = {
    version: '1.0',
    createdAt: now.toISOString().split('T')[0],
    generatedBy: 'Wishket AI PRD Builder',
  };

  // Executive Summary — FORGE v2: C레벨 의사결정 가능 수준
  const p0Count = analyzedFeatures.filter(f => f.priority === 'P1').length;
  const p1Count = analyzedFeatures.filter(f => f.priority === 'P2').length;
  const topFeatureNames = features.slice(0, 3).map(f => f.name).join(', ');
  const executiveSummary = `${target}을 위한 ${projectInfo.type} "${projectName}" 프로젝트입니다. ${topFeatureNames} 등 핵심 기능 ${features.length}개(P0 ${p0Count}개, P1 ${p1Count}개)를 포함하며, ${projectInfo.avgDuration} 내 MVP 출시를 목표로 합니다. 위시켓 70,000건 프로젝트 데이터 기준, ${projectInfo.type}의 평균 예산은 ${projectInfo.avgBudget}이며 1차 출시 성공률은 ${projectInfo.successRate}입니다. 본 문서는 개발사에 바로 전달하여 정확한 견적과 WBS를 받을 수 있는 수준으로 작성되었습니다.`;

  // Problem Statement — FORGE v2: Before/After 구조로 임팩트 시각화
  const overviewFirstLine = overview.split('\n')[0]?.trim() || '';
  const problemStatement = overview.length > 10
    ? `[현재 상황] ${target}은(는) ${overviewFirstLine.slice(0, 80)} 관련하여 기존 솔루션의 한계(수동 프로세스, 분산된 데이터, 비효율적 워크플로우)로 인해 시간과 비용을 낭비하고 있습니다. 위시켓 유사 프로젝트 데이터에 따르면, ${projectInfo.type} 도입 전후 업무 효율성이 평균 40~60% 개선되는 것으로 나타났습니다.\n\n[기존 대안의 한계] 현재 시장의 대안들은 (1) 범용 솔루션으로 도메인 특화 기능 부재, (2) 높은 진입 비용과 복잡한 학습 곡선, (3) 한국 시장 특성(결제, 인증, UX 패턴) 미반영 등의 문제가 있습니다.\n\n[해결 방향] 본 프로젝트는 ${topFeatureNames} 등 ${features.length}개 핵심 기능을 통해, ${target}이 겪는 핵심 Pain Point를 해결하고 디지털 전환을 가속화합니다.`
    : `${projectInfo.type} 서비스 개발을 통해 ${target}의 핵심 니즈를 충족하고, ${projectInfo.marketInsight} 등 시장 기회를 선점합니다.`;

  // Project Goals — FORGE v2: 기간별 목표 + 측정 가능한 지표
  const projectGoals: PRDResult['projectGoals'] = [
    { goal: 'MVP 기능 완성 및 정시 출시', metric: `P0 핵심 기능 ${p0Count}개 전량 구현 + UAT 통과 (${projectInfo.avgDuration} 이내)` },
    { goal: '초기 사용자 확보 (출시 3개월)', metric: 'MAU 1,000명 달성, 일 평균 가입 15명 이상, 리텐션(D7) 30% 이상' },
    { goal: '사용자 만족도 확보 (출시 6개월)', metric: 'NPS 40점 이상, 앱스토어/서비스 평점 4.2 이상, CS 응답 시간 < 2시간' },
    { goal: '안정적 서비스 운영', metric: '가용성 99.5% (월 다운타임 < 3.6시간), P1 장애 복구 < 1시간, 에러율 < 0.1%' },
  ];

  // User Personas — FORGE v2: 시나리오 기반 구체적 페르소나
  const userPersonas: PRDResult['userPersonas'] = [];
  if (target.includes('B2B') || target.includes('기업')) {
    userPersonas.push(
      { name: '김서준 팀장', role: '중소기업 사업개발팀장, 38세', needs: '매주 월요일 경영진 보고를 위해 팀원 5명의 업무 현황을 30분 안에 파악해야 함. 현재 카톡+엑셀로 취합하는 데 2시간 소요', painPoints: '데이터가 카톡/메일/엑셀에 분산되어 전체 현황 파악이 불가능. 보고서 작성에 매주 3시간 이상 소요. 모바일에서 확인 불가' },
      { name: '이하은 대리', role: '실무 담당자, 29세 (디지털 네이티브)', needs: '반복적인 데이터 입력/가공을 자동화하고, 업무 진행 상황을 실시간으로 공유하고 싶음', painPoints: '레거시 시스템의 복잡한 UI로 단순 작업에 10분 이상 소요. 모바일 미지원으로 외근 시 업무 중단. 팀장 보고를 위한 별도 정리 작업 필요' },
      { name: '관리자 (Admin)', role: '시스템 관리자 / IT 담당', needs: '전체 사용자 관리, 데이터 백업, 접근 권한 제어, 사용 현황 모니터링', painPoints: '보안 이슈 사전 감지 어려움, 사용자별 권한 관리가 수동, 시스템 장애 시 즉각 대응 어려움' },
    );
  } else if (target.includes('MZ') || target.includes('20') || target.includes('30')) {
    userPersonas.push(
      { name: '박소은', role: '직장인, 28세 (모바일 헤비 유저)', needs: '출퇴근 시간(30분)에 빠르게 핵심 콘텐츠를 소비하고 싶음. 가입은 30초 안에, 핵심 기능은 첫 사용 1분 안에 체험하고 싶음', painPoints: '회원가입 시 불필요한 정보 요구(5단계 이상). 앱 로딩 3초 이상이면 이탈. 개인정보 제공 범위가 불명확한 서비스 불신' },
      { name: '최현우', role: '프리랜서, 32세 (얼리어답터)', needs: '새로운 서비스를 먼저 사용해보고 주변에 추천하는 것을 즐김. 개인화된 경험과 프리미엄 기능에 대한 기대가 높음', painPoints: '비슷한 서비스 간 차별점 부재. 무료 플랜의 기능 제한이 과도함. 커뮤니티/피드백 채널 부재로 의견 반영 안 됨' },
      { name: '관리자 (Admin)', role: '서비스 운영자', needs: '사용자 행동 데이터 분석, 콘텐츠 관리, CS 대응, 마케팅 캠페인 집행', painPoints: '실시간 현황 파악 어려움, CS 응대에 너무 많은 시간 소요, A/B 테스트 환경 미비' },
    );
  } else {
    userPersonas.push(
      { name: '김민준', role: `핵심 사용자 (${target}), 30대`, needs: '직관적인 UI로 빠르게 목적을 달성하고 싶음. 가입부터 핵심 기능 사용까지 3분 이내를 기대', painPoints: '기존 서비스의 복잡한 인터페이스, 느린 응답 속도, 고객 지원 부재' },
      { name: '이서윤', role: `보조 사용자 / 관리자`, needs: '전체 사용 현황을 한 화면에서 파악, 데이터 내보내기(Excel/PDF), 사용자 관리', painPoints: '수동 관리 업무 과다, 통합 대시보드 부재, 데이터 시각화 어려움' },
      { name: '시스템 관리자', role: '운영/유지보수 담당', needs: '서비스 모니터링, 장애 알림, 사용자 권한 관리, 데이터 백업', painPoints: '장애 감지 지연, 수동 배포 프로세스, 로그 분석 도구 부재' },
    );
  }

  // Scope (Q8: Add proper scope items from project type's mustHaveFeatures)
  const scopeInclusions = features.map(f => `${f.name}${f.description ? ` — ${f.description}` : ''}`);

  // Add mustHaveFeatures that aren't already in the feature list
  const featureNames = features.map(f => f.name.toLowerCase()).join(' ');
  for (const mustHave of projectInfo.mustHaveFeatures) {
    const mustHaveKeyword = mustHave.split('(')[0].trim().toLowerCase();
    if (!featureNames.includes(mustHaveKeyword.slice(0, 3))) {
      scopeInclusions.push(mustHave);
    }
  }

  const scopeExclusions: string[] = [];
  if (!featureNames.includes('다국어')) scopeExclusions.push('다국어 지원 (i18n) — 추후 검토');
  if (!featureNames.includes('오프라인')) scopeExclusions.push('오프라인 모드 — 추후 검토');
  if (!featureNames.includes('접근성')) scopeExclusions.push('접근성 고도화 (WCAG AAA) — 추후 검토');
  if (!featureNames.includes('AI') && !featureNames.includes('추천')) scopeExclusions.push('AI 기반 개인화 추천 — 추후 검토');
  if (scopeExclusions.length === 0) {
    scopeExclusions.push('고급 분석/BI 대시보드 — 추후 검토');
    scopeExclusions.push('써드파티 ERP 연동 — 추후 검토');
  }

  // Tech Stack with rationale
  const techStackRaw = projectInfo.commonStack.split('+').map(s => s.trim()).filter(s => s.length > 0);
  const techStack: PRDResult['techStack'] = [];
  for (const t of techStackRaw) {
    const lower = t.toLowerCase();
    let category = '기타';
    let rationale = '프로젝트 요구사항에 적합';
    if (lower.includes('react') || lower.includes('vue') || lower.includes('next') || lower.includes('flutter')) {
      category = '프론트엔드'; rationale = '빠른 개발 속도와 풍부한 생태계, 위시켓 프로젝트 채택률 상위';
    } else if (lower.includes('node') || lower.includes('spring') || lower.includes('django') || lower.includes('nest') || lower.includes('express')) {
      category = '백엔드'; rationale = '안정적 API 구현, 확장성 및 유지보수성 우수';
    } else if (lower.includes('postgres') || lower.includes('mysql') || lower.includes('mongo') || lower.includes('redis')) {
      category = '데이터베이스'; rationale = '대규모 데이터 처리 및 트랜잭션 안정성 보장';
    } else if (lower.includes('aws') || lower.includes('firebase') || lower.includes('gcp') || lower.includes('docker') || lower.includes('vercel')) {
      category = '인프라/클라우드'; rationale = '자동 스케일링, 고가용성 및 글로벌 배포 지원';
    } else if (lower.includes('figma') || lower.includes('tailwind')) {
      category = '디자인/UI'; rationale = '디자인 시스템 효율화 및 일관된 UI 구현';
    }
    techStack.push({ category, tech: t, rationale });
  }

  // Organize features by priority
  const featuresP0 = analyzedFeatures.filter(f => f.priority === 'P1');
  const featuresP1 = analyzedFeatures.filter(f => f.priority === 'P2');
  const featuresP2 = analyzedFeatures.filter(f => f.priority === 'P3');

  // Create feature modules with full blueprint data from FEATURE_DB
  const featureModules: PRDResult['featureModules'] = [];

  if (featuresP0.length > 0) {
    featureModules.push({
      id: 1,
      name: 'MVP 필수 기능',
      priority: 'P0',
      priorityLabel: 'MVP 필수',
      features: featuresP0.map((f, i) => {
        const blueprint = getFeatureBlueprint(f.name);
        return {
          id: `P0-${i + 1}`,
          name: f.name,
          description: f.description,
          subFeatures: blueprint?.subFeatures || f.subFeatures || [],
          acceptanceCriteria: blueprint?.acceptanceCriteria || f.acceptanceCriteria || [],
          userFlow: blueprint?.flowDiagram || '(사용자 흐름 미정의)',
          screenSpecs: blueprint?.screenSpecs || [],
          businessRules: blueprint?.businessRules || [],
          dataEntities: blueprint?.dataEntities || [],
          errorCases: blueprint?.errorCases || [],
        };
      }),
    });
  }

  if (featuresP1.length > 0) {
    featureModules.push({
      id: 2,
      name: '우선 기능',
      priority: 'P1',
      priorityLabel: '우선순위 1',
      features: featuresP1.map((f, i) => {
        const blueprint = getFeatureBlueprint(f.name);
        return {
          id: `P1-${i + 1}`,
          name: f.name,
          description: f.description,
          subFeatures: blueprint?.subFeatures || f.subFeatures || [],
          acceptanceCriteria: blueprint?.acceptanceCriteria || f.acceptanceCriteria || [],
          userFlow: blueprint?.flowDiagram || '(사용자 흐름 미정의)',
          screenSpecs: blueprint?.screenSpecs || [],
          businessRules: blueprint?.businessRules || [],
          dataEntities: blueprint?.dataEntities || [],
          errorCases: blueprint?.errorCases || [],
        };
      }),
    });
  }

  if (featuresP2.length > 0) {
    featureModules.push({
      id: 3,
      name: '선택 기능',
      priority: 'P2',
      priorityLabel: '우선순위 2',
      features: featuresP2.map((f, i) => {
        const blueprint = getFeatureBlueprint(f.name);
        return {
          id: `P2-${i + 1}`,
          name: f.name,
          description: f.description,
          subFeatures: blueprint?.subFeatures || f.subFeatures || [],
          acceptanceCriteria: blueprint?.acceptanceCriteria || f.acceptanceCriteria || [],
          userFlow: blueprint?.flowDiagram || '(사용자 흐름 미정의)',
          screenSpecs: blueprint?.screenSpecs || [],
          businessRules: blueprint?.businessRules || [],
          dataEntities: blueprint?.dataEntities || [],
          errorCases: blueprint?.errorCases || [],
        };
      }),
    });
  }

  // Generate non-functional requirements based on project type
  const nonFunctionalRequirements: PRDResult['nonFunctionalRequirements'] = [
    {
      category: '보안 (Security)',
      items: [
        'HTTPS/TLS 암호화 적용 (모든 통신)',
        '사용자 비밀번호: bcrypt 해싱, 최소 8자 + 영문+숫자+특수문자',
        'JWT 토큰: Access 1시간, Refresh 14일 만료',
        'SQL Injection/XSS 방지: 입력 검증 및 parameterized queries',
        '개인정보보호법(GDPR/CCPA) 준수: 데이터 암호화, 개인정보 삭제 기능',
        'API 인증/인가: OAuth 2.0 또는 API Key 기반',
        '민감 정보 로깅 금지 (비밀번호, 결제정보 등)',
      ],
    },
    {
      category: '성능 (Performance)',
      items: [
        'API 응답 시간: 평균 < 200ms, 99th percentile < 1초',
        '페이지 로딩: First Contentful Paint (FCP) < 2초',
        '동시 사용자 처리: 최소 1,000명 이상 (예상 피크 기준)',
        '데이터베이스 쿼리: 인덱싱을 통한 < 100ms 응답',
        '캐싱 전략: Redis 캐시 (세션, 자주 조회하는 데이터)',
        'CDN 활용: 정적 자산(이미지, CSS, JS) 글로벌 배포',
        '이미지 최적화: WebP 포맷, 자동 리사이즈',
      ],
    },
    {
      category: '접근성 (Accessibility)',
      items: [
        'WCAG 2.1 Level AA 준수 (웹 접근성)',
        '모바일 반응형 디자인: 320px부터 2560px까지 지원',
        '화면 읽기 프로그램 지원: ARIA 레이블 및 의미론적 HTML',
        '키보드 네비게이션: Tab/Shift+Tab으로 모든 기능 접근 가능',
        '컬러 대비: 최소 4.5:1 비율 (텍스트)',
        '터치 대상 최소 크기: 44x44px (모바일)',
      ],
    },
    {
      category: '규정준수 (Compliance)',
      items: [
        '개인정보보호정책, 이용약관 필수 제시',
        '결제: PCI DSS 레벨 1 준수 (결제 정보 암호화)',
        '이메일 마케팅: CAN-SPAM Act 준수 (구독 해지 기능)',
        '쿠키 정책: GDPR 준수 (명시적 동의)',
        '접근성: WCAG, ADA 준수',
        '데이터 거주지: 사용자 국가별 데이터 로컬 저장',
      ],
    },
  ];

  // Build expanded project overview
  const projectOverview = `${overview || '(프로젝트 개요 미입력)'}\n\n프로젝트 유형: ${projectInfo.type} | 평균 예산: ${projectInfo.avgBudget} | 예상 기간: ${projectInfo.avgDuration}\n\n${projectInfo.marketInsight}`;

  // Timeline
  const totalFeatures = features.length;
  const timeline: PRDResult['timeline'] = [
    { phase: '기획 & 설계', duration: '2~3주', deliverables: ['요구사항 확정', '와이어프레임/프로토타입', 'DB 설계', 'API 명세서'] },
    { phase: 'MVP 개발 (P0)', duration: `${Math.max(4, totalFeatures)}~${Math.max(6, totalFeatures + 2)}주`, deliverables: [`P0 필수 기능 ${featuresP0.length}개 구현`, 'QA 및 버그 수정', '스테이징 배포'] },
    { phase: '추가 개발 (P1~P2)', duration: `${Math.max(2, featuresP1.length + featuresP2.length)}~${Math.max(4, featuresP1.length + featuresP2.length + 2)}주`, deliverables: [`P1 기능 ${featuresP1.length}개 + P2 기능 ${featuresP2.length}개 구현`, '통합 테스트', '성능 최적화'] },
    { phase: '출시 & 안정화', duration: '1~2주', deliverables: ['프로덕션 배포', '모니터링 세팅', '사용자 피드백 수집', '핫픽스 대응'] },
  ];

  // Assumptions
  const assumptions: string[] = [
    '클라이언트 측에서 기획/디자인 시안을 제공하거나, 개발사 내부 디자이너가 담당',
    '개발 기간 중 요구사항 변경은 스프린트 단위로 관리 (애자일 방식)',
    `서버 인프라는 ${techStack.some(t => t.tech.toLowerCase().includes('aws')) ? 'AWS' : '클라우드'} 기반으로 구성`,
    '외부 API (결제, 소셜 로그인 등)의 안정적 제공을 전제',
    '테스트 데이터 및 시나리오는 클라이언트와 협의하여 준비',
  ];

  // Constraints
  const constraints: string[] = [
    `예산 범위: ${projectInfo.avgBudget} 내 (범위 초과 시 기능 우선순위 재조정)`,
    `일정 목표: ${projectInfo.avgDuration} 내 MVP 출시`,
    '개인정보보호법 및 관련 법규 준수 필수',
    '모바일 반응형 필수 지원 (iOS Safari, Android Chrome)',
    '한국어 우선 지원 (다국어는 향후 확장)',
  ];

  // Risks — FORGE v2: 프로젝트 유형별 실전 리스크 + 대응 방안
  const risks: PRDResult['risks'] = [
    { risk: `Scope Creep — 개발 중 기능 추가 요청 (위시켓 데이터: ${projectInfo.type} 프로젝트 67%에서 발생)`, impact: '높음', mitigation: '변경 요청 시 영향도 분석 리포트 필수 작성, 추가 비용/일정 합의 후 진행. 매주 수요일 스프린트 리뷰에서 scope 검증' },
    { risk: `외부 API 연동 지연 — ${projectInfo.commonIntegrations.slice(0, 2).join(', ')} 등 연동 시 예상보다 1~3주 추가 소요 가능`, impact: '중간', mitigation: 'Mock API 기반 병렬 개발, API 장애 시 fallback 시나리오 사전 설계. 연동 계정/키 발급은 개발 착수 2주 전 완료' },
    { risk: `${projectInfo.keyRisks[0] || '기술 스택 호환성 이슈'}`, impact: '높음', mitigation: 'PoC(Proof of Concept) 1주 선행 개발로 기술 검증, 대안 기술 스택 사전 선정' },
    { risk: '보안 취약점 — 출시 전 미발견 시 서비스 중단/데이터 유출 위험', impact: '높음', mitigation: '개발 완료 후 OWASP Top 10 기반 보안 감사 필수, 외부 모의해킹 테스트 권장 (비용: 200~500만원)' },
    { risk: '출시 후 사용자 이탈 — 온보딩 UX 미흡으로 첫 사용 후 이탈률 60% 이상 가능', impact: '중간', mitigation: '첫 사용 경험(FTX) 설계에 전체 UX 예산 15% 할당, 3단계 이내 핵심 가치 체험 가능하도록 설계' },
  ];

  // Glossary
  const glossary: PRDResult['glossary'] = [
    { term: 'MVP', definition: 'Minimum Viable Product, 최소 기능 제품. 핵심 기능만으로 시장 검증하는 첫 번째 버전' },
    { term: 'P0/P1/P2', definition: '우선순위 등급. P0=필수(MVP), P1=우선(2차), P2=선택(향후)' },
    { term: 'PRD', definition: 'Product Requirements Document, 제품 요구사항 정의서' },
    { term: 'NFR', definition: 'Non-Functional Requirements, 비기능 요구사항 (성능, 보안, 접근성 등)' },
    { term: 'UAT', definition: 'User Acceptance Testing, 사용자 인수 테스트' },
  ];

  // F15: Generate Information Architecture (Sitemap)
  const generateSitemap = (): PRDResult['informationArchitecture'] => {
    const mainPages = [
      { id: 'home', label: '홈' },
      { id: 'search', label: '검색' },
      { id: 'mypage', label: '마이페이지' },
    ];

    // Add feature-based pages
    const featurePages = features.slice(0, 5).map((f, i) => ({
      id: `feature-${i + 1}`,
      label: f.name,
    }));

    // Build sitemap structure
    const sitemap = [
      {
        id: 'root',
        label: projectName,
        children: [
          {
            id: 'main-nav',
            label: '주요 섹션',
            children: [...mainPages, ...featurePages],
          },
          {
            id: 'auth',
            label: '인증',
            children: [
              { id: 'login', label: '로그인' },
              { id: 'signup', label: '회원가입' },
              { id: 'password-reset', label: '비밀번호 찾기' },
            ],
          },
          {
            id: 'settings',
            label: '설정',
            children: [
              { id: 'profile', label: '프로필 설정' },
              { id: 'notifications', label: '알림 설정' },
              { id: 'privacy', label: '개인정보' },
            ],
          },
        ],
      },
    ];

    return { sitemap };
  };

  const informationArchitecture = generateSitemap();

  // ═══════════════════════════════════════════
  // FORGE Quality Upgrade — New Fields
  // ═══════════════════════════════════════════

  // C2 — Original Description
  const originalDescription = rfpData.overview || '프로젝트 개요가 제공되지 않았습니다.';

  // H1 — Budget Breakdown
  const budgetBreakdown: PRDResult['budgetBreakdown'] = [];
  let totalComplexity = 0;
  const featureComplexities = analyzedFeatures.map(f => {
    const blueprint = getFeatureBlueprint(f.name);
    const complexity = blueprint?.complexity || 3;
    totalComplexity += complexity;
    return { name: f.name, complexity };
  });

  for (const fc of featureComplexities) {
    const percentage = Math.round((fc.complexity / totalComplexity) * 100);
    const baseAmount = projectInfo.avgBudget.match(/[\d,]+/g)?.[0]?.replace(/,/g, '') || '3000';
    const estimatedAmount = Math.round((parseInt(baseAmount) * percentage) / 100);
    const effort = fc.complexity <= 2 ? '1~2주' : fc.complexity <= 3 ? '2~3주' : fc.complexity <= 4 ? '3~4주' : '4~6주';
    budgetBreakdown.push({
      feature: fc.name,
      percentage,
      estimatedCost: `${estimatedAmount.toLocaleString()}만원`,
      effort,
    });
  }

  // H3 — API Endpoints
  const apiEndpoints: PRDResult['apiEndpoints'] = [];
  for (const feature of features) {
    const endpoints = API_ENDPOINTS_DB[feature.name] || [];
    for (const ep of endpoints) {
      apiEndpoints.push({
        ...ep,
        feature: feature.name,
      });
    }
  }

  // If no endpoints generated from specific features, add generic CRUD endpoints
  if (apiEndpoints.length === 0) {
    for (const [i, feature] of features.slice(0, 5).entries()) {
      apiEndpoints.push(
        { method: 'GET', path: `/api/${feature.name.toLowerCase().replace(/ /g, '-')}`, description: `${feature.name} 목록 조회`, feature: feature.name },
        { method: 'POST', path: `/api/${feature.name.toLowerCase().replace(/ /g, '-')}`, description: `${feature.name} 생성/요청`, feature: feature.name },
        { method: 'PUT', path: `/api/${feature.name.toLowerCase().replace(/ /g, '-')}/:id`, description: `${feature.name} 수정`, feature: feature.name }
      );
    }
  }

  // H4 — Data Model
  const dataModel: PRDResult['dataModel'] = [];
  const processedEntities = new Set<string>();

  for (const feature of features) {
    const blueprint = getFeatureBlueprint(feature.name);
    if (blueprint?.dataEntities) {
      for (const entity of blueprint.dataEntities) {
        if (!processedEntities.has(entity.name)) {
          processedEntities.add(entity.name);
          const fields = entity.fields.split(',').map(f => f.trim());
          const relationships: string[] = [];

          // Infer relationships based on field names
          if (fields.some(f => f.includes('user'))) relationships.push('User와 다대일 관계');
          if (fields.some(f => f.includes('id') && f !== 'id')) {
            const relatedTo = fields.find(f => f.includes('_id') && f !== 'id');
            if (relatedTo) relationships.push(`${relatedTo.replace('_id', '').replace(/_/g, ' ')}과 연관`);
          }
          if (fields.some(f => f.includes('created'))) relationships.push('타임스탬프 추적');

          dataModel.push({
            entity: entity.name,
            fields,
            relationships: relationships.length > 0 ? relationships : ['독립 엔티티'],
          });
        }
      }
    }
  }

  // M3 — Enhanced risks with probability
  const probabilityMap: Record<string, string> = {};
  for (const risk of projectInfo.keyRisks) {
    const riskLower = risk.toLowerCase();
    if (riskLower.includes('높음') || riskLower.includes('critical') || riskLower.includes('심각')) {
      probabilityMap[risk] = '높음';
    } else if (riskLower.includes('중간') || riskLower.includes('medium')) {
      probabilityMap[risk] = '중간';
    } else {
      probabilityMap[risk] = '낮음';
    }
  }

  const risksWithProbability: PRDResult['risks'] = risks.map(r => ({
    ...r,
    probability: r.impact === '높음' ? '높음' : r.impact === '중간' ? '중간' : '낮음',
  }));

  // M6 — Competitor Analysis
  let competitorAnalysis: PRDResult['competitorAnalysis'] = [];
  const competitors = COMPETITOR_DB[projectInfo.type] || [];
  if (competitors.length > 0) {
    competitorAnalysis = competitors.slice(0, 3);
  } else {
    // Fallback: Generate generic competitors based on project type
    competitorAnalysis = [
      { name: '경쟁사 A', strengths: '기존 대규모 사용자 기반', weaknesses: '낮은 기술 혁신', differentiation: '최신 기술 적용, 더 나은 UX' },
      { name: '경쟁사 B', strengths: '강한 마케팅 및 브랜드', weaknesses: '복잡한 인터페이스', differentiation: '간단한 사용성, 빠른 속도' },
      { name: '경쟁사 C', strengths: '다양한 기능', weaknesses: '높은 가격대', differentiation: '저렴한 가격, 핵심 기능 집중' },
    ];
  }

  // M4 — Enhanced assumptions and constraints (minimum 5 each)
  while (assumptions.length < 5) {
    const additionalAssumptions = [
      '데이터 마이그레이션은 필요하지 않거나 간단한 초기화 수준으로 가정',
      '제3자 라이브러리/서비스는 안정적으로 제공될 것으로 가정',
      '사용자 교육/문서는 개발팀이 기본 수준으로 제공 (심화 교육은 별도 계약)',
      '보안 감시/24시간 모니터링은 출시 후 추가 구성',
      '멀티테넌시/화이트라벨은 추후 버전에서 지원',
      '국제화(i18n) 지원은 MVP 이후 고려',
    ];
    for (const assumption of additionalAssumptions) {
      if (assumptions.length < 5 && !assumptions.includes(assumption)) {
        assumptions.push(assumption);
      }
    }
    break;
  }

  while (constraints.length < 5) {
    const additionalConstraints = [
      '모바일 OS 지원: iOS 14+, Android 11+ 최소 지원',
      'API 응답 시간: 평균 200ms, 99th percentile 1초 이내',
      '동시 사용자: 예상 피크 기준 1,000명 이상 처리 가능',
      '데이터 보관: 한국 내 데이터센터 기본, 해외 백업은 별도 계약',
      '배포 환경: Docker + Kubernetes 기반 클라우드 인프라 필수',
    ];
    for (const constraint of additionalConstraints) {
      if (constraints.length < 5 && !constraints.includes(constraint)) {
        constraints.push(constraint);
      }
    }
    break;
  }

  // M5 — Enhanced glossary (minimum 10 terms)
  const glossaryTerms: Record<string, string> = {
    'MVP': 'Minimum Viable Product, 최소 기능 제품. 핵심 기능만으로 시장 검증하는 첫 번째 버전',
    'P0/P1/P2': '우선순위 등급. P0=필수(MVP), P1=우선(2차), P2=선택(향후)',
    'PRD': 'Product Requirements Document, 제품 요구사항 정의서',
    'NFR': 'Non-Functional Requirements, 비기능 요구사항 (성능, 보안, 접근성 등)',
    'UAT': 'User Acceptance Testing, 사용자 인수 테스트',
    'API': 'Application Programming Interface, 소프트웨어 간 통신 규약',
    'REST': 'Representational State Transfer, HTTP 기반 API 아키텍처',
    'JWT': 'JSON Web Token, 상태 비저장 인증 방식',
    'CRUD': 'Create, Read, Update, Delete, 기본 데이터 조작 작업',
    'QA': 'Quality Assurance, 품질 보증 및 테스트',
    'CI/CD': 'Continuous Integration/Continuous Deployment, 지속적 통합/배포',
    'SLA': 'Service Level Agreement, 서비스 수준 약정 (가용성/응답시간 등)',
  };

  const enhancedGlossary: PRDResult['glossary'] = [];
  for (const [term, definition] of Object.entries(glossaryTerms)) {
    enhancedGlossary.push({ term, definition });
  }

  // Add domain-specific terms from features
  for (const feature of features.slice(0, 5)) {
    const featureLower = feature.name.toLowerCase();
    const additionalTerms: Record<string, Record<string, string>> = {
      '로그인': { 'OAuth': 'Open Authorization, 소셜 로그인 표준 프로토콜', 'Refresh Token': 'JWT 갱신용 토큰, 보안성을 위해 장기 보관' },
      '결제': { 'PG': 'Payment Gateway, 결제 대행사', 'TID': 'Transaction ID, 결제 거래 고유 번호' },
      '채팅': { 'WebSocket': '양방향 실시간 통신 프로토콜', 'Message Queue': '비동기 메시지 처리 시스템' },
      '검색': { 'ElasticSearch': '전문 검색 엔진, 대규모 데이터 검색 최적화', 'Tokenization': '텍스트를 의미있는 단위로 분할' },
      '관리자': { 'RBAC': 'Role-Based Access Control, 역할 기반 접근 제어', 'Audit Log': '시스템 활동 기록' },
    };

    for (const [key, terms] of Object.entries(additionalTerms)) {
      if (featureLower.includes(key.toLowerCase())) {
        for (const [term, definition] of Object.entries(terms)) {
          if (!enhancedGlossary.find(g => g.term === term)) {
            enhancedGlossary.push({ term, definition });
          }
        }
      }
    }
  }

  const result: PRDResult = {
    projectName,
    documentMeta,
    executiveSummary,
    projectOverview,
    problemStatement,
    projectGoals,
    targetUsers: target,
    userPersonas,
    scopeInclusions,
    scopeExclusions,
    techStack,
    referenceServices: rfpData.referenceServices || '해당 없음',
    additionalRequirements: rfpData.additionalRequirements || '추가 요구사항 없음',
    featureModules,
    nonFunctionalRequirements,
    timeline,
    assumptions,
    constraints,
    risks: risksWithProbability,
    glossary: enhancedGlossary,
    expertInsight: `💡 핵심 성공 요인 TOP 3 (위시켓 ${projectInfo.type} 프로젝트 데이터 기반)\n\n1. MVP 범위 철저 관리: ${projectInfo.avgDuration} 이내 출시한 프로젝트의 성공률이 2배 높습니다. P0 기능 ${featuresP0.length}개에 집중하고, P1/P2는 출시 후 데이터 기반으로 우선순위를 재조정하세요.\n\n2. 주 1회 이상 정기 미팅: 개발사와 주 1회 이상 스프린트 리뷰를 진행한 프로젝트는 일정 준수율이 85%로, 미진행 프로젝트(52%) 대비 월등히 높습니다.\n\n3. 와이어프레임 사전 확정: 개발 착수 전 Figma 기반 와이어프레임을 100% 확정한 프로젝트는 중간 수정률이 30% 이하입니다.\n\n⚠️ 흔한 실패 원인 TOP 3\n\n1. Scope Creep: 개발 중 기능 추가 요청이 전체 프로젝트의 67%에서 발생합니다. 추가 기능 1개당 평균 2~3주 일정 지연, 300~500만원 추가 비용이 발생합니다.\n\n2. 커뮤니케이션 단절: 주 1회 미만 소통하는 프로젝트의 분쟁 발생률이 3배 높습니다. Slack/노션 등 비동기 채널을 반드시 운영하세요.\n\n3. 테스트 부족: QA 기간을 전체 일정의 20% 미만으로 잡은 프로젝트의 출시 후 치명 버그 발생률이 45%입니다.\n\n📋 개발사 선정 체크리스트\n- 동종 ${projectInfo.type} 프로젝트 레퍼런스가 최소 3건 이상인가?\n- 전담 PM이 배정되며, 주 1회 이상 정기 미팅이 가능한가?\n- 소스코드 100% 귀속, Git 저장소 실시간 접근 가능한가?\n- 하자보수 기간 6개월 이상, 범위가 계약서에 명시되어 있는가?\n- 계약 해지 시 기 개발분 인도 조건이 명확한가?\n\n💰 예산 최적화 전략\n- MVP 우선 출시: P0만 먼저 개발 시 전체 예산의 60~70%로 시장 검증 가능\n- 크로스플랫폼: Flutter/React Native 활용 시 네이티브 대비 30~40% 비용 절감\n- 오픈소스 활용: 인증(Supabase Auth), 결제(토스페이먼츠 SDK) 등 검증된 라이브러리로 개발 기간 단축`,
    informationArchitecture,
    // FORGE Quality Upgrade Fields
    originalDescription,
    budgetBreakdown,
    apiEndpoints,
    dataModel,
    competitorAnalysis,
  };

  return JSON.stringify(result);
}

// ═══════════════════════════════════════════
// F14: AI Dynamic Feature Blueprint Generation
// ═══════════════════════════════════════════

async function generateDynamicFeatureBlueprints(
  rfpDocumentJson: string,
  features: FeatureItem[],
  analyzedFeatures: FeatureAnalysis[],
  anthropic: any
): Promise<string> {
  try {
    // Find features not matched in FEATURE_DB
    const unmatchedFeatures = features.filter(f => !getFeatureBlueprint(f.name));

    if (unmatchedFeatures.length === 0) return rfpDocumentJson;

    // Batch all unmatched features into a single API call
    const unmatchedList = unmatchedFeatures.map(f => f.name).join(', ');

    const blueprintResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: '당신은 소프트웨어 아키텍트입니다. 기능에 대한 상세한 기술 사양을 JSON 형식으로 제공하세요.',
      messages: [
        {
          role: 'user',
          content: `다음 기능들에 대한 상세 기술 사양을 생성하세요:
기능 목록: ${unmatchedList}

각 기능마다 다음 JSON 형식으로 응답하세요:
{
  "features": [
    {
      "name": "기능명",
      "subFeatures": ["서브기능1", "서브기능2", "서브기능3", "서브기능4", "서브기능5"],
      "acceptanceCriteria": ["수용기준1", "수용기준2", "수용기준3", "수용기준4"],
      "userFlow": "단계별 사용자 흐름을 텍스트로 설명",
      "screenSpecs": [
        { "id": "SCR-001", "name": "화면명", "purpose": "목적", "elements": ["요소1", "요소2"], "scenarios": [["시나리오1", "조건", "동작", "결과"]] }
      ],
      "businessRules": ["규칙1", "규칙2", "규칙3"],
      "dataEntities": [
        { "name": "엔티티명", "fields": "필드1, 필드2, 필드3" }
      ],
      "errorCases": ["에러케이스1", "에러케이스2", "에러케이스3"]
    }
  ]
}`,
        },
      ],
    });

    const blueprintContent = blueprintResponse.content[0];
    if (blueprintContent.type === 'text') {
      try {
        const jsonMatch = blueprintContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const blueprintData = JSON.parse(jsonMatch[0]);
          const parsed = JSON.parse(rfpDocumentJson) as PRDResult;

          // Apply generated blueprints to featureModules
          if (blueprintData.features && Array.isArray(blueprintData.features)) {
            for (const generated of blueprintData.features) {
              // Find matching feature in featureModules and update it
              for (const module of parsed.featureModules) {
                const idx = module.features.findIndex(f => f.name === generated.name);
                if (idx >= 0) {
                  const feature = module.features[idx];
                  if (generated.subFeatures) feature.subFeatures = generated.subFeatures.slice(0, 10);
                  if (generated.acceptanceCriteria) feature.acceptanceCriteria = generated.acceptanceCriteria.slice(0, 6);
                  if (generated.userFlow) feature.userFlow = generated.userFlow;
                  if (generated.screenSpecs) feature.screenSpecs = generated.screenSpecs.slice(0, 5);
                  if (generated.businessRules) feature.businessRules = generated.businessRules.slice(0, 5);
                  if (generated.dataEntities) feature.dataEntities = generated.dataEntities.slice(0, 3);
                  if (generated.errorCases) feature.errorCases = generated.errorCases.slice(0, 5);
                }
              }
            }
          }

          console.log('Dynamic feature blueprints generated for unmatched features');
          return JSON.stringify(parsed);
        }
      } catch {
        console.log('Blueprint parse failed, using base feature specs');
      }
    }
  } catch (error) {
    console.error('Dynamic feature blueprint generation error:', error);
  }

  return rfpDocumentJson;
}

// ═══════════════════════════════════════════
// API Handler
// ═══════════════════════════════════════════

// Vercel serverless function timeout: 60초 (Claude API 응답 대기)
export const maxDuration = 60;

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

    // 하이브리드 방식: 서버 DB로 구조화된 PRDResult 생성 + Claude AI로 자연어 강화
    const projectInfo = getProjectTypeInfo(rfpData.overview);

    // 1단계: 서버 DB 기반 구조화된 PRDResult 생성 (항상 신뢰 가능)
    let rfpDocument: string = generateFallbackRFP(rfpData);

    // 2단계: Claude API로 전체 필드 강화 + 동적 기능 생성
    if (HAS_API_KEY) {
      try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        let features = rfpData.coreFeatures || [];
        features = sanitizeFeatures(features);

        const analyzedFeatures = features.map(f => analyzeFeature(f));
        const featureList = analyzedFeatures.map(f => f.name).join(', ');

        // FORGE v2: Enhanced Claude API call — 컨설팅펌 수준 자연어 품질
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: `당신은 위시켓에서 13년간 70,000건 이상의 IT 외주 프로젝트를 분석한 수석 PM 컨설턴트입니다.
맥킨지/BCG 수준의 구조화된 사고와, 실전 개발 현장의 디테일을 겸비합니다.
개발사가 읽고 "이건 전문가가 쓴 문서다"라고 느끼는 수준을 목표로 합니다.

## 절대 규칙
- 존댓말 사용 필수
- 추상적 표현 금지: "좋은", "효율적인", "혁신적인" 같은 빈 수식어 대신 구체적 수치/사례 사용
- 입력 프로젝트와 직접 관련 없는 기술(블록체인, NFT, 메타버스 등) 언급 금지
- 모든 수치는 근거 기반 (위시켓 데이터, 시장 조사, 업계 평균 등 출처 명시)
- 한국 IT 외주 시장 맥락에 맞는 조언 (글로벌 일반론 금지)

## 품질 기준
- Executive Summary: C레벨이 30초 안에 프로젝트 가치를 판단할 수 있어야 함
- Expert Insight: 이것만 읽어도 "위시켓에서 돈 주고 컨설팅 받은 것 같다"는 반응이 나와야 함
- 각 필드는 ChatGPT로는 절대 생성 불가능한 실전 외주 경험 기반 디테일을 포함해야 함`,
          messages: [
            {
              role: 'user',
              content: `다음 프로젝트의 전문 분석 및 상세 기획을 JSON 형식으로 작성해주세요.

[프로젝트 정보]
프로젝트 설명: ${rfpData.overview || ''}
타겟 사용자: ${rfpData.targetUsers || ''}
핵심 기능 (${analyzedFeatures.length}개): ${featureList}
프로젝트 유형: ${projectInfo.type}
평균 예산 범위: ${projectInfo.avgBudget}
예상 기간: ${projectInfo.avgDuration}
참고 서비스: ${rfpData.referenceServices || '없음'}
기술 요구사항: ${rfpData.techRequirements || '없음'}
추가 요구사항: ${rfpData.additionalRequirements || '없음'}

아래 JSON 형식으로만 응답하세요 (각 필드는 한국어로, 존댓말 사용):
{
  "projectName": "서비스 본질을 담은 직관적 프로젝트명 — 최대 15자, 영문 브랜드명도 OK (예: 펫닥터, FitMate, 배달잇)",
  "executiveSummary": "3~4문장 요약 (200자): 문장1=한 줄 서비스 정의, 문장2=타겟과 시장 기회, 문장3=핵심 차별점, 문장4=기대 비즈니스 임팩트(수치 포함). C레벨이 이것만 읽고 투자/진행 여부를 판단할 수 있어야 합니다.",
  "projectOverview": "전문 개요 (600자 이상). 반드시 포함: (1) 시장 배경 — 한국 시장 기준 관련 시장 규모(~조원), 성장률(CAGR ~%), 주요 트렌드 2개, (2) 핵심 가치제안 3가지 — 각각 [기존 방식]→[우리 솔루션]→[개선 효과] 형태로 구체화, (3) 비즈니스 모델 — 수익화 방법 1~2가지 명시, (4) 성공 지표(KPI) — 출시 3개월/6개월/12개월 시점별 목표 수치",
  "targetUsersAnalysis": "타겟 사용자 심층 분석 (500자 이상). 반드시 포함: (1) Primary 사용자 — 인구통계(연령/성별/직업), 디지털 리터러시 수준, 하루 평균 앱/서비스 사용 시간, (2) Secondary 사용자 — 있다면 동일 형식으로, (3) 각 세그먼트별 핵심 Pain Point 3개와 현재 해결 방식(경쟁사/수동 프로세스), (4) 사용자 여정 핵심 접점: 인지→가입→첫 사용→재사용→추천 각 단계의 핵심 전환 포인트, (5) 이 타겟에게 맞는 UI/UX 원칙 3가지",
  "projectGoals": [
    { "goal": "구체적 목표명", "metric": "측정 가능한 지표 + 기간 (예: 출시 3개월 내 DAU 500명, NPS 40+)" },
    { "goal": "구체적 목표명", "metric": "측정 가능한 지표 + 기간" },
    { "goal": "구체적 목표명", "metric": "측정 가능한 지표 + 기간" },
    { "goal": "구체적 목표명", "metric": "측정 가능한 지표 + 기간" }
  ],
  "userPersonas": [
    { "name": "한국인 이름", "role": "직업/역할 + 연령 (예: 스타트업 마케터, 29세)", "needs": "핵심 니즈 2~3가지를 구체적 시나리오로 (예: 매주 월요일 주간 리포트를 30분 안에 만들어야 하는데 데이터 수집에 2시간 소요)", "painPoints": "현재 겪는 구체적 문제 (예: 엑셀로 수동 취합, 실시간 데이터 확인 불가, 시각화 도구 비용 부담)" },
    { "name": "한국인 이름", "role": "직업/역할 + 연령", "needs": "핵심 니즈 2~3가지를 구체적 시나리오로", "painPoints": "현재 겪는 구체적 문제" },
    { "name": "한국인 이름", "role": "직업/역할 + 연령", "needs": "핵심 니즈 2~3가지를 구체적 시나리오로", "painPoints": "현재 겪는 구체적 문제" }
  ],
  "timeline": [
    { "phase": "단계명 (예: Phase 1 — 기획 & 설계)", "duration": "구체적 기간 (예: 2~3주)", "deliverables": ["산출물1 (구체적, 예: Figma 와이어프레임 전체 화면)", "산출물2", "산출물3"] },
    { "phase": "Phase 2 — UI/UX 디자인", "duration": "기간", "deliverables": ["산출물1", "산출물2"] },
    { "phase": "Phase 3 — 핵심 개발 (P0)", "duration": "기간", "deliverables": ["산출물1", "산출물2"] },
    { "phase": "Phase 4 — 추가 개발 (P1~P2)", "duration": "기간", "deliverables": ["산출물1", "산출물2"] },
    { "phase": "Phase 5 — QA & 출시", "duration": "기간", "deliverables": ["산출물1", "산출물2"] }
  ],
  "risks": [
    { "risk": "프로젝트에 특화된 구체적 위험 (일반적인 '일정 지연' 같은 뻔한 리스크 금지)", "impact": "높음/중간/낮음", "mitigation": "실행 가능한 구체적 대응 방안 (예: 매주 수요일 스프린트 리뷰에서 scope creep 체크, 변경 요청 시 영향도 분석 리포트 필수 제출)" },
    { "risk": "이 프로젝트 유형에서 위시켓 데이터 기준 실제 자주 발생하는 이슈", "impact": "높음/중간/낮음", "mitigation": "실행 가능한 구체적 대응 방안" },
    { "risk": "기술/외부 의존성 관련 위험", "impact": "높음/중간/낮음", "mitigation": "실행 가능한 구체적 대응 방안" },
    { "risk": "비즈니스/시장 관련 위험", "impact": "높음/중간/낮음", "mitigation": "실행 가능한 구체적 대응 방안" },
    { "risk": "운영/유지보수 관련 위험", "impact": "높음/중간/낮음", "mitigation": "실행 가능한 구체적 대응 방안" }
  ],
  "assumptions": ["가정1: 이 프로젝트에 특화된 전제 조건 (일반론 금지)", "가정2", "가정3", "가정4", "가정5"],
  "constraints": ["제약1: 이 프로젝트에 특화된 제약 사항 (일반론 금지)", "제약2", "제약3", "제약4", "제약5"],
  "problemStatement": "문제 정의 (400자 이상). 반드시 포함: (1) 현재 타겟 사용자가 겪는 핵심 문제 3가지 — 각 문제의 빈도, 비용, 감정적 고통을 구체적 수치/시나리오로 묘사, (2) 기존 대안 2~3개의 한계점 — 왜 기존 솔루션으로 충분하지 않은지 구체적으로, (3) 이 프로젝트의 해결 방향과 예상 임팩트 — before/after 비교 포함",
  "expertInsight": "위시켓 70,000건 프로젝트 데이터 기반 실전 컨설팅 리포트 (800자 이상). ★이 섹션이 가장 중요합니다★ 반드시 포함: (1) 💡 이 유형 프로젝트의 핵심 성공 요인 TOP 3 — 위시켓에서 성공한 유사 프로젝트들의 공통점을 구체적으로 (예: 'MVP를 8주 이내로 잡은 프로젝트의 성공률이 2배 높습니다'), (2) ⚠️ 가장 흔한 실패 원인 TOP 3 — 구체적 사례와 금액/기간 영향 (예: '초기 기획 단계에서 사용자 인터뷰 없이 진행한 프로젝트의 70%가 출시 후 6개월 내 피봇'), (3) 📋 개발사 선정 시 반드시 확인해야 할 체크리스트 5가지 — 질문 형태로 (예: '동종 프로젝트 레퍼런스가 최소 3건 이상인가?'), (4) 💰 예산 최적화 전략 3가지 — 각각 절감 예상 비율과 트레이드오프 명시, (5) 📝 계약 시 반드시 포함해야 할 조항 3가지 — 구체적 문구 예시 포함"
}`,
            },
          ],
        });

        const content = response.content[0];
        if (content.type === 'text') {
          try {
            const jsonMatch = content.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const aiEnhancement = JSON.parse(jsonMatch[0]);
              const parsed = JSON.parse(rfpDocument) as PRDResult;

              // Q2: Apply all AI-enhanced fields
              if (aiEnhancement.projectName) {
                parsed.projectName = aiEnhancement.projectName;
              }
              if (aiEnhancement.executiveSummary) {
                parsed.executiveSummary = aiEnhancement.executiveSummary;
              }
              if (aiEnhancement.projectOverview) {
                parsed.projectOverview = aiEnhancement.projectOverview +
                  `\n\n프로젝트 유형: ${projectInfo.type} | 평균 예산: ${projectInfo.avgBudget} | 예상 기간: ${projectInfo.avgDuration}`;
              }
              if (aiEnhancement.targetUsersAnalysis) {
                parsed.targetUsers = aiEnhancement.targetUsersAnalysis;
              }
              if (aiEnhancement.projectGoals && Array.isArray(aiEnhancement.projectGoals)) {
                parsed.projectGoals = aiEnhancement.projectGoals;
              }
              if (aiEnhancement.userPersonas && Array.isArray(aiEnhancement.userPersonas)) {
                parsed.userPersonas = aiEnhancement.userPersonas;
              }
              if (aiEnhancement.timeline && Array.isArray(aiEnhancement.timeline)) {
                parsed.timeline = aiEnhancement.timeline;
              }
              if (aiEnhancement.risks && Array.isArray(aiEnhancement.risks)) {
                // M3: Add probability field to Claude-generated risks if not present
                parsed.risks = aiEnhancement.risks.map((r: any) => ({
                  ...r,
                  probability: r.probability || (r.impact === '높음' ? '높음' : r.impact === '중간' ? '중간' : '낮음'),
                }));
              }
              if (aiEnhancement.assumptions && Array.isArray(aiEnhancement.assumptions)) {
                parsed.assumptions = aiEnhancement.assumptions;
              }
              if (aiEnhancement.constraints && Array.isArray(aiEnhancement.constraints)) {
                parsed.constraints = aiEnhancement.constraints;
              }
              if (aiEnhancement.problemStatement) {
                parsed.problemStatement = aiEnhancement.problemStatement;
              }
              if (aiEnhancement.expertInsight) {
                parsed.expertInsight = aiEnhancement.expertInsight;
              }

              // M7: Preserve FORGE Quality Upgrade fields from server-side generation
              // (These are never provided by Claude API, only generated server-side)
              // Note: originalDescription, budgetBreakdown, apiEndpoints, dataModel, competitorAnalysis
              // are already in 'parsed' from generateFallbackRFP call, so they persist through merge

              rfpDocument = JSON.stringify(parsed);
            }
          } catch {
            console.log('AI enhancement parse failed, using base PRD');
          }
        }

        // F14: 동적 블루프린트는 타임아웃 방지를 위해 별도 호출 대신
        // fallback DB 블루프린트를 사용 (이미 generateFallbackRFP에서 생성됨)
      } catch (aiError) {
        console.error('AI enhancement error (using base PRD):', aiError);
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
