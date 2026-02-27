'use client';
// PRD 화면 3+4: RFP 완성 및 다운로드 + 상담신청/파트너 받아보기
// AIDP B2C DNA — 풀스크린 섹션, 마이크로인터랙션, gradient CTA
import { useState } from 'react';
import { RFPData } from '@/types/rfp';

interface RFPCompleteProps {
  rfpData: RFPData;
  email: string;
}

type Phase = 'contact' | 'result' | 'consultation' | 'done';

export default function RFPComplete({ rfpData, email }: RFPCompleteProps) {
  const [phase, setPhase] = useState<Phase>('contact');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [rfpDocument, setRfpDocument] = useState('');
  const [loading, setLoading] = useState(false);
  const [consultationSubmitted, setConsultationSubmitted] = useState(false);
  const [preferredTime, setPreferredTime] = useState('');
  const [budgetRange, setBudgetRange] = useState('');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    setLoading(true);
    try {
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, company, email, step: 'contact' }),
      });

      const res = await fetch('/api/generate-rfp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfpData }),
      });
      const data = await res.json();
      setRfpDocument(data.rfpDocument || '');
      setPhase('result');
    } catch {
      alert('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleConsultation = async (ctaType: 'consultation' | 'partner') => {
    setLoading(true);
    try {
      const res = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ctaType, name, email, phone, company,
          preferredTime, budgetRange,
          rfpSummary: rfpData.overview,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConsultationSubmitted(true);
        setPhase('done');
      }
    } catch {
      alert('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([rfpDocument], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AI_RFP_Builder_기획서.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 48,
    padding: '0 var(--space-md)',
    borderRadius: 'var(--radius-md)',
    border: '1.5px solid var(--border-strong)',
    outline: 'none',
    fontSize: 15,
    fontFamily: 'var(--font-kr)',
    color: 'var(--text-primary)',
    background: 'var(--surface-0)',
    transition: 'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--color-primary)';
    e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-alpha)';
  };
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--border-strong)';
    e.currentTarget.style.boxShadow = 'none';
  };

  // ━━ Phase: Contact collection ━━
  if (phase === 'contact') {
    return (
      <div className="bg-mesh" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)' }}>
        <div className="animate-fade-in-up" style={{ maxWidth: 420, width: '100%', padding: '0 var(--page-padding-mobile)' }}>
          <div style={{
            background: 'var(--surface-0)',
            borderRadius: 'var(--radius-2xl)',
            padding: 'var(--space-2xl) var(--space-xl)',
            boxShadow: 'var(--shadow-lg)',
          }}>
            {/* Success indicator */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
              <div className="animate-bounce-in" style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(52, 199, 89, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto var(--space-md)',
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5"/>
                </svg>
              </div>
              <h2 style={{ font: 'var(--text-title)', letterSpacing: 'var(--letter-tight)', color: 'var(--text-primary)' }}>
                RFP가 완성되었습니다!
              </h2>
              <p style={{ font: 'var(--text-body)', color: 'var(--text-tertiary)', marginTop: 'var(--space-sm)' }}>
                연락처를 입력하시면 완성된 RFP를 다운로드할 수 있습니다
              </p>
            </div>

            <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 *"
                required
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="연락처 (전화번호) *"
                required
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="회사명 (선택)"
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <button
                type="submit"
                disabled={loading || !name || !phone}
                style={{
                  width: '100%',
                  height: 'var(--btn-height)',
                  borderRadius: 'var(--btn-radius)',
                  border: 'none',
                  background: (!name || !phone) ? 'var(--surface-2)' : 'var(--color-primary)',
                  color: (!name || !phone) ? 'var(--text-quaternary)' : 'white',
                  fontWeight: 600,
                  fontSize: 16,
                  fontFamily: 'var(--font-kr)',
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  boxShadow: (name && phone) ? '0 2px 8px rgba(var(--color-primary-rgb), 0.25)' : 'none',
                  transition: 'all var(--duration-normal) var(--ease-out)',
                  marginTop: 'var(--space-sm)',
                }}
              >
                {loading ? 'RFP 생성 중...' : 'RFP 다운로드하기'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ━━ Phase: Result + CTA ━━
  if (phase === 'result' || phase === 'consultation') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--surface-1)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: 'var(--space-xl) var(--page-padding-mobile)' }}>
          {/* RFP Document */}
          <div className="animate-fade-in-up" style={{
            background: 'var(--surface-0)',
            borderRadius: 'var(--card-radius)',
            padding: 'var(--space-2xl)',
            boxShadow: 'var(--shadow-md)',
            marginBottom: 'var(--space-lg)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-xl)',
            }}>
              <h2 style={{ font: 'var(--text-title)', letterSpacing: 'var(--letter-tight)', color: 'var(--text-primary)' }}>
                완성된 RFP
              </h2>
              <button
                onClick={handleDownload}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-0)',
                  color: 'var(--text-secondary)',
                  fontSize: 14, fontWeight: 500,
                  fontFamily: 'var(--font-kr)',
                  cursor: 'pointer',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-0)'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                다운로드
              </button>
            </div>

            <div style={{
              fontSize: 15,
              lineHeight: 1.8,
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
            }}>
              {rfpDocument}
            </div>

            <div style={{
              marginTop: 'var(--space-xl)',
              padding: 'var(--space-md)',
              background: 'var(--color-primary-alpha)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 500 }}>
                위시켓이 만든 외주 전문 AI · 13년 경험 기반 질문 설계
              </p>
            </div>
          </div>

          {/* CTA Section */}
          {!consultationSubmitted && (
            <div className="animate-fade-in-up" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-md)',
              marginBottom: 'var(--space-lg)',
              animationDelay: '0.15s',
            }}>
              {/* Primary CTA */}
              <div style={{
                background: 'linear-gradient(135deg, var(--color-primary), #1E40AF)',
                borderRadius: 'var(--card-radius)',
                padding: 'var(--space-xl)',
                color: 'white',
              }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 'var(--space-sm)' }}>무료 상담신청</h3>
                <p style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.5, marginBottom: 'var(--space-lg)' }}>
                  이 RFP를 전문가와 함께 검토하고 싶으신가요? 24시간 내에 연락드리겠습니다.
                </p>

                {phase === 'consultation' ? (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                    <select
                      value={preferredTime}
                      onChange={(e) => setPreferredTime(e.target.value)}
                      style={{
                        ...inputStyle,
                        height: 40,
                        fontSize: 14,
                        borderColor: 'rgba(255,255,255,0.2)',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                      }}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    >
                      <option value="" style={{ color: 'var(--text-primary)' }}>상담 희망 시간 (선택)</option>
                      <option value="morning" style={{ color: 'var(--text-primary)' }}>오전 (10:00-12:00)</option>
                      <option value="afternoon" style={{ color: 'var(--text-primary)' }}>오후 (14:00-17:00)</option>
                      <option value="evening" style={{ color: 'var(--text-primary)' }}>저녁 (18:00-20:00)</option>
                      <option value="anytime" style={{ color: 'var(--text-primary)' }}>무관</option>
                    </select>
                    <select
                      value={budgetRange}
                      onChange={(e) => setBudgetRange(e.target.value)}
                      style={{
                        ...inputStyle,
                        height: 40,
                        fontSize: 14,
                        borderColor: 'rgba(255,255,255,0.2)',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                      }}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    >
                      <option value="" style={{ color: 'var(--text-primary)' }}>예상 예산 규모 (선택)</option>
                      <option value="under10m" style={{ color: 'var(--text-primary)' }}>1천만원 미만</option>
                      <option value="10m-30m" style={{ color: 'var(--text-primary)' }}>1천만원 ~ 3천만원</option>
                      <option value="30m-50m" style={{ color: 'var(--text-primary)' }}>3천만원 ~ 5천만원</option>
                      <option value="50m-100m" style={{ color: 'var(--text-primary)' }}>5천만원 ~ 1억</option>
                      <option value="over100m" style={{ color: 'var(--text-primary)' }}>1억 이상</option>
                      <option value="undecided" style={{ color: 'var(--text-primary)' }}>미정</option>
                    </select>
                    <button
                      onClick={() => handleConsultation('consultation')}
                      disabled={loading}
                      style={{
                        width: '100%', height: 44,
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: 'white',
                        color: 'var(--color-primary)',
                        fontWeight: 600, fontSize: 15,
                        fontFamily: 'var(--font-kr)',
                        cursor: 'pointer',
                        transition: 'all var(--duration-fast) var(--ease-out)',
                      }}
                    >
                      {loading ? '접수 중...' : '상담 신청하기'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPhase('consultation')}
                    style={{
                      width: '100%', height: 48,
                      borderRadius: 'var(--radius-md)',
                      border: '2px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      fontWeight: 600, fontSize: 15,
                      fontFamily: 'var(--font-kr)',
                      cursor: 'pointer',
                      backdropFilter: 'blur(8px)',
                      transition: 'all var(--duration-fast) var(--ease-out)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                  >
                    무료 상담신청 →
                  </button>
                )}
              </div>

              {/* Secondary CTA */}
              <div style={{
                background: 'var(--surface-0)',
                border: '1.5px solid var(--border-strong)',
                borderRadius: 'var(--card-radius)',
                padding: 'var(--space-xl)',
              }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>맞춤 파트너 받아보기</h3>
                <p style={{ fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 'var(--space-lg)' }}>
                  이 RFP에 맞는 검증된 개발 파트너 3사를 추천받으세요.
                </p>
                <button
                  onClick={() => handleConsultation('partner')}
                  disabled={loading}
                  style={{
                    width: '100%', height: 48,
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--color-primary)',
                    background: 'var(--color-primary-alpha)',
                    color: 'var(--color-primary)',
                    fontWeight: 600, fontSize: 15,
                    fontFamily: 'var(--font-kr)',
                    cursor: 'pointer',
                    transition: 'all var(--duration-fast) var(--ease-out)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-primary)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-primary-alpha)';
                    e.currentTarget.style.color = 'var(--color-primary)';
                  }}
                >
                  맞춤 파트너 받아보기 →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ━━ Phase: Done ━━
  return (
    <div className="bg-mesh" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)' }}>
      <div className="animate-fade-in-up" style={{ maxWidth: 420, width: '100%', padding: '0 var(--page-padding-mobile)' }}>
        <div style={{
          background: 'var(--surface-0)',
          borderRadius: 'var(--radius-2xl)',
          padding: 'var(--space-2xl) var(--space-xl)',
          boxShadow: 'var(--shadow-lg)',
          textAlign: 'center',
        }}>
          {/* Success animation */}
          <div className="animate-bounce-in" style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.1), rgba(52, 199, 89, 0.05))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-lg)',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#34C759" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </div>

          <h2 style={{ font: 'var(--text-title)', letterSpacing: 'var(--letter-tight)', color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>
            {consultationSubmitted ? '접수가 완료되었습니다!' : '감사합니다!'}
          </h2>
          <p style={{ font: 'var(--text-body)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-xl)' }}>
            24시간 내에 연락드리겠습니다.<br />위시켓과 함께 성공적인 프로젝트를 만들어보세요.
          </p>

          <div style={{
            padding: 'var(--space-md)',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-md)',
          }}>
            <p style={{ font: 'var(--text-caption)', color: 'var(--text-tertiary)' }}>
              접수 확인 이메일이 <strong style={{ color: 'var(--text-secondary)' }}>{email}</strong>로 발송되었습니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
