"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { tugasBaru, batalTugasan, tindakLaporan, tambahChecklistItem, toggleChecklistItem, kemasKehadiran, padamKehadiran } from "@/app/admin/staf/actions";
import { labelShift } from "@/lib/staf";

type Kehadiran = { id?: string; nama: string | null; shift: string; masuk: string | null; keluar: string | null };

// Tukar ISO(UTC) → nilai input datetime-local ikut waktu Malaysia (UTC+8)
function keInput(iso: string | null): string {
  if (!iso) return "";
  try { return new Date(new Date(iso).getTime() + 8 * 3600000).toISOString().slice(0, 16); } catch { return ""; }
}
// Tukar nilai input datetime-local (waktu Malaysia) → ISO(UTC)
function keISO(val: string): string | null {
  if (!val) return null;
  try { return new Date(val + ":00+08:00").toISOString(); } catch { return null; }
}
type Tugas = { id: string; tajuk: string; keterangan: string | null; status: string; tarikh_tugas: string; tarikh_siap: string | null; nota_siap: string | null };
type Laporan = { id: string; tajuk: string; keterangan: string | null; url_gambar: string | null; status: string; oleh: string | null; tindakan: string | null; tarikh: string };
type Item = { id: number; tajuk: string; shift: string; aktif: boolean };
type Log = { id: string; nama: string | null; shift: string | null; catatan: string; dicipta: string };

