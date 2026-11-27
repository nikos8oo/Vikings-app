import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { db, must } from "@/lib/db";
import { MODALITY_LABEL, MODALITY_ORDER, PATTERN_LABEL, PATTERNS_OF, todayParis } from "@/lib/format";
import { getMovementMap } from "@/lib/data";
import { blockStyle, colorHex } from "@/lib/colors";
import { parseTrack, TRACK_KEYS, trackLabel } from "@/lib/tracks";
import { formatLabel } from "@/lib/prescription";
import type { Workout } from "@/lib/types";
import { monthGrid } from "@/components/TrainingCalendar";
import { DragBlock, DropDay, TrackSwitch } from "./PlannerControls";
import { BlockCard } from "./BlockCard";

export const metadata: Metadata = { title: "Planning" };

const WD = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const addDays = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 86400_000).toISOString().slice(0, 10);
const weekStart = (d: string) => addDays(d, -((new Date(d + "T12:00:00Z").getUTCDay() + 6) % 7));
const label = (d: string) => { const [, m, day] = d.split("-").map(Number); return `${day} ${MONTHS[m - 1]}`; };
const nextBlock = (list: Workout[]) => {
  const used = new Set(list.map((w) => w.block).filter(Boolean));
  return ["A", "B", "C", "D"].find((b) => !used.has(b)) ?? "";
};

type SP = { p?: string; v?: string; d?: string };

