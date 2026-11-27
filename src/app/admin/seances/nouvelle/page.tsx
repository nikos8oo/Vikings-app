import type { Metadata } from "next";
import Link from "next/link";
import { getMovements } from "@/lib/data";
import { todayParis } from "@/lib/format";
import { WorkoutBuilder } from "../editor/WorkoutBuilder";
import { parseTrack, TRACK_KEYS } from "@/lib/tracks";

export const metadata: Metadata = { title: "Nouvelle séance" };

export default async function Nouvelle({ searchParams }: { searchParams: Promise<{ date?: string; track?: string; block?: string }> }) {
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : undefined;
  const track = sp.track && TRACK_KEYS.includes(sp.track) ? sp.track : undefined;
  const { source, subtrack } = track ? parseTrack(track) : { source: undefined, subtrack: null };
  const block = /^[A-D]$/.test(sp.block ?? "") ? sp.block : undefined;
  const back = `/admin/seances${track ? `?p=${encodeURIComponent(track)}${date ? `&d=${date}` : ""}` : ""}`;
  const movements = (await getMovements()).map((m) => ({ id: m.id, name: m.name, category: m.category, metric: m.metric, modality: m.modality, pattern: m.pattern }));
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
        <Link href={back} className="text-[13px] font-medium text-bleu-2">‹ Planning</Link>
        <h1 className="mt-2 text-[32px] font-bold tracking-tight text-fog">Nouveau bloc{block ? ` ${block}` : ""}</h1>
      </div>
      <WorkoutBuilder movements={movements} today={todayParis()} defaults={{ date, source, subtrack, block }} returnTo={back} />
    </div>
  );
}
