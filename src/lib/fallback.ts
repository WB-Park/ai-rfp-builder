// AI RFP Builder — Smart Fallback Engine v3
// PRD 8.1 + G3: API 키 없이도 GPT 이상의 전문가 수준 응답
// 위시켓 13년 외주 데이터 기반 인사이트 + 도메인 전문 피드백

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

// ─── 프로젝트 유형 데이터베이스 ───
interface ProjectTypeInfo {
  type: string;
  avgBudget: string;
  avgDuration: string;
  keyFeatures: string[];
  techTip: string;
  commonRisk: string;
}

const PROJECT_TYPES: Record<string, ProjectTypeInfo> = {
  '모바일 앱': {
    type: '모바일 앱',
    avgBudget: '2,000~5,000만원',
    avgDuration: '4~8주(MVP)',
    keyFeatures: ['회원가입/로그인', '푸시 알림', '마이페이지'],
    techTip: 'Flutter나 React Native 같은 크로스플랫폼을 사용하면 iOS/Android 동시 개발 시 비용을 30~40% 절감할 수 있습니다.',
    commonRisk: '앱스토어 심사(평균 1~2주)를 일정에 반드시 포함해야 합니다.',
  },
  '웹 서비스': {
    type: '웹 서비스',
    avgBudget: '1,500~4,000만원',
    avgDuration: '4~6주(MVP)',
    keyFeatures: ['반응형 디자인', '회원 시스템', 'SEO 최적화'],
    techTip: '반응형으로 설계하면 모바일 사용자까지 커버할 수 있어 초기 비용을 크게 줄일 수 있습니다.',
    commonRisk: '브라우저 호환성(Chrome, Safari, Edge)을 초기에 정의해야 나중에 수정 비용이 줄어듭니다.',
  },
  '웹사이트': {
    type: '웹사이트',
    avgBudget: '500~2,000만원',
    avgDuration: '2~4주',
    keyFeatures: ['반응형 레이아웃', '콘텐츠 관리', '문의 폼'],
    techTip: 'WordPress나 Next.js 같은 검증된 프레임워크를 사용하면 개발 기간을 50% 이상 단축할 수 있습니다.',
    commonRisk: '호스팅과 도메인 비용은 별도이며, 월 유지 비용도 사전에 확인해야 합니다.',
  },
  '이커머스 플랫폼': {
    type: '이커머스',
    avgBudget: '3,000~8,000만원',
    avgDuration: '8~12주',
    keyFeatures: ['상품 관리', '장바구니/결제', '주문/배송 관리', '리뷰 시스템'],
    techTip: 'PG 연동(이니시스/토스페이먼츠 등)은 인증 절차에 2~3주가 소요되니 일정에 포함하세요.',
    commonRisk: '재고 관리와 정산 시스템의 복잡도를 초기에 과소평가하는 경우가 많습니다.',
  },
  '플랫폼': {
    type: '플랫폼',
    avgBudget: '5,000만~1.5억',
    avgDuration: '8~16주',
    keyFeatures: ['공급자/수요자 매칭', '결제/정산', '리뷰/평가', '관리자 대시보드'],
    techTip: '양면 마켓플레이스는 초기에 한쪽(공급 또는 수요)에 집중하는 것이 성공 확률이 높습니다.',
    commonRisk: '양면 시장의 "닭과 달걀" 문제를 해결하기 위한 초기 전략이 필수입니다.',
  },
  'SaaS 서비스': {
    type: 'SaaS',
    avgBudget: '3,000~8,000만원',
    avgDuration: '8~12주',
    keyFeatures: ['멀티테넌시', '구독/결제', '대시보드', '팀 관리'],
    techTip: '초기에는 단일 요금제로 시작하고, PMF(Product-Market Fit) 검증 후 요금 체계를 세분화하는 것을 추천합니다.',
    commonRisk: 'SaaS는 지속적 운영이 핵심이므로, 유지보수 계약을 반드시 사전에 협의하세요.',
  },
  '매칭 플랫폼': {
    type: '매칭 플랫폼',
    avgBudget: '4,000~1억',
    avgDuration: '8~14주',
    keyFeatures: ['프로필/포트폴리오', '매칭 알고리즘', '채팅', '결제/정산'],
    techTip: '초기 매칭은 수동 큐레이션으로 시작하고, 데이터가 쌓이면 알고리즘으로 전환하는 것이 리스크가 낮습니다.',
    commonRisk: '초기 사용자 확보 전략(공급자 먼저 vs 수요자 먼저)을 명확히 해야 합니다.',
  },
  '헬스케어 서비스': {
    type: '헬스케어',
    avgBudget: '4,000~1억',
    avgDuration: '10~16주',
    keyFeatures: ['건강 데이터 관리', '전문가 연결', '알림/리마인더'],
    techTip: '개인정보보호법(특히 민감정보)과 의료법을 초기 설계에 반드시 반영해야 합니다.',
    commonRisk: '의료 데이터 규제(PIPA)로 인해 서버 위치와 암호화 수준이 법적 요구사항입니다.',
  },
  '핀테크 서비스': {
    type: '핀테크',
    avgBudget: '5,000만~2억',
    avgDuration: '12~20주',
    keyFeatures: ['본인인증(KYC)', '계좌 연동', '거래 내역', '보안'],
    techTip: '금융위 인허가, 전자금융업 등록 등 규제 요건을 개발 전에 반드시 확인하세요.',
    commonRisk: '금융 규제 준수를 위한 추가 개발 비용이 초기 예상의 30~50% 추가될 수 있습니다.',
  },
  'AI 기반 서비스': {
    type: 'AI 기반 서비스',
    avgBudget: '3,000~1억',
    avgDuration: '8~16주',
    keyFeatures: ['AI 모델 연동', '데이터 수집/전처리', '결과 시각화'],
    techTip: 'AI 모델은 직접 개발보다 API(OpenAI, Claude 등)를 활용하면 초기 비용을 80% 이상 줄일 수 있습니다.',
    commonRisk: 'AI 정확도 기대치를 사전에 명확히 정의해야 나중에 분쟁이 줄어듭니다.',
  },
  '예약 서비스': {
    type: '예약 서비스',
    avgBudget: '2,000~5,000만원',
    avgDuration: '6~10주',
    keyFeatures: ['일정 관리', '예약/취소', '알림', '결제'],
    techTip: '캘린더 UI가 사용자 경험의 80%를 차지합니다. 좋은 캘린더 라이브러리 선택이 중요합니다.',
    commonRisk: '시간대(timezone) 처리와 동시 예약 방지(동시성 제어)를 반드시 고려하세요.',
  },
  '에듀테크 서비스': {
    type: '에듀테크',
    avgBudget: '3,000~7,000만원',
    avgDuration: '8~14주',
    keyFeatures: ['강의 콘텐츠 관리', '학습 진도 추적', '퀴즈/평가', '수강증'],
    techTip: '동영상 스트리밍은 AWS MediaConvert 등 클라우드 서비스를 활용하면 인프라 비용을 크게 줄일 수 있습니다.',
    commonRisk: '동영상 호스팅 비용이 예상보다 높을 수 있으니, CDN 비용을 사전에 산정하세요.',
  },
  '소프트웨어 서비스': {
    type: '소프트웨어 서비스',
    avgBudget: '2,000~5,000만원',
    avgDuration: '6~12주',
    keyFeatures: ['핵심 비즈니스 로직', '사용자 인증', '데이터 관리'],
    techTip: '첫 MVP는 핵심 기능 3개 이내로 제한하는 것이 성공 확률이 가장 높습니다.',
    commonRisk: '요구사항 변경(스코프 크리프)이 가장 흔한 프로젝트 지연 원인입니다.',
  },
};

