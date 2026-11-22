import { ChevronRight, FileText, Gem, Lock, Mail, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { DeleteAccountButton } from "@/components/settings/delete-account-button";
import { NicknameEditor } from "@/components/settings/nickname-editor";
import { EPISODE_COUNT } from "@/lib/affection/stages";
import { requireOnboardedUser } from "@/lib/auth/session";
import { freeDailyRubies, getWallet } from "@/lib/billing/wallet";
import { getCharacters, getCharactersByIds } from "@/lib/characters";
import { createAdminClient } from "@/lib/supabase/admin";

const LINKS = [
  {
    href: "/pricing",
    label: "Subscription & billing",
    description: "See plans. Checkout isn't open yet.",
    icon: Gem,
  },
  {
    href: "/settings/inquiry",
    label: "Contact us",
    description: "Questions or feedback? Get in touch.",
    icon: Mail,
  },
  {
    href: "/terms",
    label: "Terms of Service",
    description: "Read the terms for using seoulmate.",
    icon: FileText,
  },
  {
    href: "/privacy",
    label: "Privacy Policy",
    description: "How your information is handled.",
    icon: Lock,
  },
];

export default async function SettingsPage() {
  const { user, profile, supabase } = await requireOnboardedUser("/settings");
  const [{ data: rooms }, characters] = await Promise.all([
    supabase
      .from("chat_rooms")
      .select("character_id, unlocked_stage, last_message_at")
      .order("last_message_at", { ascending: false, nullsFirst: false }),
    getCharacters(),
  ]);

  const mates = await getCharactersByIds((rooms ?? []).map((room) => room.character_id));
  const seoulmates = (rooms ?? []).flatMap((room) => {
    const character = mates.get(room.character_id);
    return character
      ? [{ id: character.id, name: character.name, avatar: character.avatar, lastMessageAt: room.last_message_at }]
      : [];
  });
  const unlocked = (rooms ?? []).reduce((sum, room) => sum + room.unlocked_stage, 0);
  const sceneTotal = Math.max(characters.length, 1) * EPISODE_COUNT;
  const favorite = seoulmates[0]?.name ?? "—";

  let freeLeft: number | null = null;
  try {
    const wallet = await getWallet(createAdminClient(), user.id);
    freeLeft = wallet.free;
  } catch (error) {
    console.error("[settings] wallet", error);
  }
  const daily = freeDailyRubies();
  const rubyPercent =
    freeLeft != null && daily > 0 ? Math.min(100, Math.round((freeLeft / daily) * 100)) : null;

  return (
    <div className="page-container flex flex-1 flex-col pt-8 pb-8 md:pt-12">
      <section className="mb-6">
        <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-coral uppercase">Your account</p>
        <h1 className="text-[clamp(32px,4vw,44px)] font-extrabold tracking-[-0.04em]">
          My <span className="font-script font-normal text-coral">Seoul story</span>
        </h1>
      </section>

      <section className="mb-4 flex flex-col gap-4 rounded-[24px] border border-white/10 bg-[linear-gradient(110deg,#2a1228_0%,#120c18_55%,#1a1030_100%)] px-4 py-5 sm:flex-row sm:items-center md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="story-ring grid size-16 shrink-0 place-items-center rounded-full p-0.5">
            <span className="grid size-full place-items-center rounded-full bg-[#1a1024] text-2xl font-semibold">
              {profile.nickname.slice(0, 1).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <NicknameEditor nickname={profile.nickname} />
            <p className="truncate text-xs text-muted-foreground md:text-sm">{user.email}</p>
            <p className="mt-2 inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80">
              Free plan
            </p>
          </div>
        </div>
        <Link
          href="/pricing"
          className="btn-gradient inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-bold transition-[filter] hover:brightness-110"
        >
          <Sparkles className="size-4" aria-hidden />
          Upgrade to Seoulmate+
        </Link>
      </section>

      <dl className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Scenes unlocked" value={`${unlocked} / ${sceneTotal}`} />
        <Stat label="Your favorite" value={favorite} />
        <Stat label="Rubies today" value={freeLeft == null ? "—" : String(freeLeft)} />
      </dl>

      <div className="grid items-start gap-4 min-[850px]:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.8fr)]">
        <div className="order-2 flex flex-col gap-4 min-[850px]:order-1">
          <section className="rounded-[22px] border border-white/10 bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">My Seoulmates</h2>
              <Link href="/chats" className="text-xs font-semibold text-coral">
                See all →
              </Link>
            </div>
            {seoulmates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No conversations yet.{" "}
                <Link href="/#characters" className="font-semibold text-coral">
                  Pick someone
                </Link>
              </p>
            ) : (
              <ul className="flex gap-4 overflow-x-auto">
                {seoulmates.map((mate) => (
                  <li key={mate.id} className="w-16 shrink-0">
                    <Link href={`/chats/${mate.id}`} className="flex flex-col items-center gap-1.5">
                      <span className="story-ring rounded-full p-[2px]">
                        <span className="relative block size-14 overflow-hidden rounded-full bg-muted">
                          <Image
                            src={mate.avatar.src}
                            alt=""
                            fill
                            placeholder={mate.avatar.blurDataURL ? "blur" : "empty"}
                            blurDataURL={mate.avatar.blurDataURL ?? undefined}
                            sizes="56px"
                            className="object-cover object-top"
                          />
                        </span>
                      </span>
                      <span className="w-full truncate text-center text-[11px]">{mate.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <nav aria-label="Information and support" className="overflow-hidden rounded-[22px] border border-white/10 bg-card">
            <ul className="divide-y divide-white/8">
              {LINKS.map(({ href, label, description, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex min-h-[68px] items-center gap-3 px-4 transition-colors hover:bg-white/4 md:px-5"
                  >
                    <Icon className="size-4 shrink-0 text-coral" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{label}</span>
                      <small className="mt-0.5 block text-[11px] text-muted-foreground">{description}</small>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="order-1 flex flex-col gap-4 min-[850px]:order-2">
          <section className="rounded-[22px] border border-white/10 bg-card p-5">
            <h2 className="mb-2 text-base font-bold">Your plan</h2>
            <p className="text-xs text-muted-foreground">
              Free plan
              {rubyPercent != null ? ` · ${rubyPercent}% of today's rubies left` : ""}
            </p>
            {rubyPercent != null && (
              <div className="mt-3">
                <div
                  role="meter"
                  aria-label="Free rubies left today"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={rubyPercent}
                  className="h-2 overflow-hidden rounded-full bg-white/10"
                >
                  <div className="btn-gradient h-full rounded-full" style={{ width: `${rubyPercent}%` }} />
                </div>
                <p className="mt-2 text-right text-xs font-semibold text-white/70">{rubyPercent}%</p>
              </div>
            )}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Rubies refill on the free plan. Paid plans are preview-only for now.
            </p>
          </section>

          <section className="rounded-[22px] border border-white/10 bg-card p-5">
            <h2 className="mb-2 text-[15px] font-bold">Account actions</h2>
            <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
              Sign out of your account or permanently remove it.
            </p>
            <SignOutButton />
            <DeleteAccountButton />
            <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">
              Deleting is permanent. Your profile and chat history will be removed.
            </p>
          </section>
        </div>
      </div>

      <SiteFooter className="mt-12" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-card px-3 py-4 md:px-4">
      <dd className="truncate text-base font-extrabold tracking-[-0.03em] md:text-lg">{value}</dd>
      <dt className="mt-1 text-[11px] text-muted-foreground">{label}</dt>
    </div>
  );
}
