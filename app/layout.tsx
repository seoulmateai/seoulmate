import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";

import { AuthProvider } from "@/components/auth/auth-provider";
import { SLOGAN } from "@/lib/slogan";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
});

export const metadata: Metadata = {
  title: "seoulmate",
  description: SLOGAN,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${dmSans.variable} ${instrumentSerif.variable} dark h-full antialiased`}>
      <body className="min-h-full bg-background">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
