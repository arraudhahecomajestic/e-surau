"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ciptaJawatan, kemasJawatan } from "@/app/admin/kerjaya/actions";
import { STATUS_JAWATAN } from "@/lib/kerjaya";

export default function JawatanForm({ awal }: { awal?: any }) {
  const router = useRouter();
  const edit = !!awal?.id;
  const [f, setF] = useState<any>({
    jawatan: awal?.jawatan ?? "", no_ruj: awal?.no_ruj ?? "", gaji_julat: awal?.gaji_julat ?? "",
    waktu_bertugas: awal?.waktu_bertugas ?? "", tarikh_iklan: awal?.tarikh_iklan ?? "", tarikh_tutup: awal?.tarikh_tutup ?? "",
    tarikh_lapor: awal?.tarikh_lapor ?? "", keterangan: awal?.keterangan ?? "", status: awal?.status ?? "aktif",
    pic_nama: awal?.pic_nama ?? "", pic_telefon: awal?.pic_telefon ?? "", pic_emel: awal?.pic_emel ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k: string, v: string) => setF((s: any) => ({ ...s, [k]: v }));

  async function simpan() {
    setBusy(true); setMsg("");
    const res = edit ? await kemasJawatan(awal.id, f) : await ciptaJawatan(f);
    setBusy(false);
    if (!res.ok) { setMsg(res.msg ?? "Ralat."); return; }
    if (!edit) { setF({ ...f, jawatan: "", no_ruj: "", keterangan: "" }); }
    setMsg(edit ? "Disimpan." : "Jawatan ditambah.");
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-slate-600 sm:col-span-2">Nama jawatan *<input value={f.jawatan} onChange={(e) => set("jawatan", e.target.value)} className="inp" placeholder="cth: Penolong Pengurus Surau" /></label>
        <label className="text-sm text-slate-600">No. Rujukan<input value={f.no_ruj} onChange={(e) => set("no_ruj", e.target.value)} className="inp" placeholder="SAR-JK-01/2026" /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-600">Gaji &amp; Elaun<input value={f.gaji_julat} onChange={(e) => set("gaji_julat", e.target.value)} className="inp" placeholder="cth: RM1,700 – RM2,500" /></label>
        <label className="text-sm text-slate-600">Waktu bertugas<input value={f.waktu_bertugas} onChange={(e) => set("waktu_bertugas", e.target.value)} className="inp" placeholder="cth: 8 jam/shift (5:30 pagi – 10:00 malam)" /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-slate-600">Tarikh iklan<input type="date" value={f.tarikh_iklan} onChange={(e) => set("tarikh_iklan", e.target.value)} className="inp" /></label>
        <label className="text-sm text-slate-600">Tarikh tutup<input type="date" value={f.tarikh_tutup} onChange={(e) => set("tarikh_tutup", e.target.value)} className="inp" /></label>
        <label className="text-sm text-slate-600">Tarikh lapor diri<input type="date" value={f.tarikh_lapor} onChange={(e) => set("tarikh_lapor", e.target.value)} className="inp" /></label>
      </div>
      <label className="text-sm text-slate-600">Skop tugas, kelayakan &amp; elaun
        <textarea rows={10} value={f.keterangan} onChange={(e) => set("keterangan", e.target.value)} className="inp" placeholder="Taip skop tugas, kelayakan, elaun & cara mohon di sini. Setiap baris baru akan dipapar sebagai perenggan." />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-slate-600">PIC / Pegawai<input value={f.pic_nama} onChange={(e) => set("pic_nama", e.target.value)} className="inp" /></label>
        <label className="text-sm text-slate-600">Telefon PIC<input value={f.pic_telefon} onChange={(e) => set("pic_telefon", e.target.value)} className="inp" /></label>
        <label className="text-sm text-slate-600">Status
          <select value={f.status} onChange={(e) => set("status", e.target.value)} className="inp">{STATUS_JAWATAN.map((s) => <option key={s.kod} value={s.kod}>{s.label}</option>)}</select>
        </label>
      </div>
      <label className="text-sm text-slate-600">E-mel PIC<input type="email" value={f.pic_emel} onChange={(e) => set("pic_emel", e.target.value)} className="inp" /></label>

      {msg && <p className={`text-sm ${msg.includes("Ralat") ? "text-red-600" : "text-green-600"}`}>{msg}</p>}
      <div>
        <button onClick={simpan} disabled={busy} className="rounded-lg bg-surau px-5 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60">
          {busy ? "Menyimpan…" : edit ? "Simpan Perubahan" : "Tambah Jawatan"}
        </button>
      </div>
      <style jsx global>{`.inp{width:100%;border-radius:.5rem;border:1px solid #cbd5e1;padding:.5rem .75rem;font-size:.875rem;outline:none;margin-top:.25rem}.inp:focus{border-color:#b8860b;box-shadow:0 0 0 2px rgba(184,134,11,.2)}`}</style>
    </div>
  );
}
