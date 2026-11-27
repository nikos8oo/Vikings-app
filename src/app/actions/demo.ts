"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { buildDemoProgram, buildDemoResults, DEMO_ATHLETES } from "@/lib/demo";
import { todayParis } from "@/lib/format";
import { describe, FORMATS, repsPerRound, sanitizeRx, type Rx } from "@/lib/prescription";
import { parseTrack } from "@/lib/tracks";
import { endImpersonation, requireAdmin, startImpersonation } from "@/lib/session";
import type { Movement } from "@/lib/types";

export type DemoState = { error?: string; ok?: string } | null;

const addDays = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 86400_000).toISOString().slice(0, 10);
const monday = (d: string) => addDays(d, -((new Date(d + "T12:00:00Z").getUTCDay() + 6) % 7));
async function insertBatched(table: string, rows: Record<string, unknown>[], select?: string) {
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < rows.length; i += 200) {
    const q = db().from(table).insert(rows.slice(i, i + 200));
    const { data, error } = select ? await q.select(select) : await q;
    if (error) throw new Error(`${table} : ${error.message}`);
    if (data) out.push(...(data as unknown as Record<string, unknown>[]));
  }
  return out;
}

async function clear() {
  await db().from("athletes").delete().eq("is_demo", true); // leurs résultats partent en cascade
  await db().from("workouts").delete().eq("is_demo", true);
  await db().from("boxes").delete().eq("is_demo", true);
}

export async function clearDemo(): Promise<DemoState> {
  await requireAdmin();
  await clear();
  revalidatePath("/", "layout");
  return { ok: "Démo supprimée. Les vraies données n'ont pas été touchées." };
}

export async function generateDemo(): Promise<DemoState> {
  const me = await requireAdmin();
  try {
    await clear();
    const today = todayParis();
    const start = monday(addDays(today, -14)); // S1-S2 passées, S3 en cours, S4 à venir
    const { data: mvData } = await db().from("movements").select("id,name,metric,better,anchors_m,anchors_f");
    const mvs = new Map(((mvData ?? []) as Movement[]).map((m) => [m.id, m]));
    const nameOf = (id: string) => mvs.get(id)?.name ?? id;

    // Box démo
    const boxes = await insertBatched("boxes", [
      { name: "Box Démo Perpignan", city: "Perpignan", is_affiliate: true, is_demo: true },
      { name: "Box Démo Toulouse", city: "Toulouse", is_affiliate: true, is_demo: true },
      { name: "Box Démo Agen", city: "Agen", is_affiliate: true, is_demo: true },
    ], "id");

    // Programmation
    const blocks = buildDemoProgram();
    const wRows = blocks.map((b, i) => {
      const rx = sanitizeRx(b.rx) as Rx;
      const { source, subtrack } = parseTrack(b.track);
      return {
        title: b.title, workout_date: addDays(start, b.dayOffset), source, subtrack, block: b.block, color: b.color,
        description: describe(rx, nameOf), coach_notes: b.notes ?? null,
        score_type: FORMATS[rx.format].score, better: FORMATS[rx.format].better,
        reps_per_round: rx.format === "amrap" && !rx.rep_scheme?.length ? repsPerRound(rx) || null : null,
        time_cap_s: rx.time_cap_s ?? null,
        movement_id: rx.format === "max" || (rx.format === "sets" && rx.items.length === 1) ? rx.items[0].mv : null,
        movements: [...new Set(rx.items.map((x) => x.mv))],
        format: rx.format, variant: rx.variant ?? null, items: rx.items, rounds: rx.rounds ?? null, duration_s: rx.duration_s ?? null,
        interval_s: rx.interval_s ?? null, rep_scheme: rx.rep_scheme?.length ? rx.rep_scheme : null, emom_mode: rx.emom_mode ?? null,
        published: true, is_demo: true, created_by: me.id, coach_ref: i,
      };
    });
    const inserted = await insertBatched("workouts", wRows.map(({ coach_ref: _r, ...w }) => w), "id,workout_date,title,block,source,subtrack"); // eslint-disable-line @typescript-eslint/no-unused-vars
    const key = (w: { workout_date: unknown; title: unknown; block: unknown; source: unknown; subtrack: unknown }) => `${w.workout_date}|${w.title}|${w.block}|${w.source}|${w.subtrack ?? ""}`;
    const idByKey = new Map(inserted.map((w) => [key(w as never), w.id as string]));

    // Athlètes
    const colors = ["#2e5aef", "#d1ec2d", "#e4e1e6", "#7c9bff", "#b8d42a"];
    const aRows = DEMO_ATHLETES.map((a, i) => ({
      email: `demo.${a.first}.${a.last}@demo.vikings.local`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""),
      first_name: a.first, last_name: a.last, sex: a.sex, birth_year: 1988 + (i * 3) % 15,
      bodyweight_kg: a.sex === "M" ? 74 + (i * 5) % 18 : 58 + (i * 4) % 14,
      box_id: boxes[i % boxes.length].id, role: "athlete", avatar_color: colors[i % colors.length], tracks: a.tracks, is_demo: true,
      programs: [...(a.tracks.includes("competition") ? ["competition"] : []), ...(a.tracks.some((t) => t.startsWith("aff:")) ? ["affiliates"] : [])],
    }));
    const athletes = await insertBatched("athletes", aRows, "id,email");
    const idByEmail = new Map(athletes.map((a) => [a.email as string, a.id as string]));

    const results = buildDemoResults({
      blocks, mvs, start, today,
      athleteIds: DEMO_ATHLETES.map((_, ai) => idByEmail.get(aRows[ai].email)!),
      workoutId: (bi) => idByKey.get(key({ ...wRows[bi] })),
    });
    await insertBatched("results", results);

    revalidatePath("/", "layout");
    return { ok: `Démo créée : ${inserted.length} blocs sur 4 semaines, ${athletes.length} athlètes, ${results.length} perfs et scores.` };
  } catch (e) {
    return { error: `Génération interrompue : ${(e as Error).message}` };
  }
}

/** L'admin ouvre l'app athlète avec le compte démo principal. */
export async function startDemoView() {
  await requireAdmin();
  const { data } = await db().from("athletes").select("id").eq("is_demo", true).eq("first_name", "Léa").maybeSingle();
  if (!data) redirect("/admin?demo=absente");
  await startImpersonation(data.id);
  redirect("/accueil");
}

export async function stopDemoView() {
  await endImpersonation();
  redirect("/admin");
}
