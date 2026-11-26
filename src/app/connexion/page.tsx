import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/session";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default async function Page({ searchParams }: { searchParams: Promise<{ lien?: string }> }) {
  if (await getMe()) redirect("/accueil");
  const { lien } = await searchParams;
  return (
    <AuthShell title="Bon retour" subtitle="Connecte-toi pour retrouver ta progression.">
      <LoginForm linkError={lien === "expire"} />
      <p className="mt-6 text-center text-sm text-muted">
        Pas encore de compte ? <Link href="/inscription" className="font-semibold text-lime">Inscris-toi</Link>
      </p>
    </AuthShell>
  );
}
