'use client';

// AI RFP Builder — Result Page v10 (Enhanced with TOC, Features, Share)
// 핵심 원칙: PRD 문서가 히어로. 탭/아코디언 없이 바로 보여준다.
// 프로페셔널 문서 레이아웃. 컨설팅 산출물 수준의 WOW.

import { useState, useEffect, useCallback, useRef } from 'react';
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
  orange: '#F59E0B', red: '#EF4444', purple: '#8B5CF6',
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

// ━━━━━ Feature Parser & Card ━━━━━
interface Feature {
  name: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  estimatedWeeks: string;
  description: string;
  subFeatures: string[];
  criteria: string[];
  flow: string;
  screens: string[];
  businessRules: string[];
  errorCases: string[];
  dataModels: string[];
}

function parseFeatures(text: string): Feature[] {
  const features: Feature[] = [];

  // First, try to parse new detailed format (---FEATURE_DETAIL_START---)
  const detailRegex = /---FEATURE_DETAIL_START---([\s\S]*?)---FEATURE_DETAIL_END---/g;
  let match;

  while ((match = detailRegex.exec(text)) !== null) {
    const block = match[1];
    const feature = parseDetailedFeatureBlock(block);
    if (feature) features.push(feature);
  }

  // If no detailed features found, fall back to table parsing
  if (features.length === 0) {
    const lines = text.split('\n');
    let i = 0;

    while (i < lines.length) {
      if (lines[i].trim().startsWith('|') && lines[i].includes('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i]);
          i++;
        }

        const rows = tableLines
          .filter(l => !l.trim().match(/^\|[\s-|]+\|$/))
          .map(l => l.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1).map(cell => cell.trim()));

        if (rows.length > 1) {
          const headerRow = rows[0];
          const dataRows = rows.slice(1);
          const nameIdx = headerRow.findIndex(h => h.toLowerCase().includes('기능') || h.toLowerCase().includes('name'));
          const priorityIdx = headerRow.findIndex(h => h.toLowerCase().includes('우선') || h.toLowerCase().includes('priority'));
          const descIdx = headerRow.findIndex(h => h.toLowerCase().includes('설명') || h.toLowerCase().includes('desc'));

          for (const row of dataRows) {
            if (row.length > 0) {
              const featureName = nameIdx >= 0 && row[nameIdx] ? row[nameIdx] : row[0];
              const priorityStr = priorityIdx >= 0 && row[priorityIdx] ? row[priorityIdx] : 'P2';
              const desc = descIdx >= 0 && row[descIdx] ? row[descIdx] : '';
              const priority = priorityStr.match(/P[0-3]/) ? (priorityStr.match(/P[0-3]/)![0] as 'P0' | 'P1' | 'P2' | 'P3') : 'P2';

              features.push({
                name: featureName,
                priority,
                estimatedWeeks: '',
                description: desc,
                subFeatures: [],
                criteria: [],
                flow: '',
                screens: [],
                businessRules: [],
                errorCases: [],
                dataModels: [],
              });
            }
          }
        }
        continue;
      }
      i++;
    }
  }

  return features;
}

