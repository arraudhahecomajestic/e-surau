"use client";

import { FI_CHIP } from "@/lib/tetapan";

export type KaedahBayar = "fpx" | "kad";

// Fi papar (selari dgn fiKaedah di chip.ts): fpx = FI_CHIP rata; kad = base*2/98 bundar naik.
export function feeKaedah(baseRM: number, kaedah: KaedahBayar): number {
  if (kaedah === "kad") return Math.ceil((baseRM * 2 / 98) * 100) / 100;
  return FI_CHIP || 0;
}

export default function PilihKaedahBayar({
  value, onChange, amount,
}: { value: KaedahBayar; onChange: (k: KaedahBayar) => void; amount?: number }) {
  const base = Number(amount) || 0;
  const opsi: { k: KaedahBayar; tajuk: string; nota: string }[] = [
    { k: "fpx", tajuk: "FPX / Perbankan Online", nota: "Semua bank Malaysia" },
    { k: "kad", tajuk: "Kad Kredit / Debit", nota: "Visa / Mastercard" },
  ];
  const labelFi = (k: KaedahBayar) =>
    base > 0 ? `+ RM${feeKaedah(base, k).toFixed(2)} fi` : (k === "kad" ? "+ 2.04% fi" : `+ RM${(FI_CHIP || 0).toFixed(2)} fi`);
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-slate-700">Kaedah bayaran:</span>
      <div className="grid grid-cols-2 gap-2">
        {opsi.map((o) => {
          const pilih = value === o.k;
          return (
            <button
              key={o.k}
              type="button"
              onClick={() => onChange(o.k)}
              className={`rounded-lg border-2 p-3 text-left ${pilih ? "border-surau bg-surau/10" : "border-slate-200 hover:border-surau/40"}`}
            >
              <div className={`text-sm font-bold ${pilih ? "text-surau-dark" : "text-slate-800"}`}>{o.tajuk}</div>
              <div className="text-xs text-slate-500">{o.nota}</div>
              <div className="mt-1 text-xs font-semibold text-slate-600">{labelFi(o.k)}</div>
            </button>
          );
        })}
      </div>
      {base > 0 && (
        <p className="mt-1.5 text-xs text-slate-400">
          Fi pemprosesan ditanggung pembayar supaya <b>surau terima jumlah penuh</b>. Jumlah dibayar: RM{(base + feeKaedah(base, value)).toFixed(2)}.
        </p>
      )}
    </div>
  );
}
