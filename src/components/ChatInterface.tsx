'use client';

// AI PRD Builder — Chat Interface v11 (Quick Start + Deep Mode v2)
// Quick Start: 기존 가이드 질문형 (가벼운 사용자)
// Deep Mode v2: Quick과 동일한 대화형 시작 → AI가 각 토픽 2~3 depth로 파고듦 + 챌린지/인사이트

import { useState, useRef, useEffect, useCallback } from 'react';
import { RFPData, emptyRFPData, getTopicsCovered, isReadyToComplete } from '@/types/rfp';

type ChatMode = 'quick' | 'deep' | null; // null = 미선택

interface SelectableFeature {
  name: string;
  desc: string;
  category: 'must' | 'recommended';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  selectableFeatures?: SelectableFeature[];
  inlineOptions?: string[];
  isAnalysis?: boolean;
  snapshot?: {
    rfpData: RFPData;
    progressPercent: number;
  };
}

interface ChatInterfaceProps {
  onComplete: (rfpData: RFPData, messages?: { role: string; content: string }[], chatMode?: 'quick' | 'deep') => void;
  email: string;
  sessionId?: string;
}

// 마크다운 → HTML (인사이트+질문 통합 버블 지원)
function renderMarkdown(text: string) {
  // --- 구분자가 있으면 인사이트/질문 영역 분리
  if (text.includes('\n---\n')) {
    const [insight, question] = text.split('\n---\n');
    const renderPart = (t: string) => t
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/💡/g, '<span style="display:inline-block;margin-right:4px">💡</span>')
      .replace(/\n/g, '<br/>');
    return `<div style="font-size:13px;color:var(--text-tertiary);line-height:1.65;padding:10px 14px;background:var(--surface-1);border-radius:10px;margin-bottom:12px">${renderPart(insight)}</div><div style="line-height:1.7">${renderPart(question)}</div>`;
  }
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/---/g, '<hr style="border:none;border-top:1px solid var(--border-default);margin:16px 0;"/>')
    .replace(/💡/g, '<span style="display:inline-block;margin-right:4px">💡</span>')
    .replace(/\n/g, '<br/>');
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? '오후' : '오전';
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${ampm} ${hour}:${m}`;
}

const THINKING_LABELS_QUICK = [
  '프로젝트를 분석하고 있어요...',
  '맞춤 질문을 구성하고 있어요...',
  '위시켓 116,000건 데이터에서 인사이트를 찾고 있어요...',
  '최적의 다음 질문을 결정하고 있어요...',
  '답변을 분석하고 있어요...',
];
const THINKING_LABELS_DEEP = [
  '답변을 깊이 분석하고 있어요...',
  '위시켓 데이터에서 인사이트를 찾고 있어요...',
  '후속 질문을 설계하고 있어요...',
  '프로젝트 구조를 파악하고 있어요...',
  '핵심 포인트를 짚어보고 있어요...',
  '놓친 부분이 없는지 점검 중이에요...',
];

function getThinkingLabel(mode: ChatMode): string {
  const labels = mode === 'deep' ? THINKING_LABELS_DEEP : THINKING_LABELS_QUICK;
  return labels[Math.floor(Math.random() * labels.length)];
}

// (Deep Mode v2: 가이드 칩 폐지 — 대화형 시작으로 전환)


export default function ChatInterface({ onComplete, email, sessionId }: ChatInterfaceProps) {
  // ── 모드 선택 ──
  const [chatMode, setChatMode] = useState<ChatMode>(null);
  const [deepPhase, setDeepPhase] = useState<string>('conversation');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [rfpData, setRfpData] = useState<RFPData>(emptyRFPData);
  const [loading, setLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [canComplete, setCanComplete] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState('');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [featureSelection, setFeatureSelection] = useState<Record<string, boolean>>({});
  // ★★★ 근본적 루프 방지: 기능 선택 UI가 한 번이라도 표시되면 영구 true
  const [featureSelectorShown, setFeatureSelectorShown] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Deep mode: 실시간 인사이트 카드 추적
  const [deepInsights, setDeepInsights] = useState<Array<{ text: string; category: string; turn: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 모바일 감지
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 자동저장
  const autosaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    if (!sessionId) return;
    autosaveTimerRef.current = setInterval(() => {
      const snapshot = JSON.stringify({ rfpData, msgCount: messages.length });
      if (snapshot !== lastSavedRef.current && messages.length > 1) {
        lastSavedRef.current = snapshot;
        fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId, email,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            currentStep: 1, rfpData,
          }),
        }).catch(() => {});
      }
    }, 30000);
    return () => { if (autosaveTimerRef.current) clearInterval(autosaveTimerRef.current); };
  }, [sessionId, email, messages, rfpData]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxH = 120;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxH)}px`;
    }
  }, [chatMode, deepPhase]);

  const saveSession = useCallback(async (
    updatedRfpData: RFPData,
    updatedMessages: ChatMessage[],
    completed: boolean
  ) => {
    if (!sessionId) return;
    try {
      await fetch('/api/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          rfpData: updatedRfpData,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          currentStep: 1,
          completed,
        }),
      });
    } catch (err) {
      console.error('Session save failed:', err);
    }
  }, [sessionId]);

  // ── 모드 선택 핸들러 ──
  const selectMode = (mode: ChatMode) => {
    setChatMode(mode);
    const userName = email.startsWith('guest@') ? '' : `**${email.split('@')[0]}**님, `;

    if (mode === 'quick') {
      setMessages([{
        role: 'assistant',
        content: `안녕하세요! ${userName}위시켓 **AI PRD 빌더**입니다.\n\n대화 몇 번이면 **전문 기획서(PRD)**가 완성됩니다. AI가 맥락에 맞는 질문을 이어갈게요.\n\n**어떤 서비스를 만들고 싶으신가요?** 한 줄이면 충분해요.`,
        timestamp: Date.now(),
      }]);
    } else if (mode === 'deep') {
      setDeepPhase('conversation');
      setMessages([{
        role: 'assistant',
        content: `안녕하세요! ${userName}위시켓 **AI PRD 빌더 Deep Mode**입니다.\n\n저는 시니어 PM으로서 각 주제를 **깊이 파고들고, 데이터 기반으로 챌린지**해 드립니다.\n\n**어떤 서비스를 만들고 싶으세요?** 한 줄이면 충분해요.`,
        timestamp: Date.now(),
        inlineOptions: ['🛒 커머스/쇼핑몰', '💬 커뮤니티/SNS', '📋 업무 관리 SaaS', '🏥 헬스케어/웰니스'],
      }]);
    }

    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── 메시지 전송 ──
  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || loading) return;

    const userMsg: ChatMessage = {
      role: 'user' as const,
      content: userMessage,
      timestamp: Date.now(),
      snapshot: {
        rfpData: JSON.parse(JSON.stringify(rfpData)),
        progressPercent,
      },
    };
    const newMessages: ChatMessage[] = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);
    setThinkingLabel(getThinkingLabel(chatMode));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          rfpData,
          chatMode: chatMode || 'quick',
          deepPhase,
          // ★ 서버에게 기능 선택 UI가 이미 표시되었음을 알림 (루프 근본 차단)
          featureSelectorShown,
        }),
      });

      const data = await res.json();

      let updatedRfpData = rfpData;
      let completed = false;

      // rfpUpdate 반영
      if (data.rfpUpdate) {
        updatedRfpData = { ...rfpData };
        const { section, value } = data.rfpUpdate;
        if (section && value !== undefined) {
          if (section === 'coreFeatures') {
            if (Array.isArray(value)) {
              updatedRfpData.coreFeatures = value;
            } else if (typeof value === 'string') {
              try {
                const parsed = JSON.parse(value);
                updatedRfpData.coreFeatures = Array.isArray(parsed) ? parsed : [];
              } catch {
                updatedRfpData.coreFeatures = [];
              }
            }
          } else if (section in updatedRfpData && section !== 'budgetTimeline') {
            (updatedRfpData as unknown as Record<string, unknown>)[section] = value;
          }
        }
      }

      // Deep Mode: multiUpdates 반영
      if (data.multiUpdates && Array.isArray(data.multiUpdates)) {
        updatedRfpData = { ...updatedRfpData };
        for (const upd of data.multiUpdates) {
          if (upd.section && upd.value && upd.section in updatedRfpData && upd.section !== 'budgetTimeline' && upd.section !== 'coreFeatures') {
            (updatedRfpData as unknown as Record<string, unknown>)[upd.section] = upd.value;
          }
        }
      }

      setRfpData(updatedRfpData);

      // Deep mode: 실시간 인사이트 수집
      if (chatMode === 'deep' && data.insightSummary && data.insightSummary.length > 3) {
        const turnNum = messages.filter((m: ChatMessage) => m.role === 'user').length;
        setDeepInsights(prev => [...prev, {
          text: data.insightSummary,
          category: data.insightCategory || 'vision',
          turn: turnNum,
        }]);
      }

      // Deep Phase 업데이트
      if (data.deepPhase) {
        setDeepPhase(data.deepPhase);
      }

      // 프로그레스 업데이트
      if (data.progress !== undefined) {
        setProgressPercent(data.progress);
      } else {
        const covered = getTopicsCovered(updatedRfpData);
        setProgressPercent(Math.round((covered.length / 6) * 100));
      }

      // 완료 가능 여부
      if (data.canComplete !== undefined) {
        setCanComplete(data.canComplete);
      } else {
        setCanComplete(isReadyToComplete(updatedRfpData));
      }

      if (data.nextAction === 'complete') {
        completed = true;
        setCanComplete(true);
      }

      if (data.thinkingLabel) {
        setThinkingLabel(data.thinkingLabel);
      }

      // 분석 + 질문을 하나의 메시지로 통합 (시각적으로만 구분)
      const hasAnalysis = data.analysisMessage && data.analysisMessage.trim();
      const hasQuestion = data.questionMessage && data.questionMessage.trim();

      let combinedContent = '';
      if (hasAnalysis && hasQuestion) {
        combinedContent = `${data.analysisMessage}\n---\n${data.questionMessage}`;
      } else {
        combinedContent = data.message || data.questionMessage || data.analysisMessage || '계속 진행해볼까요?';
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant' as const,
        content: combinedContent,
        timestamp: Date.now(),
        selectableFeatures: data.selectableFeatures || undefined,
        inlineOptions: (data.inlineOptions || []).filter((opt: string) =>
          !/RFP|PRD|생성|완성|시작하기/.test(opt)
        ).length > 0 ? (data.inlineOptions || []).filter((opt: string) =>
          !/RFP|PRD|생성|완성|시작하기/.test(opt)
        ) : undefined,
        isAnalysis: false,
      };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      // ★★★ 기능 리스트: featureSelectorShown이 이미 true이거나, coreFeatures가 이미 있으면 무시
      if (data.selectableFeatures && data.selectableFeatures.length > 0 && !featureSelectorShown && updatedRfpData.coreFeatures.length === 0) {
        const initialSelection: Record<string, boolean> = {};
        for (const f of data.selectableFeatures) {
          initialSelection[f.name] = f.category === 'must';
        }
        setFeatureSelection(initialSelection);
        // ★★★ 영구 플래그 설정 — 이후 절대 다시 표시되지 않음
        setFeatureSelectorShown(true);
      }
      // 서버에서 featureSelectorShown=true를 받아도 설정
      if (data.featureSelectorShown) {
        setFeatureSelectorShown(true);
      }

      saveSession(updatedRfpData, finalMessages, completed);

    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
      setThinkingLabel('');
      inputRef.current?.focus();
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    await sendMessage(msg);
  };

  // 대화 롤백
  const handleRollback = (msgIndex: number) => {
    if (loading) return;
    const targetMsg = messages[msgIndex];
    if (!targetMsg || targetMsg.role !== 'user') return;

    const truncated = messages.slice(0, msgIndex);
    setMessages(truncated);

    if (targetMsg.snapshot) {
      setRfpData(targetMsg.snapshot.rfpData);
      setProgressPercent(targetMsg.snapshot.progressPercent);
    }

    setInput(targetMsg.content);
    setCanComplete(false);
    setIsComplete(false);
    inputRef.current?.focus();
  };

  // F7: 문서 업로드
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      let text = '';
      text = await file.text();

      if (text.length < 20) {
        setMessages(prev => [...prev, {
          role: 'assistant', content: '업로드된 파일의 내용이 너무 짧습니다. 텍스트 기반 문서(.txt, .md)를 업로드해주세요.',
          timestamp: Date.now(),
        }]);
        setUploading(false);
        return;
      }

      setMessages(prev => [...prev, {
        role: 'user', content: `📄 기존 기획서 업로드: ${file.name}`,
        timestamp: Date.now(),
      }]);

      const res = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText: text }),
      });

      const data = await res.json();
      if (data.analysis) {
        const a = data.analysis;
        const updated = { ...rfpData };
        if (a.overview) updated.overview = a.overview;
        if (a.targetUsers) updated.targetUsers = a.targetUsers;
        if (a.coreFeatures && Array.isArray(a.coreFeatures)) {
          updated.coreFeatures = a.coreFeatures.map((f: string) => ({
            name: f, description: f, priority: 'P1' as const,
          }));
        }
        if (a.techRequirements) updated.techRequirements = a.techRequirements;
        if (a.referenceServices) updated.referenceServices = a.referenceServices;
        if (a.additionalRequirements) updated.additionalRequirements = a.additionalRequirements;
        setRfpData(updated);

        const covered = getTopicsCovered(updated);
        setProgressPercent(Math.round((covered.length / 6) * 100));
        setCanComplete(isReadyToComplete(updated));

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `📋 **기존 문서 분석 완료!**\n\n${a.summary || '문서에서 핵심 정보를 추출했습니다.'}\n\n추출된 정보가 우측 미리보기에 자동으로 채워졌습니다. 부족한 부분은 대화를 통해 보완해 드리겠습니다.`,
          timestamp: Date.now(),
        }]);
      }
    } catch (err) {
      console.error('File upload error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant', content: '문서 분석 중 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: Date.now(),
      }]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 수집된 항목 수
  const coveredItems = [
    rfpData.overview, rfpData.targetUsers,
    rfpData.coreFeatures.length > 0 ? 'yes' : '',
    rfpData.techRequirements, rfpData.referenceServices,
    rfpData.additionalRequirements,
  ].filter(Boolean).length;

  // ═══════════════════════════════════════
  //  모드 선택 화면
  // ═══════════════════════════════════════
  if (chatMode === null) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--surface-0)',
        padding: isMobile ? 16 : 24,
      }}>
        <div style={{
          maxWidth: 720, width: '100%',
          animation: 'fadeInUp 0.5s ease-out',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(37,99,235,0.25)',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 style={{
              fontSize: 28, fontWeight: 800, color: 'var(--text-primary)',
              letterSpacing: '-0.02em', marginBottom: 8,
            }}>
              AI PRD 빌더
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
              대화만으로 전문 기획서를 완성하세요
            </p>
          </div>

          {/* Mode Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 16,
          }}>
            {/* Quick Start */}
            <button
              onClick={() => selectMode('quick')}
              style={{
                textAlign: 'left', cursor: 'pointer',
                padding: 28, borderRadius: 16,
                border: '2px solid var(--border-default)',
                background: 'var(--surface-0)',
                transition: 'all 0.2s ease',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.12)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                fontSize: 32, marginBottom: 12,
              }}>⚡</div>
              <div style={{
                fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
                marginBottom: 6,
              }}>빠른 시작</div>
              <div style={{
                fontSize: 14, fontWeight: 500, color: 'var(--color-primary)',
                marginBottom: 12,
              }}>2분 · 가이드 질문형</div>
              <p style={{
                fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.6, margin: 0,
              }}>
                AI가 핵심 질문을 하나씩 물어봅니다.<br/>
                선택지 클릭만으로도 PRD 완성이 가능해요.
              </p>
              <div style={{
                marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6,
              }}>
                {['아이디어만 있어도 OK', '선택지 제공', '2분 완성'].map(tag => (
                  <span key={tag} style={{
                    fontSize: 11, fontWeight: 500, color: 'var(--text-quaternary)',
                    background: 'var(--surface-2)', padding: '4px 10px',
                    borderRadius: 20,
                  }}>{tag}</span>
                ))}
              </div>
            </button>

            {/* Deep Mode */}
            <button
              onClick={() => selectMode('deep')}
              style={{
                textAlign: 'left', cursor: 'pointer',
                padding: 28, borderRadius: 16,
                border: '2px solid transparent',
                background: 'linear-gradient(135deg, rgba(37,99,235,0.04), rgba(37,99,235,0.08))',
                transition: 'all 0.2s ease',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,99,235,0.18)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Recommended badge */}
              <div style={{
                position: 'absolute', top: 12, right: 12,
                fontSize: 11, fontWeight: 700, color: 'white',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                padding: '3px 10px', borderRadius: 20,
              }}>추천</div>

              <div style={{
                fontSize: 32, marginBottom: 12,
              }}>🎯</div>
              <div style={{
                fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
                marginBottom: 6,
              }}>Deep Mode</div>
              <div style={{
                fontSize: 14, fontWeight: 500, color: 'var(--color-primary)',
                marginBottom: 12,
              }}>5분 · AI가 더 깊이 파고듭니다</div>
              <p style={{
                fontSize: 14, color: 'var(--text-tertiary)', lineHeight: 1.6, margin: 0,
              }}>
                한 줄이면 충분합니다. AI PM이<br/>
                각 주제를 <strong style={{ color: 'var(--text-secondary)' }}>2~3단계 깊이로 챌린지</strong>해 드립니다.
              </p>
              <div style={{
                marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 6,
              }}>
                {['한 줄이면 충분', 'AI 챌린지', '깊이 있는 후속질문', '최고 퀄리티'].map(tag => (
                  <span key={tag} style={{
                    fontSize: 11, fontWeight: 500,
                    color: 'var(--color-primary)',
                    background: 'rgba(37,99,235,0.08)', padding: '4px 10px',
                    borderRadius: 20,
                  }}>{tag}</span>
                ))}
              </div>
            </button>
          </div>

          {/* Sub text */}
          <p style={{
            textAlign: 'center', fontSize: 13, color: 'var(--text-quaternary)',
            marginTop: 20,
          }}>
            어떤 모드든 결과물은 동일한 전문 PRD입니다. 입력의 깊이가 퀄리티를 결정합니다.
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  미리보기 패널
  // ═══════════════════════════════════════
  const previewPanel = (
    <div style={{
      width: isMobile ? '100%' : '50%',
      background: 'var(--surface-1)',
      overflowY: 'auto',
      ...(isMobile ? {
        position: 'fixed' as const,
        top: 0, left: showPreview ? 0 : '100%',
        right: 0, bottom: 0, zIndex: 50,
        transition: 'left 0.3s ease-out',
      } : {}),
    }}>
      {isMobile && (
        <div style={{
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-default)',
          background: 'var(--surface-0)',
          position: 'sticky' as const, top: 0, zIndex: 2,
        }}>
          <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>PRD 미리보기</span>
          <button onClick={() => setShowPreview(false)} style={{
            background: 'none', border: 'none', fontSize: 20,
            color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px 8px',
          }}>✕</button>
        </div>
      )}
      <div style={{ padding: isMobile ? '16px' : 'var(--space-xl)' }}>
        <div style={{
          background: 'var(--surface-0)',
          borderRadius: 'var(--card-radius)',
          padding: isMobile ? '16px' : 'var(--space-xl)',
          boxShadow: 'var(--shadow-sm)',
          minHeight: isMobile ? 'auto' : 'calc(100vh - 64px)',
        }}>
          {!isMobile && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 'var(--space-xl)',
              paddingBottom: 'var(--space-md)',
              borderBottom: '1px solid var(--border-default)',
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 'var(--letter-tight)' }}>
                PRD 미리보기
              </h2>
              <span style={{
                fontSize: 12, color: 'var(--text-quaternary)',
                background: 'var(--surface-2)', padding: '4px 10px',
                borderRadius: 'var(--radius-full)', fontWeight: 500,
              }}>
                실시간 업데이트
              </span>
            </div>
          )}

          {chatMode === 'deep' ? (
            /* ═══ Deep Mode 전용 미리보기 — 실시간 인사이트 ═══ */
            <>
              {/* 상단: 프로젝트 이해도 프로그레스 */}
              <div style={{ marginBottom: 'var(--space-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>프로젝트 이해도</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>{deepInsights.length}개 인사이트 발견</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    background: 'linear-gradient(90deg, var(--color-primary), #8B5CF6)',
                    width: `${Math.min(progressPercent, 100)}%`,
                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  }} />
                </div>
                {/* 마이크로 단계 칩 */}
                <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                  {[
                    { phase: 'explore', label: '탐색' },
                    { phase: 'understand', label: '이해' },
                    { phase: 'define', label: '정의' },
                    { phase: 'refine', label: '정제' },
                  ].map((step, idx) => {
                    const phaseOrder = ['explore', 'understand', 'define', 'refine'];
                    const currentIdx = phaseOrder.indexOf(deepPhase);
                    const isActive = idx === currentIdx;
                    const isDone = idx < currentIdx;
                    return (
                      <span key={step.phase} style={{
                        fontSize: 11, fontWeight: isActive ? 700 : 500, padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: isActive ? 'rgba(var(--color-primary-rgb), 0.1)' : isDone ? 'rgba(52,199,89,0.08)' : 'var(--surface-2)',
                        color: isActive ? 'var(--color-primary)' : isDone ? '#34C759' : 'var(--text-quaternary)',
                        transition: 'all 0.3s ease',
                      }}>
                        {isDone ? '✓ ' : ''}{step.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* 실시간 인사이트 카드들 — 대화할수록 쌓임 */}
              {deepInsights.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34C759', animation: 'pulse 2s infinite' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                      실시간 인사이트
                    </span>
                  </div>
                  {deepInsights.map((insight, idx) => {
                    const isLatest = idx === deepInsights.length - 1;
                    const categoryConfig: Record<string, { icon: string; color: string; bg: string }> = {
                      vision: { icon: '🎯', color: '#7C3AED', bg: 'rgba(124,58,237,0.06)' },
                      user: { icon: '👥', color: '#0EA5E9', bg: 'rgba(14,165,233,0.06)' },
                      problem: { icon: '⚡', color: '#EF4444', bg: 'rgba(239,68,68,0.06)' },
                      solution: { icon: '💡', color: '#F59E0B', bg: 'rgba(245,158,11,0.06)' },
                      market: { icon: '📊', color: '#10B981', bg: 'rgba(16,185,129,0.06)' },
                      tech: { icon: '💻', color: '#6366F1', bg: 'rgba(99,102,241,0.06)' },
                      strategy: { icon: '🧭', color: '#EC4899', bg: 'rgba(236,72,153,0.06)' },
                    };
                    const cat = categoryConfig[insight.category] || categoryConfig.vision;
                    return (
                      <div key={idx} style={{
                        padding: '14px 16px', borderRadius: 'var(--radius-md)',
                        background: isLatest ? cat.bg : 'var(--surface-1)',
                        border: `1px solid ${isLatest ? cat.color + '30' : 'var(--border-default)'}`,
                        transition: 'all 0.4s ease',
                        animation: isLatest ? 'slideInRight 0.4s ease-out' : 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{cat.icon}</span>
                          <div style={{ flex: 1 }}>
                            <p style={{
                              fontSize: 13, lineHeight: 1.6, margin: 0,
                              color: isLatest ? 'var(--text-primary)' : 'var(--text-secondary)',
                              fontWeight: isLatest ? 600 : 400,
                            }}>{insight.text}</p>
                            {isLatest && (
                              <span style={{ fontSize: 10, color: cat.color, fontWeight: 600, marginTop: 6, display: 'inline-block' }}>
                                방금 발견 ·  턴 {insight.turn}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: isMobile ? 'var(--space-xl)' : 'var(--space-3xl) var(--space-lg)' }}>
                  <div style={{ fontSize: 40, marginBottom: 'var(--space-md)', opacity: 0.4, animation: 'float 3s ease-in-out infinite' }}>🔍</div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 6 }}>
                    대화에서 인사이트를 추출하고 있어요
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-quaternary)', lineHeight: 1.5 }}>
                    대화할수록 프로젝트에 대한 이해가 쌓이고,<br />이 내용이 PRD에 자동으로 반영됩니다
                  </p>
                </div>
              )}

              {/* 하단: 프로젝트 요약 (rfpData 기반 — 접힌 상태로) */}
              {rfpData.overview && deepInsights.length >= 2 && (
                <div style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-default)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 12 }}>📋</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>프로젝트 요약</span>
                  </div>
                  <div style={{
                    padding: '14px 16px', borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.03), transparent)',
                    border: '1px solid rgba(var(--color-primary-rgb), 0.08)',
                  }}>
                    <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', margin: 0 }}>
                      {rfpData.overview.length > 200 ? rfpData.overview.slice(0, 200) + '...' : rfpData.overview}
                    </p>
                  </div>
                  {rfpData.targetUsers && (
                    <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-1)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>타겟:</strong> {rfpData.targetUsers.length > 100 ? rfpData.targetUsers.slice(0, 100) + '...' : rfpData.targetUsers}
                    </div>
                  )}
                  {rfpData.techRequirements && (
                    <div style={{ marginTop: 6, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-1)', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>기술:</strong> {rfpData.techRequirements}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* ═══ Quick Mode 미리보기 (기존) ═══ */
            <>
              {/* 수집 상태 칩 */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 'var(--space-lg)' }}>
                {[
                  { label: '프로젝트 개요', filled: !!rfpData.overview, icon: '📋' },
                  { label: '타겟 사용자', filled: !!rfpData.targetUsers, icon: '👥' },
                  { label: '핵심 기능', filled: rfpData.coreFeatures.length > 0, icon: '⚙️' },
                  { label: '기술 요구사항', filled: !!rfpData.techRequirements, icon: '💻' },
                  { label: '참고 서비스', filled: !!rfpData.referenceServices, icon: '🔍' },
                  { label: '추가 요구사항', filled: !!rfpData.additionalRequirements, icon: '📝' },
                ].map(item => (
                  <span key={item.label} style={{
                    fontSize: 11, fontWeight: 500,
                    padding: '4px 10px', borderRadius: 'var(--radius-full)',
                    background: item.filled ? 'rgba(var(--color-primary-rgb), 0.08)' : 'var(--surface-2)',
                    color: item.filled ? 'var(--color-primary)' : 'var(--text-quaternary)',
                    border: `1px solid ${item.filled ? 'rgba(var(--color-primary-rgb), 0.2)' : 'transparent'}`,
                    transition: 'all 0.3s ease',
                  }}>
                    {item.filled ? '✓' : ''} {item.icon} {item.label}
                  </span>
                ))}
              </div>

              {rfpData.overview ? (
                <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
                  <RFPSection title="프로젝트 개요" icon="📋" content={rfpData.overview} />
                  {rfpData.targetUsers && <RFPSection title="타겟 사용자" icon="👥" content={rfpData.targetUsers} />}
                  {Array.isArray(rfpData.coreFeatures) && rfpData.coreFeatures.length > 0 && (
                    <div>
                      <SectionLabel title="핵심 기능" icon="⚙️" />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                        {rfpData.coreFeatures.map((f, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)',
                            padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'var(--surface-1)',
                          }}>
                            <span className={`chip-${(f.priority || 'P1').toLowerCase()}`} style={{ flexShrink: 0, marginTop: 2 }}>{f.priority || 'P1'}</span>
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', display: 'block' }}>{f.name}</span>
                              {f.description && f.description !== f.name && (
                                <span style={{ color: 'var(--text-tertiary)', fontSize: 13, lineHeight: 1.5, display: 'block', marginTop: 4 }}>{f.description}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {rfpData.referenceServices && <RFPSection title="참고 서비스" icon="🔍" content={rfpData.referenceServices} />}
                  {rfpData.techRequirements && <RFPSection title="기술 요구사항" icon="💻" content={rfpData.techRequirements} />}
                  {rfpData.additionalRequirements && <RFPSection title="추가 요구사항" icon="📝" content={rfpData.additionalRequirements} />}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: isMobile ? 'var(--space-xl)' : 'var(--space-4xl) var(--space-lg)' }}>
                  <div style={{ fontSize: 48, marginBottom: 'var(--space-md)', opacity: 0.3, animation: 'float 3s ease-in-out infinite' }}>📝</div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>
                    아직 작성된 내용이 없어요
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--text-quaternary)' }}>
                    AI와 대화하면 여기에 PRD가 실시간으로 채워집니다
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Deep Mode: 심플 배지 (phase indicator 제거 → 대화형이므로 불필요)
  const deepModeBadge = chatMode === 'deep' ? (
    <span style={{
      fontSize: 11, fontWeight: 600, color: 'var(--color-primary)',
      background: 'rgba(var(--color-primary-rgb), 0.08)',
      padding: '2px 8px', borderRadius: 'var(--radius-full)', marginLeft: 6,
    }}>Deep</span>
  ) : null;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--surface-0)' }}>
      {/* Left: Chat Panel */}
      <div style={{
        width: isMobile ? '100%' : '50%',
        display: 'flex', flexDirection: 'column',
        borderRight: isMobile ? 'none' : '1px solid var(--border-default)',
      }}>
        {/* Header */}
        <div className="glass-header" style={{ padding: isMobile ? '12px 16px' : '16px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isComplete ? 'var(--color-success)' : canComplete ? '#F59E0B' : 'var(--color-primary)',
                boxShadow: isComplete
                  ? '0 0 8px rgba(52, 199, 89, 0.4)'
                  : canComplete
                  ? '0 0 8px rgba(245, 158, 11, 0.4)'
                  : '0 0 8px rgba(var(--color-primary-rgb), 0.4)',
              }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {isComplete ? 'PRD 완성 준비' : chatMode === 'deep' ? 'Deep Mode' : 'AI PRD 빌더'}
              </span>
              {deepModeBadge}
              {canComplete && !isComplete && (
                <span className="animate-fade-in" style={{
                  fontSize: 11, color: '#F59E0B',
                  fontWeight: 500, marginLeft: 4,
                  padding: '2px 8px', borderRadius: 'var(--radius-full)',
                  background: 'rgba(245, 158, 11, 0.08)',
                }}>
                  완성 가능
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* 모드 전환 버튼 */}
              <button onClick={() => {
                setChatMode(null);
                setMessages([]);
                setRfpData(emptyRFPData);
                setProgressPercent(0);
                setCanComplete(false);
                setIsComplete(false);
                setDeepPhase('conversation');
              }} style={{
                fontSize: 11, fontWeight: 500, color: 'var(--text-quaternary)',
                background: 'none', border: '1px solid var(--border-default)',
                padding: '3px 10px', borderRadius: 'var(--radius-full)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-tertiary)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-quaternary)'; }}
              >
                모드 변경
              </button>
              {isMobile && rfpData.overview && (
                <button onClick={() => setShowPreview(true)} style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--color-primary)',
                  background: 'var(--color-primary-alpha)', border: 'none',
                  padding: '4px 12px', borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                }}>
                  미리보기
                </button>
              )}
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                {coveredItems}/6 항목
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{
              width: `${progressPercent}%`,
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          style={{
            flex: 1, overflowY: 'auto',
            padding: isMobile ? '16px' : '24px',
            display: 'flex', flexDirection: 'column', gap: 'var(--space-md)',
            scrollBehavior: 'smooth',
          }}
        >
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              animationDelay: `${i * 0.05}s`,
            }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-primary-alpha)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginRight: 'var(--space-sm)', flexShrink: 0, marginTop: 2,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
              )}
              <div style={{ maxWidth: msg.role === 'user' ? '80%' : '85%' }}>
                <div className={`${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'} animate-fade-in-up`}
                  style={{ position: 'relative' }}
                >
                  {msg.role === 'assistant' ? (
                    <div style={{ margin: 0, lineHeight: 1.7 }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  ) : (
                    (() => {
                      try {
                        const parsed = JSON.parse(msg.content);
                        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].name) {
                          return (
                            <div style={{ margin: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 6 }}>
                                선택한 기능 {parsed.length}개
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {parsed.map((f: {name: string}, idx: number) => (
                                  <span key={idx} style={{
                                    display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                                    background: 'rgba(255,255,255,0.15)', fontSize: 12, color: 'rgba(255,255,255,0.9)',
                                  }}>{f.name}</span>
                                ))}
                              </div>
                            </div>
                          );
                        }
                      } catch {}
                      return <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>;
                    })()
                  )}
                </div>

                {/* Inline options + 모두 + 잘 모르겠음 + PRD 작성하기 칩 */}
                {msg.role === 'assistant' && i === messages.length - 1 && !loading && !isComplete && (
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {/* "모두" 칩 — 선택지가 2개 이상일 때만 표시 */}
                    {msg.inlineOptions && msg.inlineOptions.length >= 2 && (
                      <button onClick={() => sendMessage(msg.inlineOptions!.join(', '))} style={{
                        padding: '7px 14px', borderRadius: 20,
                        border: '1.5px solid var(--color-primary)',
                        background: 'var(--color-primary)', color: 'white',
                        fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-kr)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                      >모두</button>
                    )}
                    {msg.inlineOptions && msg.inlineOptions.length > 0 && msg.inlineOptions.map((option, oi) => (
                      <button key={oi} onClick={() => sendMessage(option)} style={{
                        padding: '7px 14px', borderRadius: 20,
                        border: '1.5px solid var(--color-primary)',
                        background: 'transparent', color: 'var(--color-primary)',
                        fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-kr)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                      >{option}</button>
                    ))}
                    {/* "잘 모르겠음" 칩 — 선택지가 있을 때만 */}
                    {msg.inlineOptions && msg.inlineOptions.length > 0 && (
                      <button onClick={() => sendMessage('잘 모르겠어요, 추천해주세요')} style={{
                        padding: '7px 14px', borderRadius: 20,
                        border: '1.5px dashed var(--text-quaternary)',
                        background: 'transparent', color: 'var(--text-quaternary)',
                        fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-kr)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-tertiary)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--text-quaternary)'; e.currentTarget.style.color = 'var(--text-quaternary)'; }}
                      >잘 모르겠음</button>
                    )}
                    <button onClick={() => {
                      const el = inputRef.current;
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => {
                          el.focus();
                          el.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.3)';
                          setTimeout(() => { el.style.boxShadow = ''; }, 1500);
                        }, 300);
                      }
                    }} style={{
                      padding: '7px 14px', borderRadius: 20,
                      border: '1.5px dashed var(--text-tertiary)',
                      background: 'transparent', color: 'var(--text-tertiary)',
                      fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-kr)',
                      cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--text-tertiary)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      직접 입력하기
                    </button>
                    <button onClick={() => sendMessage('건너뛰기')} style={{
                      padding: '7px 14px', borderRadius: 20,
                      border: '1.5px dashed var(--text-quaternary)',
                      background: 'transparent', color: 'var(--text-quaternary)',
                      fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-kr)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-tertiary)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--text-quaternary)'; e.currentTarget.style.color = 'var(--text-quaternary)'; }}
                    >건너뛰기</button>
                    {/* "PRD 작성하기" 상시 칩 — 유저 메시지 3개 이상 + overview 있으면 항상 표시 */}
                    {messages.filter(m => m.role === 'user').length >= 3 && rfpData.overview && (
                      <button onClick={() => setShowCompleteModal(true)} style={{
                        padding: '7px 16px', borderRadius: 20,
                        border: 'none',
                        background: canComplete
                          ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))'
                          : 'linear-gradient(135deg, #F59E0B, #FBBF24)',
                        color: 'white',
                        fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-kr)',
                        cursor: 'pointer', transition: 'all 0.15s',
                        boxShadow: canComplete ? '0 2px 8px rgba(37,99,235,0.25)' : '0 2px 8px rgba(245,158,11,0.25)',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {canComplete ? '제품 요구사항 정의서 완성하기' : '여기까지 정의서 작성하기'}
                      </button>
                    )}
                  </div>
                )}

                {/* 타임스탬프 + 롤백 */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: 8, marginTop: 4,
                }}>
                  {msg.timestamp && (
                    <span style={{ fontSize: 11, color: 'var(--text-quaternary)',
                      paddingLeft: msg.role === 'assistant' ? 4 : 0,
                      paddingRight: msg.role === 'user' ? 4 : 0,
                    }}>{formatTime(msg.timestamp)}</span>
                  )}
                  {msg.role === 'user' && i > 0 && i < messages.length - 1 && !loading && (
                    <button onClick={() => handleRollback(i)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 11, color: 'var(--text-quaternary)',
                      padding: '2px 6px', borderRadius: 4, transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)'; e.currentTarget.style.background = 'rgba(37,99,235,0.06)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-quaternary)'; e.currentTarget.style.background = 'none'; }}
                    title="이 답변을 수정하고 다시 진행합니다"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                      여기서 다시하기
                    </button>
                  )}
                </div>

                {/* 기능 선택 UI */}
                {msg.role === 'assistant' && msg.selectableFeatures && msg.selectableFeatures.length > 0 && i === messages.length - 1 && !loading && (
                  <div style={{
                    marginTop: 12, background: 'var(--surface-1)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)', overflow: 'hidden',
                  }}>
                    <div style={{
                      padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'var(--surface-0)', borderBottom: '1px solid var(--border-default)',
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        기능 선택 ({Object.values(featureSelection).filter(Boolean).length}/{msg.selectableFeatures.length})
                      </span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => {
                          const all: Record<string, boolean> = {};
                          msg.selectableFeatures!.forEach(f => { all[f.name] = true; });
                          setFeatureSelection(all);
                        }} style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontFamily: 'var(--font-kr)' }}>
                          전체 선택
                        </button>
                        <button onClick={() => {
                          const none: Record<string, boolean> = {};
                          msg.selectableFeatures!.forEach(f => { none[f.name] = false; });
                          setFeatureSelection(none);
                        }} style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontFamily: 'var(--font-kr)' }}>
                          전체 해제
                        </button>
                      </div>
                    </div>
                    {msg.selectableFeatures.filter(f => f.category === 'must').length > 0 && (
                      <div style={{ padding: '10px 14px 4px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        🔴 필수 기능 ({msg.selectableFeatures.filter(f => f.category === 'must').length}개)
                      </div>
                    )}
                    {msg.selectableFeatures.filter(f => f.category === 'must').map((feat) => (
                      <FeatureButton key={feat.name} feat={feat} selected={!!featureSelection[feat.name]}
                        onToggle={() => setFeatureSelection(prev => ({ ...prev, [feat.name]: !prev[feat.name] }))} />
                    ))}
                    {msg.selectableFeatures.filter(f => f.category === 'recommended').length > 0 && (
                      <div style={{ padding: '10px 14px 4px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        🟡 추천 기능 ({msg.selectableFeatures.filter(f => f.category === 'recommended').length}개)
                      </div>
                    )}
                    {msg.selectableFeatures.filter(f => f.category === 'recommended').map((feat) => (
                      <FeatureButton key={feat.name} feat={feat} selected={!!featureSelection[feat.name]}
                        onToggle={() => setFeatureSelection(prev => ({ ...prev, [feat.name]: !prev[feat.name] }))} />
                    ))}
                    <div style={{
                      padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'var(--surface-0)',
                    }}>
                      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>💡 필요한 기능만 선택하세요</span>
                      <button
                        onClick={() => {
                          const selected = msg.selectableFeatures!.filter(f => featureSelection[f.name]);
                          if (selected.length === 0) return;
                          const payload = JSON.stringify(selected.map(f => ({ name: f.name, desc: f.desc, category: f.category })));
                          setMessages(prev => prev.map((m, idx) =>
                            idx === prev.length - 1 ? { ...m, selectableFeatures: undefined } : m
                          ));
                          setFeatureSelection({});
                          sendMessage(payload);
                        }}
                        style={{
                          padding: '8px 24px', borderRadius: 'var(--radius-full)',
                          border: 'none',
                          background: Object.values(featureSelection).filter(Boolean).length > 0
                            ? 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))'
                            : 'var(--border-default)',
                          color: Object.values(featureSelection).filter(Boolean).length > 0 ? 'white' : 'var(--text-quaternary)',
                          fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-kr)',
                          cursor: Object.values(featureSelection).filter(Boolean).length > 0 ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                        }}
                      >
                        {Object.values(featureSelection).filter(Boolean).length}개 선택 완료
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                background: 'var(--color-primary-alpha)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="chat-bubble-assistant animate-fade-in">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                  </div>
                  {thinkingLabel && (
                    <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>{thinkingLabel}</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom */}
        {showScrollBtn && (
          <button onClick={scrollToBottom} style={{
            position: 'absolute', bottom: isMobile ? 170 : 140,
            left: isMobile ? '50%' : '25%', transform: 'translateX(-50%)',
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--surface-0)', border: '1px solid var(--border-strong)',
            boxShadow: 'var(--shadow-md)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 5, transition: 'all var(--duration-fast)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}

        {/* Input Area */}
        <div style={{
          padding: isMobile ? '12px 16px' : '16px 24px',
          borderTop: '1px solid var(--border-default)',
          background: 'var(--surface-0)',
        }}>
          {isComplete ? (
            <button
              onClick={() => onComplete(rfpData, messages.map(m => ({ role: m.role, content: m.content })), chatMode)}
              className="animate-bounce-in"
              style={{
                width: '100%', height: 'var(--btn-height)',
                borderRadius: 'var(--btn-radius)', border: 'none',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                color: 'white', fontWeight: 600, fontSize: 16, fontFamily: 'var(--font-kr)',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(var(--color-primary-rgb), 0.3)',
                transition: 'all var(--duration-normal) var(--ease-out)',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(var(--color-primary-rgb), 0.35)';
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(var(--color-primary-rgb), 0.3)';
              }}
            >
              제품 요구사항 정의서 완성하기
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => { setInput(e.target.value); adjustTextareaHeight(); }}
                  onKeyDown={handleKeyDown}
                  placeholder="답변을 입력하세요..."
                  rows={1}
                  disabled={loading}
                  style={{
                    width: '100%',
                    minHeight: 48,
                    maxHeight: 120,
                    padding: '12px 16px', borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-strong)',
                    outline: 'none', resize: 'none', fontSize: 15,
                    fontFamily: 'var(--font-kr)', color: 'var(--text-primary)',
                    background: 'var(--surface-0)',
                    transition: 'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-alpha)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* File upload */}
              <input ref={fileInputRef} type="file" accept=".txt,.md,.csv,.json" onChange={handleFileUpload} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} disabled={loading || uploading}
                title="기존 기획서 업로드"
                style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-strong)', background: 'var(--surface-0)',
                  color: uploading ? 'var(--color-primary)' : 'var(--text-tertiary)',
                  cursor: loading || uploading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all var(--duration-fast)', flexShrink: 0,
                }}
              >
                {uploading ? (
                  <span style={{ fontSize: 14 }}>⏳</span>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                )}
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={handleSend} disabled={loading || !input.trim()} style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: input.trim() ? 'var(--color-primary)' : 'var(--surface-2)',
                  color: input.trim() ? 'white' : 'var(--text-quaternary)',
                  cursor: loading || !input.trim() ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all var(--duration-fast) var(--ease-out)',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
                {!isComplete && messages.filter(m => m.role === 'user').length >= 3 && rfpData.overview && (
                  <button onClick={() => setShowCompleteModal(true)} disabled={loading}
                    style={{
                      background: 'none', border: 'none',
                      fontSize: 11, color: canComplete ? 'var(--color-primary)' : '#F59E0B', fontWeight: 600,
                      cursor: 'pointer', padding: '4px', whiteSpace: 'nowrap',
                      transition: 'color var(--duration-fast)',
                    }}
                  >
                    {canComplete ? '완성하기' : '정의서 작성'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Preview Panel */}
      {!isMobile && previewPanel}
      {isMobile && previewPanel}

      {/* ═══ 제품 요구사항 정의서 생성 확인 모달 ═══ */}
      {showCompleteModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={() => setShowCompleteModal(false)}
        >
          <div style={{
            background: '#fff', borderRadius: 20, padding: '32px 28px',
            maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            animation: 'slideUp 0.25s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0', fontFamily: 'var(--font-kr)' }}>
                지금까지 내용을 바탕으로<br />제품 요구사항 정의서를 생성하시겠습니까?
              </h3>
              <p style={{ fontSize: 14, color: '#64748b', margin: 0, lineHeight: 1.6, fontFamily: 'var(--font-kr)' }}>
                대화에서 수집된 정보를 종합하여<br />전문 수준의 정의서를 자동 생성합니다.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowCompleteModal(false)}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  border: '1px solid #e2e8f0', background: '#fff',
                  color: '#64748b', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-kr)',
                }}
              >
                계속 대화하기
              </button>
              <button
                onClick={() => {
                  setShowCompleteModal(false);
                  setIsComplete(true);
                  // 바로 PRD 생성 시작
                  onComplete(rfpData, messages.map(m => ({ role: m.role, content: m.content })), chatMode);
                }}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'var(--font-kr)',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                }}
              >
                정의서 생성하기
              </button>
            </div>
          </div>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
        </div>
      )}
    </div>
  );
}

