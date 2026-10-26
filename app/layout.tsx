import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { BANNER } from '@/lib/banner';
import { ResetButton } from '@/app/reset-button';

export const metadata: Metadata = {
  title: 'CVJ Group — demo dashboard',
  description: 'Demo dashboard prepared by Growth Architect Studio',
};

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/events', label: 'Events' },
  { href: '/schedule', label: 'Schedule' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-white/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-semibold tracking-tight">
                CVJ Group
              </Link>
              <nav className="flex gap-4 text-sm text-zinc-400">
                {NAV.map((n) => (
                  <Link key={n.href} href={n.href} className="hover:text-zinc-100">
                    {n.label}
                  </Link>
                ))}
              </nav>
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
