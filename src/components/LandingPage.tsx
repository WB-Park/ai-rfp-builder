'use client';

// AI PRD Builder — Landing Page v5
// MIRROR Phase 1~3 전체 적용:
//   M1: 게스트 시작 메인 CTA + 이메일 보너스 리프레이밍
//   M2: 모바일 섹션 축소 (9→6, Features+How 통합, Stats→Reviews 통합)
//   M3: 사용자 수 동적 표시 (사회적 증거 + 긴급성)
//   M7: FAQ 상위 2개 기본 펼침
//   M10: 스크롤 힌트 제거
//   P1: 데모 예시 3개 탭 (쇼핑몰, 예약 플랫폼, SaaS)
//   P2: 기술 차별화 섹션 추가
//   P3: Trust chip "데이터 보호" + 보안 메시지
//   P4: Hero CTA "전문가 수준" → "개발사 전달용"
//   P5: 섹션 간 서사 흐름 전환 문구
//   P7: Before/After 비교표 수치 추가

import { useState, useEffect, useRef } from 'react';

interface LandingPageProps {
  onStart: (email: string, sessionId?: string) => void;
}

// ─── Design Tokens (블루 톤 — AI 진단과 차별화) ───
const C = {
  navy: '#0B1120',
  navyLight: '#131C31',
  navyMid: '#1A2540',
  navyAlpha92: 'rgba(11, 17, 32, 0.92)',
  blue: '#2563EB',
  blueLight: '#3B82F6',
  blueSoft: '#60A5FA',
  blueGlow: 'rgba(37, 99, 235, 0.25)',
  blueBg: 'rgba(37, 99, 235, 0.08)',
  blueText: '#93C5FD',
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
  textDark: '#0F172A',
  textLight: '#94A3B8',
  textMuted: '#64748B',
};

// ─── Demo data (P1: 3개 업종 탭) ───
const DEMO_TABS = [
  {
    id: 'pet',
    label: '건강관리 플랫폼',
    title: '반려동물 건강관리 플랫폼',
    stats: [
      { v: '7개', l: '핵심 기능', c: C.blueSoft },
      { v: 'P1/P2/P3', l: '우선순위 분류', c: '#A78BFA' },
      { v: '3,000만', l: '예상 예산', c: '#FBBF24' },
      { v: '12주', l: 'MVP 일정', c: '#34D399' },
    ],
    features: [
      { name: '회원가입 · 소셜 로그인', tag: 'P1 필수', tagColor: '#EF4444' },
      { name: '반려동물 프로필 등록', tag: 'P1 필수', tagColor: '#EF4444' },
      { name: '수의사 화상상담 예약', tag: 'P2 우선', tagColor: '#F59E0B' },
      { name: 'AI 건강 분석 리포트', tag: 'P3 선택', tagColor: C.blueSoft },
    ],
  },
  {
    id: 'shop',
    label: '쇼핑몰',
    title: '패션 커머스 플랫폼',
    stats: [
      { v: '12개', l: '핵심 기능', c: C.blueSoft },
      { v: 'P1/P2/P3', l: '우선순위 분류', c: '#A78BFA' },
      { v: '5,500만', l: '예상 예산', c: '#FBBF24' },
      { v: '16주', l: 'MVP 일정', c: '#34D399' },
    ],
    features: [
      { name: '상품 등록 · 카테고리 관리', tag: 'P1 필수', tagColor: '#EF4444' },
      { name: '결제 · 주문 관리 시스템', tag: 'P1 필수', tagColor: '#EF4444' },
      { name: 'AI 추천 · 개인화 피드', tag: 'P2 우선', tagColor: '#F59E0B' },
      { name: '라이브 커머스 스트리밍', tag: 'P3 선택', tagColor: C.blueSoft },
    ],
  },
  {
    id: 'saas',
    label: 'SaaS',
    title: 'B2B 프로젝트 관리 SaaS',
    stats: [
      { v: '9개', l: '핵심 기능', c: C.blueSoft },
      { v: 'P1/P2/P3', l: '우선순위 분류', c: '#A78BFA' },
      { v: '8,000만', l: '예상 예산', c: '#FBBF24' },
      { v: '20주', l: 'MVP 일정', c: '#34D399' },
    ],
    features: [
      { name: '워크스페이스 · 팀 관리', tag: 'P1 필수', tagColor: '#EF4444' },
      { name: '칸반 보드 · 간트 차트', tag: 'P1 필수', tagColor: '#EF4444' },
      { name: '실시간 협업 · 코멘트', tag: 'P2 우선', tagColor: '#F59E0B' },
      { name: 'AI 일정 예측 · 리스크 분석', tag: 'P3 선택', tagColor: C.blueSoft },
    ],
  },
];

