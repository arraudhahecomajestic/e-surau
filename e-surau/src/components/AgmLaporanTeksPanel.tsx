"use client";

import { useState } from "react";
import { bantuTulisLaporan, simpanTeks } from "@/app/admin/agm/actions";

type Bahagian = { kunci: string; tajuk: string; desc: string; contoh: string };

// Susunan bahagian naratif Buku Laporan Tahunan
const BAHAGIAN: Bahagian[] = [
  { kunci: "kata_aluan_pengerusi", tajuk: "Kata Alu-aluan Pengerusi", desc: "Ucapan pembuka daripada Pengerusi surau.", contoh: "cth: fokus pada kesyukuran, terima kasih ahli kariah & AJK, harapan tahun 2027…" },
  { kunci: "prakata_setiausaha", tajuk: "Prakata Setiausaha", desc: "Pengenalan ringkas kepada laporan tahunan ini.", contoh: "cth: skop laporan — pentadbiran, kewangan, aktiviti, keahlian…" },
  { kunci: "ringkasan_eksekutif", tajuk: "Ringkasan Pentadbiran & Pencapaian", desc: "Naratif perjalanan pentadbiran & pencapaian utama tahun ini.", contoh: "cth: bilangan mesyuarat AJK, sistem e-Surau dilancarkan, khairat kematian ditubuhkan…" },
  { kunci: "ulasan_kewangan", tajuk: "Ulasan Bendahari (Kewangan)", desc: "Ulasan naratif kedudukan kewangan — pasangkan dengan angka dari Laporan Tahunan (Angka Auto).", contoh: "cth: tampal angka kutipan/perbelanjaan dari halaman Angka Auto sebagai rujukan…" },
  { kunci: "laporan_aktiviti", tajuk: "Ringkasan Laporan Aktiviti", desc: "Ringkasan program & aktiviti sepanjang tahun.", contoh: "cth: senaraikan program — Ihya Ramadhan, kuliah mingguan, gotong-royong…" },
  { kunci: "cabaran_cadangan", tajuk: "Cabaran & Cadangan Penambahbaikan", desc: "Cabaran yang dihadapi & cadangan untuk tahun hadapan.", contoh: "cth: cabaran kutipan yuran, cadangan naik taraf sistem siaraya…" },
  { kunci: "penghargaan", tajuk: "Penghargaan", desc: "Ucapan penghargaan kepada semua pihak.", contoh: "cth: ahli kariah, AJK, biro, staf, penaja, pihak berkuasa…" },
  { kunci: "penutup", tajuk: "Penutup", desc: "Perenggan penutup & doa.", contoh: "cth: rumusan ringkas, mohon keampunan atas kekurangan…" },
];

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
