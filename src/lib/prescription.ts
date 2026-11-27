/**
 * Séances structurées (façon BTWB) — partagé client / serveur.
 * Une séance = un format + une liste de mouvements prescrits.
 * À partir de la prescription et du score, on calcule le volume réel par mouvement.
 */
import type { Better, Division, ScoreType, Sex } from "./types";

export type Format = "max" | "sets" | "emom" | "amrap" | "amreps" | "for_time" | "rft" | "tabata" | "death_by" | "intervals" | "quality";
export type Unit = "reps" | "cal" | "m" | "s";

/** Une série prescrite (formats max / séries). Charge en % du max OU en kg H/F. */
export type SetRx = { reps: number; pct?: number | null; kg_m?: number | null; kg_f?: number | null };

export type Item = {
  mv: string;                 // id du mouvement
  reps?: number | null;       // répétitions par round
  cal?: number | null;        // calories (hommes)
  cal_f?: number | null;      // calories femmes si différent (15/12 cal)
  dist_m?: number | null;     // distance en mètres (hommes)
  dist_f?: number | null;     // distance femmes si différente
  time_s?: number | null;     // durée (gainage, hold, effort chronométré)
  /** @deprecated ancien format (quantité + unité), lu pour compatibilité */
  qty?: number | null;
  qty_f?: number | null;
  unit?: Unit;
  kg_m?: number | null;       // charge prescrite hommes
  kg_f?: number | null;       // charge prescrite femmes
  pct?: number | null;        // % du max de l'athlète
  height_cm?: number | null;  // box jump, wall ball…
  sets?: SetRx[];             // formats max / séries
  note?: string | null;
  video?: string | null;      // lien YouTube de démo
  phase?: "buy_in" | "buy_out" | null; // fait une seule fois, avant / après les tours
  part?: number | null;       // séance en plusieurs parties : n° de partie (1 par défaut)
};

/** Une partie d'une séance enchaînée (ex. 6 tours, puis 3 tours). rest_s = repos avant la partie suivante (null = directement). */
export type Part = { rounds: number; rest_s?: number | null };

