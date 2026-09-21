import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfil } from "@/lib/sesi";
import { PerluMasuk } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { rm, tarikhMs } from "@/lib/format";
import { labelJenis, emojiJenis, statusBantuan, labelSumber } from "@/lib/bantuan";
import { pautkanAhli } from "@/app/daftar/actions";
import BorangBantuanForm from "@/components/BorangBantuanForm";
import ButangHantar from "@/components/ButangHantar";
import { sahTerimaBantuan } from "./actions";

export const dynamic = "force-dynamic";

export default async function AhliBantuanPage() {
  if (!adminConfigured)
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Sistem belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;

  if (!profil.ahli_id) {
    const aid = await pautkanAhli();
    if (aid) profil.ahli_id = aid;
  }
  if (!profil.ahli_id) {
    return (
      <div className="mx-auto max-w-md rounded-xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Akaun belum dipautkan</h1>
        <p className="mt-2 text-sm text-slate-600">Sila lengkapkan/pautkan rekod ahli anda dahulu sebelum memohon bantuan.</p>
        <Link href="/ahli" className="mt-4 inline-block rounded-lg bg-surau px-5 py-2.5 text-sm font-semibold text-white">Ke Portal Ahli</Link>
      </div>
    );
  }

  const db = createAdminClient();
  const { data } = await db
    .from("bantuan_permohonan")
    .select("id, no_rujukan, jenis, jenis_lain, jumlah_dimohon, jumlah_lulus, sumber_dana, sebab, status, keutamaan, catatan_biro, kaedah_bayar, tarikh_bayar, pengesahan_terima, dicipta")
    .eq("ahli_id", profil.ahli_id)
    .order("dicipta", { ascending: false });
  const senarai = (data as any[]) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <div className="text-xs text-slate-500">Portal Ahli</div>
          <h1 className="text-2xl font-bold text-slate-900">Bantuan Kecemasan</h1>
        </div>
        <Link href="/ahli" className="text-sm text-surau hover:underline">← Portal Saya</Link>
      </div>

      <div className="rounded-xl border border-surau/20 bg-surau/5 p-4 text-sm text-slate-700">
        Bantuan kecemasan untuk ahli kariah yang memerlukan (wang tunai, minyak, sewa, makanan, perubatan, bil).
        Isi borang di bawah — Biro Kebajikan akan menyemak dan menghubungi anda. Maklumat anda dirahsiakan.
      </div>

      <section>
        <h2 className="mb-2 font-semibold text-slate-900">Mohon Bantuan Baharu</h2>
        <BorangBantuanForm />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Permohonan Saya</h2>
        {senarai.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-400 shadow-sm">Tiada permohonan lagi.</p>
        )}
        {senarai.map((b) => {
          const st = statusBantuan(b.status);
          return (
            <div key={b.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-xs text-slate-400">{b.no_rujukan}</div>
                  <div className="font-semibold text-slate-900">{emojiJenis(b.jenis)} {b.jenis === "lain" ? (b.jenis_lain || "Lain-lain") : labelJenis(b.jenis)}</div>
                  <div className="text-xs text-slate-500">Dihantar: {tarikhMs(b.dicipta)}{b.keutamaan === "segera" ? " · Segera" : ""}</div>
                </div>
                <div className="text-right">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${st.warna}`}>{st.label}</span>
                  {b.jumlah_lulus != null && <div className="mt-1 text-sm font-bold text-surau">{rm(b.jumlah_lulus)}</div>}
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">{b.sebab}</p>
              {b.status === "tolak" && b.catatan_biro && (
                <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">Catatan: {b.catatan_biro}</div>
              )}
              {b.status === "lulus" && (
                <div className="mt-2 rounded-lg bg-indigo-50 p-2 text-xs text-indigo-700">
                  Diluluskan{b.sumber_dana ? ` (${labelSumber(b.sumber_dana)})` : ""} — menunggu bayaran daripada Bendahari.
                </div>
              )}
              {b.status === "bayar" && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-green-50 p-2">
                  <span className="text-xs text-green-700">
                    Telah dibayar{b.kaedah_bayar ? ` · ${b.kaedah_bayar}` : ""}{b.tarikh_bayar ? ` · ${tarikhMs(b.tarikh_bayar)}` : ""}. Sila sahkan penerimaan.
                  </span>
                  <form action={sahTerimaBantuan}>
                    <input type="hidden" name="id" value={b.id} />
                    <ButangHantar className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50" pendingText="…">✓ Saya sudah terima</ButangHantar>
                  </form>
                </div>
              )}
              {b.status === "selesai" && (
                <div className="mt-2 text-xs font-semibold text-green-700">✓ Selesai — penerimaan disahkan. Alhamdulillah.</div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
