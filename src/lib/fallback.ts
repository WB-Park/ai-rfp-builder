// Fallback 모드: API 키 없이도 데모 동작
// PRD 8.1: AI 미응답 시 사전 정의된 질문으로 진행

import { STEPS } from 'A/types/rfp';

interface FallbackResponse {
  message: string;
  rfpUpdate: {
    section: string;
    value: string | { name: string; description: string; priority: string }[];
  } | null;
  nextAction: string;
  nextStep: number | null;
}

// 사용자 답변을 기반으로 RFP 섹션 매핑
const SECTION_MAP: Record<number, string> = {
  1: 'overview',
  2: 'targetUsers',
  3: 'coreFeatures',
  4: 'referenceServices',
  5: 'techRequirements',
  6: 'budgetTimeline',
  7: 'additionalRequirements',
};

function parseFeatures(text: string) {
  // 간단하게 줄바꿈 또는 쉼표로 기능 분리
  const items = text
    .split(/[,\n·•\-]/)
    .map(s => s.trim())
    .filter(Boolean);

  return items.slice(0, 5).map((name, i) => ({
    name,
    description: name,
    priority: i < 2 ? 'P1' : i < 4 ? 'P2' : 'P3',
  }));
}

export function generateFallbackResponse(
  userMessage: string,
  currentStep: number
): FallbackResponse {
  const section = SECTION_MAP[currentStep];
  const nextStep = currentStep < 7 ? currentStep + 1 : null;
  const isComplete = currentStep >= 7;

  // RFP 데이터 업데이트
  let rfpUpdate: FallbackResponse['rfpUpdate'] = null;

  if (userMessage.trim() !== "건너뛰기") {
    if (section === 'coreFeatures') {
      rfpUpdate = {
        section,
        value: parseFeatures(userMessage),
      };
    } else if (section) {
      rfpUpdate = {
        section,
        value: userMessage.trim(),
      };
    }
  }

  // 다음 짉문 생성
  let message: string;
  if (isComplete) {
    message = '모든 질문이 완료되었습니다! 🎉\n\n지금까지 답변해주신 내용으로 RFP를 생성합니다. 아래 버튼을 눌러주세요.';
  } else if (nextStep && nextStep <= 7) {
    const nextQuestion = STEPS[nextStep - 1];
    const encouragement = getEncouragement(currentStep, userMessage);
    message = `${encouragement}\n\n다음 질문입니다. ${nextQuestion.question}`;
  } else {
    message = '감사합니다! 답변 내용을 RFP에 반영했습니다.';
  }

  return {
    message,
    rfpUpdate,
    nextAction: isComplete ? 'complete' : 'continue',
    nextStep,
  };
}

function getEncouragement(step: number, answer: string): string {
  const responses = [
    `좋습니다! "${answer.slice(0, 30)}${answer.length > 30 ? '...' : ''}" 이해했습니다.`,
    '네, 잘 알겠습니다! RFP에 반영하겠습니다.',
    '아주 좋은 정보예요! 기획서에 잘 담겠습니다.',
    '명확하게 이해했습니다. 감사합니다!',
    '좋네요! 이 내용이 개발사에게 큰 도움이 될 거예요.',
  ];
  return responses[step % responses.length];
}
