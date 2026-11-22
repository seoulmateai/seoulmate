import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MessageLink } from "@/components/explore/message-link";
import { PostGrid } from "@/components/explore/post-grid";
import { getCharacter, getCharacters } from "@/lib/characters";
import { postsForCharacter } from "@/lib/explore/posts";

export async function generateStaticParams() {
  const characters = await getCharacters();
  return characters.map((character) => ({ characterId: character.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/explore/[characterId]">): Promise<Metadata> {
  const { characterId } = await params;
  const character = await getCharacter(characterId);
  return {
    title: character?.isActive ? `${character.name} · seoulmate` : "seoulmate",
  };
}

export default async function ExploreProfilePage({
  params,
}: PageProps<"/explore/[characterId]">) {
  const { characterId } = await params;
  const character = await getCharacter(characterId);
  if (!character?.isActive) notFound();

  const posts = postsForCharacter(character.name);

  return (
    <div className="page-container flex flex-col pt-6 pb-12 md:pt-10 md:pb-16">
      <div className="mx-auto flex w-full max-w-[935px] flex-col gap-8">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1 self-start text-[13px] font-semibold text-muted-foreground transition-colors hover:text-coral"
        >
          <ChevronLeft className="size-4" />
          Feed
        </Link>

        <header className="flex items-center gap-6 sm:gap-10">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted sm:size-32">
            <Image
              src={character.avatar.src}
              alt=""
              fill
              priority
              placeholder={character.avatar.blurDataURL ? "blur" : "empty"}
              blurDataURL={character.avatar.blurDataURL ?? undefined}
              sizes="128px"
              className="object-cover object-top"
            />
          </div>
          <div className="flex min-w-0 flex-col items-start gap-3">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
              {character.name}
            </h1>
            <MessageLink characterId={character.id} />
            <p className="text-sm">
              <span className="font-bold">{posts.length}</span>{" "}
              <span className="text-muted-foreground">posts</span>
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">
            {character.name}{" "}
            <span className="font-medium text-muted-foreground">{character.age}</span>
          </p>
          <p className="text-sm text-muted-foreground">{character.occupation}</p>
          <p className="mt-1 max-w-md text-sm leading-relaxed">{character.bio}</p>
        </div>

        <PostGrid items={posts.map((post) => ({ post, characterId: character.id }))} />
      </div>
    </div>
  );
}
