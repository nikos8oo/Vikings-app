"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { parseNum, parseTime, todayParis } from "@/lib/format";
import { requireMe } from "@/lib/session";
import type { Metric, ScoreType } from "@/lib/types";

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
