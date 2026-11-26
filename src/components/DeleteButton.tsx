"use client";

import { useTransition } from "react";
import { deleteResult } from "@/app/actions/results";

export function DeleteResult({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="Supprimer"
      disabled={pending}
      onClick={() => { if (confirm("Supprimer cette perf ?")) start(() => deleteResult(id)); }}
      className="grid h-8 w-8 place-items-center rounded-lg text-dim transition hover:bg-danger/10 hover:text-danger disabled:opacity-40"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
    </button>
  );
}
