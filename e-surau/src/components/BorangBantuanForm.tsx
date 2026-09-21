"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { JENIS_BANTUAN, KEUTAMAAN } from "@/lib/bantuan";
import { SENARAI_BANK } from "@/lib/tetapan";
import { hantarPermohonanBantuan } from "@/app/ahli/bantuan/actions";

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function BorangBantuanForm() {
  const [jenis, setJenis] = useState("");
  const [jenisLain, setJenisLain] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [keutamaan, setKeutamaan] = useState("biasa");
  const [sebab, setSebab] = useState("");
  const [namaBank, setNamaBank] = useState("");
  const [noAkaun, setNoAkaun] = useState("");
  const [dokumen, setDokumen] = useState<string[]>([]);
  const [muat, setMuat] = useState(false);
  const [hantar, setHantar] = useState(false);
  const [ralat, setRalat] = useState("");
  const [selesai, setSelesai] = useState<null | string>(null);

  async function naikFail(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !files.length || !configured) return;
    setMuat(true);
    setRalat("");
    const supabase = createClient();
    const paths: string[] = [];
    for (const f of Array.from(files)) {
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${crypto.randomUUID()}-bantuan.${ext}`;
      const { error } = await supabase.storage.from("salinan-kp").upload(path, f, {
        contentType: f.type || "application/octet-stream",
      });
      if (error) { setRalat("Gagal muat naik dokumen: " + error.message); setMuat(false); return; }
      paths.push(`salinan-kp/${path}`);
    }
    setDokumen((d) => [...d, ...paths]);
    setMuat(false);
    e.target.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setRalat("");
    if (!jenis) { setRalat("Sila pilih jenis bantuan."); return; }
    if (jenis === "lain" && !jenisLain.trim()) { setRalat("Sila nyatakan jenis bantuan."); return; }
    if (sebab.trim().length < 5) { setRalat("Sila terangkan sebab / keperluan anda."); return; }
    setHantar(true);
    const res = await hantarPermohonanBantuan({
      jenis, jenis_lain: jenisLain, jumlah_dimohon: jumlah, sebab,
      keutamaan, nama_bank: namaBank, no_akaun_bank: noAkaun, dokumen,
    });
    setHantar(false);
    if (!res.ok) { setRalat(res.msg ?? "Ralat menghantar."); return; }
    setSelesai(res.no_rujukan ?? "—");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (selesai) {
    return (
      <div className="rounded-xl border-2 border-green-300 bg-green-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">✓</div>
        <h2 className="text-lg font-bold text-green-800">Permohonan Dihantar</h2>
        <p className="mt-1 text-sm text-green-700">
          No. Rujukan: <b>{selesai}</b>. Biro Kebajikan akan menyemak permohonan anda.
          Anda boleh jejak status di bawah.
        </p>
        <button onClick={() => { setSelesai(null); setJenis(""); setJenisLain(""); setJumlah(""); setSebab(""); setNamaBank(""); setNoAkaun(""); setDokumen([]); }}
          className="mt-4 rounded-lg border border-green-400 px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-100">
          Hantar permohonan lain
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Jenis Bantuan *</label>
        <select className="inp" value={jenis} onChange={(e) => setJenis(e.target.value)}>
          <option value="">— Pilih —</option>
          {JENIS_BANTUAN.map((j) => <option key={j.kod} value={j.kod}>{j.emoji} {j.label}</option>)}
        </select>
      </div>

      {jenis === "lain" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nyatakan jenis bantuan *</label>
          <input className="inp" value={jenisLain} onChange={(e) => setJenisLain(e.target.value)} placeholder="cth: yuran sekolah anak" />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Jumlah Diperlukan (RM)</label>
          <input className="inp" inputMode="decimal" value={jumlah} onChange={(e) => setJumlah(e.target.value)} placeholder="cth: 300" />
          <p className="mt-1 text-xs text-slate-500">Anggaran sahaja — Biro akan tentukan jumlah bantuan.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Keutamaan</label>
          <select className="inp" value={keutamaan} onChange={(e) => setKeutamaan(e.target.value)}>
            {KEUTAMAAN.map((k) => <option key={k.kod} value={k.kod}>{k.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Sebab / Keperluan *</label>
        <textarea className="inp" rows={3} value={sebab} onChange={(e) => setSebab(e.target.value)}
          placeholder="Terangkan keadaan & keperluan anda secara ringkas." />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Bank (untuk bayaran)</label>
          <select className="inp" value={namaBank} onChange={(e) => setNamaBank(e.target.value)}>
            <option value="">— Pilih (jika mahu pindahan) —</option>
            {SENARAI_BANK.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">No. Akaun Bank</label>
          <input className="inp" inputMode="numeric" value={noAkaun} onChange={(e) => setNoAkaun(e.target.value)} placeholder="No. akaun anda" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Dokumen Sokongan (pilihan)</label>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-center hover:border-surau">
          <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={naikFail} />
          {muat ? <span className="text-sm text-amber-600">Memuat naik…</span>
            : <><span className="text-sm font-medium text-slate-700">Ketik untuk muat naik</span>
              <span className="text-xs text-slate-400">Gambar bil / surat / resit — boleh lebih satu</span></>}
        </label>
        {dokumen.length > 0 && (
          <p className="mt-1 text-xs text-green-600">✓ {dokumen.length} dokumen dimuat naik</p>
        )}
      </div>

      {ralat && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{ralat}</div>}

      <button type="submit" disabled={hantar || muat}
        className="w-full rounded-lg bg-surau px-6 py-3 font-semibold text-white hover:bg-surau-dark disabled:opacity-60">
        {hantar ? "Menghantar…" : "Hantar Permohonan"}
      </button>

      <p className="text-center text-xs text-slate-500">
        Maklumat anda dirahsiakan — hanya Biro Kebajikan surau boleh melihat butiran permohonan ini.
      </p>

      <style jsx global>{`.inp{width:100%;border-radius:.5rem;border:1px solid #cbd5e1;padding:.5rem .75rem;font-size:.875rem;outline:none}.inp:focus{border-color:#0f766e;box-shadow:0 0 0 2px rgba(15,118,110,.2)}`}</style>
    </form>
  );
}
