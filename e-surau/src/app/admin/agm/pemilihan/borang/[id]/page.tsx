import Link from "next/link";
import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import BorangMaklumatDiri, { GayaBorangDiri, type CalonDiri } from "@/components/BorangMaklumatDiri";
import ButangCetakBorang from "@/components/ButangCetakBorang";

export const dynamic = "force-dynamic";

export default async function BorangDiriCalonPage({ params }: { params: { id: string } }) {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data } = await db
    .from("agm_calon")
    .select("id, jawatan_id, ahli_id, nama, no_kp, alamat, telefon, umur, status_kahwin, pekerjaan, kelayakan_akademik, ahli_berdaftar, tinggal_dalam_kariah, pengalaman_tadbir, pengalaman_tempoh, ada_penyakit, penyakit_nyatakan, tarikh_borang")
    .eq("id", params.id)
    .maybeSingle();
  const c: any = data;

  if (!c)
    return (
      <div className="space-y-4">
        <Link href="/admin/agm/pemilihan" className="text-sm text-surau hover:underline">← Kembali ke Pemilihan</Link>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Rekod calon tidak dijumpai.</div>
      </div>
    );

  let jawatanNama: string | null = null;
  if (c.jawatan_id) {
    const { data: j } = await db.from("agm_jawatan").select("nama").eq("id", c.jawatan_id).maybeSingle();
    jawatanNama = (j as any)?.nama ?? null;
  }

  // Auto-lengkap dari rekod ahli kariah jika medan calon kosong.
  if (c.ahli_id) {
    const { data: ah } = await db.from("ahli_kariah").select("alamat, telefon, no_kp, status_perkahwinan, status").eq("id", c.ahli_id).maybeSingle();
    const a: any = ah;
    if (a) {
      c.alamat = c.alamat || a.alamat || null;
      c.telefon = c.telefon || a.telefon || null;
      c.no_kp = c.no_kp || a.no_kp || null;
      if (!c.status_kahwin && a.status_perkahwinan) {
        const s = String(a.status_perkahwinan).toLowerCase();
        c.status_kahwin = s.includes("kahwin") ? "berkahwin" : s.includes("bujang") ? "bujang" : c.status_kahwin;
      }
      // Ahli berdaftar & tinggal dalam kariah — dia memang ahli kariah berdaftar.
      if (c.ahli_berdaftar === null || c.ahli_berdaftar === undefined) c.ahli_berdaftar = true;
      if (c.tinggal_dalam_kariah === null || c.tinggal_dalam_kariah === undefined) c.tinggal_dalam_kariah = true;
    }
  }
  // Umur — kira dari No. KP (YYMMDD) jika kosong.
  if (!c.umur && c.no_kp) {
    const d = String(c.no_kp).replace(/\D/g, "");
    if (d.length >= 6) {
      const yy = parseInt(d.slice(0, 2), 10), mm = parseInt(d.slice(2, 4), 10), dd = parseInt(d.slice(4, 6), 10);
      const kini = new Date();
      const abadYY = kini.getFullYear() % 100;
      const tahun = yy <= abadYY ? 2000 + yy : 1900 + yy;
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        let umur = kini.getFullYear() - tahun;
        const belumUlangTahun = kini.getMonth() + 1 < mm || (kini.getMonth() + 1 === mm && kini.getDate() < dd);
        if (belumUlangTahun) umur -= 1;
        if (umur >= 0 && umur < 130) c.umur = String(umur);
      }
    }
  }

  const calon: CalonDiri = { ...c, jawatan_nama: jawatanNama };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Borang Maklumat Diri (BOR-BPM-01)</h1>
          <p className="text-sm text-slate-600">{c.nama} · {jawatanNama || "—"}. Klik butang untuk cetak / simpan sebagai PDF.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/agm/pemilihan" className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">← Pemilihan</Link>
          <ButangCetakBorang label="Cetak / Simpan PDF" />
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-sm">
        <BorangMaklumatDiri c={calon} />
      </div>

      <GayaBorangDiri />
    </div>
  );
}
