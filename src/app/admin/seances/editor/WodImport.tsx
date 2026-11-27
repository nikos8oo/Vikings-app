"use client";

import { useMemo, useState } from "react";
import type { Item, Rx } from "@/lib/prescription";
import { fmtTime } from "@/lib/format";
import { parseWod, type ParseResult } from "@/lib/wodParser";

type Mv = { id: string; name: string; category: string };

const fmtNum = (v: number) => String(v).replace(".", ",");
function qty(it: Item): string {
  const p: string[] = [];
  if (it.sets?.length) {
    const s = it.sets[0];
    p.push(`${it.sets.length} × ${s.reps}${s.pct != null ? ` @ ${fmtNum(s.pct)} %` : s.kg_m != null ? ` @ ${fmtNum(s.kg_m)}${s.kg_f != null ? `/${fmtNum(s.kg_f)}` : ""} kg` : ""}`);
    return p.join(" ");
  }
  if (it.reps != null) p.push(`${it.reps} reps`);
  if (it.cal != null) p.push(`${fmtNum(it.cal)}${it.cal_f != null ? `/${fmtNum(it.cal_f)}` : ""} cal`);
  if (it.dist_m != null) p.push(`${fmtNum(it.dist_m)}${it.dist_f != null ? `/${fmtNum(it.dist_f)}` : ""} m`);
  if (it.time_s != null) p.push(fmtTime(it.time_s));
  if (it.pct != null) p.push(`@ ${fmtNum(it.pct)} %`);
  else if (it.kg_m != null) p.push(`${fmtNum(it.kg_m)}${it.kg_f != null ? `/${fmtNum(it.kg_f)}` : ""} kg`);
  if (it.height_cm != null) p.push(`${it.height_cm} cm`);
  return p.join(" · ") || "—";
}