function parseDetailedFeatureBlock(block: string): Feature | null {
  const lines = block.split('\n');
  const feature: Feature = {
    name: '',
    priority: 'P2',
    estimatedWeeks: '',
    description: '',
    subFeatures: [],
    criteria: [],
    flow: '',
    screens: [],
    businessRules: [],
    errorCases: [],
    dataModels: [],
  };

  let currentSection = '';
  let sectionContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse title (### 1. Name)
    if (trimmed.match(/^###\s+\d+\.\s+/)) {
      feature.name = trimmed.replace(/^###\s+\d+\.\s+/, '').trim();
      continue;
    }

    // Parse priority & estimated weeks (**우선순위:** ... | **예상 공수:** ...)
    if (trimmed.includes('우선순위') || trimmed.includes('priority')) {
      const priorityMatch = trimmed.match(/P[0-3]/);
      if (priorityMatch) feature.priority = priorityMatch[0] as 'P0' | 'P1' | 'P2' | 'P3';

      const weeksMatch = trimmed.match(/(\d+[~-]?\d*)\s*(주|week)/);
      if (weeksMatch) feature.estimatedWeeks = weeksMatch[1];
      continue;
    }

    // Detect section headers
    if (trimmed.match(/^\*\*(.+)\*\*\s*$/)) {
      const sectionName = trimmed.replace(/\*\*/g, '').trim();

      // Save previous section
      if (currentSection && sectionContent.length > 0) {
        assignSectionContent(feature, currentSection, sectionContent);
      }

      currentSection = sectionName;
      sectionContent = [];
      continue;
    }

    // Code block for flow (```...```)
    if (trimmed.startsWith('```')) {
      if (!currentSection) currentSection = '사용자 흐름';
      sectionContent.push(line);
      continue;
    }

    // Collect section content
    if (currentSection && trimmed.length > 0 && !trimmed.startsWith('###')) {
      sectionContent.push(line);
    }
  }

  // Don't forget last section
  if (currentSection && sectionContent.length > 0) {
    assignSectionContent(feature, currentSection, sectionContent);
  }

  return feature.name ? feature : null;
}

function assignSectionContent(feature: Feature, sectionName: string, lines: string[]): void {
  const content = lines.join('\n').trim();
  const cleanContent = content.replace(/```[\s\S]*?```/g, '').trim();

  switch (sectionName) {
    case '설명':
      feature.description = cleanContent;
      break;
    case '서브 기능':
    case 'Sub Features':
      feature.subFeatures = lines
        .filter(l => l.trim().match(/^[-*]\s+/))
        .map(l => l.trim().replace(/^[-*]\s+/, ''));
      break;
    case '수용 기준':
    case '수락 기준':
    case 'Acceptance Criteria':
      feature.criteria = lines
        .filter(l => l.trim().match(/^\d+\.\s+/) || l.trim().match(/^[-*]\s+/))
        .map(l => l.trim().replace(/^\d+\.\s+|^[-*]\s+/, ''));
      break;
    case '사용자 흐름':
    case 'User Flow':
      const flowCode = content.match(/```([\s\S]*?)```/);
      feature.flow = flowCode ? flowCode[1].trim() : cleanContent;
      break;
    case '화면 상세':
    case 'Screen Details':
      feature.screens = lines
        .filter(l => l.trim().length > 0)
        .map(l => l.trim());
      break;
    case '비즈니스 규칙':
    case 'Business Rules':
      feature.businessRules = lines
        .filter(l => l.trim().match(/^[-*]\s+/))
        .map(l => l.trim().replace(/^[-*]\s+/, ''));
      break;
    case '에러 처리':
    case 'Error Handling':
      feature.errorCases = lines
        .filter(l => l.trim().match(/^[-*]\s+/))
        .map(l => l.trim().replace(/^[-*]\s+/, ''));
      break;
    case '데이터 모델':
    case 'Data Models':
      feature.dataModels = lines
        .filter(l => l.trim().match(/^[-*]\s+/))
        .map(l => l.trim().replace(/^[-*]\s+/, ''));
      break;
  }
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set(['sub-features', 'criteria']));

  const priorityColors: Record<'P0' | 'P1' | 'P2' | 'P3', string> = {
    P0: C.red,
    P1: C.orange,
    P2: C.textTertiary,
    P3: '#D1D5DB',
  };

  const priorityBg: Record<'P0' | 'P1' | 'P2' | 'P3', string> = {
    P0: 'rgba(239, 68, 68, 0.08)',
    P1: 'rgba(245, 158, 11, 0.08)',
    P2: 'rgba(148, 163, 184, 0.08)',
    P3: 'rgba(209, 213, 219, 0.08)',
  };

  const toggleSubsection = (id: string) => {
    setExpandedSubs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const subsections: { id: string; title: string; icon: string; hasContent: boolean }[] = [
    { id: 'sub-features', title: '서브 기능', icon: '📌', hasContent: feature.subFeatures.length > 0 },
    { id: 'criteria', title: '수용 기준', icon: '✅', hasContent: feature.criteria.length > 0 },
    { id: 'flow', title: '사용자 흐름', icon: '🔄', hasContent: !!feature.flow },
    { id: 'screens', title: '화면 상세', icon: '🖼️', hasContent: feature.screens.length > 0 },
    { id: 'business', title: '비즈니스 규칙', icon: '📋', hasContent: feature.businessRules.length > 0 },
    { id: 'errors', title: '에러 처리', icon: '⚠️', hasContent: feature.errorCases.length > 0 },
    { id: 'data', title: '데이터 모델', icon: '🗄️', hasContent: feature.dataModels.length > 0 },
  ];

  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      marginBottom: 14,
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: `1px solid ${C.borderLight}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: C.blueBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          fontWeight: 700,
          color: C.blue,
          flexShrink: 0,
        }}>
          {index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              {feature.name}
            </h3>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: 6,
              background: priorityBg[feature.priority],
              color: priorityColors[feature.priority],
            }}>
              {feature.priority}
            </span>
            {feature.estimatedWeeks && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: C.textTertiary,
                padding: '4px 8px',
                borderRadius: 6,
                background: C.blueBg,
              }}>
                ⏱️ {feature.estimatedWeeks}
              </span>
            )}
          </div>
          {feature.description && (
            <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>
              {feature.description}
            </p>
          )}
        </div>
      </div>

      {/* Collapsible Subsections */}
      <div>
        {subsections.filter(s => s.hasContent).map((sub, idx) => (
          <div key={sub.id}>
            <button
              onClick={() => toggleSubsection(sub.id)}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: 'none',
                border: 'none',
                borderBottom: idx < subsections.filter(s => s.hasContent).length - 1 ? `1px solid ${C.borderLight}` : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                justifyContent: 'space-between',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.borderLight; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14 }}>{sub.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
                  {sub.title}
                </span>
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 20,
                height: 20,
                color: C.textTertiary,
                transition: 'transform 0.2s',
                transform: expandedSubs.has(sub.id) ? 'rotate(0deg)' : 'rotate(-90deg)',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
              </span>
            </button>

            {/* Content */}
            {expandedSubs.has(sub.id) && (
              <div style={{
                padding: '16px 20px 16px 44px',
                background: C.white,
                color: C.textSecondary,
                fontSize: 13.5,
                lineHeight: 1.7,
              }}>
                {sub.id === 'sub-features' && feature.subFeatures.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
                    {feature.subFeatures.map((item, i) => <li key={i} style={{ marginBottom: 6, color: C.textSecondary }}>{item}</li>)}
                  </ul>
                )}

                {sub.id === 'criteria' && feature.criteria.length > 0 && (
                  <ol style={{ margin: 0, paddingLeft: 18 }}>
                    {feature.criteria.map((item, i) => <li key={i} style={{ marginBottom: 6, color: C.textSecondary }}>{item}</li>)}
                  </ol>
                )}

                {sub.id === 'flow' && feature.flow && (
                  <pre style={{
                    margin: '0 0 0 0',
                    padding: '12px 14px',
                    background: '#F8FAFC',
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                    fontSize: 12,
                    lineHeight: 1.8,
                    fontFamily: "'SF Mono', 'Fira Code', Menlo, monospace",
                    color: C.textPrimary,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    overflowX: 'auto',
                  }}>
                    {feature.flow}
                  </pre>
                )}

                {sub.id === 'screens' && feature.screens.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
                    {feature.screens.map((item, i) => <li key={i} style={{ marginBottom: 6, color: C.textSecondary }}>{item}</li>)}
                  </ul>
                )}

                {sub.id === 'business' && feature.businessRules.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
                    {feature.businessRules.map((item, i) => <li key={i} style={{ marginBottom: 6, color: C.textSecondary }}>{item}</li>)}
                  </ul>
                )}

                {sub.id === 'errors' && feature.errorCases.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
                    {feature.errorCases.map((item, i) => <li key={i} style={{ marginBottom: 6, color: C.textSecondary }}>{item}</li>)}
                  </ul>
                )}

                {sub.id === 'data' && feature.dataModels.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
                    {feature.dataModels.map((item, i) => <li key={i} style={{ marginBottom: 6, color: C.textSecondary }}>{item}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
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

// ━━━━━ Generate AI Project Title ━━━━━
function generateProjectTitle(overview: string): string {
  if (!overview) return 'PRD 기획서';
  const firstLine = overview.split('\n')[0].trim();
  // Take first 6 words, clean it up
  const words = firstLine.split(/\s+/).slice(0, 6).join(' ');
  return words.slice(0, 50) || 'PRD 기획서';
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
  const [shareUrl, setShareUrl] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const sections = parseRFPSections(rfpDocument);
  const metrics = extractMetrics(rfpDocument);
  const features = parseFeatures(rfpDocument);
  const projectName = generateProjectTitle(rfpData.overview);

  // Initialize expanded sections (first 3 expanded)
  useEffect(() => {
    if (sections.length > 0 && expandedSections.size === 0) {
      const initialExpanded = new Set<string>();
      sections.slice(0, 3).forEach(s => initialExpanded.add(s.id));
      setExpandedSections(initialExpanded);
      setActiveSection(sections[0]?.id || '');
    }
  }, [sections, expandedSections]);

  // ━━ IntersectionObserver for TOC active tracking ━━
  useEffect(() => {
    if (phase !== 'result' && phase !== 'consultation') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-section-id');
            if (id) setActiveSection(id);
            break;
          }
        }
      },
      { threshold: 0.3 }
    );

    document.querySelectorAll('[data-section-id]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [phase, sections]);

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
      const res = await fetch('/api/send-rfp-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: targetEmail, rfpDocument: doc, projectName }) });
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

  const handleCreateShareLink = async () => {
    setShareLoading(true);
    try {
      const res = await fetch('/api/share-prd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfpDocument, rfpData, projectName }),
      });
      const data = await res.json();
      if (data.share_id) {
        const url = `${window.location.origin}/share/${data.share_id}`;
        setShareUrl(url);
        await copyToClipboard(url);
      }
    } catch { /* ignore */ } finally { setShareLoading(false); }
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

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  // ━━━━━ Phase: Result — TOC + Collapsible + Features ━━━━━
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
          <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: C.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{projectName}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCreateShareLink} disabled={shareLoading} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 8,
                border: `1.5px solid ${C.blue}`,
                background: C.blueBg,
                color: C.blue,
                fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                공유 링크
              </button>
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

        {/* ━━ Main Layout: TOC + Content ━━ */}
        <div style={{ display: 'flex', maxWidth: '100%' }}>

          {/* ━━ Table of Contents Sidebar (Desktop only) ━━ */}
          <div style={{
            position: 'sticky',
            top: 50,
            width: 240,
            height: 'calc(100vh - 50px)',
            overflowY: 'auto',
            padding: '24px 16px',
            borderRight: `1px solid ${C.border}`,
            background: C.white,
            display: 'none',
          }} className="toc-sidebar">
            <h4 style={{ fontSize: 12, fontWeight: 700, color: C.textTertiary, marginBottom: 16, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>목차</h4>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: activeSection === section.id ? C.blueBg : 'transparent',
                    border: 'none',
                    color: activeSection === section.id ? C.blue : C.textSecondary,
                    fontSize: 13,
                    fontWeight: activeSection === section.id ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {section.title}
                </button>
              ))}
            </nav>
            <style>{`
              @media (min-width: 1280px) {
                .toc-sidebar { display: block; }
              }
            `}</style>
          </div>

          {/* ━━ Document Container ━━ */}
          <div style={{ flex: 1, padding: '24px 16px 40px' }} ref={contentRef}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>

              {/* ━━ Email Notification ━━ */}
              {emailSent && !isGuest && (
                <div style={{ padding: '10px 14px', marginBottom: 16, borderRadius: 8, background: C.greenBg, border: `1px solid rgba(34, 197, 94, 0.15)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
                  <span style={{ fontSize: 13, color: '#15803D', fontWeight: 500 }}><strong>{email}</strong>로 PRD가 발송되었습니다</span>
                </div>
              )}

              {/* ━━ Share Link Success ━━ */}
              {shareUrl && (
                <div style={{ padding: '12px 14px', marginBottom: 16, borderRadius: 8, background: C.blueBg, border: `1px solid rgba(37, 99, 235, 0.15)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  <span style={{ fontSize: 13, color: C.blue, fontWeight: 500 }}>공유 링크가 복사되었습니다</span>
                </div>
              )}

              {/* ━━ Document Hero Header ━━ */}
              <div style={{
                background: C.paper, borderRadius: 16, marginBottom: 2,
                border: `1px solid ${C.border}`, overflow: 'hidden',
              }}>
                <div style={{ height: 4, background: C.gradient }} />
                <div style={{ padding: '32px 36px 28px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: 1.5, marginBottom: 12 }}>WISHKET AI PRD BUILDER</div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: C.textPrimary, lineHeight: 1.35, marginBottom: 20, wordBreak: 'keep-all' }}>
                    {projectName}
                  </h1>

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

              {/* ━━ Features Section (Card-based) ━━ */}
              {features.length > 0 && (
                <div style={{
                  background: C.paper, border: `1px solid ${C.border}`,
                  borderTop: 'none', padding: '28px 36px',
                }}>
                  <h2 style={{
                    fontSize: 17, fontWeight: 700, color: C.textPrimary, margin: 0,
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
                  }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 26, height: 26, borderRadius: 7,
                      background: C.blueBg, color: C.blue,
                      fontSize: 12, fontWeight: 700,
                    }}>
                      🎯
                    </span>
                    핵심 기능
                  </h2>
                  <div>
                    {features.map((feature, idx) => (
                      <FeatureCard key={idx} feature={feature} index={idx} />
                    ))}
                  </div>
                </div>
              )}

              {/* ━━ PRD Document Body — Collapsible Sections ━━ */}
              <div style={{
                background: C.paper, border: `1px solid ${C.border}`,
                borderTop: features.length > 0 ? 'none' : 'none', borderRadius: features.length > 0 ? '0 0 16px 16px' : '0 0 16px 16px',
              }}>
                {sections.map((section, idx) => (
                  <div key={section.id} data-section-id={section.id} style={{
                    padding: '28px 36px',
                    borderTop: idx > 0 ? `1px solid ${C.borderLight}` : 'none',
                  }}>
                    {/* 섹션 제목 (Clickable to toggle) */}
                    <button onClick={() => toggleSection(section.id)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      marginBottom: 16,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}>
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
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        transition: 'transform 0.2s',
                        transform: expandedSections.has(section.id) ? 'rotate(0deg)' : 'rotate(-90deg)',
                        color: C.textTertiary,
                        flexShrink: 0,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                      </span>
                    </button>

                    {/* 섹션 본문 (Collapsible) */}
                    {expandedSections.has(section.id) && (
                      <div style={{
                        fontSize: 14.5, lineHeight: 1.9, color: C.textSecondary,
                        whiteSpace: 'pre-wrap', wordBreak: 'keep-all',
                        paddingLeft: 36,
                        animation: 'fadeIn 0.2s ease',
                      }}>
                        <SectionContent content={section.content} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ━━ 문서 끝 — 다음 단계 ━━ */}
              <div style={{ marginTop: 32 }}>

                <div style={{
                  padding: '14px 20px', marginBottom: 16, borderRadius: 10,
                  background: C.blueBg, border: `1px solid rgba(37, 99, 235, 0.1)`,
                  fontSize: 14, color: C.blue, fontWeight: 500, textAlign: 'center',
                }}>
                  이 PRD를 개발사 3~5곳에 동일하게 전달하면 정확한 견적 비교가 가능합니다
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
                  <button onClick={handleCreateShareLink} disabled={shareLoading} style={{
                    padding: '18px 16px', borderRadius: 12, border: `1px solid ${C.border}`,
                    background: C.white, cursor: 'pointer', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>🔗</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>공유 링크</div>
                    <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 2 }}>생성 및 복사</div>
                  </button>
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

                {!consultationSubmitted && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    <a href="https://www.wishket.com/project/register/?utm_source=ai-rfp&utm_medium=web&utm_campaign=rfp-complete" target="_blank" rel="noopener noreferrer" style={{
                      display: 'block', textDecoration: 'none', background: C.gradient, borderRadius: 14, padding: '22px 24px', color: C.white, boxShadow: '0 4px 16px rgba(37, 99, 235, 0.25)',
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, opacity: 0.7, marginBottom: 6 }}>추천</div>
                      <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>위시켓에서 개발사 찾기</h3>
                      <p style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5, marginBottom: 14 }}>이 PRD로 바로 등록 → 48시간 내 검증된 개발사 제안</p>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 7, background: 'rgba(255,255,255,0.15)', fontWeight: 600, fontSize: 13 }}>
                        무료로 시작하기→
                      </span>
                    </a>

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

                <div style={{ padding: '12px 0', marginTop: 24, textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: C.textTertiary, margin: 0 }}>Powered by Wishket AI PRD Builder · 13년 외주 경험 · 7만+ 프로젝트 매칭 데이터</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
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
