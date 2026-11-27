import { visibleSources } from "@/lib/tracks";
import type { Metadata } from "next";
import Link from "next/link";
import { db, must } from "@/lib/db";
import { fmtDate, fmtScore, SOURCE_LABEL, todayParis } from "@/lib/format";
import { requireMe } from "@/lib/session";
import type { Result, Workout } from "@/lib/types";
import { Empty, SourceTag } from "@/components/ui";
import { blockStyle, colorHex } from "@/lib/colors";

export const metadata: Metadata = { title: "Prog" };

const FILTERS = ["all", "competition", "affiliates", "qualif", "benchmark"] as const;

export default async function Prog({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const me = await requireMe();
  const s = (await searchParams).s ?? "all";
  const today = todayParis();
  let q = db().from("workouts").select("*").eq("published", true).in("source", visibleSources(me)).order("workout_date", { ascending: false }).order("block", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).limit(80);
  if (s !== "all") q = q.eq("source", s);
  else q = q.neq("source", "benchmark");
  const [workouts, mine] = await Promise.all([
    q.then((r) => must(r) as Workout[]),
    db().from("results").select("workout_id,value,division,capped").eq("athlete_id", me.id).not("workout_id", "is", null).then((r) => must(r) as Result[]),
  ]);
  const myScore = new Map<string, Result>();
  for (const r of mine) if (!myScore.has(r.workout_id!)) myScore.set(r.workout_id!, r);

  const upcoming = workouts.filter((w) => w.workout_date > today && s !== "benchmark").reverse();
  const past = workouts.filter((w) => w.workout_date <= today || s === "benchmark");

  const card = (w: Workout) => {
    const r = myScore.get(w.id);
    return (
      <Link key={w.id} href={`/prog/${w.id}`} className="card flex items-start gap-4 p-4 transition hover:border-line-2" style={blockStyle(w.color)}>
        <div className="w-12 shrink-0 text-center">
          {w.source === "benchmark" ? <span className="display text-2xl text-dim">B</span> : (
            <>
              <span className="block text-[10px] font-semibold uppercase text-dim">{fmtDate(w.workout_date, { weekday: "short" })}</span>
              <span className="display block text-3xl text-fog">{fmtDate(w.workout_date, { day: "numeric" })}</span>
              <span className="block text-[10px] font-semibold uppercase text-dim">{fmtDate(w.workout_date, { month: "short" })}</span>
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><SourceTag source={w.source} subtrack={w.subtrack} />{w.counts_in_level && <span className="text-[10px] font-bold uppercase tracking-wider text-lime">● Niveau</span>}</div>
          <p className="display mt-2 truncate text-xl text-fog">{w.block ? <span className="mr-2 text-lime">{w.block}.</span> : null}{w.title}</p>
          <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-muted">{w.description}</p>
        </div>
        {r ? (
          <span className="shrink-0 rounded-lg bg-lime/10 px-2 py-1 text-xs font-bold text-lime">
            {fmtScore(Number(r.value), w.score_type, { rpr: w.reps_per_round, capped: r.capped })}
          </span>
        ) : <span className="shrink-0 text-xs font-semibold text-bleu-2">Score →</span>}
      </Link>
    );
  };

  return (
    <div>
      <p className="kicker rise">Programmation</p>
      <h1 className="display rise rise-1 mt-1 text-4xl text-fog">La prog</h1>
      <div className="no-scrollbar rise rise-2 -mx-5 mt-5 flex gap-2 overflow-x-auto px-5">
        {FILTERS.filter((f) => f === "all" || visibleSources(me).includes(f)).map((f) => (
          <Link key={f} href={f === "all" ? "/prog" : `/prog?s=${f}`} className={`chip shrink-0 ${s === f ? "border-bleu bg-bleu text-white" : ""}`}>
            {f === "all" ? "Tout" : f === "benchmark" ? "Benchmarks" : SOURCE_LABEL[f]}
          </Link>
        ))}
      </div>

      {upcoming.length > 0 && (
        <section className="mt-6">
          <h2 className="kicker mb-3">À venir</h2>
          <div className="grid gap-3">{upcoming.map(card)}</div>
        </section>
      )}
      <section className="mt-6">
        {upcoming.length > 0 && <h2 className="kicker mb-3">Passées</h2>}
        {past.length ? <div className="grid gap-3">{past.map(card)}</div> : <Empty>Aucune séance pour ce filtre.</Empty>}
      </section>
    </div>
  );
}