/** « Coller un WOD » : texte libre → bloc structuré, avec relecture avant de construire. */
export function WodImport({ movements, onApply }: { movements: Mv[]; onApply: (r: { rx: Rx; title: string | null; notes: string[] }) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [res, setRes] = useState<ParseResult | null>(null);
  const [pick, setPick] = useState<string[]>([]);   // mouvement choisi par ligne
  const [skip, setSkip] = useState<boolean[]>([]);  // ligne ignorée
  const [over, setOver] = useState(false);
  const sorted = useMemo(() => [...movements].sort((a, b) => a.name.localeCompare(b.name, "fr")), [movements]);

  const analyse = (t = text) => {
    if (!t.trim()) return;
    const r = parseWod(t, movements);
    setRes(r);
    setPick(r.lines.map((l) => l.mv ?? ""));
    setSkip(r.lines.map(() => false));
  };

  const drop = async (e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    const f = e.dataTransfer.files?.[0];
    const t = f && /text|markdown|^$/.test(f.type) ? await f.text() : e.dataTransfer.getData("text/plain");
    if (t) { setText(t); analyse(t); }
  };

  const build = () => {
    if (!res) return;
    const items = res.rx.items.map((it, i) => ({ ...it, mv: pick[i] ?? it.mv })).filter((it, i) => !skip[i] && it.mv);
    onApply({ rx: { ...res.rx, items }, title: res.title, notes: res.notes });
    setOpen(false); setRes(null); setText("");
  };

  const missing = res ? res.rx.items.some((_, i) => !skip[i] && !pick[i]) : false;
  const kept = res ? res.rx.items.filter((_, i) => !skip[i] && pick[i]).length : 0;

  if (!open) return (
    <button type="button" onClick={() => setOpen(true)}
      className="ios-group flex w-full items-center gap-3 border border-dashed border-line-2 px-4 py-3.5 text-left transition hover:border-bleu">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bleu/10 text-bleu-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="3" width="8" height="4" rx="1" /><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><path d="M9 12h6M9 16h4" /></svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-fog">Coller un WOD</span>
        <span className="block text-[13px] text-muted">Colle ou glisse le texte d&apos;un entraînement (Strivee, BTWB, WhatsApp…) : le bloc se construit tout seul.</span>
      </span>
    </button>
  );

  return (
    <section className="ios-group overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="text-[15px] font-semibold text-fog">Coller un WOD</span>
        <button type="button" onClick={() => { setOpen(false); setRes(null); }} className="text-[14px] text-bleu-2">Fermer</button>
      </div>

      {!res ? (
        <div className="grid gap-3 p-4">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} autoFocus
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}
            onPaste={(e) => { const t = e.clipboardData.getData("text"); if (t && !text.trim()) { e.preventDefault(); setText(t); analyse(t); } }}
            placeholder={"Exemple :\nAMRAP 14'\n5 Bar muscle-up\n10 Power snatch, 50/35 kg\n15/12 cal Echo bike"}
            className={`w-full resize-y rounded-[12px] border bg-canvas px-3.5 py-3 font-mono text-[13px] leading-relaxed text-fog outline-none placeholder:text-dim ${over ? "border-bleu" : "border-line"}`} />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-dim">Un mouvement par ligne. Les consignes et les repos partent dans les notes coach.</p>
            <button type="button" onClick={() => analyse()} disabled={!text.trim()} className="btn-lime px-4 py-2 disabled:opacity-40">Analyser</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-0">
          <div className="flex flex-wrap items-center gap-2 px-4 pt-3">
            <span className="rounded-full bg-fog px-3 py-1 text-[12px] font-semibold text-canvas">{res.summary}</span>
            {res.title && <span className="rounded-full bg-panel-3 px-3 py-1 text-[12px] font-medium text-muted">Titre : {res.title}</span>}
          </div>
          {res.warnings.length > 0 && (
            <ul className="mx-4 mt-3 grid gap-1 rounded-[10px] bg-[#f5a623]/10 px-3 py-2 text-[12px] text-[#b7791f]">
              {res.warnings.map((w) => <li key={w}>⚠ {w}</li>)}
            </ul>
          )}
          <ul className="mt-2 divide-y divide-line">
            {res.lines.map((l, i) => {
              const it = res.rx.items[i];
              if (!it) return null;
              const tone = skip[i] ? "bg-line" : !pick[i] ? "bg-danger" : l.confidence === "ok" && pick[i] === l.mv ? "bg-[#34c759]" : "bg-[#f5a623]";
              const sugg = l.candidates.filter((c) => c.score >= 0.3);
              return (
                <li key={i} className={`grid gap-1.5 px-4 py-2.5 ${skip[i] ? "opacity-45" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${tone}`} />
                    <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-dim">{l.raw}</span>
                    <button type="button" onClick={() => setSkip(skip.map((v, k) => (k === i ? !v : v)))} className="text-[12px] text-muted hover:text-fog">{skip[i] ? "Garder" : "Ignorer"}</button>
                  </div>
                  {!skip[i] && l.adapt && (
                    <p className="pl-4 text-[11px] text-muted">
                      {(["elite", "inter", "fitness"] as const).filter((k) => l.adapt?.[k]).map((k) => `${k === "elite" ? "Élite" : k === "inter" ? "Inter" : "Fitness"} : ${l.adapt![k]}`).join(" · ")}
                    </p>
                  )}
                  {!skip[i] && (
                    <div className="flex items-center gap-2 pl-4">
                      <select value={pick[i] ?? ""} onChange={(e) => setPick(pick.map((v, k) => (k === i ? e.target.value : v)))}
                        className={`min-w-0 flex-1 rounded-[8px] border bg-canvas px-2 py-1.5 text-[14px] text-fog ${!pick[i] ? "border-danger/60" : "border-line"}`}>
                        <option value="">Choisir le mouvement…</option>
                        {sugg.length > 0 && <optgroup label="Suggestions">{sugg.map((c) => <option key={"s" + c.id} value={c.id}>{c.name}</option>)}</optgroup>}
                        <optgroup label="Tous les mouvements">{sorted.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</optgroup>
                      </select>
                      <span className="shrink-0 text-[12px] tabular-nums text-muted">{qty(it)}</span>
                    </div>
                  )}
                </li>
              );
            })}
            {!res.lines.length && <li className="px-4 py-4 text-[13px] text-muted">Aucun mouvement trouvé dans ce texte.</li>}
          </ul>
          {res.notes.length > 0 && (
            <div className="border-t border-line px-4 py-2.5">
              <p className="text-[12px] font-medium text-muted">Ajouté aux notes coach</p>
              <p className="mt-0.5 line-clamp-3 text-[12px] text-dim">{res.notes.join(" · ")}</p>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
            <button type="button" onClick={() => setRes(null)} className="text-[14px] font-medium text-muted hover:text-fog">Modifier le texte</button>
            <button type="button" onClick={build} disabled={missing || !kept} className="btn-lime px-4 py-2 disabled:opacity-40">
              {missing ? "Choisis les mouvements en rouge" : `Construire le bloc · ${kept} mouvement${kept > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
