import Link from "next/link";
import { db, must } from "@/lib/db";
import { todayParis } from "@/lib/format";
import { trackKey, trackLabel } from "@/lib/tracks";
import type { Workout } from "@/lib/types";
import { BlockCard } from "./seances/BlockCard";

const WD = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const addDays = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 86400_000).toISOString().slice(0, 10);
const weekStart = (d: string) => addDays(d, -((new Date(d + "T12:00:00Z").getUTCDay() + 6) % 7));
const label = (d: string) => { const [, m, day] = d.split("-").map(Number); return `${day} ${MONTHS[m - 1]}`; };

/** Semaine en un coup d'œil sur le tableau de bord : Vikings Compétition ou Vikings Affiliates (toutes pistes). */
export async function WeekBoard({ program, anchor }: { program: "competition" | "affiliates"; anchor?: string }) {
  const today = todayParis();
  const start = weekStart(anchor && /^\d{4}-\d{2}-\d{2}$/.test(anchor) ? anchor : today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [workouts, counts] = await Promise.all([
    db().from("workouts").select("*").eq("source", program).gte("workout_date", days[0]).lte("workout_date", days[6])
      .order("subtrack", { ascending: true, nullsFirst: true }).order("block", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true })
      .then((r) => must(r) as Workout[]),
    db().from("results").select("workout_id").not("workout_id", "is", null).gte("performed_on", days[0]).then((r) => (r.data ?? []) as { workout_id: string }[]),
  ]);
  const scores = new Map<string, number>();
  for (const c of counts) scores.set(c.workout_id, (scores.get(c.workout_id) ?? 0) + 1);
  const url = (o: { wp?: string; wd?: string }) => `/admin?${new URLSearchParams({ wp: program, wd: start, ...o })}`;
  const planning = (d: string) => `/admin/seances?p=${encodeURIComponent(program === "competition" ? "competition" : "aff:crossfit")}&d=${d}`;

  return (
    <section className="card relative left-1/2 w-[calc(100vw-1rem)] max-w-[1900px] -translate-x-1/2 p-3 sm:p-4 md:w-[calc(100vw-1.5rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker">Programmation de la semaine</p>
          <p className="mt-1 text-[17px] font-semibold text-fog">Du {label(days[0])} au {label(days[6])} · <span className="text-muted">{workouts.length} bloc{workouts.length > 1 ? "s" : ""}</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="seg">
            <Link href={url({ wp: "competition" })} aria-pressed={program === "competition"} className="seg-btn whitespace-nowrap px-3">V. Compétition</Link>
            <Link href={url({ wp: "affiliates" })} aria-pressed={program === "affiliates"} className="seg-btn whitespace-nowrap px-3">V. Affiliates</Link>
          </div>
          <Link href={url({ wd: addDays(start, -7) })} className="round-btn" aria-label="Semaine précédente">‹</Link>
          <Link href={url({ wd: today })} className="rounded-full bg-panel-3 px-3 py-1.5 text-[13px] font-semibold text-fog">Cette semaine</Link>
          <Link href={url({ wd: addDays(start, 7) })} className="round-btn" aria-label="Semaine suivante">›</Link>
        </div>
      </div>

      <div className="no-scrollbar mt-3 overflow-x-auto pb-1">
        <div className="grid min-w-[900px] grid-cols-7 gap-1.5">
          {days.map((d, i) => {
            const list = workouts.filter((w) => w.workout_date === d);
            const isToday = d === today;
            return (
              <div key={d} className={`flex min-h-[260px] flex-col rounded-[12px] border p-1 ${isToday ? "border-lime/40 bg-lime/[0.03]" : "border-line bg-panel/40"}`}>
                <div className="flex items-baseline justify-between px-1.5 pb-1.5 pt-0.5">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${isToday ? "text-lime" : "text-muted"}`}>{WD[i]}</span>
                  <span className={`text-[17px] font-bold tabular-nums ${isToday ? "text-lime" : "text-fog"}`}>{Number(d.slice(8))}</span>
                </div>
                <div className="grid gap-1">
                  {list.map((w) => <BlockCard key={w.id} w={w} scores={scores.get(w.id) ?? 0} compact tag={program === "affiliates" ? trackLabel(trackKey(w)) : undefined} />)}
                </div>
                <Link href={planning(d)} className="mt-auto pt-2 text-center text-[12px] font-medium text-dim hover:text-bleu-2">{list.length ? "Ouvrir" : "+ Programmer"}</Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
