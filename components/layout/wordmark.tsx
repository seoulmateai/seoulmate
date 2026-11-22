import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-[22px] leading-none font-extrabold tracking-[-0.07em] text-white", className)}>
      seoul
      <span className="font-script text-[1.22em] font-normal tracking-normal text-coral">mate</span>
    </span>
  );
}
