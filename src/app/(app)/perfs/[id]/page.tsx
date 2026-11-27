import { VideoDemos } from "@/components/VideoDemos";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { communityRank, getMovementMap, getResults, movementVolume } from "@/lib/data";
import { MODALITY_LABEL, fmtDate, fmtMetric, fmtScore, fmtTime, todayParis } from "@/lib/format";
import { formatLabel, type Format } from "@/lib/prescription";
import type { ScoreType } from "@/lib/types";
import { anchorsFor, nextTier, scoreFrom, tierOf } from "@/lib/scoring";
import { requireMe } from "@/lib/session";
import { ProgressChart } from "@/components/viz";
import { ScoreForm } from "@/components/ScoreForm";
import { DeleteResult } from "@/components/DeleteButton";
import { Empty, ScoreBadge, SectionTitle } from "@/components/ui";

type P = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const m = (await getMovementMap()).get((await params).id);
  return { title: m?.name ?? "Mouvement" };
}

export default async function MovementPage({ params }: P) {
  const { id } = await params;
  const me = await requireMe();
  const m = (await getMovementMap()).get(id);
  if (!m) notFound();
  const [allResults, vol] = await Promise.all([getResults(me.id), movementVolume(me.id, id)]);
  const results = allResults.filter((r) => r.movement_id === id);
  const nf = (v: number) => Math.round(v).toLocaleString("fr-FR");
  const qty = (x: { reps: number; cal: number; m: number; s: number }) =>
    [x.reps && `${nf(x.reps)} reps`, x.cal && `${nf(x.cal)} cal`, x.m && `${nf(x.m)} m`, x.s && fmtTime(x.s)].filter(Boolean).join(" · ") || "—";
  // métrique principale du volume : reps, sinon calories, distance ou temps
  const main = vol.total.reps ? { v: nf(vol.total.reps), u: "reps" } : vol.total.cal ? { v: nf(vol.total.cal), u: "cal" } : vol.total.m ? { v: nf(vol.total.m), u: "m" } : vol.total.s ? { v: fmtTime(vol.total.s), u: "" } : null;
  const anchors = anchorsFor(m, me.sex);
  const up = m.better === "higher";
  const best = results.reduce<number | null>((b, r) => (b == null || (up ? Number(r.value) > b : Number(r.value) < b) ? Number(r.value) : b), null);
  const score = best != null ? scoreFrom(best, anchors, m.better) : null;
  const rank = best != null ? await communityRank(id, me.sex, m.better, best) : null;
  const next = score != null ? nextTier(score) : null;
  const nextVal = next && anchors ? anchorValueAt(anchors, next.min) : null;

  // courbe : meilleure perf cumulée par date
  const byDate = [...results].sort((a, b) => a.performed_on.localeCompare(b.performed_on));
  const curve: { date: string; value: number }[] = [];
  for (const r of byDate) {
    const v = Number(r.value), last = curve.at(-1);
    if (last?.date === r.performed_on) { if (up ? v > last.value : v < last.value) last.value = v; }
    else curve.push({ date: r.performed_on, value: v });
  }
  const levels = anchors ? [
    { label: "Games", key: "100" as const, color: "text-lime" },
    { label: "Élite", key: "90" as const, color: "text-[#a8c3ff]" },
    { label: "RX", key: "75" as const, color: "text-bleu-2" },
    { label: "Intermédiaire", key: "60" as const, color: "text-fog" },
    { label: "Fitness", key: "40" as const, color: "text-muted" },
  ] : [];

  return (
    <div className="grid gap-6">
      <div className="rise">
        <Link href="/perfs" className="text-xs font-semibold text-muted">← {MODALITY_LABEL[m.modality] ?? "Perfs"}</Link>
        <h1 className="display mt-2 text-4xl text-fog">{m.name}</h1>
        <p className="mt-1 text-sm text-muted">{m.test_label}{m.equipment ? ` · ${m.equipment}` : ""}</p>
        {m.video_url && <div className="max-w-md"><VideoDemos videos={[{ name: m.name, url: m.video_url }]} title="Démo" /></div>}
      </div>

      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-6">
          <section className="rise rise-1 card grid grid-cols-3 divide-x divide-line p-0">
            <div className="p-4">
              <p className="kicker">Record</p>
              <p className="display mt-1 text-2xl text-fog">{best != null ? fmtMetric(best, m.metric) : "—"}</p>
            </div>
            <div className="p-4">
              <p className="kicker">Note</p>
              <div className="mt-1.5 flex items-center gap-2">
                <ScoreBadge score={score} />
                {score != null && <span className="text-xs font-semibold text-muted">{tierOf(score).label}</span>}
              </div>
            </div>
            <div className="p-4">
              <p className="kicker">Vikings</p>
              <p className="display mt-1 text-2xl text-fog">{rank?.percentile != null ? `Top ${Math.max(1, 100 - rank.percentile)}%` : "—"}</p>
              <p className="text-[11px] text-dim">{rank ? `${rank.n} athlète${rank.n > 1 ? "s" : ""} ${me.sex === "F" ? "femmes" : "hommes"}` : "pas encore de perf"}</p>
            </div>
          </section>

          <section className="rise rise-1 card p-5">
            <p className="kicker">Volume total enregistré</p>
            {main ? (
              <>
                <p className="mt-2 flex items-baseline gap-2"><span className="display text-5xl text-fog">{main.v}</span><span className="text-sm font-semibold text-muted">{main.u}</span></p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div><p className="text-[11px] text-dim">30 derniers jours</p><p className="mt-0.5 font-semibold tabular-nums text-fog">{qty(vol.last30)}</p></div>
                  <div><p className="text-[11px] text-dim">Séances</p><p className="mt-0.5 font-semibold tabular-nums text-fog">{vol.total.sessions}</p></div>
                  <div><p className="text-[11px] text-dim">Charge max utilisée</p><p className="mt-0.5 font-semibold tabular-nums text-fog">{vol.total.topKg != null ? `${String(vol.total.topKg).replace(".", ",")} kg` : "—"}</p></div>
                  <div><p className="text-[11px] text-dim">Tonnage</p><p className="mt-0.5 font-semibold tabular-nums text-fog">{vol.total.tonnage ? `${nf(vol.total.tonnage)} kg` : "—"}</p></div>
                </div>
                {(vol.total.cal > 0 || vol.total.m > 0) && vol.total.reps > 0 && <p className="mt-3 text-xs text-dim">Aussi : {qty({ ...vol.total, reps: 0 })}</p>}
              </>
            ) : <p className="mt-2 text-sm text-muted">Le volume se remplit à chaque séance enregistrée qui contient ce mouvement.</p>}
          </section>

          {next && nextVal != null && (
            <p className="rise rise-2 rounded-xl border border-lime/20 bg-lime/5 px-4 py-3 text-sm text-fog">
              Objectif <b className="text-lime">{next.label}</b> : {fmtMetric(nextVal, m.metric)}
              {best != null && m.metric !== "time" && <span className="text-muted"> (encore {fmtMetric(Math.max(0, Math.round((nextVal - best) * 10) / 10), m.metric)})</span>}
            </p>
          )}

          <section className="rise rise-2 card p-5">
            <SectionTitle>Progression</SectionTitle>
            {curve.length >= 2 ? (
              <ProgressChart data={curve} format={m.metric === "time" ? "time" : "num"} invert={!up}
                refLines={anchors ? [{ y: Number(anchors["75"]), label: "RX" }] : []} />
            ) : <Empty>Entre au moins 2 perfs pour voir ta courbe.</Empty>}
          </section>

          <section className="rise rise-3">
            <SectionTitle>Dernières séances avec ce mouvement</SectionTitle>
            {vol.recent.length ? (
              <ul className="card divide-y divide-line">
                {vol.recent.map((r) => (
                  <li key={r.resultId}>
                    <Link href={r.workoutId ? `/prog/${r.workoutId}` : "#"} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-fog">{r.block ? `${r.block}. ` : ""}{r.title}</span>
                        <span className="block text-xs text-dim">
                          {fmtDate(r.date, { day: "numeric", month: "short" })}{r.format ? ` · ${formatLabel({ format: r.format as Format, variant: r.variant })}` : ""}
                          {r.scoreType && r.scoreType !== "none" && r.scoreType !== "load" ? ` · ${fmtScore(r.value, r.scoreType as ScoreType, { rpr: r.rpr, capped: r.capped })}` : ""}
                          {r.asWritten ? "" : " · modifié"}{r.division !== "rx" ? ` · ${r.division}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-semibold tabular-nums text-fog">{qty(r)}</span>
                        {r.kg != null && <span className="block text-xs tabular-nums text-muted">@ {String(r.kg).replace(".", ",")} kg</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <Empty>Aucune séance enregistrée avec ce mouvement pour l&apos;instant.</Empty>}
          </section>

          <section className="rise rise-3">
            <SectionTitle>Historique des perfs</SectionTitle>
            {results.length ? (
              <ul className="card divide-y divide-line">
                {results.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1">
                      <span className="block font-semibold tabular-nums">
                        {fmtMetric(Number(r.value), m.metric)}
                        {Number(r.value) === best && <span className="ml-2 rounded bg-lime px-1.5 py-0.5 text-[10px] font-bold text-ink">PR</span>}
                      </span>
                      <span className="text-xs text-dim">{fmtDate(r.performed_on, { day: "numeric", month: "long", year: "numeric" })}{r.rpe ? ` · RPE ${r.rpe}` : ""}{r.notes ? ` · ${r.notes}` : ""}</span>
                    </span>
                    <DeleteResult id={r.id} />
                  </li>
                ))}
              </ul>
            ) : <Empty>Aucune perf enregistrée.</Empty>}
          </section>
        </div>

        <div className="grid content-start gap-6">
          <section className="rise rise-1 card p-5">
            <SectionTitle>Nouvelle perf</SectionTitle>
            <ScoreForm mode="movement" id={m.id} metric={m.metric} label={m.test_label} today={todayParis()} />
          </section>

          {anchors && (
            <section className="rise rise-2 card p-5">
              <SectionTitle>Barème {me.sex === "F" ? "femmes" : "hommes"}</SectionTitle>
              <ul className="grid gap-1.5">
                {levels.map((l) => {
                  const reached = best != null && (up ? best >= Number(anchors[l.key]) : best <= Number(anchors[l.key]));
                  return (
                    <li key={l.key} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${reached ? "bg-white/[0.05]" : ""}`}>
                      <span className={`text-sm font-semibold ${l.color}`}>{reached ? "✓ " : ""}{l.label} <span className="text-dim">· {l.key}</span></span>
                      <span className="font-semibold tabular-nums">{fmtMetric(Number(anchors[l.key]), m.metric)}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-dim">100 = niveau des athlètes des CrossFit Games. La note est interpolée entre chaque palier.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function anchorValueAt(a: Record<string, number>, pts: number): number | null {
  const key = String(pts === 98 ? 100 : pts);
  if (pts === 98) return Number(a["90"]) + (Number(a["100"]) - Number(a["90"])) * (8 / 10);
  return a[key] != null ? Number(a[key]) : null;
}
