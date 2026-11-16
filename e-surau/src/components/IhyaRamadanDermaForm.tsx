"use client";

import { useState } from "react";
import { mulaDermaIhyaRamadan } from "@/app/ihya-ramadan/actions";

const PRESET = [30, 50, 100, 200, 500, 1000];

export default function IhyaRamadanDermaForm() {
  const [amt, setAmt] = useState<number>(100);
  const [custom, setCustom] = useState("");
  const [nama, setNama] = useState("");
  const [emel, setEmel] = useState("");
  const [telefon, setTelefon] = useState("");
  const [hamba, setHamba] = useState(false);
  const [sedang, setSedang] = useState(false);
  const [ralat, setRalat] = useState("");

  const nilai = custom ? Number(custom.replace(/[^\d.]/g, "")) : amt;

  async function bayar() {
    setRalat("");
    if (!emel.includes("@")) { setRalat("Sila isi e-mel yang sah untuk resit."); return; }
    if (!nilai || nilai < 1) { setRalat("Sila pilih atau masukkan jumlah yang sah."); return; }
    setSedang(true);
    const res = await mulaDermaIhyaRamadan({ amount: nilai, nama, emel, telefon, hambaAllah: hamba });
    if (!res.ok) { setSedang(false); setRalat(res.msg ?? "Ralat pembayaran."); return; }
    if (res.checkout_url) window.location.href = res.checkout_url;
  }

  return (
    <div className="space-y-4">
      <div>
        <span className="mb-2 block text-sm font-medium text-slate-700">Pilih jumlah sumbangan:</span>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
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
          <input value={nama} onChange={(e) => setNama(e.target.value)} disabled={hamba} placeholder={hamba ? "Hamba Allah" : ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-surau disabled:bg-slate-100 disabled:text-slate-400" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">E-mel (untuk resit) *</span>
          <input type="email" value={emel} onChange={(e) => setEmel(e.target.value)} placeholder="emel@contoh.com" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-surau" />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">No. telefon (pilihan)</span>
        <input value={telefon} onChange={(e) => setTelefon(e.target.value)} inputMode="tel" placeholder="012-xxxxxxx" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-surau" />
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={hamba} onChange={(e) => setHamba(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-surau" />
        Dermakan sebagai <b>Hamba Allah</b> (sembunyikan nama di dinding penderma)
      </label>

      {ralat && <p className="text-sm text-red-600">{ralat}</p>}

      <button
        onClick={bayar}
        disabled={sedang}
        className="w-full rounded-lg bg-surau px-6 py-3 font-semibold text-white hover:bg-surau-dark disabled:opacity-60"
      >
        {sedang ? "Menyambung ke pembayaran…" : `Sumbang RM${nilai || 0} Sekarang`}
      </button>
      <p className="text-center text-xs text-slate-400">Bayaran diproses selamat melalui CHIP (FPX / kad / e-wallet). Resit dihantar ke e-mel anda.</p>
    </div>
  );
}
