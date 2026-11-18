# AI 남자친구 앱 — 화면별 최소기능 & 기술스택

## 확정된 전제
- 캐릭터 4명: 직장인, 아이돌, 체대생, 홍대보이
- 카톡 느낌의 1:1 채팅
- LLM은 Gemini API 사용, 파인튜닝은 하지 않음, 스트리밍 없이 한 번에 응답
- 캐릭터 프롬프트(성격·말투 등)는 DB가 아니라 코드로 관리
- 루비(가상 재화) 충전 후 사용량만큼 차감하는 결제 (구독 아님)
- 가입할 때 연령 확인
- 회원 탈퇴 시 채팅 메시지 삭제

| 영역 | 도구 |
|---|---|
| LLM | Gemini |
| 프론트/호스팅 | Vercel |
| 백엔드(DB·Auth) | Supabase |
| 로그인 | Google OAuth, 이메일 |
| 결제 | Polar (Merchant of Record) |
| 유저 분석 | PostHog |

---

## 결제: Polar + 루비
Stripe는 한국(KR) 사업자 계정을 열 수 없어서, Merchant of Record(판매 대행·세금 처리)인 **Polar**를 써요. Polar는 한국으로 정산(Stripe Connect Express)할 수 있어요.

- **루비:** 1루비 = 5,000점 = 약 100원. 점수 = 입력토큰 × 1 + (출력 + thinking 토큰) × 8 (모델별 가중치는 `lib/billing/pricing.ts`)
- 답변·장기기억 요약 LLM 호출마다 점수를 쌓고 5,000점마다 1루비 차감 (DB 함수 `charge_ruby_usage`)
- **무료:** 하루 10루비 (KST 자정에 다시 채워짐, 이월 없음, `FREE_DAILY_RUBIES`). 무료 → 충전 루비 순으로 차감
- **상품:** 1회 결제 50 / 100 / 150루비 ($3.79 / $7.49 / $11.19, 세금 포함 USD)
- 결제 로직은 `lib/billing/`에 모아둬요. 수수료: 5% + 50¢ (해외 카드 +1.5%), 환불해도 수수료는 돌려받지 못함

참고 문서
- https://polar.sh/docs/merchant-of-record/supported-countries
- https://polar.sh/docs/merchant-of-record/fees

---

## 공통 기술스택

| 영역 | 선택 | 라이브러리 |
|---|---|---|
| 프레임워크 | Next.js (App Router) + TypeScript, Vercel 배포 | `next`, `react` |
| UI | Tailwind CSS + shadcn/ui | `tailwindcss`, `shadcn/ui`, `lucide-react`, `sonner` |
| 폼/검증 | | `react-hook-form`, `zod` |
| DB/인증 | Supabase (Postgres + Auth + RLS) | `@supabase/supabase-js`, `@supabase/ssr` |
| LLM | Gemini, 서버에서만 호출 | `@google/genai` |
| 결제 | Polar Checkout + Webhook | `@polar-sh/sdk`, `@polar-sh/nextjs` |
| 분석 | PostHog | `posthog-js`, `posthog-node` |
| 날짜 | | `date-fns` |

### 구조 원칙
- Gemini와 Polar 액세스 토큰·webhook secret, Supabase service role 키는 서버(Route Handler / Server Action)에서만 써요.
- 클라이언트는 Supabase anon key를 쓰고, RLS로 본인 데이터만 접근해요.
- 캐릭터는 Supabase `characters` 테이블에 두고 대시보드에서 수정해요. 이미지는 Cloudflare R2(`characters/{id}/파일명`). 조회는 `lib/characters`(공유 캐시 `use cache`), 수정 시 Webhook → `/api/revalidate/characters`로 캐시 무효화

---

## 화면별 최소기능

### 1. 화면 정리
페이지 하단에 홈/대화/마이페이지 세 개의 버튼 
기본적으로 홈 화면을 나타내도록.
홈화면에는 네개의 캐릭터 표시 -> 캐릭터를 클릭하면 캐릭터 소개(일단 간단하게 알아서 넣어줘) 와 대화 시작하기 버튼
대화시작하기 버튼 누르면 채팅방으로 이동. 이렇게 대화를 시작하면 "대화" 화면에 채팅방이 하나 생김 
그리고 모든 사이트 내의 모든 언어는 영어로 제작
슬로건은 "Let everyone be the lead in their own seoul love story, seoulmate"