// ─── Step 1: 프로젝트 개요 파싱 ───
function parseOverview(text: string): { enhanced: string; projectType: string; typeInfo: ProjectTypeInfo } {
  const t = text.trim().toLowerCase();
  const keywords: [string, string][] = [
    ['앱', '모바일 앱'], ['어플', '모바일 앱'], ['모바일', '모바일 앱'],
    ['웹사이트', '웹사이트'], ['홈페이지', '웹사이트'],
    ['웹', '웹 서비스'], ['사이트', '웹 서비스'],
    ['쇼핑몰', '이커머스 플랫폼'], ['커머스', '이커머스 플랫폼'], ['쇼핑', '이커머스 플랫폼'],
    ['플랫폼', '플랫폼'], ['마켓플레이스', '플랫폼'],
    ['saas', 'SaaS 서비스'], ['구독', 'SaaS 서비스'],
    ['매칭', '매칭 플랫폼'], ['중개', '매칭 플랫폼'],
    ['예약', '예약 서비스'], ['부킹', '예약 서비스'],
    ['교육', '에듀테크 서비스'], ['학습', '에듀테크 서비스'], ['강의', '에듀테크 서비스'],
    ['헬스', '헬스케어 서비스'], ['건강', '헬스케어 서비스'], ['의료', '헬스케어 서비스'],
    ['금융', '핀테크 서비스'], ['핀테크', '핀테크 서비스'], ['투자', '핀테크 서비스'],
    ['ai', 'AI 기반 서비스'], ['챗봇', 'AI 기반 서비스'], ['인공지능', 'AI 기반 서비스'],
  ];

  let projectType = '소프트웨어 서비스';
  for (const [key, val] of keywords) {
    if (t.includes(key)) {
      projectType = val;
      break;
    }
  }

  const typeInfo = PROJECT_TYPES[projectType] || PROJECT_TYPES['소프트웨어 서비스'];

  let enhanced = text.trim();
  if (enhanced.length < 30) {
    enhanced = `${enhanced} — ${typeInfo.type} 개발 프로젝트`;
  }

  return { enhanced, projectType, typeInfo };
}

