import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/session";
import { getBoxes } from "@/lib/data";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Inscription" };

export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  if (await getMe()) redirect("/accueil");
  const { email } = await searchParams;
  const boxes = await getBoxes();
  return (
    <AuthShell title="Entre dans le clan" subtitle="Deux minutes pour créer ton profil athlète.">
      <SignupForm email={email} boxes={boxes.map((b) => ({ id: b.id, label: b.city ? `${b.name} · ${b.city}` : b.name }))} />
      <p className="mt-6 text-center text-sm text-muted">
        Déjà inscrit ? <Link href="/connexion" className="font-semibold text-lime">Connecte-toi</Link>
      </p>
    </AuthShell>
  );
}
