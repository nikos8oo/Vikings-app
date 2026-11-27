"use client";

import { useEffect, useState } from "react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Invite à installer l'app sur l'écran d'accueil (masquée si elle est déjà installée). */
export function InstallApp() {
  const [installed, setInstalled] = useState(true);
  const [ios, setIos] = useState(false);
  const [evt, setEvt] = useState<PromptEvent | null>(null);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const on = (e: Event) => { e.preventDefault(); setEvt(e as PromptEvent); };
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);
  if (installed) return null;
  return (
    <section className="card p-5">
      <h2 className="display text-xl">Installer l&apos;app</h2>
      <p className="mt-1 text-sm text-muted">Ajoute Vikings sur ton écran d&apos;accueil : plein écran, ouverture en un tap, comme une vraie app.</p>
      {evt ? (
        <button type="button" onClick={async () => { await evt.prompt(); setEvt(null); }} className="btn-lime mt-4 w-full py-3">Installer sur mon téléphone</button>
      ) : ios ? (
        <ol className="mt-4 grid gap-2 text-sm text-fog">
          <li>1. Dans Safari, touche <span className="font-semibold">Partager</span> <span aria-hidden>⬆︎</span></li>
          <li>2. Choisis <span className="font-semibold">Sur l&apos;écran d&apos;accueil</span></li>
          <li>3. Touche <span className="font-semibold">Ajouter</span></li>
        </ol>
      ) : (
        <p className="mt-3 text-sm text-fog">Dans le menu du navigateur, choisis <span className="font-semibold">Installer l&apos;application</span> ou <span className="font-semibold">Ajouter à l&apos;écran d&apos;accueil</span>.</p>
      )}
    </section>
  );
}
