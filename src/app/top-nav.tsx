"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Xếp hạng" },
  { href: "/play", label: "Thi đấu" },
  { href: "/tournaments", label: "Giải đấu" },
  { href: "/matches", label: "Lịch sử" },
  { href: "/players", label: "Người chơi" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="hidden sm:block bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold">
          Badminton Elo
        </Link>
        <nav className="flex gap-5 text-sm">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  active ? "text-gray-900 font-medium" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