/** Identifiant d'une vidéo YouTube (youtube.com/watch, youtu.be, shorts, embed), sinon null. */
export function youtubeId(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const m = url.trim().match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export type Rx = {
  format: Format;
  items: Item[];
  rounds?: number | null;        // RFT, tabata, intervalles, EMOM (nb de minutes / intervalles), qualité
  duration_s?: number | null;    // AMRAP
  interval_s?: number | null;    // EMOM « toutes les X », repos des intervalles, travail tabata
  rep_scheme?: number[] | null;  // For time 21-15-9
  emom_mode?: "all" | "alternate" | null;
  time_cap_s?: number | null;
  variant?: string | null;       // modèle choisi (catalogue façon BTWB)
  parts?: Part[] | null;         // « Parties pour le temps » : 6 RFT → 3 RFT…
};

export const FORMATS: Record<Format, { label: string; desc: string; group: "single" | "multi"; score: ScoreType; better: Better }> = {
  max:       { label: "X Rep Max",      desc: "Une série unique, la plus lourde possible.",            group: "single", score: "load",        better: "higher" },
  sets:      { label: "Séries",         desc: "Séries et répétitions, charge en kg ou en % du max.",   group: "single", score: "load",        better: "higher" },
  death_by:  { label: "Death By",       desc: "Une rep de plus chaque minute, jusqu'à l'échec.",       group: "single", score: "reps",        better: "higher" },
  emom:      { label: "EMOM",           desc: "Chaque minute sur la minute.",                          group: "multi",  score: "none",        better: "higher" },
  amrap:     { label: "AMRAP",          desc: "Autant de tours que possible.",                         group: "multi",  score: "rounds_reps", better: "higher" },
  amreps:    { label: "AMReps",         desc: "Autant de reps que possible.",                          group: "multi",  score: "reps",        better: "higher" },
  for_time:  { label: "For Time",       desc: "Tout le travail le plus vite possible (ex. 21-15-9).",  group: "multi",  score: "time",        better: "lower" },
  rft:       { label: "Rounds For Time", desc: "Un nombre de tours, pour le temps.",                   group: "multi",  score: "time",        better: "lower" },
  tabata:    { label: "Tabata",         desc: "20 s de travail / 10 s de repos, score en reps.",       group: "multi",  score: "reps",        better: "higher" },
  intervals: { label: "Intervalles",    desc: "Blocs répétés avec repos, temps total.",                group: "multi",  score: "time",        better: "lower" },
  quality:   { label: "Pour la qualité", desc: "Pas de score : technique et qualité d'exécution.",     group: "multi",  score: "none",        better: "higher" },
};

export const UNIT_LABEL: Record<Unit, string> = { reps: "reps", cal: "cal", m: "m", s: "s" };

/* ---------- Catalogue de modèles (façon BTWB) ---------- */
export type ResultBy = "tours" | "reps" | "temps" | "achevement";
export type Param = "duration" | "rounds" | "rest" | "every" | "work" | "scheme" | "cap" | "emom_mode";
export type Template = {
  id: string; label: string; desc: string; group: "single" | "multi"; by?: ResultBy;
  engine: Format; preset?: Partial<Rx>; params: Param[]; phases?: boolean; multiItems?: boolean;
};

export const RESULT_BY: { id: ResultBy; label: string }[] = [
  { id: "tours", label: "Tours" }, { id: "reps", label: "Reps" }, { id: "temps", label: "Temps" }, { id: "achevement", label: "Achèvement" },
];

export const TEMPLATES: Template[] = [
  // Un mouvement
  { id: "max", label: "X Rep Max", desc: "Une série unique, la plus lourde possible.", group: "single", engine: "max", params: [] },
  { id: "sets", label: "Séries", desc: "Un nombre donné de séries et/ou de répétitions.", group: "single", engine: "sets", params: [], multiItems: true },
  { id: "death_by", label: "Death By Reps", desc: "Le nombre de reps augmente à chaque intervalle.", group: "single", engine: "death_by", params: ["every"] },
  { id: "death_by_weight", label: "Death By Poids", desc: "Le poids augmente à chaque intervalle.", group: "single", engine: "death_by", params: ["every"] },
  { id: "emom_single", label: "EMOM", desc: "Chaque minute sur la minute.", group: "single", engine: "emom", params: ["rounds", "every"] },
  { id: "tabata_single", label: "Tabata", desc: "Alterne entre des périodes de travail et de repos.", group: "single", engine: "tabata", params: ["rounds", "work"] },
  { id: "reps_for_time", label: "X Reps pour le Temps", desc: "Effectuer un certain nombre de reps pour le temps.", group: "single", engine: "for_time", params: ["cap"] },
  { id: "amreps_time", label: "AMReps en X Temps", desc: "Faites autant de répétitions que possible dans un temps donné.", group: "single", engine: "amreps", params: ["duration"] },
  // Plusieurs mouvements — résultat par tours
  { id: "amrap", label: "AMRAP", desc: "Autant de tours que possible.", group: "multi", by: "tours", engine: "amrap", params: ["duration"] },
  { id: "amrap_repeat", label: "AMRAP Répétés", desc: "Un AMRAP qui est répété plusieurs fois.", group: "multi", by: "tours", engine: "amrap", params: ["rounds", "duration", "rest"] },
  { id: "amrap_buyin", label: "AMRAP avec Buy-In", desc: "Une tâche effectuée avant de démarrer un AMRAP.", group: "multi", by: "tours", engine: "amrap", params: ["duration"], phases: true },
  { id: "amrap_series", label: "Série AMRAP", desc: "Une série de différents AMRAPs.", group: "multi", by: "tours", engine: "amrap", params: ["rounds", "duration", "rest"] },
  // Plusieurs mouvements — résultat par reps
  { id: "amrap_max_rep", label: "AMRAP avec Max Rep", desc: "Un AMRAP avec un ou plusieurs mouvements pour le max de reps.", group: "multi", by: "reps", engine: "amreps", params: ["duration"] },
  { id: "amreps", label: "AMReps", desc: "Autant de reps que possible.", group: "multi", by: "reps", engine: "amreps", params: ["duration"] },
  { id: "amrap_asc", label: "AMRAPs Ascendants", desc: "Un AMRAP avec un schéma de répétitions ascendant.", group: "multi", by: "reps", engine: "amreps", params: ["duration", "scheme"] },
  { id: "amrap_var_asc", label: "Ascension variable AMReps", desc: "Un AMReps avec un schéma de répétitions ascendant variable.", group: "multi", by: "reps", engine: "amreps", params: ["duration", "scheme"] },
  { id: "tabata", label: "Tabata", desc: "Un Tabata avec plusieurs mouvements.", group: "multi", by: "reps", engine: "tabata", params: ["rounds", "work"] },
  { id: "fgb", label: "Style FGB", desc: "Un entraînement type « Fight Gone Bad ».", group: "multi", by: "reps", engine: "tabata", preset: { rounds: 3, interval_s: 60 }, params: ["rounds", "work", "rest"] },
  { id: "death_by_multi", label: "Death By Reps", desc: "Un « Death By Reps » avec mouvements multiples.", group: "multi", by: "reps", engine: "death_by", params: ["every"] },
  { id: "rounds_max_reps", label: "Tours pour le plus de reps", desc: "Un certain nombre de tours pour le max de reps.", group: "multi", by: "reps", engine: "amreps", params: ["rounds", "duration", "rest"] },
  { id: "reps_time_left", label: "Reps dans le Temps Restant", desc: "Effectuez le max de reps dans le temps restant.", group: "multi", by: "reps", engine: "amreps", params: ["duration"], phases: true },
  // Plusieurs mouvements — résultat au temps
  { id: "rft", label: "Tours pour le Temps", desc: "Un certain nombre de tours pour le temps (RFT).", group: "multi", by: "temps", engine: "rft", params: ["rounds", "cap"] },
  { id: "tft", label: "TFT : mêmes répétitions variables", desc: "Chaque tour a le même nombre de reps pour tous les mouvements (ex. 21-15-9).", group: "multi", by: "temps", engine: "for_time", params: ["scheme", "cap"] },
  { id: "parts_for_time", label: "Parties pour le temps", desc: "Plusieurs parties enchaînées (ex. 6 tours puis 3 tours), avec ou sans repos entre elles.", group: "multi", by: "temps", engine: "rft", params: ["cap"] },
  { id: "tft_buy", label: "TFT avec Buy-In ou Buy-Out", desc: "Tâche avant et/ou après les tours principaux.", group: "multi", by: "temps", engine: "rft", params: ["rounds", "cap"], phases: true },
  { id: "each_round_time", label: "Chaque Tour pour le Temps", desc: "Chaque tour est chronométré, avec du repos entre les tours.", group: "multi", by: "temps", engine: "intervals", params: ["rounds", "rest"] },
  { id: "for_time", label: "Pour le Temps", desc: "Pas de tours, juste deux mouvements ou plus, tous pour le temps.", group: "multi", by: "temps", engine: "for_time", params: ["cap"] },
  { id: "every_x", label: "Allez à chaque", desc: "Effectuer les mouvements à intervalles réguliers, pour le temps.", group: "multi", by: "temps", engine: "intervals", params: ["rounds", "every", "cap"] },
  // Plusieurs mouvements — achèvement
  { id: "quality", label: "Pour la Qualité", desc: "Pas pour le temps, pour la qualité.", group: "multi", by: "achevement", engine: "quality", params: ["rounds"] },
  { id: "emom_all", label: "EMOM : mouvements multiples par intervalles", desc: "Chaque minute sur la minute, travaillez jusqu'à la fin ou l'échec.", group: "multi", by: "achevement", engine: "emom", preset: { emom_mode: "all" }, params: ["rounds", "every"] },
  { id: "emom_alt", label: "EMOM : alternez à chaque intervalle", desc: "Alternez entre les mouvements dans un EMOM.", group: "multi", by: "achevement", engine: "emom", preset: { emom_mode: "alternate" }, params: ["rounds", "every"] },
];

const DEFAULT_TEMPLATE: Record<Format, string> = {
  max: "max", sets: "sets", death_by: "death_by", emom: "emom_all", amrap: "amrap", amreps: "amreps", for_time: "for_time",
  rft: "rft", tabata: "tabata", intervals: "each_round_time", quality: "quality",
};
export function templateOf(rx: Pick<Rx, "variant" | "format">): Template {
  return TEMPLATES.find((t) => t.id === rx.variant && t.engine === rx.format) ?? TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE[rx.format])!;
}
/** Libellé affiché d'une séance (modèle choisi, sinon format). */
export function formatLabel(w: { variant?: string | null; format?: Format | null }): string {
  if (!w.format) return "Texte libre";
  return templateOf({ variant: w.variant ?? null, format: w.format }).label;
}

