"use client";

import { useActionState } from "react";
import { verifyCode } from "@/app/actions/auth";
import { FormMessage, Submit } from "./forms";

export function CheckMail({ email, devLink, onBack }: { email: string; devLink?: string; onBack: () => void }) {
  const [state, action] = useActionState(verifyCode, null);
  return (
    <div className="rise grid gap-5">
      <div className="card p-5">
        <p className="kicker text-lime">Email envoyé</p>
        <p className="mt-2 text-[15px] leading-relaxed text-fog">
          Ouvre le mail envoyé à <span className="font-semibold">{email}</span> et touche <span className="font-semibold">Me connecter</span>.
        </p>
        <p className="mt-2 text-sm text-muted">Tu as installé l&apos;app sur ton écran d&apos;accueil ? Saisis plutôt le code à 6 chiffres.</p>
      </div>

      <form action={action} className="grid gap-3">
        <input type="hidden" name="email" value={email} />
        <label className="label" htmlFor="code">Code reçu</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} required autoFocus
          className="field text-center font-mono text-3xl tracking-[0.5em]" placeholder="000000" />
        <FormMessage state={state} />
        <Submit className="btn-lime w-full py-4" pending="Vérification…">Valider le code</Submit>
      </form>

      {devLink && (
        <a href={devLink} className="rounded-xl border border-dashed border-lime/40 px-4 py-3 text-center text-sm text-lime">
          Mode test (aucun email configuré) : ouvrir le lien de connexion
        </a>
      )}
      <button type="button" onClick={onBack} className="text-sm text-muted underline-offset-4 hover:underline">
        Mauvaise adresse ? Recommencer
      </button>
    </div>
  );
}
