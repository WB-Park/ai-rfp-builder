'use client';

// AI RFP Builder — Result Page v9 (FORGE Rebuild)
// 핵심 원칙: PRD 문서가 히어로. 탭/아코디언 없이 바로 보여준다.
// 프로페셔널 문서 레이아웃. 컨설팅 산출물 수준의 WOW.

import { useState, useEffect, useCallback } from 'react';
import { RFPData } from '@/types/rfp';

interface RFPCompleteProps {
  rfpData: RFPData;
  email: string;
  sessionId?: string;
}

// ━━━━━ Design Tokens ━━━━━
const C = {
  blue: '#2563EB', blueLight: '#3B82F6', blueSoft: '#60A5FA', bluePale: '#DBEAFE',
  blueBg: 'rgba(37, 99, 235, 0.06)',
  bg: '#F0F2F5', white: '#FFFFFF', paper: '#FFFFFF',
  textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
  border: '#E2E8F0', borderLight: '#F1F5F9',
  green: '#22C55E', greenBg: 'rgba(34, 197, 94, 0.08)',
  orange: '#F59E0B',
  red: '#EF4444',
  purple: '#8B5CF6',
  gradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
};

// ━━━━━ Section Parser ━━━━━
interface RFPSection {
  id: string;
  title: string;
  content: string;
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
        sections.push({ id: `s-${sections.length}`, title, content: restContent });
      } else if (restContent.length > 10 || trimmed.length > 30) {
        headerContent += trimmed + '\n\n';
      }
    } else if (trimmed.length > 10) {
      if (trimmed.includes('═')) {
        const cleanTitle = trimmed.replace(/═+/g, '').trim().split('\n')[0].trim();
        const cleanContent = trimmed.replace(/═+/g, '').trim().split('\n').slice(1).join('\n').trim();
        if (cleanTitle && cleanContent) {
          sections.push({ id: `s-${sections.length}`, title: cleanTitle, content: cleanContent });
        } else { headerContent += trimmed + '\n\n'; }
      } else { headerContent += trimmed + '\n\n'; }
    }
  }

  if (sections.length === 0 && text.trim().length > 0) {
    return [{ id: 's-0', title: 'PRD 기획서', content: text }];
  }
  if (headerContent.trim() && sections.length > 0) {
    sections.unshift({ id: 's-header', title: '소프트웨어 개발 PRD', content: headerContent.trim() });
  }
  return sections;
}

