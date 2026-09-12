import Link from "next/link";
import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import AgmPemilihanPanel from "@/components/AgmPemilihanPanel";

export const dynamic = "force-dynamic";

export default async function AgmPemilihanPage() {
  if (!adminConfigured) return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data: agmRows } = await db.from("agm").select("id, tajuk, tahun").order("tahun", { ascending: false }).order("dicipta", { ascending: false }).limit(1);
  const agm = (agmRows as any[])?.[0] ?? null;

  let jawatan: any[] = [];
  let calon: any[] = [];
  let ahli: any[] = [];
  if (agm?.id) {
    const [{ data: j }, { data: c }, { data: a }] = await Promise.all([
      db.from("agm_jawatan").select("*").eq("agm_id", agm.id).order("susunan", { ascending: true }),
      db.from("agm_calon").select("id, jawatan_id, nama, no_ahli, no_kp, telefon, pencadang_nama, pencadang_no_kp, pencadang_telefon, penyokong_nama, penyokong_no_kp, penyokong_telefon, status, jumlah_undi, menang, alamat, umur, status_kahwin, pekerjaan, kelayakan_akademik, ahli_berdaftar, tinggal_dalam_kariah, pengalaman_tadbir, pengalaman_tempoh, ada_penyakit, penyakit_nyatakan, tarikh_borang, borang_diisi").eq("agm_id", agm.id).order("dicipta", { ascending: true }),
      db.from("ahli_kariah").select("id, no_ahli, nama, no_kp, telefon, alamat, alamat_kp").eq("status", "lulus").order("nama", { ascending: true }).limit(5000),
    ]);
    jawatan = (j as any[]) ?? [];
    calon = (c as any[]) ?? [];
    ahli = ((a as any[]) ?? []).map((x) => ({ id: x.id, no_ahli: x.no_ahli, nama: x.nama, no_kp: x.no_kp, telefon: x.telefon, alamat: x.alamat || x.alamat_kp || null }));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/agm" className="text-sm text-surau hover:underline">← Kembali ke AGM</Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pemilihan Ahli Jawatankuasa</h1>
        <p className="mt-1 text-sm text-slate-600">Jawatan dipertanding, pencalonan (pencadang &amp; penyokong), dan kiraan undi secara angkat tangan. Pemenang ditentukan ikut undi tertinggi atau menang tanpa bertanding.</p>
      </div>
      {!agm ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Sila cipta maklumat AGM dahulu di <Link href="/admin/agm" className="font-semibold underline">halaman AGM</Link>.
        </div>
      ) : jawatan.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Belum ada jawatan. Sila jalankan <b>agm_pemilihan_fasa73.sql</b> di Supabase (ia menyemai senarai jawatan), kemudian muat semula halaman ini.
        </div>
      ) : (
        <AgmPemilihanPanel agmId={agm.id} jawatan={jawatan} calon={calon} ahli={ahli} />
      )}
    </div>
  );
}
