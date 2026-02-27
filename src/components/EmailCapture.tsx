'use client';

// PRD 화면 2.5: 이메일 수집 (서비스 시작 전)
// AIDP B2C DNA — 풀스크린, gradient mesh, 마이크로인터랭션

import { useState } from 'react';

interface EmailCaptureProps {
  onSubmit: (email: string, sessionId?: string) => void;
}

export default function EmailCapture({ onSubmit }: EmailCaptureProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('유효한 이메일을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, step: 'email' }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        onSubmit(email, data.sessionId);
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mesh" style={{ background: 'var(--surface-1)' }}>
      <div className="animate-fade-in-up" style={{ maxWidth: 420, width: '100%', padding: '0 var(--page-padding-mobile)' }}>
        {/* Card */}
        <div style={{
          background: 'var(--surface-0)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-2xl) var(--space-xl)',
          boxShadow: 'var(--shadow-lg)',
        }}>
          {/* Badge */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
            <span className="badge" style={{ marginBottom: 'var(--space-md)', display: 'inline-flex' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
              위시켓이 만든 외주 전문 AI
            </span>
          </div>

          {/* Hero text */}
          <h1 style={{
            font: 'var(--text-title)',
            letterSpacing: 'var(--letter-tight)',
            color: 'var(--text-primary)',
            textAlign: 'center',
            marginBottom: 'var(--space-sm)',
          }}>
            AI가 무료로 RFP를<br />작성해드립니다
          </h1>

          <p style={{
            font: 'var(--text-body)',
            color: 'var(--text-tertiary)',
            textAlign: 'center',
            marginBottom: 'var(--space-xl)',
          }}>
            5분이메 개발사에 바로 전달할 수 있는<br />기획서가 완성됩니다
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <div style={{
                position: 'relative',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${focused ? 'var(--color-primary)' : error ? 'var(--color-error)' : 'var(--border-strong)'}`,
                boxShadow: focused ? '0 0 0 3px var(--color-primary-alpha)' : 'none',
                transition: 'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
              }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="이메일을 입력하세요"
                  autoFocus
                  style={{
                    width: '100%',
                    height: 48,
                    padding: '0 var(--space-md)',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    outline: 'none',
                    fontSize: 15,
                    fontFamily: 'var(--font-kr)',
                    color: 'var(--text-primary)',
                    background: 'transparent',
                  }}
                />
              </div>
              {error && (
                <p className="animate-fade-in" style={{
                  font: 'var(--text-caption)',
                  color: 'var(--color-error)',
                  marginTop: 'var(--space-sm)',
                  paddingLeft: 'var(--space-xs)',
                }}>
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: 'var(--btn-height)',
                borderRadius: 'var(--btn-radius)',
                border: 'none',
                background: 'var(--color-primary)',
                color: 'white',
                fontWeight: 600,
                fontSize: 16,
                fontFamily: 'var(--font-kr)',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 2px 8px rgba(var(--color-primary-rgb), 0.25)',
                transition: 'all var(--duration-normal) var(--ease-out)',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(var(--color-primary-rgb), 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(var(--color-primary-rgb), 0.25)';
              }}
              onMouseDown={(e) => {
                if (!loading) e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              ) : (
                '무료로 시작하기'
              )}
            </button>
          </form>

          {/* Trust signals */}
          <div style={{
            marginTop: 'var(--space-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-quaternary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span style={{ font: 'var(--text-caption)', color: 'var(--text-quaternary)' }}>암호화 저장</span>
            </div>
            <span style={{ color: 'var(--border-strong)' }}>|</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-quaternary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>
              </svg>
              <span style={{ font: 'var(--text-caption)', color: 'var(--text-quaternary)' }}>AI 학습 미사용</span>
            </div>
          </div>
        </div>

        {/* Bottom trust */}
        <p style={{
          font: 'var(--text-caption)',
          color: 'var(--text-quaternary)',
          textAlign: 'center',
          marginTop: 'var(--space-lg)',
        }}>
          13년 외주 매칭 경험의 위시켓이 설계한 AI
        </p>
      </div>
    </div>
  );
}
