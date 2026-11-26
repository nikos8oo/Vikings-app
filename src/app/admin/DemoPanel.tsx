"use client";

import { useState, useTransition } from "react";
import { clearDemo, generateDemo, startDemoView, type DemoState } from "@/app/actions/demo";
import { FormMessage } from "@/components/forms";

/** Mode démo : génère un mois de prog sur toutes les pistes + athlètes fictifs, et ouvre la vue athlète démo. */
export function DemoPanel({ blocks, athletes }: { blocks: number; athletes: number }) {
  const [state, setState] = useState<DemoState>(null);
  const [pending, start] = useTransition();
  const [step, setStep] = useState<string | null>(null);
  const run = (label: string, fn: () => Promise<DemoState>) => start(async () => { setStep(label); setState(await fn()); setStep(null); });
  const has = blocks > 0;
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="kicker">Mode démo</p>
          <p className="mt-1 text-[17px] font-semibold text-fog">Cycle de rentrée · 4 semaines · toutes les pistes</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            2 à 3 blocs par jour sur Vikings Compétition et les 6 pistes Affiliates, 12 athlètes fictifs avec records et scores.
            Les données démo sont marquées et se suppriment d&apos;un clic, sans toucher aux vraies.
          </p>
          <p className="mt-2 text-[12px] text-dim">{has ? `En place : ${blocks} blocs, ${athletes} athlètes démo.` : "Aucune donnée démo pour l'instant."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={() => run("gen", generateDemo)} className="btn-lime">
            {step === "gen" ? "Génération… (20-40 s)" : has ? "Regénérer la démo" : "Générer la démo"}
          </button>
          {has && <form action={startDemoView}><button disabled={pending} className="btn-primary">Voir en athlète démo</button></form>}
          {has && (
            <button type="button" disabled={pending} onClick={() => { if (confirm("Supprimer toutes les données démo ?")) run("del", clearDemo); }} className="btn-ghost text-danger">
              {step === "del" ? "Suppression…" : "Supprimer la démo"}
            </button>
          )}
        </div>
      </div>
      {state && <div className="mt-4"><FormMessage state={state} /></div>}
    </section>
  );
}
