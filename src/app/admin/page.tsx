'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

/* ━━ Types ━━ */
interface Session {
  id: string;
  lead_id: string | null;
  current_step: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

interface SessionDetail {
  id: string;
  lead_id: string | null;
  rfp_data: Record<string, any> | null;
  rfp_document: string | null;
  messages: Array<{ role: string; content: string; chatMode?: string; deepPhase?: string; timestamp?: string }> | null;
  current_step: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

interface Lead {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

interface SharedPrd {
  id: string;
  share_id: string;
  project_name: string;
  created_at: string;
  view_count: number;
}

interface Consultation {
  id: string;
  lead_id: string | null;
  session_id: string | null;
  cta_type: string | null;
  preferred_time: string | null;
  budget_range: string | null;
  rfp_summary: string | null;
  status: string | null;
  created_at: string;
}

interface CtaLead {
  id: string;
  email: string | null;
  phone: string | null;
  project_name: string | null;
  project_type: string | null;
  feature_count: number | null;
  session_id: string | null;
  marketing_consent: boolean;
  source: string | null;
  created_at: string;
}

interface DashboardData {
  sessions: { data: Session[]; total: number };
  rfpLeads: { data: Lead[]; total: number };
  sharedPrds: { data: SharedPrd[]; total: number };
  consultations: { data: Consultation[]; total: number };
  ctaLeads: { data: CtaLead[]; total: number };
}

// 통합 리드 타입
interface UnifiedLead {
  id: string;
  type: 'hot' | 'warm' | 'cold'; // hot: 연락처+이메일, warm: CTA이메일만, cold: PRD시작 이메일
  typeLabel: string;
  email: string;
  phone: string | null;
  projectName: string | null;
  featureCount: number | null;
  source: string | null;
  sourceLabel: string;
  createdAt: string;
  rawType: 'cta' | 'rfp';
  rawId: string;
  marketingConsent?: boolean;
}

interface LeadDetailData {
  lead: any;
  sharedPrd?: any;
  session?: any;
  sessions?: any[];
  ctaLead?: any;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<'leads' | 'sessions' | 'shared' | 'funnel'>('leads');

  // 리드 상세
  const [selectedLead, setSelectedLead] = useState<UnifiedLead | null>(null);
  const [leadDetail, setLeadDetail] = useState<LeadDetailData | null>(null);
  const [leadDetailLoading, setLeadDetailLoading] = useState(false);

