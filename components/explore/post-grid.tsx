import Image from "next/image";
import Link from "next/link";

import type { FeedPost } from "@/lib/explore/posts";

export function PostGrid({
  items,
}: {
  items: { post: FeedPost; characterId: string }[];
}) {
  if (items.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No posts yet</p>;
  }

  return (
    <ul className="grid grid-cols-3 gap-0.5 sm:gap-1">
      {items.map(({ post, characterId }) => (
        <li key={`${characterId}-${post.id}`}>
          <Link
            href={`/explore/${characterId}/${post.id}`}
            aria-label={post.alt}
            className="relative block aspect-square overflow-hidden bg-muted"
          >
            <Image src={post.image} alt="" fill sizes="(max-width: 768px) 33vw, 312px" className="object-cover" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
