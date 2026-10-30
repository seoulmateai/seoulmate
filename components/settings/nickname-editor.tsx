"use client";

import { Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateNickname } from "@/app/(main)/settings/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { nicknameSchema } from "@/lib/validation/onboarding";

export function NicknameEditor({ nickname }: { nickname: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(nickname);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openEditor() {
    setValue(nickname);
    setError(null);
    setOpen(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = nicknameSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    startTransition(async () => {
      const result = await updateNickname(parsed.data);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        className="mb-1.5 flex min-w-0 items-center gap-2.5 text-left text-[19px] font-bold md:text-[23px]"
      >
        <span className="truncate">{nickname}</span>
        <Pencil className="size-4 shrink-0 text-[#777]" aria-label="Edit nickname" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-4 p-6 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Edit nickname</DialogTitle>
            <DialogDescription>This is what the characters will call you.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Input
                autoFocus
                value={value}
                maxLength={30}
                aria-label="Nickname"
                aria-invalid={!!error}
                className="h-11"
                onChange={(e) => setValue(e.target.value)}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
            <DialogFooter className="mx-0 mb-0 flex-row border-0 bg-transparent p-0">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 flex-1"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="lg" className="h-11 flex-1" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
