# seoulmate

AI 캐릭터와 카톡처럼 1:1로 채팅하는 웹앱입니다.

스택: Next.js 16 (App Router) · Supabase (DB, 인증) · Gemini · Cloudflare R2 (이미지) · PostHog · Stripe (테스트 모드)

## 로컬 실행

### 1. 준비물
- Node.js 20 이상
- `.env.local` 파일

### 2. 설치 및 실행
```bash
git clone https://github.com/seoulmateai/seoulmate.git
cd seoulmate
npm install
# 받은 .env.local 파일을 프로젝트 루트(package.json 옆)에 둡니다
npm run dev
```
→ http://localhost:3000

DB는 원격 Supabase 프로젝트를 같이 씁니다. 그래서 로컬에서 DB를 띄우거나 마이그레이션을 실행할 필요가 없습니다.

> 원격 DB를 같이 쓰기 때문에 로컬에서 만든 데이터도 실제 DB에 저장됩니다. `SUPABASE_SERVICE_ROLE_KEY`는 RLS를 우회하니 다룰 때 주의하세요.

### 3. 로그인
- 이메일 가입과 Google 로그인 모두 localhost에서 동작합니다.
- 로그인한 뒤 원래 페이지로 돌아오지 않고 배포 주소로 이동한다면, Supabase 대시보드의 Authentication → URL Configuration → Redirect URLs에 `http://localhost:3000/**`가 있는지 확인하세요.

## 결제 (Stripe 테스트 모드)

결제 기능은 `.env.local`에 `STRIPE_SECRET_KEY`와 `STRIPE_PRICE_ID`가 둘 다 있을 때만 켜집니다 (`lib/billing/config.ts`). 키가 없으면 결제 UI가 숨겨지고 모든 사용자가 무료 사용자로 처리됩니다.

결제 후 구독 상태를 반영하려면 Stripe webhook을 로컬로 받아야 합니다.

```bash
# Stripe CLI 설치: https://docs.stripe.com/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```
`stripe listen`이 출력하는 `whsec_...` 값을 `.env.local`의 `STRIPE_WEBHOOK_SECRET`에 넣고 dev 서버를 재시작하세요. 이 값은 대시보드의 endpoint secret과 다릅니다.

테스트 카드: `4242 4242 4242 4242`, 만료일은 미래 아무 날짜, CVC는 아무 숫자 3자리

> Stripe는 한국 사업자 계정을 지원하지 않아 테스트 모드로만 사용합니다.

## 스크립트

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm run typecheck` | 타입 체크 |
| `npm run db:types` | Supabase DB 타입 재생성 (`supabase link`와 Supabase 프로젝트 권한 필요) |

## 폴더 구조

```
app/
  (main)/          화면 (홈, 캐릭터, 채팅, 요금제, 설정 등)
  api/chat/        채팅 API (Gemini 호출, 이미지)
  api/stripe/      결제 (checkout, portal, webhook)
  auth/, login/, onboarding/
components/        UI 컴포넌트
lib/
  billing/         결제 로직 (결제사 교체를 대비해 한곳에 모아둠)
  supabase/        Supabase 클라이언트와 DB 타입
supabase/migrations/  DB 스키마 (SQL)
scripts/           유틸 스크립트 (blur placeholder 생성)
```

## 브랜치
- `main`: Vercel Production에 배포됩니다
- `feat/billing`: Stripe 결제 작업 중 (Vercel Preview)
