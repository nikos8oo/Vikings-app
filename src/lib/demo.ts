/**
 * Démo : cycle de rentrée de 4 semaines sur toutes les pistes (2 à 3 blocs par jour),
 * avec progression hebdomadaire. Les blocs passent par sanitizeRx / describe comme ceux de l'éditeur.
 */
import { amounts, computeVolume, FORMATS, heaviest, repsPerRound, sanitizeRx, type Item, type Rx, type SetRx } from "./prescription";
import type { Anchors, Movement, Sex } from "./types";

export type DemoBlock = { track: string; dayOffset: number; block: string; color: string; title: string; rx: Rx; notes?: string };

const WD = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/* ---------- petits constructeurs ---------- */
const R = (mv: string, reps: number, kg_m?: number, kg_f?: number, extra: Partial<Item> = {}): Item => ({ mv, reps, kg_m: kg_m ?? null, kg_f: kg_f ?? null, ...extra });
const CAL = (mv: string, cal: number, cal_f?: number): Item => ({ mv, cal, cal_f: cal_f ?? null });
const M = (mv: string, m: number, kg_m?: number, kg_f?: number): Item => ({ mv, dist_m: m, kg_m: kg_m ?? null, kg_f: kg_f ?? null });
const T = (mv: string, s: number): Item => ({ mv, time_s: s });
const S = (mv: string, sets: [number, number][], note?: string): Item => ({ mv, sets: sets.map(([reps, pct]): SetRx => ({ reps, pct })), note: note ?? null });
const SK = (mv: string, sets: [number, number, number][], note?: string): Item => ({ mv, sets: sets.map(([reps, m, f]): SetRx => ({ reps, kg_m: m, kg_f: f })), note: note ?? null });

const sets = (items: Item[]): Rx => ({ format: "sets", variant: "sets", items });
const amrap = (min: number, items: Item[]): Rx => ({ format: "amrap", variant: "amrap", duration_s: min * 60, items });
const rft = (rounds: number, items: Item[], cap: number): Rx => ({ format: "rft", variant: "rft", rounds, time_cap_s: cap * 60, items });
const tft = (scheme: number[], items: Item[], cap: number): Rx => ({ format: "for_time", variant: "tft", rep_scheme: scheme, time_cap_s: cap * 60, items });
const chipper = (items: Item[], cap: number): Rx => ({ format: "for_time", variant: "for_time", time_cap_s: cap * 60, items });
const emom = (n: number, every: number, items: Item[], alt = false): Rx => ({ format: "emom", variant: alt ? "emom_alt" : "emom_all", rounds: n, interval_s: every, emom_mode: alt ? "alternate" : "all", items });
const quality = (rounds: number, items: Item[]): Rx => ({ format: "quality", variant: "quality", rounds, items });
const intervals = (rounds: number, rest: number, items: Item[]): Rx => ({ format: "intervals", variant: "each_round_time", rounds, interval_s: rest, items });
const tabata = (items: Item[]): Rx => ({ format: "tabata", variant: "tabata", rounds: 8, interval_s: 20, items });
const max = (mv: string, reps: number): Rx => ({ format: "max", variant: "max", items: [{ mv, sets: [{ reps }] }] });
const buyin = (min: number, buy: Item[], items: Item[]): Rx => ({ format: "amrap", variant: "amrap_buyin", duration_s: min * 60, items: [...buy.map((b) => ({ ...b, phase: "buy_in" as const })), ...items] });

/** Schéma de force sur 4 semaines : volume puis intensité. */
const wave = (w: number): [number, number][] => [
  [[5, 65], [5, 70], [5, 72.5], [5, 72.5], [5, 72.5]],
  [[4, 70], [4, 75], [4, 77.5], [4, 77.5], [4, 77.5]],
  [[3, 75], [3, 80], [3, 82.5], [3, 82.5], [3, 82.5]],
  [[2, 80], [2, 85], [2, 87.5], [1, 90], [1, 90]],
][w] as [number, number][];
const oly = (w: number): [number, number][] => [
  [[3, 65], [3, 65], [2, 70], [2, 70], [2, 70]],
  [[2, 70], [2, 72.5], [2, 75], [2, 75], [2, 75]],
  [[2, 75], [2, 77.5], [1, 80], [1, 82.5], [1, 82.5]],
  [[1, 80], [1, 85], [1, 87.5], [1, 87.5], [1, 90]],
][w] as [number, number][];

