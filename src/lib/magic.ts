import "server-only";
import { createHash, randomBytes, randomInt } from "crypto";
import { headers } from "next/headers";
import { db } from "./db";
import { isAdminEmail } from "./session";

export const TOKEN_TTL_MIN = 15;
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS_PER_10MIN = 3;

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const codeHash = (email: string, code: string) => sha(`${email}:${code}`);

export type SignupPayload = {
  first_name: string;
  last_name: string;
  sex: "M" | "F";
  birth_year: number | null;
  box_id: string | null;
  box_new?: { name: string; city: string | null } | null;
};

export async function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Crée un jeton (lien + code). Renvoie null si trop de demandes récentes. */
export async function createLoginToken(email: string, signup: SignupPayload | null) {
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await db().from("login_tokens").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", since);
  if ((count ?? 0) >= MAX_REQUESTS_PER_10MIN) return null;

  const token = randomBytes(32).toString("base64url");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error } = await db().from("login_tokens").insert({
    email,
    token_hash: sha(token),
    code_hash: codeHash(email, code),
    signup,
    expires_at: new Date(Date.now() + TOKEN_TTL_MIN * 60_000).toISOString(),
  });
  if (error) throw new Error(error.message);
  return { token, code, link: `${await appUrl()}/auth/lien?t=${token}` };
}

type TokenRow = { id: string; email: string; signup: SignupPayload | null; attempts: number; expires_at: string; used_at: string | null };
const COLS = "id,email,signup,attempts,expires_at,used_at";
const live = (r: TokenRow | null) => r && !r.used_at && new Date(r.expires_at) > new Date() && r.attempts < MAX_ATTEMPTS;

/** Consomme un jeton de lien. Renvoie l'id de l'athlète (créé si inscription). */
export async function consumeLink(token: string): Promise<string | null> {
  if (!token || token.length < 20) return null;
  const { data } = await db().from("login_tokens").select(COLS).eq("token_hash", sha(token)).maybeSingle();
  if (!live(data as TokenRow | null)) return null;
  return finish(data as TokenRow);
}

/** Vérifie un code à 6 chiffres pour le dernier jeton actif de cet email. */
export async function consumeCode(email: string, code: string): Promise<{ uid?: string; error?: string }> {
  const { data } = await db().from("login_tokens").select(COLS + ",code_hash").eq("email", email).is("used_at", null)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  const row = data as (TokenRow & { code_hash: string }) | null;
  if (!row || !live(row)) return { error: "Code expiré. Demande un nouveau lien." };
  if (row.code_hash !== codeHash(email, code)) {
    await db().from("login_tokens").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return { error: left > 0 ? `Code incorrect (${left} essai${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}).` : "Trop d'essais. Demande un nouveau lien." };
  }
  const uid = await finish(row);
  return uid ? { uid } : { error: "Connexion impossible." };
}

const COLORS = ["#2e5aef", "#d1ec2d", "#e4e1e6", "#7c9bff", "#b8d42a"];

async function finish(row: TokenRow): Promise<string | null> {
  // usage unique : on marque d'abord le jeton (condition used_at null pour éviter une double utilisation)
  const { data: claimed } = await db().from("login_tokens").update({ used_at: new Date().toISOString() })
    .eq("id", row.id).is("used_at", null).select("id").maybeSingle();
  if (!claimed) return null;

  const email = row.email;
  const { data: existing } = await db().from("athletes").select("id,role").eq("email", email).maybeSingle();
  const now = new Date().toISOString();
  if (existing) {
    const patch: Record<string, unknown> = { last_seen_at: now };
    if (isAdminEmail(email) && existing.role !== "admin") patch.role = "admin";
    await db().from("athletes").update(patch).eq("id", existing.id);
    return existing.id;
  }
  const s = row.signup;
  if (!s) return null;

  let box_id = s.box_id;
  if (s.box_new?.name) {
    const { data: found } = await db().from("boxes").select("id").ilike("name", s.box_new.name).maybeSingle();
    if (found) box_id = found.id;
    else {
      const { data: created } = await db().from("boxes").insert({ name: s.box_new.name, city: s.box_new.city, is_affiliate: false }).select("id").single();
      box_id = created?.id ?? null;
    }
  }
  const { data: athlete, error } = await db().from("athletes").insert({
    email, first_name: s.first_name, last_name: s.last_name, sex: s.sex, birth_year: s.birth_year, box_id,
    role: isAdminEmail(email) ? "admin" : "athlete",
    avatar_color: COLORS[Math.floor(Math.random() * COLORS.length)],
    last_seen_at: now,
  }).select("id").single();
  if (error) {
    // compte créé entre-temps (double clic) : on le récupère
    const { data: again } = await db().from("athletes").select("id").eq("email", email).maybeSingle();
    return again?.id ?? null;
  }
  return athlete.id;
}
