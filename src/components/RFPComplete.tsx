'use client';

// AI RFP Builder — Result Page v8 (Complete Renewal)
// CEO 요구: 가독성, 정보 발견성, 사용 가이드, 개발사 전달 워크플로우
// 탭 기반 내비게이션 + 섹션별 사용 목적 안내 + 액션 가이드

import { useState, useEffect, useRef, useCallback } from 'react';
import { RFPData } from '@/types/rfp';

interface RFPCompleteProps {
  rfpData: RFPData;
  email: string;
  sessionId?: string;
}

// ━━━━━ Design Tokens ━━━━━
const C = {
  blue: '#2563EB', blueLight: '#3B82F6', blueSoft: '#60A5FA', bluePale: '#DBEAFE',
  blueGlow: 'rgba(37, 99, 235, 0.15)', blueBg: 'rgba(37, 99, 235, 0.06)',
  bg: '#F8FAFC', white: '#FFFFFF',
  textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
  border: '#E2E8F0', borderStrong: '#CBD5E1',
  green: '#22C55E', greenBg: 'rgba(34, 197, 94, 0.08)',
  orange: '#F59E0B', orangeBg: 'rgba(245, 158, 11, 0.08)',
  red: '#EF4444', redBg: 'rgba(239, 68, 68, 0.08)',
  purple: '#8B5CF6', purpleBg: 'rgba(139, 92, 246, 0.08)',
  gradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
  gradientDark: 'linear-gradient(135deg, #0B1120 0%, #1A2540 100%)',
};

// ━━━━━ Tab System ━━━━━
type TabId = 'overview' | 'detail' | 'guide' | 'action';

const TABS: { id: TabId; label: string; icon: string; desc: string }[] = [
  { id: 'overview', label: '한눈에 보기', icon: '📊', desc: '프로젝트 요약 & 핵심 정보' },
  { id: 'detail', label: '상세 PRD', icon: '📄', desc: '개발사에 전달할 전체 문서' },
  { id: 'guide', label: '활용 가이드', icon: '💡', desc: '이 PRD를 어떻게 사용할지' },
  { id: 'action', label: '다음 단계', icon: '🚀', desc: '견적 받기 & 개발사 찾기' },
];

// ━━━━━ Section Parser ━━━━━
interface RFPSection {
  id: string;
  title: string;
  content: string;
  icon: string;
  color: string;
  bgColor: string;
}

const SECTION_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  '한 줄 요약': { icon: '📌', color: C.blue, bg: C.blueBg },
  '개요': { icon: '🎯', color: C.blue, bg: C.blueBg },
  '스코프': { icon: '📐', color: C.purple, bg: C.purpleBg },
  '기능 목록': { icon: '⚙️', color: C.green, bg: C.greenBg },
  '기능 요구': { icon: '⚙️', color: C.green, bg: C.greenBg },
  '화면': { icon: '📱', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.08)' },
  '사용자 흐름': { icon: '📱', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.08)' },
  '비기능': { icon: '💻', color: C.blue, bg: C.blueBg },
  '일정': { icon: '📅', color: C.orange, bg: C.orangeBg },
  '예산': { icon: '💰', color: C.green, bg: C.greenBg },
  '참고 서비스': { icon: '🔍', color: C.orange, bg: C.orangeBg },
  '리스크': { icon: '⚠️', color: C.red, bg: C.redBg },
  '산출물': { icon: '✅', color: C.green, bg: C.greenBg },
  '계약': { icon: '✅', color: C.green, bg: C.greenBg },
  '다음 단계': { icon: '🚀', color: C.blue, bg: C.blueBg },
  'executive': { icon: '📊', color: C.blue, bg: C.blueBg },
  '프로젝트 개요': { icon: '🎯', color: C.blue, bg: C.blueBg },
  '서비스 대상': { icon: '👥', color: C.purple, bg: C.purpleBg },
  '기술 요구': { icon: '💻', color: C.purple, bg: C.purpleBg },
  '디자인': { icon: '🎨', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.08)' },
  'AI 전문가': { icon: '🤖', color: C.blue, bg: C.blueBg },
  'MVP': { icon: '🚀', color: C.green, bg: C.greenBg },
  '예산 최적화': { icon: '💡', color: C.orange, bg: C.orangeBg },
  '개발사 선정': { icon: '🏢', color: C.purple, bg: C.purpleBg },
};

