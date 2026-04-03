"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Xếp hạng", icon: "trophy" },
  { href: "/play", label: "Thi đấu", icon: "play" },
  { href: "/tournaments", label: "Giải đấu", icon: "cup" },
  { href: "/matches", label: "Lịch sử", icon: "list" },
  { href: "/players", label: "Người chơi", icon: "users" },
];

const icons: Record<string, (active: boolean) => React.ReactNode> = {
  trophy: (a) => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-4.5A3.375 3.375 0 0019.875 10.875 3.375 3.375 0 0016.5 7.5h0V3.75m0 15H7.5m0 0v-4.5A3.375 3.375 0 014.125 10.875 3.375 3.375 0 017.5 7.5h0V3.75m0 0h9m-9 0H6a1.5 1.5 0 00-1.5 1.5v1.5A3 3 0 007.5 9.75h0m9-6H18a1.5 1.5 0 011.5 1.5v1.5A3 3 0 0116.5 9.75h0" />
    </svg>
  ),
  play: (a) => (
    <svg className="w-5 h-5" fill={a ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  cup: (a) => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v4a6 6 0 01-6 6h-6a6 6 0 01-6-6V3zm3 10l1.5 5h9L18 13M9 18h6v3H9v-3z" />
    </svg>
  ),
  list: (a) => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  ),
  users: (a) => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={a ? 2.2 : 1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
};

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 sm:hidden z-20">
      <div className="flex justify-around items-center h-14">
        {tabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 ${
                active ? "text-blue-600" : "text-gray-400"
              }`}
            >
              {icons[tab.icon](active)}
              <span className="text-[9px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
