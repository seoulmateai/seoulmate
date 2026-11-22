import { NextResponse, type NextRequest } from "next/server";

import { captureServerEvent } from "@/lib/posthog/server";
import { deleteUserChatImages } from "@/lib/r2/chat-images";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "@/lib/supabase/request";

// 회원 탈퇴
//  1. (TODO: 결제 추가 시) Stripe 구독 취소
//  2. 신고 메모 비우기 (reports는 통계용으로 남고 user_id만 NULL이 됨)
//  3. 채팅 이미지(R2) 삭제
//  4. auth 사용자 삭제 → profiles → chat_rooms → messages, inquiries, usage_counters cascade 삭제
//     llm_calls / reports 는 user_id가 NULL로 남음
//  5. PostHog account_deleted 기록. 클라이언트 posthog.reset()은 signOut 시 AuthProvider가 처리
export async function POST(request: NextRequest) {
  // 브라우저 요청만 Origin을 검사한다. 앱은 Authorization Bearer로 인증하고 Origin이 없다.
  const bearer = /^Bearer\s+\S+\s*$/i.test(request.headers.get("authorization") ?? "");
  const origin = request.headers.get("origin");
  if (!bearer && origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const { user } = await getRequestUser(request);
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

  captureServerEvent(user.id, "account_deleted");
  return NextResponse.json({ ok: true });
}
