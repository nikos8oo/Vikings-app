import type { Metadata } from "next";
import Link from "next/link";
import { computeLevel, getMovements, getResults, levelHistory } from "@/lib/data";
import { db } from "@/lib/db";
import { fmtDate, fmtMetric, todayParis } from "@/lib/format";
import { DOMAINS, nextTier, tierOf } from "@/lib/scoring";
import { requireMe } from "@/lib/session";
import type { Workout } from "@/lib/types";
import { DomainRadar, LevelRing, ProgressChart } from "@/components/viz";
import { Empty, ScoreBadge, SectionTitle, SourceTag, TierScale } from "@/components/ui";

export const metadata: Metadata = { title: "Accueil" };

export default async function Accueil({ searchParams }: { searchParams: Promise<{ bienvenue?: string }> }) {
  const me = await requireMe();
  const { bienvenue } = await searchParams;
  const today = todayParis();
  const [results, movements, upcoming] = await Promise.all([
    getResults(me.id),
    getMovements(),
    db().from("workouts").select("*").eq("published", true).neq("source", "benchmark").lte("workout_date", today)
      .order("workout_date", { ascending: false }).limit(3),
  ]);
  const level = await computeLevel(me, results);
  const history = await levelHistory(me, results);
  const tier = level.global != null ? tierOf(level.global) : null;
  const next = level.global != null ? nextTier(level.global) : null;
  const mmap = new Map(movements.map((m) => [m.id, m]));
  const tested = new Set(level.tests.map((t) => t.id));
  const toTest = movements.filter((m) => m.anchors_m && Number(m.weight_in_level) >= 1 && !tested.has(m.id)).slice(0, 6);
  const recent = results.filter((r) => r.movement_id).slice(0, 5);
  const workouts = (upcoming.data ?? []) as Workout[];
  const doneW = new Set(results.map((r) => r.workout_id).filter(Boolean));

  return (
    <div className="grid gap-6">
      <div className="rise">
        <p className="kicker">{bienvenue ? "Bienvenue dans le clan" : "Salut"}</p>
        <h1 className="display mt-1 text-4xl text-fog">{me.first_name}</h1>
      </div>

      {/* Niveau */}
      <section className="rise rise-1 card overflow-hidden p-5 md:p-7">
        <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
          <div className="mx-auto"><LevelRing value={level.global} tier={tier?.label ?? "À évaluer"} provisional={level.provisional} /></div>
          <div className="grid gap-5">
            {level.global == null ? (
              <div>
                <h2 className="display text-2xl text-fog">Ton niveau t&apos;attend</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Entre tes premiers PR (back squat, clean, strict pull-up, 2000 m rameur…) ou un benchmark comme Fran.
                  Dès 6 tests sur 3 domaines, ton niveau devient officiel.
                </p>
                <Link href="/perfs" className="btn-lime mt-4">Entrer mes perfs</Link>
              </div>
            ) : (
              <>
                <div>
                  <p className="kicker">Accès compétitions</p>
                  <p className="display mt-1 text-3xl text-fog">Catégorie <span className="text-lime">{tier!.label}</span></p>
                  <p className="mt-1 text-sm text-muted">
                    {next ? <>Plus que <b className="text-fog">{(next.min - level.global).toFixed(1)} pts</b> pour passer {next.label}.</> : "Tu es au sommet du barème. Respect."}
                    {level.provisional && " Niveau provisoire : ajoute des tests pour le fiabiliser."}
                  </p>
                </div>
                <TierScale score={level.global} />
                <p className="text-xs text-dim">Calculé sur {level.tests.length} test{level.tests.length > 1 ? "s" : ""} · 100 = référence CrossFit Games</p>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Radar */}
        <section className="rise rise-2 card p-5">
          <SectionTitle>Profil athlète</SectionTitle>
          {level.tests.length ? (
            <>
              <DomainRadar data={level.domains} />
              <div className="mt-2 grid grid-cols-5 gap-1 text-center">
                {level.domains.map((d) => (
                  <div key={d.key}>
                    <ScoreBadge score={d.score} size="sm" />
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-dim">{DOMAINS.find((x) => x.key === d.key)?.short}</p>
                  </div>
                ))}
              </div>
            </>
          ) : <Empty>Ton radar apparaîtra avec tes premiers tests.</Empty>}
        </section>

        {/* Forces / faiblesses */}
        <section className="rise rise-3 card p-5">
          <SectionTitle>Forces & axes de travail</SectionTitle>
          {level.tests.length >= 2 ? (
            <div className="grid gap-4">
              <div>
                <p className="kicker mb-2 text-lime">Points forts</p>
                <ul className="grid gap-2">
                  {level.strengths.map((t) => (
                    <li key={t.id}><Link href={t.kind === "movement" ? `/perfs/${t.id}` : `/prog/${t.id}`} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
                      <span className="text-sm font-medium">{t.name}</span><ScoreBadge score={t.score} size="sm" />
                    </Link></li>
                  ))}
                </ul>
              </div>
              {level.weaknesses.length > 0 && (
                <div>
                  <p className="kicker mb-2">À travailler</p>
                  <ul className="grid gap-2">
                    {level.weaknesses.map((t) => (
                      <li key={t.id}><Link href={t.kind === "movement" ? `/perfs/${t.id}` : `/prog/${t.id}`} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
                        <span className="text-sm font-medium">{t.name}</span><ScoreBadge score={t.score} size="sm" />
                      </Link></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : <Empty>Il faut au moins 2 tests pour comparer tes points forts et faibles.</Empty>}
        </section>
      </div>

      {history.length >= 2 && (
        <section className="rise card p-5">
          <SectionTitle>Évolution du niveau</SectionTitle>
          <ProgressChart data={history.map((h) => ({ date: h.date, value: h.level }))} format="level"
            refLines={[{ y: 60, label: "Inter" }, { y: 75, label: "RX" }, { y: 90, label: "Élite" }]} />
        </section>
      )}

      {/* Prog */}
      <section className="rise">
        <SectionTitle action={{ href: "/prog", label: "Toute la prog" }}>Dernières séances</SectionTitle>
        {workouts.length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {workouts.map((w) => (
              <Link key={w.id} href={`/prog/${w.id}`} className="card block p-4 transition hover:border-line-2">
                <div className="flex items-center justify-between">
                  <SourceTag source={w.source} />
                  <span className="text-xs text-dim">{fmtDate(w.workout_date, { weekday: "short", day: "numeric", month: "short" })}</span>
                </div>
                <p className="display mt-3 text-xl text-fog">{w.title}</p>
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-muted">{w.description}</p>
                <p className={`mt-3 text-xs font-semibold ${doneW.has(w.id) ? "text-lime" : "text-bleu-2"}`}>{doneW.has(w.id) ? "✓ Score entré" : "Entrer mon score →"}</p>
              </Link>
            ))}
          </div>
        ) : <Empty>La prog Vikings arrive bientôt ici.</Empty>}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rise">
          <SectionTitle action={{ href: "/perfs", label: "Tous les mouvements" }}>Tests à faire</SectionTitle>
          {toTest.length ? (
            <div className="flex flex-wrap gap-2">
              {toTest.map((m) => (
                <Link key={m.id} href={`/perfs/${m.id}`} className="rounded-full border border-line-2 bg-white/[0.03] px-3.5 py-2 text-sm font-medium hover:border-bleu">
                  {m.name} <span className="text-dim">· {m.test_label}</span>
                </Link>
              ))}
            </div>
          ) : <Empty>Tous les tests clés sont faits. Machine.</Empty>}
        </section>

        <section className="rise">
          <SectionTitle>Dernières perfs</SectionTitle>
          {recent.length ? (
            <ul className="card divide-y divide-line">
              {recent.map((r) => {
                const m = mmap.get(r.movement_id!);
                if (!m) return null;
                return (
                  <li key={r.id}>
                    <Link href={`/perfs/${m.id}`} className="flex items-center justify-between px-4 py-3">
                      <span><span className="block text-sm font-medium">{m.name}</span><span className="text-xs text-dim">{fmtDate(r.performed_on)}</span></span>
                      <span className="font-semibold tabular-nums">{fmtMetric(Number(r.value), m.metric)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : <Empty>Aucune perf pour l&apos;instant.</Empty>}
        </section>
      </div>
    </div>
  );
}
