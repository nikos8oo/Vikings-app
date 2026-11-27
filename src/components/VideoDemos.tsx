import { youtubeId } from "@/lib/prescription";

/** Vignettes YouTube cliquables (s'ouvrent dans YouTube). */
export function VideoDemos({ videos, title = "Démos vidéo" }: { videos: { name: string; url: string }[]; title?: string }) {
  const list = videos.map((v) => ({ ...v, id: youtubeId(v.url) })).filter((v) => v.id);
  if (!list.length) return null;
  return (
    <div className="mt-5">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {list.map((v) => (
          <a key={v.id + v.name} href={v.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-[12px] border border-line bg-panel-2">
            <span className="relative block aspect-video overflow-hidden bg-panel-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.03]" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-[13px] text-white backdrop-blur">▶</span>
              </span>
            </span>
            <span className="block truncate px-2.5 py-1.5 text-[12px] font-medium text-fog">{v.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
