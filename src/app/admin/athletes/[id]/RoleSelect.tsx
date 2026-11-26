"use client";

import { useTransition } from "react";
import { setRole } from "@/app/actions/admin";

export function RoleSelect({ id, role }: { id: string; role: string }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Rôle
      <select defaultValue={role} disabled={pending} onChange={(e) => { const v = e.target.value; start(() => setRole(id, v)); }} className="field w-auto py-2">
        <option value="athlete">Athlète</option>
        <option value="coach">Coach Vikings</option>
        <option value="admin">Admin</option>
      </select>
    </label>
  );
}
