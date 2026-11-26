import type { Metadata } from "next";
import { formatLabel } from "@/lib/prescription";
import Link from "next/link";
import { db, must } from "@/lib/db";
import { fmtDate, SOURCE_LABEL } from "@/lib/format";
import type { Workout } from "@/lib/types";
import { SourceTag } from "@/components/ui";

export const metadata: Metadata = { title: "Séances" };

export default async function Seances({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const s = (await searchParams).s ?? "all";
  let q = db().from("workouts").select("*").order("workout_date", { ascending: false }).limit(200);
  if (s !== "all") q = q.eq("source", s);
  const [workouts, counts] = await Promise.all([
    q.then((r) => must(r) as Workout[]),
    db().from("results").select("workout_id").not("workout_id", "is", null).then((r) => (r.data ?? []) as { workout_id: string }[]),
  ]);
  const n = new Map<string, number>();
  for (const c of counts) n.set(c.workout_id, (n.get(c.workout_id) ?? 0) + 1);
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><Link href="/admin/seances" className="text-[13px] font-medium text-bleu-2">‹ Planning</Link><h1 className="display mt-1 text-4xl">Toutes les séances</h1></div>
        <Link href="/admin/seances/nouvelle" className="btn-lime">+ Nouvelle séance</Link>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {["all", "competition", "affiliates", "qualif", "benchmark"].map((f) => (
          <Link key={f} href={f === "all" ? "/admin/seances/liste" : `/admin/seances/liste?s=${f}`} className={`chip shrink-0 ${s === f ? "border-bleu bg-bleu text-white" : ""}`}>
            {f === "all" ? "Toutes" : SOURCE_LABEL[f]}
          </Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-dim">
            <tr className="border-b border-line"><th className="px-4 py-3">Date</th><th className="px-4">Séance</th><th className="px-4">Source</th><th className="px-4">Scores</th><th className="px-4">Statut</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {workouts.map((w) => (
              <tr key={w.id} className="hover:bg-white/[0.03]">
                <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDate(w.workout_date, { day: "numeric", month: "short", year: "2-digit" })}</td>
                <td className="px-4"><Link href={`/admin/seances/${w.id}`} className="font-semibold hover:text-lime">{w.block ? `${w.block}. ` : ""}{w.title}</Link>{w.format && <span className="ml-2 text-[11px] text-muted">{formatLabel(w)}</span>}{w.counts_in_level && <span className="ml-2 text-[10px] font-bold text-lime">● NIVEAU</span>}</td>
                <td className="px-4"><SourceTag source={w.source} subtrack={w.subtrack} /></td>
                <td className="px-4 tabular-nums">{n.get(w.id) ?? 0}</td>
                <td className="px-4">{w.published ? <span className="text-lime">Publiée</span> : <span className="text-dim">Brouillon</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!workouts.length && <p className="p-6 text-center text-sm text-muted">Aucune séance.</p>}
      </div>
    </div>
  );
}
