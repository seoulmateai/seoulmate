import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * 사용자 × 캐릭터 채팅방 id. 없으면 만든다 (chat_rooms 쓰기는 서버 전용).
 * 비활성 캐릭터는 새 방을 만들지 않고, 기존 방이 없으면 null.
 */
export async function getOrCreateRoomId(
  userId: string,
  character: { id: string; isActive: boolean },
): Promise<number | null> {
  const admin = createAdminClient();
  const findRoomId = async () => {
    const { data, error } = await admin
      .from("chat_rooms")
      .select("id")
      .eq("user_id", userId)
      .eq("character_id", character.id)
      .maybeSingle();
    if (error) throw error;
    return data?.id ?? null;
  };

  // 대부분은 이미 방이 있으므로 조회 먼저 (DB 왕복 1번)
  const existing = await findRoomId();
  if (existing != null || !character.isActive) return existing;

  // ⚠️ 여기서 findRoomId()를 다시 부르면 안 된다: 같은 URL의 GET fetch는 한 렌더 안에서
  // Next.js가 메모이즈하므로 위의 "방 없음(null)" 응답이 그대로 재사용되어 404가 난다.
  // RPC(POST)에서 바로 id를 돌려받는다. 새로 만들어진 방에는 캐릭터의 첫 만남 메시지도 함께 저장되고,
  // 동시 요청으로 이미 있으면 기존 방 id만 반환한다 (첫 만남 메시지 중복 없음).
  const { data, error } = await admin.rpc("create_chat_room", {
    p_user_id: userId,
    p_character_id: character.id,
  });
  if (error) throw error;
  return data;
}
