"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { kemasCalon } from "@/app/admin/agm/actions";
import AhliPicker, { KOSONG, type AhliRingkas, type PilihanAhli } from "@/components/AhliPicker";

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

function awal(nama: string | null, noKp?: string | null, tel?: string | null): PilihanAhli {
  return { ...KOSONG, nama: nama ?? "", noKp: noKp ?? null, telefon: tel ?? null };
}

export default function EditCalonForm({ calon, ahli, onSiap }: { calon: CalonEdit; ahli: AhliRingkas[]; onSiap?: () => void }) {
  const router = useRouter();
  const [cCalon, setCCalon] = useState<PilihanAhli>(awal(calon.nama, calon.no_kp, calon.telefon));
  const [cPencadang, setCPencadang] = useState<PilihanAhli>(awal(calon.pencadang_nama, calon.pencadang_no_kp, calon.pencadang_telefon));
  const [cPenyokong, setCPenyokong] = useState<PilihanAhli>(awal(calon.penyokong_nama, calon.penyokong_no_kp, calon.penyokong_telefon));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function simpan() {
    if (!cCalon.nama.trim()) { setMsg("Nama calon wajib."); return; }
    setBusy(true); setMsg("");
    const r = await kemasCalon(calon.id, {
      nama: cCalon.nama, no_kp: cCalon.noKp ?? "", telefon: cCalon.telefon ?? "",
      pencadang_nama: cPencadang.nama, pencadang_no_kp: cPencadang.noKp ?? "", pencadang_telefon: cPencadang.telefon ?? "",
      penyokong_nama: cPenyokong.nama, penyokong_no_kp: cPenyokong.noKp ?? "", penyokong_telefon: cPenyokong.telefon ?? "",
    });
    setBusy(false);
    if (r?.ok) { setMsg("Disimpan ✓"); router.refresh(); onSiap?.(); } else setMsg(r?.msg ?? "Gagal.");
  }

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3">
      <div className="text-xs font-bold uppercase tracking-wide text-amber-700">Edit Maklumat Calon</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <AhliPicker label="Calon" ahli={ahli} nilai={cCalon} onChange={setCCalon} placeholder="Cari / taip nama calon…" />
        <AhliPicker label="Pencadang" ahli={ahli} nilai={cPencadang} onChange={setCPencadang} placeholder="Cari / taip nama pencadang…" />
        <AhliPicker label="Penyokong" ahli={ahli} nilai={cPenyokong} onChange={setCPenyokong} placeholder="Cari / taip nama penyokong…" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} onClick={simpan} className="rounded-lg bg-surau px-4 py-1.5 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-50">Simpan</button>
        {onSiap && <button onClick={onSiap} className="text-xs font-semibold text-slate-500 hover:underline">tutup</button>}
        {msg && <span className="text-xs font-semibold text-slate-600">{msg}</span>}
      </div>
      <p className="text-[11px] text-slate-400">Taip untuk cari nama dari senarai ahli berdaftar &amp; pilih (IC/telefon auto-isi). Kalau nama tiada dalam senarai (tak scan QR / belum kemas kini), taip terus je — ia tetap tersimpan.</p>
    </div>
  );
}
