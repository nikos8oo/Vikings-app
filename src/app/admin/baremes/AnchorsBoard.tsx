"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { createMovement, saveAnchors, setMovementActive, setMovementModality } from "@/app/actions/admin";
import { FormMessage, Submit } from "@/components/forms";
import { CATEGORY_LABEL, CATEGORY_ORDER, MODALITY_LABEL, MODALITY_ORDER, fmtTime } from "@/lib/format";
import type { Anchors, Movement, Workout } from "@/lib/types";

const LV = [["100", "Games"], ["90", "Élite"], ["75", "RX"], ["60", "Inter"], ["40", "Fitness"]] as const;
const UNIT: Record<string, string> = { load: "kg", reps: "reps", time: "m:ss", distance: "m", calories: "cal", height: "cm" };

type W = Pick<Workout, "id" | "title" | "score_type" | "better" | "anchors_m" | "anchors_f" | "counts_in_level" | "source">;
type Row = {
  kind: "movement" | "workout";
  id: string; name: string; group: string; mod?: string; label: string; unit: string;
  isTime: boolean; anchors_m: Anchors | null; anchors_f: Anchors | null;
  weight?: number; active?: boolean; usage?: number;
};

export function AnchorsBoard({ movements, workouts, usage }: { movements: Movement[]; workouts: W[]; usage: Record<string, number> }) {
  const rows: Row[] = useMemo(() => [
    ...workouts.map((w) => ({
      kind: "workout" as const, id: w.id, name: w.title, group: "benchmark", label: w.source === "qualif" ? "WOD de qualif" : "Benchmark",
      unit: UNIT[w.score_type === "rounds_reps" ? "reps" : w.score_type] ?? "", isTime: w.score_type === "time",
      anchors_m: w.anchors_m, anchors_f: w.anchors_f,
    })),
    ...movements.map((m) => ({
      kind: "movement" as const, id: m.id, name: m.name, group: m.category, mod: m.modality, label: m.test_label ?? "", unit: UNIT[m.metric],
      isTime: m.metric === "time" && m.better === "lower", anchors_m: m.anchors_m, anchors_f: m.anchors_f,
      weight: Number(m.weight_in_level), active: m.active, usage: usage[m.id] ?? 0,
    })),
  ], [movements, workouts, usage]);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [only, setOnly] = useState<"" | "with" | "without">("");
  const [open, setOpen] = useState<string | null>(null);

  const list = rows.filter((r) => {
    if (cat && (cat === "benchmark" ? r.group !== cat : r.mod !== cat)) return false;
    if (only === "with" && !(r.anchors_m && r.anchors_f)) return false;
    if (only === "without" && r.anchors_m && r.anchors_f) return false;
    return !q || r.name.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div className="grid gap-3">
      <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr]">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un mouvement…" className="field" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="field">
          <option value="">Toutes catégories</option>
          <option value="benchmark">Benchmarks / qualifs</option>
          {MODALITY_ORDER.map((c) => <option key={c} value={c}>{MODALITY_LABEL[c]}</option>)}
        </select>
        <select value={only} onChange={(e) => setOnly(e.target.value as typeof only)} className="field">
          <option value="">Avec et sans barème</option>
          <option value="with">Avec barème</option>
          <option value="without">Sans barème</option>
        </select>
      </div>
      <ul className="grid gap-2">
        {list.map((r) => (
          <li key={r.kind + r.id} className={`card overflow-hidden ${r.active === false ? "opacity-50" : ""}`}>
            <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className={`h-2 w-2 shrink-0 rounded-full ${r.anchors_m && r.anchors_f ? "bg-lime" : "bg-line"}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-fog">{r.name}</span>
                <span className="block truncate text-xs text-dim">{r.group === "benchmark" ? r.label : `${MODALITY_LABEL[r.mod ?? ""] ?? ""} · ${CATEGORY_LABEL[r.group] ?? r.group} · ${r.label}`}</span>
              </span>
              {r.anchors_m && <span className="hidden text-xs tabular-nums text-muted md:block">H : {show(r.anchors_m["100"], r.isTime)} / F : {show(r.anchors_f?.["100"], r.isTime)} {r.isTime ? "" : r.unit}</span>}
              {r.usage != null && <span className="text-xs text-dim">{r.usage} perf{r.usage > 1 ? "s" : ""}</span>}
              <span className="text-muted">{open === r.id ? "–" : "+"}</span>
            </button>
            {open === r.id && <Editor row={r} />}
          </li>
        ))}
        {list.length === 0 && <li className="py-8 text-center text-sm text-muted">Aucun résultat.</li>}
      </ul>
    </div>
  );
}

function show(v: number | undefined, isTime: boolean) {
  if (v == null) return "—";
  return isTime ? fmtTime(Number(v)) : String(v);
}

function Editor({ row }: { row: Row }) {
  const [state, action] = useActionState(saveAnchors, null);
  const [pending, start] = useTransition();
  return (
    <form action={action} className="grid gap-4 border-t border-line bg-panel-2/40 p-4">
      <input type="hidden" name="id" value={row.id} />
      <input type="hidden" name="kind" value={row.kind} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-dim">
              <th className="pb-2 font-semibold">Unité : {row.unit}</th>
              {LV.map(([k, l]) => <th key={k} className="pb-2 font-semibold">{l} <span className="text-dim">({k})</span></th>)}
            </tr>
          </thead>
          <tbody>
            {([["am_", "Hommes", row.anchors_m], ["af_", "Femmes", row.anchors_f]] as const).map(([p, l, a]) => (
              <tr key={p}>
                <td className="py-1 pr-3 font-semibold text-muted">{l}</td>
                {LV.map(([k]) => (
                  <td key={k} className="py-1 pr-2">
                    <input name={`${p}${k}`} defaultValue={a ? show(a[k], row.isTime) : ""} inputMode={row.isTime ? "text" : "decimal"}
                      placeholder={row.isTime ? "m:ss" : "—"} className="field w-24 py-2 tabular-nums" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {row.kind === "movement" && (
          <label className="flex items-center gap-2 text-sm text-muted">
            Poids dans le niveau
            <input name="weight" defaultValue={row.weight} inputMode="decimal" className="field w-20 py-2" />
            <span className="text-xs text-dim">(0,1 à 1)</span>
          </label>
        )}
        {row.kind === "movement" && (
          <div className="flex items-center gap-1 rounded-full bg-panel-3 p-0.5">
            {MODALITY_ORDER.map((k) => (
              <button key={k} type="button" disabled={pending} onClick={() => start(() => setMovementModality(row.id, k))}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${row.mod === k ? "bg-fog text-canvas" : "text-muted hover:text-fog"}`}>
                {MODALITY_LABEL[k]}
              </button>
            ))}
          </div>
        )}
        <span className="flex-1" />
        {row.kind === "movement" && (
          <button type="button" disabled={pending} onClick={() => start(() => setMovementActive(row.id, !row.active))} className="btn-ghost py-2 text-xs">
            {row.active ? "Masquer aux athlètes" : "Réactiver"}
          </button>
        )}
        <Submit className="btn-lime py-2" pending="…">Enregistrer</Submit>
      </div>
      <FormMessage state={state} />
      <p className="text-xs text-dim">Laisse toutes les cases vides pour retirer le barème : le test reste dans l&apos;app, mais ne compte plus dans le niveau.</p>
    </form>
  );
}

