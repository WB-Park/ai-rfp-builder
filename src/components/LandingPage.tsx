'use client';

// AI PRD Builder — Landing Page v6
// PROBE 검증 수정 + MIRROR 모바일 히어로 개선:
//   [GUARD] S1: Footer 죽은 링크 → <a> + 실제 URL
//   [GUARD] D1: userCount fallback 427 제거 → 0이면 대체 문구
//   [GUARD] S2: FAQ +/- 아이콘 → state 기반 회전 애니메이션
//   [GUARD] S3/D2: Final CTA 에러 독립 표시
//   [GUARD] S6: isMobile 초기값 FOUC 방지
//   [GUARD] D4: Footer 모바일 padding 조정
//   [GUARD] D5: 게스트 시작도 세션 기록 (리드 추적)
//   [ELEVATE] E-4: 비교표 직후 인라인 CTA
//   [ELEVATE] E-5: StickyBar 모바일 사회적 증거
//   [ELEVATE] E-6: 데모 탭 5초 자동 순환
//   [MIRROR] 모바일 히어로 간소화: 이메일폼 제거, 트러스트칩 3개, 스텝 제거, 호흡 공간 확보

import { useState, useEffect, useRef, useCallback } from 'react';

interface LandingPageProps {
  onStart: (email: string, sessionId?: string) => void;
}

// ─── Custom Hook: isMobile (중복 제거) ───
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth < breakpoint;
    return false;
  });
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return isMobile;
}

// ─── Design Tokens ───
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

// ─── Footer 링크 데이터 (S1: 실제 URL) ───
const FOOTER_COLS = [
  {
    title: '위시켓',
    links: [
      { label: '위시켓 소개', href: 'https://www.wishket.com/company/' },
      { label: '신뢰와 안전', href: 'https://www.wishket.com/trust/' },
    ],
  },
  {
    title: '이용방법',
    links: [
      { label: '클라이언트 이용방법', href: 'https://www.wishket.com/guide/client/' },
      { label: '파트너 이용방법', href: 'https://www.wishket.com/guide/partner/' },
    ],
  },
  {
    title: '고객센터',
    links: [
      { label: '클라이언트 고객센터', href: 'https://help.wishket.com/hc/ko' },
      { label: '파트너 고객센터', href: 'https://help.wishket.com/hc/ko' },
    ],
  },
];

