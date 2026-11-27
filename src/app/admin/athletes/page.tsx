import type { Metadata } from "next";
import { allLevels, fetchAll, getBoxes } from "@/lib/data";
import { tierOf } from "@/lib/scoring";
import { ATHLETE_COLS } from "@/lib/session";
import type { Athlete } from "@/lib/types";
import { AthleteTable } from "./AthleteTable";

export const metadata: Metadata = { title: "Athlètes" };

export default async function Athletes() {
  const [athletes, boxes] = await Promise.all([fetchAll<Athlete>("athletes", ATHLETE_COLS), getBoxes()]);
  const levels = await allLevels(athletes);
  const bname = new Map(boxes.map((b) => [b.id, b.name]));
  const rows = athletes.map((a) => {
    const lv = levels.get(a.id)!;
    return {
      id: a.id, name: `${a.first_name} ${a.last_name}`, email: a.email, sex: a.sex, role: a.role, programs: a.programs ?? [],
      box: a.box_id ? bname.get(a.box_id) ?? "" : "",
      level: lv.global, tier: lv.global != null ? tierOf(lv.global).label : "",
      provisional: lv.provisional, tests: lv.tests.length, results: lv.count, last: lv.last,
      domains: Object.fromEntries(lv.domains.map((d) => [d.key, d.score])) as Record<string, number | null>,
    };
  });
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="display text-4xl">Athlètes</h1>
        <p className="mt-1 text-sm text-muted">{athletes.length} inscrits · niveau recalculé en direct à partir de toutes leurs perfs.</p>
      </div>
      <AthleteTable rows={rows} boxes={[...new Set(rows.map((r) => r.box).filter(Boolean))].sort()} />
    </div>
  );
}
