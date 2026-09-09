"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { kaedahAhli, statusMaklumat, LABEL_KAEDAH, LABEL_STATUS, type Kaedah, type StatusMaklumat } from "@/lib/kaedah";

const PER_MUKA = 25;

type Ahli = {
  id: string;
  no_ahli: string | null;
  nama: string;
  no_kp: string | null;
  telefon: string | null;
  alamat?: string | null;
  alamat_kp?: string | null;
  status: "menunggu" | "lulus" | "tolak";
  peringkat: string | null;
  maklumat_disahkan: boolean;
  kaedah?: string | null;
  sumber: string;
  tarikh_daftar: string | null;
  tarikh_kemaskini: string | null;
};

type Kelulusan = "semua" | "menunggu" | "lulus" | "tolak";
type TapisKaedah = "semua" | Kaedah;
type TapisStatus = "semua" | StatusMaklumat;

const HARI_BARU = 7; // ambang "Baru" — aktiviti dalam 7 hari
function masaAktiviti(a: Ahli): number {
  return Math.max(new Date(a.tarikh_kemaskini || 0).getTime(), new Date(a.tarikh_daftar || 0).getTime());
}

// Label peringkat kelulusan — general, ikut tahap sebenar dalam sistem.
function infoPeringkat(status: string, peringkat: string | null): { label: string; cls: string } {
  if (status === "lulus") return { label: "Diluluskan", cls: "bg-green-600 text-white" };
  if (status === "tolak") return { label: "Ditolak", cls: "bg-red-100 text-red-700" };
  switch (peringkat) {
    case "disokong_nazir": return { label: "Disokong Pengerusi", cls: "bg-blue-100 text-blue-700" };
    case "disokong_su": return { label: "Disokong Setiausaha", cls: "bg-teal-100 text-teal-700" };
    case "ditolak_nazir": return { label: "Ditolak Pengerusi", cls: "bg-red-100 text-red-700" };
    case "ditolak_su": return { label: "Ditolak Setiausaha", cls: "bg-red-100 text-red-700" };
    default: return { label: "Baru", cls: "bg-slate-100 text-slate-500" };
  }
}