const n = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const fmtNum = (v: number) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10).replace(".", ","));
const fmtDur = (s: number) => (s < 60 ? `${s} s` : s % 60 === 0 ? `${s / 60} min` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

export type Amounts = { reps: number; cal: number; m: number; s: number };

/** Quantités d'un mouvement par round pour un athlète (lit aussi l'ancien format qty/unit). */
export function amounts(it: Item, sex: Sex): Amounts {
  const a: Amounts = { reps: n(it.reps) ?? 0, cal: n(sex === "F" ? it.cal_f ?? it.cal : it.cal) ?? 0, m: n(sex === "F" ? it.dist_f ?? it.dist_m : it.dist_m) ?? 0, s: n(it.time_s) ?? 0 };
  if (!a.reps && !a.cal && !a.m && !a.s && it.qty != null) {
    const q = n(sex === "F" && it.qty_f != null ? it.qty_f : it.qty) ?? 0;
    a[(it.unit ?? "reps") as keyof Amounts] = q;
  }
  return a;
}

/** Unité « principale » d'un mouvement : celle qui compte comme reps dans un AMRAP / time cap. */
export function primaryUnit(it: Item, sex: Sex = "M"): Unit | null {
  const a = amounts(it, sex);
  return a.reps ? "reps" : a.cal ? "cal" : a.m ? "m" : a.s ? "s" : null;
}

export function qtyFor(it: Item, sex: Sex): number | null {
  const u = primaryUnit(it, sex);
  return u ? amounts(it, sex)[u === "reps" ? "reps" : u] : null;
}

/** Reps par round (pour convertir rounds + reps en total sur un AMRAP). */
export function repsPerRound(rx: Rx, sex: Sex = "M"): number {
  return rx.items.filter((it) => !it.phase).reduce((s, it) => s + (qtyFor(it, sex) ?? 0), 0);
}

/** Charge d'un item ou d'une série pour un athlète (kg prescrit, ou % × son max). */
export function loadFor(x: { kg_m?: number | null; kg_f?: number | null; pct?: number | null }, sex: Sex, max?: number | null): number | null {
  const kg = n(sex === "F" ? x.kg_f ?? x.kg_m : x.kg_m ?? x.kg_f);
  if (kg != null) return kg;
  const pct = n(x.pct);
  if (pct != null && max) return Math.round((max * pct) / 100 / 0.5) * 0.5; // arrondi au 0,5 kg
  return null;
}

/* ---------- Texte de la séance ---------- */

function loadText(x: { kg_m?: number | null; kg_f?: number | null; pct?: number | null }) {
  const m = n(x.kg_m), f = n(x.kg_f), p = n(x.pct);
  if (p != null) return `@ ${fmtNum(p)} %`;
  if (m != null && f != null && m !== f) return `${fmtNum(m)}/${fmtNum(f)} kg`;
  if (m != null || f != null) return `${fmtNum((m ?? f)!)} kg`;
  return "";
}

/** « 3 × 5 @ 70 %, 2 × 3 @ 80 % » — regroupe les séries identiques consécutives. */
export function setsText(sets: SetRx[]): string {
  const groups: { count: number; s: SetRx }[] = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last.s.reps === s.reps && loadText(last.s) === loadText(s)) last.count++;
    else groups.push({ count: 1, s });
  }
  return groups.map((g) => `${g.count > 1 ? `${g.count} × ` : ""}${g.s.reps}${loadText(g.s) ? " " + loadText(g.s) : ""}`).join(", ");
}

