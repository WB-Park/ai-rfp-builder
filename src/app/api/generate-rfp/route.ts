// AI RFP Builder — RFP Document Generation API (PRD F2)
// Fallback: API 키 없으면 템플릿 기반 문서 생성
import { NextRequest, NextResponse } from 'next/server';
import { RFP_GENERATION_PROMPT } from '@/lib/prompts';
import { RFPData } from '@/types/rfp';

const HAS_API_KEY = !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'placeholder';

function generateFallbackRFP(rfpData: RFPData): string {
  const features = rfpData.coreFeatures
    .map((f, i) => `  ${i + 1}. [${f.priority}] ${f.name}\n     ${f.description}`)
    .join('\n');

  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
소프트웨어 개발 제안요청서 (RFP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
작성일: ${new Date().toLocaleDateString('ko-KR')}
작성 도구: 위시켓 AI RFP Builder

━━ 1. 프로젝트 개요 ━━
${rfpData.overview || '(미입력)'}

━━ 2. 타겟 사용자 ━━
${rfpData.targetUsers || '(미입력)'}

━━ 3. 핵심 기능 요구사항 ━━
${features || '(미입력)'}

━━ 4. 참고 서비스 ━━
${rfpData.referenceServices || '(미입력)'}

━━ 5. 기술 요구사항 ━━
${rfpData.techRequirements || '(미입력)'}

━━ 6. 예산 및 일정 ━━
${rfpData.budgetTimeline || '(미입력)'}

━━ 7. 추가 요구사항 ━━
${rfpData.additionalRequirements || '(미입력)'}

━━ AI 추천 사항 ━━
• MVP 스코프로 핵심 기능 우선 개발 후 점진적 확장을 권장합니다.
• P1 기능 중심으로 1차 릴리즈 후, P2/P3 기능은 사용자 피드백 기반으로 우선순위를 재조정하세요.
• 개발사 선정 시 유사 프로젝트 포트폴리오 검토를 권장합니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
본 RFP는 위시켓 AI RFP Builder로 생성되었습니다.
개발사에 바로 전달 가능한 문서입니다.

위시켓 | wishket.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { rfpData }: { rfpData: RFPData } = await req.json();

    if (!rfpData || !rfpData.overview) {
      return NextResponse.json({ error: 'RFP 데이터가 필요합니다.' }, { status: 400 });
    }

    // ━━ Fallback mode ━━
    if (!HAS_API_KEY) {
      return NextResponse.json({
        rfpDocument: generateFallbackRFP(rfpData),
        generatedAt: new Date().toISOString(),
      });
    }

    // ━━ AI mode ━━
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: RFP_GENERATION_PROMPT,
      messages: [{
        role: 'user',
        content: `아래 수집된 정보로 RFP 문서를 작성해주세요:\n\n${JSON.stringify(rfpData, null, 2)}`,
      }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      return NextResponse.json({
        rfpDocument: generateFallbackRFP(rfpData),
        generatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      rfpDocument: content.text,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('RFP generation error:', error);
    try {
      const body = await req.clone().json();
      return NextResponse.json({
        rfpDocument: generateFallbackRFP(body.rfpData),
        generatedAt: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json(
        { error: 'RFP 생성 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
  }
}
