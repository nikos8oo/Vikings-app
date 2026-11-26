"use client";

import { useOptimistic, useTransition } from "react";
import { updateTracks } from "@/app/actions/profile";

const ALL = [["vikings", "Vikings"], ["affiliates", "Affiliates"], ["competition", "Compétition"], ["qualif", "Qualifs"]] as const;

/** Choix des programmes suivis : chips à bascule, enregistrement immédiat. */
export function TrackPicker({ tracks }: { tracks: string[] }) {
  const [pending, start] = useTransition();
  const [opt, setOpt] = useOptimistic(tracks);
  const toggle = (t: string) => {
    const next = opt.includes(t) ? opt.filter((x) => x !== t) : [...opt, t];
    if (!next.length) return; // au moins un programme
    start(async () => { setOpt(next); await updateTracks(next); });
  };
  return (
    <div className={`flex flex-wrap gap-2 ${pending ? "opacity-70" : ""}`}>
      {ALL.map(([v, l]) => {
        const on = opt.includes(v);
        return (
          <button key={v} type="button" onClick={() => toggle(v)} aria-pressed={on}
            className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${on ? "border-bleu bg-bleu/15 text-fog" : "border-line text-dim"}`}>
            {on ? "✓ " : ""}{l}
          </button>
        );
      })}
    </div>
  );
}