export default function LandingPage({ onStart }: LandingPageProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [finalError, setFinalError] = useState(''); // [S3] Final CTA 독립 에러
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false); // [D5] 게스트 로딩
  const [scrolled, setScrolled] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [demoTab, setDemoTab] = useState(0);
  const [openFaq, setOpenFaq] = useState<number[]>([0, 1]); // [S2] FAQ state

  // [D1] 사용자 수 — fallback 제거
  const [userCount, setUserCount] = useState(0);
  useEffect(() => {
    fetch('/api/lead?count=true').then(r => r.json()).then(d => {
      if (d.count && d.count > 0) setUserCount(d.count);
      // fallback 없음 — 0이면 대체 문구 표시
    }).catch(() => { /* 0 유지 */ });
  }, []);

  // [E-6] 데모 탭 자동 순환 (5초)
  useEffect(() => {
    const timer = setInterval(() => {
      setDemoTab(prev => (prev + 1) % DEMO_TABS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // [D5] 게스트 시작 — 세션 기록 포함
  const handleGuestStart = useCallback(async () => {
    setGuestLoading(true);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'guest@anonymous.user', step: 'guest_start' }),
      });
      const data = await res.json();
      onStart('guest@anonymous.user', data.sessionId);
    } catch {
      onStart('guest@anonymous.user');
    } finally {
      setGuestLoading(false);
    }
  }, [onStart]);

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

  // [S3] Final CTA 전용 이메일 제출
  const handleFinalEmailStart = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFinalError('');
    if (!email || !email.includes('@')) {
      setFinalError('유효한 이메일을 입력해주세요.');
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
      if (data.error) setFinalError(data.error);
      else onStart(email, data.sessionId);
    } catch {
      setFinalError('네트워크 오류. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // [S6] FOUC 방지 — useIsMobile 커스텀 훅 사용
  const isMobile = useIsMobile();

  const sectionPad: React.CSSProperties = { padding: isMobile ? '56px 16px' : '80px 24px', maxWidth: 1080, margin: '0 auto' };
  const secTitle: React.CSSProperties = {
    fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 800, color: C.textDark,
    textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.3,
  };

  const currentDemo = DEMO_TABS[demoTab];

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      {/* 모바일 글로벌 스타일 */}
      <style>{`
        @keyframes heroPulse { 0%,100%{box-shadow:0 4px 20px rgba(37,99,235,0.25)} 50%{box-shadow:0 4px 30px rgba(37,99,235,0.5)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

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
            <span style={{ fontSize: isMobile ? 12 : 14, color: C.textLight, fontWeight: 500 }}>AI 개발문서 빌더</span>
          </div>
          <button onClick={handleGuestStart} disabled={guestLoading} style={{
            padding: isMobile ? '10px 16px' : '8px 20px', borderRadius: 10, border: 'none', cursor: guestLoading ? 'wait' : 'pointer',
            background: C.blue, color: C.white, fontSize: isMobile ? 13 : 14, fontWeight: 600,
            transition: 'all 0.2s', minHeight: isMobile ? 44 : undefined,
            opacity: guestLoading ? 0.7 : 1,
          }}>바로 시작</button>
        </div>
      </header>

      {/* ━━ Hero ━━ */}
      <section style={{
        background: `linear-gradient(180deg, ${C.navy} 0%, ${C.navyLight} 80%, ${C.navyMid} 100%)`,
        padding: isMobile ? '72px 20px 44px' : '130px 24px 80px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: isMobile ? 350 : 600, height: isMobile ? 350 : 600, borderRadius: '50%',
          background: `radial-gradient(circle, ${C.blueGlow} 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* [MIRROR] 모바일 히어로: 간소화된 구조 */}
          {isMobile ? (
            <>
              {/* Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 100,
                background: C.blueBg, border: '1px solid rgba(37, 99, 235, 0.2)',
                marginBottom: 16,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px rgba(52,211,153,0.5)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.blueText }}>
                  {userCount > 0 ? `스타트업 대표 ${userCount.toLocaleString()}명이 이미 사용` : '스타트업 대표 · 1인 창업자 · 비개발자를 위한 AI'}
                </span>
              </div>

              {/* Headline — 깔끔하게 2줄 */}
              <h1 style={{
                fontSize: 28, fontWeight: 800, color: C.white,
                lineHeight: 1.35, letterSpacing: '-0.03em', marginBottom: 12,
              }}>
                앱 아이디어만 말하세요<br />
                <span style={{ color: C.blueSoft }}>개발 견적받을 문서가 나옵니다</span>
              </h1>

              {/* Sub — 핵심 1줄 */}
              <p style={{
                fontSize: 15, color: C.textLight, lineHeight: 1.6,
                marginBottom: 28, padding: '0 8px',
              }}>
                뭘 만들고 싶은지 AI에게 말하면, 개발사에 바로 보낼 수 있는 문서 완성
              </p>

              {/* 메인 CTA 1개 — 깨끗하게 */}
              <button onClick={handleGuestStart} disabled={guestLoading} style={{
                width: '100%', height: 56, borderRadius: 14, border: 'none',
                background: `linear-gradient(135deg, ${C.blue}, ${C.blueLight})`,
                color: C.white, fontSize: 17, fontWeight: 700,
                cursor: guestLoading ? 'wait' : 'pointer',
                boxShadow: `0 4px 24px ${C.blueGlow}`,
                animation: 'heroPulse 2.5s ease-in-out infinite',
                opacity: guestLoading ? 0.7 : 1,
              }}>
                {guestLoading ? '준비 중...' : '무료로 시작하기 →'}
              </button>

              {/* Trust chips — 3개로 축소, 1줄 */}
              <div style={{
                display: 'flex', justifyContent: 'center',
                gap: 16, marginTop: 20,
              }}>
                {['회원가입 불필요', '완전 무료', '5분 완성'].map(t => (
                  <span key={t} style={{
                    fontSize: 12, color: C.textLight, display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.blueSoft} strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {t}
                  </span>
                ))}
              </div>
            </>
          ) : (
            /* ━━ PC Hero (기존 유지) ━━ */
            <>
              {/* Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 18px', borderRadius: 100,
                background: C.blueBg, border: '1px solid rgba(37, 99, 235, 0.2)',
                marginBottom: 28,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px rgba(52,211,153,0.5)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: C.blueText }}>
                  {userCount > 0 ? `스타트업 대표 ${userCount.toLocaleString()}명이 이미 사용` : '스타트업 대표 · 1인 창업자 · 비개발자를 위한 AI'}
                </span>
              </div>

              {/* Headline */}
              <h1 style={{
                fontSize: 'clamp(30px, 5vw, 48px)', fontWeight: 800,
                color: C.white, lineHeight: 1.3, letterSpacing: '-0.03em', marginBottom: 16,
              }}>
                앱 아이디어, 말만 하세요.<br /><span style={{ color: C.blueSoft }}>개발 견적받을 수 있는 문서가 나옵니다</span>
              </h1>

              {/* Sub */}
              <p style={{
                fontSize: 'clamp(15px, 2vw, 18px)', color: C.textLight,
                lineHeight: 1.65, maxWidth: 560, margin: '0 auto 36px',
              }}>
                뭘 만들고 싶은지 <strong style={{ color: C.white }}>AI와 대화</strong>하면, 개발사에 <strong style={{ color: C.blueSoft }}>바로 보낼 수 있는 전문 문서</strong>가 완성됩니다. 무료로 PDF까지 받아보세요.
              </p>

              {/* 메인 CTA */}
              <button onClick={handleGuestStart} disabled={guestLoading} style={{
                padding: '0 40px', height: 58, borderRadius: 14, border: 'none',
                background: `linear-gradient(135deg, ${C.blue}, ${C.blueLight})`,
                color: C.white, fontSize: 18, fontWeight: 700,
                cursor: guestLoading ? 'wait' : 'pointer',
                boxShadow: `0 4px 24px ${C.blueGlow}`,
                transition: 'all 0.2s', letterSpacing: '0.01em',
                display: 'block', margin: '0 auto 12px',
                opacity: guestLoading ? 0.7 : 1,
              }}>
                {guestLoading ? '준비 중...' : '무료로 시작하기 →'}
              </button>

              {/* 서브: 이메일 */}
              <form onSubmit={handleEmailStart} style={{
                maxWidth: 480, margin: '0 auto 8px',
                display: 'flex', gap: 6, alignItems: 'center',
              }}>
                <div style={{ fontSize: 13, color: C.gray400, whiteSpace: 'nowrap', marginRight: 4 }}>또는</div>
                <input
                  ref={heroInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="이메일 입력 시 PDF도 발송"
                  style={{
                    flex: 1, height: 44, padding: '0 14px', borderRadius: 10,
                    border: error ? '1.5px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)', color: C.white, fontSize: 14,
                    outline: 'none', transition: 'border-color 0.2s',
                  }}
                />
                <button type="submit" disabled={loading} style={{
                  padding: '0 16px', height: 44, borderRadius: 10, border: 'none',
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

              {/* Trust chips */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                gap: 16, marginTop: 24,
              }}>
                {['회원가입 불필요', '완전 무료', '5분이면 완료', 'PDF 다운로드', '데이터 보호'].map(t => (
                  <span key={t} style={{
                    fontSize: 13, color: C.textLight, display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={t === '데이터 보호' ? '#34D399' : C.blueSoft} strokeWidth="2.5">
                      {t === '데이터 보호' ? (
                        <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" fill="rgba(52,211,153,0.15)" />
                      ) : (
                        <polyline points="20 6 9 17 4 12" />
                      )}
                    </svg>
                    {t}
                  </span>
                ))}
              </div>

              {/* Step indicator — PC만 */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, marginTop: 36, flexWrap: 'wrap',
              }}>
                {[
                  { n: '1', t: '아이디어 말하기' },
                  { n: '2', t: 'AI가 질문 & 정리' },
                  { n: '3', t: '개발문서 완성 + PDF' },
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
            </>
          )}
        </div>
      </section>

      {/* ━━ Demo Preview — 3개 탭 + 자동 순환 ━━ */}
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
              <span style={{ fontSize: 12, fontWeight: 600, color: C.blueSoft }}>AI 결과물 미리보기</span>
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
        <p style={{ textAlign: 'center', fontSize: 12, color: C.gray500, marginTop: 12 }}>
          * 실제 AI가 생성한 결과물입니다. 업종별로 다른 결과가 나옵니다.
        </p>
      </section>

      {/* ━━ Features ━━ */}
      <section style={{ background: C.bg, ...sectionPad }}>
        <h2 style={secTitle}>{isMobile ? '개발자에게 바로 전달 가능한 문서' : '개발사가 바로 견적 낼 수 있는 문서'}</h2>
        <p style={{ fontSize: isMobile ? 15 : 16, color: C.textMuted, textAlign: 'center', marginTop: 10 }}>
          {isMobile ? 'AI가 질문하면 답만 하세요. 5분이면 완성됩니다.' : '위시켓 13년 외주 매칭 경험이 녹아든 AI가 만들어드립니다'}
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 16, marginTop: 44,
        }}>
          {[
            { n: '01', title: '빠짐없는 요구사항 정리', desc: isMobile ? '7단계 질문으로 개요부터 예산까지 빠짐없이' : '7단계 전문 질문으로 프로젝트 개요부터 기술 요구사항, 예산까지 빠짐없이 정리', icon: '📄' },
            { n: '02', title: '기능별 우선순위', desc: isMobile ? 'P1/P2/P3 자동 분류 + MVP 로드맵' : 'P1/P2/P3 자동 분류 + 구현 난이도 분석. MVP부터 시작하는 로드맵 제시', icon: '🎯' },
            { n: '03', title: '실전 예산·일정', desc: isMobile ? '13년 매칭 데이터 기반 현실적 추정' : '13년 매칭 데이터 기반, 프로젝트 유형별 현실적인 예산 범위와 기간 추정', icon: '💰' },
            { n: '04', title: '개발사 바로 전달', desc: isMobile ? 'PDF 다운로드 → 개발사에 그대로 전달' : '완성된 문서를 PDF로 다운로드. 그대로 개발사에 보내면 정확한 견적을 받을 수 있어요', icon: '🚀' },
          ].map(item => (
            <div key={item.n} style={{
              background: C.white, borderRadius: 16, padding: isMobile ? '20px 16px' : '28px 24px',
              border: '1px solid rgba(0,0,0,0.05)',
              transition: 'all 0.25s ease', cursor: 'default',
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

      {/* ━━ How It Works — PC만 ━━ */}
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
              { step: 3, title: '문서 완성!', desc: '개발사에 바로 전달 가능한 전문 문서. PDF 다운로드 + 이메일 발송.' },
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

      {/* ━━ WHY WISHKET AI + 비교표 ━━ */}
      <section style={{ background: isMobile ? C.white : C.bg, ...sectionPad }}>
        <p style={{ fontSize: 13, color: C.blue, textAlign: 'center', fontWeight: 600, marginBottom: 8, letterSpacing: '0.05em' }}>
          WHY WISHKET AI
        </p>
        <h2 style={secTitle}>{isMobile ? 'ChatGPT와 뭐가 다를까?' : '왜 ChatGPT 대신 이걸 쓸까요?'}</h2>
        <p style={{ fontSize: isMobile ? 14 : 16, color: C.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 40, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
          {isMobile ? '같은 질문, 전혀 다른 결과' : '116,000건의 실전 프로젝트 데이터가 만드는 차이'}
        </p>

        {/* 기술 차별화 3포인트 */}
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

        {/* Before/After 비교표 */}
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 20,
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
              { t: '기능 우선순위 분류', v: '없음' },
              { t: '예산 추정 정확도', v: '근거 없음' },
              { t: '개발 일정 추정', v: '부정확' },
              { t: '개발사 전달 포맷', v: '미지원' },
              { t: '외주 맥락 이해', v: '없음' },
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
              <span style={{ fontSize: 17, fontWeight: 700, color: C.textDark }}>위시켓 AI</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                background: C.blueBg, color: C.blue, marginLeft: 'auto',
              }}>추천</span>
            </div>
            {[
              { t: '기능 우선순위 분류', v: 'P1/P2/P3 자동' },
              { t: '예산 추정 정확도', v: '±20% 범위' },
              { t: '개발 일정 추정', v: '업종별 실전 기반' },
              { t: '개발사 전달 포맷', v: 'RFP + PDF' },
              { t: '외주 맥락 이해', v: '116,000건 학습' },
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

        {/* [E-4] 비교표 직후 인라인 CTA */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button onClick={handleGuestStart} disabled={guestLoading} style={{
            padding: isMobile ? '0 28px' : '0 32px', height: 50, borderRadius: 12, border: 'none',
            background: `linear-gradient(135deg, ${C.blue}, ${C.blueLight})`,
            color: C.white, fontSize: isMobile ? 15 : 16, fontWeight: 700,
            cursor: guestLoading ? 'wait' : 'pointer',
            boxShadow: `0 4px 20px ${C.blueGlow}`,
            transition: 'all 0.2s',
            opacity: guestLoading ? 0.7 : 1,
          }}>
            직접 확인해보기 →
          </button>
          <p style={{ fontSize: 13, color: C.gray500, marginTop: 8 }}>무료 · 회원가입 불필요 · 5분</p>
        </div>
      </section>

      {/* ━━ Stats ━━ */}
      <section style={{
        background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`,
        padding: isMobile ? '40px 16px' : '56px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: isMobile ? 13 : 14, color: C.textLight, marginBottom: isMobile ? 24 : 28, padding: isMobile ? '0 8px' : 0 }}>
          {isMobile ? '위시켓 실전 데이터 기반 AI' : '위시켓의 실전 데이터로 훈련된 AI가 가장 현실적인 개발 문서를 만들어드립니다'}
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
        <p style={{ fontSize: 11, color: C.gray600, marginTop: 16 }}>* 위시켓 공식 누적 실적 기준</p>
      </section>

      {/* ━━ Social Proof ━━ */}
      <section style={{ background: C.bg, ...sectionPad }}>
        <h2 style={secTitle}>{isMobile ? '사용자들이 말합니다' : '실제 사용자 후기'}</h2>
        <p style={{ fontSize: isMobile ? 14 : 16, color: C.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 44 }}>
          아이디어를 개발 문서로 바꾼 분들의 이야기
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {[
            { name: '김태현', role: '스타트업 대표', text: '개발사에 보낼 문서를 3일이나 쓰고 있었는데, 여기서 5분 만에 끝났어요. 개발사 대표님이 "이렇게 잘 정리된 요구사항은 처음"이라고 하셨습니다.', rating: 5 },
            { name: '이수진', role: 'PM', text: '기능 우선순위랑 타임라인까지 자동으로 나와서 놀랐어요. ChatGPT한테 물어보면 뜬구름 잡는 소리만 하는데, 여기는 외주 맥락을 정확히 알고 있더라고요.', rating: 5 },
            { name: '박민수', role: '1인 창업자', text: '개발을 아예 몰라서 뭘 어떻게 요청해야 할지 막막했는데, AI가 질문해주니까 답만 하면 됐어요. 예산 추정이 조금 넓은 범위로 나오는 건 아쉽지만, 첫 견적 요청에는 충분했습니다.', rating: 4 },
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

      {/* ━━ FAQ — [S2] state 기반 +/- 회전 ━━ */}
      <section style={{ background: C.white, ...sectionPad }}>
        <h2 style={secTitle}>자주 묻는 질문</h2>
        <div style={{ maxWidth: 680, margin: '40px auto 0' }}>
          {[
            { q: '정말 무료인가요?', a: '네, 완전 무료입니다. 회원가입도 필요 없고, 이메일을 입력하면 완성된 문서를 PDF로 받아보실 수 있습니다. 이메일 없이도 바로 시작할 수 있어요.' },
            { q: 'ChatGPT랑 뭐가 다른가요?', a: '위시켓의 13년 외주 매칭 경험(116,000건 프로젝트)이 반영되어 있습니다. 기능 우선순위(P1/P2/P3), 현실적 예산·일정 추정, 개발사에 바로 전달 가능한 포맷 등 외주에 특화된 결과물을 제공합니다.' },
            { q: '문서 완성까지 얼마나 걸리나요?', a: '평균 5분이면 충분합니다. AI가 핵심 질문을 하고, 답변만 해주시면 개발사 전달용 문서가 자동 생성됩니다.' },
            { q: '생성된 문서를 수정할 수 있나요?', a: '문서 완성 후 각 섹션별로 AI 재생성이 가능합니다. 원하는 부분만 다시 생성하여 수정할 수 있어요.' },
            { q: '개인정보는 안전한가요?', a: '입력하신 이메일은 문서 발송에만 사용되며, 마케팅 목적으로 활용하지 않습니다. 프로젝트 정보는 문서 생성에만 사용되고 제3자에게 공유되지 않습니다.' },
          ].map((faq, i) => (
            <div key={i} style={{
              borderBottom: `1px solid ${C.gray200}`, padding: '20px 0',
            }}>
              <button
                onClick={() => setOpenFaq(prev =>
                  prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                )}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: isMobile ? 15 : 16, fontWeight: 600, color: C.textDark,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  minHeight: 44, padding: isMobile ? '4px 0' : 0, textAlign: 'left',
                }}
                aria-expanded={openFaq.includes(i)}
              >
                {faq.q}
                <span style={{
                  fontSize: 20, color: C.gray400,
                  transition: 'transform 0.3s ease',
                  transform: openFaq.includes(i) ? 'rotate(45deg)' : 'rotate(0deg)',
                  flexShrink: 0, marginLeft: 12,
                }}>+</span>
              </button>
              <div style={{
                maxHeight: openFaq.includes(i) ? 200 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.3s ease, opacity 0.3s ease',
                opacity: openFaq.includes(i) ? 1 : 0,
              }}>
                <p style={{
                  fontSize: 14, color: C.textMuted, lineHeight: 1.7,
                  marginTop: 12, paddingRight: 24,
                }}>{faq.a}</p>
              </div>
            </div>
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
            <>아이디어만 말하면, <strong style={{ color: C.blueSoft }}>개발 견적받을 문서가 5분이면 완성</strong></>
          ) : (
            <>아이디어만 있으면 됩니다. 나머지는 <strong style={{ color: C.blueSoft }}>AI가 정리해서 개발사에 보낼 문서로 만들어드립니다.</strong><br />이메일을 입력하면 PDF로도 보내드립니다.</>
          )}
        </p>

        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <button onClick={handleGuestStart} disabled={guestLoading} style={{
            width: isMobile ? '100%' : 'auto', padding: '0 36px',
            height: isMobile ? 56 : 54, borderRadius: 14, border: 'none',
            background: `linear-gradient(135deg, ${C.blue}, ${C.blueLight})`,
            color: C.white, fontSize: isMobile ? 17 : 18, fontWeight: 700,
            cursor: guestLoading ? 'wait' : 'pointer',
            boxShadow: `0 4px 20px ${C.blueGlow}`,
            transition: 'all 0.2s', display: 'block', margin: '0 auto 16px',
            opacity: guestLoading ? 0.7 : 1,
          }}>
            {guestLoading ? '준비 중...' : '무료로 시작하기 →'}
          </button>

          {/* 서브: 이메일 — [S3] 독립 에러 */}
          <form onSubmit={handleFinalEmailStart} style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: C.gray500 }}>또는</span>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFinalError(''); setError(''); }}
              placeholder="이메일 입력 시 PDF도 발송"
              style={{
                width: isMobile ? '100%' : 'auto', flex: isMobile ? undefined : 1, height: 44, padding: '0 14px', borderRadius: 10,
                border: finalError ? '1.5px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)', color: C.white, fontSize: 14,
                outline: 'none', transition: 'border-color 0.2s',
              }}
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
          {/* [S3] Final CTA 독립 에러 표시 */}
          {finalError && (
            <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{finalError}</p>
          )}
        </div>

        {/* 보안 메시지 */}
        <p style={{ fontSize: 12, color: C.gray600, marginTop: 20, maxWidth: 400, margin: '20px auto 0' }}>
          입력된 정보는 문서 생성에만 사용되며, 제3자에게 공유되지 않습니다.
        </p>
      </section>

      {/* ━━ Footer — [S1] 실제 링크 ━━ */}
      <footer style={{ background: C.gray50, borderTop: `1px solid ${C.gray200}`, padding: isMobile ? '32px 16px 72px' : '44px 24px 28px' }}>
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
            {/* [S1] Footer 링크 — <a> 태그 + 실제 URL */}
            {FOOTER_COLS.map(col => (
              <div key={col.title}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.gray700, marginBottom: 10 }}>{col.title}</div>
                {col.links.map(l => (
                  <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" style={{
                    fontSize: 13, color: C.gray500, marginBottom: 6, cursor: 'pointer',
                    display: 'block', textDecoration: 'none',
                  }}>{l.label}</a>
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

      {/* ━━ Sticky Bottom Bar — [E-5] 모바일 사회적 증거 추가 ━━ */}
      <StickyBar onStart={handleGuestStart} userCount={userCount} guestLoading={guestLoading} />
    </div>
  );
}

// ─── Sticky Bottom Bar ───
function StickyBar({ onStart, userCount, guestLoading }: { onStart: () => void; userCount: number; guestLoading: boolean }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isMobile = useIsMobile(); // 커스텀 훅 사용 (중복 제거)

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
      padding: isMobile ? '8px 16px calc(8px + env(safe-area-inset-bottom, 0px))' : '12px 24px',
    }}>
      <div style={{
        maxWidth: 1080, margin: '0 auto',
        display: 'flex', flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center', justifyContent: 'space-between',
        gap: isMobile ? 4 : 0,
      }}>
        {/* [E-5] 모바일에서도 사회적 증거 표시 */}
        {isMobile && userCount > 0 && (
          <div style={{ fontSize: 11, color: C.gray400, textAlign: 'center' }}>
            {userCount.toLocaleString()}명이 이미 사용 중
          </div>
        )}
        {!isMobile && (
          <span style={{ fontSize: 15, color: '#CBD5E1' }}>
            {userCount > 0
              ? <><span style={{ color: '#93C5FD', fontWeight: 600 }}>{userCount.toLocaleString()}명</span>이 이미 사용했습니다</>
              : <>아이디어를 <span style={{ color: '#93C5FD', fontWeight: 600 }}>개발 문서</span>로 5분 만에 무료 변환</>
            }
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 12, width: isMobile ? '100%' : 'auto' }}>
          <button onClick={onStart} disabled={guestLoading} style={{
            padding: isMobile ? '12px 20px' : '10px 24px', borderRadius: 10, border: 'none',
            background: `linear-gradient(135deg, #2563EB, #3B82F6)`, color: '#FFFFFF',
            fontSize: 15, fontWeight: 700,
            cursor: guestLoading ? 'wait' : 'pointer', transition: 'all 0.2s',
            boxShadow: '0 2px 12px rgba(37, 99, 235, 0.3)',
            flex: isMobile ? 1 : undefined, minHeight: 44,
            opacity: guestLoading ? 0.7 : 1,
          }}>
            {isMobile ? '무료로 시작하기' : '바로 시작하기'}
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
