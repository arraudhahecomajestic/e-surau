"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clockShift, tandaChecklist, siapTugasan, hantarLaporan, tambahLog } from "@/app/kerani/actions";
import { SHIFT } from "@/lib/staf";

type Kehadiran = { shift: string; masuk: string | null; keluar: string | null };
type Item = { id: number; tajuk: string; shift: string; siap: boolean };
type Tugas = { id: string; tajuk: string; keterangan: string | null; tarikh_tugas: string };

function jam(t: string | null) {
  if (!t) return "—";
  try { return new Date(t).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
}

export default function StafPortal({
  kehadiran, checklist, tugasan,
}: {
  kehadiran: Kehadiran[];
  checklist: Item[];
  tugasan: Tugas[];
}) {
  const router = useRouter();
  const siapBil = checklist.filter((c) => c.siap).length;
  const pct = checklist.length ? Math.round((siapBil / checklist.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KEHADIRAN */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Kehadiran Hari Ini</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SHIFT.map((s) => {
            const rec = kehadiran.find((k) => k.shift === s.kod);
            const sedangKerja = rec?.masuk && !rec?.keluar;
            return (
              <ClockCard key={s.kod} shift={s.kod} label={s.label} rec={rec} sedangKerja={!!sedangKerja} onDone={() => router.refresh()} />
            );
          })}
        </div>
      </section>

      {/* CHECKLIST */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Tugas Harian</h2>
          <span className="text-sm font-semibold text-surau">{siapBil}/{checklist.length} · {pct}%</span>
        </div>
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-surau transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="space-y-1">
          {checklist.length === 0 && <p className="text-sm text-slate-400">Tiada tugas harian ditetapkan.</p>}
          {checklist.map((c) => <ChecklistRow key={c.id} item={c} onDone={() => router.refresh()} />)}
        </div>
      </section>

      {/* TUGASAN */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Tugasan Khas {tugasan.length > 0 && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{tugasan.length} baru</span>}</h2>
        {tugasan.length === 0 ? (
          <p className="text-sm text-slate-400">Tiada tugasan baru. </p>
        ) : (
          <div className="space-y-2">
            {tugasan.map((t) => <TugasRow key={t.id} tugas={t} onDone={() => router.refresh()} />)}
          </div>
        )}
      </section>

      {/* LAPORAN + LOG */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LaporForm onDone={() => router.refresh()} />
        <LogForm onDone={() => router.refresh()} />
      </div>
    </div>
  );
}

function ClockCard({ shift, label, rec, sedangKerja, onDone }: { shift: string; label: string; rec?: Kehadiran; sedangKerja: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function tekan() {
    // Pengesahan sebelum Clock Out — elak tertekan dua kali (tamat shift tak sengaja)
    if (sedangKerja && !window.confirm("Sahkan CLOCK OUT?\nAnda akan tamatkan shift ini.")) return;
    setBusy(true); await clockShift(shift); setBusy(false); onDone();
  }
  return (
    <div className={`rounded-xl border-2 p-4 ${sedangKerja ? "border-green-400 bg-green-50" : "border-slate-200"}`}>
      <div className="font-semibold text-slate-900">{label}</div>
      <div className="mt-1 text-xs text-slate-500">Masuk: {jam(rec?.masuk ?? null)} · Keluar: {jam(rec?.keluar ?? null)}</div>
      <button onClick={tekan} disabled={busy || (!!rec?.keluar)} className={`mt-3 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${sedangKerja ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
        {busy ? "…" : rec?.keluar ? "Selesai shift ✓" : sedangKerja ? "Clock Out" : "Clock In"}
      </button>
    </div>
  );
}

function ChecklistRow({ item, onDone }: { item: Item; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function toggle() { setBusy(true); await tandaChecklist(item.id, !item.siap); setBusy(false); onDone(); }
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 text-sm ${item.siap ? "bg-green-50" : "hover:bg-slate-50"}`}>
      <input type="checkbox" checked={item.siap} onChange={toggle} disabled={busy} className="h-4 w-4 accent-surau" />
      <span className={item.siap ? "text-slate-400 line-through" : "text-slate-700"}>{item.tajuk}</span>
      {item.shift !== "semua" && <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">{item.shift}</span>}
    </label>
  );
}

function TugasRow({ tugas, onDone }: { tugas: Tugas; onDone: () => void }) {
  const [buka, setBuka] = useState(false);
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);
  async function siap() { setBusy(true); await siapTugasan(tugas.id, nota); setBusy(false); onDone(); }
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="font-medium text-slate-900">{tugas.tajuk}</div>
      {tugas.keterangan && <p className="mt-0.5 text-sm text-slate-600">{tugas.keterangan}</p>}
      {!buka ? (
        <button onClick={() => setBuka(true)} className="mt-2 rounded-lg bg-surau px-3 py-1.5 text-xs font-semibold text-white hover:bg-surau-dark">Tanda Siap</button>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Nota (pilihan)" className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm" />
          <button onClick={siap} disabled={busy} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{busy ? "…" : "Sahkan Siap"}</button>
          <button onClick={() => setBuka(false)} className="text-xs text-slate-500">Batal</button>
        </div>
      )}
    </div>
  );
}

function LaporForm({ onDone }: { onDone: () => void }) {
  const [tajuk, setTajuk] = useState("");
  const [ket, setKet] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [gambar, setGambar] = useState("");

  async function pilihGambar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const path = `${crypto.randomUUID()}.${(f.name.split(".").pop() || "jpg").toLowerCase()}`;
      const { error } = await supabase.storage.from("staf").upload(path, f, { contentType: f.type || "image/jpeg", upsert: true });
      if (!error) setGambar(supabase.storage.from("staf").getPublicUrl(path).data.publicUrl);
    } catch { /* abaikan */ }
    setBusy(false);
  }

  async function hantar() {
    setMsg("");
    const res = await hantarLaporan({ tajuk, keterangan: ket, urlGambar: gambar || undefined });
    if (!res.ok) { setMsg(res.msg ?? "Ralat."); return; }
    setTajuk(""); setKet(""); setGambar(""); setMsg("✓ Laporan dihantar.");
    onDone();
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold text-slate-900">Lapor Kerosakan / Aduan</h2>
      <div className="space-y-2">
        <input value={tajuk} onChange={(e) => setTajuk(e.target.value)} placeholder="Tajuk (cth: Aircond ruang utama rosak)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <textarea value={ket} onChange={(e) => setKet(e.target.value)} rows={2} placeholder="Keterangan" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-2 text-sm text-slate-600 hover:border-surau">
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={pilihGambar} />
          {gambar ? "✓ Gambar dilampir — ketik untuk tukar" : busy ? "Memuat naik…" : "Lampir gambar (pilihan)"}
        </label>
        <button onClick={hantar} disabled={busy} className="w-full rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60">Hantar Laporan</button>
        {msg && <p className={`text-sm ${msg.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>{msg}</p>}
      </div>
    </section>
  );
}

function LogForm({ onDone }: { onDone: () => void }) {
  const [shift, setShift] = useState("pagi");
  const [catatan, setCatatan] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function hantar() {
    setMsg(""); setBusy(true);
    const res = await tambahLog({ shift, catatan });
    setBusy(false);
    if (!res.ok) { setMsg(res.msg ?? "Ralat."); return; }
    setCatatan(""); setMsg("✓ Log direkod.");
    onDone();
  }
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold text-slate-900">Log Aktiviti Harian</h2>
      <div className="space-y-2">
        <select value={shift} onChange={(e) => setShift(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {SHIFT.map((s) => <option key={s.kod} value={s.kod}>{s.label}</option>)}
        </select>
        <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3} placeholder="Apa yang anda buat hari ini…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button onClick={hantar} disabled={busy} className="w-full rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60">Rekod Log</button>
        {msg && <p className={`text-sm ${msg.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>{msg}</p>}
      </div>
    </section>
  );
}
