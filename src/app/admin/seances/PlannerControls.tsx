"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { duplicateWorkout } from "@/app/actions/admin";

const TRACKS = [["vikings", "Vikings"], ["affiliates", "Affiliates"], ["competition", "Compétition"], ["qualif", "Qualifs"], ["benchmark", "Benchmarks"]] as const;

/** Programme sur lequel l'admin travaille (mémorisé dans un cookie). */
export function TrackSwitch({ track, view, date }: { track: string; view: string; date: string }) {
  const router = useRouter();
  const go = (t: string) => {
    document.cookie = `va_admin_track=${t}; path=/admin; max-age=31536000; samesite=lax`;
    router.push(`/admin/seances?p=${t}&v=${view}&d=${date}`);
  };
  return (
    <div className="seg max-w-full overflow-x-auto no-scrollbar">
      {TRACKS.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={track === v} onClick={() => go(v)} className="seg-btn whitespace-nowrap px-3 sm:px-4">{l}</button>
      ))}
    </div>
  );
}

/** Copie un bloc au jour suivant (pour construire la semaine au fur et à mesure). */
export function DuplicateNextDay({ id, date }: { id: string; date: string }) {
  const [pending, start] = useTransition();
  const next = new Date(Date.parse(date + "T12:00:00Z") + 86400_000).toISOString().slice(0, 10);
  return (
    <button type="button" disabled={pending} onClick={(e) => { e.preventDefault(); start(() => duplicateWorkout(id, next)); }}
      className="text-[11px] font-medium text-muted hover:text-fog disabled:opacity-50" title="Copier ce bloc au jour suivant">
      {pending ? "Copie…" : "Copier → J+1"}
    </button>
  );
}
