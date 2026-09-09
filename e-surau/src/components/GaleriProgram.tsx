"use client";

import { useState } from "react";

// Galeri gambar dokumentasi program (paparan awam). Grid kecil + ketik untuk besarkan.
export default function GaleriProgram({ gambar, tajuk }: { gambar: string[]; tajuk?: string }) {
  const [buka, setBuka] = useState<number | null>(null);
  if (!gambar || gambar.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">Galeri Program</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {gambar.map((u, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={u}
            src={u}
            alt={`${tajuk ?? "Program"} — gambar ${i + 1}`}
            onClick={() => setBuka(i)}
            className="aspect-square w-full cursor-pointer rounded-lg border border-slate-200 object-cover transition hover:opacity-90"
          />
        ))}
      </div>

      {buka !== null && (
        <div
          onClick={() => setBuka(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gambar[buka]} alt={`Gambar ${buka + 1}`} className="max-h-[85vh] max-w-full rounded-lg object-contain" />
          <button
            onClick={() => setBuka(null)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-slate-800"
            aria-label="Tutup"
          >×</button>
          {gambar.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setBuka((b) => (b === null ? b : (b - 1 + gambar.length) % gambar.length)); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl font-bold text-slate-800"
                aria-label="Sebelum"
              >‹</button>
              <button
                onClick={(e) => { e.stopPropagation(); setBuka((b) => (b === null ? b : (b + 1) % gambar.length)); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl font-bold text-slate-800"
                aria-label="Seterusnya"
              >›</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
