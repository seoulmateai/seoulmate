import Link from "next/link";

import { cn } from "@/lib/utils";

export function MessageLink({
  characterId,
  chatEnabled,
  className,
}: {
  characterId: string;
  chatEnabled: boolean;
  className?: string;
}) {
  if (!chatEnabled) {
    return (
      <span
        aria-disabled
        className={cn(
          "inline-flex h-9 cursor-not-allowed items-center justify-center rounded-lg border border-white/15 px-5 text-sm font-bold text-white/50",
          className,
        )}
      >
        Coming soon
      </span>
    );
  }

  return (
    <Link
      href={`/chats/${characterId}`}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-coral px-5 text-sm font-bold text-white transition-colors hover:bg-coral-dark",
        className,
      )}
    >
      Message
    </Link>
  );
}
