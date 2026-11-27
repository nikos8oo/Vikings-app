import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Brand } from "@/components/Brand";
import { AdminNav } from "./AdminNav";
import { requireStaff } from "@/lib/session";

/** Admin : pensé pour l'ordinateur (menu en haut + pleine largeur). Reste utilisable sur téléphone. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  const admin = me.role === "admin";
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/75 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-6 px-5 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] lg:h-16 lg:px-8 lg:py-0">
          <div className="flex min-w-0 items-center gap-8">
            <Brand href="/admin" sub="Admin" />
            <div className="hidden lg:block"><AdminNav admin={admin} top /></div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden truncate text-[12px] text-dim xl:inline">{me.first_name} {me.last_name}</span>
            <ThemeToggle />
            <Link href="/accueil" className="text-xs font-semibold text-muted hover:text-fog">Vue athlète →</Link>
          </div>
        </div>
        <div className="px-5 lg:hidden"><AdminNav admin={admin} /></div>
        <p className="border-t border-line bg-bleu/10 px-5 py-1.5 text-center text-[11px] text-muted lg:hidden">L&apos;admin est conçu pour un ordinateur : ouvre-le sur grand écran pour le planning.</p>
      </header>

      <main className="px-5 pb-20 pt-6 lg:px-8 lg:pt-8">
        <div className="mx-auto w-full max-w-[1920px]">{children}</div>
      </main>
    </div>
  );
}
