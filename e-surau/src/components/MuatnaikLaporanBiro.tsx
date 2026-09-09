"use client";

import { useState } from "react";
import { muatnaikLaporanBiro } from "@/app/laporan-biro/[kod]/actions";

function bilaTeks(iso: string | null) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" }); }
  catch { return ""; }
}

export default function MuatnaikLaporanBiro({
  kod, nama, ketua, tahun, failNama, failMasa,
}: {
  kod: string; nama: string; ketua: string | null; tahun: number;
  failNama: string | null; failMasa: string | null;
}) {
  const [fail, setFail] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [siap, setSiap] = useState(false);
  const [ralat, setRalat] = useState("");
  const [semasaNama, setSemasaNama] = useState(failNama);
  const [semasaMasa, setSemasaMasa] = useState(failMasa);

  async function hantar() {
    if (!fail) { setRalat("Sila pilih fail laporan dahulu."); return; }
    setBusy(true); setRalat("");
    const fd = new FormData();
    fd.append("fail", fail);
    const r = await muatnaikLaporanBiro(kod, fd);
    setBusy(false);
    if (!r.ok) { setRalat(r.msg ?? "Gagal muat naik. Cuba lagi."); return; }
    setSiap(true);
    setSemasaNama(fail.name);
    setSemasaMasa(new Date().toISOString());
  }

  if (siap) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl font-bold text-green-600">✓</div>
        <h2 className="text-xl font-bold text-slate-900">Laporan Diterima</h2>
        <p className="mt-1 text-slate-600">Terima kasih. Laporan untuk <b>{nama}</b> telah dimuat naik ke sistem.</p>
        {semasaNama && <p className="mt-2 text-xs text-slate-400">{semasaNama}</p>}
        <button
          onClick={() => { setSiap(false); setFail(null); }}
          className="mt-5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >Muat naik versi lain</button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-bold text-slate-900">Muat Naik Laporan Biro</h1>
      <p className="text-sm text-slate-500">{nama} · Laporan Tahunan {tahun}</p>
      {ketua && <p className="mt-0.5 text-xs text-slate-400">Ketua: {ketua}</p>}

      <a
        href="/Templat_Laporan_Biro_SAR.docx"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-surau/40 bg-surau/5 px-4 py-3 text-sm font-semibold text-surau hover:bg-surau/10"
      >
        Muat Turun Templete Laporan (Word)
      </a>

      {semasaNama && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="font-medium text-slate-700">Fail dimuat naik sebelum ini:</div>
          <div className="mt-0.5 text-slate-600">{semasaNama}</div>
          {semasaMasa && <div className="text-xs text-slate-400">{bilaTeks(semasaMasa)}</div>}
          <div className="mt-1 text-xs text-amber-600">Muat naik semula akan menggantikan fail ini.</div>
        </div>
      )}

      <label className="mt-4 block">
        <span className="text-sm font-medium text-slate-700">Pilih fail laporan</span>
        <input
          type="file"
          accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
          onChange={(e) => { setFail(e.target.files?.[0] ?? null); setRalat(""); }}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surau file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
        />
      </label>
      {fail && <p className="mt-1 text-xs text-slate-500">Dipilih: {fail.name} ({(fail.size / 1024 / 1024).toFixed(1)}MB)</p>}

      {ralat && <p className="mt-3 text-sm font-semibold text-red-600">{ralat}</p>}

      <button
        onClick={hantar}
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-surau px-4 py-3 text-base font-bold text-white hover:bg-surau-dark disabled:opacity-50"
      >
        {busy ? "Memuat naik…" : "Hantar Laporan"}
      </button>
    </div>
  );
}
