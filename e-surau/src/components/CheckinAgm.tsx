"use client";

import { useState } from "react";
import { checkinAgm, type HasilCheckin } from "@/app/hadir-agm/[kod]/actions";

export default function CheckinAgm({ kod, tajuk, tahun }: { kod: string; tajuk: string; tahun: number }) {
  const [ic, setIc] = useState("");
  const [nama, setNama] = useState("");
  const [perluNama, setPerluNama] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasil, setHasil] = useState<HasilCheckin | null>(null);
  const [ralat, setRalat] = useState("");

  async function hantar() {
    if (!ic.trim()) { setRalat("Sila masukkan no. kad pengenalan."); return; }
    if (perluNama && !nama.trim()) { setRalat("Sila masukkan nama penuh anda."); return; }
    setBusy(true); setRalat("");
    const r = await checkinAgm(kod, ic, nama);
    setBusy(false);
    if (r.status === "perlu_nama") { setPerluNama(true); setRalat(""); return; }
    if (r.status === "ralat") { setRalat(r.msg ?? "Ralat. Cuba lagi."); return; }
    setHasil(r);
  }

  function semula() { setIc(""); setNama(""); setPerluNama(false); setHasil(null); setRalat(""); }

  // Skrin keputusan
  if (hasil) {
    const jaya = hasil.status === "sah" || hasil.status === "perlu_semak" || hasil.status === "sudah";
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold ${jaya ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>
          {jaya ? "✓" : "!"}
        </div>
        {hasil.status === "sah" && <>
          <h2 className="text-xl font-bold text-slate-900">Kehadiran Direkod</h2>
          <p className="mt-1 text-slate-600">Terima kasih, <b>{hasil.nama}</b>. Anda telah didaftarkan hadir & layak mengundi.</p>
        </>}
        {hasil.status === "perlu_semak" && <>
          <h2 className="text-xl font-bold text-slate-900">Kehadiran Direkod</h2>
          <p className="mt-1 text-slate-600">Terima kasih, <b>{hasil.nama}</b>. Anda telah didaftarkan hadir & layak mengundi.</p>
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-700">Rekod anda belum dikemas kini dalam sistem — petugas akan menyemak nanti. Hak mengundi anda tidak terjejas.</p>
        </>}
        {hasil.status === "sudah" && <>
          <h2 className="text-xl font-bold text-slate-900">Anda Sudah Didaftarkan</h2>
          <p className="mt-1 text-slate-600">{hasil.nama ? <b>{hasil.nama}</b> : "Anda"} telah pun direkod hadir sebelum ini. Tidak perlu daftar semula.</p>
        </>}
        <button onClick={semula} className="mt-5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Daftar orang lain</button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-bold text-slate-900">Daftar Hadir</h1>
      <p className="text-sm text-slate-500">{tajuk} {tahun}</p>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-slate-700">No. Kad Pengenalan</span>
        <input
          value={ic}
          onChange={(e) => setIc(e.target.value)}
          inputMode="numeric"
          autoFocus
          placeholder="cth: 901010101234"
          className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base tracking-wide"
        />
      </label>

      {perluNama && (
        <label className="mt-3 block">
          <span className="text-sm font-medium text-slate-700">Nama Penuh</span>
          <p className="mb-1 text-xs text-amber-600">IC anda belum ada dalam sistem. Sila masukkan nama penuh (anda tetap boleh hadir & mengundi).</p>
          <input
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Nama penuh seperti dalam kad pengenalan"
            className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base"
          />
        </label>
      )}

      {ralat && <p className="mt-3 text-sm font-semibold text-red-600">{ralat}</p>}

      <button
        onClick={hantar}
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-surau px-4 py-3 text-base font-bold text-white hover:bg-surau-dark disabled:opacity-50"
      >
        {busy ? "Memproses…" : "Daftar Hadir"}
      </button>
    </div>
  );
}
