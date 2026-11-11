"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hantarPermohonan } from "@/app/kerjaya/actions";

export default function BorangMohonJawatan({ jawatanId }: { jawatanId: string }) {
  const [f, setF] = useState({ nama: "", no_kp: "", umur: "", telefon: "", emel: "", pendidikan: "", pengalaman: "" });
  const [resume, setResume] = useState({ url: "", nama: "" });
  const [gambar, setGambar] = useState({ url: "" });
  const [muatR, setMuatR] = useState(false);
  const [muatG, setMuatG] = useState(false);
  const [hantar, setHantar] = useState(false);
  const [selesai, setSelesai] = useState(false);
  const [ralat, setRalat] = useState("");
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function naik(e: React.ChangeEvent<HTMLInputElement>, jenis: "resume" | "gambar") {
    const fail = e.target.files?.[0];
    if (!fail) return;
    setRalat("");
    jenis === "resume" ? setMuatR(true) : setMuatG(true);
    const supabase = createClient();
    const ext = fail.name.split(".").pop() || (jenis === "gambar" ? "jpg" : "pdf");
    const path = `kerjaya/${jenis}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("salinan-kp").upload(path, fail, { contentType: fail.type || undefined });
    jenis === "resume" ? setMuatR(false) : setMuatG(false);
    if (error) { setRalat("Gagal muat naik: " + error.message); return; }
    if (jenis === "resume") setResume({ url: `salinan-kp/${path}`, nama: fail.name });
    else setGambar({ url: `salinan-kp/${path}` });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setRalat("");
    if (!resume.url) { setRalat("Sila lampirkan resume."); return; }
    if (!gambar.url) { setRalat("Sila lampirkan gambar."); return; }
    setHantar(true);
    const res = await hantarPermohonan({
      jawatan_id: jawatanId, ...f,
      url_resume: resume.url, nama_resume: resume.nama, url_gambar: gambar.url,
    });
    setHantar(false);
    if (!res.ok) { setRalat(res.msg ?? "Ralat."); return; }
    setSelesai(true);
  }

  if (selesai) {
    return (
      <div className="rounded-xl border-2 border-green-500 bg-green-50 p-5 text-center">
        <div className="text-3xl">✓</div>
        <p className="mt-1 font-semibold text-slate-900">Permohonan anda telah dihantar!</p>
        <p className="mt-1 text-sm text-slate-600">Hanya calon yang lulus tapisan awal akan dihubungi untuk temu duga. Terima kasih.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border-2 border-surau/30 bg-surau/5 p-5">
      <h3 className="font-semibold text-surau">Borang Permohonan Jawatan</h3>
      <input required placeholder="Nama penuh *" className="inp" value={f.nama} onChange={(e) => set("nama", e.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input placeholder="No. Kad Pengenalan" className="inp" value={f.no_kp} onChange={(e) => set("no_kp", e.target.value)} />
        <input type="number" min="0" placeholder="Umur" className="inp" value={f.umur} onChange={(e) => set("umur", e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input required placeholder="No. telefon *" className="inp" value={f.telefon} onChange={(e) => set("telefon", e.target.value)} />
        <input type="email" placeholder="E-mel" className="inp" value={f.emel} onChange={(e) => set("emel", e.target.value)} />
      </div>
      <input placeholder="Pendidikan tertinggi (cth: Diploma)" className="inp" value={f.pendidikan} onChange={(e) => set("pendidikan", e.target.value)} />
      <textarea rows={3} placeholder="Pengalaman kerja / catatan ringkas" className="inp" value={f.pengalaman} onChange={(e) => set("pengalaman", e.target.value)} />

      <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-2.5 text-sm hover:border-surau">
        <input type="file" accept="application/pdf,.doc,.docx" className="hidden" onChange={(e) => naik(e, "resume")} />
        {resume.url ? <span className="font-medium text-green-600">✓ {resume.nama}</span> : muatR ? <span className="text-amber-600">Memuat naik…</span> : <span className="text-slate-600">Lampir Resume (PDF/Word) *</span>}
      </label>
      <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white p-2.5 text-sm hover:border-surau">
        <input type="file" accept="image/*" className="hidden" onChange={(e) => naik(e, "gambar")} />
        {gambar.url ? <span className="font-medium text-green-600">✓ Gambar dimuat naik</span> : muatG ? <span className="text-amber-600">Memuat naik…</span> : <span className="text-slate-600">Lampir Gambar diri *</span>}
      </label>

      {ralat && <p className="text-sm text-red-600">{ralat}</p>}
      <button type="submit" disabled={hantar || muatR || muatG} className="w-full rounded-lg bg-surau px-6 py-3 font-semibold text-white hover:bg-surau-dark disabled:opacity-60">
        {hantar ? "Menghantar…" : "Hantar Permohonan"}
      </button>
      <p className="text-center text-xs text-slate-500">Dengan menghantar, anda bersetuju surau menyimpan maklumat ini untuk urusan pengambilan.</p>
      <style jsx global>{`.inp{width:100%;border-radius:.5rem;border:1px solid #cbd5e1;padding:.5rem .75rem;font-size:.875rem;outline:none}.inp:focus{border-color:#b8860b;box-shadow:0 0 0 2px rgba(184,134,11,.2)}`}</style>
    </form>
  );
}
