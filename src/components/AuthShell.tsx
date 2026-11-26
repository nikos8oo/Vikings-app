import Link from "next/link";
import { Mark } from "./Brand";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh max-w-md px-6 pb-12 pt-[max(env(safe-area-inset-top),2rem)]">
      <Link href="/" className="inline-flex items-center gap-2 text-muted">
        <Mark size={22} />
        <span className="kicker">Vikings Athletes</span>
      </Link>
      <h1 className="rise display mt-12 text-5xl text-fog">{title}</h1>
      <p className="rise rise-1 mt-3 text-[15px] text-muted">{subtitle}</p>
      <div className="rise rise-2 mt-8">{children}</div>
    </main>
  );
}
