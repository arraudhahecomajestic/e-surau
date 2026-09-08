"use client";

import { useEffect, useRef, useState } from "react";

declare global { interface Window { QRCode?: any } }

const CDN = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

export default function QrDaftar({ kod }: { kod: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  const [salin, setSalin] = useState(false);
  const [gagalQr, setGagalQr] = useState(false);

  useEffect(() => {
    const u = `${window.location.origin}/hadir-agm/${kod}`;
    setUrl(u);

    let batal = false;
    function lukis() {
      if (batal || !ref.current || !window.QRCode) return;
      ref.current.innerHTML = "";
      try { new window.QRCode(ref.current, { text: u, width: 220, height: 220, correctLevel: window.QRCode.CorrectLevel?.M ?? 0 }); }
      catch { setGagalQr(true); }
    }
    if (window.QRCode) { lukis(); return; }
    const ada = document.querySelector(`script[src="${CDN}"]`) as HTMLScriptElement | null;
    if (ada) { ada.addEventListener("load", lukis); return () => { batal = true; ada.removeEventListener("load", lukis); }; }
    const s = document.createElement("script");
    s.src = CDN; s.async = true; s.onload = lukis; s.onerror = () => setGagalQr(true);
    document.body.appendChild(s);
    return () => { batal = true; };
  }, [kod]);

  async function salinPautan() {
    try { await navigator.clipboard.writeText(url); setSalin(true); setTimeout(() => setSalin(false), 2000); } catch { /* abai */ }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-800">Kod QR Daftar Hadir</div>
      <p className="mb-3 text-xs text-slate-500">Ahli imbas QR ini &amp; masukkan no. IC untuk daftar hadir sendiri.</p>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        <div className="rounded-lg bg-white p-3 shadow-sm">
          <div ref={ref} className="h-[220px] w-[220px] [&>img]:mx-auto [&>canvas]:mx-auto" />
          {gagalQr && <div className="flex h-[220px] w-[220px] items-center justify-center text-center text-xs text-slate-400">QR tak dapat dimuat.<br/>Guna pautan di sebelah.</div>}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="break-all rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">{url || "…"}</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={salinPautan} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white">{salin ? "Disalin ✓" : "Salin pautan"}</button>
            {url && <a href={url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white">Buka halaman</a>}
            <button onClick={() => window.print()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white">Cetak</button>
          </div>
        </div>
      </div>
    </div>
  );
}
