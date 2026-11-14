import { cn } from "@/lib/utils";

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "flex flex-wrap items-center justify-between gap-2.5 border-t border-border pt-5 text-xs text-muted-foreground",
        className,
      )}
    >
      <span>
        © 2026 <strong className="font-bold text-foreground">seoulmate</strong>
      </span>
      <span>Made for your own Seoul love story ♡</span>
    </footer>
  );
}
