"use client";

import { useState } from "react";

type Row = { athlete_id: string; name: string; box: string | null; sex: "M" | "F"; division: string; label: string };

export function Leaderboard({ rows, meId, defaultSex }: { rows: Row[]; meId: string; defaultSex: "M" | "F" }) {
  const [sex, setSex] = useState<"M" | "F">(defaultSex);
  const list = rows.filter((r) => r.sex === sex);
  return (
    <div>
      <div className="mb-3 inline-flex rounded-xl border border-line bg-panel-2 p-1">
        {(["M", "F"] as const).map((s) => (
          <button key={s} onClick={() => setSex(s)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${sex === s ? "bg-bleu text-white" : "text-muted"}`}>
            {s === "M" ? "Hommes" : "Femmes"} <span className="opacity-60">{rows.filter((r) => r.sex === s).length}</span>
          </button>
        ))}
      </div>
      {list.length ? (
        <ol className="card divide-y divide-line">
          {list.map((r, i) => (
            <li key={r.athlete_id} className={`flex items-center gap-3 px-4 py-3 ${r.athlete_id === meId ? "bg-bleu/10" : ""}`}>
              <span className={`display w-7 text-center text-xl ${i === 0 ? "text-lime" : i < 3 ? "text-fog" : "text-dim"}`}>{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{r.name}{r.athlete_id === meId && <span className="ml-1.5 text-lime">· toi</span>}</span>
                <span className="block truncate text-xs text-dim">{r.box ?? "—"}</span>
              </span>
              <span className="text-right">
                <span className="block font-semibold tabular-nums">{r.label}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-dim">{r.division}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : <p className="rounded-2xl border border-dashed border-line-2 p-5 text-center text-sm text-muted">Aucun score dans cette catégorie.</p>}
    </div>
  );
}