function getSectionMeta(title: string): { icon: string; color: string; bg: string } {
  for (const [key, meta] of Object.entries(SECTION_ICONS)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return meta;
  }
  return { icon: '📄', color: C.blue, bg: C.blueBg };
}

function parseRFPSections(text: string): RFPSection[] {
  if (!text) return [];
  const parts = text.split(/\n*─{3,}\s*/);
  const sections: RFPSection[] = [];
  let headerContent = '';

  for (const part of parts) {
    const trimmed = part.replace(/─{3,}/g, '').trim();
    if (!trimmed) continue;
    const titleMatch = trimmed.match(/^(\d+\.\s*)?(.+?)(?:\s*─*\s*$|\n)/);
    if (titleMatch) {
      const title = (titleMatch[2] || '').trim().replace(/─+$/, '').trim();
      const restContent = trimmed.slice(titleMatch[0].length).trim();
      if (title.length > 1 && title.length < 80 && restContent.length > 10) {
        const meta = getSectionMeta(title);
        sections.push({ id: `section-${sections.length}`, title, content: restContent, icon: meta.icon, color: meta.color, bgColor: meta.bg });
      } else if (restContent.length > 10 || trimmed.length > 30) {
        headerContent += trimmed + '\n\n';
      }
    } else if (trimmed.length > 10) {
      if (trimmed.includes('═')) {
        const cleanTitle = trimmed.replace(/═+/g, '').trim().split('\n')[0].trim();
        const cleanContent = trimmed.replace(/═+/g, '').trim().split('\n').slice(1).join('\n').trim();
        if (cleanTitle && cleanContent) {
          const meta = getSectionMeta(cleanTitle);
          sections.push({ id: `section-${sections.length}`, title: cleanTitle, content: cleanContent, icon: meta.icon, color: meta.color, bgColor: meta.bg });
        } else { headerContent += trimmed + '\n\n'; }
      } else { headerContent += trimmed + '\n\n'; }
    }
  }

  if (sections.length === 0 && text.trim().length > 0) {
    return [{ id: 'section-0', title: 'PRD 기획서', content: text, icon: '📄', color: C.blue, bgColor: C.blueBg }];
  }
  if (headerContent.trim() && sections.length > 0) {
    sections.unshift({ id: 'section-header', title: '소프트웨어 개발 PRD', content: headerContent.trim(), icon: '📋', color: C.blue, bgColor: C.blueBg });
  }
  return sections;
}

