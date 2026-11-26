/**
 * Programmes Vikings : Compétition + Affiliates (6 pistes), plus Qualifs et Benchmarks.
 * Une « clé de piste » identifie ce qu'un athlète suit et ce que l'admin programme :
 *   competition · aff:crossfit · aff:hyrox · aff:gym · aff:halterophilie · aff:fbb · aff:engine · qualif · benchmark
 */
export type Subtrack = "crossfit" | "hyrox" | "gym" | "halterophilie" | "fbb" | "engine";

export const SUBTRACKS: { id: Subtrack; label: string }[] = [
  { id: "crossfit", label: "CrossFit" },
  { id: "hyrox", label: "Hyrox" },
  { id: "gym", label: "Gym" },
  { id: "halterophilie", label: "Haltérophilie" },
  { id: "fbb", label: "FBB" },
  { id: "engine", label: "Engine" },
];

export const PROGRAMS = [
  { id: "competition", label: "Vikings Compétition", short: "Compétition" },
  { id: "affiliates", label: "Vikings Affiliates", short: "Affiliates" },
] as const;

export const TRACK_KEYS = ["competition", ...SUBTRACKS.map((s) => `aff:${s.id}`), "qualif", "benchmark"];
/** Pistes qu'un athlète peut suivre (les benchmarks restent dans l'onglet Prog). */
export const FOLLOWABLE = TRACK_KEYS.filter((k) => k !== "benchmark");
export const DEFAULT_TRACKS = ["competition", "aff:crossfit", "qualif"];

export function trackKey(w: { source: string; subtrack?: string | null }): string {
  if (w.source === "affiliates") return `aff:${w.subtrack ?? "crossfit"}`;
  if (w.source === "vikings") return "competition";
  return w.source;
}

export function parseTrack(key: string): { source: string; subtrack: Subtrack | null } {
  if (key.startsWith("aff:")) {
    const sub = key.slice(4) as Subtrack;
    return { source: "affiliates", subtrack: SUBTRACKS.some((s) => s.id === sub) ? sub : "crossfit" };
  }
  return { source: ["competition", "qualif", "benchmark"].includes(key) ? key : "competition", subtrack: null };
}

export function trackLabel(key: string, long = false): string {
  if (key.startsWith("aff:")) {
    const s = SUBTRACKS.find((x) => x.id === key.slice(4))?.label ?? "CrossFit";
    return long ? `Vikings Affiliates · ${s}` : s;
  }
  return ({ competition: long ? "Vikings Compétition" : "Compétition", qualif: "Qualifs", benchmark: "Benchmarks", vikings: "Compétition" } as Record<string, string>)[key] ?? key;
}

/** Sources à interroger pour une liste de pistes suivies. */
export function sourcesOf(keys: string[]): string[] {
  return [...new Set(keys.map((k) => parseTrack(k).source))];
}
