// AI RFP Builder — Type Definitions v2 (Dynamic Conversation System)

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

// ─── Dynamic Conversation System ───

export type TopicId = 'overview' | 'targetUsers' | 'coreFeatures' | 'referenceServices' | 'techRequirements' | 'budgetTimeline' | 'additionalRequirements';

export interface Topic {
  id: TopicId;
  label: string;
  icon: string;
  required: boolean;
  description: string;
  stepNumber: number; // backward compat mapping
}

export const TOPICS: Topic[] = [
  { id: 'overview', label: '프로젝트 개요', icon: '📋', required: true, description: '어떤 서비스인지', stepNumber: 1 },
  { id: 'targetUsers', label: '타겟 사용자', icon: '👥', required: false, description: '누가 사용하는지', stepNumber: 2 },
  { id: 'coreFeatures', label: '핵심 기능', icon: '⚙️', required: true, description: '무엇을 만드는지', stepNumber: 3 },
  { id: 'referenceServices', label: '참고 서비스', icon: '🔍', required: false, description: '벤치마크', stepNumber: 4 },
  { id: 'techRequirements', label: '기술 요구사항', icon: '💻', required: false, description: '웹/앱/기술 스택', stepNumber: 5 },
  { id: 'budgetTimeline', label: '예산과 일정', icon: '💰', required: false, description: '비용과 기간', stepNumber: 6 },
  { id: 'additionalRequirements', label: '추가 요구사항', icon: '📝', required: false, description: '기타 전달사항', stepNumber: 7 },
];

export const STEP_TO_TOPIC: Record<number, TopicId> = {
  1: 'overview',
  2: 'targetUsers',
  3: 'coreFeatures',
  4: 'referenceServices',
  5: 'techRequirements',
  6: 'budgetTimeline',
  7: 'additionalRequirements',
};

export const TOPIC_TO_STEP: Record<TopicId, number> = {
  overview: 1,
  targetUsers: 2,
  coreFeatures: 3,
  referenceServices: 4,
  techRequirements: 5,
  budgetTimeline: 6,
  additionalRequirements: 7,
};

export function getTopicsCovered(rfpData: RFPData): TopicId[] {
  const covered: TopicId[] = [];
  if (rfpData.overview) covered.push('overview');
  if (rfpData.targetUsers) covered.push('targetUsers');
  if (rfpData.coreFeatures.length > 0) covered.push('coreFeatures');
  if (rfpData.referenceServices) covered.push('referenceServices');
  if (rfpData.techRequirements) covered.push('techRequirements');
  if (rfpData.budgetTimeline) covered.push('budgetTimeline');
  if (rfpData.additionalRequirements) covered.push('additionalRequirements');
  return covered;
}

export function calculateProgress(rfpData: RFPData): number {
  const covered = getTopicsCovered(rfpData);
  return Math.round((covered.length / TOPICS.length) * 100);
}

export function isReadyToComplete(rfpData: RFPData): boolean {
  const covered = getTopicsCovered(rfpData);
  const hasRequired = covered.includes('overview') && covered.includes('coreFeatures');
  return hasRequired && covered.length >= 3;
}

// ─── Legacy Exports (backward compat) ───

export const STEPS = [
  { id: 1, label: '프로젝트 개요', question: '어떤 서비스를 만들고 싶으신가요? 한 줄이면 충분합니다.' },
  { id: 2, label: '타겟 사용자', question: '이 서비스를 누가 사용하나요?' },
  { id: 3, label: '핵심 기능', question: '가장 중요한 기능 3가지는 무엇인가요?' },
  { id: 4, label: '참고 서비스', question: '비슷한 서비스나 벤치마크가 있나요?' },
  { id: 5, label: '기술 요구사항', question: '웹/앱/둘 다? 특별한 기술 요구사항이 있나요?' },
  { id: 6, label: '예산과 일정', question: '예산 범위와 원하는 완료 시점은?' },
  { id: 7, label: '추가 요구사항', question: '그 외 개발사에 전달할 사항이 있나요?' },
] as const;

export const REQUIRED_STEPS = [1, 3];
export const RECOMMENDED_STEPS = [2, 4, 6];

export const emptyRFPData: RFPData = {
  overview: '',
  targetUsers: '',
  coreFeatures: [],
  referenceServices: '',
  techRequirements: '',
  budgetTimeline: '',
  additionalRequirements: '',
};
