'use client';

import { useState, useCallback } from 'react';

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

interface DashboardData {
  sessions: { data: Session[]; total: number };
  leads: { data: Lead[]; total: number };
  sharedPrds: { data: SharedPrd[]; total: number };
  consultations: { data: Consultation[]; total: number };
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<'sessions' | 'leads' | 'shared' | 'consultations'>('sessions');
  const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDashboard(password);
  };

  const viewSessionDetail = async (sessionId: string) => {
    setSessionLoading(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'session-detail', password, sessionId }),
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

  // 로그인 화면
  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <form onSubmit={handleLogin} style={{ background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', width: '360px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', textAlign: 'center' }}>🔐 Admin Dashboard</h1>
          <input
            type="password"
            placeholder="비밀번호 입력"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box' }}
          />
          {error && <p style={{ color: '#e53e3e', fontSize: '13px', marginBottom: '12px' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            {loading ? '로딩...' : '로그인'}
          </button>
        </form>
      </div>
    );
  }

  // 세션 상세 뷰
  if (selectedSession) {
    const s = selectedSession;
    const messages = Array.isArray(s.messages) ? s.messages : [];
    const rfpData = s.rfp_data || {};

    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <button onClick={() => setSelectedSession(null)} style={{ background: '#e2e8f0', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', marginBottom: '16px' }}>
            ← 목록으로
          </button>

          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>세션 상세 — {s.id.slice(0, 8)}...</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
              <div><strong>상태:</strong> {s.completed ? '✅ 완료' : '🔄 진행중'}</div>
              <div><strong>현재 단계:</strong> {s.current_step}</div>
              <div><strong>생성:</strong> {formatDate(s.created_at)}</div>
              <div><strong>업데이트:</strong> {formatDate(s.updated_at)}</div>
              <div><strong>대화 수:</strong> {messages.length}턴</div>
              <div><strong>리드 ID:</strong> {s.lead_id || '-'}</div>
            </div>
          </div>

          {/* RFP 데이터 */}
          {rfpData && Object.keys(rfpData).length > 0 && (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', marginBottom: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>📋 RFP 데이터</h3>
              <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                {rfpData.overview && <p><strong>프로젝트 개요:</strong> {rfpData.overview}</p>}
                {rfpData.targetUsers && <p><strong>타겟 사용자:</strong> {rfpData.targetUsers}</p>}
                {rfpData.chatMode && <p><strong>모드:</strong> {rfpData.chatMode === 'deep' ? '🔵 Deep' : '⚡ Quick'}</p>}
                {rfpData.version && <p><strong>버전:</strong> {rfpData.version}</p>}
                {Array.isArray(rfpData.coreFeatures) && rfpData.coreFeatures.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <strong>핵심 기능:</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      {rfpData.coreFeatures.map((f: any, i: number) => (
                        <li key={i}>{f.name} ({f.priority}) — {f.description || ''}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 대화 내역 */}
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>💬 대화 내역 ({messages.length}턴)</h3>
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {messages.length === 0 && <p style={{ color: '#999', fontSize: '13px' }}>대화 기록 없음</p>}
              {messages.map((m, i) => (
                <div key={i} style={{
                  padding: '12px',
                  marginBottom: '8px',
                  borderRadius: '8px',
                  background: m.role === 'user' ? '#eff6ff' : '#f8f8f8',
                  borderLeft: `3px solid ${m.role === 'user' ? '#3b82f6' : '#10b981'}`,
                  fontSize: '13px',
                  lineHeight: '1.6',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px', color: m.role === 'user' ? '#2563eb' : '#059669' }}>
                    {m.role === 'user' ? '👤 고객' : '🤖 AI PM'}
                    {m.chatMode && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#888' }}>({m.chatMode})</span>}
                    {m.deepPhase && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#888' }}>[{m.deepPhase}]</span>}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{typeof m.content === 'string' ? m.content.slice(0, 2000) : JSON.stringify(m.content).slice(0, 500)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* PRD 문서 */}
          {s.rfp_document && (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', marginTop: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>📄 PRD 문서</h3>
              <div style={{ fontSize: '13px', maxHeight: '400px', overflowY: 'auto', whiteSpace: 'pre-wrap', background: '#fafafa', padding: '16px', borderRadius: '8px', lineHeight: '1.6' }}>
                {s.rfp_document.slice(0, 5000)}
                {s.rfp_document.length > 5000 && <p style={{ color: '#999', marginTop: '8px' }}>... (이하 생략, 총 {s.rfp_document.length}자)</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 메인 대시보드
  const d = dashboard!;
  const completedSessions = d.sessions.data.filter(s => s.completed).length;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800 }}>📊 AI PRD Builder — Admin</h1>
          <button onClick={() => fetchDashboard(password)} style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            🔄 새로고침
          </button>
        </div>

        {/* 요약 카드 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: '전체 세션', value: d.sessions.total, icon: '📝', color: '#3b82f6' },
            { label: '완료된 PRD', value: completedSessions, icon: '✅', color: '#10b981' },
            { label: '수집된 리드', value: d.leads.total, icon: '👤', color: '#8b5cf6' },
            { label: '공유된 PRD', value: d.sharedPrds.total, icon: '🔗', color: '#f59e0b' },
          ].map((c, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderTop: `3px solid ${c.color}` }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>{c.icon} {c.label}</div>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          {[
            { key: 'sessions' as const, label: `세션 (${d.sessions.total})` },
            { key: 'leads' as const, label: `리드 (${d.leads.total})` },
            { key: 'shared' as const, label: `공유 PRD (${d.sharedPrds.total})` },
            { key: 'consultations' as const, label: `상담 (${d.consultations.total})` },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '10px 20px', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              background: activeTab === t.key ? '#fff' : '#e2e8f0', color: activeTab === t.key ? '#1e293b' : '#64748b',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 테이블 */}
        <div style={{ background: '#fff', borderRadius: '0 12px 12px 12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          {activeTab === 'sessions' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
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
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={td}><code style={{ fontSize: '11px' }}>{s.id.slice(0, 8)}</code></td>
                    <td style={td}>{s.completed ? <span style={{ color: '#10b981' }}>✅ 완료</span> : <span style={{ color: '#f59e0b' }}>🔄 진행</span>}</td>
                    <td style={td}>{s.current_step}</td>
                    <td style={td}><code style={{ fontSize: '11px' }}>{s.lead_id?.slice(0, 8) || '-'}</code></td>
                    <td style={td}>{formatDate(s.created_at)}</td>
                    <td style={td}>
                      <button onClick={() => viewSessionDetail(s.id)} disabled={sessionLoading} style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))}
                {d.sessions.data.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#999' }}>데이터 없음</td></tr>}
              </tbody>
            </table>
          )}

          {activeTab === 'leads' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={th}>이름</th>
                  <th style={th}>이메일</th>
                  <th style={th}>전화번호</th>
                  <th style={th}>회사</th>
                  <th style={th}>소스</th>
                  <th style={th}>가입일</th>
                </tr>
              </thead>
              <tbody>
                {d.leads.data.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={td}>{l.name || '-'}</td>
                    <td style={td}>{l.email || '-'}</td>
                    <td style={td}>{l.phone || '-'}</td>
                    <td style={td}>{l.company || '-'}</td>
                    <td style={td}>{l.source || '-'}</td>
                    <td style={td}>{formatDate(l.created_at)}</td>
                  </tr>
                ))}
                {d.leads.data.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#999' }}>데이터 없음</td></tr>}
              </tbody>
            </table>
          )}

          {activeTab === 'shared' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={th}>공유 ID</th>
                  <th style={th}>프로젝트명</th>
                  <th style={th}>조회수</th>
                  <th style={th}>생성일</th>
                  <th style={th}>링크</th>
                </tr>
              </thead>
              <tbody>
                {d.sharedPrds.data.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={td}><code style={{ fontSize: '11px' }}>{p.share_id}</code></td>
                    <td style={td}>{p.project_name}</td>
                    <td style={td}>{p.view_count}</td>
                    <td style={td}>{formatDate(p.created_at)}</td>
                    <td style={td}>
                      <a href={`/share/${p.share_id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontSize: '12px' }}>
                        열기 ↗
                      </a>
                    </td>
                  </tr>
                ))}
                {d.sharedPrds.data.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#999' }}>데이터 없음</td></tr>}
              </tbody>
            </table>
          )}

          {activeTab === 'consultations' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={th}>유형</th>
                  <th style={th}>선호 시간</th>
                  <th style={th}>예산</th>
                  <th style={th}>상태</th>
                  <th style={th}>요약</th>
                  <th style={th}>신청일</th>
                </tr>
              </thead>
              <tbody>
                {d.consultations.data.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={td}>{c.cta_type || '-'}</td>
                    <td style={td}>{c.preferred_time || '-'}</td>
                    <td style={td}>{c.budget_range || '-'}</td>
                    <td style={td}>{c.status || 'new'}</td>
                    <td style={td} title={c.rfp_summary || ''}>{(c.rfp_summary || '-').slice(0, 50)}</td>
                    <td style={td}>{formatDate(c.created_at)}</td>
                  </tr>
                ))}
                {d.consultations.data.length === 0 && <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#999' }}>데이터 없음</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#475569' };
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'top' };
