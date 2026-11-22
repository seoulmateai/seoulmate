"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wordmark } from "@/components/layout/wordmark";

import { AuthForm } from "./auth-form";

export function LoginDialog({
  open,
  next,
  onOpenChange,
}: {
  open: boolean;
  next: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 p-6 sm:max-w-sm">
        <DialogHeader className="items-center text-center">
          <Wordmark />
          <DialogTitle className="sr-only">Log in to seoulmate</DialogTitle>
          <DialogDescription>Log in to start your seoul love story.</DialogDescription>
        </DialogHeader>
        <AuthForm next={next} />
      </DialogContent>
    </Dialog>
  );
}
