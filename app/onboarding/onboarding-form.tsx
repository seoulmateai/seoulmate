"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  onboardingSchema,
  type OnboardingInput,
  type OnboardingValues,
} from "@/lib/validation/onboarding";

import { completeOnboarding } from "./actions";

const AGREEMENTS = [
  { name: "termsAgreed", label: "I agree to the Terms of Service", required: true },
  { name: "privacyAgreed", label: "I agree to the Privacy Policy", required: true },
  { name: "marketingAgreed", label: "I agree to receive marketing messages", required: false },
] as const;

export function OnboardingForm({ next }: { next: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<OnboardingInput, unknown, OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      nickname: "",
      birthDate: "",
      termsAgreed: false,
      privacyAgreed: false,
      marketingAgreed: false,
    },
  });
  const { errors } = form.formState;

  function onSubmit(values: OnboardingValues) {
    setServerError(null);
    startTransition(async () => {
      // 성공하면 서버 액션이 redirect 하므로 결과는 에러일 때만 돌아옴
      const result = await completeOnboarding(values, next);
      if (result?.error) setServerError(result.error);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nickname">Nickname</Label>
        <Input
          id="nickname"
          autoComplete="nickname"
          maxLength={30}
          placeholder="What should he call you?"
          className="h-11"
          aria-invalid={!!errors.nickname}
          {...form.register("nickname")}
        />
        {errors.nickname && <p className="text-xs text-destructive">{errors.nickname.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="birthDate">Date of birth</Label>
        <Input
          id="birthDate"
          type="date"
          autoComplete="bday"
          className="h-11"
          aria-invalid={!!errors.birthDate}
          {...form.register("birthDate")}
        />
        {errors.birthDate && (
          <p className="text-xs text-destructive">{errors.birthDate.message}</p>
        )}
      </div>

      <fieldset className="flex flex-col gap-3 rounded-xl border p-4">
        <legend className="sr-only">Agreements</legend>
        {AGREEMENTS.map(({ name, label, required }) => (
          <Controller
            key={name}
            control={form.control}
            name={name}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-1">
                <Label className="flex items-center gap-2.5 font-normal">
                  <Checkbox
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    onBlur={field.onBlur}
                    aria-invalid={!!fieldState.error}
                  />
                  <span>
                    {label}{" "}
                    <span className={required ? "text-primary" : "text-muted-foreground"}>
                      ({required ? "Required" : "Optional"})
                    </span>
                  </span>
                </Label>
                {fieldState.error && (
                  <p className="pl-6.5 text-xs text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        ))}
      </fieldset>

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Get started
      </Button>
    </form>
  );
}
