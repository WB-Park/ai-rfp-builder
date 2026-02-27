'use client';

// PRD 화면 2: RFP 작성 (Split View)
// AIDP B2C DNA — Glassmorphism header, chat bubbles, micro-interactions
// + 세션 데이터 Supabase 실시간 저장

import { useState, useRef, useEffect, useCallback } from 'react';
import { STEPS, RFPData, emptyRFPData, REQUIRED_STEPS } from '@/types/rfp';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  onComplete: (rfpData: RFPData) => void;
  email: string;
  sessionId?: string;
}

export default function ChatInterface({ onComplete, email, sessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `안녕하세요! ${email.split('@')[0]}님, 위시켓 AI RFP Builder입니다.\n\n소프트웨어 외주 프로젝트 기획서(RFP)를 함께 작성해볼까요? 7가지 질문에 답해주시면 5분 안에 완성됩니다.\n\n첫 번째 질문입니다. 어떤 서비스를 만들고 싶으신가요? 한 줄이면 충분합니다.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [rfpData, setRfpData] = useState<RFPData>(emptyRFPData);
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 세션 데이터를 Supabase에 저장 (fire-and-forget)
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
      console.error('Session save failed (non-blocking):', err);
    }
  }, [sessionId]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');

    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
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

      if (data.nextStep) {
        updatedStep = data.nextStep;
        setCurrentStep(data.nextStep);
      } else if (data.nextAction !== 'clarify') {
        updatedStep = Math.min(currentStep + 1, 8);
        setCurrentStep(updatedStep);
      }

      if (data.nextAction === 'complete' || currentStep >= 7) {
        completed = true;
        setIsComplete(true);
      }

      const finalMessages = [...newMessages, { role: 'assistant' as const, content: data.message }];
      setMessages(finalMessages);

      // Supabase에 세션 데이터 저장 (non-blocking)
      saveSession(updatedRfpData, finalMessages, updatedStep, completed);

    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.',
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSkip = () => {
    if (REQUIRED_STEPS.includes(currentStep as 1 | 3)) return;
    setInput('건너뛰기');
    setTimeout(() => handleSend(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const progressPercent = Math.min((currentStep / 7) * 100, 100);
  const stepsRemaining = Math.max(7 - currentStep + 1, 0);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--surface-0)' }}>
      {/* Left: Chat Panel */}
      <div style={{
        width: '50%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-default)'
      }}>
        {/* Glassmorphism Header */}
        <div className="glass-header" style={{ padding: '16px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isComplete ? 'var(--color-success)' : 'var(--color-primary)',
                boxShadow: isComplete
                  ? '0 0 8px rgba(52, 199, 89, 0.4)'
                  : '0 0 8px rgba(var(--color-primary-rgb), 0.4)',
              }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {currentStep <= 7 ? STEPS[currentStep - 1]?.label : 'RFP 완성'}
              </span>
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
              {Math.min(currentStep, 7)}/7
            </span>
          </div>

          {/* Progress bar */}
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${progressPercent}%` }} />
          </div>

          {stepsRemaining > 0 && stepsRemaining <= 3 && currentStep <= 7 && (
            <p className="animate-fade-in" style={{ fontSize: 12, color: 'var(--color-primary)', marginTop: 6, fontWeight: 500 }}>
              {stepsRemaining}개 질문만 더!
            </p>
          )}
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)'
        }}>
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
              <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
              </div>
            </div>
          ))}

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
                <div style={{ display: 'flex', gap: 6, padding: '4px 0' }}>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          padding: '16px 24px',
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
              RFP 완성하기
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
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
                {!REQUIRED_STEPS.includes(currentStep as 1 | 3) && currentStep <= 7 && (
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
      <div style={{ width: '50%', background: 'var(--surface-1)', overflowY: 'auto' }}>
        <div style={{ padding: 'var(--space-xl)' }}>
          <div style={{
            background: 'var(--surface-0)',
            borderRadius: 'var(--card-radius)',
            padding: 'var(--space-xl)',
            boxShadow: 'var(--shadow-sm)',
            minHeight: 'calc(100vh - 64px)',
          }}>
            {/* Header */}
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

            {rfpData.overview ? (
              <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                <RFPSection number={1} title="프로젝트 개요" content={rfpData.overview} />
                {rfpData.targetUsers && <RFPSection number={2} title="타겟 사용자" content={rfpData.targetUsers} />}
                {rfpData.coreFeatures.length > 0 && (
                  <div>
                    <SectionLabel number={3} title="핵심 기능" />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                      {rfpData.coreFeatures.map((f, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                          padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--surface-1)',
                        }}>
                          <span className={`chip-${f.priority.toLowerCase()}`}>{f.priority}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{f.name}</span>
                            <span style={{ color: 'var(--text-tertiary)', fontSize: 13, marginLeft: 8 }}>{f.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {rfpData.referenceServices && <RFPSection number={4} title="참고 서비스" content={rfpData.referenceServices} />}
                {rfpData.techRequirements && <RFPSection number={5} title="기술 요구사항" content={rfpData.techRequirements} />}
                {rfpData.budgetTimeline && <RFPSection number={6} title="예산 및 일정" content={rfpData.budgetTimeline} />}
                {rfpData.additionalRequirements && <RFPSection number={7} title="추가 요구사항" content={rfpData.additionalRequirements} />}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-4xl) var(--space-lg)' }}>
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
    </div>
  );
}

/* Sub-components */
function SectionLabel({ number, title }: { number: number; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
      <span style={{
        width: 24, height: 24, borderRadius: '50%',
        background: 'var(--color-primary-alpha)', color: 'var(--color-primary)',
        fontSize: 12, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {number}
      </span>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
    </div>
  );
}

function RFPSection({ number, title, content }: { number: number; title: string; content: string }) {
  return (
    <div>
      <SectionLabel number={number} title={title} />
      <p style={{
        font: 'var(--text-body)',
        color: 'var(--text-secondary)',
        marginTop: 'var(--space-sm)',
        paddingLeft: 'calc(24px + var(--space-sm))',
      }}>
        {content}
      </p>
    </div>
  );
}
