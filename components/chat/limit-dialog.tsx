"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// 루비 부족 (POST /api/chat → INSUFFICIENT_RUBY)
// TODO: 결제 기능 추가 시 "Get rubies" 버튼 → /shop
export function LimitDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 p-6 sm:max-w-sm" showCloseButton={false}>
        <DialogHeader className="items-center text-center">
          <DialogTitle className="text-lg font-semibold">You&apos;re out of rubies</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Your free rubies refill at midnight (Korea time).
            <br />
            Ruby packs are coming soon!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mx-0 mb-0 border-0 bg-transparent p-0">
          <Button size="lg" className="h-11 w-full" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
