import Link from "next/link";
import { Brand } from "@/components/Brand";
import { Nav } from "@/components/Nav";
import { isImpersonating, requireMe } from "@/lib/session";
import { stopDemoView } from "@/app/actions/demo";

/** App athlète : pensée pour le téléphone (colonne mobile + barre d'onglets), même ouverte sur un ordinateur. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMe();
  const staff = me.role === "admin" || me.role === "coach";
  const demo = await isImpersonating();
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] md:border-x md:border-line md:shadow-[0_0_80px_-20px_rgb(0_0_0/0.6)]">
      {demo && (
        <form action={stopDemoView} className="flex items-center justify-center gap-2 bg-lime px-3 py-2 text-[12px] font-semibold text-ink">
          <span className="truncate">Démo · {me.first_name} {me.last_name}</span>
          <button className="shrink-0 rounded-full bg-ink px-3 py-1 text-[11px] text-lime">Revenir à l&apos;admin</button>
        </form>
      )}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/75 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 pb-2.5 pt-[max(env(safe-area-inset-top),0.6rem)]">
          <Brand />
          <Link href="/profil" aria-label="Mon profil" className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-ink" style={{ background: me.avatar_color ?? "#e4e1e6" }}>
            {me.first_name[0]}{me.last_name[0]}
          </Link>
        </div>
      </header>
      <main className="px-4 pb-32 pt-5">{children}</main>
      <Nav staff={staff} />
    </div>
  );
}
