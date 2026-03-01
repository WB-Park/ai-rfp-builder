'use client';

// AI PRD Builder — Main App Flow
// 플로우: 랜딩페이지 → 대화형 PRD 작성 → PRD 완성/상담

import { useState } from 'react';
import { RFPData } from '@/types/rfp';
import LandingPage from '@/components/LandingPage';
import ChatInterface from '@/components/ChatInterface';
import RFPComplete from '@/components/RFPComplete';

type AppPhase = 'landing' | 'chat' | 'complete';

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>('landing');
  const [email, setEmail] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [rfpData, setRfpData] = useState<RFPData | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);

  const handleStart = (submittedEmail: string, sid?: string) => {
    setEmail(submittedEmail);
    if (sid) setSessionId(sid);
    setPhase('chat');
  };

  const handleChatComplete = (data: RFPData, messages?: { role: string; content: string }[]) => {
    setRfpData(data);
    if (messages) setChatMessages(messages);
    setPhase('complete');
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
        />
      );
    case 'complete':
      return rfpData ? (
        <RFPComplete rfpData={rfpData} email={email} sessionId={sessionId} chatMessages={chatMessages} />
      ) : null;
    default:
      return null;
  }
}
