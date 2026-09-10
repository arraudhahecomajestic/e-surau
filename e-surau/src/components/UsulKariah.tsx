"use client";

import { useState } from "react";
import { hantarUsul, type BarisUsul } from "@/app/usul-agm/[kod]/actions";

const MAKS = 5;

export default function UsulKariah({ kod, tajuk, tahun }: { kod: string; tajuk: string; tahun: number }) {
  const [ic, setIc] = useState("");
  const [nama, setNama] = useState("");
  const [tel, setTel] = useState("");
  const [perluNama, setPerluNama] = useState(false);
  const [rows, setRows] = useState<BarisUsul[]>([{ usul: "", penjelasan: "" }]);
  const [busy, setBusy] = useState(false);
  const [ralat, setRalat] = useState("");
  const [siap, setSiap] = useState<{ nama?: string; bil?: number } | null>(null);

  function setRow(i: number, k: keyof BarisUsul, v: string) {
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  }
  function tambahRow() { setRows((p) => (p.length >= MAKS ? p : [...p, { usul: "", penjelasan: "" }])); }
  function buangRow(i: number) { setRows((p) => p.filter((_, idx) => idx !== i)); }

  async function hantar() {
    if (!ic.trim()) { setRalat("Sila masukkan no. kad pengenalan."); return; }
    if (perluNama && !nama.trim()) { setRalat("Sila masukkan nama penuh anda."); return; }
    if (!rows.some((r) => r.usul.trim())) { setRalat("Sila isi sekurang-kurangnya satu usul."); return; }
    setBusy(true); setRalat("");
    const r = await hantarUsul(kod, ic, nama, tel, rows);
    setBusy(false);
    if (r.status === "perlu_nama") { setPerluNama(true); setRalat(""); return; }
    if (r.status !== "sah") { setRalat(r.msg ?? "Ralat. Cuba lagi."); return; }
    setSiap({ nama: r.nama, bil: r.bil });
  }

  if (siap) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl font-bold text-green-600">✓</div>
        <h2 className="text-xl font-bold text-slate-900">Usul Diterima</h2>
        <p className="mt-1 text-slate-600">Terima kasih{siap.nama ? <>, <b>{siap.nama}</b></> : ""}. {siap.bil} usul anda telah dihantar kepada Setiausaha untuk pertimbangan Mesyuarat Agung.</p>
        <button onClick={() => { setSiap(null); setIc(""); setNama(""); setTel(""); setPerluNama(false); setRows([{ usul: "", penjelasan: "" }]); }} className="mt-5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Hantar usul lain</button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-lg font-bold text-slate-900">Borang Cadangan Usul</h1>
      <p className="text-sm text-slate-500">{tajuk} {tahun}</p>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-slate-700">No. Kad Pengenalan</span>
        <input value={ic} onChange={(e) => setIc(e.target.value)} inputMode="numeric" autoFocus placeholder="cth: 901010101234" className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base tracking-wide" />
        <span className="mt-1 block text-xs text-slate-400">Nama & no. telefon akan dikesan automatik dari rekod ahli kariah.</span>
      </label>

      {perluNama && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nama Penuh</span>
            <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama penuh" className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">No. Telefon</span>
            <input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" placeholder="cth: 0123456789" className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-base" />
          </label>
          <p className="sm:col-span-2 -mt-1 text-xs text-amber-600">IC anda belum ada dalam rekod. Sila isi nama & telefon.</p>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Usul {i + 1}</span>
              {rows.length > 1 && <button onClick={() => buangRow(i)} className="text-xs font-semibold text-red-600 hover:underline">Buang</button>}
            </div>
            <textarea value={r.usul} onChange={(e) => setRow(i, "usul", e.target.value)} rows={2} placeholder="Nyatakan usul / cadangan anda" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <textarea value={r.penjelasan} onChange={(e) => setRow(i, "penjelasan", e.target.value)} rows={2} placeholder="Penjelasan (pilihan)" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        ))}
      </div>

      {rows.length < MAKS && (
        <button onClick={tambahRow} className="mt-3 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-surau">+ Tambah usul lagi</button>
      )}

      {ralat && <p className="mt-3 text-sm font-semibold text-red-600">{ralat}</p>}

      <button onClick={hantar} disabled={busy} className="mt-4 w-full rounded-xl bg-surau px-4 py-3 text-base font-bold text-white hover:bg-surau-dark disabled:opacity-50">
        {busy ? "Menghantar…" : "Hantar Usul"}
      </button>
    </div>
  );
}
