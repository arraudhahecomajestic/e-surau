import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import UsulKariah from "@/components/UsulKariah";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cadangan Usul AGM — Surau Ar-Raudhah",
  description: "Hantar cadangan usul untuk Mesyuarat Agung Kariah Surau Ar-Raudhah.",
};

export default async function UsulAgmPage({ params }: { params: { kod: string } }) {
  const kod = params.kod;
  let tajuk = "Mesyuarat Agung Kariah";
  let tahun = new Date().getFullYear();
  let jumpa = false;

  if (adminConfigured) {
    const db = createAdminClient();
    const { data: agm } = await db.from("agm").select("tajuk, tahun").eq("kod", kod).maybeSingle();
    if (agm) { jumpa = true; tajuk = (agm.tajuk as string) ?? tajuk; tahun = (agm.tahun as number) ?? tahun; }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-5 text-center">
        <div className="text-sm font-bold text-surau">Surau Ar-Raudhah, Eco Majestic</div>
        <div className="text-xs text-slate-400">Sistem e-Surau</div>
      </div>

      {!jumpa ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          Pautan tidak sah atau mesyuarat tidak dijumpai. Sila semak semula pautan.
        </div>
      ) : (
        <UsulKariah kod={kod} tajuk={tajuk} tahun={tahun} />
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        Masukkan no. kad pengenalan anda — nama & telefon dikesan automatik. Usul akan dihantar kepada Setiausaha untuk pertimbangan mesyuarat.
      </p>
    </main>
  );
}
