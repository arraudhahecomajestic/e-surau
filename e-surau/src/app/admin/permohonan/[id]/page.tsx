import Link from "next/link";
import { getProfil, isPentadbir, isAdmin } from "@/lib/sesi";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import AdminNav from "@/components/AdminNav";
import { tarikhMs } from "@/lib/format";
import GambarSulit from "@/components/GambarSulit";
import SulitTeks from "@/components/SulitTeks";
import ButangHantar from "@/components/ButangHantar";
import AkaunAhliTindakan from "@/components/AkaunAhliTindakan";
import { ulasanSU, ulasanNazir, keputusan } from "./actions";

export const dynamic = "force-dynamic";

export default async function PermohonanPage({ params }: { params: { id: string } }) {
  if (!adminConfigured)
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;
  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  const db = createAdminClient();
  const { data } = await db
    .from("ahli_kariah")
    .select("*, tanggungan(nama, hubungan, no_kp, dilindungi_khairat)")
    .eq("id", params.id)
    .single();
  if (!data) return <p className="text-slate-500">Permohonan tidak dijumpai.</p>;
  const a: any = data;

  async function signed(path: string | null) {
    if (!path) return null;
    const rel = path.replace(/^salinan-kp\//, "");
    const { data } = await db.storage.from("salinan-kp").createSignedUrl(rel, 3600);
    return data?.signedUrl ?? null;
  }
  const [depan, belakang, selfie, ttd] = await Promise.all([
    signed(a.url_kp_depan),
    signed(a.url_kp_belakang),
    signed(a.url_selfie),
    signed(a.url_tandatangan),
  ]);
  const bolehKeputusan = profil.peranan === "admin";
  const tempoh = a.tempoh_menetap_nilai ? `${a.tempoh_menetap_nilai} ${a.tempoh_menetap_unit ?? ""}` : "-";

  return (
    <div className="space-y-6">
      <AdminNav aktif="/admin" nama={profil.nama ?? profil.emel ?? undefined} peranan={profil.peranan} master={profil.master} />
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-slate-500 hover:underline">← Senarai permohonan</Link>
          <h1 className="text-2xl font-bold text-slate-900">{[a.gelaran, a.nama].filter(Boolean).join(" ")}</h1>
          <p className="flex items-center gap-1 text-sm text-slate-500">{a.no_ahli} · <SulitTeks nilai={a.no_kp} jenis="kp" /></p>
          {a.maklumat_disahkan
            ? <p className="mt-1 text-xs font-medium text-green-600">✓ Maklumat disahkan{a.tarikh_kemaskini ? ` pada ${tarikhMs(a.tarikh_kemaskini)}` : ""}</p>
            : <p className="mt-1 text-xs font-medium text-orange-600">Belum kemas kini maklumat</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded px-3 py-1 text-sm font-semibold ${a.status === "lulus" ? "bg-green-100 text-green-700" : a.status === "tolak" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
            {a.status}
          </span>
          <Link href={`/admin/permohonan/${a.id}/cetak`} className="rounded-lg border border-surau/40 px-3 py-1.5 text-xs font-semibold text-surau hover:bg-surau/10">
            Cetak Borang + IC
          </Link>
        </div>
      </div>

      {/* BAHAGIAN A */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-surau">BAHAGIAN A · Butiran Ahli</h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row k="Alamat dalam KP" v={a.alamat_kp} />
          <Row k="Alamat sekarang" v={a.alamat} />
          <div className="flex justify-between border-b border-slate-100 py-1"><dt className="text-slate-500">Telefon Rumah</dt><dd className="text-right font-medium text-slate-800"><SulitTeks nilai={a.no_telefon_rumah} jenis="tel" /></dd></div>
          <div className="flex justify-between border-b border-slate-100 py-1"><dt className="text-slate-500">No. H/P</dt><dd className="text-right font-medium text-slate-800"><SulitTeks nilai={a.telefon} jenis="tel" /></dd></div>
          <Row k="E-mel" v={a.emel} />
          <Row k="Status Perkahwinan" v={a.status_perkahwinan} />
          <Row k="Tempoh Menetap" v={tempoh} />
          <Row k="Pengakuan" v={a.pengakuan ? "✓ Diakui benar" : "—"} />
        </dl>

        {(depan || belakang) && (
          <div className="mt-4">
            <div className="mb-1 text-sm font-medium text-slate-700">Gambar Kad Pengenalan</div>
            <div className="flex flex-wrap gap-3">
              {depan && <a href={depan} target="_blank"><GambarSulit src={depan} alt="IC Depan" className="rounded border" imgStyle={{ height: 112 }} /></a>}
              {belakang && <a href={belakang} target="_blank"><GambarSulit src={belakang} alt="IC Belakang" className="rounded border" imgStyle={{ height: 112 }} /></a>}
            </div>
          </div>
        )}

        {(selfie || ttd) && (
          <div className="mt-4">
            <div className="mb-1 text-sm font-medium text-slate-700">
              Pengesahan Identiti {a.disahkan_esign ? <span className="ml-1 rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">✓ e-Sah</span> : null}
            </div>
            <div className="flex flex-wrap items-start gap-4">
              {selfie && (
                <div className="text-center text-xs text-slate-500">
                  <a href={selfie} target="_blank"><GambarSulit src={selfie} alt="Swafoto" className="rounded border" imgStyle={{ height: 112 }} /></a>
                  <div className="mt-1">Swafoto</div>
                </div>
              )}
              {ttd && (
                <div className="text-center text-xs text-slate-500">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <a href={ttd} target="_blank"><img src={ttd} alt="Tandatangan" className="h-28 rounded border bg-white" /></a>
                  <div className="mt-1">e-Tandatangan{a.tarikh_esign ? ` · ${tarikhMs(a.tarikh_esign)}` : ""}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {a.tanggungan?.length > 0 && (
          <div className="mt-4 text-sm">
            <div className="mb-1 font-medium text-slate-700">Tanggungan:</div>
            <ul className="list-inside list-disc text-slate-600">
              {a.tanggungan.map((t: any, i: number) => (
                <li key={i}>{t.nama} ({t.hubungan}){t.dilindungi_khairat ? " · khairat" : ""}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* BAHAGIAN B1 */}
      <UlasanSeksyen
        tajuk="BAHAGIAN B1 · Ulasan Setiausaha / Pengerusi MPKK"
        sokong={a.ulasan_su_sokong}
        catatan={a.ulasan_su_catatan}
        oleh={a.ulasan_su_oleh}
        tarikh={a.ulasan_su_tarikh}
        action={ulasanSU.bind(null, a.id)}
      />

      {/* BAHAGIAN B2 */}
      <UlasanSeksyen
        tajuk="BAHAGIAN B2 · Ulasan Nazir / Pengerusi Surau"
        sokong={a.ulasan_nazir_sokong}
        catatan={a.ulasan_nazir_catatan}
        oleh={a.ulasan_nazir_oleh}
        tarikh={a.ulasan_nazir_tarikh}
        action={ulasanNazir.bind(null, a.id)}
      />

      {/* BAHAGIAN C */}
      <section className="rounded-xl border-2 border-surau/30 bg-surau/5 p-5">
        <h2 className="mb-3 font-semibold text-slate-900">BAHAGIAN C · Keputusan Jawatankuasa Kariah</h2>
        {a.status !== "menunggu" ? (
          <p className="text-sm text-slate-700">
            Keputusan: <b>{a.status === "lulus" ? "Diluluskan" : "Tidak Diluluskan"}</b>
            {a.keputusan_oleh ? ` · oleh ${a.keputusan_oleh}` : ""} {a.keputusan_tarikh ? `· ${tarikhMs(a.keputusan_tarikh)}` : ""}
          </p>
        ) : bolehKeputusan ? (
          <div className="flex flex-wrap gap-2">
            <form action={keputusan.bind(null, a.id)}>
              <input type="hidden" name="keputusan" value="lulus" />
              <ButangHantar className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60" pendingText="Memproses…">
                ✓ Luluskan Permohonan
              </ButangHantar>
            </form>
            <form action={keputusan.bind(null, a.id)}>
              <input type="hidden" name="keputusan" value="tolak" />
              <ButangHantar className="rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200 disabled:opacity-60" pendingText="Memproses…">
                ✗ Tidak Luluskan
              </ButangHantar>
            </form>
          </div>
        ) : (
          <p className="text-sm text-amber-700">Hanya admin / Pengerusi JK boleh membuat keputusan akhir. Sila pastikan ulasan B1 & B2 selesai dahulu.</p>
        )}
      </section>

      {/* Pengurusan Akaun — admin/master sahaja */}
      {isAdmin(profil) && (
        <AkaunAhliTindakan ahliId={a.id} nama={a.nama ?? ""} noAhli={a.no_ahli ?? ""} emel={a.emel ?? null} />
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium text-slate-800">{v || "-"}</dd>
    </div>
  );
}

function UlasanSeksyen({
  tajuk, sokong, catatan, oleh, tarikh, action,
}: {
  tajuk: string;
  sokong: boolean | null;
  catatan: string | null;
  oleh: string | null;
  tarikh: string | null;
  action: (formData: FormData) => void;
}) {
  const sudah = sokong !== null && sokong !== undefined;
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-semibold text-slate-900">{tajuk}</h2>
      {sudah && (
        <div className={`mb-3 rounded-lg p-3 text-sm ${sokong ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          <b>{sokong ? "☑ Menyokong" : "☒ Tidak Menyokong"}</b>
          {catatan ? ` — ${catatan}` : ""}
          <div className="mt-1 text-xs text-slate-500">Oleh: {oleh ?? "-"} · {tarikh ? tarikhMs(tarikh) : ""}</div>
        </div>
      )}
      <form action={action} className="space-y-3">
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input type="radio" name="sokong" value="ya" defaultChecked={sokong === true} required /> Menyokong
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="sokong" value="tidak" defaultChecked={sokong === false} /> Tidak Menyokong
          </label>
        </div>
        <input name="catatan" defaultValue={catatan ?? ""} placeholder="Catatan (pilihan)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-surau" />
        <ButangHantar className="rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white hover:bg-surau-dark disabled:opacity-60" pendingText="Menyimpan…">
          {sudah ? "Kemas kini ulasan" : "Simpan ulasan"}
        </ButangHantar>
      </form>
    </section>
  );
}
