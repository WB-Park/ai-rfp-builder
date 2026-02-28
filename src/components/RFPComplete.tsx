'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RFPData } from '@/types/rfp';

interface RFPCompleteProps {
  rfpData: RFPData;
  email: string;
  sessionId?: string;
}

interface PRDResult {
  projectName: string;
  summary: string;
  consultantOpinion: string;
  totalWeeks: number;
  successRate: number;
  totalMD: number;
  pricing: {
    economy: { label: string; mdRate: number; desc: string; approach: string; techStack: string[]; team: string; timeline: string; includes: string[]; excludes: string[]; bestFor: string };
    standard: { label: string; mdRate: number; desc: string; approach: string; techStack: string[]; team: string; timeline: string; includes: string[]; excludes: string[]; bestFor: string };
    premium: { label: string; mdRate: number; desc: string; approach: string; techStack: string[]; team: string; timeline: string; includes: string[]; excludes: string[]; bestFor: string };
  };
  modules: { id: string; name: string; priority: string; features: { id: string; name: string; description: string; complexity: string; mdEstimate: number; subFeatures: string[]; acceptanceCriteria: string[] }[] }[];
  wbs: { phase: string; task: string; startWeek: number; durationWeeks: number; md: number }[];
  risks: { category: string; description: string; level: 'red' | 'yellow' | 'green'; mitigation: string }[];
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

// ━━━━━ Metric Card Component ━━━━━
function MetricCard({ label, value, subtitle }: { label: string; value: string | number; subtitle?: string }) {
  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: '20px',
      flex: 1,
      minWidth: 200,
    }}>
      <div style={{ fontSize: 12, color: C.textTertiary, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.textPrimary, marginBottom: 4 }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: C.textTertiary }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ━━━━━ Pricing Tier Card ━━━━━
function PricingCard({ tier, data, isSelected, onSelect }: any) {
  const tierName = tier === 'economy' ? '이코노미' : tier === 'standard' ? '스탠다드' : '프리미엄';
  const isRecommended = tier === 'standard';

  return (
    <div
      onClick={() => onSelect(tier)}
      style={{
        background: isSelected ? C.white : C.white,
        border: isSelected ? `2px solid ${C.blue}` : `1px solid ${C.border}`,
        borderRadius: 14,
        padding: '24px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
        boxShadow: isSelected ? '0 8px 24px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = C.blue;
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.08)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = C.border;
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.04)';
        }
      }}
    >
      {isRecommended && (
        <div style={{
          position: 'absolute',
          top: -12,
          left: 20,
          background: C.blue,
          color: C.white,
          padding: '4px 12px',
          borderRadius: 20,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.5,
        }}>
          추천
        </div>
      )}

      <h3 style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, marginBottom: 8, marginTop: isRecommended ? 8 : 0 }}>
        {tierName}
      </h3>
      <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16, lineHeight: 1.5 }}>
        {data.desc}
      </p>

      <div style={{
        fontSize: 24,
        fontWeight: 800,
        color: C.blue,
        marginBottom: 4,
      }}>
        {data.mdRate}MD
      </div>
      <div style={{ fontSize: 12, color: C.textTertiary, marginBottom: 20 }}>
        1MD = {Math.ceil(data.mdRate * 5)}만원 기준
      </div>

      <div style={{
        padding: '12px 16px',
        borderRadius: 8,
        background: isSelected ? C.blueBg : C.borderLight,
        border: `1px solid ${isSelected ? C.blue : C.border}`,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 600,
        color: isSelected ? C.blue : C.textSecondary,
        cursor: 'pointer',
      }}>
        {isSelected ? '선택됨' : '선택하기'}
      </div>
    </div>
  );
}