  // 세션 상세
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  // 필터
  const [leadFilter, setLeadFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');

  const fetchDashboard = useCallback(async (pw: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dashboard', password: pw }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '요청 실패');
      }
      const data = await res.json();
      setDashboard(data);
      setAuthenticated(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_password', pw);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !authenticated) {
      const storedPassword = sessionStorage.getItem('admin_password');
      if (storedPassword) {
        setPassword(storedPassword);
        fetchDashboard(storedPassword);
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDashboard(password);
  };

  /* ━━ 통합 리드 목록 생성 ━━ */
  const unifiedLeads = useMemo<UnifiedLead[]>(() => {
    if (!dashboard) return [];
    const leads: UnifiedLead[] = [];

    // CTA 리드 → hot(연락처 있음) / warm(이메일만)
    for (const c of (dashboard.ctaLeads?.data || [])) {
      const hasPhone = !!(c.phone && c.phone.replace(/[^0-9]/g, '').length >= 7);
      const sourceLabel = c.source === 'shared_prd' ? '공유 PRD'
        : c.source === 'prd_complete' ? 'PRD 완성'
        : c.source === 'floating_cta' ? '플로팅 바'
        : c.source === 'download_gate' ? '다운로드'
        : c.source === 'exit_modal' ? '이탈 방지'
        : c.source || '기타';

      leads.push({
        id: `cta_${c.id}`,
        type: hasPhone ? 'hot' : 'warm',
        typeLabel: hasPhone ? '🔥 견적 상담' : '📧 관심 리드',
        email: c.email || '',
        phone: c.phone,
        projectName: c.project_name,
        featureCount: c.feature_count,
        source: c.source,
        sourceLabel,
        createdAt: c.created_at,
        rawType: 'cta',
        rawId: c.id,
        marketingConsent: c.marketing_consent,
      });
    }

    // rfp_leads → cold (PRD 시작한 사람, 아직 CTA 미전환)
    // 단, CTA 리드에 이미 같은 이메일이 있으면 중복 제거
    const ctaEmails = new Set(leads.map(l => l.email.toLowerCase()));
    for (const r of (dashboard.rfpLeads?.data || [])) {
      if (r.email && ctaEmails.has(r.email.toLowerCase())) continue;
      // 테스트 계정 필터
      if (r.email && (r.email.includes('@wishket.com') || r.email === 'test@example.com')) continue;

      leads.push({
        id: `rfp_${r.id}`,
        type: 'cold',
        typeLabel: '📝 PRD 시작',
        email: r.email || '',
        phone: r.phone,
        projectName: null,
        featureCount: null,
        source: r.source,
        sourceLabel: 'PRD 빌더',
        createdAt: r.created_at,
        rawType: 'rfp',
        rawId: r.id,
      });
    }

    // 최신순 정렬
    leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return leads;
  }, [dashboard]);

  const filteredLeads = useMemo(() => {
    if (leadFilter === 'all') return unifiedLeads;
    return unifiedLeads.filter(l => l.type === leadFilter);
  }, [unifiedLeads, leadFilter]);

  /* ━━ 리드 상세 조회 ━━ */
  const viewLeadDetail = async (lead: UnifiedLead) => {
    setSelectedLead(lead);
    setLeadDetailLoading(true);
    setLeadDetail(null);
    try {
      const pw = password || sessionStorage.getItem('admin_password') || '';
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lead-detail',
          password: pw,
          leadId: lead.rawId,
          leadType: lead.rawType,
        }),
      });
      if (!res.ok) throw new Error('리드 상세 조회 실패');
      const data = await res.json();
      setLeadDetail(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLeadDetailLoading(false);
    }
  };

  /* ━━ 세션 상세 조회 ━━ */
  const viewSessionDetail = async (sessionId: string) => {
    setSessionLoading(true);
    try {
      const pw = password || sessionStorage.getItem('admin_password') || '';
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'session-detail', password: pw, sessionId }),
      });
      if (!res.ok) throw new Error('세션 상세 조회 실패');
      const data = await res.json();
      setSelectedSession(data.session);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSessionLoading(false);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '-';
    const date = new Date(d);
    return date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const formatDateShort = (d: string) => {
    if (!d) return '-';
    const date = new Date(d);
    return date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const timeSince = (d: string) => {
    const now = Date.now();
    const then = new Date(d).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
    return formatDateShort(d);
  };

  const [isMobileView, setIsMobileView] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* ━━━━ 로그인 화면 ━━━━ */
  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', padding: 16 }}>
        <form onSubmit={handleLogin} style={{ background: '#1E293B', padding: 40, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', width: '100%', maxWidth: 360, border: '1px solid #334155' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, textAlign: 'center', color: '#F8FAFC' }}>📊 Wishket PRD Admin</h1>
          <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginBottom: 24 }}>세일즈 대시보드</p>
          <input
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 12, border: '1px solid #475569', borderRadius: 8, fontSize: 16, marginBottom: 12, boxSizing: 'border-box', background: '#0F172A', color: '#F8FAFC' }}
          />
          {error && <p style={{ color: '#F87171', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? '로딩...' : '로그인'}
          </button>
        </form>
      </div>
    );
  }

