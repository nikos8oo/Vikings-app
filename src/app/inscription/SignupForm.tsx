"use client";

import { useActionState, useState } from "react";
import { signup } from "@/app/actions/auth";
import { CheckMail } from "@/components/CheckMail";
import { FormMessage, Submit } from "@/components/forms";

export function SignupForm({ boxes, email }: { boxes: { id: string; label: string }[]; email?: string }) {
  const [state, action] = useActionState(signup, null);
  const [box, setBox] = useState(boxes.length ? "" : "new");
  const [back, setBack] = useState(false);
  if (state?.sent && !back) return <CheckMail email={state.sent} devLink={state.devLink} onBack={() => setBack(true)} />;
  return (
    <form action={(fd) => { setBack(false); return action(fd); }} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="first_name">Prénom</label>
          <input id="first_name" name="first_name" required autoComplete="given-name" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="last_name">Nom</label>
          <input id="last_name" name="last_name" required autoComplete="family-name" className="field" />
        </div>
      </div>

      <fieldset>
        <legend className="label">Catégorie</legend>
        <div className="grid grid-cols-2 gap-2">
          {[["M", "Homme"], ["F", "Femme"]].map(([v, l]) => (
            <label key={v} className="cursor-pointer">
              <input type="radio" name="sex" value={v} required className="peer sr-only" />
              <span className="flex items-center justify-center rounded-xl border border-line bg-panel-2 py-3 text-sm font-semibold text-muted transition peer-checked:border-bleu peer-checked:bg-bleu/15 peer-checked:text-fog">
                {l}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="birth_year">Année de naissance</label>
        <input id="birth_year" name="birth_year" inputMode="numeric" placeholder="1995" className="field" />
      </div>

      <div>
        <label className="label" htmlFor="box_id">Ta box</label>
        <select id="box_id" name="box_id" value={box} onChange={(e) => setBox(e.target.value)} className="field">
          {boxes.length > 0 && <option value="">Choisir…</option>}
          {boxes.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          <option value="new">+ Ma box n&apos;est pas dans la liste</option>
          <option value="none">Je n&apos;ai pas de box</option>
        </select>
      </div>
      {box === "new" && (
        <div className="grid grid-cols-[1.4fr_1fr] gap-3">
          <input name="box_name" placeholder="Nom de la box" className="field" required />
          <input name="box_city" placeholder="Ville" className="field" />
        </div>
      )}

      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={email} className="field" />
      </div>

      <FormMessage state={state?.error ? { error: state.error } : null} />
      <Submit className="btn-lime w-full py-4" pending="Envoi…">Créer mon profil</Submit>
      <p className="text-center text-xs text-dim">Pas de mot de passe : tu confirmes ton email via un lien ou un code.</p>
      <p className="text-center text-xs leading-relaxed text-dim">
        Tes performances sont conservées par Vikings pour calculer ton niveau et les classements de la communauté.
      </p>
    </form>
  );
}
