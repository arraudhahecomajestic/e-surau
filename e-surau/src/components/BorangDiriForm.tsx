"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { simpanBorangDiri, type BorangDiri } from "@/app/admin/agm/actions";

export type CalonBorang = {
  id: string;
  nama: string;
  no_kp: string | null;
  alamat: string | null;
  telefon: string | null;
  umur: string | null;
  status_kahwin: string | null;
  pekerjaan: string | null;
  kelayakan_akademik: string | null;
  ahli_berdaftar: boolean | null;
  tinggal_dalam_kariah: boolean | null;
  pengalaman_tadbir: string | null;
  pengalaman_tempoh: string | null;
  ada_penyakit: boolean | null;
  penyakit_nyatakan: string | null;
  tarikh_borang: string | null;
  borang_diisi?: boolean | null;
};

function YaTidak({ label, val, set }: { label: string; val: boolean | null; set: (v: boolean | null) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="flex gap-1">
        {([["Ya", true], ["Tidak", false]] as const).map(([t, v]) => (
          <button key={t} type="button" onClick={() => set(val === v ? null : v)}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ${val === v ? "bg-surau text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{t}</button>
        ))}
      </span>
    </div>
  );
}

export default function BorangDiriForm({ calon }: { calon: CalonBorang }) {
  const router = useRouter();
  const [f, setF] = useState<BorangDiri>({
    nama: calon.nama ?? "",
    no_kp: calon.no_kp ?? "",
    alamat: calon.alamat ?? "",
    telefon: calon.telefon ?? "",
    umur: calon.umur ?? "",
    status_kahwin: calon.status_kahwin ?? "",
    pekerjaan: calon.pekerjaan ?? "",
    kelayakan_akademik: calon.kelayakan_akademik ?? "",
    ahli_berdaftar: calon.ahli_berdaftar ?? null,
    tinggal_dalam_kariah: calon.tinggal_dalam_kariah ?? null,
    pengalaman_tadbir: calon.pengalaman_tadbir ?? "",
    pengalaman_tempoh: calon.pengalaman_tempoh ?? "",
    ada_penyakit: calon.ada_penyakit ?? null,
    penyakit_nyatakan: calon.penyakit_nyatakan ?? "",
    tarikh_borang: calon.tarikh_borang ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const up = (k: keyof BorangDiri, v: any) => setF((p) => ({ ...p, [k]: v }));

  async function simpan() {
    setBusy(true); setMsg("");
    const r = await simpanBorangDiri(calon.id, f); setBusy(false);
    if (r?.ok) { setMsg("Borang disimpan ✓"); router.refresh(); } else setMsg(r?.msg ?? "Gagal simpan.");
  }

  const inp = "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm";
  const lbl = "mb-1 block text-xs font-semibold text-slate-500";

  return (
    <details className="mt-2 rounded-lg border border-slate-200 bg-slate-50/60">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
        <span>Borang Maklumat Diri (BOR-BPM-01){calon.borang_diisi ? <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">telah diisi</span> : <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">belum diisi</span>}</span>
        <span className="text-xs text-surau">buka ▾</span>
      </summary>
      <div className="space-y-3 border-t border-slate-200 p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={lbl}>1. Nama</label><input className={inp} value={f.nama ?? ""} onChange={(e) => up("nama", e.target.value)} /></div>
          <div><label className={lbl}>2. No Kad Pengenalan</label><input className={inp} value={f.no_kp ?? ""} onChange={(e) => up("no_kp", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className={lbl}>3. Alamat Rumah</label><textarea className={inp} rows={2} value={f.alamat ?? ""} onChange={(e) => up("alamat", e.target.value)} /></div>
          <div><label className={lbl}>4. No Telefon</label><input className={inp} value={f.telefon ?? ""} onChange={(e) => up("telefon", e.target.value)} /></div>
          <div><label className={lbl}>5. Umur</label><input className={inp} value={f.umur ?? ""} onChange={(e) => up("umur", e.target.value)} /></div>
          <div>
            <label className={lbl}>6. Status</label>
            <div className="flex gap-1">
              {([["Berkahwin", "berkahwin"], ["Bujang", "bujang"]] as const).map(([t, v]) => (
                <button key={v} type="button" onClick={() => up("status_kahwin", f.status_kahwin === v ? "" : v)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${f.status_kahwin === v ? "bg-surau text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{t}</button>
              ))}
            </div>
          </div>
          <div><label className={lbl}>7. Pekerjaan</label><input className={inp} value={f.pekerjaan ?? ""} onChange={(e) => up("pekerjaan", e.target.value)} /></div>
          <div className="sm:col-span-2"><label className={lbl}>8. Kelayakan Akademik</label><input className={inp} value={f.kelayakan_akademik ?? ""} onChange={(e) => up("kelayakan_akademik", e.target.value)} /></div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-surau-dark">10. Pengesahan Ahli Kariah</div>
          <div className="space-y-2">
            <YaTidak label="a) Ahli Berdaftar" val={f.ahli_berdaftar ?? null} set={(v) => up("ahli_berdaftar", v)} />
            <YaTidak label="b) Tinggal Dalam Kariah" val={f.tinggal_dalam_kariah ?? null} set={(v) => up("tinggal_dalam_kariah", v)} />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-surau-dark">11. Pengalaman Mentadbir Masjid & Surau</div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex gap-1">
              {([["Ada", "ada"], ["Tiada", "tiada"]] as const).map(([t, v]) => (
                <button key={v} type="button" onClick={() => up("pengalaman_tadbir", f.pengalaman_tadbir === v ? "" : v)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${f.pengalaman_tadbir === v ? "bg-surau text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{t}</button>
              ))}
            </span>
            <span className="flex gap-1">
              {([["Kurang 3 Tahun", "kurang_3"], ["Lebih 3 Tahun", "lebih_3"]] as const).map(([t, v]) => (
                <button key={v} type="button" onClick={() => up("pengalaman_tempoh", f.pengalaman_tempoh === v ? "" : v)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold ${f.pengalaman_tempoh === v ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{t}</button>
              ))}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-surau-dark">12. Status Kesihatan</div>
          <YaTidak label="Mempunyai penyakit?" val={f.ada_penyakit ?? null} set={(v) => up("ada_penyakit", v)} />
          {f.ada_penyakit === true && (
            <div className="mt-2"><label className={lbl}>Jika Ya, nyatakan</label><input className={inp} value={f.penyakit_nyatakan ?? ""} onChange={(e) => up("penyakit_nyatakan", e.target.value)} /></div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={lbl}>Tarikh borang</label><input type="date" className={inp} value={f.tarikh_borang ?? ""} onChange={(e) => up("tarikh_borang", e.target.value)} /></div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button disabled={busy} onClick={simpan} className="rounded-lg bg-surau px-4 py-1.5 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-50">Simpan Borang</button>
          <Link href={`/admin/agm/pemilihan/borang/${calon.id}`} target="_blank" className="rounded-lg border border-surau bg-surau/10 px-4 py-1.5 text-sm font-semibold text-surau hover:bg-surau/20">Cetak Borang (BOR-BPM-01)</Link>
          {msg && <span className="text-xs font-semibold text-slate-600">{msg}</span>}
        </div>
        <p className="text-[11px] text-slate-400">Simpan dahulu sebelum cetak. Cetakan keluar ikut format rasmi BOR-BPM-01 — “Calon Bagi Jawatan” diambil dari jawatan yang dipertandingkan.</p>
      </div>
    </details>
  );
}
