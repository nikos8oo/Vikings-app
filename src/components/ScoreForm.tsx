"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addMovementResult, addWorkoutResult, type ResultState } from "@/app/actions/results";
import { FormMessage, Submit } from "./forms";

type Props =
  | { mode: "movement"; id: string; metric: string; label: string | null; today: string }
  | { mode: "workout"; id: string; scoreType: string; rpr: number | null; timeCap: number | null; today: string };

const UNIT: Record<string, string> = { load: "kg", reps: "reps", distance: "m", calories: "cal", height: "cm" };

export function ScoreForm(p: Props) {
  const [state, action] = useActionState<ResultState, FormData>(p.mode === "movement" ? addMovementResult : addWorkoutResult, null);
  const [capped, setCapped] = useState(false);
  const [more, setMore] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) { ref.current?.reset(); setCapped(false); } }, [state]);
  const kind = p.mode === "movement" ? p.metric : p.scoreType;

  return (
    <form ref={ref} action={action} className="grid gap-4">
      <input type="hidden" name={p.mode === "movement" ? "movement_id" : "workout_id"} value={p.id} />

      {kind === "rounds_reps" ? (
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Rounds</label><input name="rounds" inputMode="numeric" required className="field text-center text-2xl font-bold" /></div>
          <div><label className="label">+ Reps</label><input name="reps" inputMode="numeric" defaultValue="0" className="field text-center text-2xl font-bold" /></div>
        </div>
      ) : kind === "none" ? null : capped ? (
        <div><label className="label">Reps réalisées au time cap</label><input name="cap_reps" inputMode="numeric" required className="field text-center text-2xl font-bold" /></div>
      ) : (
        <div>
          <label className="label">{kind === "time" ? "Temps (mm:ss)" : p.mode === "movement" ? p.label ?? "Valeur" : "Score"}</label>
          <div className="relative">
            <input name="value" required inputMode={kind === "time" ? "text" : "decimal"} placeholder={kind === "time" ? "3:45" : "0"}
              autoComplete="off" className="field pr-14 text-center text-2xl font-bold tracking-wide" />
            {UNIT[kind] && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-dim">{UNIT[kind]}</span>}
          </div>
        </div>
      )}

      {p.mode === "workout" && (
        <>
          <fieldset>
            <legend className="label">Version</legend>
            <div className="grid grid-cols-4 gap-2">
              {[["elite", "Élite"], ["rx", "RX"], ["inter", "Inter"], ["fitness", "Fitness"]].map(([v, l]) => (
                <label key={v} className="cursor-pointer">
                  <input type="radio" name="division" value={v} defaultChecked={v === "rx"} className="peer sr-only" />
                  <span className="flex justify-center rounded-xl border border-line bg-panel-2 py-2.5 text-sm font-semibold text-muted transition peer-checked:border-lime peer-checked:bg-lime peer-checked:text-ink">{l}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {p.scoreType === "time" && p.timeCap && (
            <label className="flex items-center gap-3 text-sm text-muted">
              <input type="checkbox" name="capped" checked={capped} onChange={(e) => setCapped(e.target.checked)} className="h-5 w-5 accent-[#d1ec2d]" />
              Time cap atteint ({Math.floor(p.timeCap / 60)} min)
            </label>
          )}
        </>
      )}

      <button type="button" onClick={() => setMore(!more)} className="justify-self-start text-xs font-semibold text-muted">
        {more ? "− Moins d'options" : "+ Date, RPE, notes"}
      </button>
      {more && (
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date</label><input type="date" name="performed_on" defaultValue={p.today} max={p.today} className="field" /></div>
            <div><label className="label">RPE (1-10)</label><input name="rpe" inputMode="numeric" placeholder="8" className="field" /></div>
          </div>
          <div><label className="label">Notes</label><textarea name="notes" rows={2} className="field" placeholder="Sensations, scaling, matériel…" /></div>
        </div>
      )}
      <FormMessage state={state} />
      <Submit className="btn-lime w-full py-3.5" pending="Enregistrement…">Enregistrer</Submit>
    </form>
  );
}
