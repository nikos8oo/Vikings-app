import type React from "react";
/** 10 couleurs de bloc, accordées à la charte Vikings (noir, bleu électrique, lime). */
export const BLOCK_COLORS = [
  { id: "bleu", label: "Bleu Vikings", hex: "#2e5aef" },
  { id: "lime", label: "Lime", hex: "#d1ec2d" },
  { id: "ciel", label: "Ciel", hex: "#38bdf8" },
  { id: "violet", label: "Violet", hex: "#8b5cf6" },
  { id: "rose", label: "Rose", hex: "#ec4899" },
  { id: "rouge", label: "Rouge", hex: "#ef4444" },
  { id: "orange", label: "Orange", hex: "#f97316" },
  { id: "ambre", label: "Ambre", hex: "#f59e0b" },
  { id: "vert", label: "Vert", hex: "#10b981" },
  { id: "ardoise", label: "Ardoise", hex: "#94a3b8" },
] as const;

export type BlockColor = (typeof BLOCK_COLORS)[number]["id"];

export function colorHex(id?: string | null): string | null {
  return BLOCK_COLORS.find((c) => c.id === id)?.hex ?? null;
}

/** Style d'un bloc coloré : dégradé + liseré + bordure teintée (fonctionne en sombre et en clair). */
export function blockStyle(id?: string | null, strength: "card" | "chip" = "card"): React.CSSProperties | undefined {
  const hex = colorHex(id);
  if (!hex) return undefined;
  if (strength === "chip") return {
    backgroundImage: `linear-gradient(90deg, ${hex}66 0%, ${hex}26 100%)`,
    boxShadow: `inset 3px 0 0 ${hex}`,
  };
  return {
    backgroundImage: `linear-gradient(150deg, ${hex}59 0%, ${hex}26 38%, ${hex}0a 75%, transparent 100%)`,
    boxShadow: `inset 4px 0 0 ${hex}`,
    borderColor: `${hex}59`,
  };
}
