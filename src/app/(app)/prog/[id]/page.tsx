import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getMovementMap, leaderboard } from "@/lib/data";
import { fmtDate, fmtScore, fmtTime, todayParis } from "@/lib/format";
import { anchorsFor, scoreFrom } from "@/lib/scoring";
import { requireMe } from "@/lib/session";
import type { Result, Workout } from "@/lib/types";
import { ScoreForm } from "@/components/ScoreForm";
import { DeleteResult } from "@/components/DeleteButton";
import { Empty, ScoreBadge, SectionTitle, SourceTag } from "@/components/ui";
import { Leaderboard } from "./Leaderboard";

type P = { params: Promise<{ id: string }> };

async function getWorkout(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from("workouts").select("*").eq("id", id).eq("published", true).maybeSingle();
  return data as Workout | null;
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  return { title: (await getWorkout((await params).id))?.title ?? "Séance" };
}

export default async function WorkoutPage({ params }: P) {
  const { id } = await params;
  const me = await requireMe();
  const w = await getWorkout(id);
  if (!w) notFound();
  const [board, mineRes, mmap] = await Promise.all([
    leaderboard(w),
    db().from("results").select("*").eq("athlete_id", me.id).eq("workout_id", id).order("performed_on", { ascending: false }),
    getMovementMap(),
  ]);
  const mine = (mineRes.data ?? []) as Result[];
  const anchors = anchorsFor(w, me.sex);
  const bestRx = mine.filter((r) => r.division === "rx" && !r.capped)
    .reduce<number | null>((b, r) => (b == null || (w.better === "higher" ? Number(r.value) > b : Number(r.value) < b) ? Number(r.value) : b), null);
  const score = w.counts_in_level && bestRx != null ? scoreFrom(bestRx, anchors, w.better) : null;
  const fmt = (r: { value: number; capped: boolean }) => fmtScore(Number(r.value), w.score_type, { rpr: w.reps_per_round, capped: r.capped });

  return (
    <div className="grid gap-6">
      <div className="rise">
        <Link href="/prog" className="text-xs font-semibold text-muted">← La prog</Link>
        <div className="mt-3 flex items-center gap-2">
          <SourceTag source={w.source} />
          {w.source !== "benchmark" && <span className="text-xs text-dim">{fmtDate(w.workout_date, { weekday: "long", day: "numeric", month: "long" })}</span>}
        </div>
        <h1 className="display mt-2 text-5xl text-fog">{w.title}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <div className="grid content-start gap-6">
          <section className="rise rise-1 card p-5">
            <p className="whitespace-pre-line text-[16px] leading-relaxed text-fog">{w.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {w.time_cap_s && <span className="chip">Cap {fmtTime(w.time_cap_s)}</span>}
              {w.counts_in_level && <span className="chip border-lime/40 text-lime">Compte dans ton niveau</span>}
              {w.movements.map((mid) => mmap.get(mid) && (
                <Link key={mid} href={`/perfs/${mid}`} className="chip hover:border-bleu">{mmap.get(mid)!.name}</Link>
              ))}
            </div>
            {w.coach_notes && (
              <div className="mt-5 rounded-xl border-l-2 border-bleu bg-bleu/5 p-4">
                <p className="kicker mb-1 text-bleu-2">Notes du coach</p>
                <p className="whitespace-pre-line text-sm text-muted">{w.coach_notes}</p>
              </div>
            )}
          </section>

          <section className="rise rise-2">
            <SectionTitle>Classement</SectionTitle>
            {board.length ? <Leaderboard rows={board.map((r) => ({ ...r, label: fmt(r) }))} meId={me.id} defaultSex={me.sex} /> : <Empty>Sois le premier à entrer ton score.</Empty>}
          </section>
        </div>

        <div className="grid content-start gap-6">
          {w.score_type !== "none" || mine.length === 0 ? (
            <section className="rise rise-1 card p-5">
              <SectionTitle>Mon score</SectionTitle>
              <ScoreForm mode="workout" id={w.id} scoreType={w.score_type} rpr={w.reps_per_round} timeCap={w.time_cap_s} today={todayParis()} />
            </section>
          ) : null}
          {score != null && (
            <section className="rise rise-2 card flex items-center justify-between p-5">
              <div><p className="kicker">Note sur ce benchmark</p><p className="mt-1 text-sm text-muted">Meilleur score RX : <b className="text-fog">{fmtScore(bestRx!, w.score_type, { rpr: w.reps_per_round })}</b></p></div>
              <ScoreBadge score={score} />
            </section>
          )}
          {mine.length > 0 && (
            <section className="rise rise-3">
              <SectionTitle>Mes passages</SectionTitle>
              <ul className="card divide-y divide-line">
                {mine.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1">
                      <span className="block font-semibold tabular-nums">{fmt(r)} <span className="ml-1 text-xs font-bold uppercase text-dim">{r.division}</span></span>
                      <span className="text-xs text-dim">{fmtDate(r.performed_on, { day: "numeric", month: "long", year: "numeric" })}{r.notes ? ` · ${r.notes}` : ""}</span>
                    </span>
                    <DeleteResult id={r.id} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