export function NewMovement() {
  const [state, action] = useActionState(createMovement, null);
  const [metric, setMetric] = useState("load");
  return (
    <form action={action} className="grid gap-3 md:grid-cols-3">
      <input name="name" placeholder="Nom (ex. Seated box jump)" required className="field" />
      <select name="modality" className="field" defaultValue="gym">
        {MODALITY_ORDER.map((c) => <option key={c} value={c}>{MODALITY_LABEL[c]}</option>)}
      </select>
      <select name="category" className="field" defaultValue="renfo">
        {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</option>)}
      </select>
      <select name="metric" value={metric} onChange={(e) => setMetric(e.target.value)} className="field">
        <option value="load">Charge (kg)</option>
        <option value="reps">Répétitions</option>
        <option value="time">Temps</option>
        <option value="distance">Distance (m)</option>
        <option value="calories">Calories</option>
        <option value="height">Hauteur (cm)</option>
      </select>
      <input name="test_label" placeholder="Test (ex. 1RM, Max reps unbroken)" className="field" />
      <input name="equipment" placeholder="Matériel" className="field" />
      <input name="family" placeholder="Famille (squat, hinge, pull…)" className="field" />
      {metric === "time" && (
        <label className="flex items-center gap-2 text-sm text-muted md:col-span-2">
          <input type="checkbox" name="time_higher" className="h-4 w-4 accent-[#d1ec2d]" /> Tenue (plus long = meilleur)
        </label>
      )}
      <div className="md:col-span-3"><FormMessage state={state} /></div>
      <Submit className="btn-lime md:col-start-3" pending="…">Ajouter</Submit>
    </form>
  );
}
