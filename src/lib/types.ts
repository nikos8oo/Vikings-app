import type { Detail, Format, Item, VolumeRow } from "./prescription";

export type Sex = "M" | "F";
export type Role = "athlete" | "coach" | "admin";
export type Metric = "load" | "reps" | "time" | "distance" | "calories" | "height";
export type Better = "higher" | "lower";
export type Anchors = Record<"100" | "90" | "75" | "60" | "40", number>;
export type Division = "rx" | "scaled" | "foundation";
export type Source = "vikings" | "competition" | "affiliates" | "qualif" | "benchmark";
export type { Subtrack } from "./tracks";
export type ScoreType = "time" | "rounds_reps" | "reps" | "load" | "calories" | "distance" | "none";

export type Box = { id: string; name: string; city: string | null; is_affiliate: boolean };

export type Athlete = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  sex: Sex;
  birth_year: number | null;
  bodyweight_kg: number | null;
  height_cm: number | null;
  box_id: string | null;
  role: Role;
  avatar_color: string | null;
  created_at: string;
  last_seen_at: string | null;
  tracks?: string[];
  programs?: string[];
};

export type Movement = {
  id: string;
  name: string;
  name_en: string | null;
  category: string;
  family: string | null;
  equipment: string | null;
  metric: Metric;
  test_label: string | null;
  better: Better;
  anchors_m: Anchors | null;
  anchors_f: Anchors | null;
  weight_in_level: number;
  notes: string | null;
  sort: number;
  active: boolean;
};

export type Workout = {
  id: string;
  title: string;
  workout_date: string;
  source: Source;
  description: string;
  coach_notes: string | null;
  score_type: ScoreType;
  better: Better;
  reps_per_round: number | null;
  time_cap_s: number | null;
  movement_id: string | null;
  movements: string[];
  anchors_m: Anchors | null;
  anchors_f: Anchors | null;
  counts_in_level: boolean;
  published: boolean;
  created_at: string;
  // séance structurée (null = ancienne séance en texte libre)
  format: Format | null;
  items: Item[];
  rounds: number | null;
  duration_s: number | null;
  interval_s: number | null;
  rep_scheme: number[] | null;
  emom_mode: "all" | "alternate" | null;
  block: string | null;
  variant?: string | null;
  subtrack?: string | null;
  color?: string | null;
};

export type Result = {
  id: string;
  athlete_id: string;
  workout_id: string | null;
  movement_id: string | null;
  value: number;
  division: Division;
  capped: boolean;
  performed_on: string;
  rpe: number | null;
  notes: string | null;
  created_at: string;
  as_written?: boolean;
  detail?: Detail | null;
  volume?: VolumeRow[] | null;
};
