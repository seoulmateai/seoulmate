import { createClient } from "@/lib/supabase/client";

let signingOutInThisTab = false;

// 이 탭에서 직접 로그아웃할 때 사용. 이동은 호출한 쪽이 처리하므로
// AuthProvider가 다른 탭의 로그아웃과 구분해 새로고침하지 않게 표시해 둔다.
// signOut()은 SIGNED_OUT 구독자 실행까지 기다린 뒤 끝나므로 표시는 그동안만 유지하면 된다.
export async function signOutInThisTab(options?: { scope: "local" }) {
  signingOutInThisTab = true;
  try {
    return await createClient().auth.signOut(options);
  } finally {
    signingOutInThisTab = false;
  }
}

export const isSigningOutInThisTab = () => signingOutInThisTab;
