import Link from "next/link";
import { getProfil, isPentadbir } from "@/lib/sesi";
import { PerluMasuk } from "@/components/PerluMasuk";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { rm, tarikhMs } from "@/lib/format";
import { sertaiKhairat } from "./actions";
import { pautkanAhli } from "@/app/daftar/actions";
import PautRekodForm from "@/components/PautRekodForm";
import BayarKhairatButton from "@/components/BayarKhairatButton";
import ButangHantar from "@/components/ButangHantar";
import { khairatDibuka, bayaranOnlineDibuka, yuranKhairat, pampasanKhairat } from "@/lib/tetapanSistem";

export const dynamic = "force-dynamic";

const TAHUN = new Date().getFullYear();

export default async function AhliPage() {
  if (!adminConfigured)
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Sistem belum dikonfigurasi.</div>;

  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;

  // Cuba auto-paut ke rekod ahli ikut e-mel (cth pembekal yang baru daftar kariah).
  if (!profil.ahli_id) {
    const aid = await pautkanAhli();
    if (aid) profil.ahli_id = aid;
  }

  // Akaun belum dipaut ke rekod ahli — beri cara paut sendiri guna No. KP
  if (!profil.ahli_id) {
    return (
      <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-center text-lg font-bold text-slate-900">Akaun belum dipautkan</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Akaun anda ({profil.emel}) belum dipautkan ke sebarang rekod ahli kariah.
        </p>

        <PautRekodForm />

        {profil.pembekal_id && (
          <div className="mt-4 rounded-lg border border-surau/30 bg-surau/5 p-3 text-center text-sm">
            <p className="text-slate-600">Anda log masuk sebagai pembekal.</p>
            <Link href="/pembekal/portal" className="mt-2 inline-block rounded-lg bg-surau px-4 py-2 text-sm font-semibold text-white hover:bg-surau-dark">Ke Portal Pembekal →</Link>
          </div>
        )}

        {["admin", "bendahari", "ajk"].includes(profil.peranan) && (
          <div className="mt-5 border-t pt-4 text-center">
            <Link href={profil.peranan === "bendahari" ? "/admin/kewangan" : "/admin"} className="inline-block rounded-lg bg-hitam px-5 py-2.5 text-sm font-semibold text-white">
              {profil.peranan === "bendahari" ? "Ke Panel Kewangan →" : "Ke Panel Admin →"}
            </Link>
          </div>
        )}
      </div>
    );
  }

  const db = createAdminClient();
  const [ahliRes, khairatRes, kutipanRes, invoisRes] = await Promise.all([
    db.from("ahli_kariah").select("*, tanggungan(nama, hubungan, dilindungi_khairat)").eq("id", profil.ahli_id).single(),
    db.from("keahlian_khairat").select("id, no_khairat, status, kadar_yuran_tahunan, yuran_khairat(tahun, lunas)").eq("ahli_id", profil.ahli_id).maybeSingle(),
    db.from("kutipan").select("no_resit, jumlah, tarikh, kategori:kategori_kutipan(nama)").eq("ahli_id", profil.ahli_id).order("tarikh", { ascending: false }).limit(20),
    db.from("invois").select("no_invois, jumlah, status, tarikh").eq("ahli_id", profil.ahli_id).order("tarikh", { ascending: false }).limit(20),
  ]);

  const a: any = ahliRes.data;
  const kh: any = khairatRes.data;
  const kutipan = (kutipanRes.data as any[]) ?? [];
  const invois = (invoisRes.data as any[]) ?? [];
  const yuranTahunIni = kh?.yuran_khairat?.some((y: any) => y.tahun === TAHUN && y.lunas);
  // Semasa ujian: khairat nampak untuk pentadbir walaupun belum dilancarkan umum.
  const dibuka = await khairatDibuka();
  const bayaranDibuka = await bayaranOnlineDibuka();
  const yuran = await yuranKhairat();
  const pampasan = await pampasanKhairat();
  const bolehKhairat = dibuka || isPentadbir(profil);
  const modUjian = bolehKhairat && !dibuka;

  // Elak pertindihan: adakah ahli ini dilindungi sebagai tanggungan di bawah
  // khairat orang lain? (padan No. KP)
  let dilindungiBawah: string | null = null;
  if (dibuka && a?.no_kp && kh?.status !== "aktif") {
    const { data: tgRows } = await db
      .from("tanggungan")
      .select("ahli_id")
      .eq("no_kp", a.no_kp)
      .eq("dilindungi_khairat", true)
      .neq("ahli_id", profil.ahli_id);
    const idIbuBapa = [...new Set(((tgRows as any[]) ?? []).map((r) => r.ahli_id))];
    if (idIbuBapa.length) {
      const { data: pembayar } = await db
        .from("ahli_kariah")
        .select("nama, keahlian_khairat(status)")
        .in("id", idIbuBapa);
      const aktif = ((pembayar as any[]) ?? []).find((pp) =>
        (pp.keahlian_khairat ?? []).some((k: any) => k.status === "aktif")
      );
      if (aktif) dilindungiBawah = aktif.nama;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <div className="text-xs text-slate-500">Portal Ahli</div>
          <h1 className="text-2xl font-bold text-slate-900">{[a?.gelaran, a?.nama].filter(Boolean).join(" ")}</h1>
          <p className="text-sm text-slate-500">{a?.no_ahli}</p>
        </div>
        <div className="flex items-center gap-4">
          {profil.pembekal_id && (
            <Link href="/pembekal/portal" className="rounded-lg border border-surau/40 px-3 py-1 text-sm font-medium text-surau hover:bg-surau/10">
              Portal Pembekal →
            </Link>
          )}
          <Link href="/ahli/tukar-kata-laluan" className="text-sm text-slate-500 hover:underline">
            Tukar kata laluan
          </Link>
          <form action="/masuk/logout" method="post">
            <button className="text-sm text-slate-500 hover:underline">Log keluar</button>
          </form>
        </div>
      </div>

      {/* Banner status kemas kini — dua keadaan sahaja */}
      {a?.maklumat_disahkan ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-green-300 bg-green-50 p-4">
          <div>
            <div className="font-bold text-green-800">Maklumat Anda Telah Dikemaskini</div>
            <p className="mt-0.5 text-sm text-green-700">Terima kasih!{a.tarikh_kemaskini ? ` Dikemaskini pada ${tarikhMs(a.tarikh_kemaskini)}.` : ""}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/ahli/borang" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">Muat Turun Borang</Link>
            <Link href="/ahli/kemaskini" className="text-sm font-medium text-green-800 underline">Kemas kini semula</Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-red-400 bg-red-50 p-4">
          <div className="font-bold text-red-700">Maklumat Anda Belum Lengkap</div>
          <p className="mt-1 text-sm text-red-600">
            Rekod anda belum dikemaskini. Sila lengkapkan sekarang (alamat, telefon, gambar IC, tanggungan) untuk melengkapkan pendaftaran keahlian anda.
          </p>
          <Link href="/ahli/kemaskini" className="mt-3 inline-block rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
            Kemas Kini Sekarang
          </Link>
        </div>
      )}

      {/* Status permohonan */}
      <div className={`grid gap-4 ${bolehKhairat ? "sm:grid-cols-3" : "sm:grid-cols-1"}`}>
        <Kad label="Status Keahlian" nilai={a?.status === "lulus" ? "Diluluskan" : a?.status === "tolak" ? "Tidak Diluluskan" : "Menunggu"} warna={a?.status === "lulus" ? "text-green-600" : a?.status === "tolak" ? "text-red-600" : "text-amber-600"} />
        {bolehKhairat && (
          <>
            <Kad label="Khairat Kematian" nilai={kh ? (kh.status === "aktif" ? "Aktif" : "Tertunggak") : dilindungiBawah ? "Dilindungi" : "Tidak sertai"} warna={kh?.status === "aktif" || dilindungiBawah ? "text-green-600" : "text-slate-500"} />
            <Kad label={`Yuran Khairat ${TAHUN}`} nilai={kh ? (yuranTahunIni ? "Selesai" : "Belum bayar") : "-"} warna={yuranTahunIni ? "text-green-600" : "text-red-600"} />
          </>
        )}
      </div>

      {/* Skim Khairat Kematian */}
      {/* Maklum balas semakan — supaya pemohon tahu keputusan & ulasan */}
      {(a?.status === "tolak" || a?.ulasan_su_sokong != null || a?.ulasan_nazir_sokong != null) && (
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">Maklum Balas Semakan Permohonan</h2>
          <div className="space-y-2">
            <BarisSemakan
              tajuk="Semakan Setiausaha (SU)"
              sokong={a?.ulasan_su_sokong}
              catatan={a?.ulasan_su_catatan}
            />
            <BarisSemakan
              tajuk="Semakan Nazir / Pengerusi"
              sokong={a?.ulasan_nazir_sokong}
              catatan={a?.ulasan_nazir_catatan}
            />
            {a?.status === "tolak" && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <b>✗ Permohonan anda TIDAK diluluskan.</b> Sila hubungi pejabat surau (arraudhah.ecomajestic@gmail.com)
                untuk penjelasan lanjut atau maklumat tambahan yang diperlukan.
              </div>
            )}
            {a?.status === "lulus" && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                <b>✓ Permohonan anda telah diluluskan.</b> Selamat datang sebagai ahli kariah.
              </div>
            )}
          </div>
        </section>
      )}

      {bolehKhairat && (
      <section className="rounded-xl border-2 border-surau/30 bg-surau/5 p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Skim Khairat Kematian</h2>
          {modUjian && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Mod ujian (belum dilancarkan umum)</span>}
        </div>
        {!kh && dilindungiBawah ? (
          <p className="text-sm text-slate-700">
            ✓ Anda <b className="text-green-700">dilindungi khairat</b> sebagai tanggungan di bawah{" "}
            <b>{dilindungiBawah}</b>. Anda tidak perlu menyertai atau membayar yuran secara berasingan.
          </p>
        ) : !kh ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Anda belum menyertai skim khairat. Yuran <b>RM{yuran} setahun</b>, pampasan tetap
              <b> {rm(pampasan)}</b> setiap kematian ahli atau tanggungan yang dilindungi.
            </p>
            <BayarKhairatButton bayaranDibuka={bayaranDibuka} yuran={yuran} />
            <form action={sertaiKhairat}>
              <ButangHantar className="text-xs text-slate-500 underline disabled:opacity-50" pendingText="Sila tunggu…">atau sertai dahulu & bayar tunai di kaunter</ButangHantar>
            </form>
          </div>
        ) : kh.status === "aktif" && yuranTahunIni ? (
          <p className="text-sm text-slate-700">
            ✓ Keahlian khairat anda <b className="text-green-700">AKTIF</b>. No. Khairat: {kh.no_khairat}.
            Yuran {TAHUN}: <b>Selesai</b>.
          </p>
        ) : (
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              Keahlian khairat anda{kh.no_khairat ? ` (No. ${kh.no_khairat})` : ""} — Yuran {TAHUN}:
              <b className="text-red-600"> Belum bayar</b>.
            </p>
            <BayarKhairatButton bayaranDibuka={bayaranDibuka} yuran={yuran} />
            <p className="text-xs text-slate-500">Bayaran diproses oleh CHIP (FPX / kad / e-wallet). Atau bayar tunai di kaunter surau.</p>
          </div>
        )}
      </section>
      )}

      {/* Maklumat diri */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-surau">Maklumat Saya</h2>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row k="No. KP" v={a?.no_kp} />
          <Row k="Telefon" v={a?.telefon} />
          <Row k="E-mel" v={a?.emel} />
          <Row k="Alamat" v={a?.alamat} />
        </dl>
        {a?.tanggungan?.length > 0 && (
          <div className="mt-3 text-sm">
            <div className="font-medium text-slate-700">Tanggungan:</div>
            <ul className="list-inside list-disc text-slate-600">
              {a.tanggungan.map((t: any, i: number) => (<li key={i}>{t.nama} ({t.hubungan}){t.dilindungi_khairat ? " · dilindungi khairat" : ""}</li>))}
            </ul>
          </div>
        )}
      </section>

      {/* Sejarah sumbangan */}
      <section className="rounded-xl bg-white shadow-sm">
        <h2 className="border-b px-5 py-3 font-semibold text-slate-900">Sejarah Sumbangan & Resit</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-2">Resit</th><th className="px-4 py-2">Tarikh</th><th className="px-4 py-2">Kategori</th><th className="px-4 py-2 text-right">Jumlah</th></tr>
            </thead>
            <tbody>
              {kutipan.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Tiada sumbangan direkod lagi.</td></tr>}
              {kutipan.map((k, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-2 font-mono text-xs">{k.no_resit}</td>
                  <td className="px-4 py-2">{tarikhMs(k.tarikh)}</td>
                  <td className="px-4 py-2">{k.kategori?.nama}</td>
                  <td className="px-4 py-2 text-right font-medium">{rm(k.jumlah)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invois */}
      {invois.length > 0 && (
        <section className="rounded-xl bg-white shadow-sm">
          <h2 className="border-b px-5 py-3 font-semibold text-slate-900">Invois / Bil</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-2">No.</th><th className="px-4 py-2">Tarikh</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Jumlah</th></tr>
              </thead>
              <tbody>
                {invois.map((v, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{v.no_invois}</td>
                    <td className="px-4 py-2">{tarikhMs(v.tarikh)}</td>
                    <td className="px-4 py-2">{v.status}</td>
                    <td className="px-4 py-2 text-right font-medium">{rm(v.jumlah)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Kad({ label, nilai, warna }: { label: string; nilai: string; warna: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className={`text-lg font-bold ${warna}`}>{nilai}</div>
      <div className="text-xs text-slate-500">{label}</div>
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

function BarisSemakan({ tajuk, sokong, catatan }: { tajuk: string; sokong?: boolean | null; catatan?: string | null }) {
  const belum = sokong === null || sokong === undefined;
  const warna = belum ? "bg-slate-50 text-slate-500" : sokong ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700";
  const label = belum ? "Belum disemak" : sokong ? "☑ Disokong" : "☒ Tidak disokong";
  return (
    <div className={`rounded-lg p-3 text-sm ${warna}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-slate-700">{tajuk}</span>
        <b>{label}</b>
      </div>
      {!belum && catatan && <div className="mt-1 text-xs">Ulasan: {catatan}</div>}
    </div>
  );
}
