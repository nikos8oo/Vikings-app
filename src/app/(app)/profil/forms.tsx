"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile";
import { FormMessage, Submit } from "@/components/forms";
import type { Athlete } from "@/lib/types";

export function ProfileForm({ me, boxes }: { me: Athlete; boxes: { id: string; label: string }[] }) {
  const [state, action] = useActionState(updateProfile, null);
  return (
    <form action={action} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Prénom</label><input name="first_name" defaultValue={me.first_name} className="field" /></div>
        <div><label className="label">Nom</label><input name="last_name" defaultValue={me.last_name} className="field" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Catégorie</label>
          <select name="sex" defaultValue={me.sex} className="field"><option value="M">Homme</option><option value="F">Femme</option></select>
        </div>
        <div><label className="label">Année de naissance</label><input name="birth_year" inputMode="numeric" defaultValue={me.birth_year ?? ""} className="field" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Poids (kg)</label><input name="bodyweight_kg" inputMode="decimal" defaultValue={me.bodyweight_kg ?? ""} className="field" /></div>
        <div><label className="label">Taille (cm)</label><input name="height_cm" inputMode="numeric" defaultValue={me.height_cm ?? ""} className="field" /></div>
      </div>
      <div>
        <label className="label">Box</label>
        <select name="box_id" defaultValue={me.box_id ?? ""} className="field">
          <option value="">Aucune</option>
          {boxes.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
      </div>
      <FormMessage state={state} />
      <Submit pending="Enregistrement…">Enregistrer</Submit>
    </form>
  );
}