export function itemText(it: Item, name: string, opts: { scheme?: boolean } = {}): string {
  const M = amounts(it, "M"), F = amounts(it, "F");
  const hf = (m: number, f: number) => (f && f !== m ? `${fmtNum(m)}/${fmtNum(f)}` : fmtNum(m));
  const pre: string[] = [];
  if (!opts.scheme) {
    if (M.reps) pre.push(fmtNum(M.reps));
    if (M.cal) pre.push(`${hf(M.cal, F.cal)} cal`);
    if (M.m) pre.push(`${hf(M.m, F.m)} m`);
    if (M.s) pre.push(fmtDur(M.s));
  }
  let s = `${pre.join(" · ")} ${name}`.trim();
  const l = loadText(it);
  if (l) s += l.startsWith("@") ? ` ${l}` : `, ${l}`;
  if (n(it.height_cm) != null) s += `, ${fmtNum(n(it.height_cm)!)} cm`;
  if (it.note) s += ` — ${it.note}`;
  return s;
}

/** N° de partie d'un mouvement (1 par défaut, borné au nombre de parties). */
export function partOf(it: Item, rx: Pick<Rx, "parts">): number {
  const n = rx.parts?.length ?? 1;
  return Math.min(Math.max(1, Math.round(Number(it.part) || 1)), Math.max(1, n));
}

