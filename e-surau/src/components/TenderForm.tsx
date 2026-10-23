"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ciptaTender, kemasTender, kemasSkopTenderAI } from "@/app/admin/tender/actions";
import { KATEGORI_TENDER, STATUS_TENDER } from "@/lib/tender";

export default function TenderForm({ awal }: { awal?: any }) {
  const router = useRouter();
  const edit = !!awal?.id;
  const [f, setF] = useState<any>({
    no_ruj: awal?.no_ruj ?? "", tajuk: awal?.tajuk ?? "", keterangan: awal?.keterangan ?? "",
    kategori: awal?.kategori ?? KATEGORI_TENDER[0], tarikh_iklan: awal?.tarikh_iklan ?? "", tarikh_tutup: awal?.tarikh_tutup ?? "", tarikh_taklimat: awal?.tarikh_taklimat ?? "",
    status: awal?.status ?? "aktif", pic_nama: awal?.pic_nama ?? "", pic_telefon: awal?.pic_telefon ?? "",
    pic_emel: awal?.pic_emel ?? "", alamat_hantar: awal?.alamat_hantar ?? "", anggaran_nilai: awal?.anggaran_nilai ?? "",
  });
  const [urlDok, setUrlDok] = useState(awal?.url_dokumen ?? "");
  const [namaDok, setNamaDok] = useState(awal?.nama_dokumen ?? "");
  const [muat, setMuat] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k: string, v: string) => setF((s: any) => ({ ...s, [k]: v }));

  async function kemasAI() {
    setMsg(""); setAi(true);
    const res = await kemasSkopTenderAI({ tajuk: f.tajuk, kategori: f.kategori, nota: f.keterangan || "" });
    setAi(false);
    if (!res.ok) { setMsg(res.msg ?? "AI gagal."); return; }
    set("keterangan", res.teks || "");
  }

  async function naik(e: React.ChangeEvent<HTMLInputElement>) {
    const fail = e.target.files?.[0];
    if (!fail) return;
    setMsg(""); setMuat(true);
    const supabase = createClient();
    const ext = fail.name.split(".").pop() || "pdf";
    const path = `tender/dok/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("salinan-kp").upload(path, fail, { contentType: fail.type || undefined });
    setMuat(false);
    if (error) { setMsg("Gagal muat naik: " + error.message); return; }
    setUrlDok(`salinan-kp/${path}`); setNamaDok(fail.name);
  }

  async function simpan() {
    setBusy(true); setMsg("");
    const payload = { ...f, url_dokumen: urlDok, nama_dokumen: namaDok };
    const res = edit ? await kemasTender(awal.id, payload) : await ciptaTender(payload);
    setBusy(false);
    if (!res.ok) { setMsg(res.msg ?? "Ralat."); return; }
    if (edit) { router.refresh(); }
    else { setF({ ...f, no_ruj: "", tajuk: "", keterangan: "", anggaran_nilai: "" }); setUrlDok(""); setNamaDok(""); router.refresh(); }
    setMsg(edit ? "Disimpan." : "Tender ditambah.");
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-slate-600 sm:col-span-2">Tajuk tender *<input value={f.tajuk} onChange={(e) => set("tajuk", e.target.value)} className="inp" placeholder="cth: Sebut Harga Kerja Menaik Taraf Bilik Air" /></label>
        <label className="text-sm text-slate-600">No. Rujukan<input value={f.no_ruj} onChange={(e) => set("no_ruj", e.target.value)} className="inp" placeholder="SAR-T-01/2026" /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-slate-600">Kategori
          <select value={f.kategori} onChange={(e) => set("kategori", e.target.value)} className="inp">{KATEGORI_TENDER.map((k) => <option key={k} value={k}>{k}</option>)}</select>
        </label>
        <label className="text-sm text-slate-600">Tarikh iklan<input type="date" value={f.tarikh_iklan} onChange={(e) => set("tarikh_iklan", e.target.value)} className="inp" /></label>
        <label className="text-sm text-slate-600">Tarikh tutup<input type="date" value={f.tarikh_tutup} onChange={(e) => set("tarikh_tutup", e.target.value)} className="inp" /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-slate-600">Tarikh taklimat / lawatan tapak<input type="date" value={f.tarikh_taklimat} onChange={(e) => set("tarikh_taklimat", e.target.value)} className="inp" /></label>
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-sm text-slate-600">Huraian / skop kerja</span>
          <button type="button" onClick={kemasAI} disabled={ai || busy} className="rounded-lg border border-surau/40 bg-surau/5 px-3 py-1 text-xs font-semibold text-surau hover:bg-surau/10 disabled:opacity-60" title="Tukar nota kasar jadi skop kerja kemas">
            {ai ? "AI sedang mengemas…" : "Kemas dengan AI"}
          </button>
        </div>
        <textarea rows={5} value={f.keterangan} onChange={(e) => set("keterangan", e.target.value)} className="inp" placeholder="Taip poin kasar skop kerja, kemudian tekan 'Kemas dengan AI' untuk susun jadi huraian tender yang kemas." />
        <p className="mt-1 text-xs text-slate-400">Tip: taip ringkas (cth: naik taraf bilik air lelaki, tukar paip, cat semula), tekan "Kemas dengan AI", kemudian semak & simpan.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-slate-600">Anggaran nilai (RM)<input type="number" min="0" step="0.01" value={f.anggaran_nilai} onChange={(e) => set("anggaran_nilai", e.target.value)} className="inp" /></label>
        <label className="text-sm text-slate-600">PIC / Pegawai<input value={f.pic_nama} onChange={(e) => set("pic_nama", e.target.value)} className="inp" /></label>
        <label className="text-sm text-slate-600">Status
          <select value={f.status} onChange={(e) => set("status", e.target.value)} className="inp">{STATUS_TENDER.map((s) => <option key={s.kod} value={s.kod}>{s.label}</option>)}</select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-600">Telefon PIC<input value={f.pic_telefon} onChange={(e) => set("pic_telefon", e.target.value)} className="inp" /></label>
        <label className="text-sm text-slate-600">E-mel PIC<input type="email" value={f.pic_emel} onChange={(e) => set("pic_emel", e.target.value)} className="inp" /></label>
      </div>
      <label className="text-sm text-slate-600">Alamat hantar dokumen<textarea rows={2} value={f.alamat_hantar} onChange={(e) => set("alamat_hantar", e.target.value)} className="inp" /></label>

      <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-sm hover:border-surau">
        <input type="file" accept="application/pdf,image/*,.doc,.docx" className="hidden" onChange={naik} />
        {urlDok ? <span className="font-medium text-green-600">✓ {namaDok || "Dokumen dimuat naik"}</span> : muat ? <span className="text-amber-600">Memuat naik…</span> : <span className="text-slate-600">Muat naik dokumen tender (PDF)</span>}
      </label>

      {msg && <p className={`text-sm ${msg.includes("Ralat") || msg.includes("Gagal") ? "text-red-600" : "text-green-600"}`}>{msg}</p>}
      <div>
        <button onClick={simpan} disabled={busy || muat} className="rounded-lg bg-surau px-5 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60">
          {busy ? "Menyimpan…" : edit ? "Simpan Perubahan" : "Tambah Tender"}
        </button>
      </div>
      <style jsx global>{`.inp{width:100%;border-radius:.5rem;border:1px solid #cbd5e1;padding:.5rem .75rem;font-size:.875rem;outline:none;margin-top:.25rem}.inp:focus{border-color:#b8860b;box-shadow:0 0 0 2px rgba(184,134,11,.2)}`}</style>
    </div>
  );
}
