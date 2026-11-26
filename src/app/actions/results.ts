"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { parseNum, parseTime, todayParis } from "@/lib/format";
import { requireMe } from "@/lib/session";
import { getMaxes } from "@/lib/data";
import { computeVolume, FORMATS, heaviest, type Detail, type Rx } from "@/lib/prescription";
import type { Metric, ScoreType, Workout } from "@/lib/types";

export type ResultState = { error?: string; ok?: string } | null;

function readValue(kind: Metric | ScoreType, f: FormData, rpr: number | null): number | null {
  const raw = String(f.get("value") ?? "");
  if (kind === "time") return parseTime(raw);
  if (kind === "rounds_reps") {
    const rounds = parseNum(String(f.get("rounds") ?? "0")) ?? 0;
    const reps = parseNum(String(f.get("reps") ?? "0")) ?? 0;
    return rpr ? rounds * rpr + reps : rounds * 1000 + reps; // sans reps/round : ordre lexicographique rounds puis reps
  }
  return parseNum(raw);
}

function common(f: FormData) {
  const performed_on = String(f.get("performed_on") || todayParis());
  const rpe = Number(f.get("rpe")) || null;
  const notes = String(f.get("notes") ?? "").trim().slice(0, 500) || null;
  return { performed_on, rpe: rpe && rpe >= 1 && rpe <= 10 ? rpe : null, notes };
}

export async function addMovementResult(_: ResultState, f: FormData): Promise<ResultState> {
  const me = await requireMe();
  const movement_id = String(f.get("movement_id"));
  const { data: m } = await db().from("movements").select("id,metric").eq("id", movement_id).single();
  if (!m) return { error: "Mouvement introuvable." };
  const value = readValue(m.metric as Metric, f, null);
  if (value == null || value <= 0) return { error: m.metric === "time" ? "Entre un temps au format mm:ss." : "Entre une valeur valide." };
  if (m.metric === "load" && value > 600) return { error: "Charge improbable, vérifie la saisie." };
  const c = common(f);
  if (c.performed_on > todayParis()) return { error: "La date ne peut pas être dans le futur." };
  const { error } = await db().from("results").insert({ athlete_id: me.id, movement_id, value, ...c, bodyweight_kg: me.bodyweight_kg });
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/", "layout");
  return { ok: "Perf enregistrée 💪" };
}

export async function addWorkoutResult(_: ResultState, f: FormData): Promise<ResultState> {
  const me = await requireMe();
  const workout_id = String(f.get("workout_id"));
  const { data: w } = await db().from("workouts").select("id,score_type,reps_per_round,published").eq("id", workout_id).single();
  if (!w || !w.published) return { error: "Séance introuvable." };
  const capped = f.get("capped") === "on" && w.score_type === "time";
  const value = capped ? parseNum(String(f.get("cap_reps") ?? "")) : readValue(w.score_type as ScoreType, f, w.reps_per_round);
  if (w.score_type === "none") {
    // simple validation de séance
  } else if (value == null || (value <= 0 && !capped)) return { error: "Score invalide." };
  const division = ["rx", "scaled", "foundation"].includes(String(f.get("division"))) ? String(f.get("division")) : "rx";
  const c = common(f);
  const { error } = await db().from("results").insert({
    athlete_id: me.id, workout_id, value: value ?? 0, division, capped, ...c, bodyweight_kg: me.bodyweight_kg,
  });
  if (error) return { error: "Enregistrement impossible." };
  revalidatePath("/", "layout");
  return { ok: "Score enregistré 🔥" };
}

export async function deleteResult(id: string) {
  const me = await requireMe();
  let q = db().from("results").delete().eq("id", id);
  // un athlète supprime ses perfs ; le staff peut corriger n'importe quelle perf
  if (me.role === "athlete") q = q.eq("athlete_id", me.id);
  await q;
  revalidatePath("/", "layout");
}

