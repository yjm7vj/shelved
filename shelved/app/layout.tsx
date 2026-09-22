import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { Nav } from "@/components/nav";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/supabase";
import { ensureUser } from "@/lib/user";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shelved — track, review and discover games",
  description:
    "Import your Steam library, rate what you have played, follow other players and get recommendations.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const configured = isSupabaseConfigured();
  const user = configured ? await ensureUser().catch(() => null) : null;

  return (
    <ClerkProvider>
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
        <body className="page-glow min-h-full antialiased">
          <Nav username={user?.username} />
          <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            {!configured && <SetupNotice />}
            {children}
          </main>
          <footer className="border-t border-line px-4 py-8 text-center text-xs text-muted">
            Shelved — Steam data via the Steam Web API, game metadata via RAWG.
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