export function describe(rx: Rx, nameOf: (id: string) => string): string {
  const L: string[] = [];
  const all = rx.items.filter((i) => i.mv);
  const buyIn = all.filter((i) => i.phase === "buy_in"), buyOut = all.filter((i) => i.phase === "buy_out");
  const items = all.filter((i) => !i.phase);
  const tpl = templateOf(rx);
  if (buyIn.length) L.push(`Buy-in : ${buyIn.map((it) => itemText(it, nameOf(it.mv))).join(", ")}`);
  const rounds = n(rx.rounds), dur = n(rx.duration_s), itv = n(rx.interval_s);
  switch (rx.format) {
    case "max": {
      const it = items[0];
      if (it) L.push(`${it.sets?.[0]?.reps ?? 1}RM ${nameOf(it.mv)}`, "Monte jusqu'à ta série la plus lourde.");
      break;
    }
    case "sets":
      for (const it of items) L.push(`${nameOf(it.mv)} : ${setsText(it.sets ?? [])}${it.note ? ` — ${it.note}` : ""}`);
      break;
    case "death_by":
      if (tpl.id === "death_by_weight" && items[0]) {
        L.push(`Death by ${nameOf(items[0].mv)} (poids)`, `${fmtNum(qtyFor(items[0], "M") ?? 1)} rep${itv && itv !== 60 ? ` toutes les ${fmtDur(itv)}` : " chaque minute"}, la charge augmente à chaque intervalle.`);
        if (loadText(items[0])) L.push(`Départ : ${loadText(items[0]).replace(/^@ /, "")}`);
      } else if (items.length > 1) {
        L.push(`Death by${itv && itv !== 60 ? ` (toutes les ${fmtDur(itv)})` : ""} : +1 rep de chaque mouvement par intervalle jusqu'à l'échec`);
        items.forEach((it) => L.push(itemText(it, nameOf(it.mv), { scheme: true })));
      } else if (items[0]) {
        const st = qtyFor(items[0], "M") ?? 1;
        L.push(`Death by ${nameOf(items[0].mv)}`, `Intervalle 1 : ${fmtNum(st)} rep, puis +${fmtNum(st)} ${itv && itv !== 60 ? `toutes les ${fmtDur(itv)}` : "chaque minute"} jusqu'à l'échec.`);
        if (loadText(items[0])) L.push(loadText(items[0]));
      }
      break;
    case "emom":
      L.push(itv && itv !== 60 ? `Toutes les ${fmtDur(itv)} × ${rounds ?? "?"}` : `EMOM ${rounds ?? "?"} min`);
      if (rx.emom_mode === "alternate" && items.length > 1) L.push("En alternant :");
      items.forEach((it, i) => L.push(`${rx.emom_mode === "alternate" && items.length > 1 ? `Min ${i + 1} : ` : ""}${itemText(it, nameOf(it.mv))}`));
      break;
    case "amrap":
    case "amreps": {
      const kind = rx.format === "amrap" ? "AMRAP" : "AMReps";
      const multi = (tpl.id === "amrap_repeat" || tpl.id === "amrap_series" || tpl.id === "rounds_max_reps") && rounds && rounds > 1;
      const head = tpl.id === "rounds_max_reps" ? `${rounds ?? "?"} tours de ${dur ? fmtDur(dur) : "?"}, max de reps` : multi ? `${rounds} × ${kind} ${dur ? fmtDur(dur) : "?"}` : `${kind} ${dur ? fmtDur(dur) : "?"}`;
      L.push(head + (multi && itv ? `, repos ${fmtDur(itv)}` : "") + (tpl.id === "reps_time_left" ? " : max de reps dans le temps restant" : ""));
      const scheme = rx.rep_scheme?.length ? rx.rep_scheme : null;
      if (scheme) L.push(`Reps : ${scheme.join("-")}${scheme.length >= 2 ? "…" : ""}`);
      items.forEach((it) => L.push(itemText(it, nameOf(it.mv), { scheme: !!scheme && primaryUnit(it) == null })));
      break;
    }
    case "for_time": {
      const scheme = rx.rep_scheme?.length ? rx.rep_scheme : null;
      L.push(scheme ? `For time : ${scheme.join("-")}` : "For time");
      items.forEach((it) => L.push(itemText(it, nameOf(it.mv), { scheme: !!scheme && primaryUnit(it) == null })));
      break;
    }
    case "rft":
      if (rx.parts && rx.parts.length > 1) {
        rx.parts.forEach((pt, k) => {
          if (k > 0) L.push(rx.parts![k - 1].rest_s ? `— Repos ${fmtDur(rx.parts![k - 1].rest_s!)} —` : "— Directement —");
          L.push(`${k === 0 ? "" : "Puis "}${pt.rounds} round${pt.rounds > 1 ? "s" : ""}${k === 0 ? " for time" : ""}`);
          items.filter((it) => partOf(it, rx) === k + 1).forEach((it) => L.push(itemText(it, nameOf(it.mv))));
        });
        break;
      }
      L.push(`${rounds ?? "?"} rounds for time`);
      items.forEach((it) => L.push(itemText(it, nameOf(it.mv))));
      break;
    case "tabata":
      L.push(tpl.id === "fgb" ? `Style FGB : ${rounds ?? 3} tours, ${fmtDur(itv ?? 60)} par station${rx.duration_s ? `, repos ${fmtDur(rx.duration_s)}` : ""}` : `Tabata : ${rounds ?? 8} × ${itv ?? 20} s de travail / 10 s de repos`);
      items.forEach((it) => L.push(itemText(it, nameOf(it.mv), { scheme: true })));
      break;
    case "intervals":
      L.push(tpl.id === "every_x" ? `Toutes les ${itv ? fmtDur(itv) : "?"} × ${rounds ?? "?"}, pour le temps` : `${rounds ?? "?"} tours, chacun pour le temps${itv ? `, repos ${fmtDur(itv)}` : ""}`);
      items.forEach((it) => L.push(itemText(it, nameOf(it.mv))));
      break;
    case "quality":
      L.push(rounds && rounds > 1 ? `${rounds} tours, pour la qualité` : "Pour la qualité");
      items.forEach((it) => L.push(itemText(it, nameOf(it.mv))));
      break;
  }
  if (buyOut.length) L.push(`Buy-out : ${buyOut.map((it) => itemText(it, nameOf(it.mv))).join(", ")}`);
  if (rx.time_cap_s && ["for_time", "rft", "intervals"].includes(rx.format)) L.push(`Time cap : ${fmtDur(rx.time_cap_s)}`);
  return L.join("\n");
}

