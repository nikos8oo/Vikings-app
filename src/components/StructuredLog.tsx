"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { addStructuredResult, type ResultState } from "@/app/actions/results";
import { FORMATS, loadFor, primaryUnit, qtyFor, UNIT_LABEL, type Detail, type Rx } from "@/lib/prescription";
import type { Sex } from "@/lib/types";
import { FormMessage, Submit } from "./forms";

type SetRow = { mv: string; reps: string; kg: string };
const s = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));
const n = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

export function StructuredLog({ workoutId, rx, sex, maxes, names, rpr, today }: {
  workoutId: string; rx: Rx; sex: Sex; maxes: Record<string, number>; names: Record<string, string>; rpr: number | null; today: string;
}) {
  const [state, action] = useActionState<ResultState, FormData>(addStructuredResult, null);
  const isSets = rx.format === "sets" || rx.format === "max";
  const score = FORMATS[rx.format].score;
  const [written, setWritten] = useState(true);
  const [division, setDivision] = useState("rx");
  const [capped, setCapped] = useState(false);
  const [more, setMore] = useState(false);

  // séries prescrites converties pour l'athlète
  const prescribed = useMemo<SetRow[]>(() => rx.items.flatMap((it) => (it.sets ?? []).map((st) => ({ mv: it.mv, reps: String(st.reps), kg: s(loadFor(st, sex, maxes[it.mv])) }))), [rx, sex, maxes]);
  const [sets, setSets] = useState<SetRow[]>(prescribed);
  const [mods, setMods] = useState<Record<string, { qty: string; kg: string }>>(() =>
    Object.fromEntries(rx.items.map((it) => [it.mv, { qty: s(qtyFor(it, sex)), kg: s(loadFor(it, sex, maxes[it.mv])) }])));
  useEffect(() => { if (state?.ok) { setWritten(true); setSets(prescribed); setCapped(false); } }, [state, prescribed]);

  const maxMode = rx.format === "max";
  const detail: Detail | null = maxMode
    ? { sets: [{ mv: rx.items[0]?.mv, reps: Number(sets[0]?.reps) || 1, kg: n(sets[0]?.kg ?? "") }] }
    : written ? null
    : isSets ? { sets: sets.map((r) => ({ mv: r.mv, reps: Number(r.reps) || 0, kg: n(r.kg) })) }
    : { items: Object.fromEntries(Object.entries(mods).map(([k, v]) => [k, { qty: n(v.qty), kg: n(v.kg) }])) };

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="workout_id" value={workoutId} />
      <input type="hidden" name="as_written" value={written || maxMode ? "on" : "off"} />
      <input type="hidden" name="division" value={division} />
      <input type="hidden" name="detail" value={JSON.stringify(detail)} />

      {!maxMode && (
        <div className="seg w-full">
          <button type="button" aria-pressed={written} onClick={() => setWritten(true)} className="seg-btn py-2">Comme écrit</button>
          <button type="button" aria-pressed={!written} onClick={() => setWritten(false)} className="seg-btn py-2">J&apos;ai modifié</button>
        </div>
      )}

      {/* X Rep Max : la charge réussie */}
      {maxMode && (
        <div>
          <label className="label">{sets[0]?.reps ?? 1}RM réussi</label>
          <div className="relative">
            <input value={sets[0]?.kg ?? ""} onChange={(e) => setSets([{ ...sets[0], kg: e.target.value }])} inputMode="decimal" placeholder="0" required
              className="field pr-12 text-center text-2xl font-bold" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-dim">kg</span>
          </div>
          {maxes[rx.items[0]?.mv] && <p className="mt-1.5 text-xs text-dim">Ton record actuel : {s(maxes[rx.items[0].mv])} kg</p>}
        </div>
      )}

      {/* Séries : comme écrit = récap, modifié = tableau éditable */}
      {rx.format === "sets" && (
        <div className="ios-group">
          <div className="grid grid-cols-[28px_1fr_1fr_28px] items-center gap-2 px-4 pt-3 text-[11px] text-dim">
            <span>#</span><span className="text-center">Reps</span><span className="text-center">kg</span><span />
          </div>
          <div className="grid gap-1.5 px-4 pb-3 pt-1.5">
            {(written ? prescribed : sets).map((r, k, arr) => (
              <div key={k} className="grid grid-cols-[28px_1fr_1fr_28px] items-center gap-2">
                <span className="text-[13px] tabular-nums text-muted" title={names[r.mv]}>{k + 1}</span>
                {written ? (
                  <><span className="py-2 text-center text-[15px] tabular-nums">{r.reps}</span><span className="py-2 text-center text-[15px] tabular-nums">{r.kg || "—"}</span><span /></>
                ) : (
                  <>
                    <input value={r.reps} inputMode="numeric" onChange={(e) => setSets(arr.map((x, j) => (j === k ? { ...x, reps: e.target.value } : x)))} className="ios-cell" />
                    <input value={r.kg} inputMode="decimal" placeholder="kg" onChange={(e) => setSets(arr.map((x, j) => (j === k ? { ...x, kg: e.target.value } : x)))} className="ios-cell" />
                    <button type="button" onClick={() => setSets(arr.filter((_, j) => j !== k))} className="text-lg text-dim" aria-label="Supprimer">−</button>
                  </>
                )}
              </div>
            ))}
            {!written && <button type="button" onClick={() => setSets([...sets, { ...(sets[sets.length - 1] ?? prescribed[0]) }])} className="btn-ghost mt-1 py-2 text-[13px]">+ Série</button>}
          </div>
          {written && prescribed.some((r) => !r.kg) && <p className="px-4 pb-3 text-[12px] text-dim">Pas encore de max enregistré : choisis « J&apos;ai modifié » pour saisir tes charges.</p>}
        </div>
      )}

      {/* Metcon : score */}
      {!isSets && score !== "none" && (
        score === "rounds_reps" ? (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Tours</label><input name="rounds" inputMode="numeric" required className="field text-center text-2xl font-bold" /></div>
            <div><label className="label">+ Reps</label><input name="reps" inputMode="numeric" defaultValue="0" className="field text-center text-2xl font-bold" /></div>
          </div>
        ) : capped ? (
          <div><label className="label">Reps réalisées au time cap</label><input name="cap_reps" inputMode="numeric" required className="field text-center text-2xl font-bold" /></div>
        ) : (
          <div>
            <label className="label">{score === "time" ? "Temps (mm:ss)" : "Reps totales"}</label>
            <input name="value" required inputMode={score === "time" ? "text" : "numeric"} placeholder={score === "time" ? "8:45" : "0"} autoComplete="off" className="field text-center text-2xl font-bold" />
          </div>
        )
      )}
      {!isSets && score === "time" && rx.time_cap_s && (
        <label className="flex items-center gap-3 text-sm text-muted">
          <input type="checkbox" name="capped" checked={capped} onChange={(e) => setCapped(e.target.checked)} className="h-5 w-5 accent-[#d1ec2d]" />
          Time cap atteint
        </label>
      )}
      {rpr && score === "rounds_reps" && <p className="-mt-2 text-xs text-dim">{rpr} reps par tour</p>}

      {/* Metcon modifié : ce que j'ai vraiment fait */}
      {!isSets && !written && (
        <div className="ios-group">
          <p className="px-4 pt-3 text-[12px] text-muted">Ce que tu as réellement fait, par tour</p>
          {rx.items.map((it) => (
            <div key={it.mv} className="ios-row">
              <span className="min-w-0 flex-1 truncate text-[15px]">{names[it.mv] ?? it.mv}</span>
              {rx.format !== "tabata" && rx.format !== "death_by" && primaryUnit(it, sex) && (
                <span className="flex items-center gap-1">
                  <input value={mods[it.mv]?.qty ?? ""} inputMode="decimal" onChange={(e) => setMods({ ...mods, [it.mv]: { ...mods[it.mv], qty: e.target.value } })} className="ios-cell w-16" />
                  <span className="w-8 text-[12px] text-dim">{UNIT_LABEL[primaryUnit(it, sex) ?? "reps"]}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <input value={mods[it.mv]?.kg ?? ""} inputMode="decimal" placeholder="—" onChange={(e) => setMods({ ...mods, [it.mv]: { ...mods[it.mv], kg: e.target.value } })} className="ios-cell w-16" />
                <span className="text-[12px] text-dim">kg</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {!isSets && (
        <div className="seg w-full">
          {[["rx", "RX"], ["scaled", "Scaled"], ["foundation", "Foundation"]].map(([v, l]) => (
            <button key={v} type="button" aria-pressed={division === v} onClick={() => setDivision(v)} className="seg-btn py-2">{l}</button>
          ))}
        </div>
      )}

      <button type="button" onClick={() => setMore(!more)} className="justify-self-start text-xs font-semibold text-muted">
        {more ? "− Moins d'options" : "+ Date, RPE, notes"}
      </button>
      {more && (
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date</label><input type="date" name="performed_on" defaultValue={today} max={today} className="field" /></div>
            <div><label className="label">RPE (1-10)</label><input name="rpe" inputMode="numeric" placeholder="8" className="field" /></div>
          </div>
          <div><label className="label">Notes</label><textarea name="notes" rows={2} className="field" placeholder="Sensations, matériel…" /></div>
        </div>
      )}
      <FormMessage state={state} />
      <Submit className="btn-lime w-full py-3.5" pending="Enregistrement…">Enregistrer</Submit>
    </form>
  );
}
