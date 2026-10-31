import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthGatedLink } from "@/components/auth/auth-gated-link";
import { getCharacter, getCharacters } from "@/lib/characters";

// 빌드 시점의 캐릭터만 미리 렌더링. 이후 추가된 캐릭터는 첫 요청 때 렌더링
export async function generateStaticParams() {
  const characters = await getCharacters();
  return characters.map((c) => ({ id: c.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/characters/[id]">): Promise<Metadata> {
  const { id } = await params;
  const character = await getCharacter(id);
  return { title: character?.isActive ? `${character.name} · seoulmate` : "seoulmate" };
}

export default async function CharacterPage({ params }: PageProps<"/characters/[id]">) {
  const { id } = await params;
  const character = await getCharacter(id);
  if (!character?.isActive) notFound();

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col px-5 pt-6 pb-12 md:px-14 md:pt-10 md:pb-20">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 self-start text-[13px] font-semibold text-muted-foreground transition-colors hover:text-coral-dark"
      >
        <ChevronLeft className="size-4" />
        Back to Discover
      </Link>

      <div className="grid gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-center md:gap-14">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[19px] bg-[#e9e9ec]">
          <Image
            src={character.avatar.src}
            alt={`Portrait of ${character.name}`}
            fill
            priority
            placeholder={character.avatar.blurDataURL ? "blur" : "empty"}
            blurDataURL={character.avatar.blurDataURL ?? undefined}
            sizes="(max-width: 768px) 100vw, 520px"
            className="object-cover object-top"
          />
        </div>

        <div className="flex flex-col gap-6">
          <header>
            <p className="mb-3 text-xs font-extrabold tracking-[2px] text-coral-dark uppercase">
              {character.badge === "popular" ? "Popular" : "New face"}
            </p>
            <h1 className="mb-2 flex items-baseline gap-3 text-[clamp(32px,3.2vw,46px)] leading-[1.12] font-extrabold tracking-[-2px]">
              {character.name}
              <span className="text-lg font-medium tracking-normal text-muted-foreground">
                {character.age}
              </span>
            </h1>
            <p className="text-[15px] text-muted-foreground">{character.occupation}</p>
          </header>

          <ul className="flex flex-wrap gap-2">
            {character.keywords.map((keyword) => (
              <li
                key={keyword}
                className="rounded-full border border-[#ffd2ce] bg-coral-soft px-3.5 py-2 text-xs font-bold text-coral-dark"
              >
                #{keyword}
              </li>
            ))}
          </ul>

          <section className="rounded-[18px] border border-border p-6">
            <h2 className="mb-2 text-[15px] font-bold">About {character.name}</h2>
            <p className="text-[15px] leading-relaxed text-[#4b4a50]">{character.intro}</p>
          </section>

          <AuthGatedLink
            href={`/chats/${character.id}`}
            className="flex h-13 items-center justify-center rounded-[13px] bg-coral text-base font-bold text-white shadow-[0_4px_10px_#ff777244] transition-colors hover:bg-coral-dark md:self-start md:px-12"
          >
            Start chat
          </AuthGatedLink>
        </div>
      </div>
    </div>
  );
}
