import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { computeLevel, getBoxes, getMovementMap, getResults } from "@/lib/data";
import { fmtDate, fmtMetric, fmtScore } from "@/lib/format";
import { tierOf } from "@/lib/scoring";
import { ATHLETE_COLS, requireStaff } from "@/lib/session";
import type { Athlete, Workout } from "@/lib/types";
import { DomainRadar, LevelRing } from "@/components/viz";
import { DeleteResult } from "@/components/DeleteButton";
import { ScoreBadge, SectionTitle } from "@/components/ui";
import { RoleSelect } from "./RoleSelect";

export const metadata: Metadata = { title: "Athlète" };

export default async function AthleteAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireStaff();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await db().from("athletes").select(ATHLETE_COLS).eq("id", id).maybeSingle();
  if (!data) notFound();
  const a = data as Athlete;
  const [results, mmap, boxes] = await Promise.all([getResults(a.id), getMovementMap(), getBoxes()]);
  const wids = [...new Set(results.map((r) => r.workout_id).filter(Boolean))] as string[];
  const { data: ws } = wids.length ? await db().from("workouts").select("*").in("id", wids) : { data: [] };
  const wmap = new Map(((ws ?? []) as Workout[]).map((w) => [w.id, w]));
  const lv = await computeLevel(a, results);
  const scoreOf = new Map(lv.tests.map((t) => [t.id, t.score]));
  const box = boxes.find((b) => b.id === a.box_id);
  const age = a.birth_year ? new Date().getFullYear() - a.birth_year : null;

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/athletes" className="text-xs font-semibold text-muted">← Athlètes</Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="display text-4xl">{a.first_name} {a.last_name}</h1>
            <p className="mt-1 text-sm text-muted">
              {a.sex === "F" ? "Femme" : "Homme"}{age ? ` · ${age} ans` : ""}{a.bodyweight_kg ? ` · ${a.bodyweight_kg} kg` : ""} · {box?.name ?? "sans box"} · {a.email}
            </p>
          </div>
          {me.role === "admin" && me.id !== a.id && <RoleSelect id={a.id} role={a.role} />}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[auto_1fr_1fr]">
        <div className="card grid place-items-center p-5"><LevelRing value={lv.global} size={180} tier={lv.global != null ? tierOf(lv.global).label : "À évaluer"} provisional={lv.provisional} /></div>
        <div className="card p-4"><DomainRadar data={lv.domains} /></div>
        <div className="card p-5">
          <SectionTitle>Forces / faiblesses</SectionTitle>
          <ul className="grid gap-1.5 text-sm">
            {lv.strengths.map((t) => <li key={t.id} className="flex justify-between"><span>💪 {t.name}</span><ScoreBadge score={t.score} size="sm" /></li>)}
            {lv.weaknesses.map((t) => <li key={t.id} className="flex justify-between"><span className="text-muted">↗ {t.name}</span><ScoreBadge score={t.score} size="sm" /></li>)}
          </ul>
        </div>
      </div>

      <section>
        <SectionTitle>Toutes les perfs · {results.length}</SectionTitle>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <tbody className="divide-y divide-line">
              {results.map((r) => {
                const m = r.movement_id ? mmap.get(r.movement_id) : null;
                const w = r.workout_id ? wmap.get(r.workout_id) : null;
                return (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted">{fmtDate(r.performed_on, { day: "numeric", month: "short", year: "2-digit" })}</td>
                    <td className="px-3 font-medium">{m?.name ?? w?.title}</td>
                    <td className="px-3 font-semibold tabular-nums">
                      {m ? fmtMetric(Number(r.value), m.metric) : w ? fmtScore(Number(r.value), w.score_type, { rpr: w.reps_per_round, capped: r.capped }) : r.value}
                      {w && <span className="ml-2 text-[10px] uppercase text-dim">{r.division}</span>}
                    </td>
                    <td className="px-3"><ScoreBadge score={scoreOf.get(r.movement_id ?? r.workout_id ?? "") ?? null} size="sm" /></td>
                    <td className="px-3 text-xs text-dim">{r.notes}</td>
                    <td className="px-2"><DeleteResult id={r.id} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!results.length && <p className="p-6 text-center text-sm text-muted">Aucune perf.</p>}
        </div>
      </section>
    </div>
  );
}