/* ---------- Volume réel ---------- */

export type VolumeRow = { mv: string; reps: number; cal: number; m: number; s: number; kg: number | null; tonnage: number };

/** Saisie détaillée de l'athlète quand il n'a pas fait « exactement comme écrit ». */
export type Detail = {
  sets?: { mv: string; reps: number; kg: number | null }[];           // séries réellement faites
  items?: Record<string, { qty?: number | null; kg?: number | null }>; // modifications par mouvement (metcon)
};

export type Performance = {
  sex: Sex;
  division: Division;
  value: number;           // score normalisé (s, reps totales, kg…)
  capped?: boolean;        // time cap atteint : value = reps réalisées
  maxes?: Record<string, number>; // max de l'athlète par mouvement (pour les %)
  detail?: Detail | null;
};

type Acc = Map<string, VolumeRow>;
function add(acc: Acc, mv: string, a: Amounts, kg: number | null) {
  if (!mv || !(a.reps || a.cal || a.m || a.s)) return;
  const r = acc.get(mv) ?? { mv, reps: 0, cal: 0, m: 0, s: 0, kg: null, tonnage: 0 };
  r.reps += a.reps; r.cal += a.cal; r.m += a.m; r.s += a.s;
  if (kg != null) {
    r.kg = Math.max(r.kg ?? 0, kg);
    r.tonnage += a.reps * kg;
  }
  acc.set(mv, r);
}
const scale = (a: Amounts, f: number): Amounts => ({ reps: Math.round(a.reps * f), cal: Math.round(a.cal * f), m: Math.round(a.m * f), s: Math.round(a.s * f) });
const repsOnly = (reps: number): Amounts => ({ reps, cal: 0, m: 0, s: 0 });

