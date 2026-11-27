"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireMe } from "@/lib/session";

export type ProfileState = { error?: string; ok?: string } | null;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => { const n = Number(str(f, k).replace(",", ".")); return str(f, k) && Number.isFinite(n) ? n : null; };

export async function updateProfile(_: ProfileState, f: FormData): Promise<ProfileState> {
  const me = await requireMe();
  const first_name = str(f, "first_name"), last_name = str(f, "last_name");
  if (!first_name || !last_name) return { error: "Prénom et nom obligatoires." };
  const sex = str(f, "sex");
  const box = str(f, "box_id");
  const patch = {
    first_name, last_name,
    sex: sex === "F" ? "F" : "M",
    birth_year: num(f, "birth_year"),
    bodyweight_kg: num(f, "bodyweight_kg"),
    height_cm: num(f, "height_cm"),
    box_id: /^[0-9a-f-]{36}$/i.test(box) ? box : null,
  };
  if (patch.bodyweight_kg && (patch.bodyweight_kg < 30 || patch.bodyweight_kg > 200)) return { error: "Poids invalide." };
  const { error } = await db().from("athletes").update(patch).eq("id", me.id);
  if (error) return { error: "Mise à jour impossible." };
  revalidatePath("/", "layout");
  return { ok: "Profil mis à jour." };
}

import { allowedTrackKeys } from "@/lib/tracks";

/** Programmes suivis (affichés sur le calendrier de l'accueil). */
export async function updateTracks(tracks: string[]) {
  const me = await requireMe();
  const allowed = allowedTrackKeys(me);
  const clean = [...new Set(tracks.filter((t) => allowed.includes(t)))];
  await db().from("athletes").update({ tracks: clean.length ? clean : allowed }).eq("id", me.id);
  revalidatePath("/", "layout");
}
