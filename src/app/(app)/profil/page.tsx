import { ThemeToggle } from "@/components/ThemeToggle";
import type { Metadata } from "next";
import { logout } from "@/app/actions/auth";
import { getBoxes } from "@/lib/data";
import { requireMe } from "@/lib/session";
import { ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Profil" };

export default async function Profil() {
  const me = await requireMe();
  const boxes = await getBoxes();
  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <div className="rise flex items-center gap-4">
        <span className="display grid h-16 w-16 place-items-center rounded-2xl text-2xl text-ink" style={{ background: me.avatar_color ?? "#e4e1e6" }}>
          {me.first_name[0]}{me.last_name[0]}
        </span>
        <div>
          <h1 className="display text-3xl text-fog">{me.first_name} {me.last_name}</h1>
          <p className="text-sm text-muted">{me.email}{me.role !== "athlete" && <span className="ml-2 rounded bg-lime px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink">{me.role}</span>}</p>
        </div>
      </div>
      <section className="rise rise-1 card p-5">
        <h2 className="display mb-4 text-xl">Mes infos</h2>
        <ProfileForm me={me} boxes={boxes.map((b) => ({ id: b.id, label: b.city ? `${b.name} · ${b.city}` : b.name }))} />
      </section>
      <section className="rise rise-2 card flex items-center justify-between gap-4 p-5">
        <div><h2 className="display text-xl">Apparence</h2><p className="mt-1 text-sm text-muted">Version sombre ou version blanche.</p></div>
        <ThemeToggle />
      </section>
      <section className="rise rise-2 card p-5">
        <h2 className="display mb-2 text-xl">Connexion</h2>
        <p className="text-sm text-muted">Tu te connectes avec <span className="text-fog">{me.email}</span> : un lien et un code te sont envoyés à chaque connexion. Pas de mot de passe à retenir.</p>
      </section>
      <form action={logout} className="rise rise-3">
        <button className="btn-ghost w-full">Se déconnecter</button>
      </form>
    </div>
  );
}
