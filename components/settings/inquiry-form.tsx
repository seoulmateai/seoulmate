"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { submitInquiry } from "@/app/(main)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INQUIRY_CATEGORIES, inquirySchema, type InquiryValues } from "@/lib/validation/inquiry";

export function InquiryForm({ defaultEmail }: { defaultEmail: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const form = useForm<InquiryValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { email: defaultEmail, category: "GENERAL", title: "", content: "" },
  });
  const { errors } = form.formState;

  function onSubmit(values: InquiryValues) {
    setResult(null);
    startTransition(async () => {
      const res = await submitInquiry(values);
      if (!res.ok) {
        setResult({ ok: false, message: res.error });
        return;
      }
      form.reset({ ...values, title: "", content: "" });
      setResult({ ok: true, message: "Thanks! We'll reply to your email as soon as we can." });
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inquiry-email">Reply email</Label>
        <Input
          id="inquiry-email"
          type="email"
          className="h-11"
          aria-invalid={!!errors.email}
          {...form.register("email")}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inquiry-category">Category</Label>
        <select
          id="inquiry-category"
          className="h-11 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
          {...form.register("category")}
        >
          {INQUIRY_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inquiry-title">Title</Label>
        <Input
          id="inquiry-title"
          maxLength={100}
          className="h-11"
          aria-invalid={!!errors.title}
          {...form.register("title")}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inquiry-content">Message</Label>
        <textarea
          id="inquiry-content"
          rows={6}
          maxLength={3000}
          className="resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
          placeholder="Tell us what's going on."
          aria-invalid={!!errors.content}
          {...form.register("content")}
        />
        {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
      </div>

      {result && (
        <p role="status" className={result.ok ? "text-sm text-primary" : "text-sm text-destructive"}>
          {result.message}
        </p>
      )}

      <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Send
      </Button>
    </form>
  );
}