export function computeVolume(rx: Rx, p: Performance): VolumeRow[] {
  const acc: Acc = new Map();
  const allItems = rx.items.filter((i) => i.mv);
  const items = allItems.filter((i) => !i.phase);
  const maxOf = (it: Item) => p.maxes?.[it.mv] ?? null;
  const mod = (it: Item) => p.detail?.items?.[it.mv];
  // charge utilisée : modifiée > prescrite (RX uniquement, sinon inconnue)
  const kgOf = (it: Item) => {
    const m = mod(it);
    if (m?.kg != null) return Number(m.kg);
    return p.division === "rx" ? loadFor(it, p.sex, maxOf(it)) : null;
  };
  // quantités d'un round ; une modification de l'athlète remplace la quantité principale
  // schéma de reps ; sur un AMRAP / AMReps il se prolonge (3-6-9 → 12, 15…)
  const schemeAt = (scheme: number[], i: number) => {
    if (i < scheme.length) return scheme[i];
    if (!["amrap", "amreps"].includes(rx.format) || scheme.length < 2) return 0;
    const step = scheme[scheme.length - 1] - scheme[scheme.length - 2];
    return Math.max(0, scheme[scheme.length - 1] + step * (i - scheme.length + 1));
  };
  const amountsOf = (it: Item, roundIdx = 0): Amounts => {
    const scheme = rx.rep_scheme?.length ? rx.rep_scheme : null;
    const base = amounts(it, p.sex);
    const u = primaryUnit(it, p.sex);
    const m = mod(it);
    if (!u) return scheme ? repsOnly(m?.qty != null ? Number(m.qty) : schemeAt(scheme, roundIdx)) : base;
    if (m?.qty != null) return { ...base, [u === "reps" ? "reps" : u]: Number(m.qty) } as Amounts;
    return base;
  };
  const primaryOf = (a: Amounts) => a.reps || a.cal || a.m || a.s;
  const qtyOf = (it: Item) => primaryOf(amountsOf(it));

  // Formats séries : on compte chaque série (réelle si détaillée, sinon prescrite)
  if (rx.format === "sets" || rx.format === "max") {
    if (p.detail?.sets?.length) {
      for (const s of p.detail.sets) add(acc, s.mv, repsOnly(Number(s.reps) || 0), s.kg != null ? Number(s.kg) : null);
    } else {
      for (const it of items) for (const s of it.sets ?? []) add(acc, it.mv, repsOnly(s.reps), loadFor(s, p.sex, maxOf(it)));
    }
    return [...acc.values()];
  }

  // Un round complet : liste ordonnée (mouvement, quantités, quantité principale)
  const roundSeq = (roundIdx: number) => items.map((it) => { const a = amountsOf(it, roundIdx); return { it, a, q: primaryOf(a) }; });
  // Ajoute une partie d'un mouvement (au prorata de la quantité principale)
  const part = (it: Item, a: Amounts, q: number, done: number) => add(acc, it.mv, done >= q ? a : scale(a, q ? done / q : 0), kgOf(it));

  // Répartit un total de « reps » dans l'ordre de la séance (AMRAP, time cap)
  const walk = (totalRounds: number, extra: number) => {
    for (let r = 0; r < totalRounds; r++) for (const { it, a } of roundSeq(r)) add(acc, it.mv, a, kgOf(it));
    let left = extra;
    for (const { it, a, q } of roundSeq(totalRounds)) {
      if (left <= 0) break;
      const done = Math.min(q, left);
      part(it, a, q, done);
      left -= done;
    }
  };

  const roundsWithScheme = rx.rep_scheme?.length ? rx.rep_scheme.length : 1;

  // buy-in / buy-out : faits une fois (le buy-out seulement si la séance est terminée)
  for (const it of allItems.filter((i) => i.phase === "buy_in")) add(acc, it.mv, amounts(it, p.sex), kgOf(it));
  if (!p.capped) for (const it of allItems.filter((i) => i.phase === "buy_out")) add(acc, it.mv, amounts(it, p.sex), kgOf(it));

  switch (rx.format) {
    case "amrap":
    case "amreps": {
      if (rx.rep_scheme?.length) {
        // schéma variable : on avance tour par tour jusqu'à épuiser le score
        let left = p.value;
        for (let r = 0; left > 0 && r < 500; r++) {
          const seq = roundSeq(r);
          if (!seq.some((x) => x.q)) break;
          for (const { it, a, q } of seq) { if (left <= 0) break; const done = Math.min(q, left); part(it, a, q, done); left -= done; }
        }
      } else {
        const rpr = items.reduce((s, it) => s + qtyOf(it), 0);
        const full = rpr ? Math.floor(p.value / rpr) : 0;
        walk(full, rpr ? p.value - full * rpr : 0);
      }
      break;
    }
    case "for_time":
    case "rft": {
      if (rx.format === "rft" && rx.parts && rx.parts.length > 1) {
        // parties enchaînées : chaque partie × ses tours, dans l'ordre ; au cap on s'arrête où le score s'arrête
        let left = p.capped ? p.value : Infinity;
        for (let k = 0; k < rx.parts.length && left > 0; k++) {
          const seq = roundSeq(0).filter((x) => partOf(x.it, rx) === k + 1);
          for (let r = 0; r < rx.parts[k].rounds && left > 0; r++) {
            for (const { it, a, q } of seq) {
              if (left <= 0) break;
              const done = Math.min(q, left);
              part(it, a, q, done);
              left -= done;
            }
          }
        }
        break;
      }
      const totalRounds = rx.format === "rft" ? n(rx.rounds) ?? 1 : roundsWithScheme;
      if (!p.capped) walk(totalRounds, 0);
      else {
        // time cap : value = reps réalisées, on parcourt round par round
        let left = p.value;
        for (let r = 0; r < totalRounds && left > 0; r++) {
          for (const { it, a, q } of roundSeq(r)) {
            if (left <= 0) break;
            const done = Math.min(q, left);
            part(it, a, q, done);
            left -= done;
          }
        }
      }
      break;
    }
    case "emom": {
      const total = n(rx.rounds) ?? 0;
      if (rx.emom_mode === "alternate" && items.length > 1) {
        for (let k = 0; k < total; k++) { const it = items[k % items.length]; add(acc, it.mv, amountsOf(it), kgOf(it)); }
      } else walk(total, 0);
      break;
    }
    case "intervals":
    case "quality":
      walk(n(rx.rounds) ?? 1, 0);
      break;
    case "tabata":
    case "death_by": {
      // score = reps totales ; réparties à parts égales entre les mouvements
      const share = items.length ? p.value / items.length : 0;
      for (const it of items) {
        const u = primaryUnit(it, p.sex) ?? "reps";
        add(acc, it.mv, { reps: 0, cal: 0, m: 0, s: 0, [u === "reps" ? "reps" : u]: Math.round(share) } as Amounts, kgOf(it));
      }
      break;
    }
  }
  return [...acc.values()].map((r) => ({ ...r, tonnage: Math.round(r.tonnage) }));
}

/** Score automatique des formats séries : charge la plus lourde (réelle ou prescrite). */
export function heaviest(rx: Rx, p: Pick<Performance, "sex" | "maxes" | "detail">): number | null {
  if (p.detail?.sets?.length) return p.detail.sets.reduce<number | null>((b, s) => (s.kg != null && (b == null || s.kg > b) ? Number(s.kg) : b), null);
  let best: number | null = null;
  for (const it of rx.items) for (const s of it.sets ?? []) {
    const kg = loadFor(s, p.sex, p.maxes?.[it.mv] ?? null);
    if (kg != null && (best == null || kg > best)) best = kg;
  }
  return best;
}

