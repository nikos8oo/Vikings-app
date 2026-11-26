import type { Metadata } from "next";
import Link from "next/link";
import { allLevels, fetchAll, getBoxes, getMovementMap } from "@/lib/data";
import { db } from "@/lib/db";
import { fmtDate, fmtMetric } from "@/lib/format";
import { TIERS, tierOf } from "@/lib/scoring";
import { ATHLETE_COLS } from "@/lib/session";
import type { Athlete } from "@/lib/types";
import { SectionTitle } from "@/components/ui";
import { WeekBoard } from "./WeekBoard";
import { DemoPanel } from "./DemoPanel";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Admin" };
export const maxDuration = 60; // génération de la démo

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ wp?: string; wd?: string }> }) {
  const { wp, wd } = await searchParams;
  const me = await requireStaff();
  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const [athletes, boxes, recentRes, weekCount, wCount, mmap, demoW, demoA] = await Promise.all([
    fetchAll<Athlete>("athletes", ATHLETE_COLS),
    getBoxes(),
    db().from("results").select("id,value,performed_on,movement_id,workout_id,athletes(first_name,last_name),workouts(title)").order("created_at", { ascending: false }).limit(12),
    db().from("results").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
    db().from("workouts").select("id", { count: "exact", head: true }).neq("source", "benchmark"),
    getMovementMap(),
    db().from("workouts").select("id", { count: "exact", head: true }).eq("is_demo", true),
    db().from("athletes").select("id", { count: "exact", head: true }).eq("is_demo", true),
  ]);
  const levels = await allLevels(athletes);
  const ranked = athletes.map((a) => ({ a, lv: levels.get(a.id)! })).filter((x) => x.lv.global != null);
  const dist = TIERS.map((t) => ({ t, n: ranked.filter((x) => tierOf(x.lv.global!).key === t.key).length }));
  const maxN = Math.max(1, ...dist.map((d) => d.n));
  const perBox = boxes.map((b) => ({ b, n: athletes.filter((a) => a.box_id === b.id).length })).filter((x) => x.n).sort((a, b) => b.n - a.n).slice(0, 8);
  const top = [...ranked].sort((x, y) => y.lv.global! - x.lv.global!).slice(0, 8);
  const totalResults = [...levels.values()].reduce((s, l) => s + l.count, 0);
  const recent = (recentRes.data ?? []) as unknown as { id: string; value: number; performed_on: string; movement_id: string | null; athletes: { first_name: string; last_name: string } | null; workouts: { title: string } | null }[];

  const stats = [
    ["Athlètes", athletes.length],
    ["Perfs enregistrées", totalResults],
    ["Perfs cette semaine", weekCount.count ?? 0],
    ["Séances publiées", wCount.count ?? 0],
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">Équipe Vikings</p>
          <h1 className="display mt-1 text-4xl">Tableau de bord</h1>
        </div>
        <div className="flex gap-2">
          <a href="/admin/export" className="btn-ghost">Export CSV</a>
          <Link href="/admin/seances" className="btn-lime">Planning</Link>
        </div>
      </div>

      <WeekBoard program={wp === "affiliates" ? "affiliates" : "competition"} anchor={wd} />

      {me.role === "admin" && <DemoPanel blocks={demoW.count ?? 0} athletes={demoA.count ?? 0} />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([l, v]) => (
          <div key={l} className="card p-4">
            <p className="kicker">{l}</p>
            <p className="display mt-2 text-4xl text-fog tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-5">
          <SectionTitle>Répartition des niveaux</SectionTitle>
          <div className="grid gap-2.5">
            {dist.map(({ t, n }) => (
              <div key={t.key} className="flex items-center gap-3">
                <span className="w-28 text-sm font-semibold">{t.label}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-white/[0.04]">
                  <div className="h-full rounded-md" style={{ width: `${(n / maxN) * 100}%`, background: t.color, minWidth: n ? 6 : 0 }} />
                </div>
                <span className="w-8 text-right text-sm font-bold tabular-nums">{n}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-dim">{athletes.length - ranked.length} athlète(s) sans niveau (pas encore de test).</p>
        </section>

        <section className="card p-5">
          <SectionTitle action={{ href: "/admin/athletes", label: "Tous" }}>Top niveaux</SectionTitle>
          <ol className="grid gap-1">
            {top.map(({ a, lv }, i) => (
              <li key={a.id}>
                <Link href={`/admin/athletes/${a.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.04]">
                  <span className="display w-6 text-lg text-dim">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">{a.first_name} {a.last_name} <span className="text-dim">· {a.sex}</span></span>
                  <span className="rounded-md px-2 py-0.5 text-xs font-bold" style={{ background: tierOf(lv.global!).color, color: lv.global! >= 90 ? "#050505" : "#fff" }}>{Math.round(lv.global!)}</span>
                </Link>
              </li>
            ))}
            {!top.length && <li className="text-sm text-muted">Pas encore de niveau calculé.</li>}
          </ol>
        </section>

        <section className="card p-5">
          <SectionTitle action={{ href: "/admin/box", label: "Gérer" }}>Box les plus actives</SectionTitle>
          <ul className="grid gap-1.5">
            {perBox.map(({ b, n }) => (
              <li key={b.id} className="flex items-center justify-between text-sm">
                <span>{b.name}{b.is_affiliate && <span className="ml-2 text-[10px] font-bold uppercase text-lime">affiliée</span>}</span>
                <span className="font-bold tabular-nums">{n}</span>
              </li>
            ))}
            {!perBox.length && <li className="text-sm text-muted">Aucune box renseignée.</li>}
          </ul>
        </section>

        <section className="card p-5">
          <SectionTitle>Activité récente</SectionTitle>
          <ul className="grid gap-2">
            {recent.map((r) => {
              const m = r.movement_id ? mmap.get(r.movement_id) : null;
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate"><b>{r.athletes?.first_name} {r.athletes?.last_name?.[0]}.</b> <span className="text-muted">· {m?.name ?? r.workouts?.title}</span></span>
                  <span className="shrink-0 text-right">
                    <span className="font-semibold tabular-nums">{m ? fmtMetric(Number(r.value), m.metric) : Number(r.value)}</span>
                    <span className="ml-2 text-xs text-dim">{fmtDate(r.performed_on)}</span>
                  </span>
                </li>
              );
            })}
            {!recent.length && <li className="text-sm text-muted">Rien pour l&apos;instant.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
