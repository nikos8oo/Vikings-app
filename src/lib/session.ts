import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import type { Athlete } from "./types";

const COOKIE = "va_session";
const DAYS = 60;

function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET manquant (32 caractères minimum)");
  return new TextEncoder().encode(s);
}

export async function setSession(uid: string) {
  const token = await new SignJWT({ uid })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DAYS}d`)
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAYS * 86400,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

async function sessionUid(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}

const ATHLETE_COLS =
  "id,email,first_name,last_name,sex,birth_year,bodyweight_kg,height_cm,box_id,role,avatar_color,created_at,last_seen_at,tracks";
export { ATHLETE_COLS };

/** Athlète connecté (une seule lecture par requête). */
export const getMe = cache(async (): Promise<Athlete | null> => {
  const uid = await sessionUid();
  if (!uid) return null;
  const { data } = await db().from("athletes").select(ATHLETE_COLS).eq("id", uid).maybeSingle();
  return (data as Athlete) ?? null;
});

export async function requireMe(): Promise<Athlete> {
  const me = await getMe();
  if (!me) redirect("/connexion");
  return me;
}

/** Équipe Vikings : admin (tout) ou coach (prog + données). */
export async function requireStaff(): Promise<Athlete> {
  const me = await requireMe();
  if (me.role !== "admin" && me.role !== "coach") redirect("/accueil");
  return me;
}

export async function requireAdmin(): Promise<Athlete> {
  const me = await requireMe();
  if (me.role !== "admin") redirect("/admin");
  return me;
}

export function isAdminEmail(email: string) {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/* ---------- Vue « athlète démo » (l'admin emprunte un compte démo, puis revient) ---------- */
const BACK = "va_back";

export async function startImpersonation(targetUid: string) {
  const jar = await cookies();
  const current = jar.get(COOKIE)?.value;
  if (!current) return;
  jar.set(BACK, current, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 86400 });
  await setSession(targetUid);
}

export async function endImpersonation(): Promise<boolean> {
  const jar = await cookies();
  const back = jar.get(BACK)?.value;
  if (!back) return false;
  try { await jwtVerify(back, key()); } catch { jar.delete(BACK); return false; }
  jar.set(COOKIE, back, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: DAYS * 86400 });
  jar.delete(BACK);
  return true;
}

export async function isImpersonating() {
  return Boolean((await cookies()).get(BACK)?.value);
}
