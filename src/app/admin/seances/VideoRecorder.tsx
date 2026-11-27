"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { prepareVideoUpload, saveVideoBlock } from "@/app/actions/video";

const MAX_S = 6 * 60;            // 6 min ≈ 45 Mo à 1 Mb/s : sous la limite de 50 Mo
const MAX_BYTES = 50 * 1024 * 1024;
const pickMime = () => ["video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
  .find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "video/webm";
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type Step = "intro" | "live" | "review" | "sending";

/** Bouton + fenêtre d'enregistrement face cam (caméra et micro de l'ordinateur). */
export function VideoRecorder({ track, date, trackName }: { track: string; date: string; trackName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full bg-panel-3 px-4 py-2.5 text-[14px] font-semibold text-fog transition hover:bg-line-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff3b30]" /> Vidéo
      </button>
      {open && <Recorder track={track} date={date} trackName={trackName} onClose={() => setOpen(false)} />}
    </>
  );
}

function Recorder({ track, date, trackName, onClose }: { track: string; date: string; trackName: string; onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [err, setErr] = useState("");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [title, setTitle] = useState("Présentation du cycle");
  const [note, setNote] = useState("");
  const [day, setDay] = useState(date);
  const live = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const url = blob ? URL.createObjectURL(blob) : null;

  const stopStream = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  useEffect(() => () => { stopStream(); if (timer.current) clearInterval(timer.current); }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && !recording && step !== "sending" && close(); addEventListener("keydown", k); return () => removeEventListener("keydown", k); }); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => { stopStream(); onClose(); };

  const startCamera = async () => {
    setErr("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: { echoCancellation: true, noiseSuppression: true } });
      stream.current = s;
      setStep("live");
      requestAnimationFrame(() => { if (live.current) { live.current.srcObject = s; live.current.play().catch(() => {}); } });
    } catch (e) {
      const name = (e as Error).name;
      setErr(name === "NotAllowedError" ? "Accès refusé. Autorise la caméra et le micro dans la barre d'adresse du navigateur, puis réessaie."
        : name === "NotFoundError" ? "Aucune caméra ou aucun micro détecté sur cet ordinateur." : "Impossible d'ouvrir la caméra.");
    }
  };

  const startRec = () => {
    if (!stream.current) return;
    const mime = pickMime();
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream.current, { mimeType: mime, videoBitsPerSecond: 1_000_000, audioBitsPerSecond: 96_000 });
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      setBlob(new Blob(chunks, { type: mime.split(";")[0] }));
      stopStream();
      setStep("review");
    };
    r.start(1000);
    rec.current = r;
    setRecording(true);
    setElapsed(0);
    const t0 = Date.now();
    timer.current = setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      setElapsed(s);
      if (s >= MAX_S) stopRec();
    }, 250);
  };

  const stopRec = () => {
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
    if (rec.current?.state === "recording") rec.current.stop();
  };

  const retake = () => { setBlob(null); setElapsed(0); startCamera(); };

  const pickFile = (f?: File) => {
    if (!f) return;
    if (!/^video\/(webm|mp4|quicktime)$/.test(f.type)) return setErr("Choisis une vidéo MP4, MOV ou WebM.");
    stopStream(); setErr(""); setBlob(f); setStep("review");
  };

  const send = async () => {
    if (!blob) return;
    if (blob.size > MAX_BYTES) return setErr("La vidéo dépasse 50 Mo. Enregistre plus court (6 min max).");
    setErr(""); setStep("sending");
    const prep = await prepareVideoUpload(blob.type);
    if ("error" in prep) { setErr(prep.error); setStep("review"); return; }
    const sb = createClient(prep.url, prep.key, { auth: { persistSession: false, autoRefreshToken: false } });
    const up = await sb.storage.from("videos").uploadToSignedUrl(prep.path, prep.token, blob, { contentType: blob.type });
    if (up.error) { setErr("L'envoi a échoué. Vérifie ta connexion et réessaie."); setStep("review"); return; }
    const res = await saveVideoBlock({ track, date: day, title, note, path: prep.path });
    if ("error" in res) { setErr(res.error); setStep("review"); return; }
    close();
    router.refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && !recording && step !== "sending" && close()}>
      <div className="w-full max-w-[760px] overflow-hidden rounded-[20px] border border-line bg-canvas shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div>
            <p className="text-[15px] font-semibold text-fog">Vidéo face cam</p>
            <p className="text-[12px] text-dim">{trackName}</p>
          </div>
          {!recording && step !== "sending" && <button type="button" onClick={close} className="text-[14px] text-bleu-2">Fermer</button>}
        </div>

        <div className="p-5">
          {step === "intro" && (
            <div className="grid place-items-center gap-4 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-panel-3">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-fog"><rect x="2.5" y="6" width="13" height="12" rx="2.5" /><path d="m15.5 10.5 6-3.5v10l-6-3.5" /></svg>
              </span>
              <div>
                <p className="text-[17px] font-semibold text-fog">Présente ton cycle en vidéo</p>
                <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">Le navigateur va te demander l&apos;accès à la caméra et au micro. Jusqu&apos;à 6 minutes, publiée dans le planning comme un bloc.</p>
              </div>
              <button type="button" onClick={startCamera} className="btn-lime px-5 py-2.5">Activer caméra et micro</button>
              <label className="cursor-pointer text-[13px] font-medium text-bleu-2 hover:underline">
                ou importer une vidéo
                <input type="file" accept="video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
              </label>
            </div>
          )}

          {step === "live" && (
            <div className="grid gap-4">
              <div className="relative overflow-hidden rounded-[14px] bg-black">
                <video ref={live} muted playsInline className="aspect-video w-full -scale-x-100 object-cover" />
                {recording && (
                  <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[13px] font-semibold tabular-nums text-white backdrop-blur">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#ff3b30]" /> {mmss(elapsed)} <span className="text-white/60">/ {mmss(MAX_S)}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center">
                <button type="button" onClick={recording ? stopRec : startRec} aria-label={recording ? "Arrêter" : "Enregistrer"}
                  className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-fog/80 transition hover:scale-105">
                  <span className={`bg-[#ff3b30] transition-all ${recording ? "h-6 w-6 rounded-md" : "h-11 w-11 rounded-full"}`} />
                </button>
              </div>
              <p className="text-center text-[12px] text-dim">{recording ? "Clique pour arrêter" : "Clique pour lancer l'enregistrement"}</p>
            </div>
          )}

          {(step === "review" || step === "sending") && url && (
            <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
              <video src={url} controls playsInline className="aspect-video w-full rounded-[14px] bg-black object-contain" />
              <div className="grid content-start gap-3">
                <label className="grid gap-1 text-[12px] text-muted">Titre
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="field" /></label>
                <label className="grid gap-1 text-[12px] text-muted">Jour
                  <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="field" /></label>
                <label className="grid gap-1 text-[12px] text-muted">Texte (optionnel)
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Objectifs du cycle, consignes…" className="field resize-none" /></label>
                <p className="text-[11px] text-dim">{(blob!.size / 1024 / 1024).toFixed(1).replace(".", ",")} Mo</p>
              </div>
            </div>
          )}
          {err && <p className="mt-4 rounded-xl bg-danger/10 px-4 py-2.5 text-[13px] text-danger">{err}</p>}
        </div>

        {(step === "review" || step === "sending") && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3.5">
            <button type="button" onClick={retake} disabled={step === "sending"} className="text-[14px] font-medium text-muted hover:text-fog disabled:opacity-40">Refaire</button>
            <button type="button" onClick={send} disabled={step === "sending"} className="btn-lime px-5 py-2.5 disabled:opacity-60">
              {step === "sending" ? "Envoi en cours…" : "Publier dans le planning"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
