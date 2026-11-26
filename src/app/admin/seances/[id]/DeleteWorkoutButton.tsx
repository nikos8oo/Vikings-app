"use client";

import { useTransition } from "react";
import { deleteWorkout } from "@/app/actions/admin";

export function DeleteWorkoutButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending}
      onClick={() => { if (confirm("Supprimer la séance et tous ses scores ?")) start(() => deleteWorkout(id)); }}
      className="justify-self-start text-sm font-semibold text-danger/80 hover:text-danger disabled:opacity-50">
      Supprimer la séance
    </button>
  );
}
