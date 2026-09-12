"use client";

import { useEffect, useState } from "react";

export default function QrDaftar({ kod }: { kod: string }) {
  const [url, setUrl] = useState("");
  const [salin, setSalin] = useState(false);
  const [gagalImg, setGagalImg] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/hadir-agm/${kod}`);
  }, [kod]);

  async function salinPautan() {
    try { await navigator.clipboard.writeText(url); setSalin(true); setTimeout(() => setSalin(false), 2000); } catch { /* abai */ }
  }

  const qrSrc = url ? `/api/qr?data=${encodeURIComponent(url)}` : "";

  return (
    <>
      {/* ---- Paparan skrin (sembunyi masa cetak) ---- */}
      <div className="qr-skrin rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-semibold text-slate-800">Kod QR Daftar Hadir</div>
        <p className="mb-3 text-xs text-slate-500">Ahli imbas QR ini &amp; masukkan no. IC untuk daftar hadir sendiri.</p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <div className="flex h-[240px] w-[240px] items-center justify-center rounded-lg bg-white p-3 shadow-sm">
            {qrSrc && !gagalImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrSrc} alt="Kod QR Daftar Hadir" width={220} height={220} onError={() => setGagalImg(true)} className="h-[220px] w-[220px]" />
            ) : (
              <div className="text-center text-xs text-slate-400">{gagalImg ? "QR tak dapat dimuat.\nGuna pautan di sebelah." : "Memuat QR…"}</div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="break-all rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">{url || "…"}</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={salinPautan} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white">{salin ? "Disalin ✓" : "Salin pautan"}</button>
              {url && <a href={url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white">Buka halaman</a>}
              <button onClick={() => window.print()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white">Cetak QR</button>
            </div>
            <p className="text-[11px] text-slate-400">Tip: kalau QR tak papar, guna butang “Salin pautan” &amp; hantar di grup WhatsApp kariah.</p>
          </div>
        </div>
      </div>

      {/* ---- Paparan cetak: QR SAHAJA (sembunyi di skrin) ---- */}
      <div id="qr-cetak" aria-hidden>
        <div className="qr-cetak-tajuk">Surau Ar-Raudhah, Eco Majestic</div>
        <div className="qr-cetak-sub">Kod QR Daftar Hadir — Mesyuarat Agung Kariah</div>
        {qrSrc && !gagalImg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrSrc} alt="Kod QR Daftar Hadir" className="qr-cetak-img" />
        )}
        <div className="qr-cetak-arahan">Imbas QR ini &amp; masukkan no. Kad Pengenalan untuk daftar hadir.</div>
        <div className="qr-cetak-url">{url}</div>
      </div>

      <style>{`
        #qr-cetak { display: none; }
        @media print {
          body * { visibility: hidden !important; }
          #qr-cetak, #qr-cetak * { visibility: visible !important; }
          #qr-cetak {
            display: block !important;
            position: fixed; inset: 0; margin: auto;
            width: 100%; text-align: center;
            padding-top: 40px;
            font-family: Arial, Helvetica, sans-serif; color: #000;
          }
          #qr-cetak .qr-cetak-tajuk { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
          #qr-cetak .qr-cetak-sub { font-size: 14px; font-weight: 600; margin-bottom: 24px; }
          #qr-cetak .qr-cetak-img { width: 380px; height: 380px; margin: 0 auto; display: block; }
          #qr-cetak .qr-cetak-arahan { font-size: 14px; margin-top: 24px; }
          #qr-cetak .qr-cetak-url { font-size: 12px; color: #333; margin-top: 8px; word-break: break-all; padding: 0 40px; }
          @page { margin: 16mm; }
        }
      `}</style>
    </>
  );
}