// ━━━━━ Pricing Details Panel ━━━━━
function PricingDetails({ tier, data }: any) {
  if (!tier) return null;

  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: '24px',
      marginTop: 20,
    }}>
      <h4 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginBottom: 16 }}>
        {tier === 'economy' ? '이코노미' : tier === 'standard' ? '스탠다드' : '프리미엄'} 플랜 상세
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textTertiary, marginBottom: 8 }}>접근 방식</div>
          <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>{data.approach}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textTertiary, marginBottom: 8 }}>예상 팀 구성</div>
          <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>{data.team}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textTertiary, marginBottom: 8 }}>기술 스택</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.techStack?.map((tech: string, i: number) => (
              <span key={i} style={{
                background: C.blueBg,
                color: C.blue,
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 600,
              }}>
                {tech}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textTertiary, marginBottom: 8 }}>예상 기간</div>
          <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6 }}>{data.timeline}</div>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginTop: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 10 }}>포함 사항</div>
            <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
              {data.includes?.map((item: string, i: number) => (
                <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 10 }}>미포함 사항</div>
            <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
              {data.excludes?.map((item: string, i: number) => (
                <li key={i} style={{ fontSize: 12, color: C.textSecondary, marginBottom: 6 }}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━ Feature Module Card ━━━━━
function ModuleCard({ module }: any) {
  const [expanded, setExpanded] = useState(false);

  const priorityColor: Record<string, string> = {
    'critical': C.red,
    'important': C.blue,
    'nice-to-have': C.textTertiary,
  };

  const priorityBg: Record<string, string> = {
    'critical': C.redBg,
    'important': C.blueBg,
    'nice-to-have': C.borderLight,
  };

  const priorityLabel: Record<string, string> = {
    'critical': '필수',
    'important': '중요',
    'nice-to-have': '선택',
  };

  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 12,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              {module.name}
            </h4>
            <span style={{
              background: priorityBg[module.priority],
              color: priorityColor[module.priority],
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
            }}>
              {priorityLabel[module.priority]}
            </span>
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
          transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.2s',
          color: C.textTertiary,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '16px' }}>
          {module.features?.map((feature: any, idx: number) => (
            <div key={idx} style={{ marginBottom: idx < module.features.length - 1 ? 16 : 0, paddingBottom: idx < module.features.length - 1 ? 16 : 0, borderBottom: idx < module.features.length - 1 ? `1px solid ${C.borderLight}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <h5 style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
                  {feature.name}
                </h5>
                <span style={{
                  background: C.blueBg,
                  color: C.blue,
                  padding: '2px 6px',
                  borderRadius: 3,
                  fontSize: 10,
                  fontWeight: 600,
                }}>
                  {feature.mdEstimate}MD
                </span>
              </div>
              <p style={{ fontSize: 12, color: C.textSecondary, margin: '0 0 8px 0', lineHeight: 1.5 }}>
                {feature.description}
              </p>
              {feature.acceptanceCriteria?.length > 0 && (
                <div style={{ fontSize: 11, color: C.textTertiary }}>
                  <strong style={{ color: C.textSecondary }}>수락 기준:</strong> {feature.acceptanceCriteria.join(' • ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ━━━━━ WBS Timeline ━━━━━
function WBSTimeline({ wbs, totalWeeks }: any) {
  const phases = Array.from(new Set(wbs?.map((w: any) => w.phase) || []));

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px' }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, marginBottom: 20 }}>
        예상 일정 (총 {totalWeeks}주)
      </h3>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
        {phases.map((phase: any) => {
          const phaseTasks = wbs?.filter((w: any) => w.phase === phase) || [];
          const maxWeek = Math.max(...phaseTasks.map((t: any) => t.startWeek + t.durationWeeks));
          const width = `${(maxWeek / totalWeeks) * 100}%`;

          const colors = [C.blue, C.purple, C.yellow, C.green, C.red];
          const color = colors[phases.indexOf(phase) % colors.length];

          return (
            <div
              key={phase}
              style={{
                flex: '0 0 auto',
                minWidth: width,
                height: 40,
                background: color,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.white,
                fontSize: 11,
                fontWeight: 700,
                position: 'relative',
              }}
              title={`${phase}: ${maxWeek}주`}
            >
              {phase}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: C.textTertiary }}>
        {wbs?.length || 0}개 태스크 · {totalWeeks}주 예상 기간
      </div>
    </div>
  );
}

// ━━━━━ Risk Analysis Card ━━━━━
function RiskCard({ risk }: any) {
  const riskColors: Record<string, { bg: string; color: string; dot: string }> = {
    red: { bg: C.redBg, color: C.red, dot: '🔴' },
    yellow: { bg: C.yellowBg, color: C.yellow, dot: '🟡' },
    green: { bg: C.greenBg, color: C.green, dot: '🟢' },
  };

  const riskStyle = riskColors[risk.level] || riskColors.yellow;

  return (
    <div style={{
      background: riskStyle.bg,
      border: `1px solid ${riskStyle.color}33`,
      borderRadius: 10,
      padding: '14px',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>{riskStyle.dot}</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary }}>
            {risk.category}
          </div>
          <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 3 }}>
            {risk.description}
          </div>
        </div>
      </div>
      {risk.mitigation && (
        <div style={{
          marginLeft: 26,
          paddingTop: 8,
          borderTop: `1px solid ${riskStyle.color}22`,
          fontSize: 11,
          color: C.textSecondary,
        }}>
          <strong>완화 방안:</strong> {risk.mitigation}
        </div>
      )}
    </div>
  );
}

// ━━━━━ Main Component ━━━━━
export default function RFPComplete({ rfpData, email, sessionId }: RFPCompleteProps) {
  const [prdData, setPrdData] = useState<PRDResult | null>(null);
  const [selectedTier, setSelectedTier] = useState('standard');
  const [loading, setLoading] = useState(true);
  const [guestEmail, setGuestEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
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
            if (parsed?.projectName && parsed?.modules) {
              setPrdData(parsed);
              setLoading(false);
              return;
            }
          } catch {
            // JSON parse failed, try as text
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
          <div style={{ fontSize: 24, marginBottom: 16 }}>분석 중...</div>
          <div style={{ fontSize: 14, color: C.textSecondary }}>전문 보고서를 생성하고 있습니다</div>
        </div>
      </div>
    );
  }

  if (!prdData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, padding: '20px' }}>
        <div style={{ maxWidth: 600, textAlign: 'center' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, marginBottom: 12 }}>
            분석을 완료하지 못했습니다
          </h2>
          <p style={{ fontSize: 15, color: C.textSecondary, lineHeight: 1.6, marginBottom: 24 }}>
            다시 시도해주세요. 프로젝트 정보를 바탕으로 분석 리포트를 생성합니다.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: C.blue, color: C.white, border: 'none', borderRadius: 8,
              padding: '12px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
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
      {/* ━━ Header with Dark Gradient ━━ */}
      <div style={{
        background: C.gradient,
        color: C.white,
        padding: '40px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              backdropFilter: 'blur(10px)',
            }}>
              AI 분석 완료
            </div>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: '0 0 16px 0', lineHeight: 1.2 }}>
            {prdData.projectName}
          </h1>
          <p style={{ fontSize: 15, opacity: 0.9, lineHeight: 1.6, maxWidth: 700, margin: 0 }}>
            {prdData.summary}
          </p>
        </div>
      </div>

      {/* ━━ Consultant Opinion ━━ */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{
          background: C.white,
          border: `2px solid ${C.purple}33`,
          borderRadius: 14,
          padding: '24px',
          marginBottom: 40,
          borderLeft: `4px solid ${C.purple}`,
        }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: C.purpleBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
            }}>
              💡
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 8, textTransform: 'uppercase' }}>
                위시켓 AI 분석 의견
              </div>
              <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, margin: 0 }}>
                {prdData.consultantOpinion}
              </p>
            </div>
          </div>
        </div>

        {/* ━━ Action Bar ━━ */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 40, flexWrap: 'wrap' }}>
          <button
            onClick={() => copyToClipboard(JSON.stringify(prdData))}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: `1.5px solid ${C.border}`,
              background: C.white,
              color: C.textSecondary,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
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
            {copied ? '복사됨' : '결과 복사'}
          </button>
          <a
            href="https://www.wishket.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: `1.5px solid ${C.border}`,
              background: C.white,
              color: C.textSecondary,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              transition: 'all 0.2s',
            }}
          >
            위시켓 방문
          </a>
        </div>

        {/* ━━ Key Metrics Grid ━━ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 40 }}>
          <MetricCard
            label="예상 비용"
            value={`${Math.ceil(prdData.totalMD * 5)}만원`}
            subtitle={`${prdData.totalMD}MD 기준`}
          />
          <MetricCard
            label="예상 기간"
            value={`${prdData.totalWeeks}주`}
            subtitle={`약 ${Math.ceil(prdData.totalWeeks / 4)}개월`}
          />
          <MetricCard
            label="총 공수"
            value={`${prdData.totalMD}MD`}
            subtitle={`${prdData.modules.length}개 모듈`}
          />
          <MetricCard
            label="성공 확률"
            value={`${prdData.successRate}%`}
            subtitle="위시켓 데이터 기반"
          />
        </div>

        {/* ━━ 3-Tier Pricing ━━ */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.textPrimary, marginBottom: 24 }}>
            예상 견적 비교
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 20 }}>
            {Object.entries(prdData.pricing).map(([tier, data]: any) => (
              <PricingCard
                key={tier}
                tier={tier}
                data={data}
                isSelected={selectedTier === tier}
                onSelect={setSelectedTier}
              />
            ))}
          </div>
          <PricingDetails tier={selectedTier} data={prdData.pricing[selectedTier as keyof typeof prdData.pricing]} />
        </div>

        {/* ━━ Feature Modules ━━ */}
        {prdData.modules.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: C.textPrimary, marginBottom: 20 }}>
              기능 모듈
            </h2>
            <div>
              {prdData.modules.map((module: any, idx: number) => (
                <ModuleCard key={idx} module={module} />
              ))}
            </div>
          </div>
        )}

        {/* ━━ WBS Timeline ━━ */}
        {prdData.wbs.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <WBSTimeline wbs={prdData.wbs} totalWeeks={prdData.totalWeeks} />
          </div>
        )}

        {/* ━━ Risk Analysis ━━ */}
        {prdData.risks.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: C.textPrimary, marginBottom: 20 }}>
              위험 분석
            </h2>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px' }}>
              {prdData.risks.map((risk: any, idx: number) => (
                <RiskCard key={idx} risk={risk} />
              ))}
            </div>
          </div>
        )}

        {/* ━━ CTA / Lead Section ━━ */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            background: C.gradient,
            borderRadius: 14,
            padding: '32px',
            color: C.white,
            textAlign: 'center',
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>
              위시켓에서 프로젝트 시작하기
            </h3>
            <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 20, lineHeight: 1.6 }}>
              전문 개발사 3~5곳의 견적을 48시간 내에 받아보세요
            </p>
            <a
              href="https://www.wishket.com/project/register/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 28px',
                background: C.white,
                color: C.blue,
                textDecoration: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
            >
              시작하기
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>
          </div>
        </div>

        {/* ━━ Footer ━━ */}
        <div style={{
          textAlign: 'center',
          paddingTop: 40,
          borderTop: `1px solid ${C.border}`,
          fontSize: 12,
          color: C.textTertiary,
        }}>
          <p style={{ margin: 0 }}>
            Powered by Wishket AI PRD Builder · 13년 외주 경험 · 70,000+ 프로젝트 데이터 분석
          </p>
        </div>
      </div>
    </div>
  );
}
