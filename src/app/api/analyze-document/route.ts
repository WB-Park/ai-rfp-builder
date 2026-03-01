import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    const { documentText } = await req.json();

    if (!documentText || documentText.length < 20) {
      return NextResponse.json({ error: '문서 내용이 너무 짧습니다.' }, { status: 400 });
    }

    const truncated = documentText.slice(0, 8000); // 토큰 절약

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `당신은 IT 프로젝트 기획서를 분석하는 전문가입니다.
사용자가 업로드한 문서를 분석하여 PRD 작성에 필요한 핵심 정보를 추출합니다.

반드시 아래 JSON 형식으로만 응답하세요:
{
  "overview": "프로젝트 개요 (2~3문장)",
  "targetUsers": "타겟 사용자 설명",
  "coreFeatures": ["기능1", "기능2", ...],
  "techRequirements": "기술 요구사항",
  "referenceServices": "참고 서비스",
  "additionalRequirements": "추가 요구사항",
  "summary": "분석 요약 (사용자에게 보여줄 1~2문장)"
}`,
      messages: [{ role: 'user', content: `다음 문서를 분석해서 PRD에 필요한 핵심 정보를 추출해주세요:\n\n${truncated}` }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      // JSON 파싱 시도
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({ analysis: parsed });
      }
    } catch {
      // JSON 파싱 실패 시 텍스트 그대로 반환
    }

    return NextResponse.json({ analysis: { summary: text, overview: text.slice(0, 300) } });
  } catch (err) {
    console.error('Document analysis error:', err);
    return NextResponse.json({ error: 'Failed to analyze document' }, { status: 500 });
  }
}
