import { MessageCircle } from "lucide-react";
import Link from "next/link";

// 데스크톱: 채팅방을 고르기 전 오른쪽 패널. 모바일에서는 목록만 보이므로 숨겨짐(ChatsWorkspace 참고)
export default function ChatsPage() {
  return (
    <div className="m-auto flex flex-col items-center gap-3 p-8 text-center">
      <div className="mb-1 grid size-14 place-items-center rounded-full bg-coral-soft text-coral">
        <MessageCircle className="size-6" />
      </div>
      <strong className="text-base text-[#55545b]">Pick a conversation</strong>
      <p className="text-sm text-muted-foreground">
        Choose someone from the list, or meet someone new.
      </p>
      <Link href="/" className="text-sm font-bold text-coral-dark hover:underline">
        Go to Home →
      </Link>
    </div>
  );
}
