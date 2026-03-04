'use client';

// AI PRD Builder — Main App Flow
// 플로우: 랜딩페이지(/) → 대화형 PRD 작성(/chat) → PRD 완성(/complete)
// URL 기반 라우팅: pushState + popstate → GA/Meta 페이지뷰 추적 + 브라우저 백버튼 지원
// ⚠️ UTM 파라미터 보존: replaceState/pushState 시 utm_*, fbclid, gclid 등 광고 파라미터 유지

import { useState, useEffect, useCallback, useRef } from 'react';
import { RFPData } from '@/types/rfp';
import LandingPage from '@/components/LandingPage';
import ChatInterface from '@/components/ChatInterface';
import RFPComplete from '@/components/RFPComplete';

type AppPhase = 'landing' | 'chat' | 'complete';

// URL pathname → phase 매핑
const PHASE_PATHS: Record<AppPhase, string> = {
  landing: '/',
  chat: '/chat',
  complete: '/complete',
};

function getPhaseFromPath(pathname: string): AppPhase {
  if (pathname === '/chat') return 'chat';
  if (pathname === '/complete') return 'complete';
  return 'landing';
}

// ─── UTM / 광고 파라미터 보존 ───
// 최초 진입 시 쿼리스트링에서 광고 추적 파라미터를 추출하여 세션 동안 유지
const AD_PARAM_PREFIXES = ['utm_', 'fbclid', 'gclid', 'msclkid', 'ttclid', 'twclid', 'li_fat_id', 'mc_cid', 'mc_eid'];

function isAdParam(key: string): boolean {
  return AD_PARAM_PREFIXES.some(prefix => key.startsWith(prefix));
}

/** pathname + 보존된 광고 파라미터를 합쳐 full URL 문자열 반환 */
function buildUrlWithAdParams(pathname: string, savedParams: URLSearchParams): string {
  const merged = new URLSearchParams(savedParams);
  const result = merged.toString();
  return result ? `${pathname}?${result}` : pathname;
}

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>('landing');
  const [email, setEmail] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [rfpData, setRfpData] = useState<RFPData | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatMode, setChatMode] = useState<'quick' | 'deep'>('quick');

  // 최초 진입 시 광고 파라미터를 캡처해 세션 동안 유지
  const adParamsRef = useRef<URLSearchParams>(new URLSearchParams());

  // ─── 1. 마운트 시: UTM 캡처 + phase 복원 ───
  useEffect(() => {
    // 현재 URL의 광고 파라미터 캡처
    const currentParams = new URLSearchParams(window.location.search);
    const saved = new URLSearchParams();
    currentParams.forEach((value, key) => {
      if (isAdParam(key)) {
        saved.set(key, value);
      }
    });
    adParamsRef.current = saved;

    const initialPhase = getPhaseFromPath(window.location.pathname);
    // /chat이나 /complete로 직접 접근 시 → 세션 데이터 없으므로 landing으로
    const targetPath = initialPhase !== 'landing' ? '/' : window.location.pathname;
    const fullUrl = buildUrlWithAdParams(targetPath === '/' ? '/' : targetPath, saved);

    window.history.replaceState({ phase: 'landing' }, '', fullUrl);
    setPhase('landing');
  }, []);

  // ─── 2. phase 변경 시 URL 업데이트 + GA/Meta 이벤트 ───
  const navigateToPhase = useCallback((newPhase: AppPhase, replace = false) => {
    setPhase(newPhase);
    const path = PHASE_PATHS[newPhase];
    const fullUrl = buildUrlWithAdParams(path, adParamsRef.current);

    if (replace) {
      window.history.replaceState({ phase: newPhase }, '', fullUrl);
    } else {
      window.history.pushState({ phase: newPhase }, '', fullUrl);
    }

    // GA4 page_view
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).gtag) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'page_view', {
        page_path: fullUrl,
        page_title: newPhase === 'landing' ? 'AI 요구사항 빌더' : newPhase === 'chat' ? 'PRD 작성' : 'PRD 완성',
      });
    }

    // Meta Pixel PageView
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).fbq) {
      (window as unknown as { fbq: (...args: unknown[]) => void }).fbq('track', 'PageView');
    }
  }, []);

  // ─── 3. 브라우저 백/포워드 버튼 핸들링 ───
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as { phase?: AppPhase } | null;
      const targetPhase = state?.phase || getPhaseFromPath(window.location.pathname);

      // 세션 데이터 없이 /complete나 /chat으로 돌아가려 하면 landing으로
      if (targetPhase === 'complete' && !rfpData) {
        setPhase('landing');
        window.history.replaceState({ phase: 'landing' }, '', buildUrlWithAdParams('/', adParamsRef.current));
        return;
      }
      if (targetPhase === 'chat' && !email) {
        setPhase('landing');
        window.history.replaceState({ phase: 'landing' }, '', buildUrlWithAdParams('/', adParamsRef.current));
        return;
      }
      setPhase(targetPhase);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [rfpData, email]);

  // ─── 핸들러 ───
  const handleStart = (submittedEmail: string, sid?: string) => {
    setEmail(submittedEmail);
    if (sid) setSessionId(sid);
    navigateToPhase('chat');
  };

  const handleChatComplete = (data: RFPData, messages?: { role: string; content: string }[], mode?: 'quick' | 'deep') => {
    setRfpData(data);
    if (messages) setChatMessages(messages);
    if (mode) setChatMode(mode);
    navigateToPhase('complete');
  };

  const handleBack = () => {
    window.history.back();
  };

  switch (phase) {
    case 'landing':
      return <LandingPage onStart={handleStart} />;
    case 'chat':
      return (
        <ChatInterface
          onComplete={handleChatComplete}
          email={email}
          sessionId={sessionId}
          onBack={handleBack}
        />
      );
    case 'complete':
      return rfpData ? (
        <RFPComplete rfpData={rfpData} email={email} sessionId={sessionId} chatMessages={chatMessages} chatMode={chatMode} onBack={handleBack} />
      ) : null;
    default:
      return null;
  }
}
