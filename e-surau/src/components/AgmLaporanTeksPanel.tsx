"use client";

import { useState } from "react";
import { bantuTulisLaporan, simpanTeks } from "@/app/admin/agm/actions";

type Bahagian = { kunci: string; tajuk: string; desc: string; contoh: string };

// Semua seksyen teks Buku Laporan. Kosong = buku guna teks lalai.
const BAHAGIAN: Bahagian[] = [
  { kunci: "kata_aluan_pengerusi", tajuk: "B1 · Kata-Kata Aluan Pengerusi", desc: "Ucapan pembuka daripada Pengerusi surau.", contoh: "cth: kesyukuran, terima kasih ahli kariah & AJK, pencapaian, cabaran, harapan tahun hadapan…" },
  { kunci: "atur_cara", tajuk: "B2 · Atur Cara Mesyuarat", desc: "Ganti jadual atur cara lalai. Biar kosong untuk guna jadual lalai.", contoh: "cth: 7.00 Ketibaan · 7.20 Maghrib · 7.45 Jamuan · 8.50 Ucapan Pengerusi · 9.00 Mesyuarat…" },
  { kunci: "agenda", tajuk: "B3 · Agenda Mesyuarat", desc: "Ganti jadual agenda lalai. Kosong = guna agenda lalai 1.0–13.0.", contoh: "cth: 1.0 Ucapan Pengerusi · 2.0 Pengesahan minit · 4.0 Laporan SU · 6.0 Penyata Kewangan…" },
  { kunci: "surat_notis", tajuk: "B5 · Surat Notis Mesyuarat", desc: "Ganti badan surat notis lalai.", contoh: "cth: tarikh/masa/tempat, tujuan, hak mengundi, tarikh tutup pencalonan & usul, kuorum…" },
  { kunci: "laporan_setiausaha", tajuk: "B6.1 · Laporan Setiausaha (Pendahuluan & Pentadbiran)", desc: "Naratif pentadbiran, mesyuarat & aktiviti.", contoh: "cth: bilangan mesyuarat AJK, program sepanjang tahun, dasar tadbir urus baharu…" },
  { kunci: "su_cabaran", tajuk: "B6.7 · Laporan SU — Cabaran", desc: "Ganti jadual cabaran lalai.", contoh: "cth: pendapatan bermusim, tunggakan khairat, kebergantungan kepada segelintir AJK…" },
  { kunci: "su_penghargaan", tajuk: "B6.8 · Laporan SU — Penutup & Penghargaan", desc: "Perenggan penutup & penghargaan.", contoh: "cth: penghargaan kepada Nazir, Pengerusi, AJK, biro, staf, penaja, ahli kariah…" },
  { kunci: "modul_esurau", tajuk: "B6.5 · Ringkasan Sistem e-Surau", desc: "Ganti jadual modul lalai (pilihan).", contoh: "cth: keahlian, khairat, kewangan, program, sewaan, staf, gaji, AGM, penajaan, bayaran…" },
  { kunci: "ulasan_kewangan", tajuk: "B8 · Ulasan Bendahari (Kewangan)", desc: "Ulasan naratif kedudukan kewangan (angka auto).", contoh: "cth: sumber pendapatan utama, perbelanjaan besar, kedudukan tabung am & khairat…" },
  { kunci: "nota_kewangan", tajuk: "B8.4 · Nota kepada Penyata Kewangan", desc: "Nota kaki penyata kewangan (pilihan).", contoh: "cth: asas tunai, pengasingan tabung khairat, aset tetap, sumbangan barangan…" },
  { kunci: "perakuan_bendahari", tajuk: "B8.5 · Perakuan Bendahari", desc: "Perakuan rasmi Bendahari.", contoh: "cth: pengesahan penyata benar & lengkap, nama & tarikh…" },
  { kunci: "laporan_juruaudit", tajuk: "B8.6 · Laporan Juruaudit Dalaman", desc: "Laporan juruaudit (skop, penemuan, pengesahan).", contoh: "cth: skop semakan, tarikh audit, penemuan, syor, pengesahan…" },
  { kunci: "usul_standard", tajuk: "B9 · Usul Standard AGM", desc: "Ganti senarai 9 usul standard lalai.", contoh: "cth: 1. Pengesahan minit · 2. Terima Laporan SU · 5. Luluskan belanjawan · 9. Lantik juruaudit…" },
];
// Nota: Senarai JK (B4) di Senarai JK & Biro; Laporan Biro (B7) di Senarai JK & Biro;
// Usul ahli (B9) di Usul & Undian; angka keahlian & kewangan (B6.3/B8.1) dijana automatik.

