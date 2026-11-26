"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { CATEGORY_LABEL, CATEGORY_ORDER } from "@/lib/format";
import { tierOf } from "@/lib/scoring";

type Item = { id: string; name: string; category: string; family: string | null; label: string | null; scored: boolean; best: string | null; score: number | null };

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function MovementBrowser({ items }: { items: Item[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [mine, setMine] = useState(false);
  const dq = useDeferredValue(q);
  const filtered = useMemo(() => {
    const n = norm(dq);
    return items.filter((i) =>
      (cat === "all" || i.category === cat) && (!mine || i.best) &&
      (!n || norm(i.name).includes(n) || norm(i.family ?? "").includes(n)));
  }, [items, dq, cat, mine]);
  const groups = CATEGORY_ORDER.map((c) => ({ c, list: filtered.filter((i) => i.category === c) })).filter((g) => g.list.length);
  const done = items.filter((i) => i.best).length;

  return (
    <div className="mt-6">
      <div className="sticky top-[68px] z-20 -mx-5 bg-canvas/80 px-5 pb-3 pt-1 backdrop-blur-xl">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un mouvement…" className="field pl-10" />
        </div>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          <button onClick={() => setMine(!mine)} className={`chip shrink-0 ${mine ? "border-lime bg-lime text-ink" : ""}`}>Mes perfs · {done}</button>
          {["all", ...CATEGORY_ORDER].map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`chip shrink-0 ${cat === c ? "border-bleu bg-bleu text-white" : ""}`}>
              {c === "all" ? "Tout" : CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-7">
        {groups.map((g) => (
          <section key={g.c}>
            <h2 className="kicker mb-2">{CATEGORY_LABEL[g.c]} <span className="text-dim">· {g.list.length}</span></h2>
            <ul className="card divide-y divide-line overflow-hidden">
              {g.list.map((i) => (
                <li key={i.id}>
                  <Link href={`/perfs/${i.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.03]">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${i.scored ? "bg-lime" : "bg-transparent"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{i.name}</span>
                      <span className="block truncate text-xs text-dim">{i.label}</span>
                    </span>
                    {i.best ? <span className="text-sm font-semibold tabular-nums text-fog">{i.best}</span> : <span className="text-xs text-dim">+ Ajouter</span>}
                    {i.score != null && (
                      <span className="min-w-9 rounded-md px-1.5 py-0.5 text-center text-xs font-bold"
                        style={{ background: tierOf(i.score).color, color: i.score >= 90 ? "#050505" : "#fff" }}>{Math.round(i.score)}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!groups.length && <p className="py-10 text-center text-sm text-muted">Aucun mouvement trouvé.</p>}
      </div>
    </div>
  );
}
