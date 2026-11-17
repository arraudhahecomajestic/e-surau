"use client";

import { useState } from "react";
import { mulaInfaq } from "@/app/infaq/actions";
import { PAKEJ_INFAQ_SUBUH, INFAQ_JAMUAN_SELOT, INFAQ_JAMUAN_MAX_LOT } from "@/lib/tetapan";
import PilihKaedahBayar, { type KaedahBayar } from "@/components/PilihKaedahBayar";

export default function InfaqForm() {
  const [tab, setTab] = useState<"subuh" | "jamuan">("subuh");
  const [subuhAmt, setSubuhAmt] = useState<number>(PAKEJ_INFAQ_SUBUH[2]);
  const [lot, setLot] = useState(1);
  const [nama, setNama] = useState("");
  const [emel, setEmel] = useState("");
  const [sedang, setSedang] = useState(false);
  const [kaedah, setKaedah] = useState<KaedahBayar>("fpx");
  const [ralat, setRalat] = useState("");

  const jamuanAmt = lot * INFAQ_JAMUAN_SELOT;

  async function bayar() {
    setRalat("");
    if (!emel.includes("@")) { setRalat("Sila isi e-mel yang sah untuk resit."); return; }
    setSedang(true);
    const res = await mulaInfaq(
      tab === "subuh"
        ? { jenis: "subuh", amount: subuhAmt, nama, emel, kaedah }
        : { jenis: "jamuan", amount: jamuanAmt, lot, nama, emel, kaedah },
    );
    if (!res.ok) { setSedang(false); setRalat(res.msg ?? "Ralat pembayaran."); return; }
    if (res.checkout_url) window.location.href = res.checkout_url;
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <button onClick={() => setTab("subuh")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold ${tab === "subuh" ? "bg-surau text-white" : "bg-slate-100 text-slate-600"}`}>Infaq Subuh</button>
        <button onClick={() => setTab("jamuan")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold ${tab === "jamuan" ? "bg-surau text-white" : "bg-slate-100 text-slate-600"}`}>Infaq Jamuan</button>
      </div>

      {tab === "subuh" ? (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Infaq Subuh</h2>
          <p className="mt-1 text-sm text-slate-600">Sedekah subuh — mulakan pagi dengan kebaikan. Pilih jumlah:</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {PAKEJ_INFAQ_SUBUH.map((a) => (
              <button key={a} onClick={() => setSubuhAmt(a)} className={`rounded-lg border-2 py-3 text-center font-bold ${subuhAmt === a ? "border-surau bg-surau/10 text-surau-dark" : "border-slate-200 text-slate-700 hover:border-surau/40"}`}>
                RM{a}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Infaq Jamuan Yassin & Tahlil</h2>
          <p className="mt-1 text-sm text-slate-600">
            Setiap malam Jumaat surau belanja ~RM{INFAQ_JAMUAN_SELOT * INFAQ_JAMUAN_MAX_LOT} untuk jamuan.
            1 lot = <b>RM{INFAQ_JAMUAN_SELOT}</b>. Pilih berapa lot nak ditaja:
          </p>
          <div className="mt-3 flex items-center gap-3">
            <input type="range" min={1} max={INFAQ_JAMUAN_MAX_LOT} value={lot} onChange={(e) => setLot(Number(e.target.value))} className="flex-1 accent-surau" />
            <input type="number" min={1} max={INFAQ_JAMUAN_MAX_LOT} value={lot} onChange={(e) => setLot(Math.min(INFAQ_JAMUAN_MAX_LOT, Math.max(1, Number(e.target.value) || 1)))} className="w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm" />
            <span className="text-sm text-slate-500">lot</span>
          </div>
          <div className="mt-3 rounded-lg bg-surau/5 p-3 text-center">
            <span className="text-sm text-slate-600">Jumlah infaq: </span>
            <span className="text-xl font-extrabold text-surau">RM{jamuanAmt}</span>
          </div>
        </div>
      )}

      <div className="grid gap-3 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Nama (pilihan)</span>
          <input value={nama} onChange={(e) => setNama(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-surau" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">E-mel (untuk resit) *</span>
          <input type="email" value={emel} onChange={(e) => setEmel(e.target.value)} placeholder="emel@contoh.com" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-surau" />
        </label>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <PilihKaedahBayar value={kaedah} onChange={setKaedah} amount={tab === "subuh" ? subuhAmt : jamuanAmt} />
      </div>

      {ralat && <p className="text-sm text-red-600">{ralat}</p>}

      <button onClick={bayar} disabled={sedang} className="w-full rounded-lg bg-surau px-6 py-3.5 text-base font-semibold text-white hover:bg-surau-dark disabled:opacity-60">
        {sedang ? "Menyambung ke gerbang bayaran…" : `Infaq ${tab === "subuh" ? `RM${subuhAmt}` : `RM${jamuanAmt}`} Sekarang`}
      </button>
      <p className="text-center text-xs text-slate-400">Semoga Allah membalas infaq anda dengan kebaikan yang berlipat ganda. </p>
    </div>
  );
}
