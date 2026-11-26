"use client";

import { useFormStatus } from "react-dom";

export function Submit({ children, className = "btn-primary w-full", pending: label = "…" }: { children: React.ReactNode; className?: string; pending?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? label : children}
    </button>
  );
}

export function FormMessage({ state }: { state: { error?: string; ok?: string } | null }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <p role="status" className={`rounded-xl px-3.5 py-2.5 text-sm ${state.error ? "bg-danger/10 text-danger" : "bg-lime/10 text-lime"}`}>
      {state.error ?? state.ok}
    </p>
  );
}
