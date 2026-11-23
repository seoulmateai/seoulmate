import Image from "next/image";
import Link from "next/link";

import type { CharacterAvatar } from "@/lib/characters/types";
import type { FeedPost } from "@/lib/explore/posts";

export function FeedPostCard({
  post,
  character,
}: {
  post: FeedPost;
  character: {
    id: string;
    name: string;
    occupation: string;
    avatar: CharacterAvatar;
  };
}) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-white/10 bg-[#100d14]">
      <header className="flex items-center gap-3 px-4 py-3.5">
        <Link href={`/explore/${character.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="story-ring shrink-0 rounded-full p-[2px]">
            <span className="relative block size-11 overflow-hidden rounded-full bg-muted">
              <Image
                src={character.avatar.src}
                alt=""
                fill
                placeholder={character.avatar.blurDataURL ? "blur" : "empty"}
                blurDataURL={character.avatar.blurDataURL ?? undefined}
                sizes="44px"
                className="object-cover object-top"
              />
            </span>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{character.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{character.occupation}</span>
          </span>
        </Link>
        <Link
          href={`/chats/${character.id}`}
          className="btn-gradient inline-flex h-8 shrink-0 items-center rounded-full px-4 text-xs font-bold transition-[filter] hover:brightness-110"
        >
          Chat
        </Link>
      </header>

      <Link
        href={`/explore/${character.id}/${post.id}`}
        className="relative block aspect-[4/5] bg-muted"
      >
        <Image src={post.image} alt={post.alt} fill sizes="(max-width: 768px) 100vw, 520px" className="object-cover" />
        <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent px-6 pt-16 pb-6 text-center font-script text-[clamp(22px,3vw,30px)] leading-snug text-white">
          &ldquo;{post.caption}&rdquo;
        </span>
      </Link>

      <div className="px-4 py-4">
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">{character.name}</span>{" "}
          <span className="text-white/85">{post.caption}</span>
        </p>
        <Link
          href={`/chats/${character.id}`}
          aria-label={`Open chat with ${character.name}`}
          className="mt-4 flex items-center rounded-full border border-white/12 bg-black/40 p-1"
        >
          <span className="flex-1 px-3 text-sm text-muted-foreground">Reply to {character.name}...</span>
          <span className="btn-gradient rounded-full px-4 py-2 text-xs font-bold">Send →</span>
        </Link>
      </div>
    </article>
  );
}
