import Link from "next/link";
import { laksanakanBayaran } from "@/lib/bayaran";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export default async function SelesaiIhyaRamadan({ searchParams }: { searchParams: { ref?: string; gagal?: string } }) {
  const gagal = searchParams?.gagal === "1";
  let dibayar = false;

  if (!gagal && adminConfigured && searchParams?.ref) {
    const db = createAdminClient();
    const { data } = await db.from("bayaran").select("chip_id, status").eq("no_rujukan", searchParams.ref).maybeSingle();
    const chipId = (data as any)?.chip_id;
    if ((data as any)?.status === "dibayar") dibayar = true;
    else if (chipId) {
      try { const r = await laksanakanBayaran(String(chipId)); dibayar = r.dibayar; } catch { /* abaikan */ }
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      {gagal || !dibayar ? (
        <>
          <div className="text-5xl">😔</div>
          <h1 className="mt-3 text-xl font-bold text-slate-900">Sumbangan Belum Lengkap</h1>
          <p className="mt-2 text-sm text-slate-600">
            Pembayaran tidak selesai atau dibatalkan. Tiada caj dikenakan. Anda boleh cuba semula.
          </p>
          <Link href="/ihya-ramadan" className="mt-5 inline-block rounded-lg bg-surau px-5 py-2.5 font-semibold text-white hover:bg-surau-dark">Cuba Lagi</Link>
        </>
      ) : (
        <>
          <div className="text-5xl">🌙🤲</div>
          <h1 className="mt-3 text-xl font-bold text-slate-900">Jazakallahu Khairan!</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sumbangan anda untuk Tabung Ihya Ramadan telah diterima. Resit dihantar ke e-mel anda.
            Semoga Allah SWT membalas dengan kebaikan yang berlipat ganda. Aamiin.
          </p>
          <Link href="/ihya-ramadan" className="mt-5 inline-block rounded-lg border border-surau/40 px-5 py-2.5 font-semibold text-surau hover:bg-surau/5">Kembali ke Tabung</Link>
        </>
      )}
    </div>
  );
}
