"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { parseTrack, TRACK_KEYS } from "@/lib/tracks";

const EXT: Record<string, string> = { "video/webm": "webm", "video/mp4": "mp4", "video/quicktime": "mov" };

/** Prépare un envoi direct navigateur → stockage (la vidéo ne transite pas par le serveur). */
export async function prepareVideoUpload(mime: string): Promise<{ path: string; token: string; url: string; key: string } | { error: string }> {
  await requireStaff();
  const ext = EXT[mime.split(";")[0]];
  if (!ext) return { error: "Format vidéo non pris en charge." };
  const path = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  const { data, error } = await db().storage.from("videos").createSignedUploadUrl(path);
  if (error || !data) return { error: "Envoi impossible pour le moment." };
  return { path, token: data.token, url: process.env.SUPABASE_URL!, key: process.env.SUPABASE_PUBLISHABLE_KEY! };
}

/** Crée un bloc « vidéo » dans le planning (présentation de cycle, consignes…). */
export async function saveVideoBlock(input: { track: string; date: string; title: string; note: string; path: string }): Promise<{ id: string } | { error: string }> {
  const me = await requireStaff();
  if (!TRACK_KEYS.includes(input.track)) return { error: "Programme invalide." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Date invalide." };
  if (!/^\d{4}-\d{2}\/[0-9a-f-]{36}\.(webm|mp4|mov)$/.test(input.path)) return { error: "Vidéo introuvable." };
  const { source, subtrack } = parseTrack(input.track);
  let q = db().from("workouts").select("block").eq("source", source).eq("workout_date", input.date);
  q = subtrack ? q.eq("subtrack", subtrack) : q.is("subtrack", null);
  const used = new Set(((await q).data ?? []).map((r: { block: string | null }) => r.block));
  const block = "ABCDEFGHIJ".split("").find((b) => !used.has(b)) ?? null;
  const video_url = db().storage.from("videos").getPublicUrl(input.path).data.publicUrl;
  const { data, error } = await db().from("workouts").insert({
    title: input.title.trim().slice(0, 120) || "Présentation du cycle",
    description: input.note.trim().slice(0, 2000),
    source, subtrack, workout_date: input.date, block,
    score_type: "none", better: "higher", movements: [], items: [],
    video_url, color: "ardoise", published: true, created_by: me.id,
  }).select("id").single();
  if (error || !data) return { error: error?.message ?? "Enregistrement impossible." };
  revalidatePath("/", "layout");
  return { id: data.id as string };
}