type Gen = (w: number, d: number) => { rx: Rx; color: string; notes?: string };

/* ---------- banques par piste ---------- */
const COMP_A: Gen[] = [
  (w) => ({ rx: sets([S("back-squat", wave(w))]), color: "bleu", notes: "Descente contrôlée, remontée explosive." }),
  (w) => ({ rx: sets([S("snatch", oly(w))]), color: "ciel" }),
  (w) => ({ rx: sets([S("deadlift", wave(w))]), color: "bleu" }),
  (w) => ({ rx: sets([S("clean-and-jerk", oly(w))]), color: "ciel" }),
  (w) => ({ rx: sets([S("front-squat", wave(w))]), color: "bleu" }),
  (w) => (w === 3 ? { rx: max("clean", 1), color: "ciel", notes: "Test de fin de cycle." } : { rx: sets([S("power-clean", oly(w)), S("push-jerk", oly(w))]), color: "ciel" }),
  (w) => ({ rx: sets([S("overhead-squat", wave(w).slice(0, 4))]), color: "bleu" }),
];
const COMP_B: Gen[] = [
  () => ({ rx: tft([21, 15, 9], [R("thruster", 0, 43, 30), R("chest-to-bar", 0)], 10), color: "rouge" }),
  () => ({ rx: amrap(14, [R("bar-muscle-up", 5), R("power-snatch", 10, 50, 35), CAL("echo-bike", 15, 12)]), color: "rouge" }),
  () => ({ rx: rft(5, [M("run", 400), R("db-snatch", 20, 22.5, 15), R("toes-to-bar", 15)], 22), color: "rouge" }),
  () => ({ rx: chipper([CAL("row", 50, 40), R("wall-ball", 40, 9, 6), R("box-jump-over", 30), R("kipping-hspu", 20), R("ring-muscle-up", 10)], 18), color: "rouge" }),
  () => ({ rx: emom(16, 60, [CAL("bike-erg", 18, 14), R("burpee", 12), R("clean-and-jerk", 3, 80, 55), R("toes-to-bar", 15)], true), color: "ambre" }),
  () => ({ rx: amrap(20, [R("pistol", 10), R("kipping-pull-up", 15), R("deadlift", 10, 100, 70), M("run", 200)]), color: "rouge" }),
  () => ({ rx: tft([15, 12, 9, 6, 3], [R("power-clean", 0, 70, 47.5), R("bar-facing-burpee", 0)], 12), color: "rouge" }),
];
const COMP_C: Gen[] = [
  () => ({ rx: emom(10, 60, [R("ring-muscle-up", 3), R("strict-hspu", 5)], true), color: "violet" }),
  () => ({ rx: quality(4, [T("handstand-hold", 45), R("ghd-sit-up", 15), R("strict-pull-up", 8)]), color: "vert" }),
  () => ({ rx: emom(12, 90, [M("handstand-walk", 15), R("legless-rope-climb", 1)]), color: "violet" }),
];

