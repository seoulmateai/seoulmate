import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { DeleteAccountButton } from "@/components/settings/delete-account-button";
import { NicknameEditor } from "@/components/settings/nickname-editor";
import { requireOnboardedUser } from "@/lib/auth/session";

const LINKS = [
  {
    href: "/settings/inquiry",
    label: "Contact us",
    description: "Questions or feedback? Get in touch.",
  },
  {
    href: "/terms",
    label: "Terms of Service",
    description: "Read the terms for using seoulmate.",
  },
  {
    href: "/privacy",
    label: "Privacy Policy",
    description: "Learn how your information is handled.",
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-4.5 pt-8 pb-6 md:px-7 md:pt-10 min-[850px]:px-14 min-[850px]:pt-14">
      <section className="mb-6 md:mb-7.5">
        <p className="mb-2.5 text-[11px] font-extrabold tracking-[2px] text-coral">YOUR ACCOUNT</p>
        <h1 className="mb-2 text-[32px] leading-[1.15] font-bold tracking-[-1.5px] md:text-[38px]">
          My Page
        </h1>
        <p className="text-xs text-muted-foreground md:text-sm">
          Manage your account and personal information.
        </p>
      </section>

      <Suspense
        fallback={<div className="mb-5.5 h-[116px] animate-pulse rounded-[20px] bg-coral-soft md:mb-7.5 md:h-[128px]" />}
      >
        <ProfileCard />
      </Suspense>

      <div className="grid items-start gap-4 min-[850px]:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)] min-[850px]:gap-6.5">
        <nav
          aria-label="Information and support"
          className="overflow-hidden rounded-[18px] border border-[#e9e9ec] bg-white"
        >
          <ul className="divide-y divide-[#e9e9ec]">
            {LINKS.map(({ href, label, description }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex min-h-[65px] items-center justify-between gap-4.5 px-4.5 text-sm transition-colors hover:bg-[#fffafa] md:min-h-[76px] md:px-6 md:text-base"
                >
                  <span>
                    {label}
                    <small className="mt-1 block text-[11px] text-[#999aa1]">{description}</small>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-[#85858c]" strokeWidth={1.5} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section className="rounded-[18px] border border-[#e9e9ec] bg-white p-5 md:p-6">
          <h2 className="mb-2 text-[15px] font-bold">Account actions</h2>
          <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
            Sign out of your account or permanently remove it.
          </p>
          <SignOutButton />
          <DeleteAccountButton />
          <p className="mt-6 border-t border-[#f0f0f1] pt-4.5 text-[11px] leading-relaxed text-[#a0a0a6]">
            Account deletion is permanent. Your profile and chat history will no longer be
            available.
          </p>
        </section>
      </div>

      <SiteFooter className="mt-12 md:mt-16" />
    </div>
  );
}

async function ProfileCard() {
  const { user, profile } = await requireOnboardedUser("/settings");

  return (
    <section className="mb-5.5 flex items-center gap-4 rounded-[17px] bg-coral-soft px-4.5 py-5 md:mb-7.5 md:gap-5.5 md:rounded-[20px] md:px-7.5 md:py-6.5">
      <div className="grid size-16 shrink-0 place-items-center rounded-full bg-coral text-2xl font-semibold text-white md:size-[76px] md:text-[29px]">
        {profile.nickname.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <NicknameEditor nickname={profile.nickname} />
        <p className="truncate text-xs text-muted-foreground md:text-[15px]">{user.email}</p>
        <p className="mt-2 text-[11px] text-[#a16d69]">Your seoulmate account</p>
      </div>
    </section>
  );
}