type Nilai = Record<string, string>;

export default function AgmLaporanTeksPanel({ agmId, nilaiAwal }: { agmId: string; nilaiAwal: Nilai }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-surau/30 bg-surau/5 p-4 text-sm text-slate-700">
        <b className="text-surau">Bantu tulis (AI)</b> — taip nota kasar atau isi angka rujukan dalam kotak
        “Nota / arahan”, kemudian tekan butang AI. AI akan draf atau perkemas teks dalam Bahasa Melayu
        formal. Kau boleh edit sepuas hati sebelum <b>Simpan</b>. AI tidak akan reka angka yang kau tak
        beri — jadi tampal angka sebenar (dari Laporan Angka Auto) untuk hasil terbaik.
      </div>
      {BAHAGIAN.map((b) => (
        <SeksyenTeks key={b.kunci} agmId={agmId} b={b} awal={nilaiAwal[b.kunci] ?? ""} />
      ))}
    </div>
  );
}

function SeksyenTeks({ agmId, b, awal }: { agmId: string; b: Bahagian; awal: string }) {
  const [teks, setTeks] = useState(awal);
  const [arahan, setArahan] = useState("");
  const [sebelum, setSebelum] = useState<string | null>(null); // untuk Undo selepas AI
  const [busyAI, setBusyAI] = useState(false);
  const [busySimpan, setBusySimpan] = useState(false);
  const [msg, setMsg] = useState("");
  const [ralat, setRalat] = useState("");

  const adaKandungan = teks.trim().length > 0;

  async function bantuAI() {
    setBusyAI(true); setRalat(""); setMsg("");
    const r = await bantuTulisLaporan(b.kunci, arahan, teks);
    setBusyAI(false);
    if (r.ok && r.teks) {
      setSebelum(teks);        // simpan versi lama utk undo
      setTeks(r.teks);
      setMsg("AI dah tulis — semak & edit, kemudian Simpan.");
      setTimeout(() => setMsg(""), 4000);
    } else {
      setRalat(r.msg ?? "AI gagal. Cuba lagi.");
    }
  }

  function undo() {
    if (sebelum === null) return;
    setTeks(sebelum);
    setSebelum(null);
    setMsg("Dikembalikan.");
    setTimeout(() => setMsg(""), 2500);
  }

  async function simpan() {
    setBusySimpan(true); setRalat("");
    const r = await simpanTeks(agmId, b.kunci, teks);
    setBusySimpan(false);
    if (r.ok) { setMsg("✓ Disimpan."); setSebelum(null); setTimeout(() => setMsg(""), 3000); }
    else setRalat(r.msg ?? "Gagal simpan.");
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900">{b.tajuk}</h2>
        {awal.trim() && <span className="text-[11px] font-medium text-emerald-600">● telah diisi</span>}
      </div>
      <p className="mb-3 text-xs text-slate-500">{b.desc}</p>

      <label className="mb-2 block">
        <span className="text-xs font-medium text-slate-600">Nota / arahan untuk AI (pilihan)</span>
        <textarea
          value={arahan}
          onChange={(e) => setArahan(e.target.value)}
          rows={2}
          placeholder={b.contoh}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
        />
      </label>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          onClick={bantuAI}
          disabled={busyAI}
          className="rounded-lg bg-surau px-3 py-1.5 text-xs font-bold text-white hover:bg-surau-dark disabled:opacity-50"
        >
          {busyAI ? "AI menulis…" : adaKandungan ? "Perkemas dengan AI" : "Bantu tulis (AI)"}
        </button>
        {sebelum !== null && (
          <button onClick={undo} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            Undo AI
          </button>
        )}
      </div>

      <label className="block">
        <span className="text-xs font-medium text-slate-600">Teks laporan</span>
        <textarea
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          rows={8}
          placeholder="Tulis di sini, atau tekan “Bantu tulis (AI)” di atas…"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed"
        />
      </label>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={simpan}
          disabled={busySimpan}
          className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50"
        >
          {busySimpan ? "Menyimpan…" : "Simpan"}
        </button>
        {msg && <span className="text-xs font-semibold text-emerald-600">{msg}</span>}
        {ralat && <span className="text-xs font-semibold text-red-600">{ralat}</span>}
      </div>
    </section>
  );
}
