"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { tierOf } from "@/lib/scoring";

type Row = {
  id: string; name: string; email: string; sex: string; role: string; box: string; level: number | null; tier: string;
  provisional: boolean; tests: number; results: number; last: string | null; domains: Record<string, number | null>;
};
const DOM = [["force", "FOR"], ["halterophilie", "HAL"], ["gymnastique", "GYM"], ["engine", "ENG"], ["metcon", "MET"]];

function Cell({ v }: { v: number | null }) {
  if (v == null) return <span className="text-dim">·</span>;
  const t = tierOf(v);
  return <span className="inline-block min-w-8 rounded px-1 py-0.5 text-center text-xs font-bold" style={{ background: t.color, color: v >= 90 ? "#050505" : "#fff" }}>{Math.round(v)}</span>;
}

export function AthleteTable({ rows, boxes }: { rows: Row[]; boxes: string[] }) {
  const [q, setQ] = useState(""), [box, setBox] = useState(""), [sex, setSex] = useState(""), [tier, setTier] = useState("");
  const [sort, setSort] = useState<"level" | "name" | "last" | "results">("level");
  const list = useMemo(() => {
    const n = q.toLowerCase();
    return rows
      .filter((r) => (!n || r.name.toLowerCase().includes(n) || r.email.includes(n)) && (!box || r.box === box) && (!sex || r.sex === sex) && (!tier || r.tier === tier))
      .sort((a, b) => sort === "name" ? a.name.localeCompare(b.name)
        : sort === "last" ? (b.last ?? "").localeCompare(a.last ?? "")
        : sort === "results" ? b.results - a.results
        : (b.level ?? -1) - (a.level ?? -1));
  }, [rows, q, box, sex, tier, sort]);
  const th = (k: typeof sort, l: string) => (
    <button onClick={() => setSort(k)} className={`uppercase tracking-wider ${sort === k ? "text-lime" : ""}`}>{l}</button>
  );
  return (
    <>
      <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou email…" className="field" />
        <select value={box} onChange={(e) => setBox(e.target.value)} className="field"><option value="">Toutes les box</option>{boxes.map((b) => <option key={b}>{b}</option>)}</select>
        <select value={sex} onChange={(e) => setSex(e.target.value)} className="field"><option value="">H + F</option><option value="M">Hommes</option><option value="F">Femmes</option></select>
        <select value={tier} onChange={(e) => setTier(e.target.value)} className="field"><option value="">Tous niveaux</option>{["Games", "Élite", "RX", "Intermédiaire", "Fitness"].map((t) => <option key={t}>{t}</option>)}</select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="text-left text-[11px] text-dim">
            <tr className="border-b border-line">
              <th className="px-4 py-3">{th("name", "Athlète")}</th><th className="px-3">BOX</th><th className="px-3">{th("level", "Niveau")}</th>
              {DOM.map(([, l]) => <th key={l} className="px-1.5 text-center uppercase tracking-wider">{l}</th>)}
              <th className="px-3">{th("results", "Perfs")}</th><th className="px-3">{th("last", "Dernière")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/athletes/${r.id}`} className="font-semibold hover:text-lime">{r.name}</Link>
                  <span className="ml-1.5 text-xs text-dim">{r.sex}</span>
                  {r.role !== "athlete" && <span className="ml-1.5 rounded bg-lime px-1 text-[9px] font-bold uppercase text-ink">{r.role}</span>}
                </td>
                <td className="px-3 text-muted">{r.box || "—"}</td>
                <td className="px-3"><Cell v={r.level} /> <span className="text-xs text-muted">{r.tier}{r.provisional && r.level != null ? "*" : ""}</span></td>
                {DOM.map(([k]) => <td key={k} className="px-1.5 text-center"><Cell v={r.domains[k]} /></td>)}
                <td className="px-3 tabular-nums">{r.results}</td>
                <td className="px-3 text-xs text-muted">{r.last ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <p className="p-6 text-center text-sm text-muted">Aucun athlète.</p>}
      </div>
      <p className="text-xs text-dim">* niveau provisoire (moins de 6 tests ou 3 domaines).</p>
    </>
  );
}