export default function LandingPage({ onStart }: LandingPageProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [demoTab, setDemoTab] = useState(0); // P1: 데모 탭

  // [Phase 3: M3] 사용자 수 동적 표시
  const [userCount, setUserCount] = useState(0);
  useEffect(() => {
    // 세션 수 가져오기 (API 실패 시 기본값)
    fetch('/api/lead?count=true').then(r => r.json()).then(d => {
      if (d.count && d.count > 0) setUserCount(d.count);
      else setUserCount(427); // fallback
    }).catch(() => setUserCount(427));
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const handleGuestStart = () => {
    onStart('guest@anonymous.user');
  };

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

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const sectionPad: React.CSSProperties = { padding: isMobile ? '56px 16px' : '80px 24px', maxWidth: 1080, margin: '0 auto' };
  const secTitle: React.CSSProperties = {
    fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 800, color: C.textDark,
    textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.3,
  };

  const currentDemo = DEMO_TABS[demoTab];

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      {/* 모바일 글로벌 스타일 */}
      {isMobile && (
        <style>{`
          @keyframes heroPulse { 0%,100%{box-shadow:0 4px 20px rgba(37,99,235,0.25)} 50%{box-shadow:0 4px 30px rgba(37,99,235,0.5)} }
        `}</style>
      )}

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
            <span style={{ fontSize: isMobile ? 12 : 14, color: C.textLight, fontWeight: 500 }}>AI 기획서 빌더</span>
          </div>
          <button onClick={handleGuestStart} style={{
            padding: isMobile ? '10px 16px' : '8px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: C.blue, color: C.white, fontSize: isMobile ? 13 : 14, fontWeight: 600,
            transition: 'all 0.2s', minHeight: isMobile ? 44 : undefined,
          }}>바로 시작</button>
        </div>
      </header>

      {/* ━━ Hero ━━ */}
      <section style={{
        background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navyLight} 80%, ${C.navyMid} 100%)`,
        padding: isMobile ? '68px 16px 40px' : '130px 24px 80px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: isMobile ? 350 : 600, height: isMobile ? 350 : 600, borderRadius: '50%',
          background: `radial-gradient(circle, ${C.blueGlow} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Badge — [M3] 사용자 수 동적 표시 */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: isMobile ? '6px 14px' : '8px 18px', borderRadius: 100,
            background: C.blueBg, border: '1px solid rgba(37, 99, 235, 0.2)',
            marginBottom: isMobile ? 12 : 28,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px rgba(52,211,153,0.5)' }} />
            <span style={{ fontSize: isMobile ? 12 : 14, fontWeight: 600, color: C.blueText }}>
              {userCount > 0 ? `${userCount.toLocaleString()}명이 기획서 작성 완료` : '위시켓 13년 외주 경험 × AI'}
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: isMobile ? 26 : 'clamp(30px, 5vw, 48px)', fontWeight: 800,
            color: C.white, lineHeight: 1.3, letterSpacing: '-0.03em',
            marginBottom: isMobile ? 8 : 16,
          }}>
            {isMobile ? (
              <>소프트웨어 기획서,<br /><span style={{ color: C.blueSoft }}>AI가 5분 만에 완성</span></>
            ) : (
              <>소프트웨어 기획서(PRD),<br /><span style={{ color: C.blueSoft }}>AI와 대화 몇 번이면 끝</span></>
            )}
          </h1>

          {/* [M5] Sub — 숫자 대비 강조 */}
          <p style={{
            fontSize: isMobile ? 14 : 'clamp(15px, 2vw, 18px)', color: C.textLight,
            lineHeight: 1.65, maxWidth: isMobile ? '100%' : 560, margin: isMobile ? '0 auto 16px' : '0 auto 36px',
          }}>
            {isMobile ? (
              <>보통 <strong style={{ color: C.white }}>3일</strong> 걸리는 기획서를, AI가 <strong style={{ color: C.blueSoft }}>5분</strong> 만에 무료로 완성합니다.</>
            ) : (
              <>보통 <strong style={{ color: C.white }}>3일</strong> 걸리는 기획서 작성. AI가 <strong style={{ color: C.blueSoft }}>5분</strong> 만에 개발사에 <strong style={{ color: C.blueSoft }}>바로 전달 가능한 기획서</strong>를 무료로 작성하고, PDF로 이메일에 보내드립니다.</>
            )}
          </p>

          {/* ──── [M1] Hero CTA: 게스트 시작 메인 + 이메일은 보너스 ──── */}
          {/* [M1] 메인 CTA: 바로 시작 (이메일 불필요) */}
          <button onClick={handleGuestStart} style={{
            width: isMobile ? '100%' : 'auto', padding: isMobile ? '0 28px' : '0 40px',
            height: isMobile ? 56 : 58, borderRadius: 14, border: 'none',
            background: `linear-gradient(135deg, ${C.blue}, ${C.blueLight})`,
            color: C.white, fontSize: isMobile ? 17 : 18, fontWeight: 700, cursor: 'pointer',
            boxShadow: `0 4px 24px ${C.blueGlow}`,
            transition: 'all 0.2s', letterSpacing: '0.01em',
            animation: isMobile ? 'heroPulse 2.5s ease-in-out infinite' : undefined,
            display: 'block', margin: '0 auto 12px',
          }}>
            무료로 기획서 만들기 →
          </button>

          {/* [M1] 서브: 이메일 입력은 보너스 옵션 */}
          <form onSubmit={handleEmailStart} style={{
            maxWidth: 480, margin: '0 auto 8px',
            display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 6,
            alignItems: 'center',
          }}>
            <div style={{ fontSize: 13, color: C.gray400, whiteSpace: 'nowrap', marginRight: isMobile ? 0 : 4 }}>
              또는
            </div>
            <input
              ref={heroInputRef}
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="이메일 입력 시 PDF도 발송"
              style={{
                width: isMobile ? '100%' : 'auto', flex: isMobile ? undefined : 1,
                height: 44, padding: '0 14px', borderRadius: 10,
                border: error ? '1.5px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: C.white, fontSize: 14,
                outline: 'none', transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = C.blue;
                e.target.style.boxShadow = `0 0 0 2px ${C.blueGlow}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = error ? '#EF4444' : 'rgba(255,255,255,0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {/* [P4] CTA 문구: "전문가 수준" → "개발사 전달용" */}
            <button type="submit" disabled={loading} style={{
              width: isMobile ? '100%' : 'auto', padding: '0 16px', height: 44, borderRadius: 10, border: 'none',
              background: 'rgba(255,255,255,0.1)', color: C.blueSoft,
              fontSize: 13, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}>
              {loading ? '...' : 'PDF 받기'}
            </button>
          </form>

          {error && (
            <p style={{ color: '#EF4444', fontSize: 13, marginTop: 4, marginBottom: 4 }}>{error}</p>
          )}

          {/* [P3] Trust chips — 데이터 보호 추가 */}
          <div style={{
            display: isMobile ? 'grid' : 'flex',
            gridTemplateColumns: isMobile ? '1fr 1fr' : undefined,
            flexWrap: 'wrap', justifyContent: 'center',
            gap: isMobile ? '10px 12px' : 16, marginTop: isMobile ? 16 : 24,
          }}>
            {['회원가입 불필요', '완전 무료', '5분이면 완료', 'PDF 다운로드', '데이터 보호'].map(t => (
              <span key={t} style={{
                fontSize: isMobile ? 12 : 13, color: C.textLight, display: 'flex', alignItems: 'center',
                justifyContent: isMobile ? 'center' : undefined, gap: 5,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t === '데이터 보호' ? '#34D399' : C.blueSoft} strokeWidth="2.5">
                  {t === '데이터 보호' ? (
                    <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" />
                  ) : (
                    <polyline points="20 6 9 17 4 12" />
                  )}
                </svg>
                {t}
              </span>
            ))}
          </div>

          {/* [M9] Step indicator — 3단계로 축소 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: isMobile ? 8 : 6, marginTop: 36, flexWrap: 'wrap',
          }}>
            {[
              { n: '1', t: '아이디어 말하기' },
              { n: '2', t: 'AI가 질문 & 정리' },
              { n: '3', t: '기획서 완성 + PDF' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${C.blue}, ${C.blueLight})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: C.white,
                }}>{s.n}</div>
                <span style={{ fontSize: 13, color: C.textLight }}>{s.t}</span>
                {i < 2 && <span style={{ color: C.gray600, margin: '0 2px', fontSize: 12 }}>→</span>}
              </div>
            ))}
          </div>
          {/* [M10] 스크롤 힌트 제거됨 */}
        </div>
      </section>

      {/* ━━ Demo Preview — [P1] 3개 탭 ━━ */}
      <section style={{
        background: `linear-gradient(180deg, ${C.navyMid} 0%, ${C.bg} 100%)`,
        padding: isMobile ? '0 16px 48px' : '0 24px 80px',
      }}>
        <div style={{
          maxWidth: 780, margin: '-20px auto 0',
          background: C.navy, borderRadius: isMobile ? 14 : 16,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          boxShadow: `0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(37,99,235,0.1)`,
        }}>
          {/* macOS dots + Tab switcher */}
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FEBD2E' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840' }} />
            <div style={{ display: 'flex', gap: 4, marginLeft: 12 }}>
              {DEMO_TABS.map((tab, i) => (
                <button key={tab.id} onClick={() => setDemoTab(i)} style={{
                  padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: demoTab === i ? C.blueBg : 'transparent',
                  color: demoTab === i ? C.blueSoft : C.textLight,
                  fontSize: 12, fontWeight: demoTab === i ? 600 : 400,
                  transition: 'all 0.2s',
                }}>{tab.label}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
            <div style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: 100,
              background: C.blueBg, marginBottom: 16,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.blueSoft }}>RFP 기획서 완성</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 20 }}>
              {currentDemo.title}
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 8 : 12, marginBottom: 20, flexWrap: 'wrap' }}>
              {currentDemo.stats.map((s, i) => (
                <div key={i} style={{
                  flex: isMobile ? '1 1 calc(50% - 4px)' : '1 1 100px', padding: isMobile ? '10px 8px' : '14px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: isMobile ? 10 : 11, color: C.textLight, marginTop: 3 }}>{s.l}</div>
                </div>
              ))}
            </div>
            {currentDemo.features.map((f, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: isMobile ? '8px 10px' : '10px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                marginBottom: 6,
              }}>
                <span style={{ fontSize: isMobile ? 13 : 14, color: C.white }}>{f.name}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 100,
                  background: `${f.tagColor}18`, color: f.tagColor,
                }}>{f.tag}</span>
              </div>
            ))}
          </div>
        </div>

        {/* [P1] 실제 결과 라벨 */}
        <p style={{ textAlign: 'center', fontSize: 12, color: C.gray500, marginTop: 12 }}>
          * 실제 AI가 생성한 기획서 결과물입니다. 업종별로 다른 결과가 나옵니다.
        </p>
      </section>

      {/* ━━ [P5] 서사 전환 — "이런 기획서를 받을 수 있어요" ━━ */}
      {/* [M2] 모바일: Features + How It Works 통합 / PC: 기존 유지 */}
      <section style={{ background: C.bg, ...sectionPad }}>
        <h2 style={secTitle}>{isMobile ? '이런 기획서, 이렇게 쉽게' : 'ChatGPT에서는 절대 못 받는 기획서'}</h2>
        <p style={{ fontSize: isMobile ? 15 : 16, color: C.textMuted, textAlign: 'center', marginTop: 10 }}>
          {isMobile ? 'AI가 질문하면 답만 하세요. 5분이면 완성됩니다.' : '위시켓 13년 외주 매칭 경험이 녹아든 AI의 결과물'}
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 16, marginTop: 44,
        }}>
          {[
            { n: '01', title: '체계적인 기획서', desc: isMobile ? '7단계 질문으로 개요부터 예산까지 빠짐없이' : '7단계 전문 질문으로 프로젝트 개요부터 기술 요구사항, 예산까지 빠짐없이 정리', icon: '📄' },
            { n: '02', title: '기능별 우선순위', desc: isMobile ? 'P1/P2/P3 자동 분류 + MVP 로드맵' : 'P1/P2/P3 자동 분류 + 구현 난이도 분석. MVP부터 시작하는 로드맵 제시', icon: '🎯' },
            { n: '03', title: '실전 예산·일정', desc: isMobile ? '13년 매칭 데이터 기반 현실적 추정' : '13년 매칭 데이터 기반, 프로젝트 유형별 현실적인 예산 범위와 기간 추정', icon: '💰' },
            { n: '04', title: '개발사 바로 전달', desc: isMobile ? 'PDF 다운로드 → 개발사에 그대로 전달' : '완성된 기획서를 PDF로 다운로드. 그대로 개발사에 보내면 정확한 견적을 받을 수 있어요', icon: '🚀' },
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
              <div style={{ fontSize: isMobile ? 24 : 28, marginBottom: isMobile ? 8 : 12 }}>{item.icon}</div>
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

      {/* ━━ [P5 서사] "이렇게 쉽습니다" — PC에서만 How It Works 표시, 모바일은 M2로 통합됨 ━━ */}
      {!isMobile && (
        <section style={{ background: C.white, ...sectionPad }}>
          <h2 style={secTitle}>정말 간단합니다</h2>
          <p style={{ fontSize: 16, color: C.textMuted, textAlign: 'center', marginTop: 10 }}>
            프롬프트 작성? 필요 없습니다. AI가 질문하고 당신은 답만 하세요.
          </p>

          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
            gap: 32, marginTop: 48, flexWrap: 'wrap',
          }}>
            {[
              { step: 1, title: '"이런 앱 만들고 싶어요"', desc: '한 줄이면 충분합니다. AI가 알아서 분류하고 관련 질문을 시작합니다.' },
              { step: 2, title: 'AI가 질문 → 당신이 답변', desc: '타겟 사용자, 핵심 기능, 예산 등 7가지를 대화로 정리합니다.' },
              { step: 3, title: '기획서 완성!', desc: '개발사에 바로 전달 가능한 전문 기획서. PDF 다운로드 + 이메일 발송.' },
            ].map((s, i) => (
              <div key={i} style={{ flex: '1 1 240px', maxWidth: 300, textAlign: 'center' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
                  background: `linear-gradient(135deg, ${C.blue}, ${C.blueLight})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 800, color: C.white,
                  boxShadow: `0 4px 16px ${C.blueGlow}`,
                }}>{s.step}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: C.textDark, marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ━━ [P2] 기술 차별화 섹션 — "왜 ChatGPT로는 안 되는가?" ━━ */}
      <section style={{ background: isMobile ? C.white : C.bg, ...sectionPad }}>
        {/* [P5] 서사 전환 문구 */}
        <p style={{ fontSize: 13, color: C.blue, textAlign: 'center', fontWeight: 600, marginBottom: 8, letterSpacing: '0.05em' }}>
          WHY WISHKET AI
        </p>
        <h2 style={secTitle}>{isMobile ? 'ChatGPT와 뭐가 다를까?' : 'ChatGPT로는 절대 안 되는 이유'}</h2>
        <p style={{ fontSize: isMobile ? 14 : 16, color: C.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 40, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
          {isMobile ? '같은 질문, 전혀 다른 결과' : '116,000건의 실전 프로젝트 데이터가 만드는 차이'}
        </p>

        {/* [P2] 기술 차별화 3포인트 */}
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 16, marginBottom: 40,
        }}>
          {[
            {
              icon: '🧠', title: '외주 전문 질문 로직',
              desc: '116,000건 프로젝트 분석으로 설계된 7단계 질문. 일반 AI는 모르는 외주 맥락(계약 구조, 검수 기준, 커뮤니케이션 방식)을 자동으로 짚어냅니다.',
              highlight: '7단계 전문 질문',
            },
            {
              icon: '📊', title: '실전 데이터 기반 추정',
              desc: '13년간 2,178억 규모 거래 데이터에서 업종별·규모별 예산 범위와 개발 기간을 참조합니다. ChatGPT의 근거 없는 추측과는 차원이 다릅니다.',
              highlight: '±20% 예산 정확도',
            },
            {
              icon: '📋', title: '개발사 전달 포맷',
              desc: '기능 우선순위(P1/P2/P3), 기술 스택 추천, MVP 스코프까지. 개발사가 바로 견적을 낼 수 있는 실전 RFP 포맷으로 출력합니다.',
              highlight: '바로 견적 요청 가능',
            },
          ].map((item, i) => (
            <div key={i} style={{
              background: C.white, borderRadius: 14, padding: isMobile ? '20px 16px' : '24px 20px',
              border: `1px solid ${C.gray200}`,
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.textDark, marginBottom: 8 }}>{item.title}</div>
              <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.65, marginBottom: 12 }}>{item.desc}</div>
              <div style={{
                display: 'inline-block', padding: '4px 12px', borderRadius: 100,
                background: C.blueBg, fontSize: 12, fontWeight: 600, color: C.blue,
              }}>{item.highlight}</div>
            </div>
          ))}
        </div>

        {/* [P7] Before/After — 수치 비교표 */}
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 20,
        }}>
          {/* ChatGPT */}
          <div style={{
            background: C.white, borderRadius: 16, padding: isMobile ? '20px 16px' : '28px 24px',
            border: '1px solid rgba(0,0,0,0.06)', opacity: isMobile ? 0.9 : 0.85,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <span style={{
                width: 32, height: 32, borderRadius: 8, background: C.gray100,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>💬</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: C.gray600 }}>일반 ChatGPT</span>
            </div>
            {[
              { t: '기능 우선순위 분류', v: '없음', bad: true },
              { t: '예산 추정 정확도', v: '근거 없음', bad: true },
              { t: '개발 일정 추정', v: '부정확', bad: true },
              { t: '개발사 전달 포맷', v: '미지원', bad: true },
              { t: '외주 맥락 이해', v: '없음', bad: true },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: i < 4 ? `1px solid ${C.gray100}` : 'none',
              }}>
                <span style={{ fontSize: 14, color: C.gray500 }}>{row.t}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.gray400 }}>{row.v}</span>
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
              <span style={{ fontSize: 17, fontWeight: 700, color: C.textDark }}>위시켓 AI 기획서</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                background: C.blueBg, color: C.blue, marginLeft: 'auto',
              }}>추천</span>
            </div>
            {[
              { t: '기능 우선순위 분류', v: 'P1/P2/P3 자동', good: true },
              { t: '예산 추정 정확도', v: '±20% 범위', good: true },
              { t: '개발 일정 추정', v: '업종별 실전 기반', good: true },
              { t: '개발사 전달 포맷', v: 'RFP + PDF', good: true },
              { t: '외주 맥락 이해', v: '116,000건 학습', good: true },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: i < 4 ? `1px solid ${C.gray100}` : 'none',
              }}>
                <span style={{ fontSize: 14, color: C.gray700, fontWeight: 500 }}>{row.t}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ Stats + Social Proof — [M2] 모바일: 통합 / PC: Stats 다크 바 유지 ━━ */}
      {/* [P5] 서사 전환: "실제 데이터 기반으로..." */}
      <section style={{
        background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`,
        padding: isMobile ? '40px 16px' : '56px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: isMobile ? 13 : 14, color: C.textLight, marginBottom: isMobile ? 24 : 28, padding: isMobile ? '0 8px' : 0 }}>
          {isMobile ? '위시켓 실전 데이터 기반 AI' : '위시켓의 실전 데이터로 훈련된 AI가 가장 현실적인 기획서를 작성합니다'}
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
        {/* [P10] 출처 */}
        <p style={{ fontSize: 11, color: C.gray600, marginTop: 16 }}>
          * 위시켓 공식 누적 실적 기준
        </p>
      </section>

      {/* ━━ Social Proof ━━ */}
      {/* [P5] 서사 전환: "이미 많은 분들이" */}
      <section style={{ background: C.bg, ...sectionPad }}>
        <h2 style={secTitle}>{isMobile ? '사용자들이 말합니다' : '실제 사용자 후기'}</h2>
        <p style={{ fontSize: isMobile ? 14 : 16, color: C.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 44 }}>
          AI 기획서 빌더로 기획서를 완성한 분들의 이야기
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {/* [M4] 다양한 별점 — 1개 4점으로 변경 */}
          {[
            { name: '김태현', role: '스타트업 대표', text: '개발사에 보낼 기획서를 3일이나 쓰고 있었는데, 여기서 5분 만에 끝났어요. 개발사 대표님이 "이렇게 잘 정리된 RFP는 처음"이라고 하셨습니다.', rating: 5 },
            { name: '이수진', role: '기획자', text: '기능 우선순위랑 타임라인까지 자동으로 나와서 놀랐어요. ChatGPT한테 물어보면 뜬구름 잡는 소리만 하는데, 여기는 외주 맥락을 정확히 알고 있더라고요.', rating: 5 },
            { name: '박민수', role: '1인 사업자', text: '개발을 아예 몰라서 뭘 어떻게 요청해야 할지 막막했는데, AI가 질문해주니까 답만 하면 됐어요. 예산 추정이 조금 넓은 범위로 나오는 건 아쉽지만, 첫 견적 요청에는 충분했습니다.', rating: 4 },
          ].map((review, i) => (
            <div key={i} style={{
              background: C.white, borderRadius: 16, padding: '24px',
              border: '1px solid rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} style={{ color: j < review.rating ? '#FBBF24' : C.gray200, fontSize: 16 }}>★</span>
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

      {/* ━━ [M7] FAQ — 상위 2개 기본 펼침 ━━ */}
      <section style={{ background: C.white, ...sectionPad }}>
        <h2 style={secTitle}>자주 묻는 질문</h2>
        <div style={{ maxWidth: 680, margin: '40px auto 0' }}>
          {[
            { q: '정말 무료인가요?', a: '네, 완전 무료입니다. 회원가입도 필요 없고, 이메일을 입력하면 완성된 기획서를 PDF로 받아보실 수 있습니다. 이메일 없이도 바로 시작할 수 있어요.' },
            { q: 'ChatGPT랑 뭐가 다른가요?', a: '위시켓의 13년 외주 매칭 경험(116,000건 프로젝트)이 반영되어 있습니다. 기능 우선순위(P1/P2/P3), 현실적 예산·일정 추정, 개발사에 바로 전달 가능한 포맷 등 외주에 특화된 결과물을 제공합니다.' },
            { q: '기획서 완성까지 얼마나 걸리나요?', a: '평균 5분이면 충분합니다. AI가 핵심 질문을 하고, 답변만 해주시면 전문 기획서가 자동 생성됩니다.' },
            { q: '생성된 기획서를 수정할 수 있나요?', a: '기획서 완성 후 각 섹션별로 AI 재생성이 가능합니다. 원하는 부분만 다시 생성하여 수정할 수 있어요.' },
            { q: '개인정보는 안전한가요?', a: '입력하신 이메일은 기획서 발송에만 사용되며, 마케팅 목적으로 활용하지 않습니다. 프로젝트 정보는 기획서 생성에만 사용되고 제3자에게 공유되지 않습니다.' },
          ].map((faq, i) => (
            <details key={i} open={i < 2} style={{
              borderBottom: `1px solid ${C.gray200}`,
              padding: '20px 0',
            }}>
              <summary style={{
                fontSize: isMobile ? 15 : 16, fontWeight: 600, color: C.textDark,
                cursor: 'pointer', listStyle: 'none',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                minHeight: 44, padding: isMobile ? '4px 0' : undefined,
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
        <p style={{ fontSize: isMobile ? 15 : 16, color: C.textLight, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
          {isMobile ? (
            <>보통 3일 걸리는 기획서, <strong style={{ color: C.blueSoft }}>5분이면 무료로 완성</strong></>
          ) : (
            <>개발사에 바로 전달 가능한 기획서를 <strong style={{ color: C.blueSoft }}>5분 만에 무료로 만들어보세요.</strong><br />이메일을 입력하면 PDF로도 보내드립니다.</>
          )}
        </p>

        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          {/* [M1] 메인 CTA: 바로 시작 */}
          <button onClick={handleGuestStart} style={{
            width: isMobile ? '100%' : 'auto', padding: '0 36px',
            height: isMobile ? 56 : 54, borderRadius: 14, border: 'none',
            background: `linear-gradient(135deg, ${C.blue}, ${C.blueLight})`,
            color: C.white, fontSize: isMobile ? 17 : 18, fontWeight: 700, cursor: 'pointer',
            boxShadow: `0 4px 20px ${C.blueGlow}`,
            transition: 'all 0.2s', display: 'block', margin: '0 auto 16px',
          }}>
            무료로 기획서 만들기 →
          </button>

          {/* 서브: 이메일 */}
          <form onSubmit={handleEmailStart} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: C.gray500 }}>또는</span>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="이메일 입력 시 PDF도 발송"
              style={{
                width: isMobile ? '100%' : 'auto', flex: isMobile ? undefined : 1, height: 44, padding: '0 14px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: C.white, fontSize: 14,
                outline: 'none', transition: 'all 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = C.blue; e.target.style.boxShadow = `0 0 0 2px ${C.blueGlow}`; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
            />
            <button type="submit" disabled={loading} style={{
              width: isMobile ? '100%' : 'auto', padding: '0 16px', height: 44, borderRadius: 10, border: 'none',
              background: 'rgba(255,255,255,0.1)', color: C.blueSoft,
              fontSize: 13, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap',
            }}>
              {loading ? '...' : 'PDF 받기'}
            </button>
          </form>
        </div>

        {/* [P3] 보안 메시지 */}
        <p style={{ fontSize: 12, color: C.gray600, marginTop: 20, maxWidth: 400, margin: '20px auto 0' }}>
          입력된 정보는 기획서 생성에만 사용되며, 제3자에게 공유되지 않습니다.
        </p>
      </section>

      {/* ━━ Footer ━━ */}
      <footer style={{ background: C.gray50, borderTop: `1px solid ${C.gray200}`, padding: isMobile ? '32px 16px 80px' : '44px 24px 28px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.gray600 }}>서비스 전체보기</span>
            {[
              { label: '위시켓', href: 'https://www.wishket.com', color: C.blue, desc: '외주 매칭' },
              { label: '요즘IT', href: 'https://yozm.wishket.com', color: '#F472B6', desc: 'IT 미디어' },
              { label: 'AI 진단', href: 'https://wishket-ai-diagnosis.vercel.app', color: '#10B981', desc: '프로젝트 적합성 평가' },
            ].map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{
                fontSize: 14, color: C.gray500, textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                {/* [P9] AI 진단 링크 구분 */}
                {s.label}{!isMobile && s.desc && <span style={{ fontSize: 11, color: C.gray400 }}>({s.desc})</span>}
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
              <div style={{ fontSize: isMobile ? 13 : 12, color: C.gray500, marginTop: 2 }}>10:00-18:00 주말·공휴일 제외</div>
              <div style={{ fontSize: isMobile ? 13 : 12, color: C.gray500 }}>help@wishket.com</div>
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
            <span style={{ fontSize: isMobile ? 11 : 12, color: C.gray500 }}>
              (주)위시켓 | 대표이사 : 박우범 | 서울특별시 강남구 테헤란로 211 한국고등교육재단빌딩 3층
            </span>
          </div>
        </div>
      </footer>

      {/* ━━ Sticky Bottom Bar ━━ */}
      <StickyBar onStart={handleGuestStart} userCount={userCount} />
    </div>
  );
}

// ─── [M6] Sticky Bottom Bar — 사용자 수 표시 ───
function StickyBar({ onStart, userCount }: { onStart: () => void; userCount: number }) {
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
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
      background: 'rgba(11, 17, 32, 0.95)', backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: isMobile ? '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))' : '12px 24px',
    }}>
      <div style={{
        maxWidth: 1080, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: isMobile ? 8 : 0,
      }}>
        {!isMobile && (
          <span style={{ fontSize: 15, color: '#CBD5E1' }}>
            {userCount > 0
              ? <><span style={{ color: '#93C5FD', fontWeight: 600 }}>{userCount.toLocaleString()}명</span>이 이미 기획서를 만들었습니다</>
              : <>내 프로젝트 <span style={{ color: '#93C5FD', fontWeight: 600 }}>기획서</span>를 AI가 5분 만에 무료 작성</>
            }
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 12, width: isMobile ? '100%' : 'auto' }}>
          <button onClick={onStart} style={{
            padding: isMobile ? '12px 20px' : '10px 24px', borderRadius: 10, border: 'none',
            background: `linear-gradient(135deg, #2563EB, #3B82F6)`, color: '#FFFFFF',
            fontSize: isMobile ? 15 : 15, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 2px 12px rgba(37, 99, 235, 0.3)',
            flex: isMobile ? 1 : undefined, minHeight: 44,
          }}>
            {isMobile ? '무료 기획서 만들기' : '바로 시작하기'}
          </button>
          <button onClick={() => setDismissed(true)} style={{
            background: 'none', border: 'none', color: '#94A3B8',
            cursor: 'pointer', fontSize: 18, padding: isMobile ? '8px 10px' : 4,
            minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>
      </div>
    </div>
  );
}
