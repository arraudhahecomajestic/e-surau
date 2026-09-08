import { getProfil, isPentadbir, isMaster, isAdmin } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import AdminNav from "@/components/AdminNav";
import AdminStafPanel from "@/components/AdminStafPanel";
import JadualKerjaStaf from "@/components/JadualKerjaStaf";
import KehadiranBulanan from "@/components/KehadiranBulanan";
import { hariIni } from "@/lib/staf";

export const dynamic = "force-dynamic";

export default async function AdminStafPage() {
  if (!adminConfigured)
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isAdmin(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const tarikh = hariIni();

  const [kehadiranRes, tugasRes, laporanRes, itemRes, logRes] = await Promise.all([
    db.from("staf_kehadiran").select("id, nama, shift, masuk, keluar").eq("tarikh", tarikh).order("masuk", { ascending: true }),
    db.from("staf_tugasan").select("id, tajuk, keterangan, status, tarikh_tugas, tarikh_siap, nota_siap").neq("status", "batal").order("tarikh_tugas", { ascending: false }).limit(50),
    db.from("staf_laporan").select("id, tajuk, keterangan, url_gambar, status, oleh, tindakan, tarikh").order("tarikh", { ascending: false }).limit(50),
    db.from("staf_checklist_item").select("id, tajuk, shift, aktif").order("susunan", { ascending: true }),
    db.from("staf_log").select("id, nama, shift, catatan, dicipta").order("dicipta", { ascending: false }).limit(30),
  ]);

  const kehadiran = (kehadiranRes.data ?? []) as any[];
  const tugasan = (tugasRes.data ?? []) as any[];
  const laporan = (laporanRes.data ?? []) as any[];
  const checklist = (itemRes.data ?? []) as any[];
  const log = (logRes.data ?? []) as any[];

  // Jadual kerja akan datang (dari hari ini)
  const { data: jadualData } = await db
    .from("staf_jadual")
    .select("id, tarikh, shift, catatan")
    .gte("tarikh", tarikh)
    .order("tarikh", { ascending: true })
    .limit(60);
  const jadual = (jadualData as any[]) ?? [];

  // Review bulanan: jadual + kehadiran untuk bulan semasa (waktu Malaysia)
  const bulanSemasa = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).slice(0, 7);
  const awalBln = `${bulanSemasa}-01`;
  const akhirHari = new Date(Number(bulanSemasa.slice(0, 4)), Number(bulanSemasa.slice(5, 7)), 0).getDate();
  const akhirBln = `${bulanSemasa}-${String(akhirHari).padStart(2, "0")}`;
  const [{ data: jBln }, { data: kBln }] = await Promise.all([
    db.from("staf_jadual").select("tarikh, shift, catatan, nama").gte("tarikh", awalBln).lte("tarikh", akhirBln).order("tarikh", { ascending: true }),
    db.from("staf_kehadiran").select("tarikh, shift, masuk, keluar, nama").gte("tarikh", awalBln).lte("tarikh", akhirBln).order("tarikh", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <AdminNav aktif="/admin/staf" nama={profil.nama ?? profil.emel ?? undefined} peranan={profil.peranan} master={profil.master} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pengurusan Staf Surau</h1>
          <p className="mt-1 text-sm text-slate-600">Pantau kehadiran, beri tugasan, uruskan laporan &amp; templat tugas harian Penolong Pengurus Surau.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/admin/staf/wi" className="rounded-lg border border-surau/40 px-4 py-2 text-sm font-semibold text-surau hover:bg-surau/10">Arahan Kerja (WI)</a>
          <a href="/admin/staf/penilaian" className="rounded-lg border border-surau/40 px-4 py-2 text-sm font-semibold text-surau hover:bg-surau/10">Penilaian Prestasi</a>
          <a href="/admin/staf/dokumen" className="rounded-lg border border-surau/40 px-4 py-2 text-sm font-semibold text-surau hover:bg-surau/10">Dokumen Staf</a>
          <a href="/admin/staf/gaji" className="rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white hover:bg-surau-dark">Gaji Staf</a>
        </div>
      </div>
      <JadualKerjaStaf awal={jadual} />
      <KehadiranBulanan awal={{ bulan: bulanSemasa, jadual: (jBln as any[]) ?? [], kehadiran: (kBln as any[]) ?? [] }} />
      <AdminStafPanel kehadiran={kehadiran} tugasan={tugasan} laporan={laporan} checklist={checklist} log={log} />
    </div>
  );
}
