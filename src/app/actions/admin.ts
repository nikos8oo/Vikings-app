"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { parseNum, parseTime } from "@/lib/format";
import { requireAdmin, requireStaff } from "@/lib/session";
import type { Anchors } from "@/lib/types";

export type AdminState = { error?: string; ok?: string } | null;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const KEYS = ["100", "90", "75", "60", "40"] as const;
const SOURCES = ["vikings", "competition", "affiliates", "qualif", "benchmark"];
const SCORE_TYPES = ["time", "rounds_reps", "reps", "load", "calories", "distance", "none"];

/** Lit un barème depuis le formulaire (préfixe am_ / af_). Vide = pas de barème. */
function readAnchors(f: FormData, prefix: string, isTime: boolean): Anchors | null | "invalid" {
  const vals = KEYS.map((k) => str(f, `${prefix}${k}`));
  if (vals.every((v) => !v)) return null;
  const nums = vals.map((v) => (isTime ? parseTime(v) : parseNum(v)));
  if (nums.some((n) => n == null)) return "invalid";
  return Object.fromEntries(KEYS.map((k, i) => [k, nums[i]])) as Anchors;
}

function monotone(a: Anchors, better: string) {
  const v = KEYS.map((k) => a[k]); // 100 → 40
  for (let i = 0; i < v.length - 1; i++) {
    if (better === "higher" ? v[i] < v[i + 1] : v[i] > v[i + 1]) return false;
  }
  return true;
}

export async function saveWorkout(_: AdminState, f: FormData): Promise<AdminState> {
  const me = await requireStaff();
  const id = str(f, "id");
  const title = str(f, "title");
  const score_type = str(f, "score_type");
  const source = str(f, "source");
  if (!title) return { error: "Titre obligatoire." };
  if (!SOURCES.includes(source)) return { error: "Source invalide." };
  if (!SCORE_TYPES.includes(score_type)) return { error: "Type de score invalide." };
  const better = score_type === "time" ? "lower" : "higher";
  const cap = str(f, "time_cap") ? parseTime(str(f, "time_cap")) : null;
  const am = readAnchors(f, "am_", score_type === "time");
  const af = readAnchors(f, "af_", score_type === "time");
  if (am === "invalid" || af === "invalid") return { error: "Barème : remplis les 5 paliers (ou aucun)." };
  if ((am && !monotone(am, better)) || (af && !monotone(af, better))) return { error: "Barème : les paliers doivent progresser de Fitness vers Games." };
  const counts = f.get("counts_in_level") === "on";
  if (counts && (!am || !af)) return { error: "Pour compter dans le niveau, remplis les barèmes hommes et femmes." };
  const row = {
    title,
    source,
    workout_date: str(f, "workout_date") || undefined,
    description: str(f, "description"),
    coach_notes: str(f, "coach_notes") || null,
    score_type,
    better,
    reps_per_round: parseNum(str(f, "reps_per_round")) || null,
    time_cap_s: cap,
    movement_id: str(f, "movement_id") || null,
    movements: f.getAll("movements").map(String).filter(Boolean),
    anchors_m: am,
    anchors_f: af,
    counts_in_level: counts,
    published: f.get("published") === "on",
  };
  if (id) {
    const { error } = await db().from("workouts").update(row).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await db().from("workouts").insert({ ...row, created_by: me.id }).select("id").single();
    if (error) return { error: error.message };
    revalidatePath("/", "layout");
    redirect(`/admin/seances/${data.id}?ok=1`);
  }
  revalidatePath("/", "layout");
  return { ok: "Séance enregistrée." };
}

export async function deleteWorkout(id: string) {
  await requireStaff();
  await db().from("workouts").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/admin/seances");
}

export async function saveAnchors(_: AdminState, f: FormData): Promise<AdminState> {
  await requireAdmin();
  const id = str(f, "id");
  const kind = str(f, "kind");
  const table = kind === "workout" ? "workouts" : "movements";
  const { data: cur } = await db().from(table).select(kind === "workout" ? "better,score_type" : "better,metric").eq("id", id).single();
  if (!cur) return { error: "Introuvable." };
  const c = cur as unknown as { better: string; metric?: string; score_type?: string };
  const isTime = (c.metric ?? c.score_type) === "time" && c.better === "lower";
  const am = readAnchors(f, "am_", isTime), af = readAnchors(f, "af_", isTime);
  if (am === "invalid" || af === "invalid") return { error: "Remplis les 5 paliers." };
  if ((am && !monotone(am, c.better)) || (af && !monotone(af, c.better))) return { error: "Les paliers doivent progresser de Fitness vers Games." };
  const patch: Record<string, unknown> = { anchors_m: am, anchors_f: af };
  if (kind === "movement") patch.weight_in_level = Math.min(1, Math.max(0.1, parseNum(str(f, "weight")) ?? 1));
  else patch.counts_in_level = !!(am && af);
  const { error } = await db().from(table).update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: "Barème enregistré." };
}

export async function saveBox(_: AdminState, f: FormData): Promise<AdminState> {
  await requireStaff();
  const id = str(f, "id"), name = str(f, "name");
  if (!name) return { error: "Nom obligatoire." };
  const row = { name, city: str(f, "city") || null, is_affiliate: f.get("is_affiliate") === "on" };
  const { error } = id ? await db().from("boxes").update(row).eq("id", id) : await db().from("boxes").insert(row);
  if (error) return { error: error.code === "23505" ? "Cette box existe déjà." : error.message };
  revalidatePath("/", "layout");
  return { ok: id ? "Box mise à jour." : "Box ajoutée." };
}

export async function deleteBox(id: string) {
  await requireAdmin();
  await db().from("boxes").delete().eq("id", id);
  revalidatePath("/", "layout");
}

export async function setRole(athleteId: string, role: string) {
  const me = await requireAdmin();
  if (!["athlete", "coach", "admin"].includes(role) || athleteId === me.id) return;
  await db().from("athletes").update({ role }).eq("id", athleteId);
  revalidatePath("/admin", "layout");
}

const METRICS = ["load", "reps", "time", "distance", "calories", "height"];
const CATEGORIES = ["halterophilie", "force", "gymnastique", "engine", "haltere_kb", "renfo", "core", "strongman"];

/** Ajout d'un mouvement au référentiel (admin). */
export async function createMovement(_: AdminState, f: FormData): Promise<AdminState> {
  await requireAdmin();
  const name = str(f, "name");
  const category = str(f, "category");
  const metric = str(f, "metric");
  if (!name) return { error: "Nom obligatoire." };
  if (!CATEGORIES.includes(category)) return { error: "Catégorie invalide." };
  if (!METRICS.includes(metric)) return { error: "Mesure invalide." };
  const id = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!id) return { error: "Nom invalide." };
  const holdTime = metric === "time" && f.get("time_higher") === "on";
  const { error } = await db().from("movements").insert({
    id, name, category, metric,
    family: str(f, "family") || null,
    equipment: str(f, "equipment") || null,
    test_label: str(f, "test_label") || null,
    better: metric === "time" && !holdTime ? "lower" : "higher",
    sort: 9999,
  });
  if (error) return { error: error.code === "23505" ? "Ce mouvement existe déjà." : error.message };
  revalidatePath("/", "layout");
  return { ok: `${name} ajouté. Tu peux maintenant lui donner un barème.` };
}

export async function setMovementActive(id: string, active: boolean) {
  await requireAdmin();
  await db().from("movements").update({ active }).eq("id", id);
  revalidatePath("/", "layout");
}