// ━━━━━ Metrics Extractor ━━━━━
function extractMetrics(text: string): { label: string; value: string }[] {
  const m: { label: string; value: string }[] = [];
  const dur = text.match(/예상 기간[:\s]*([^\n,]+)/);
  if (dur) m.push({ label: '예상 기간', value: dur[1].trim() });
  const feat = text.match(/핵심 기능[:\s]*(\d+)개/);
  if (feat) m.push({ label: '핵심 기능', value: `${feat[1]}개` });
  const comp = text.match(/복잡도[:\s]*(.*?)[\s(]/);
  if (comp) m.push({ label: '복잡도', value: comp[1].trim().replace(/['"]/g, '') });
  const bud = text.match(/참고 평균 예산[:\s]*([^\n]+)/);
  if (bud) m.push({ label: '참고 예산', value: bud[1].trim() });
  return m.slice(0, 4);
}

// ━━━━━ Content Renderer ━━━━━
function SectionContent({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 테이블 렌더링
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
          <div key={key++} style={{ overflowX: 'auto', margin: '16px 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, border: `1px solid ${C.border}` }}>
              <thead><tr style={{ background: '#F8FAFC' }}>
                {headerRow.map((cell, ci) => (
                  <th key={ci} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: C.textPrimary, borderBottom: `2px solid ${C.border}`, fontSize: 12.5 }}>{cell}</th>
                ))}
              </tr></thead>
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? C.white : '#FAFBFC' }}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{ padding: '9px 14px', borderBottom: `1px solid ${C.borderLight}`, color: cell === '✓' ? C.green : cell === '✗' ? C.red : C.textSecondary, fontWeight: cell === '✓' || cell === '✗' ? 600 : 400, fontSize: 13.5, lineHeight: 1.5 }}>{cell}</td>
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

    // 플로우차트/다이어그램
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
          <pre key={key++} style={{ margin: '16px 0', padding: '18px 20px', borderRadius: 8, background: '#F8FAFC', border: `1px solid ${C.border}`, fontSize: 12.5, lineHeight: 1.8, overflowX: 'auto', fontFamily: "'SF Mono', 'Fira Code', Menlo, monospace", color: C.textPrimary, whiteSpace: 'pre' }}>
            {flowLines.join('\n')}
          </pre>
        );
      }
      continue;
    }

    // 일반 텍스트
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
  const [copied, setCopied] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [showCTA, setShowCTA] = useState(false);

  const sections = parseRFPSections(rfpDocument);
  const metrics = extractMetrics(rfpDocument);
  const projectName = rfpData.overview?.split('\n')[0]?.split(' — ')[0]?.slice(0, 40) || 'PRD 기획서';

  // ━━ Auto-generate RFP ━━
  useEffect(() => { generateRFP(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, []);

  const handleDownload = () => {
    const blob = new Blob([rfpDocument], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `PRD_${projectName.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 48, padding: '0 16px', borderRadius: 10,
    border: `1.5px solid ${C.border}`, outline: 'none', fontSize: 15,
    color: C.textPrimary, background: C.white, transition: 'border-color 0.2s',
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

  // ━━━━━ Phase: Result — 문서 중심 레이아웃 ━━━━━
  if (phase === 'result' || phase === 'consultation') {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>

        {/* ━━ Sticky Action Bar ━━ */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${C.border}`,
          padding: '10px 16px',
        }}>
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: C.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{projectName}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => copyToClipboard(rfpDocument)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 8,
                border: `1.5px solid ${copied ? C.green : C.border}`,
                background: copied ? C.greenBg : C.white,
                color: copied ? C.green : C.textSecondary,
                fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
              }}>
                {copied ? (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>복사됨</>
                ) : (
                  <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>전체 복사</>
                )}
              </button>
              <button onClick={handleDownload} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 8,
                border: `1.5px solid ${C.border}`, background: C.white,
                color: C.textSecondary, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                다운로드
              </button>
            </div>
          </div>
        </div>

        {/* ━━ Document Container ━━ */}
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 40px' }}>

          {/* ━━ Email Notification ━━ */}
          {emailSent && !isGuest && (
            <div style={{ padding: '10px 14px', marginBottom: 16, borderRadius: 8, background: C.greenBg, border: `1px solid rgba(34, 197, 94, 0.15)`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
              <span style={{ fontSize: 13, color: '#15803D', fontWeight: 500 }}><strong>{email}</strong>로 PRD가 발송되었습니다</span>
            </div>
          )}

          {/* ━━ Document Hero Header ━━ */}
          <div style={{
            background: C.paper, borderRadius: 16, marginBottom: 2,
            border: `1px solid ${C.border}`, overflow: 'hidden',
          }}>
            {/* 상단 컬러 바 */}
            <div style={{ height: 4, background: C.gradient }} />

            <div style={{ padding: '32px 36px 28px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: 1.5, marginBottom: 12 }}>WISHKET AI PRD BUILDER</div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: C.textPrimary, lineHeight: 1.35, marginBottom: 20, wordBreak: 'keep-all' }}>
                {projectName}
              </h1>

              {/* 핵심 지표 */}
              {metrics.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {metrics.map(m => (
                    <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: C.textTertiary }}>{m.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: C.textTertiary }}>
                <span>생성일: {new Date().toLocaleDateString('ko-KR')}</span>
                <span>·</span>
                <span>위시켓 13년 · 7만+ 프로젝트 데이터 기반</span>
              </div>
            </div>
          </div>

          {/* ━━ PRD Document Body — 전체 펼침 ━━ */}
          <div style={{
            background: C.paper, border: `1px solid ${C.border}`,
            borderTop: 'none', borderRadius: '0 0 16px 16px',
          }}>
            {sections.map((section, idx) => (
              <div key={section.id} style={{
                padding: '28px 36px',
                borderTop: idx > 0 ? `1px solid ${C.borderLight}` : 'none',
              }}>
                {/* 섹션 제목 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 style={{
                    fontSize: 17, fontWeight: 700, color: C.textPrimary, margin: 0,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 26, height: 26, borderRadius: 7,
                      background: C.blueBg, color: C.blue,
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {idx + 1}
                    </span>
                    {section.title}
                  </h2>
                </div>

                {/* 섹션 본문 */}
                <div style={{
                  fontSize: 14.5, lineHeight: 1.9, color: C.textSecondary,
                  whiteSpace: 'pre-wrap', wordBreak: 'keep-all',
                  paddingLeft: 36,
                }}>
                  <SectionContent content={section.content} />
                </div>
              </div>
            ))}
          </div>

          {/* ━━ 문서 끝 — 다음 단계 ━━ */}
          <div style={{ marginTop: 32 }}>

            {/* 이 문서 활용법 — 한 줄 */}
            <div style={{
              padding: '14px 20px', marginBottom: 16, borderRadius: 10,
              background: C.blueBg, border: `1px solid rgba(37, 99, 235, 0.1)`,
              fontSize: 14, color: C.blue, fontWeight: 500, textAlign: 'center',
            }}>
              이 PRD를 개발사 3~5곳에 동일하게 전달하면 정확한 견적 비교가 가능합니다
            </div>

            {/* 액션 버튼 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
              <button onClick={() => copyToClipboard(rfpDocument)} style={{
                padding: '18px 16px', borderRadius: 12, border: `1px solid ${C.border}`,
                background: C.white, cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>전체 복사</div>
                <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 2 }}>개발사에 바로 전달</div>
              </button>
              <button onClick={handleDownload} style={{
                padding: '18px 16px', borderRadius: 12, border: `1px solid ${C.border}`,
                background: C.white, cursor: 'pointer', textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>💾</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>파일 저장</div>
                <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 2 }}>TXT 다운로드</div>
              </button>
              {isGuest && !emailSent ? (
                <button onClick={() => setShowCTA(true)} style={{
                  padding: '18px 16px', borderRadius: 12, border: `1px solid ${C.border}`,
                  background: C.white, cursor: 'pointer', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>📩</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>이메일로 받기</div>
                  <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 2 }}>PDF 발송</div>
                </button>
              ) : (
                <a href="https://www.wishket.com/project/register/?utm_source=ai-rfp&utm_medium=web&utm_campaign=rfp-complete" target="_blank" rel="noopener noreferrer" style={{
                  padding: '18px 16px', borderRadius: 12, border: `1.5px solid ${C.blue}`,
                  background: C.blueBg, cursor: 'pointer', textAlign: 'center', textDecoration: 'none',
                }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>🚀</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.blue }}>위시켓 등록</div>
                  <div style={{ fontSize: 12, color: C.blueLight, marginTop: 2 }}>48시간 내 견적 도착</div>
                </a>
              )}
            </div>

            {/* Guest 이메일 수집 */}
            {isGuest && showCTA && !emailSent && (
              <div style={{
                padding: '24px', borderRadius: 14, marginBottom: 20,
                background: '#0B1120', boxShadow: '0 4px 20px rgba(11, 17, 32, 0.3)',
              }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: C.white, marginBottom: 6 }}>PRD를 이메일로 받아보세요</h3>
                <p style={{ fontSize: 14, color: C.blueSoft, lineHeight: 1.5, marginBottom: 16 }}>완성된 PRD를 이메일로 보내드립니다.</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="이메일 주소" style={{ ...inputStyle, flex: 1, background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', color: C.white }} />
                  <button onClick={handleGuestEmailSubmit} disabled={loading || !guestEmail.includes('@')} style={{ padding: '0 24px', borderRadius: 10, border: 'none', background: C.blue, color: C.white, fontWeight: 600, fontSize: 15, cursor: 'pointer', opacity: (!guestEmail.includes('@') || loading) ? 0.5 : 1 }}>
                    {loading ? '발송 중...' : '발송'}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>스팸 없음 · 기획서 발송 전용</p>
              </div>
            )}
            {isGuest && emailSent && (
              <div style={{ padding: '10px 14px', marginBottom: 20, borderRadius: 8, background: C.greenBg, border: `1px solid rgba(34, 197, 94, 0.15)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                <span style={{ fontSize: 13, color: '#15803D', fontWeight: 500 }}><strong>{guestEmail}</strong>로 발송 완료</span>
              </div>
            )}

            {/* CTA 영역 */}
            {!consultationSubmitted && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                {/* 위시켓 프로젝트 등록 */}
                <a href="https://www.wishket.com/project/register/?utm_source=ai-rfp&utm_medium=web&utm_campaign=rfp-complete" target="_blank" rel="noopener noreferrer" style={{
                  display: 'block', textDecoration: 'none', background: C.gradient, borderRadius: 14, padding: '22px 24px', color: C.white, boxShadow: '0 4px 16px rgba(37, 99, 235, 0.25)',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, opacity: 0.7, marginBottom: 6 }}>추천</div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>위시켓에서 개발사 찾기</h3>
                  <p style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5, marginBottom: 14 }}>이 PRD로 바로 등록 → 48시간 내 검증된 개발사 제안</p>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 7, background: 'rgba(255,255,255,0.15)', fontWeight: 600, fontSize: 13 }}>
                    무료로 시작하기 →
                  </span>
                </a>

                {/* 무료 상담 */}
                <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: '22px 24px' }}>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>무료 전문가 상담</h3>
                  <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5, marginBottom: 14 }}>이 PRD를 위시켓 전문가와 함께 검토하고, 최적의 진행 방안을 상담받으세요.</p>
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
                      width: '100%', height: 42, borderRadius: 10, border: `1.5px solid ${C.blue}`,
                      background: C.blueBg, color: C.blue, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    }}>
                      무료 상담신청 →
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{ padding: '12px 0', marginTop: 24, textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: C.textTertiary, margin: 0 }}>Powered by Wishket AI PRD Builder · 13년 외주 경험 · 7만+ 프로젝트 매칭 데이터</p>
            </div>
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
        </div>
      </div>
    </div>
  );
}
