"use client";

import { useState } from "react";
import { mulaBayaranKhairat } from "@/app/ahli/khairat/actions";
import { PAKEJ_KHAIRAT, YURAN_KHAIRAT_TAHUNAN } from "@/lib/tetapan";
import PilihKaedahBayar, { type KaedahBayar } from "@/components/PilihKaedahBayar";

export default function BayarKhairatButton({ bayaranDibuka = false, yuran = YURAN_KHAIRAT_TAHUNAN }: { bayaranDibuka?: boolean; yuran?: number }) {
  const [sedang, setSedang] = useState<number | null>(null);
  const [kaedah, setKaedah] = useState<KaedahBayar>("fpx");
  const [ralat, setRalat] = useState("");

  if (!bayaranDibuka) {
    return (
      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        Bayaran online sedang diselenggara buat sementara waktu. Sila jelaskan yuran khairat secara{" "}
        <b>tunai di kaunter surau</b> atau pindahan bank. Terima kasih.
      </div>
    );
  }

  async function bayar(tahun: number) {
    setRalat("");
    setSedang(tahun);
    const res = await mulaBayaranKhairat(tahun, kaedah);
    if (!res.ok) { setSedang(null); setRalat(res.msg ?? "Ralat pembayaran."); return; }
    if (res.checkout_url) window.location.href = res.checkout_url;
  }

  return (
    <div className="space-y-2">
      <PilihKaedahBayar value={kaedah} onChange={setKaedah} />
      <div className="text-sm font-medium text-slate-700">Pilih pakej & bayar (online):</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PAKEJ_KHAIRAT.map((pk) => {
          const jum = yuran * pk.tahun;
          return (
            <button
              key={pk.tahun}
              type="button"
              onClick={() => bayar(pk.tahun)}
              disabled={sedang !== null}
              className="rounded-lg border-2 border-surau/30 bg-white p-3 text-center hover:border-surau disabled:opacity-60"
            >
              <div className="text-sm font-bold text-slate-900">{pk.label}</div>
              <div className="mt-0.5 text-surau font-semibold">RM{jum}</div>
              {sedang === pk.tahun && <div className="mt-1 text-[11px] text-amber-600">Menyambung…</div>}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">Yuran RM{yuran}/tahun. Bayar terus untuk beberapa tahun sekali gus (FPX/kad/e-wallet).</p>
      {ralat && <p className="text-sm text-red-600">{ralat}</p>}
    </div>
  );
}
