"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { consumeCode, createLoginToken, type SignupPayload } from "@/lib/magic";
import { mailConfigured, sendLoginMail } from "@/lib/mail";
import { clearSession, setSession } from "@/lib/session";

export type FormState = { error?: string; ok?: string } | null;
export type LinkState = { error?: string; sent?: string; devLink?: string; noAccount?: boolean } | null;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function send(email: string, signup: SignupPayload | null, firstName: string | null): Promise<LinkState> {
  if (!mailConfigured() && process.env.NODE_ENV === "production" && !process.env.ALLOW_DEV_LINKS) {
    return { error: "L'envoi d'email n'est pas encore configuré. Préviens l'équipe Vikings." };
  }
  const t = await createLoginToken(email, signup);
  if (!t) return { error: "Trop de demandes. Réessaie dans quelques minutes." };
  const sent = await sendLoginMail(email, t.link, t.code, firstName);
  if (!sent.ok) return { error: "L'email n'a pas pu partir. Réessaie dans un instant." };
  return { sent: email, devLink: sent.dev ? t.link : undefined };
}

/** Connexion : envoie un lien magique + un code à l'adresse indiquée. */
export async function requestLink(_: LinkState, f: FormData): Promise<LinkState> {
  const email = str(f, "email").toLowerCase();
  if (!EMAIL.test(email)) return { error: "Adresse email invalide." };
  const { data } = await db().from("athletes").select("first_name").eq("email", email).maybeSingle();
  if (!data) return { noAccount: true, error: "Aucun profil avec cet email." };
  return send(email, null, data.first_name);
}

/** Inscription : le profil n'est créé qu'une fois l'email confirmé (clic sur le lien ou code). */
export async function signup(_: LinkState, f: FormData): Promise<LinkState> {
  const first_name = str(f, "first_name");
  const last_name = str(f, "last_name");
  const email = str(f, "email").toLowerCase();
  const sex = str(f, "sex");
  const birth_year = Number(str(f, "birth_year")) || null;
  const boxChoice = str(f, "box_id");

  if (!first_name || !last_name) return { error: "Indique ton prénom et ton nom." };
  if (!EMAIL.test(email)) return { error: "Adresse email invalide." };
  if (sex !== "M" && sex !== "F") return { error: "Choisis ta catégorie (homme / femme) : elle définit tes barèmes." };
  if (birth_year && (birth_year < 1930 || birth_year > 2020)) return { error: "Année de naissance invalide." };

  const { data: exists } = await db().from("athletes").select("id").eq("email", email).maybeSingle();
  if (exists) return { error: "Un profil existe déjà avec cet email. Connecte-toi." };

  let box_id: string | null = null;
  let box_new: SignupPayload["box_new"] = null;
  if (boxChoice === "new") {
    const name = str(f, "box_name");
    if (!name) return { error: "Indique le nom de ta box." };
    box_new = { name, city: str(f, "box_city") || null };
  } else if (/^[0-9a-f-]{36}$/i.test(boxChoice)) box_id = boxChoice;

  return send(email, { first_name, last_name, sex, birth_year, box_id, box_new }, first_name);
}

/** Saisie du code à 6 chiffres reçu par email. */
export async function verifyCode(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email").toLowerCase();
  const code = str(f, "code").replace(/\D/g, "");
  if (code.length !== 6) return { error: "Le code fait 6 chiffres." };
  const r = await consumeCode(email, code);
  if (!r.uid) return { error: r.error };
  await setSession(r.uid);
  redirect("/accueil");
}

export async function logout() {
  await clearSession();
  redirect("/");
}
