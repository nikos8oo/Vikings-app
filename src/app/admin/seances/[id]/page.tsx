import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getMovements, leaderboard } from "@/lib/data";
import { fmtScore, todayParis } from "@/lib/format";
import type { Workout } from "@/lib/types";
import { WorkoutForm } from "../WorkoutForm";
import { WorkoutBuilder } from "../editor/WorkoutBuilder";
import { trackKey } from "@/lib/tracks";
import { DeleteWorkoutButton } from "./DeleteWorkoutButton";

export const metadata: Metadata = { title: "Séance" };

export default async function EditSeance({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { id } = await params;
  const { ok } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await db().from("workouts").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const w = data as Workout;
  const [movements, board] = await Promise.all([getMovements(), leaderboard(w)]);
  const mvs = movements.map((m) => ({ id: m.id, name: m.name, category: m.category, metric: m.metric, modality: m.modality }));
  const back = `/admin/seances?p=${encodeURIComponent(trackKey(w))}&d=${w.workout_date}`;
  if (w.format) return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
        <Link href={back} className="text-[13px] font-medium text-bleu-2">‹ Planning</Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="text-[32px] font-bold tracking-tight text-fog">{w.title}</h1>
          <Link href={`/prog/${w.id}`} className="text-[13px] font-medium text-bleu-2">Vue athlète</Link>
        </div>
        {ok && <p className="mt-3 rounded-xl bg-lime/10 px-4 py-2.5 text-sm text-lime">Séance créée. Les athlètes peuvent entrer leur score.</p>}
      </div>
      <WorkoutBuilder w={w} movements={mvs} today={todayParis()} returnTo={back} />
      <ScoresList board={board} w={w} />
      <DeleteWorkoutButton id={w.id} />
    </div>
  );
  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="grid content-start gap-5">
        <div>
          <Link href="/admin/seances" className="text-xs font-semibold text-muted">← Séances</Link>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h1 className="display text-4xl">{w.title}</h1>
            <Link href={`/prog/${w.id}`} className="text-xs font-semibold text-lime">Vue athlète →</Link>
          </div>
          {ok && <p className="mt-3 rounded-xl bg-lime/10 px-4 py-2.5 text-sm text-lime">Séance créée. Les athlètes peuvent entrer leur score.</p>}
        </div>
        <div className="card p-5 md:p-6"><WorkoutForm w={w} movements={mvs} today={todayParis()} /></div>
        <DeleteWorkoutButton id={w.id} />
      </div>
      <ScoresList board={board} w={w} />
    </div>
  );
}

function ScoresList({ board, w }: { board: Awaited<ReturnType<typeof leaderboard>>; w: Workout }) {
  return (
    <section className="grid content-start gap-3">
        <h2 className="display text-2xl">Scores · {board.length}</h2>
        <ol className="card divide-y divide-line">
          {board.map((r, i) => (
            <li key={r.athlete_id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-5 text-dim">{i + 1}</span>
              <Link href={`/admin/athletes/${r.athlete_id}`} className="flex-1 font-medium hover:text-lime">{r.name} <span className="text-dim">· {r.sex}</span></Link>
              <span className="font-semibold tabular-nums">{fmtScore(r.value, w.score_type, { rpr: w.reps_per_round, capped: r.capped })}</span>
              <span className="w-16 text-right text-[10px] font-bold uppercase text-dim">{r.division}</span>
            </li>
          ))}
          {!board.length && <li className="p-5 text-center text-sm text-muted">Aucun score.</li>}
        </ol>
      </section>
  );
}
