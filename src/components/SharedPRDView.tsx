'use client';
import { useState, useCallback } from 'react';

interface SharedPRDViewProps {
  rfpDocument: string;
  projectName: string;
  rfpData: Record<string, unknown> | null;
  shareId: string;
  viewCount: number;
}

const C = {
  blue: '#2563EB', blueLight: '#3B82F6', blueSoft: '#60A5FA', bluePale: '#DBEAFE',
  blueBg: 'rgba(37, 99, 235, 0.06)',
  bg: '#F0F2F5', white: '#FFFFFF', paper: '#FFFFFF',
  textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
  border: '#E2E8F0', borderLight: '#F1F5F9',
  green: '#22C55E', greenBg: 'rgba(34, 197, 94, 0.08)',
  gradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
};

interface PRDSection {
  id: string;
  title: string;
  content: string;
}

function parseRFPSections(text: string): PRDSection[] {
  if (!text) return [];
  const parts = text.split(/\n*─{3,}\s*/);
  const sections: PRDSection[] = [];
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

export default function SharedPRDView({ rfpDocument, projectName, shareId, viewCount }: SharedPRDViewProps) {
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    // First 4 sections expanded by default
    parseRFPSections(rfpDocument).forEach((s, i) => { initial[s.id] = i < 4; });
    return initial;
  });

  const sections = parseRFPSections(rfpDocument);

  const copyToClipboard = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, []);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    sections.forEach(s => { all[s.id] = true; });
    setExpandedSections(all);
  };

  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    sections.forEach(s => { all[s.id] = false; });
    setExpandedSections(all);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Sticky Top Bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`, padding: '10px 16px',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: C.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{projectName}</span>
            <span style={{ fontSize: 11, color: C.textTertiary, background: C.borderLight, padding: '2px 8px', borderRadius: 4 }}>
              공유 문서 · 조회 {viewCount}회
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => copyToClipboard(rfpDocument)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 14px', borderRadius: 8,
              border: `1.5px solid ${copied ? C.green : C.border}`,
              background: copied ? C.greenBg : C.white,
              color: copied ? C.green : C.textSecondary,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>
              {copied ? '✓ 복사됨' : '📋 전체 복사'}
            </button>
          </div>
        </div>
      </div>

      {/* Document */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 40px' }}>
        {/* Hero Header */}
        <div style={{
          background: C.paper, borderRadius: 16, marginBottom: 2,
          border: `1px solid ${C.border}`, overflow: 'hidden',
        }}>
          <div style={{ height: 4, background: C.gradient }} />
          <div style={{ padding: '32px 36px 28px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: 1.5, marginBottom: 12 }}>WISHKET AI PRD BUILDER</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: C.textPrimary, lineHeight: 1.35, marginBottom: 12, wordBreak: 'keep-all' }}>
              {projectName}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: C.textTertiary }}>
              <span>위시켓 13년 · 7만+ 프로젝트 데이터 기반</span>
            </div>
          </div>
        </div>

        {/* Expand/Collapse controls */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '8px 0' }}>
          <button onClick={expandAll} style={{ fontSize: 12, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>전체 펼치기</button>
          <span style={{ color: C.border }}>|</span>
          <button onClick={collapseAll} style={{ fontSize: 12, color: C.textTertiary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>전체 접기</button>
        </div>

        {/* Sections */}
        <div style={{
          background: C.paper, border: `1px solid ${C.border}`,
          borderRadius: 16, overflow: 'hidden',
        }}>
          {sections.map((section, idx) => (
            <div key={section.id} style={{ borderTop: idx > 0 ? `1px solid ${C.borderLight}` : 'none' }}>
              {/* Section Header (clickable) */}
              <button
                onClick={() => toggleSection(section.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 36px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <h2 style={{ fontSize: 17, fontWeight: 700, color: C.textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 26, height: 26, borderRadius: 7, background: C.blueBg, color: C.blue, fontSize: 12, fontWeight: 700,
                  }}>{idx + 1}</span>
                  {section.title}
                </h2>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textTertiary} strokeWidth="2" strokeLinecap="round"
                  style={{ transform: expandedSections[section.id] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {/* Section Content */}
              {expandedSections[section.id] && (
                <div style={{
                  padding: '0 36px 28px', paddingLeft: 72,
                  fontSize: 14.5, lineHeight: 1.9, color: C.textSecondary,
                  whiteSpace: 'pre-wrap', wordBreak: 'keep-all',
                }}>
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <div style={{ padding: '14px 20px', marginBottom: 16, borderRadius: 10, background: C.blueBg, border: `1px solid rgba(37, 99, 235, 0.1)`, fontSize: 14, color: C.blue, fontWeight: 500 }}>
            이 PRD를 개발사 3~5곳에 동일하게 전달하면 정확한 견적 비교가 가능합니다
          </div>
          <a href="https://www.wishket.com/project/register/?utm_source=ai-rfp&utm_medium=share&utm_campaign=shared-prd" target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12,
            background: C.gradient, color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: 15,
            boxShadow: '0 4px 16px rgba(37, 99, 235, 0.25)',
          }}>
            🚀 위시켓에서 개발사 찾기 →
          </a>
          <div style={{ padding: '16px 0', marginTop: 16 }}>
            <a href="/" style={{ fontSize: 14, color: C.blue, textDecoration: 'none', fontWeight: 500 }}>나도 AI PRD 만들기 →</a>
          </div>
          <p style={{ fontSize: 12, color: C.textTertiary, marginTop: 8 }}>Powered by Wishket AI PRD Builder</p>
        </div>
      </div>
    </div>
  );
}
