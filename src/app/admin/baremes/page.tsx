import type { Metadata } from "next";
import { db, must } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import type { Movement, Workout } from "@/lib/types";
import { AnchorsBoard, NewMovement } from "./AnchorsBoard";

export const metadata: Metadata = { title: "Barèmes" };

export default async function Baremes() {
  await requireAdmin();
  const [movements, workouts, counts] = await Promise.all([
    db().from("movements").select("*").order("sort").then((r) => must(r) as Movement[]),
    db().from("workouts").select("id,title,score_type,better,anchors_m,anchors_f,counts_in_level,source").in("source", ["benchmark", "qualif"]).order("title")
      .then((r) => must(r) as Pick<Workout, "id" | "title" | "score_type" | "better" | "anchors_m" | "anchors_f" | "counts_in_level" | "source">[]),
    db().from("results").select("movement_id").not("movement_id", "is", null).then((r) => (r.data ?? []) as { movement_id: string }[]),
  ]);
  const n: Record<string, number> = {};
  for (const r of counts) n[r.movement_id] = (n[r.movement_id] ?? 0) + 1;
  const scored = movements.filter((m) => m.anchors_m && m.anchors_f).length;

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      <div>
        <h1 className="display text-4xl">Barèmes</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Chaque test est noté de 0 à 100 à partir de 5 références : Games (100), Élite (90), RX (75), Intermédiaire (60), Fitness (40).
          Entre deux références, la note est interpolée. Recale-les dès que les données Vikings sont assez nombreuses.
        </p>
        <p className="mt-2 text-xs text-dim">{movements.length} mouvements · {scored} avec barème · {workouts.length} benchmarks / qualifs</p>
      </div>
      <details className="card p-4">
        <summary className="cursor-pointer text-sm font-semibold text-fog">+ Ajouter un mouvement au référentiel</summary>
        <div className="mt-4"><NewMovement /></div>
      </details>
      <AnchorsBoard movements={movements} workouts={workouts} usage={n} />
    </div>
  );
}
