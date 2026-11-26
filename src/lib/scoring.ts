import type { Anchors, Better, Sex } from "./types";

/** Barème : 100 = niveau Games. Seuils de catégories (choix Vikings). */
export const TIERS = [
  { key: "games", label: "Games", min: 98, color: "#d1ec2d" },
  { key: "elite", label: "Élite", min: 90, color: "#a8c3ff" },
  { key: "rx", label: "RX", min: 75, color: "#2e5aef" },
  { key: "inter", label: "Intermédiaire", min: 60, color: "#8b8ba0" },
  { key: "fitness", label: "Fitness", min: 0, color: "#5c5c6b" },
] as const;

export type Tier = (typeof TIERS)[number];

export function tierOf(score: number): Tier {
  return TIERS.find((t) => score >= t.min) ?? TIERS[TIERS.length - 1];
}

export function nextTier(score: number): Tier | null {
  const i = TIERS.findIndex((t) => score >= t.min);
  return i > 0 ? TIERS[i - 1] : null;
}

const POINTS = [40, 60, 75, 90, 100] as const;

/**
 * Note 0-100 d'une perf à partir des ancres du barème.
 * Interpolation linéaire entre ancres ; au-delà de 100 : plafonné ;
 * sous l'ancre 40 : décroissance linéaire jusqu'à 0.
 */
export function scoreFrom(value: number, anchors: Anchors | null | undefined, better: Better): number | null {
  if (!anchors || value == null || Number.isNaN(value)) return null;
  const a = POINTS.map((p) => Number(anchors[String(p) as keyof Anchors]));
  if (a.some((x) => !Number.isFinite(x))) return null;
  const up = better === "higher";
  const beats = (v: number, ref: number) => (up ? v >= ref : v <= ref);

  if (beats(value, a[4])) return 100;
  for (let i = 3; i >= 0; i--) {
    if (beats(value, a[i])) {
      const lo = a[i], hi = a[i + 1];
      if (hi === lo) return POINTS[i + 1];
      const f = (value - lo) / (hi - lo);
      return round1(POINTS[i] + f * (POINTS[i + 1] - POINTS[i]));
    }
  }
  // sous l'ancre 40
  if (up) return a[0] > 0 ? round1(Math.max(0, (40 * value) / a[0])) : 0;
  const slope = 20 / Math.max(1e-9, a[0] - a[1]); // points perdus par unité de temps
  return round1(Math.max(0, 40 - (value - a[0]) * slope));
}

export const anchorsFor = (o: { anchors_m: Anchors | null; anchors_f: Anchors | null }, sex: Sex) =>
  sex === "F" ? o.anchors_f : o.anchors_m;

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** Domaines d'analyse (radar forces / faiblesses). */
export const DOMAINS = [
  { key: "force", label: "Force", short: "FOR" },
  { key: "halterophilie", label: "Haltéro", short: "HAL" },
  { key: "gymnastique", label: "Gym", short: "GYM" },
  { key: "engine", label: "Engine", short: "ENG" },
  { key: "metcon", label: "Metcon", short: "MET" },
] as const;
export type DomainKey = (typeof DOMAINS)[number]["key"];

export function domainOfCategory(cat: string): DomainKey {
  if (cat === "force" || cat === "strongman") return "force";
  if (cat === "halterophilie") return "halterophilie";
  if (cat === "gymnastique" || cat === "core") return "gymnastique";
  if (cat === "engine") return "engine";
  return "metcon";
}

export type ScoredTest = {
  kind: "movement" | "workout";
  id: string;
  name: string;
  domain: DomainKey;
  value: number;
  score: number;
  weight: number;
  date: string;
};

export type LevelSummary = {
  global: number | null;
  provisional: boolean;
  domains: { key: DomainKey; label: string; score: number | null; count: number }[];
  tests: ScoredTest[];
  strengths: ScoredTest[];
  weaknesses: ScoredTest[];
};

export const MIN_TESTS = 6;
export const MIN_DOMAINS = 3;

export function summarize(tests: ScoredTest[]): LevelSummary {
  const domains = DOMAINS.map((d) => {
    const ts = tests.filter((t) => t.domain === d.key);
    const w = ts.reduce((s, t) => s + t.weight, 0);
    const score = w > 0 ? round1(ts.reduce((s, t) => s + t.score * t.weight, 0) / w) : null;
    return { key: d.key, label: d.label, score, count: ts.length };
  });
  const present = domains.filter((d) => d.score != null);
  const global = present.length ? round1(present.reduce((s, d) => s + (d.score as number), 0) / present.length) : null;
  const sorted = [...tests].sort((a, b) => b.score - a.score);
  return {
    global,
    provisional: tests.length < MIN_TESTS || present.length < MIN_DOMAINS,
    domains,
    tests: sorted,
    strengths: sorted.slice(0, 3),
    weaknesses: sorted.length > 3 ? sorted.slice(-3).reverse() : [],
  };
}
