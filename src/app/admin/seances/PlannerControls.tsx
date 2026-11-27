"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { duplicateWorkout, moveWorkout } from "@/app/actions/admin";
import { SUBTRACKS, trackLabel } from "@/lib/tracks";

/** Programme / piste sur lequel l'admin travaille (mémorisé dans un cookie). */
export function TrackSwitch({ track, view, date }: { track: string; view: string; date: string }) {
  const router = useRouter();
  const go = (t: string) => {
    document.cookie = `va_admin_track=${encodeURIComponent(t)}; path=/admin; max-age=31536000; samesite=lax`;
    router.push(`/admin/seances?p=${encodeURIComponent(t)}&v=${view}&d=${date}`);
  };
  const aff = track.startsWith("aff:");
  const lastAff = aff ? track : "aff:crossfit";
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="seg">
          <button type="button" aria-pressed={track === "competition"} onClick={() => go("competition")} className="seg-btn whitespace-nowrap px-4">Vikings Compétition</button>
          <button type="button" aria-pressed={aff} onClick={() => go(lastAff)} className="seg-btn whitespace-nowrap px-4">Vikings Affiliates</button>
        </div>
        <div className="flex items-center gap-1 text-[13px]">
          {(["qualif", "benchmark"] as const).map((k) => (
            <button key={k} type="button" onClick={() => go(k)} className={`rounded-full px-3 py-1.5 font-medium ${track === k ? "bg-panel-3 text-fog" : "text-muted hover:text-fog"}`}>{trackLabel(k)}</button>
          ))}
        </div>
      </div>
      {aff && (
        <div className="seg max-w-full overflow-x-auto no-scrollbar">
          {SUBTRACKS.map((s) => (
            <button key={s.id} type="button" aria-pressed={track === `aff:${s.id}`} onClick={() => go(`aff:${s.id}`)} className="seg-btn whitespace-nowrap px-3 sm:px-4">{s.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Copie un bloc au jour suivant (pour construire la semaine au fur et à mesure). */
export function DuplicateNextDay({ id, date }: { id: string; date: string }) {
  const [pending, start] = useTransition();
  const next = new Date(Date.parse(date + "T12:00:00Z") + 86400_000).toISOString().slice(0, 10);
  return (
    <button type="button" disabled={pending} onClick={(e) => { e.preventDefault(); start(() => duplicateWorkout(id, next)); }}
      className="text-[11px] font-medium text-muted hover:text-fog disabled:opacity-50" title="Copier ce bloc au jour suivant">
      {pending ? "Copie…" : "Copier → J+1"}
    </button>
  );
}

/* ---------- Glisser-déposer des blocs entre les jours ---------- */
const DND = "text/va-block";

export function DragBlock({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div draggable onDragStart={(e) => { e.dataTransfer.setData(DND, id); e.dataTransfer.effectAllowed = "move"; (e.currentTarget as HTMLElement).style.opacity = "0.4"; }}
      onDragEnd={(e) => { (e.currentTarget as HTMLElement).style.opacity = ""; }}
      className="cursor-grab active:cursor-grabbing">
      {children}
    </div>
  );
}

export function DropDay({ date, className, children }: { date: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  const [over, setOver] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div
      onDragOver={(e) => { if (e.dataTransfer.types.includes(DND)) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false); }}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(DND);
        setOver(false);
        if (!id) return;
        e.preventDefault();
        start(async () => { await moveWorkout(id, date); router.refresh(); });
      }}
      className={`${className ?? ""} transition ${over ? "!border-bleu ring-2 ring-bleu/30" : ""} ${pending ? "opacity-60" : ""}`}>
      {children}
    </div>
  );
}
