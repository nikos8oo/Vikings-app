import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Brand } from "@/components/Brand";
import { AdminNav } from "./AdminNav";
import { requireStaff } from "@/lib/session";

/** Admin : pensé pour l'ordinateur (barre latérale + pleine largeur). Reste utilisable sur téléphone. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  const admin = me.role === "admin";
  return (
    <div className="min-h-dvh">
      {/* Ordinateur : barre latérale fixe */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-canvas/80 px-3 pb-4 pt-5 backdrop-blur-xl lg:flex">
        <div className="px-2"><Brand href="/admin" sub="Admin" /></div>
        <div className="mt-7"><AdminNav admin={admin} side /></div>
        <div className="mt-auto grid gap-2 border-t border-line px-2 pt-4">
          <Link href="/accueil" className="text-[13px] font-medium text-muted hover:text-fog">Vue athlète →</Link>
          <div className="flex items-center justify-between">
            <span className="truncate text-[12px] text-dim">{me.first_name} {me.last_name}</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Téléphone / tablette : barre en haut */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/75 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
          <Brand href="/admin" sub="Admin" />
          <div className="flex items-center gap-3"><ThemeToggle /><Link href="/accueil" className="text-xs font-semibold text-muted hover:text-fog">Vue athlète →</Link></div>
        </div>
        <div className="px-5"><AdminNav admin={admin} /></div>
        <p className="border-t border-line bg-bleu/10 px-5 py-1.5 text-center text-[11px] text-muted">L&apos;admin est conçu pour un ordinateur : ouvre-le sur grand écran pour le planning.</p>
      </header>

      <main className="px-5 pb-20 pt-6 lg:pl-[calc(15rem+2.5rem)] lg:pr-10 lg:pt-8">
        <div className="mx-auto w-full max-w-[1800px]">{children}</div>
      </main>
    </div>
  );
}
