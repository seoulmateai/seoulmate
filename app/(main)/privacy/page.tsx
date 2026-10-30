import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Privacy Policy · seoulmate" };

// TODO: 개인정보 처리방침 본문
export default function PrivacyPage() {
  return <PlaceholderPage title="Privacy Policy" />;
}
