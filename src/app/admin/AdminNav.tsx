"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICON: Record<string, React.ReactNode> = {
  "/admin": <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  "/admin/seances": <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4M7 13h4M7 17h7" /></>,
  "/admin/athletes": <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5" /><circle cx="17.5" cy="9" r="2.5" /><path d="M16.5 14.6c2.6.2 4.3 2 5 5" /></>,
  "/admin/box": <><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21v-6h6v6" /></>,
  "/admin/baremes": <><path d="M4 20h16M7 16V9M12 16V5M17 16v-4" /></>,
};

export function AdminNav({ admin, side = false }: { admin: boolean; side?: boolean }) {
  const path = usePathname();
  const items = [
    ["/admin", "Tableau de bord"],
    ["/admin/seances", "Planning"],
    ["/admin/athletes", "Athlètes"],
    ["/admin/box", "Box"],
    ...(admin ? [["/admin/baremes", "Barèmes"]] : []),
  ];
  const on = (h: string) => (h === "/admin" ? path === h : path.startsWith(h));
  if (side) return (
    <nav className="grid gap-0.5">
      {items.map(([h, l]) => (
        <Link key={h} href={h} className={`flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] font-medium transition ${on(h) ? "bg-panel-3 text-fog" : "text-muted hover:bg-white/[0.03] hover:text-fog"}`}>
          <svg viewBox="0 0 24 24" className={`h-[18px] w-[18px] ${on(h) ? "text-lime" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICON[h]}</svg>
          {l}
        </Link>
      ))}
    </nav>
  );
  return (
    <nav className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto px-5">
      {items.map(([h, l]) => (
        <Link key={h} href={h} className={`shrink-0 border-b-2 px-3 pb-2.5 pt-1 text-sm font-semibold transition ${on(h) ? "border-lime text-fog" : "border-transparent text-muted hover:text-fog"}`}>
          {l}
        </Link>
      ))}
    </nav>
  );
}
