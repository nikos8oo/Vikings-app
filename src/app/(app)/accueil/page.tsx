import type { Metadata } from "next";
import Link from "next/link";
import { computeLevel, getMovements, getResults, levelHistory } from "@/lib/data";
import { db } from "@/lib/db";
import { fmtDate, fmtMetric, fmtScore, todayParis } from "@/lib/format";
import { formatLabel } from "@/lib/prescription";
import { blockStyle, colorHex } from "@/lib/colors";
import { allowedTrackKeys, FOLLOWABLE, parseTrack, sourcesOf, trackKey, visibleSources } from "@/lib/tracks";
import { monthGrid, TrainingCalendar, type DayMark } from "@/components/TrainingCalendar";
import { DOMAINS, nextTier, tierOf } from "@/lib/scoring";
import { requireMe } from "@/lib/session";
import type { Result, Workout } from "@/lib/types";
import { DomainRadar, LevelRing, ProgressChart } from "@/components/viz";
import { Empty, ScoreBadge, SectionTitle, SourceTag, TierScale } from "@/components/ui";

export const metadata: Metadata = { title: "Accueil" };


export default async function Accueil({ searchParams }: { searchParams: Promise<{ bienvenue?: string; d?: string }> }) {
  const me = await requireMe();
  const { bienvenue, d } = await searchParams;
  const today = todayParis();
  const selected = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today;
  // l'athlète voit tout ce qui correspond à ses programmes affectés (Compétition et/ou Affiliates avec toutes les spés)
  const tracks = allowedTrackKeys(me);
  const programs = visibleSources(me).filter((x) => x === "competition" || x === "affiliates");
  const { from, to } = monthGrid(selected);
  const [results, movements, monthRes] = await Promise.all([
    getResults(me.id),
    getMovements(),
    db().from("workouts").select("*").eq("published", true).in("source", sourcesOf(tracks)).gte("workout_date", from).lte("workout_date", to)
      .order("block", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true }),
  ]);
  const level = await computeLevel(me, results);
  const history = await levelHistory(me, results);
  const tier = level.global != null ? tierOf(level.global) : null;
  const next = level.global != null ? nextTier(level.global) : null;
  const mmap = new Map(movements.map((m) => [m.id, m]));
  const tested = new Set(level.tests.map((t) => t.id));
  const toTest = movements.filter((m) => m.anchors_m && Number(m.weight_in_level) >= 1 && !tested.has(m.id)).slice(0, 6);
  const recent = results.filter((r) => r.movement_id).slice(0, 5);
  const monthW = ((monthRes.data ?? []) as Workout[]).filter((w) => tracks.includes(trackKey(w)));
  const myW = new Map<string, Result>();
  for (const r of results) if (r.workout_id && !myW.has(r.workout_id)) myW.set(r.workout_id, r);
  const marks: Record<string, DayMark> = {};
  for (const w of monthW) {
    const mk = (marks[w.workout_date] ??= { count: 0, done: 0 });
    mk.count++;
    if (myW.has(w.id)) mk.done++;
  }
  const dayW = monthW.filter((w) => w.workout_date === selected);
  const byTrack = FOLLOWABLE.filter((t) => tracks.includes(t)).map((t) => ({ t, list: dayW.filter((w) => trackKey(w) === t) })).filter((g) => g.list.length);

  return (
    <div className="grid gap-6">
      <div className="rise">
        <p className="kicker">{bienvenue ? "Bienvenue dans le clan" : `Salut ${me.first_name}, allons-y`}</p>
        <h1 className="display mt-1 text-4xl capitalize text-fog">{fmtDate(selected, { weekday: "long", day: "numeric", month: "long" })}</h1>
      </div>

      {/* Calendrier + séances du jour */}
      <div className="grid gap-5 md:grid-cols-[340px_minmax(0,1fr)] md:items-start">
        <div className="rise rise-1 grid gap-3 md:sticky md:top-6">
          <TrainingCalendar selected={selected} today={today} marks={marks} />
          <div className="card px-4 py-3">
            <p className="text-[12px] font-semibold text-muted">Mes programmes</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {programs.includes("competition") && <span className="rounded-full border border-lime/50 bg-lime/15 px-3 py-1 text-[12px] font-semibold text-lime">Vikings Compétition</span>}
              {programs.includes("affiliates") && <span className="rounded-full border border-bleu bg-bleu/15 px-3 py-1 text-[12px] font-semibold text-[#9fb5ff]">Vikings Affiliates · toutes les spés</span>}
              <span className="rounded-full border border-line px-3 py-1 text-[12px] font-semibold text-muted">Qualifs</span>
            </div>
            <p className="mt-2 text-[11px] text-dim">Attribués par l&apos;équipe Vikings.</p>
          </div>
        </div>

        <div className="rise rise-2 grid content-start gap-5">
          {byTrack.length ? byTrack.map(({ t, list }) => (
            <section key={t}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <SourceTag {...parseTrack(t)} />
                <span className="text-[12px] text-dim">{list.length} séance{list.length > 1 ? "s" : ""}</span>
              </div>
              <div className="grid gap-3">
                {list.map((w) => {
                  const r = myW.get(w.id);
                  return (
                    <article key={w.id} className="card overflow-hidden" style={blockStyle(w.color)}>
                      <div className="border-b border-line bg-white/[0.02] px-4 py-2.5">
                        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-fog">
                          {w.block ? <span className="text-lime">{w.block}. </span> : null}{w.title}
                          {w.format && <span className="font-semibold text-muted"> · {formatLabel(w)}</span>}
                        </p>
                      </div>
                      <Link href={`/prog/${w.id}`} className="block px-4 py-4">
                        <p className="whitespace-pre-line text-[15px] leading-relaxed text-fog">{w.description}</p>
                        {w.coach_notes && <p className="mt-3 line-clamp-2 text-[13px] text-muted">{w.coach_notes}</p>}
                      </Link>
                      <div className="px-4 pb-4">
                        {r ? (
                          <Link href={`/prog/${w.id}`} className="flex items-center justify-between rounded-xl bg-lime/10 px-4 py-3">
                            <span className="text-[13px] font-semibold text-lime">✓ Loggué</span>
                            <span className="font-bold tabular-nums text-lime">{w.score_type === "none" ? "Fait" : fmtScore(Number(r.value), w.score_type, { rpr: w.reps_per_round, capped: r.capped })}</span>
                          </Link>
                        ) : (
                          <Link href={`/prog/${w.id}`} className="btn w-full bg-fog py-3 text-canvas hover:opacity-90">＋ Logger</Link>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )) : (
            <div className="card px-5 py-10 text-center">
              <p className="text-[15px] font-semibold text-fog">{selected === today ? "Pas de séance aujourd'hui" : "Pas de séance ce jour-là"}</p>
              <p className="mt-1 text-[13px] text-muted">Sur tes programmes suivis. Choisis un autre jour ou ajoute un programme.</p>
              <Link href="/prog" className="mt-4 inline-block text-[13px] font-semibold text-bleu-2">Voir toute la prog</Link>
            </div>
          )}
        </div>
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