const CF_A: Gen[] = [
  (w) => ({ rx: sets([S("back-squat", wave(w))]), color: "bleu" }),
  (w) => ({ rx: sets([S("strict-press", wave(w).slice(0, 4))]), color: "bleu" }),
  (w) => ({ rx: sets([S("power-clean", oly(w))]), color: "ciel" }),
  (w) => ({ rx: sets([S("deadlift", wave(w).slice(0, 4))]), color: "bleu" }),
  (w) => ({ rx: sets([S("push-press", wave(w).slice(0, 4))]), color: "bleu" }),
  () => ({ rx: emom(10, 60, [R("double-under", 40), R("kipping-pull-up", 8)], true), color: "violet" }),
  () => ({ rx: quality(3, [M("farmer-carry", 40, 32, 24), R("hollow-rock", 20), R("ring-row", 12)]), color: "vert" }),
];
const CF_B: Gen[] = [
  () => ({ rx: amrap(16, [R("double-under", 32), R("db-thruster", 16, 22.5, 15)]), color: "rouge" }),
  () => ({ rx: rft(3, [CAL("row", 15, 12), M("farmer-carry", 50, 32, 24), R("toes-to-bar", 12), R("wall-ball", 20, 9, 6)], 18), color: "rouge" }),
  () => ({ rx: tft([21, 15, 9], [R("kb-swing", 0, 24, 16), R("burpee", 0)], 12), color: "rouge" }),
  () => ({ rx: emom(12, 90, [R("toes-to-bar", 12), R("power-clean", 6, 60, 40)]), color: "ambre" }),
  () => ({ rx: amrap(12, [R("box-jump", 10, undefined, undefined, { height_cm: 60 }), R("push-up", 15), R("air-squat", 20)]), color: "rouge" }),
  () => ({ rx: buyin(12, [CAL("echo-bike", 30, 24)], [R("devil-press", 8, 22.5, 15), R("walking-lunge", 16)]), color: "rouge" }),
  () => ({ rx: chipper([M("run", 800), R("wall-ball", 50, 9, 6), R("kipping-pull-up", 30), M("run", 800)], 20), color: "rouge" }),
];
const CF_C: Gen[] = [
  () => ({ rx: quality(3, [R("ghd-sit-up", 12), T("plank", 45), R("hip-thrust", 12, 60, 40)]), color: "vert" }),
  () => ({ rx: tabata([R("air-squat", 0), R("hollow-rock", 0)]), color: "ambre" }),
];

const HYROX_A: Gen[] = [
  () => ({ rx: intervals(6, 90, [M("run", 1000)]), color: "ambre", notes: "Allure course Hyrox, régulier sur les 6 tours." }),
  () => ({ rx: intervals(5, 60, [M("ski-erg", 500), M("run", 400)]), color: "ambre" }),
  () => ({ rx: emom(20, 60, [CAL("row", 14, 11), M("run", 200)], true), color: "ambre" }),
  () => ({ rx: intervals(4, 120, [M("run", 1600)]), color: "ambre" }),
];
const HYROX_B: Gen[] = [
  () => ({ rx: rft(4, [M("run", 1000), M("sled-push", 25), R("wall-ball", 25, 6, 4)], 40), color: "orange" }),
  () => ({ rx: rft(3, [M("ski-erg", 1000), M("sled-pull", 25), R("burpee", 20)], 35), color: "orange" }),
  () => ({ rx: amrap(24, [M("row", 500), M("farmer-carry", 100, 32, 24), M("walking-lunge", 50)]), color: "orange" }),
  () => ({ rx: chipper([M("run", 1000), M("ski-erg", 1000), M("run", 1000), M("sled-push", 50), M("run", 1000), R("wall-ball", 100, 6, 4)], 50), color: "orange", notes: "Simulation demi-Hyrox." }),
];
const HYROX_C: Gen[] = [
  () => ({ rx: quality(3, [R("walking-lunge", 20, 20, 10), R("kb-swing", 20, 24, 16), T("plank", 60)]), color: "vert" }),
];

const GYM_A: Gen[] = [
  () => ({ rx: emom(12, 60, [T("handstand-hold", 30), R("kipping-pull-up", 6)], true), color: "violet", notes: "Gainage et ligne de corps avant tout." }),
  () => ({ rx: emom(10, 90, [R("ring-muscle-up", 2), R("strict-ring-dip", 6)]), color: "violet" }),
  () => ({ rx: emom(12, 60, [M("handstand-walk", 10), R("toes-to-bar", 10)], true), color: "violet" }),
];
const GYM_B: Gen[] = [
  (w) => ({ rx: sets([S("weighted-pull-up", wave(w).slice(0, 4))]), color: "bleu" }),
  () => ({ rx: quality(4, [R("strict-pull-up", 6), R("strict-hspu", 6), T("l-sit", 20)]), color: "violet" }),
  (w) => ({ rx: sets([S("weighted-dip", wave(w).slice(0, 4))]), color: "bleu" }),
];
const GYM_C: Gen[] = [
  () => ({ rx: amrap(10, [R("chest-to-bar", 8), R("kipping-hspu", 8), R("pistol", 8)]), color: "rouge" }),
  () => ({ rx: tft([12, 9, 6], [R("bar-muscle-up", 0), R("kipping-hspu", 0)], 10), color: "rouge" }),
];

