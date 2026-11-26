import type { Metadata } from "next";
import Link from "next/link";
import { getMovements } from "@/lib/data";
import { todayParis } from "@/lib/format";
import { WorkoutBuilder } from "../editor/WorkoutBuilder";

export const metadata: Metadata = { title: "Nouvelle séance" };

export default async function Nouvelle({ searchParams }: { searchParams: Promise<{ date?: string; source?: string; block?: string }> }) {
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : undefined;
  const source = ["vikings", "affiliates", "competition", "qualif", "benchmark"].includes(sp.source ?? "") ? sp.source : undefined;
  const block = /^[A-D]$/.test(sp.block ?? "") ? sp.block : undefined;
  const back = `/admin/seances${source ? `?p=${source}${date ? `&d=${date}` : ""}` : ""}`;
  const movements = (await getMovements()).map((m) => ({ id: m.id, name: m.name, category: m.category, metric: m.metric }));
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
        <Link href={back} className="text-[13px] font-medium text-bleu-2">‹ Planning</Link>
        <h1 className="mt-2 text-[32px] font-bold tracking-tight text-fog">Nouveau bloc{block ? ` ${block}` : ""}</h1>
      </div>
      <WorkoutBuilder movements={movements} today={todayParis()} defaults={{ date, source, block }} returnTo={back} />
    </div>
  );
}
