"use client";

import { useActionState, useMemo, useState } from "react";
import { saveWorkout } from "@/app/actions/admin";
import { FormMessage, Submit } from "@/components/forms";
import { MODALITY_LABEL, MODALITY_ORDER, PATTERN_LABEL, PATTERNS_OF, fmtTime, parseTime } from "@/lib/format";
import { computeVolume, describe, FORMATS, RESULT_BY, repsPerRound, TEMPLATES, templateOf, type ResultBy, type Template, type Format, type Item, type Rx, type SetRx, youtubeId } from "@/lib/prescription";
import { SUBTRACKS } from "@/lib/tracks";
import { BLOCK_COLORS, blockStyle } from "@/lib/colors";
import type { Workout } from "@/lib/types";

export type Mv = { id: string; name: string; category: string; metric: string; modality?: string; pattern?: string | null; video_url?: string | null };

const SOURCES = [["competition", "Compétition"], ["affiliates", "Affiliates"], ["qualif", "Qualif"], ["benchmark", "Benchmark"]] as const;
const BLOCKS = ["", "A", "B", "C", "D"];
const LV = [["100", "Games"], ["90", "Élite"], ["75", "RX"], ["60", "Inter"], ["40", "Fitness"]] as const;
/** Titres de blocs les plus utilisés dans la prog Vikings (repris de Strivee). */
const TITLE_PRESETS = [
  "Warm Up", "Weightlifting", "Lower Strength", "Upper Strength", "Gymnastic", "Gymnastic & Press", "Skill Prep",
  "Conditioning", "Metcon", "WOD du Samedi", "Team WOD", "Engine", "Renfo", "Iron Core", "Mobility Flow",
  "Spé Haltérophilie", "Spé Gymnastique", "Spé Functional Bodybuilding", "Spé Engine", "Extra – Upper Strength",
];

const POPULAR = ["back-squat", "deadlift", "clean", "snatch", "thruster", "kipping-pull-up", "double-under", "wall-ball", "row", "run", "burpee", "toes-to-bar"];

type Field = "load" | "reps" | "cal" | "dist" | "time" | "height";
const ALL_FIELDS: Field[] = ["load", "reps", "cal", "dist", "time", "height"];
const LABEL: Record<Field, string> = { load: "Charge", reps: "Répétitions", cal: "Calories", dist: "Distance", time: "Temps", height: "Hauteur" };
const FIELDS: { k: Field; label: string; unit: string; m: "reps" | "cal" | "dist_m" | "time_s"; f?: "cal_f" | "dist_f"; hf?: boolean }[] = [
  { k: "reps", label: "Répétitions", unit: "reps", m: "reps" },
  { k: "cal", label: "Calories", unit: "cal", m: "cal", f: "cal_f", hf: true },
  { k: "dist", label: "Distance", unit: "m", m: "dist_m", f: "dist_f", hf: true },
  { k: "time", label: "Temps", unit: "", m: "time_s" },
];
const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const show = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));

