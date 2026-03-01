'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RFPData } from '@/types/rfp';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

interface RFPCompleteProps {
  rfpData: RFPData;
  email: string;
  sessionId?: string;
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
    }[];
  }[];
  nonFunctionalRequirements: { category: string; items: string[] }[];
  timeline: { phase: string; duration: string; deliverables: string[] }[];
  assumptions: string[];
  constraints: string[];
  risks: { risk: string; impact: string; mitigation: string }[];
  glossary: { term: string; definition: string }[];
  expertInsight: string;
}

// ━━━━━ Design Tokens ━━━━━
const C = {
  blue: '#2563EB',
  blueLight: '#3B82F6',
  blueSoft: '#60A5FA',
  blueBg: 'rgba(37, 99, 235, 0.05)',
  darkHeader: '#0F172A',
  bg: '#F8FAFC',
  white: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  green: '#22C55E',
  greenBg: 'rgba(34, 197, 94, 0.06)',
  yellow: '#F59E0B',
  yellowBg: 'rgba(245, 158, 11, 0.06)',
  red: '#EF4444',
  redBg: 'rgba(239, 68, 68, 0.06)',
  purple: '#8B5CF6',
  purpleBg: 'rgba(139, 92, 246, 0.06)',
  gradient: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)',
};

// ━━━━━ F4+F8: Editable Text Section with AI Regeneration ━━━━━
function EditableText({ value, onChange, style, sectionKey, sectionTitle, projectContext }: {
  value: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
  sectionKey?: string;
  sectionTitle?: string;
  projectContext?: { projectName?: string; projectType?: string; coreFeatures?: string };
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

  // F8: AI 재생성
  const handleRegenerate = async () => {
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
        }),
      });
      const data = await res.json();
      if (data.regeneratedContent) {
        onChange(data.regeneratedContent);
      }
    } catch (err) {
      console.error('Regenerate error:', err);
    }
    setRegenerating(false);
  };

  if (editing) {
    return (
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          style={{
            ...style,
            width: '100%',
            border: `2px solid ${C.blue}`,
            borderRadius: 8,
            padding: '12px',
            fontSize: 14,
            fontFamily: 'inherit',
            lineHeight: 1.8,
            resize: 'none',
            outline: 'none',
            background: 'rgba(37, 99, 235, 0.02)',
            color: C.textSecondary,
            margin: 0,
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          {sectionKey && (
            <button onClick={handleRegenerate} disabled={regenerating} style={{
              padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.purple}`,
              background: regenerating ? C.purpleBg : C.white, fontSize: 12, cursor: regenerating ? 'wait' : 'pointer',
              color: C.purple, fontWeight: 500, marginRight: 'auto',
            }}>
              {regenerating ? '⏳ AI 재작성 중...' : '🤖 AI 재작성'}
            </button>
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
      style={{ ...style, cursor: 'pointer', position: 'relative', borderRadius: 6, transition: 'background 0.15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37,99,235,0.03)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      title="클릭하여 편집"
    >
      {value}
      <span style={{
        position: 'absolute', top: 4, right: 4,
        fontSize: 11, color: C.textTertiary, opacity: 0.5,
        background: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: 4,
      }}>✏️</span>
    </div>
  );
}

// ━━━━━ Section Number ━━━━━
function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          background: C.gradient,
          color: '#fff',
          width: 32, height: 32,
          borderRadius: 8,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 800,
          flexShrink: 0,
        }}>{number}</span>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: -0.3 }}>
          {title}
        </h2>
      </div>
      {subtitle && (
        <p style={{ fontSize: 12, color: C.textTertiary, margin: '8px 0 0 44px', lineHeight: 1.5 }}>{subtitle}</p>
      )}
    </div>
  );
}

// ━━━━━ Card Wrapper ━━━━━
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: '24px',
      marginBottom: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ━━━━━ Priority Badge ━━━━━
function PriorityBadge({ priority, label }: { priority: string; label: string }) {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    P0: { bg: C.redBg, color: C.red, border: 'rgba(239,68,68,0.15)' },
    P1: { bg: C.blueBg, color: C.blue, border: 'rgba(37,99,235,0.15)' },
    P2: { bg: 'rgba(148,163,184,0.06)', color: C.textTertiary, border: 'rgba(148,163,184,0.15)' },
  };
  const s = styles[priority] || styles.P1;
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
    }}>
      {priority} · {label}
    </span>
  );
}

// ━━━━━ Feature Detail ━━━━━
function FeatureDetail({ feature, index }: { feature: any; index: string }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetail = (feature.subFeatures?.length > 0) || feature.userFlow || (feature.screenSpecs?.length > 0) || (feature.acceptanceCriteria?.length > 0);

  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`, borderRadius: 10,
      marginBottom: 10, overflow: 'hidden',
    }}>
      <button
        onClick={() => hasDetail && setExpanded(!expanded)}
        style={{
          width: '100%', padding: '14px 16px', background: 'none', border: 'none',
          cursor: hasDetail ? 'pointer' : 'default',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', textAlign: 'left',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, fontFamily: 'monospace' }}>{index}</span>
            <h5 style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{feature.name}</h5>
          </div>
          <p style={{ fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.5, paddingLeft: 0 }}>
            {feature.description}
          </p>
        </div>
        {hasDetail && (
          <div style={{
            width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s',
            color: C.textTertiary, flexShrink: 0, marginLeft: 12, marginTop: 2,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        )}
      </button>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px', background: C.blueBg }}>
          {feature.subFeatures?.length > 0 && (
            <DetailSection title="하위 기능" items={feature.subFeatures} />
          )}
          {feature.acceptanceCriteria?.length > 0 && (
            <DetailSection title="수락 기준 (AC)" items={feature.acceptanceCriteria} icon="✅" />
          )}
          {feature.userFlow && feature.userFlow !== '(사용자 흐름 미정의)' && (
            <div style={{ marginBottom: 14 }}>
              <h6 style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                사용자 흐름
              </h6>
              <pre style={{
                background: '#F1F5F9', border: `1px solid ${C.border}`, borderRadius: 8,
                padding: 12, fontSize: 11, color: C.textSecondary, fontFamily: '"SF Mono", Monaco, monospace',
                overflow: 'auto', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>
                {feature.userFlow}
              </pre>
            </div>
          )}
          {feature.screenSpecs?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <h6 style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                화면 명세
              </h6>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: C.textPrimary, borderBottom: `1px solid ${C.border}` }}>화면</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: C.textPrimary, borderBottom: `1px solid ${C.border}` }}>목적</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: C.textPrimary, borderBottom: `1px solid ${C.border}` }}>UI 요소</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feature.screenSpecs.map((spec: any, i: number) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                        <td style={{ padding: '8px 12px', color: C.textSecondary, fontWeight: 600 }}>{spec.name}</td>
                        <td style={{ padding: '8px 12px', color: C.textSecondary }}>{spec.purpose}</td>
                        <td style={{ padding: '8px 12px', color: C.textSecondary }}>{spec.elements?.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {feature.businessRules?.length > 0 && (
            <DetailSection title="비즈니스 규칙" items={feature.businessRules} icon="📋" />
          )}
          {feature.errorCases?.length > 0 && (
            <DetailSection title="에러 케이스" items={feature.errorCases} icon="⚠️" />
          )}
          {feature.dataEntities?.length > 0 && (
            <div>
              <h6 style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                데이터 엔티티
              </h6>
              {feature.dataEntities.map((entity: any, i: number) => (
                <div key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 4 }}>
                  <strong style={{ color: C.textPrimary }}>{entity.name}</strong>: {entity.fields}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailSection({ title, items, icon }: { title: string; items: string[]; icon?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h6 style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </h6>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 5, paddingLeft: 16, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0 }}>{icon || '•'}</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ━━━━━ Module Card ━━━━━
function ModuleCard({ module }: { module: any }) {
  const [expanded, setExpanded] = useState(module.priority === 'P0');

  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
      overflow: 'hidden', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', padding: '18px 20px', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{module.name}</h4>
            <PriorityBadge priority={module.priority} label={module.priorityLabel} />
          </div>
          <span style={{ fontSize: 12, color: C.textTertiary }}>{module.features?.length || 0}개 기능 포함</span>
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
}

// ━━━━━ TOC (Table of Contents) ━━━━━
function TableOfContents({ sections }: { sections: { num: string; title: string; id: string }[] }) {
  return (
    <Card style={{ background: '#FAFBFD' }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, color: C.textPrimary, margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        목차
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 6 }}>
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 8, textDecoration: 'none', color: C.textSecondary,
              fontSize: 13, transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.blueBg; e.currentTarget.style.color = C.blue; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSecondary; }}
          >
            <span style={{
              background: C.blueBg, color: C.blue, width: 24, height: 24,
              borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>{s.num}</span>
            {s.title}
          </a>
        ))}
      </div>
    </Card>
  );
}

// ━━━━━ Main Component ━━━━━
export default function RFPComplete({ rfpData, email, sessionId }: RFPCompleteProps) {
  const [prdData, setPrdData] = useState<PRDResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [sharing, setSharing] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [ctaEmail, setCtaEmail] = useState('');
  const [ctaPhone, setCtaPhone] = useState('');
  const [ctaSubmitted, setCtaSubmitted] = useState(false);
  const [ctaSubmitting, setCtaSubmitting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPRD = async () => {
      try {
        const res = await fetch('/api/generate-rfp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rfpData, sessionId }),
        });
        const data = await res.json();
        if (data.rfpDocument) {
          try {
            const parsed = JSON.parse(data.rfpDocument);
            if (parsed?.projectName && parsed?.featureModules) {
              setPrdData(parsed);
              setLoading(false);
              return;
            }
          } catch { /* JSON parse failed */ }
        }
        setLoading(false);
      } catch (err) {
        console.error('PRD generation error:', err);
        setLoading(false);
      }
    };
    fetchPRD();
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

  // F3: PDF 내보내기
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const handlePDF = useCallback(async () => {
    if (!contentRef.current || !prdData) return;
    setPdfGenerating(true);
    try {
      // no-print 요소 숨기기
      const noPrintEls = contentRef.current.querySelectorAll('.no-print');
      noPrintEls.forEach(el => (el as HTMLElement).style.display = 'none');

      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F8FAFC',
        windowWidth: 960,
      });

      // no-print 요소 복원
      noPrintEls.forEach(el => (el as HTMLElement).style.display = '');

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = `${prdData.projectName.replace(/[^가-힣a-zA-Z0-9]/g, '_')}_PRD_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('PDF 생성 중 오류가 발생했습니다. 브라우저 인쇄 기능을 이용해주세요.');
    }
    setPdfGenerating(false);
  }, [prdData]);

  // F12: DOCX 내보내기
  const [docxGenerating, setDocxGenerating] = useState(false);
  const handleDOCX = useCallback(async () => {
    if (!prdData) return;
    setDocxGenerating(true);
    try {
      const d = prdData;
      const sections: Paragraph[] = [];

      // 타이틀
      sections.push(new Paragraph({ text: d.projectName, heading: HeadingLevel.TITLE, spacing: { after: 200 } }));
      sections.push(new Paragraph({ children: [
        new TextRun({ text: `버전 ${d.documentMeta?.version || '1.0'} | ${d.documentMeta?.createdAt || '-'} | ${d.documentMeta?.generatedBy || 'Wishket AI'}`, size: 20, color: '666666' }),
      ], spacing: { after: 400 } }));

      // Executive Summary
      sections.push(new Paragraph({ text: '1. Executive Summary', heading: HeadingLevel.HEADING_1 }));
      sections.push(new Paragraph({ text: d.executiveSummary, spacing: { after: 300 } }));

      // 프로젝트 개요
      sections.push(new Paragraph({ text: '2. 프로젝트 개요', heading: HeadingLevel.HEADING_1 }));
      sections.push(new Paragraph({ text: d.projectOverview, spacing: { after: 300 } }));

      // 문제 정의
      if (d.problemStatement) {
        sections.push(new Paragraph({ text: '3. 문제 정의 & 프로젝트 목표', heading: HeadingLevel.HEADING_1 }));
        sections.push(new Paragraph({ text: d.problemStatement, spacing: { after: 200 } }));
      }
      if (d.projectGoals?.length > 0) {
        d.projectGoals.forEach((g, i) => {
          sections.push(new Paragraph({ children: [
            new TextRun({ text: `목표 ${i + 1}: `, bold: true }),
            new TextRun({ text: g.goal }),
            new TextRun({ text: ` — 성공 지표: ${g.metric}`, color: '666666' }),
          ], spacing: { after: 100 } }));
        });
        sections.push(new Paragraph({ spacing: { after: 200 } }));
      }

      // 타겟 사용자
      sections.push(new Paragraph({ text: '4. 타겟 사용자 & 페르소나', heading: HeadingLevel.HEADING_1 }));
      sections.push(new Paragraph({ text: d.targetUsers, spacing: { after: 200 } }));
      if (d.userPersonas?.length > 0) {
        d.userPersonas.forEach(p => {
          sections.push(new Paragraph({ children: [
            new TextRun({ text: `${p.name} (${p.role})`, bold: true }),
            new TextRun({ text: ` — 니즈: ${p.needs} / 불편사항: ${p.painPoints}` }),
          ], spacing: { after: 100 } }));
        });
        sections.push(new Paragraph({ spacing: { after: 200 } }));
      }

      // 스코프
      sections.push(new Paragraph({ text: '5. 프로젝트 스코프', heading: HeadingLevel.HEADING_1 }));
      sections.push(new Paragraph({ text: '포함 범위 (In-Scope)', heading: HeadingLevel.HEADING_2 }));
      d.scopeInclusions?.forEach(s => {
        sections.push(new Paragraph({ text: `✓ ${s}`, spacing: { after: 60 } }));
      });
      sections.push(new Paragraph({ text: '미포함 (Out-of-Scope)', heading: HeadingLevel.HEADING_2 }));
      d.scopeExclusions?.forEach(s => {
        sections.push(new Paragraph({ text: `— ${s}`, spacing: { after: 60 } }));
      });
      sections.push(new Paragraph({ spacing: { after: 200 } }));

      // 기능 명세
      sections.push(new Paragraph({ text: '6. 기능 명세', heading: HeadingLevel.HEADING_1 }));
      d.featureModules?.forEach(m => {
        sections.push(new Paragraph({ text: `${m.name} (${m.priority} · ${m.priorityLabel})`, heading: HeadingLevel.HEADING_2 }));
        m.features?.forEach(f => {
          sections.push(new Paragraph({ children: [
            new TextRun({ text: `${f.id} ${f.name}`, bold: true }),
          ], spacing: { after: 60 } }));
          sections.push(new Paragraph({ text: f.description, spacing: { after: 60 } }));
          if (f.subFeatures?.length) {
            sections.push(new Paragraph({ text: `하위 기능: ${f.subFeatures.join(', ')}`, spacing: { after: 60 } }));
          }
          if (f.acceptanceCriteria?.length) {
            sections.push(new Paragraph({ text: `수락 기준: ${f.acceptanceCriteria.join(' / ')}`, spacing: { after: 100 } }));
          }
        });
      });

      // 기술 스택
      if (d.techStack?.length > 0) {
        sections.push(new Paragraph({ text: '7. 기술 스택 권장안', heading: HeadingLevel.HEADING_1 }));
        const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        const techTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ['분류', '기술', '선정 근거'].map(h =>
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })], width: { size: 33, type: WidthType.PERCENTAGE } })
              ),
            }),
            ...d.techStack.map(t => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: typeof t === 'object' ? t.category : '-' })], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                new TableCell({ children: [new Paragraph({ text: typeof t === 'object' ? t.tech : String(t) })], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
                new TableCell({ children: [new Paragraph({ text: typeof t === 'object' ? t.rationale : '' })], borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder } }),
              ],
            })),
          ],
        });
        sections.push(techTable as unknown as Paragraph);
        sections.push(new Paragraph({ spacing: { after: 200 } }));
      }

      // 비기능 요구사항
      if (d.nonFunctionalRequirements?.length > 0) {
        sections.push(new Paragraph({ text: '8. 비기능 요구사항', heading: HeadingLevel.HEADING_1 }));
        d.nonFunctionalRequirements.forEach(n => {
          sections.push(new Paragraph({ text: n.category, heading: HeadingLevel.HEADING_2 }));
          n.items?.forEach(item => {
            sections.push(new Paragraph({ text: `• ${item}`, spacing: { after: 60 } }));
          });
        });
      }

      // 리스크
      if (d.risks?.length > 0) {
        sections.push(new Paragraph({ text: '11. 리스크 관리', heading: HeadingLevel.HEADING_1 }));
        d.risks.forEach(r => {
          sections.push(new Paragraph({ children: [
            new TextRun({ text: r.risk, bold: true }),
            new TextRun({ text: ` (영향: ${r.impact}) → 대응: ${r.mitigation}` }),
          ], spacing: { after: 100 } }));
        });
      }

      // Expert insight
      if (d.expertInsight) {
        sections.push(new Paragraph({ text: '전문가 인사이트', heading: HeadingLevel.HEADING_1 }));
        sections.push(new Paragraph({ text: d.expertInsight, spacing: { after: 200 } }));
      }

      // 푸터
      sections.push(new Paragraph({ spacing: { after: 400 } }));
      sections.push(new Paragraph({ children: [
        new TextRun({ text: 'Generated by Wishket AI PRD Builder', color: '999999', size: 18 }),
      ], alignment: AlignmentType.CENTER }));

      const doc = new Document({
        sections: [{ children: sections }],
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
    md += `## 1. Executive Summary\n${d.executiveSummary}\n\n`;
    md += `## 2. 프로젝트 개요\n${d.projectOverview}\n\n`;
    md += `## 3. 문제 정의\n${d.problemStatement}\n\n`;
    md += `## 4. 프로젝트 목표\n`;
    d.projectGoals?.forEach((g, i) => { md += `${i + 1}. **${g.goal}** — 성공 지표: ${g.metric}\n`; });
    md += `\n## 5. 타겟 사용자\n${d.targetUsers}\n\n`;
    if (d.userPersonas?.length > 0) {
      md += `### 사용자 페르소나\n`;
      d.userPersonas.forEach(p => { md += `- **${p.name}** (${p.role}): 니즈 — ${p.needs} / 문제점 — ${p.painPoints}\n`; });
      md += '\n';
    }
    md += `## 6. 스코프\n### 포함\n`;
    d.scopeInclusions?.forEach(s => { md += `- ✅ ${s}\n`; });
    md += `### 미포함\n`;
    d.scopeExclusions?.forEach(s => { md += `- ❌ ${s}\n`; });
    md += `\n## 7. 기능 명세\n`;
    d.featureModules?.forEach(m => {
      md += `### ${m.name} (${m.priority})\n`;
      m.features?.forEach(f => {
        md += `#### ${f.id} ${f.name}\n${f.description}\n`;
        if (f.subFeatures?.length) { md += `하위 기능: ${f.subFeatures.join(', ')}\n`; }
        if (f.acceptanceCriteria?.length) { md += `수락 기준: ${f.acceptanceCriteria.join(' / ')}\n`; }
        md += '\n';
      });
    });
    md += `## 8. 기술 스택\n`;
    d.techStack?.forEach(t => { md += `- **${t.tech}** (${t.category}): ${t.rationale}\n`; });
    md += `\n## 9. 비기능 요구사항\n`;
    d.nonFunctionalRequirements?.forEach(n => {
      md += `### ${n.category}\n`;
      n.items?.forEach(item => { md += `- ${item}\n`; });
    });
    md += `\n## 10. 일정 계획\n`;
    d.timeline?.forEach(t => { md += `- **${t.phase}** (${t.duration}): ${t.deliverables.join(', ')}\n`; });
    md += `\n## 11. 전제 조건 & 제약사항\n`;
    md += `### 전제 조건\n`;
    d.assumptions?.forEach(a => { md += `- ${a}\n`; });
    md += `### 제약사항\n`;
    d.constraints?.forEach(c => { md += `- ${c}\n`; });
    md += `\n## 12. 리스크 관리\n`;
    d.risks?.forEach(r => { md += `- **${r.risk}** (영향: ${r.impact}) → 대응: ${r.mitigation}\n`; });
    if (d.expertInsight) { md += `\n## 13. 전문가 인사이트\n${d.expertInsight}\n`; }
    md += `\n---\nGenerated by Wishket AI PRD Builder\n`;
    return md;
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            border: `3px solid ${C.borderLight}`, borderTop: `3px solid ${C.blue}`,
            animation: 'spin 1s linear infinite', margin: '0 auto 24px',
          }} />
          <div style={{ fontSize: 17, fontWeight: 700, color: C.textPrimary, marginBottom: 8 }}>
            PRD 기획서를 생성하고 있습니다
          </div>
          <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>
            AI가 프로젝트를 분석하고 전문 기획서를 작성 중입니다.
            <br />약 15~30초 소요됩니다.
          </div>
          <div style={{
            marginTop: 24, height: 4, background: C.borderLight, borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', background: C.gradient, borderRadius: 2,
              animation: 'loading 2s ease-in-out infinite', width: '60%',
            }} />
          </div>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes loading { 0% { width: 10%; } 50% { width: 80%; } 100% { width: 10%; } }
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
    { num: '1', title: 'Executive Summary', id: 'sec-summary' },
    { num: '2', title: '프로젝트 개요', id: 'sec-overview' },
    { num: '3', title: '문제 정의 & 목표', id: 'sec-goals' },
    { num: '4', title: '타겟 사용자 & 페르소나', id: 'sec-users' },
    { num: '5', title: '프로젝트 스코프', id: 'sec-scope' },
    { num: '6', title: '기능 명세', id: 'sec-features' },
    { num: '7', title: '기술 스택', id: 'sec-tech' },
    { num: '8', title: '비기능 요구사항', id: 'sec-nfr' },
    { num: '9', title: '일정 계획', id: 'sec-timeline' },
    { num: '10', title: '전제 조건 & 제약사항', id: 'sec-assumptions' },
    { num: '11', title: '리스크 관리', id: 'sec-risks' },
    ...(prdData.expertInsight ? [{ num: '12', title: '전문가 인사이트', id: 'sec-expert' }] : []),
    { num: prdData.expertInsight ? '13' : '12', title: '용어 정의', id: 'sec-glossary' },
  ];

  const totalFeatures = prdData.featureModules?.reduce((sum, m) => sum + (m.features?.length || 0), 0) || 0;

  // F8: 프로젝트 컨텍스트 (AI 재생성용)
  const projectCtx = {
    projectName: prdData.projectName,
    projectType: rfpData?.overview?.slice(0, 200) || '',
    coreFeatures: prdData.featureModules?.map(m => m.name).join(', ') || '',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg }} ref={contentRef}>
      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          * { box-shadow: none !important; }
        }
      `}</style>
      {/* ━━ Header ━━ */}
      <div style={{
        background: C.gradient, color: '#fff', padding: '48px 20px 40px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 200, height: 200,
          borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
        }} />
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 20,
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 20,
            backdropFilter: 'blur(10px)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            PRD · 제품 요구사항 정의서
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px 0', lineHeight: 1.2, letterSpacing: -0.5 }}>
            {prdData.projectName}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, opacity: 0.85, marginTop: 16 }}>
            <span>📅 {prdData.documentMeta?.createdAt || '-'}</span>
            <span>📋 v{prdData.documentMeta?.version || '1.0'}</span>
            <span>⚙️ 기능 {totalFeatures}개</span>
            <span>🏢 {prdData.documentMeta?.generatedBy || 'Wishket AI'}</span>
          </div>
        </div>
      </div>

      {/* ━━ Body ━━ */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 60px' }}>
        {/* TOC */}
        <TableOfContents sections={tocSections} />

        {/* 1. Executive Summary */}
        <div id="sec-summary">
          <SectionHeader number="1" title="Executive Summary" subtitle="프로젝트 핵심 요약" />
          <Card style={{ borderLeft: `4px solid ${C.blue}` }}>
            <EditableText
              value={prdData.executiveSummary}
              onChange={(v) => setPrdData({ ...prdData, executiveSummary: v })}
              style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}
              sectionKey="executiveSummary" sectionTitle="Executive Summary" projectContext={projectCtx}
            />
          </Card>
        </div>

        {/* 2. Project Overview */}
        <div id="sec-overview">
          <SectionHeader number="2" title="프로젝트 개요" subtitle="배경, 목적, 기대효과" />
          <Card>
            <EditableText
              value={prdData.projectOverview}
              onChange={(v) => setPrdData({ ...prdData, projectOverview: v })}
              style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}
              sectionKey="projectOverview" sectionTitle="프로젝트 개요" projectContext={projectCtx}
            />
          </Card>
        </div>

        {/* 3. Problem & Goals */}
        <div id="sec-goals">
          <SectionHeader number="3" title="문제 정의 & 프로젝트 목표" subtitle="해결하려는 문제와 성공 지표" />
          {prdData.problemStatement && (
            <Card style={{ borderLeft: `4px solid ${C.yellow}`, marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 8px 0' }}>🎯 문제 정의</h3>
              <EditableText
                value={prdData.problemStatement}
                onChange={(v) => setPrdData({ ...prdData, problemStatement: v })}
                style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}
                sectionKey="problemStatement" sectionTitle="문제 정의" projectContext={projectCtx}
              />
            </Card>
          )}
          {prdData.projectGoals?.length > 0 && (
            <Card>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 14px 0' }}>📊 프로젝트 목표 & 성공 지표</h3>
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
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 2 }}>{g.goal}</div>
                      <div style={{ fontSize: 12, color: C.textSecondary }}>📏 {g.metric}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* 4. Target Users & Personas */}
        <div id="sec-users">
          <SectionHeader number="4" title="타겟 사용자 & 페르소나" subtitle="주요 사용자 유형 및 니즈 분석" />
          <Card>
            <EditableText
              value={prdData.targetUsers}
              onChange={(v) => setPrdData({ ...prdData, targetUsers: v })}
              style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, margin: '0 0 16px 0', whiteSpace: 'pre-wrap' }}
              sectionKey="targetUsers" sectionTitle="타겟 사용자" projectContext={projectCtx}
            />
            {prdData.userPersonas?.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {prdData.userPersonas.map((p, i) => (
                  <div key={i} style={{
                    border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px',
                    background: i === 0 ? C.blueBg : C.purpleBg,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: i === 0 ? C.blue : C.purple, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 700,
                      }}>{p.name[0]}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: C.textTertiary }}>{p.role}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>
                      <strong>니즈:</strong> {p.needs}
                    </div>
                    <div style={{ fontSize: 12, color: C.textSecondary }}>
                      <strong>불편사항:</strong> {p.painPoints}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* 5. Scope */}
        <div id="sec-scope">
          <SectionHeader number="5" title="프로젝트 스코프" subtitle="포함/미포함 범위 정의" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
            <Card style={{ borderLeft: `4px solid ${C.green}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.green, margin: '0 0 12px 0' }}>✅ 포함 범위 (In-Scope)</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {prdData.scopeInclusions?.map((s, i) => (
                  <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8, paddingLeft: 20, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: C.green }}>✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
            <Card style={{ borderLeft: `4px solid ${C.textTertiary}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textTertiary, margin: '0 0 12px 0' }}>❌ 미포함 (Out-of-Scope)</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {prdData.scopeExclusions?.map((s, i) => (
                  <li key={i} style={{ fontSize: 12, color: C.textTertiary, marginBottom: 8, paddingLeft: 20, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0 }}>—</span>
                    {s}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* 6. Feature Specs */}
        <div id="sec-features">
          <SectionHeader number="6" title="기능 명세" subtitle={`총 ${totalFeatures}개 기능 · 우선순위별 분류`} />
          {prdData.featureModules?.map((module, idx) => (
            <ModuleCard key={idx} module={module} />
          ))}
        </div>

        {/* F10: 기능 의존성 시각화 */}
        {prdData.featureModules?.length > 1 && (
          <Card style={{ marginTop: 8 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 12px 0' }}>
              🔗 기능 모듈 의존성 매트릭스
            </h3>
            <p style={{ fontSize: 11, color: C.textTertiary, margin: '0 0 14px 0' }}>
              모듈 간 연관도를 나타냅니다. 진한 셀은 높은 의존성을 의미합니다.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: C.textPrimary, borderBottom: `2px solid ${C.border}`, minWidth: 100 }}></th>
                    {prdData.featureModules.map((m, i) => (
                      <th key={i} style={{
                        padding: '8px 6px', textAlign: 'center', fontWeight: 600, color: C.textSecondary,
                        borderBottom: `2px solid ${C.border}`, fontSize: 10, maxWidth: 80,
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
                        // 간단한 의존성 스코어링: 같은 priority면 높음, 공유 키워드가 많으면 높음
                        const sharedKeywords = rowMod.features.filter(rf =>
                          colMod.features.some(cf =>
                            rf.subFeatures?.some(sf => cf.name.includes(sf.split(' ')[0])) ||
                            cf.subFeatures?.some(sf => rf.name.includes(sf.split(' ')[0]))
                          )
                        ).length;
                        const samePriority = rowMod.priority === colMod.priority ? 1 : 0;
                        const score = Math.min(sharedKeywords + samePriority, 3);
                        const colors = ['transparent', 'rgba(37,99,235,0.08)', 'rgba(37,99,235,0.18)', 'rgba(37,99,235,0.35)'];
                        return (
                          <td key={ci} style={{
                            padding: 4, textAlign: 'center',
                            background: colors[score],
                            border: `1px solid ${C.borderLight}`,
                          }}>
                            {score > 0 && <span style={{ fontSize: 10, color: score >= 2 ? C.blue : C.textTertiary }}>
                              {'●'.repeat(score)}
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

        {/* 7. Tech Stack */}
        <div id="sec-tech">
          <SectionHeader number="7" title="기술 스택 권장안" subtitle="프로젝트 특성에 맞는 기술 구성" />
          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F1F5F9' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: C.textPrimary, borderBottom: `2px solid ${C.border}` }}>분류</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: C.textPrimary, borderBottom: `2px solid ${C.border}` }}>기술</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: C.textPrimary, borderBottom: `2px solid ${C.border}` }}>선정 근거</th>
                  </tr>
                </thead>
                <tbody>
                  {prdData.techStack?.map((t, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                      <td style={{ padding: '10px 14px', color: C.textTertiary, fontSize: 12 }}>{typeof t === 'object' ? t.category : '-'}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: C.textPrimary }}>
                        <span style={{ background: C.blueBg, padding: '3px 10px', borderRadius: 6 }}>
                          {typeof t === 'object' ? t.tech : t}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: C.textSecondary, fontSize: 12 }}>{typeof t === 'object' ? t.rationale : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* 8. NFR */}
        <div id="sec-nfr">
          <SectionHeader number="8" title="비기능 요구사항 (NFR)" subtitle="성능, 보안, 접근성, 규정준수" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {prdData.nonFunctionalRequirements?.map((nfr, idx) => {
              const icons: Record<string, string> = { '보안': '🔒', '성능': '⚡', '접근성': '♿', '규정': '📜' };
              const icon = Object.entries(icons).find(([k]) => nfr.category.includes(k))?.[1] || '📋';
              return (
                <Card key={idx}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 12px 0' }}>
                    {icon} {nfr.category}
                  </h3>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {nfr.items?.map((item, i) => (
                      <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8, paddingLeft: 14, position: 'relative', lineHeight: 1.5 }}>
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

        {/* 9. Timeline */}
        <div id="sec-timeline">
          <SectionHeader number="9" title="일정 계획" subtitle="단계별 일정 및 산출물" />
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
                          padding: '3px 8px', borderRadius: 4,
                        }}>{d}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 10. Assumptions & Constraints */}
        <div id="sec-assumptions">
          <SectionHeader number="10" title="전제 조건 & 제약사항" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
            <Card>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 12px 0' }}>📌 전제 조건 (Assumptions)</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {prdData.assumptions?.map((a, i) => (
                  <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8, paddingLeft: 16, position: 'relative', lineHeight: 1.5 }}>
                    <span style={{ position: 'absolute', left: 0 }}>•</span>{a}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 12px 0' }}>🚧 제약사항 (Constraints)</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {prdData.constraints?.map((c, i) => (
                  <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8, paddingLeft: 16, position: 'relative', lineHeight: 1.5 }}>
                    <span style={{ position: 'absolute', left: 0 }}>•</span>{c}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* 11. Risk Register */}
        <div id="sec-risks">
          <SectionHeader number="11" title="리스크 관리" subtitle="예상 리스크 및 대응 전략" />
          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F1F5F9' }}>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: C.textPrimary, borderBottom: `2px solid ${C.border}` }}>리스크</th>
                    <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700, color: C.textPrimary, borderBottom: `2px solid ${C.border}`, width: 70 }}>영향도</th>
                    <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, color: C.textPrimary, borderBottom: `2px solid ${C.border}` }}>대응 전략</th>
                  </tr>
                </thead>
                <tbody>
                  {prdData.risks?.map((r, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                      <td style={{ padding: '10px 14px', color: C.textSecondary }}>{r.risk}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                          background: r.impact === '높음' ? C.redBg : C.yellowBg,
                          color: r.impact === '높음' ? C.red : C.yellow,
                        }}>{r.impact}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: C.textSecondary, fontSize: 12 }}>{r.mitigation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* 12. Expert Insight (conditional) */}
        {prdData.expertInsight && (
          <div id="sec-expert">
            <SectionHeader number="12" title="AI 전문가 인사이트" subtitle="위시켓 프로젝트 데이터 기반 분석" />
            <Card style={{ borderLeft: `4px solid ${C.purple}`, background: C.purpleBg }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: C.purple, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                }}>💡</div>
                <EditableText
                  value={prdData.expertInsight}
                  onChange={(v) => setPrdData({ ...prdData, expertInsight: v })}
                  style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}
                  sectionKey="expertInsight" sectionTitle="AI 전문가 인사이트" projectContext={projectCtx}
                />
              </div>
            </Card>
          </div>
        )}

        {/* 13. Glossary */}
        <div id="sec-glossary">
          <SectionHeader number={prdData.expertInsight ? '13' : '12'} title="용어 정의" subtitle="본 문서에서 사용되는 주요 용어" />
          <Card>
            <div style={{ display: 'grid', gap: 8 }}>
              {prdData.glossary?.map((g, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: i < (prdData.glossary?.length || 0) - 1 ? `1px solid ${C.borderLight}` : 'none' }}>
                  <span style={{
                    fontWeight: 700, fontSize: 13, color: C.blue,
                    minWidth: 70, fontFamily: '"SF Mono", Monaco, monospace',
                  }}>{g.term}</span>
                  <span style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>{g.definition}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

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

        {/* ━━ Action Buttons ━━ */}
        <div style={{
          display: 'flex', gap: 12, marginTop: shareUrl ? 8 : 40, marginBottom: 40, flexWrap: 'wrap',
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
              padding: '14px 28px', borderRadius: 10,
              border: `1.5px solid ${C.blue}`, background: '#fff', color: C.blue,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {copied ? '✅ 복사됨!' : '📋 마크다운 복사'}
          </button>
          {/* F3: PDF 다운로드 */}
          <button
            onClick={handlePDF}
            disabled={pdfGenerating}
            style={{
              padding: '14px 24px', borderRadius: 10,
              border: `1.5px solid ${C.red}`, background: '#fff', color: C.red,
              fontSize: 14, fontWeight: 600, cursor: pdfGenerating ? 'wait' : 'pointer',
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
              padding: '14px 24px', borderRadius: 10,
              border: `1.5px solid ${C.blue}`, background: '#fff', color: C.blue,
              fontSize: 14, fontWeight: 600, cursor: docxGenerating ? 'wait' : 'pointer',
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
              padding: '14px 20px', borderRadius: 10,
              border: `1.5px solid ${C.border}`, background: '#fff', color: C.textSecondary,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            🖨️ 인쇄
          </button>
        </div>

        {/* ━━ Wishket CTA Section ━━ */}
        <div className="no-print" style={{
          background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)',
          borderRadius: 16,
          padding: '36px 32px',
          marginTop: 20,
          marginBottom: 40,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
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
                    padding: '12px 28px', borderRadius: 10, border: 'none',
                    background: ctaSubmitting ? 'rgba(255,255,255,0.3)' : '#fff',
                    color: ctaSubmitting ? '#fff' : '#2563EB',
                    fontSize: 14, fontWeight: 700, cursor: ctaSubmitting ? 'wait' : 'pointer',
                    flexShrink: 0, transition: 'all 0.2s',
                  }}
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
          textAlign: 'center', paddingTop: 24, borderTop: `1px solid ${C.border}`,
          fontSize: 11, color: C.textTertiary,
        }}>
          <p style={{ margin: '0 0 4px 0' }}>
            본 문서는 AI 기반으로 자동 생성되었으며, 실제 개발 착수 전 상세 검토가 필요합니다.
          </p>
          <p style={{ margin: 0 }}>
            Wishket AI PRD Builder · © {new Date().getFullYear()} Wishket
          </p>
        </div>
      </div>
    </div>
  );
}
