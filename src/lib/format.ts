import type { Metric, ScoreType } from "./types";

export function fmtTime(s: number): string {
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** "3:45", "1:02:10", "225" (secondes) → secondes */
export function parseTime(input: string): number | null {
  const t = input.trim().replace(/[,.]/g, ":").replace(/[^\d:]/g, "");
  if (!t) return null;
  const parts = t.split(":").filter((x) => x !== "").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

export function parseNum(input: string): number | null {
  const n = Number(String(input).trim().replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const UNIT: Record<Metric, string> = { load: "kg", reps: "reps", time: "", distance: "m", calories: "cal", height: "cm" };

export function fmtMetric(v: number, metric: Metric): string {
  if (metric === "time") return fmtTime(v);
  const n = Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ",");
  return `${n} ${UNIT[metric]}`.trim();
}

export function fmtScore(v: number, type: ScoreType, opts: { rpr?: number | null; capped?: boolean } = {}): string {
  if (opts.capped) return `CAP + ${v} reps`;
  switch (type) {
    case "time": return fmtTime(v);
    case "rounds_reps":
      if (opts.rpr) return `${Math.floor(v / opts.rpr)} rds + ${v % opts.rpr}`;
      return `${v} reps`;
    case "load": return fmtMetric(v, "load");
    case "calories": return `${v} cal`;
    case "distance": return `${v} m`;
    case "reps": return `${v} reps`;
    default: return "Fait";
  }
}

export const SOURCE_LABEL: Record<string, string> = {
  vikings: "Compétition",
  competition: "Compétition",
  affiliates: "Affiliates",
  qualif: "Qualif",
  benchmark: "Benchmark",
};

export const CATEGORY_LABEL: Record<string, string> = {
  halterophilie: "Haltérophilie",
  force: "Force",
  gymnastique: "Gymnastique",
  engine: "Engine",
  haltere_kb: "Haltères & KB",
  renfo: "Renforcement",
  core: "Core",
  strongman: "Strongman",
};

export const CATEGORY_ORDER = ["halterophilie", "force", "gymnastique", "engine", "haltere_kb", "renfo", "core", "strongman"];

export function fmtDate(d: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", ...opts });
}

export function todayParis(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}
