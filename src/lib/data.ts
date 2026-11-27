import "server-only";
import { cache } from "react";
import { db, must } from "./db";
import { anchorsFor, domainOfCategory, scoreFrom, summarize, type ScoredTest } from "./scoring";
import type { Athlete, Box, Movement, Result, Sex, Workout } from "./types";

export const getMovements = cache(async (): Promise<Movement[]> =>
  must(await db().from("movements").select("*").eq("active", true).order("sort")) as Movement[]);

export const getMovementMap = cache(async () => new Map((await getMovements()).map((m) => [m.id, m])));

export const getBoxes = cache(async (): Promise<Box[]> =>
  must(await db().from("boxes").select("id,name,city,is_affiliate").order("name")) as Box[]);

export const getLevelWorkouts = cache(async (): Promise<Workout[]> =>
  must(await db().from("workouts").select("*").eq("counts_in_level", true)) as Workout[]);

export async function getResults(athleteId: string): Promise<Result[]> {
  return must(
    await db().from("results").select("*").eq("athlete_id", athleteId).order("performed_on", { ascending: false }).order("created_at", { ascending: false }),
  ) as Result[];
}

const better = (a: number, b: number, dir: "higher" | "lower") => (dir === "higher" ? a > b : a < b);

/** Meilleure perf par mouvement / par séance (RX uniquement pour les séances, hors cap). */
export function bests(results: Result[], movements: Map<string, Movement>, workouts: Map<string, Workout>) {
  const mov = new Map<string, Result>();
  const wod = new Map<string, Result>();
  for (const r of results) {
    if (r.movement_id) {
      const m = movements.get(r.movement_id);
      if (!m) continue;
      const cur = mov.get(r.movement_id);
      if (!cur || better(Number(r.value), Number(cur.value), m.better)) mov.set(r.movement_id, r);
    } else if (r.workout_id) {
      const w = workouts.get(r.workout_id);
      if (!w || !(r.division === "rx" || r.division === "elite") || r.capped) continue;
      const cur = wod.get(r.workout_id);
      if (!cur || better(Number(r.value), Number(cur.value), w.better)) wod.set(r.workout_id, r);
    }
  }
  return { mov, wod };
}

export async function computeLevel(athlete: Pick<Athlete, "sex">, results: Result[]) {
  const [mmap, lw] = await Promise.all([getMovementMap(), getLevelWorkouts()]);
  const wmap = new Map(lw.map((w) => [w.id, w]));
  const { mov, wod } = bests(results, mmap, wmap);
  const tests: ScoredTest[] = [];
  for (const [id, r] of mov) {
    const m = mmap.get(id)!;
    const s = scoreFrom(Number(r.value), anchorsFor(m, athlete.sex), m.better);
    if (s == null) continue;
    tests.push({ kind: "movement", id, name: m.name, domain: domainOfCategory(m.category), value: Number(r.value), score: s, weight: Number(m.weight_in_level), date: r.performed_on });
  }
  for (const [id, r] of wod) {
    const w = wmap.get(id)!;
    const s = scoreFrom(Number(r.value), anchorsFor(w, athlete.sex), w.better);
    if (s == null) continue;
    tests.push({ kind: "workout", id, name: w.title, domain: "metcon", value: Number(r.value), score: s, weight: 1, date: r.performed_on });
  }
  return summarize(tests);
}

/** Évolution du niveau global : recalcul à chaque date où une perf a été ajoutée. */
export async function levelHistory(athlete: Pick<Athlete, "sex">, results: Result[]) {
  const dates = [...new Set(results.map((r) => r.performed_on))].sort();
  const out: { date: string; level: number }[] = [];
  for (const d of dates.slice(-40)) {
    const lv = await computeLevel(athlete, results.filter((r) => r.performed_on <= d));
    if (lv.global != null) out.push({ date: d, level: lv.global });
  }
  return out;
}

