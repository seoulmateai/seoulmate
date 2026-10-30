"use client";

import Image from "next/image";

import logo from "@/assets/logo.webp";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
          <Image src={logo} alt="seoulmate" className="h-6 w-auto" />
          <DialogTitle className="sr-only">Log in to seoulmate</DialogTitle>
          <DialogDescription>Log in to start your seoul love story.</DialogDescription>
        </DialogHeader>
        <AuthForm next={next} />
      </DialogContent>
    </Dialog>
  );
}
