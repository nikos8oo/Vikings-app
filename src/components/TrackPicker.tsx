"use client";

import { useOptimistic, useTransition } from "react";
import { updateTracks } from "@/app/actions/profile";

import { SUBTRACKS } from "@/lib/tracks";

/** Choix des programmes suivis : chips à bascule, enregistrement immédiat. */
export function TrackPicker({ tracks }: { tracks: string[] }) {
  const [pending, start] = useTransition();
  const [opt, setOpt] = useOptimistic(tracks);
  const toggle = (t: string) => {
    const next = opt.includes(t) ? opt.filter((x) => x !== t) : [...opt, t];
    if (!next.length) return; // au moins un programme
    start(async () => { setOpt(next); await updateTracks(next); });
  };
  const Chip = ({ v, l }: { v: string; l: string }) => {
    const on = opt.includes(v);
    return (
      <button type="button" onClick={() => toggle(v)} aria-pressed={on}
        className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition ${on ? "border-bleu bg-bleu/15 text-fog" : "border-line text-dim"}`}>
        {on ? "✓ " : ""}{l}
      </button>
    );
  };
  return (
    <div className={`grid gap-3 ${pending ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap gap-2"><Chip v="competition" l="Vikings Compétition" /><Chip v="qualif" l="Qualifs" /></div>
      <div>
        <p className="mb-1.5 text-[12px] font-semibold text-muted">Vikings Affiliates</p>
        <div className="flex flex-wrap gap-2">{SUBTRACKS.map((st) => <Chip key={st.id} v={`aff:${st.id}`} l={st.label} />)}</div>
      </div>
    </div>
  );
}
