import { trackKey, trackLabel } from "@/lib/tracks";
import Link from "next/link";
import { TIERS, tierOf } from "@/lib/scoring";

export function ScoreBadge({ score, size = "md" }: { score: number | null; size?: "sm" | "md" }) {
  if (score == null) return <span className="text-xs text-dim">—</span>;
  const t = tierOf(score);
  const dark = t.key === "games" || t.key === "elite";
  return (
    <span className={`inline-flex items-center justify-center rounded-lg font-bold tabular-nums ${size === "sm" ? "min-w-9 px-1.5 py-0.5 text-xs" : "min-w-11 px-2 py-1 text-sm"}`}
      style={{ background: t.color, color: dark ? "#050505" : "#fff" }}>
      {Math.round(score)}
    </span>
  );
}

export function TierScale({ score }: { score: number | null }) {
  const scale = [...TIERS].reverse();
  return (
    <div>
      <div className="relative">
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
          {scale.map((t, i) => {
            const next = scale[i + 1]?.min ?? 100;
            return <div key={t.key} style={{ flex: next - t.min, background: t.color, opacity: score != null && score >= t.min ? 1 : 0.25 }} />;
          })}
        </div>
        {score != null && (
          <div className="absolute -top-1.5 h-5 w-1 rounded-full bg-fog shadow-[0_0_0_3px_#050505]" style={{ left: `calc(${score}% - 2px)` }} />
        )}
      </div>
      <div className="relative mt-2 h-3 text-[10px] font-semibold uppercase tracking-wider text-dim">
        {[["Inter", 60], ["RX", 75], ["Élite", 90], ["Games", 98]].map(([l, p]) => (
          <span key={l} className="absolute -translate-x-1/2" style={{ left: `${p}%` }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: { href: string; label: string } }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="display text-[22px] text-fog">{children}</h2>
      {action && <Link href={action.href} className="text-xs font-semibold text-lime">{action.label} →</Link>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line-2 p-6 text-center text-sm text-muted">{children}</div>;
}

export function SourceTag({ source, subtrack }: { source: string; subtrack?: string | null }) {
  const map: Record<string, [string, string]> = {
    vikings: ["Compétition", "bg-lime/15 text-lime"],
    competition: ["Compétition", "bg-lime/15 text-lime"],
    affiliates: [`Affiliates · ${trackLabel(trackKey({ source: "affiliates", subtrack }))}`, "bg-bleu/20 text-[#9fb5ff]"],
    qualif: ["Qualif", "bg-lime text-ink"],
    benchmark: ["Benchmark", "bg-white/5 text-muted"],
  };
  const [l, c] = map[source] ?? [source, "bg-white/5 text-muted"];
  return <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c}`}>{l}</span>;
}
