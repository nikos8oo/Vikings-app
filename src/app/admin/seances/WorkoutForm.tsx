"use client";

import { useActionState, useMemo, useState } from "react";
import { saveWorkout } from "@/app/actions/admin";
import { FormMessage, Submit } from "@/components/forms";
import { fmtTime } from "@/lib/format";
import type { Workout } from "@/lib/types";

type Mv = { id: string; name: string; category: string };
const LV = [["100", "Games"], ["90", "Élite"], ["75", "RX"], ["60", "Inter"], ["40", "Fitness"]] as const;

export function WorkoutForm({ w, movements, today }: { w?: Workout; movements: Mv[]; today: string }) {
  const [state, action] = useActionState(saveWorkout, null);
  const [scoreType, setScoreType] = useState(w?.score_type ?? "time");
  const [sel, setSel] = useState<string[]>(w?.movements ?? []);
  const [q, setQ] = useState("");
  const [showAnchors, setShowAnchors] = useState(!!(w?.anchors_m || w?.counts_in_level));
  const matches = useMemo(() => {
    const n = q.toLowerCase().trim();
    return n ? movements.filter((m) => m.name.toLowerCase().includes(n) && !sel.includes(m.id)).slice(0, 8) : [];
  }, [q, movements, sel]);
  const name = (id: string) => movements.find((m) => m.id === id)?.name ?? id;
  const isTime = scoreType === "time";
  const av = (a: Record<string, number> | null | undefined, k: string) => (a?.[k] != null ? (isTime ? fmtTime(Number(a[k])) : String(a[k])) : "");

  return (
    <form action={action} className="grid gap-5">
      {w && <input type="hidden" name="id" value={w.id} />}
      {sel.map((id) => <input key={id} type="hidden" name="movements" value={id} />)}

      <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
        <div><label className="label">Titre</label><input name="title" defaultValue={w?.title} required className="field" placeholder="ex. WOD 26.1 — Qualif" /></div>
        <div><label className="label">Date</label><input name="workout_date" type="date" defaultValue={w?.workout_date ?? today} className="field" /></div>
        <div>
          <label className="label">Source</label>
          <select name="source" defaultValue={w?.source ?? "vikings"} className="field">
            <option value="vikings">Prog Vikings</option>
            <option value="affiliates">Vikings Affiliates</option>
            <option value="competition">Vikings Compétition</option>
            <option value="qualif">WOD de qualif</option>
            <option value="benchmark">Benchmark</option>
          </select>
        </div>
      </div>

      <div><label className="label">Contenu de la séance</label>
        <textarea name="description" rows={7} defaultValue={w?.description} className="field font-mono text-sm leading-relaxed" placeholder={"For time :\n21-15-9\nThruster 43/30 kg\nPull-up"} /></div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="label">Type de score</label>
          <select name="score_type" value={scoreType} onChange={(e) => setScoreType(e.target.value as Workout["score_type"])} className="field">
            <option value="time">Temps (for time)</option>
            <option value="rounds_reps">Rounds + reps (AMRAP)</option>
            <option value="reps">Reps totales</option>
            <option value="load">Charge (kg)</option>
            <option value="calories">Calories</option>
            <option value="distance">Distance (m)</option>
            <option value="none">Pas de score</option>
          </select>
        </div>
        {scoreType === "rounds_reps" && <div><label className="label">Reps par round</label><input name="reps_per_round" inputMode="numeric" defaultValue={w?.reps_per_round ?? ""} className="field" /></div>}
        <div><label className="label">Time cap (mm:ss)</label><input name="time_cap" defaultValue={w?.time_cap_s ? fmtTime(w.time_cap_s) : ""} className="field" placeholder="12:00" /></div>
      </div>

      <div>
        <label className="label">Mouvements de la séance</label>
        <div className="flex flex-wrap gap-2">
          {sel.map((id) => (
            <button key={id} type="button" onClick={() => setSel(sel.filter((x) => x !== id))} className="chip border-bleu bg-bleu/15 normal-case tracking-normal text-fog">
              {name(id)} ✕
            </button>
          ))}
        </div>
        <div className="relative mt-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ajouter un mouvement…" className="field" />
          {matches.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-line-2 bg-panel-2 shadow-2xl">
              {matches.map((m) => (
                <li key={m.id}><button type="button" onClick={() => { setSel([...sel, m.id]); setQ(""); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/5">{m.name}</button></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div><label className="label">Notes coach (stimulus, scaling, consignes)</label>
        <textarea name="coach_notes" rows={3} defaultValue={w?.coach_notes ?? ""} className="field text-sm" /></div>

      <div className="rounded-2xl border border-line p-4">
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" checked={showAnchors} onChange={(e) => setShowAnchors(e.target.checked)} className="h-5 w-5 accent-[#d1ec2d]" />
          Cette séance compte dans le niveau des athlètes (qualif / benchmark)
        </label>
        {showAnchors && (
          <div className="mt-4 grid gap-3">
            <input type="hidden" name="counts_in_level" value="on" />
            <p className="text-xs text-dim">Score RX attendu à chaque palier {isTime ? "(temps mm:ss)" : ""}. 100 = niveau Games.</p>
            {(["am_", "af_"] as const).map((p) => (
              <div key={p} className="grid grid-cols-[70px_repeat(5,1fr)] items-center gap-2">
                <span className="text-xs font-bold uppercase text-muted">{p === "am_" ? "Hommes" : "Femmes"}</span>
                {LV.map(([k, l]) => (
                  <div key={k}>
                    <span className="mb-1 block text-center text-[10px] font-semibold uppercase text-dim">{l}</span>
                    <input name={`${p}${k}`} defaultValue={av(p === "am_" ? w?.anchors_m : w?.anchors_f, k)} className="field px-2 text-center text-sm" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="published" defaultChecked={w?.published ?? true} className="h-5 w-5 accent-[#2e5aef]" />
        Publiée (visible par les athlètes)
      </label>

      <FormMessage state={state} />
      <Submit className="btn-lime md:w-auto md:justify-self-start md:px-8" pending="Enregistrement…">{w ? "Enregistrer" : "Créer la séance"}</Submit>
    </form>
  );
}