  /* ━━━━ 리드 상세 뷰 ━━━━ */
  if (selectedLead) {
    const lead = selectedLead;
    const detail = leadDetail;
    const messages = detail?.session?.messages || (detail?.sessions?.[0]?.messages) || [];
    const rfpData = detail?.session?.rfp_data || detail?.sessions?.[0]?.rfp_data || {};
    const sharedPrd = detail?.sharedPrd;

    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: isMobileView ? 12 : 24 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <button onClick={() => { setSelectedLead(null); setLeadDetail(null); }} style={{ background: '#E2E8F0', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
            ← 리드 목록
          </button>

          {leadDetailLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
              리드 정보를 불러오는 중...
            </div>
          ) : (
            <>
              {/* ━━ 헤더: 리드 기본 정보 ━━ */}
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `2px solid ${lead.type === 'hot' ? '#EF4444' : lead.type === 'warm' ? '#F59E0B' : '#94A3B8'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                    background: lead.type === 'hot' ? '#FEF2F2' : lead.type === 'warm' ? '#FFFBEB' : '#F8FAFC',
                    color: lead.type === 'hot' ? '#DC2626' : lead.type === 'warm' ? '#D97706' : '#64748B',
                    border: `1px solid ${lead.type === 'hot' ? '#FECACA' : lead.type === 'warm' ? '#FDE68A' : '#E2E8F0'}`,
                  }}>
                    {lead.typeLabel}
                  </span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>{timeSince(lead.createdAt)}</span>
                  <span style={{ fontSize: 12, color: '#94A3B8', background: '#F1F5F9', padding: '2px 8px', borderRadius: 4 }}>{lead.sourceLabel}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr', gap: 16 }}>
                  {/* 연락처 */}
                  <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 16 }}>
                    <h4 style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>연락처 정보</h4>
                    <div style={{ fontSize: 14, lineHeight: 2 }}>
                      <div><strong>📧 이메일:</strong> <a href={`mailto:${lead.email}`} style={{ color: '#2563EB' }}>{lead.email}</a></div>
                      <div><strong>📱 연락처:</strong> {lead.phone ? (
                        <a href={`tel:${lead.phone}`} style={{ color: '#2563EB', fontWeight: 600 }}>{lead.phone}</a>
                      ) : (
                        <span style={{ color: '#CBD5E1' }}>미입력</span>
                      )}</div>
                      {lead.marketingConsent && <div><strong>✅ 마케팅 동의</strong></div>}
                    </div>
                  </div>

                  {/* 프로젝트 요약 */}
                  <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 16 }}>
                    <h4 style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>프로젝트 정보</h4>
                    <div style={{ fontSize: 14, lineHeight: 2 }}>
                      <div><strong>📋 프로젝트:</strong> {lead.projectName || rfpData?.projectName || '미확인'}</div>
                      <div><strong>🧩 기능 수:</strong> {lead.featureCount ?? rfpData?.coreFeatures?.length ?? '-'}개 모듈</div>
                      {rfpData?.overview && <div><strong>📝 개요:</strong> {rfpData.overview.slice(0, 100)}...</div>}
                      {rfpData?.chatMode && <div><strong>🔵 모드:</strong> {rfpData.chatMode === 'deep' ? 'Deep 분석' : 'Quick'}</div>}
                    </div>
                  </div>
                </div>

                {/* 세일즈 액션 버튼 */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10,
                      background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none',
                    }}>📞 전화 걸기</a>
                  )}
                  <a href={`mailto:${lead.email}?subject=${encodeURIComponent(`[위시켓] ${lead.projectName || '프로젝트'} 견적 안내`)}&body=${encodeURIComponent(`안녕하세요, 위시켓입니다.\n\n작성해 주신 '${lead.projectName || '프로젝트'}' 정의서를 검토했습니다.\n\n`)}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10,
                    background: '#F1F5F9', color: '#1E293B', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid #E2E8F0',
                  }}>✉️ 이메일 보내기</a>
                  {sharedPrd && (
                    <a href={`/share/${sharedPrd.share_id}`} target="_blank" rel="noopener noreferrer" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10,
                      background: '#F0FDF4', color: '#166534', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid #BBF7D0',
                    }}>📄 PRD 보기 (조회 {sharedPrd.view_count}회)</a>
                  )}
                </div>
              </div>