export function WorkoutBuilder({ w, movements, today, defaults, returnTo }: {
  w?: Workout; movements: Mv[]; today: string; defaults?: { date?: string; source?: string; subtrack?: string | null; block?: string }; returnTo?: string;
}) {
  const [state, action] = useActionState(saveWorkout, null);
  const mmap = useMemo(() => new Map(movements.map((m) => [m.id, m])), [movements]);
  const nameOf = (id: string) => mmap.get(id)?.name ?? id;

  const [title, setTitle] = useState<string>(w?.title ?? "");
  const [source, setSource] = useState<string>(w?.source === "vikings" ? "competition" : w?.source ?? defaults?.source ?? "competition");
  const [subtrack, setSubtrack] = useState<string>(w?.subtrack ?? defaults?.subtrack ?? "crossfit");
  const [color, setColor] = useState<string>(w?.color ?? "");
  const [block, setBlock] = useState<string>(w?.block ?? defaults?.block ?? "");
  const initTpl = w?.format ? templateOf({ format: w.format, variant: w.variant ?? null }) : null;
  const [group, setGroup] = useState<"single" | "multi">(initTpl?.group ?? "single");
  const [by, setBy] = useState<ResultBy>(initTpl?.by ?? "tours");
  const [weeks, setWeeks] = useState<Rx[]>(() => [{
    format: w?.format ?? "sets",
    items: w?.items?.length ? w.items : [],
    rounds: w?.rounds ?? null,
    duration_s: w?.duration_s ?? null,
    interval_s: w?.interval_s ?? null,
    rep_scheme: w?.rep_scheme ?? null,
    emom_mode: w?.emom_mode ?? "all",
    time_cap_s: w?.time_cap_s ?? null,
    variant: initTpl?.id ?? "sets",
  }]);
  const [wk, setWk] = useState(0); // semaine affichée (0 = ce bloc, 1..4 = répétitions)
  const rx = weeks[Math.min(wk, weeks.length - 1)];
  const setRx = (fn: Rx | ((r: Rx) => Rx)) => setWeeks((ws) => ws.map((x, i) => (i === wk ? (typeof fn === "function" ? fn(x) : fn) : x)));
  const [date, setDate] = useState<string>(w?.workout_date ?? defaults?.date ?? today);
  const setRepeat = (n: number) => {
    setWeeks((ws) => {
      const out = ws.slice(0, n + 1);
      while (out.length < n + 1) out.push(structuredClone(out[out.length - 1]));
      return out;
    });
    if (wk > n) setWk(n);
  };
  /** Régénère les semaines suivantes depuis S1 avec une progression linéaire. */
  const progress = (kind: "pct" | "kg" | "reps", step: number) => setWeeks((ws) => ws.map((x, k) => {
    if (k === 0) return x;
    const c: Rx = structuredClone(ws[0]);
    const inc = (v: number | null | undefined) => (v == null ? v : Math.round((v + step * k) * 10) / 10);
    c.items = c.items.map((it) => {
      const o = { ...it };
      if (kind === "pct") { o.pct = inc(o.pct); o.sets = o.sets?.map((st) => ({ ...st, pct: inc(st.pct) })); }
      if (kind === "kg") { o.kg_m = inc(o.kg_m); o.kg_f = inc(o.kg_f); o.sets = o.sets?.map((st) => ({ ...st, kg_m: inc(st.kg_m), kg_f: inc(st.kg_f) })); }
      if (kind === "reps") { o.reps = inc(o.reps); o.sets = o.sets?.map((st) => ({ ...st, reps: Math.max(1, (st.reps ?? 0) + step * k) })); }
      return o;
    });
    return c;
  }));
  const addDays = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 86400_000).toISOString().slice(0, 10);
  const short = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const [counts, setCounts] = useState(!!(w?.anchors_m || w?.counts_in_level));

  const patch = (p: Partial<Rx>) => setRx((r) => ({ ...r, ...p }));
  const setItem = (i: number, p: Partial<Item>) => setRx((r) => ({ ...r, items: r.items.map((it, k) => (k === i ? { ...it, ...p } : it)) }));
  const isSets = rx.format === "sets" || rx.format === "max";
  const tpl = templateOf(rx);
  const single = tpl.group === "single" && !tpl.multiItems;

  const chooseTemplate = (t: Template) => setRx((r) => {
    const items = r.items.map((it) => {
      const base = { ...it, phase: t.phases ? it.phase ?? null : null };
      if (t.engine === "sets" || t.engine === "max") return { ...base, sets: it.sets?.length ? (t.engine === "max" ? [{ reps: it.sets[0].reps }] : it.sets) : [{ reps: t.engine === "max" ? 1 : 5 }] };
      return { ...base, sets: undefined };
    });
    return { ...r, ...t.preset, format: t.engine, variant: t.id, items: t.group === "single" && !t.multiItems ? items.slice(0, 1) : items };
  });

  const addMovement = (id: string) => {
    setRx((r) => ({
      ...r,
      items: [...r.items, { ...(isSets ? { mv: id, sets: r.format === "max" ? [{ reps: 1 }] : [{ reps: 5 }, { reps: 5 }, { reps: 5 }] } : { mv: id }), video: movements.find((m) => m.id === id)?.video_url ?? null }],
    }));
  };

  const preview = useMemo(() => (rx.items.length ? describe(rx, nameOf) : ""), [rx]); // eslint-disable-line react-hooks/exhaustive-deps
  const volume = useMemo(() => {
    if (!rx.items.length || ["tabata", "death_by"].includes(rx.format)) return [];
    try { return computeVolume(rx, { sex: "M", division: "rx", value: rx.format === "amrap" ? repsPerRound(rx) : 0 }); } catch { return []; }
  }, [rx]);
  const canAdd = !(single && rx.items.length >= 1);

  return (
    <form action={action} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      {w && <input type="hidden" name="id" value={w.id} />}
      <input type="hidden" name="rx" value={JSON.stringify(weeks[0])} />
      <input type="hidden" name="rx_weeks" value={JSON.stringify(weeks.slice(1))} />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="subtrack" value={source === "affiliates" ? subtrack : ""} />
      <input type="hidden" name="color" value={color} />
      <input type="hidden" name="block" value={block} />
      {returnTo && <input type="hidden" name="return" value={returnTo} />}

      <div className="grid gap-7">
        {/* Séance */}
        <section>
          <h2 className="ios-head">Séance</h2>
          <div className="ios-group">
            <label className="ios-row"><span className="ios-label">Titre</span>
              <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required list="va-titles" placeholder="Choisis ou écris un titre" className="ios-input" /></label>
            <datalist id="va-titles">{TITLE_PRESETS.map((t) => <option key={t} value={t} />)}</datalist>
            <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5">
              {TITLE_PRESETS.map((t) => (
                <button key={t} type="button" onClick={() => setTitle(t)}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition ${title === t ? "bg-fog text-canvas" : "bg-panel-3 text-muted hover:text-fog"}`}>{t}</button>
              ))}
            </div>
            <label className="ios-row"><span className="ios-label">Date</span>
              <input name="workout_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ios-input [color-scheme:dark]" /></label>
            <div className="ios-row justify-between"><span className="ios-label">Partie</span>
              <div className="seg">{BLOCKS.map((b) => <button key={b || "-"} type="button" aria-pressed={block === b} onClick={() => setBlock(b)} className="seg-btn min-w-9">{b || "—"}</button>)}</div>
            </div>
            <div className="ios-row flex-wrap justify-between gap-y-2"><span className="ios-label">Couleur</span>
              <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Couleur du bloc">
                <button type="button" role="radio" aria-checked={!color} onClick={() => setColor("")} title="Aucune"
                  className={`grid h-7 w-7 place-items-center rounded-full border border-line-2 text-[13px] text-dim transition ${!color ? "ring-2 ring-fog ring-offset-2 ring-offset-panel-2" : ""}`}>∅</button>
                {BLOCK_COLORS.map((c) => (
                  <button key={c.id} type="button" role="radio" aria-checked={color === c.id} onClick={() => setColor(c.id)} title={c.label} aria-label={c.label}
                    className={`h-7 w-7 rounded-full transition hover:scale-110 ${color === c.id ? "ring-2 ring-fog ring-offset-2 ring-offset-panel-2" : ""}`} style={{ background: c.hex }} />
                ))}
              </div>
            </div>
            <div className="ios-row flex-wrap justify-between gap-y-2"><span className="ios-label">Programme</span>
              <div className="seg w-full sm:w-auto">{SOURCES.map(([v, l]) => <button key={v} type="button" aria-pressed={source === v} onClick={() => setSource(v)} className="seg-btn px-1.5 text-[12px] sm:px-3 sm:text-[13px]">{l}</button>)}</div>
            </div>
            {source === "affiliates" && (
              <div className="ios-row flex-wrap justify-between gap-y-2"><span className="ios-label">Piste Affiliates</span>
                <div className="seg w-full sm:w-auto">{SUBTRACKS.map((st) => <button key={st.id} type="button" aria-pressed={subtrack === st.id} onClick={() => setSubtrack(st.id)} className="seg-btn px-1.5 text-[12px] sm:px-2.5 sm:text-[13px]">{st.label}</button>)}</div>
              </div>
            )}
          </div>
        </section>

        {weeks.length > 1 && (
          <div id="semaines" className="scroll-mt-32 sticky top-[120px] z-20 lg:top-[76px] -mx-1 rounded-[14px] bg-canvas/85 px-1 py-2 backdrop-blur-xl">
            <div className="seg w-full">
              {weeks.map((_, k) => (
                <button key={k} type="button" aria-pressed={wk === k} onClick={() => setWk(k)} className="seg-btn py-2">
                  <span className="block">S{k + 1}</span><span className="block text-[11px] font-normal text-dim">{short(addDays(date, 7 * k))}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Format : modèles façon BTWB */}
        <section>
          <h2 className="ios-head">Modèle</h2>
          <div className="mb-2 grid gap-2 px-1">
            <div className="seg w-full">
              <button type="button" aria-pressed={group === "single"} onClick={() => setGroup("single")} className="seg-btn">Mouvement unique</button>
              <button type="button" aria-pressed={group === "multi"} onClick={() => setGroup("multi")} className="seg-btn">Mouvements multiples</button>
            </div>
            {group === "multi" && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="pl-3 text-[13px] font-medium text-muted">Résultat par</span>
                <div className="seg">{RESULT_BY.map((r) => <button key={r.id} type="button" aria-pressed={by === r.id} onClick={() => setBy(r.id)} className="seg-btn px-2.5 sm:px-3">{r.label}</button>)}</div>
              </div>
            )}
          </div>
          <div className="ios-group">
            {TEMPLATES.filter((t) => t.group === group && (group === "single" || t.by === by)).map((t) => (
              <button key={t.id} type="button" onClick={() => chooseTemplate(t)} className="ios-row w-full text-left hover:bg-white/[0.02]">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] text-fog">{t.label}</span>
                  <span className="block text-[12px] text-muted">{t.desc}</span>
                </span>
                <span className={`text-lg ${tpl.id === t.id ? "text-bleu-2" : "text-transparent"}`}>✓</span>
              </button>
            ))}
          </div>
        </section>

        {/* Paramètres */}
        <FormatParams key={`fp-${wk}-${tpl.id}`} rx={rx} tpl={tpl} patch={patch} />

        {/* Mouvements */}
        <section>
          <h2 className="ios-head">Mouvements</h2>
          <div className="grid gap-3">
            {rx.items.map((it, i) => (
              <ItemCard key={`${wk}-${i}-${it.mv}`} it={it} index={i} rx={rx} mv={mmap.get(it.mv)} setItem={setItem}
                onRemove={() => patch({ items: rx.items.filter((_, k) => k !== i) })}
                onMove={(d) => { const a = [...rx.items]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; patch({ items: a }); }} />
            ))}
            {canAdd && <MovementPicker movements={movements} onPick={addMovement} />}
          </div>
          {rx.format === "for_time" && <p className="ios-foot">Avec un schéma (ex. 21-15-9), laisse les répétitions vides : elles suivent le schéma.</p>}
          {!isSets && <p className="ios-foot">Remplis ce qui s&apos;applique : répétitions, calories, distance ou temps, puis la charge. « + Calories », « + Distance »… ajoutent une ligne.</p>}
          {isSets && <p className="ios-foot">Une charge en % est convertie en kg pour chaque athlète, à partir de son meilleur score enregistré sur ce mouvement.</p>}
        </section>

        {/* Répétition sur les semaines suivantes */}
        <section>
          <h2 className="ios-head">Répéter ce bloc sur les semaines suivantes</h2>
          <div className="ios-group">
            <div className="ios-row flex-wrap justify-between gap-y-2">
              <span className="ios-label">Semaines suivantes</span>
              <div className="seg">{[0, 1, 2, 3, 4].map((nb) => <button key={nb} type="button" aria-pressed={weeks.length - 1 === nb} onClick={() => setRepeat(nb)} className="seg-btn min-w-10">{nb ? `+${nb}` : "Non"}</button>)}</div>
            </div>
            {weeks.length > 1 && (
              <>
                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <span className="mr-1 text-[13px] text-muted">Progression depuis S1</span>
                  {([["pct", 2.5, "+2,5 %"], ["pct", 5, "+5 %"], ["reps", 1, "+1 rep"], ["kg", 2.5, "+2,5 kg"]] as const).map(([k, st, l]) => (
                    <button key={l} type="button" onClick={() => progress(k, st)} className="rounded-full bg-panel-3 px-3 py-1.5 text-[13px] font-medium text-bleu-2 hover:bg-[#2a2a34]">{l}</button>
                  ))}
                </div>
                {weeks.slice(1).map((x, j) => (
                  <div key={j} className="ios-row">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bleu/20 text-[11px] font-bold text-bleu-2">S{j + 2}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] text-fog">{(() => { const t = new Date(addDays(date, 7 * (j + 1)) + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }); return t.charAt(0).toUpperCase() + t.slice(1); })()}</span>
                      <span className="block truncate text-[12px] text-dim">{x.items.length ? describe(x, nameOf).split("\n").join(" · ") : "Aucun mouvement"}</span>
                    </span>
                    <button type="button" onClick={() => { setWk(j + 1); document.getElementById("semaines")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="text-[14px] font-medium text-bleu-2">Modifier</button>
                  </div>
                ))}
                <p className="px-4 py-3 text-[12px] text-dim">Chaque semaine est placée automatiquement sur le même jour, les semaines suivantes. « Modifier » permet d&apos;ajuster ses reps, ses % ou d&apos;ajouter un mouvement.</p>
              </>
            )}
          </div>
        </section>

        {/* Consignes */}
        <section>
          <h2 className="ios-head">Consignes du coach</h2>
          <div className="ios-group">
            <textarea name="coach_notes" rows={3} defaultValue={w?.coach_notes ?? ""} placeholder="Stimulus, scaling, points techniques…" className="block w-full resize-y bg-transparent px-4 py-3 text-[15px] text-fog outline-none placeholder:text-dim" />
          </div>
        </section>

        {/* Niveau + publication */}
        <section>
          <div className="ios-group">
            <label className="ios-row justify-between"><span className="ios-label">Compte dans le niveau</span>
              <Toggle checked={counts} onChange={setCounts} /></label>
            {counts && (
              <div className="grid gap-3 px-4 py-4">
                <input type="hidden" name="counts_in_level" value="on" />
                <p className="text-[12px] text-dim">Score RX attendu à chaque palier{FORMATS[rx.format].score === "time" ? " (mm:ss)" : ""}. 100 = niveau Games.</p>
                {(["am_", "af_"] as const).map((p) => (
                  <div key={p} className="grid grid-cols-[64px_repeat(5,minmax(0,1fr))] items-end gap-1.5">
                    <span className="pb-2 text-[13px] text-muted">{p === "am_" ? "Hommes" : "Femmes"}</span>
                    {LV.map(([k, l]) => {
                      const a = p === "am_" ? w?.anchors_m : w?.anchors_f;
                      const v = a?.[k] != null ? (FORMATS[rx.format].score === "time" ? fmtTime(Number(a[k])) : String(a[k])) : "";
                      return <label key={k} className="grid gap-1"><span className="text-center text-[10px] text-dim">{l}</span><input name={`${p}${k}`} defaultValue={v} className="ios-cell" /></label>;
                    })}
                  </div>
                ))}
              </div>
            )}
            <label className="ios-row justify-between"><span className="ios-label">Publiée</span>
              <Toggle name="published" defaultChecked={w?.published ?? true} /></label>
          </div>
        </section>

        <div className="sticky bottom-0 z-10 -mx-4 grid gap-2 border-t border-line bg-canvas/85 px-4 py-3 backdrop-blur-xl lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
          <FormMessage state={state} />
          <Submit className="btn-lime w-full py-3.5 lg:w-auto lg:justify-self-start lg:px-10" pending="Enregistrement…">{w ? (weeks.length > 1 ? `Enregistrer + ${weeks.length - 1} semaine${weeks.length > 2 ? "s" : ""}` : "Enregistrer") : weeks.length > 1 ? `Créer ${weeks.length} blocs` : "Créer la séance"}</Submit>
        </div>
      </div>

      {/* Aperçu */}
      <aside className="grid gap-3 lg:sticky lg:top-[88px] lg:max-h-[calc(100dvh-104px)] lg:overflow-y-auto no-scrollbar">
        <h2 className="ios-head">Aperçu athlète</h2>
        <div className="ios-group relative p-5" style={blockStyle(color)}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-lime">{FORMATS[rx.format].label}{block ? ` · Partie ${block}` : ""}{weeks.length > 1 ? ` · S${wk + 1} (${short(addDays(date, 7 * wk))})` : ""}</p>
          {preview ? <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-fog">{preview}</p>
            : <p className="mt-3 text-[14px] text-dim">Ajoute un mouvement pour voir la séance.</p>}
        </div>
        {volume.length > 0 && (
          <div className="ios-group">
            <p className="px-4 pt-3 text-[12px] text-muted">{rx.format === "amrap" ? "Volume par tour (homme, RX)" : "Volume prescrit (homme, RX)"}</p>
            {volume.map((v) => (
              <div key={v.mv} className="ios-row min-h-0 justify-between py-2.5 text-[14px]">
                <span className="truncate text-fog">{nameOf(v.mv)}</span>
                <span className="shrink-0 tabular-nums text-muted">
                  {[v.reps && `${v.reps} reps`, v.cal && `${v.cal} cal`, v.m && `${v.m} m`, v.s && fmtTime(v.s), v.tonnage && `${v.tonnage.toLocaleString("fr-FR")} kg`].filter(Boolean).join(" · ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </aside>
    </form>
  );
}

function FormatParams({ rx, tpl, patch }: { rx: Rx; tpl: Template; patch: (p: Partial<Rx>) => void }) {
  const e = rx.format;
  const many = tpl.params.includes("rounds");
  const field = (pm: string): keyof Rx => (pm === "duration" ? "duration_s" : pm === "rounds" ? "rounds" : pm === "cap" ? "time_cap_s" : pm === "rest" && e === "tabata" ? "duration_s" : "interval_s");
  const label = (pm: string) => {
    switch (pm) {
      case "duration": return many && (e === "amrap" || e === "amreps") ? (tpl.id === "rounds_max_reps" ? "Durée de chaque tour" : "Durée de chaque AMRAP") : "Durée";
      case "rounds": return e === "emom" ? "Nombre d'intervalles" : (tpl.id === "amrap_repeat" || tpl.id === "amrap_series") ? "Nombre d'AMRAP" : "Tours";
      case "rest": return "Repos";
      case "every": return "Toutes les";
      case "work": return tpl.id === "fgb" ? "Durée par station" : "Travail";
      case "cap": return "Time cap";
      default: return "Schéma de reps";
    }
  };
  const ph: Record<string, string> = { duration: "12:00", rounds: e === "emom" ? "12" : e === "tabata" ? "8" : "3", rest: "1:00", every: "1:00", work: tpl.id === "fgb" ? "1:00" : "0:20", cap: "12:00" };
  const rows = tpl.params.map((pm) => {
    if (pm === "scheme") return (
      <label key={pm} className="ios-row"><span className="ios-label">{label(pm)}</span>
        <input defaultValue={rx.rep_scheme?.join("-") ?? ""} placeholder={e === "for_time" ? "21-15-9" : "3-6-9 (continue)"} onChange={(ev) => patch({ rep_scheme: ev.target.value.split(/[^0-9]+/).map(Number).filter((x) => x > 0) })} className="ios-input" /></label>
    );
    const k = field(pm);
    if (pm === "rounds") return (
      <label key={pm} className="ios-row"><span className="ios-label">{label(pm)}</span>
        <input defaultValue={show(rx.rounds)} inputMode="numeric" placeholder={ph[pm]} onChange={(ev) => patch({ rounds: num(ev.target.value) })} className="ios-input" /></label>
    );
    const v = rx[k] as number | null | undefined;
    return (
      <label key={pm} className="ios-row"><span className="ios-label">{label(pm)}</span>
        <input defaultValue={v ? fmtTime(v) : ""} placeholder={ph[pm]} onChange={(ev) => patch({ [k]: ev.target.value.trim() ? parseTime(ev.target.value) : null } as Partial<Rx>)} className="ios-input" /></label>
    );
  });
  if (!rows.length) return null;
  return (
    <section>
      <h2 className="ios-head">{tpl.label}</h2>
      <div className="ios-group">{rows}</div>
      {tpl.phases && <p className="ios-foot">Sur chaque mouvement, choisis Buy-in, Tours ou Buy-out.</p>}
      {tpl.id === "amrap_series" && <p className="ios-foot">Pour des AMRAP aux mouvements différents, crée un bloc par AMRAP (parties A, B, C).</p>}
    </section>
  );
}

function ItemCard({ it, index, rx, mv, setItem, onRemove, onMove }: {
  it: Item; index: number; rx: Rx; mv?: Mv; setItem: (i: number, p: Partial<Item>) => void; onRemove: () => void; onMove: (d: number) => void;
}) {
  const isSets = rx.format === "sets" || rx.format === "max";
  const [pctMode, setPctMode] = useState<boolean>(() => (isSets ? (it.sets ?? []).some((s) => s.pct != null) || !(it.sets ?? []).some((s) => s.kg_m != null) : it.pct != null));
  const hasValue = (k: Field) => (k === "load" ? it.kg_m != null || it.kg_f != null || it.pct != null : k === "reps" ? it.reps != null : k === "cal" ? it.cal != null || it.cal_f != null : k === "dist" ? it.dist_m != null || it.dist_f != null : k === "time" ? it.time_s != null : it.height_cm != null);
  const [shown, setShown] = useState<Field[]>(() => {
    const filled = ALL_FIELDS.filter(hasValue);
    if (filled.length) return filled;
    const mod = mv?.modality ?? (mv?.category === "engine" ? "mono" : "gym");
    const tall: Field[] = mv?.metric === "height" || /box|wall-ball/.test(it.mv) ? ["height"] : [];
    // Haltéro : charge / % d'abord · Gym : volume de reps · Monostructural : cal ou distance
    if (mod === "halt") return ["load", "reps", ...tall];
    if (rx.format === "death_by") return ["reps"];
    if (mod === "mono") return mv?.metric === "calories" ? ["cal"] : mv?.metric === "distance" ? ["dist"] : ["reps"];
    return ["reps", ...tall];
  });
  const hidden = ALL_FIELDS.filter((k) => !shown.includes(k));
  const chips = rx.format === "tabata" || rx.format === "death_by" ? hidden.filter((k) => k === "load" || k === "height") : hidden;
  const loadFirst = shown.includes("load") && mv?.modality === "halt";
  const up = (p: Partial<Item>) => setItem(index, p);
  const sets = it.sets ?? [];
  const setSet = (k: number, p: Partial<SetRx>) => up({ sets: sets.map((s, j) => (j === k ? { ...s, ...p } : s)) });
  const loadRow = (
          <div className="ios-row">
            <span className="ios-label">Charge</span>
            {pctMode ? (
              <span className="flex flex-1 items-center justify-end gap-1.5">
                <input value={show(it.pct)} inputMode="decimal" placeholder="—" onChange={(e) => up({ pct: num(e.target.value), kg_m: null, kg_f: null })} className="ios-cell w-20" />
              </span>
            ) : (
              <span className="flex flex-1 items-center justify-end gap-1.5">
                <input value={show(it.kg_m)} inputMode="decimal" placeholder="H" onChange={(e) => up({ kg_m: num(e.target.value), pct: null })} className="ios-cell w-20" />
                <span className="text-dim">/</span>
                <input value={show(it.kg_f)} inputMode="decimal" placeholder="F" onChange={(e) => up({ kg_f: num(e.target.value), pct: null })} className="ios-cell w-20" />
              </span>
            )}
            <div className="seg shrink-0">
              <button type="button" aria-pressed={!pctMode} onClick={() => setPctMode(false)} className="seg-btn px-2.5">kg</button>
              <button type="button" aria-pressed={pctMode} onClick={() => setPctMode(true)} className="seg-btn px-2.5">%</button>
            </div>
            {!hasValue("load") && shown.length > 1 && <button type="button" onClick={() => setShown(shown.filter((x) => x !== "load"))} className="text-dim" aria-label="Masquer">×</button>}
          </div>
  );

  return (
    <div className="ios-group">
      <div className="ios-row flex-wrap gap-y-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bleu/20 text-[12px] font-bold text-bleu-2">{index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-fog">{mv?.name ?? it.mv}</span>
          <span className="block text-[12px] text-dim">{MODALITY_LABEL[mv?.modality ?? ""] ?? ""}</span>
        </span>
        {templateOf(rx).phases && (
          <div className="seg order-last w-full shrink-0 sm:order-none sm:w-auto">
            {([["buy_in", "Buy-in"], [null, "Tours"], ["buy_out", "Buy-out"]] as const).map(([v, l]) => (
              <button key={l} type="button" aria-pressed={(it.phase ?? null) === v} onClick={() => up({ phase: v })} className="seg-btn px-2 text-[12px]">{l}</button>
            ))}
          </div>
        )}
        {rx.items.length > 1 && <>
          <button type="button" onClick={() => onMove(-1)} className="px-1 text-muted" aria-label="Monter">↑</button>
          <button type="button" onClick={() => onMove(1)} className="px-1 text-muted" aria-label="Descendre">↓</button>
        </>}
        <button type="button" onClick={onRemove} className="pl-2 text-[13px] font-semibold text-danger/90">Retirer</button>
      </div>

      {isSets ? (
        <div className="px-4 py-3">
          {rx.format === "sets" && (
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] text-muted">{sets.length} série{sets.length > 1 ? "s" : ""}</span>
              <div className="seg">
                <button type="button" aria-pressed={pctMode} onClick={() => setPctMode(true)} className="seg-btn">% du max</button>
                <button type="button" aria-pressed={!pctMode} onClick={() => setPctMode(false)} className="seg-btn">kg</button>
              </div>
            </div>
          )}
          <div className={`grid items-center gap-x-2 gap-y-1.5 ${rx.format === "max" ? "grid-cols-[auto_1fr]" : pctMode ? "grid-cols-[28px_1fr_1fr_32px]" : "grid-cols-[28px_1fr_1fr_1fr_32px]"}`}>
            {rx.format === "max" ? (
              <>
                <span className="text-[15px] text-fog">Nombre de reps</span>
                <input value={show(sets[0]?.reps)} inputMode="numeric" onChange={(e) => up({ sets: [{ reps: num(e.target.value) ?? 1 }] })} className="ios-cell" placeholder="1" />
              </>
            ) : (
              <>
                <span className="text-[11px] text-dim">#</span><span className="text-center text-[11px] text-dim">Reps</span>
                {pctMode ? <span className="text-center text-[11px] text-dim">% du max</span> : <><span className="text-center text-[11px] text-dim">kg H</span><span className="text-center text-[11px] text-dim">kg F</span></>}
                <span />
                {sets.map((s, k) => (
                  <SetRow key={k} k={k} s={s} pctMode={pctMode} setSet={setSet} onRemove={sets.length > 1 ? () => up({ sets: sets.filter((_, j) => j !== k) }) : undefined} />
                ))}
              </>
            )}
          </div>
          {rx.format === "sets" && (
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => up({ sets: [...sets, { ...(sets[sets.length - 1] ?? { reps: 5 }) }] })} className="btn-ghost flex-1 py-2 text-[13px]">+ Série</button>
              <button type="button" onClick={() => {
                const l = sets[sets.length - 1] ?? { reps: 5 };
                up({ sets: [...sets, { ...l, pct: l.pct != null ? l.pct + 5 : l.pct, kg_m: l.kg_m != null ? l.kg_m + 5 : l.kg_m, kg_f: l.kg_f != null ? l.kg_f + 2.5 : l.kg_f }] });
              }} className="btn-ghost flex-1 py-2 text-[13px]">+ Série plus lourde</button>
            </div>
          )}
        </div>
      ) : (
        <>
          {loadFirst && loadRow}
          {rx.format !== "tabata" && FIELDS.filter((f) => shown.includes(f.k)).map((f) => (
            <div key={f.k} className="ios-row">
              <span className="ios-label">{rx.format === "death_by" && f.k === "reps" ? (templateOf(rx).id === "death_by_weight" ? "Reps par intervalle" : "Reps ajoutées / intervalle") : f.label}</span>
              <span className="flex flex-1 items-center justify-end gap-1.5">
                {f.k === "time" ? (
                  <input defaultValue={it.time_s ? fmtTime(it.time_s) : ""} placeholder="mm:ss" onChange={(e) => up({ time_s: e.target.value.trim() ? parseTime(e.target.value) : null })} className="ios-cell w-24" />
                ) : f.hf ? (
                  <>
                    <input value={show(it[f.m])} inputMode="decimal" placeholder="H" onChange={(e) => up({ [f.m]: num(e.target.value) })} className="ios-cell w-20" />
                    <span className="text-dim">/</span>
                    <input value={show(it[f.f!])} inputMode="decimal" placeholder="F" onChange={(e) => up({ [f.f!]: num(e.target.value) })} className="ios-cell w-20" />
                  </>
                ) : (
                  <input value={show(it[f.m])} inputMode="numeric" placeholder={rx.format === "for_time" && rx.rep_scheme?.length ? "schéma" : "—"} onChange={(e) => up({ [f.m]: num(e.target.value) })} className="ios-cell w-24" />
                )}
                <span className="w-9 text-[13px] text-dim">{f.unit}</span>
              </span>
              {!hasValue(f.k) && shown.length > 1 && <button type="button" onClick={() => setShown(shown.filter((x) => x !== f.k))} className="text-dim" aria-label="Masquer">×</button>}
            </div>
          ))}
          {shown.includes("load") && !loadFirst && loadRow}
          {shown.includes("height") && (
            <label className="ios-row"><span className="ios-label">Hauteur / cible</span>
              <input value={show(it.height_cm)} inputMode="numeric" placeholder="—" onChange={(e) => up({ height_cm: num(e.target.value) })} className="ios-input" />
              <span className="text-[15px] text-dim">cm</span></label>
          )}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 px-4 py-2.5">
              {chips.map((k) => (
                <button key={k} type="button" onClick={() => setShown([...shown, k])} className="rounded-full bg-panel-3 px-3 py-1.5 text-[13px] font-medium text-bleu-2">+ {LABEL[k]}</button>
              ))}
            </div>
          )}
        </>
      )}
      <div className="ios-row">
        <span className="ios-label text-muted">Vidéo</span>
        <input value={it.video ?? ""} placeholder="Lien YouTube (optionnel)" inputMode="url" onChange={(e) => up({ video: e.target.value.trim() || null })} className="ios-input" />
        {it.video && (youtubeId(it.video)
          ? <a href={it.video} target="_blank" rel="noreferrer" className="shrink-0 rounded-full bg-panel-3 px-2.5 py-1 text-[12px] font-semibold text-bleu-2 hover:text-fog">▶ Voir</a>
          : <span className="shrink-0 text-[12px] text-danger">Lien YouTube invalide</span>)}
      </div>
      <label className="ios-row"><span className="ios-label text-muted">Note</span>
        <input value={it.note ?? ""} placeholder="ex. unbroken, tempo 3-1-1…" onChange={(e) => up({ note: e.target.value || null })} className="ios-input" /></label>
    </div>
  );
}

function SetRow({ k, s, pctMode, setSet, onRemove }: { k: number; s: SetRx; pctMode: boolean; setSet: (k: number, p: Partial<SetRx>) => void; onRemove?: () => void }) {
  return (
    <>
      <span className="text-[13px] tabular-nums text-muted">{k + 1}</span>
      <input value={show(s.reps)} inputMode="numeric" onChange={(e) => setSet(k, { reps: num(e.target.value) ?? 0 })} className="ios-cell" />
      {pctMode ? (
        <input value={show(s.pct)} inputMode="decimal" placeholder="%" onChange={(e) => setSet(k, { pct: num(e.target.value), kg_m: null, kg_f: null })} className="ios-cell" />
      ) : (
        <>
          <input value={show(s.kg_m)} inputMode="decimal" placeholder="kg" onChange={(e) => setSet(k, { kg_m: num(e.target.value), pct: null })} className="ios-cell" />
          <input value={show(s.kg_f)} inputMode="decimal" placeholder="kg" onChange={(e) => setSet(k, { kg_f: num(e.target.value), pct: null })} className="ios-cell" />
        </>
      )}
      {onRemove ? <button type="button" onClick={onRemove} className="text-lg text-dim hover:text-danger" aria-label="Supprimer la série">−</button> : <span />}
    </>
  );
}

function MovementPicker({ movements, onPick }: { movements: Mv[]; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mod, setMod] = useState("");
  const [pat, setPat] = useState("");
  const list = useMemo(() => {
    const s = q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    const pool = mod ? movements.filter((m) => m.modality === mod && (!pat || m.pattern === pat)) : movements;
    if (!s && !mod) return POPULAR.map((id) => movements.find((m) => m.id === id)).filter(Boolean) as Mv[];
    return pool.filter((m) => !s || (m.name + " " + m.id).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(s)).slice(0, s ? 12 : 60);
  }, [q, mod, pat, movements]);
  if (!open) return (
    <button type="button" onClick={() => setOpen(true)} className="ios-group ios-row w-full justify-center text-[15px] font-semibold text-bleu-2 hover:bg-white/[0.02]">+ Ajouter un mouvement</button>
  );
  return (
    <div className="ios-group">
      <div className="ios-row">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un mouvement" className="min-w-0 flex-1 bg-transparent text-[15px] text-fog outline-none placeholder:text-dim" />
        <button type="button" onClick={() => { setOpen(false); setQ(""); setMod(""); }} className="text-[14px] text-bleu-2">Annuler</button>
      </div>
      <div className="flex gap-1.5 px-4 pt-2.5">
        {["", ...MODALITY_ORDER].map((k) => (
          <button key={k} type="button" onClick={() => { setMod(k); setPat(""); }}
            className={`rounded-full px-3 py-1 text-[12px] font-semibold transition ${mod === k ? "bg-fog text-canvas" : "bg-panel-3 text-muted hover:text-fog"}`}>
            {k ? MODALITY_LABEL[k] : "Tous"}
          </button>
        ))}
      </div>
      {mod && PATTERNS_OF[mod].length > 0 && (
        <div className="flex gap-1.5 px-4 pt-2">
          {["", ...PATTERNS_OF[mod]].map((k) => (
            <button key={k} type="button" onClick={() => setPat(k)}
              className={`rounded-full border px-2.5 py-0.5 text-[12px] font-medium transition ${pat === k ? "border-fog text-fog" : "border-line text-muted hover:text-fog"}`}>
              {k ? PATTERN_LABEL[k] : "Tout"}
            </button>
          ))}
        </div>
      )}
      {!q && !mod && <p className="px-4 pt-2 text-[12px] text-dim">Populaires</p>}
      <div className={mod && !q ? "max-h-[360px] overflow-y-auto no-scrollbar" : ""}>
      {list.map((m) => (
        <button key={m.id} type="button" onClick={() => { onPick(m.id); setOpen(false); setQ(""); }} className="ios-row w-full text-left hover:bg-white/[0.03]">
          <span className="flex-1 text-[15px] text-fog">{m.name}</span>
          <span className="text-[12px] text-dim">{MODALITY_LABEL[m.modality ?? ""] ?? ""}</span>
        </button>
      ))}
      </div>
      {!list.length && <p className="px-4 py-4 text-[14px] text-dim">Aucun mouvement. Ajoute-le dans Barèmes.</p>}
    </div>
  );
}

function Toggle({ name, checked, defaultChecked, onChange }: { name?: string; checked?: boolean; defaultChecked?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <span className="relative inline-flex">
      <input type="checkbox" name={name} checked={checked} defaultChecked={defaultChecked} onChange={(e) => onChange?.(e.target.checked)} className="peer sr-only" />
      <span className="h-[31px] w-[51px] rounded-full bg-panel-3 transition peer-checked:bg-[#34c759]" />
      <span className="pointer-events-none absolute left-[2px] top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition peer-checked:translate-x-5" />
    </span>
  );
}
