'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { RFPData } from '@/types/rfp';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, Header, Footer, PageNumber, NumberFormat, ShadingType, StyleLevel, PageBreak, Tab, TabStopType, TabStopPosition } from 'docx';
import { saveAs } from 'file-saver';

interface RFPCompleteProps {
  rfpData: RFPData;
  email: string;
  sessionId?: string;
  preloadedPrd?: string; // JSON string of PRDResult — skips API call, renders directly
  readOnly?: boolean; // Hide editing features for share page
}

interface PRDResult {
  projectName: string;
  documentMeta: { version: string; createdAt: string; generatedBy: string };
  executiveSummary: string;
  projectOverview: string;
  problemStatement: string;
  projectGoals: { goal: string; metric: string }[];
  targetUsers: string;
  userPersonas: { name: string; role: string; needs: string; painPoints: string }[];
  scopeInclusions: string[];
  scopeExclusions: string[];
  techStack: { category: string; tech: string; rationale: string }[];
  referenceServices: string;
  additionalRequirements: string;
  featureModules: {
    id: number;
    name: string;
    priority: 'P0' | 'P1' | 'P2';
    priorityLabel: string;
    features: {
      id: string;
      name: string;
      description: string;
      subFeatures: string[];
      acceptanceCriteria: string[];
      userFlow: string;
      screenSpecs: { id: string; name: string; purpose: string; elements: string[]; scenarios: string[][] }[];
      businessRules: string[];
      dataEntities: { name: string; fields: string }[];
      errorCases: string[];
      estimatedManDays?: number;
      dependencies?: string[];
    }[];
  }[];
  nonFunctionalRequirements: { category: string; items: string[] }[];
  timeline: { phase: string; duration: string; deliverables: string[] }[];
  assumptions: string[];
  constraints: string[];
  risks: { risk: string; impact: string; mitigation: string; probability?: string }[];
  glossary: { term: string; definition: string }[];
  expertInsight: string;
  informationArchitecture: {
    sitemap: { id: string; label: string; children?: { id: string; label: string; children?: { id: string; label: string }[] }[] }[];
  };
  // FORGE v2 — New Fields
  originalDescription?: string;
  apiEndpoints?: { method: string; path: string; description: string; feature: string }[];
  dataModel?: { entity: string; fields: string[]; relationships: string[] }[];
  competitorAnalysis?: { name: string; strengths: string; weaknesses: string; differentiation: string }[];
  // P1: Approval & QA
  approvalProcess?: { stage: string; approver: string; criteria: string }[];
  qaStrategy?: { type: string; scope: string; tools: string; criteria: string }[];
}

// ━━━━━ Design Tokens (Design System v2 — Slate + Blue Brand) ━━━━━
const C = {
  // Brand blues
  blue: '#2563EB',
  blueLight: '#3B82F6',
  blueSoft: '#60A5FA',
  blueBg: 'rgba(37, 99, 235, 0.05)',
  // Dark
  darkHeader: '#0F172A',
  darkSurface: '#1E293B',
  // Backgrounds
  bg: '#f5f5f7',
  white: '#FFFFFF',
  surface: '#f8fafc',
  // Text — Slate scale
  textPrimary: '#1e293b',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
  textOnDark: 'rgba(255,255,255,0.85)',
  textOnDarkSub: 'rgba(255,255,255,0.6)',
  // Borders
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  // Accents
  green: '#22c55e',
  greenBg: '#dcfce7',
  greenBorder: '#bbf7d0',
  yellow: '#eab308',
  yellowBg: '#fef3c7',
  yellowBorder: '#fde68a',
  red: '#ef4444',
  redBg: '#fee2e2',
  redBorder: '#fecaca',
  purple: '#7c3aed',
  purpleBg: '#f5f3ff',
  purpleBorder: '#ddd6fe',
  // Gradients
  gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
  gradientAccent: 'linear-gradient(90deg, #2563eb, #7c3aed)',
  gradientDark: 'linear-gradient(180deg, #0f172a, #1e293b)',
  gradientCTA: 'linear-gradient(135deg, #1e40af 0%, #2563eb 40%, #7c3aed 100%)',
  // Shadows (2-layer system)
  shadowCard: '0 2px 12px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.02)',
  shadowCardHover: '0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(37,99,235,0.08)',
  shadowFloat: '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.05)',
  shadowCTA: '0 4px 24px rgba(37,99,235,0.4)',
  shadowHeader: '0 4px 30px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08)',
  // Transition
  ease: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
};

// ━━━━━ ReadOnly Context ━━━━━
const ReadOnlyContext = React.createContext(false);

// ━━━━━ Text Formatting Utility ━━━━━
function formatTextContent(text: string): React.ReactNode[] {
  if (!text) return [];
  // Split by existing newlines first, then split long blocks by sentences
  const blocks = text.split(/\n{2,}|\r?\n/).filter(b => b.trim());
  if (blocks.length <= 1 && text.length > 200) {
    // AI-generated text with no line breaks — split by sentences
    const sentences = text.match(/[^.!?。]+[.!?。]+\s*/g) || [text];
    const paragraphs: string[] = [];
    let current = '';
    for (const sentence of sentences) {
      current += sentence;
      // Group ~2-3 sentences per paragraph
      if (current.length > 120) {
        paragraphs.push(current.trim());
        current = '';
      }
    }
    if (current.trim()) paragraphs.push(current.trim());
    return paragraphs.map((p, i) => (
      <p key={i} style={{ margin: i === 0 ? '0 0 12px 0' : '0 0 12px 0', lineHeight: 1.85 }}>{p}</p>
    ));
  }
  return blocks.map((b, i) => (
    <p key={i} style={{ margin: i === 0 ? '0 0 12px 0' : '0 0 12px 0', lineHeight: 1.85 }}>{b.trim()}</p>
  ));
}

// ━━━━━ Unified Editable Text (FormattedText + EditableText merged) ━━━━━
// #4: 편집 UX 통일 — AI 재생성, 포맷팅, readOnly 모두 지원
function FormattedText({ value, onChange, style, sectionKey, sectionTitle, projectContext, readOnly: ro, formatted = true }: {
  value: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
  sectionKey?: string;
  sectionTitle?: string;
  projectContext?: { projectName?: string; projectType?: string; coreFeatures?: string };
  readOnly?: boolean;
  formatted?: boolean; // true: use formatTextContent, false: plain text
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [regenerating, setRegenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  const handleRegenerate = async (tone?: string) => {
    if (!sectionKey || regenerating) return;
    setRegenerating(true);
    try {
      const res = await fetch('/api/regenerate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionKey,
          sectionTitle: sectionTitle || sectionKey,
          currentContent: value,
          projectContext: projectContext || {},
          tone: tone || undefined,
        }),
      });
      const data = await res.json();
      if (data.regeneratedContent) onChange(data.regeneratedContent);
    } catch (err) { console.error('Regenerate error:', err); }
    setRegenerating(false);
  };

  // readOnly mode — no editing UI (prop or context)
  const globalReadOnly = React.useContext(ReadOnlyContext);
  const isReadOnly = ro || globalReadOnly;
  if (isReadOnly) {
    return (
      <div style={{ ...style, fontSize: 15, color: C.textSecondary }}>
        {formatted ? formatTextContent(value) : value}
      </div>
    );
  }

  if (editing) {
    return (
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          style={{
            ...style, width: '100%', border: `2px solid ${C.blue}`, borderRadius: 8,
            padding: '12px', fontSize: 15, fontFamily: 'inherit', lineHeight: 1.8,
            resize: 'none', outline: 'none', background: 'rgba(37, 99, 235, 0.02)',
            color: C.textSecondary, margin: 0,
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8, flexWrap: 'wrap' }}>
          {sectionKey && (
            <div style={{ display: 'flex', gap: 4, marginRight: 'auto', flexWrap: 'wrap' }}>
              <button onClick={() => handleRegenerate()} disabled={regenerating} style={{
                padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.purple}`,
                background: regenerating ? C.purpleBg : C.white, fontSize: 12, cursor: regenerating ? 'wait' : 'pointer',
                color: C.purple, fontWeight: 500,
              }}>
                {regenerating ? '⏳ AI 재작성 중...' : '🤖 AI 재작성'}
              </button>
              {/* #11: 톤 조절 퀵 버튼 */}
              {!regenerating && ([
                { key: 'concise', label: '📝 간결하게' },
                { key: 'detailed', label: '📖 상세하게' },
                { key: 'executive', label: '👔 경영진용' },
                { key: 'developer', label: '💻 개발자용' },
              ] as const).map(t => (
                <button key={t.key} onClick={() => handleRegenerate(t.key)} style={{
                  padding: '4px 10px', borderRadius: 5, border: `1px solid ${C.border}`,
                  background: C.white, fontSize: 11, cursor: 'pointer', color: C.textTertiary,
                }}>{t.label}</button>
              ))}
            </div>
          )}
          <button onClick={() => { setDraft(value); setEditing(false); }} style={{
            padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.border}`,
            background: C.white, fontSize: 12, cursor: 'pointer', color: C.textSecondary,
          }}>취소</button>
          <button onClick={() => { onChange(draft); setEditing(false); }} style={{
            padding: '6px 14px', borderRadius: 6, border: 'none',
            background: C.blue, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>저장</button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="prd-editable"
      role="button"
      tabIndex={0}
      aria-label={`${sectionTitle || '섹션'} 편집하기`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(true); } }}
      style={{ ...style, cursor: 'pointer', position: 'relative', borderRadius: 6, transition: 'background 0.15s', padding: '4px 6px' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37,99,235,0.03)'; (e.currentTarget.querySelector('.edit-hint') as HTMLElement)?.style && ((e.currentTarget.querySelector('.edit-hint') as HTMLElement).style.opacity = '1'); }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; (e.currentTarget.querySelector('.edit-hint') as HTMLElement)?.style && ((e.currentTarget.querySelector('.edit-hint') as HTMLElement).style.opacity = '0'); }}
      title="클릭하여 편집"
    >
      {formatted ? formatTextContent(value) : value}
      <span className="edit-hint" style={{
        position: 'absolute', top: 4, right: 4,
        fontSize: 11, color: C.textTertiary, opacity: 0,
        background: 'rgba(255,255,255,0.95)', padding: '2px 8px', borderRadius: 4,
        transition: 'opacity 0.15s', pointerEvents: 'none',
        border: `1px solid ${C.border}`,
      }}>✏️ 편집</span>
    </div>
  );
}

// #4: EditableText is now an alias for FormattedText with formatted=false
function EditableText(props: Parameters<typeof FormattedText>[0]) {
  return <FormattedText {...props} formatted={false} />;
}

// ━━━━━ Section Divider ━━━━━
function SectionDivider() {
  return (
    <div style={{ margin: '32px 0 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.border}, transparent)` }} />
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.gradientAccent, opacity: 0.5 }} />
      <div style={{ flex: 1, height: 1, background: `linear-gradient(270deg, ${C.border}, transparent)` }} />
    </div>
  );
}

// ━━━━━ Section Number ━━━━━
function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{
          background: C.gradient,
          color: '#fff',
          width: 40, height: 40,
          borderRadius: 12,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          fontWeight: 800,
          flexShrink: 0,
          boxShadow: '0 2px 12px rgba(37,99,235,0.25), 0 0 0 1px rgba(37,99,235,0.1)',
        }}>{number}</span>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: '-0.5px' }}>
          {title}
        </h2>
      </div>
      {subtitle && (
        <p style={{ fontSize: 13, color: C.textTertiary, margin: '8px 0 0 54px', lineHeight: 1.6, fontWeight: 500 }}>{subtitle}</p>
      )}
    </div>
  );
}

// ━━━━━ Card Wrapper ━━━━━
function Card({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={`prd-card ${className || ''}`} style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: '24px 28px',
      marginBottom: 20,
      boxShadow: C.shadowCard,
      transition: C.ease,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ━━━━━ Priority Badge (pill) ━━━━━
function PriorityBadge({ priority, label }: { priority: string; label: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    P0: { bg: C.redBg, color: '#dc2626', border: C.redBorder },
    P1: { bg: '#eff6ff', color: C.blue, border: '#bfdbfe' },
    P2: { bg: C.borderLight, color: '#64748b', border: C.border },
  };
  const s = styles[priority] || styles.P1;
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      letterSpacing: '0.2px',
    }}>
      {priority} · {label}
    </span>
  );
}

