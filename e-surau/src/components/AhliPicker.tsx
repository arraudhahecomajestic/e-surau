"use client";

import { useMemo, useRef, useState } from "react";

export type AhliRingkas = { id: string; no_ahli: string | null; nama: string; telefon?: string | null; kawasan?: string | null };
export type PilihanAhli = { nama: string; ahliId: string | null; noAhli: string | null; telefon: string | null; fasa: string | null };

export const KOSONG: PilihanAhli = { nama: "", ahliId: null, noAhli: null, telefon: null, fasa: null };

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
    onChange({ nama: a.nama, ahliId: a.id, noAhli: a.no_ahli ?? null, telefon: a.telefon ?? null, fasa: a.kawasan ?? null });
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
      {nilai.ahliId && <span className="mt-0.5 block text-[11px] text-emerald-600">✓ {nilai.noAhli ?? "ahli berdaftar"}</span>}
      {buka && padanan.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {padanan.map((a) => (
            <button
              key={a.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pilih(a); }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span className="truncate">{a.nama}</span>
              <span className="shrink-0 text-xs text-slate-400">{a.no_ahli ?? "—"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
