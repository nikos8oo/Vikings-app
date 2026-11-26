import { NextResponse, type NextRequest } from "next/server";
import { consumeLink } from "@/lib/magic";
import { setSession } from "@/lib/session";

/** Lien magique reçu par email : ouvre la session puis redirige vers l'accueil. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("t") ?? "";
  const uid = await consumeLink(token);
  if (!uid) return NextResponse.redirect(new URL("/connexion?lien=expire", req.url));
  await setSession(uid);
  return NextResponse.redirect(new URL("/accueil", req.url));
}
