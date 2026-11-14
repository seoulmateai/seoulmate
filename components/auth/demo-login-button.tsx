import { cn } from "@/lib/utils";

// `next dev`에서만 그린다. 프로덕션 빌드는 NODE_ENV가 production이라 이 분기가 빠진다.
export function DemoLoginButton({ next, disabled }: { next: string; disabled?: boolean }) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="flex flex-col gap-2">
      <a
        href={disabled ? undefined : `/auth/demo?next=${encodeURIComponent(next)}`}
        aria-disabled={disabled || undefined}
        className={cn(
          "flex h-11 w-full items-center justify-center rounded-lg border border-input bg-input/30 text-sm font-medium hover:bg-input/50",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        Continue as demo
      </a>
      <p className="text-center text-[11px] text-muted-foreground">Local development only</p>
    </div>
  );
}
