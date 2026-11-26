"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ admin }: { admin: boolean }) {
  const path = usePathname();
  const items = [
    ["/admin", "Tableau de bord"],
    ["/admin/seances", "Planning"],
    ["/admin/athletes", "Athlètes"],
    ["/admin/box", "Box"],
    ...(admin ? [["/admin/baremes", "Barèmes"]] : []),
  ];
  return (
    <nav className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto px-5">
      {items.map(([h, l]) => {
        const on = h === "/admin" ? path === h : path.startsWith(h);
        return (
          <Link key={h} href={h} className={`shrink-0 border-b-2 px-3 pb-2.5 pt-1 text-sm font-semibold transition ${on ? "border-lime text-fog" : "border-transparent text-muted hover:text-fog"}`}>
            {l}
          </Link>
        );
      })}
    </nav>
  );
}