/** Percentile communauté Vikings sur un mouvement (même sexe). */
export async function communityRank(movementId: string, sex: Sex, dir: "higher" | "lower", value: number) {
  const rows = must(
    await db().from("results").select("athlete_id,value,athletes!inner(sex)").eq("movement_id", movementId).eq("athletes.sex", sex),
  ) as unknown as { athlete_id: string; value: number }[];
  const best = new Map<string, number>();
  for (const r of rows) {
    const v = Number(r.value), cur = best.get(r.athlete_id);
    if (cur == null || better(v, cur, dir)) best.set(r.athlete_id, v);
  }
  const all = [...best.values()];
  if (all.length < 2) return { n: all.length, percentile: null as number | null, rank: 1 };
  const beaten = all.filter((v) => better(value, v, dir)).length;
  const rank = all.filter((v) => better(v, value, dir)).length + 1;
  return { n: all.length, percentile: Math.round((beaten / (all.length - 1)) * 100), rank };
}

/** Lit toutes les lignes (PostgREST plafonne à 1000 par requête). */
export async function fetchAll<T>(table: string, select: string, apply?: (q: any) => any): Promise<T[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    let q = db().from(table).select(select).range(from, from + 999);
    if (apply) q = apply(q);
    const rows = must(await q) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

/** Niveau de chaque athlète (admin). */
export async function allLevels(athletes: Pick<Athlete, "id" | "sex">[]) {
  const results = await fetchAll<Result>("results", "*");
  const by = new Map<string, Result[]>();
  for (const r of results) (by.get(r.athlete_id) ?? by.set(r.athlete_id, []).get(r.athlete_id)!).push(r);
  const out = new Map<string, Awaited<ReturnType<typeof computeLevel>> & { count: number; last: string | null }>();
  for (const a of athletes) {
    const rs = by.get(a.id) ?? [];
    const lv = await computeLevel(a, rs);
    out.set(a.id, { ...lv, count: rs.length, last: rs.reduce<string | null>((m, r) => (!m || r.performed_on > m ? r.performed_on : m), null) });
  }
  return out;
}

export type LeaderRow = {
  athlete_id: string;
  name: string;
  box: string | null;
  sex: Sex;
  value: number;
  division: string;
  capped: boolean;
  performed_on: string;
};

export async function leaderboard(w: Workout): Promise<LeaderRow[]> {
  const rows = must(
    await db()
      .from("results")
      .select("athlete_id,value,division,capped,performed_on,athletes!inner(first_name,last_name,sex,boxes(name))")
      .eq("workout_id", w.id),
  ) as unknown as {
    athlete_id: string; value: number; division: string; capped: boolean; performed_on: string;
    athletes: { first_name: string; last_name: string; sex: Sex; boxes: { name: string } | null };
  }[];
  const divRank: Record<string, number> = { elite: 0, rx: 1, inter: 2, fitness: 3 };
  // garder la meilleure perf de chaque athlète
  const best = new Map<string, (typeof rows)[number]>();
  const cmp = (a: (typeof rows)[number], b: (typeof rows)[number]) => {
    if (divRank[a.division] !== divRank[b.division]) return divRank[a.division] - divRank[b.division];
    if (a.capped !== b.capped) return a.capped ? 1 : -1;
    const dir = a.capped ? "higher" : w.better; // capé : plus de reps = mieux
    return dir === "higher" ? Number(b.value) - Number(a.value) : Number(a.value) - Number(b.value);
  };
  for (const r of rows) {
    const cur = best.get(r.athlete_id);
    if (!cur || cmp(r, cur) < 0) best.set(r.athlete_id, r);
  }
  return [...best.values()].sort(cmp).map((r) => ({
    athlete_id: r.athlete_id,
    name: `${r.athletes.first_name} ${r.athletes.last_name.charAt(0)}.`,
    box: r.athletes.boxes?.name ?? null,
    sex: r.athletes.sex,
    value: Number(r.value),
    division: r.division,
    capped: r.capped,
    performed_on: r.performed_on,
  }));
}

/** Meilleure charge de l'athlète par mouvement (sert à convertir les % en kg). */
export async function getMaxes(athleteId: string, movementIds: string[]): Promise<Record<string, number>> {
  const ids = [...new Set(movementIds)].filter(Boolean);
  if (!ids.length) return {};
  const [{ data: mvs }, { data: res }] = await Promise.all([
    db().from("movements").select("id,metric").in("id", ids),
    db().from("results").select("movement_id,value").eq("athlete_id", athleteId).in("movement_id", ids),
  ]);
  const load = new Set((mvs ?? []).filter((m) => m.metric === "load").map((m) => m.id as string));
  const out: Record<string, number> = {};
  for (const r of (res ?? []) as { movement_id: string; value: number }[]) {
    if (!load.has(r.movement_id)) continue;
    const v = Number(r.value);
    if (!out[r.movement_id] || v > out[r.movement_id]) out[r.movement_id] = v;
  }
  return out;
}

export type MovementVolume = {
  total: { reps: number; cal: number; m: number; s: number; tonnage: number; sessions: number; topKg: number | null };
  last30: { reps: number; cal: number; m: number; s: number; sessions: number };
  recent: {
    resultId: string; workoutId: string | null; date: string; title: string; format: string | null; variant: string | null; block: string | null;
    reps: number; cal: number; m: number; s: number; kg: number | null; asWritten: boolean; division: string;
    value: number; capped: boolean; scoreType: string | null; rpr: number | null;
  }[];
};

/** Volume cumulé d'un mouvement pour un athlète (à partir du volume calculé à chaque score). */
export async function movementVolume(athleteId: string, movementId: string): Promise<MovementVolume> {
  type Row = {
    id: string; performed_on: string; workout_id: string | null; value: number; division: string; capped: boolean; as_written: boolean;
    volume: { mv: string; reps: number; cal: number; m: number; s: number; kg: number | null; tonnage: number }[] | null;
    workouts: { title: string; format: string | null; variant: string | null; block: string | null; score_type: string; reps_per_round: number | null } | null;
  };
  const rows = await fetchAll<Row>("results", "id,performed_on,workout_id,value,division,capped,as_written,volume,workouts(title,format,variant,block,score_type,reps_per_round)",
    (q) => q.eq("athlete_id", athleteId).filter("volume", "cs", JSON.stringify([{ mv: movementId }])).order("performed_on", { ascending: false }).order("created_at", { ascending: false }));
  const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const out: MovementVolume = { total: { reps: 0, cal: 0, m: 0, s: 0, tonnage: 0, sessions: 0, topKg: null }, last30: { reps: 0, cal: 0, m: 0, s: 0, sessions: 0 }, recent: [] };
  for (const r of rows) {
    const v = r.volume?.find((x) => x.mv === movementId);
    if (!v) continue;
    const t = out.total;
    t.reps += Number(v.reps) || 0; t.cal += Number(v.cal) || 0; t.m += Number(v.m) || 0; t.s += Number(v.s) || 0; t.tonnage += Number(v.tonnage) || 0; t.sessions++;
    if (v.kg != null && (t.topKg == null || Number(v.kg) > t.topKg)) t.topKg = Number(v.kg);
    if (r.performed_on >= since) {
      const l = out.last30;
      l.reps += Number(v.reps) || 0; l.cal += Number(v.cal) || 0; l.m += Number(v.m) || 0; l.s += Number(v.s) || 0; l.sessions++;
    }
    if (out.recent.length < 12) out.recent.push({
      resultId: r.id, workoutId: r.workout_id, date: r.performed_on, title: r.workouts?.title ?? "Séance", format: r.workouts?.format ?? null, variant: r.workouts?.variant ?? null, block: r.workouts?.block ?? null,
      reps: Number(v.reps) || 0, cal: Number(v.cal) || 0, m: Number(v.m) || 0, s: Number(v.s) || 0, kg: v.kg != null ? Number(v.kg) : null,
      asWritten: r.as_written, division: r.division, value: Number(r.value), capped: r.capped, scoreType: r.workouts?.score_type ?? null, rpr: r.workouts?.reps_per_round ?? null,
    });
  }
  return out;
}
