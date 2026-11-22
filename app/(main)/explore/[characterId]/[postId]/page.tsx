import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MessageLink } from "@/components/explore/message-link";
import { getCharacter, getCharacters } from "@/lib/characters";
import { postForCharacter, postsForCharacter } from "@/lib/explore/posts";

export async function generateStaticParams() {
  const characters = await getCharacters();
  return characters.flatMap((character) =>
    postsForCharacter(character.name).map((post) => ({
      characterId: character.id,
      postId: post.id,
    })),
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/explore/[characterId]/[postId]">): Promise<Metadata> {
  const { characterId, postId } = await params;
  const character = await getCharacter(characterId);
  const post = character ? postForCharacter(character.name, postId) : null;
  return {
    title: character?.isActive && post ? `${character.name} · seoulmate` : "seoulmate",
  };
}

export default async function ExplorePostPage({
  params,
}: PageProps<"/explore/[characterId]/[postId]">) {
  const { characterId, postId } = await params;
  const character = await getCharacter(characterId);
  if (!character?.isActive) notFound();

  const post = postForCharacter(character.name, postId);
  if (!post) notFound();

  return (
    <div className="page-container flex flex-col pt-6 pb-12 md:pt-10 md:pb-16">
      <div className="mx-auto flex w-full min-w-0 max-w-lg flex-col gap-5">
        <Link
          href={`/explore/${character.id}`}
          className="inline-flex items-center gap-1 self-start text-[13px] font-semibold text-muted-foreground transition-colors hover:text-coral"
        >
          <ChevronLeft className="size-4" />
          {character.name}
        </Link>

        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex w-full min-w-0 justify-center">
            <Image
              src={post.image}
              alt={post.alt}
              priority
              sizes="(max-width: 768px) 100vw, 512px"
              className="h-auto max-h-[52vh] w-auto max-w-full md:max-h-none"
            />
          </div>
          <div className="flex flex-col gap-4 p-4">
            <p className="text-[15px] leading-relaxed">{post.caption}</p>
            <div className="flex items-center justify-between gap-3">
              <Link href={`/explore/${character.id}`} className="flex min-w-0 items-center gap-2.5">
                <span className="relative block size-9 shrink-0 overflow-hidden rounded-full bg-muted">
                  <Image
                    src={character.avatar.src}
                    alt=""
                    fill
                    placeholder={character.avatar.blurDataURL ? "blur" : "empty"}
                    blurDataURL={character.avatar.blurDataURL ?? undefined}
                    sizes="36px"
                    className="object-cover object-top"
                  />
                </span>
                <span className="truncate text-sm font-semibold">{character.name}</span>
              </Link>
              <MessageLink characterId={character.id} className="shrink-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
