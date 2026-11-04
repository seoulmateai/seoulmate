"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { signOutInThisTab } from "@/lib/auth/sign-out";

export function DeleteAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/account/delete", { method: "POST" }).catch(() => null);
    if (!res?.ok) {
      setPending(false);
      setError("Couldn't delete your account. Please try again.");
      return;
    }
    // 계정이 이미 삭제됐으므로 서버 호출 없이 브라우저 세션만 정리
    await signOutInThisTab({ scope: "local" });
    router.replace("/");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto mt-3.5 block p-2 text-[13px] text-[#888b93] underline-offset-4 hover:text-[#d65c58] hover:underline md:mt-4.5"
      >
        Delete account
      </button>

      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent className="gap-4 p-6 sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Delete your account?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              Your profile, all conversations, and inquiries will be permanently deleted. This
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="mx-0 mb-0 flex-row border-0 bg-transparent p-0">
            <Button
              variant="outline"
              size="lg"
              className="h-11 flex-1"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="lg"
              className="h-11 flex-1 bg-destructive text-white hover:bg-destructive/90"
              disabled={pending}
              onClick={deleteAccount}
            >
              {pending && <Loader2 className="animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
