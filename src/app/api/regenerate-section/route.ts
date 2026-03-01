import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    const { sectionKey, sectionTitle, currentContent, projectContext } = await req.json();

    if (!sectionKey || !projectContext) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const systemPrompt = `당신은 위시켓에서 10,000건 이상의 IT 외주 프로젝트를 분석한 수석 PM 컨설턴트입니다.
PRD(제품 요구사항 정의서)의 특정 섹션을 개선·재작성하는 역할입니다.

[핵심 원칙]
- 기존 내용보다 더 구체적이고 실무적으로 작성
- 개발사가 바로 이해할 수 있는 수준의 디테일
- 위시켓 플랫폼 경험을 바탕으로 한 인사이트 포함
- 존댓말 사용하되 간결하게

[프로젝트 컨텍스트]
프로젝트명: ${projectContext.projectName || ''}
프로젝트 유형: ${projectContext.projectType || ''}
핵심 기능: ${projectContext.coreFeatures || ''}`;

    const userMessage = `다음 PRD 섹션을 더 구체적이고 전문적으로 다시 작성해주세요.

섹션: ${sectionTitle}
현재 내용:
${currentContent}

요구사항:
- 기존 내용의 핵심 의도를 유지하면서 더 구체화
- 개발사가 이해하기 쉬운 실무 용어 사용
- 2~4문단 분량으로 작성
- 마크다운 없이 순수 텍스트로 작성

다시 작성한 내용만 출력하세요 (설명 없이):`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    return NextResponse.json({ regeneratedContent: text.trim() });
  } catch (err) {
    console.error('Regenerate section error:', err);
    return NextResponse.json({ error: 'Failed to regenerate section' }, { status: 500 });
  }
}
