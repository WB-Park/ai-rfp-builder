'use client';

// AI PRD Builder — Landing Page v4
// MIRROR/PROBE/FORGE 적용: 블루 톤, Hero 직접 CTA, 이메일 동기 부여
// 위시켓 AI 진단과 차별화: 블루 프라이머리, "빌더" 느낌

import { useState, useEffect, useRef } from 'react';

interface LandingPageProps {
  onStart: (email: string, sessionId?: string) => void;
}

// ─── Design Tokens (블루 톤 — AI 진단과 차별화) ───
const C = {
  // Core
  navy: '#0B1120',
  navyLight: '#131C31',
  navyMid: '#1A2540',
  navyAlpha92: 'rgba(11, 17, 32, 0.92)',
  // Blue accent (차별화 핵심)
  blue: '#2563EB',
  blueLight: '#3B82F6',
  blueSoft: '#60A5FA',
  blueGlow: 'rgba(37, 99, 235, 0.25)',
  blueBg: 'rgba(37, 99, 235, 0.08)',
  blueText: '#93C5FD',
  // Surfaces
  bg: '#F8FAFC',
  white: '#FFFFFF',
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  // Text
  textDark: '#0F172A',
  textLight: '#94A3B8',
  textMuted: '#64748B',
};

export default function LandingPage({ onStart }: LandingPageProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // [MIRROR:제약인정] 이메일 없이 바로 시작 — 진입 장벽 제거
  const handleGuestStart = () => {
    onStart('guest@anonymous.user');
  };

  // [MIRROR:인센티브정렬] 이메일 입력 시 PDF 발송 약속
  const handleEmailStart = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    if (!email || !email.includes('@')) {
      setError('유효한 이메일을 입력해주세요.');
      heroInputRef.current?.focus();
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
      if (data.error) setError(data.error);
      else onStart(email, data.sessionId);
    } catch {
      setError('네트워크 오류. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // [MIRROR:반응형] 모바일 감지
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Shared
  const sectionPad: React.CSSProperties = { padding: isMobile ? '56px 16px' : '80px 24px', maxWidth: 1080, margin: '0 auto' };
  const secTitle: React.CSSProperties = {
    fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 800, color: C.textDark,
    textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.3,
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>

      {/* ━━ Header ━━ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? C.navyAlpha92 : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        transition: 'all 0.3s ease',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 24px',
          height: isMobile ? 52 : 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: C.white }}>wishket</span>
            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
            <span style={{ fontSize: isMobile ? 12 : 14, color: C.textLight, fontWeight: 500 }}>AI PRD 빌더</span>
          </div>
          <button onClick={handleGuestStart} style={{
            padding: isMobile ? '7px 14px' : '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: C.blue, color: C.white, fontSize: isMobile ? 13 : 14, fontWeight: 600,
            transition: 'all 0.2s',
          }}>바로 시작</button>
        </div>
      </header>

      {/* ━━ Hero — CTA 바로 여기에! (스크롤 금지) ━━ */}
      <section style={{
        background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navyLight} 80%, ${C.navyMid} 100%)`,
        padding: isMobile ? '100px 16px 48px' : '130px 24px 80px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* 배경 그로우 이펙트 */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: isMobile ? 350 : 600, height: isMobile ? 350 : 600, borderRadius: '50%',
          background: `radial-gradient(circle, ${C.blueGlow} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: isMobile ? '6px 14px' : '8px 18px', borderRadius: 100,
            background: C.blueBg, border: '1px solid rgba(37, 99, 235, 0.2)',
            marginBottom: isMobile ? 20 : 28,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.blue, boxShadow: `0 0 8px ${C.blueGlow}` }} />
            <span style={{ fontSize: isMobile ? 12 : 14, fontWeight: 600, color: C.blueText }}>
              위시켓 13년 외주 경험 × AI
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(30px, 5vw, 48px)', fontWeight: 800,
            color: C.white, lineHeight: 1.25, letterSpacing: '-0.03em',
            marginBottom: isMobile ? 12 : 16,
          }}>
            소프트웨어 기획서(PRD),<br />
            <span style={{ color: C.blueSoft }}>AI와 대화 몇 번이면 끝</span>
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: 'clamp(15px, 2vw, 18px)', color: C.textLight,
            lineHeight: 1.7, maxWidth: isMobile ? '100%' : 560, margin: isMobile ? '0 auto 24px' : '0 auto 36px',
          }}>
            아이디어만 말하세요. 개발사에 <strong style={{ color: C.blueSoft }}>바로 전달 가능한 PRD 기획서</strong>를
            {' '}AI가 무료로 작성하고, <strong style={{ color: C.blueSoft }}>PDF로 이메일에 보내드립니다.</strong>
          </p>

          {/* ──── Hero CTA: 이메일 + 즉시 시작 ──── */}
          {/* [PROBE:🔴해결] CTA가 바로 여기에. 스크롤 필요 없음 */}
          <form onSubmit={handleEmailStart} style={{
            maxWidth: 520, margin: '0 auto 12px',
            display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8,
          }}>
            <input
              ref={heroInputRef}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="기획서 받을 이메일 입력"
              style={{
                width: isMobile ? '100%' : 'auto', flex: isMobile ? undefined : 1, height: 54, padding: '0 18px', borderRadius: 12,
                border: error ? '1.5px solid #EF4444' : '1.5px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)', color: C.white, fontSize: 16,
                outline: 'none', transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = C.blue;
                e.target.style.background = 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = `0 0 0 3px ${C.blueGlow}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = error ? '#EF4444' : 'rgba(255,255,255,0.12)';
                e.target.style.background = 'rgba(255,255,255,0.06)';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button type="submit" disabled={loading} style={{
              width: isMobile ? '100%' : 'auto', padding: isMobile ? '0' : '0 28px', height: 54, borderRadius: 12, border: 'none',
              background: `linear-gradient(135deg, ${C.blue}, ${C.blueLight})`,
              color: C.white, fontSize: isMobile ? 13 : 16, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.6 : 1, whiteSpace: isMobile ? 'normal' : 'nowrap',
              boxShadow: `0 4px 20px ${C.blueGlow}`,
              transition: 'all 0.2s',
            }}>
              {loading ? '...' : isMobile ? 'PRD 기획서 무료 생성 →' : '5분 안에 전문가 수준 RFP 받기 →'}
            </button>
          </form>

          {error && (
            <p style={{ color: '#EF4444', fontSize: 13, marginTop: 4, marginBottom: 4 }}>{error}</p>
          )}

          {/* 이메일 가치 설명 */}
          <p style={{ fontSize: 13, color: C.blueSoft, marginTop: 8, fontWeight: 500 }}>
            📩 완성된 기획서를 PDF로 이메일에 바로 보내드립니다
          </p>

          {/* [MIRROR:제약인정] 이메일 없이 시작 옵션 — 시각적으로 약화 */}
          <button onClick={handleGuestStart} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.gray600, fontSize: 13, padding: '6px 16px', marginTop: 4,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = C.gray400; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.gray600; }}
          >
            또는 이메일 없이 시작하기
          </button>

          {/* Trust chips */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: 16, marginTop: 24,
          }}>
            {['회원가입 불필요', '완전 무료', '5분이면 완료', 'PDF 다운로드'].map(t => (
              <span key={t} style={{
                fontSize: 13, color: C.textLight, display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.blueSoft} strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t}
              </span>
            ))}
          </div>

          {/* Step indicator */}
          <div style={{
            display: isMobile ? 'grid' : 'flex', gridTemplateColumns: isMobile ? '1fr 1fr' : undefined,
            alignItems: isMobile ? undefined : 'center', justifyContent: isMobile ? undefined : 'center',
            gap: isMobile ? 12 : 6, marginTop: 36, flexWrap: isMobile ? undefined : 'wrap',
          }}>
            {[
              { n: '1', t: '아이디어 입력 (1분)' },
              { n: '2', t: 'AI 질문 응답 (3분)' },
              { n: '3', t: 'RFP 자동 생성 (1분)' },
              { n: '4', t: 'PDF 다운로드 (즉시)' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: isMobile ? 'center' : undefined }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${C.blue}, ${C.blueLight})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: C.white,
                }}>{s.n}</div>
                <span style={{ fontSize: 13, color: C.textLight }}>{s.t}</span>
                {!isMobile && i < 3 && <span style={{ color: C.gray600, margin: '0 2px', fontSize: 12 }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Demo Preview (다크 카드) ━━ */}
      <section style={{
        background: `linear-gradient(180deg, ${C.navyMid} 0%, ${C.bg} 100%)`,
        padding: isMobile ? '0 16px 48px' : '0 24px 80px',
      }}>
        <div style={{
          maxWidth: 780, margin: '-20px auto 0',
          background: C.navy, borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          boxShadow: `0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(37,99,235,0.1)`,
        }}>
          {/* macOS dots */}
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBD2E' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
            <span style={{ fontSize: 13, color: C.textLight, marginLeft: 12 }}>
              AI RFP Builder — 반려동물 건강관리 플랫폼
            </span>
          </div>
          <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
            <div style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: 100,
              background: C.blueBg, marginBottom: 16,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.blueSoft }}>✅ RFP 기획서 완성</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 20 }}>
              반려동물 건강관리 플랫폼
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 8 : 12, marginBottom: 20, flexWrap: 'wrap' }}>
              {[
                { v: '7개', l: '핵심 기능', c: C.blueSoft },
                { v: 'P1/P2/P3', l: '우선순위 분류', c: '#A78BFA' },
                { v: '3,000만', l: '예상 예산', c: '#FBBF24' },
                { v: '12주', l: 'MVP 일정', c: '#34D399' },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: isMobile ? '1 1 70px' : '1 1 100px', padding: isMobile ? '10px 8px' : '14px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: isMobile ? 10 : 11, color: C.textLight, marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>
            {[
              { name: '회원가입 · 소셜 로그인', tag: 'P1 필수', tagColor: '#EF4444' },
              { name: '반려동물 프로필 등록', tag: 'P1 필수', tagColor: '#EF4444' },
              { name: '수의사 화상상담 예약', tag: 'P2 우선', tagColor: '#F59E0B' },
              { name: 'AI 건강 분석 리포트', tag: 'P3 선택', tagColor: C.blueSoft },
            ].map((f, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: isMobile ? '8px 10px' : '10px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                marginBottom: 6,
              }}>
                <span style={{ fontSize: isMobile ? 13 : 14, color: C.white }}>📋 {f.name}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 100,
                  background: `${f.tagColor}18`, color: f.tagColor,
                }}>{f.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ 이런 기획서를 받을 수 있어요 ━━ */}
      <section style={{ background: C.bg, ...sectionPad }}>
        <h2 style={secTitle}>ChatGPT에서는 절대 못 받는 기획서</h2>
        <p style={{ fontSize: 16, color: C.textMuted, textAlign: 'center', marginTop: 10 }}>
          위시켓 13년 외주 매칭 경험이 녹아든 AI의 결과물
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 16, marginTop: 44,
        }}>
          {[
            { n: '01', title: '체계적인 RFP 문서', desc: '7단계 전문 질문으로 프로젝트 개요부터 기술 요구사항, 예산까지 빠짐없이 정리', icon: '📄' },
            { n: '02', title: '기능별 우선순위', desc: 'P1/P2/P3 자동 분류 + 구현 난이도 분석. MVP부터 시작하는 로드맵 제시', icon: '🎯' },
            { n: '03', title: '실전 예산·일정 분석', desc: '13년 매칭 데이터 기반, 프로젝트 유형별 현실적인 예산 범위와 기간 추정', icon: '💰' },
            { n: '04', title: '개발사 바로 전달', desc: '완성된 RFP를 PDF로 다운로드. 그대로 개발사에 보내면 정확한 견적을 받을 수 있어요', icon: '🚀' },
          ].map(item => (
            <div key={item.n} style={{
              background: C.white, borderRadius: 16, padding: isMobile ? '20px 16px' : '28px 24px',
              border: '1px solid rgba(0,0,0,0.05)',
              transition: 'all 0.25s ease',
              cursor: 'default',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(37, 99, 235, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.05)';
            }}
            >
              <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
              <div style={{
                fontSize: 12, fontWeight: 800, color: C.blue,
                marginBottom: 8, letterSpacing: '0.05em',
              }}>{item.n}</div>
              <div style={{ fontSize: isMobile ? 16 : 17, fontWeight: 700, color: C.textDark, marginBottom: 8 }}>{item.title}</div>
              <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.65 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━ How It Works ━━ */}
      <section style={{ background: C.white, ...sectionPad }}>
        <h2 style={secTitle}>정말 간단합니다</h2>
        <p style={{ fontSize: 16, color: C.textMuted, textAlign: 'center', marginTop: 10 }}>
          프롬프트 작성? 필요 없습니다. AI가 질문하고 당신은 답만 하세요.
        </p>

        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          gap: isMobile ? 24 : 32, marginTop: 48, flexWrap: 'wrap',
        }}>
          {[
            { step: 1, title: '"이런 앱 만들고 싶어요"', desc: '한 줄이면 충분합니다. AI가 알아서 분류하고 관련 질문을 시작합니다.' },
            { step: 2, title: 'AI가 질문 → 당신이 답변', desc: '타겟 사용자, 핵심 기능, 예산 등 7가지를 대화로 정리합니다.' },
            { step: 3, title: 'RFP 기획서 완성!', desc: '개발사에 바로 전달 가능한 전문 기획서. PDF 다운로드 + 이메일 발송.' },
          ].map((s, i) => (
            <div key={i} style={{ flex: '1 1 240px', maxWidth: 300, textAlign: 'center' }}>
              <div style={{
                width: isMobile ? 44 : 52, height: isMobile ? 44 : 52, borderRadius: 14, margin: '0 auto 16px',
                background: `linear-gradient(135deg, ${C.blue}, ${C.blueLight})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isMobile ? 17 : 20, fontWeight: 800, color: C.white,
                boxShadow: `0 4px 16px ${C.blueGlow}`,
              }}>{s.step}</div>
              <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, color: C.textDark, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.65 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━ Before/After 비교 ━━ */}
      <section style={{ background: C.bg, ...sectionPad }}>
        <h2 style={secTitle}>ChatGPT vs 위시켓 AI RFP</h2>
        <p style={{ fontSize: 16, color: C.textMuted, textAlign: 'center', marginTop: 10 }}>
          같은 질문, 다른 결과. 외주 전문 AI의 차이
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20, marginTop: 44,
        }}>
          {/* ChatGPT */}
          <div style={{
            background: C.white, borderRadius: 16, padding: isMobile ? '20px 16px' : '28px 24px',
            border: '1px solid rgba(0,0,0,0.06)', opacity: 0.85,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span style={{
                width: 32, height: 32, borderRadius: 8, background: C.gray100,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>💬</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: C.gray600 }}>일반 ChatGPT</span>
            </div>
            {[
              '범용적인 답변, 외주 맥락 전혀 없음',
              '기능 우선순위? 그런 거 모름',
              '예산·일정 추정 불가 (할루시네이션)',
              '개발사에 전달할 수 없는 포맷',
              '매번 프롬프트를 직접 작성해야 함',
            ].map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0', borderBottom: i < 4 ? `1px solid ${C.gray100}` : 'none',
              }}>
                <span style={{ color: C.gray300, fontSize: 16 }}>✕</span>
                <span style={{ fontSize: 14, color: C.gray500 }}>{t}</span>
              </div>
            ))}
          </div>

          {/* 위시켓 AI */}
          <div style={{
            background: C.white, borderRadius: 16, padding: isMobile ? '20px 16px' : '28px 24px',
            border: `2px solid ${C.blue}`,
            boxShadow: `0 4px 24px ${C.blueGlow}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: `linear-gradient(135deg, ${C.blue}, ${C.blueLight})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: C.white, fontWeight: 800,
              }}>W</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: C.textDark }}>위시켓 AI RFP</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                background: C.blueBg, color: C.blue, marginLeft: 'auto',
              }}>추천</span>
            </div>
            {[
              '외주 전문 7단계 질문 — 빈틈 없는 기획',
              'P1/P2/P3 자동 분류 + MVP 스코프 추천',
              '13년 실전 데이터 기반 예산·일정 추정',
              '개발사에 바로 전달 가능한 RFP 포맷',
              '대화만 하면 기획서가 자동 완성',
            ].map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0', borderBottom: i < 4 ? `1px solid ${C.gray100}` : 'none',
              }}>
                <span style={{ color: C.blue, fontSize: 16 }}>✓</span>
                <span style={{ fontSize: 14, color: C.gray700, fontWeight: 500 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Stats ━━ */}
      <section style={{
        background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`,
        padding: isMobile ? '40px 16px' : '56px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, color: C.textLight, marginBottom: 28 }}>
          위시켓의 실전 데이터로 훈련된 AI가 가장 현실적인 기획서를 작성합니다
        </p>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: isMobile ? 'grid' : 'flex', gridTemplateColumns: isMobile ? '1fr 1fr' : undefined,
          justifyContent: isMobile ? undefined : 'center', gap: isMobile ? 20 : 40, flexWrap: isMobile ? undefined : 'wrap',
        }}>
          {[
            { v: '13년', l: '외주 매칭 경험' },
            { v: '116,000+', l: '누적 프로젝트' },
            { v: '2,178억', l: '누적 거래 규모' },
            { v: '65,000+', l: '검증된 IT 파트너' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, color: C.blueSoft }}>{s.v}</div>
              <div style={{ fontSize: isMobile ? 12 : 14, color: C.textLight, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━ Social Proof — 사용 후기 ━━ */}
      <section style={{ background: C.bg, ...sectionPad }}>
        <h2 style={secTitle}>실제 사용자 후기</h2>
        <p style={{ fontSize: 16, color: C.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 44 }}>
          AI RFP Builder로 기획서를 완성한 분들의 이야기
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {[
            { name: '김태현', role: '스타트업 대표', text: '개발사에 보낼 기획서를 3일이나 쓰고 있었는데, 여기서 5분 만에 끝났어요. 개발사 대표님이 "이렇게 잘 정리된 RFP는 처음"이라고 하셨습니다.', rating: 5 },
            { name: '이수진', role: '기획자', text: '기능 우선순위랑 타임라인까지 자동으로 나와서 놀랐어요. ChatGPT한테 물어보면 뜬구름 잡는 소리만 하는데, 여기는 외주 맥락을 정확히 알고 있더라고요.', rating: 5 },
            { name: '박민수', role: '1인 사업자', text: '개발을 아예 몰라서 뭘 어떻게 요청해야 할지 막막했는데, AI가 질문해주니까 답만 하면 됐어요. 견적 받을 때 이 기획서 그대로 보냈습니다.', rating: 5 },
          ].map((review, i) => (
            <div key={i} style={{
              background: C.white, borderRadius: 16, padding: '24px',
              border: '1px solid rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {Array.from({ length: review.rating }).map((_, j) => (
                  <span key={j} style={{ color: '#FBBF24', fontSize: 16 }}>★</span>
                ))}
              </div>
              <p style={{ fontSize: 14, color: C.gray700, lineHeight: 1.7, marginBottom: 16 }}>
                &ldquo;{review.text}&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${C.blue}, ${C.blueLight})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: C.white,
                }}>{review.name[0]}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textDark }}>{review.name}</div>
                  <div style={{ fontSize: 12, color: C.gray500 }}>{review.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━ FAQ ━━ */}
      <section style={{ background: C.white, ...sectionPad }}>
        <h2 style={secTitle}>자주 묻는 질문</h2>
        <div style={{ maxWidth: 680, margin: '40px auto 0' }}>
          {[
            { q: '정말 무료인가요?', a: '네, 완전 무료입니다. 회원가입도 필요 없고, 이메일을 입력하면 완성된 기획서를 PDF로 받아보실 수 있습니다. 이메일 없이도 바로 시작할 수 있어요.' },
            { q: '기획서 완성까지 얼마나 걸리나요?', a: '평균 5분이면 충분합니다. AI가 7가지 핵심 질문을 하고, 답변만 해주시면 전문가 수준의 RFP 기획서가 자동 생성됩니다.' },
            { q: 'ChatGPT랑 뭐가 다른가요?', a: '위시켓의 13년 외주 매칭 경험(116,000건 프로젝트)이 반영되어 있습니다. 기능 우선순위(P1/P2/P3), 현실적 예산·일정 추정, 개발사에 바로 전달 가능한 포맷 등 외주에 특화된 결과물을 제공합니다.' },
            { q: '생성된 기획서를 수정할 수 있나요?', a: '기획서 완성 후 각 섹션별로 AI 재생성이 가능합니다. 원하는 부분만 다시 생성하여 수정할 수 있어요.' },
            { q: '개인정보는 안전한가요?', a: '입력하신 이메일은 기획서 발송에만 사용되며, 마케팅 목적으로 활용하지 않습니다. 프로젝트 정보는 기획서 생성에만 사용됩니다.' },
          ].map((faq, i) => (
            <details key={i} style={{
              borderBottom: `1px solid ${C.gray200}`,
              padding: '20px 0',
            }}>
              <summary style={{
                fontSize: isMobile ? 15 : 16, fontWeight: 600, color: C.textDark,
                cursor: 'pointer', listStyle: 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                {faq.q}
                <span style={{ fontSize: 20, color: C.gray400, transition: 'transform 0.2s' }}>+</span>
              </summary>
              <p style={{
                fontSize: 14, color: C.textMuted, lineHeight: 1.7,
                marginTop: 12, paddingRight: 24,
              }}>{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ━━ Final CTA ━━ */}
      <section style={{
        background: `linear-gradient(180deg, ${C.navyLight} 0%, ${C.navy} 100%)`,
        padding: isMobile ? '48px 16px' : '72px 24px', textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 800,
          color: C.white, lineHeight: 1.35, marginBottom: 14,
        }}>
          지금 바로 시작하세요
        </h2>
        <p style={{ fontSize: 16, color: C.textLight, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
          이메일을 입력하면 완성된 기획서를 <strong style={{ color: C.blueSoft }}>PDF로 보내드립니다.</strong>
          <br />이메일 없이도 바로 시작할 수 있어요.
        </p>

        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <form onSubmit={handleEmailStart} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 8 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="기획서 받을 이메일"
              style={{
                width: isMobile ? '100%' : 'auto', flex: isMobile ? undefined : 1, height: 52, padding: '0 18px', borderRadius: 12,
                border: '1.5px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)', color: C.white, fontSize: 15,
                outline: 'none', transition: 'all 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = C.blue; e.target.style.boxShadow = `0 0 0 3px ${C.blueGlow}`; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none'; }}
            />
            <button type="submit" disabled={loading} style={{
              width: isMobile ? '100%' : 'auto', padding: isMobile ? '0' : '0 24px', height: 52, borderRadius: 12, border: 'none',
              background: `linear-gradient(135deg, ${C.blue}, ${C.blueLight})`,
              color: C.white, fontSize: 16, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap',
              boxShadow: `0 4px 16px ${C.blueGlow}`,
            }}>
              {loading ? '...' : '시작하기 →'}
            </button>
          </form>

          <button onClick={handleGuestStart} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.gray400, fontSize: 14, padding: '12px 16px',
            textDecoration: 'underline', textUnderlineOffset: '3px',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = C.white; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.gray400; }}
          >
            이메일 없이 바로 시작하기
          </button>
        </div>
      </section>

      {/* ━━ Footer ━━ */}
      <footer style={{ background: C.gray50, borderTop: `1px solid ${C.gray200}`, padding: '44px 24px 28px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.gray600 }}>서비스 전체보기</span>
            {[
              { label: '위시켓', href: 'https://www.wishket.com', color: C.blue },
              { label: '요즘IT', href: 'https://yozm.wishket.com', color: '#F472B6' },
              { label: 'AI 진단', href: 'https://wishket-ai-diagnosis.vercel.app', color: '#10B981' },
            ].map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{
                fontSize: 14, color: C.gray500, textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                {s.label}
              </a>
            ))}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 24, marginBottom: 28,
          }}>
            <div>
              <div style={{ fontSize: 12, color: C.gray400, marginBottom: 4 }}>고객 문의</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.textDark }}>02-6925-4849</div>
              <div style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>10:00-18:00 주말·공휴일 제외</div>
              <div style={{ fontSize: 12, color: C.gray400 }}>help@wishket.com</div>
            </div>
            {[
              { title: '위시켓', links: ['위시켓 소개', '신뢰와 안전'] },
              { title: '이용방법', links: ['클라이언트 이용방법', '파트너 이용방법'] },
              { title: '고객센터', links: ['클라이언트 고객센터', '파트너 고객센터'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.gray700, marginBottom: 10 }}>{col.title}</div>
                {col.links.map(l => (
                  <div key={l} style={{ fontSize: 13, color: C.gray500, marginBottom: 6, cursor: 'pointer' }}>{l}</div>
                ))}
              </div>
            ))}
          </div>

          <div style={{
            borderTop: `1px solid ${C.gray200}`, paddingTop: 18,
            display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center',
          }}>
            <a href="https://www.wishket.com/terms/" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: C.gray500, textDecoration: 'none' }}>이용약관</a>
            <a href="https://www.wishket.com/privacy/" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, fontWeight: 700, color: C.gray700, textDecoration: 'none' }}>개인정보 처리방침</a>
            <span style={{ fontSize: 12, color: C.gray400 }}>
              (주)위시켓 | 대표이사 : 박우범 | 서울특별시 강남구 테헤란로 211 한국고등교육재단빌딩 3층
            </span>
          </div>
        </div>
      </footer>

      {/* ━━ Sticky Bottom Bar ━━ */}
      <StickyBar onStart={handleGuestStart} />
    </div>
  );
}

// ─── Sticky Bottom Bar ───
function StickyBar({ onStart }: { onStart: () => void }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const fn = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99,
      background: 'rgba(11, 17, 32, 0.95)', backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: isMobile ? '10px 16px' : '12px 24px',
    }}>
      <div style={{
        maxWidth: 1080, margin: '0 auto',
        display: isMobile ? 'flex' : 'flex', flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center', justifyContent: isMobile ? undefined : 'space-between',
        gap: isMobile ? 8 : 0,
      }}>
        {!isMobile && (
          <span style={{ fontSize: 15, color: '#CBD5E1' }}>
            내 프로젝트{' '}
            <span style={{ color: '#93C5FD', fontWeight: 600 }}>기획서</span>를 AI가 5분 만에 무료 작성
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 12, width: isMobile ? '100%' : 'auto' }}>
          {/* [PROBE:🔴해결] Sticky Bar → 바로 시작 (스크롤 아님) */}
          <button onClick={onStart} style={{
            padding: isMobile ? '10px 16px' : '10px 24px', borderRadius: 10, border: 'none',
            background: '#2563EB', color: '#FFFFFF', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 2px 12px rgba(37, 99, 235, 0.3)',
            flex: isMobile ? 1 : undefined,
          }}>
            바로 시작하기
          </button>
          <button onClick={() => setDismissed(true)} style={{
            background: 'none', border: 'none', color: '#94A3B8',
            cursor: 'pointer', fontSize: 18, padding: 4,
          }}>✕</button>
        </div>
      </div>
    </div>
  );
}
