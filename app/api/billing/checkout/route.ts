import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getPolar, productIdForPack } from "@/lib/billing/polar";
import { RUBY_PACKS } from "@/lib/billing/pricing";
import { captureServerEvent } from "@/lib/posthog/server";
import { createClient } from "@/lib/supabase/server";

// 루비 팩 결제 시작: Polar 체크아웃을 만들고 결제 페이지 URL을 돌려준다
//  - 사용자 연결은 서버가 세션의 user.id를 external_customer_id / metadata에 직접 넣음
//    (클라이언트가 보낸 값은 팩 종류만 믿는다)
//  - 실제 루비 지급은 결제 완료 webhook(/api/billing/webhook)에서만
const bodySchema = z.object({
  pack: z.literal(RUBY_PACKS),
});

type CheckoutResponse = { ok: true; url: string } | { ok: false; error: string };

function json(body: CheckoutResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  // 다른 사이트에서 보낸 요청 차단
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return json({ ok: false, error: "FORBIDDEN" }, 403);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

  // 지갑은 profiles를 참조하므로 온보딩 완료 사용자만
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile) return json({ ok: false, error: "ONBOARDING_REQUIRED" }, 403);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, error: "INVALID_REQUEST" }, 400);
  const { pack } = parsed.data;

  const siteUrl = request.nextUrl.origin;
  const create = (customerEmail?: string) =>
    getPolar().checkouts.create({
      products: [productIdForPack(pack)],
      external_customer_id: user.id,
      customer_email: customerEmail,
      metadata: { user_id: user.id, pack },
      // {CHECKOUT_ID}는 Polar가 실제 체크아웃 id로 바꿔준다
      success_url: `${siteUrl}/billing/success?checkout_id={CHECKOUT_ID}`,
      return_url: `${siteUrl}/chats`,
    });

  try {
    let checkout;
    try {
      checkout = await create(user.email);
    } catch (e) {
      // Polar는 도메인이 실제로 없는 이메일을 거부한다 (예: 로컬 데모 계정).
      // 이메일은 결제 화면 미리 채우기용일 뿐이라 빼고 한 번 더 시도
      if (!user.email) throw e;
      console.warn("[billing/checkout] retrying without customer_email", e);
      checkout = await create();
    }
    captureServerEvent(user.id, "checkout_started", { pack });
    return json({ ok: true, url: checkout.url }, 200);
  } catch (e) {
    console.error("[billing/checkout] create failed", e);
    return json({ ok: false, error: "CHECKOUT_FAILED" }, 502);
  }
}