function jam(t: string | null) {
  if (!t) return "—";
  try { return new Date(t).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" }); } catch { return "—"; }
}
function tkh(t: string | null) {
  if (!t) return "—";
  try { return new Date(t).toLocaleDateString("ms-MY", { day: "2-digit", month: "short" }); } catch { return "—"; }
}

export default function AdminStafPanel({
  kehadiran, tugasan, laporan, checklist, log,
}: {
  kehadiran: Kehadiran[];
  tugasan: Tugas[];
  laporan: Laporan[];
  checklist: Item[];
  log: Log[];
}) {
  const router = useRouter();
  return (
    <div className="space-y-6">
      {/* KEHADIRAN HARI INI */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Kehadiran Hari Ini</h2>
        {kehadiran.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada rekod clock-in hari ini.</p>
        ) : (
          <div className="space-y-2">
            {kehadiran.map((k, i) => (
              <KehadiranRow key={k.id ?? i} k={k} onDone={() => router.refresh()} />
            ))}
            <p className="pt-1 text-xs text-slate-400">Tekan &quot;Laras&quot; untuk betulkan masa masuk/keluar, buang keluar (jika tersalah clock out), atau padam rekod.</p>
          </div>
        )}
      </section>

      {/* TUGASAN KHAS */}
      <TugasanPanel tugasan={tugasan} onDone={() => router.refresh()} />

      {/* LAPORAN & ADUAN */}
      <LaporanPanel laporan={laporan} onDone={() => router.refresh()} />

      {/* CHECKLIST TEMPLAT */}
      <ChecklistPanel checklist={checklist} onDone={() => router.refresh()} />

      {/* LOG AKTIVITI */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Log Aktiviti Terkini</h2>
        {log.length === 0 ? (
          <p className="text-sm text-slate-400">Tiada log lagi.</p>
        ) : (
          <div className="space-y-2">
            {log.map((l) => (
              <div key={l.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{l.nama ?? "—"}{l.shift ? ` · ${labelShift(l.shift)}` : ""}</span>
                  <span>{tkh(l.dicipta)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-slate-700">{l.catatan}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TugasanPanel({ tugasan, onDone }: { tugasan: Tugas[]; onDone: () => void }) {
  const [tajuk, setTajuk] = useState("");
  const [ket, setKet] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function beri() {
    setMsg(""); setBusy(true);
    const res = await tugasBaru({ tajuk, keterangan: ket });
    setBusy(false);
    if (!res.ok) { setMsg(res.msg ?? "Ralat."); return; }
    setTajuk(""); setKet(""); onDone();
  }
  const baru = tugasan.filter((t) => t.status === "baru");
  const siap = tugasan.filter((t) => t.status === "siap");
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold text-slate-900">Tugasan Khas</h2>
      <div className="mb-4 space-y-2 rounded-lg bg-slate-50 p-3">
        <input value={tajuk} onChange={(e) => setTajuk(e.target.value)} placeholder="Tajuk tugasan baru" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <textarea value={ket} onChange={(e) => setKet(e.target.value)} rows={2} placeholder="Keterangan (pilihan)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button onClick={beri} disabled={busy} className="rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60">{busy ? "…" : "Beri Tugasan"}</button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </div>
      {baru.length === 0 ? (
        <p className="text-sm text-slate-400">Tiada tugasan tertunggak.</p>
      ) : (
        <div className="space-y-2">
          {baru.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div>
                <div className="font-medium text-slate-900">{t.tajuk}</div>
                {t.keterangan && <p className="text-sm text-slate-600">{t.keterangan}</p>}
                <p className="mt-0.5 text-xs text-slate-400">Diberi {tkh(t.tarikh_tugas)}</p>
              </div>
              <button onClick={async () => { await batalTugasan(t.id); onDone(); }} className="shrink-0 text-xs text-red-600 hover:underline">Batal</button>
            </div>
          ))}
        </div>
      )}
      {siap.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-slate-500">Selesai ({siap.length})</summary>
          <div className="mt-2 space-y-1">
            {siap.map((t) => (
              <div key={t.id} className="rounded-lg bg-green-50 p-2 text-sm">
                <span className="text-slate-700 line-through">{t.tajuk}</span>
                {t.nota_siap && <span className="ml-2 text-xs text-slate-500">— {t.nota_siap}</span>}
                <span className="ml-2 text-xs text-slate-400">{tkh(t.tarikh_siap)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function LaporanPanel({ laporan, onDone }: { laporan: Laporan[]; onDone: () => void }) {
  const aktif = laporan.filter((l) => l.status !== "selesai");
  const selesai = laporan.filter((l) => l.status === "selesai");
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold text-slate-900">Laporan &amp; Aduan {aktif.length > 0 && <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{aktif.length} aktif</span>}</h2>
      {aktif.length === 0 ? (
        <p className="text-sm text-slate-400">Tiada laporan aktif. </p>
      ) : (
        <div className="space-y-3">{aktif.map((l) => <LaporRow key={l.id} l={l} onDone={onDone} />)}</div>
      )}
      {selesai.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-slate-500">Selesai ({selesai.length})</summary>
          <div className="mt-2 space-y-2">{selesai.map((l) => <LaporRow key={l.id} l={l} onDone={onDone} />)}</div>
        </details>
      )}
    </section>
  );
}

function LaporRow({ l, onDone }: { l: Laporan; onDone: () => void }) {
  const [tindakan, setTindakan] = useState(l.tindakan ?? "");
  const [busy, setBusy] = useState(false);
  async function simpan(status: string) {
    setBusy(true);
    await tindakLaporan({ id: l.id, status, tindakan });
    setBusy(false); onDone();
  }
  const warna = l.status === "selesai" ? "border-green-200 bg-green-50" : l.status === "dalam_tindakan" ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50";
  return (
    <div className={`rounded-lg border p-3 ${warna}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-slate-900">{l.tajuk}</div>
          {l.keterangan && <p className="text-sm text-slate-600">{l.keterangan}</p>}
          <p className="mt-0.5 text-xs text-slate-400">{l.oleh ?? "—"} · {tkh(l.tarikh)}</p>
        </div>
        {l.url_gambar && (
          // eslint-disable-next-line @next/next/no-img-element
          <a href={l.url_gambar} target="_blank" rel="noreferrer"><img src={l.url_gambar} alt="lampiran" className="h-16 w-16 rounded object-cover" /></a>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input value={tindakan} onChange={(e) => setTindakan(e.target.value)} placeholder="Catatan tindakan" className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm" />
        <select defaultValue={l.status} onChange={(e) => simpan(e.target.value)} disabled={busy} className="rounded border border-slate-300 px-2 py-1 text-sm">
          <option value="baru">Baru</option>
          <option value="dalam_tindakan">Dalam tindakan</option>
          <option value="selesai">Selesai</option>
        </select>
      </div>
    </div>
  );
}

function ChecklistPanel({ checklist, onDone }: { checklist: Item[]; onDone: () => void }) {
  const [tajuk, setTajuk] = useState("");
  const [shift, setShift] = useState("semua");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  async function tambah() {
    setMsg(""); setBusy(true);
    const res = await tambahChecklistItem({ tajuk, shift });
    setBusy(false);
    if (!res.ok) { setMsg(res.msg ?? "Ralat."); return; }
    setTajuk(""); onDone();
  }
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold text-slate-900">Templat Tugas Harian</h2>
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-3">
        <input value={tajuk} onChange={(e) => setTajuk(e.target.value)} placeholder="Item tugas baru" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={shift} onChange={(e) => setShift(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="semua">Semua shift</option>
          <option value="pagi">Pagi</option>
          <option value="petang">Petang</option>
        </select>
        <button onClick={tambah} disabled={busy} className="rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60">{busy ? "…" : "Tambah"}</button>
      </div>
      {msg && <p className="mb-2 text-sm text-red-600">{msg}</p>}
      <div className="space-y-1">
        {checklist.map((it) => (
          <div key={it.id} className={`flex items-center justify-between gap-3 rounded-lg p-2 text-sm ${it.aktif ? "" : "opacity-50"}`}>
            <span className="text-slate-700">{it.tajuk}</span>
            <div className="flex items-center gap-2">
              {it.shift !== "semua" && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">{it.shift}</span>}
              <button onClick={async () => { await toggleChecklistItem(it.id, !it.aktif); onDone(); }} className={`rounded px-2 py-0.5 text-xs font-medium ${it.aktif ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}>
                {it.aktif ? "Nyahaktif" : "Aktifkan"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Baris kehadiran dengan keupayaan laras (betulkan masa / buang keluar / padam).
function KehadiranRow({ k, onDone }: { k: Kehadiran; onDone: () => void }) {
  const [buka, setBuka] = useState(false);
  const [masuk, setMasuk] = useState(keInput(k.masuk));
  const [keluar, setKeluar] = useState(keInput(k.keluar));
  const [busy, setBusy] = useState(false);
  const boleh = !!k.id;

  async function simpan() {
    if (!k.id) return;
    setBusy(true);
    await kemasKehadiran(k.id, keISO(masuk), keISO(keluar));
    setBusy(false); setBuka(false); onDone();
  }
  async function buangKeluar() {
    if (!k.id) return;
    if (!window.confirm("Buang masa keluar? Staf akan kembali 'Sedang kerja'.")) return;
    setBusy(true);
    await kemasKehadiran(k.id, k.masuk, null);
    setBusy(false); setBuka(false); onDone();
  }
  async function padam() {
    if (!k.id) return;
    if (!window.confirm("Padam rekod kehadiran ini? Tindakan tak boleh undur.")) return;
    setBusy(true);
    await padamKehadiran(k.id);
    setBusy(false); onDone();
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-800">{k.nama ?? "—"}</div>
          <div className="text-xs text-slate-500">
            {labelShift(k.shift)} · Masuk {jam(k.masuk)} · Keluar{" "}
            {k.keluar ? jam(k.keluar) : <span className="rounded bg-green-100 px-1.5 py-0.5 font-semibold text-green-700">Sedang kerja</span>}
          </div>
        </div>
        {boleh && (
          <button type="button" onClick={() => setBuka((v) => !v)} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
            {buka ? "Tutup" : "Laras"}
          </button>
        )}
      </div>

      {buka && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Masa Masuk</span>
              <input type="datetime-local" value={masuk} onChange={(e) => setMasuk(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Masa Keluar</span>
              <input type="datetime-local" value={keluar} onChange={(e) => setKeluar(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={simpan} className="rounded-lg bg-surau px-4 py-1.5 text-xs font-bold text-white hover:bg-surau-dark disabled:opacity-50">{busy ? "…" : "Simpan"}</button>
            {k.keluar && <button type="button" disabled={busy} onClick={buangKeluar} className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200 disabled:opacity-50">Buang keluar</button>}
            <button type="button" disabled={busy} onClick={padam} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50">Padam rekod</button>
          </div>
        </div>
      )}
    </div>
  );
}
