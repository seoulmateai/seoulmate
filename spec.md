# AI 남자친구 앱 — 화면별 최소기능 & 기술스택

## 확정된 전제
- 캐릭터 4명: 직장인, 아이돌, 체대생, 홍대보이
- 카톡 느낌의 1:1 채팅
- LLM은 Gemini API 사용, 파인튜닝은 하지 않음, 스트리밍 없이 한 번에 응답
- 캐릭터 프롬프트(성격·말투 등)는 DB가 아니라 코드로 관리
- 구독형 결제
- 가입할 때 연령 확인
- 회원 탈퇴 시 채팅 메시지 삭제

| 영역 | 도구 |
|---|---|
| LLM | Gemini |
| 프론트/호스팅 | Vercel |
| 백엔드(DB·Auth) | Supabase |
| 로그인 | Google OAuth, 이메일 |
| 결제 | 나중에 |
| 유저 분석 | PostHog |

---

## ⚠️ Stripe 계정 국가 이슈
Stripe에서 한국 결제수단(국내 카드, 카카오페이, 네이버페이 등)을 받을 수 있는 사업자 국가 목록에 **한국(KR)은 없어요**. 다른 나라에 계정을 열려면 그 나라의 법인, 세금 ID, 주소, 은행 계좌가 필요해요.

- MVP는 **Stripe 테스트 모드**로 구현해요.
- 실제 운영할 때는 **토스페이먼츠 / 포트원(PortOne)**으로 교체하는 걸 검토해요.
- 나중에 교체하기 쉽도록 결제 로직은 `lib/billing/`에 모아둬요.

참고 문서
- https://docs.stripe.com/payments/kr-card
- https://support.stripe.com/questions/requirements-to-open-a-stripe-account-in-another-country

---

## 공통 기술스택

| 영역 | 선택 | 라이브러리 |
|---|---|---|
| 프레임워크 | Next.js (App Router) + TypeScript, Vercel 배포 | `next`, `react` |
| UI | Tailwind CSS + shadcn/ui | `tailwindcss`, `shadcn/ui`, `lucide-react`, `sonner` |
| 폼/검증 | | `react-hook-form`, `zod` |
| DB/인증 | Supabase (Postgres + Auth + RLS) | `@supabase/supabase-js`, `@supabase/ssr` |
| LLM | Gemini, 서버에서만 호출 | `@google/genai` |
| 결제 | Stripe Checkout + Customer Portal + Webhook | `stripe` (`@stripe/stripe-js`는 선택) |
| 분석 | PostHog | `posthog-js`, `posthog-node` |
| 날짜 | | `date-fns` |

### 구조 원칙
- Gemini와 Stripe 시크릿 키, Supabase service role 키는 서버(Route Handler / Server Action)에서만 써요.
- 클라이언트는 Supabase anon key를 쓰고, RLS로 본인 데이터만 접근해요.
- 캐릭터는 `lib/characters/{id}.ts`에 둬요. `{ id, name, avatar, intro, keywords, systemPrompt }`

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
- **도구:** `lib/characters`에서 읽어옴 (DB 조회 없음)
- **이벤트:** `character_viewed`, `chat_started`

### 5. 채팅 목록 `/chats`
- 카톡 스타일 목록: 프사, 이름, 마지막 메시지, 시간
- 최근 대화 순으로 정렬
- **도구:** `conversations` 조회 (RLS)

### 6. 채팅방 `/chats/[characterId]` ⭐ 핵심
- 말풍선 UI: 내 메시지는 오른쪽, 캐릭터는 왼쪽 + 프사, 시간 표시
- 전송하면 응답이 올 때까지 "입력 중…" 표시 (스트리밍 없음)
- 이전 대화 불러오기: 위로 스크롤하면 더 로드
- 무료 사용자에게 일일 한도를 표시하고, 한도를 넘으면 구독 유도 모달
- 에러 시 "다시 보내기"
- **API `POST /api/chat`**
  1. 세션 확인
  2. 구독 상태 또는 일일 사용량 확인
  3. 캐릭터 systemPrompt와 최근 N개 메시지로 Gemini `generateContent` 호출
  4. user/assistant 메시지 저장, `conversations.last_message` 갱신, 응답 반환
- **도구:** `@google/genai` (`systemInstruction`, `safetySettings`)
- **이벤트:** `message_sent` (character_id), `limit_reached`
- **주의:** Gemini는 노골적인 성적 콘텐츠를 정책상 차단해요. 캐릭터 프롬프트는 그 범위 안에서 설계해야 해요.

### 7. 요금제 / 결제 `/pricing`, `/billing/success`, `/billing/cancel`
**일단은 이부분은 제외하고 구성한다 나중에 추가할거임"
- 무료와 구독 비교 (예: 무료는 하루 N회, 구독은 높은 한도)
- "구독하기"를 누르면 `POST /api/stripe/checkout` 호출 후 Stripe Checkout(`mode: 'subscription'`)으로 이동
- 성공 페이지는 "처리 중"만 보여주고, 실제 구독 상태는 webhook 기준으로 반영
- **Webhook `POST /api/stripe/webhook`**
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - 위 이벤트를 받으면 `subscriptions` 테이블을 갱신
- **이벤트:** `pricing_viewed`, `checkout_started`, `subscribed` (서버에서 `posthog-node`로 전송)

### 8. 마이페이지 / 설정 `/settings`
- 닉네임 수정
- 구독 상태 표시. "구독 관리"를 누르면 Stripe Customer Portal(해지·카드 변경)로 이동
- 이용약관, 개인정보 처리방침 (일단 버튼만 만들어놓기)
- 문의하기
- 로그아웃
- **회원 탈퇴 `POST /api/account/delete`**
  1. Stripe 구독 취소
  2. 메시지·대화 삭제 (cascade)
  3. `supabase.auth.admin.deleteUser`로 계정 삭제 (service role, 서버 전용)
  4. PostHog `reset()`
- **이벤트:** `subscription_portal_opened`, `account_deleted`


---

