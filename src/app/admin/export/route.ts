import { fetchAll, getMovementMap } from "@/lib/data";
import { getMe } from "@/lib/session";
import type { Result } from "@/lib/types";

type Row = Result & {
  athletes: { first_name: string; last_name: string; email: string; sex: string; birth_year: number | null; boxes: { name: string } | null } | null;
  workouts: { title: string; source: string; score_type: string } | null;
};

const esc = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Export de toutes les perfs (format CSV ; séparateur point-virgule pour Excel FR). */
export async function GET() {
  const me = await getMe();
  if (!me || (me.role !== "admin" && me.role !== "coach")) return new Response("Accès refusé", { status: 403 });
  const [rows, mmap] = await Promise.all([
    fetchAll<Row>("results", "*,athletes(first_name,last_name,email,sex,birth_year,boxes(name)),workouts(title,source,score_type)", (q) => q.order("performed_on")),
    getMovementMap(),
  ]);
  const head = ["date", "athlete", "email", "sexe", "annee_naissance", "box", "type", "mouvement_ou_seance", "categorie", "mesure", "valeur", "version", "time_cap", "rpe", "notes"];
  const lines = rows.map((r) => {
    const m = r.movement_id ? mmap.get(r.movement_id) : null;
    return [
      r.performed_on, `${r.athletes?.first_name} ${r.athletes?.last_name}`, r.athletes?.email, r.athletes?.sex, r.athletes?.birth_year,
      r.athletes?.boxes?.name, m ? "mouvement" : r.workouts?.source, m?.name ?? r.workouts?.title, m?.category ?? "",
      m?.metric ?? r.workouts?.score_type, String(r.value).replace(".", ","), r.workout_id ? r.division : "", r.capped ? "oui" : "", r.rpe, r.notes,
    ].map(esc).join(";");
  });
  const csv = "﻿" + [head.join(";"), ...lines].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vikings-perfs-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
