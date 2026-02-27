// AI RFP Builder — RFP Document Generation API (PRD F2)
// Fallback: API 키 없으면 템플릿 기반 문서 생성
import { NextRequest, NextResponse } from 'next/server';
import { RFP_GENERATION_PROMPT } from 'A/lib/prompts';
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
${rfpData.techRequirements || '鏹R하�`요)'�
{$aﺉ`x� 1.�2. 씔로쬸드 젅ꋬ할 사항
  {"� 3기검 요구사항ࡅ ━━
${rfpData.additionalRequirements || '鏹R하�`요)'