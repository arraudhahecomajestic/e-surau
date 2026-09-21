import { getProfil, bolehUrusBantuan, bolehBayarBantuan } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import AdminNav from "@/components/AdminNav";
import ButangHantar from "@/components/ButangHantar";
import { rm, tarikhMs } from "@/lib/format";
import { labelJenis, emojiJenis, statusBantuan, labelSumber, SUMBER_DANA } from "@/lib/bantuan";
import { tandaSemakan, luluskanBantuan, tolakBantuan, rekodBayaranBantuan, tambahDanaTabung } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminBantuanPage() {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  const bolehUrus = bolehUrusBantuan(profil);
  const bolehBayar = bolehBayarBantuan(profil);
  if (!bolehUrus && !bolehBayar) return <TiadaAkses />;

  const db = createAdminClient();
  const [pmRes, tbRes] = await Promise.all([
    db.from("bantuan_permohonan").select("*").order("dicipta", { ascending: false }),
    db.from("bantuan_tabung").select("arah, jumlah"),
  ]);
  const senarai = (pmRes.data as any[]) ?? [];
  const tabung = (tbRes.data as any[]) ?? [];

  const masuk = tabung.filter((t) => t.arah === "masuk").reduce((s, t) => s + Number(t.jumlah || 0), 0);
  const keluar = tabung.filter((t) => t.arah === "keluar").reduce((s, t) => s + Number(t.jumlah || 0), 0);
  const baki = masuk - keluar;

  // Dokumen sokongan (signed URL).
  const ids = senarai.map((b) => b.id);
  const dokMap: Record<string, { url: string }[]> = {};
  if (ids.length) {
    const { data: dok } = await db.from("bantuan_dokumen").select("permohonan_id, url").in("permohonan_id", ids);
    async function signed(path: string | null) {
      if (!path) return null;
      const rel = path.replace(/^salinan-kp\//, "");
      const { data } = await db.storage.from("salinan-kp").createSignedUrl(rel, 3600);
      return data?.signedUrl ?? null;
    }
    await Promise.all(((dok as any[]) ?? []).map(async (d) => {
      const u = await signed(d.url);
      if (u) { (dokMap[d.permohonan_id] ||= []).push({ url: u }); }
    }));
  }

  const perluTindakan = senarai.filter((b) => ["baru", "semakan"].includes(b.status)).length;
  const menungguBayar = senarai.filter((b) => b.status === "lulus").length;

  return (
    <div className="space-y-6">
      <AdminNav aktif="/admin/bantuan" nama={profil.nama ?? profil.emel ?? undefined} peranan={profil.peranan} master={profil.master} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bantuan Kecemasan · Tabung Ihsan</h1>
        <p className="mt-1 text-sm text-slate-600">Semak permohonan ahli, luluskan bantuan, dan urus baki Tabung Ihsan. Maklumat pemohon SULIT — hanya paparan agregat tanpa nama dikongsi kepada umum.</p>
      </div>

      {/* Ringkasan tabung */}
      <div className="grid gap-4 sm:grid-cols-4">
        <KadStat label="Baki Tabung" nilai={rm(baki)} warna="text-surau" />
        <KadStat label="Jumlah Masuk" nilai={rm(masuk)} warna="text-green-600" />
        <KadStat label="Jumlah Disalurkan" nilai={rm(keluar)} warna="text-slate-700" />
        <KadStat label="Perlu Tindakan" nilai={`${perluTindakan}`} warna="text-amber-600" />
      </div>

      {/* Tambah dana masuk */}
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold text-slate-900">Tambah Dana Masuk (Tabung Ihsan)</h2>
        <form action={tambahDanaTabung} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Jumlah (RM)</label>
            <input name="jumlah" inputMode="decimal" required className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" placeholder="cth: 500" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Sumber</label>
            <select name="sumber" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              {SUMBER_DANA.map((s) => <option key={s.kod} value={s.kod}>{s.label}</option>)}
              <option value="derma">Derma umum</option>
              <option value="lain">Lain-lain</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-slate-500">Keterangan</label>
            <input name="keterangan" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" placeholder="cth: kutipan tabung Jumaat" />
          </div>
          <ButangHantar className="rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" pendingText="…">Tambah</ButangHantar>
        </form>
      </section>

      {menungguBayar > 0 && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
          {menungguBayar} permohonan diluluskan — menunggu bayaran{bolehBayar ? " oleh Bendahari" : ""}.
        </div>
      )}

      {/* Senarai permohonan */}
      <section className="space-y-4">
        {senarai.length === 0 && <p className="rounded-xl bg-white p-6 text-center text-slate-400 shadow-sm">Tiada permohonan lagi.</p>}
        {senarai.map((b) => {
          const st = statusBantuan(b.status);
          const dok = dokMap[b.id] ?? [];
          return (
            <div key={b.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{b.no_rujukan}</span>
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${st.warna}`}>{st.label}</span>
                    {b.keutamaan === "segera" && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Segera</span>}
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">{emojiJenis(b.jenis)} {b.jenis === "lain" ? (b.jenis_lain || "Lain-lain") : labelJenis(b.jenis)}</div>
                  <div className="text-sm text-slate-600">{b.nama}{b.no_kp ? ` · ${String(b.no_kp).slice(0, 6)}****` : ""}{b.telefon ? ` · ${b.telefon}` : ""}</div>
                  <div className="text-xs text-slate-500">Dihantar: {tarikhMs(b.dicipta)}</div>
                  {(b.nama_bank || b.no_akaun_bank) && <div className="text-xs text-slate-500">Akaun: {b.nama_bank || "-"} {b.no_akaun_bank || ""}</div>}
                </div>
                <div className="text-right">
                  {b.jumlah_dimohon != null && <div className="text-xs text-slate-400">Dimohon: {rm(b.jumlah_dimohon)}</div>}
                  {b.jumlah_lulus != null && <div className="text-lg font-bold text-surau">{rm(b.jumlah_lulus)}</div>}
                  {b.sumber_dana && <div className="text-xs text-slate-400">{labelSumber(b.sumber_dana)}</div>}
                </div>
              </div>

              <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm text-slate-700">{b.sebab}</p>

              {dok.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {dok.map((d, i) => <a key={i} href={d.url} target="_blank" rel="noreferrer" className="font-semibold text-surau hover:underline">Dokumen {i + 1}</a>)}
                </div>
              )}

              {b.catatan_biro && <div className="mt-2 text-xs text-slate-500">Catatan: {b.catatan_biro}</div>}
              {b.diproses_nama && ["lulus", "tolak", "bayar", "selesai"].includes(b.status) && (
                <div className="text-[11px] text-slate-400">Diproses: {b.diproses_nama}{b.tarikh_tindakan ? ` · ${tarikhMs(b.tarikh_tindakan)}` : ""}</div>
              )}

              {/* Tindakan Biro: semak / lulus / tolak */}
              {bolehUrus && ["baru", "semakan"].includes(b.status) && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  {b.status === "baru" && (
                    <form action={tandaSemakan}>
                      <input type="hidden" name="id" value={b.id} />
                      <ButangHantar className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50" pendingText="…">Tanda Dalam Semakan</ButangHantar>
                    </form>
                  )}
                  <form action={luluskanBantuan} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={b.id} />
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-500">Jumlah Lulus (RM)</label>
                      <input name="jumlah_lulus" inputMode="decimal" required defaultValue={b.jumlah_dimohon ?? ""} className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-500">Sumber</label>
                      <select name="sumber_dana" required className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                        {SUMBER_DANA.map((s) => <option key={s.kod} value={s.kod}>{s.label}</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-[11px] text-slate-500">Catatan (pilihan)</label>
                      <input name="catatan" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                    </div>
                    <ButangHantar className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" pendingText="…">✓ Luluskan</ButangHantar>
                  </form>
                  <form action={tolakBantuan} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={b.id} />
                    <input name="catatan" placeholder="Sebab tolak…" className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
                    <ButangHantar className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50" pendingText="…" konfirmasi="Tolak permohonan ini?">Tolak</ButangHantar>
                  </form>
                </div>
              )}

              {/* Tindakan Bendahari: rekod bayaran */}
              {bolehBayar && b.status === "lulus" && (
                <form action={rekodBayaranBantuan} className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
                  <input type="hidden" name="id" value={b.id} />
                  <div>
                    <label className="mb-1 block text-[11px] text-slate-500">Kaedah Bayar</label>
                    <select name="kaedah_bayar" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
                      <option value="tunai">Tunai</option>
                      <option value="pindahan">Pindahan Bank</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-[11px] text-slate-500">Rujukan (pilihan)</label>
                    <input name="rujukan" className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm" placeholder="No. rujukan / resit" />
                  </div>
                  <ButangHantar className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" pendingText="…" konfirmasi="Sahkan bayaran telah dibuat? Baki tabung akan ditolak.">Rekod Bayaran</ButangHantar>
                </form>
              )}

              {b.status === "bayar" && <div className="mt-2 text-xs text-green-700">Telah dibayar{b.dibayar_nama ? ` oleh ${b.dibayar_nama}` : ""}{b.tarikh_bayar ? ` · ${tarikhMs(b.tarikh_bayar)}` : ""} — menunggu pengesahan penerimaan ahli.</div>}
              {b.status === "selesai" && <div className="mt-2 text-xs font-semibold text-green-700">✓ Selesai — penerimaan disahkan oleh ahli.</div>}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function KadStat({ label, nilai, warna }: { label: string; nilai: string; warna: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className={`text-xl font-bold ${warna}`}>{nilai}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
