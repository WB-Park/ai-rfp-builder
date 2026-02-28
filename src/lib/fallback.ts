// AI RFP Builder — Smart Fallback Engine v2
// PRD 8.1: API 키 없이도 전문가 수준 응답 제공
// 스마트 파싱 + 도메인 전문가 피드백 + 구조화된 데이터 추출

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

// ─── Step 1: 프로젝트 개요 파싱 ───
function parseOverview(text: string): { enhanced: string; projectType: string } {
  const t = text.trim();
  const keywords: Record<string, string> = {
    '앱': '모바일 앱',
    '어플': '모바일 앱',
    '웹': '웹 서비스',
    '사이트': '웹사이트',
    '플랫폼': '플랫폼',
    '쇼핑몰': '이커머스 플랫폼',
    '커머스': '이커머스 플랫폼',
    'SaaS': 'SaaS 서비스',
    'saas': 'SaaS 서비스',
    '관리': '관리 시스템',
    'ERP': 'ERP 시스템',
    'CRM': 'CRM 시스템',
    '매칭': '매칭 플랫폼',
    '배달': '배달/물류 서비스',
    '예약': '예약 서비스',
    'AI': 'AI 기반 서비스',
    '챗봇': 'AI 챗봇 서비스',
    'SNS': 'SNS/소셜 서비스',
    '소셜': '소셜 서비스',
    '교육': '에듀테크 서비스',
    '헬스': '헬스케어 서비스',
    '건강': '헬스케어 서비스',
    '금융': '핀테크 서비스',
    '핀테크': '핀테크 서비스',
    '부동산': '프롭테크 서비스',
    '물류': '물류/배송 서비스',
    '게임': '게임',
  };

  let projectType = '소프트웨어 서비스';
  for (const [key, val] of Object.entries(keywords)) {
    if (t.includes(key)) {
      projectType = val;
      break;
    }
  }

  // 짧은 답변 보강
  let enhanced = t;
  if (t.length < 30) {
    enhanced = `${t} — ${projectType} 개발 프로젝트`;
  }

  return { enhanced, projectType };
}

