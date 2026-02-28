'use client';

// AI RFP Builder — Chat Interface v8 (Dynamic Conversation)
// 동적 질문 시스템: 토픽 기반 프로그레스, 맥락 인지 질문 순서
// 고정 X/7 → 토픽 커버리지 기반 프로그레스

import { useState, useRef, useEffect, useCallback } from 'react';
import { RFPData, emptyRFPData, TOPICS, TopicId, getTopicsCovered, isReadyToComplete } from '@/types/rfp';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface ChatInterfaceProps {
  onComplete: (rfpData: RFPData) => void;
  email: string;
  sessionId?: string;
}

// 마크다운 → HTML
function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/---/g, '<hr style="border:none;border-top:1px solid var(--border-default);margin:16px 0;"/>')
    .replace(/💡/g, '<span style="display:inline-block;margin-right:4px">💡</span>')
    .replace(/\n/g, '<br/>');
}

// 시간 포맷
function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? '오후' : '오전';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${ampm} ${hour}:${m}`;
}

// 분석 중 메시지 (컨텍스트별)
const THINKING_MESSAGES = [
  '프로젝트를 분석하고 있어요...',
  '위시켓 데이터를 조회하고 있어요...',
  '최적의 답변을 준비하고 있어요...',
  '유사 프로젝트 사례를 검색하고 있어요...',
];

export default function ChatInterface({ onComplete, email, sessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: email.startsWith('guest@')
        ? `안녕하세요! 위시켓 AI RFP Builder입니다.\n\n소프트웨어 외주 기획서(RFP)를 함께 작성해볼까요? 대화하듯 답변해주시면 **AI가 맞춤형 질문**을 이어갑니다.\n\n💡 이메일을 등록하시면 완성된 기획서를 PDF로 받아보실 수 있습니다.\n\n첫 번째 질문입니다.\n**어떤 서비스를 만들고 싶으신가요?** 한 줄이면 충분해요.`
        : `안녕하세요! **${email.split('@')[0]}**님, 위시켓 AI RFP Builder입니다.\n\n대화하듯 답변해주시면 **AI가 맞춤형 질문**을 이어갑니다. 핵심 정보만 수집하면 바로 완성할 수 있어요.\n\n첫 번째 질문입니다.\n**어떤 서비스를 만들고 싶으신가요?** 한 줄이면 충분해요.`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [rfpData, setRfpData] = useState<RFPData>(emptyRFPData);
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [thinkingLabel, setThinkingLabel] = useState('');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  // 동적 토픽 추적
  const [topicsCovered, setTopicsCovered] = useState<TopicId[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [canComplete, setCanComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 모바일 감지
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 스크롤 투 바텀
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 스크롤 위치 감지
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // textarea 자동 높이
  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  // Supabase 세션 저장
  const saveSession = useCallback(async (
    updatedRfpData: RFPData,
    updatedMessages: ChatMessage[],
    step: number,
    completed: boolean
  ) => {
    if (!sessionId) return;
    try {
      await fetch('/api/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          rfpData: updatedRfpData,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          currentStep: step,
          completed,
        }),
      });
    } catch (err) {
      console.error('Session save failed:', err);
    }
  }, [sessionId]);

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || loading) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user' as const, content: userMessage, timestamp: Date.now() }];
    setMessages(newMessages);
    setLoading(true);
    setQuickReplies([]);
    setThinkingLabel(THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          currentStep,
          rfpData,
        }),
      });

      const data = await res.json();

      let updatedRfpData = rfpData;
      let updatedStep = currentStep;
      let completed = false;

      if (data.rfpUpdate) {
        updatedRfpData = { ...rfpData };
        const { section, value } = data.rfpUpdate;
        if (section && value !== undefined) {
          if (section === 'coreFeatures' && Array.isArray(value)) {
            updatedRfpData.coreFeatures = value;
          } else if (section in updatedRfpData) {
            (updatedRfpData as unknown as Record<string, unknown>)[section] = value;
          }
        }
        setRfpData(updatedRfpData);
      }

      // 동적 스텝 업데이트
      if (data.nextStep) {
        updatedStep = data.nextStep;
        setCurrentStep(data.nextStep);
      } else if (data.nextAction !== 'clarify') {
        updatedStep = Math.min(currentStep + 1, 8);
        setCurrentStep(updatedStep);
      }

      // 토픽 커버리지 업데이트
      if (data.topicsCovered && Array.isArray(data.topicsCovered)) {
        setTopicsCovered(data.topicsCovered);
      } else {
        // 수동 계산
        const covered = getTopicsCovered(updatedRfpData);
        setTopicsCovered(covered);
      }

      // 프로그레스 업데이트
      if (data.progress !== undefined) {
        setProgressPercent(data.progress);
      } else {
        const covered = getTopicsCovered(updatedRfpData);
        setProgressPercent(Math.round((covered.length / TOPICS.length) * 100));
      }

      // 완료 가능 여부
      if (data.canComplete !== undefined) {
        setCanComplete(data.canComplete);
      } else {
        setCanComplete(isReadyToComplete(updatedRfpData));
      }

      if (data.nextAction === 'complete') {
        completed = true;
        setIsComplete(true);
      }

      // 서버에서 thinkingLabel이 오면 사용
      if (data.thinkingLabel) {
        setThinkingLabel(data.thinkingLabel);
      }

      const finalMessages: ChatMessage[] = [
        ...newMessages,
        { role: 'assistant' as const, content: data.message, timestamp: Date.now() }
      ];
      setMessages(finalMessages);

      if (data.quickReplies && data.quickReplies.length > 0) {
        setQuickReplies(data.quickReplies);
      }

      saveSession(updatedRfpData, finalMessages, updatedStep, completed);

    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
      setThinkingLabel('');
      inputRef.current?.focus();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    await sendMessage(msg);
  };

  const handleQuickReply = async (text: string) => {
    if (loading) return;
    setInput('');
    await sendMessage(text);
  };

  const handleSkip = () => {
    // 필수 토픽(overview, coreFeatures)은 건너뛸 수 없음
    const currentTopicId = TOPICS.find(t => t.stepNumber === currentStep)?.id;
    if (currentTopicId === 'overview' || currentTopicId === 'coreFeatures') return;
    sendMessage('건너뛰기');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 현재 토픽 라벨
  const currentTopic = TOPICS.find(t => t.stepNumber === currentStep);
  const currentTopicLabel = currentTopic ? `${currentTopic.icon} ${currentTopic.label}` : 'RFP 작성';
  const canSkipCurrent = currentTopic ? !currentTopic.required : false;

  // 커버된 토픽 수 / 전체
  const coveredCount = topicsCovered.length;
  const totalTopics = TOPICS.length;

  // 모바일에서 RFP 프리뷰 패널
  const previewPanel = (
    <div style={{
      width: isMobile ? '100%' : '50%',
      background: 'var(--surface-1)',
      overflowY: 'auto',
      ...(isMobile ? {
        position: 'fixed' as const,
        top: 0,
        left: showPreview ? 0 : '100%',
        right: 0,
        bottom: 0,
        zIndex: 50,
        transition: 'left 0.3s ease-out',
      } : {}),
    }}>
      {/* 모바일 닫기 버튼 */}
      {isMobile && (
        <div style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-default)',
          background: 'var(--surface-0)',
          position: 'sticky' as const,
          top: 0,
          zIndex: 2,
        }}>
          <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>RFP 미리보기</span>
          <button
            onClick={() => setShowPreview(false)}
            style={{
              background: 'none', border: 'none', fontSize: 20,
              color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>
      )}
      <div style={{ padding: isMobile ? '16px' : 'var(--space-xl)' }}>
        <div style={{
          background: 'var(--surface-0)',
          borderRadius: 'var(--card-radius)',
          padding: isMobile ? '16px' : 'var(--space-xl)',
          boxShadow: 'var(--shadow-sm)',
          minHeight: isMobile ? 'auto' : 'calc(100vh - 64px)',
        }}>
          {!isMobile && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 'var(--space-xl)',
              paddingBottom: 'var(--space-md)',
              borderBottom: '1px solid var(--border-default)',
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 'var(--letter-tight)' }}>
                RFP 미리보기
              </h2>
              <span style={{
                fontSize: 12, color: 'var(--text-quaternary)',
                background: 'var(--surface-2)', padding: '4px 10px',
                borderRadius: 'var(--radius-full)', fontWeight: 500,
              }}>
                실시간 업데이트
              </span>
            </div>
          )}

          {/* 토픽 커버리지 칩 */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 'var(--space-lg)',
          }}>
            {TOPICS.map(topic => {
              const isCovered = topicsCovered.includes(topic.id);
              return (
                <span key={topic.id} style={{
                  fontSize: 11, fontWeight: 500,
                  padding: '4px 10px', borderRadius: 'var(--radius-full)',
                  background: isCovered ? 'rgba(var(--color-primary-rgb), 0.08)' : 'var(--surface-2)',
                  color: isCovered ? 'var(--color-primary)' : 'var(--text-quaternary)',
                  border: `1px solid ${isCovered ? 'rgba(var(--color-primary-rgb), 0.2)' : 'transparent'}`,
                  transition: 'all 0.3s ease',
                }}>
                  {isCovered ? '✓' : ''} {topic.icon} {topic.label}
                </span>
              );
            })}
          </div>

          {rfpData.overview ? (
            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
              <RFPSection title="프로젝트 개요" icon="📋" content={rfpData.overview} />
              {rfpData.targetUsers && <RFPSection title="타겟 사용자" icon="👥" content={rfpData.targetUsers} />}
              {rfpData.coreFeatures.length > 0 && (
                <div>
                  <SectionLabel title="핵심 기능" icon="⚙️" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                    {rfpData.coreFeatures.map((f, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)',
                        padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--surface-1)',
                      }}>
                        <span className={`chip-${f.priority.toLowerCase()}`} style={{ flexShrink: 0, marginTop: 2 }}>{f.priority}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', display: 'block' }}>{f.name}</span>
                          {f.description && f.description !== f.name && (
                            <span style={{ color: 'var(--text-tertiary)', fontSize: 13, lineHeight: 1.5, display: 'block', marginTop: 4 }}>{f.description}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {rfpData.referenceServices && <RFPSection title="참고 서비스" icon="🔍" content={rfpData.referenceServices} />}
              {rfpData.techRequirements && <RFPSection title="기술 요구사항" icon="💻" content={rfpData.techRequirements} />}
              {rfpData.budgetTimeline && <RFPSection title="예산 및 일정" icon="💰" content={rfpData.budgetTimeline} />}
              {rfpData.additionalRequirements && <RFPSection title="추가 요구사항" icon="📝" content={rfpData.additionalRequirements} />}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: isMobile ? 'var(--space-xl)' : 'var(--space-4xl) var(--space-lg)' }}>
              <div style={{ fontSize: 48, marginBottom: 'var(--space-md)', opacity: 0.3, animation: 'float 3s ease-in-out infinite' }}>
                📝
              </div>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
                아직 작성된 내용이 없어요
              </p>
              <p style={{ fontSize: 14, color: 'var(--text-quaternary)' }}>
                AI와 대화하면 여기에 RFP가 실시간으로 채워집니다
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--surface-0)' }}>
      {/* Left: Chat Panel */}
      <div style={{
        width: isMobile ? '100%' : '50%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: isMobile ? 'none' : '1px solid var(--border-default)',
      }}>
        {/* Header */}
        <div className="glass-header" style={{ padding: isMobile ? '12px 16px' : '16px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isComplete ? 'var(--color-success)' : canComplete ? '#F59E0B' : 'var(--color-primary)',
                boxShadow: isComplete
                  ? '0 0 8px rgba(52, 199, 89, 0.4)'
                  : canComplete
                  ? '0 0 8px rgba(245, 158, 11, 0.4)'
                  : '0 0 8px rgba(var(--color-primary-rgb), 0.4)',
              }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {isComplete ? 'RFP 완성 준비' : currentTopicLabel}
              </span>
              {canComplete && !isComplete && (
                <span className="animate-fade-in" style={{
                  fontSize: 11, color: '#F59E0B',
                  fontWeight: 500, marginLeft: 4,
                  padding: '2px 8px', borderRadius: 'var(--radius-full)',
                  background: 'rgba(245, 158, 11, 0.08)',
                }}>
                  완성 가능
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* 모바일: RFP 미리보기 버튼 */}
              {isMobile && rfpData.overview && (
                <button
                  onClick={() => setShowPreview(true)}
                  style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--color-primary)',
                    background: 'var(--color-primary-alpha)', border: 'none',
                    padding: '4px 12px', borderRadius: 'var(--radius-full)',
                    cursor: 'pointer',
                  }}
                >
                  미리보기
                </button>
              )}
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                {coveredCount}/{totalTopics} 토픽
              </span>
            </div>
          </div>

          {/* Progress bar — 토픽 커버리지 기반 */}
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{
              width: `${progressPercent}%`,
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>

          {/* 토픽 인디케이터 */}
          <div style={{
            display: 'flex', gap: 4, marginTop: 8, overflowX: 'auto',
            scrollbarWidth: 'none',
          }}>
            {TOPICS.map(topic => {
              const isCovered = topicsCovered.includes(topic.id);
              const isCurrent = topic.stepNumber === currentStep;
              return (
                <span key={topic.id} style={{
                  fontSize: 11, whiteSpace: 'nowrap',
                  padding: '3px 8px', borderRadius: 'var(--radius-full)',
                  background: isCurrent ? 'var(--color-primary)' : isCovered ? 'rgba(var(--color-primary-rgb), 0.08)' : 'var(--surface-2)',
                  color: isCurrent ? 'white' : isCovered ? 'var(--color-primary)' : 'var(--text-quaternary)',
                  fontWeight: isCurrent ? 600 : 400,
                  transition: 'all 0.3s ease',
                  flexShrink: 0,
                }}>
                  {isCovered && !isCurrent ? '✓ ' : ''}{topic.icon}
                </span>
              );
            })}
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isMobile ? '16px' : '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)',
            scrollBehavior: 'smooth',
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                animationDelay: `${i * 0.05}s`,
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{
                  width: 32, height: 32,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-primary-alpha)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginRight: 'var(--space-sm)', flexShrink: 0, marginTop: 2,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
              )}
              <div style={{ maxWidth: msg.role === 'user' ? '80%' : '85%' }}>
                <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
                  {msg.role === 'assistant' ? (
                    <div
                      style={{ margin: 0, lineHeight: 1.7 }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  ) : (
                    <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
                  )}
                </div>
                {/* 타임스탬프 */}
                {msg.timestamp && (
                  <div style={{
                    fontSize: 11,
                    color: 'var(--text-quaternary)',
                    marginTop: 4,
                    textAlign: msg.role === 'user' ? 'right' : 'left',
                    paddingLeft: msg.role === 'assistant' ? 4 : 0,
                    paddingRight: msg.role === 'user' ? 4 : 0,
                  }}>
                    {formatTime(msg.timestamp)}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* AI 분석 중 표시 */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
              <div style={{
                width: 32, height: 32,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-primary-alpha)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="chat-bubble-assistant animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                  {thinkingLabel && (
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                      {thinkingLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 스크롤 투 바텀 버튼 */}
        {showScrollBtn && (
          <button
            onClick={scrollToBottom}
            style={{
              position: 'absolute',
              bottom: isMobile ? 170 : 140,
              left: isMobile ? '50%' : '25%',
              transform: 'translateX(-50%)',
              width: 36, height: 36,
              borderRadius: '50%',
              background: 'var(--surface-0)',
              border: '1px solid var(--border-strong)',
              boxShadow: 'var(--shadow-md)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 5,
              transition: 'all var(--duration-fast)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}

        {/* Quick Reply Chips */}
        {quickReplies.length > 0 && !loading && !isComplete && (
          <div style={{
            padding: isMobile ? '8px 16px' : '8px 24px',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            borderTop: '1px solid var(--border-default)',
            background: 'var(--surface-1)',
          }}>
            {quickReplies.map((reply, i) => {
              const isRfpGenerate = reply === '바로 RFP 생성하기';
              return (
                <button
                  key={i}
                  onClick={() => handleQuickReply(reply)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-full)',
                    border: isRfpGenerate ? 'none' : '1.5px solid var(--color-primary)',
                    background: isRfpGenerate ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))' : 'var(--surface-0)',
                    color: isRfpGenerate ? 'white' : 'var(--color-primary)',
                    fontSize: 13,
                    fontWeight: isRfpGenerate ? 600 : 500,
                    fontFamily: 'var(--font-kr)',
                    cursor: 'pointer',
                    transition: 'all var(--duration-fast) var(--ease-out)',
                    whiteSpace: 'nowrap',
                    boxShadow: isRfpGenerate ? '0 2px 8px rgba(var(--color-primary-rgb), 0.3)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isRfpGenerate) {
                      e.currentTarget.style.background = 'var(--color-primary)';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isRfpGenerate) {
                      e.currentTarget.style.background = 'var(--surface-0)';
                      e.currentTarget.style.color = 'var(--color-primary)';
                    }
                  }}
                >
                  {isRfpGenerate ? '✨ ' : ''}{reply}
                </button>
              );
            })}
          </div>
        )}

        {/* Input Area */}
        <div style={{
          padding: isMobile ? '12px 16px' : '16px 24px',
          borderTop: '1px solid var(--border-default)',
          background: 'var(--surface-0)',
        }}>
          {isComplete ? (
            <button
              onClick={() => onComplete(rfpData)}
              className="animate-bounce-in"
              style={{
                width: '100%',
                height: 'var(--btn-height)',
                borderRadius: 'var(--btn-radius)',
                border: 'none',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                color: 'white',
                fontWeight: 600,
                fontSize: 16,
                fontFamily: 'var(--font-kr)',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(var(--color-primary-rgb), 0.3)',
                transition: 'all var(--duration-normal) var(--ease-out)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(var(--color-primary-rgb), 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(var(--color-primary-rgb), 0.3)';
              }}
            >
              PRD 기획서 완성하기
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    adjustTextareaHeight();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="답변을 입력하세요..."
                  rows={1}
                  disabled={loading}
                  style={{
                    width: '100%',
                    minHeight: 48,
                    maxHeight: 120,
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-strong)',
                    outline: 'none',
                    resize: 'none',
                    fontSize: 15,
                    fontFamily: 'var(--font-kr)',
                    color: 'var(--text-primary)',
                    background: 'var(--surface-0)',
                    transition: 'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-alpha)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  style={{
                    width: 48, height: 48,
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: input.trim() ? 'var(--color-primary)' : 'var(--surface-2)',
                    color: input.trim() ? 'white' : 'var(--text-quaternary)',
                    cursor: loading || !input.trim() ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all var(--duration-fast) var(--ease-out)',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
                {canSkipCurrent && !isComplete && (
                  <button
                    onClick={handleSkip}
                    disabled={loading}
                    style={{
                      background: 'none', border: 'none',
                      fontSize: 12, color: 'var(--text-quaternary)',
                      cursor: 'pointer', padding: '4px',
                      transition: 'color var(--duration-fast)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-quaternary)'; }}
                  >
                    건너뛰기
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: RFP Preview Panel */}
      {!isMobile && previewPanel}
      {isMobile && previewPanel}
    </div>
  );
}

/* Sub-components */
function SectionLabel({ title, icon }: { title: string; icon: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
      <span style={{
        width: 24, height: 24, borderRadius: 'var(--radius-sm)',
        background: 'var(--color-primary-alpha)', color: 'var(--color-primary)',
        fontSize: 13,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </span>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
    </div>
  );
}

function RFPSection({ title, icon, content }: { title: string; icon: string; content: string }) {
  return (
    <div>
      <SectionLabel title={title} icon={icon} />
      <p style={{
        font: 'var(--text-body)',
        color: 'var(--text-secondary)',
        marginTop: 'var(--space-sm)',
        paddingLeft: 'calc(24px + var(--space-sm))',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.6,
      }}>
        {content}
      </p>
    </div>
  );
}
