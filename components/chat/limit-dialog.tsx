"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// 루비 부족 (POST /api/chat → INSUFFICIENT_RUBY) → 상점으로 안내
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
            Get a ruby pack to keep chatting now.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mx-0 mb-0 flex-row border-0 bg-transparent p-0">
          <Button
            variant="outline"
            size="lg"
            className="h-11 flex-1"
            onClick={() => onOpenChange(false)}
          >
            Later
          </Button>
          <Link
            href="/shop"
            className="flex h-11 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-primary/80"
          >
            Get rubies
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
