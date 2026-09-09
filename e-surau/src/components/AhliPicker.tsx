"use client";

import { useMemo, useRef, useState } from "react";

export type AhliRingkas = { id: string; no_ahli: string | null; nama: string; no_kp?: string | null; telefon?: string | null; alamat?: string | null };
export type PilihanAhli = { nama: string; ahliId: string | null; noAhli: string | null; noKp: string | null; telefon: string | null; alamat: string | null };

export const KOSONG: PilihanAhli = { nama: "", ahliId: null, noAhli: null, noKp: null, telefon: null, alamat: null };

export default function AhliPicker({
  label, ahli, nilai, onChange, placeholder,
}: {
  label: string;
  ahli: AhliRingkas[];
  nilai: PilihanAhli;
  onChange: (v: PilihanAhli) => void;
  placeholder?: string;
}) {
  const [buka, setBuka] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const padanan = useMemo(() => {
    const q = nilai.nama.trim().toLowerCase();
    if (!q || nilai.ahliId) return [] as AhliRingkas[]; // dah pilih → tak payah tunjuk
    return ahli
      .filter((a) => a.nama.toLowerCase().includes(q) || (a.no_ahli ?? "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [nilai, ahli]);

  function taip(v: string) {
    // menaip semula = batal pilihan sebelum (jadi teks bebas)
    onChange({ ...KOSONG, nama: v });
    setBuka(true);
  }
  function pilih(a: AhliRingkas) {
    onChange({ nama: a.nama, ahliId: a.id, noAhli: a.no_ahli ?? null, noKp: a.no_kp ?? null, telefon: a.telefon ?? null, alamat: a.alamat ?? null });
    setBuka(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        value={nilai.nama}
        onChange={(e) => taip(e.target.value)}
        onFocus={() => setBuka(true)}
        onBlur={() => setTimeout(() => setBuka(false), 150)}
        placeholder={placeholder ?? "Cari nama / no. ahli…"}
        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
      />
      {nilai.ahliId && (
        <div className="mt-2 border-t border-dashed border-slate-200 pt-2">
          <InfoRow k="Nama" v={nilai.nama} />
          <InfoRow k="No Ahli Kariah" v={nilai.noAhli} />
          <InfoRow k="No IC" v={nilai.noKp} />
          <InfoRow k="Alamat" v={nilai.alamat} />
          <InfoRow k="No Tel" v={nilai.telefon} />
          <div className="mt-1.5 text-[11px] font-semibold text-emerald-600">✓ Terpaut ke rekod ahli</div>
        </div>
      )}
      {buka && padanan.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {padanan.map((a) => (
            <button
              key={a.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pilih(a); }}
              className="flex w-full items-start justify-between gap-2 border-b border-slate-50 px-3 py-2 text-left text-sm last:border-0 hover:bg-slate-50"
            >
              <span className="whitespace-normal break-words font-medium text-slate-800">{a.nama}</span>
              <span className="shrink-0 whitespace-nowrap text-xs text-slate-400">{a.no_ahli ?? "—"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-1 text-[12.5px] last:border-0">
      <span className="shrink-0 text-slate-500">{k}</span>
      <span className="text-right font-semibold text-slate-800">{v && v.trim() ? v : "—"}</span>
    </div>
  );
}
