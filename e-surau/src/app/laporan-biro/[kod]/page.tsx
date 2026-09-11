import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import MuatnaikLaporanBiro from "@/components/MuatnaikLaporanBiro";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Muat Naik Laporan Biro — Surau Ar-Raudhah",
  description: "Muat naik laporan biro untuk Buku Laporan Tahunan Mesyuarat Agung Kariah.",
};

export default async function LaporanBiroPage({ params }: { params: { kod: string } }) {
  const kod = params.kod;

  let jumpa = false;
  let nama = "";
  let ketua: string | null = null;
  let tahun = new Date().getFullYear();
  let failNama: string | null = null;
  let failMasa: string | null = null;
  let gambar: { id: string; url: string }[] = [];

  if (adminConfigured) {
    const db = createAdminClient();
    const { data: biro } = await db
      .from("agm_biro")
      .select("id, nama, ketua, fail_nama, fail_masa, agm_id")
      .eq("kod", kod)
      .maybeSingle();
    if (biro) {
      jumpa = true;
      nama = (biro.nama as string) ?? "";
      ketua = (biro.ketua as string | null) ?? null;
      failNama = (biro.fail_nama as string | null) ?? null;
      failMasa = (biro.fail_masa as string | null) ?? null;
      if (biro.agm_id) {
        const { data: agm } = await db.from("agm").select("tahun").eq("id", biro.agm_id).maybeSingle();
        if (agm?.tahun) tahun = agm.tahun as number;
      }
      const { data: g } = await db.from("agm_biro_gambar").select("id, url").eq("biro_id", biro.id).order("susunan", { ascending: true }).order("dicipta", { ascending: true });
      gambar = ((g as any[]) ?? []).map((x) => ({ id: x.id, url: x.url }));
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-5 text-center">
        <div className="text-sm font-bold text-surau">Surau Ar-Raudhah, Eco Majestic</div>
        <div className="text-xs text-slate-400">Sistem e-Surau</div>
      </div>

      {!jumpa ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          Pautan tidak sah atau biro tidak dijumpai. Sila semak semula pautan yang diberi oleh Setiausaha.
        </div>
      ) : (
        <MuatnaikLaporanBiro
          kod={kod}
          nama={nama}
          ketua={ketua}
          tahun={tahun}
          failNama={failNama}
          failMasa={failMasa}
          gambarAwal={gambar}
        />
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        Muat turun templete di bawah, isikan, kemudian muat naik semula di sini. Fail Word (.doc/.docx) atau PDF sahaja.
      </p>
    </main>
  );
}
