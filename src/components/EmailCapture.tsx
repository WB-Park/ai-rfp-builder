'use client';
// PRD 화면 2.5: 이메일 수집 (서비스 시작 전)
// AIDP B2C DNA — 풀스크린, gradient mesh, 마이크로인터랙션
import { useState } from 'react';

interface EmailCaptureProps {
  onSubmit: (email: string) => void;
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
        onSubmit(email);
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
        <div
          style={{
            background: 'var(--surface-0)',
            borderRadius: 'var(--radius-2xl)',
            padding: 'var(--space-2xl) var(--space-xl)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Badge */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)* }}>
            <span className="badge" style={{ marginBottom: 'var(--space-md)', display: 'inline-flex" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
              위시켓이 만든 외주 전문 AI
            </span>
          </div>

          {/* Hero text */}
          <h1
            style={{
              font: 'var(--text-title)',
              letterSpacing: 'var(--letter-tight)',
              color: 'var(--text-primary)',
              textAlign: 'center',
              marginBottom: 'var(--space-sm)',
            }}
          >
            AI가 무료로 RFP를<br />작성해드립니다
          </h1>
          <p
            style={{
              font: 'var(--text-body)',
              color: 'var(--text-tertiary)',
              textAlign: 'center',
              marginBottom: 'var(--space-xl)',
            }}
          >
            5분이면 개발사에 바로 전달할 수 있는<br />기획서가 완성됩니다
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Input field goes here */}
          </form>
        </div>
      </div>
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  uscorollparila: :no-preferred-color-scheme;

}
(