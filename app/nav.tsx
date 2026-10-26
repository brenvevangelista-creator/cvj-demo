'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/events', label: 'Events' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/analytics', label: 'Analytics' },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-1 text-sm">
      {NAV.map((n) => {
        const active = n.href === '/' ? path === '/' : path.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`rounded-md px-2.5 py-1 transition ${active ? 'bg-white/10 text-zinc-100' : 'text-zinc-400 hover:text-zinc-100'}`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
