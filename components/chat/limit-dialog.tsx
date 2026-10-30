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

// TODO: 결제 기능 추가 시 "Subscribe" 버튼 → /pricing
export function LimitDialog({
  open,
  onOpenChange,
  limit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limit: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 p-6 sm:max-w-sm" showCloseButton={false}>
        <DialogHeader className="items-center text-center">
          <DialogTitle className="text-lg font-semibold">You&apos;ve hit today&apos;s limit</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Free accounts can get up to {limit} replies a day.
            <br />
            Your limit resets at midnight (Korea time).
            <br />
            Subscriptions with more messages are coming soon!
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
