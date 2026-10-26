import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { BANNER } from '@/lib/banner';
import { ResetButton } from '@/app/reset-button';
import { Nav } from '@/app/nav';

export const metadata: Metadata = {
  title: 'CVJ Group — demo dashboard',
  description: 'Demo dashboard prepared by Growth Architect Studio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-5">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-sky-500 text-xs font-bold text-zinc-950">
                  CVJ
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-semibold tracking-tight">CVJ Group</span>
                  <span className="block text-[11px] text-zinc-500">One compound, six businesses</span>
                </span>
              </Link>
              <Nav />
            </div>
            <ResetButton />
          </div>
          <div className="bg-amber-500/15 text-amber-200 text-xs">
            <div className="mx-auto max-w-6xl px-4 py-1.5">{BANNER}</div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
