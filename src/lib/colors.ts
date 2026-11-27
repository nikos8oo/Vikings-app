import type React from "react";
/** 10 couleurs de bloc, accordées à la charte Vikings (noir, bleu électrique, lime). */
export const BLOCK_COLORS = [
  { id: "bleu", label: "Bleu Vikings", hex: "#3b63e6" },
  { id: "ciel", label: "Acier", hex: "#5b8db8" },
  { id: "violet", label: "Prune", hex: "#7c72a8" },
  { id: "rose", label: "Vieux rose", hex: "#a97a8a" },
  { id: "rouge", label: "Brique", hex: "#b4574f" },
  { id: "orange", label: "Cuivre", hex: "#b97a4a" },
  { id: "ambre", label: "Sable", hex: "#b19a63" },
  { id: "vert", label: "Sauge", hex: "#6e977d" },
  { id: "lime", label: "Lime Vikings", hex: "#a9bf2e" },
  { id: "ardoise", label: "Ardoise", hex: "#7d8794" },
] as const;

export type BlockColor = (typeof BLOCK_COLORS)[number]["id"];

export function colorHex(id?: string | null): string | null {
  return BLOCK_COLORS.find((c) => c.id === id)?.hex ?? null;
}

/** Style d'un bloc coloré : liseré fin + très légère teinte (sobre, en sombre comme en clair). */
export function blockStyle(id?: string | null, strength: "card" | "chip" = "card"): React.CSSProperties | undefined {
  const hex = colorHex(id);
  if (!hex) return undefined;
  if (strength === "chip") return { backgroundColor: `${hex}1f`, boxShadow: `inset 2px 0 0 ${hex}` };
  return { backgroundImage: `linear-gradient(180deg, ${hex}14 0%, ${hex}00 55%)`, boxShadow: `inset 3px 0 0 ${hex}` };
}
