import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";

import { AuthProvider } from "@/components/auth/auth-provider";
import { SLOGAN } from "@/lib/slogan";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "seoulmate",
  description: SLOGAN,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-background">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
