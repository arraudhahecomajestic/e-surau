import Link from "next/link";
import { getProfil, isMaster } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import AdminNav from "@/components/AdminNav";
import DokumenStafPanel from "@/components/DokumenStafPanel";

export const dynamic = "force-dynamic";

export default async function DokumenStafPage({ searchParams }: { searchParams: { staf?: string } }) {
  if (!adminConfigured)
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isMaster(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data: stafData } = await db.from("staf_gaji_config").select("profil_id, nama, jawatan").order("nama");
  const senarai = (stafData as { profil_id: string; nama: string | null; jawatan: string | null }[]) ?? [];

  const staf = searchParams.staf || senarai[0]?.profil_id || "";
  const namaStaf = senarai.find((s) => s.profil_id === staf)?.nama ?? "Staf";

  let dokumen: any[] = [];
  if (staf) {
    const { data: dokData } = await db
      .from("staf_dokumen")
      .select("id, jenis, tajuk, nama_fail, tarikh_dokumen, catatan, dimuat_naik_oleh, dicipta, url_fail")
      .eq("profil_id", staf)
      .order("dicipta", { ascending: false });
    const rows = (dokData as any[]) ?? [];
    dokumen = await Promise.all(
      rows.map(async (d) => {
        let signedUrl: string | null = null;
        if (d.url_fail) {
          const rel = String(d.url_fail).replace(/^salinan-kp\//, "");
          const { data } = await db.storage.from("salinan-kp").createSignedUrl(rel, 3600);
          signedUrl = data?.signedUrl ?? null;
        }
        return { ...d, signedUrl };
      })
    );
  }

  return (
    <div className="space-y-6">
      <AdminNav aktif="/admin/staf" nama={profil.nama ?? profil.emel ?? undefined} peranan={profil.peranan} master={profil.master} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/admin/staf" className="text-sm text-slate-500 hover:underline">← Pengurusan Staf</Link>
          <h1 className="text-2xl font-bold text-slate-900">Dokumen Staf</h1>
          <p className="mt-1 text-sm text-slate-600">Simpan surat tawaran, aku janji, WI, penilaian, slip gaji, KP & lain-lain bagi setiap staf. Fail disimpan secara sulit.</p>
        </div>
      </div>

      {senarai.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Belum ada staf berdaftar. Sila daftar staf di modul Gaji dahulu.
        </div>
      ) : (
        <DokumenStafPanel senarai={senarai} staf={staf} namaStaf={namaStaf} dokumen={dokumen} />
      )}
    </div>
  );
}
