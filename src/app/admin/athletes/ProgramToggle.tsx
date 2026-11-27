"use client";

import { useOptimistic, useTransition } from "react";
import { setPrograms } from "@/app/actions/admin";

const P = [["competition", "Compétition", "C"], ["affiliates", "Affiliates", "A"]] as const;

/** Affectation d'un athlète aux deux grands programmes (enregistrement immédiat). */
export function ProgramToggle({ id, programs, compact = false }: { id: string; programs: string[]; compact?: boolean }) {
  const [pending, start] = useTransition();
  const [opt, setOpt] = useOptimistic(programs);
  const toggle = (v: string) => {
    const next = opt.includes(v) ? opt.filter((x) => x !== v) : [...opt, v];
    start(async () => { setOpt(next); await setPrograms(id, next); });
  };
  return (
    <div className={`inline-flex gap-1 ${pending ? "opacity-60" : ""}`} onClick={(e) => e.stopPropagation()}>
      {P.map(([v, l, s]) => {
        const on = opt.includes(v);
        return (
          <button key={v} type="button" onClick={() => toggle(v)} aria-pressed={on} title={`${on ? "Retirer de" : "Affecter à"} Vikings ${l}`}
            className={`whitespace-nowrap rounded-full border font-semibold transition ${compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1.5 text-[13px]"} ${on ? (v === "competition" ? "border-lime/50 bg-lime/15 text-lime" : "border-bleu bg-bleu/15 text-[#9fb5ff]") : "border-line text-dim"}`}>
            {compact ? s : `${on ? "✓ " : ""}Vikings ${l}`}
          </button>
        );
      })}
    </div>
  );
}
