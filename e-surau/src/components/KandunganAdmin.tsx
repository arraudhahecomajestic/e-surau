"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { simpanVisiMisi, tambahCarta, padamCarta, kemasGambarCarta, tambahBuletin, kemasBuletin, padamBuletin, toggleBuletin, drafBuletinAI } from "@/app/admin/kandungan/actions";
import { tarikhMs } from "@/lib/format";

type Carta = { id: string; jawatan: string; nama: string | null; gambar_url: string | null; susunan: number };
type Buletin = { id: string; tajuk: string; keterangan: string | null; url_fail: string | null; jenis_fail: string | null; tarikh: string; diterbitkan: boolean; gambar?: string[] | null };

async function muatFail(f: File): Promise<{ url: string; jenis: string } | null> {
  try {
    const supabase = createClient();
    const ext = (f.name.split(".").pop() || "dat").toLowerCase();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("kandungan").upload(path, f, { contentType: f.type || undefined, upsert: true });
    if (error) return null;
    const url = supabase.storage.from("kandungan").getPublicUrl(path).data.publicUrl;
    const jenis = f.type.includes("pdf") || ext === "pdf" ? "pdf" : "imej";
    return { url, jenis };
  } catch { return null; }
}

// Satu baris carta — nama & jawatan sudah diisi, admin cuma muat naik / tukar gambar.
function BarisCarta({ c, onDone }: { c: Carta; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function pilih(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    const res = await muatFail(f);
    if (res) await kemasGambarCarta(c.id, res.url);
    setBusy(false); onDone();
  }
  async function buang() { setBusy(true); await kemasGambarCarta(c.id, ""); setBusy(false); onDone(); }
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-2 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {c.gambar_url ? <img src={c.gambar_url} alt={c.nama ?? c.jawatan} className="h-10 w-10 shrink-0 rounded-full object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400">—</div>}
        <div className="min-w-0"><span className="font-medium text-slate-800">{c.jawatan}</span> {c.nama && <span className="text-slate-500">· {c.nama}</span>}</div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <label className="cursor-pointer text-xs font-semibold text-surau hover:underline">
          <input type="file" accept="image/*" className="hidden" onChange={pilih} disabled={busy} />
          {busy ? "Memuat naik…" : c.gambar_url ? "Tukar gambar" : "Muat naik gambar"}
        </label>
        {c.gambar_url && <button onClick={buang} disabled={busy} className="text-xs font-semibold text-slate-400 hover:text-red-500 hover:underline disabled:opacity-50">Buang</button>}
        <button onClick={async () => { await padamCarta(c.id); onDone(); }} className="text-xs font-semibold text-red-600 hover:underline">Padam</button>
      </div>
    </div>
  );
}

export default function KandunganAdmin({ visi, misi, carta, buletin }: { visi: string; misi: string; carta: Carta[]; buletin: Buletin[] }) {
  const router = useRouter();
  return (
    <div className="space-y-6">
      <VisiMisi visi={visi} misi={misi} onDone={() => router.refresh()} />
      <CartaSeksyen carta={carta} onDone={() => router.refresh()} />
      <BuletinSeksyen buletin={buletin} onDone={() => router.refresh()} />
      <style jsx global>{`.inp{width:100%;border-radius:.5rem;border:1px solid #cbd5e1;padding:.5rem .75rem;font-size:.875rem;outline:none}.inp:focus{border-color:#b8860b;box-shadow:0 0 0 2px rgba(184,134,11,.2)}`}</style>
    </div>
  );
}

