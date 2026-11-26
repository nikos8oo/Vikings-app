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
