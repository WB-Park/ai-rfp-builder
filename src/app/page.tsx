'use client';

// AI PRD Builder — Main App Flow
// 플로우: 랜딩페이지(/) → 대화형 PRD 작성(/chat) → PRD 완성(/complete)
// URL 기반 라우팅: pushState + popstate → GA/Meta 페이지뷰 추적 + 브라우저 백버튼 지원

import { useState, useEffect, useCallback } from 'react';
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

export default function Home() {
  // 초기 phase: 현재 URL에서 결정 (SSR 안전하게 landing 기본값)
  const [phase, setPhase] = useState<AppPhase>('landing');
  const [email, setEmail] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [rfpData, setRfpData] = useState<RFPData | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatMode, setChatMode] = useState<'quick' | 'deep'>('quick');

  // ─── 1. 마운트 시 URL 기반 phase 복원 ───
  useEffect(() => {
    const initialPhase = getPhaseFromPath(window.location.pathname);
    // /chat이나 /complete로 직접 접근 시 → 세션 데이터 없으므로 landing으로 리다이렉트
    if (initialPhase !== 'landing') {
      window.history.replaceState({ phase: 'landing' }, '', '/');
      setPhase('landing');
    } else {
      window.history.replaceState({ phase: 'landing' }, '', '/');
    }
  }, []);

  // ─── 2. phase 변경 시 URL 업데이트 + GA/Meta 이벤트 발생 ───
  const navigateToPhase = useCallback((newPhase: AppPhase, replace = false) => {
    setPhase(newPhase);
    const path = PHASE_PATHS[newPhase];

    if (replace) {
      window.history.replaceState({ phase: newPhase }, '', path);
    } else {
      window.history.pushState({ phase: newPhase }, '', path);
    }

    // GA4 페이지뷰 이벤트 (gtag가 있을 때만)
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).gtag) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'page_view', {
        page_path: path,
        page_title: newPhase === 'landing' ? 'AI 요구사항 빌더' : newPhase === 'chat' ? 'PRD 작성' : 'PRD 완성',
      });
    }

    // Meta Pixel 페이지뷰 (fbq가 있을 때만)
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).fbq) {
      (window as unknown as { fbq: (...args: unknown[]) => void }).fbq('track', 'PageView');
    }
  }, []);

  // ─── 3. 브라우저 백/포워드 버튼 핸들링 ───
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as { phase?: AppPhase } | null;
      if (state?.phase) {
        // /chat이나 /complete로 돌아갈 때 세션 데이터가 없으면 landing으로
        if (state.phase === 'complete' && !rfpData) {
          setPhase('landing');
          window.history.replaceState({ phase: 'landing' }, '', '/');
          return;
        }
        if (state.phase === 'chat' && !email) {
          setPhase('landing');
          window.history.replaceState({ phase: 'landing' }, '', '/');
          return;
        }
        setPhase(state.phase);
      } else {
        // state 없으면 URL 기반으로 판단
        const urlPhase = getPhaseFromPath(window.location.pathname);
        if (urlPhase === 'complete' && !rfpData) {
          setPhase('landing');
          window.history.replaceState({ phase: 'landing' }, '', '/');
        } else if (urlPhase === 'chat' && !email) {
          setPhase('landing');
          window.history.replaceState({ phase: 'landing' }, '', '/');
        } else {
          setPhase(urlPhase);
        }
      }
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
    // history.back() 호출 → popstate 이벤트가 phase를 업데이트
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
