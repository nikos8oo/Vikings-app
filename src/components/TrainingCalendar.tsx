import Link from "next/link";

const WD = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export type DayMark = { count: number; done: number };

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Bornes de la grille du mois (semaines du lundi au dimanche). */
export function monthGrid(selected: string) {
  const [y, m] = selected.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // lundi = 0
  const start = new Date(Date.UTC(y, m - 1, 1 - offset));
  const days: { date: string; inMonth: boolean; day: number }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getTime() + i * 86400_000);
    days.push({ date: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === m - 1, day: d.getUTCDate() });
  }
  // 5 semaines suffisent quand la 6e est entièrement hors du mois
  const grid = days.slice(35).every((d) => !d.inMonth) ? days.slice(0, 35) : days;
  return { y, m: m - 1, grid, from: grid[0].date, to: grid[grid.length - 1].date };
}

export function TrainingCalendar({ selected, today, marks, basePath = "/accueil" }: {
  selected: string; today: string; marks: Record<string, DayMark>; basePath?: string;
}) {
  const { y, m, grid } = monthGrid(selected);
  const prev = m === 0 ? iso(y - 1, 11, 1) : iso(y, m - 1, 1);
  const next = m === 11 ? iso(y + 1, 0, 1) : iso(y, m + 1, 1);
  const href = (d: string) => (d === today ? basePath : `${basePath}?d=${d}`);
  const sessions = grid.filter((d) => d.inMonth && marks[d.date]?.count).length;
  const doneDays = grid.filter((d) => d.inMonth && marks[d.date]?.done).length;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <Link href={href(prev)} scroll={false} className="round-btn" aria-label="Mois précédent">‹</Link>
        <div className="text-center">
          <p className="text-[15px] font-semibold capitalize text-fog">{MONTHS[m]} {y}</p>
          <p className="text-[11px] text-dim">{doneDays}/{sessions} jour{sessions > 1 ? "s" : ""} d&apos;entraînement</p>
        </div>
        <Link href={href(next)} scroll={false} className="round-btn" aria-label="Mois suivant">›</Link>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-[11px] font-semibold text-dim">
        {WD.map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7">
        {grid.map((d) => {
          const mk = marks[d.date];
          const sel = d.date === selected;
          const isToday = d.date === today;
          const allDone = mk && mk.count > 0 && mk.done >= mk.count;
          return (
            <Link key={d.date} href={href(d.date)} scroll={false} aria-current={sel ? "date" : undefined}
              className="flex flex-col items-center gap-0.5 py-0.5">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[15px] tabular-nums transition
                ${sel ? "bg-lime font-bold text-ink" : isToday ? "font-bold text-lime ring-1 ring-lime/50" : d.inMonth ? "text-fog hover:bg-white/5" : "text-dim/60"}`}>
                {d.day}
              </span>
              <span className={`h-1.5 w-1.5 rounded-full ${!mk?.count ? "bg-transparent" : allDone ? "bg-lime" : mk.done ? "bg-lime/50" : "bg-bleu-2"}`} />
            </Link>
          );
        })}
      </div>
      {selected !== today && (
        <div className="mt-2 text-center"><Link href={basePath} scroll={false} className="text-[13px] font-medium text-bleu-2">Aujourd&apos;hui</Link></div>
      )}
    </div>
  );
}
