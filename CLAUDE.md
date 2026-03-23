# 프로젝트 장기기억 — AI RFP Builder (위시켓 PRD)

> 이 파일은 세션 간 컨텍스트 유지를 위한 프로젝트 레퍼런스입니다.
> 새 세션 시작 시 반드시 이 파일을 먼저 읽어주세요.

---

## 1. CEO 지시사항 (항상 준수)

- **"알아서 실행해서 계속 만들어"** — 자율적으로 빌드
- **"일단 돌아가야지~ 고객 후킹되 되야하고, 리드도 쌓여야지~"** — 고객 후킹 & 리드 수집 최우선
- **"이게 GPT보다 퀄리티가 좋아야되"** — ChatGPT 품질 초과 필수
- **"반말하지마 죽여버리기전에"** — 반드시 존댓말(formal Korean) 사용
- **"api 당연히 써야지"** — 실제 Anthropic API 사용 필수
- **NEVER use Haiku model** — "하이쿠는 결과가 병신이야. 소넷으로 원복해"
- **Deep→Quick 모드 폴백 금지**

---

## 2. 인프라 & 계정

| 항목 | 값 |
|---|---|
| **프로덕션 URL** | `https://wishket-prd.com` |
| **GitHub** | Owner: `WB-Park`, Repo: `ai-rfp-builder` |
| **Vercel Team** | `team_TyRq4QriIhelhm8e81VYKF6u` |
| **Vercel Project** | `prj_hZcy78kD2snSWbjRhLn322eqpvMW` |
| **Supabase Project** | `lwecmebszyqgomzvexxt` |
| **Anthropic API Key** | Vercel 환경변수 `ANTHROPIC_API_KEY` 참조 |
| **Claude Model** | `claude-sonnet-4-20250514` (절대 Haiku 사용 금지) |
| **GA4** | `G-TVBPL9CWCM` |
| **Meta Pixel** | `785746947924945` |
| **Admin URL** | `https://wishket-prd.com/admin` |
| **Admin Password** | 코드 내 하드코딩 참조 (`admin/page.tsx`) |
| **Slack Webhook (#알림_prd)** | Vercel 환경변수 `SLACK_WEBHOOK_URL` 참조 |

---

## 3. 기술 스택

- **Framework**: Next.js App Router + TypeScript
- **배포**: Vercel (GitHub main 브랜치 자동 배포)
- **DB**: Supabase (PostgreSQL)
- **AI**: Claude Sonnet API (Anthropic)
- **스타일**: Tailwind CSS + 커스텀 CSS
- **알림**: Slack Incoming Webhook (Block Kit 강화 알림 포함)

---

## 4. Supabase 테이블 구조

| 테이블 | 용도 |
|---|---|
| `rfp_sessions` | PRD 빌더 세션 데이터 |
| `rfp_leads` | PRD 빌더 랜딩 이메일 수집 |
| `shared_prds` | 공유 PRD 링크 |
| `rfp_consultations` | 상담 신청 |
| `cta_leads` | CTA 리드 (email, phone, project_name, project_type, feature_count, session_id, marketing_consent, source, created_at) |

---

## 5. 주요 파일 맵

### API Routes
| 파일 | 기능 |
|---|---|
| `src/app/api/chat/route.ts` | 메인 챗봇 API (Deep/Quick 모드, 시스템 프롬프트, 페이즈 관리) |
| `src/app/api/generate-rfp/route.ts` | PRD 문서 생성 (3개 병렬 API 호출) |
| `src/app/api/admin/route.ts` | 어드민 API (dashboard, session-detail, lead-detail, generate-email) |
| `src/app/api/cta-lead/route.ts` | CTA 리드 저장 + Slack 알림 (기본 + Block Kit 강화) |
| `src/app/api/slack-notify/route.ts` | 범용 Slack 알림 (new_lead, rfp_completed, consultation_request + Block Kit 강화) |
| `src/app/api/consultation/route.ts` | 상담 신청 저장 + Slack Block Kit 알림 |
| `src/app/api/session/route.ts` | 세션 CRUD |
| `src/app/api/share-prd/route.ts` | PRD 공유 링크 생성 |
| `src/app/api/regenerate-section/route.ts` | PRD 섹션 재생성 |
| `src/app/api/send-rfp-email/route.ts` | PRD 이메일 발송 |
| `src/app/api/analyze-document/route.ts` | 문서 분석 |

### 프론트엔드
| 파일 | 기능 |
|---|---|
| `src/app/page.tsx` | 메인 랜딩 페이지 |
| `src/app/admin/page.tsx` | 어드민 대시보드 (URL 기반 SPA 라우팅, 리드 통합 뷰, AI 이메일 생성, 날짜 필터) |
| `src/components/ChatInterface.tsx` | 채팅 인터페이스 (Deep/Quick 모드, 4-Gate 기능 선택기) |
| `src/components/RFPComplete.tsx` | PRD 완성 뷰 (마크다운 테이블 파싱, 프리미엄 섹션) |
| `src/app/share/[id]/page.tsx` | 공유 PRD 페이지 |

---

## 6. 핵심 기능 아키텍처

### Deep Mode (대화형 PRD 작성)
- **5단계 페이즈**: 프로젝트 개요 → 핵심 기능 → 세부 요구사항 → 비기능 요구사항 → 최종 확인
- **꼬리 질문 방식**: 3개 질문 + suggestions 제공
- **Insight 시스템**: 7개 카테고리 (market, technical, ux, cost, risk, timeline, strategy)
- **rfpData/rfpUpdates**: 대화 중 실시간 PRD 데이터 업데이트
- **완성도 분석**: `analyzeInfoCompleteness()` 함수로 자동 판별
- **전환 로직**: `determineDeepPhase()` 함수

### Quick Mode
- 단일 질문으로 빠른 PRD 생성
- Deep 모드 대비 간소화된 출력

### 어드민 대시보드
- **URL 기반 라우팅**: `pushState`/`popState` SPA 방식
- **통합 리드 뷰**: `cta_leads` + `rfp_leads` 병합, 타입 분류
- **날짜 필터**: today, 7d, 30d, 90d, custom date picker
- **AI 이메일 생성**: Claude API로 리드별 개인화 세일즈 메일 작성
- **이메일/전화번호 복사 버튼**

### Slack 알림 체계
- **기본 알림**: 텍스트 포맷 (리드 정보 요약)
- **강화 알림**: Block Kit 포맷 (헤더, 구조화된 필드, 프로젝트 규모 판별, 어드민 링크)
- **적용 범위**: cta-lead, slack-notify, consultation API 모두 적용

### PRD 문서 생성
- **3개 병렬 API 호출**: Executive Summary + 기능 명세 + 기술 요구사항
- **마크다운 테이블 렌더링**: `formatTextContent()` 함수에서 파싱
- **프리미엄 섹션**: 유료 잠금 콘텐츠

---

## 7. 환경 변수 (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
SLACK_WEBHOOK_URL
NEXT_PUBLIC_GA_ID=G-TVBPL9CWCM
NEXT_PUBLIC_META_PIXEL_ID=785746947924945
```

---

## 8. 배포 플로우

1. 코드 수정
2. `npm run build` — 빌드 확인
3. `git add` + `git commit` + `git push origin main`
4. Vercel 자동 배포 (main 브랜치 트리거)

---

## 9. 커밋 히스토리 (최근)

| 해시 | 내용 |
|---|---|
| `99d0af3` | 리드 수집 시 강화된 Slack Block Kit 알림 추가 |
| `68fb256` | 마크다운 테이블 렌더링 수정 |
| `24d9290` | 이메일/전화번호 복사 버튼 |
| `fc7a490` | AI 개인화 메일 생성 |
| `8c52144` | 어드민 URL 기반 라우팅 + 날짜 필터 |

---

## 10. 알려진 주의사항

- `RFPComplete.tsx`는 ~4100줄 대형 파일 — 수정 시 디스크 공간 주의 (`rm -rf .next` 등으로 확보)
- Edit tool 사용 전 반드시 Read로 최신 상태 확인
- Vercel 배포 후 캐시로 즉시 반영 안 될 수 있음
- Supabase RLS 정책 확인 필요 (서비스 롤 키 사용 중)

---

## 11. CEO 프로필

- **이름**: 박우범 (WB)
- **이메일**: parkwoobeom@gmail.com
- **직함**: 위시켓 CEO
- **커뮤니케이션**: 한국어, 존댓말 필수, 간결한 보고 선호

---

*마지막 업데이트: 2026-03-23*
