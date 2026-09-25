"use client";

import { useState } from "react";
import { mulaDermaTabungIhsan } from "@/app/bantuan/actions";

const PRESET = [10, 30, 50, 100, 200];

export default function TabungIhsanDermaForm() {
  const [amt, setAmt] = useState<number>(50);
  const [custom, setCustom] = useState("");
  const [nama, setNama] = useState("");
  const [emel, setEmel] = useState("");
  const [sedang, setSedang] = useState(false);
  const [ralat, setRalat] = useState("");

  const nilai = custom ? Number(custom.replace(/[^\d.]/g, "")) : amt;

  async function bayar() {
    setRalat("");
    if (!emel.includes("@")) { setRalat("Sila isi e-mel yang sah untuk resit."); return; }
    if (!nilai || nilai < 1) { setRalat("Sila pilih atau masukkan jumlah yang sah."); return; }
    setSedang(true);
    const res = await mulaDermaTabungIhsan({ amount: nilai, nama, emel });
    if (!res.ok) { setSedang(false); setRalat(res.msg ?? "Ralat pembayaran."); return; }
    if (res.checkout_url) window.location.href = res.checkout_url;
  }

  return (
    <div className="space-y-4 text-left">
      <div>
        <span className="mb-2 block text-sm font-medium text-slate-700">Pilih jumlah sumbangan:</span>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {PRESET.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => { setAmt(a); setCustom(""); }}
              className={`rounded-lg border-2 py-3 text-center font-bold ${!custom && amt === a ? "border-surau bg-surau/10 text-surau-dark" : "border-slate-200 text-slate-700 hover:border-surau/40"}`}
            >
              RM{a}
            </button>
          ))}
        </div>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          inputMode="decimal"
          placeholder="Atau masukkan jumlah lain (RM)"
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-surau"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Nama (pilihan)</span>
          <input value={nama} onChange={(e) => setNama(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-surau" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">E-mel (untuk resit) *</span>
          <input type="email" value={emel} onChange={(e) => setEmel(e.target.value)} placeholder="emel@contoh.com" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-surau" />
        </label>
      </div>

      {ralat && <p className="text-sm text-red-600">{ralat}</p>}

      <button
        onClick={bayar}
        disabled={sedang}
        className="w-full rounded-lg bg-surau px-6 py-3 font-semibold text-white hover:bg-surau-dark disabled:opacity-60"
      >
        {sedang ? "Menyambung ke pembayaran…" : `Sumbang RM${nilai || 0} ke Tabung Ihsan`}
      </button>
      <p className="text-center text-xs text-slate-400">Bayaran selamat melalui CHIP (FPX / kad / e-wallet). Resit dihantar ke e-mel anda.</p>
    </div>
  );
}
