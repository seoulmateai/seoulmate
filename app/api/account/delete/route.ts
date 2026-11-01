import { NextResponse, type NextRequest } from "next/server";

import { deleteUserChatImages } from "@/lib/r2/chat-images";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// 회원 탈퇴
//  1. (TODO: 결제 추가 시) Stripe 구독 취소
//  2. 신고 메모 비우기 (reports는 통계용으로 남고 user_id만 NULL이 됨)
//  3. 채팅 이미지(R2) 삭제
//  4. auth 사용자 삭제 → profiles → chat_rooms → messages, inquiries, usage_counters cascade 삭제
//     llm_calls / reports 는 user_id가 NULL로 남음
//  5. (TODO: PostHog 추가 시) 클라이언트에서 posthog.reset()
export async function POST(request: NextRequest) {
  // 다른 사이트에서 보낸 요청 차단
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });

  const admin = createAdminClient();

  const { error: reportError } = await admin
    .from("reports")
    .update({ memo: null })
    .eq("user_id", user.id);
  if (reportError) console.error("[account/delete] clearing report memos failed", reportError);

  // 실패해도 탈퇴는 진행 (키가 {userId}/ 접두사라 로그 보고 수동 정리 가능)
  await deleteUserChatImages(user.id).catch((e) =>
    console.error("[account/delete] deleting chat images failed", e),
  );

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account/delete] deleteUser failed", error);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
