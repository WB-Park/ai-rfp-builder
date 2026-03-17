'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

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

interface UnifiedLead {
  id: string;
  type: 'hot' | 'warm' | 'cold';
  typeLabel: string;
  email: string;
  phone: string | null;
  projectName: string | null;
  featureCount: number | null;
  source: string | null;
  sourceLabel: string;
  sourceIcon: string;
  sourceColor: string;
  sourceBg: string;
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

/* ━━ Source Map ━━ */
const SOURCE_MAP: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  'shared_prd': { label: '공유 PRD 페이지', icon: '📤', color: '#7C3AED', bg: '#F5F3FF' },
  'prd_complete': { label: 'PRD 완성 페이지', icon: '✅', color: '#059669', bg: '#ECFDF5' },
  'floating_cta': { label: '플로팅 견적 바', icon: '💬', color: '#2563EB', bg: '#EFF6FF' },
  'download_gate': { label: 'PDF 다운로드', icon: '📥', color: '#D97706', bg: '#FFFBEB' },
  'exit_modal': { label: '이탈 방지 모달', icon: '🚪', color: '#DC2626', bg: '#FEF2F2' },
};
const DEFAULT_SRC = { label: '기타', icon: '🔗', color: '#64748B', bg: '#F8FAFC' };
const PRD_SRC = { label: 'PRD 빌더 이메일 입력', icon: '📝', color: '#64748B', bg: '#F8FAFC' };

/* ━━ URL helpers ━━ */
function getUrlParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function setUrlParams(params: Record<string, string | null>) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === '' || v === 'all') url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  window.history.pushState({}, '', url.toString());
}

