"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { kemasCalon, type KemasCalon } from "@/app/admin/agm/actions";

export type CalonEdit = {
  id: string;
  nama: string;
  no_kp: string | null;
  telefon: string | null;
  pencadang_nama: string | null;
  pencadang_no_kp?: string | null;
  pencadang_telefon?: string | null;
  penyokong_nama: string | null;
  penyokong_no_kp?: string | null;
  penyokong_telefon?: string | null;
};

export default function EditCalonForm({ calon, onSiap }: { calon: CalonEdit; onSiap?: () => void }) {
  const router = useRouter();
  const [f, setF] = useState<KemasCalon>({
    nama: calon.nama ?? "",
    no_kp: calon.no_kp ?? "",
    telefon: calon.telefon ?? "",
    pencadang_nama: calon.pencadang_nama ?? "",
    pencadang_no_kp: calon.pencadang_no_kp ?? "",
    pencadang_telefon: calon.pencadang_telefon ?? "",
    penyokong_nama: calon.penyokong_nama ?? "",
    penyokong_no_kp: calon.penyokong_no_kp ?? "",
    penyokong_telefon: calon.penyokong_telefon ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const up = (k: keyof KemasCalon, v: string) => setF((p) => ({ ...p, [k]: v }));
  const inp = "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm";
  const lbl = "mb-1 block text-[11px] font-semibold text-slate-500";

  async function simpan() {
    if (!(f.nama ?? "").trim()) { setMsg("Nama calon wajib."); return; }
    setBusy(true); setMsg("");
    const r = await kemasCalon(calon.id, f); setBusy(false);
    if (r?.ok) { setMsg("Disimpan ✓"); router.refresh(); onSiap?.(); } else setMsg(r?.msg ?? "Gagal.");
  }

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
      <div className="text-xs font-bold uppercase tracking-wide text-amber-700">Edit Maklumat Calon</div>

      <div>
        <div className="mb-1 text-xs font-bold text-slate-700">Calon</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div><label className={lbl}>Nama</label><input className={inp} value={f.nama ?? ""} onChange={(e) => up("nama", e.target.value)} /></div>
          <div><label className={lbl}>No. KP</label><input className={inp} value={f.no_kp ?? ""} onChange={(e) => up("no_kp", e.target.value)} /></div>
          <div><label className={lbl}>Telefon</label><input className={inp} value={f.telefon ?? ""} onChange={(e) => up("telefon", e.target.value)} /></div>
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-bold text-slate-700">Pencadang</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div><label className={lbl}>Nama</label><input className={inp} value={f.pencadang_nama ?? ""} onChange={(e) => up("pencadang_nama", e.target.value)} placeholder="Nama pencadang" /></div>
          <div><label className={lbl}>No. KP</label><input className={inp} value={f.pencadang_no_kp ?? ""} onChange={(e) => up("pencadang_no_kp", e.target.value)} /></div>
          <div><label className={lbl}>Telefon</label><input className={inp} value={f.pencadang_telefon ?? ""} onChange={(e) => up("pencadang_telefon", e.target.value)} /></div>
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs font-bold text-slate-700">Penyokong</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div><label className={lbl}>Nama</label><input className={inp} value={f.penyokong_nama ?? ""} onChange={(e) => up("penyokong_nama", e.target.value)} placeholder="Nama penyokong" /></div>
          <div><label className={lbl}>No. KP</label><input className={inp} value={f.penyokong_no_kp ?? ""} onChange={(e) => up("penyokong_no_kp", e.target.value)} /></div>
          <div><label className={lbl}>Telefon</label><input className={inp} value={f.penyokong_telefon ?? ""} onChange={(e) => up("penyokong_telefon", e.target.value)} /></div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} onClick={simpan} className="rounded-lg bg-surau px-4 py-1.5 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-50">Simpan</button>
        {onSiap && <button onClick={onSiap} className="text-xs font-semibold text-slate-500 hover:underline">tutup</button>}
        {msg && <span className="text-xs font-semibold text-slate-600">{msg}</span>}
      </div>
      <p className="text-[11px] text-slate-400">Guna ruang ni untuk isi/betulkan maklumat calon, pencadang &amp; penyokong yang tak lengkap (tak scan QR / belum kemas kini portal).</p>
    </div>
  );
}
