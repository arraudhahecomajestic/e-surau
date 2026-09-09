"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAKS = 10;

// Auto-kecilkan gambar dalam pelayar sebelum muat naik supaya gambar besar
// (>5MB) tak gagal. Resize ke lebar maks 1600px, simpan sebagai JPEG.
async function mampatImej(f: File): Promise<File> {
  try {
    if (!f.type.startsWith("image/")) return f;
    const bitmap = await createImageBitmap(f).catch(() => null);
    if (!bitmap) return f;
    const maksLebar = 1600;
    const skala = Math.min(1, maksLebar / bitmap.width);
    const w = Math.max(1, Math.round(bitmap.width * skala));
    const h = Math.max(1, Math.round(bitmap.height * skala));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return f;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (!blob) return f;
    if (blob.size >= f.size) return f;
    return new File([blob], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return f;
  }
}

async function muatGambar(f: File): Promise<{ url: string | null; ralat?: string }> {
  try {
    const supabase = createClient();
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
    const path = `gambar-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("kandungan").upload(path, f, { contentType: f.type || undefined, upsert: true });
    if (error) return { url: null, ralat: error.message };
    return { url: supabase.storage.from("kandungan").getPublicUrl(path).data.publicUrl };
  } catch (e: any) {
    return { url: null, ralat: e?.message || "ralat tidak diketahui" };
  }
}

// Galeri gambar dokumentasi program: muat naik 4–10 keping, susun, buang.
// Senarai URL dihantar sebagai medan tersembunyi "gambar_urls" (JSON)
// dalam borang kemasProgram.
export default function GambarProgramInput({ awal }: { awal: string[] }) {
  const [gambar, setGambar] = useState<string[]>(awal || []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    const fail = Array.from(e.target.files || []);
    e.target.value = "";
    if (!fail.length) return;
    setMsg("");
    const ruang = MAKS - gambar.length;
    if (ruang <= 0) { setMsg(`Maksimum ${MAKS} gambar sahaja.`); return; }
    setBusy(true);
    const baharu: string[] = [];
    let ralatAkhir = "";
    for (const f of fail.slice(0, ruang)) {
      if (f.size > 25 * 1024 * 1024) { ralatAkhir = `"${f.name}" terlalu besar (>25MB) — dilangkau.`; continue; }
      const kecil = await mampatImej(f);
      const r = await muatGambar(kecil);
      if (r.url) baharu.push(r.url);
      else ralatAkhir = r.ralat ? `Gagal muat naik: ${r.ralat}` : "Gagal muat naik gambar.";
    }
    setBusy(false);
    if (baharu.length) { setGambar((p) => [...p, ...baharu].slice(0, MAKS)); setMsg(ralatAkhir); }
    else setMsg(ralatAkhir || "Gagal muat naik gambar.");
  }

  function buang(i: number) { setGambar((p) => p.filter((_, idx) => idx !== i)); }
  function alih(i: number, arah: -1 | 1) {
    setGambar((p) => {
      const j = i + arah;
      if (j < 0 || j >= p.length) return p;
      const s = [...p];
      [s[i], s[j]] = [s[j], s[i]];
      return s;
    });
  }

  return (
    <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        Galeri Gambar Program (dokumentasi selepas acara · PNG/JPG · 4–{MAKS} keping · gambar besar auto-dikecilkan)
      </span>
      <input type="hidden" name="gambar_urls" value={JSON.stringify(gambar)} />

      {gambar.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {gambar.map((u, i) => (
            <div key={u} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Gambar ${i + 1}`} className="h-24 w-auto rounded-lg border border-slate-200 object-cover" />
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">{i + 1}</span>
              <button type="button" onClick={() => buang(i)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white" title="Buang gambar">×</button>
              <div className="absolute bottom-1 left-1 flex gap-1">
                {i > 0 && <button type="button" onClick={() => alih(i, -1)} className="rounded bg-white/90 px-1.5 text-xs font-bold text-slate-700 shadow" title="Ke kiri">‹</button>}
                {i < gambar.length - 1 && <button type="button" onClick={() => alih(i, 1)} className="rounded bg-white/90 px-1.5 text-xs font-bold text-slate-700 shadow" title="Ke kanan">›</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {gambar.length < MAKS && (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-surau">
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={pilih} />
          {busy ? "Memuat naik…" : gambar.length ? "+ Tambah gambar lagi" : "Muat naik gambar (boleh banyak)"}
        </label>
      )}
      {gambar.length >= MAKS && <p className="text-xs text-slate-400">Sudah cukup {MAKS} gambar. Buang satu untuk tambah yang lain.</p>}
      {msg && <p className="mt-1 text-xs text-red-600">{msg}</p>}
    </div>
  );
}