/* ━━ Date helpers ━━ */
type DateRange = 'all' | 'today' | '7d' | '30d' | '90d' | 'custom';
function getDateRangeStart(range: DateRange, customStart?: string): Date | null {
  if (range === 'all') return null;
  if (range === 'custom' && customStart) return new Date(customStart);
  const now = new Date();
  if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === '7d') return new Date(now.getTime() - 7 * 86400000);
  if (range === '30d') return new Date(now.getTime() - 30 * 86400000);
  if (range === '90d') return new Date(now.getTime() - 90 * 86400000);
  return null;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  // URL-driven state
  const [view, setView] = useState<'dashboard' | 'lead-detail' | 'session-detail'>('dashboard');
  const [activeTab, setActiveTab] = useState<'leads' | 'sessions' | 'shared' | 'funnel'>('leads');
  const [leadFilter, setLeadFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail views
  const [selectedLead, setSelectedLead] = useState<UnifiedLead | null>(null);
  const [leadDetail, setLeadDetail] = useState<LeadDetailData | null>(null);
  const [leadDetailLoading, setLeadDetailLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Chat expand state for lead detail
  const [chatExpanded, setChatExpanded] = useState(false);

  // Email generation state
  const [generatedEmail, setGeneratedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [emailGenerating, setEmailGenerating] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [infoCopied, setInfoCopied] = useState<string | null>(null); // 'email' | 'phone'

  const isNavigatingRef = useRef(false);

  const [isMobileView, setIsMobileView] = useState(false);
  useEffect(() => {
    setIsMobileView(window.innerWidth < 768);
    const check = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* ━━ URL → State sync (on mount & popstate) ━━ */
  const syncFromUrl = useCallback(() => {
    const p = getUrlParams();
    const v = p.get('view');
    const tab = p.get('tab');
    const filter = p.get('filter');
    const range = p.get('range');
    const q = p.get('q');

    if (v === 'lead' && p.get('id')) {
      setView('lead-detail');
    } else if (v === 'session' && p.get('id')) {
      setView('session-detail');
    } else {
      setView('dashboard');
    }

    if (tab && ['leads', 'sessions', 'shared', 'funnel'].includes(tab)) {
      setActiveTab(tab as any);
    }
    if (filter && ['all', 'hot', 'warm', 'cold'].includes(filter)) {
      setLeadFilter(filter as any);
    }
    if (range && ['all', 'today', '7d', '30d', '90d', 'custom'].includes(range)) {
      setDateRange(range as DateRange);
    }
    if (q) setSearchQuery(q);
  }, []);

  useEffect(() => {
    syncFromUrl();
    const handler = () => {
      isNavigatingRef.current = true;
      syncFromUrl();
      // Re-trigger detail loads if needed
      const p = getUrlParams();
      if (p.get('view') === 'lead' && p.get('id') && p.get('type')) {
        // will be handled by effect below
      } else if (p.get('view') === 'session' && p.get('id')) {
        // will be handled by effect below
      } else {
        setSelectedLead(null);
        setLeadDetail(null);
        setSelectedSession(null);
      }
      setTimeout(() => { isNavigatingRef.current = false; }, 100);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [syncFromUrl]);

  /* ━━ Load detail views from URL on auth ━━ */
  useEffect(() => {
    if (!authenticated || !dashboard) return;
    const p = getUrlParams();
    const v = p.get('view');
    const id = p.get('id');
    const type = p.get('type');

    if (v === 'lead' && id && type) {
      // Find the lead in unified list or create a stub
      const stub: UnifiedLead = {
        id: `${type}_${id}`, type: 'warm', typeLabel: '...', email: '', phone: null,
        projectName: null, featureCount: null, source: null, sourceLabel: '',
        sourceIcon: '', sourceColor: '#64748B', sourceBg: '#F8FAFC',
        createdAt: '', rawType: type as 'cta' | 'rfp', rawId: id,
      };
      // Try to find real lead
      const found = unifiedLeads.find(l => l.rawId === id && l.rawType === type);
      setSelectedLead(found || stub);
      setView('lead-detail');
      fetchLeadDetail(id, type as 'cta' | 'rfp');
    } else if (v === 'session' && id) {
      setView('session-detail');
      fetchSessionDetail(id);
    }
  }, [authenticated, dashboard]);

  /* ━━ API calls ━━ */
  const getPassword = () => password || (typeof window !== 'undefined' ? sessionStorage.getItem('admin_password') : '') || '';

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
      if (typeof window !== 'undefined') sessionStorage.setItem('admin_password', pw);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !authenticated) {
      const stored = sessionStorage.getItem('admin_password');
      if (stored) { setPassword(stored); fetchDashboard(stored); }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); fetchDashboard(password); };

  const fetchLeadDetail = async (leadId: string, leadType: string) => {
    setLeadDetailLoading(true);
    setLeadDetail(null);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lead-detail', password: getPassword(), leadId, leadType }),
      });
      if (!res.ok) throw new Error('리드 상세 조회 실패');
      setLeadDetail(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLeadDetailLoading(false); }
  };

  const fetchSessionDetail = async (sessionId: string) => {
    setSessionLoading(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'session-detail', password: getPassword(), sessionId }),
      });
      if (!res.ok) throw new Error('세션 상세 조회 실패');
      const data = await res.json();
      setSelectedSession(data.session);
    } catch (e: any) { setError(e.message); }
    finally { setSessionLoading(false); }
  };

  /* ━━ Navigation (URL-based) ━━ */
  const navigateTo = (params: Record<string, string | null>) => {
    setUrlParams(params);
  };

  const goToDashboard = (tab?: string) => {
    setView('dashboard');
    setSelectedLead(null);
    setLeadDetail(null);
    setSelectedSession(null);
    setChatExpanded(false);
    navigateTo({ view: null, id: null, type: null, tab: tab || activeTab });
  };

  const goToLeadDetail = (lead: UnifiedLead) => {
    setSelectedLead(lead);
    setView('lead-detail');
    setChatExpanded(false);
    setGeneratedEmail(null);
    setEmailCopied(false);
    navigateTo({ view: 'lead', id: lead.rawId, type: lead.rawType, tab: null });
    fetchLeadDetail(lead.rawId, lead.rawType);
  };

  const generateEmail = async () => {
    if (!selectedLead || !leadDetail) return;
    setEmailGenerating(true);
    setGeneratedEmail(null);
    setEmailCopied(false);
    try {
      const rfpData = leadDetail.session?.rfp_data || leadDetail.sessions?.[0]?.rfp_data || {};
      const allMessages = leadDetail.session?.messages || leadDetail.sessions?.[0]?.messages || [];
      // 고객 메시지만 추출하여 요약용
      const customerMsgs = allMessages
        .filter((m: any) => m.role === 'user')
        .map((m: any) => typeof m.content === 'string' ? m.content.slice(0, 200) : '')
        .slice(0, 5)
        .join('\n');

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-email',
          password: getPassword(),
          projectName: selectedLead.projectName || rfpData?.projectName || rfpData?.overview?.slice(0, 50),
          overview: rfpData?.overview || '',
          coreFeatures: rfpData?.coreFeatures || leadDetail.sharedPrd?.rfp_data?.coreFeatures || [],
          featureCount: selectedLead.featureCount ?? rfpData?.coreFeatures?.length,
          chatSummary: customerMsgs || '',
        }),
      });
      if (!res.ok) throw new Error('메일 생성 실패');
      const data = await res.json();
      setGeneratedEmail({ subject: data.subject, body: data.body });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setEmailGenerating(false);
    }
  };

  const copyEmailToClipboard = async () => {
    if (!generatedEmail) return;
    const fullText = `제목: ${generatedEmail.subject}\n\n${generatedEmail.body}`;
    await navigator.clipboard.writeText(fullText);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const copyInfo = async (text: string, type: 'email' | 'phone') => {
    await navigator.clipboard.writeText(text);
    setInfoCopied(type);
    setTimeout(() => setInfoCopied(null), 1500);
  };

  const goToSessionDetail = (sessionId: string) => {
    setView('session-detail');
    navigateTo({ view: 'session', id: sessionId, tab: null });
    fetchSessionDetail(sessionId);
  };

  const switchTab = (tab: 'leads' | 'sessions' | 'shared' | 'funnel') => {
    setActiveTab(tab);
    navigateTo({ tab, filter: null, q: null });
    setLeadFilter('all');
    setSearchQuery('');
  };

  const switchFilter = (f: 'all' | 'hot' | 'warm' | 'cold') => {
    setLeadFilter(f);
    navigateTo({ filter: f === 'all' ? null : f });
  };

  /* ━━ Unified leads ━━ */
  const unifiedLeads = useMemo<UnifiedLead[]>(() => {
    if (!dashboard) return [];
    const leads: UnifiedLead[] = [];

    for (const c of (dashboard.ctaLeads?.data || [])) {
      const hasPhone = !!(c.phone && c.phone.replace(/[^0-9]/g, '').length >= 7);
      const srcInfo = SOURCE_MAP[c.source || ''] || { ...DEFAULT_SRC, label: c.source || '기타' };
      leads.push({
        id: `cta_${c.id}`, type: hasPhone ? 'hot' : 'warm',
        typeLabel: hasPhone ? '🔥 견적 상담' : '📧 관심 리드',
        email: c.email || '', phone: c.phone, projectName: c.project_name,
        featureCount: c.feature_count, source: c.source,
        sourceLabel: srcInfo.label, sourceIcon: srcInfo.icon,
        sourceColor: srcInfo.color, sourceBg: srcInfo.bg,
        createdAt: c.created_at, rawType: 'cta', rawId: c.id,
        marketingConsent: c.marketing_consent,
      });
    }

    const ctaEmails = new Set(leads.map(l => l.email.toLowerCase()));
    for (const r of (dashboard.rfpLeads?.data || [])) {
      if (r.email && ctaEmails.has(r.email.toLowerCase())) continue;
      if (r.email && (r.email.includes('@wishket.com') || r.email === 'test@example.com')) continue;
      leads.push({
        id: `rfp_${r.id}`, type: 'cold', typeLabel: '📝 PRD 시작',
        email: r.email || '', phone: r.phone, projectName: null,
        featureCount: null, source: r.source,
        sourceLabel: PRD_SRC.label, sourceIcon: PRD_SRC.icon,
        sourceColor: PRD_SRC.color, sourceBg: PRD_SRC.bg,
        createdAt: r.created_at, rawType: 'rfp', rawId: r.id,
      });
    }

    leads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return leads;
  }, [dashboard]);

  /* ━━ Date + Search + Type filter ━━ */
  const filteredLeads = useMemo(() => {
    let result = unifiedLeads;
    if (leadFilter !== 'all') result = result.filter(l => l.type === leadFilter);
    const rangeStart = getDateRangeStart(dateRange, customDateStart);
    const rangeEnd = dateRange === 'custom' && customDateEnd ? new Date(customDateEnd + 'T23:59:59') : null;
    if (rangeStart) result = result.filter(l => new Date(l.createdAt) >= rangeStart);
    if (rangeEnd) result = result.filter(l => new Date(l.createdAt) <= rangeEnd);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.email.toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (l.projectName || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [unifiedLeads, leadFilter, dateRange, customDateStart, customDateEnd, searchQuery]);

  const filteredSessions = useMemo(() => {
    if (!dashboard) return [];
    let result = dashboard.sessions.data;
    const rangeStart = getDateRangeStart(dateRange, customDateStart);
    const rangeEnd = dateRange === 'custom' && customDateEnd ? new Date(customDateEnd + 'T23:59:59') : null;
    if (rangeStart) result = result.filter(s => new Date(s.created_at) >= rangeStart);
    if (rangeEnd) result = result.filter(s => new Date(s.created_at) <= rangeEnd);
    return result;
  }, [dashboard, dateRange, customDateStart, customDateEnd]);

  const filteredSharedPrds = useMemo(() => {
    if (!dashboard) return [];
    let result = dashboard.sharedPrds.data;
    const rangeStart = getDateRangeStart(dateRange, customDateStart);
    const rangeEnd = dateRange === 'custom' && customDateEnd ? new Date(customDateEnd + 'T23:59:59') : null;
    if (rangeStart) result = result.filter(p => new Date(p.created_at) >= rangeStart);
    if (rangeEnd) result = result.filter(p => new Date(p.created_at) <= rangeEnd);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.project_name.toLowerCase().includes(q));
    }
    return result;
  }, [dashboard, dateRange, customDateStart, customDateEnd, searchQuery]);

  /* ━━ Format helpers ━━ */
  const formatDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  const timeSince = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (diff < 60) return '방금';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
    return formatDate(d);
  };

  /* ━━ Counts ━━ */
  const hotLeads = unifiedLeads.filter(l => l.type === 'hot').length;
  const warmLeads = unifiedLeads.filter(l => l.type === 'warm').length;
  const coldLeads = unifiedLeads.filter(l => l.type === 'cold').length;

  /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     RENDER
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

  /* ━━ 로그인 ━━ */
  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F172A', padding: 16 }}>
        <form onSubmit={handleLogin} style={{ background: '#1E293B', padding: 40, borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', width: '100%', maxWidth: 360, border: '1px solid #334155' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, textAlign: 'center', color: '#F8FAFC' }}>📊 Wishket PRD Admin</h1>
          <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginBottom: 24 }}>세일즈 대시보드</p>
          <input type="password" placeholder="비밀번호 입력" value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 12, border: '1px solid #475569', borderRadius: 8, fontSize: 16, marginBottom: 12, boxSizing: 'border-box', background: '#0F172A', color: '#F8FAFC' }} />
          {error && <p style={{ color: '#F87171', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? '로딩...' : '로그인'}
          </button>
        </form>
      </div>
    );
  }

  /* ━━ 리드 상세 뷰 ━━ */
  if (view === 'lead-detail' && selectedLead) {
    const lead = selectedLead;
    const detail = leadDetail;
    const allMessages = detail?.session?.messages || (detail?.sessions?.[0]?.messages) || [];
    const rfpData = detail?.session?.rfp_data || detail?.sessions?.[0]?.rfp_data || {};
    const sharedPrd = detail?.sharedPrd;
    const visibleMessages = chatExpanded ? allMessages : allMessages.slice(0, 6);

    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: isMobileView ? 12 : 24 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          {/* 뒤로가기 */}
          <button onClick={() => goToDashboard('leads')} style={{ background: '#E2E8F0', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
            ← 리드 목록
          </button>

          {leadDetailLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
              <div style={{ fontSize: 28, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
              리드 정보를 불러오는 중...
            </div>
          ) : (
            <>
              {/* 헤더 카드 */}
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: `2px solid ${lead.type === 'hot' ? '#EF4444' : lead.type === 'warm' ? '#F59E0B' : '#94A3B8'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                    background: lead.type === 'hot' ? '#FEF2F2' : lead.type === 'warm' ? '#FFFBEB' : '#F8FAFC',
                    color: lead.type === 'hot' ? '#DC2626' : lead.type === 'warm' ? '#D97706' : '#64748B',
                    border: `1px solid ${lead.type === 'hot' ? '#FECACA' : lead.type === 'warm' ? '#FDE68A' : '#E2E8F0'}`,
                  }}>
                    {lead.typeLabel}
                  </span>
                  <span style={{ fontSize: 12, color: '#94A3B8' }}>{timeSince(lead.createdAt)}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 16,
                    color: lead.sourceColor, background: lead.sourceBg,
                    border: `1px solid ${lead.sourceColor}33`,
                  }}>
                    {lead.sourceIcon} {lead.sourceLabel}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr' : '1fr 1fr', gap: 16 }}>
                  <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 16 }}>
                    <h4 style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>연락처 정보</h4>
                    <div style={{ fontSize: 14, lineHeight: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong>📧 이메일:</strong> <a href={`mailto:${lead.email}`} style={{ color: '#2563EB' }}>{lead.email}</a>
                        <button onClick={() => copyInfo(lead.email, 'email')} style={{ background: infoCopied === 'email' ? '#059669' : '#E2E8F0', border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer', color: infoCopied === 'email' ? '#fff' : '#64748B', fontWeight: 600, transition: 'all 0.2s' }}>
                          {infoCopied === 'email' ? '✓' : '복사'}
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong>📱 연락처:</strong> {lead.phone ? (
                          <>
                            <a href={`tel:${lead.phone}`} style={{ color: '#2563EB', fontWeight: 600 }}>{lead.phone}</a>
                            <button onClick={() => copyInfo(lead.phone!, 'phone')} style={{ background: infoCopied === 'phone' ? '#059669' : '#E2E8F0', border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer', color: infoCopied === 'phone' ? '#fff' : '#64748B', fontWeight: 600, transition: 'all 0.2s' }}>
                              {infoCopied === 'phone' ? '✓' : '복사'}
                            </button>
                          </>
                        ) : <span style={{ color: '#CBD5E1' }}>미입력</span>}
                      </div>
                      {lead.marketingConsent && <div><strong>✅ 마케팅 동의</strong></div>}
                    </div>
                  </div>
                  <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 16 }}>
                    <h4 style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 12 }}>프로젝트 정보</h4>
                    <div style={{ fontSize: 14, lineHeight: 2 }}>
                      <div><strong>📋 프로젝트:</strong> {lead.projectName || rfpData?.projectName || '미확인'}</div>
                      <div><strong>🧩 기능 수:</strong> {lead.featureCount ?? rfpData?.coreFeatures?.length ?? '-'}개</div>
                      {rfpData?.overview && <div><strong>📝 개요:</strong> {rfpData.overview.slice(0, 80)}...</div>}
                      {rfpData?.chatMode && <div><strong>🔵 모드:</strong> {rfpData.chatMode === 'deep' ? 'Deep 분석' : 'Quick'}</div>}
                    </div>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>📞 전화 걸기</a>
                  )}
                  <a href={`mailto:${lead.email}?subject=${encodeURIComponent(`[위시켓] ${lead.projectName || '프로젝트'} 견적 안내`)}&body=${encodeURIComponent(`안녕하세요, 위시켓입니다.\n\n작성해 주신 '${lead.projectName || '프로젝트'}' 정의서를 검토했습니다.\n\n`)}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: '#F1F5F9', color: '#1E293B', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid #E2E8F0' }}>✉️ 이메일 보내기</a>
                  {sharedPrd && (
                    <a href={`/share/${sharedPrd.share_id}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: '#F0FDF4', color: '#166534', fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid #BBF7D0' }}>📄 PRD 보기 (조회 {sharedPrd.view_count}회)</a>
                  )}
                </div>
              </div>

              {/* ━━ AI 메일 생성 ━━ */}
              <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E0E7FF' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: generatedEmail ? 16 : 0, flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1E293B', margin: 0 }}>✉️ AI 개인화 메일 생성</h3>
                  <button
                    onClick={generateEmail}
                    disabled={emailGenerating}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '10px 20px', borderRadius: 10,
                      background: emailGenerating ? '#CBD5E1' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                      color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: emailGenerating ? 'not-allowed' : 'pointer',
                      boxShadow: emailGenerating ? 'none' : '0 2px 8px rgba(99,102,241,0.3)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {emailGenerating ? '⏳ 생성 중...' : generatedEmail ? '🔄 다시 생성' : '🤖 메일 생성하기'}
                  </button>
                </div>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: generatedEmail ? 0 : '8px 0 0 0' }}>
                  {generatedEmail ? '' : 'PRD 내용을 기반으로 위시켓 프로젝트 등록을 유도하는 개인화 메일을 AI가 작성합니다.'}
                </p>

                {generatedEmail && (
                  <div style={{ marginTop: 12 }}>
                    {/* 제목 */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>제목</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', padding: '10px 14px', background: '#F5F3FF', borderRadius: 8, border: '1px solid #E0E7FF' }}>
                        {generatedEmail.subject}
                      </div>
                    </div>

                    {/* 본문 */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>본문</div>
                      <div style={{
                        fontSize: 13, lineHeight: 1.8, color: '#334155', padding: 16,
                        background: '#FAFAFA', borderRadius: 8, border: '1px solid #E2E8F0',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        maxHeight: 400, overflowY: 'auto',
                      }}>
                        {generatedEmail.body}
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={copyEmailToClipboard} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '10px 20px', borderRadius: 10,
                        background: emailCopied ? '#059669' : '#1E293B', color: '#fff',
                        fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}>
                        {emailCopied ? '✅ 복사 완료!' : '📋 전체 복사'}
                      </button>
                      <a
                        href={`mailto:${lead.email}?subject=${encodeURIComponent(generatedEmail.subject)}&body=${encodeURIComponent(generatedEmail.body)}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '10px 20px', borderRadius: 10,
                          background: '#2563EB', color: '#fff',
                          fontSize: 13, fontWeight: 700, textDecoration: 'none',
                          boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
                        }}
                      >
                        ✉️ 이 내용으로 메일 보내기
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* 핵심 기능 */}
              {(rfpData?.coreFeatures || sharedPrd?.rfp_data?.coreFeatures) && (
                <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#1E293B' }}>🧩 핵심 기능 모듈</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(rfpData?.coreFeatures || sharedPrd?.rfp_data?.coreFeatures || []).map((f: any, i: number) => (
                      <div key={i} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 500 }}>
                        {f.name || f} {f.priority ? `(${f.priority})` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 대화 내역 */}
              {allMessages.length > 0 && (
                <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#1E293B' }}>💬 고객 대화 내역 ({allMessages.length}턴)</h3>
                  <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>고객이 AI와 나눈 대화입니다. 프로젝트 니즈를 파악하는 데 활용하세요.</p>
                  <div style={{ maxHeight: chatExpanded ? 'none' : 400, overflowY: chatExpanded ? 'visible' : 'auto', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    {visibleMessages.map((m: any, i: number) => (
                      <div key={i} style={{ padding: '12px 16px', background: m.role === 'user' ? '#F8FAFC' : '#fff', borderBottom: '1px solid #F1F5F9' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: m.role === 'user' ? '#2563EB' : '#10B981' }}>
                          {m.role === 'user' ? '👤 고객' : '🤖 AI PM'}
                          {m.deepPhase && <span style={{ marginLeft: 6, color: '#94A3B8', fontWeight: 400 }}>[{m.deepPhase}]</span>}
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#334155' }}>
                          {typeof m.content === 'string' ? m.content.slice(0, 1500) : JSON.stringify(m.content).slice(0, 500)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {allMessages.length > 6 && (
                    <button onClick={() => setChatExpanded(!chatExpanded)} style={{ marginTop: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#2563EB', width: '100%' }}>
                      {chatExpanded ? '접기 ↑' : `전체 ${allMessages.length}턴 보기 ↓`}
                    </button>
                  )}
                </div>
              )}

              {/* PRD 원문 */}
              {(sharedPrd?.rfp_document) && (
                <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#1E293B' }}>📄 PRD 문서 미리보기</h3>
                  <div style={{ fontSize: 12, maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap', background: '#F8FAFC', padding: 16, borderRadius: 8, lineHeight: 1.7, color: '#475569', border: '1px solid #E2E8F0' }}>
                    {sharedPrd.rfp_document.slice(0, 4000)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  /* ━━ 세션 상세 뷰 ━━ */
  if (view === 'session-detail' && selectedSession) {
    const s = selectedSession;
    const messages = Array.isArray(s.messages) ? s.messages : [];
    const rfpData = s.rfp_data || {};

    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: isMobileView ? 12 : 24 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <button onClick={() => goToDashboard('sessions')} style={{ background: '#E2E8F0', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, marginBottom: 16, fontWeight: 600 }}>
            ← 세션 목록
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
                <div key={i} style={{ padding: 12, marginBottom: 8, borderRadius: 8, background: m.role === 'user' ? '#EFF6FF' : '#F8FAFC', borderLeft: `3px solid ${m.role === 'user' ? '#3B82F6' : '#10B981'}`, fontSize: 13, lineHeight: 1.6 }}>
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
  if (!dashboard) return null;
  const d = dashboard;
  const completedSessions = d.sessions.data.filter(s => s.completed).length;

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: isMobileView ? 12 : 24 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: isMobileView ? 18 : 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>📊 Wishket PRD — 세일즈 대시보드</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => fetchDashboard(getPassword())} style={{ background: '#2563EB', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>🔄 새로고침</button>
            <button onClick={() => { sessionStorage.removeItem('admin_password'); setAuthenticated(false); setPassword(''); setDashboard(null); }}
              style={{ background: '#64748B', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>로그아웃</button>
          </div>
        </div>

        {/* ━━ 기간 필터 바 ━━ */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginRight: 4 }}>📅 기간:</span>
          {([
            { key: 'all' as DateRange, label: '전체' },
            { key: 'today' as DateRange, label: '오늘' },
            { key: '7d' as DateRange, label: '7일' },
            { key: '30d' as DateRange, label: '30일' },
            { key: '90d' as DateRange, label: '90일' },
            { key: 'custom' as DateRange, label: '직접 선택' },
          ]).map(r => (
            <button key={r.key} onClick={() => setDateRange(r.key)} style={{
              padding: '4px 12px', borderRadius: 16, border: '1px solid',
              borderColor: dateRange === r.key ? '#2563EB' : '#E2E8F0',
              background: dateRange === r.key ? '#EFF6FF' : '#fff',
              color: dateRange === r.key ? '#2563EB' : '#64748B',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              {r.label}
            </button>
          ))}
          {dateRange === 'custom' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="date" value={customDateStart} onChange={(e) => setCustomDateStart(e.target.value)}
                style={{ padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12 }} />
              <span style={{ color: '#94A3B8', fontSize: 12 }}>~</span>
              <input type="date" value={customDateEnd} onChange={(e) => setCustomDateEnd(e.target.value)}
                style={{ padding: '4px 8px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12 }} />
            </div>
          )}
        </div>

        {/* ━━ 핵심 지표 카드 ━━ */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobileView ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <div onClick={() => { switchTab('leads'); switchFilter('hot'); }} style={{ background: '#fff', borderRadius: 16, padding: isMobileView ? 16 : 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #EF4444', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'} onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>🔥 견적 상담 리드</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#EF4444' }}>{hotLeads}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>연락처 + 이메일</div>
          </div>
          <div onClick={() => { switchTab('leads'); switchFilter('warm'); }} style={{ background: '#fff', borderRadius: 16, padding: isMobileView ? 16 : 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #F59E0B', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'} onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>📧 관심 리드</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#F59E0B' }}>{warmLeads}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>이메일만 (CTA)</div>
          </div>
          <div onClick={() => { switchTab('leads'); switchFilter('cold'); }} style={{ background: '#fff', borderRadius: 16, padding: isMobileView ? 16 : 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #94A3B8', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'} onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>📝 PRD 시작</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#64748B' }}>{coldLeads}</div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>아직 CTA 미전환</div>
          </div>
          <div onClick={() => switchTab('funnel')} style={{ background: '#fff', borderRadius: 16, padding: isMobileView ? 16 : 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', borderLeft: '4px solid #2563EB', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'} onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}>
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
            { key: 'funnel' as const, label: '퍼널', icon: '📊' },
          ]).map(t => (
            <button key={t.key} onClick={() => switchTab(t.key)} style={{
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

          {/* ━━ 리드 탭 ━━ */}
          {activeTab === 'leads' && (
            <>
              {/* 필터 + 검색 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {([
                    { key: 'all' as const, label: `전체 (${unifiedLeads.length})` },
                    { key: 'hot' as const, label: `🔥 견적 상담 (${hotLeads})` },
                    { key: 'warm' as const, label: `📧 관심 (${warmLeads})` },
                    { key: 'cold' as const, label: `📝 PRD 시작 (${coldLeads})` },
                  ]).map(f => (
                    <button key={f.key} onClick={() => switchFilter(f.key)} style={{
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
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="🔍 이메일, 연락처, 프로젝트명 검색..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: '7px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, width: isMobileView ? '100%' : 260, background: '#F8FAFC' }} />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 14 }}>✕</button>
                  )}
                </div>
              </div>

              {/* 결과 요약 */}
              {(leadFilter !== 'all' || dateRange !== 'all' || searchQuery) && (
                <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12, padding: '6px 12px', background: '#F8FAFC', borderRadius: 8, display: 'inline-block' }}>
                  검색 결과: <strong>{filteredLeads.length}건</strong>
                  {leadFilter !== 'all' && <span> · {leadFilter === 'hot' ? '견적 상담' : leadFilter === 'warm' ? '관심' : 'PRD 시작'}</span>}
                  {dateRange !== 'all' && <span> · {dateRange === 'custom' ? `${customDateStart}~${customDateEnd}` : dateRange === 'today' ? '오늘' : dateRange}</span>}
                  {searchQuery && <span> · &quot;{searchQuery}&quot;</span>}
                </div>
              )}

              {/* 리드 카드 리스트 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredLeads.map(lead => (
                  <div key={lead.id} onClick={() => goToLeadDetail(lead)} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
                    borderRadius: 12, border: '1px solid #E2E8F0', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    background: lead.type === 'hot' ? '#FFFBEB' : '#fff',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: lead.type === 'hot' ? '#FEF2F2' : lead.type === 'warm' ? '#FFFBEB' : '#F8FAFC', fontSize: 20, flexShrink: 0 }}>
                      {lead.type === 'hot' ? '🔥' : lead.type === 'warm' ? '📧' : '📝'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{lead.email}</span>
                        {lead.phone && <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 600 }}>📱 {lead.phone}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94A3B8', flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                          color: lead.sourceColor, background: lead.sourceBg,
                          border: `1px solid ${lead.sourceColor}22`,
                        }}>
                          {lead.sourceIcon} {lead.sourceLabel}
                        </span>
                        {lead.projectName && <span style={{ color: '#64748B', fontWeight: 500 }}>| {lead.projectName}</span>}
                        {lead.featureCount && <span>• {lead.featureCount}개 기능</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>{timeSince(lead.createdAt)}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2, color: lead.type === 'hot' ? '#DC2626' : lead.type === 'warm' ? '#D97706' : '#94A3B8' }}>
                        {lead.typeLabel}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredLeads.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>
                    {searchQuery ? `"${searchQuery}" 검색 결과가 없습니다` : '해당 조건의 리드가 없습니다'}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ━━ 세션 탭 ━━ */}
          {activeTab === 'sessions' && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                {dateRange !== 'all' && <span>기간 필터 적용: <strong>{filteredSessions.length}건</strong> / 전체 {d.sessions.total}건</span>}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                    <th style={th}>ID</th><th style={th}>상태</th><th style={th}>단계</th><th style={th}>생성일</th><th style={th}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={td}><code style={{ fontSize: 11 }}>{s.id.slice(0, 8)}</code></td>
                      <td style={td}>{s.completed ? <span style={{ color: '#10B981' }}>✅ 완료</span> : <span style={{ color: '#F59E0B' }}>🔄 진행</span>}</td>
                      <td style={td}>{s.current_step}</td>
                      <td style={td}>{formatDate(s.created_at)}</td>
                      <td style={td}>
                        <button onClick={() => goToSessionDetail(s.id)} disabled={sessionLoading} style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                          상세보기
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSessions.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#94A3B8' }}>데이터 없음</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ━━ 공유PRD 탭 ━━ */}
          {activeTab === 'shared' && (
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  {dateRange !== 'all' && <span>기간 필터 적용: <strong>{filteredSharedPrds.length}건</strong></span>}
                </div>
                <input type="text" placeholder="🔍 프로젝트명 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '6px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, width: 200 }} />
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                    <th style={th}>프로젝트명</th><th style={th}>조회수</th><th style={th}>생성일</th><th style={th}>링크</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSharedPrds.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={td}><strong>{p.project_name}</strong></td>
                      <td style={td}>
                        <span style={{ padding: '2px 8px', borderRadius: 12, background: p.view_count > 5 ? '#FEF2F2' : p.view_count > 1 ? '#FFFBEB' : '#F8FAFC', color: p.view_count > 5 ? '#DC2626' : p.view_count > 1 ? '#D97706' : '#64748B', fontSize: 12, fontWeight: 700 }}>
                          {p.view_count}회
                        </span>
                      </td>
                      <td style={td}>{formatDate(p.created_at)}</td>
                      <td style={td}>
                        <a href={`/share/${p.share_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>열기 ↗</a>
                      </td>
                    </tr>
                  ))}
                  {filteredSharedPrds.length === 0 && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: '#94A3B8' }}>데이터 없음</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* ━━ 퍼널 분석 탭 ━━ */}
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
                                  fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                                  background: convRate > 50 ? '#F0FDF4' : convRate > 20 ? '#FFFBEB' : '#FEF2F2',
                                  color: convRate > 50 ? '#166534' : convRate > 20 ? '#92400E' : '#991B1B',
                                }}>
                                  {convRate}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ width: '100%', height: 28, background: '#F1F5F9', borderRadius: 8, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: step.color, borderRadius: 8, transition: 'width 0.5s ease', minWidth: step.value > 0 ? 20 : 0, opacity: 0.85 }} />
                          </div>
                          {i < funnelSteps.length - 1 && <div style={{ textAlign: 'center', fontSize: 16, color: '#CBD5E1', margin: '4px 0' }}>↓</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

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
