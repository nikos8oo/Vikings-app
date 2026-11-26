import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Brand } from "@/components/Brand";
import { AdminNav } from "./AdminNav";
import { requireStaff } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
          <Brand href="/admin" sub="Admin" />
          <div className="flex items-center gap-3"><ThemeToggle /><Link href="/accueil" className="text-xs font-semibold text-muted hover:text-fog">Vue athlète →</Link></div>
        </div>
        <div className="mx-auto max-w-6xl px-5"><AdminNav admin={me.role === "admin"} /></div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-6">{children}</main>
    </div>
  );
}
