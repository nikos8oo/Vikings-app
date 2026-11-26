import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getBoxes } from "@/lib/data";
import { requireStaff } from "@/lib/session";
import { BoxRow, NewBox } from "./BoxForms";

export const metadata: Metadata = { title: "Box" };

export default async function Boxes() {
  const me = await requireStaff();
  const [boxes, ath] = await Promise.all([getBoxes(), db().from("athletes").select("box_id")]);
  const n = new Map<string, number>();
  for (const a of (ath.data ?? []) as { box_id: string | null }[]) if (a.box_id) n.set(a.box_id, (n.get(a.box_id) ?? 0) + 1);
  return (
    <div className="mx-auto grid max-w-3xl gap-5">
      <div>
        <h1 className="display text-4xl">Box</h1>
        <p className="mt-1 text-sm text-muted">Les athlètes peuvent ajouter leur box à l&apos;inscription : coche « affiliée » pour les box Vikings Affiliates.</p>
      </div>
      <div className="card p-4"><NewBox /></div>
      <ul className="grid gap-2">
        {boxes.map((b) => <li key={b.id}><BoxRow box={b} count={n.get(b.id) ?? 0} canDelete={me.role === "admin"} /></li>)}
      </ul>
    </div>
  );
}
