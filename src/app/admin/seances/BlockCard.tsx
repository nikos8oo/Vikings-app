import Link from "next/link";
import { blockStyle, colorHex } from "@/lib/colors";
import { formatLabel } from "@/lib/prescription";
import type { Workout } from "@/lib/types";
import { DuplicateNextDay } from "./PlannerControls";

/** Carte d'un bloc dans le planning et le tableau de bord. */
export function BlockCard({ w, scores, tag, compact = false }: { w: Workout; scores: number; tag?: string; compact?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-[12px] border ${w.published ? "border-line bg-panel-2" : "border-dashed border-line-2 bg-transparent"}`}
      style={blockStyle(w.color)}>
      <Link href={`/admin/seances/${w.id}`} className="block px-3 py-2.5 hover:bg-white/[0.03]">
        <div className="flex items-center gap-1.5">
          {w.block && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-lime text-[11px] font-bold text-ink" style={colorHex(w.color) ? { background: colorHex(w.color)!, color: w.color === "lime" || w.color === "ambre" ? "#050505" : "#fff" } : undefined}>{w.block}</span>}
          <span className="truncate text-[12px] font-semibold uppercase tracking-wide text-muted">{w.video_url ? "▶ Vidéo" : formatLabel(w)}</span>
        </div>
        {tag && <span className="mt-1.5 inline-block rounded bg-bleu/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#9fb5ff]">{tag}</span>}
        <p className="mt-1.5 line-clamp-1 text-[13px] font-semibold text-fog">{w.title}</p>
        <p className={`mt-1 whitespace-pre-line text-[12px] leading-snug text-muted ${compact ? "line-clamp-3" : "line-clamp-4"}`}>{w.description}</p>
      </Link>
      <div className="flex items-center justify-between border-t border-line px-3 py-1.5">
        <span className="whitespace-nowrap text-[11px] text-dim">{!w.published ? "Brouillon" : scores ? `${scores} score${scores > 1 ? "s" : ""}` : "Publié"}</span>
        {!compact && <DuplicateNextDay id={w.id} date={w.workout_date} />}
      </div>
    </div>
  );
}
