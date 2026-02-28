'use client';

import { useState, useEffect, useCallback } from 'react';
import { RFPData } from '@/types/rfp';

interface RFPCompleteProps {
  rfpData: RFPData;
  email: string;
  sessionId?: string;
}

interface PRDResult {
  projectName: string;
  projectOverview: string;
  targetUsers: string;
  techStack: string[];
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
      screenSpecs: {
        id: string;
        name: string;
        purpose: string;
        elements: string[];
        scenarios: string[][];
      }[];
      businessRules: string[];
      dataEntities: { name: string; fields: string }[];
      errorCases: string[];
    }[];
  }[];
  nonFunctionalRequirements: {
    category: string;
    items: string[];
  }[];
}

// ━━━━━ Design Tokens ━━━━━
const C = {
  blue: '#2563EB',
  blueLight: '#3B82F6',
  blueSoft: '#60A5FA',
  blueBg: 'rgba(37, 99, 235, 0.06)',
  darkHeader: '#0F172A',
  darkCard: '#1E293B',
  bg: '#F0F2F5',
  white: '#FFFFFF',
  paper: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  green: '#22C55E',
  greenBg: 'rgba(34, 197, 94, 0.08)',
  yellow: '#F59E0B',
  yellowBg: 'rgba(245, 158, 11, 0.08)',
  red: '#EF4444',
  redBg: 'rgba(239, 68, 68, 0.08)',
  purple: '#8B5CF6',
  purpleBg: 'rgba(139, 92, 246, 0.08)',
  gradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
};

// ━━━━━ Priority Badge ━━━━━
function PriorityBadge({ priority, label }: { priority: 'P0' | 'P1' | 'P2'; label: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    P0: { bg: C.redBg, color: C.red },
    P1: { bg: C.blueBg, color: C.blue },
    P2: { bg: 'rgba(148, 163, 184, 0.08)', color: C.textTertiary },
  };

  const style = styles[priority] || styles.P1;

  return (
    <span style={{
      background: style.bg,
      color: style.color,
      padding: '4px 10px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      display: 'inline-block',
    }}>
      {priority}: {label}
    </span>
  );
}

