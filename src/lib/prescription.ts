/**
 * Séances structurées (façon BTWB) — partagé client / serveur.
 * Une séance = un format + une liste de mouvements prescrits.
 * À partir de la prescription et du score, on calcule le volume réel par mouvement.
 */
import type { Better, Division, ScoreType, Sex } from "./types";

export type Format = "max" | "sets" | "emom" | "amrap" | "for_time" | "rft" | "tabata" | "death_by" | "intervals" | "quality";
export type Unit = "reps" | "cal" | "m" | "s";

/** Une série prescrite (formats max / séries). Charge en % du max OU en kg H/F. */
export type SetRx = { reps: number; pct?: number | null; kg_m?: number | null; kg_f?: number | null };

export type Item = {
  mv: string;                 // id du mouvement
  qty?: number | null;        // quantité par round (reps, cal, m, s)
  qty_f?: number | null;      // quantité femmes si différente (ex. 15/12 cal)
  unit?: Unit;
  kg_m?: number | null;       // charge prescrite hommes
  kg_f?: number | null;       // charge prescrite femmes
  pct?: number | null;        // % du max de l'athlète
  height_cm?: number | null;  // box jump, wall ball…
  sets?: SetRx[];             // formats max / séries
  note?: string | null;
};

export type Rx = {
  format: Format;
  items: Item[];
  rounds?: number | null;        // RFT, tabata, intervalles, EMOM (nb de minutes / intervalles), qualité
  duration_s?: number | null;    // AMRAP
  interval_s?: number | null;    // EMOM « toutes les X », repos des intervalles, travail tabata
  rep_scheme?: number[] | null;  // For time 21-15-9
  emom_mode?: "all" | "alternate" | null;
  time_cap_s?: number | null;
};

export const FORMATS: Record<Format, { label: string; desc: string; group: "single" | "multi"; score: ScoreType; better: Better }> = {
  max:       { label: "X Rep Max",      desc: "Une série unique, la plus lourde possible.",            group: "single", score: "load",        better: "higher" },
  sets:      { label: "Séries",         desc: "Séries et répétitions, charge en kg ou en % du max.",   group: "single", score: "load",        better: "higher" },
  death_by:  { label: "Death By",       desc: "Une rep de plus chaque minute, jusqu'à l'échec.",       group: "single", score: "reps",        better: "higher" },
  emom:      { label: "EMOM",           desc: "Chaque minute sur la minute.",                          group: "multi",  score: "none",        better: "higher" },
  amrap:     { label: "AMRAP",          desc: "Autant de tours que possible.",                         group: "multi",  score: "rounds_reps", better: "higher" },
  for_time:  { label: "For Time",       desc: "Tout le travail le plus vite possible (ex. 21-15-9).",  group: "multi",  score: "time",        better: "lower" },
  rft:       { label: "Rounds For Time", desc: "Un nombre de tours, pour le temps.",                   group: "multi",  score: "time",        better: "lower" },
  tabata:    { label: "Tabata",         desc: "20 s de travail / 10 s de repos, score en reps.",       group: "multi",  score: "reps",        better: "higher" },
  intervals: { label: "Intervalles",    desc: "Blocs répétés avec repos, temps total.",                group: "multi",  score: "time",        better: "lower" },
  quality:   { label: "Pour la qualité", desc: "Pas de score : technique et qualité d'exécution.",     group: "multi",  score: "none",        better: "higher" },
};

export const UNIT_LABEL: Record<Unit, string> = { reps: "reps", cal: "cal", m: "m", s: "s" };

const n = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const fmtNum = (v: number) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10).replace(".", ","));
const fmtDur = (s: number) => (s % 60 === 0 ? `${s / 60} min` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);

/** Reps par round (pour convertir rounds + reps en total sur un AMRAP). */
export function repsPerRound(rx: Rx, sex: Sex = "M"): number {
  return rx.items.reduce((s, it) => s + (qtyFor(it, sex) ?? 0), 0);
}

export function qtyFor(it: Item, sex: Sex): number | null {
  return n(sex === "F" && it.qty_f != null ? it.qty_f : it.qty);
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
  const unit = it.unit ?? "reps";
  const q = n(it.qty), qf = n(it.qty_f);
  let qty = "";
  if (!opts.scheme && q != null) {
    const v = qf != null && qf !== q ? `${fmtNum(q)}/${fmtNum(qf)}` : fmtNum(q);
    qty = unit === "reps" ? `${v} ` : unit === "s" ? `${fmtDur(q)} ` : `${v} ${UNIT_LABEL[unit]} `;
  }
  let s = `${qty}${name}`.trim();
  const l = loadText(it);
  if (l) s += l.startsWith("@") ? ` ${l}` : `, ${l}`;
  if (n(it.height_cm) != null) s += `, ${fmtNum(n(it.height_cm)!)} cm`;
  if (it.note) s += ` — ${it.note}`;
  return s;
}

