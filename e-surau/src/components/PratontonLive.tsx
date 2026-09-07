"use client";

import { useEffect, useRef, useState } from "react";

// Pratonton LIVE — baca borang tetapan (ikut id) & bina semula URL iframe
// setiap kali ada perubahan, tanpa perlu Simpan dahulu.
export default function PratontonLive({ formId }: { formId: string }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fasaRef = useRef<string>(""); // "", "iqamah", "solat"
  const tRef = useRef<any>(null);
  const [fasa, setFasaState] = useState("");

  function bina() {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    const p = new URLSearchParams();
    p.set("pratonton", "1");
    if (form) {
      const fd = new FormData(form);
      const g = (k: string) => (fd.get(k) ?? "").toString();
      p.set("tema", g("paparan_tema"));
      p.set("gaya", g("paparan_iqamah_gaya"));
      p.set("saat", g("paparan_saat"));
      p.set("iqamah", g("paparan_iqamah"));
      p.set("azan", fd.get("paparan_azan") ? "on" : "off");
      p.set("teks", g("paparan_teks"));
      p.set("isi", g("paparan_poster_isi"));
      p.set("mod", g("paparan_poster_mod"));
      const bg = g("paparan_iqamah_bg");
      if (bg) p.set("bg", bg);
    }
    if (fasaRef.current) p.set("fasa", fasaRef.current);
    if (iframeRef.current) iframeRef.current.src = "/paparan?" + p.toString();
  }

  function setFasa(v: string) {
    fasaRef.current = v;
    setFasaState(v);
    bina();
  }

  useEffect(() => {
    bina();
    const form = document.getElementById(formId);
    if (!form) return;
    const onChange = () => { clearTimeout(tRef.current); tRef.current = setTimeout(bina, 350); };
    form.addEventListener("input", onChange);
    form.addEventListener("change", onChange);
    return () => {
      form.removeEventListener("input", onChange);
      form.removeEventListener("change", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const btn = (val: string, label: string) => (
    <button
      type="button"
      onClick={() => setFasa(val)}
      className={`rounded-lg px-3 py-1 text-xs font-semibold ${fasa === val ? "bg-surau text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Babak pratonton:</span>
        {btn("", "Normal (poster/jam)")}
        {btn("iqamah", "Azan / Iqamah")}
        {btn("solat", "Solat")}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-inner">
        <div className="aspect-video w-full">
          {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
          <iframe ref={iframeRef} title="Pratonton Paparan TV" className="h-full w-full border-0" />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        ✨ Pratonton berubah serta-merta bila kau tukar tetapan di bawah — tak perlu Simpan dulu.
        Tekan <b>Simpan</b> bila dah puas hati untuk kekalkan di TV.
      </p>
    </div>
  );
}
