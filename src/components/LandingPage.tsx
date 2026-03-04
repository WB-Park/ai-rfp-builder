'use client';

// AI PRD Builder — Landing Page v7
// MIRROR 전체 개선 반영:
//   [M-1] 서브카피 → 결과물 구체 설명
//   [M-2] "AI 개발문서 빌더" → "AI 요구사항 빌더"
//   [M-3] "개발문서 완성+PDF" → "요구사항 문서 완성 + PDF"
//   [M-4] 모바일 데모 포맷 개선
//   [M-5] StickyBar: 히어로 CTA 기준 IntersectionObserver
//   [I-1] PC 히어로 이메일 폼 제거
//   [I-2] 데모 탭 클릭 시 타이머 리셋
//   [I-3] 데모 프리뷰 CTA 버튼 추가
//   [R-1] How It Works → Features 순서
//   [R-2] WHY 3포인트 카드 텍스트 압축
//   [R-3] 비교표를 데모 다음으로 이동
//   [R-4] userCount < 100이면 정성적 표현
//   [R-5] 가상 후기 → 익명 사용 사례
//   [R-6] 타겟 페르소나 안심 문구
//   [R-7] 데모 문서 목차 프리뷰
//   [R-8] Before/After 스토리텔링
//   [O-1] 개발사 인정 포맷 신뢰 문구
//   [O-2] 무료 모델 투명 안내
//   [O-3] "5분" → "5~10분"

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
      { v: 'React+Node', l: '기술 스택 추천', c: '#FBBF24' },
      { v: '12개', l: '요구사항 항목', c: '#34D399' },
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
      { v: 'Next.js+Java', l: '기술 스택 추천', c: '#FBBF24' },
      { v: '18개', l: '요구사항 항목', c: '#34D399' },
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
      { v: 'React+Go', l: '기술 스택 추천', c: '#FBBF24' },
      { v: '15개', l: '요구사항 항목', c: '#34D399' },
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
  const [finalError, setFinalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [demoTab, setDemoTab] = useState(0);
  const [openFaq, setOpenFaq] = useState<number[]>([0, 1]);

  // [M-5] Hero CTA 가시성 — IntersectionObserver
  const heroCTARef = useRef<HTMLButtonElement>(null);
  const [heroCtaVisible, setHeroCtaVisible] = useState(true);

  useEffect(() => {
    const el = heroCTARef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroCtaVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // [D1] 사용자 수 — fallback 제거
  const [userCount, setUserCount] = useState(0);
  useEffect(() => {
    fetch('/api/lead?count=true').then(r => r.json()).then(d => {
      if (d.count && d.count > 0) setUserCount(d.count);
    }).catch(() => { /* 0 유지 */ });
  }, []);

  // [I-2] 데모 탭 자동 순환 — 탭 클릭 시 리셋
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startDemoTimer = useCallback(() => {
    if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    demoTimerRef.current = setInterval(() => {
      setDemoTab(prev => (prev + 1) % DEMO_TABS.length);
    }, 5000);
  }, []);

  useEffect(() => {
    startDemoTimer();
    return () => { if (demoTimerRef.current) clearInterval(demoTimerRef.current); };
  }, [startDemoTimer]);

  const handleDemoTabClick = useCallback((i: number) => {
    setDemoTab(i);
    startDemoTimer(); // 타이머 리셋
  }, [startDemoTimer]);

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

  const isMobile = useIsMobile();

  const sectionPad: React.CSSProperties = { padding: isMobile ? '56px 16px' : '80px 24px', maxWidth: 1080, margin: '0 auto' };
  const secTitle: React.CSSProperties = {
    fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 800, color: C.textDark,
    textAlign: 'center', letterSpacing: '-0.02em', lineHeight: 1.3,
  };

  const currentDemo = DEMO_TABS[demoTab];

  // [R-4] 100명 미만이면 정성적 표현
  const badgeText = userCount >= 100
    ? `스타트업 대표 ${userCount.toLocaleString()}명이 이미 사용`
    : '스타트업 대표 · 1인 창업자 · 비개발자를 위한 AI';

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
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
            {/* [M-2] AI 요구사항 빌더 */}
            <span style={{ fontSize: isMobile ? 12 : 14, color: C.textLight, fontWeight: 500 }}>AI 요구사항 빌더</span>
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
          {isMobile ? (
            <>
              {/* Badge — [R-4] */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 100,
                background: C.blueBg, border: '1px solid rgba(37, 99, 235, 0.2)',
                marginBottom: 16,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px rgba(52,211,153,0.5)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.blueText }}>{badgeText}</span>
              </div>

              {/* Headline */}
              <h1 style={{
                fontSize: 28, fontWeight: 800, color: C.white,
                lineHeight: 1.35, letterSpacing: '-0.03em', marginBottom: 12,
              }}>
                만들고 싶은 거, 말만 하세요<br />
                <span style={{ color: C.blueSoft }}>개발 파트너와 대화할 수 있는 문서가 나옵니다</span>
              </h1>

              {/* [M-1] 서브카피 — 결과물 구체 설명 */}
              <p style={{
                fontSize: 15, color: C.textLight, lineHeight: 1.6,
                marginBottom: 28, padding: '0 8px',
              }}>
                뭘 만들고 싶은지 대화하면, 핵심 기능·우선순위·기술 요구사항이<br />체계적으로 정리된 문서가 완성됩니다
              </p>

              {/* [R-6] 안심 문구 */}
              <p style={{ fontSize: 13, color: C.gray400, marginBottom: 16 }}>
                개발 지식이 없어도 괜찮습니다. AI가 질문하면 답만 하세요.
              </p>

              {/* 메인 CTA — [M-5] ref 연결 */}
              <button ref={heroCTARef} onClick={handleGuestStart} disabled={guestLoading} style={{
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

              {/* Trust chips — [O-3] 5~10분 */}
              <div style={{
                display: 'flex', justifyContent: 'center',
                gap: 16, marginTop: 20,
              }}>
                {['회원가입 불필요', '완전 무료', '5~10분 완성'].map(t => (
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
            /* ━━ PC Hero ━━ */
            <>
              {/* Badge — [R-4] */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 18px', borderRadius: 100,
                background: C.blueBg, border: '1px solid rgba(37, 99, 235, 0.2)',
                marginBottom: 28,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px rgba(52,211,153,0.5)' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: C.blueText }}>{badgeText}</span>
              </div>

              {/* Headline */}
              <h1 style={{
                fontSize: 'clamp(30px, 5vw, 48px)', fontWeight: 800,
                color: C.white, lineHeight: 1.3, letterSpacing: '-0.03em', marginBottom: 16,
              }}>
                만들고 싶은 거, 말만 하세요.<br /><span style={{ color: C.blueSoft }}>개발 파트너와 대화할 수 있는 문서가 나옵니다</span>
              </h1>

              {/* [M-1] 서브카피 — 결과물 구체 설명 */}
              <p style={{
                fontSize: 'clamp(15px, 2vw, 18px)', color: C.textLight,
                lineHeight: 1.65, maxWidth: 600, margin: '0 auto 20px',
              }}>
                뭘 만들고 싶은지 대화하면, <strong style={{ color: C.white }}>핵심 기능·우선순위·기술 요구사항</strong>이 체계적으로 정리된 문서가 완성됩니다. 무료로 PDF까지 받아보세요.
              </p>

              {/* [R-6] 안심 문구 */}
              <p style={{ fontSize: 14, color: C.gray400, marginBottom: 32 }}>
                개발 지식이 없어도 괜찮습니다. AI가 질문하면 답만 하세요.
              </p>

              {/* [I-1] 메인 CTA만 — 이메일 폼 제거 + [M-5] ref */}
              <button ref={heroCTARef} onClick={handleGuestStart} disabled={guestLoading} style={{
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

              {/* Trust chips — [O-3] 5~10분 */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
                gap: 16, marginTop: 24,
              }}>
                {['회원가입 불필요', '완전 무료', '5~10분이면 완료', 'PDF 다운로드', '데이터 보호'].map(t => (
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

              {/* Step indicator — [M-3] 요구사항 문서 완성 + PDF */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, marginTop: 36, flexWrap: 'wrap',
              }}>
                {[
                  { n: '1', t: '아이디어 말하기' },
                  { n: '2', t: 'AI가 질문 & 정리' },
                  { n: '3', t: '요구사항 문서 완성 + PDF' },
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

      {/* ━━ Demo Preview — [I-2] 탭 클릭 리셋 + [I-3] CTA + [R-7] 목차 + [M-4] 모바일 개선 ━━ */}
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
                <button key={tab.id} onClick={() => handleDemoTabClick(i)} style={{
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
            <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: C.white, marginBottom: 20 }}>
              {currentDemo.title}
            </div>
            {/* [M-4] 모바일 stat 2x2 그리드 개선 */}
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

            {/* [R-7] 문서 목차 프리뷰 */}
            <div style={{
              marginTop: 16, padding: isMobile ? '12px' : '16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.gray400, marginBottom: 10, letterSpacing: '0.05em' }}>
                📑 완성 문서 목차
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 4 : 6 }}>
                {[
                  '1. Executive Summary',
                  '2. 프로젝트 개요 · 목표',
                  '3. 핵심 기능 명세 (P1/P2/P3)',
                  '4. 보안·성능 요구사항',
                  '5. 기술 스택 추천',
                  '6. 기술 스택 추천',
                  '7. 리스크 · 제약조건',
                  '8. 리스크 · 고려사항',
                ].map((item, i) => (
                  <div key={i} style={{ fontSize: isMobile ? 11 : 12, color: C.textLight, padding: '3px 0' }}>{item}</div>
                ))}
              </div>
            </div>

            {/* [I-3] 데모 프리뷰 CTA */}
            <button onClick={handleGuestStart} disabled={guestLoading} style={{
              width: '100%', marginTop: 16, padding: '12px 0', borderRadius: 10, border: `1px solid ${C.blue}`,
              background: C.blueBg, color: C.blueSoft, fontSize: 14, fontWeight: 600,
              cursor: guestLoading ? 'wait' : 'pointer', transition: 'all 0.2s',
              opacity: guestLoading ? 0.7 : 1,
            }}>
              이런 결과를 받아보세요 →
            </button>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, color: C.gray500, marginTop: 12 }}>
          * 실제 AI가 생성한 결과물입니다. 업종별로 다른 결과가 나옵니다.
        </p>
      </section>

      {/* ━━ [R-3] 비교표 — 데모 바로 다음 ━━ */}
      <section style={{ background: C.bg, padding: isMobile ? '40px 16px' : '60px 24px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: C.blue, textAlign: 'center', fontWeight: 600, marginBottom: 8, letterSpacing: '0.05em' }}>
            비교해보세요
          </p>
          <h2 style={{ ...secTitle, marginBottom: 8 }}>ChatGPT vs 위시켓 AI</h2>
          {/* [O-1] 신뢰 문구 */}
          <p style={{ fontSize: isMobile ? 13 : 14, color: C.textMuted, textAlign: 'center', marginBottom: 32 }}>
            위시켓 파트너 개발사 <strong style={{ color: C.blue }}>65,000곳</strong>이 인정하는 포맷으로 출력합니다
          </p>
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
                { t: '기술 스택 추천', v: '없음' },
                { t: '구현 난이도 분석', v: '불가' },
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
                { t: '기술 스택 추천', v: '프로젝트 맞춤' },
                { t: '구현 난이도 분석', v: '기능별 자동' },
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

          {/* 비교표 직후 인라인 CTA */}
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
            <p style={{ fontSize: 13, color: C.gray500, marginTop: 8 }}>무료 · 회원가입 불필요 · 5~10분</p>
          </div>
        </div>
      </section>

      {/* ━━ [R-1] How It Works — 먼저 배치 (PC만) ━━ */}
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
              { step: 1, title: '"이런 거 만들고 싶어요"', desc: '한 줄이면 충분합니다. AI가 알아서 분류하고 관련 질문을 시작합니다.' },
              { step: 2, title: 'AI가 질문 → 당신이 답변', desc: '타겟 사용자, 핵심 기능, 기술 요구사항 등을 대화로 정리합니다.' },
              { step: 3, title: '문서 완성!', desc: '개발사에 바로 전달 가능한 전문 문서. PDF 다운로드까지.' },
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

      {/* ━━ [R-1] Features — How It Works 다음 ━━ */}
      <section style={{ background: isMobile ? C.white : C.bg, ...sectionPad }}>
        <h2 style={secTitle}>{isMobile ? '개발 파트너에게 바로 전달 가능한 문서' : '개발 파트너가 바로 이해할 수 있는 문서'}</h2>
        <p style={{ fontSize: isMobile ? 15 : 16, color: C.textMuted, textAlign: 'center', marginTop: 10 }}>
          {isMobile ? 'AI가 질문하면 답만 하세요. 5~10분이면 완성됩니다.' : '위시켓 13년 외주 매칭 경험이 녹아든 AI가 만들어드립니다'}
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 16, marginTop: 44,
        }}>
          {[
            { n: '01', title: '빠짐없는 요구사항 정리', desc: isMobile ? '대화만으로 개요부터 기술 스택까지 빠짐없이' : '대화형 질문으로 프로젝트 개요부터 핵심 기능, 기술 스택까지 빠짐없이 정리', icon: '📄' },
            { n: '02', title: '기능별 우선순위', desc: isMobile ? 'P1/P2/P3 자동 분류 + MVP 로드맵' : 'P1/P2/P3 자동 분류 + 구현 난이도 분석. MVP부터 시작하는 로드맵 제시', icon: '🎯' },
            { n: '03', title: '기술 스택 추천', desc: isMobile ? '프로젝트에 맞는 기술 스택을 자동 추천' : '프로젝트 특성에 맞는 기술 스택을 자동 추천. 개발사 소통 시 기술 논의의 출발점이 됩니다', icon: '⚙️' },
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
        {/* [R-6] 페르소나 안심 */}
        <p style={{ textAlign: 'center', fontSize: 13, color: C.gray500, marginTop: 24 }}>
          💡 개발 용어를 몰라도 괜찮아요. AI가 쉬운 말로 질문합니다.
        </p>
      </section>

      {/* ━━ WHY WISHKET AI — [R-2] 3포인트 카드 텍스트 압축 ━━ */}
      <section style={{ background: isMobile ? C.bg : C.white, ...sectionPad }}>
        <p style={{ fontSize: 13, color: C.blue, textAlign: 'center', fontWeight: 600, marginBottom: 8, letterSpacing: '0.05em' }}>
          WHY WISHKET AI
        </p>
        <h2 style={secTitle}>{isMobile ? 'ChatGPT와 뭐가 다를까?' : '왜 ChatGPT 대신 이걸 쓸까요?'}</h2>
        <p style={{ fontSize: isMobile ? 14 : 16, color: C.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 40, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
          {isMobile ? '같은 질문, 전혀 다른 결과' : '116,000건의 실전 프로젝트 데이터가 만드는 차이'}
        </p>

        {/* [R-2] 기술 차별화 3포인트 — 텍스트 압축 + 태그뱃지 강조 */}
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 16, marginBottom: 40,
        }}>
          {[
            {
              icon: '🧠', title: '외주 전문 질문 로직',
              desc: '116,000건 프로젝트에서 설계된 7단계 질문. 외주 계약·검수·커뮤니케이션 맥락까지 자동으로 짚어냅니다.',
              highlight: '7단계 전문 질문',
            },
            {
              icon: '📊', title: '116,000건 프로젝트 데이터',
              desc: '위시켓 13년간 축적된 외주 프로젝트 데이터를 기반으로, 업종별 필수 기능과 기술 스택을 추천합니다.',
              highlight: '외주 특화 AI',
            },
            {
              icon: '📋', title: '개발사 전달 포맷',
              desc: '기능 우선순위, 기술 스택, MVP 스코프까지. 개발사가 바로 견적을 낼 수 있는 실전 RFP 포맷.',
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
      </section>

      {/* ━━ [R-8] Before / After 스토리텔링 ━━ */}
      <section style={{
        background: `linear-gradient(135deg, ${C.navy}, ${C.navyLight})`,
        padding: isMobile ? '48px 16px' : '72px 24px',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(20px, 4vw, 30px)', fontWeight: 800, color: C.white, marginBottom: 12 }}>
            {isMobile ? '이렇게 달라집니다' : '위시켓 AI 전과 후'}
          </h2>
          <p style={{ fontSize: 14, color: C.textLight, marginBottom: 36 }}>
            같은 아이디어, 전혀 다른 시작
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto 1fr',
            gap: isMobile ? 16 : 24, alignItems: 'stretch',
          }}>
            {/* Before */}
            <div style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: isMobile ? '20px 16px' : '28px 24px',
              border: '1px solid rgba(255,255,255,0.08)', textAlign: 'left',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', marginBottom: 14, letterSpacing: '0.05em' }}>BEFORE</div>
              {[
                '"앱 만들고 싶은데 뭘 어떻게 요청하지…"',
                '개발사에 전화하면 "문서 보내주세요"',
                'ChatGPT한테 물어봐도 뜬구름 답변',
                '견적 요청서 형식도 모르겠음',
                '결국 3일 넘게 문서 작성만…',
              ].map((t, i) => (
                <div key={i} style={{
                  fontSize: 13, color: C.textLight, lineHeight: 1.7, marginBottom: 6,
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                  <span style={{ color: '#EF4444', flexShrink: 0 }}>✕</span>
                  {t}
                </div>
              ))}
            </div>

            {/* Arrow */}
            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 32, color: C.blueSoft }}>→</span>
              </div>
            )}
            {isMobile && (
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 24, color: C.blueSoft }}>↓</span>
              </div>
            )}

            {/* After */}
            <div style={{
              background: 'rgba(37,99,235,0.08)', borderRadius: 16, padding: isMobile ? '20px 16px' : '28px 24px',
              border: `1px solid rgba(37,99,235,0.2)`, textAlign: 'left',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.blueSoft, marginBottom: 14, letterSpacing: '0.05em' }}>AFTER</div>
              {[
                'AI에게 아이디어만 말하면 끝',
                '7단계 대화로 요구사항 자동 정리',
                '기능 우선순위 P1/P2/P3 분류 완료',
                '기술 스택 추천까지 포함',
                'PDF 다운 → 개발사에 바로 전달',
              ].map((t, i) => (
                <div key={i} style={{
                  fontSize: 13, color: C.white, lineHeight: 1.7, marginBottom: 6,
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                }}>
                  <span style={{ color: '#34D399', flexShrink: 0 }}>✓</span>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━ Stats ━━ */}
      <section style={{
        background: C.bg,
        padding: isMobile ? '40px 16px' : '56px 24px', textAlign: 'center',
      }}>
        <p style={{ fontSize: isMobile ? 13 : 14, color: C.textMuted, marginBottom: isMobile ? 24 : 28, padding: isMobile ? '0 8px' : 0 }}>
          {isMobile ? '위시켓 실전 데이터 기반 AI' : '위시켓의 실전 데이터로 훈련된 AI가 가장 현실적인 요구사항 문서를 만들어드립니다'}
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
              <div style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, color: C.blue }}>{s.v}</div>
              <div style={{ fontSize: isMobile ? 12 : 14, color: C.textMuted, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: C.gray500, marginTop: 16 }}>* 위시켓 공식 누적 실적 기준</p>
      </section>

      {/* ━━ [R-5] Social Proof — 익명 사용 사례 ━━ */}
      <section style={{ background: C.white, ...sectionPad }}>
        <h2 style={secTitle}>{isMobile ? '이런 분들이 사용했습니다' : '이런 프로젝트에 사용되고 있습니다'}</h2>
        <p style={{ fontSize: isMobile ? 14 : 16, color: C.textMuted, textAlign: 'center', marginTop: 10, marginBottom: 44 }}>
          아이디어를 요구사항 문서로 바꾼 분들의 이야기
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {[
            {
              role: '스타트업 대표',
              project: '펫케어 앱',
              text: '개발사에 보낼 문서를 며칠간 고민했는데, 여기서 10분 만에 완성했습니다. 문서를 보낸 개발사 3곳 모두 "요구사항이 잘 정리되어 있다"고 하더라고요.',
              result: '개발사 3곳에서 견적 수령',
              icon: '🐾',
            },
            {
              role: '1인 창업자',
              project: 'B2B SaaS',
              text: '개발을 아예 몰라서 뭘 어떻게 요청해야 할지 막막했는데, AI가 질문해주니까 답만 하면 됐어요. 투자자 미팅에서도 기술 설명이 가능해졌습니다.',
              result: '투자 미팅 기술 설명에 활용',
              icon: '💼',
            },
            {
              role: 'PM',
              project: '사내 관리 시스템',
              text: '기능 우선순위랑 기술 스택까지 자동으로 정리되니 놀랐어요. 개발팀한테 이걸 그대로 보냈더니 바로 견적이 왔습니다. 소통 시간이 체감상 절반으로 줄었어요.',
              result: '개발팀 소통 시간 절반 단축',
              icon: '📋',
            },
          ].map((c, i) => (
            <div key={i} style={{
              background: C.bg, borderRadius: 16, padding: '24px',
              border: '1px solid rgba(0,0,0,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: `linear-gradient(135deg, ${C.blue}, ${C.blueLight})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>{c.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textDark }}>{c.role}</div>
                  <div style={{ fontSize: 12, color: C.gray500 }}>{c.project} 프로젝트</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: C.gray700, lineHeight: 1.7, marginBottom: 14 }}>
                &ldquo;{c.text}&rdquo;
              </p>
              <div style={{
                display: 'inline-block', padding: '4px 12px', borderRadius: 100,
                background: 'rgba(52,211,153,0.1)', fontSize: 12, fontWeight: 600, color: '#059669',
              }}>
                ✓ {c.result}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ━━ FAQ — [O-2] 무료 모델 + [O-3] 5~10분 ━━ */}
      <section style={{ background: C.bg, ...sectionPad }}>
        <h2 style={secTitle}>자주 묻는 질문</h2>
        <div style={{ maxWidth: 680, margin: '40px auto 0' }}>
          {[
            { q: '정말 무료인가요?', a: '네, 완전 무료입니다. 회원가입도 필요 없고, 이메일을 입력하면 완성된 문서를 PDF로 받아보실 수 있습니다. 이메일 없이도 바로 시작할 수 있어요.' },
            { q: '왜 무료인가요? 수익은 어떻게 내나요?', a: '문서 생성은 완전 무료입니다. 마음에 드는 문서가 완성되면, 원하실 경우 위시켓에서 검증된 개발사와 매칭을 도와드립니다. 매칭 수수료로 운영되기 때문에 문서 생성에는 비용이 전혀 들지 않습니다.' },
            { q: 'ChatGPT랑 뭐가 다른가요?', a: '위시켓의 13년 외주 매칭 경험(116,000건 프로젝트)이 반영되어 있습니다. 기능 우선순위(P1/P2/P3) 자동 분류, 기술 스택 추천, 개발사에 바로 전달 가능한 포맷 등 외주에 특화된 결과물을 제공합니다.' },
            { q: '개발 지식이 없어도 사용할 수 있나요?', a: '네, 개발을 전혀 모르셔도 됩니다. AI가 쉬운 말로 질문하고, 답변만 해주시면 전문적인 요구사항 문서가 자동으로 만들어집니다. 스타트업 대표님, 1인 창업자분들이 가장 많이 사용하고 계십니다.' },
            { q: '문서 완성까지 얼마나 걸리나요?', a: '평균 5~10분이면 충분합니다. AI가 핵심 질문을 하고, 답변만 해주시면 개발사 전달용 문서가 자동 생성됩니다.' },
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
            <>아이디어만 말하면, <strong style={{ color: C.blueSoft }}>개발 파트너와 대화할 문서가 5~10분이면 완성</strong></>
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

          {/* 서브: 이메일 */}
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
          {finalError && (
            <p style={{ color: '#EF4444', fontSize: 13, marginTop: 8 }}>{finalError}</p>
          )}
        </div>

        <p style={{ fontSize: 12, color: C.gray600, marginTop: 20, maxWidth: 400, margin: '20px auto 0' }}>
          입력된 정보는 문서 생성에만 사용되며, 제3자에게 공유되지 않습니다.
        </p>
      </section>

      {/* ━━ Footer ━━ */}
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

      {/* ━━ Sticky Bottom Bar — [M-5] heroCtaVisible 기반 ━━ */}
      <StickyBar onStart={handleGuestStart} userCount={userCount} guestLoading={guestLoading} heroCtaVisible={heroCtaVisible} />
    </div>
  );
}

// ─── [M-5] Sticky Bottom Bar — 히어로 CTA 기준 노출 ───
function StickyBar({ onStart, userCount, guestLoading, heroCtaVisible }: {
  onStart: () => void; userCount: number; guestLoading: boolean; heroCtaVisible: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  const isMobile = useIsMobile();

  // [M-5] 히어로 CTA가 보이면 숨기고, 안 보이면 표시
  const visible = !heroCtaVisible;

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
        {/* [R-4] 100명 미만이면 정성적 표현 */}
        {isMobile && (
          <div style={{ fontSize: 11, color: C.gray400, textAlign: 'center' }}>
            {userCount >= 100 ? `${userCount.toLocaleString()}명이 이미 사용 중` : '스타트업 대표 · 1인 창업자가 사용 중'}
          </div>
        )}
        {!isMobile && (
          <span style={{ fontSize: 15, color: '#CBD5E1' }}>
            {userCount >= 100
              ? <><span style={{ color: '#93C5FD', fontWeight: 600 }}>{userCount.toLocaleString()}명</span>이 이미 사용했습니다</>
              : <>아이디어를 <span style={{ color: '#93C5FD', fontWeight: 600 }}>요구사항 문서</span>로 무료 변환</>
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