              {/* ━━ PRD 핵심 기능 목록 ━━ */}
              {(rfpData?.coreFeatures || sharedPrd?.rfp_data?.coreFeatures) && (
                <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#1E293B' }}>🧩 핵심 기능 모듈</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(rfpData?.coreFeatures || sharedPrd?.rfp_data?.coreFeatures || []).map((f: any, i: number) => (
                      <div key={i} style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, background: '#EFF6FF',
                        color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 500,
                      }}>
                        {f.name || f} {f.priority ? `(${f.priority})` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ━━ 대화 내역 ━━ */}
              {messages.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#1E293B' }}>
                    💬 고객 대화 내역 ({messages.length}턴)
                  </h3>
                  <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>고객이 AI와 나눈 대화입니다. 프로젝트 니즈를 파악하는 데 활용하세요.</p>

                  <div style={{ maxHeight: 500, overflowY: 'auto', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    {messages.map((m: any, i: number) => (
                      <div key={i} style={{
                        padding: '12px 16px',
                        background: m.role === 'user' ? '#F8FAFC' : '#fff',
                        borderBottom: '1px solid #F1F5F9',
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: m.role === 'user' ? '#2563EB' : '#10B981' }}>
                          {m.role === 'user' ? '👤 고객' : '🤖 AI PM'}
                          {m.deepPhase && <span style={{ marginLeft: 6, color: '#94A3B8', fontWeight: 400 }}>[{m.deepPhase}]</span>}
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#334155' }}>
                          {typeof m.content === 'string' ? m.content.slice(0, 1500) : JSON.stringify(m.content).slice(0, 500)}
                          {typeof m.content === 'string' && m.content.length > 1500 && <span style={{ color: '#94A3B8' }}> ... (더보기)</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ━━ PRD 원문 미리보기 ━━ */}
              {(sharedPrd?.rfp_document || detail?.session?.rfp_document) && (
                <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#1E293B' }}>📄 PRD 문서 미리보기</h3>
                  <div style={{
                    fontSize: 12, maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap',
                    background: '#F8FAFC', padding: 16, borderRadius: 8, lineHeight: 1.7, color: '#475569',
                    border: '1px solid #E2E8F0',
                  }}>
                    {(sharedPrd?.rfp_document || '').slice(0, 4000) || (detail?.session?.rfp_document || '').slice(0, 4000)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  /* ━━━━ 세션 상세 뷰 ━━━━ */
  if (selectedSession) {
    const s = selectedSession;
    const messages = Array.isArray(s.messages) ? s.messages : [];
    const rfpData = s.rfp_data || {};

    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: isMobileView ? 12 : 24 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <button onClick={() => setSelectedSession(null)} style={{ background: '#E2E8F0', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
            ← 목록으로
          </button>

          <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>세션 상세 — {s.id.slice(0, 8)}...</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
              <div><strong>상태:</strong> {s.completed ? '✅ 완료' : '🔄 진행중'}</div>
              <div><strong>현재 단계:</strong> {s.current_step}</div>
              <div><strong>생성:</strong> {formatDate(s.created_at)}</div>
              <div><strong>업데이트:</strong> {formatDate(s.updated_at)}</div>
              <div><strong>대화 수:</strong> {messages.length}턴</div>
            </div>
          </div>

          {rfpData && Object.keys(rfpData).length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📋 RFP 데이터</h3>
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                {rfpData.overview && <p><strong>프로젝트 개요:</strong> {rfpData.overview}</p>}
                {rfpData.targetUsers && <p><strong>타겟 사용자:</strong> {rfpData.targetUsers}</p>}
                {rfpData.chatMode && <p><strong>모드:</strong> {rfpData.chatMode === 'deep' ? '🔵 Deep' : '⚡ Quick'}</p>}
                {Array.isArray(rfpData.coreFeatures) && rfpData.coreFeatures.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <strong>핵심 기능:</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                      {rfpData.coreFeatures.map((f: any, i: number) => (
                        <li key={i}>{f.name} ({f.priority}) — {f.description || ''}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>💬 대화 내역 ({messages.length}턴)</h3>
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {messages.length === 0 && <p style={{ color: '#94A3B8', fontSize: 13 }}>대화 기록 없음</p>}
              {messages.map((m, i) => (
                <div key={i} style={{
                  padding: 12, marginBottom: 8, borderRadius: 8,
                  background: m.role === 'user' ? '#EFF6FF' : '#F8FAFC',
                  borderLeft: `3px solid ${m.role === 'user' ? '#3B82F6' : '#10B981'}`,
                  fontSize: 13, lineHeight: 1.6,
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, color: m.role === 'user' ? '#2563EB' : '#059669' }}>
                    {m.role === 'user' ? '👤 고객' : '🤖 AI PM'}
                    {m.chatMode && <span style={{ marginLeft: 8, fontSize: 11, color: '#94A3B8' }}>({m.chatMode})</span>}
                    {m.deepPhase && <span style={{ marginLeft: 8, fontSize: 11, color: '#94A3B8' }}>[{m.deepPhase}]</span>}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{typeof m.content === 'string' ? m.content.slice(0, 2000) : JSON.stringify(m.content).slice(0, 500)}</div>
                </div>
              ))}
            </div>
          </div>

          {s.rfp_document && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginTop: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📄 PRD 문서</h3>
              <div style={{ fontSize: 13, maxHeight: 400, overflowY: 'auto', whiteSpace: 'pre-wrap', background: '#F8FAFC', padding: 16, borderRadius: 8, lineHeight: 1.6 }}>
                {s.rfp_document.slice(0, 5000)}
                {s.rfp_document.length > 5000 && <p style={{ color: '#94A3B8', marginTop: 8 }}>... (총 {s.rfp_document.length}자)</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ━━━━ 메인 대시보드 ━━━━ */
  const d = dashboard!;
  const completedSessions = d.sessions.data.filter(s => s.completed).length;
  const hotLeads = unifiedLeads.filter(l => l.type === 'hot').length;
  const warmLeads = unifiedLeads.filter(l => l.type === 'warm').length;
  const coldLeads = unifiedLeads.filter(l => l.type === 'cold').length;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: isMobileView ? 12 : 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: isMobileView ? 18 : 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>📊 Wishket PRD — 세일즈 대시보드</h1>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: '4px 0 0 0' }}>마지막 업데이트: {formatDate(new Date().toISOString())}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => fetchDashboard(password || sessionStorage.getItem('admin_password') || '')} style={{ background: '#2563EB', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              🔄 새로고침
            </button>
            <button onClick={() => {
              sessionStorage.removeItem('admin_password');
              setAuthenticated(false); setPassword(''); setDashboard(null);
            }} style={{ background: '#64748B', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
              로그아웃
            </button>
          </div>
        </div>

        {/* ━━ 핵심 지표 카드 ━━ */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: isMobileView ? 16 : 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #EF4444' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>🔥 견적 상담 리드</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#EF4444' }}>{hotLeads}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>연락처 + 이메일</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, padding: isMobileView ? 16 : 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #F59E0B' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>📧 관심 리드</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#F59E0B' }}>{warmLeads}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>이메일만 (CTA)</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, padding: isMobileView ? 16 : 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #94A3B8' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>📝 PRD 시작</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#64748B' }}>{coldLeads}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>아직 CTA 미전환</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, padding: isMobileView ? 16 : 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #2563EB' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>📊 퍼널 요약</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', lineHeight: 1.8 }}>
              세션 {d.sessions.total} → PRD {completedSessions}<br />
              공유 {d.sharedPrds.total} → 리드 {hotLeads + warmLeads}
            </div>
          </div>
        </div>

        {/* ━━ 탭 ━━ */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
          {([
            { key: 'leads' as const, label: `리드 (${unifiedLeads.length})`, icon: '🎯' },
            { key: 'sessions' as const, label: `세션 (${d.sessions.total})`, icon: '📝' },
            { key: 'shared' as const, label: `공유PRD (${d.sharedPrds.total})`, icon: '🔗' },
            { key: 'funnel' as const, label: '퍼널 분석', icon: '📊' },
          ]).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: isMobileView ? '8px 12px' : '10px 20px', border: 'none', borderRadius: '12px 12px 0 0', cursor: 'pointer',
              fontSize: isMobileView ? 12 : 13, fontWeight: 700,
              background: activeTab === t.key ? '#fff' : '#E2E8F0',
              color: activeTab === t.key ? '#0F172A' : '#64748B',
              boxShadow: activeTab === t.key ? '0 -2px 8px rgba(0,0,0,0.04)' : 'none',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: '0 16px 16px 16px', padding: isMobileView ? 16 : 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', minHeight: 300 }}>

          {/* ━━━━ 리드 탭 ━━━━ */}
          {activeTab === 'leads' && (
            <>
              {/* 필터 */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                {([
                  { key: 'all' as const, label: `전체 (${unifiedLeads.length})` },
                  { key: 'hot' as const, label: `🔥 견적 상담 (${hotLeads})` },
                  { key: 'warm' as const, label: `📧 관심 (${warmLeads})` },
                  { key: 'cold' as const, label: `📝 PRD 시작 (${coldLeads})` },
                ]).map(f => (
                  <button key={f.key} onClick={() => setLeadFilter(f.key)} style={{
                    padding: '6px 14px', borderRadius: 20, border: '1px solid',
                    borderColor: leadFilter === f.key ? '#2563EB' : '#E2E8F0',
                    background: leadFilter === f.key ? '#EFF6FF' : '#fff',
                    color: leadFilter === f.key ? '#2563EB' : '#64748B',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* 리드 카드 리스트 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredLeads.map(lead => (
                  <div key={lead.id} onClick={() => viewLeadDetail(lead)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                    borderRadius: 12, border: '1px solid #E2E8F0', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: lead.type === 'hot' ? '#FFFBEB' : '#fff',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#2563EB'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(37,99,235,0.1)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                  >
                    {/* 타입 뱃지 */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: lead.type === 'hot' ? '#FEF2F2' : lead.type === 'warm' ? '#FFFBEB' : '#F8FAFC',
                      fontSize: 20, flexShrink: 0,
                    }}>
                      {lead.type === 'hot' ? '🔥' : lead.type === 'warm' ? '📧' : '📝'}
                    </div>

                    {/* 메인 정보 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{lead.email}</span>
                        {lead.phone && <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 600 }}>📱 {lead.phone}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94A3B8' }}>
                        {lead.projectName && <span style={{ color: '#64748B', fontWeight: 500 }}>{lead.projectName}</span>}
                        {lead.featureCount && <span>•  {lead.featureCount}개 기능</span>}
                        <span style={{ background: '#F1F5F9', padding: '1px 6px', borderRadius: 4 }}>{lead.sourceLabel}</span>
                      </div>
                    </div>

                    {/* 시간 + 타입 */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>{timeSince(lead.createdAt)}</div>
                      <div style={{
                        fontSize: 11, fontWeight: 700, marginTop: 2,
                        color: lead.type === 'hot' ? '#DC2626' : lead.type === 'warm' ? '#D97706' : '#94A3B8',
                      }}>
                        {lead.typeLabel}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredLeads.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                    해당 조건의 리드가 없습니다
                  </div>
                )}
              </div>
            </>
          )}

          {/* ━━━━ 세션 탭 ━━━━ */}
          {activeTab === 'sessions' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                    <th style={th}>ID</th>
                    <th style={th}>상태</th>
                    <th style={th}>단계</th>
                    <th style={th}>리드 ID</th>
                    <th style={th}>생성일</th>
                    <th style={th}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {d.sessions.data.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={td}><code style={{ fontSize: 11 }}>{s.id.slice(0, 8)}</code></td>
                      <td style={td}>{s.completed ? <span style={{ color: '#10B981' }}>✅ 완료</span> : <span style={{ color: '#F59E0B' }}>🔄 진행</span>}</td>
                      <td style={td}>{s.current_step}</td>
                      <td style={td}><code style={{ fontSize: 11 }}>{s.lead_id?.slice(0, 8) || '-'}</code></td>
                      <td style={td}>{formatDate(s.created_at)}</td>
                      <td style={td}>
                        <button onClick={() => viewSessionDetail(s.id)} disabled={sessionLoading} style={{
                          background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                          padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        }}>
                          상세보기
                        </button>
                      </td>
                    </tr>
                  ))}
                  {d.sessions.data.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#94A3B8' }}>데이터 없음</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ━━━━ 공유 PRD 탭 ━━━━ */}
          {activeTab === 'shared' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                    <th style={th}>프로젝트명</th>
                    <th style={th}>조회수</th>
                    <th style={th}>생성일</th>
                    <th style={th}>링크</th>
                  </tr>
                </thead>
                <tbody>
                  {d.sharedPrds.data.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={td}><strong>{p.project_name}</strong></td>
                      <td style={td}>
                        <span style={{
                          display: 'inline-flex', padding: '2px 8px', borderRadius: 12,
                          background: p.view_count > 5 ? '#FEF2F2' : p.view_count > 1 ? '#FFFBEB' : '#F8FAFC',
                          color: p.view_count > 5 ? '#DC2626' : p.view_count > 1 ? '#D97706' : '#64748B',
                          fontSize: 12, fontWeight: 700,
                        }}>
                          {p.view_count}회
                        </span>
                      </td>
                      <td style={td}>{formatDate(p.created_at)}</td>
                      <td style={td}>
                        <a href={`/share/${p.share_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                          열기 ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                  {d.sharedPrds.data.length === 0 && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#94A3B8' }}>데이터 없음</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ━━━━ 퍼널 분석 탭 ━━━━ */}
          {activeTab === 'funnel' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: '#0F172A' }}>📊 전환 퍼널</h3>
              {(() => {
                const funnelSteps = [
                  { label: '세션 시작', value: d.sessions.total, color: '#94A3B8' },
                  { label: 'PRD 완성', value: completedSessions, color: '#3B82F6' },
                  { label: 'PRD 공유', value: d.sharedPrds.total, color: '#8B5CF6' },
                  { label: 'CTA 리드', value: d.ctaLeads?.total || 0, color: '#F59E0B' },
                  { label: '견적 상담 (핫 리드)', value: hotLeads, color: '#EF4444' },
                ];
                const maxVal = Math.max(...funnelSteps.map(s => s.value), 1);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {funnelSteps.map((step, i) => {
                      const pct = Math.round((step.value / maxVal) * 100);
                      const convRate = i > 0 ? (funnelSteps[i - 1].value > 0 ? Math.round((step.value / funnelSteps[i - 1].value) * 100) : 0) : 100;
                      return (
                        <div key={i}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{step.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 18, fontWeight: 800, color: step.color }}>{step.value}</span>
                              {i > 0 && (
                                <span style={{
                                  fontSize: 11, padding: '2px 6px', borderRadius: 4,
                                  background: convRate > 50 ? '#F0FDF4' : convRate > 20 ? '#FFFBEB' : '#FEF2F2',
                                  color: convRate > 50 ? '#166534' : convRate > 20 ? '#92400E' : '#991B1B',
                                  fontWeight: 700,
                                }}>
                                  {convRate}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ width: '100%', height: 28, background: '#F1F5F9', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`, height: '100%', background: step.color,
                              borderRadius: 8, transition: 'width 0.5s ease', minWidth: step.value > 0 ? 20 : 0,
                              opacity: 0.85,
                            }} />
                          </div>
                          {i < funnelSteps.length - 1 && (
                            <div style={{ textAlign: 'center', fontSize: 16, color: '#CBD5E1', margin: '4px 0' }}>↓</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* 핵심 인사이트 */}
              <div style={{ marginTop: 32, padding: 20, background: '#FEF2F2', borderRadius: 12, border: '1px solid #FECACA' }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: '#991B1B', marginBottom: 8 }}>💡 핵심 인사이트</h4>
                <div style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 1.8 }}>
                  {d.sharedPrds.total > 0 && (d.ctaLeads?.total || 0) / d.sharedPrds.total < 0.1 ? (
                    <p>공유 PRD {d.sharedPrds.total}건 대비 CTA 전환 {d.ctaLeads?.total || 0}건 — 전환율이 {Math.round(((d.ctaLeads?.total || 0) / d.sharedPrds.total) * 100)}%로 낮습니다. 공유 PRD 페이지 CTA 강화가 필요합니다.</p>
                  ) : (
                    <p>PRD 완성 {completedSessions}건 → 리드 {hotLeads + warmLeads}건 전환 중입니다.</p>
                  )}
                  {hotLeads > 0 && <p style={{ marginTop: 4 }}>🔥 연락처까지 남긴 핫 리드 {hotLeads}건 — 즉시 세일즈 컨택이 필요합니다!</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'top' };
