import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lwecmebszyqgomzvexxt.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'wishket2024!';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, password, sessionId, leadId, leadType } = body;

    // 인증 확인
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 });
    }

    if (action === 'dashboard') {
      // 대시보드 요약 통계 — PRD 빌더 전용 테이블만
      const [sessionsRes, rfpLeadsRes, sharedRes, consultRes, ctaLeadsRes] = await Promise.all([
        supabase.from('rfp_sessions').select('id, lead_id, current_step, completed, created_at, updated_at', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
        supabase.from('rfp_leads').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
        supabase.from('shared_prds').select('id, share_id, project_name, created_at, view_count', { count: 'exact' }).order('created_at', { ascending: false }).limit(200),
        supabase.from('rfp_consultations').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(50),
        supabase.from('cta_leads').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
      ]);

      return NextResponse.json({
        sessions: {
          data: sessionsRes.data || [],
          total: sessionsRes.count || 0,
        },
        rfpLeads: {
          data: rfpLeadsRes.data || [],
          total: rfpLeadsRes.count || 0,
        },
        sharedPrds: {
          data: sharedRes.data || [],
          total: sharedRes.count || 0,
        },
        consultations: {
          data: consultRes.data || [],
          total: consultRes.count || 0,
        },
        ctaLeads: {
          data: ctaLeadsRes.data || [],
          total: ctaLeadsRes.count || 0,
        },
      });
    }

    if (action === 'session-detail') {
      if (!sessionId) {
        return NextResponse.json({ error: 'sessionId 필요' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('rfp_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        return NextResponse.json({ error: '세션을 찾을 수 없습니다' }, { status: 404 });
      }

      return NextResponse.json({ session: data });
    }

    // ━━ 리드 상세 조회 (세일즈팀용) ━━
    if (action === 'lead-detail') {
      if (!leadId || !leadType) {
        return NextResponse.json({ error: 'leadId, leadType 필요' }, { status: 400 });
      }

      if (leadType === 'cta') {
        // CTA 리드 상세: 리드 정보 + 프로젝트명으로 shared_prds 매칭 + 세션 데이터
        const { data: ctaLead } = await supabase
          .from('cta_leads')
          .select('*')
          .eq('id', leadId)
          .single();

        if (!ctaLead) {
          return NextResponse.json({ error: '리드를 찾을 수 없습니다' }, { status: 404 });
        }

        // 1) shared_prds에서 project_name으로 매칭 → PRD 문서 가져오기
        let sharedPrd = null;
        if (ctaLead.project_name) {
          const { data: sharedData } = await supabase
            .from('shared_prds')
            .select('share_id, project_name, rfp_document, rfp_data, view_count, created_at')
            .eq('project_name', ctaLead.project_name)
            .order('created_at', { ascending: false })
            .limit(1);
          if (sharedData && sharedData.length > 0) {
            sharedPrd = sharedData[0];
          }
        }

        // 2) session_id가 있으면 세션 직접 조회, 없으면 rfp_leads email로 세션 탐색
        let session = null;
        if (ctaLead.session_id) {
          const { data: sessionData } = await supabase
            .from('rfp_sessions')
            .select('id, lead_id, rfp_data, messages, current_step, completed, created_at')
            .eq('id', ctaLead.session_id)
            .single();
          session = sessionData;
        } else if (ctaLead.email) {
          // email로 rfp_leads → lead_id로 세션 찾기
          const { data: rfpLead } = await supabase
            .from('rfp_leads')
            .select('id')
            .eq('email', ctaLead.email)
            .limit(1);
          if (rfpLead && rfpLead.length > 0) {
            const { data: sessionData } = await supabase
              .from('rfp_sessions')
              .select('id, lead_id, rfp_data, messages, current_step, completed, created_at')
              .eq('lead_id', rfpLead[0].id)
              .eq('completed', true)
              .order('created_at', { ascending: false })
              .limit(1);
            if (sessionData && sessionData.length > 0) {
              session = sessionData[0];
            }
          }
        }

        return NextResponse.json({
          lead: ctaLead,
          sharedPrd,
          session,
        });
      }

      if (leadType === 'rfp') {
        // RFP 리드 상세: 리드 정보 + 연결된 세션들 + 공유 PRD
        const { data: rfpLead } = await supabase
          .from('rfp_leads')
          .select('*')
          .eq('id', leadId)
          .single();

        if (!rfpLead) {
          return NextResponse.json({ error: '리드를 찾을 수 없습니다' }, { status: 404 });
        }

        // lead_id로 세션 찾기
        const { data: sessions } = await supabase
          .from('rfp_sessions')
          .select('id, lead_id, rfp_data, messages, current_step, completed, created_at')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(5);

        // 세션의 rfp_data에서 프로젝트명 추출 → shared_prds 매칭
        let sharedPrd = null;
        if (sessions && sessions.length > 0) {
          for (const sess of sessions) {
            const projectName = sess.rfp_data?.projectName || sess.rfp_data?.overview?.slice(0, 50);
            if (projectName) {
              const { data: sharedData } = await supabase
                .from('shared_prds')
                .select('share_id, project_name, rfp_document, rfp_data, view_count, created_at')
                .ilike('project_name', `%${projectName.slice(0, 20)}%`)
                .order('created_at', { ascending: false })
                .limit(1);
              if (sharedData && sharedData.length > 0) {
                sharedPrd = sharedData[0];
                break;
              }
            }
          }
        }

        // CTA 리드 테이블에서 같은 이메일로 견적 신청한 건 있는지
        let ctaLead = null;
        if (rfpLead.email) {
          const { data: ctaData } = await supabase
            .from('cta_leads')
            .select('*')
            .eq('email', rfpLead.email)
            .order('created_at', { ascending: false })
            .limit(1);
          if (ctaData && ctaData.length > 0) {
            ctaLead = ctaData[0];
          }
        }

        return NextResponse.json({
          lead: rfpLead,
          sessions: sessions || [],
          sharedPrd,
          ctaLead,
        });
      }

      return NextResponse.json({ error: '알 수 없는 leadType' }, { status: 400 });
    }

    // ━━ 개인화 메일 생성 (Claude API) ━━
    if (action === 'generate-email') {
      const { projectName, overview, coreFeatures, chatSummary, email, phone, featureCount } = body;

      if (!projectName && !overview) {
        return NextResponse.json({ error: '프로젝트 정보가 필요합니다' }, { status: 400 });
      }

      const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-api03-ugNUhNwn6n6n8rpCc_DurylDovUxGsnghUtftskdUApseqmCNT2VUAuIvIEhbjWmgfdMwVz1jB3dgeujX5oflgSQ-U8uZIAAA';

      const featureList = Array.isArray(coreFeatures)
        ? coreFeatures.map((f: any) => typeof f === 'string' ? f : `${f.name}${f.priority ? ` (${f.priority})` : ''}`).join(', ')
        : '';

      const systemPrompt = `당신은 위시켓(Wishket)의 세일즈 매니저입니다.
위시켓은 IT 아웃소싱 매칭 플랫폼으로, 검증된 개발 파트너를 연결해 드립니다.

고객이 AI PRD 빌더를 통해 프로젝트 정의서를 작성한 상태입니다.
이 고객에게 위시켓에 프로젝트를 등록하도록 유도하는 개인화된 이메일을 작성해 주세요.

작성 가이드라인:
1. 프로젝트 내용을 구체적으로 언급해서 "내 프로젝트를 진짜 봤구나"라는 인상을 줄 것
2. 위시켓 프로젝트 등록 시 받을 수 있는 혜택을 자연스럽게 안내:
   - 48시간 내 검증된 파트너사 매칭
   - 프로젝트 규모에 맞는 견적 비교 가능
   - 계약/정산 안전결제 시스템
   - 전담 PM이 프로젝트 진행 서포트
3. 과도한 영업 톤은 피하되, 다음 액션이 명확하게 드러나도록 작성
4. CTA는 "위시켓에 프로젝트 등록하기" 또는 "무료 상담 신청"
5. 형식은 이메일 본문만 (제목 별도 출력). 제목은 [제목] 태그로 맨 처음에.
6. 존댓말 사용, 비즈니스 메일 톤 (너무 딱딱하지 않게)
7. 길이는 300-500자 이내로 간결하게`;

      const userPrompt = `다음 고객의 프로젝트 정보를 기반으로 개인화된 이메일을 작성해 주세요.

프로젝트명: ${projectName || '(미확인)'}
프로젝트 개요: ${overview || '(미확인)'}
핵심 기능: ${featureList || '(미확인)'}
기능 수: ${featureCount ?? '미확인'}개
${chatSummary ? `고객 대화 요약:\n${chatSummary}` : ''}

위 내용을 바탕으로 [제목] 과 본문을 작성해 주세요.`;

      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text();
        console.error('Anthropic API error:', errText);
        return NextResponse.json({ error: '메일 생성 실패' }, { status: 500 });
      }

      const anthropicData = await anthropicRes.json();
      const emailContent = anthropicData.content?.[0]?.text || '';

      // [제목] 파싱
      const subjectMatch = emailContent.match(/\[제목\]\s*(.+)/);
      const subject = subjectMatch ? subjectMatch[1].trim() : `[위시켓] ${projectName || '프로젝트'} 관련 안내`;
      const emailBody = emailContent.replace(/\[제목\]\s*.+\n?/, '').trim();

      return NextResponse.json({ subject, body: emailBody });
    }

    return NextResponse.json({ error: '알 수 없는 action' }, { status: 400 });
  } catch (err) {
    console.error('Admin API error:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
