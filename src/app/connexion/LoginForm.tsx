"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { requestLink } from "@/app/actions/auth";
import { CheckMail } from "@/components/CheckMail";
import { FormMessage, Submit } from "@/components/forms";

export function LoginForm({ linkError }: { linkError?: boolean }) {
  const [state, action] = useActionState(requestLink, null);
  const [reset, setReset] = useState(0);
  const [email, setEmail] = useState("");

  if (state?.sent && reset === 0) return <CheckMail email={state.sent} devLink={state.devLink} onBack={() => setReset(1)} />;

  return (
    <form action={(fd) => { setReset(0); return action(fd); }} className="grid gap-4">
      {linkError && <FormMessage state={{ error: "Ce lien a expiré ou a déjà servi. Demande-en un nouveau." }} />}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <FormMessage state={state?.error ? { error: state.error } : null} />
      {state?.noAccount && (
        <Link href={`/inscription?email=${encodeURIComponent(email)}`} className="btn-ghost w-full text-center">Créer mon profil avec cet email</Link>
      )}
      <Submit className="btn-lime w-full py-4" pending="Envoi…">Recevoir mon lien de connexion</Submit>
      <p className="text-center text-xs text-dim">Pas de mot de passe : on t&apos;envoie un lien et un code par email.</p>
    </form>
  );
}
