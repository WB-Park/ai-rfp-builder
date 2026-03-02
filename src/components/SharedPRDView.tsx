'use client';
import { useState, useCallback, useEffect, useRef } from 'react';

interface SharedPRDViewProps {
  rfpDocument: string;
  projectName: string;
  rfpData: Record<string, unknown> | null;
  shareId: string;
  viewCount: number;
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
  blue: '#2563EB', blueLight: '#3B82F6', blueSoft: '#60A5FA',
  blueBg: 'rgba(37, 99, 235, 0.05)', bluePale: '#DBEAFE',
  bg: '#F8FAFC', white: '#FFFFFF',
  textPrimary: '#0F172A', textSecondary: '#475569', textTertiary: '#94A3B8',
  border: '#E2E8F0', borderLight: '#F1F5F9',
  green: '#22C55E', greenBg: 'rgba(34, 197, 94, 0.06)',
  yellow: '#F59E0B', yellowBg: 'rgba(245, 158, 11, 0.06)',
  red: '#EF4444', redBg: 'rgba(239, 68, 68, 0.06)',
  purple: '#8B5CF6', purpleBg: 'rgba(139, 92, 246, 0.06)',
  gradient: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)',
};

// ━━━━━ Sub Components ━━━━━
function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 20, marginTop: 36 }} id={`sec-${number}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          background: C.gradient, color: '#fff', width: 32, height: 32, borderRadius: 8,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, flexShrink: 0,
        }}>{number}</span>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: -0.3 }}>{title}</h2>
      </div>
      {subtitle && <p style={{ fontSize: 12, color: C.textTertiary, margin: '8px 0 0 44px', lineHeight: 1.5 }}>{subtitle}</p>}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: '24px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.03)', ...style,
    }}>{children}</div>
  );
}

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
    }}>{priority} · {label}</span>
  );
}

function DetailList({ title, items, icon }: { title: string; items: string[]; icon?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h6 style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</h6>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((item, i) => (
          <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 5, paddingLeft: 16, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0 }}>{icon || '•'}</span>{item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureCard({ feature, index, defaultExpanded }: { feature: PRDResult['featureModules'][0]['features'][0]; index: string; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded || false);
  const hasDetail = (feature.subFeatures?.length > 0) || feature.userFlow || (feature.screenSpecs?.length > 0) || (feature.acceptanceCriteria?.length > 0);

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
      <button onClick={() => hasDetail && setExpanded(!expanded)} style={{
        width: '100%', padding: '14px 16px', background: 'none', border: 'none',
        cursor: hasDetail ? 'pointer' : 'default', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', textAlign: 'left',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, fontFamily: 'monospace' }}>{index}</span>
            <h5 style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{feature.name}</h5>
          </div>
          <p style={{ fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>{feature.description}</p>
        </div>
        {hasDetail && (
          <div style={{
            width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s',
            color: C.textTertiary, flexShrink: 0, marginLeft: 12, marginTop: 2,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        )}
      </button>
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px', background: C.blueBg }}>
          {feature.subFeatures?.length > 0 && <DetailList title="하위 기능" items={feature.subFeatures} />}
          {feature.acceptanceCriteria?.length > 0 && <DetailList title="수락 기준 (AC)" items={feature.acceptanceCriteria} icon="✅" />}
          {feature.userFlow && feature.userFlow !== '(사용자 흐름 미정의)' && (
            <div style={{ marginBottom: 14 }}>
              <h6 style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>사용자 흐름</h6>
              <pre style={{
                background: '#F1F5F9', border: `1px solid ${C.border}`, borderRadius: 8,
                padding: 12, fontSize: 11, color: C.textSecondary, fontFamily: '"SF Mono", Monaco, monospace',
                overflow: 'auto', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>{feature.userFlow}</pre>
            </div>
          )}
          {feature.screenSpecs?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <h6 style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>화면 명세</h6>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr style={{ background: '#F1F5F9' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>화면</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>목적</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>UI 요소</th>
                  </tr></thead>
                  <tbody>{feature.screenSpecs.map((spec, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                      <td style={{ padding: '8px 12px', color: C.textSecondary, fontWeight: 600 }}>{spec.name}</td>
                      <td style={{ padding: '8px 12px', color: C.textSecondary }}>{spec.purpose}</td>
                      <td style={{ padding: '8px 12px', color: C.textSecondary }}>{spec.elements?.join(', ')}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          {feature.businessRules?.length > 0 && <DetailList title="비즈니스 규칙" items={feature.businessRules} icon="📋" />}
          {feature.errorCases?.length > 0 && <DetailList title="에러 케이스" items={feature.errorCases} icon="⚠️" />}
          {feature.dataEntities?.length > 0 && (
            <div>
              <h6 style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>데이터 엔티티</h6>
              {feature.dataEntities.map((entity, i) => (
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

function ModuleSection({ module }: { module: PRDResult['featureModules'][0] }) {
  const [expanded, setExpanded] = useState(module.priority === 'P0');
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
      overflow: 'hidden', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    }}>
      <button onClick={() => setExpanded(!expanded)} style={{
        width: '100%', padding: '18px 20px', background: 'none', border: 'none',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{module.name}</h4>
            <PriorityBadge priority={module.priority} label={module.priorityLabel} />
          </div>
          <span style={{ fontSize: 12, color: C.textTertiary }}>{module.features?.length || 0}개 기능 포함</span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textTertiary} strokeWidth="2" strokeLinecap="round"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '18px 20px', background: 'rgba(248,250,252,0.5)' }}>
          {module.features?.map((feature, idx) => (
            <FeatureCard key={idx} feature={feature} index={feature.id || `${module.priority}-${idx + 1}`} defaultExpanded={idx === 0} />
          ))}
        </div>
      )}
    </div>
  );
}

// ━━━━━ Main Component ━━━━━
export default function SharedPRDView({ rfpDocument, projectName, shareId, viewCount }: SharedPRDViewProps) {
  const [copied, setCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [prdData, setPrdData] = useState<PRDResult | null>(null);
  const [showToc, setShowToc] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Parse JSON PRDResult
  useEffect(() => {
    try {
      const parsed = JSON.parse(rfpDocument);
      if (parsed?.projectName && parsed?.featureModules) {
        setPrdData(parsed);
      }
    } catch {
      // fallback: not JSON — will show raw text below
    }
  }, [rfpDocument]);

  const copyToClipboard = useCallback(async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    }
  }, []);

  const handleCopyAll = useCallback(() => {
    if (!prdData) {
      copyToClipboard(rfpDocument);
    } else {
      // Generate markdown
      let md = `# ${prdData.projectName} — PRD 기획서\n`;
      md += `> v${prdData.documentMeta?.version || '1.0'} | ${prdData.documentMeta?.createdAt || '-'}\n\n`;
      md += `## 1. Executive Summary\n${prdData.executiveSummary}\n\n`;
      md += `## 2. 프로젝트 개요\n${prdData.projectOverview}\n\n`;
      md += `## 3. 문제 정의\n${prdData.problemStatement}\n\n`;
      md += `## 4. 프로젝트 목표\n`;
      prdData.projectGoals?.forEach((g, i) => { md += `${i+1}. **${g.goal}** — ${g.metric}\n`; });
      md += `\n## 5. 타겟 사용자\n${prdData.targetUsers}\n\n`;
      md += `## 6. 기능 명세\n`;
      prdData.featureModules?.forEach(m => {
        md += `### ${m.name} (${m.priority})\n`;
        m.features?.forEach(f => { md += `#### ${f.id} ${f.name}\n${f.description}\n\n`; });
      });
      md += `## 7. 기술 스택\n`;
      prdData.techStack?.forEach(t => { md += `- **${t.tech}** (${t.category}): ${t.rationale}\n`; });
      md += `\n## 8. 예상 일정 (참고용)\n`;
      prdData.timeline?.forEach(t => { md += `- **${t.phase}** (${t.duration}): ${t.deliverables.join(', ')}\n`; });
      if (prdData.expertInsight) { md += `\n## 전문가 인사이트\n${prdData.expertInsight}\n`; }
      md += `\n---\nGenerated by Wishket AI PRD Builder\n`;
      copyToClipboard(md);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [prdData, rfpDocument, copyToClipboard]);

  const handleCopyUrl = useCallback(() => {
    copyToClipboard(window.location.href);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2500);
  }, [copyToClipboard]);

  const handlePrint = useCallback(() => { window.print(); }, []);

  // Scroll spy for TOC visibility
  useEffect(() => {
    const handleScroll = () => { setShowToc(window.scrollY > 400); };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const totalFeatures = prdData?.featureModules?.reduce((sum, m) => sum + (m.features?.length || 0), 0) || 0;

  const tocSections = prdData ? [
    { num: '1', title: 'Executive Summary' },
    { num: '2', title: '프로젝트 개요' },
    { num: '3', title: '문제 정의 & 목표' },
    { num: '4', title: '타겟 사용자' },
    { num: '5', title: '프로젝트 스코프' },
    { num: '6', title: '기능 명세' },
    { num: '7', title: '기술 스택' },
    { num: '8', title: '비기능 요구사항' },
    { num: '9', title: '예상 일정 (참고용)' },
    { num: '10', title: '전제 조건 & 제약사항' },
    { num: '11', title: '리스크 관리' },
    ...(prdData.expertInsight ? [{ num: '12', title: '전문가 인사이트' }] : []),
  ] : [];

  // ━━━ Fallback: raw text rendering (backward compat) ━━━
  if (!prdData) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}`, padding: '10px 16px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs><linearGradient id="stickyBg1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#2563EB"/><stop offset="100%" stopColor="#1D4ED8"/></linearGradient></defs>
                  <rect width="32" height="32" rx="8" fill="url(#stickyBg1)"/>
                  <rect x="8" y="5" width="16" height="20" rx="2" fill="white" opacity="0.95"/>
                  <path d="M20 5L24 9H20V5Z" fill="#BFDBFE"/>
                  <rect x="11" y="10" width="10" height="1.5" rx="0.75" fill="#2563EB" opacity="0.7"/>
                  <rect x="11" y="13.5" width="8" height="1.2" rx="0.6" fill="#93C5FD"/>
                  <rect x="11" y="16.5" width="9" height="1.2" rx="0.6" fill="#93C5FD"/>
                  <rect x="11" y="19.5" width="6" height="1.2" rx="0.6" fill="#93C5FD"/>
                  <circle cx="24" cy="22" r="5" fill="#F59E0B"/>
                  <path d="M24 18.5L24.8 21.2L27.5 22L24.8 22.8L24 25.5L23.2 22.8L20.5 22L23.2 21.2Z" fill="white"/>
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{projectName}</span>
            </div>
            <button onClick={handleCopyAll} style={{ padding: '7px 14px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.white, color: C.textSecondary, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {copied ? '✓ 복사됨' : '📋 전체 복사'}
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 40px' }}>
          <Card><pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: C.textSecondary, lineHeight: 1.8, margin: 0 }}>{rfpDocument}</pre></Card>
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <a href="https://www.wishket.com/project/register/?utm_source=ai-rfp&utm_medium=share" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12,
              background: C.gradient, color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: 15,
            }}>위시켓에서 개발사 찾기 →</a>
          </div>
        </div>
      </div>
    );
  }

  // ━━━ Structured PRD Rendering ━━━
  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Print + Mobile styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          div[style*="position: sticky"] { position: static !important; }
          * { box-shadow: none !important; }
        }
        @media (max-width: 640px) {
          .topbar-actions { gap: 4px !important; }
          .topbar-actions button { padding: 6px 8px !important; font-size: 12px !important; }
          .topbar-actions button .btn-label { display: none; }
          .hero-title { font-size: 24px !important; }
          .hero-stats { font-size: 11px !important; gap: 10px !important; }
        }
      `}</style>

      {/* ━━ Sticky Top Bar ━━ */}
      <div className="no-print" ref={headerRef} style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`, padding: '10px 16px',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, overflow: 'hidden', flexShrink: 0 }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs><linearGradient id="stickyBg2" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#2563EB"/><stop offset="100%" stopColor="#1D4ED8"/></linearGradient></defs>
                <rect width="32" height="32" rx="8" fill="url(#stickyBg2)"/>
                <rect x="8" y="5" width="16" height="20" rx="2" fill="white" opacity="0.95"/>
                <path d="M20 5L24 9H20V5Z" fill="#BFDBFE"/>
                <rect x="11" y="10" width="10" height="1.5" rx="0.75" fill="#2563EB" opacity="0.7"/>
                <rect x="11" y="13.5" width="8" height="1.2" rx="0.6" fill="#93C5FD"/>
                <rect x="11" y="16.5" width="9" height="1.2" rx="0.6" fill="#93C5FD"/>
                <rect x="11" y="19.5" width="6" height="1.2" rx="0.6" fill="#93C5FD"/>
                <circle cx="24" cy="22" r="5" fill="#F59E0B"/>
                <path d="M24 18.5L24.8 21.2L27.5 22L24.8 22.8L24 25.5L23.2 22.8L20.5 22L23.2 21.2Z" fill="white"/>
              </svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{prdData.projectName}</span>
            <span style={{ fontSize: 11, color: C.textTertiary, background: C.borderLight, padding: '2px 8px', borderRadius: 4 }}>
              조회 {viewCount}회
            </span>
          </div>
          <div className="topbar-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={handleCopyUrl} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8,
              border: `1.5px solid ${urlCopied ? C.green : C.border}`, background: urlCopied ? C.greenBg : C.white,
              color: urlCopied ? C.green : C.textSecondary, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>
              {urlCopied ? '✓' : '🔗'}<span className="btn-label">{urlCopied ? ' 링크 복사됨' : ' 링크 복사'}</span>
            </button>
            <button onClick={handleCopyAll} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8,
              border: `1.5px solid ${copied ? C.green : C.border}`, background: copied ? C.greenBg : C.white,
              color: copied ? C.green : C.textSecondary, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>
              {copied ? '✓' : '📋'}<span className="btn-label">{copied ? ' 복사됨' : ' 마크다운'}</span>
            </button>
            <button onClick={handlePrint} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8,
              border: `1.5px solid ${C.border}`, background: C.white,
              color: C.textSecondary, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>🖨️<span className="btn-label"> 인쇄</span></button>
          </div>
        </div>
      </div>

      {/* ━━ Floating TOC (desktop only via CSS) ━━ */}
      {showToc && (
        <>
          <style>{`
            .floating-toc-wrapper { display: none; }
            @media (min-width: 1200px) { .floating-toc-wrapper { display: block !important; } }
          `}</style>
          <div className="no-print floating-toc-wrapper" style={{
            position: 'fixed', right: 20, top: 80, zIndex: 50,
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
            border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 16px',
            maxWidth: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textTertiary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>목차</div>
            {tocSections.map(s => (
              <a key={s.num} href={`#sec-${s.num}`} style={{
                display: 'block', fontSize: 11, color: C.textSecondary, textDecoration: 'none',
                padding: '4px 0', lineHeight: 1.4, transition: 'color 0.15s',
              }} onMouseEnter={(e) => { e.currentTarget.style.color = C.blue; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.textSecondary; }}>
                {s.num}. {s.title}
              </a>
            ))}
          </div>
        </>
      )}

      {/* ━━ Hero Header ━━ */}
      <div style={{ background: C.gradient, color: '#fff', padding: '48px 20px 40px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 20,
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 20,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            PRD · 제품 요구사항 정의서
          </div>
          <h1 className="hero-title" style={{ fontSize: 36, fontWeight: 800, margin: '0 0 12px 0', lineHeight: 1.2, letterSpacing: -0.5 }}>{prdData.projectName}</h1>
          <div className="hero-stats" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, opacity: 0.85, marginTop: 16 }}>
            <span>📅 {prdData.documentMeta?.createdAt || '-'}</span>
            <span>📋 v{prdData.documentMeta?.version || '1.0'}</span>
            <span>⚙️ 기능 {totalFeatures}개</span>
            <span>👁️ 조회 {viewCount}회</span>
          </div>
        </div>
      </div>

      {/* ━━ Body ━━ */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* TOC Card */}
        <Card style={{ background: '#FAFBFD' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: C.textPrimary, margin: '0 0 14px 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>목차</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 6 }}>
            {tocSections.map(s => (
              <a key={s.num} href={`#sec-${s.num}`} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 8, textDecoration: 'none', color: C.textSecondary, fontSize: 13,
              }} onMouseEnter={(e) => { e.currentTarget.style.background = C.blueBg; e.currentTarget.style.color = C.blue; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSecondary; }}>
                <span style={{
                  background: C.blueBg, color: C.blue, width: 24, height: 24, borderRadius: 6,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>{s.num}</span>
                {s.title}
              </a>
            ))}
          </div>
        </Card>

        {/* 1. Executive Summary */}
        <SectionHeader number="1" title="Executive Summary" subtitle="프로젝트 핵심 요약" />
        <Card style={{ borderLeft: `4px solid ${C.blue}` }}>
          <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>{prdData.executiveSummary}</p>
        </Card>

        {/* 2. Project Overview */}
        <SectionHeader number="2" title="프로젝트 개요" subtitle="배경, 목적, 기대효과" />
        <Card>
          <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>{prdData.projectOverview}</p>
        </Card>

        {/* 3. Problem & Goals */}
        <SectionHeader number="3" title="문제 정의 & 프로젝트 목표" subtitle="해결하려는 문제와 성공 지표" />
        {prdData.problemStatement && (
          <Card style={{ borderLeft: `4px solid ${C.yellow}`, marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 8px 0' }}>🎯 문제 정의</h3>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{prdData.problemStatement}</p>
          </Card>
        )}
        {prdData.projectGoals?.length > 0 && (
          <Card>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 14px 0' }}>📊 프로젝트 목표 & 성공 지표</h3>
            <div style={{ display: 'grid', gap: 10 }}>
              {prdData.projectGoals.map((g, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: C.blueBg, borderRadius: 8, alignItems: 'flex-start' }}>
                  <span style={{
                    background: C.blue, color: '#fff', width: 22, height: 22, borderRadius: 6,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
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

        {/* 4. Target Users */}
        <SectionHeader number="4" title="타겟 사용자 & 페르소나" subtitle="주요 사용자 유형 및 니즈 분석" />
        <Card>
          <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.8, margin: '0 0 16px 0', whiteSpace: 'pre-wrap' }}>{prdData.targetUsers}</p>
          {prdData.userPersonas?.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {prdData.userPersonas.map((p, i) => (
                <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px', background: i === 0 ? C.blueBg : C.purpleBg }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: i === 0 ? C.blue : C.purple, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700,
                    }}>{p.name[0]}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: C.textTertiary }}>{p.role}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6 }}><strong>니즈:</strong> {p.needs}</div>
                  <div style={{ fontSize: 12, color: C.textSecondary }}><strong>불편사항:</strong> {p.painPoints}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 5. Scope */}
        <SectionHeader number="5" title="프로젝트 스코프" subtitle="포함/미포함 범위 정의" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          <Card style={{ borderLeft: `4px solid ${C.green}` }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.green, margin: '0 0 12px 0' }}>✅ 포함 범위</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {prdData.scopeInclusions?.map((s, i) => (
                <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8, paddingLeft: 20, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: C.green }}>✓</span>{s}
                </li>
              ))}
            </ul>
          </Card>
          {(prdData.scopeExclusions?.length ?? 0) > 0 && (
            <Card style={{ borderLeft: `4px solid ${C.textTertiary}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textTertiary, margin: '0 0 12px 0' }}>❌ 미포함</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {prdData.scopeExclusions!.map((s, i) => (
                  <li key={i} style={{ fontSize: 12, color: C.textTertiary, marginBottom: 8, paddingLeft: 20, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0 }}>—</span>{s}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* 6. Feature Specs */}
        <SectionHeader number="6" title="기능 명세" subtitle={`총 ${totalFeatures}개 기능 · 우선순위별 분류`} />
        {prdData.featureModules?.map((module, idx) => <ModuleSection key={idx} module={module} />)}

        {/* 7. Tech Stack */}
        <SectionHeader number="7" title="기술 스택 권장안" subtitle="프로젝트 특성에 맞는 기술 구성" />
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#F1F5F9' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, borderBottom: `2px solid ${C.border}` }}>분류</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, borderBottom: `2px solid ${C.border}` }}>기술</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, borderBottom: `2px solid ${C.border}` }}>선정 근거</th>
              </tr></thead>
              <tbody>{prdData.techStack?.map((t, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                  <td style={{ padding: '10px 14px', color: C.textTertiary, fontSize: 12 }}>{typeof t === 'object' ? t.category : '-'}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: C.textPrimary }}>
                    <span style={{ background: C.blueBg, padding: '3px 10px', borderRadius: 6 }}>{typeof t === 'object' ? t.tech : t}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: C.textSecondary, fontSize: 12 }}>{typeof t === 'object' ? t.rationale : ''}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>

        {/* 8. NFR */}
        <SectionHeader number="8" title="비기능 요구사항" subtitle="성능, 보안, 접근성, 규정준수" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {prdData.nonFunctionalRequirements?.map((nfr, idx) => {
            const icons: Record<string, string> = { '보안': '🔒', '성능': '⚡', '접근성': '♿', '규정': '📜' };
            const icon = Object.entries(icons).find(([k]) => nfr.category.includes(k))?.[1] || '📋';
            return (
              <Card key={idx}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 12px 0' }}>{icon} {nfr.category}</h3>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {nfr.items?.map((item, i) => (
                    <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8, paddingLeft: 14, position: 'relative', lineHeight: 1.5 }}>
                      <span style={{ position: 'absolute', left: 0, color: C.textTertiary }}>•</span>{item}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        {/* 9. Timeline */}
        <SectionHeader number="9" title="예상 일정 (참고용)" subtitle="프로젝트 규모 기반 참고 일정 · 실제 일정은 개발사 협의 후 확정" />
        <Card>
          <div style={{ position: 'relative' }}>
            {prdData.timeline?.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 16, marginBottom: i < (prdData.timeline?.length || 0) - 1 ? 24 : 0, position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: i === 0 ? C.blue : i === 1 ? C.green : C.yellow,
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, flexShrink: 0, zIndex: 1,
                  }}>{i + 1}</div>
                  {i < (prdData.timeline?.length || 0) - 1 && <div style={{ width: 2, flex: 1, background: C.borderLight, marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{t.phase}</span>
                    <span style={{ background: C.blueBg, color: C.blue, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{t.duration}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {t.deliverables?.map((d, j) => (
                      <span key={j} style={{ fontSize: 11, color: C.textSecondary, background: C.borderLight, padding: '3px 8px', borderRadius: 4 }}>{d}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', background: '#FEF3C7', borderRadius: 8, fontSize: 11, color: '#92400E', lineHeight: 1.5 }}>
            💡 위 일정은 프로젝트 규모와 유사 프로젝트 데이터를 기반으로 AI가 산출한 <strong>참고용 예상 일정</strong>입니다. 실제 개발 일정은 개발사와의 협의를 통해 확정해주세요.
          </div>
        </Card>

        {/* 10. Assumptions & Constraints */}
        <SectionHeader number="10" title="전제 조건 & 제약사항" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          <Card>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 12px 0' }}>📌 전제 조건</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {prdData.assumptions?.map((a, i) => (
                <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8, paddingLeft: 16, position: 'relative', lineHeight: 1.5 }}>
                  <span style={{ position: 'absolute', left: 0 }}>•</span>{a}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 12px 0' }}>🚧 제약사항</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {prdData.constraints?.map((c, i) => (
                <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8, paddingLeft: 16, position: 'relative', lineHeight: 1.5 }}>
                  <span style={{ position: 'absolute', left: 0 }}>•</span>{c}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* 11. Risk Register */}
        <SectionHeader number="11" title="리스크 관리" subtitle="예상 리스크 및 대응 전략" />
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#F1F5F9' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, borderBottom: `2px solid ${C.border}` }}>리스크</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', fontWeight: 700, borderBottom: `2px solid ${C.border}`, width: 70 }}>영향도</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontWeight: 700, borderBottom: `2px solid ${C.border}` }}>대응 전략</th>
              </tr></thead>
              <tbody>{prdData.risks?.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                  <td style={{ padding: '10px 14px', color: C.textSecondary }}>{r.risk}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                      background: r.impact === '높음' ? C.redBg : C.yellowBg, color: r.impact === '높음' ? C.red : C.yellow,
                    }}>{r.impact}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: C.textSecondary, fontSize: 12 }}>{r.mitigation}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>

        {/* 12. Expert Insight */}
        {prdData.expertInsight && (
          <>
            <SectionHeader number="12" title="AI 전문가 인사이트" subtitle="위시켓 프로젝트 데이터 기반 분석" />
            <Card style={{ borderLeft: `4px solid ${C.purple}`, background: C.purpleBg }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: C.purple, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                }}>💡</div>
                <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>{prdData.expertInsight}</p>
              </div>
            </Card>
          </>
        )}

        {/* Glossary */}
        {prdData.glossary?.length > 0 && (
          <Card style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 12px 0' }}>📖 용어 정의</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {prdData.glossary.map((g, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: i < (prdData.glossary?.length || 0) - 1 ? `1px solid ${C.borderLight}` : 'none' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: C.blue, minWidth: 70, fontFamily: '"SF Mono", Monaco, monospace' }}>{g.term}</span>
                  <span style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>{g.definition}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Reference & Additional */}
        {prdData.referenceServices && prdData.referenceServices !== '해당 없음' && (
          <Card>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: '0 0 8px 0' }}>참고 서비스</h3>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>{prdData.referenceServices}</p>
          </Card>
        )}

        {/* ━━ CTA Section — Enhanced ━━ */}
        <div className="no-print" style={{
          marginTop: 40,
          background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)',
          borderRadius: 16, padding: '36px 28px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.15)', padding: '5px 12px', borderRadius: 20,
              fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 0.5, marginBottom: 16,
            }}>
              ⚡ 무료 · 평균 3일 이내 매칭
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 8px 0', lineHeight: 1.3 }}>
              이 PRD에 딱 맞는 개발 파트너를 찾아보세요
            </h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: '0 0 24px 0', lineHeight: 1.6 }}>
              위시켓에 등록된 10,000+ 검증된 개발사/프리랜서 중
              프로젝트 요구사항에 최적화된 파트너를 매칭해 드립니다.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href={`https://www.wishket.com/project/register/?utm_source=ai-rfp&utm_medium=share&utm_campaign=shared-prd&ref=${shareId}`} target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12,
                background: '#fff', color: '#2563EB', textDecoration: 'none', fontWeight: 700, fontSize: 15,
              }}>
                무료 매칭 신청하기 →
              </a>
              <a href="/" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12,
                border: '1.5px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff',
                textDecoration: 'none', fontWeight: 600, fontSize: 14,
              }}>
                나도 AI PRD 만들기
              </a>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 16 }}>
              <span>✓ PRD 자동 첨부</span>
              <span>✓ 평균 3건 추천</span>
              <span>✓ 수수료 0원</span>
            </div>
          </div>
        </div>

        {/* ━━ Footer ━━ */}
        <div style={{ textAlign: 'center', paddingTop: 24, marginTop: 32, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.textTertiary }}>
          <p style={{ margin: '0 0 4px 0' }}>본 문서는 AI 기반으로 자동 생성되었으며, 실제 개발 착수 전 상세 검토가 필요합니다.</p>
          <p style={{ margin: 0 }}>Wishket AI PRD Builder · © {new Date().getFullYear()} Wishket</p>
        </div>
      </div>
    </div>
  );
}
