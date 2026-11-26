import type { Metadata } from "next";
import Link from "next/link";
import { getMovements } from "@/lib/data";
import { todayParis } from "@/lib/format";
import { WorkoutForm } from "../WorkoutForm";

export const metadata: Metadata = { title: "Nouvelle séance" };

export default async function Nouvelle() {
  const movements = (await getMovements()).map((m) => ({ id: m.id, name: m.name, category: m.category }));
  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div>
        <Link href="/admin/seances" className="text-xs font-semibold text-muted">← Séances</Link>
        <h1 className="display mt-2 text-4xl">Nouvelle séance</h1>
      </div>
      <div className="card p-5 md:p-6"><WorkoutForm movements={movements} today={todayParis()} /></div>
    </div>
  );
}
