"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function LimitDialog({
  open,
  onOpenChange,
  limit,
  subscribed,
  canSubscribe,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limit: number;
  subscribed: boolean;
  /** 결제가 켜져 있고 아직 구독 전일 때만 true (Production에서는 항상 false) */
  canSubscribe: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 p-6 sm:max-w-sm" showCloseButton={false}>
        <DialogHeader className="items-center text-center">
          <DialogTitle className="text-lg font-semibold">You&apos;ve hit today&apos;s limit</DialogTitle>
          <DialogDescription className="leading-relaxed">
            {subscribed ? "Subscribers" : "Free accounts"} can get up to {limit} replies a day.
            <br />
            Your limit resets at midnight (Korea time).
            {!subscribed && (
              <>
                <br />
                {canSubscribe
                  ? "Subscribe to get more replies every day."
                  : "Subscriptions with more messages are coming soon!"}
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mx-0 mb-0 flex-col gap-2 border-0 bg-transparent p-0 sm:flex-col">
          {canSubscribe && (
            <Link
              href="/pricing"
              className={cn(buttonVariants({ size: "lg" }), "h-11 w-full")}
              onClick={() => onOpenChange(false)}
            >
              See plans
            </Link>
          )}
          <Button
            size="lg"
            variant={canSubscribe ? "outline" : "default"}
            className="h-11 w-full"
            onClick={() => onOpenChange(false)}
          >
            {canSubscribe ? "Maybe later" : "Got it"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
