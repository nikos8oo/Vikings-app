import type { Metadata } from "next";
import { bests, getMovementMap, getMovements, getResults } from "@/lib/data";
import { fmtMetric } from "@/lib/format";
import { anchorsFor, scoreFrom } from "@/lib/scoring";
import { requireMe } from "@/lib/session";
import { MovementBrowser } from "./MovementBrowser";

export const metadata: Metadata = { title: "Perfs" };

export default async function Perfs() {
  const me = await requireMe();
  const [movements, results, mmap] = await Promise.all([getMovements(), getResults(me.id), getMovementMap()]);
  const { mov } = bests(results, mmap, new Map());
  const items = movements.map((m) => {
    const b = mov.get(m.id);
    const v = b ? Number(b.value) : null;
    return {
      id: m.id, name: m.name, category: m.category, modality: m.modality, family: m.family, label: m.test_label,
      scored: !!m.anchors_m, best: v != null ? fmtMetric(v, m.metric) : null,
      score: v != null ? scoreFrom(v, anchorsFor(m, me.sex), m.better) : null,
    };
  });
  return (
    <div>
      <p className="kicker rise">Référentiel Vikings</p>
      <h1 className="display rise rise-1 mt-1 text-4xl text-fog">Mes perfs</h1>
      <p className="rise rise-2 mt-2 text-sm text-muted">
        {movements.length} mouvements. Ceux marqués <span className="font-semibold text-lime">●</span> comptent dans ton niveau.
      </p>
      <MovementBrowser items={items} />
    </div>
  );
}