const HALT_A: Gen[] = [
  (w) => ({ rx: sets([S("snatch", oly(w))]), color: "ciel" }),
  (w) => ({ rx: sets([S("hang-snatch", oly(w))]), color: "ciel" }),
  (w) => ({ rx: sets([S("power-snatch", oly(w)), S("overhead-squat", oly(w).slice(0, 3))]), color: "ciel" }),
];
const HALT_B: Gen[] = [
  (w) => ({ rx: sets([S("clean-and-jerk", oly(w))]), color: "ciel" }),
  (w) => ({ rx: sets([S("hang-clean", oly(w)), S("split-jerk", oly(w))]), color: "ciel" }),
  (w) => ({ rx: sets([S("clean", oly(w))]), color: "ciel" }),
];
const HALT_C: Gen[] = [
  (w) => ({ rx: sets([S("front-squat", wave(w).slice(0, 4))]), color: "bleu" }),
  (w) => ({ rx: sets([S("snatch-pull", wave(w).slice(0, 3).map(([r, p]) => [r, p + 20] as [number, number]))]), color: "bleu" }),
  (w) => ({ rx: sets([S("clean-pull", wave(w).slice(0, 3).map(([r, p]) => [r, p + 20] as [number, number]))]), color: "bleu" }),
];

const FBB_A: Gen[] = [
  (w) => ({ rx: sets([SK("romanian-deadlift", Array.from({ length: 4 }, () => [10 - w, 70 + 5 * w, 45 + 2.5 * w] as [number, number, number]))]), color: "rose" }),
  (w) => ({ rx: sets([SK("bench-press", Array.from({ length: 4 }, () => [10 - w, 60 + 5 * w, 35 + 2.5 * w] as [number, number, number]))]), color: "rose" }),
  (w) => ({ rx: sets([SK("hip-thrust", Array.from({ length: 4 }, () => [12 - w, 80 + 10 * w, 60 + 7.5 * w] as [number, number, number]))]), color: "rose" }),
];
const FBB_B: Gen[] = [
  () => ({ rx: quality(4, [R("bulgarian-split-squat", 10, 16, 10), R("db-row", 12, 26, 16)]), color: "vert" }),
  () => ({ rx: quality(4, [R("seated-db-press", 10, 20, 12), R("lat-pulldown", 12)]), color: "vert" }),
  () => ({ rx: quality(3, [R("biceps-curl", 12, 12, 8), R("triceps-extension", 12), R("lateral-raise", 15, 8, 5)]), color: "vert" }),
];
const FBB_C: Gen[] = [
  () => ({ rx: tabata([R("kb-goblet-squat", 0, 24, 16), R("push-up", 0)]), color: "ambre" }),
  () => ({ rx: amrap(8, [R("kb-swing", 15, 24, 16), R("walking-lunge", 20)]), color: "rouge" }),
];

const ENG_A: Gen[] = [
  () => ({ rx: intervals(6, 120, [M("row", 500)]), color: "ambre" }),
  () => ({ rx: intervals(8, 60, [CAL("echo-bike", 15, 12)]), color: "ambre" }),
  () => ({ rx: intervals(5, 90, [M("ski-erg", 400), M("run", 400)]), color: "ambre" }),
];
const ENG_B: Gen[] = [
  () => ({ rx: emom(30, 60, [CAL("bike-erg", 12, 9), CAL("row", 12, 9), CAL("ski-erg", 10, 8)], true), color: "ambre", notes: "Zone 2-3, on doit pouvoir parler." }),
  () => ({ rx: amrap(20, [M("run", 400), CAL("row", 20, 16)]), color: "ambre" }),
];
const ENG_C: Gen[] = [
  () => ({ rx: quality(3, [T("plank", 60), R("dead-bug", 20), R("ghd-hip-extension", 15)]), color: "vert" }),
];

const BANKS: Record<string, [Gen[], Gen[], Gen[], number[]]> = {
  // [A, B, C, jours avec un 3e bloc (0 = lundi)]
  competition: [COMP_A, COMP_B, COMP_C, [0, 1, 3, 4, 5]],
  "aff:crossfit": [CF_A, CF_B, CF_C, [0, 2, 4]],
  "aff:hyrox": [HYROX_A, HYROX_B, HYROX_C, [1, 3, 5]],
  "aff:gym": [GYM_A, GYM_B, GYM_C, [0, 2, 4]],
  "aff:halterophilie": [HALT_A, HALT_B, HALT_C, [0, 1, 2, 3, 4]],
  "aff:fbb": [FBB_A, FBB_B, FBB_C, [1, 3, 5]],
  "aff:engine": [ENG_A, ENG_B, ENG_C, [0, 3]],
};