// ─── Step 2: 타겟 사용자 파싱 ───
function parseTargetUsers(text: string): string {
  const t = text.trim();
  const agePatterns = [
    /(\d{1,2})\s*[~\-대]\s*(\d{1,2})/,
    /(\d{1,2})대/,
  ];
  const segments: string[] = [];

  // 연령대 추출
  for (const p of agePatterns) {
    const m = t.match(p);
    if (m) {
      segments.push(`연령대: ${m[0]}`);
      break;
    }
  }

  // 직업/역할 키워드
  const roles = ['직장인', '학생', '주부', '프리랜서', '사업자', '소상공인', '기업', 'B2B', 'B2C', '개발자', '디자이너', '마케터', '의사', '환자', '보호자', '반려인', '운동', '헬스'];
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
  // 다양한 구분자로 분리
  let items = text
    .split(/[\n]/)
    .map(s => s.trim())
    .filter(Boolean);

  // 한 줄이면 쉼표/슬래시/중간점으로 재분리
  if (items.length === 1) {
    items = text
      .split(/[,，/·•\-]/)
      .map(s => s.trim())
      .filter(s => s.length > 1);
  }

  // 번호 제거 (1. 2. 3. or ① ② ③ etc.)
  items = items.map(s => s.replace(/^[\d①②③④⑤⑥⑦⑧⑨⑩]+[\.\)]\s*/, '').trim());

  // 기능별 설명 자동 생성
  const featureDescriptions: Record<string, string> = {
    '로그인': '이메일/소셜 로그인, 회원가입, 비밀번호 찾기 등 사용자 인증 시스템',
    '회원가입': '이메일 인증, 약관 동의, 프로필 설정 등 신규 회원 등록 프로세스',
    '결제': '신용카드, 간편결제(카카오페이/네이버페이 등) 연동 결제 시스템',
    '채팅': '실시간 1:1 및 그룹 메시징, 읽음 확인, 파일 첨부 기능',
    '알림': '푸시 알림, 인앱 알림, 이메일 알림 등 다채널 알림 시스템',
    '검색': '키워드 검색, 필터링, 자동완성 등 통합 검색 기능',
    '마이페이지': '프로필 관리, 활동 내역, 설정 등 개인화 페이지',
    '관리자': '사용자 관리, 콘텐츠 관리, 통계 대시보드 등 관리 기능',
    '대시보드': '핵심 지표 시각화, 실시간 모니터링, 리포트 생성 기능',
    '게시판': '글 작성/수정/삭제, 댓글, 좋아요 등 커뮤니티 기능',
    '지도': 'GPS 기반 위치 서비스, 지도 표시, 경로 안내 기능',
    '예약': '날짜/시간 선택, 예약 확인/취소, 리마인더 기능',
    '리뷰': '별점 평가, 텍스트/사진 리뷰, 리뷰 관리 기능',
    '장바구니': '상품 담기, 수량 변경, 옵션 선택 등 장바구니 기능',
    '주문': '주문 생성, 주문 내역 조회, 주문 상태 추적 기능',
    '추천': '사용자 행동 기반 개인화 추천 알고리즘',
    '피드': '타임라인 기반 콘텐츠 피드, 좋아요/댓글/공유 기능',
    '분석': '사용자 행동 분석, 통계 리포트, 데이터 시각화 기능',
    '배송': '배송지 관리, 배송 상태 추적, 운송장 조회 기능',
    '쿠폰': '쿠폰 발급/사용, 할인율 관리, 유효기간 설정 기능',
    '포인트': '포인트 적립/사용/소멸, 등급별 적립율 관리 기능',
  };

  return items.slice(0, 6).map((raw, i) => {
    const name = raw.length > 40 ? raw.slice(0, 40) : raw;

    // 매칭된 설명 찾기
    let description = '';
    for (const [keyword, desc] of Object.entries(featureDescriptions)) {
      if (raw.includes(keyword)) {
        description = desc;
        break;
      }
    }

    // 매칭 안 되면 기능명 기반으로 설명 생성
    if (!description) {
      if (raw.length > 20) {
        // 이미 충분히 설명이 포함된 경우
        description = raw;
      } else {
        description = `${raw} 관련 기능 구현 (세부 요구사항은 개발사와 협의 필요)`;
      }
    }

    return {
      name,
      description,
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
    techs.push('웹 + 모바일 앱 (크로스플랫폼)');
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

  // 금액 추출
  const moneyPatterns = [
    /(\d{1,3}[,.]?\d{0,3})\s*만\s*원/g,
    /(\d{1,3}[,.]?\d{0,3})\s*억/g,
    /(\d{1,4})\s*만/g,
  ];
  for (const p of moneyPatterns) {
    const matches = t.matchAll(p);
    for (const m of matches) amounts.push(m[0]);
  }

  // 기간 추출
  const periods: string[] = [];
  const periodPatterns = [
    /(\d{1,2})\s*개월/g,
    /(\d{1,2})\s*주/g,
    /(\d{4})\s*년\s*(\d{1,2})\s*월/g,
  ];
  for (const p of periodPatterns) {
    const matches = t.matchAll(p);
    for (const m of matches) periods.push(m[0]);
  }

  const extras: string[] = [];
  if (amounts.length > 0) extras.push(`예산: ${amounts.join(' ~ ')}`);
  if (periods.length > 0) extras.push(`일정: ${periods.join(' ~ ')}`);

  if (extras.length > 0) {
    return `${t}\n\n[${extras.join(' | ')}]`;
  }
  return t;
}

// ─── 전문가 피드백 생성 ───
function getExpertFeedback(step: number, answer: string, projectType?: string): { message: string; quickReplies?: string[] } {
  const a = answer.trim();

  switch (step) {
    case 1: {
      const { projectType: pType } = parseOverview(a);
      const tips: Record<string, string> = {
        '모바일 앱': '모바일 앱의 경우 iOS/Android 동시 개발 시 React Native나 Flutter 같은 크로스플랫폼 프레임워크를 고려하면 비용을 30~40% 절감할 수 있습니다.',
        '웹 서비스': '웹 서비스는 반응형으로 설계하면 모바일 사용자도 커버할 수 있어 초기 비용을 줄일 수 있습니다.',
        '이커머스 플랫폼': '이커머스의 경우 PG(결제 게이트웨이) 연동과 재고관리 시스템이 핵심입니다. 초기에는 카페24/쇼피파이 등 SaaS 솔루션 위에 커스텀 개발하는 방법도 있습니다.',
        '플랫폼': '플랫폼 비즈니스는 초기 공급자/수요자 양면을 모두 확보하는 것이 중요합니다. MVP에서는 한쪽에 집중하는 것을 추천합니다.',
        'SaaS 서비스': 'SaaS는 구독 모델, 멀티테넌시, 온보딩 플로우가 핵심입니다. 초기에는 단일 요금제로 시작하는 것을 추천합니다.',
        '헬스케어 서비스': '헬스케어 서비스는 개인정보보호법과 의료법 등 규제 준수가 중요합니다. 민감정보 처리 기준을 초기 설계에 반영해야 합니다.',
        '핀테크 서비스': '핀테크는 금융위 인허가, 본인인증(KYC), 자금세탁방지(AML) 등 규제 요건을 사전에 파악하는 것이 필수입니다.',
      };
      const tip = tips[pType] || `${pType} 프로젝트군요! 이 분야에서 성공하려면 차별화된 사용자 경험이 핵심입니다.`;

      return {
        message: `좋은 아이디어네요! **${pType}** 프로젝트로 이해했습니다.\n\n💡 ${tip}`,
        quickReplies: undefined,
      };
    }

    case 2:
      return {
        message: `타겟 사용자를 잘 파악하고 계시네요! 사용자 특성을 기반으로 UI/UX 방향을 잡을 수 있습니다.\n\n💡 **팁:** 타겟 사용자의 기술 수준에 따라 개발 복잡도가 달라집니다. 예를 들어, 시니어 대상이면 큰 글씨와 간결한 인터페이스가 필수입니다.`,
      };

    case 3: {
      const features = parseFeatures(a);
      const featureNames = features.map(f => f.name).join(', ');
      return {
        message: `핵심 기능을 정리했습니다!\n\n${features.map((f, i) => `**${f.priority}** ${f.name}`).join('\n')}\n\n💡 **전문가 팁:** P1 기능만으로 MVP를 먼저 출시하고, P2/P3는 사용자 피드백 후 추가하면 개발 리스크를 크게 줄일 수 있습니다.`,
      };
    }

    case 4:
      if (a === '건너뛰기' || a.length < 3) {
        return {
          message: '건너뛸게요! 참고 서비스가 없어도 괜찮습니다.\n\n💡 참고로, 나중에 개발사와 미팅할 때 벤치마크 서비스를 공유하면 소통이 훨씬 빨라집니다.',
        };
      }
      return {
        message: `좋은 벤치마크입니다! 참고 서비스가 있으면 개발사가 프로젝트 방향을 훨씬 빠르게 이해할 수 있습니다.\n\n💡 **팁:** 참고 서비스에서 "이것만은 꼭 따라하고 싶다"와 "이것은 다르게 하고 싶다"를 구분해두면 개발 견적이 더 정확해집니다.`,
      };

    case 5:
      return {
        message: `기술 요구사항을 확인했습니다!\n\n💡 **전문가 팁:** 특별한 기술 선호가 없다면 개발사의 기술 스택을 존중하는 것이 좋습니다. 다만 향후 유지보수를 위해 메이저 프레임워크(React, Flutter 등) 사용을 권장합니다.`,
        quickReplies: undefined,
      };

    case 6: {
      const hasBudget = /\d/.test(a);
      if (!hasBudget) {
        return {
          message: `예산 범위를 정하기 어려우시다면, 프로젝트 범위를 먼저 확정한 뒤 여러 개발사에서 견적을 받아보는 것을 추천합니다.\n\n💡 **참고:** 위시켓에서는 프로젝트 등록 시 최소 3개 이상의 개발사 견적을 무료로 받아볼 수 있습니다.`,
        };
      }
      return {
        message: `예산과 일정을 확인했습니다!\n\n💡 **전문가 팁:** 예상 예산에 10~20% 여유분을 확보해두세요. 개발 과정에서 추가 요구사항이 발생하는 것은 매우 일반적입니다.`,
      };
    }

    case 7:
      return {
        message: '모든 정보를 잘 정리했습니다! 🎉\n\n지금까지 답변해주신 내용으로 **전문 RFP 문서**를 생성합니다.\n아래 버튼을 눌러 RFP를 완성하세요!',
      };

    default:
      return { message: '답변 감사합니다! RFP에 반영했습니다.' };
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

  // RFP 데이터 업데이트 — 스마트 파싱
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
    message = '모든 정보를 잘 정리했습니다! 🎉\n\n지금까지 답변해주신 내용으로 **전문 RFP 문서**를 생성합니다.\n아래 버튼을 눌러 RFP를 완성하세요!';
  } else if (nextStep && nextStep <= 7) {
    const { message: feedback } = getExpertFeedback(currentStep, userMessage);
    const nextQuestion = STEPS[nextStep - 1];
    message = `${feedback}\n\n---\n\n**${nextQuestion.label}** ${nextStep}/7\n${nextQuestion.question}`;

    // 스텝별 빠른 응답 칩
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
      return ['20~30대 직장인', '전 연령 일반 사용자', 'B2B 기업 고객'];
    case 4:
      return ['건너뛰기', '직접 입력할게요'];
    case 5:
      return ['모바일 앱 (iOS/Android)', '웹사이트', '웹 + 앱 둘 다'];
    case 6:
      return ['1,000~3,000만원', '3,000~5,000만원', '5,000만원 이상', '아직 미정'];
    case 7:
      return ['건너뛰기', '유지보수 필요', '보안 중요'];
    default:
      return undefined;
  }
}