function topengKp(kp: string | null): string {
  const d = (kp || "").replace(/\s/g, "");
  if (!d) return "—";
  return d.length <= 4 ? "••••" : "•".repeat(d.length - 4) + d.slice(-4);
}
function topengTel(tel: string | null): string {
  const d = (tel || "").trim();
  if (!d) return "—";
  return d.length <= 3 ? "•••" : "•".repeat(d.length - 3) + d.slice(-3);
}
function waNombor(tel: string | null): string {
  let d = (tel || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("60")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d ? "60" + d.slice(0, 10) : "";
}
const PESANAN =
  "Assalamualaikum, ini peringatan dari Surau Ar Raudhah, Eco Majestic. " +
  "Sila kemas kini & sahkan maklumat kariah anda di https://arraudhahecomajestic.com — " +
  "log masuk guna emel & No. Kad Pengenalan anda. Terima kasih.";

export default function PengurusanAhli({ senarai, bolehPapar }: { senarai: Ahli[]; bolehPapar: boolean }) {
  const [q, setQ] = useState("");
  const [kelulusan, setKelulusan] = useState<Kelulusan>("semua");
  const [fKaedah, setFKaedah] = useState<TapisKaedah>("semua");
  const [fStatus, setFStatus] = useState<TapisStatus>("semua");
  const [terkiniOn, setTerkiniOn] = useState(false);
  const [papar, setPapar] = useState(false);
  const [disalin, setDisalin] = useState(false);
  const [muka, setMuka] = useState(1);

  const ambangBaru = Date.now() - HARI_BARU * 86400000;
  const kira = useMemo(() => ({
    jumlah: senarai.length,
    menunggu: senarai.filter((a) => a.status === "menunggu").length,
    lulus: senarai.filter((a) => a.status === "lulus").length,
    tolak: senarai.filter((a) => a.status === "tolak").length,
    gform: senarai.filter((a) => kaedahAhli(a.sumber, a.kaedah) === "gform").length,
    fizikal: senarai.filter((a) => kaedahAhli(a.sumber, a.kaedah) === "fizikal").length,
    sah: senarai.filter((a) => statusMaklumat(a) === "sah").length,
    perlu_semak: senarai.filter((a) => statusMaklumat(a) === "perlu_semak").length,
    tak_lengkap: senarai.filter((a) => statusMaklumat(a) === "tak_lengkap").length,
    terkini: senarai.filter((a) => masaAktiviti(a) >= ambangBaru).length,
  }), [senarai, ambangBaru]);

  const ditapis = useMemo(() => {
    const cari = q.trim().toLowerCase();
    return senarai.filter((a) => {
      if (kelulusan !== "semua" && a.status !== kelulusan) return false;
      if (fKaedah !== "semua" && kaedahAhli(a.sumber, a.kaedah) !== fKaedah) return false;
      if (fStatus !== "semua" && statusMaklumat(a) !== fStatus) return false;
      if (terkiniOn && masaAktiviti(a) < ambangBaru) return false;
      if (!cari) return true;
      return (
        (a.nama || "").toLowerCase().includes(cari) ||
        (a.no_ahli || "").toLowerCase().includes(cari) ||
        (a.no_kp || "").includes(cari) ||
        (a.telefon || "").includes(cari)
      );
    });
  }, [senarai, q, kelulusan, fKaedah, fStatus, terkiniOn, ambangBaru]);

  // Reset ke muka 1 bila carian/penapis bertukar
  useEffect(() => { setMuka(1); }, [q, kelulusan, fKaedah, fStatus, terkiniOn]);
  const jumMuka = Math.max(1, Math.ceil(ditapis.length / PER_MUKA));
  const mukaSemasa = Math.min(muka, jumMuka);
  const halaman = ditapis.slice((mukaSemasa - 1) * PER_MUKA, mukaSemasa * PER_MUKA);

  function salin() {
    const teks = ditapis.map((a) => `${a.nama}\t${a.telefon ?? "-"}\t${a.maklumat_disahkan ? "Disahkan" : "Belum"}`).join("\n");
    navigator.clipboard?.writeText(teks).then(() => { setDisalin(true); setTimeout(() => setDisalin(false), 2000); });
  }

  function muatTurunCsv() {
    const kelulusanLabel = (s: string) => (s === "lulus" ? "Diluluskan" : s === "tolak" ? "Ditolak" : "Menunggu");
    const sel = (v: any) => {
      const s = (v ?? "").toString().replace(/"/g, '""');
      return `"${s}"`;
    };
    const header = ["No. Ahli", "Nama", "No. KP", "Telefon", "Kelulusan", "Kaedah", "Status Maklumat"];
    const baris = ditapis.map((a) => [
      a.no_ahli, a.nama, a.no_kp, a.telefon,
      kelulusanLabel(a.status), LABEL_KAEDAH[kaedahAhli(a.sumber, a.kaedah)], LABEL_STATUS[statusMaklumat(a)],
    ]);
    const csv = [header, ...baris].map((r) => r.map(sel).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const tarikh = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `ahli-kariah-${tarikh}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const bolehLihat = bolehPapar && papar;

  return (
    <div className="space-y-5">
      {/* KAD RINGKASAN */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kad label="Jumlah Ahli" nilai={kira.jumlah} warna="text-slate-900" />
        <Kad label="Menunggu Kelulusan" nilai={kira.menunggu} warna="text-amber-600" />
        <Kad label="Diluluskan" nilai={kira.lulus} warna="text-green-600" />
        <Kad label="Perlu Semak" nilai={kira.perlu_semak + kira.tak_lengkap} warna="text-orange-600" />
      </div>

      {/* KAWALAN */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama, no. ahli, IC atau telefon…"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-surau"
        />
        {bolehPapar && (
          <button
            onClick={() => setPapar((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${papar ? "bg-amber-500 text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-100"}`}
            title="Papar / sorok No. KP & telefon (Admin sahaja)"
          >
            {papar ? "Sorok IC & Telefon" : "Papar IC & Telefon"}
          </button>
        )}
        <button onClick={salin} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
          {disalin ? "Disalin" : "Salin senarai"}
        </button>
        {bolehPapar && (
          <button onClick={muatTurunCsv} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-800">
            Muat Turun CSV
          </button>
        )}
      </div>

      {/* PENAPIS — 2 dimensi berasingan yang boleh gabung */}
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-32 shrink-0 text-[11px] font-bold uppercase tracking-wide text-surau">Status Kelulusan</span>
          <Chip label="Semua" bil={kira.jumlah} aktif={kelulusan === "semua"} onClick={() => setKelulusan("semua")} warna="bg-slate-700" />
          <Chip label="Menunggu" bil={kira.menunggu} aktif={kelulusan === "menunggu"} onClick={() => setKelulusan("menunggu")} warna="bg-slate-500" />
          <Chip label="Diluluskan" bil={kira.lulus} aktif={kelulusan === "lulus"} onClick={() => setKelulusan("lulus")} warna="bg-green-700" />
          <Chip label="Ditolak" bil={kira.tolak} aktif={kelulusan === "tolak"} onClick={() => setKelulusan("tolak")} warna="bg-red-600" />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
          <span className="w-32 shrink-0 text-[11px] font-bold uppercase tracking-wide text-surau">Kaedah</span>
          <Chip label="Semua" bil={kira.jumlah} aktif={fKaedah === "semua"} onClick={() => setFKaedah("semua")} warna="bg-slate-700" />
          <Chip label="Google Form" bil={kira.gform} aktif={fKaedah === "gform"} onClick={() => setFKaedah("gform")} warna="bg-blue-700" />
          <Chip label="Borang Fizikal" bil={kira.fizikal} aktif={fKaedah === "fizikal"} onClick={() => setFKaedah("fizikal")} warna="bg-indigo-600" />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
          <span className="w-32 shrink-0 text-[11px] font-bold uppercase tracking-wide text-surau">Status Maklumat</span>
          <Chip label="Semua" bil={kira.jumlah} aktif={fStatus === "semua"} onClick={() => setFStatus("semua")} warna="bg-slate-700" />
          <Chip label="Sah" bil={kira.sah} aktif={fStatus === "sah"} onClick={() => setFStatus("sah")} warna="bg-green-600" />
          <Chip label="Perlu semak" bil={kira.perlu_semak} aktif={fStatus === "perlu_semak"} onClick={() => setFStatus("perlu_semak")} warna="bg-orange-500" />
          <Chip label="Tak lengkap" bil={kira.tak_lengkap} aktif={fStatus === "tak_lengkap"} onClick={() => setFStatus("tak_lengkap")} warna="bg-red-600" />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
          <span className="w-32 shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400">Paparan Pantas</span>
          <Chip label="Aktiviti 7 hari" bil={kira.terkini} aktif={terkiniOn} onClick={() => setTerkiniOn((v) => !v)} warna="bg-blue-600" />
        </div>
      </div>

      <div className="text-xs text-slate-500">
        {ditapis.length === 0 ? "Tiada rekod." : `Menunjukkan ${(mukaSemasa - 1) * PER_MUKA + 1}–${Math.min(mukaSemasa * PER_MUKA, ditapis.length)} daripada ${ditapis.length} rekod.`}
      </div>

      {/* JADUAL */}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">No. Ahli</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3 text-center">Kelulusan</th>
              <th className="px-4 py-3">Kaedah</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {ditapis.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Tiada rekod padan.</td></tr>
            )}
            {halaman.map((a) => {
              const wa = waNombor(a.telefon);
              const pr = infoPeringkat(a.status, a.peringkat);
              return (
                <tr key={a.id} className={`border-b last:border-0 ${a.status === "lulus" ? "bg-green-50/60" : ""}`}>
                  <td className="px-4 py-2.5 font-mono text-xs">{a.no_ahli}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{a.nama}</span>
                      {masaAktiviti(a) >= ambangBaru && <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Baru</span>}
                    </div>
                    <div className="font-mono text-xs text-slate-400">{bolehLihat ? (a.no_kp || "—") : topengKp(a.no_kp)}</div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{bolehLihat ? (a.telefon || "—") : topengTel(a.telefon)}</td>
                  <td className="px-4 py-2.5 text-center"><span className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${pr.cls}`}>{pr.label}</span></td>
                  <td className="px-4 py-2.5"><KaedahSel a={a} /></td>
                  <td className="px-4 py-2.5"><StatusSel a={a} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/permohonan/${a.id}`} className="rounded-lg bg-surau px-3 py-1.5 text-xs font-semibold text-white hover:bg-surau-dark">Semak</Link>
                      {wa
                        ? <a href={`https://wa.me/${wa}?text=${encodeURIComponent(PESANAN)}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700">WhatsApp</a>
                        : <span className="text-xs text-slate-300">—</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {jumMuka > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button onClick={() => setMuka((m) => Math.max(1, m - 1))} disabled={mukaSemasa <= 1} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40">Sebelum</button>
          <span className="text-sm text-slate-500">Muka {mukaSemasa} / {jumMuka}</span>
          <button onClick={() => setMuka((m) => Math.min(jumMuka, m + 1))} disabled={mukaSemasa >= jumMuka} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40">Seterusnya</button>
        </div>
      )}
    </div>
  );
}

function Kad({ label, nilai, warna }: { label: string; nilai: number; warna: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className={`text-2xl font-bold ${warna}`}>{nilai}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
function Chip({ label, bil, aktif, onClick, warna }: { label: string; bil: number; aktif: boolean; onClick: () => void; warna: string }) {
  return (
    <button onClick={onClick} className={`rounded-full px-3 py-1.5 text-sm font-medium ${aktif ? `${warna} text-white` : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>
      {label} <span className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${aktif ? "bg-white/25 text-white" : "bg-white text-slate-500"}`}>{bil}</span>
    </button>
  );
}

function KaedahSel({ a }: { a: Ahli }) {
  const k = kaedahAhli(a.sumber, a.kaedah);
  const cls = k === "fizikal" ? "bg-indigo-100 text-indigo-700" : "bg-blue-100 text-blue-700";
  return <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${cls}`}>{LABEL_KAEDAH[k]}</span>;
}

function StatusSel({ a }: { a: Ahli }) {
  const s = statusMaklumat(a);
  const cls = s === "sah" ? "bg-green-100 text-green-700" : s === "perlu_semak" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{LABEL_STATUS[s]}</span>;
}
