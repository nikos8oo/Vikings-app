"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  prog: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>,
  perfs: <path d="M3 20h18M6 16V9M11 16V5M16 16v-5M21 16v-8" />,
  profil: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  admin: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></>,
};

export function Nav({ staff }: { staff: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/accueil", label: "Accueil", icon: "home" },
    { href: "/prog", label: "Prog", icon: "prog" },
    { href: "/perfs", label: "Perfs", icon: "perfs" },
    { href: "/profil", label: "Profil", icon: "profil" },
    ...(staff ? [{ href: "/admin", label: "Admin", icon: "admin" }] : []),
  ];
  const active = (h: string) => path === h || path.startsWith(h + "/");
  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-1 md:flex">
        {items.map((i) => (
          <Link key={i.href} href={i.href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active(i.href) ? "bg-white/10 text-fog" : "text-muted hover:text-fog"}`}>
            {i.label}
          </Link>
        ))}
      </nav>
      {/* Mobile : barre d'onglets en verre */}
      <nav className="glass pb-safe fixed inset-x-3 bottom-3 z-40 rounded-[22px] px-2 pt-2 md:hidden">
        <ul className="flex justify-around">
          {items.map((i) => {
            const on = active(i.href);
            return (
              <li key={i.href} className="flex-1">
                <Link href={i.href} className="flex flex-col items-center gap-1 py-1">
                  <span className={`grid h-9 w-12 place-items-center rounded-full transition ${on ? "bg-bleu text-white shadow-[0_6px_20px_-6px_rgb(46_90_239/0.9)]" : "text-muted"}`}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONS[i.icon]}</svg>
                  </span>
                  <span className={`text-[10px] font-semibold ${on ? "text-fog" : "text-dim"}`}>{i.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
