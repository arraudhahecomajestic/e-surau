"use client";

import { useState } from "react";
import { muatnaikLaporanBiro, muatnaikGambarBiro, padamGambarBiro, GAMBAR_BIRO_MAKS } from "@/app/laporan-biro/[kod]/actions";

type Gambar = { id: string; url: string };
const MIN_GAMBAR = 4;

function bilaTeks(iso: string | null) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" }); }
  catch { return ""; }
}

// Kecilkan gambar di pelayar (jimat data & laju) — maks 1400px, JPEG.
async function kecilkanGambar(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maks = 1400;
    let { width, height } = bitmap;
    if (width > maks || height > maks) {
      const skala = maks / Math.max(width, height);
      width = Math.round(width * skala); height = Math.round(height * skala);
    }
    const kanvas = document.createElement("canvas");
    kanvas.width = width; kanvas.height = height;
    const ctx = kanvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob: Blob | null = await new Promise((res) => kanvas.toBlob(res, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch { return file; }
}

export default function MuatnaikLaporanBiro({
  kod, nama, ketua, tahun, failNama, failMasa, gambarAwal = [],
}: {
  kod: string; nama: string; ketua: string | null; tahun: number;
  failNama: string | null; failMasa: string | null; gambarAwal?: Gambar[];
}) {
  const [fail, setFail] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [siap, setSiap] = useState(false);
  const [ralat, setRalat] = useState("");
  const [semasaNama, setSemasaNama] = useState(failNama);
  const [semasaMasa, setSemasaMasa] = useState(failMasa);

  // Gambar
  const [gambar, setGambar] = useState<Gambar[]>(gambarAwal);
  const [naikGambar, setNaikGambar] = useState(false);
  const [progres, setProgres] = useState("");
  const [ralatGambar, setRalatGambar] = useState("");

  async function hantar() {
    if (!fail) { setRalat("Sila pilih fail laporan dahulu."); return; }
    setBusy(true); setRalat("");
    const fd = new FormData();
    fd.append("fail", fail);
    const r = await muatnaikLaporanBiro(kod, fd);
    setBusy(false);
    if (!r.ok) { setRalat(r.msg ?? "Gagal muat naik. Cuba lagi."); return; }
    setSiap(true);
    setSemasaNama(fail.name);
    setSemasaMasa(new Date().toISOString());
  }

  async function pilihGambar(e: React.ChangeEvent<HTMLInputElement>) {
    const senarai = Array.from(e.target.files ?? []);
    e.target.value = ""; // benarkan pilih fail sama semula
    if (!senarai.length) return;
    setRalatGambar("");
    const ruang = GAMBAR_BIRO_MAKS - gambar.length;
    if (ruang <= 0) { setRalatGambar(`Maksimum ${GAMBAR_BIRO_MAKS} gambar sahaja.`); return; }
    const ambil = senarai.slice(0, ruang);
    if (senarai.length > ruang) setRalatGambar(`Hanya ${ruang} gambar boleh ditambah lagi (maks ${GAMBAR_BIRO_MAKS}).`);

    setNaikGambar(true);
    let berjaya = 0;
    for (let i = 0; i < ambil.length; i++) {
      setProgres(`Memuat naik gambar ${i + 1}/${ambil.length}…`);
      const kecil = await kecilkanGambar(ambil[i]);
      const fd = new FormData();
      fd.append("fail", kecil);
      const r = await muatnaikGambarBiro(kod, fd);
      if (r.ok && r.url && r.id) { setGambar((p) => [...p, { id: r.id!, url: r.url! }]); berjaya++; }
      else { setRalatGambar(r.msg ?? "Gagal muat naik sebahagian gambar."); break; }
    }
    setNaikGambar(false); setProgres("");
    if (berjaya) setRalatGambar((prev) => prev || "");
  }

  async function buangGambar(id: string) {
    const r = await padamGambarBiro(kod, id);
    if (r.ok) setGambar((p) => p.filter((g) => g.id !== id));
    else setRalatGambar(r.msg ?? "Gagal padam gambar.");
  }

  const bilang = gambar.length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {siap && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg font-bold text-green-600">✓</span>
          <div className="text-sm text-green-800">Laporan untuk <b>{nama}</b> telah dimuat naik. Terima kasih.</div>
        </div>
      )}

      <h1 className="text-lg font-bold text-slate-900">Muat Naik Laporan Biro</h1>
      <p className="text-sm text-slate-500">{nama} · Laporan Tahunan {tahun}</p>
      {ketua && <p className="mt-0.5 text-xs text-slate-400">Ketua: {ketua}</p>}

      <a
        href="/Templat_Laporan_Biro_SAR.docx"
        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-surau/40 bg-surau/5 px-4 py-3 text-sm font-semibold text-surau hover:bg-surau/10"
      >
        Muat Turun Templete Laporan (Word)
      </a>

      {semasaNama && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="font-medium text-slate-700">Fail dimuat naik sebelum ini:</div>
          <div className="mt-0.5 text-slate-600">{semasaNama}</div>
          {semasaMasa && <div className="text-xs text-slate-400">{bilaTeks(semasaMasa)}</div>}
          <div className="mt-1 text-xs text-amber-600">Muat naik semula akan menggantikan fail ini.</div>
        </div>
      )}

      <label className="mt-4 block">
        <span className="text-sm font-medium text-slate-700">Pilih fail laporan</span>
        <input
          type="file"
          accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
          onChange={(e) => { setFail(e.target.files?.[0] ?? null); setRalat(""); }}
          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surau file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
        />
      </label>
      {fail && <p className="mt-1 text-xs text-slate-500">Dipilih: {fail.name} ({(fail.size / 1024 / 1024).toFixed(1)}MB)</p>}
      {ralat && <p className="mt-3 text-sm font-semibold text-red-600">{ralat}</p>}

      <button
        onClick={hantar}
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-surau px-4 py-3 text-base font-bold text-white hover:bg-surau-dark disabled:opacity-50"
      >
        {busy ? "Memuat naik…" : "Hantar Laporan"}
      </button>

      {/* ---- Gambar aktiviti biro ---- */}
      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Gambar Aktiviti Biro</h2>
          <span className={`text-xs font-semibold ${bilang < MIN_GAMBAR ? "text-amber-600" : "text-emerald-600"}`}>{bilang}/{GAMBAR_BIRO_MAKS}</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">Muat naik {MIN_GAMBAR}–{GAMBAR_BIRO_MAKS} gambar aktiviti/program biro sepanjang tahun. Gambar dikecilkan automatik.</p>

        {bilang > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {gambar.map((g) => (
              <div key={g.id} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt="Gambar biro" className="h-full w-full object-cover" />
                <button
                  onClick={() => buangGambar(g.id)}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs font-bold text-white hover:bg-red-600"
                  aria-label="Padam gambar"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {bilang < GAMBAR_BIRO_MAKS && (
          <label className="mt-3 block">
            <span className="text-sm font-medium text-slate-700">Tambah gambar</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={naikGambar}
              onChange={pilihGambar}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:opacity-50"
            />
          </label>
        )}
        {naikGambar && <p className="mt-2 text-xs font-semibold text-slate-500">{progres}</p>}
        {ralatGambar && <p className="mt-2 text-xs font-semibold text-red-600">{ralatGambar}</p>}
        {!naikGambar && bilang > 0 && bilang < MIN_GAMBAR && <p className="mt-2 text-xs text-amber-600">Disyorkan sekurang-kurangnya {MIN_GAMBAR} gambar.</p>}
        {bilang >= GAMBAR_BIRO_MAKS && <p className="mt-2 text-xs text-slate-400">Sudah cukup {GAMBAR_BIRO_MAKS} gambar (maksimum).</p>}
      </div>
    </div>
  );
}
