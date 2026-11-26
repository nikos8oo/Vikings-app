import Link from "next/link";
import { redirect } from "next/navigation";
import { Mark } from "@/components/Brand";
import { getMe } from "@/lib/session";
import { TIERS } from "@/lib/scoring";

export default async function Home() {
  if (await getMe()) redirect("/accueil");
  const scale = [...TIERS].reverse();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 pb-10 pt-[max(env(safe-area-inset-top),2.5rem)]">
      <div className="rise flex items-center gap-2">
        <Mark size={22} />
        <span className="kicker text-fog">Vikings Athletes</span>
      </div>

      <section className="mt-auto pt-16">
        <p className="rise rise-1 kicker text-lime">Mesure. Progresse. Appartiens.</p>
        <h1 className="rise rise-2 display mt-3 text-[64px] text-fog">
          Ton niveau,<br />
          <span className="text-bleu">de 0 à 100.</span>
        </h1>
        <p className="rise rise-3 mt-5 text-[15px] leading-relaxed text-muted">
          Chaque séance, chaque PR, chaque WOD compte. Vikings te situe face aux références des Games, révèle tes forces et tes
          faiblesses, et t&apos;ouvre les compétitions de ton niveau.
        </p>

        <div className="rise rise-4 mt-8 flex h-2 overflow-hidden rounded-full">
          {scale.map((t, i) => {
            const next = scale[i + 1]?.min ?? 100;
            return <div key={t.key} style={{ flex: next - t.min, background: t.color }} title={t.label} />;
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-semibold uppercase tracking-wider text-dim">
          <span>Fitness</span><span>Inter 60</span><span>RX 75</span><span>Élite 90</span><span className="text-lime">Games</span>
        </div>
      </section>

      <div className="mt-10 grid gap-3">
        <Link href="/inscription" className="btn-lime w-full py-4 text-base">Rejoindre la communauté</Link>
        <Link href="/connexion" className="btn-ghost w-full py-4 text-base">J&apos;ai déjà un compte</Link>
      </div>
    </main>
  );
}
