'use client';

// PRD 화면 3+4: RFP 완성 및 다운로드 + 전환 CTA
// 블루톤 디자인 + 위시켓 프로젝트 등록 CTA + 견적 검증기 Cross-sell
// 게스트 사용자 분기 처리 (이메일 수집 → 이메일 발송)

import { useState, useEffect } from 'react';
import { RFPData } from '@/types/rfp';

interface RFPCompleteProps {
  rfpData: RFPData;
  email: string;
  sessionId?: string;
}

const C = {
  navy: '#0B1120', navyLight: '#131C31', navyMid: '#1A2540',
  blue: '#2563EB', blueLight: '#3B82F6', blueSoft: '#60A5FA',
  blueGlow: 'rgba(37, 99, 235, 0.15)', blueBg: 'rgba(37, 99, 235, 0.06)',
  bg: '#F8FAFC', white: '#FFFFFF',
  textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
  border: '#E2E8F0', borderStrong: '#CBD5E1',
  green: '#22C55E', greenBg: 'rgba(34, 197, 94, 0.08)',
};

type Phase = 'generating' | 'result' | 'consultation' | 'done';

export default function RFPComplete({ rfpData, email, sessionId }: RFPCompleteProps) {
  const isGuest = email.startsWith('guest@');
  const [phase, setPhase] = useState<Phase>('generating');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [rfpDocument, setRfpDocument] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [consultationSubmitted, setConsultationSubmitted] = useState(false);
  const [preferredTime, setPreferredTime] = useState('');
  const [budgetRange, setBudgetRange] = useState('');

  // 자동으로 RFP 생성 시작
  useEffect(() => {
    generateRFP();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateRFP = async () => {
    setLoading(true);
    try {
      // 리드 저장 (게스트가 아닌 경우)
      if (!isGuest) {
        await fetch('/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, step: 'rfp_generate' }),
        });
      }

      const res = await fetch('/api/generate-rfp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfpData, sessionId }),
      });
      const data = await res.json();
      setRfpDocument(data.rfpDocument || '');

      // 이메일 사용자에게 자동 발송
      if (!isGuest && email) {
        sendEmailRFP(email, data.rfpDocument || '');
      }

      setPhase('result');
    } catch {
      setPhase('result');
    } finally {
      setLoading(false);
    }
  };

  const sendEmailRFP = async (targetEmail: string, doc: string) => {
    try {
      const res = await fetch('/api/send-rfp-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          rfpDocument: doc,
          projectName: rfpData.overview?.split('\n')[0]?.slice(0, 50),
        }),
      });
      const data = await res.json();
      if (data.success) setEmailSent(true);
    } catch {
      // 이메일 발송 실패는 무시 (핵심 플로우 방해 X)
    }
  };

  const handleGuestEmailSubmit = async () => {
    if (!guestEmail || !guestEmail.includes('@')) return;
    setLoading(true);
    try {
      // 리드 저장
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: guestEmail, name, phone, company, step: 'guest_convert' }),
      });
      // 이메일 발송
      await sendEmailRFP(guestEmail, rfpDocument);
      setEmailSent(true);
    } catch {
      // ignore
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
          ctaType,
          name: name || email.split('@')[0],
          email: isGuest ? guestEmail : email,
          phone, company, preferredTime, budgetRange,
          rfpSummary: rfpData.overview,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConsultationSubmitted(true);
        setPhase('done');
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([rfpDocument], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AI_RFP_기획서_위시켓.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 48, padding: '0 16px',
    borderRadius: 10, border: `1.5px solid ${C.border}`,
    outline: 'none', fontSize: 15, color: C.textPrimary,
    background: C.white, transition: 'all 0.2s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  };

  // ━━ Phase: Generating ━━
  if (phase === 'generating') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: C.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', animation: 'pulse 2s ease-in-out infinite',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4m0 12v4m-8-10H0m24 0h-4m-2.343-5.657L16.243 4.93M7.757 16.243 6.343 17.657m0-11.314L7.757 7.757m8.486 8.486 1.414 1.414"/>
            </svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>
            AI가 RFP를 작성하고 있습니다
          </h2>
          <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.6 }}>
            위시켓 13년 외주 경험을 기반으로<br />전문 수준의 기획서를 생성 중입니다...
          </p>
          <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.7; } }`}</style>
        </div>
      </div>
    );
  }

  // ━━ Phase: Result ━━
  if (phase === 'result' || phase === 'consultation') {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>

          {/* Header bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 24, padding: '16px 20px',
            background: C.white, borderRadius: 14,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.blue, letterSpacing: 1 }}>WISHKET AI</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.textPrimary, marginTop: 2 }}>RFP 기획서 완성</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleDownload} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 10,
                border: `1.5px solid ${C.border}`, background: C.white,
                color: C.textSecondary, fontSize: 14, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                다운로드
              </button>
            </div>
          </div>

          {/* 이메일 발송 알림 */}
          {emailSent && !isGuest && (
            <div style={{
              padding: '14px 20px', marginBottom: 16, borderRadius: 12,
              background: C.greenBg, border: `1px solid rgba(34, 197, 94, 0.2)`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              <span style={{ fontSize: 14, color: '#15803D', fontWeight: 500 }}>
                RFP 기획서가 <strong>{email}</strong>로 발송되었습니다
              </span>
            </div>
          )}

          {/* RFP Document */}
          <div style={{
            background: C.white, borderRadius: 16,
            padding: '32px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 15, lineHeight: 1.85, color: C.textSecondary, whiteSpace: 'pre-wrap' }}>
              {rfpDocument}
            </div>

            <div style={{
              marginTop: 28, padding: 16, background: C.blueBg,
              borderRadius: 10, textAlign: 'center',
            }}>
              <p style={{ fontSize: 13, color: C.blue, fontWeight: 500 }}>
                위시켓 AI RFP Builder · 13년 외주 경험 기반 · 7만+ 프로젝트 매칭 데이터
              </p>
            </div>
          </div>

          {/* ━━ 게스트 이메일 수집 배너 ━━ */}
          {isGuest && !emailSent && (
            <div style={{
              padding: '24px 28px', marginBottom: 20, borderRadius: 16,
              background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`,
              boxShadow: '0 4px 20px rgba(11, 17, 32, 0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>📩</span>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: C.white, margin: 0 }}>
                  기획서를 이메일로 받아보세요
                </h3>
              </div>
              <p style={{ fontSize: 14, color: C.blueSoft, lineHeight: 1.5, marginBottom: 16 }}>
                완성된 RFP를 보기 좋게 정리하여 이메일로 보내드립니다. 언제든 다시 확인할 수 있어요.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="이메일 주소 입력"
                  style={{
                    ...inputStyle, flex: 1,
                    background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)',
                    color: C.white,
                  }}
                />
                <button onClick={handleGuestEmailSubmit} disabled={loading || !guestEmail.includes('@')}
                  style={{
                    padding: '0 24px', borderRadius: 10, border: 'none',
                    background: C.blue, color: C.white,
                    fontWeight: 600, fontSize: 15, cursor: 'pointer',
                    opacity: (!guestEmail.includes('@') || loading) ? 0.5 : 1,
                    transition: 'all 0.2s',
                  }}>
                  {loading ? '발송 중...' : '발송'}
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                스팸 없음 · 기획서 발송 목적으로만 사용됩니다
              </p>
            </div>
          )}
          {isGuest && emailSent && (
            <div style={{
              padding: '14px 20px', marginBottom: 20, borderRadius: 12,
              background: C.greenBg, border: `1px solid rgba(34, 197, 94, 0.2)`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              <span style={{ fontSize: 14, color: '#15803D', fontWeight: 500 }}>
                RFP 기획서가 <strong>{guestEmail}</strong>로 발송되었습니다
              </span>
            </div>
          )}

          {/* ━━ 전환 CTA 섹션 ━━ */}
          {!consultationSubmitted && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16, marginBottom: 20,
            }}>
              {/* CTA 1: 위시켓 프로젝트 등록 (PRD 핵심 전환) */}
              <a href="https://www.wishket.com/project/register/?utm_source=ai-rfp&utm_medium=web&utm_campaign=rfp-complete"
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'block', textDecoration: 'none',
                  background: `linear-gradient(135deg, ${C.blue}, #1D4ED8)`,
                  borderRadius: 16, padding: 28, color: C.white,
                  boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)',
                  transition: 'all 0.3s ease',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, opacity: 0.8 }}>추천</span>
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>위시켓에서 프로젝트 등록하기</h3>
                <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.6 }}>
                  이 RFP로 바로 프로젝트를 등록하면, 48시간 내 검증된 개발사 3~5곳의 제안을 받아보실 수 있습니다.
                </p>
                <div style={{
                  marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)',
                  fontWeight: 600, fontSize: 15,
                }}>
                  무료로 시작하기 →
                </div>
              </a>

              {/* CTA 2: 무료 상담신청 */}
              <div style={{
                background: C.white, border: `1.5px solid ${C.border}`,
                borderRadius: 16, padding: 28,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: C.blueBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10,
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>무료 상담신청</h3>
                <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, marginBottom: 18 }}>
                  이 RFP를 위시켓 전문가와 함께 검토하고, 최적의 진행 방안을 상담받으세요.
                </p>

                {phase === 'consultation' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="이름 *" style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = C.blue; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                    />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="연락처 *" style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = C.blue; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                    />
                    <input type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                      placeholder="회사명 (선택)" style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderColor = C.blue; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }}
                    />
                    <select value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}
                      style={{ ...inputStyle, color: preferredTime ? C.textPrimary : C.textTertiary }}>
                      <option value="">상담 희망 시간 (선택)</option>
                      <option value="morning">오전 (10:00-12:00)</option>
                      <option value="afternoon">오후 (14:00-17:00)</option>
                      <option value="evening">저녁 (18:00-20:00)</option>
                      <option value="anytime">무관</option>
                    </select>
                    <select value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)}
                      style={{ ...inputStyle, color: budgetRange ? C.textPrimary : C.textTertiary }}>
                      <option value="">예상 예산 규모 (선택)</option>
                      <option value="under10m">1천만원 미만</option>
                      <option value="10m-30m">1천만원 ~ 3천만원</option>
                      <option value="30m-50m">3천만원 ~ 5천만원</option>
                      <option value="50m-100m">5천만원 ~ 1억</option>
                      <option value="over100m">1억 이상</option>
                      <option value="undecided">미정</option>
                    </select>
                    <button onClick={() => handleConsultation('consultation')}
                      disabled={loading || !name || !phone}
                      style={{
                        width: '100%', height: 48, borderRadius: 10, border: 'none',
                        background: (!name || !phone) ? C.border : C.blue,
                        color: (!name || !phone) ? C.textTertiary : C.white,
                        fontWeight: 600, fontSize: 15, cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}>
                      {loading ? '접수 중...' : '상담 신청하기'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setPhase('consultation')}
                    style={{
                      width: '100%', height: 48, borderRadius: 10,
                      border: `1.5px solid ${C.blue}`,
                      background: C.blueBg, color: C.blue,
                      fontWeight: 600, fontSize: 15, cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}>
                    무료 상담신청 →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ━━ Cross-sell: 견적 검증기 (PRD Table 40) ━━ */}
          <div style={{
            padding: '20px 24px', borderRadius: 14,
            background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 16,
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.blueSoft, letterSpacing: 1, marginBottom: 4 }}>COMING SOON</div>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 4 }}>
                이 RFP로 받은 견적이 적정한지 궁금하다면?
              </h4>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                위시켓 AI 견적 검증기 · 13년 실계약 데이터 기반
              </p>
            </div>
            <button disabled style={{
              padding: '10px 20px', borderRadius: 10,
              border: '1.5px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)',
              fontWeight: 600, fontSize: 14, cursor: 'default',
            }}>
              준비 중
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ━━ Phase: Done ━━
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ maxWidth: 440, width: '100%', padding: '0 24px' }}>
        <div style={{
          background: C.white, borderRadius: 20,
          padding: '40px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 10 }}>
            {consultationSubmitted ? '접수가 완료되었습니다!' : '감사합니다!'}
          </h2>
          <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.6, marginBottom: 28 }}>
            24시간 내에 연락드리겠습니다.<br />위시켓과 함께 성공적인 프로젝트를 만들어보세요.
          </p>

          <a href="https://www.wishket.com/project/register/?utm_source=ai-rfp&utm_medium=web&utm_campaign=post-consult"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', borderRadius: 12,
              background: C.blue, color: C.white,
              textDecoration: 'none', fontWeight: 600, fontSize: 15,
              boxShadow: '0 2px 12px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.2s',
            }}>
            위시켓에서 프로젝트 시작하기 →
          </a>

          <div style={{ marginTop: 20, padding: 16, background: C.bg, borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: C.textTertiary }}>
              접수 확인이 <strong style={{ color: C.textSecondary }}>{isGuest ? guestEmail || '게스트' : email}</strong>{isGuest && !guestEmail ? '에게' : '로'} 전달되었습니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
