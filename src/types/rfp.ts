// AI RFP Builder — Type Definitions

export interface RFPData {
  overview: string;
  targetUsers: string;
  coreFeatures: FeatureItem[];
  referenceServices: string;
  techRequirements: string;
  budgetTimeline: string;
  additionalRequirements: string;
  aiRecommendation?: string;
}

export interface FeatureItem {
  name: string;
  description: string;
  priority: 'P1' | 'P2' | 'P3';
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  rfpUpdate?: Partial<RFPData>;
  step?: number;
}

export interface SessionData {
  id: string;
  email: string;
  messages: ChatMessage[];
  rfpData: RFPData;
  currentStep: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadData {
  email: string;
  name?: string;
  phone?: string;
  company?: string;
  sessionId: string;
  rfpId?: string;
}

export interface ConsultationRequest {
  leadId: string;
  rfpId: string;
  ctaType: 'consultation' | 'partner';
  preferredTime?: string;
  budgetRange?: string;
}

export const STEPS = [
  { id: 1, label: '프로젝트 개요', question: '어떤 서비스를 만들고 싶으신가요? 한 줄이면 충분합니다.' },
  { id: 2, label: '타겟 사용자', question: '이 서비스를 누가 사용하나요?' },
  { id: 3, label: '핵심 기능', question: '가장 중요한 기능 3가지는 무엇인가요?' },
  { id: 4, label: '참고 서비스', question: '비슷한 서비스나 벤치마크가 있나요?' },
  { id: 5, label: '기술 요구사항', question: '웹/앱/둘 다? 특별한 기술 요구사항이 있나요?' },
  { id: 6, label: '예산과 일정', question: '예산 범위와 원하는 완료 시점은?' },
  { id: 7, label: '추가 요구사항', question: '그 외 개발사에 전달할 사항이 있나요?' },
] as const;

export const REQUIRED_STEPS = [1, 3]; // 프로젝트 개요, 핵심 기능
export const RECOMMENDED_STEPS = [2, 4, 6]; // 타겟 사용자, 참고 서비스, 예산

export const emptyRFPData: RFPData = {
  overview: '',
  targetUsers: '',
  coreFeatures: [],
  referenceServices: '',
  techRequirements: '',
  budgetTimeline: '',
  additionalRequirements: '',
};
