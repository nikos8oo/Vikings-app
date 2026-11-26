"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

const BLEU = "#2e5aef", LIME = "#d1ec2d", FOG = "#e4e1e6", MUTED = "#8d8a98", LINE = "rgba(228,225,230,0.08)";

/** Anneau de niveau 0-100 : arc bleu → lime, compteur animé. */
export function LevelRing({ value, size = 200, tier, provisional }: { value: number | null; size?: number; tier: string; provisional?: boolean }) {
  const v = value ?? 0;
  const stroke = 14, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const mv = useMotionValue(0);
  const dash = useTransform(mv, (x) => `${(x / 100) * c} ${c}`);
  const [n, setN] = useState(0);
  useEffect(() => {
    const ctrl = animate(mv, v, { duration: 1.4, ease: [0.2, 0.7, 0.2, 1], onUpdate: (x) => setN(x) });
    return () => ctrl.stop();
  }, [v, mv]);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={BLEU} />
            <stop offset="100%" stopColor={LIME} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(228,225,230,0.07)" strokeWidth={stroke} />
        {/* repères des paliers */}
        {[60, 75, 90, 98].map((p) => {
          const a = (p / 100) * 2 * Math.PI;
          const x1 = size / 2 + (r - stroke / 2 - 2) * Math.cos(a), y1 = size / 2 + (r - stroke / 2 - 2) * Math.sin(a);
          const x2 = size / 2 + (r + stroke / 2 + 2) * Math.cos(a), y2 = size / 2 + (r + stroke / 2 + 2) * Math.sin(a);
          return <line key={p} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(5,5,5,0.9)" strokeWidth={2} />;
        })}
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring)" strokeWidth={stroke} strokeLinecap="round"
          style={{ strokeDasharray: dash }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="kicker">Niveau</span>
        <span className="display text-[64px] leading-none text-fog tabular-nums">{value == null ? "—" : Math.round(n)}</span>
        <span className="mt-1 text-sm font-bold uppercase tracking-wider text-lime">{tier}</span>
        {provisional && value != null && <span className="mt-1 text-[10px] uppercase tracking-wider text-dim">provisoire</span>}
      </div>
    </div>
  );
}

export function DomainRadar({ data }: { data: { label: string; score: number | null }[] }) {
  const d = data.map((x) => ({ label: x.label, score: x.score ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={d} outerRadius="72%">
        <PolarGrid stroke={LINE} />
        <PolarAngleAxis dataKey="label" tick={{ fill: MUTED, fontSize: 11, fontWeight: 600 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="score" stroke={LIME} strokeWidth={2} fill={BLEU} fillOpacity={0.35} isAnimationActive animationDuration={900} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

type Pt = { date: string; value: number };

/** Courbe de progression. invert = true pour les temps (plus bas = mieux). */
export function ProgressChart({ data, format, invert, refLines = [] }: {
  data: Pt[]; format: "time" | "num" | "level"; invert?: boolean; refLines?: { y: number; label: string }[];
}) {
  const fmt = (v: number) => format === "time" ? `${Math.floor(v / 60)}:${String(Math.round(v % 60)).padStart(2, "0")}` : String(Math.round(v * 10) / 10);
  const fd = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="fillP" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLEU} stopOpacity={0.45} />
            <stop offset="100%" stopColor={BLEU} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={LINE} vertical={false} />
        <XAxis dataKey="date" tickFormatter={fd} tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis reversed={invert} tickFormatter={fmt} tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} width={44}
          domain={format === "level" ? [0, 100] : ["auto", "auto"]} />
        {refLines.map((r) => (
          <ReferenceLine key={r.label} y={r.y} stroke="rgba(209,236,45,0.35)" strokeDasharray="4 4"
            label={{ value: r.label, fill: LIME, fontSize: 10, position: "insideTopRight" }} />
        ))}
        <Tooltip
          cursor={{ stroke: "rgba(228,225,230,0.2)" }}
          contentStyle={{ background: "#16161c", border: "1px solid rgba(228,225,230,0.12)", borderRadius: 12, color: FOG, fontSize: 12 }}
          labelFormatter={(l) => fd(String(l))}
          formatter={(v) => [fmt(Number(v)), format === "level" ? "Niveau" : "Perf"]}
        />
        <Area type="monotone" dataKey="value" stroke={BLEU} strokeWidth={2.5} fill="url(#fillP)"
          dot={{ r: 3, fill: LIME, stroke: LIME }} activeDot={{ r: 5, fill: LIME }} animationDuration={900} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
