"use client";

import { useActionState, useTransition } from "react";
import { deleteBox, saveBox } from "@/app/actions/admin";
import { FormMessage, Submit } from "@/components/forms";
import type { Box } from "@/lib/types";

export function NewBox() {
  const [state, action] = useActionState(saveBox, null);
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-2 md:grid-cols-[2fr_1.2fr_auto_auto] md:items-center">
        <input name="name" placeholder="Nom de la box" className="field" required />
        <input name="city" placeholder="Ville" className="field" />
        <label className="flex items-center gap-2 px-2 text-sm"><input type="checkbox" name="is_affiliate" defaultChecked className="h-4 w-4 accent-[#d1ec2d]" /> Affiliée</label>
        <Submit className="btn-lime" pending="…">Ajouter</Submit>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function BoxRow({ box, count, canDelete }: { box: Box; count: number; canDelete: boolean }) {
  const [state, action] = useActionState(saveBox, null);
  const [pending, start] = useTransition();
  return (
    <form action={action} className="card grid gap-2 p-3 md:grid-cols-[2fr_1.2fr_auto_auto_auto_auto] md:items-center">
      <input type="hidden" name="id" value={box.id} />
      <input name="name" defaultValue={box.name} className="field py-2" />
      <input name="city" defaultValue={box.city ?? ""} placeholder="Ville" className="field py-2" />
      <label className="flex items-center gap-2 px-2 text-sm"><input type="checkbox" name="is_affiliate" defaultChecked={box.is_affiliate} className="h-4 w-4 accent-[#d1ec2d]" /> Affiliée</label>
      <span className="px-2 text-xs text-muted">{count} athlète{count > 1 ? "s" : ""}</span>
      <Submit className="btn-ghost py-2" pending="…">OK</Submit>
      {canDelete ? (
        <button type="button" disabled={pending} onClick={() => { if (confirm(`Supprimer ${box.name} ? Les athlètes seront détachés.`)) start(() => deleteBox(box.id)); }} className="px-2 text-xs font-semibold text-danger/80">Suppr.</button>
      ) : <span />}
      {(state?.error || state?.ok) && <div className="md:col-span-6"><FormMessage state={state} /></div>}
    </form>
  );
}
