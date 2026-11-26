import type { Metadata } from "next";
import Link from "next/link";
import { getMovements } from "@/lib/data";
import { todayParis } from "@/lib/format";
import { WorkoutBuilder } from "../editor/WorkoutBuilder";

export const metadata: Metadata = { title: "Nouvelle séance" };

export default async function Nouvelle() {
  const movements = (await getMovements()).map((m) => ({ id: m.id, name: m.name, category: m.category, metric: m.metric }));
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <div>
        <Link href="/admin/seances" className="text-[13px] font-medium text-bleu-2">‹ Séances</Link>
        <h1 className="mt-2 text-[32px] font-bold tracking-tight text-fog">Nouvelle séance</h1>
      </div>
      <WorkoutBuilder movements={movements} today={todayParis()} />
    </div>
  );
}