// ─── Step 2: 타겟 사용자 파싱 ───
function parseTargetUsers(text: string): string {
  const t = text.trim();
  const segments: string[] = [];

  // 연령대 추출
  const ageMatch = t.match(/(\d{1,2})\s*[~\-대]\s*(\d{1,2})?/);
  if (ageMatch) segments.push(`연령대: ${ageMatch[0]}`);

  // 직업/역할 키워드
  const roles = ['직장인', '학생', '주부', '프리랜서', '사업자', '소상공인', '기업', 'B2B', 'B2C',
    '개발자', '디자이너', '마케터', '의사', '환자', '보호자', '반려인', '운동', '헬스',
    '시니어', '어린이', '부모', '자영업', '창업자', '투자자'];
  for (const role of roles) {
    if (t.includes(role)) segments.push(role);
  }

  if (segments.length > 0) {
    return `${t}\n\n[타겟 세그먼트: ${segments.join(', ')}]`;
  }
  return t;
}

// ─── Step 3: 핵심 기능 스마트 파싱 ───
function parseFeatures(text: string): { name: string; description: string; priority: string }[] {
  let items = text.split(/[\n]/).map(s => s.trim()).filter(Boolean);

  if (items.length === 1) {
    items = text.split(/[,，/·•\-]/).map(s => s.trim()).filter(s => s.length > 1);
  }

  items = items.map(s => s.replace(/^[\d①②③④⑤⑥⑦⑧⑨⑩]+[\.\)]\s*/, '').trim());

  // 기능 설명 데이터베이스 (확장됨)
  const featureDB: Record<string, { desc: string; complexity: string; duration: string }> = {
    '로그인': { desc: '이메일/소셜(카카오/네이버/구글) 로그인, 회원가입, 비밀번호 찾기, 자동 로그인', complexity: '중간', duration: '1~2주' },
    '회원가입': { desc: '이메일 인증, 약관 동의(필수/선택), 프로필 설정, 소셜 간편가입', complexity: '중간', duration: '1주' },
    '결제': { desc: 'PG 연동(이니시스/토스페이먼츠), 신용카드/간편결제(카카오페이/네이버페이), 결제 내역 관리', complexity: '높음', duration: '2~3주' },
    '채팅': { desc: 'WebSocket 기반 실시간 1:1/그룹 메시징, 읽음 확인, 파일/이미지 첨부, 알림', complexity: '높음', duration: '2~4주' },
    '알림': { desc: '푸시 알림(FCM/APNs), 인앱 알림 센터, 이메일 알림, 알림 설정 관리', complexity: '중간', duration: '1~2주' },
    '검색': { desc: '키워드 검색, 자동완성, 필터링(다중 조건), 최근 검색어, 인기 검색어', complexity: '중간', duration: '1~2주' },
    '마이페이지': { desc: '프로필 수정, 활동 내역, 찜/즐겨찾기, 설정(알림/개인정보), 탈퇴', complexity: '낮음', duration: '1주' },
    '관리자': { desc: '사용자 관리(정지/삭제), 콘텐츠 관리, 통계 대시보드, 공지사항 관리', complexity: '높음', duration: '2~4주' },
    '대시보드': { desc: '핵심 KPI 시각화(차트/그래프), 실시간 모니터링, 기간별 리포트, CSV 내보내기', complexity: '높음', duration: '2~3주' },
    '게시판': { desc: '글 작성(WYSIWYG 에디터)/수정/삭제, 댓글/대댓글, 좋아요, 신고, 페이지네이션', complexity: '중간', duration: '1~2주' },
    '지도': { desc: 'GPS 기반 현재 위치, 장소 검색(카카오맵/구글맵 API), 마커 표시, 경로 안내', complexity: '중간', duration: '1~2주' },
    '예약': { desc: '캘린더 기반 날짜/시간 선택, 실시간 가용성 확인, 예약 확인/취소, 리마인더 알림', complexity: '높음', duration: '2~3주' },
    '리뷰': { desc: '별점(1~5) 평가, 텍스트/사진 리뷰, 리뷰 신고, 평균 별점 계산, 정렬', complexity: '낮음', duration: '1주' },
    '장바구니': { desc: '상품 담기/삭제, 수량 변경, 옵션 선택, 장바구니 유지(로그인 전후), 합계 계산', complexity: '중간', duration: '1~2주' },
    '주문': { desc: '주문서 작성, 배송지 입력, 결제 연동, 주문 상태 추적, 주문 내역 관리', complexity: '높음', duration: '2~3주' },
    '추천': { desc: '사용자 행동(열람/구매/좋아요) 기반 추천, 유사 아이템 추천, 개인화 피드', complexity: '높음', duration: '2~4주' },
    '피드': { desc: '타임라인 기반 콘텐츠 목록, 좋아요/댓글/공유, 무한 스크롤, 팔로우/팔로잉', complexity: '중간', duration: '1~2주' },
    '분석': { desc: '사용자 행동 분석(GA/Mixpanel), 퍼널 분석, 코호트 분석, 리포트 자동 생성', complexity: '높음', duration: '2~4주' },
    '배송': { desc: '배송지 관리, 배송 상태 추적(API 연동), 운송장 번호 조회, 배송비 계산', complexity: '중간', duration: '1~2주' },
    '쿠폰': { desc: '쿠폰 코드 발급/사용, 할인율/금액 할인, 유효기간 설정, 사용 조건(최소 금액)', complexity: '낮음', duration: '1주' },
    '포인트': { desc: '포인트 적립(구매/활동)/사용/소멸, 등급별 적립율, 포인트 내역 관리', complexity: '중간', duration: '1~2주' },
    '인증': { desc: '본인인증(KYC), 신분증 OCR, 이메일/SMS 인증, 2단계 인증(2FA)', complexity: '높음', duration: '2~3주' },
    '정산': { desc: '판매자 정산 관리, 수수료 계산, 정산 주기 설정, 세금계산서 발행 연동', complexity: '높음', duration: '2~4주' },
  };

  return items.slice(0, 8).map((raw, i) => {
    const name = raw.length > 50 ? raw.slice(0, 50) : raw;

    let description = '';
    let complexity = '중간';
    let duration = '1~2주';

    for (const [keyword, info] of Object.entries(featureDB)) {
      if (raw.includes(keyword)) {
        description = info.desc;
        complexity = info.complexity;
        duration = info.duration;
        break;
      }
    }

    if (!description) {
      description = raw.length > 25
        ? raw
        : `${raw} 기능 구현 — 상세 요구사항은 개발사와 협의 필요`;
    }

    return {
      name,
      description: `${description} [난이도: ${complexity} | 예상: ${duration}]`,
      priority: i < 2 ? 'P1' : i < 4 ? 'P2' : 'P3',
    };
  });
}

