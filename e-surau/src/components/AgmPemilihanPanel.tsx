"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  tambahCalon, semakCalon, padamCalon, simpanKiraan, tentukanPemenang,
  tambahJawatan, kemasJawatanBil, padamJawatan,
} from "@/app/admin/agm/actions";

type Jawatan = { id: string; kod: string; nama: string; kategori: string; bil_dipilih: number; susunan: number };
type Calon = { id: string; jawatan_id: string; nama: string; no_ahli: string | null; pencadang_nama: string | null; penyokong_nama: string | null; status: string; jumlah_undi: number; menang: boolean };
type Undian = { undi_dikeluarkan: number; undi_dikembalikan: number; undi_rosak: number; undi_sah: number };

const KAT: Record<string, string> = { induk: "Induk", biro: "Biro", ajk: "AJK", audit: "Juruaudit" };

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    menunggu: "bg-slate-100 text-slate-500",
    sah: "bg-blue-100 text-blue-700",
    tolak: "bg-red-100 text-red-700",
    tarik_diri: "bg-amber-100 text-amber-700",
    menang_tanpa_bertanding: "bg-green-100 text-green-700",
  };
  const label: Record<string, string> = {
    menunggu: "menunggu semakan", sah: "disahkan", tolak: "ditolak", tarik_diri: "tarik diri", menang_tanpa_bertanding: "menang tanpa bertanding",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[s] ?? "bg-slate-100 text-slate-500"}`}>{label[s] ?? s}</span>;
}

export default function AgmPemilihanPanel({ agmId, jawatan, calon, undianByJawatan }: { agmId: string; jawatan: Jawatan[]; calon: Calon[]; undianByJawatan: Record<string, Undian> }) {
  return (
    <div className="space-y-6">
      <UrusJawatan agmId={agmId} jawatan={jawatan} />
      {jawatan.map((j) => (
        <JawatanBlok key={j.id} agmId={agmId} jawatan={j} calon={calon.filter((c) => c.jawatan_id === j.id)} undian={undianByJawatan[j.id]} />
      ))}
    </div>
  );
}

/* ---- Urus jawatan (bil dipilih, tambah, padam) ---- */
function UrusJawatan({ agmId, jawatan }: { agmId: string; jawatan: Jawatan[] }) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [kod, setKod] = useState("");
  const [nama, setNama] = useState("");
  const [kategori, setKategori] = useState("biro");
  const [bil, setBil] = useState(1);
  const [busy, setBusy] = useState(false);
  const [ralat, setRalat] = useState("");

  async function tambah() {
    if (!kod.trim() || !nama.trim()) { setRalat("Isi kod & nama jawatan."); return; }
    setBusy(true); setRalat("");
    const r = await tambahJawatan(agmId, kod, nama, kategori, bil); setBusy(false);
    if (r?.ok) { setKod(""); setNama(""); setBil(1); router.refresh(); } else setRalat(r?.msg ?? "Gagal.");
  }
  async function ubahBil(id: string, v: number) { await kemasJawatanBil(id, v); router.refresh(); }
  async function buang(id: string) { if (!window.confirm("Padam jawatan ini & semua calonnya?")) return; await padamJawatan(id); router.refresh(); }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <button onClick={() => setBuka((v) => !v)} className="flex w-full items-center justify-between text-left">
        <h2 className="font-semibold text-slate-900">Urus Jawatan &amp; Bilangan Dipilih</h2>
        <span className="text-xs text-slate-400">{buka ? "tutup" : "buka"}</span>
      </button>
      {buka && (
        <div className="mt-3 space-y-3">
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100 text-sm">
            {jawatan.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                <span className="min-w-0 truncate"><b>{j.nama}</b> <span className="text-xs text-slate-400">({KAT[j.kategori] ?? j.kategori})</span></span>
                <span className="flex shrink-0 items-center gap-2">
                  <label className="flex items-center gap-1 text-xs text-slate-500">dipilih
                    <input type="number" min={1} defaultValue={j.bil_dipilih} onBlur={(e) => ubahBil(j.id, Number(e.target.value))} className="w-14 rounded border border-slate-300 px-1.5 py-0.5 text-sm" /></label>
                  <button onClick={() => buang(j.id)} className="text-xs text-red-500 hover:underline">padam</button>
                </span>
              </li>
            ))}
          </ul>
          <div className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
            <input value={kod} onChange={(e) => setKod(e.target.value)} placeholder="Kod (cth: BIRO_SUKAN)" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
            <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama jawatan" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
            <select value={kategori} onChange={(e) => setKategori(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              <option value="induk">Induk</option><option value="biro">Biro</option><option value="ajk">AJK</option><option value="audit">Juruaudit</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-600">Bil. dipilih
              <input type="number" min={1} value={bil} onChange={(e) => setBil(Number(e.target.value))} className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
            <div className="flex items-center gap-3 sm:col-span-2">
              <button disabled={busy} onClick={tambah} className="rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-50">+ Tambah Jawatan</button>
              {ralat && <span className="text-xs font-semibold text-red-600">{ralat}</span>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---- Satu jawatan: calon + kiraan undi ---- */
function JawatanBlok({ agmId, jawatan, calon, undian }: { agmId: string; jawatan: Jawatan; calon: Calon[]; undian?: Undian }) {
  const router = useRouter();
  const sah = calon.filter((c) => c.status === "sah" || c.status === "menang_tanpa_bertanding");

  // borang tambah calon
  const [nama, setNama] = useState("");
  const [noAhli, setNoAhli] = useState("");
  const [pencadang, setPencadang] = useState("");
  const [penyokong, setPenyokong] = useState("");
  const [busy, setBusy] = useState(false);
  const [ralat, setRalat] = useState("");

  // kiraan undi
  const [dikeluarkan, setDikeluarkan] = useState(undian?.undi_dikeluarkan ?? 0);
  const [dikembalikan, setDikembalikan] = useState(undian?.undi_dikembalikan ?? 0);
  const [rosak, setRosak] = useState(undian?.undi_rosak ?? 0);
  const [undi, setUndi] = useState<Record<string, number>>(() => Object.fromEntries(calon.map((c) => [c.id, c.jumlah_undi])));
  const [msgKira, setMsgKira] = useState("");
  const [keputusan, setKeputusan] = useState("");

  async function tambah() {
    if (!nama.trim() || !pencadang.trim() || !penyokong.trim()) { setRalat("Nama, pencadang & penyokong wajib."); return; }
    setBusy(true); setRalat("");
    const r = await tambahCalon(agmId, jawatan.id, nama, noAhli, pencadang, penyokong); setBusy(false);
    if (r?.ok) { setNama(""); setNoAhli(""); setPencadang(""); setPenyokong(""); router.refresh(); } else setRalat(r?.msg ?? "Gagal.");
  }
  async function semak(id: string, status: string) {
    let sebab = "";
    if (status === "tolak") { sebab = window.prompt("Sebab tolak (pilihan):") ?? ""; }
    await semakCalon(id, status, sebab); router.refresh();
  }
  async function padam(id: string) { if (!window.confirm("Padam calon ini?")) return; await padamCalon(id); router.refresh(); }

  async function simpanKira() {
    setBusy(true); setMsgKira("");
    const senarai = sah.map((c) => ({ calonId: c.id, undi: undi[c.id] ?? 0 }));
    const r = await simpanKiraan(agmId, jawatan.id, dikeluarkan, dikembalikan, rosak, senarai); setBusy(false);
    if (r?.ok) { setMsgKira(r.beza === 0 ? "Disimpan · undi seimbang ✓" : `Disimpan · BEZA ${r.beza} (undi sah vs jumlah calon tak sepadan)`); router.refresh(); }
    else setMsgKira(r?.msg ?? "Gagal simpan kiraan.");
  }
  async function pemenang() {
    setBusy(true); setKeputusan("");
    const r = await tentukanPemenang(jawatan.id); setBusy(false);
    if (r?.ok) { setKeputusan(hurufBesar(r.keputusan ?? "")); router.refresh(); } else setKeputusan(r?.msg ?? "Gagal.");
  }

  const undiSah = Math.max(0, dikembalikan - rosak);
  const jumlahCalon = sah.reduce((s, c) => s + (undi[c.id] ?? 0), 0);
  const beza = undiSah - jumlahCalon;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold text-surau">{jawatan.nama}</h3>
        <span className="text-xs text-slate-400">{KAT[jawatan.kategori] ?? jawatan.kategori} · dipilih {jawatan.bil_dipilih}</span>
      </div>

      {/* Senarai calon */}
      {calon.length === 0 ? <p className="mb-3 text-sm text-slate-400">Belum ada calon.</p> : (
        <ul className="mb-3 space-y-2">
          {calon.map((c) => (
            <li key={c.id} className={`rounded-lg border p-2.5 ${c.menang ? "border-green-300 bg-green-50" : "border-slate-200"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-900">{c.nama}</span>
                  {c.no_ahli && <span className="ml-2 text-xs text-slate-400">{c.no_ahli}</span>}
                  <span className="ml-2"><StatusBadge s={c.status} /></span>
                  {c.menang && <span className="ml-2 rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white">PEMENANG</span>}
                  <div className="mt-0.5 text-xs text-slate-500">Cadang: {c.pencadang_nama ?? "—"} · Sokong: {c.penyokong_nama ?? "—"}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs">
                  {c.status === "menunggu" && <>
                    <button onClick={() => semak(c.id, "sah")} className="font-semibold text-blue-600 hover:underline">sah</button>
                    <button onClick={() => semak(c.id, "tolak")} className="font-semibold text-red-500 hover:underline">tolak</button>
                  </>}
                  {c.status === "sah" && <button onClick={() => semak(c.id, "menunggu")} className="text-slate-400 hover:underline">batal sah</button>}
                  {(c.status === "tolak" || c.status === "tarik_diri") && <button onClick={() => semak(c.id, "menunggu")} className="text-slate-400 hover:underline">buka semula</button>}
                  <button onClick={() => padam(c.id)} className="text-red-500 hover:underline">padam</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Tambah calon */}
      <details className="mb-3 rounded-lg bg-slate-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">+ Tambah calon</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama calon" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <input value={noAhli} onChange={(e) => setNoAhli(e.target.value)} placeholder="No. ahli (pilihan)" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <input value={pencadang} onChange={(e) => setPencadang(e.target.value)} placeholder="Pencadang" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <input value={penyokong} onChange={(e) => setPenyokong(e.target.value)} placeholder="Penyokong" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <div className="flex items-center gap-3 sm:col-span-2">
            <button disabled={busy} onClick={tambah} className="rounded-lg bg-surau px-4 py-1.5 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-50">Tambah</button>
            {ralat && <span className="text-xs font-semibold text-red-600">{ralat}</span>}
          </div>
        </div>
      </details>

      {/* Kiraan undi */}
      {sah.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 text-sm font-semibold text-slate-800">Kiraan Undi (kertas)</div>
          <div className="grid grid-cols-3 gap-2">
            <label className="block"><span className="text-xs text-slate-600">Dikeluarkan</span>
              <input type="number" min={0} value={dikeluarkan} onChange={(e) => setDikeluarkan(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
            <label className="block"><span className="text-xs text-slate-600">Dikembalikan</span>
              <input type="number" min={0} value={dikembalikan} onChange={(e) => setDikembalikan(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
            <label className="block"><span className="text-xs text-slate-600">Rosak</span>
              <input type="number" min={0} value={rosak} onChange={(e) => setRosak(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
          </div>
          <div className="mt-3 space-y-1.5">
            {sah.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-slate-700">{c.nama}</span>
                <input type="number" min={0} value={undi[c.id] ?? 0} onChange={(e) => setUndi((p) => ({ ...p, [c.id]: Number(e.target.value) }))} className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
              </div>
            ))}
          </div>
          <div className={`mt-2 text-xs font-semibold ${beza === 0 ? "text-emerald-600" : "text-amber-600"}`}>
            Undi sah: {undiSah} · Jumlah undi calon: {jumlahCalon} · Beza: {beza} {beza === 0 ? "(seimbang)" : "(semak semula)"}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button disabled={busy} onClick={simpanKira} className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50">Simpan Kiraan</button>
            <button disabled={busy} onClick={pemenang} className="rounded-lg border border-surau bg-surau/10 px-4 py-1.5 text-xs font-bold text-surau hover:bg-surau/20 disabled:opacity-50">Tentukan Pemenang</button>
            {msgKira && <span className="text-xs font-semibold text-slate-600">{msgKira}</span>}
            {keputusan && <span className="text-xs font-bold text-green-700">Keputusan: {keputusan}</span>}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">“Tentukan Pemenang” pilih ikut undi tertinggi. Jika bilangan calon ≤ jumlah dipilih, dikira menang tanpa bertanding. Jika seri di kedudukan potong, sistem minta undi ulang.</p>
        </div>
      )}
    </section>
  );
}

function hurufBesar(s: string) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