export function describe(rx: Rx, nameOf: (id: string) => string): string {
  const L: string[] = [];
  const items = rx.items.filter((i) => i.mv);
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
      if (items[0]) L.push(`Death by ${nameOf(items[0].mv)}`, `Minute 1 : ${fmtNum(n(items[0].qty) ?? 1)} rep, puis +${fmtNum(n(items[0].qty) ?? 1)} chaque minute jusqu'à l'échec.`);
      if (items[0] && loadText(items[0])) L.push(loadText(items[0]));
      break;
    case "emom":
      L.push(itv && itv !== 60 ? `Toutes les ${fmtDur(itv)} × ${rounds ?? "?"}` : `EMOM ${rounds ?? "?"} min`);
      if (rx.emom_mode === "alternate" && items.length > 1) L.push("En alternant :");
      items.forEach((it, i) => L.push(`${rx.emom_mode === "alternate" && items.length > 1 ? `Min ${i + 1} : ` : ""}${itemText(it, nameOf(it.mv))}`));
      break;
    case "amrap":
      L.push(`AMRAP ${dur ? fmtDur(dur) : "?"}`);
      items.forEach((it) => L.push(itemText(it, nameOf(it.mv))));
      break;
    case "for_time": {
      const scheme = rx.rep_scheme?.length ? rx.rep_scheme : null;
      L.push(scheme ? `For time : ${scheme.join("-")}` : "For time");
      items.forEach((it) => L.push(itemText(it, nameOf(it.mv), { scheme: !!scheme && it.qty == null })));
      break;
    }
    case "rft":
      L.push(`${rounds ?? "?"} rounds for time`);
      items.forEach((it) => L.push(itemText(it, nameOf(it.mv))));
      break;
    case "tabata":
      L.push(`Tabata : ${rounds ?? 8} × ${itv ?? 20} s de travail / 10 s de repos`);
      items.forEach((it) => L.push(itemText(it, nameOf(it.mv), { scheme: true })));
      break;
    case "intervals":
      L.push(`${rounds ?? "?"} intervalles${itv ? `, repos ${fmtDur(itv)}` : ""}`);
      items.forEach((it) => L.push(itemText(it, nameOf(it.mv))));
      break;
    case "quality":
      L.push(rounds && rounds > 1 ? `${rounds} tours, pour la qualité` : "Pour la qualité");
      items.forEach((it) => L.push(itemText(it, nameOf(it.mv))));
      break;
  }
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
function add(acc: Acc, mv: string, unit: Unit, qty: number, kg: number | null) {
  if (!mv || !qty) return;
  const r = acc.get(mv) ?? { mv, reps: 0, cal: 0, m: 0, s: 0, kg: null, tonnage: 0 };
  if (unit === "reps") r.reps += qty;
  else if (unit === "cal") r.cal += qty;
  else if (unit === "m") r.m += qty;
  else r.s += qty;
  if (kg != null) {
    r.kg = Math.max(r.kg ?? 0, kg);
    if (unit === "reps") r.tonnage += qty * kg;
  }
  acc.set(mv, r);
}