// ─── Step 5: 기술 요구사항 파싱 ───
function parseTechRequirements(text: string): string {
  const t = text.trim().toLowerCase();
  const techs: string[] = [];

  if (t.includes('앱') || t.includes('모바일') || t.includes('ios') || t.includes('안드로이드') || t.includes('android')) {
    techs.push('모바일 앱 (iOS/Android)');
  }
  if (t.includes('웹') || t.includes('사이트') || t.includes('브라우저') || t.includes('반응형')) {
    techs.push('웹 (반응형)');
  }
  if (t.includes('둘') || t.includes('다') || t.includes('모두') || t.includes('앱+웹') || t.includes('웹+앱')) {
    techs.push('웹 + 모바일 앱 (크로스플랫폼 추천)');
  }

  if (techs.length > 0) {
    return `${text.trim()}\n\n[플랫폼: ${techs.join(', ')}]`;
  }
  return text.trim();
}

// ─── Step 6: 예산/일정 파싱 ───
function parseBudgetTimeline(text: string): string {
  const t = text.trim();
  const amounts: string[] = [];
  const periods: string[] = [];

  const moneyPatterns = [/(\d{1,3}[,.]?\d{0,3})\s*만\s*원/g, /(\d{1,3}[,.]?\d{0,3})\s*억/g, /(\d{1,4})\s*만/g];
  for (const p of moneyPatterns) {
    for (const m of t.matchAll(p)) amounts.push(m[0]);
  }

  const periodPatterns = [/(\d{1,2})\s*개월/g, /(\d{1,2})\s*주/g, /(\d{4})\s*년\s*(\d{1,2})\s*월/g];
  for (const p of periodPatterns) {
    for (const m of t.matchAll(p)) periods.push(m[0]);
  }

  const extras: string[] = [];
  if (amounts.length > 0) extras.push(`예산: ${amounts.join(' ~ ')}`);
  if (periods.length > 0) extras.push(`일정: ${periods.join(' ~ ')}`);

  return extras.length > 0 ? `${t}\n\n[${extras.join(' | ')}]` : t;
}