export default async function Planning({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const jar = await cookies();
  const saved = decodeURIComponent(jar.get("va_admin_track")?.value ?? "");
  const track = TRACK_KEYS.includes(sp.p ?? "") ? sp.p! : TRACK_KEYS.includes(saved) ? saved : "competition";
  const { source, subtrack } = parseTrack(track);
  const view = sp.v === "month" ? "month" : "week";
  const today = todayParis();
  const anchor = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : today;

  const days = view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(weekStart(anchor), i)) : monthGrid(anchor).grid.map((g) => g.date);
  const from = days[0], to = days[days.length - 1];
  const [workouts, counts, mmap] = await Promise.all([
    (subtrack ? db().from("workouts").select("*").eq("source", source).eq("subtrack", subtrack) : db().from("workouts").select("*").eq("source", source)).gte("workout_date", from).lte("workout_date", to)
      .order("block", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true }).then((r) => must(r) as Workout[]),
    db().from("results").select("workout_id").not("workout_id", "is", null).gte("performed_on", addDays(from, -1)).then((r) => (r.data ?? []) as { workout_id: string }[]),
    getMovementMap(),
  ]);
  const scores = new Map<string, number>();
  for (const c of counts) scores.set(c.workout_id, (scores.get(c.workout_id) ?? 0) + 1);
  const byDay = new Map<string, Workout[]>();
  for (const w of workouts) byDay.set(w.workout_date, [...(byDay.get(w.workout_date) ?? []), w]);

  const step = view === "week" ? 7 : 0;
  const prev = view === "week" ? addDays(anchor, -step) : (() => { const [y, m] = anchor.split("-").map(Number); return m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`; })();
  const next = view === "week" ? addDays(anchor, step) : (() => { const [y, m] = anchor.split("-").map(Number); return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`; })();
  const url = (o: Partial<SP>) => { const q = new URLSearchParams({ p: track, v: view, d: anchor, ...o } as Record<string, string>); return `/admin/seances?${q}`; };
  const addUrl = (d: string) => `/admin/seances/nouvelle?track=${encodeURIComponent(track)}&date=${d}&block=${nextBlock(byDay.get(d) ?? [])}`;
  const [ay, am] = anchor.split("-").map(Number);
  const title = view === "week" ? `Semaine du ${label(from)} au ${label(to)}` : `${["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"][am - 1]} ${ay}`;
  const total = workouts.length;

  // Répartition Gym / Haltéro / Mono : nombre de mouvements programmés sur la période
  const mix = new Map<string, { n: number; mvs: Map<string, number>; pat: Map<string, number> }>(MODALITY_ORDER.map((k) => [k, { n: 0, mvs: new Map(), pat: new Map() }]));
  for (const w of workouts) for (const it of w.items ?? []) {
    const m = mmap.get(it.mv); const g = mix.get(m?.modality ?? "");
    if (!m || !g) continue;
    g.n++; g.mvs.set(m.name, (g.mvs.get(m.name) ?? 0) + 1);
    if (m.pattern) g.pat.set(m.pattern, (g.pat.get(m.pattern) ?? 0) + 1);
  }
  const mixTotal = [...mix.values()].reduce((a, g) => a + g.n, 0);
  const MIX_COLOR: Record<string, string> = { gym: "var(--color-bleu)", halt: "var(--color-lime)", mono: "#7d8794" };

  return (
    <div className="w-full">
      {/* En-tête */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-muted">{trackLabel(track, true)}</p>
          <h1 className={`mt-1 text-[28px] font-bold tracking-tight text-fog sm:text-[32px] ${view === "month" ? "capitalize" : ""}`}>{title}</h1>
          <p className="mt-0.5 text-[13px] text-dim">{total} bloc{total > 1 ? "s" : ""} programmé{total > 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/seances/liste" className="text-[13px] font-medium text-muted hover:text-fog">Liste</Link>
          <Link href={addUrl(anchor >= from && anchor <= to ? anchor : from)} className="btn-lime py-2.5">+ Bloc</Link>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <TrackSwitch track={track} view={view} date={anchor} />
        <div className="flex items-center gap-2">
          <div className="seg">
            <Link href={url({ v: "week" })} aria-pressed={view === "week"} className="seg-btn">Semaine</Link>
            <Link href={url({ v: "month" })} aria-pressed={view === "month"} className="seg-btn">Mois</Link>
          </div>
          <Link href={url({ d: prev })} className="round-btn" aria-label="Précédent">‹</Link>
          <Link href={url({ d: today })} className="rounded-full bg-panel-3 px-3 py-1.5 text-[13px] font-semibold text-fog">Aujourd&apos;hui</Link>
          <Link href={url({ d: next })} className="round-btn" aria-label="Suivant">›</Link>
        </div>
      </div>

      {view === "week" ? (
        /* ---------- Semaine : 7 colonnes plein écran ---------- */
        <div className="no-scrollbar mt-4 overflow-x-auto pb-2">
          <div className="grid min-w-[980px] grid-cols-7 gap-1.5">
            {days.map((d, i) => {
              const list = byDay.get(d) ?? [];
              const isToday = d === today;
              return (
                <DropDay key={d} date={d} className={`flex min-h-[60vh] flex-col rounded-[14px] border p-1 ${isToday ? "border-lime/40 bg-lime/[0.03]" : "border-line bg-panel/60"}`}>
                  <div className="flex items-baseline justify-between px-1.5 pb-2 pt-1">
                    <span className={`text-[12px] font-semibold uppercase tracking-wider ${isToday ? "text-lime" : "text-muted"}`}>{WD[i]}</span>
                    <span className={`text-[20px] font-bold tabular-nums ${isToday ? "text-lime" : "text-fog"}`}>{Number(d.slice(8))}</span>
                  </div>
                  <div className="grid gap-1">
                    {list.map((w) => <DragBlock key={w.id} id={w.id}><BlockCard w={w} scores={scores.get(w.id) ?? 0} /></DragBlock>)}
                  </div>
                  <Link href={addUrl(d)} className="mt-2 flex items-center justify-center rounded-xl border border-dashed border-line-2 py-2.5 text-[13px] font-semibold text-bleu-2 transition hover:border-bleu hover:bg-bleu/5">
                    + Bloc{list.length ? ` ${nextBlock(list)}` : ""}
                  </Link>
                </DropDay>
              );
            })}
          </div>
        </div>
      ) : (
        /* ---------- Mois : vue globale ---------- */
        <div className="no-scrollbar mt-5 overflow-x-auto pb-2">
          <div className="min-w-[860px]">
            <div className="grid grid-cols-7 gap-2 px-1 pb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">{WD.map((d) => <span key={d}>{d}</span>)}</div>
            <div className="grid grid-cols-7 gap-2">
              {days.map((d) => {
                const list = byDay.get(d) ?? [];
                const inMonth = Number(d.slice(5, 7)) === am;
                const isToday = d === today;
                return (
                  <DropDay key={d} date={d} className={`group flex min-h-[132px] flex-col rounded-[14px] border p-2 ${isToday ? "border-lime/40" : "border-line"} ${inMonth ? "bg-panel/60" : "bg-transparent opacity-50"}`}>
                    <div className="flex items-center justify-between px-1">
                      <Link href={url({ v: "week", d })} className={`text-[14px] font-bold tabular-nums ${isToday ? "text-lime" : "text-fog"} hover:underline`}>{Number(d.slice(8))}</Link>
                      <Link href={addUrl(d)} className="rounded-full px-1.5 text-[16px] leading-none text-dim opacity-60 transition hover:text-bleu-2 group-hover:opacity-100" aria-label="Ajouter un bloc">+</Link>
                    </div>
                    <div className="mt-1.5 grid gap-1">
                      {list.map((w) => (
                        <DragBlock key={w.id} id={w.id}><Link href={`/admin/seances/${w.id}`} className={`block truncate rounded-md px-2 py-1 text-[12px] ${w.published ? "bg-bleu/15 text-fog" : "border border-dashed border-line-2 text-muted"} hover:bg-bleu/25`}
                          style={blockStyle(w.color, "chip")}>
                          {w.block ? <b className="text-lime">{w.block} </b> : null}{w.format ? formatLabel(w) : w.title}
                        </Link></DragBlock>
                      ))}
                    </div>
                  </DropDay>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Répartition des mouvements */}
      <section className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-muted">
        {MODALITY_ORDER.map((k) => {
          const g = mix.get(k)!;
          const top = [...g.mvs.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([n, c]) => `${n}${c > 1 ? ` ×${c}` : ""}`).join(", ");
          return (
            <span key={k} className="flex items-center gap-1.5" title={top || undefined}>
              <span className="h-2 w-2 rounded-full" style={{ background: MIX_COLOR[k] }} />
              {MODALITY_LABEL[k]} <b className="font-semibold tabular-nums text-fog">× {g.n}</b>
              {mixTotal > 0 && <span className="text-dim">{Math.round((g.n / mixTotal) * 100)} %</span>}
              {g.n > 0 && PATTERNS_OF[k].length > 0 && (
                <span className="text-dim">({PATTERNS_OF[k].map((pt) => `${PATTERN_LABEL[pt]} ${g.pat.get(pt) ?? 0}`).join(" · ")})</span>
              )}
            </span>
          );
        })}
        {mixTotal > 0 && (
          <span className="flex h-1.5 w-36 overflow-hidden rounded-full bg-panel-3">
            {MODALITY_ORDER.map((k) => <span key={k} style={{ width: `${(mix.get(k)!.n / mixTotal) * 100}%`, background: MIX_COLOR[k] }} />)}
          </span>
        )}
        <span className="text-dim">· {mixTotal} mouvement{mixTotal > 1 ? "s" : ""} {view === "week" ? "cette semaine" : "ce mois"}</span>
      </section>
    </div>
  );
}
