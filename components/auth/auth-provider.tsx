"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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
    // UI 표시용(로그인 모달을 띄울지). 실제 접근 제어는 proxy.ts와 RLS가 담당.
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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