// ─── 전문가 피드백 생성 (GPT 대비 차별화 핵심) ───
function getExpertFeedback(step: number, answer: string): { message: string; quickReplies?: string[] } {
  const a = answer.trim();

  switch (step) {
    case 1: {
      const { projectType, typeInfo } = parseOverview(a);
      return {
        message: `**${typeInfo.type}** 프로젝트로 이해했습니다!\n\n위시켓에서 유사한 프로젝트를 많이 매칭했는데요, 보통 이런 유형은:\n\n▸ **평균 예산**: ${typeInfo.avgBudget}\n▸ **평균 기간**: ${typeInfo.avgDuration}\n▸ **핵심 기능**: ${typeInfo.keyFeatures.join(', ')}\n\n💡 **전문가 팁:** ${typeInfo.techTip}`,
      };
    }

    case 2: {
      const isB2B = a.includes('기업') || a.includes('B2B') || a.includes('업무');
      const isSenior = a.includes('시니어') || a.includes('어르신') || a.includes('50') || a.includes('60');
      const isYoung = a.includes('10대') || a.includes('20대') || a.includes('MZ') || a.includes('학생');

      let insight = '타겟 사용자 특성을 기반으로 UI/UX 방향을 제안드리겠습니다.';
      if (isB2B) insight = 'B2B 서비스는 관리자 대시보드와 권한 관리가 핵심입니다. 사용자 가이드/온보딩 도 필수로 포함하세요.';
      else if (isSenior) insight = '시니어 대상이면 최소 16px 폰트, 큰 터치 영역(48px+), 간결한 네비게이션이 필수입니다. 접근성(a11y)도 고려하세요.';
      else if (isYoung) insight = 'MZ세대 대상이면 빠른 로딩(3초 이내), 세련된 UI, 소셜 공유 기능이 핵심입니다. 앱 우선 전략이 유리합니다.';

      return {
        message: `타겟 사용자를 잘 파악하고 계시네요!\n\n💡 **위시켓 컨설팅:** ${insight}\n\n**참고:** 타겟 사용자의 기술 수준에 따라 개발 복잡도와 비용이 20~30% 차이날 수 있습니다.`,
      };
    }

    case 3: {
      const features = parseFeatures(a);
      const hasAuth = features.some(f => f.name.includes('로그인') || f.name.includes('회원'));
      const hasPayment = features.some(f => f.name.includes('결제') || f.name.includes('구매') || f.name.includes('주문'));
      const hasChat = features.some(f => f.name.includes('채팅') || f.name.includes('메시지'));

      let warnings: string[] = [];
      if (hasAuth && hasPayment) warnings.push('로그인+결제가 포함되면 PG 연동(2~3주)과 개인정보 처리방침이 필요합니다');
      if (hasChat) warnings.push('실시간 채팅은 WebSocket 인프라가 필요하여 서버 비용이 추가됩니다');
      if (features.length > 5) warnings.push(`${features.length}개 기능은 다소 많습니다. MVP에서는 P1 기능만으로 시작하는 것을 강력 추천합니다`);

      const featureList = features.map(f => `**${f.priority}** ${f.name}`).join('\n');
      const warningText = warnings.length > 0 ? `\n\n⚠️ **주의사항:**\n${warnings.map(w => `▸ ${w}`).join('\n')}` : '';

      return {
        message: `핵심 기능을 정리했습니다!\n\n${featureList}\n\n💡 **MVP 전략:** P1 기능만으로 먼저 출시하고, 실제 사용자 피드백을 받은 후 P2/P3를 추가하면 개발 비용을 40~60% 절감하면서도 시장 검증이 가능합니다.${warningText}`,
      };
    }

    case 4:
      if (a === '건너뛰기' || a.length < 3) {
        return {
          message: '건너뛸게요! 참고 서비스가 없어도 괜찮습니다.\n\n💡 **팁:** 나중에 개발사 미팅 시 경쟁 서비스 2~3개를 조사해서 "이 부분은 참고, 이 부분은 다르게"를 공유하면 소통 시간이 50% 이상 단축됩니다.',
        };
      }
      return {
        message: `좋은 벤치마크입니다!\n\n💡 **위시켓 컨설팅:** 참고 서비스를 공유할 때 아래 구조로 정리하면 개발사가 정확한 견적을 산출할 수 있습니다:\n\n▸ **참고할 부분**: 어떤 기능/디자인을 비슷하게 할 것인지\n▸ **차별화 포인트**: 어떤 부분을 다르게 할 것인지\n▸ **제외할 부분**: 필요 없는 기능은 무엇인지\n\n이 정보가 RFP에 포함되면 견적 정확도가 크게 올라갑니다.`,
      };

    case 5: {
      const isApp = a.includes('앱') || a.includes('모바일');
      const isWeb = a.includes('웹');
      const isBoth = a.includes('둘') || a.includes('다') || (isApp && isWeb);

      let techAdvice = '';
      if (isBoth) {
        techAdvice = '웹+앱 동시 개발을 원하시는군요!\n\n▸ **추천 방식 A** (비용 절감): React Native/Flutter 크로스플랫폼 → 하나의 코드베이스로 양쪽 커버\n▸ **추천 방식 B** (품질 우선): 웹을 먼저 반응형으로 개발 → 트래픽 검증 후 네이티브 앱 개발\n\n위시켓 데이터 기준, 방식 A가 B 대비 약 30~40% 비용 절감이 가능합니다.';
      } else if (isApp) {
        techAdvice = '모바일 앱을 선택하셨군요!\n\n▸ **네이티브** (Swift/Kotlin): 최고 성능, 단 iOS/Android 각각 개발 → 비용 2배\n▸ **크로스플랫폼** (Flutter/React Native): 하나의 코드로 양쪽 커버 → 비용 30~40% 절감\n\n💡 대부분의 외주 프로젝트에서는 크로스플랫폼이 가성비가 좋습니다.';
      } else {
        techAdvice = '웹 서비스를 선택하셨군요!\n\n▸ 반응형(Responsive)으로 설계하면 모바일 사용자까지 자연스럽게 커버됩니다\n▸ Next.js(React 기반)가 현재 가장 인기 있는 프레임워크입니다\n\n💡 나중에 앱이 필요해지면 PWA(프로그레시브 웹앱)로 저비용 전환이 가능합니다.';
      }

      return {
        message: `기술 요구사항을 확인했습니다!\n\n${techAdvice}\n\n**참고:** 특별한 기술 선호가 없다면 개발사의 주력 기술 스택을 존중하는 것이 품질 면에서 유리합니다.`,
      };
    }

    case 6: {
      const hasBudget = /\d/.test(a);
      const isUndecided = a.includes('미정') || a.includes('모르') || a.includes('아직');

      if (!hasBudget || isUndecided) {
        return {
          message: `예산이 아직 미정이시군요. 충분히 이해합니다!\n\n💡 **위시켓 추천 전략:**\n▸ 먼저 이 RFP로 최소 **3곳 이상** 개발사에 견적을 요청하세요\n▸ 위시켓에서는 프로젝트 등록 시 평균 5~8곳의 견적을 무료로 받을 수 있습니다\n▸ 견적 비교 시 "총 비용"뿐 아니라 "마일스톤별 산출물"을 반드시 확인하세요\n\n**참고 예산 범위** (유사 프로젝트 기준):\n▸ MVP(핵심 기능만): 1,500~3,000만원\n▸ 본격 서비스: 3,000~8,000만원\n▸ 대형 플랫폼: 8,000만~2억+`,
        };
      }

      return {
        message: `예산과 일정을 확인했습니다!\n\n💡 **위시켓 실전 팁:**\n▸ 예상 예산의 **15~20% 여유분**을 반드시 확보하세요 — 변경 요청은 100% 발생합니다\n▸ 전체 예산의 **10~15%**는 출시 후 버그 수정/개선에 예약해두는 것이 좋습니다\n▸ 결제는 **마일스톤별 분할 결제**(착수금 30% → 중간 40% → 완료 30%)를 추천합니다\n\n**주의:** 최저가 견적이 반드시 최선은 아닙니다. 포트폴리오와 커뮤니케이션 역량도 반드시 확인하세요.`,
      };
    }

    case 7:
      return {
        message: `모든 정보를 잘 정리했습니다! 🎉\n\n💡 **계약 전 필수 체크리스트:**\n▸ 소스코드 소유권이 귀사에 있는지 확인\n▸ 중간 마일스톤별 산출물 정의\n▸ 하자보수 기간(최소 3개월) 및 범위 합의\n▸ 추가 개발 시 단가 기준 사전 협의\n▸ 커뮤니케이션 주기(주 1~2회 리포트) 합의\n\n아래 버튼을 눌러 **전문 RFP 문서**를 완성하세요!`,
      };

    default:
      return { message: '감사합니다! 답변을 RFP에 반영했습니다.' };
  }
}

