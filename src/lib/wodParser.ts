/**
 * Lecture d'un WOD collé en texte (Strivee, BTWB, WhatsApp, notes…) → bloc structuré.
 * Analyse prudente : chaque ligne reçoit un niveau de confiance, rien n'est inventé.
 * Ce qui n'est pas un mouvement (consignes, repos, objectifs) part dans les notes coach.
 */
import type { AdaptLevel, Item, LevelRx, Rx, SetRx } from "./prescription";

export type MvLite = { id: string; name: string; category?: string };
export type Confidence = "ok" | "check" | "unknown";
export type ParsedLine = { raw: string; item: Item; mv: string | null; confidence: Confidence; candidates: { id: string; name: string; score: number }[]; adapt?: Partial<Record<AdaptLevel, string>> };
export type ParseResult = { rx: Rx; lines: ParsedLine[]; notes: string[]; title: string | null; summary: string; warnings: string[] };

/* ---------- Normalisation ---------- */

const ALIASES: [RegExp, string][] = [
  [/\bt2b\b|\bttb\b/g, "toes to bar"], [/\bc2b\b|\bctb\b/g, "chest to bar"], [/\bk2e\b|\bkte\b/g, "knees to elbow"],
  [/\bs?hspus?\b/g, "handstand push up"], [/\bhsw\b/g, "handstand walk"], [/\bhs\b/g, "handstand"],
  [/\bdus?\b|\bdouble[- ]?unders?\b/g, "double under"], [/\bsus?\b|\bsingle[- ]?unders?\b/g, "single under"],
  [/\bbmus?\b/g, "bar muscle up"], [/\brmus?\b/g, "ring muscle up"], [/\bmus?\b/g, "muscle up"],
  [/\bwbs?\b|\bwall ?balls?\b/g, "wall ball"], [/\bstoh\b/g, "shoulder to overhead"], [/\bgtoh\b/g, "ground to overhead"],
  [/\bohs\b/g, "overhead squat"], [/\bovh\b|\boh\b/g, "overhead"], [/\brdl\b/g, "romanian deadlift"], [/\bdl\b|\bdeadlifts?\b/g, "deadlift"],
  [/\bc ?& ?j\b|\bcj\b|\bclean and jerk\b/g, "clean jerk"], [/\bkbs?\b/g, "kettlebell"], [/\bdbs?\b|\bhalt[eè]res?\b/g, "dumbbell"],
  [/\bpull[- ]?ups?\b|\btractions?\b/g, "pull up"], [/\bpush[- ]?ups?\b|\bpompes?\b/g, "push up"], [/\bsit[- ]?ups?\b/g, "sit up"],
  [/\bchin[- ]?ups?\b/g, "chin up"], [/\bstep[- ]?ups?\b/g, "step up"], [/\bv[- ]?ups?\b/g, "v up"],
  [/\becho\b|\bassault\b|\bair ?bike\b/g, "echo bike"], [/\bbike ?erg\b|\bbikeerg\b/g, "bike erg"], [/\bski ?erg\b|\bskierg\b/g, "ski"],
  [/\brameur\b|\browing\b|\bc2\b/g, "row"], [/\bcourse\b|\brunning\b/g, "run"], [/\bnatation\b/g, "swim"],
  [/\bcals?\b|\bkcal\b|\bcalories?\b/g, "cal"], [/\bburpees\b/g, "burpee"], [/\bthrusters\b/g, "thruster"], [/\blunges\b|\bfentes?\b/g, "lunge"],
  [/\bbox jumps\b/g, "box jump"], [/\bsnatches\b/g, "snatch"], [/\bcleans\b/g, "clean"], [/\bsquats\b/g, "squat"],
  [/\bstrict\b|\bstricts\b/g, "strict"], [/&/g, " "],
];
const STOP = new Set(["with", "the", "de", "du", "des", "a", "à", "au", "aux", "les", "le", "la", "et", "en", "and", "or", "ou", "kg", "lb", "lbs", "m", "km",
  "each", "side", "chaque", "par", "x", "reps", "rep", "sur", "pour", "then", "puis", "sec", "s", "min", "charge", "libre", "if", "needed", "ub", "unbroken", "walking", "marchee", "marchees"]);