/** Nettoie / valide une prescription reçue du formulaire admin. */
export function sanitizeRx(raw: unknown): Rx | string {
  const r = raw as Partial<Rx> | null;
  if (!r || typeof r !== "object" || !r.format || !(r.format in FORMATS)) return "Choisis un format de séance.";
  const pos = (v: unknown, max = 100000) => { const x = n(v); return x != null && x > 0 && x <= max ? x : null; };
  const items: Item[] = (Array.isArray(r.items) ? r.items : []).filter((i) => i && typeof i.mv === "string" && i.mv).slice(0, 30).map((i) => ({
    mv: String(i.mv),
    ...(() => {
      // ancien format qty/unit converti en champs séparés
      const legacy = i.qty != null && i.reps == null && i.cal == null && i.dist_m == null && i.time_s == null;
      const u = (["reps", "cal", "m", "s"] as const).includes(i.unit as Unit) ? (i.unit as Unit) : "reps";
      return {
        reps: legacy && u === "reps" ? pos(i.qty) : pos(i.reps, 10000),
        cal: legacy && u === "cal" ? pos(i.qty) : pos(i.cal, 10000), cal_f: legacy && u === "cal" ? pos(i.qty_f) : pos(i.cal_f, 10000),
        dist_m: legacy && u === "m" ? pos(i.qty) : pos(i.dist_m), dist_f: legacy && u === "m" ? pos(i.qty_f) : pos(i.dist_f),
        time_s: legacy && u === "s" ? pos(i.qty) : pos(i.time_s, 36000),
      };
    })(),
    kg_m: pos(i.kg_m, 500), kg_f: pos(i.kg_f, 500), pct: pos(i.pct, 150), height_cm: pos(i.height_cm, 300),
    sets: Array.isArray(i.sets) ? i.sets.slice(0, 30).map((s) => ({ reps: pos(s.reps, 500) ?? 1, pct: pos(s.pct, 150), kg_m: pos(s.kg_m, 500), kg_f: pos(s.kg_f, 500) })) : undefined,
    note: typeof i.note === "string" && i.note.trim() ? i.note.trim().slice(0, 140) : null,
    video: youtubeId(i.video) ? String(i.video).trim().slice(0, 300) : null,
    phase: i.phase === "buy_in" || i.phase === "buy_out" ? i.phase : null,
    part: pos(i.part, 10),
  }));
  if (!items.length) return "Ajoute au moins un mouvement.";
  const f = r.format;
  if ((f === "max" || f === "sets") && items.some((i) => !i.sets?.length)) return "Chaque mouvement doit avoir au moins une série.";
  const tpl = TEMPLATES.find((t) => t.id === r.variant && t.engine === f) ?? null;
  if ((f === "max" || (f === "death_by" && tpl?.id !== "death_by_multi")) && items.length > 1) return `Le format ${tpl?.label ?? FORMATS[f].label} porte sur un seul mouvement.`;
  if (!tpl?.phases) for (const it of items) it.phase = null;
  const out: Rx = {
    format: f, items,
    rounds: pos(r.rounds, 500), duration_s: pos(r.duration_s, 36000), interval_s: pos(r.interval_s, 3600),
    rep_scheme: Array.isArray(r.rep_scheme) ? r.rep_scheme.map((x) => pos(x, 1000)).filter((x): x is number => x != null).slice(0, 20) : null,
    emom_mode: r.emom_mode === "alternate" ? "alternate" : "all",
    time_cap_s: pos(r.time_cap_s, 36000),
    variant: tpl?.id ?? null,
    parts: null,
  };
  if (tpl?.id === "parts_for_time") {
    const parts = (Array.isArray(r.parts) ? r.parts : []).slice(0, 6).map((pt) => ({ rounds: pos(pt?.rounds, 500) ?? 1, rest_s: pos(pt?.rest_s, 3600) }));
    if (parts.length < 2) return "Ajoute au moins deux parties.";
    out.parts = parts;
    out.rounds = parts.reduce((s, pt) => s + pt.rounds, 0);
    for (const it of out.items) it.part = partOf(it, out);
    for (let k = 1; k <= parts.length; k++) if (!out.items.some((it) => it.part === k)) return `La partie ${k} n'a aucun mouvement.`;
  } else for (const it of out.items) it.part = null;
  if ((f === "amrap" || f === "amreps") && !out.duration_s) return "Indique la durée.";
  if (out.items.every((i) => i.phase)) return "Ajoute au moins un mouvement dans les tours (hors buy-in / buy-out).";
  if ((f === "rft" || f === "intervals" || f === "emom") && !out.rounds) return f === "emom" ? "Indique le nombre de minutes (ou d'intervalles)." : "Indique le nombre de tours.";
  const empty = (i: Item) => primaryUnit(i) == null && !(i.phase == null && out.rep_scheme?.length);
  if (f === "for_time" && !out.rep_scheme?.length && items.some(empty)) return "Indique les reps (ou cal, distance, temps) de chaque mouvement, ou un schéma (ex. 21-15-9).";
  if (["amrap", "amreps", "rft", "emom", "intervals"].includes(f) && items.some(empty)) return "Indique les reps, calories, distance ou temps de chaque mouvement.";
  return out;
}