// ━━━━━ Feature Detail (Redesigned — Full-width Pro Layout) ━━━━━
function FeatureDetail({ feature, index }: { feature: any; index: string }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = ((feature.subFeatures?.length ?? 0) > 0) || feature.userFlow || ((feature.screenSpecs?.length ?? 0) > 0) || ((feature.acceptanceCriteria?.length ?? 0) > 0);

  return (
    <div style={{
      background: C.white, border: `1px solid ${expanded ? C.blueLight : C.border}`,
      borderRadius: 14, marginBottom: 12, overflow: 'hidden',
      transition: C.ease,
      boxShadow: expanded ? C.shadowCardHover : '0 1px 4px rgba(0,0,0,0.03)',
    }}>
      <button
        onClick={() => hasDetail && setExpanded(!expanded)}
        style={{
          width: '100%', padding: '16px 20px', background: expanded ? C.surface : 'none',
          border: 'none', cursor: hasDetail ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
          transition: C.ease,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
          <span style={{
            fontSize: 11, fontWeight: 800, color: C.blue, fontFamily: 'monospace',
            background: C.blueBg, padding: '4px 8px', borderRadius: 6, flexShrink: 0,
          }}>{index}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h5 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{feature.name}</h5>
              {feature.estimatedManDays > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: C.yellow, background: C.yellowBg,
                  padding: '2px 8px', borderRadius: 4, border: `1px solid rgba(245,158,11,0.15)`,
                  whiteSpace: 'nowrap',
                }}>⏱ {feature.estimatedManDays}MD</span>
              )}
            </div>
            <p style={{ fontSize: 13, color: C.textTertiary, margin: '2px 0 0 0', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: expanded ? undefined : 1, WebkitBoxOrient: 'vertical' as any }}>
              {feature.description}
            </p>
          </div>
        </div>
        {hasDetail && (
          <div style={{
            width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: expanded ? C.blueBg : C.borderLight, flexShrink: 0, marginLeft: 12,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'all 0.2s',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={expanded ? C.blue : C.textTertiary} strokeWidth="2.5" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        )}
      </button>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '24px', background: '#FAFBFD' }}>
          {/* Description full */}
          {feature.description && (
            <div style={{ marginBottom: 20, fontSize: 14, color: C.textSecondary, lineHeight: 1.8 }}>
              {formatTextContent(feature.description)}
            </div>
          )}

          {/* Grid layout for sub-features and acceptance criteria */}
          {((feature.subFeatures?.length ?? 0) > 0 || (feature.acceptanceCriteria?.length ?? 0) > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
              {(feature.subFeatures?.length ?? 0) > 0 && (
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 6, background: C.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🔧</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, letterSpacing: 0.3 }}>하위 기능</span>
                  </div>
                  {feature.subFeatures.map((sf: string, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
                      <span style={{ color: C.blue, flexShrink: 0, marginTop: 2, fontSize: 8 }}>●</span>
                      {sf}
                    </div>
                  ))}
                </div>
              )}
              {(feature.acceptanceCriteria?.length ?? 0) > 0 && (
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 6, background: C.greenBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✅</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, letterSpacing: 0.3 }}>수락 기준 (AC)</span>
                  </div>
                  {feature.acceptanceCriteria.map((ac: string, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
                      <span style={{ color: C.green, flexShrink: 0, marginTop: 1 }}>✓</span>
                      {ac}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User Flow — full width code block */}
          {feature.userFlow && feature.userFlow !== '(사용자 흐름 미정의)' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 24, height: 24, borderRadius: 6, background: C.purpleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🔄</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, letterSpacing: 0.3 }}>사용자 흐름</span>
              </div>
              <pre style={{
                background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '16px 20px', fontSize: 12, color: C.textSecondary,
                fontFamily: '"SF Mono", Monaco, Consolas, monospace',
                overflow: 'auto', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap',
              }}>
                {feature.userFlow}
              </pre>
            </div>
          )}

          {/* Screen Specs — card grid instead of table */}
          {(feature.screenSpecs?.length ?? 0) > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 24, height: 24, borderRadius: 6, background: C.yellowBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>📱</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, letterSpacing: 0.3 }}>화면 명세</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {feature.screenSpecs.map((spec: any, i: number) => (
                  <div key={i} style={{
                    background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
                    padding: '16px 18px', borderTop: `3px solid ${C.yellow}`,
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>{spec.name}</div>
                    <div style={{ fontSize: 12, color: C.textTertiary, marginBottom: 10, lineHeight: 1.5 }}>{spec.purpose}</div>
                    {spec.elements?.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {spec.elements.map((el: string, j: number) => (
                          <span key={j} style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 4,
                            background: C.borderLight, color: C.textSecondary,
                          }}>{el}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Business Rules + Error Cases — side by side */}
          {((feature.businessRules?.length ?? 0) > 0 || (feature.errorCases?.length ?? 0) > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
              {(feature.businessRules?.length ?? 0) > 0 && (
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 6, background: C.blueBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>📋</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, letterSpacing: 0.3 }}>비즈니스 규칙</span>
                  </div>
                  {feature.businessRules.map((rule: string, i: number) => (
                    <div key={i} style={{ fontSize: 13, color: C.textSecondary, marginBottom: 8, lineHeight: 1.6, paddingLeft: 14, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: C.textTertiary }}>•</span>{rule}
                    </div>
                  ))}
                </div>
              )}
              {(feature.errorCases?.length ?? 0) > 0 && (
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 6, background: C.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⚠️</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, letterSpacing: 0.3 }}>에러 케이스</span>
                  </div>
                  {feature.errorCases.map((ec: string, i: number) => (
                    <div key={i} style={{ fontSize: 13, color: C.textSecondary, marginBottom: 8, lineHeight: 1.6, paddingLeft: 14, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: C.red }}>!</span>{ec}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Data Entities */}
          {(feature.dataEntities?.length ?? 0) > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 24, height: 24, borderRadius: 6, background: C.purpleBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🗄️</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, letterSpacing: 0.3 }}>데이터 엔티티</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {feature.dataEntities.map((entity: any, i: number) => (
                  <div key={i} style={{
                    background: C.white, border: `1px solid ${C.border}`, borderRadius: 8,
                    padding: '10px 14px', fontSize: 12, minWidth: 140,
                  }}>
                    <div style={{ fontWeight: 700, color: C.purple, marginBottom: 2, fontFamily: 'monospace' }}>{entity.name}</div>
                    <div style={{ color: C.textSecondary, fontSize: 11, lineHeight: 1.5 }}>{entity.fields}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailSection({ title, items, icon }: { title: string; items: string[]; icon?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h6 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </h6>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 14, color: C.textSecondary, marginBottom: 6, paddingLeft: 20, position: 'relative', lineHeight: 1.6 }}>
            <span style={{ position: 'absolute', left: 0 }}>{icon || '•'}</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ━━━━━ Module Card ━━━━━
const ModuleCard = memo(function ModuleCard({ module, forceExpand }: { module: any; forceExpand?: boolean | null }) {
  const [expanded, setExpanded] = useState(module.priority === 'P0');
  useEffect(() => {
    if (forceExpand === true) setExpanded(true);
    if (forceExpand === false) setExpanded(false);
  }, [forceExpand]);

  return (
    <div className="prd-module-card" style={{
      background: C.white, border: `1px solid ${expanded ? C.blueLight : C.border}`, borderRadius: 16,
      overflow: 'hidden', marginBottom: 14, boxShadow: expanded ? C.shadowCardHover : C.shadowCard,
      transition: C.ease,
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', padding: '18px 20px', background: expanded ? C.surface : 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
          transition: C.ease,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h4 style={{ fontSize: 17, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{module.name}</h4>
            <PriorityBadge priority={module.priority} label={module.priorityLabel} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: C.textTertiary }}>{module.features?.length || 0}개 기능 포함</span>
            {(() => { const totalMD = module.features?.reduce((s: number, f: any) => s + (f.estimatedManDays || 0), 0) || 0; return totalMD > 0 ? <span style={{ fontSize: 11, fontWeight: 600, color: C.yellow, background: C.yellowBg, padding: '2px 8px', borderRadius: 4 }}>총 {totalMD}MD</span> : null; })()}
          </div>
        </div>
        <div style={{
          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s',
          color: C.textTertiary, flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '18px 20px', background: 'rgba(248,250,252,0.5)' }}>
          {module.features?.map((feature: any, idx: number) => (
            <FeatureDetail key={idx} feature={feature} index={feature.id || `${module.priority}-${idx + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
});

// ━━━━━ TOC (Table of Contents) ━━━━━
function TableOfContents({ sections }: { sections: { num: string; title: string; id: string }[] }) {
  return (
    <Card style={{ background: '#FAFBFD', padding: '32px 32px 28px', border: `1px solid ${C.border}`, borderTop: `3px solid ${C.blue}`, borderRadius: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: C.textPrimary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          목차
        </span>
        <span style={{ fontSize: 11, color: C.textTertiary, fontWeight: 500 }}>TABLE OF CONTENTS</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 4 }}>
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
              borderRadius: 8, textDecoration: 'none', color: C.textSecondary,
              fontSize: 13, fontWeight: 500, transition: 'all 0.15s', lineHeight: 1.4,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.blueBg; e.currentTarget.style.color = C.blue; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSecondary; }}
          >
            <span style={{
              background: C.blueBg, color: C.blue, width: 26, height: 26,
              borderRadius: 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>{s.num}</span>
            {s.title}
          </a>
        ))}
      </div>
    </Card>
  );
}

// ━━━━━ A-1: Floating TOC (Side Navigation) ━━━━━
function FloatingTOC({ sections, activeSection }: { sections: { num: string; title: string; id: string }[]; activeSection: string }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <nav className="prd-floating-toc no-print" aria-label="문서 목차" style={{
      position: 'fixed', left: 16, top: '50%', transform: 'translateY(-50%)',
      zIndex: 100, transition: 'all 0.3s ease',
    }}>
      {collapsed ? (
        <button onClick={() => setCollapsed(false)} style={{
          width: 40, height: 40, borderRadius: 12, border: `1px solid ${C.border}`,
          background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: C.shadowFloat, fontSize: 16,
        }}>📑</button>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px) saturate(1.4)',
          border: `1px solid ${C.border}`, borderRadius: 16, padding: '16px 12px',
          boxShadow: C.shadowFloat, maxHeight: '70vh', overflowY: 'auto',
          width: 200,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6, padding: '0 4px' }}>
            <button onClick={() => setCollapsed(true)} style={{
              width: 20, height: 20, borderRadius: 4, border: 'none', background: 'none',
              cursor: 'pointer', fontSize: 10, color: C.textTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
          {sections.map((s) => {
            const isActive = activeSection === s.id;
            return (
              <a key={s.id} href={`#${s.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                borderRadius: 6, textDecoration: 'none', fontSize: 11, fontWeight: isActive ? 700 : 500,
                color: isActive ? C.blue : C.textTertiary, background: isActive ? C.blueBg : 'transparent',
                transition: 'all 0.15s', marginBottom: 1, borderLeft: isActive ? `2px solid ${C.blue}` : '2px solid transparent',
              }}>
                <span style={{ width: 18, height: 18, borderRadius: 4, fontSize: 9, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: isActive ? C.blue : 'transparent', color: isActive ? '#fff' : C.textTertiary,
                }}>{s.num}</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
              </a>
            );
          })}
        </div>
      )}
    </nav>
  );
}

// ━━━━━ Sticky Top Bar — Project Title + URL Copy + CTA ━━━━━
function StickyTopBar({ projectName, onCTAClick, shareUrl }: { projectName: string; onCTAClick: () => void; shareUrl?: string }) {
  const [visible, setVisible] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleCopyLink = async () => {
    const url = shareUrl || window.location.href;
    try { await navigator.clipboard.writeText(url); } catch {
      const ta = document.createElement('textarea');
      ta.value = url; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (!visible) return null;

  return (
    <div className="no-print" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(15,23,42,0.82)', backdropFilter: 'blur(24px) saturate(1.6)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      boxShadow: C.shadowHeader,
      padding: '0 24px',
      animation: 'slideDown 0.25s cubic-bezier(0.22,1,0.36,1)',
    }}>
      <style>{`@keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 56, gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <span style={{
            fontSize: 15, fontWeight: 700, color: C.textOnDark,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{projectName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleCopyLink}
            style={{
              padding: '7px 14px', borderRadius: 8,
              border: `1px solid ${linkCopied ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.15)'}`,
              background: linkCopied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)',
              color: linkCopied ? '#86efac' : C.textOnDarkSub,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: C.ease,
            }}
          >
            {linkCopied ? '✅ 복사됨' : '🔗 URL 복사'}
          </button>
          <button
            onClick={onCTAClick}
            style={{
              padding: '7px 20px', borderRadius: 8, border: 'none',
              background: '#fff', color: C.blue,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
              transition: C.ease,
            }}
            onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = 'translateY(-1px)'; (e.target as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)'; }}
            onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = 'translateY(0)'; (e.target as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.2)'; }}
          >
            <span>⚡</span>
            개발 파트너 찾기
          </button>
        </div>
      </div>
    </div>
  );
}

// ━━━━━ B-1: Header KPI Summary Cards ━━━━━
function KPISummary({ prdData }: { prdData: PRDResult }) {
  const totalFeatures = prdData.featureModules?.reduce((s, m) => s + (m.features?.length || 0), 0) || 0;
  const p0Count = prdData.featureModules?.filter(m => m.priority === 'P0').reduce((s, m) => s + (m.features?.length || 0), 0) || 0;
  const p1Count = prdData.featureModules?.filter(m => m.priority === 'P1').reduce((s, m) => s + (m.features?.length || 0), 0) || 0;
  const totalDuration = prdData.timeline?.reduce((s, t) => {
    const m = t.duration.match(/(\d+)/);
    return s + (m ? parseInt(m[1]) : 0);
  }, 0) || 0;
  const cards = [
    { label: '총 기능', value: `${totalFeatures}개`, sub: `P0: ${p0Count} / P1: ${p1Count}`, icon: '⚙️', color: C.blue },
    { label: '예상 기간', value: totalDuration > 0 ? `${totalDuration}~${Math.round(totalDuration * 1.4)}주` : '-', sub: `${prdData.timeline?.length || 0}개 페이즈`, icon: '📅', color: C.green },
    { label: 'NFR 항목', value: `${prdData.nonFunctionalRequirements?.reduce((s, n) => s + (n.items?.length || 0), 0) || 0}개`, sub: `${prdData.nonFunctionalRequirements?.length || 0}개 카테고리`, icon: '🛡️', color: C.purple },
  ];

  return (
    <div className="prd-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 32 }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 18px',
          borderTop: `3px solid ${c.color}`, boxShadow: C.shadowCard,
          transition: C.ease,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = C.shadowCardHover; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = C.shadowCard; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 }}>{c.label}</span>
            <span style={{ fontSize: 18, opacity: 0.85 }}>{c.icon}</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: C.textPrimary, marginBottom: 3, letterSpacing: '-0.5px' }}>{c.value}</div>
          <div style={{ fontSize: 12, color: C.textTertiary, fontWeight: 500 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ━━━━━ B-3: Gantt Chart Timeline ━━━━━
function GanttChart({ timeline }: { timeline: PRDResult['timeline'] }) {
  if (!timeline || timeline.length === 0) return null;
  const phaseColors = [C.blue, C.green, C.purple, C.yellow, C.red, C.blueSoft];
  let cumulativeWeeks = 0;
  const phases = timeline.map((t, i) => {
    const match = t.duration.match(/(\d+)~?(\d+)?/);
    const minW = match ? parseInt(match[1]) : 2;
    const maxW = match ? parseInt(match[2] || match[1]) : minW;
    const start = cumulativeWeeks;
    cumulativeWeeks += maxW;
    return { ...t, start, minW, maxW, color: phaseColors[i % phaseColors.length] };
  });
  const totalWeeks = cumulativeWeeks;

  return (
    <Card className="prd-gantt-container" style={{ padding: '28px 28px 20px' }}>
      {/* Week markers */}
      <div className="prd-hide-mobile" style={{ display: 'flex', marginBottom: 6, paddingLeft: 140 }}>
        {Array.from({ length: totalWeeks + 1 }, (_, i) => (
          <div key={i} style={{ flex: 1, fontSize: 9, color: C.textTertiary, textAlign: 'left' }}>
            {i % 2 === 0 ? `${i}주` : ''}
          </div>
        ))}
      </div>
      {/* Bars */}
      {phases.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ width: 130, flexShrink: 0, paddingRight: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.phase}</div>
            <div style={{ fontSize: 10, color: C.textTertiary }}>{p.duration}</div>
          </div>
          <div style={{ flex: 1, position: 'relative', height: 28, background: C.borderLight, borderRadius: 6 }}>
            <div style={{
              position: 'absolute', left: `${(p.start / totalWeeks) * 100}%`,
              width: `${(p.maxW / totalWeeks) * 100}%`, height: '100%',
              background: `linear-gradient(135deg, ${p.color}, ${p.color}CC)`,
              borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 2px 6px ${p.color}33`,
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', padding: '0 6px' }}>
                {p.minW !== p.maxW ? `${p.minW}~${p.maxW}주` : `${p.maxW}주`}
              </span>
            </div>
          </div>
        </div>
      ))}
      {/* Deliverables legend */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.borderLight}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>산출물</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {phases.map((p, i) => p.deliverables?.map((d, j) => (
            <span key={`${i}-${j}`} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: `${p.color}10`, color: p.color, border: `1px solid ${p.color}25`, fontWeight: 500,
            }}>{d}</span>
          )))}
        </div>
      </div>
    </Card>
  );
}

// (B-4: Risk Matrix 제거 — 테이블로 통합)

// ━━━━━ B-8: Sticky Action Bar ━━━━━
function StickyActionBar({ onShare, onCopy, onPDF, onDOCX, sharing, pdfGen, docxGen, copied }: {
  onShare: () => void; onCopy: () => void; onPDF: () => void; onDOCX: () => void;
  sharing: boolean; pdfGen: boolean; docxGen: boolean; copied: boolean;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  if (!visible) return null;
  return (
    <div className="no-print" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99,
      background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(20px) saturate(1.5)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '10px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
    }}>
      <button onClick={onShare} disabled={sharing} style={{
        padding: '8px 18px', borderRadius: 8, border: 'none', background: '#fff',
        color: C.blue, fontSize: 12, fontWeight: 700, cursor: sharing ? 'wait' : 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 5, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>🔗 {sharing ? '생성 중...' : '공유 링크'}</button>
      <button onClick={onCopy} style={{
        padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(255,255,255,0.08)', color: C.textOnDarkSub, fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}>{copied ? '✅ 복사됨' : '📋 복사'}</button>
      <button onClick={onPDF} disabled={pdfGen} style={{
        padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(255,255,255,0.08)', color: C.textOnDarkSub, fontSize: 12, fontWeight: 600, cursor: pdfGen ? 'wait' : 'pointer',
      }}>{pdfGen ? '⏳...' : '📄 PDF'}</button>
      <button onClick={onDOCX} disabled={docxGen} style={{
        padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(255,255,255,0.08)', color: C.textOnDarkSub, fontSize: 12, fontWeight: 600, cursor: docxGen ? 'wait' : 'pointer',
      }}>{docxGen ? '⏳...' : '📝 DOCX'}</button>
    </div>
  );
}

// ━━━━━ A-3: Section Header with Anchor Link ━━━━━
function SectionHeaderAnchored({ number, title, subtitle, id }: { number: string; title: string; subtitle?: string; id?: string }) {
  const [linkCopied, setLinkCopied] = useState(false);
  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}
        className="section-header-group">
        <span style={{
          background: C.gradient, color: '#fff', width: 40, height: 40, borderRadius: 12,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 800, flexShrink: 0,
          boxShadow: '0 2px 12px rgba(37,99,235,0.25), 0 0 0 1px rgba(37,99,235,0.1)',
        }}>{number}</span>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: '-0.5px' }}>{title}</h2>
        {id && (
          <button onClick={handleCopyLink} style={{
            opacity: 0, transition: C.ease, border: 'none', background: 'none',
            cursor: 'pointer', fontSize: 14, padding: '4px 8px', borderRadius: 6, color: C.textTertiary,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = C.blueBg; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.background = 'none'; }}
          title="섹션 링크 복사"
          >{linkCopied ? '✅' : '🔗'}</button>
        )}
      </div>
      {subtitle && (
        <p style={{ fontSize: 13, color: C.textTertiary, margin: '8px 0 0 54px', lineHeight: 1.6, fontWeight: 500 }}>{subtitle}</p>
      )}
      <style>{`.section-header-group:hover button { opacity: 0.6 !important; }`}</style>
    </div>
  );
}

// ━━━━━ Main Component ━━━━━
export default function RFPComplete({ rfpData, email, sessionId, preloadedPrd, readOnly }: RFPCompleteProps) {
  // preloadedPrd가 있으면 바로 파싱해서 사용 (share 페이지)
  const initialPrd = useMemo(() => {
    if (preloadedPrd) {
      try {
        const parsed = JSON.parse(preloadedPrd);
        if (parsed?.projectName && parsed?.featureModules) return parsed as PRDResult;
      } catch { /* parse failed */ }
    }
    return null;
  }, [preloadedPrd]);

  const [prdData, setPrdData] = useState<PRDResult | null>(initialPrd);
  const [loading, setLoading] = useState(!initialPrd);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [sharing, setSharing] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [ctaEmail, setCtaEmail] = useState('');
  const [ctaPhone, setCtaPhone] = useState('');
  const [ctaSubmitted, setCtaSubmitted] = useState(false);
  const [ctaSubmitting, setCtaSubmitting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  // A-1: Floating TOC active section tracking
  const [activeSection, setActiveSection] = useState('');
  // B-2: Feature priority filter
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'P0' | 'P1' | 'P2'>('all');
  // A-2: Expand/collapse all
  const [expandAll, setExpandAll] = useState<boolean | null>(null);
  // (검색 기능 제거됨)

  // A-1: Intersection Observer for Floating TOC
  useEffect(() => {
    if (loading || !prdData) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    const sectionEls = document.querySelectorAll('[id^="sec-"]');
    sectionEls.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [loading, prdData]);

  // (검색 기능 관련 effect 제거됨)

  // F11: 단계별 진행 상태
  const [loadingPhase, setLoadingPhase] = useState(0);
  const loadingPhases = [
    { icon: '📊', label: '프로젝트 데이터 분석 중...', sub: '수집된 정보를 구조화하고 있습니다' },
    { icon: '🧠', label: 'AI 기획서 초안 작성 중...', sub: '기능 명세와 아키텍처를 설계합니다' },
    { icon: '✨', label: '전문가 인사이트 생성 중...', sub: '10,000건+ 위시켓 데이터 기반 분석' },
    { icon: '📋', label: '최종 PRD 문서 조합 중...', sub: '섹션별 검수 및 품질 보증 단계' },
  ];

  useEffect(() => {
    // preloadedPrd가 있으면 API 호출 스킵
    if (initialPrd) return;

    const fetchPRD = async () => {
      // 단계별 진행 애니메이션
      const phaseTimer = setInterval(() => {
        setLoadingPhase(prev => Math.min(prev + 1, loadingPhases.length - 1));
      }, 5000);

      try {
        const res = await fetch('/api/generate-rfp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rfpData, sessionId }),
        });
        const data = await res.json();
        clearInterval(phaseTimer);
        if (data.rfpDocument) {
          try {
            const parsed = JSON.parse(data.rfpDocument);
            if (parsed?.projectName && parsed?.featureModules) {
              setPrdData(parsed);
              setLoading(false);
              // Auto-share: 생성 즉시 공유 URL 생성 → 브라우저 주소창 업데이트
              try {
                const shareRes = await fetch('/api/share-prd', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    rfpDocument: data.rfpDocument,
                    rfpData,
                    projectName: parsed.projectName,
                  }),
                });
                const shareData = await shareRes.json();
                if (shareData.shareId) {
                  const url = `${window.location.origin}/share/${shareData.shareId}`;
                  setShareUrl(url);
                  window.history.replaceState({}, '', `/share/${shareData.shareId}`);
                }
              } catch { /* auto-share 실패해도 PRD는 정상 표시 */ }
              return;
            }
          } catch { /* JSON parse failed */ }
        }
        setLoading(false);
      } catch (err) {
        clearInterval(phaseTimer);
        console.error('PRD generation error:', err);
        setLoading(false);
      }
    };
    fetchPRD();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfpData, sessionId]);

  const copyToClipboard = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, []);

  // Share PRD via URL
  const handleShare = useCallback(async () => {
    if (!prdData) return;
    setSharing(true);
    try {
      const res = await fetch('/api/share-prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rfpDocument: JSON.stringify(prdData),
          rfpData,
          projectName: prdData.projectName,
        }),
      });
      const data = await res.json();
      if (data.shareId) {
        const url = `${window.location.origin}/share/${data.shareId}`;
        setShareUrl(url);
        try { await navigator.clipboard.writeText(url); } catch { /* fallback below */ }
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 3000);
      }
    } catch (err) {
      console.error('Share error:', err);
    }
    setSharing(false);
  }, [prdData, rfpData]);

  const handleCopyShareUrl = useCallback(async () => {
    try { await navigator.clipboard.writeText(shareUrl); } catch {
      const ta = document.createElement('textarea');
      ta.value = shareUrl; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2500);
  }, [shareUrl]);

  const handlePrint = useCallback(() => { window.print(); }, []);

  // #13: PDF 내보내기 — 고품질 멀티페이지 (개선)
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const handlePDF = useCallback(async () => {
    if (!contentRef.current || !prdData) return;
    setPdfGenerating(true);
    try {
      // no-print 및 편집 UI 요소 숨기기
      const hideEls = contentRef.current.querySelectorAll('.no-print, .edit-hint, .prd-skip-nav');
      hideEls.forEach(el => (el as HTMLElement).style.display = 'none');
      // 편집 커서 제거
      const editables = contentRef.current.querySelectorAll('.prd-editable');
      editables.forEach(el => { (el as HTMLElement).style.cursor = 'default'; });

      const canvas = await html2canvas(contentRef.current, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
        windowWidth: 1100,
        removeContainer: true,
      });

      // 요소 복원
      hideEls.forEach(el => (el as HTMLElement).style.display = '');
      editables.forEach(el => { (el as HTMLElement).style.cursor = 'pointer'; });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const usableWidth = pdfWidth - margin * 2;
      const usableHeight = pdfHeight - margin * 2;
      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // 멀티페이지 — 정확한 분할
      let yOffset = 0;
      let pageNum = 0;
      while (yOffset < imgHeight) {
        if (pageNum > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, margin - yOffset, imgWidth, imgHeight);
        // 페이지 푸터
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`${prdData.projectName} — PRD`, margin, pdfHeight - 3);
        pdf.text(`${pageNum + 1}`, pdfWidth - margin, pdfHeight - 3, { align: 'right' });
        yOffset += usableHeight;
        pageNum++;
      }

      const fileName = `${prdData.projectName.replace(/[^가-힣a-zA-Z0-9]/g, '_')}_PRD_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('PDF 생성 중 오류가 발생했습니다. 브라우저 인쇄(Ctrl+P) 기능을 이용해주세요.');
    }
    setPdfGenerating(false);
  }, [prdData]);

  // F12: DOCX 내보내기 (Pro-grade)
  const [docxGenerating, setDocxGenerating] = useState(false);
  const handleDOCX = useCallback(async () => {
    if (!prdData) return;
    setDocxGenerating(true);
    try {
      const d = prdData;
      const totalFeats = d.featureModules?.reduce((s, m) => s + (m.features?.length || 0), 0) || 0;
      const totalDur = d.timeline?.reduce((s, t) => { const m = t.duration.match(/(\d+)/); return s + (m ? parseInt(m[1]) : 0); }, 0) || 0;

      // ── DOCX Helper: styled table ──
      const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'D0D5DD' };
      const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
      const headerShading = { type: ShadingType.SOLID, color: 'F1F5F9', fill: 'F1F5F9' };
      const hCell = (text: string, width?: number) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, font: 'Pretendard' })], spacing: { before: 60, after: 60 } })],
        borders: cellBorders, shading: headerShading,
        ...(width ? { width: { size: width, type: WidthType.PERCENTAGE } } : {}),
      });
      const bCell = (text: string, width?: number) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, size: 20, font: 'Pretendard' })], spacing: { before: 40, after: 40 } })],
        borders: cellBorders,
        ...(width ? { width: { size: width, type: WidthType.PERCENTAGE } } : {}),
      });

      // ── Cover Page Section ──
      const coverChildren: Paragraph[] = [
        new Paragraph({ spacing: { before: 2400 } }),
        new Paragraph({ children: [new TextRun({ text: 'PRD · 제품 요구사항 정의서', size: 22, color: '2563EB', font: 'Pretendard' })], spacing: { after: 200 }, alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: d.projectName, size: 56, bold: true, font: 'Pretendard', color: '0F172A' })], spacing: { after: 300 }, alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [
          new TextRun({ text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: '2563EB', size: 20 }),
        ], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
        new Paragraph({ children: [new TextRun({ text: `문서 버전: ${d.documentMeta?.version || '1.0'}`, size: 22, color: '475569', font: 'Pretendard' })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
        new Paragraph({ children: [new TextRun({ text: `작성일: ${d.documentMeta?.createdAt || new Date().toISOString().slice(0, 10)}`, size: 22, color: '475569', font: 'Pretendard' })], alignment: AlignmentType.CENTER, spacing: { after: 80 } }),
        new Paragraph({ children: [new TextRun({ text: `작성 도구: ${d.documentMeta?.generatedBy || 'Wishket AI PRD Builder'}`, size: 22, color: '475569', font: 'Pretendard' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
        new Paragraph({ spacing: { before: 800 } }),
        // KPI summary on cover
        new Paragraph({ children: [
          new TextRun({ text: `총 기능 ${totalFeats}개  ·  예상 ${totalDur}~${Math.round(totalDur * 1.4)}주  ·  ${d.timeline?.length || 0}개 페이즈`, size: 22, color: '2563EB', font: 'Pretendard' }),
        ], alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
      ];

      // ── Body Section ──
      const body: (Paragraph | Table)[] = [];
      const h1 = (num: string, title: string) => new Paragraph({ children: [new TextRun({ text: `${num}. ${title}`, size: 28, bold: true, font: 'Pretendard', color: '0F172A' })], heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 } });
      const h2 = (title: string) => new Paragraph({ children: [new TextRun({ text: title, size: 24, bold: true, font: 'Pretendard', color: '1E3A5F' })], heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 } });
      const bodyText = (text: string) => new Paragraph({ children: [new TextRun({ text, size: 20, font: 'Pretendard', color: '475569' })], spacing: { after: 120 }, style: 'Normal' });
      const bullet = (text: string, sym = '•') => new Paragraph({ children: [new TextRun({ text: `${sym} ${text}`, size: 20, font: 'Pretendard', color: '475569' })], spacing: { after: 60 }, indent: { left: 360 } });
      const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

      // 1. 프로젝트 스코프
      body.push(h1('1', '프로젝트 스코프'));
      body.push(bodyText(d.executiveSummary));
      if ((d.projectGoals?.length ?? 0) > 0) {
        body.push(h2('프로젝트 목표 & 성공 지표'));
        body.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: [hCell('목표', 60), hCell('성공 지표', 40)] }),
          ...d.projectGoals.map(g => new TableRow({ children: [bCell(g.goal, 60), bCell(g.metric, 40)] })),
        ] }));
        body.push(new Paragraph({ spacing: { after: 200 } }));
      }

      // 2. 타겟 사용자
      body.push(pageBreak());
      body.push(h1('2', '타겟 사용자 & 페르소나'));
      body.push(bodyText(d.targetUsers));
      if ((d.userPersonas?.length ?? 0) > 0) {
        body.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: [hCell('이름', 15), hCell('역할', 25), hCell('니즈', 30), hCell('불편사항', 30)] }),
          ...d.userPersonas.map(p => new TableRow({ children: [bCell(p.name, 15), bCell(p.role, 25), bCell(p.needs, 30), bCell(p.painPoints, 30)] })),
        ] }));
        body.push(new Paragraph({ spacing: { after: 200 } }));
      }

      // 3. 프로젝트 범위
      body.push(pageBreak());
      body.push(h1('3', '프로젝트 범위'));
      body.push(h2('포함 범위 (In-Scope)'));
      d.scopeInclusions?.forEach(s => body.push(bullet(s, '✓')));
      body.push(h2('미포함 범위 (Out-of-Scope)'));
      d.scopeExclusions?.forEach(s => body.push(bullet(s, '✗')));
      body.push(new Paragraph({ spacing: { after: 200 } }));

      // 4. 정보 구조
      if ((d.informationArchitecture?.sitemap?.length ?? 0) > 0) {
        body.push(h1('4', '정보 구조 (IA)'));
        d.informationArchitecture.sitemap.forEach(node => {
          body.push(new Paragraph({ children: [new TextRun({ text: `■ ${node.label}`, size: 22, bold: true, font: 'Pretendard' })], spacing: { before: 120, after: 60 } }));
          node.children?.forEach(child => {
            body.push(new Paragraph({ children: [new TextRun({ text: `  ├─ ${child.label}`, size: 20, font: 'Pretendard', color: '2563EB' })], spacing: { after: 40 }, indent: { left: 360 } }));
            child.children?.forEach(leaf => {
              body.push(new Paragraph({ children: [new TextRun({ text: `      └─ ${leaf.label}`, size: 18, font: 'Pretendard', color: '475569' })], spacing: { after: 30 }, indent: { left: 720 } }));
            });
          });
        });
        body.push(new Paragraph({ spacing: { after: 200 } }));
      }

      // 5. 기능 명세
      body.push(pageBreak());
      body.push(h1('5', '기능 명세'));
      d.featureModules?.forEach(m => {
        body.push(h2(`${m.name} (${m.priority} · ${m.priorityLabel})`));
        m.features?.forEach(f => {
          body.push(new Paragraph({ children: [
            new TextRun({ text: `[${f.id}] `, size: 20, bold: true, color: '2563EB', font: 'Pretendard' }),
            new TextRun({ text: f.name, size: 22, bold: true, font: 'Pretendard' }),
          ], spacing: { before: 120, after: 60 } }));
          body.push(bodyText(f.description));
          if (f.subFeatures?.length) {
            body.push(new Paragraph({ children: [new TextRun({ text: '하위 기능:', size: 18, bold: true, color: '475569', font: 'Pretendard' })], spacing: { before: 60, after: 40 } }));
            f.subFeatures.forEach(sf => body.push(bullet(sf, '→')));
          }
          if (f.acceptanceCriteria?.length) {
            body.push(new Paragraph({ children: [new TextRun({ text: '수락 기준 (AC):', size: 18, bold: true, color: '475569', font: 'Pretendard' })], spacing: { before: 60, after: 40 } }));
            f.acceptanceCriteria.forEach(ac => body.push(bullet(ac, '✓')));
          }
          if (f.userFlow && f.userFlow !== '(사용자 흐름 미정의)') {
            body.push(new Paragraph({ children: [new TextRun({ text: '사용자 흐름:', size: 18, bold: true, color: '475569', font: 'Pretendard' })], spacing: { before: 60, after: 40 } }));
            body.push(new Paragraph({ children: [new TextRun({ text: f.userFlow, size: 18, font: 'Consolas', color: '475569' })], spacing: { after: 80 }, indent: { left: 360 } }));
          }
          if (f.businessRules?.length) {
            body.push(new Paragraph({ children: [new TextRun({ text: '비즈니스 규칙:', size: 18, bold: true, color: '475569', font: 'Pretendard' })], spacing: { before: 60, after: 40 } }));
            f.businessRules.forEach(br => body.push(bullet(br, '⚙')));
          }
          if (f.errorCases?.length) {
            body.push(new Paragraph({ children: [new TextRun({ text: '에러 케이스:', size: 18, bold: true, color: '475569', font: 'Pretendard' })], spacing: { before: 60, after: 40 } }));
            f.errorCases.forEach(ec => body.push(bullet(ec, '⚠')));
          }
          body.push(new Paragraph({ spacing: { after: 120 } }));
        });
      });

      // 6. 기술 스택
      if ((d.techStack?.length ?? 0) > 0) {
        body.push(pageBreak());
        body.push(h1('6', '기술 스택 권장안'));
        body.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: [hCell('분류', 20), hCell('기술', 25), hCell('선정 근거', 55)] }),
          ...d.techStack.map(t => new TableRow({ children: [
            bCell(typeof t === 'object' ? t.category : '-', 20),
            bCell(typeof t === 'object' ? t.tech : String(t), 25),
            bCell(typeof t === 'object' ? t.rationale : '', 55),
          ] })),
        ] }));
        body.push(new Paragraph({ spacing: { after: 200 } }));
      }

      // 7. NFR
      if ((d.nonFunctionalRequirements?.length ?? 0) > 0) {
        body.push(h1('7', '비기능 요구사항'));
        d.nonFunctionalRequirements.forEach(n => {
          body.push(h2(n.category));
          n.items?.forEach(item => body.push(bullet(item)));
        });
      }

      // 8. 일정 계획
      if ((d.timeline?.length ?? 0) > 0) {
        body.push(pageBreak());
        body.push(h1('8', '일정 계획'));
        body.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: [hCell('단계', 25), hCell('기간', 15), hCell('산출물', 60)] }),
          ...d.timeline.map(t => new TableRow({ children: [
            bCell(t.phase, 25), bCell(t.duration, 15), bCell(t.deliverables?.join(', ') || '', 60),
          ] })),
        ] }));
        body.push(new Paragraph({ spacing: { after: 200 } }));
      }

      // 9. 전제 조건 & 제약사항
      body.push(h1('9', '전제 조건 & 제약사항'));
      body.push(h2('전제 조건 (Assumptions)'));
      d.assumptions?.forEach(a => body.push(bullet(a)));
      body.push(h2('제약사항 (Constraints)'));
      d.constraints?.forEach(c => body.push(bullet(c)));

      // 10. 리스크 관리
      if ((d.risks?.length ?? 0) > 0) {
        body.push(pageBreak());
        body.push(h1('10', '리스크 관리'));
        body.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: [hCell('리스크', 35), hCell('영향도', 10), hCell('확률', 10), hCell('대응 전략', 45)] }),
          ...d.risks.map(r => new TableRow({ children: [
            bCell(r.risk, 35), bCell(r.impact, 10), bCell(r.probability || '-', 10), bCell(r.mitigation, 45),
          ] })),
        ] }));
        body.push(new Paragraph({ spacing: { after: 200 } }));
      }

      // 11. 전문가 인사이트
      if (d.expertInsight) {
        body.push(h1('11', 'AI 전문가 인사이트'));
        body.push(bodyText(d.expertInsight));
      }

      // 용어 정의
      if ((d.glossary?.length ?? 0) > 0) {
        body.push(h1('12', '용어 정의'));
        body.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: [hCell('용어', 25), hCell('정의', 75)] }),
          ...d.glossary.map(g => new TableRow({ children: [bCell(g.term, 25), bCell(g.definition, 75)] })),
        ] }));
      }

      // 승인 프로세스
      if ((d.approvalProcess?.length ?? 0) > 0) {
        body.push(pageBreak());
        body.push(h1('13', '승인 프로세스'));
        body.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: [hCell('단계', 25), hCell('승인자', 25), hCell('기준', 50)] }),
          ...d.approvalProcess!.map(ap => new TableRow({ children: [bCell(ap.stage, 25), bCell(ap.approver, 25), bCell(ap.criteria, 50)] })),
        ] }));
      }

      // QA 전략
      if ((d.qaStrategy?.length ?? 0) > 0) {
        body.push(h1('14', 'QA 전략'));
        body.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: [hCell('유형', 18), hCell('범위', 27), hCell('도구', 20), hCell('통과 기준', 35)] }),
          ...d.qaStrategy!.map(qa => new TableRow({ children: [bCell(qa.type, 18), bCell(qa.scope, 27), bCell(qa.tools, 20), bCell(qa.criteria, 35)] })),
        ] }));
      }

      // API 명세
      if ((d.apiEndpoints?.length ?? 0) > 0) {
        body.push(pageBreak());
        body.push(h1('15', 'API 명세'));
        body.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: [hCell('메소드', 10), hCell('엔드포인트', 25), hCell('설명', 40), hCell('기능', 25)] }),
          ...d.apiEndpoints!.map(ep => new TableRow({ children: [bCell(ep.method, 10), bCell(ep.path, 25), bCell(ep.description, 40), bCell(ep.feature, 25)] })),
        ] }));
      }

      // 데이터 모델
      if ((d.dataModel?.length ?? 0) > 0) {
        body.push(h1('16', '데이터 모델'));
        d.dataModel!.forEach(entity => {
          body.push(h2(entity.entity));
          body.push(new Paragraph({ children: [new TextRun({ text: '필드: ', bold: true, size: 20, font: 'Pretendard' }), new TextRun({ text: entity.fields.join(', '), size: 20, font: 'Consolas', color: '475569' })], spacing: { after: 60 } }));
          if (entity.relationships.length > 0) {
            body.push(new Paragraph({ children: [new TextRun({ text: '관계: ', bold: true, size: 20, font: 'Pretendard' }), new TextRun({ text: entity.relationships.join(', '), size: 20, font: 'Pretendard', color: '2563EB' })], spacing: { after: 80 } }));
          }
        });
      }

      // 푸터 면책 조항
      body.push(new Paragraph({ spacing: { before: 600 } }));
      body.push(new Paragraph({ children: [
        new TextRun({ text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', size: 16, color: 'D0D5DD' }),
      ], alignment: AlignmentType.CENTER }));
      body.push(new Paragraph({ children: [
        new TextRun({ text: '본 문서는 AI 기반으로 자동 생성되었으며, 실제 개발 착수 전 상세 검토가 필요합니다.', size: 18, color: '94A3B8', font: 'Pretendard' }),
      ], alignment: AlignmentType.CENTER, spacing: { after: 40 } }));
      body.push(new Paragraph({ children: [
        new TextRun({ text: 'Generated by Wishket AI PRD Builder', size: 18, color: '94A3B8', font: 'Pretendard' }),
      ], alignment: AlignmentType.CENTER }));

      const doc = new Document({
        styles: {
          default: {
            document: { run: { font: 'Pretendard', size: 20 } },
            heading1: { run: { font: 'Pretendard', size: 28, bold: true, color: '0F172A' }, paragraph: { spacing: { before: 360, after: 160 } } },
            heading2: { run: { font: 'Pretendard', size: 24, bold: true, color: '1E3A5F' }, paragraph: { spacing: { before: 200, after: 120 } } },
          },
        },
        sections: [
          // Cover Page
          {
            properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
            children: coverChildren,
          },
          // Body — with header, footer, page numbers
          {
            properties: {
              page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, pageNumbers: { start: 1 } },
            },
            headers: {
              default: new Header({
                children: [new Paragraph({ children: [
                  new TextRun({ text: `${d.projectName} — PRD`, size: 16, color: '94A3B8', font: 'Pretendard' }),
                ], alignment: AlignmentType.RIGHT })],
              }),
            },
            footers: {
              default: new Footer({
                children: [new Paragraph({
                  children: [
                    new TextRun({ text: 'Wishket AI PRD Builder  |  Page ', size: 16, color: '94A3B8', font: 'Pretendard' }),
                    new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8', font: 'Pretendard' }),
                    new TextRun({ text: ' / ', size: 16, color: '94A3B8', font: 'Pretendard' }),
                    new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '94A3B8', font: 'Pretendard' }),
                  ],
                  alignment: AlignmentType.CENTER,
                })],
              }),
            },
            children: body as Paragraph[],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const fileName = `${d.projectName.replace(/[^가-힣a-zA-Z0-9]/g, '_')}_PRD_${new Date().toISOString().slice(0, 10)}.docx`;
      saveAs(blob, fileName);
    } catch (err) {
      console.error('DOCX generation error:', err);
      alert('DOCX 생성 중 오류가 발생했습니다.');
    }
    setDocxGenerating(false);
  }, [prdData]);

  // Generate markdown for copy
  const generateMarkdown = useCallback((d: PRDResult): string => {
    let md = `# ${d.projectName} — PRD 기획서\n`;
    md += `> 문서 버전: ${d.documentMeta?.version || '1.0'} | 작성일: ${d.documentMeta?.createdAt || '-'} | ${d.documentMeta?.generatedBy || 'Wishket AI'}\n\n`;
    md += `## 1. 프로젝트 스코프\n${d.executiveSummary}\n\n`;
    if ((d.projectGoals?.length ?? 0) > 0) {
      md += `### 프로젝트 목표\n`;
      d.projectGoals?.forEach((g, i) => { md += `${i + 1}. **${g.goal}** — 성공 지표: ${g.metric}\n`; });
      md += '\n';
    }
    md += `## 2. 타겟 사용자 & 페르소나\n${d.targetUsers}\n\n`;
    if ((d.userPersonas?.length ?? 0) > 0) {
      md += `### 사용자 페르소나\n`;
      d.userPersonas.forEach(p => { md += `- **${p.name}** (${p.role}): 니즈 — ${p.needs} / 문제점 — ${p.painPoints}\n`; });
      md += '\n';
    }
    md += `## 3. 프로젝트 범위\n### 포함 범위 (In-Scope)\n`;
    d.scopeInclusions?.forEach(s => { md += `- ✅ ${s}\n`; });
    md += `### 미포함 범위 (Out-of-Scope)\n`;
    d.scopeExclusions?.forEach(s => { md += `- ❌ ${s}\n`; });
    md += '\n';
    // 4. IA (if exists)
    if ((d.informationArchitecture?.sitemap?.length ?? 0) > 0) {
      md += `## 4. 정보 구조 (IA)\n`;
      d.informationArchitecture.sitemap.forEach(n => {
        md += `- **${n.label}**\n`;
        n.children?.forEach(c => { md += `  - ${c.label}\n`; c.children?.forEach(l => { md += `    - ${l.label}\n`; }); });
      });
      md += '\n';
    }
    md += `## 5. 기능 명세\n`;
    d.featureModules?.forEach(m => {
      md += `### ${m.name} (${m.priority} · ${m.priorityLabel})\n`;
      m.features?.forEach(f => {
        md += `#### [${f.id}] ${f.name}\n${f.description}\n`;
        if (f.subFeatures?.length) { md += `**하위 기능:** ${f.subFeatures.join(', ')}\n`; }
        if (f.acceptanceCriteria?.length) { md += `**수락 기준:** ${f.acceptanceCriteria.join(' / ')}\n`; }
        if (f.userFlow && f.userFlow !== '(사용자 흐름 미정의)') { md += `**사용자 흐름:**\n\`\`\`\n${f.userFlow}\n\`\`\`\n`; }
        md += '\n';
      });
    });
    md += `## 6. 기술 스택 권장안\n`;
    md += `| 분류 | 기술 | 선정 근거 |\n|------|------|----------|\n`;
    d.techStack?.forEach(t => { md += `| ${t.category} | ${t.tech} | ${t.rationale} |\n`; });
    md += `\n## 7. 비기능 요구사항\n`;
    d.nonFunctionalRequirements?.forEach(n => {
      md += `### ${n.category}\n`;
      n.items?.forEach(item => { md += `- ${item}\n`; });
    });
    md += `\n## 8. 일정 계획\n`;
    md += `| 단계 | 기간 | 산출물 |\n|------|------|--------|\n`;
    d.timeline?.forEach(t => { md += `| ${t.phase} | ${t.duration} | ${t.deliverables.join(', ')} |\n`; });
    md += `\n## 9. 전제 조건 & 제약사항\n`;
    md += `### 전제 조건\n`;
    d.assumptions?.forEach(a => { md += `- ${a}\n`; });
    md += `### 제약사항\n`;
    d.constraints?.forEach(c => { md += `- ${c}\n`; });
    md += `\n## 10. 리스크 관리\n`;
    md += `| 리스크 | 영향도 | 대응 전략 |\n|--------|--------|----------|\n`;
    d.risks?.forEach(r => { md += `| ${r.risk} | ${r.impact} | ${r.mitigation} |\n`; });
    if (d.expertInsight) { md += `\n## 11. AI 전문가 인사이트\n${d.expertInsight}\n`; }
    if ((d.glossary?.length ?? 0) > 0) {
      md += `\n## 12. 용어 정의\n`;
      d.glossary?.forEach(g => { md += `- **${g.term}**: ${g.definition}\n`; });
    }
    md += `\n---\nGenerated by Wishket AI PRD Builder · © ${new Date().getFullYear()} Wishket\n`;
    return md;
  }, []);

  if (loading) {
    const currentPhase = loadingPhases[loadingPhase] || loadingPhases[0];
    const progressPct = ((loadingPhase + 1) / loadingPhases.length) * 100;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: '0 24px' }}>
          {/* 메인 아이콘 */}
          <div style={{
            fontSize: 48, marginBottom: 20,
            animation: 'phaseIn 0.5s ease-out',
          }} key={loadingPhase}>
            {currentPhase.icon}
          </div>

          {/* 현재 단계 텍스트 */}
          <div style={{
            fontSize: 18, fontWeight: 700, color: C.textPrimary, marginBottom: 6,
            animation: 'phaseIn 0.5s ease-out',
          }} key={`label-${loadingPhase}`}>
            {currentPhase.label}
          </div>
          <div style={{
            fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginBottom: 32,
            animation: 'phaseIn 0.5s ease-out',
          }} key={`sub-${loadingPhase}`}>
            {currentPhase.sub}
          </div>

          {/* 단계별 스텝 인디케이터 */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 28 }}>
            {loadingPhases.map((phase, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: i <= loadingPhase ? 1 : 0.35,
                transition: 'opacity 0.4s ease',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                  background: i < loadingPhase ? C.blue : i === loadingPhase ? C.gradient : C.borderLight,
                  color: i <= loadingPhase ? '#fff' : C.textTertiary,
                  fontWeight: 700,
                  transition: 'all 0.4s ease',
                }}>
                  {i < loadingPhase ? '✓' : i + 1}
                </div>
              </div>
            ))}
          </div>

          {/* 프로그레스 바 */}
          <div style={{
            height: 6, background: C.borderLight, borderRadius: 3, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: C.gradient, borderRadius: 3,
              width: `${progressPct}%`,
              transition: 'width 1s ease-in-out',
            }} />
          </div>

          <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 16 }}>
            {loadingPhase + 1} / {loadingPhases.length} 단계 · 약 15~30초 소요
          </div>

          <style>{`
            @keyframes phaseIn {
              from { opacity: 0; transform: translateY(8px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!prdData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, padding: 20 }}>
        <div style={{ maxWidth: 500, textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 12 }}>PRD 기획서 생성 실패</h2>
          <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, marginBottom: 24 }}>
            기획서를 생성하는 중에 오류가 발생했습니다.
          </p>
          <button onClick={() => window.location.reload()} style={{
            background: C.blue, color: '#fff', border: 'none', borderRadius: 8,
            padding: '12px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const tocSections = [
    { num: '1', title: '프로젝트 스코프', id: 'sec-summary' },
    { num: '2', title: '타겟 사용자 & 페르소나', id: 'sec-users' },
    { num: '3', title: '프로젝트 범위', id: 'sec-scope' },
    { num: '4', title: '정보 구조 (IA)', id: 'sec-ia' },
    { num: '5', title: '기능 명세', id: 'sec-features' },
    { num: '6', title: '기술 스택', id: 'sec-tech' },
    { num: '7', title: '비기능 요구사항', id: 'sec-nfr' },
    { num: '8', title: '일정 계획', id: 'sec-timeline' },
    { num: '9', title: '전제 조건 & 제약사항', id: 'sec-assumptions' },
    { num: '10', title: '리스크 관리', id: 'sec-risks' },
    ...(prdData.expertInsight ? [{ num: '11', title: '전문가 인사이트', id: 'sec-expert' }] : []),
    ...(() => {
      let n = prdData.expertInsight ? 12 : 11;
      const extra: { num: string; title: string; id: string }[] = [];
      extra.push({ num: String(n++), title: '용어 정의', id: 'sec-glossary' });
      if ((prdData.approvalProcess?.length ?? 0) > 0) extra.push({ num: String(n++), title: '승인 프로세스', id: 'sec-approval' });
      if ((prdData.qaStrategy?.length ?? 0) > 0) extra.push({ num: String(n++), title: 'QA 전략', id: 'sec-qa' });
      if ((prdData.apiEndpoints?.length ?? 0) > 0) extra.push({ num: String(n++), title: 'API 명세', id: 'sec-api' });
      if ((prdData.dataModel?.length ?? 0) > 0) extra.push({ num: String(n++), title: '데이터 모델', id: 'sec-datamodel' });
      if ((prdData.competitorAnalysis?.length ?? 0) > 0) extra.push({ num: String(n++), title: '경쟁 서비스 분석', id: 'sec-competitor' });
      return extra;
    })(),
  ];

  const totalFeatures = prdData.featureModules?.reduce((sum, m) => sum + (m.features?.length || 0), 0) || 0;

  // F8: 프로젝트 컨텍스트 (AI 재생성용)
  const projectCtx = {
    projectName: prdData.projectName,
    projectType: rfpData?.overview?.slice(0, 200) || '',
    coreFeatures: prdData.featureModules?.map(m => m.name).join(', ') || '',
  };

  return (
    <ReadOnlyContext.Provider value={!!readOnly}>
    <div style={{ minHeight: '100vh', background: C.bg }} ref={contentRef} role="main" lang="ko">
      {/* Skip Navigation (Accessibility) */}
      <a href="#sec-summary" className="prd-skip-nav">본문으로 건너뛰기</a>
      {/* #9: Print styles — 최적화 + #15: Mobile responsive */}
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { from { background-position: -200% center; } to { background-position: 200% center; } }
        .prd-card { transition: all 0.25s cubic-bezier(0.22,1,0.36,1); }
        .prd-card:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(37,99,235,0.08); }
        .prd-section-fade { animation: fadeInUp 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .prd-section-fade:nth-child(2) { animation-delay: 0.08s; }
        .prd-section-fade:nth-child(3) { animation-delay: 0.16s; }
        .prd-section-fade:nth-child(4) { animation-delay: 0.24s; }
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print, .prd-skip-nav, .floating-toc-wrap { display: none !important; }
          .print-break { page-break-before: always; }
          * { box-shadow: none !important; text-shadow: none !important; animation: none !important; }
          .prd-card { border: 1px solid #ddd !important; background: white !important; }
          .prd-container { max-width: 100% !important; padding: 0 !important; }
          .prd-module-card { break-inside: avoid; }
          .prd-editable { cursor: default !important; }
          .edit-hint { display: none !important; }
          [style*="gradient"] { background: #1E3A5F !important; }
          .kpi-grid { grid-template-columns: repeat(4, 1fr) !important; }
          .prd-two-col { grid-template-columns: 1fr 1fr !important; }
          .prd-persona-grid { grid-template-columns: 1fr 1fr !important; }
          a[href]:after { content: none !important; }
          h1, h2, h3, h4 { page-break-after: avoid; }
          table, pre { page-break-inside: avoid; }
        }
        @media (max-width: 768px) {
          .prd-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .floating-toc-wrap { display: none !important; }
          .prd-container { padding: 20px 14px 40px !important; }
          .prd-two-col { grid-template-columns: 1fr !important; }
          .prd-persona-grid { grid-template-columns: 1fr !important; }
          h1 { font-size: 28px !important; }
        }
        @media (max-width: 480px) {
          .prd-kpi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* Sticky Top Bar — Project Title + CTA */}
      <StickyTopBar projectName={prdData.projectName} shareUrl={shareUrl} onCTAClick={() => {
        const ctaEl = document.querySelector('.wishket-cta-section');
        if (ctaEl) ctaEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }} />
      {/* A-1: Floating TOC */}
      <div className="floating-toc-wrap">
        <FloatingTOC sections={tocSections} activeSection={activeSection} />
      </div>
      {/* B-8: Sticky Action Bar — readOnly에서는 숨김 */}
      {!readOnly && (
        <StickyActionBar
          onShare={handleShare} onCopy={() => { copyToClipboard(generateMarkdown(prdData)); setCopied(true); setTimeout(() => setCopied(false), 2500); }}
          onPDF={handlePDF} onDOCX={handleDOCX}
          sharing={sharing} pdfGen={pdfGenerating} docxGen={docxGenerating} copied={copied}
        />
      )}
      {/* ━━ Header — Dark Hero with glassmorphism ━━ */}
      <div style={{
        background: C.gradientDark, color: '#fff', padding: '56px 20px 48px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative radial circles */}
        <div style={{
          position: 'absolute', top: -120, right: -80, width: 500, height: 500,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -60, width: 400, height: 400,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.08)', padding: '6px 16px', borderRadius: 24,
            fontSize: 11, fontWeight: 600, letterSpacing: 0.5, marginBottom: 24,
            backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)',
            color: C.textOnDarkSub,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            PRD · 제품 요구사항 정의서
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 900, margin: '0 0 14px 0', lineHeight: 1.15, letterSpacing: '-1px' }}>
            {prdData.projectName}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 13, color: C.textOnDarkSub, marginTop: 18, fontWeight: 500 }}>
            <span>📅 {prdData.documentMeta?.createdAt || '-'}</span>
            <span>📋 v{prdData.documentMeta?.version || '1.0'}</span>
            <span>⚙️ 기능 {totalFeatures}개</span>
            <span>🏢 {prdData.documentMeta?.generatedBy || 'Wishket AI'}</span>
          </div>
        </div>
      </div>

      {/* ━━ Body ━━ */}
      <div className="prd-container" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 60px' }}>
        {/* B-1: KPI Summary Cards */}
        <KPISummary prdData={prdData} />

        {/* #5: 변경 이력 (Revision History) */}
        <Card style={{ marginBottom: 32, background: C.borderLight, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textTertiary, margin: 0, letterSpacing: 0.3, textTransform: 'uppercase' as const }}>
              📋 문서 변경 이력
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#1e40af' }}>
                  {['버전', '일자', '작성자', '변경 사항'].map((h, idx) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', fontSize: 11, borderRadius: idx === 0 ? '6px 0 0 0' : idx === 3 ? '0 6px 0 0' : undefined }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: C.blue }}>v{prdData.documentMeta?.version || '1.0'}</td>
                  <td style={{ padding: '8px 12px', color: C.textSecondary }}>{prdData.documentMeta?.createdAt || new Date().toISOString().slice(0, 10)}</td>
                  <td style={{ padding: '8px 12px', color: C.textSecondary }}>{prdData.documentMeta?.generatedBy || 'Wishket AI'}</td>
                  <td style={{ padding: '8px 12px', color: C.textSecondary }}>초안 자동 생성 (AI PRD Builder)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: C.textTertiary, margin: '8px 0 0 0' }}>
            ※ 편집 시 변경 사항을 기록하여 문서 이력을 관리하세요.
          </p>
        </Card>

        {/* 1. 프로젝트 스코프 */}
        <div id="sec-summary" style={{ marginTop: 8 }}>
          <SectionHeaderAnchored number="1" title="프로젝트 스코프" subtitle="프로젝트 핵심 정의" id="sec-summary" />
          <Card style={{ borderLeft: `4px solid ${C.blue}`, background: 'linear-gradient(135deg, rgba(37,99,235,0.03) 0%, rgba(255,255,255,1) 60%)', padding: '28px 32px' }}>
            <FormattedText
              value={prdData.executiveSummary}
              onChange={(v) => setPrdData({ ...prdData, executiveSummary: v })}
              style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.9, margin: 0 }}
              sectionKey="executiveSummary" sectionTitle="프로젝트 스코프" projectContext={projectCtx}
            />
          </Card>
          {(prdData.projectGoals?.length ?? 0) > 0 && (
            <Card style={{ marginTop: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: '0 0 16px 0', letterSpacing: -0.1 }}>📊 프로젝트 목표 & 성공 지표</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {prdData.projectGoals.map((g, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 12, padding: '12px 14px', background: C.blueBg, borderRadius: 8,
                    alignItems: 'flex-start',
                  }}>
                    <span style={{
                      background: C.blue, color: '#fff', width: 22, height: 22, borderRadius: 6,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
                    }}>{i + 1}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, marginBottom: 2 }}>{g.goal}</div>
                      <div style={{ fontSize: 13, color: C.textSecondary }}>📏 {g.metric}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <SectionDivider />

        {/* 4. Target Users & Personas */}
        <div id="sec-users">
          <SectionHeaderAnchored number="2" title="타겟 사용자 & 페르소나" subtitle="주요 사용자 유형 및 니즈 분석" id="sec-users" />
          <Card>
            <FormattedText
              value={prdData.targetUsers}
              onChange={(v) => setPrdData({ ...prdData, targetUsers: v })}
              style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.8, margin: '0 0 16px 0' }}
              sectionKey="targetUsers" sectionTitle="타겟 사용자" projectContext={projectCtx}
            />
            {(prdData.userPersonas?.length ?? 0) > 0 && (
              <div className="prd-persona-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                {prdData.userPersonas.map((p, i) => {
                  const personaColors = [
                    { bg: C.blueBg, color: C.blue },
                    { bg: C.purpleBg, color: C.purple },
                    { bg: C.greenBg, color: C.green },
                    { bg: C.yellowBg, color: C.yellow },
                  ];
                  const pc = personaColors[i % personaColors.length];
                  return (
                  <div key={i} style={{
                    border: `1px solid ${C.border}`, borderRadius: 16, padding: '22px',
                    background: C.white, borderTop: `3px solid ${pc.color}`,
                    boxShadow: C.shadowCard, transition: C.ease,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = C.shadowCardHover; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = C.shadowCard; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${pc.color}, ${pc.color}CC)`, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 700, boxShadow: `0 4px 12px ${pc.color}33`,
                      }}>{p.name[0]}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: C.textTertiary }}>{p.role}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 6 }}>
                      <strong>니즈:</strong> {p.needs}
                    </div>
                    <div style={{ fontSize: 13, color: C.textSecondary }}>
                      <strong>불편사항:</strong> {p.painPoints}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <SectionDivider />

        {/* 3. 프로젝트 범위 — In-Scope + Out-of-Scope */}
        <div id="sec-scope">
          <SectionHeaderAnchored number="3" title="프로젝트 범위" subtitle="구현 범위 및 제외 항목 정의" id="sec-scope" />
          <div className="prd-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
            <Card style={{ borderLeft: `4px solid ${C.green}`, borderRadius: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.green, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 8, background: C.greenBg, fontSize: 13 }}>✅</span>
                포함 범위 (In-Scope)
              </h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {prdData.scopeInclusions?.map((s, i) => (
                  <li key={i} style={{ fontSize: 13, color: C.textSecondary, marginBottom: 8, paddingLeft: 20, position: 'relative', lineHeight: 1.6 }}>
                    <span style={{ position: 'absolute', left: 0, color: C.green }}>✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
            <Card style={{ borderLeft: `4px solid ${C.textTertiary}`, borderRadius: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textTertiary, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 8, background: C.borderLight, fontSize: 13 }}>🚫</span>
                미포함 범위 (Out-of-Scope)
              </h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {(prdData.scopeExclusions?.length ?? 0) > 0 ? prdData.scopeExclusions!.map((s, i) => (
                  <li key={i} style={{ fontSize: 13, color: C.textTertiary, marginBottom: 8, paddingLeft: 20, position: 'relative', lineHeight: 1.6 }}>
                    <span style={{ position: 'absolute', left: 0, color: C.textTertiary }}>✗</span>
                    {s}
                  </li>
                )) : (
                  <li style={{ fontSize: 13, color: C.textTertiary, lineHeight: 1.6 }}>미포함 항목이 정의되지 않았습니다.</li>
                )}
              </ul>
            </Card>
          </div>
        </div>

        <SectionDivider />

        {/* 6. Information Architecture */}
        {(prdData.informationArchitecture?.sitemap?.length ?? 0) > 0 && (
          <div id="sec-ia">
            <SectionHeaderAnchored number="4" title="정보 구조 (IA)" subtitle="서비스 화면 구조 및 사이트맵" id="sec-ia" />
            <Card>
              <div style={{ padding: '8px 0' }}>
                {/* #6: IA Tree Visualization — Pro tree diagram */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {prdData.informationArchitecture.sitemap.map((node, i) => {
                    const isLast = i === prdData.informationArchitecture.sitemap.length - 1;
                    return (
                      <div key={i} style={{ position: 'relative' }}>
                        {/* Root node */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px',
                          background: C.gradient, borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 15,
                          boxShadow: '0 2px 8px rgba(37,99,235,0.2)', position: 'relative', zIndex: 1,
                        }}>
                          <span style={{ fontSize: 16 }}>🏠</span> {node.label}
                          {(node.children?.length ?? 0) > 0 && (
                            <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 'auto' }}>
                              {node.children!.length}개 하위
                            </span>
                          )}
                        </div>
                        {/* Children — tree lines */}
                        {node.children && node.children.length > 0 && (
                          <div style={{ paddingLeft: 20, position: 'relative' }}>
                            {/* Vertical connector line */}
                            <div style={{
                              position: 'absolute', left: 30, top: 0,
                              width: 2, height: 'calc(100% - 20px)',
                              background: `linear-gradient(180deg, ${C.blue}40, ${C.border})`,
                            }} />
                            {node.children.map((child, j) => {
                              const isChildLast = j === node.children!.length - 1;
                              return (
                                <div key={j} style={{ position: 'relative', paddingLeft: 30, marginTop: j === 0 ? 12 : 6 }}>
                                  {/* Horizontal connector */}
                                  <div style={{
                                    position: 'absolute', left: 10, top: 16,
                                    width: 20, height: 2, background: isChildLast ? C.border : `${C.blue}40`,
                                  }} />
                                  {/* Branch dot */}
                                  <div style={{
                                    position: 'absolute', left: 6, top: 12,
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: C.white, border: `2px solid ${C.blue}`,
                                  }} />
                                  {/* Child node */}
                                  <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                                    background: C.blueBg, borderRadius: 8, fontWeight: 600, fontSize: 14, color: C.blue,
                                    border: `1px solid rgba(37,99,235,0.1)`,
                                  }}>
                                    📄 {child.label}
                                    {(child.children?.length ?? 0) > 0 && (
                                      <span style={{ fontSize: 10, color: C.textTertiary, fontWeight: 400 }}>
                                        +{child.children!.length}
                                      </span>
                                    )}
                                  </div>
                                  {/* Leaf nodes */}
                                  {child.children && child.children.length > 0 && (
                                    <div style={{ paddingLeft: 24, position: 'relative', marginTop: 4 }}>
                                      <div style={{
                                        position: 'absolute', left: 8, top: 0,
                                        width: 1, height: 'calc(100% - 12px)',
                                        borderLeft: `1px dashed ${C.border}`,
                                      }} />
                                      {child.children.map((leaf, k) => (
                                        <div key={k} style={{
                                          position: 'relative', paddingLeft: 20, marginBottom: 2,
                                          display: 'flex', alignItems: 'center', gap: 6,
                                        }}>
                                          <div style={{
                                            position: 'absolute', left: 8, top: 10,
                                            width: 12, height: 1, borderTop: `1px dashed ${C.border}`,
                                          }} />
                                          <span style={{
                                            display: 'inline-block', padding: '4px 12px', fontSize: 12,
                                            color: C.textSecondary, background: C.borderLight,
                                            borderRadius: 6, whiteSpace: 'nowrap',
                                          }}>
                                            {leaf.label}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {!isLast && <div style={{ height: 16 }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>
        )}

        <SectionDivider />

        {/* 7. Feature Specs */}
        <div id="sec-features">
          <SectionHeaderAnchored number="5" title="기능 명세" subtitle={`총 ${totalFeatures}개 기능 · 우선순위별 분류`} id="sec-features" />
          {/* B-2: Priority Filter Tabs + A-2: Expand/Collapse All */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div role="tablist" aria-label="우선순위 필터" style={{ display: 'flex', gap: 4, background: C.borderLight, borderRadius: 8, padding: 3 }}>
              {([['all', '전체'], ['P0', 'P0 핵심'], ['P1', 'P1 중요'], ['P2', 'P2 선택']] as const).map(([key, label]) => (
                <button key={key} role="tab" aria-selected={priorityFilter === key} onClick={() => setPriorityFilter(key as any)} style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600,
                  background: priorityFilter === key ? C.white : 'transparent',
                  color: priorityFilter === key ? C.blue : C.textTertiary,
                  boxShadow: priorityFilter === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>{label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setExpandAll(true)} style={{
                padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.white,
                fontSize: 11, color: C.textTertiary, cursor: 'pointer', fontWeight: 500,
              }}>📂 전체 펼치기</button>
              <button onClick={() => setExpandAll(false)} style={{
                padding: '5px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.white,
                fontSize: 11, color: C.textTertiary, cursor: 'pointer', fontWeight: 500,
              }}>📁 전체 접기</button>
            </div>
          </div>
          {prdData.featureModules?.filter(m => priorityFilter === 'all' || m.priority === priorityFilter).map((module, idx) => (
            <ModuleCard key={idx} module={module} forceExpand={expandAll} />
          ))}
        </div>

        {/* F10: 기능 의존성 시각화 */}
        {prdData.featureModules?.length > 1 && (
          <Card style={{ marginTop: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: '0 0 12px 0' }}>
              🔗 기능 모듈 의존성 매트릭스
            </h3>
            <p style={{ fontSize: 12, color: C.textTertiary, margin: '0 0 14px 0' }}>
              모듈 간 연관도를 나타냅니다. 진한 셀은 높은 의존성을 의미합니다.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#fff', background: '#1e40af', minWidth: 100, borderRadius: '8px 0 0 0' }}></th>
                    {prdData.featureModules.map((m, i) => (
                      <th key={i} style={{
                        padding: '8px 6px', textAlign: 'center', fontWeight: 600, color: '#fff',
                        background: '#1e40af', fontSize: 10, maxWidth: 80,
                        borderRadius: i === prdData.featureModules.length - 1 ? '0 8px 0 0' : undefined,
                        writingMode: prdData.featureModules.length > 4 ? 'vertical-lr' as React.CSSProperties['writingMode'] : undefined,
                        transform: prdData.featureModules.length > 4 ? 'rotate(180deg)' : undefined,
                      }}>{m.name.slice(0, 12)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prdData.featureModules.map((rowMod, ri) => (
                    <tr key={ri}>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: C.textPrimary, borderRight: `1px solid ${C.borderLight}`, whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700, marginRight: 4,
                          background: rowMod.priority === 'P0' ? C.redBg : rowMod.priority === 'P1' ? C.blueBg : C.borderLight,
                          color: rowMod.priority === 'P0' ? C.red : rowMod.priority === 'P1' ? C.blue : C.textTertiary,
                        }}>{rowMod.priority}</span>
                        {rowMod.name.slice(0, 14)}
                      </td>
                      {prdData.featureModules.map((colMod, ci) => {
                        if (ri === ci) {
                          return <td key={ci} style={{ padding: 4, textAlign: 'center', background: '#F1F5F9' }}>
                            <span style={{ fontSize: 10, color: C.textTertiary }}>—</span>
                          </td>;
                        }
                        // #8: AI 기반 의존성 스코어링 — dependencies 필드 우선, 없으면 키워드 폴백
                        const allRowFeatNames = rowMod.features.map((f: any) => f.name);
                        const allColFeatNames = colMod.features.map((f: any) => f.name);
                        // AI dependencies 기반 점수
                        const aiDeps = rowMod.features.reduce((s: number, rf: any) => {
                          return s + (rf.dependencies || []).filter((dep: string) =>
                            allColFeatNames.some((cn: string) => cn.includes(dep) || dep.includes(cn))
                          ).length;
                        }, 0) + colMod.features.reduce((s: number, cf: any) => {
                          return s + (cf.dependencies || []).filter((dep: string) =>
                            allRowFeatNames.some((rn: string) => rn.includes(dep) || dep.includes(rn))
                          ).length;
                        }, 0);
                        // Keyword 폴백
                        const kwScore = rowMod.features.filter((rf: any) =>
                          colMod.features.some((cf: any) =>
                            rf.subFeatures?.some((sf: string) => cf.name.includes(sf.split(' ')[0])) ||
                            cf.subFeatures?.some((sf: string) => rf.name.includes(sf.split(' ')[0]))
                          )
                        ).length;
                        const score = Math.min(aiDeps > 0 ? aiDeps + 1 : kwScore + (rowMod.priority === colMod.priority ? 1 : 0), 3);
                        const colors = ['transparent', 'rgba(37,99,235,0.08)', 'rgba(37,99,235,0.18)', 'rgba(37,99,235,0.35)'];
                        return (
                          <td key={ci} style={{
                            padding: 4, textAlign: 'center',
                            background: colors[score],
                            border: `1px solid ${C.borderLight}`,
                          }} title={aiDeps > 0 ? `AI 분석: ${aiDeps}건 의존` : score > 0 ? '키워드 연관' : ''}>
                            {score > 0 && <span style={{ fontSize: 10, color: score >= 2 ? C.blue : C.textTertiary }}>
                              {aiDeps > 0 ? '⬤' : '●'}{'●'.repeat(Math.max(0, score - 1))}
                            </span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <SectionDivider />

        {/* 7. Tech Stack */}
        <div id="sec-tech">
          <SectionHeaderAnchored number="6" title="기술 스택 권장안" subtitle="프로젝트 특성에 맞는 기술 구성" id="sec-tech" />
          {/* B-5: Tech Stack Architecture Visualization */}
          {(prdData.techStack?.length ?? 0) > 0 && (
            <Card style={{ marginBottom: 14, padding: '24px 28px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textTertiary, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>아키텍처 레이어</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(() => {
                  const layerOrder = ['프론트엔드', '백엔드', '데이터베이스', '인프라', '인증/보안', '모니터링', '기타'];
                  const layerColors: Record<string, string> = { '프론트엔드': C.blue, '백엔드': C.green, '데이터베이스': C.purple, '인프라': C.yellow, '인증/보안': C.red, '모니터링': C.blueSoft, '기타': C.textTertiary };
                  const grouped: Record<string, typeof prdData.techStack> = {};
                  prdData.techStack?.forEach(t => {
                    const cat = typeof t === 'object' ? t.category : '기타';
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat]!.push(t);
                  });
                  const sortedKeys = Object.keys(grouped).sort((a, b) => {
                    const ai = layerOrder.findIndex(l => a.includes(l));
                    const bi = layerOrder.findIndex(l => b.includes(l));
                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                  });
                  return sortedKeys.map((cat, i) => {
                    const color = Object.entries(layerColors).find(([k]) => cat.includes(k))?.[1] || C.textTertiary;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
                        <div style={{
                          width: 110, flexShrink: 0, background: `${color}12`, borderRadius: '8px 0 0 8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 8px',
                          borderLeft: `3px solid ${color}`,
                        }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color, textAlign: 'center' }}>{cat}</span>
                        </div>
                        <div style={{
                          flex: 1, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
                          padding: '8px 12px', background: C.borderLight, borderRadius: '0 8px 8px 0',
                        }}>
                          {grouped[cat]!.map((t, j) => (
                            <span key={j} style={{
                              padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                              background: C.white, border: `1px solid ${C.border}`, color: C.textPrimary,
                            }}>{typeof t === 'object' ? t.tech : String(t)}</span>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              {/* Connection arrows hint */}
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 10, color: C.textTertiary }}>▲ 사용자 접점 ─── ▼ 인프라 레이어</span>
              </div>
            </Card>
          )}
          <Card>
            <div className="prd-table-responsive" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#1e40af' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#fff', fontSize: 12, borderBottom: 'none', borderRadius: '8px 0 0 0' }}>분류</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#fff', fontSize: 12, borderBottom: 'none' }}>기술</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#fff', fontSize: 12, borderBottom: 'none', borderRadius: '0 8px 0 0' }}>선정 근거</th>
                  </tr>
                </thead>
                <tbody>
                  {prdData.techStack?.map((t, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}`, background: i % 2 === 0 ? C.white : C.surface }}>
                      <td style={{ padding: '10px 14px', color: C.textTertiary, fontSize: 13 }}>{typeof t === 'object' ? t.category : '-'}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: C.textPrimary }}>
                        <span style={{ background: C.blueBg, padding: '3px 10px', borderRadius: 6 }}>
                          {typeof t === 'object' ? t.tech : t}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: C.textSecondary, fontSize: 13 }}>{typeof t === 'object' ? t.rationale : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <SectionDivider />

        {/* 8. NFR */}
        <div id="sec-nfr">
          <SectionHeaderAnchored number="7" title="비기능 요구사항 (NFR)" subtitle="성능, 보안, 접근성, 규정준수" id="sec-nfr" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {prdData.nonFunctionalRequirements?.map((nfr, idx) => {
              const nfrThemes: Record<string, { icon: string; color: string; bg: string }> = {
                '보안': { icon: '🔒', color: C.red, bg: C.redBg },
                '성능': { icon: '⚡', color: C.yellow, bg: C.yellowBg },
                '접근성': { icon: '♿', color: C.purple, bg: C.purpleBg },
                '규정': { icon: '📜', color: C.green, bg: C.greenBg },
              };
              const theme = Object.entries(nfrThemes).find(([k]) => nfr.category.includes(k))?.[1] || { icon: '📋', color: C.blue, bg: C.blueBg };
              return (
                <Card key={idx} style={{ borderTop: `3px solid ${theme.color}` }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: theme.bg, fontSize: 14 }}>{theme.icon}</span>
                    {nfr.category}
                  </h3>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {nfr.items?.map((item, i) => (
                      <li key={i} style={{ fontSize: 13, color: C.textSecondary, marginBottom: 8, paddingLeft: 14, position: 'relative', lineHeight: 1.5 }}>
                        <span style={{ position: 'absolute', left: 0, color: C.textTertiary }}>•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </div>

        <SectionDivider />

        {/* 9. Timeline */}
        <div id="sec-timeline">
          <SectionHeaderAnchored number="8" title="일정 계획" subtitle="단계별 일정 및 산출물" id="sec-timeline" />
          {/* B-3: Gantt Chart */}
          <GanttChart timeline={prdData.timeline} />
          <Card>
            <div style={{ position: 'relative' }}>
              {prdData.timeline?.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, marginBottom: i < (prdData.timeline?.length || 0) - 1 ? 24 : 0, position: 'relative' }}>
                  {/* Timeline line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: i === 0 ? C.blue : i === 1 ? C.green : C.yellow,
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0, zIndex: 1,
                    }}>{i + 1}</div>
                    {i < (prdData.timeline?.length || 0) - 1 && (
                      <div style={{ width: 2, flex: 1, background: C.borderLight, marginTop: 4 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{t.phase}</span>
                      <span style={{
                        background: C.blueBg, color: C.blue, padding: '2px 8px',
                        borderRadius: 4, fontSize: 11, fontWeight: 600,
                      }}>{t.duration}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {t.deliverables?.map((d, j) => (
                        <span key={j} style={{
                          fontSize: 11, color: C.textSecondary, background: C.borderLight,
                          padding: '3px 10px', borderRadius: 20, border: `1px solid ${C.border}`,
                        }}>{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <SectionDivider />

        {/* 10. Assumptions & Constraints */}
        <div id="sec-assumptions">
          <SectionHeaderAnchored number="9" title="전제 조건 & 제약사항" id="sec-assumptions" />
          <div className="prd-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
            <Card>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: '0 0 14px 0' }}>📌 전제 조건 (Assumptions)</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {prdData.assumptions?.map((a, i) => (
                  <li key={i} style={{ fontSize: 13, color: C.textSecondary, marginBottom: 8, paddingLeft: 16, position: 'relative', lineHeight: 1.5 }}>
                    <span style={{ position: 'absolute', left: 0 }}>•</span>{a}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: '0 0 14px 0' }}>🚧 제약사항 (Constraints)</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {prdData.constraints?.map((c, i) => (
                  <li key={i} style={{ fontSize: 13, color: C.textSecondary, marginBottom: 8, paddingLeft: 16, position: 'relative', lineHeight: 1.5 }}>
                    <span style={{ position: 'absolute', left: 0 }}>•</span>{c}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        <SectionDivider />

        {/* 11. Risk Register */}
        <div id="sec-risks">
          <SectionHeaderAnchored number="10" title="리스크 관리" subtitle="예상 리스크 및 대응 전략" id="sec-risks" />
          {/* 리스크 테이블 */}
          <Card>
            <div className="prd-table-responsive" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#1e40af' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#fff', fontSize: 12, borderBottom: 'none', borderRadius: '8px 0 0 0' }}>리스크</th>
                    <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700, color: '#fff', fontSize: 12, borderBottom: 'none', width: 70 }}>영향도</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#fff', fontSize: 12, borderBottom: 'none', borderRadius: '0 8px 0 0' }}>대응 전략</th>
                  </tr>
                </thead>
                <tbody>
                  {prdData.risks?.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}`, background: i % 2 === 0 ? C.white : C.surface }}>
                      <td style={{ padding: '10px 14px', color: C.textSecondary }}>{r.risk}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: r.impact === '높음' ? C.redBg : C.yellowBg,
                          color: r.impact === '높음' ? '#dc2626' : '#d97706',
                          border: `1px solid ${r.impact === '높음' ? C.redBorder : C.yellowBorder}`,
                        }}>{r.impact}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: C.textSecondary, fontSize: 13 }}>{r.mitigation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <SectionDivider />

        {/* 12. Expert Insight (conditional) */}
        {prdData.expertInsight && (
          <div id="sec-expert">
            <SectionHeaderAnchored number="11" title="AI 전문가 인사이트" subtitle="위시켓 프로젝트 데이터 기반 분석" id="sec-expert" />
            <Card style={{
              background: 'linear-gradient(135deg, #eff6ff, #f0fdf4)',
              border: `1px solid #bfdbfe`, borderRadius: 20,
              position: 'relative', overflow: 'hidden', padding: '28px 28px 28px 36px',
            }}>
              {/* Left gradient sidebar */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 5,
                background: 'linear-gradient(180deg, #2563eb, #22c55e)',
                borderRadius: '20px 0 0 20px',
              }} />
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
                }}>💡</div>
                <FormattedText
                  value={prdData.expertInsight}
                  onChange={(v) => setPrdData({ ...prdData, expertInsight: v })}
                  style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.85, margin: 0 }}
                  sectionKey="expertInsight" sectionTitle="AI 전문가 인사이트" projectContext={projectCtx}
                />
              </div>
            </Card>
          </div>
        )}

        <SectionDivider />

        {/* P1: Approval Process */}
        {(prdData.approvalProcess?.length ?? 0) > 0 && (
          <>
            <SectionDivider />
            <div id="sec-approval">
              <SectionHeaderAnchored number={String(tocSections.find(s => s.id === 'sec-approval')?.num || '14')} title="승인 프로세스" subtitle="단계별 의사결정 및 거버넌스" id="sec-approval" />
              <Card>
                <div style={{ position: 'relative' }}>
                  {prdData.approvalProcess!.map((ap, i) => (
                    <div key={i} style={{ display: 'flex', gap: 16, marginBottom: i < (prdData.approvalProcess?.length || 0) - 1 ? 20 : 0, position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: C.blue, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, flexShrink: 0, zIndex: 1,
                        }}>{i + 1}</div>
                        {i < (prdData.approvalProcess?.length || 0) - 1 && (
                          <div style={{ width: 2, flex: 1, background: C.borderLight, marginTop: 4 }} />
                        )}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 4 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>{ap.stage}</div>
                        <div style={{ fontSize: 13, color: C.textSecondary, marginBottom: 2 }}>
                          <span style={{ fontWeight: 600 }}>승인자:</span> {ap.approver}
                        </div>
                        <div style={{ fontSize: 13, color: C.textTertiary }}>
                          <span style={{ fontWeight: 600 }}>기준:</span> {ap.criteria}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}

        {/* P1: QA Strategy */}
        {(prdData.qaStrategy?.length ?? 0) > 0 && (
          <>
            <SectionDivider />
            <div id="sec-qa">
              <SectionHeaderAnchored number={String(tocSections.find(s => s.id === 'sec-qa')?.num || '15')} title="QA 전략" subtitle="품질 보증 및 테스트 전략" id="sec-qa" />
              <div className="prd-two-col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                {prdData.qaStrategy!.map((qa, i) => {
                  const qaColors: Record<string, { icon: string; color: string; bg: string }> = {
                    '단위': { icon: '🔬', color: C.blue, bg: C.blueBg },
                    '통합': { icon: '🔗', color: C.green, bg: C.greenBg },
                    'E2E': { icon: '🎯', color: C.purple, bg: C.purpleBg },
                    '성능': { icon: '⚡', color: C.yellow, bg: C.yellowBg },
                    '보안': { icon: '🔒', color: C.red, bg: C.redBg },
                  };
                  const theme = Object.entries(qaColors).find(([k]) => qa.type.includes(k))?.[1] || { icon: '✅', color: C.blue, bg: C.blueBg };
                  return (
                    <Card key={i} style={{ borderTop: `3px solid ${theme.color}` }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: theme.bg, fontSize: 14 }}>{theme.icon}</span>
                        {qa.type}
                      </h3>
                      <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginBottom: 8 }}>
                        <strong>범위:</strong> {qa.scope}
                      </div>
                      <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginBottom: 8 }}>
                        <strong>도구:</strong> <span style={{ background: C.blueBg, padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{qa.tools}</span>
                      </div>
                      <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
                        <strong>통과 기준:</strong> {qa.criteria}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <SectionDivider />

        {/* 13. Glossary */}
        <div id="sec-glossary">
          <SectionHeaderAnchored number={String(tocSections.find(s => s.id === 'sec-glossary')?.num || '14')} title="용어 정의" subtitle="본 문서에서 사용되는 주요 용어" id="sec-glossary" />
          <Card style={{ padding: '28px 32px' }}>
            <div style={{ display: 'grid', gap: 4 }}>
              {prdData.glossary?.map((g, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, padding: '12px 0', borderBottom: i < (prdData.glossary?.length || 0) - 1 ? `1px solid ${C.borderLight}` : 'none', alignItems: 'baseline' }}>
                  <span style={{
                    fontWeight: 700, fontSize: 13, color: C.blue,
                    minWidth: 90, fontFamily: '"SF Mono", Monaco, monospace',
                    background: C.blueBg, padding: '3px 8px', borderRadius: 4,
                  }}>{g.term}</span>
                  <span style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, flex: 1 }}>{g.definition}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {(prdData.apiEndpoints?.length ?? 0) > 0 && <SectionDivider />}

        {/* ━━ FORGE v2: API Endpoints ━━ */}
        {(prdData.apiEndpoints?.length ?? 0) > 0 && (
          <div id="sec-api">
            <SectionHeaderAnchored number={String(tocSections.find(s => s.id === 'sec-api')?.num || '16')} title="API 명세" subtitle="핵심 API 엔드포인트 목록" id="sec-api" />
            <Card style={{ padding: '24px 28px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#1e40af' }}>
                      <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#fff', fontSize: 12, borderRadius: '8px 0 0 0' }}>메소드</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#fff', fontSize: 12 }}>엔드포인트</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#fff', fontSize: 12 }}>설명</th>
                      <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: '#fff', fontSize: 12, borderRadius: '0 8px 0 0' }}>기능</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prdData.apiEndpoints!.map((ep, i) => {
                      const methodColors: Record<string, string> = { GET: '#22C55E', POST: '#3B82F6', PUT: '#F59E0B', DELETE: '#EF4444', PATCH: '#8B5CF6', WS: '#06B6D4' };
                      const color = methodColors[ep.method] || C.textSecondary;
                      return (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, color: '#fff', background: color, fontFamily: 'monospace' }}>{ep.method}</span>
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: '"SF Mono", Monaco, monospace', fontSize: 12, color: C.blue }}>{ep.path}</td>
                          <td style={{ padding: '8px 12px', color: C.textSecondary }}>{ep.description}</td>
                          <td style={{ padding: '8px 12px', color: C.textTertiary, fontSize: 12 }}>{ep.feature}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {(prdData.dataModel?.length ?? 0) > 0 && <SectionDivider />}

        {/* ━━ FORGE v2: Data Model / ERD ━━ */}
        {(prdData.dataModel?.length ?? 0) > 0 && (
          <div id="sec-datamodel">
            <SectionHeaderAnchored number={String(tocSections.find(s => s.id === 'sec-datamodel')?.num || '17')} title="데이터 모델" subtitle="핵심 엔티티 및 관계도" id="sec-datamodel" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {prdData.dataModel!.map((entity, i) => (
                <Card key={i} style={{ overflow: 'hidden', padding: 0, borderRadius: 16 }}>
                  <div style={{ background: `linear-gradient(135deg, ${C.purple}12, ${C.blue}08)`, padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `linear-gradient(135deg, ${C.purple}, ${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700, boxShadow: '0 2px 6px rgba(139,92,246,0.3)' }}>
                      {entity.entity.charAt(0)}
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>{entity.entity}</span>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>필드</div>
                      {entity.fields.map((f, j) => (
                        <div key={j} style={{ fontSize: 12, color: C.textSecondary, padding: '3px 0', fontFamily: '"SF Mono", Monaco, monospace' }}>• {f}</div>
                      ))}
                    </div>
                    {entity.relationships.length > 0 && (
                      <div style={{ paddingTop: 10, borderTop: `1px solid ${C.borderLight}` }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>관계</div>
                        {entity.relationships.map((r, j) => (
                          <div key={j} style={{ fontSize: 12, color: C.blue, padding: '3px 0', fontWeight: 500 }}>↔ {r}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {(prdData.competitorAnalysis?.length ?? 0) > 0 && <SectionDivider />}

        {/* ━━ FORGE v2: Competitor Analysis ━━ */}
        {(prdData.competitorAnalysis?.length ?? 0) > 0 && (
          <div id="sec-competitor">
            <SectionHeaderAnchored number={String(tocSections.find(s => s.id === 'sec-competitor')?.num || '18')} title="경쟁 서비스 분석" subtitle="주요 경쟁 서비스 비교 분석" id="sec-competitor" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {prdData.competitorAnalysis!.map((comp, i) => (
                <Card key={i} style={{ overflow: 'hidden', padding: 0, borderRadius: 16 }}>
                  <div style={{ background: C.gradient, padding: '16px 24px' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{comp.name}</div>
                  </div>
                  <div style={{ padding: '20px 24px', display: 'grid', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>💪 강점</div>
                      <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.7, padding: '8px 12px', background: C.greenBg, borderRadius: 8 }}>{comp.strengths}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>⚠️ 약점</div>
                      <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.7, padding: '8px 12px', background: C.redBg, borderRadius: 8 }}>{comp.weaknesses}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>🎯 차별화 포인트</div>
                      <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.7, padding: '8px 12px', background: C.blueBg, borderRadius: 8 }}>{comp.differentiation}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Reference & Additional */}
        {prdData.referenceServices && prdData.referenceServices !== '해당 없음' && (
          <Card>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 8px 0' }}>참고 서비스</h3>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>{prdData.referenceServices}</p>
          </Card>
        )}
        {prdData.additionalRequirements && prdData.additionalRequirements !== '추가 요구사항 없음' && (
          <Card>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 8px 0' }}>추가 요구사항</h3>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>{prdData.additionalRequirements}</p>
          </Card>
        )}

        {/* ━━ Share URL Banner (shown after sharing) ━━ */}
        {shareUrl && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
            background: C.greenBg, border: `1px solid rgba(34, 197, 94, 0.2)`, borderRadius: 12,
            marginTop: 32, marginBottom: 16,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 4 }}>✅ 공유 링크가 생성되었습니다</div>
              <div style={{ fontSize: 12, color: C.textSecondary, wordBreak: 'break-all' }}>{shareUrl}</div>
            </div>
            <button onClick={handleCopyShareUrl} style={{
              padding: '8px 16px', borderRadius: 8, border: `1px solid ${urlCopied ? C.green : C.border}`,
              background: urlCopied ? C.green : C.white, color: urlCopied ? '#fff' : C.textSecondary,
              fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            }}>
              {urlCopied ? '복사됨!' : '링크 복사'}
            </button>
          </div>
        )}

        {/* ━━ Action Buttons ━━ (#16: readOnly에서는 PDF/DOCX만 표시) */}
        <div style={{
          display: 'flex', gap: 10, marginTop: shareUrl ? 8 : 48, marginBottom: 40, flexWrap: 'wrap',
          padding: '24px 0', borderTop: `1px solid ${C.borderLight}`,
        }}>
          {/* Primary: Share URL */}
          <button
            onClick={handleShare}
            disabled={sharing}
            style={{
              padding: '14px 28px', borderRadius: 10, border: 'none',
              background: sharing ? C.textTertiary : C.gradient, color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: sharing ? 'wait' : 'pointer', transition: 'all 0.2s',
              boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            {sharing ? '생성 중...' : shareUrl ? '새 링크 생성' : '🔗 공유 링크 만들기'}
          </button>
          {/* Markdown Copy */}
          <button
            onClick={() => { copyToClipboard(generateMarkdown(prdData)); setCopied(true); setTimeout(() => setCopied(false), 2500); }}
            style={{
              padding: '12px 22px', borderRadius: 10,
              border: `1px solid ${C.border}`, background: '#fff', color: C.textSecondary,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {copied ? '✅ 복사됨!' : '📋 마크다운 복사'}
          </button>
          {/* F3: PDF 다운로드 */}
          <button
            onClick={handlePDF}
            disabled={pdfGenerating}
            style={{
              padding: '12px 22px', borderRadius: 10,
              border: `1px solid ${C.border}`, background: '#fff', color: C.textSecondary,
              fontSize: 13, fontWeight: 600, cursor: pdfGenerating ? 'wait' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              opacity: pdfGenerating ? 0.7 : 1,
            }}
          >
            {pdfGenerating ? '⏳ PDF 생성 중...' : '📄 PDF 다운로드'}
          </button>
          {/* F12: DOCX 다운로드 */}
          <button
            onClick={handleDOCX}
            disabled={docxGenerating}
            style={{
              padding: '12px 22px', borderRadius: 10,
              border: `1px solid ${C.border}`, background: '#fff', color: C.textSecondary,
              fontSize: 13, fontWeight: 600, cursor: docxGenerating ? 'wait' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              opacity: docxGenerating ? 0.7 : 1,
            }}
          >
            {docxGenerating ? '⏳ DOCX 생성 중...' : '📝 DOCX 다운로드'}
          </button>
          {/* Print */}
          <button
            onClick={handlePrint}
            style={{
              padding: '12px 18px', borderRadius: 10,
              border: `1px solid ${C.border}`, background: '#fff', color: C.textTertiary,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            🖨️ 인쇄
          </button>
        </div>

        {/* ━━ Wishket CTA Section ━━ */}
        <div className="no-print wishket-cta-section" style={{
          background: C.gradientCTA,
          borderRadius: 20,
          padding: '40px 36px',
          marginTop: 24,
          marginBottom: 40,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <style>{`@keyframes ctaPulse { 0%, 100% { box-shadow: 0 4px 16px rgba(0,0,0,0.15); } 50% { box-shadow: 0 4px 24px rgba(0,0,0,0.25), 0 0 20px rgba(255,255,255,0.1); } }`}</style>
          <div style={{ position: 'absolute', top: -80, right: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '40%', right: '20%', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
          {ctaSubmitted ? (
            <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 8px 0' }}>
                신청이 완료되었습니다!
              </h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.6 }}>
                위시켓 전문 매니저가 PRD를 검토한 뒤,<br />
                프로젝트에 가장 적합한 개발 파트너를 추천해 드리겠습니다.
              </p>
            </div>
          ) : (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.15)', padding: '5px 12px', borderRadius: 20,
                fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 0.5, marginBottom: 16,
              }}>
                ⚡ 무료 · 평균 3일 이내 매칭
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px 0', lineHeight: 1.3 }}>
                이 PRD에 딱 맞는 개발 파트너를 찾아보세요
              </h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: '0 0 24px 0', lineHeight: 1.6 }}>
                위시켓에 등록된 10,000+ 검증된 개발사/프리랜서 중<br />
                프로젝트 요구사항에 최적화된 파트너를 매칭해 드립니다.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                <input
                  type="email"
                  placeholder="이메일 주소"
                  value={ctaEmail}
                  onChange={(e) => setCtaEmail(e.target.value)}
                  style={{
                    flex: '1 1 200px', padding: '12px 16px', borderRadius: 10,
                    border: '1.5px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 14, outline: 'none',
                  }}
                />
                <input
                  type="tel"
                  placeholder="연락처 (선택)"
                  value={ctaPhone}
                  onChange={(e) => setCtaPhone(e.target.value)}
                  style={{
                    flex: '1 1 160px', padding: '12px 16px', borderRadius: 10,
                    border: '1.5px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)',
                    color: '#fff', fontSize: 14, outline: 'none',
                  }}
                />
                <button
                  onClick={async () => {
                    if (!ctaEmail.includes('@')) return;
                    setCtaSubmitting(true);
                    try {
                      await fetch('/api/cta-lead', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          email: ctaEmail,
                          phone: ctaPhone,
                          projectName: prdData.projectName,
                          projectType: rfpData?.overview ? 'detected' : 'unknown',
                          featureCount: totalFeatures,
                          sessionId,
                        }),
                      });
                    } catch { /* fire and forget */ }
                    setCtaSubmitted(true);
                    setCtaSubmitting(false);
                  }}
                  disabled={ctaSubmitting || !ctaEmail.includes('@')}
                  style={{
                    padding: '13px 28px', borderRadius: 12, border: 'none',
                    background: ctaSubmitting ? 'rgba(255,255,255,0.3)' : '#fff',
                    color: ctaSubmitting ? '#fff' : C.blue,
                    fontSize: 14, fontWeight: 700, cursor: ctaSubmitting ? 'wait' : 'pointer',
                    flexShrink: 0, transition: C.ease,
                    boxShadow: ctaSubmitting ? 'none' : '0 4px 16px rgba(0,0,0,0.15)',
                    animation: ctaSubmitting ? 'none' : 'ctaPulse 2.5s infinite',
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = 'translateY(0)'; }}
                >
                  {ctaSubmitting ? '신청 중...' : '무료 매칭 신청'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                <span>✓ PRD 자동 첨부</span>
                <span>✓ 평균 3건 추천</span>
                <span>✓ 수수료 0원</span>
              </div>
            </div>
          )}
        </div>

        {/* ━━ Footer ━━ */}
        <div style={{
          textAlign: 'center', paddingTop: 28, paddingBottom: 8, borderTop: `1px solid ${C.border}`,
          fontSize: 11, color: C.textTertiary, marginTop: 8,
        }}>
          <div style={{ width: 40, height: 2, background: C.gradientAccent, margin: '0 auto 16px', borderRadius: 1, opacity: 0.4 }} />
          <p style={{ margin: '0 0 4px 0', lineHeight: 1.6 }}>
            본 문서는 AI 기반으로 자동 생성되었으며, 실제 개발 착수 전 상세 검토가 필요합니다.
          </p>
          <p style={{ margin: 0, fontWeight: 500 }}>
            Wishket AI PRD Builder · © {new Date().getFullYear()} Wishket
          </p>
        </div>
      </div>
    </div>
    </ReadOnlyContext.Provider>
  );
}
