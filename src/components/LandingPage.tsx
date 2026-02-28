'use client';

// AI RFP Builder — Landing Page
// 위시켓 AI 진단 서비스(wishket-ai-diagnosis) 디자인 시스템 참조
// 다크 네이비 + 민트그린 악센트, 동일 헤더/푸터 구조

import { useState, useEffect } from 'react';

interface LandingPageProps {
  onStart: (email: string, sessionId?: string) => void;
}

// ─── Design Tokens (위시켓 AI 진단 동일) ───
const C = {
  navy: '#0F172A',
  navyLight: '#1E293B',
  navyAlpha: 'rgba(15, 23, 42, 0.92)',
  mint: '#10B981',
  mintHover: '#059669',
  mintLight: 'rgba(16, 185, 129, 0.15)',
  mintText: '#34D399',
  bg: '#F5F5F7',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  textDark: '#1E293B',
  textLight: '#94A3B8',
  textMuted: '#64748B',
};

export default function LandingPage({ onStart }: LandingPageProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      if (data.error) setError(data.error);
      else onStart(email, data.sessionId);
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToCTA = () => {
    document.getElementById('cta-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // ─── Shared Styles ───
  const sectionPadding = { padding: '80px 24px', maxWidth: 1080, margin: '0 auto' };
  const sectionTitle: React.CSSProperties = {
    fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, color: C.textDark,
    textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.3,
  };
  const sectionSub: React.CSSProperties = {
    fontSize: 16, color: C.textMuted, textAlign: 'center', marginTop: 12,
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>

      {/* ━━ Header (위시켓 AI 진단 동일) ━━ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? C.navyAlpha : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        transition: 'all 0.3s ease',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 24px',
          height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 20, fontWeight: 800, color: C.white,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>wishket</span>
            <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
            <span style={{ fontSize: 14, color: C.textLight, fontWeight: 500 }}>AI 기획서</span>
          </div>
          <button onClick={scrollToCTA} style={{
            padding: '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: C.mint, color: C.white, fontSize: 14, fontWeight: 600,
            transition: 'all 0.2s ease',
          }}>무료로 시작</button>
        </div>
      </header>

      {/* ━━ Hero Section (다크 배경) ━━ */}
      <section style={{
        background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navyLight} 100%)`,
        padding: '140px 24px 80px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 18px', borderRadius: 100,
            background: C.mintLight, marginBottom: 32,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.mint }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: C.mintText }}>
              위시켓이 만든 무료 AI 기획서
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800,
            color: C.white, lineHeight: 1.2, letterSpacing: '-0.03em',
            marginBottom: 8,
          }}>
            소프트웨어 외주,
          </h1>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800,
            color: C.mintText, lineHeight: 1.2, letterSpacing: '-0.03em',
            marginBottom: 24,
          }}>
            기획서부터 AI로 정확하게
          </h1>

          {/* Sub */}
          <p style={{ fontSize: 'clamp(16px, 2vw, 18px)', color: C.textLight, lineHeight: 1.6, marginBottom: 40 }}>
            아이디어를 입력하면 <span style={{ color: C.mintText, fontWeight: 600 }}>
            개발사에 바로 전달할 수 있는 RFP 기획서</span>를<br />
            AI가 5분 내에 무료로 작성해드립니다.
          </p>

          {/* CTA */}
          <button onClick={scrollToCTA} style={{
            padding: '18px 48px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${C.mint}, #059669)`,
            color: C.white, fontSize: 18, fontWeight: 700,
            boxShadow: '0 4px 24px rgba(16, 185, 129, 0.35)',
            transition: 'all 0.2s ease',
          }}>
            지금 무료 기획서 받기 (5분 소요) →
          </button>

          {/* Trust chips */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: 16, marginTop: 28,
          }}>
            {['회원가입 불필요', '완전 무료', '5분이면 완료', '바로 다운로드'].map(t => (
              <span key={t} style={{
                fontSize: 13, color: C.textLight, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.mint} strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t}
              </span>
            ))}
          </div>

          {/* Step indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, marginTop: 40,
          }}>
            {[
              { n: '1', t: '프로젝트 설명' },
              { n: '2', t: '타겟/기능 정리' },
              { n: '3', t: '예산/일정' },
              { n: '4', t: 'RFP 완성' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: C.mint,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: C.white,
                }}>{s.n}</div>
                <span style={{ fontSize: 13, color: C.textLight }}>{s.t}</span>
                {i < 3 && <span style={{ color: C.textLight, margin: '0 4px' }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Demo Preview (다크 카드) ━━ */}
      <section style={{
        background: `linear-gradient(180deg, ${C.navyLight} 0%, ${C.bg} 100%)`,
        padding: '0 24px 80px',
      }}>
        <div style={{
          maxWidth: 800, margin: '0 auto',
          background: C.navy, borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
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
              AI RFP 기획서 — 반려동물 건강관리 플랫폼
            </span>
          </div>
          {/* Content preview */}
          <div style={{ padding: '24px 28px' }}>
            <div style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: 100,
              background: C.mintLight, marginBottom: 16,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.mint }}>✅ 기획서 완성</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 20 }}>
              반려동물 건강관리 플랫폼
            </div>
            {/* Stats row */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
              {[
                { v: '7개', l: '핵심 기능', c: C.mint },
                { v: 'P1/P2/P3', l: '우선순위 분류', c: '#60A5FA' },
                { v: '3,000만', l: '예상 예산', c: '#FBBF24' },
                { v: '12주', l: '예상 일정', c: '#A78BFA' },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: '1 1 120px', padding: '16px 14px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 12, color: C.textLight, marginTop: 4 }}>{s.l}</div>
                </div>
              ))}
            </div>
            {/* Feature list */}
            {[
              { name: '회원가입/로그인', tag: '필수', tagColor: '#EF4444' },
              { name: '반려동물 프로필 등록', tag: '필수', tagColor: '#EF4444' },
              { name: '수의사 화상상담 예약', tag: '우선', tagColor: '#F59E0B' },
            ].map((f, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                marginBottom: 8,
              }}>
                <span style={{ fontSize: 14, color: C.white }}>📋 {f.name}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 100,
                  background: `${f.tagColor}20`, color: f.tagColor,
                }}>{f.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ "이런 기획서를 받을 수 있어요" (라이트 배경) ━━ */}
      <section style={{ background: C.bg, ...sectionPadding }}>
        <h2 style={sectionTitle}>이런 기획서를 받을 수 있어요</h2>
        <p style={sectionSub}>ChatGPT에서는 받을 수 없는, 외주 전문 AI의 결과물</p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20, marginTop: 48,
        }}>
          {[
            { n: '01', title: '체계적인 RFP 문서', desc: '7단계 전문 질문으로 프로젝트 개요부터 기술 요구사항까지 빠짐없이 정리' },
            { n: '02', title: 'P1/P2/P3 우선순위', desc: '기능별 필수·우선·선택 자동 분류로 MVP 스코프와 개발 로드맵 제시' },
            { n: '03', title: '예산·일정 분석', desc: '13년 외주 매칭 데이터 기반, 현실적인 예산 범위와 개발 기간 추정' },
            { n: '04', title: '개발사 전달 가능', desc: '완성된 RFP를 그대로 개발사에 전달하면 정확한 견적을 받을 수 있습니다' },
          ].map(item => (
            <div key={item.n} style={{
              background: C.white, borderRadius: 16, padding: '32px 28px',
              border: '1px solid rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease',
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: C.mint, marginBottom: 12 }}>{item.n}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.textDark, marginBottom: 8 }}>{item.title}</div>
              <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━ "정말 간단한 대화형 질문" (How It Works) ━━ */}
      <section style={{ background: C.white, ...sectionPadding }}>
        <h2 style={sectionTitle}>정말 간단한 대화형 질문</h2>
        <p style={sectionSub}>AI와 대화하면서 자연스럽게 기획서가 완성됩니다</p>

        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          gap: 40, marginTop: 48, flexWrap: 'wrap',
        }}>
          {[
            { step: 1, title: '프로젝트 설명', desc: '"반려동물 건강관리 앱을 만들고 싶어요" 이 정도면 충분합니다' },
            { step: 2, title: 'AI가 질문하고 정리', desc: '타겟 사용자, 핵심 기능, 예산 등을 대화로 정리합니다' },
            { step: 3, title: 'RFP 기획서 완성', desc: '개발사에 바로 전달 가능한 전문 기획서가 완성됩니다' },
          ].map((s, i) => (
            <div key={i} style={{ flex: '1 1 260px', maxWidth: 300, textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
                background: `linear-gradient(135deg, ${C.mint}, #059669)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 800, color: C.white,
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
              }}>{s.step}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.textDark, marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━ Before/After 비교 ━━ */}
      <section style={{ background: C.bg, ...sectionPadding }}>
        <h2 style={sectionTitle}>ChatGPT vs 위시켓 AI RFP</h2>
        <p style={sectionSub}>같은 질문, 다른 결과. 외주 전문 AI의 차이</p>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24, marginTop: 48,
        }}>
          {/* ChatGPT */}
          <div style={{
            background: C.white, borderRadius: 16, padding: 32,
            border: '1px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 20 }}>❌</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.textDark }}>일반 ChatGPT</span>
            </div>
            {[
              '범용적인 답변, 외주 맥락 없음',
              '기능 우선순위 구분 못함',
              '예산·일정 추정 불가',
              '개발사에 전달할 수 없는 포맷',
              '매번 프롬프트를 다시 작성해야 함',
            ].map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 0', borderBottom: i < 4 ? `1px solid ${C.gray100}` : 'none',
              }}>
                <span style={{ fontSize: 14, color: C.gray400, flexShrink: 0 }}>😐</span>
                <span style={{ fontSize: 14, color: C.gray600 }}>{t}</span>
              </div>
            ))}
          </div>

          {/* 위시켓 AI */}
          <div style={{
            background: C.white, borderRadius: 16, padding: 32,
            border: `2px solid ${C.mint}`,
            boxShadow: '0 4px 24px rgba(16, 185, 129, 0.12)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.textDark }}>위시켓 AI RFP</span>
            </div>
            {[
              '외주 전문 7단계 질문으로 빈틈없는 기획',
              'P1/P2/P3 자동 분류, MVP 스코프 추천',
              '13년 데이터 기반 예산·일정 추정',
              '개발사에 바로 전달 가능한 RFP 포맷',
              '대화만 하면 자동으로 기획서 완성',
            ].map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 0', borderBottom: i < 4 ? `1px solid ${C.gray100}` : 'none',
              }}>
                <span style={{ fontSize: 14, color: C.mint, flexShrink: 0 }}>🚀</span>
                <span style={{ fontSize: 14, color: C.gray700 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Stats (다크 배경) ━━ */}
      <section style={{
        background: C.navy, padding: '60px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, color: C.textLight, marginBottom: 32 }}>
          실제 프로젝트 데이터로 훈련된 AI가 당신의 프로젝트에 가장 현실적인 기획서를 작성합니다
        </p>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap',
        }}>
          {[
            { v: '13년', l: '외주 매칭 경험' },
            { v: '116,000+', l: '누적 프로젝트' },
            { v: '2,178억', l: '누적 거래 규모' },
            { v: '65,000+', l: '검증된 IT 파트너' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: C.mintText }}>{s.v}</div>
              <div style={{ fontSize: 14, color: C.textLight, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━ Final CTA (다크 그라데이션) ━━ */}
      <section id="cta-section" style={{
        background: `linear-gradient(180deg, ${C.navyLight} 0%, ${C.navy} 100%)`,
        padding: '80px 24px', textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800,
          color: C.white, lineHeight: 1.3, marginBottom: 16,
        }}>
          정말 쉽습니다.<br />대화만 하면 기획서가 완성돼요
        </h2>
        <p style={{ fontSize: 16, color: C.textLight, marginBottom: 40 }}>
          이메일을 입력하면 AI가 5분 내에 전문 RFP 기획서를 무료로 작성해드립니다
        </p>

        {/* Email Form */}
        <form onSubmit={handleSubmit} style={{
          maxWidth: 480, margin: '0 auto', display: 'flex', gap: 10,
        }}>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="이메일을 입력하세요"
            style={{
              flex: 1, height: 52, padding: '0 18px', borderRadius: 12,
              border: error ? '1.5px solid #EF4444' : '1.5px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.06)', color: C.white, fontSize: 15,
              outline: 'none', transition: 'all 0.2s ease',
            }}
            onFocus={(e) => { e.target.style.borderColor = C.mint; e.target.style.background = 'rgba(255,255,255,0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = error ? '#EF4444' : 'rgba(255,255,255,0.15)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
          />
          <button type="submit" disabled={loading} style={{
            padding: '0 28px', height: 52, borderRadius: 12, border: 'none',
            background: `linear-gradient(135deg, ${C.mint}, #059669)`,
            color: C.white, fontSize: 16, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.2s ease',
          }}>
            {loading ? '...' : '무료로 시작 →'}
          </button>
        </form>

        {error && (
          <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{error}</p>
        )}

        {/* Trust chips */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          gap: 16, marginTop: 24,
        }}>
          {['회원가입 불필요', '완전 무료', '5분이면 완료', '바로 다운로드'].map(t => (
            <span key={t} style={{
              fontSize: 13, color: C.textLight, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.mint} strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ━━ Footer (위시켓 공통 푸터) ━━ */}
      <footer style={{ background: C.gray50, borderTop: `1px solid ${C.gray200}`, padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          {/* Service links */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32,
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.gray600 }}>서비스 전체보기</span>
            {[
              { label: '위시켓', href: 'https://www.wishket.com', color: C.mint },
              { label: '요즘IT', href: 'https://yozm.wishket.com', color: '#F472B6' },
              { label: 'AIDP', href: '#', color: '#60A5FA' },
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

          {/* Links grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 24, marginBottom: 32,
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

          {/* Legal */}
          <div style={{
            borderTop: `1px solid ${C.gray200}`, paddingTop: 20,
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

      {/* ━━ Sticky Bottom CTA (위시켓 AI 진단 동일) ━━ */}
      <StickyBar onStart={scrollToCTA} />
    </div>
  );
}

// ─── Sticky Bottom Bar ───
function StickyBar({ onStart }: { onStart: () => void }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99,
      background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '12px 24px',
    }}>
      <div style={{
        maxWidth: 1080, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 15, color: '#CBD5E1' }}>
          내 프로젝트{' '}
          <span style={{
            color: '#34D399', fontWeight: 600,
            textDecoration: 'underline', textUnderlineOffset: '3px',
          }}>기획서</span>를 AI가 5분 만에 작성해드립니다
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onStart} style={{
            padding: '10px 24px', borderRadius: 10, border: 'none',
            background: '#10B981', color: '#FFFFFF', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}>
            지금 시작하기
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