/** 4 semaines × 7 jours × 7 pistes, 2 à 3 blocs par jour. dayOffset = jours depuis le lundi de la semaine 1. */
export function buildDemoProgram(): DemoBlock[] {
  const out: DemoBlock[] = [];
  Object.entries(BANKS).forEach(([track, [A, B, C, third]], ti) => {
    for (let w = 0; w < 4; w++) for (let d = 0; d < 7; d++) {
      const pick = (bank: Gen[], salt: number) => bank[(d + w * 2 + ti + salt) % bank.length](w, d);
      const blocks = [pick(A, 0), pick(B, 3)];
      if (third.includes(d)) blocks.push(pick(C, 1));
      blocks.forEach((b, i) => out.push({ track, dayOffset: w * 7 + d, block: "ABC"[i], color: b.color, title: `Rentrée S${w + 1} · ${WD[d]}`, rx: b.rx, notes: b.notes }));
    }
  });
  return out;
}

/* ---------- athlètes démo ---------- */
export const DEMO_ATHLETES = [
  { first: "Léa", last: "Martin", sex: "F" as const, level: 0.78, tracks: ["competition", "aff:crossfit", "aff:hyrox", "qualif"], star: true },
  { first: "Hugo", last: "Bernard", sex: "M" as const, level: 0.92, tracks: ["competition", "qualif"] },
  { first: "Camille", last: "Dubois", sex: "F" as const, level: 0.6, tracks: ["aff:crossfit", "aff:gym"] },
  { first: "Lucas", last: "Moreau", sex: "M" as const, level: 0.7, tracks: ["aff:crossfit", "aff:halterophilie"] },
  { first: "Inès", last: "Laurent", sex: "F" as const, level: 0.85, tracks: ["competition", "aff:halterophilie", "qualif"] },
  { first: "Nathan", last: "Simon", sex: "M" as const, level: 0.5, tracks: ["aff:crossfit", "aff:fbb"] },
  { first: "Chloé", last: "Michel", sex: "F" as const, level: 0.45, tracks: ["aff:hyrox", "aff:engine"] },
  { first: "Théo", last: "Lefebvre", sex: "M" as const, level: 0.65, tracks: ["aff:hyrox", "aff:crossfit"] },
  { first: "Manon", last: "Garcia", sex: "F" as const, level: 0.55, tracks: ["aff:crossfit", "aff:fbb"] },
  { first: "Enzo", last: "Roux", sex: "M" as const, level: 0.8, tracks: ["competition", "aff:gym"] },
  { first: "Jade", last: "Fournier", sex: "F" as const, level: 0.68, tracks: ["aff:crossfit", "aff:engine"] },
  { first: "Louis", last: "Girard", sex: "M" as const, level: 0.38, tracks: ["aff:crossfit"] },
];

export const DEMO_TESTS = ["back-squat", "front-squat", "deadlift", "clean", "snatch", "clean-and-jerk", "power-clean", "power-snatch", "push-press",
  "strict-press", "overhead-squat", "thruster", "bench-press", "weighted-pull-up", "weighted-dip", "hang-snatch", "hang-clean", "split-jerk",
  "strict-pull-up", "double-under", "row-2000", "run-5k", "romanian-deadlift", "hip-thrust", "push-jerk"];

/** Générateur pseudo-aléatoire déterministe (même démo à chaque génération). */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const POINTS = [40, 60, 75, 90, 100] as const;
const addDays = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 86400_000).toISOString().slice(0, 10);

/** Valeur d'un test correspondant à une note (inverse du barème). */
export function valueAt(a: Anchors, score: number) {
  const s = Math.max(30, Math.min(100, score));
  for (let i = 0; i < POINTS.length - 1; i++) {
    const lo = POINTS[i], hi = POINTS[i + 1];
    if (s <= hi) {
      const vlo = Number(a[String(lo) as keyof Anchors]), vhi = Number(a[String(hi) as keyof Anchors]);
      return vlo + (vhi - vlo) * ((s - lo) / (hi - lo));
    }
  }
  return Number(a["100"]);
}

