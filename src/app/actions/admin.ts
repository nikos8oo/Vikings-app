"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { parseNum, parseTime, todayParis } from "@/lib/format";
import { requireAdmin, requireStaff } from "@/lib/session";
import { describe, FORMATS, repsPerRound, sanitizeRx, type Rx } from "@/lib/prescription";
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
  const source = str(f, "source");
  const retRaw = str(f, "return");
  const ret = /^\/admin\/seances(\?[\w=&%-]*)?$/.test(retRaw) ? retRaw : null; // retour au planning uniquement
  if (!title) return { error: "Titre obligatoire." };
  if (!SOURCES.includes(source)) return { error: "Source invalide." };

  // Séance structurée (éditeur) : la prescription arrive en JSON
  let rx: Rx | null = null;
  if (str(f, "rx")) {
    let parsed: unknown;
    try { parsed = JSON.parse(str(f, "rx")); } catch { return { error: "Séance illisible, recharge la page." }; }
    const clean = sanitizeRx(parsed);
    if (typeof clean === "string") return { error: clean };
    rx = clean;
    const ids = [...new Set(rx.items.map((i) => i.mv))];
    const { data: known } = await db().from("movements").select("id,name").in("id", ids);
    const names = new Map((known ?? []).map((m) => [m.id as string, m.name as string]));
    if (names.size !== ids.length) return { error: "Un mouvement est inconnu." };
    rx.items = rx.items.map((i) => ({ ...i }));
    (f as FormData).set("description", describe(rx, (id) => names.get(id) ?? id));
  }
  const score_type = rx ? FORMATS[rx.format].score : str(f, "score_type");
  if (!SCORE_TYPES.includes(score_type)) return { error: "Type de score invalide." };
  const better = rx ? FORMATS[rx.format].better : score_type === "time" ? "lower" : "higher";
  const cap = rx ? rx.time_cap_s ?? null : str(f, "time_cap") ? parseTime(str(f, "time_cap")) : null;
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
    reps_per_round: rx ? (rx.format === "amrap" && !rx.rep_scheme?.length ? repsPerRound(rx) || null : null) : parseNum(str(f, "reps_per_round")) || null,
    time_cap_s: cap,
    movement_id: rx ? (rx.format === "max" || (rx.format === "sets" && rx.items.length === 1) ? rx.items[0].mv : null) : str(f, "movement_id") || null,
    movements: rx ? [...new Set(rx.items.map((i) => i.mv))] : f.getAll("movements").map(String).filter(Boolean),
    format: rx?.format ?? null,
    items: rx?.items ?? [],
    rounds: rx?.rounds ?? null,
    duration_s: rx?.duration_s ?? null,
    interval_s: rx?.interval_s ?? null,
    rep_scheme: rx?.rep_scheme?.length ? rx.rep_scheme : null,
    emom_mode: rx ? rx.emom_mode ?? null : null,
    block: str(f, "block").slice(0, 24) || null,
    variant: rx?.variant ?? null,
    anchors_m: am,
    anchors_f: af,
    counts_in_level: counts,
    published: f.get("published") === "on",
  };
  // Semaines suivantes (répétition du bloc, chacune modifiable) : validées avant tout enregistrement
  const extra: typeof row[] = [];
  if (rx && str(f, "rx_weeks")) {
    let rawWeeks: unknown;
    try { rawWeeks = JSON.parse(str(f, "rx_weeks")); } catch { return { error: "Semaines illisibles, recharge la page." }; }
    const list = Array.isArray(rawWeeks) ? rawWeeks.slice(0, 4) : [];
    const base = row.workout_date ?? todayParis();
    for (let k = 0; k < list.length; k++) {
      const wx = sanitizeRx(list[k]);
      if (typeof wx === "string") return { error: `Semaine ${k + 2} : ${wx}` };
      const ids = [...new Set(wx.items.map((i) => i.mv))];
      const { data: known } = await db().from("movements").select("id,name").in("id", ids);
      const names = new Map((known ?? []).map((m) => [m.id as string, m.name as string]));
      if (names.size !== ids.length) return { error: `Semaine ${k + 2} : un mouvement est inconnu.` };
      const date = new Date(Date.parse(base + "T12:00:00Z") + 7 * (k + 1) * 86400_000).toISOString().slice(0, 10);
      extra.push({
        ...row,
        workout_date: date,
        description: describe(wx, (i) => names.get(i) ?? i),
        score_type: FORMATS[wx.format].score,
        better: FORMATS[wx.format].better,
        reps_per_round: wx.format === "amrap" && !wx.rep_scheme?.length ? repsPerRound(wx) || null : null,
        variant: wx.variant ?? null,
        time_cap_s: wx.time_cap_s ?? null,
        movement_id: wx.format === "max" || (wx.format === "sets" && wx.items.length === 1) ? wx.items[0].mv : null,
        movements: ids,
        format: wx.format, items: wx.items, rounds: wx.rounds ?? null, duration_s: wx.duration_s ?? null, interval_s: wx.interval_s ?? null,
        rep_scheme: wx.rep_scheme?.length ? wx.rep_scheme : null, emom_mode: wx.emom_mode ?? null,
      });
    }
  }
  const insertExtra = async () => {
    if (!extra.length) return null;
    const { error } = await db().from("workouts").insert(extra.map((e) => ({ ...e, created_by: me.id })));
    return error ? error.message : null;
  };

  if (id) {
    const { error } = await db().from("workouts").update(row).eq("id", id);
    if (error) return { error: error.message };
    const e2 = await insertExtra();
    if (e2) return { error: e2 };
  } else {
    const { data, error } = await db().from("workouts").insert({ ...row, created_by: me.id }).select("id").single();
    if (error) return { error: error.message };
    const e2 = await insertExtra();
    if (e2) return { error: `Bloc créé, mais pas les semaines suivantes : ${e2}` };
    revalidatePath("/", "layout");
    redirect(ret ?? `/admin/seances/${data.id}?ok=1`);
  }
  revalidatePath("/", "layout");
  if (ret) redirect(ret);
  return { ok: extra.length ? `Séance enregistrée + ${extra.length} semaine${extra.length > 1 ? "s" : ""} créée${extra.length > 1 ? "s" : ""}.` : "Séance enregistrée." };
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

/** Duplique une séance à une autre date (même programme, même partie). */
export async function duplicateWorkout(id: string, date: string) {
  await requireStaff();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const { data } = await db().from("workouts").select("*").eq("id", id).single();
  if (!data) return;
  const { id: _id, created_at: _c, ...copy } = data as Record<string, unknown>; // eslint-disable-line @typescript-eslint/no-unused-vars
  await db().from("workouts").insert({ ...copy, workout_date: date });
  revalidatePath("/", "layout");
}