/** Mots qui changent le mouvement : s'ils sont dans la ligne mais pas dans le nom, ce n'est pas le bon. */
const VARIANTS = new Set(["strict", "kipping", "butterfly", "power", "hang", "high", "low", "squat", "box", "over", "legless", "deficit", "weighted", "pause", "tempo",
  "single", "dual", "ring", "bar", "front", "back", "overhead", "sumo", "romanian", "push", "split", "muscle", "jumping", "banded", "negative", "dumbbell", "kettlebell", "ghd"]);
/** Mouvement « par défaut » quand plusieurs correspondent aussi bien (ex. « pull-ups » = kipping). */
const PREFERRED = new Set(["kipping-pull-up", "kipping-hspu", "run", "row", "ski-erg", "bike-erg", "echo-bike", "clean", "snatch", "push-up", "burpee",
  "wall-ball", "toes-to-bar", "abmat-sit-up", "back-squat", "front-squat", "deadlift", "thruster", "box-jump", "double-under", "kb-swing", "clean-and-jerk", "power-clean", "lunge-bw"]);

const clean = (s: string) => s
  .replace(/[‘’´`]/g, "'").replace(/[“”″]/g, '"').replace(/′/g, "'")
  .replace(/\p{Extended_Pictographic}|️|‍/gu, " ").replace(/^[\s•\-–—*·>#]+/, "").replace(/\s+/g, " ").trim();

function norm(s: string) {
  let t = s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  t = t.replace(/[()[\]{}:;,!?*_#]/g, " ");
  for (const [re, to] of ALIASES) t = t.replace(re, ` ${to} `);
  return t.replace(/-/g, " ").replace(/\s+/g, " ").trim();
}
const tokens = (s: string) => norm(s).split(" ").filter((w) => w && !STOP.has(w) && !/^\d/.test(w)).map((w) => (w === "ups" ? "up" : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));

/* ---------- Correspondance mouvement ---------- */

type Name = { main: string[]; extra: string[]; phrase: string };
type Index = { id: string; name: string; names: Name[] }[];
const toName = (label: string): Name => {
  const extra = [...label.matchAll(/\((.*?)\)/g)].flatMap((m) => tokens(m[1]));
  const main = tokens(label.replace(/\(.*?\)/g, " "));
  return { main, extra, phrase: main.join(" ") };
};
export function indexMovements(mvs: MvLite[]): Index {
  return mvs.map((m) => ({ id: m.id, name: m.name, names: [toName(m.name), toName(m.id.replace(/-/g, " "))].filter((n) => n.main.length) }));
}

export function matchMovement(text: string, idx: Index): { id: string; name: string; score: number }[] {
  const lt = tokens(text);
  if (!lt.length) return [];
  const ls = new Set(lt);
  const phrase = ` ${lt.join(" ")} `;
  const scoreOf = (n: Name) => {
    const hit = n.main.filter((t) => ls.has(t)).length;
    const xhit = n.extra.filter((t) => ls.has(t)).length;
    const cover = hit / n.main.length;               // part du nom retrouvée dans la ligne
    const prec = Math.min(1, (hit + xhit) / lt.length); // part de la ligne expliquée par le nom
    let s = cover * 0.65 + prec * 0.35;
    if (n.phrase && phrase.includes(` ${n.phrase} `)) s += 0.15;
    if (xhit) s += 0.05;
    const all = new Set([...n.main, ...n.extra]);
    s -= 0.08 * lt.filter((t) => VARIANTS.has(t) && !all.has(t)).length;  // « strict » dans la ligne, absent du nom
    if (cover < 1) s -= 0.1;                         // un mot du nom manque
    return s;
  };
  const out = idx.map((m) => {
    let sc = Math.max(0, ...m.names.map(scoreOf));
    if (/-\d|\d(?:min|k)?$/.test(m.id)) sc -= 0.2;   // tests chronométrés (row-500, run-5k…) : jamais par défaut
    if (PREFERRED.has(m.id)) sc += 0.02;
    return { id: m.id, name: m.name, raw: sc };
  }).filter((c) => c.raw > 0.2).sort((a, b) => b.raw - a.raw || a.name.length - b.name.length).slice(0, 5);
  // Deux mouvements presque à égalité : on demande de vérifier
  const close = out.length > 1 && out[0].raw - out[1].raw < 0.1 && !(PREFERRED.has(out[0].id) && !PREFERRED.has(out[1].id));
  return out.map((c, i) => ({ id: c.id, name: c.name, score: Math.round(Math.min(i === 0 && close ? 0.69 : 1, c.raw) * 100) / 100 }));
}

/* ---------- Nombres ---------- */

const num = (s?: string | null) => (s == null ? null : Number(s.replace(",", ".")));
/** « 1'30 », « 1:30 », « 90" », « 2' », « 45s », « 2 min » → secondes */
function seconds(s: string): number | null {
  const t = s.trim().toLowerCase();
  let m = t.match(/^(\d+)\s*(?:'|:|min)\s*(\d{1,2})\s*(?:"|s)?$/); if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = t.match(/^(\d+)\s*(?:'|min|mins|minutes?)$/); if (m) return Number(m[1]) * 60;
  m = t.match(/^(\d+)\s*(?:"|''|s|sec|secondes?)$/); if (m) return Number(m[1]);
  return null;
}
const DUR = String.raw`(\d+\s*(?:'|:|min)\s*\d{1,2}\s*(?:"|s)?|\d+\s*(?:'|min|mins|minutes?|"|''|s|sec)(?![a-z]))`;

/* ---------- Lignes d'en-tête (format) ---------- */

type Head = Partial<Rx> & { setsCount?: number; maxReps?: number; why?: string };
function readHeader(line: string): Head | null {
  const l = line.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'");
  let m: RegExpMatchArray | null;
  const capM = l.match(new RegExp(String.raw`(?:time ?cap|\btc\b|\bcap\b)\s*[:=]?\s*${DUR}`));
  const cap = capM ? seconds(capM[1]) : null;
  const head: Head = {};
  if (cap) head.time_cap_s = cap;

  if ((m = l.match(new RegExp(String.raw`\bamrap\s*(?:de\s*|of\s*)?${DUR}`))) || (m = l.match(new RegExp(String.raw`${DUR}\s*amrap\b`)))) {
    return { ...head, format: "amrap", duration_s: seconds(m[1]), variant: "amrap", why: `AMRAP` };
  }
  if ((m = l.match(/\bamrap\s*(\d+)\b/))) return { ...head, format: "amrap", duration_s: Number(m[1]) * 60, variant: "amrap", why: "AMRAP" };
  if ((m = l.match(/\be(\d)m(?:om)?\b\s*(?:x\s*)?(\d+)?/))) {
    const every = Number(m[1]) * 60; const total = m[2] ? Number(m[2]) : null;
    return { ...head, format: "emom", interval_s: every, rounds: total ? Math.max(1, Math.round((total * 60) / every)) : null, variant: "emom_all", why: "EMOM" };
  }
  if ((m = l.match(/\bemom\b\s*(?:de\s*)?(\d+)/))) return { ...head, format: "emom", interval_s: 60, rounds: Number(m[1]), variant: "emom_all", why: "EMOM" };
  if ((m = l.match(new RegExp(String.raw`(?:every|toutes les|chaque|tous les)\s*${DUR}\s*(?:x|pendant|for)\s*(\d+)`)))) {
    return { ...head, format: "emom", interval_s: seconds(m[1]), rounds: Number(m[2]), variant: "emom_all", why: "Every X" };
  }
  if (/\btabata\b/.test(l)) return { ...head, format: "tabata", rounds: 8, interval_s: 20, variant: "tabata", why: "Tabata" };
  if ((m = l.match(/\bdeath ?by\b/))) return { ...head, format: "death_by", interval_s: 60, variant: "death_by", why: "Death by" };
  if ((m = l.match(/\b(?:find|trouve[rz]?|build to|monte[rz]? (?:a|jusqu'a))?\s*(?:a\s*)?(\d+)\s*rm\b/)) && !/%/.test(l) && !/semaine|week|sem\b/.test(l)) {
    return { ...head, format: "max", maxReps: Number(m[1]), variant: "max", why: `${m[1]}RM` };
  }
  if ((m = l.match(/(?:for time|pour le temps)\s*:?\s*(\d+(?:\s*-\s*\d+){1,})/))) {
    return { ...head, format: "for_time", rep_scheme: m[1].split("-").map((x) => Number(x.trim())), variant: "tft", why: "Schéma de reps" };
  }
  if ((m = l.match(/^(\d+(?:\s*-\s*\d+){1,})\s*(?:reps?)?\s*(?:for time|pour le temps|ft\b|:)?\s*$/)) || (m = l.match(/(\d+(?:\s*-\s*\d+){1,})\s*(?:reps?\s*)?(?:for time|pour le temps)/))) {
    return { ...head, format: "for_time", rep_scheme: m[1].split("-").map((x) => Number(x.trim())), variant: "tft", why: "Schéma de reps" };
  }
  if ((m = l.match(/(\d+)\s*(?:rounds?|rds?|tours?)\s*(?:for time|pour le temps|ft\b)/)) || (m = l.match(/(\d+)\s*rft\b/))) {
    return { ...head, format: "rft", rounds: Number(m[1]), variant: "rft", why: "Rounds for time" };
  }
  if (/\b(for time|pour le temps)\b/.test(l)) return { ...head, format: "for_time", variant: "for_time", why: "For time" };
  if ((m = l.match(/^(\d+)\s*(?:sets?|series?)\b/))) return { ...head, setsCount: Number(m[1]), why: "Séries" };
  if ((m = l.match(/^(\d+)\s*(?:rounds?|tours?|rds?)\b/))) return { ...head, format: "quality", rounds: Number(m[1]), variant: "quality", why: "Tours" };
  if (cap) return head;
  return null;
}

/* ---------- Lignes de mouvement ---------- */

type Qty = Pick<Item, "reps" | "cal" | "cal_f" | "dist_m" | "dist_f" | "time_s" | "kg_m" | "kg_f" | "pct" | "height_cm" | "note"> & { setsXreps?: [number, number] };

function readQuantity(line: string): { q: Qty; rest: string } | null {
  let s = line;
  const q: Qty = {};
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d+)\s*[x×]\s*(\d+)\s+(.+)$/i))) { q.setsXreps = [Number(m[1]), Number(m[2])]; s = m[3]; }
  else if ((m = s.match(/^([a-zà-ÿ][^@\d]{2,}?)\s+(\d+)\s*[x×]\s*(\d+)\b(.*)$/i))) { q.setsXreps = [Number(m[2]), Number(m[3])]; s = `${m[1]} ${m[4]}`; }
  else if ((m = s.match(/^(\d+)\s*(?:-|à|a)\s*(\d+)\s+([a-zà-ÿ].+)$/i))) { q.reps = Number(m[1]); q.note = `${m[1]}-${m[2]} reps`; s = m[3]; }
  else if ((m = s.match(/^(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+(?:[.,]\d+)?))?\s*(?:cals?|kcal|calories?)\b\.?\s*(.+)$/i))) { q.cal = num(m[1]); q.cal_f = num(m[2]); s = m[3]; }
  else if ((m = s.match(/^(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+(?:[.,]\d+)?))?\s*(km|m)\b\.?\s*(.+)$/i))) {
    const k = m[3].toLowerCase() === "km" ? 1000 : 1; q.dist_m = num(m[1])! * k; q.dist_f = m[2] ? num(m[2])! * k : null; s = m[4];
  }
  else if ((m = s.match(new RegExp(String.raw`^${DUR}\s+(.+)$`, "i")))) { q.time_s = seconds(m[1]); s = m[2]; }
  else if ((m = s.match(/^(\d+)\s*\+\s*(\d+)\s+(.+)$/))) { q.reps = Number(m[1]) + Number(m[2]); q.note = `${m[1]}+${m[2]}`; s = m[3]; }
  else if ((m = s.match(/^(\d+)(?:\s*\/\s*(\d+))?\s*(?:reps?\s+)?([a-zà-ÿ].+)$/i))) { q.reps = Number(m[1]); s = m[3]; }
  else if (/^max\s/i.test(s)) { q.note = "Max"; s = s.replace(/^max\s+(?:reps?\s+)?/i, ""); }
  else return null;
  return extras(s, q);
}

/** Charges, %, hauteur dans la suite de la ligne + nom du mouvement. */
function extras(tail: string, q: Qty = {}): { q: Qty; rest: string } {
  let m: RegExpMatchArray | null;
  if ((m = tail.match(/@\s*(\d+(?:[.,]\d+)?)\s*%/)) || (m = tail.match(/(\d+(?:[.,]\d+)?)\s*%/))) q.pct = num(m[1]);
  if ((m = tail.match(/(?:2\s*x\s*)?(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*(kg|lbs?)\b/i)) || (m = tail.match(/[@,]\s*(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)(?!\s*(?:cm|"|''|in|%))/))) {
    const f = m[3] && /lb/i.test(m[3]) ? 0.4536 : 1; q.kg_m = Math.round(num(m[1])! * f * 2) / 2; q.kg_f = Math.round(num(m[2])! * f * 2) / 2;
  } else if ((m = tail.match(/(?:@\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/i))) q.kg_m = num(m[1]);
  if ((m = tail.match(/(\d+)\s*\/\s*(\d+)\s*(?:"|''|in(?:ch)?)/))) q.height_cm = Math.round(Number(m[1]) * 2.54);
  else if ((m = tail.match(/(\d+)\s*cm\b/i))) q.height_cm = Number(m[1]);
  if (q.pct != null) { q.kg_m = null; q.kg_f = null; }
  // Nom = début de la suite, avant les charges / consignes
  const name = tail.split(/\s@|\s\(|,|\s-\s|\s\/\s|\d+(?:[.,]\d+)?\s*(?:kg|%|lbs?)\b|\d+\s*\/\s*\d+/i)[0].trim();
  return { q, rest: name || tail };
}

const NOTE_HINT = /^(rest|repos|target|focus|objectif|note|key points?|tips?|cue|scaling|scale|option|fitness|inter|rx\b|rx\+|sem(?:aine)?\s*\d|week|w\d|set\s*\d|then|puis|si |if |on |nous |vous |le |la |les |un |une |pour |avec |chaque )/i;

/* ---------- Analyse complète ---------- */

export function parseWod(text: string, mvs: MvLite[]): ParseResult {
  const idx = indexMovements(mvs.filter((m) => m.category !== "mobilite" || true));
  const rawLines = text.split(/\r?\n/).map(clean).filter(Boolean);
  let head: Head = {};
  const lines: ParsedLine[] = [];
  const push = (l: ParsedLine) => { if (partsDef.length) l.item.part = partsDef.length; lines.push(l); };
  const notes: string[] = [];
  const warnings: string[] = [];
  const setPcts: number[] = [];
  let title: string | null = null;
  let alternate = false;
  // Séance en plusieurs parties (6 RFT → 3 RFT…)
  const partsDef: { rounds: number; rest_s: number | null }[] = [];
  let pendingRest: number | null = null;

  const adaptLines: { level: AdaptLevel; text: string }[] = [];
  rawLines.forEach((raw, i) => {
    // « Fitness : 10 knees push up / 10 sit up » → adaptations par mouvement
    const ad = raw.match(/^(elite|rx\s*\+|inter(?:m[ée]diaire)?|scaled|fitness|foundation|d[ée]butant)\s*:\s*(.+)$/i);
    if (ad) {
      const k = ad[1].toLowerCase().replace(/\s/g, "");
      const level: AdaptLevel = k === "elite" || k === "rx+" ? "elite" : k.startsWith("inter") || k === "scaled" ? "inter" : "fitness";
      adaptLines.push({ level, text: ad[2] });
      return;
    }
    // Séparateurs entre parties : « --- directly into --- », « puis », « Rest 2' »…
    if (/^[-–—=_*\s]*(?:directly into|directement|enchain\w*|then|puis|into|-{2,}|—{1,})[-–—=_*\s]*$/i.test(raw)) { pendingRest = null; return; }
    const restM = raw.match(new RegExp(String.raw`^(?:rest|repos|recup\w*)\s*:?\s*${DUR}\s*(?:rest|repos)?$|^${DUR}\s*(?:de\s*)?(?:rest|repos|recup\w*)$`, "i"));
    if (restM && partsDef.length) { pendingRest = seconds(restM[1] ?? restM[2]); return; }
    const h = readHeader(raw);
    // « Min 1 : … » / « M1 : … » → EMOM en alternance
    const minute = raw.match(/^(?:min(?:ute)?\s*|m)(\d)\s*[:\-–]\s*(.+)$/i);
    if (minute) { alternate = true; raw = minute[2]; }
    const set = raw.match(/^set\s*(\d+)\s*[:\-–]\s*(\d+(?:[.,]\d+)?)\s*%/i);
    if (set) { setPcts.push(num(set[2])!); return; }
    if (h && (h.format || h.setsCount || !readQuantity(raw))) {
      const roundsOf = h.format === "rft" ? h.rounds ?? 1 : h.format === "for_time" && !h.rep_scheme?.length ? 1 : null;
      if (roundsOf != null && partsDef.length && lines.some((l) => l.item.part === partsDef.length)) {
        partsDef[partsDef.length - 1].rest_s = pendingRest; pendingRest = null;
        partsDef.push({ rounds: roundsOf, rest_s: null });
        if (h.time_cap_s) head.time_cap_s = h.time_cap_s;
        return;
      }
      if (roundsOf != null && !partsDef.length && h.format === "rft") partsDef.push({ rounds: roundsOf, rest_s: null });
      head = { ...head, ...h, why: [head.why, h.why].filter(Boolean).join(" · ") };
      if (h.format === "max") {
        const rest = raw.replace(/^.*?\d+\s*rm\b/i, "").trim();
        const c = matchMovement(rest, idx);
        if (c[0] && c[0].score >= 0.45) push({ raw, item: { mv: c[0].id }, mv: c[0].id, confidence: c[0].score >= 0.7 ? "ok" : "check", candidates: c });
      }
      return;
    }

    if (/^\[.*\]$/.test(raw)) { notes.push(raw.replace(/^\[|\]$/g, "").trim()); return; }
    const parsed = readQuantity(raw);
    if (!parsed) {
      const ex = extras(raw);
      const c = matchMovement(ex.rest, idx);
      if (c[0] && c[0].score >= 0.7 && raw.length < 60 && !NOTE_HINT.test(raw)) {
        const { setsXreps: _s, ...q } = ex.q; // eslint-disable-line @typescript-eslint/no-unused-vars
        push({ raw, item: { mv: c[0].id, ...q }, mv: c[0].id, confidence: c[0].score >= 0.85 ? "ok" : "check", candidates: c });
      } else if (i === 0 && raw.length <= 48 && !/\d{2,}/.test(raw.replace(/\[.*?\]/g, ""))) {
        title = raw.replace(/\[.*?\]/g, "").trim();
      } else notes.push(raw);
      return;
    }
    if (NOTE_HINT.test(raw) && !/^\d/.test(raw)) { notes.push(raw); return; }
    const c = matchMovement(parsed.rest, idx);
    const best = c[0];
    const conf: Confidence = !best ? "unknown" : best.score >= 0.7 ? "ok" : best.score >= 0.45 ? "check" : "unknown";
    const { setsXreps, ...q } = parsed.q;
    const item: Item = { mv: best && conf !== "unknown" ? best.id : "", ...q };
    if (setsXreps) item.sets = Array.from({ length: setsXreps[0] }, () => ({ reps: setsXreps[1], pct: q.pct ?? null, kg_m: q.kg_m ?? null, kg_f: q.kg_f ?? null }));
    if (/\brest\b|\brepos\b/i.test(parsed.rest) && conf === "unknown") { notes.push(raw); return; }
    push({ raw, item, mv: item.mv || null, confidence: conf, candidates: c });
  });

  // Adaptations : chaque morceau « / » correspond au mouvement de même rang (ou au mouvement qu'il nomme)
  for (const { level, text } of adaptLines) {
    const chunks = text.split(/\s+[\/|+]\s+|\s*;\s*/).map((c) => c.trim()).filter(Boolean);
    chunks.forEach((chunk, j) => {
      const pq = readQuantity(chunk) ?? extras(chunk);
      const c = matchMovement(pq.rest, idx);
      const same = c[0] ? lines.findIndex((l) => l.mv === c[0].id) : -1;
      const line = lines[same >= 0 ? same : j];
      if (!line) return;
      const q = pq.q;
      const a: LevelRx = {
        mv: c[0] && c[0].score >= 0.6 && c[0].id !== line.mv ? c[0].id : null,
        reps: q.reps ?? null, cal: q.cal ?? null, cal_f: q.cal_f ?? null, dist_m: q.dist_m ?? null, dist_f: q.dist_f ?? null, time_s: q.time_s ?? null,
        kg_m: q.kg_m ?? null, kg_f: q.kg_f ?? null, pct: q.pct ?? null,
      };
      if (!Object.values(a).some((v) => v != null)) return;
      line.item.levels = { ...(line.item.levels ?? {}), [level]: a };
      line.adapt = { ...(line.adapt ?? {}), [level]: chunk };
    });
  }

  // Format final
  let rx: Rx = { format: "for_time", items: [], rounds: null, duration_s: null, interval_s: null, rep_scheme: null, emom_mode: "all", time_cap_s: head.time_cap_s ?? null, variant: "for_time" };
  const items = lines.map((l) => l.item);
  if (partsDef.length > 1) {
    rx = { ...rx, format: "rft", variant: "parts_for_time", parts: partsDef, rounds: partsDef.reduce((a, p) => a + p.rounds, 0), items };
  } else if (head.format === "max") {
    rx = { ...rx, format: "max", variant: "max", items: items.slice(0, 1).map((it) => ({ ...it, sets: [{ reps: head.maxReps ?? 1 }] })) };
  } else if (head.setsCount || items.some((it) => it.sets?.length) || (!head.format && setPcts.length)) {
    const n = head.setsCount ?? setPcts.length ?? 1;
    rx = { ...rx, format: "sets", variant: "sets", items: items.map((it) => it.sets?.length ? it : ({
      ...it, sets: Array.from({ length: Math.max(1, n) }, (_, k) => ({ reps: it.reps ?? 1, pct: setPcts[k] ?? setPcts[setPcts.length - 1] ?? it.pct ?? null, kg_m: it.kg_m ?? null, kg_f: it.kg_f ?? null } as SetRx)),
    })) };
  } else if (head.format) {
    rx = { ...rx, ...head, items, format: head.format, variant: head.variant ?? null } as Rx;
    if (rx.format === "emom" && alternate) { rx.emom_mode = "alternate"; rx.variant = "emom_alt"; }
  } else if (alternate) {
    rx = { ...rx, format: "emom", variant: "emom_alt", emom_mode: "alternate", interval_s: 60, rounds: items.length * 4, items };
    warnings.push("Nombre de minutes de l'EMOM non trouvé : vérifie-le.");
  } else {
    rx.items = items;
    if (items.length) warnings.push("Format non précisé dans le texte : « Pour le temps » par défaut, change-le si besoin.");
  }
  delete (rx as Head).why; delete (rx as Head).setsCount; delete (rx as Head).maxReps;

  if (rx.format === "emom" && !rx.rounds) warnings.push("Nombre d'intervalles de l'EMOM à vérifier.");
  if ((rx.format === "amrap") && !rx.duration_s) warnings.push("Durée de l'AMRAP non trouvée.");
  const unknown = lines.filter((l) => l.confidence === "unknown").length;
  if (unknown) warnings.push(`${unknown} mouvement${unknown > 1 ? "s" : ""} non reconnu${unknown > 1 ? "s" : ""} : choisis-le dans la liste.`);

  const summary = rx.parts && rx.parts.length > 1
    ? rx.parts.map((p, k) => `${p.rounds} RFT${k < rx.parts!.length - 1 ? (p.rest_s ? ` → repos ${Math.round(p.rest_s / 60 * 10) / 10} min →` : " → directement →") : ""}`).join(" ")
    : rx.format === "amrap" ? `AMRAP ${rx.duration_s ? Math.round(rx.duration_s / 60) + " min" : ""}`
    : rx.format === "emom" ? `EMOM ${rx.rounds ?? "?"} × ${rx.interval_s ? (rx.interval_s % 60 ? rx.interval_s + " s" : rx.interval_s / 60 + " min") : "?"}${rx.emom_mode === "alternate" ? " en alternance" : ""}`
    : rx.format === "for_time" ? `For time${rx.rep_scheme?.length ? " " + rx.rep_scheme.join("-") : ""}`
    : rx.format === "rft" ? `${rx.rounds} rounds for time`
    : rx.format === "sets" ? `Séries (${rx.items[0]?.sets?.length ?? "?"})`
    : rx.format === "max" ? `${rx.items[0]?.sets?.[0]?.reps ?? 1}RM`
    : rx.format === "quality" ? `${rx.rounds ?? ""} tours pour la qualité`
    : rx.format === "tabata" ? "Tabata" : rx.format;
  return { rx, lines, notes, title, summary: summary + (rx.time_cap_s ? ` · cap ${Math.round(rx.time_cap_s / 60)} min` : ""), warnings };
}
