import { createClient } from '@supabase/supabase-js';
import SharedPRDView from '@/components/SharedPRDView';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lwecmebszyqgomzvexxt.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('shared_prds')
    .select('*')
    .eq('share_id', id)
    .single();

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0F2F5' }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>PRD를 찾을 수 없습니다</h1>
          <p style={{ fontSize: 15, color: '#475569' }}>링크가 만료되었거나 올바르지 않습니다.</p>
          <a href="/" style={{ display: 'inline-block', marginTop: 16, padding: '10px 24px', borderRadius: 10, background: '#2563EB', color: 'white', textDecoration: 'none', fontWeight: 600 }}>
            새 PRD 만들기
          </a>
        </div>
      </div>
    );
  }

  // Increment view count
  await supabase.from('shared_prds').update({ view_count: (data.view_count || 0) + 1 }).eq('share_id', id);

  return <SharedPRDView rfpDocument={data.rfp_document} projectName={data.project_name} rfpData={data.rfp_data} shareId={id} viewCount={data.view_count + 1} />;
}