// ━━━━━ Feature Detail Component ━━━━━
function FeatureDetail({ feature }: { feature: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = C.borderLight; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
      >
        <div style={{ flex: 1 }}>
          <h5 style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0, marginBottom: 4 }}>
            {feature.name}
          </h5>
          <p style={{ fontSize: 12, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>
            {feature.description}
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          color: C.textTertiary,
          flexShrink: 0,
          marginLeft: 16,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </button>

      {expanded && (
        <div style={{
          borderTop: `1px solid ${C.border}`,
          padding: '16px',
          background: 'rgba(37, 99, 235, 0.01)',
        }}>
          {feature.subFeatures?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h6 style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, marginBottom: 8, textTransform: 'uppercase' }}>
                하위 기능
              </h6>
              <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
                {feature.subFeatures.map((sf: string, i: number) => (
                  <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>
                    {sf}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feature.userFlow && (
            <div style={{ marginBottom: 16 }}>
              <h6 style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, marginBottom: 8, textTransform: 'uppercase' }}>
                사용자 흐름
              </h6>
              <pre style={{
                background: '#F8FAFC',
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: 12,
                fontSize: 11,
                color: C.textSecondary,
                fontFamily: 'Monaco, monospace',
                overflow: 'auto',
                margin: 0,
              }}>
                {feature.userFlow}
              </pre>
            </div>
          )}

          {feature.screenSpecs?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h6 style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, marginBottom: 8, textTransform: 'uppercase' }}>
                화면 명세
              </h6>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: C.textPrimary }}>
                        화면 이름
                      </th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: C.textPrimary }}>
                        목적
                      </th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: C.textPrimary }}>
                        요소
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {feature.screenSpecs.map((spec: any, i: number) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                        <td style={{ padding: '8px 12px', color: C.textSecondary }}>{spec.name}</td>
                        <td style={{ padding: '8px 12px', color: C.textSecondary }}>{spec.purpose}</td>
                        <td style={{ padding: '8px 12px', color: C.textSecondary }}>
                          {spec.elements?.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {feature.acceptanceCriteria?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h6 style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, marginBottom: 8, textTransform: 'uppercase' }}>
                수락 기준
              </h6>
              <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
                {feature.acceptanceCriteria.map((ac: string, i: number) => (
                  <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>
                    {ac}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feature.businessRules?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h6 style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, marginBottom: 8, textTransform: 'uppercase' }}>
                비즈니스 규칙
              </h6>
              <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
                {feature.businessRules.map((br: string, i: number) => (
                  <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>
                    {br}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feature.dataEntities?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h6 style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, marginBottom: 8, textTransform: 'uppercase' }}>
                데이터 엔티티
              </h6>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 12,
                }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: C.textPrimary }}>
                        엔티티
                      </th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 700, color: C.textPrimary }}>
                        필드
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {feature.dataEntities.map((entity: any, i: number) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                        <td style={{ padding: '8px 12px', color: C.textSecondary, fontWeight: 600 }}>
                          {entity.name}
                        </td>
                        <td style={{ padding: '8px 12px', color: C.textSecondary }}>
                          {entity.fields}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {feature.errorCases?.length > 0 && (
            <div>
              <h6 style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, marginBottom: 8, textTransform: 'uppercase' }}>
                에러 케이스
              </h6>
              <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
                {feature.errorCases.map((ec: string, i: number) => (
                  <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>
                    {ec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ━━━━━ Feature Module Card ━━━━━
function ModuleCard({ module }: { module: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 16,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '20px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = C.borderLight; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              {module.name}
            </h4>
            <PriorityBadge priority={module.priority} label={module.priorityLabel} />
          </div>
          <div style={{ fontSize: 12, color: C.textTertiary }}>
            {module.features?.length || 0}개 기능
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          color: C.textTertiary,
          flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </button>

      {expanded && (
        <div style={{
          borderTop: `1px solid ${C.border}`,
          padding: '20px',
          background: 'rgba(37, 99, 235, 0.01)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {module.features?.map((feature: any, idx: number) => (
              <FeatureDetail key={idx} feature={feature} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━ Main Component ━━━━━
export default function RFPComplete({ rfpData, email, sessionId }: RFPCompleteProps) {
  const [prdData, setPrdData] = useState<PRDResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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
          } catch {
            // JSON parse failed
          }
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
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            border: `3px solid ${C.borderLight}`,
            borderTop: `3px solid ${C.blue}`,
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px',
          }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: C.textPrimary, marginBottom: 8 }}>
            PRD 기획서를 생성하고 있습니다
          </div>
          <div style={{ fontSize: 13, color: C.textSecondary }}>
            잠시만 기다려주세요...
          </div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!prdData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, padding: '20px' }}>
        <div style={{ maxWidth: 500, textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 12 }}>
            PRD 기획서 생성 실패
          </h2>
          <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6, marginBottom: 24 }}>
            기획서를 생성하는 중에 오류가 발생했습니다. 다시 시도해주세요.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: C.blue,
              color: C.white,
              border: 'none',
              borderRadius: 8,
              padding: '12px 28px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.blueLight;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = C.blue;
            }}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* ━━ Header ━━ */}
      <div style={{
        background: C.gradient,
        color: C.white,
        padding: '50px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255, 255, 255, 0.2)',
            padding: '8px 16px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            marginBottom: 24,
            backdropFilter: 'blur(10px)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            PRD 기획서
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, margin: 0, marginBottom: 16, lineHeight: 1.2 }}>
            {prdData.projectName}
          </h1>
          <p style={{ fontSize: 16, opacity: 0.95, lineHeight: 1.6, maxWidth: 800, margin: 0 }}>
            {prdData.projectOverview}
          </p>
        </div>
      </div>

      {/* ━━ Main Content ━━ */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
        {/* ━━ Target Users ━━ */}
        <div style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: '24px',
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: '0 0 12px 0', textTransform: 'uppercase' }}>
            타겟 사용자
          </h2>
          <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>
            {prdData.targetUsers}
          </p>
        </div>

        {/* ━━ Tech Stack ━━ */}
        <div style={{
          background: C.white,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: '24px',
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: '0 0 16px 0', textTransform: 'uppercase' }}>
            기술 스택
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {prdData.techStack?.map((tech: string, i: number) => (
              <span key={i} style={{
                background: C.blueBg,
                color: C.blue,
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
              }}>
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* ━━ Feature Modules ━━ */}
        {prdData.featureModules?.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: '0 0 20px 0' }}>
              기능 명세
            </h2>
            <div>
              {prdData.featureModules.map((module: any, idx: number) => (
                <ModuleCard key={idx} module={module} />
              ))}
            </div>
          </div>
        )}

        {/* ━━ Non-Functional Requirements ━━ */}
        {prdData.nonFunctionalRequirements?.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: '0 0 20px 0' }}>
              비기능 요구사항
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              {prdData.nonFunctionalRequirements.map((nfr: any, idx: number) => (
                <div key={idx} style={{
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: '20px',
                }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: '0 0 12px 0' }}>
                    {nfr.category}
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
                    {nfr.items?.map((item: string, i: number) => (
                      <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8 }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ━━ Reference Services ━━ */}
        {prdData.referenceServices && (
          <div style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '24px',
            marginBottom: 24,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: '0 0 12px 0', textTransform: 'uppercase' }}>
              참고 서비스
            </h2>
            <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>
              {prdData.referenceServices}
            </p>
          </div>
        )}

        {/* ━━ Additional Requirements ━━ */}
        {prdData.additionalRequirements && (
          <div style={{
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '24px',
            marginBottom: 24,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: '0 0 12px 0', textTransform: 'uppercase' }}>
              추가 요구사항
            </h2>
            <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>
              {prdData.additionalRequirements}
            </p>
          </div>
        )}

        {/* ━━ Action Buttons ━━ */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 40,
          marginBottom: 40,
          flexWrap: 'wrap',
        }}>
          <button
            onClick={() => copyToClipboard(JSON.stringify(prdData, null, 2))}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              border: `1.5px solid ${C.blue}`,
              background: C.white,
              color: C.blue,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.blueBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = C.white;
            }}
          >
            {copied ? '복사됨!' : '결과 복사'}
          </button>
          <a
            href="https://www.wishket.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              border: `1.5px solid ${C.border}`,
              background: C.white,
              color: C.textSecondary,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.blue;
              e.currentTarget.style.color = C.blue;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.border;
              e.currentTarget.style.color = C.textSecondary;
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            위시켓 방문
          </a>
        </div>

        {/* ━━ Footer ━━ */}
        <div style={{
          textAlign: 'center',
          paddingTop: 30,
          borderTop: `1px solid ${C.border}`,
          fontSize: 12,
          color: C.textTertiary,
        }}>
          <p style={{ margin: 0 }}>
            AI PRD Builder · Powered by Wishket
          </p>
        </div>
      </div>
    </div>
  );
}