/** Score d'une séance structurée : « comme écrit » ou détail série par série, avec calcul du volume. */
export async function addStructuredResult(_: ResultState, f: FormData): Promise<ResultState> {
  const me = await requireMe();
  const workout_id = String(f.get("workout_id"));
  const { data } = await db().from("workouts").select("*").eq("id", workout_id).single();
  const w = data as Workout | null;
  if (!w || !w.published || !w.format) return { error: "Séance introuvable." };
  const rx: Rx = { format: w.format, items: w.items ?? [], rounds: w.rounds, duration_s: w.duration_s, interval_s: w.interval_s, rep_scheme: w.rep_scheme, emom_mode: w.emom_mode, time_cap_s: w.time_cap_s, variant: w.variant ?? null };
  const as_written = f.get("as_written") !== "off";
  const division = ["rx", "scaled", "foundation"].includes(String(f.get("division"))) ? (String(f.get("division")) as "rx") : "rx";

  // Détail saisi (séries réelles / modifications), nettoyé
  let detail: Detail | null = null;
  try {
    const raw = JSON.parse(String(f.get("detail") || "null")) as Detail | null;
    if (raw) {
      const ids = new Set(rx.items.map((i) => i.mv));
      const pos = (v: unknown, max: number) => { const x = Number(v); return Number.isFinite(x) && x >= 0 && x <= max ? x : null; };
      detail = {
        sets: (raw.sets ?? []).filter((s) => ids.has(s.mv)).slice(0, 60).map((s) => ({ mv: s.mv, reps: pos(s.reps, 500) ?? 0, kg: pos(s.kg, 600) })).filter((s) => s.reps > 0),
        items: Object.fromEntries(Object.entries(raw.items ?? {}).filter(([k]) => ids.has(k)).map(([k, v]) => [k, { qty: pos(v?.qty, 100000), kg: pos(v?.kg, 600) }])),
      };
    }
  } catch { return { error: "Saisie illisible, recharge la page." }; }

  const isSets = rx.format === "sets" || rx.format === "max";
  if (rx.format === "max" && !detail?.sets?.some((s) => s.kg)) return { error: "Indique la charge réussie." };
  if (isSets && !as_written && !detail?.sets?.length) return { error: "Ajoute au moins une série." };
  if (as_written && rx.format !== "max") detail = null;

  const maxes = await getMaxes(me.id, rx.items.map((i) => i.mv));
  const score = FORMATS[rx.format].score;
  let value = 0;
  let capped = false;
  if (isSets) value = heaviest(rx, { sex: me.sex, maxes, detail }) ?? 0;
  else if (score !== "none") {
    capped = f.get("capped") === "on" && score === "time";
    const v = capped ? parseNum(String(f.get("cap_reps") ?? "")) : readValue(score as ScoreType, f, w.reps_per_round);
    if (v == null || v <= 0) return { error: score === "time" && !capped ? "Entre ton temps au format mm:ss." : "Score invalide." };
    value = v;
  }
  const volume = computeVolume(rx, { sex: me.sex, division, value, capped, maxes, detail });
  const c = common(f);
  if (c.performed_on > todayParis()) return { error: "La date ne peut pas être dans le futur." };

  const { error } = await db().from("results").insert({
    athlete_id: me.id, workout_id, value, division, capped, as_written, detail, volume, ...c, bodyweight_kg: me.bodyweight_kg,
  });
  if (error) return { error: "Enregistrement impossible." };

  // Un X Rep Max réussi alimente aussi le profil du mouvement (et donc le niveau) si le test correspond
  if (rx.format === "max" && value > 0) {
    const it = rx.items[0];
    const reps = it.sets?.[0]?.reps ?? 1;
    const { data: m } = await db().from("movements").select("id,metric,test_label").eq("id", it.mv).single();
    if (m?.metric === "load" && (m.test_label ?? "").replace(/\s/g, "").toUpperCase() === `${reps}RM`) {
      await db().from("results").insert({ athlete_id: me.id, movement_id: it.mv, value, ...c, notes: c.notes ?? `Séance : ${w.title}`, bodyweight_kg: me.bodyweight_kg });
    }
  }
  revalidatePath("/", "layout");
  return { ok: as_written ? "Enregistré, comme écrit 🔥" : "Enregistré avec ton détail 🔥" };
}