// ─── 메인 함수 ───
export function generateFallbackResponse(
  userMessage: string,
  currentStep: number
): FallbackResponse {
  const section = SECTION_MAP[currentStep];
  const nextStep = currentStep < 7 ? currentStep + 1 : null;
  const isComplete = currentStep >= 7;
  const isSkip = userMessage.trim() === '건너뛰기';

  // RFP 데이터 업데이트
  let rfpUpdate: FallbackResponse['rfpUpdate'] = null;

  if (!isSkip) {
    if (section === 'coreFeatures') {
      rfpUpdate = { section, value: parseFeatures(userMessage) };
    } else if (section === 'overview') {
      const { enhanced } = parseOverview(userMessage);
      rfpUpdate = { section, value: enhanced };
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

  // 전문가 피드백 + 다음 질문
  let message: string;
  let quickReplies: string[] | undefined;

  if (isComplete) {
    message = '모든 정보를 잘 정리했습니다! 🎉\n\n지금까지 답변해주신 내용으로 **전문 RFP 문서**를 생성합니다.\n위시켓 AI가 분석한 전문가 추천 사항도 포함됩니다.\n\n아래 버튼을 눌러 RFP를 완성하세요!';
  } else if (nextStep && nextStep <= 7) {
    const { message: feedback } = getExpertFeedback(currentStep, userMessage);
    const nextQuestion = STEPS[nextStep - 1];
    message = `${feedback}\n\n---\n\n**${nextQuestion.label}** ${nextStep}/7\n${nextQuestion.question}`;
    quickReplies = getQuickReplies(nextStep);
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

// ─── 빠른 응답 칩 ───
function getQuickReplies(step: number): string[] | undefined {
  switch (step) {
    case 2:
      return ['20~30대 직장인', '전 연령 일반 사용자', 'B2B 기업 고객', '10~20대 학생'];
    case 4:
      return ['건너뛰기', '직접 입력할게요'];
    case 5:
      return ['모바일 앱 (iOS/Android)', '웹사이트', '웹 + 앱 둘 다', '아직 미정'];
    case 6:
      return ['1,000~3,000만원', '3,000~5,000만원', '5,000만원 이상', '아직 미정'];
    case 7:
      return ['건너뛰기', '유지보수 필요', '보안 중요', '디자인 포함'];
    default:
      return undefined;
  }
}
