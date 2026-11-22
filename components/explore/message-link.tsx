import { AuthGatedLink } from "@/components/auth/auth-gated-link";
import { cn } from "@/lib/utils";

export function MessageLink({
  characterId,
  className,
}: {
  characterId: string;
  className?: string;
}) {
  return (
    <AuthGatedLink
      href={`/chats/${characterId}`}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg bg-coral px-5 text-sm font-bold text-white transition-colors hover:bg-coral-dark",
        className,
      )}
    >
      Message
    </AuthGatedLink>
  );
}