/* Sub-components */
function FeatureButton({ feat, selected, onToggle }: { feat: SelectableFeature; selected: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      width: '100%', padding: '10px 14px', border: 'none',
      borderBottom: '1px solid var(--border-default)',
      background: selected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
      cursor: 'pointer', textAlign: 'left',
      transition: 'background 0.15s', fontFamily: 'var(--font-kr)',
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        border: selected ? 'none' : '2px solid var(--border-strong)',
        background: selected ? 'var(--color-primary)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {selected && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{feat.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{feat.desc}</div>
      </div>
    </button>
  );
}

function SectionLabel({ title, icon }: { title: string; icon: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
      <span style={{
        width: 24, height: 24, borderRadius: 'var(--radius-sm)',
        background: 'var(--color-primary-alpha)', color: 'var(--color-primary)',
        fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>{icon}</span>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
    </div>
  );
}

function RFPSection({ title, icon, content }: { title: string; icon: string; content: string }) {
  return (
    <div>
      <SectionLabel title={title} icon={icon} />
      <p style={{
        font: 'var(--text-body)', color: 'var(--text-secondary)',
        marginTop: 'var(--space-sm)',
        paddingLeft: 'calc(24px + var(--space-sm))',
        whiteSpace: 'pre-wrap', lineHeight: 1.6,
      }}>{content}</p>
    </div>
  );
}