/** Records + scores des athlètes démo sur les séances passées (volume calculé comme en vrai). */
export function buildDemoResults(o: {
  blocks: DemoBlock[]; mvs: Map<string, Pick<Movement, "id" | "metric" | "anchors_m" | "anchors_f">>; start: string; today: string;
  athleteIds: string[]; workoutId: (blockIndex: number) => string | undefined;
}): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
    DEMO_ATHLETES.forEach((a, ai) => {
      const athleteId = o.athleteIds[ai];
      const r = rng(1000 + ai * 97);
      const maxes: Record<string, number> = {};
      // Records : deux passages (ancien un peu moins bon) pour avoir une courbe
      for (const t of DEMO_TESTS) {
        const m = o.mvs.get(t);
        const an = (a.sex === "F" ? m?.anchors_f : m?.anchors_m) as Anchors | null | undefined;
        if (!m || !an) continue;
        if (r() < 0.15) continue;
        const score = 42 + a.level * 52 + (r() - 0.5) * 12;
        const now = valueAt(an, score), before = valueAt(an, score - 5 - r() * 4);
        const round = (v: number) => (m.metric === "load" ? Math.round(v / 2.5) * 2.5 : Math.round(v));
        results.push({ athlete_id: athleteId, movement_id: t, value: round(before), performed_on: addDays(o.today, -60 + Math.floor(r() * 15)) });
        results.push({ athlete_id: athleteId, movement_id: t, value: round(now), performed_on: addDays(o.today, -20 + Math.floor(r() * 18)) });
        if (m.metric === "load") maxes[t] = round(now);
      }
      // Scores sur les séances passées des pistes suivies
      o.blocks.forEach((b, bi) => {
        const date = addDays(o.start, b.dayOffset);
        if (date >= o.today || !a.tracks.includes(b.track) || r() > 0.7) return;
        const rx = sanitizeRx(b.rx) as Rx;
        const id = o.workoutId(bi);
        if (!id) return;
        const sex = a.sex as Sex;
        const pace = 1.35 - a.level * 0.5; // plus bas = plus rapide
        const division = a.level < 0.5 && r() < 0.5 ? (a.level < 0.3 ? "fitness" : "inter") : a.level > 0.85 && r() < 0.5 ? "elite" : "rx";
        const full = computeVolume(rx, { sex, division: "rx", value: 0, maxes });
        const work = full.reduce((s, v) => s + v.reps * 3.2 + v.cal * 4 + v.m * 0.3 + v.s, 0);
        const score = FORMATS[rx.format].score;
        let value = 0, capped = false;
        if (score === "load") value = (rx.format === "max" ? (maxes[rx.items[0].mv] ?? 0) * 0.98 : heaviest(rx, { sex, maxes }) ?? 0);
        else if (score === "time") {
          const est = Math.round(work * pace * (0.9 + r() * 0.2));
          if (rx.time_cap_s && est > rx.time_cap_s) { capped = true; value = Math.round(full.reduce((s, v) => s + v.reps + v.cal, 0) * (rx.time_cap_s / est)); }
          else value = Math.max(60, est);
        } else if (score === "rounds_reps" || (score === "reps" && rx.format === "amreps")) {
          const round = rx.items.filter((x) => !x.phase).reduce((s, x) => { const q = amounts(x, sex); return s + q.reps * 3.2 + q.cal * 4 + q.m * 0.3 + q.s; }, 0);
          const rpr = repsPerRound(rx, sex);
          value = round ? Math.round(((rx.duration_s ?? 600) / (round * pace)) * rpr * (0.9 + r() * 0.2)) : 0;
        } else if (score === "reps") {
          value = rx.format === "tabata" ? Math.round(rx.items.length * 8 * (8 + 8 * a.level)) : Math.round(rx.items.length * ((n) => (n * (n + 1)) / 2)(Math.round(8 + 10 * a.level)));
        }
        if (score !== "none" && value <= 0) return;
        const volume = computeVolume(rx, { sex, division, value, capped, maxes });
        results.push({ athlete_id: athleteId, workout_id: id, value: Math.round(value * 10) / 10, division, capped, as_written: true, volume, performed_on: date, rpe: 6 + Math.floor(r() * 4) });
      });
    });
  return results;
}
