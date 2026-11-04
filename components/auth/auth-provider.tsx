"use client";

import type { User } from "@supabase/supabase-js";
import posthog from "posthog-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { isSigningOutInThisTab } from "@/lib/auth/sign-out";
import { createClient } from "@/lib/supabase/client";

import { LoginDialog } from "./login-dialog";

type AuthContextValue = {
  /** undefined = 아직 확인 중, null = 로그아웃 상태 */
  user: User | null | undefined;
  /** 로그인 모달 열기. next: 로그인 후 이동할 경로 */
  openLogin: (next?: string) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loginNext, setLoginNext] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let hadSession = false;
    // UI 표시용(로그인 모달을 띄울지). 실제 접근 제어는 proxy.ts와 RLS가 담당.
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // PostHog 사용자 연결. 서버 이벤트와 같은 distinct_id(user.id) 사용
      // 로그아웃·회원 탈퇴 모두 signOut → SIGNED_OUT 이벤트로 여기서 reset
      if (session?.user) {
        hadSession = true;
        if (posthog.get_distinct_id() !== session.user.id) posthog.identify(session.user.id);
      } else if (event === "SIGNED_OUT") {
        posthog.reset();
        // 다른 탭의 로그아웃 또는 세션 만료. 다시 불러오면 보호 경로는 proxy.ts가 /login으로 보낸다.
        // 세션이 있던 탭만 새로고침하므로, 로그아웃 상태로 다시 열린 페이지가 반복 새로고침되지 않는다.
        if (hadSession && !isSigningOutInThisTab()) window.location.reload();
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const openLogin = useCallback((next?: string) => setLoginNext(next ?? "/chats"), []);
  const value = useMemo(() => ({ user, openLogin }), [user, openLogin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginDialog
        open={loginNext !== null}
        next={loginNext ?? "/chats"}
        onOpenChange={(open) => !open && setLoginNext(null)}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
