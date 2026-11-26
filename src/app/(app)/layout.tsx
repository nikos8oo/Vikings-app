import { ThemeToggle } from "@/components/ThemeToggle";
import { Brand } from "@/components/Brand";
import { Nav } from "@/components/Nav";
import { isImpersonating, requireMe } from "@/lib/session";
import { stopDemoView } from "@/app/actions/demo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMe();
  const staff = me.role === "admin" || me.role === "coach";
  const demo = await isImpersonating();
  return (
    <div className="min-h-dvh">
      {demo && (
        <form action={stopDemoView} className="flex items-center justify-center gap-3 bg-lime px-4 py-2 text-[13px] font-semibold text-ink">
          <span>Mode démo · tu vois l&apos;app comme {me.first_name} {me.last_name}</span>
          <button className="rounded-full bg-ink px-3 py-1 text-[12px] text-lime">Revenir à l&apos;admin</button>
        </form>
      )}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
          <Brand />
          <div className="flex items-center gap-2"><Nav staff={staff} /><ThemeToggle className="hidden md:grid" /></div>
          <span className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-ink md:hidden"
            style={{ background: me.avatar_color ?? "#e4e1e6" }}>
            {me.first_name[0]}{me.last_name[0]}
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-32 pt-6 md:pb-16">{children}</main>
    </div>
  );
}
