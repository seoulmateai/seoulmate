"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { signOutInThisTab } from "@/lib/auth/sign-out";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await signOutInThisTab();
    router.replace("/");
    router.refresh();
  }

  return (
    <Button
      variant="outline"
      size="lg"
      className="h-12 w-full rounded-[11px] text-sm font-semibold hover:border-coral/40 hover:text-coral"
      disabled={pending}
      onClick={signOut}
    >
      Log out
    </Button>
  );
}
