import { NextResponse, type NextRequest } from "next/server";

import { IMAGE_URL_TTL_SECONDS, signChatImageUrl } from "@/lib/r2/chat-images";
import { getRequestUser } from "@/lib/supabase/request";

// 채팅 이미지 보기: 본인 메시지인지 확인(RLS) 후 비공개 R2 presigned URL로 리다이렉트
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/chat/images/[messageId]">) {
  const { messageId } = await ctx.params;
  const id = Number(messageId);
  if (!Number.isSafeInteger(id) || id <= 0) return new NextResponse(null, { status: 404 });

  const { supabase, user } = await getRequestUser(_req);
  if (!user) return new NextResponse(null, { status: 401 });

  // messages RLS: 본인 채팅방 메시지만 조회됨
  const { data } = await supabase
    .from("messages")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();
  if (!data?.image_path) return new NextResponse(null, { status: 404 });

  const url = await signChatImageUrl(data.image_path);
  const cacheControl = `private, max-age=${IMAGE_URL_TTL_SECONDS - 300}`;
  // 앱은 리다이렉트에 Authorization을 붙이면 R2가 거절하므로 JSON URL을 받는다.
  if (_req.nextUrl.searchParams.get("format") === "json") {
    return NextResponse.json({ url }, { headers: { "Cache-Control": cacheControl } });
  }
  // 브라우저는 presigned URL 만료 전까지만 리다이렉트를 재사용
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": cacheControl },
  });
}