// ━━━━━ Metrics ━━━━━
interface MetricCard { label: string; value: string; icon: string; color: string }
function extractMetrics(text: string): MetricCard[] {
  const metrics: MetricCard[] = [];
  const durationMatch = text.match(/예상 기간[:\s]*([^\n,]+)/);
  if (durationMatch) metrics.push({ label: '예상 기간', value: durationMatch[1].trim(), icon: '📅', color: C.orange });
  const featureMatch = text.match(/핵심 기능[:\s]*(\d+)개/);
  if (featureMatch) metrics.push({ label: '기능 수', value: `${featureMatch[1]}개`, icon: '⚙️', color: C.purple });
  const complexityMatch = text.match(/복잡도[:\s]*(.*?)[\s(]/);
  if (complexityMatch) metrics.push({ label: '복잡도', value: complexityMatch[1].trim().replace(/['"]/g, ''), icon: '📊', color: C.blue });
  const budgetMatch = text.match(/참고 평균 예산[:\s]*([^\n]+)/);
  if (budgetMatch) metrics.push({ label: '평균 예산', value: budgetMatch[1].trim(), icon: '💰', color: C.green });
  return metrics.slice(0, 4);
}

// ━━━━━ Content Renderer ━━━━━
function renderSectionContent(content: string): React.ReactNode {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('|') && line.trim().includes('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { tableLines.push(lines[i]); i++; }
      const rows = tableLines
        .filter(l => !l.trim().match(/^\|[\s-|]+\|$/))
        .map(l => l.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(cell => cell.trim()));
      if (rows.length > 0) {
        const headerRow = rows[0];
        const dataRows = rows.slice(1);
        elements.push(
          <div key={key++} style={{ overflowX: 'auto', margin: '12px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 8 }}>
              <thead><tr style={{ background: C.bg }}>
                {headerRow.map((cell, ci) => (
                  <th key={ci} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: C.textPrimary, borderBottom: `2px solid ${C.border}`, fontSize: 12 }}>{cell}</th>
                ))}
              </tr></thead>
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? C.white : C.bg }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: '9px 12px', borderBottom: `1px solid ${C.border}`, color: cell === '✓' ? C.green : cell === '✗' ? C.red : C.textSecondary, fontWeight: cell === '✓' || cell === '✗' ? 600 : 400, fontSize: 13, lineHeight: 1.5 }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }
    if (line.match(/[→├└│✓✗\[\]]/) && (line.includes('→') || line.includes('├') || line.includes('└'))) {
      const flowLines: string[] = [];
      while (i < lines.length && (lines[i].match(/[→├└│✓✗\[\]]/) || lines[i].trim() === '')) {
        flowLines.push(lines[i]); i++;
        if (lines[i - 1].trim() === '' && flowLines.filter(l => l.trim()).length > 1) {
          if (i < lines.length && !lines[i].match(/[→├└│✓✗\[\]]/)) break;
        }
      }
      if (flowLines.filter(l => l.trim()).length > 0) {
        elements.push(
          <pre key={key++} style={{ margin: '12px 0', padding: '16px', borderRadius: 10, background: '#F1F5F9', border: `1px solid ${C.border}`, fontSize: 12, lineHeight: 1.7, overflowX: 'auto', fontFamily: "'SF Mono', 'Fira Code', Menlo, monospace", color: C.textPrimary, whiteSpace: 'pre' }}>
            {flowLines.join('\n')}
          </pre>
        );
      }
      continue;
    }
    elements.push(<span key={key++} style={{ display: 'block' }}>{line}</span>);
    i++;
  }
  return <>{elements}</>;
}

type Phase = 'generating' | 'result' | 'consultation' | 'done';

// ━━━━━ Main Component ━━━━━
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
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const sections = parseRFPSections(rfpDocument);
  const metrics = extractMetrics(rfpDocument);

  // ━━ Auto-generate RFP ━━
  useEffect(() => {
    generateRFP();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'generating') return;
    const interval = setInterval(() => {
      setGenProgress(prev => prev >= 95 ? prev : prev + Math.random() * 8 + 2);
    }, 400);
    return () => clearInterval(interval);
  }, [phase]);

  const generateRFP = async () => {
    setLoading(true);
    try {
      if (!isGuest) {
        await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, step: 'rfp_generate' }) });
      }
      const res = await fetch('/api/generate-rfp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rfpData, sessionId }) });
      const data = await res.json();
      setRfpDocument(data.rfpDocument || '');
      if (!isGuest && email) sendEmailRFP(email, data.rfpDocument || '');
      setGenProgress(100);
      setTimeout(() => setPhase('result'), 500);
    } catch {
      setGenProgress(100);
      setTimeout(() => setPhase('result'), 300);
    } finally { setLoading(false); }
  };

  const sendEmailRFP = async (targetEmail: string, doc: string) => {
    try {
      const res = await fetch('/api/send-rfp-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: targetEmail, rfpDocument: doc, projectName: rfpData.overview?.split('\n')[0]?.slice(0, 50) }) });
      const data = await res.json();
      if (data.success) setEmailSent(true);
    } catch { /* ignore */ }
  };

  const handleGuestEmailSubmit = async () => {
    if (!guestEmail || !guestEmail.includes('@')) return;
    setLoading(true);
    try {
      await fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: guestEmail, name, phone, company, step: 'guest_convert' }) });
      await sendEmailRFP(guestEmail, rfpDocument);
      setEmailSent(true);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleConsultation = async (ctaType: 'consultation' | 'partner') => {
    setLoading(true);
    try {
      const res = await fetch('/api/consultation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ctaType, name: name || email.split('@')[0], email: isGuest ? guestEmail : email, phone, company, preferredTime, budgetRange, rfpSummary: rfpData.overview }),
      });
      const data = await res.json();
      if (data.success) { setConsultationSubmitted(true); setPhase('done'); }
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const copyToClipboard = useCallback(async (text: string, sectionId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionId || 'all');
      setTimeout(() => setCopiedSection(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      setCopiedSection(sectionId || 'all');
      setTimeout(() => setCopiedSection(null), 2000);
    }
  }, []);

  const handleCopyAll = () => copyToClipboard(rfpDocument);
  const handleCopySection = (section: RFPSection) => copyToClipboard(`${section.title}\n\n${section.content}`, section.id);
  const handleDownload = () => {
    const blob = new Blob([rfpDocument], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `AI_PRD_기획서_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 48, padding: '0 16px',
    borderRadius: 10, border: `1.5px solid ${C.border}`,
    outline: 'none', fontSize: 15, color: C.textPrimary,
    background: C.white, transition: 'all 0.2s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  };

  // ━━━━━ Phase: Generating ━━━━━
  if (phase === 'generating') {
    const steps = ['프로젝트 분석', '시장 데이터 조회', '기능 상세 분석', '화면/흐름 설계', 'PRD 생성'];
    const activeStep = Math.min(Math.floor(genProgress / 20), 4);
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <div style={{ textAlign: 'center', padding: '0 24px', maxWidth: 480, width: '100%' }}>
          <div style={{ width: 88, height: 88, borderRadius: 20, background: C.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)', animation: 'pulse 2s ease-in-out infinite' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>AI가 전문 PRD를 작성하고 있습니다</h2>
          <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.6, marginBottom: 32 }}>위시켓 13년 외주 데이터를 기반으로 분석 중입니다</p>
          <div style={{ width: '100%', height: 6, background: C.border, borderRadius: 3, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ width: `${genProgress}%`, height: '100%', background: C.gradient, borderRadius: 3, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {steps.map((step, i) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10, background: i <= activeStep ? C.blueBg : C.white, border: `1px solid ${i === activeStep ? C.blue : C.border}`, transition: 'all 0.3s', opacity: i <= activeStep ? 1 : 0.5 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: i < activeStep ? C.green : i === activeStep ? C.blue : C.border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {i < activeStep ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg> : <span style={{ fontSize: 11, color: 'white', fontWeight: 600 }}>{i + 1}</span>}
                </div>
                <span style={{ fontSize: 14, fontWeight: i === activeStep ? 600 : 400, color: i <= activeStep ? C.textPrimary : C.textTertiary }}>{step}</span>
                {i === activeStep && <div style={{ marginLeft: 'auto', width: 16, height: 16, border: `2px solid ${C.blue}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
              </div>
            ))}
          </div>
          <style>{`@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  // ━━━━━ Phase: Result ━━━━━
  if (phase === 'result' || phase === 'consultation') {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 16px' }}>

          {/* ━━ Top Header ━━ */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16, padding: '20px 24px', background: C.white, borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: 1.5, marginBottom: 4 }}>WISHKET AI PRD BUILDER</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary }}>
                {rfpData.overview?.split('\n')[0]?.split(' — ')[0]?.slice(0, 40) || 'PRD 기획서'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <ActionBtn onClick={handleCopyAll} copied={copiedSection === 'all'} label="전체 복사" copiedLabel="복사됨" />
              <ActionBtn onClick={handleDownload} label="다운로드" icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>} />
            </div>
          </div>

          {/* ━━ Email Sent ━━ */}
          {emailSent && !isGuest && (
            <div style={{ padding: '12px 16px', marginBottom: 12, borderRadius: 10, background: C.greenBg, border: `1px solid rgba(34, 197, 94, 0.2)`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
              <span style={{ fontSize: 13, color: '#15803D', fontWeight: 500 }}>PRD 기획서가 <strong>{email}</strong>로 발송되었습니다</span>
            </div>
          )}

          {/* ━━ Metric Cards ━━ */}
          {metrics.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(metrics.length, 4)}, 1fr)`, gap: 12, marginBottom: 16 }}>
              {metrics.map((m) => (
                <div key={m.label} style={{ padding: '16px 14px', borderRadius: 12, background: C.white, border: `1px solid ${C.border}`, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{m.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* ━━ Tab Navigation ━━ */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, padding: '4px', background: C.white, borderRadius: 14, border: `1px solid ${C.border}` }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                flex: 1, padding: '12px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: activeTab === tab.id ? C.gradient : 'transparent',
                color: activeTab === tab.id ? 'white' : C.textSecondary,
                fontWeight: activeTab === tab.id ? 600 : 400,
                fontSize: 13, transition: 'all 0.2s',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              }}>
                <span style={{ display: 'block', fontSize: 16, marginBottom: 2 }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ━━ Tab Content ━━ */}

          {/* --- Overview Tab --- */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 프로젝트 요약 카드 */}
              <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '24px', overflow: 'hidden' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>📋</span> 수집된 정보 요약
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <InfoRow label="프로젝트 개요" value={rfpData.overview} icon="🎯" />
                  {rfpData.targetUsers && <InfoRow label="타겟 사용자" value={rfpData.targetUsers} icon="👥" />}
                  {rfpData.coreFeatures.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.textTertiary, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>⚙️</span> 핵심 기능 ({rfpData.coreFeatures.length}개)
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 24 }}>
                        {rfpData.coreFeatures.map((f, i) => (
                          <span key={i} style={{
                            padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                            background: f.priority === 'P1' ? 'rgba(239, 68, 68, 0.06)' : f.priority === 'P2' ? 'rgba(245, 158, 11, 0.06)' : C.bg,
                            color: f.priority === 'P1' ? C.red : f.priority === 'P2' ? C.orange : C.textSecondary,
                            border: `1px solid ${f.priority === 'P1' ? 'rgba(239, 68, 68, 0.15)' : f.priority === 'P2' ? 'rgba(245, 158, 11, 0.15)' : C.border}`,
                          }}>
                            [{f.priority}] {f.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {rfpData.referenceServices && <InfoRow label="참고 서비스" value={rfpData.referenceServices} icon="🔍" />}
                  {rfpData.techRequirements && <InfoRow label="기술 요구사항" value={rfpData.techRequirements} icon="💻" />}
                  {rfpData.budgetTimeline && <InfoRow label="예산/일정" value={rfpData.budgetTimeline} icon="💰" />}
                  {rfpData.additionalRequirements && <InfoRow label="추가 요구사항" value={rfpData.additionalRequirements} icon="📝" />}
                </div>
              </div>

              {/* 이 문서로 할 수 있는 것 */}
              <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: '24px' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>✨</span> 이 PRD로 할 수 있는 것
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  {[
                    { icon: '📩', title: '개발사에 전달', desc: '그대로 복사해서 견적 요청' },
                    { icon: '📊', title: '견적 비교', desc: '여러 개발사 비교 기준으로 활용' },
                    { icon: '🤝', title: '미팅 준비', desc: '개발사 미팅 시 논의 자료' },
                    { icon: '📋', title: '계약 기초자료', desc: '범위·일정·비용 합의의 근거' },
                  ].map(item => (
                    <div key={item.title} style={{ padding: '16px', borderRadius: 12, background: C.bg, border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 20, marginBottom: 8 }}>{item.icon}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 4 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: C.textTertiary, lineHeight: 1.5 }}>{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* --- Detail Tab --- */}
          {activeTab === 'detail' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '12px 16px', borderRadius: 10, background: C.blueBg, border: `1px solid rgba(37, 99, 235, 0.1)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>💡</span>
                <span style={{ fontSize: 13, color: C.blue, fontWeight: 500 }}>각 섹션을 클릭하면 펼쳐집니다. 필요한 섹션만 복사하여 개발사에 전달하세요.</span>
              </div>

              {sections.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                return (
                  <div key={section.id} id={section.id} ref={el => { sectionRefs.current[section.id] = el; }}
                    style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', transition: 'all 0.2s' }}>
                    {/* Section Header — clickable */}
                    <button onClick={() => toggleSection(section.id)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 20px', borderBottom: isExpanded ? `1px solid ${C.border}` : 'none',
                      background: section.bgColor, border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>{section.icon}</span>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{section.title}</h3>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={(e) => { e.stopPropagation(); handleCopySection(section); }} style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '5px 10px', borderRadius: 6,
                          border: `1px solid ${copiedSection === section.id ? C.green : C.border}`,
                          background: copiedSection === section.id ? C.greenBg : 'rgba(255,255,255,0.7)',
                          color: copiedSection === section.id ? C.green : C.textTertiary,
                          fontSize: 11, fontWeight: 500, cursor: 'pointer',
                        }}>
                          {copiedSection === section.id ? '✓ 복사됨' : '복사'}
                        </button>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textTertiary} strokeWidth="2" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </button>
                    {/* Section Content */}
                    {isExpanded && (
                      <div style={{ padding: '18px 20px', fontSize: 14, lineHeight: 1.85, color: C.textSecondary, whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>
                        {renderSectionContent(section.content)}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Expand All */}
              <button onClick={() => {
                if (expandedSections.size === sections.length) {
                  setExpandedSections(new Set());
                } else {
                  setExpandedSections(new Set(sections.map(s => s.id)));
                }
              }} style={{
                padding: '10px 16px', borderRadius: 10, border: `1px solid ${C.border}`,
                background: C.white, color: C.textSecondary, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', textAlign: 'center',
              }}>
                {expandedSections.size === sections.length ? '모두 접기' : '모두 펼치기'}
              </button>
            </div>
          )}

          {/* --- Guide Tab --- */}
          {activeTab === 'guide' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                {
                  icon: '1️⃣', title: 'PRD를 개발사에 전달하세요',
                  content: '"상세 PRD" 탭에서 전체 복사 또는 다운로드하여 개발사 3~5곳에 동일하게 전달하세요. 동일 문서로 요청해야 견적 비교가 정확합니다.',
                  tip: '위시켓에 프로젝트를 등록하면 48시간 내 검증된 개발사 제안을 받습니다.',
                },
                {
                  icon: '2️⃣', title: '견적을 비교하세요',
                  content: '받은 견적서에서 "총 금액"만 보지 마세요. 기능별 단가, 인력 구성, 마일스톤 일정, 하자보수 조건을 꼼꼼히 비교하세요.',
                  tip: '가장 낮은 견적 ≠ 최선. 포트폴리오와 소통 역량이 더 중요합니다.',
                },
                {
                  icon: '3️⃣', title: '개발사 미팅을 진행하세요',
                  content: 'PRD를 기반으로 미팅하면 "우리는 이런 서비스를 만들고 싶어요"보다 훨씬 구체적인 논의가 가능합니다. 각 기능의 복잡도와 소요 기간에 대한 개발사 의견을 들어보세요.',
                  tip: '미팅 시 "유사 프로젝트 포트폴리오를 보여주세요"라고 반드시 요청하세요.',
                },
                {
                  icon: '4️⃣', title: '계약 전 필수 체크',
                  content: '소스코드 소유권(발주사 귀속), 하자보수 기간(최소 6개월), 중간 검수 권한, 추가 개발 단가를 반드시 계약서에 명시하세요.',
                  tip: '위시켓 에스크로 결제를 이용하면 작업 완료 확인 후 결제되어 안전합니다.',
                },
              ].map(item => (
                <div key={item.title} style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.border}`, padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{item.title}</h3>
                  </div>
                  <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, marginBottom: 12 }}>{item.content}</p>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: C.blueBg, border: `1px solid rgba(37, 99, 235, 0.1)` }}>
                    <span style={{ fontSize: 13, color: C.blue, fontWeight: 500 }}>💡 {item.tip}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* --- Action Tab --- */}
          {activeTab === 'action' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Quick Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <button onClick={handleCopyAll} style={{ padding: '16px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.white, cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>개발사에 전달하기</div>
                  <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 4 }}>PRD 전체 복사</div>
                </button>
                <button onClick={handleDownload} style={{ padding: '16px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.white, cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>💾</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>파일로 저장</div>
                  <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 4 }}>TXT 다운로드</div>
                </button>
                {isGuest && !emailSent && (
                  <button onClick={() => { const el = document.getElementById('guest-email-section'); el?.scrollIntoView({ behavior: 'smooth' }); }} style={{ padding: '16px', borderRadius: 12, border: `1px solid ${C.border}`, background: C.white, cursor: 'pointer', textAlign: 'center' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📩</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>이메일로 받기</div>
                    <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 4 }}>PDF 발송</div>
                  </button>
                )}
              </div>

              {/* Guest Email Collection */}
              {isGuest && !emailSent && (
                <div id="guest-email-section" style={{ padding: '24px', borderRadius: 16, background: C.gradientDark, boxShadow: '0 4px 20px rgba(11, 17, 32, 0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 20 }}>📩</span>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: C.white, margin: 0 }}>PRD를 이메일로 받아보세요</h3>
                  </div>
                  <p style={{ fontSize: 14, color: C.blueSoft, lineHeight: 1.5, marginBottom: 16 }}>완성된 PRD를 이메일로 보내드립니다. 개발사에 바로 전달할 수 있어요.</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="이메일 주소 입력" style={{ ...inputStyle, flex: 1, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: C.white }} />
                    <button onClick={handleGuestEmailSubmit} disabled={loading || !guestEmail.includes('@')} style={{ padding: '0 24px', borderRadius: 10, border: 'none', background: C.blue, color: C.white, fontWeight: 600, fontSize: 15, cursor: 'pointer', opacity: (!guestEmail.includes('@') || loading) ? 0.5 : 1 }}>
                      {loading ? '발송 중...' : '발송'}
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>스팸 없음 · 기획서 발송 목적으로만 사용됩니다</p>
                </div>
              )}
              {isGuest && emailSent && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: C.greenBg, border: `1px solid rgba(34, 197, 94, 0.2)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                  <span style={{ fontSize: 13, color: '#15803D', fontWeight: 500 }}>PRD 기획서가 <strong>{guestEmail}</strong>로 발송되었습니다</span>
                </div>
              )}

              {/* CTA Cards */}
              {!consultationSubmitted && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {/* 위시켓 프로젝트 등록 */}
                  <a href="https://www.wishket.com/project/register/?utm_source=ai-rfp&utm_medium=web&utm_campaign=rfp-complete" target="_blank" rel="noopener noreferrer" style={{
                    display: 'block', textDecoration: 'none', background: C.gradient, borderRadius: 16, padding: '24px', color: C.white, boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, opacity: 0.8 }}>추천</span>
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>위시켓에서 프로젝트 등록하기</h3>
                    <p style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>이 RFP로 바로 등록하면, 48시간 내 검증된 개발사 3~5곳의 제안을 받습니다.</p>
                    <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', fontWeight: 600, fontSize: 14 }}>
                      무료로 시작하기 →
                    </div>
                  </a>

                  {/* 무료 상담 */}
                  <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: '24px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: C.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>무료 상담신청</h3>
                    <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginBottom: 16 }}>이 PRD를 위시켓 전문가와 함께 검토하고, 최적의 진행 방안을 상담받으세요.</p>
                    {phase === 'consultation' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름 *" style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = C.blue; }} onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }} />
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처 *" style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = C.blue; }} onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }} />
                        <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="회사명 (선택)" style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = C.blue; }} onBlur={(e) => { e.currentTarget.style.borderColor = C.border; }} />
                        <select value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} style={{ ...inputStyle, color: preferredTime ? C.textPrimary : C.textTertiary }}>
                          <option value="">상담 희망 시간 (선택)</option>
                          <option value="morning">오전 (10:00-12:00)</option>
                          <option value="afternoon">오후 (14:00-17:00)</option>
                          <option value="evening">저녁 (18:00-20:00)</option>
                          <option value="anytime">무관</option>
                        </select>
                        <select value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)} style={{ ...inputStyle, color: budgetRange ? C.textPrimary : C.textTertiary }}>
                          <option value="">예상 예산 규모 (선택)</option>
                          <option value="under10m">1천만원 미만</option>
                          <option value="10m-30m">1천만원 ~ 3천만원</option>
                          <option value="30m-50m">3천만원 ~ 5천만원</option>
                          <option value="50m-100m">5천만원 ~ 1억</option>
                          <option value="over100m">1억 이상</option>
                          <option value="undecided">미정</option>
                        </select>
                        <button onClick={() => handleConsultation('consultation')} disabled={loading || !name || !phone} style={{
                          width: '100%', height: 48, borderRadius: 10, border: 'none',
                          background: (!name || !phone) ? C.border : C.blue,
                          color: (!name || !phone) ? C.textTertiary : C.white,
                          fontWeight: 600, fontSize: 15, cursor: 'pointer',
                        }}>
                          {loading ? '접수 중...' : '상담 신청하기'}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setPhase('consultation')} style={{
                        width: '100%', height: 44, borderRadius: 10, border: `1.5px solid ${C.blue}`,
                        background: C.blueBg, color: C.blue, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                      }}>
                        무료 상담신청 →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Coming soon */}
              <div style={{ padding: '18px 22px', borderRadius: 14, background: C.gradientDark, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.blueSoft, letterSpacing: 1, marginBottom: 3 }}>COMING SOON</div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: C.white, margin: 0, marginBottom: 3 }}>이 RFP로 받은 견적이 적정한지 궁금하다면?</h4>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>위시켓 AI 견적 검증기 · 13년 실계약 데이터 기반</p>
                </div>
                <button disabled style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: 13, cursor: 'default' }}>준비 중</button>
              </div>
            </div>
          )}

          {/* ━━ Footer ━━ */}
          <div style={{ padding: '14px 20px', marginTop: 20, borderRadius: 10, background: C.blueBg, textAlign: 'center', border: `1px solid rgba(37, 99, 235, 0.1)` }}>
            <p style={{ fontSize: 12, color: C.blue, fontWeight: 500, margin: 0 }}>위시켓 AI PRD Builder · 13년 외주 경험 기반 · 7만+ 프로젝트 매칭 데이터</p>
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━ Phase: Done ━━━━━
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ maxWidth: 440, width: '100%', padding: '0 24px' }}>
        <div style={{ background: C.white, borderRadius: 20, padding: '36px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>
            {consultationSubmitted ? '접수가 완료되었습니다!' : '감사합니다!'}
          </h2>
          <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.6, marginBottom: 24 }}>
            24시간 내에 연락드리겠습니다.<br />위시켓과 함께 성공적인 프로젝트를 만들어보세요.
          </p>
          <a href="https://www.wishket.com/project/register/?utm_source=ai-rfp&utm_medium=web&utm_campaign=post-consult" target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10,
            background: C.blue, color: C.white, textDecoration: 'none', fontWeight: 600, fontSize: 14,
            boxShadow: '0 2px 12px rgba(37, 99, 235, 0.3)',
          }}>위시켓에서 프로젝트 시작하기 →</a>
          <div style={{ marginTop: 16, padding: 12, background: C.bg, borderRadius: 8 }}>
            <p style={{ fontSize: 12, color: C.textTertiary, margin: 0 }}>
              접수 확인이 <strong style={{ color: C.textSecondary }}>{isGuest ? guestEmail || '게스트' : email}</strong>로 전달되었습니다
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━ Sub Components ━━━━━

function InfoRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  const displayValue = value.length > 200 ? value.slice(0, 200) + '...' : value;
  return (
    <div style={{ paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.textTertiary, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span> {label}
      </div>
      <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, margin: 0, paddingLeft: 24, whiteSpace: 'pre-wrap' }}>{displayValue}</p>
    </div>
  );
}

function ActionBtn({ onClick, label, copiedLabel, copied, icon }: {
  onClick: () => void; label: string; copiedLabel?: string; copied?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '9px 14px', borderRadius: 10,
      border: `1.5px solid ${copied ? C.green : C.border}`,
      background: copied ? C.greenBg : C.white,
      color: copied ? C.green : C.textSecondary,
      fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
    }}>
      {copied ? (
        <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>{copiedLabel}</>
      ) : (
        <>{icon || <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>}{label}</>
      )}
    </button>
  );
}