function VisiMisi({ visi, misi, onDone }: { visi: string; misi: string; onDone: () => void }) {
  const [v, setV] = useState(visi);
  const [m, setM] = useState(misi);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function simpan() {
    setBusy(true); setMsg("");
    const res = await simpanVisiMisi({ visi: v, misi: m });
    setBusy(false);
    setMsg(res.ok ? "✓ Disimpan." : (res.msg ?? "Ralat."));
    if (res.ok) onDone();
  }
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold text-slate-900">Visi & Misi</h2>
      <div className="space-y-3">
        <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Visi</span>
          <textarea value={v} onChange={(e) => setV(e.target.value)} rows={2} className="inp" placeholder="Visi surau…" /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Misi</span>
          <textarea value={m} onChange={(e) => setM(e.target.value)} rows={4} className="inp" placeholder="Misi surau… (setiap baris satu poin)" /></label>
        <div className="flex items-center gap-3">
          <button onClick={simpan} disabled={busy} className="rounded-lg bg-surau px-5 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60">{busy ? "…" : "Simpan Visi & Misi"}</button>
          {msg && <span className={`text-sm ${msg.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>{msg}</span>}
        </div>
      </div>
    </section>
  );
}

function CartaSeksyen({ carta, onDone }: { carta: Carta[]; onDone: () => void }) {
  const [jawatan, setJawatan] = useState("");
  const [nama, setNama] = useState("");
  const [susunan, setSusunan] = useState<number>((carta.at(-1)?.susunan ?? 0) + 10);
  const [gambarUrl, setGambarUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function pilihGambar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true);
    const res = await muatFail(f);
    setBusy(false);
    if (res) setGambarUrl(res.url); else setMsg("Gagal muat naik gambar.");
  }
  async function tambah() {
    setMsg("");
    const res = await tambahCarta({ jawatan, nama, gambarUrl: gambarUrl || undefined, susunan });
    if (!res.ok) { setMsg(res.msg ?? "Ralat."); return; }
    setJawatan(""); setNama(""); setGambarUrl(""); setSusunan((s) => s + 10);
    onDone();
  }
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold text-slate-900">Carta Organisasi</h2>
      <div className="mb-4 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
        <input value={jawatan} onChange={(e) => setJawatan(e.target.value)} placeholder="Jawatan (cth: Pengerusi)" className="inp" />
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama" className="inp uppercase" />
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-2 text-sm text-slate-600 hover:border-surau">
          <input type="file" accept="image/*" className="hidden" onChange={pilihGambar} />
          {gambarUrl ? "✓ Gambar dilampir" : busy ? "Memuat naik…" : "Gambar (pilihan)"}
        </label>
        <input type="number" value={susunan} onChange={(e) => setSusunan(Number(e.target.value) || 0)} placeholder="Susunan" className="inp" />
        <div className="sm:col-span-2">
          <button onClick={tambah} disabled={busy} className="rounded-lg bg-surau px-5 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60">Tambah ke Carta</button>
          {msg && <span className="ml-3 text-sm text-red-600">{msg}</span>}
        </div>
      </div>
      <div className="space-y-1">
        {carta.length === 0 && <p className="text-sm text-slate-400">Tiada lagi. Tambah AJK di atas.</p>}
        {carta.map((c) => <BarisCarta key={c.id} c={c} onDone={onDone} />)}
      </div>
    </section>
  );
}

function BuletinSeksyen({ buletin, onDone }: { buletin: Buletin[]; onDone: () => void }) {
  const [tajuk, setTajuk] = useState("");
  const [ket, setKet] = useState("");
  const [tarikh, setTarikh] = useState("");
  const [gambar, setGambar] = useState<string[]>([]); // banyak gambar
  const [urlPdf, setUrlPdf] = useState(""); // PDF (pilihan, berasingan)
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState(false);
  const [msg, setMsg] = useState("");

  async function pilihGambar(e: React.ChangeEvent<HTMLInputElement>) {
    const fail = Array.from(e.target.files || []);
    e.target.value = ""; // benarkan pilih fail sama semula
    if (!fail.length) return;
    setBusy(true); setMsg("");
    const url: string[] = [];
    for (const f of fail) {
      const res = await muatFail(f);
      if (res) url.push(res.url);
    }
    setBusy(false);
    if (url.length) setGambar((g) => [...g, ...url]);
    else setMsg("Gagal muat naik gambar.");
  }
  function buangGambar(i: number) {
    setGambar((g) => g.filter((_, idx) => idx !== i));
  }
  async function pilihPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true); setMsg("");
    const res = await muatFail(f);
    setBusy(false);
    if (res) setUrlPdf(res.url); else setMsg("Gagal muat naik PDF.");
  }
  async function drafAI() {
    setMsg(""); setAi(true);
    const res = await drafBuletinAI({ tajuk, idea: ket });
    setAi(false);
    if (!res.ok) { setMsg(res.msg ?? "AI gagal."); return; }
    setKet(res.teks || "");
  }
  async function tambah() {
    setMsg("");
    const res = await tambahBuletin({
      tajuk,
      keterangan: ket,
      urlFail: urlPdf || undefined,
      jenisFail: urlPdf ? "pdf" : undefined,
      gambar,
      tarikh: tarikh || undefined,
    });
    if (!res.ok) { setMsg(res.msg ?? "Ralat."); return; }
    setTajuk(""); setKet(""); setTarikh(""); setGambar([]); setUrlPdf("");
    onDone();
  }
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold text-slate-900">Buletin Surau</h2>
      <div className="mb-4 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-2">
        <input value={tajuk} onChange={(e) => setTajuk(e.target.value)} placeholder="Tajuk buletin" className="inp sm:col-span-2" />

        {/* Keterangan + Draf dengan AI */}
        <div className="sm:col-span-2">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-slate-700">Isi kandungan</span>
            <button
              type="button"
              onClick={drafAI}
              disabled={ai || busy}
              className="rounded-lg border border-surau/40 bg-surau/5 px-3 py-1 text-xs font-semibold text-surau hover:bg-surau/10 disabled:opacity-60"
              title="Bagi tajuk + idea kasar, AI karang konten penuh"
            >
              {ai ? "AI sedang mengarang…" : "Draf dengan AI"}
            </button>
          </div>
          <textarea value={ket} onChange={(e) => setKet(e.target.value)} rows={5} placeholder="Taip idea/isi kasar, kemudian tekan “Draf dengan AI” untuk karang konten penuh — atau tulis sendiri di sini." className="inp" />
          <p className="mt-1 text-xs text-slate-400">Tip: isi tajuk + beberapa poin idea, tekan “Draf dengan AI”. Anda boleh sunting hasil AI sebelum terbit.</p>
        </div>

        <label className="text-sm text-slate-600">Tarikh<input type="date" value={tarikh} onChange={(e) => setTarikh(e.target.value)} className="inp" /></label>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-2 text-sm text-slate-600 hover:border-surau">
          <input type="file" accept="image/*" multiple className="hidden" onChange={pilihGambar} />
          {busy ? "Memuat naik…" : "Tambah Gambar (boleh banyak)"}
        </label>

        {/* Pratonton gambar */}
        {gambar.length > 0 && (
          <div className="sm:col-span-2 flex flex-wrap gap-2">
            {gambar.map((u, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`Gambar ${i + 1}`} className="h-20 w-20 rounded-lg object-cover" />
                <button type="button" onClick={() => buangGambar(i)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white" title="Buang">×</button>
              </div>
            ))}
          </div>
        )}

        <label className="sm:col-span-2 flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-2 text-sm text-slate-600 hover:border-surau">
          <input type="file" accept="application/pdf" className="hidden" onChange={pilihPdf} />
          {urlPdf ? "PDF dilampir — tekan untuk ganti" : "Lampir PDF (pilihan)"}
        </label>

        <div className="sm:col-span-2">
          <button onClick={tambah} disabled={busy || ai} className="rounded-lg bg-surau px-5 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60">Terbit Buletin</button>
          {msg && <span className="ml-3 text-sm text-red-600">{msg}</span>}
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {buletin.length === 0 && <p className="text-sm text-slate-400">Tiada buletin lagi.</p>}
        {buletin.map((b) => <BuletinBaris key={b.id} b={b} onDone={onDone} />)}
      </div>
    </section>
  );
}

function BuletinBaris({ b, onDone }: { b: Buletin; onDone: () => void }) {
  const [edit, setEdit] = useState(false);
  const [tajuk, setTajuk] = useState(b.tajuk);
  const [ket, setKet] = useState(b.keterangan ?? "");
  const [tarikh, setTarikh] = useState((b.tarikh || "").slice(0, 10));
  const [gambar, setGambar] = useState<string[]>(
    b.gambar?.length ? b.gambar : (b.url_fail && b.jenis_fail === "imej" ? [b.url_fail] : []),
  );
  const [urlPdf, setUrlPdf] = useState(b.jenis_fail === "pdf" ? (b.url_fail ?? "") : "");
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState(false);
  const [msg, setMsg] = useState("");

  const bilGambar = (b.gambar?.length ?? 0) || (b.url_fail && b.jenis_fail === "imej" ? 1 : 0);

  function reset() {
    setTajuk(b.tajuk); setKet(b.keterangan ?? "");
    setTarikh((b.tarikh || "").slice(0, 10));
    setGambar(b.gambar?.length ? b.gambar : (b.url_fail && b.jenis_fail === "imej" ? [b.url_fail] : []));
    setUrlPdf(b.jenis_fail === "pdf" ? (b.url_fail ?? "") : "");
    setMsg("");
  }
  async function pilihGambar(e: React.ChangeEvent<HTMLInputElement>) {
    const fail = Array.from(e.target.files || []);
    e.target.value = "";
    if (!fail.length) return;
    setBusy(true); setMsg("");
    const url: string[] = [];
    for (const f of fail) { const r = await muatFail(f); if (r) url.push(r.url); }
    setBusy(false);
    if (url.length) setGambar((g) => [...g, ...url]); else setMsg("Gagal muat naik gambar.");
  }
  async function pilihPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true); setMsg("");
    const r = await muatFail(f);
    setBusy(false);
    if (r) setUrlPdf(r.url); else setMsg("Gagal muat naik PDF.");
  }
  async function drafAI() {
    setMsg(""); setAi(true);
    const r = await drafBuletinAI({ tajuk, idea: ket });
    setAi(false);
    if (!r.ok) { setMsg(r.msg ?? "AI gagal."); return; }
    setKet(r.teks || "");
  }
  async function simpan() {
    setMsg(""); setBusy(true);
    const r = await kemasBuletin({
      id: b.id, tajuk, keterangan: ket, tarikh: tarikh || undefined,
      gambar, urlFail: urlPdf || null, jenisFail: urlPdf ? "pdf" : null,
    });
    setBusy(false);
    if (!r.ok) { setMsg(r.msg ?? "Ralat."); return; }
    setEdit(false); onDone();
  }

  if (!edit) {
    return (
      <div className="flex items-center justify-between gap-3 py-2 text-sm">
        <div>
          <div className="font-medium text-slate-800">{b.tajuk} {!b.diterbitkan && <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">Draf</span>}</div>
          <div className="text-xs text-slate-500">
            {tarikhMs(b.tarikh)}
            {bilGambar > 0 ? ` · ${bilGambar} gambar` : ""}
            {b.url_fail && b.jenis_fail === "pdf" ? " · PDF" : ""}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { reset(); setEdit(true); }} className="text-xs font-semibold text-slate-600 hover:underline">Edit</button>
          <button onClick={async () => { await toggleBuletin(b.id, !b.diterbitkan); onDone(); }} className="text-xs font-semibold text-surau hover:underline">{b.diterbitkan ? "Sorok" : "Terbit"}</button>
          <button onClick={async () => { if (!window.confirm(`Padam buletin "${b.tajuk}"? Tindakan ini tak boleh diundur.`)) return; await padamBuletin(b.id); onDone(); }} className="text-xs font-semibold text-red-600 hover:underline">Padam</button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-2 grid gap-2 rounded-lg border border-surau/30 bg-surau/5 p-3 sm:grid-cols-2">
      <div className="sm:col-span-2 text-xs font-semibold text-surau">Edit buletin</div>
      <input value={tajuk} onChange={(e) => setTajuk(e.target.value)} placeholder="Tajuk buletin" className="inp sm:col-span-2" />
      <div className="sm:col-span-2">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-700">Isi kandungan</span>
          <button type="button" onClick={drafAI} disabled={ai || busy} className="rounded-lg border border-surau/40 bg-surau/5 px-3 py-1 text-xs font-semibold text-surau hover:bg-surau/10 disabled:opacity-60">
            {ai ? "AI sedang mengarang…" : "Draf dengan AI"}
          </button>
        </div>
        <textarea value={ket} onChange={(e) => setKet(e.target.value)} rows={6} className="inp" placeholder="Isi kandungan buletin…" />
      </div>
      <label className="text-sm text-slate-600">Tarikh<input type="date" value={tarikh} onChange={(e) => setTarikh(e.target.value)} className="inp" /></label>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-2 text-sm text-slate-600 hover:border-surau">
        <input type="file" accept="image/*" multiple className="hidden" onChange={pilihGambar} />
        {busy ? "Memuat naik…" : "Tambah Gambar (boleh banyak)"}
      </label>
      {gambar.length > 0 && (
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          {gambar.map((u, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Gambar ${i + 1}`} className="h-20 w-20 rounded-lg object-cover" />
              <button type="button" onClick={() => setGambar((g) => g.filter((_, idx) => idx !== i))} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">×</button>
            </div>
          ))}
        </div>
      )}
      <label className="sm:col-span-2 flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-2 text-sm text-slate-600 hover:border-surau">
        <input type="file" accept="application/pdf" className="hidden" onChange={pilihPdf} />
        {urlPdf ? "PDF dilampir — tekan untuk ganti" : "Lampir PDF (pilihan)"}
      </label>
      {urlPdf && (
        <label className="sm:col-span-2 flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" onChange={(e) => { if (e.target.checked) setUrlPdf(""); }} /> Buang PDF
        </label>
      )}
      <div className="sm:col-span-2 flex items-center gap-2">
        <button onClick={simpan} disabled={busy || ai} className="rounded-lg bg-surau px-5 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60">{busy ? "Menyimpan…" : "Simpan Perubahan"}</button>
        <button onClick={() => { setEdit(false); reset(); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
        {msg && <span className="text-sm text-red-600">{msg}</span>}
      </div>
    </div>
  );
}
