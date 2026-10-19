"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { rm } from "@/lib/format";
import { kiraGaji, labelBulan, type GajiConfig, type Agregat } from "@/lib/gaji";
import { janaGaji, sahkanGaji, bukaSemulaGaji, simpanConfig } from "@/app/admin/staf/gaji/actions";

export default function GajiPanel({
  bulan, staf, senarai, config, agg, sedia, pinjaman,
}: {
  bulan: string;
  staf: string;
  senarai: { profil_id: string; nama: string | null }[];
  config: GajiConfig;
  agg: Agregat;
  sedia: any | null;
  pinjaman?: any | null;
}) {
  const router = useRouter();
  const disah = sedia?.status === "sah";

  const [jamOt, setJamOt] = useState<number>(sedia?.jam_ot ?? agg.jam_ot);
  const [cutiTanpaIzin, setCutiTanpaIzin] = useState<number>(sedia?.hari_cuti_tanpa_izin ?? 0);
  // Jika ada pinjaman perlu dipotong bulan ni & slip belum dijana, auto-isi.
  const pinjAuto = pinjaman?.due && !sedia ? pinjaman : null;
  const [potonganLain, setPotonganLain] = useState<number>(sedia?.potongan_lain ?? (pinjAuto ? Number(pinjAuto.amaun) : 0));
  const [potonganLainNota, setPotonganLainNota] = useState<string>(sedia?.potongan_lain_nota ?? (pinjAuto ? String(pinjAuto.nota) : ""));
  const [nota, setNota] = useState<string>(sedia?.nota ?? "");
  const [perkhidmatanAktif, setPerkhidmatanAktif] = useState<boolean>(config.elaun_perkhidmatan_aktif);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const cfg: GajiConfig = { ...config, elaun_perkhidmatan_aktif: perkhidmatanAktif };
  const kira = kiraGaji(cfg, agg, { jam_ot: jamOt, hari_cuti_tanpa_izin: cutiTanpaIzin, potongan_lain: potonganLain });

  function pilih(key: "bulan" | "staf", val: string) {
    const params = new URLSearchParams({ bulan, staf });
    params.set(key, val);
    router.push(`/admin/staf/gaji?${params.toString()}`);
  }

  async function togglePerkhidmatan(v: boolean) {
    setPerkhidmatanAktif(v);
    await simpanConfig({ ...config, elaun_perkhidmatan_aktif: v, profil_id: config.profil_id });
    router.refresh();
  }

  async function simpan() {
    setBusy(true); setMsg("");
    const res = await janaGaji({
      profilId: staf, bulan,
      jamOtOverride: jamOt, hariCutiTanpaIzin: cutiTanpaIzin,
      potonganLain, potonganLainNota, nota,
    });
    setBusy(false);
    if (!res.ok) { setMsg(res.msg ?? "Ralat."); return; }
    setMsg("✓ Slip disimpan.");
    router.refresh();
  }

  async function sahkan() {
    if (!sedia?.id) { setMsg("Simpan slip dahulu."); return; }
    setBusy(true); setMsg("");
    const res = await sahkanGaji(sedia.id);
    setBusy(false);
    if (!res.ok) { setMsg(res.msg ?? "Ralat."); return; }
    router.refresh();
  }

  async function bukaSemula() {
    if (!sedia?.id) return;
    setBusy(true);
    await bukaSemulaGaji(sedia.id);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Pemilih bulan + staf */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Bulan</span>
          <input type="month" value={bulan} onChange={(e) => pilih("bulan", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Staf</span>
          <select value={staf} onChange={(e) => pilih("staf", e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2">
            {senarai.map((s) => <option key={s.profil_id} value={s.profil_id}>{s.nama}</option>)}
          </select>
        </label>
        {disah && <span className="ml-auto rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">✓ Slip Disahkan</span>}
      </div>

      {/* Peringatan pinjaman staf */}
      {pinjaman?.due && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Peringatan Pinjaman Staf:</b> Bulan ini ada potongan ansuran pinjaman{" "}
          <b>{rm(Number(pinjaman.amaun))}</b> ({pinjaman.nota}). Baki selepas bulan ini:{" "}
          <b>{rm(Number(pinjaman.baki_selepas))}</b>.
          {sedia
            ? " (Slip sudah dijana — semak kotak 'Potongan lain'.)"
            : " Jumlah ini sudah diisi automatik dalam 'Potongan lain' di bawah — tekan Simpan untuk sahkan."}
        </div>
      )}

      {/* Ringkasan kehadiran (auto) */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Kehadiran {labelBulan(bulan)} <span className="text-xs font-normal text-slate-400">(auto dari punch-in)</span></h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Hari Hadir" nilai={String(agg.hari_hadir)} />
          <Stat label="Tepat Waktu" nilai={String(agg.hari_tepat)} warna="text-green-600" />
          <Stat label="Lewat >15min" nilai={String(agg.hari_lewat)} warna="text-red-600" />
          <Stat label="Jam OT (auto)" nilai={String(agg.jam_ot)} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pengecualian */}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">Pelarasan (jika perlu)</h2>
          <div className="space-y-3 text-sm">
            <Field l="Jam OT">
              <input type="number" step="0.5" min="0" value={jamOt} disabled={disah} onChange={(e) => setJamOt(Number(e.target.value) || 0)} className="inp" />
              <p className="mt-0.5 text-xs text-slate-400">Auto {agg.jam_ot} jam. Ubah jika perlu (× {rm(config.kadar_ot)}/jam).</p>
            </Field>
            <Field l="Hari cuti tanpa kebenaran">
              <input type="number" min="0" value={cutiTanpaIzin} disabled={disah} onChange={(e) => setCutiTanpaIzin(Number(e.target.value) || 0)} className="inp" />
              <p className="mt-0.5 text-xs text-slate-400">Potong {rm(config.potong_cuti_sehari)}/hari. Biar 0 jika cuti diluluskan.</p>
            </Field>
            <Field l="Potongan lain (RM)">
              <input type="number" step="0.01" min="0" value={potonganLain} disabled={disah} onChange={(e) => setPotonganLain(Number(e.target.value) || 0)} className="inp" />
            </Field>
            <Field l="Nota potongan lain">
              <input value={potonganLainNota} disabled={disah} onChange={(e) => setPotonganLainNota(e.target.value)} placeholder="cth: Pinjaman (Bil 2/2)" className="inp" />
            </Field>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={perkhidmatanAktif} disabled={disah} onChange={(e) => togglePerkhidmatan(e.target.checked)} className="h-4 w-4 accent-surau" />
              <span>Elaun Perkhidmatan {rm(config.elaun_perkhidmatan)} aktif <span className="text-xs text-slate-400">(selepas probation)</span></span>
            </label>
            <Field l="Nota slip (pilihan)">
              <textarea value={nota} disabled={disah} onChange={(e) => setNota(e.target.value)} rows={2} className="inp" />
            </Field>
          </div>
        </section>

        {/* Ringkasan gaji */}
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">Ringkasan Gaji</h2>
          <div className="space-y-1 text-sm">
            <Baris k="Gaji Pokok" v={rm(kira.gaji_pokok)} />
            <Baris k="Elaun Telefon" v={rm(kira.elaun_telefon)} />
            <Baris k="Elaun Perjalanan" v={rm(kira.elaun_perjalanan)} />
            {kira.elaun_perkhidmatan > 0 && <Baris k="Elaun Perkhidmatan" v={rm(kira.elaun_perkhidmatan)} />}
            <Baris k={`Elaun Kehadiran (${agg.hari_tepat} hari)`} v={rm(kira.elaun_kehadiran)} />
            {kira.amaun_ot > 0 && <Baris k={`OT (${jamOt} jam)`} v={rm(kira.amaun_ot)} />}
            <Baris k="Gaji Kasar (Gross)" v={rm(kira.gross)} tebal />
            <div className="pt-2" />
            {kira.potong_lewat > 0 && <Baris k={`Potong Lewat (${agg.hari_lewat})`} v={"− " + rm(kira.potong_lewat)} merah />}
            {kira.potong_cuti > 0 && <Baris k={`Potong Cuti (${cutiTanpaIzin})`} v={"− " + rm(kira.potong_cuti)} merah />}
            {kira.potongan_lain > 0 && <Baris k="Potongan Lain" v={"− " + rm(kira.potongan_lain)} merah />}
            <Baris k="Jumlah Potongan" v={rm(kira.jumlah_potongan)} />
            <div className="mt-2 flex justify-between border-t-2 border-slate-800 pt-2 text-base font-bold text-slate-900">
              <span>Gaji Bersih</span><span>{rm(kira.net)}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Tindakan */}
      <div className="flex flex-wrap items-center gap-3">
        {!disah && (
          <button onClick={simpan} disabled={busy} className="rounded-lg bg-surau px-6 py-2.5 font-semibold text-white hover:bg-surau-dark disabled:opacity-60">
            {busy ? "…" : sedia ? "Kemas kini Slip" : "Jana & Simpan Slip"}
          </button>
        )}
        {sedia && !disah && (
          <button onClick={sahkan} disabled={busy} className="rounded-lg bg-green-600 px-6 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-60">Sahkan Slip</button>
        )}
        {disah && (
          <button onClick={bukaSemula} disabled={busy} className="rounded-lg border border-slate-300 px-6 py-2.5 font-semibold text-slate-600 hover:bg-slate-50">Buka Semula (edit)</button>
        )}
        {sedia?.id && (
          <Link href={`/admin/staf/gaji/slip/${sedia.id}`} className="rounded-lg border border-surau/40 px-6 py-2.5 font-semibold text-surau hover:bg-surau/10">Lihat / Cetak Slip →</Link>
        )}
        {msg && <span className={`text-sm ${msg.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>{msg}</span>}
      </div>

      <style jsx global>{`.inp{width:100%;border-radius:.5rem;border:1px solid #cbd5e1;padding:.5rem .75rem;font-size:.875rem;outline:none}.inp:focus{border-color:#b8860b;box-shadow:0 0 0 2px rgba(184,134,11,.2)}.inp:disabled{background:#f1f5f9;color:#94a3b8}`}</style>
    </div>
  );
}

function Stat({ label, nilai, warna }: { label: string; nilai: string; warna?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center">
      <div className={`text-2xl font-bold ${warna ?? "text-slate-900"}`}>{nilai}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  );
}
function Field({ l, children }: { l: string; children: React.ReactNode }) {
  return (<label className="block"><span className="mb-1 block font-medium text-slate-700">{l}</span>{children}</label>);
}
function Baris({ k, v, tebal, merah }: { k: string; v: string; tebal?: boolean; merah?: boolean }) {
  return (
    <div className={`flex justify-between ${tebal ? "border-t pt-1 font-bold text-slate-900" : merah ? "text-red-600" : "text-slate-600"}`}>
      <span>{k}</span><span>{v}</span>
    </div>
  );
}
