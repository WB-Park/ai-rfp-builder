'use client';
// PRD 화면 2: RFP 작성 (Split View)
// AIDP B2C DNA — Glassmorphism header, chat bubbles, micro-interactions
import { useState, useRef, useEffect } from 'react';
import { STEPS, RFPData, emptyRFPData, REQUIRED_STEPS } from '@/types/rfp';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  onComplete: (rfpData: RFPData) => void;
  email: string;
}

export default function ChatInterface({ onComplete, email }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `안녕하세요! ${email.split('@')[0]}님, 위시켓 AI RFP Builder입니다.\n\n소프트웨어 외주 프로젝트 기획서(RFP)를 함께 작성해볼까요? 7가지 질문에 답해주시면 5분 안에 완성됩니다.\n\n첫 번째 질문입니다. 어떤 서비스를 만들고 싶으신가요? 한 줄이면 충분합니다.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [rfpData, setRfpData] = useState<RFPData>(emptyRFPData);
  const [loading, setLoadingd] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }].map(m => (
            {
              role: m.role,
              content: m.content,
            })),
          currentStep,
          rfpData,
        }),
      });

      const data = await res.json();

      if (data.rfpUpdate) {
        setRfpData(prev => {
          const updated = { ...prev };
          const { section, value } = data.rfpUpdate;
          if (section && value !== undefined) {
            if (section === 'coreFeatures' && Array.isArray(value)) {
              updated.coreFeatures = value;
            } else if (section in updated) {
              (updated as Record<string, unknown>)[section] = value;
            }
          }
          return updated;
        });
      }

      if (data.nextStep) {
        setCurrentStep(data.nextStep);
      } else if (data.nextAction !== 'clarify') {
        setCurrentStep(prev => Math.min+prev + 1, 8));
      }

      if (data.nextAction === 'complete' || currentStep >= 7) {
        setIsComplete(true);
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '톪 일삋�� 친근하고 전문적인 톤. 기돤신‍니다. 닥변을 입력해주세요.',
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
      {/* ━━ Left: Chat Panel ━━ */}
      <div style={{ width: '50%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-default)' }}>
        {/* Glassmorphism Header */}
        <div className="glass-header" style={{ padding: '16px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isComplete ? 'var(--color-success)' : 'var(--color-primary)',
                boxShadow: isComplete ? '0 0 8px rgba(52, 199, 89, 0.4)' : '0 0 8px rgba(var(--color-primary-rgb), 0.4)',
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', fontSize: 15, fontFamily: 'var(--font-kr)' }}>
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
                  width: 32, height: 32, borderRadius: 'var(--radius-sm)',
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
        </div>
        {/* Input Area */}
        <div></div>
      </div>
    </div>
  );
}
