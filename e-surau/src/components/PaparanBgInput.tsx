"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

async function mampatImej(f: File): Promise<File> {
  try {
    if (!f.type.startsWith("image/")) return f;
    const bitmap = await createImageBitmap(f).catch(() => null);
    if (!bitmap) return f;
    const maksLebar = 1920;
    const skala = Math.min(1, maksLebar / bitmap.width);
    const w = Math.max(1, Math.round(bitmap.width * skala));
    const h = Math.max(1, Math.round(bitmap.height * skala));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return f;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (!blob || blob.size >= f.size) return f;
    return new File([blob], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch { return f; }
}

// Uploader LATAR skrin azan/iqamah/solat (satu gambar sahaja).
// URL disimpan dalam hidden input "paparan_iqamah_bg".
export default function PaparanBgInput({ awal }: { awal: string }) {
  const [url, setUrl] = useState<string>(awal || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const hiddenRef = useRef<HTMLInputElement | null>(null);

  // Kemas kini hidden input + beritahu borang (untuk pratonton live)
  function setNilai(v: string) {
    setUrl(v);
    if (hiddenRef.current) {
      hiddenRef.current.value = v;
      hiddenRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  async function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    const f = (e.target.files || [])[0];
    e.target.value = "";
    if (!f) return;
    setMsg("");
    if (f.size > 25 * 1024 * 1024) { setMsg("Gambar terlalu besar (>25MB)."); return; }
    setBusy(true);
    try {
      const kecil = await mampatImej(f);
      const supabase = createClient();
      const ext = (kecil.name.split(".").pop() || "jpg").toLowerCase();
      const path = `paparan-bg-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("kandungan").upload(path, kecil, { contentType: kecil.type || undefined, upsert: true });
      if (error) { setMsg("Gagal muat naik: " + error.message); setBusy(false); return; }
      const pub = supabase.storage.from("kandungan").getPublicUrl(path).data.publicUrl;
      setNilai(pub);
      setMsg("✓ Latar dimuat naik — tekan “Simpan” untuk kekalkan.");
    } catch (er: any) {
      setMsg("Ralat: " + (er?.message || "tidak diketahui"));
    }
    setBusy(false);
  }

  return (
    <div>
      <input ref={hiddenRef} type="hidden" name="paparan_iqamah_bg" defaultValue={url} />
      {url ? (
        <div className="mb-2 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="Latar iqamah" className="h-24 w-auto rounded-lg border border-slate-200 object-cover" />
          <button type="button" onClick={() => { setNilai(""); setMsg(""); }} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">
            ✕ Buang latar
          </button>
        </div>
      ) : (
        <div className="mb-2 rounded-lg border border-dashed border-slate-200 px-3 py-3 text-xs text-slate-400">
          Tiada latar. Skrin azan/iqamah/solat guna latar tema warna sahaja.
        </div>
      )}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-surau">
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pilih} />
        {busy ? "Memuat naik…" : url ? "Tukar latar" : "⬆ Muat naik latar iqamah"}
      </label>
      {msg && <p className={`mt-1 text-xs ${msg.startsWith("✓") ? "text-emerald-600" : "text-red-600"}`}>{msg}</p>}
    </div>
  );
}