export function computeVolume(rx: Rx, p: Performance): VolumeRow[] {
  const acc: Acc = new Map();
  const items = rx.items.filter((i) => i.mv);
  const maxOf = (it: Item) => p.maxes?.[it.mv] ?? null;
  const mod = (it: Item) => p.detail?.items?.[it.mv];
  // charge utilisée : modifiée > prescrite (RX uniquement, sinon inconnue)
  const kgOf = (it: Item) => {
    const m = mod(it);
    if (m?.kg != null) return Number(m.kg);
    return p.division === "rx" ? loadFor(it, p.sex, maxOf(it)) : null;
  };
  const qtyOf = (it: Item) => {
    const m = mod(it);
    return m?.qty != null ? Number(m.qty) : qtyFor(it, p.sex) ?? 0;
  };
  const unitOf = (it: Item) => it.unit ?? "reps";

  // Formats séries : on compte chaque série (réelle si détaillée, sinon prescrite)
  if (rx.format === "sets" || rx.format === "max") {
    if (p.detail?.sets?.length) {
      for (const s of p.detail.sets) add(acc, s.mv, "reps", Number(s.reps) || 0, s.kg != null ? Number(s.kg) : null);
    } else {
      for (const it of items) for (const s of it.sets ?? []) add(acc, it.mv, "reps", s.reps, loadFor(s, p.sex, maxOf(it)));
    }
    return [...acc.values()];
  }

  // Un round complet : liste ordonnée (mouvement, unité, quantité)
  const roundSeq = (roundIdx: number) =>
    items.map((it) => {
      const scheme = rx.rep_scheme?.length ? rx.rep_scheme : null;
      const q = scheme && it.qty == null && mod(it)?.qty == null ? scheme[roundIdx] ?? 0 : qtyOf(it);
      return { it, q };
    });

  // Répartit un total de « reps » dans l'ordre de la séance (AMRAP, time cap)
  const walk = (totalRounds: number, extra: number) => {
    for (let r = 0; r < totalRounds; r++) for (const { it, q } of roundSeq(r)) add(acc, it.mv, unitOf(it), q, kgOf(it));
    let left = extra;
    for (const { it, q } of roundSeq(totalRounds)) {
      if (left <= 0) break;
      const done = Math.min(q, left);
      add(acc, it.mv, unitOf(it), done, kgOf(it));
      left -= done;
    }
  };

  const roundsWithScheme = rx.rep_scheme?.length ? rx.rep_scheme.length : 1;

  switch (rx.format) {
    case "amrap": {
      const rpr = items.reduce((s, it) => s + qtyOf(it), 0);
      const full = rpr ? Math.floor(p.value / rpr) : 0;
      walk(full, rpr ? p.value - full * rpr : 0);
      break;
    }
    case "for_time":
    case "rft": {
      const totalRounds = rx.format === "rft" ? n(rx.rounds) ?? 1 : roundsWithScheme;
      if (!p.capped) walk(totalRounds, 0);
      else {
        // time cap : value = reps réalisées, on parcourt round par round
        let left = p.value;
        for (let r = 0; r < totalRounds && left > 0; r++) {
          for (const { it, q } of roundSeq(r)) {
            if (left <= 0) break;
            const done = Math.min(q, left);
            add(acc, it.mv, unitOf(it), done, kgOf(it));
            left -= done;
          }
        }
      }
      break;
    }
    case "emom": {
      const total = n(rx.rounds) ?? 0;
      if (rx.emom_mode === "alternate" && items.length > 1) {
        for (let k = 0; k < total; k++) { const it = items[k % items.length]; add(acc, it.mv, unitOf(it), qtyOf(it), kgOf(it)); }
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
      for (const it of items) add(acc, it.mv, "reps", Math.round(share), kgOf(it));
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
    qty: pos(i.qty), qty_f: pos(i.qty_f),
    unit: (["reps", "cal", "m", "s"] as const).includes(i.unit as Unit) ? (i.unit as Unit) : "reps",
    kg_m: pos(i.kg_m, 500), kg_f: pos(i.kg_f, 500), pct: pos(i.pct, 150), height_cm: pos(i.height_cm, 300),
    sets: Array.isArray(i.sets) ? i.sets.slice(0, 30).map((s) => ({ reps: pos(s.reps, 500) ?? 1, pct: pos(s.pct, 150), kg_m: pos(s.kg_m, 500), kg_f: pos(s.kg_f, 500) })) : undefined,
    note: typeof i.note === "string" && i.note.trim() ? i.note.trim().slice(0, 140) : null,
  }));
  if (!items.length) return "Ajoute au moins un mouvement.";
  const f = r.format;
  if ((f === "max" || f === "sets") && items.some((i) => !i.sets?.length)) return "Chaque mouvement doit avoir au moins une série.";
  if ((f === "max" || f === "death_by") && items.length > 1) return `Le format ${FORMATS[f].label} porte sur un seul mouvement.`;
  const out: Rx = {
    format: f, items,
    rounds: pos(r.rounds, 500), duration_s: pos(r.duration_s, 36000), interval_s: pos(r.interval_s, 3600),
    rep_scheme: Array.isArray(r.rep_scheme) ? r.rep_scheme.map((x) => pos(x, 1000)).filter((x): x is number => x != null).slice(0, 20) : null,
    emom_mode: r.emom_mode === "alternate" ? "alternate" : "all",
    time_cap_s: pos(r.time_cap_s, 36000),
  };
  if (f === "amrap" && !out.duration_s) return "Indique la durée de l'AMRAP.";
  if ((f === "rft" || f === "intervals" || f === "emom") && !out.rounds) return f === "emom" ? "Indique le nombre de minutes (ou d'intervalles)." : "Indique le nombre de tours.";
  if (f === "for_time" && !out.rep_scheme?.length && items.some((i) => i.qty == null)) return "Indique les reps de chaque mouvement, ou un schéma (ex. 21-15-9).";
  if (["amrap", "rft", "emom", "intervals"].includes(f) && items.some((i) => i.qty == null)) return "Indique la quantité de chaque mouvement.";
  return out;
}
