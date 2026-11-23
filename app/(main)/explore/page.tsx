import Image from "next/image";
import Link from "next/link";

import { CharacterStrip } from "@/components/explore/character-strip";
import { FeedPostCard } from "@/components/explore/feed-post";
import { getCharacters } from "@/lib/characters";
import { postsForCharacter } from "@/lib/explore/posts";

export const metadata = { title: "Feed · seoulmate" };

export default async function ExplorePage() {
  const characters = await getCharacters();
  const posts = characters.flatMap((character) =>
    postsForCharacter(character.name).map((post) => ({ post, character })),
  );

  return (
    <div className="page-container grid gap-8 pt-6 pb-12 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,560px)_260px] xl:justify-center">
      <aside className="hidden lg:block">
        <p className="mb-3 text-[10px] font-bold tracking-[0.18em] text-coral uppercase">Discover</p>
        <nav aria-label="Discover" className="flex flex-col gap-1">
          <Link
            href="/explore"
            aria-current="page"
            className="btn-gradient rounded-full px-3 py-2 text-sm font-bold"
          >
            For you
          </Link>
          {characters.map((character) => (
            <Link
              key={character.id}
              href={`/explore/${character.id}`}
              className="rounded-full px-3 py-2 text-sm text-white/75 transition-colors hover:bg-white/5 hover:text-white"
            >
              {character.name}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6">
        <CharacterStrip
          characters={characters.map((character) => ({
            id: character.id,
            name: character.name,
            avatar: character.avatar,
            hasPosts: postsForCharacter(character.name).length > 0,
          }))}
        />
        {posts.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No posts yet</p>
        ) : (
          <ul className="flex flex-col gap-6">
            {posts.map(({ post, character }) => (
              <li key={`${character.id}-${post.id}`}>
                <FeedPostCard
                  post={post}
                  character={{
                    id: character.id,
                    name: character.name,
                    occupation: character.occupation,
                    avatar: character.avatar,
                    chatEnabled: character.chatEnabled,
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside className="hidden xl:block">
        <h2 className="mb-4 text-sm font-semibold">Waiting for you</h2>
        <ul className="flex flex-col gap-3">
          {characters.map((character) => (
            <li key={character.id} className="flex items-center gap-3">
              <Link href={`/characters/${character.id}`} className="relative size-11 shrink-0">
                <span className="story-ring absolute inset-0 rounded-full" />
                <span className="absolute inset-[2px] overflow-hidden rounded-full bg-muted">
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
              </Link>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{character.name}</p>
                <p className="truncate text-xs text-muted-foreground">{character.occupation}</p>
              </div>
              {character.chatEnabled ? (
                <Link
                  href={`/chats/${character.id}`}
                  className="btn-gradient inline-flex h-7 items-center rounded-full px-3 text-[11px] font-bold"
                >
                  Chat
                </Link>
              ) : (
                <span
                  aria-disabled
                  className="inline-flex h-7 cursor-not-allowed items-center rounded-full border border-white/15 px-3 text-[11px] font-bold whitespace-nowrap text-white/50"
                >
                  Soon
                </span>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