대화나 마이페이지를 클릭하면 로그인 모달을 띄우도록 
구글로 시작하기 버튼과 이메일, 비밀번호 입력창, 회원가입

### 2. 로그인 / 회원가입 `/login`, `/auth/callback`
- Google OAuth 로그인
- 이메일 + 비밀번호로 가입·로그인, 이메일 인증, 비밀번호 재설정
- 콜백에서 세션을 교환한 뒤, 프로필이 없으면 `/onboarding`, 있으면 `/chats`로 이동
- **도구:** Supabase Auth (`signInWithOAuth`, `signUp`, `exchangeCodeForSession`), `middleware.ts`에서 보호 경로 체크
- **이벤트:** `signed_up`, `logged_in` (method 속성 포함)

### 3. 온보딩 `/onboarding` (최초 1회)
- 생년월일 입력
- 닉네임 입력 (캐릭터가 부를 이름)
- 이용약관·개인정보처리방침 필수 동의
- **도구:** `react-hook-form` + `zod`, `profiles` insert


### 4. 캐릭터 선택 / 프로필 `/characters`, `/characters/[id]`
- 캐릭터 카드 4장
- 상세 화면에서 소개와 성격 키워드를 보여주고 "대화 시작" 버튼 제공 (대화방이 없으면 생성)
- **도구:** `lib/characters`의 `getCharacters` / `getCharacter` (공유 캐시)
- **이벤트:** `character_viewed`, `chat_started`

### 5. 채팅 목록 `/chats`
- 카톡 스타일 목록: 프사, 이름, 마지막 메시지, 시간
- 최근 대화 순으로 정렬
- **도구:** `conversations` 조회 (RLS)

### 6. 채팅방 `/chats/[characterId]` ⭐ 핵심
- 말풍선 UI: 내 메시지는 오른쪽, 캐릭터는 왼쪽 + 프사, 시간 표시
- 전송하면 응답이 올 때까지 "입력 중…" 표시 (스트리밍 없음)
- 이전 대화 불러오기: 위로 스크롤하면 더 로드
- 상단에 루비 잔액 표시(누르면 상점). 루비가 없으면 충전 유도 모달
- 에러 시 "다시 보내기"
- **API `POST /api/chat`**
  1. 세션 확인
  2. 루비 잔액(무료 + 충전) 1개 이상인지 확인
  3. 캐릭터 systemPrompt와 최근 N개 메시지로 Gemini `generateContent` 호출
  4. user/assistant 메시지 저장, 토큰 사용량만큼 루비 과금(실패·차단 답변은 과금 안 함), 응답 반환
- **도구:** `@google/genai` (`systemInstruction`, `safetySettings`)
- **이벤트:** `chat_message_sent` (character_id, rubies_charged), `chat_rubies_insufficient`
- **주의:** Gemini는 노골적인 성적 콘텐츠를 정책상 차단해요. 캐릭터 프롬프트는 그 범위 안에서 설계해야 해요.

### 7. 루비 상점 / 결제 `/shop`, `/billing/success`
- 루비 팩 3개(50 / 100 / 150)와 현재 잔액. 가격은 USD, 결제는 Polar
- "구매"를 누르면 `POST /api/billing/checkout` → Polar 체크아웃으로 이동 (서버가 세션의 user.id를 `external_customer_id`·metadata에 넣음)
- 성공 페이지는 이 결제의 주문이 반영될 때까지 "처리 중"을 보여주고, 반영되면 "N rubies added"
- **Webhook `POST /api/billing/webhook`** (Polar API 버전 2026-10, 서명 검증)
  - `order.paid` → `credit_rubies` (같은 주문은 한 번만)
  - `order.refunded` → 환불 비율만큼 `refund_rubies` (세금 제외 금액끼리 비율 계산)
- **이벤트:** `checkout_started`, `rubies_purchased`, `rubies_refunded` (서버에서 `posthog-node`로 전송)

### 8. 마이페이지 / 설정 `/settings`
- 닉네임 수정
- 루비 잔액(오늘 무료 / 충전)과 최근 충전·사용 내역, 상점 바로가기
- 이용약관, 개인정보 처리방침 (일단 버튼만 만들어놓기)
- 문의하기
- 로그아웃
- **회원 탈퇴 `POST /api/account/delete`**
  1. 메시지·대화·루비 지갑 삭제 (cascade, 남은 루비는 소멸)
  2. `supabase.auth.admin.deleteUser`로 계정 삭제 (service role, 서버 전용)
  3. PostHog `reset()`
- **이벤트:** `account_deleted`


---

