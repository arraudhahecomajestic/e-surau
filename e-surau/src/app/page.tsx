import Link from "next/link";
import PrayerTimes from "@/components/PrayerTimes";
import { supabase, supabaseConfigured } from "@/lib/supabaseClient";
import { NAMA_SURAU, ZON_SOLAT } from "@/lib/tetapan";
import { khairatDibuka, pampasanKhairat, yuranKhairat, kewanganAwamDibuka } from "@/lib/tetapanSistem";
import { getProfil, isStaf } from "@/lib/sesi";
import { rm, tarikhMs } from "@/lib/format";
import { bahasaSemasa } from "@/lib/bahasa";
import { buatT } from "@/lib/i18n";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { KAWASAN, kenalKawasan } from "@/lib/kawasan";
import StatFasaChart from "@/components/StatFasaChart";
import PelawatKaunter from "@/components/PelawatKaunter";
import KewanganRingkasHome from "@/components/KewanganRingkasHome";

export const dynamic = "force-dynamic";

type Pengumuman = {
  id: string;
  tajuk: string;
  kandungan: string;
  penting: boolean;
  tarikh: string;
};

async function ambilPengumuman(): Promise<Pengumuman[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase
    .from("pengumuman")
    .select("id, tajuk, kandungan, penting, tarikh")
    .eq("diterbitkan", true)
    .order("tarikh", { ascending: false })
    .limit(10);
  if (error) return [];
  return data ?? [];
}

async function ambilProgram(): Promise<any[]> {
  if (!supabaseConfigured) return [];
  const { data, error } = await supabase.from("v_program_awam").select("*").limit(3);
  if (error) return [];
  return (data as any[]) ?? [];
}

async function ambilTender(): Promise<any[]> {
  if (!adminConfigured) return [];
  try {
    const db = createAdminClient();
    const hariIni = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
    const { data } = await db.from("tender").select("id, tajuk, kategori, tarikh_tutup, no_ruj")
      .eq("status", "aktif").order("tarikh_tutup", { ascending: true, nullsFirst: false }).limit(3);
    return ((data as any[]) ?? []).filter((t) => !t.tarikh_tutup || String(t.tarikh_tutup) >= hariIni);
  } catch { return []; }
}

async function ambilStatFasa(): Promise<{ data: { nama: string; bil: number }[]; total: number; belumKelas: number }> {
  if (!adminConfigured) return { data: [], total: 0, belumKelas: 0 };
  try {
    const db = createAdminClient();
    const { data } = await db.from("ahli_kariah").select("alamat, alamat_kp, kawasan");
    const rows = (data as any[]) ?? [];
    const kira: Record<string, number> = {};
    for (const k of KAWASAN) kira[k.kod] = 0;
    let terkelas = 0;
    for (const a of rows) {
      const kw = kenalKawasan(a.alamat || a.alamat_kp, a.kawasan);
      if (kw.kod === "lain") continue; // bar awam tunjuk fasa dikenali sahaja
      kira[kw.kod] = (kira[kw.kod] ?? 0) + 1;
      terkelas++;
    }
    return {
      data: KAWASAN.map((k) => ({ nama: k.nama, bil: kira[k.kod] ?? 0 })),
      total: rows.length,              // jumlah SEBENAR semua ahli berdaftar
      belumKelas: rows.length - terkelas,
    };
  } catch {
    return { data: [], total: 0, belumKelas: 0 };
  }
}

type Baris = { nama: string; jumlah: number };
async function ambilKewanganBulanTerkini(): Promise<{ bulan: number; masuk: Baris[]; keluar: Baris[] } | null> {
  if (!adminConfigured) return null;
  try {
    const db = createAdminClient();
    const tahun = new Date().getFullYear();
    const [{ data: kut }, { data: bel }] = await Promise.all([
      db.from("kutipan").select("jumlah, tarikh, kategori:kategori_kutipan(nama, papar_awam)").gte("tarikh", `${tahun}-01-01`).lte("tarikh", `${tahun}-12-31`),
      db.from("perbelanjaan").select("jumlah, tarikh, status, kategori:kategori_belanja(nama)").gte("tarikh", `${tahun}-01-01`).lte("tarikh", `${tahun}-12-31`),
    ]);
    const bM: Record<number, Record<string, number>> = {};
    const bK: Record<number, Record<string, number>> = {};
    const ada = new Set<number>();
    for (const r of (kut as any[]) ?? []) {
      const kat = r.kategori;
      // Papar semua kategori as-is — visibiliti umum dikawal suis global.
      if (!kat) continue;
      const m = Number(String(r.tarikh).slice(5, 7)) - 1;
      if (m < 0 || m > 11) continue;
      (bM[m] ??= {})[kat.nama] = (bM[m][kat.nama] || 0) + Number(r.jumlah || 0);
      ada.add(m);
    }
    for (const r of (bel as any[]) ?? []) {
      // Selaras dengan laporan /kewangan — hanya baucer 'dibayar' dikira wang
      // keluar sebenar (baucer 'menunggu'/'lulus' belum dibayar tak dikira).
      if (r.status !== "dibayar") continue;
      const nama = r.kategori?.nama || "Lain-lain";
      const m = Number(String(r.tarikh).slice(5, 7)) - 1;
      if (m < 0 || m > 11) continue;
      (bK[m] ??= {})[nama] = (bK[m][nama] || 0) + Number(r.jumlah || 0);
      ada.add(m);
    }
    if (!ada.size) return null;
    const bulan = Math.max(...ada);
    const toArr = (o?: Record<string, number>): Baris[] =>
      Object.entries(o || {}).map(([nama, jumlah]) => ({ nama, jumlah: Number(jumlah) })).sort((a, b) => b.jumlah - a.jumlah);
    return { bulan, masuk: toArr(bM[bulan]), keluar: toArr(bK[bulan]) };
  } catch {
    return null;
  }
}

export default async function Home() {
  const zon = ZON_SOLAT;
  const namaSurau = NAMA_SURAU;
  const lang = bahasaSemasa();
  const tr = buatT(lang);
  const tahunPie = new Date().getFullYear();
  const [pengumuman, program, statFasa, khDibuka, pampasan, yuran, kewanganAwam, profil, tenderAktif, kewBulan] = await Promise.all([
    ambilPengumuman(),
    ambilProgram(),
    ambilStatFasa(),
    khairatDibuka(),
    pampasanKhairat(),
    yuranKhairat(),
    kewanganAwamDibuka(),
    getProfil(),
    ambilTender(),
    ambilKewanganBulanTerkini(),
  ]);
  const stafKewangan = isStaf(profil); // SU/Pengerusi/AJK + Bendahari
  const paparKewangan = kewanganAwam || stafKewangan; // awam nampak hanya bila diterbitkan


  return (
    <div className="space-y-8">
      {/* Kempen Khairat Kematian — banner besar (dikawal toggle admin) */}
      {khDibuka && (
        <section className="overflow-hidden rounded-2xl border-2 border-teal-600 bg-gradient-to-br from-teal-700 to-emerald-800 p-6 text-white shadow-lg sm:p-8">
          <span className="inline-block rounded-full bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wide text-teal-900">
            {tr("Baru Dibuka", "Now Open")}
          </span>
          <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">
            {tr("Sertai Skim Khairat Kematian Surau Ar Raudhah", "Join the Surau Ar Raudhah Death Benefit Scheme")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-teal-50 sm:text-base">
            {tr("Ringankan beban keluarga di saat dukacita. Dengan hanya ", "Ease your family's burden in times of grief. For just ")}
            <span className="font-bold text-white">RM{yuran}/{tr("tahun", "year")}</span>
            {tr(", keluarga menerima pampasan khairat ", ", your family receives a death benefit of ")}
            <span className="font-bold text-white">RM{rm(pampasan).replace("RM", "")}</span>
            {tr(" bagi setiap kematian yang dilindungi. Sertai sekarang — jangan tunggu hingga terlambat.", " for each covered death. Join now — don't wait until it's too late.")}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/daftar"
              className="rounded-lg bg-amber-400 px-6 py-3 text-center text-sm font-bold text-teal-900 shadow hover:bg-amber-300"
            >
              {tr("Daftar Khairat Kematian →", "Register for Death Benefit →")}
            </Link>
            <Link
              href="/masuk"
              className="rounded-lg border-2 border-white/70 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
            >
              {tr("Sudah Ahli? Kemas Kini & Sertai", "Already a member? Update & Join")}
            </Link>
            <Link
              href="/khairat"
              className="rounded-lg px-6 py-3 text-center text-sm font-semibold text-teal-100 underline underline-offset-4 hover:text-white"
            >
              {tr("Apa itu Khairat Kematian?", "What is the Death Benefit?")}
            </Link>
          </div>
        </section>
      )}

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {tr("Selamat datang ke", "Welcome to")} {namaSurau}
        </h1>
        <p className="mt-2 text-slate-600">
          {tr(
            "Portal rasmi kariah — daftar ahli, sertai khairat kematian, dan ikuti program surau.",
            "The official community portal — register as a member, join the death benefit scheme, and follow surau programmes.",
          )}
        </p>

        <div className="mt-5 rounded-xl border-2 border-surau/30 bg-surau/5 p-5">
          <div className="text-base font-semibold text-slate-900">{tr("Daftar Ahli Kariah", "Register as a Community Member")}</div>
          <p className="mt-1 text-sm text-slate-600">
            {tr(
              "Masukkan No. Kad Pengenalan anda — sistem akan semak sama ada anda sudah berdaftar atau belum. Jika belum, isi borang pendaftaran. Jika sudah, teruskan untuk akses portal & kemas kini maklumat.",
              "Enter your IC number — the system will check whether you are already registered. If not, fill in the registration form. If yes, continue to access the portal & update your details.",
            )}
          </p>
          <Link
            href="/daftar"
            className="mt-3 inline-block rounded-lg bg-surau px-6 py-2.5 text-sm font-semibold text-white hover:bg-surau-dark"
          >
            {tr("Daftar / Semak Keahlian →", "Register / Check Membership →")}
          </Link>
        </div>
      </section>

      {statFasa.total > 0 && (
        <StatFasaChart
          data={statFasa.data}
          total={statFasa.total}
          belumKelas={statFasa.belumKelas}
          tajuk={tr("Pendaftaran Ahli Kariah Ikut Fasa", "Member Registration by Phase")}
          labelLihat={tr("Lihat pecahan ikut fasa", "View breakdown by phase")}
          labelTutup={tr("Tutup", "Close")}
          nota={tr(
            "Bilangan ahli kariah berdaftar mengikut fasa kediaman. Belum daftar? Ayuh sertai kariah anda.",
            "Registered community members by residential phase. Not registered yet? Join your neighbourhood.",
          )}
          notaBelumKelas={tr(
            "belum dikelaskan ikut fasa (alamat belum lengkap)",
            "not yet classified by phase (address incomplete)",
          )}
        />
      )}

      <PrayerTimes zon={zon} />

      {/* Ringkasan kewangan bulan terkini — klik untuk ke halaman kewangan penuh */}
      {paparKewangan && kewBulan && (kewBulan.masuk.length > 0 || kewBulan.keluar.length > 0) && (
        <KewanganRingkasHome
          tahun={tahunPie}
          bulan={kewBulan.bulan}
          masuk={kewBulan.masuk}
          keluar={kewBulan.keluar}
          pratonton={stafKewangan && !kewanganAwam}
        />
      )}

      {/* Yaasin & Tahlil malam Jumaat */}
      <section className="rounded-xl border-2 border-surau/30 bg-surau/5 p-5">
        <h2 className="font-semibold text-slate-900">{tr("Yaasin & Tahlil · Malam Jumaat", "Yaasin & Tahlil · Thursday Night")}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {tr(
            "Hantar nama arwah ahli keluarga untuk disebut dalam bacaan Yaasin & Tahlil selepas Maghrib.",
            "Submit the names of departed family members to be recited during Yaasin & Tahlil after Maghrib.",
          )}
        </p>
        <Link href="/tahlil" className="mt-3 inline-block rounded-lg bg-surau px-5 py-2.5 text-sm font-semibold text-white hover:bg-surau-dark">
          {tr("Hantar Nama Arwah →", "Submit Names of the Deceased →")}
        </Link>
      </section>

      {/* Program akan datang */}
      {program.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">{tr("Program Akan Datang", "Upcoming Programmes")}</h2>
            <Link href="/program" className="text-sm font-medium text-surau hover:underline">{tr("Lihat semua →", "View all →")}</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {program.map((p) => (
              <Link key={p.id} href="/program" className="rounded-xl bg-white p-4 shadow-sm hover:shadow">
                {p.kategori && <span className="rounded bg-surau/10 px-2 py-0.5 text-xs font-semibold text-surau">{p.kategori}</span>}
                <div className="mt-2 font-semibold text-slate-900">{p.tajuk}</div>
                <div className="mt-1 text-xs text-slate-500">{tarikhMs(p.tarikh)}{p.masa ? ` · ${p.masa}` : ""}</div>
                {p.lokasi && <div className="text-xs text-slate-500">{p.lokasi}</div>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Iklan Tender aktif */}
      {tenderAktif.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">{tr("Iklan Tender & Sebut Harga", "Tenders & Quotations")}</h2>
            <Link href="/tender" className="text-sm font-medium text-surau hover:underline">{tr("Lihat semua →", "View all →")}</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {tenderAktif.map((t) => (
              <Link key={t.id} href={`/tender/${t.id}`} className="rounded-xl bg-white p-4 shadow-sm hover:shadow">
                <div className="flex flex-wrap items-center gap-2">
                  {t.kategori && <span className="rounded bg-surau/10 px-2 py-0.5 text-xs font-semibold text-surau">{t.kategori}</span>}
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">{tr("Aktif", "Open")}</span>
                </div>
                <div className="mt-2 font-semibold text-slate-900">{t.tajuk}</div>
                <div className="mt-1 text-xs text-slate-500">{t.tarikh_tutup ? `${tr("Tutup", "Closes")}: ${tarikhMs(t.tarikh_tutup)}` : (t.no_ruj || "")}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xl font-bold text-slate-900">{tr("Pengumuman", "Announcements")}</h2>
        {pengumuman.length === 0 ? (
          <p className="rounded-lg bg-white p-4 text-sm text-slate-500 shadow-sm">
            {tr("Tiada pengumuman buat masa ini.", "No announcements at this time.")}
          </p>
        ) : (
          <div className="space-y-3">
            {pengumuman.map((p) => (
              <article
                key={p.id}
                className={`rounded-lg border-l-4 bg-white p-4 shadow-sm ${
                  p.penting ? "border-amber-500" : "border-surau"
                }`}
              >
                <div className="flex items-center gap-2">
                  {p.penting && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      {tr("Penting", "Important")}
                    </span>
                  )}
                  <h3 className="font-semibold text-slate-900">{p.tajuk}</h3>
                </div>
                <p className="mt-1 text-sm text-slate-600">{p.kandungan}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <PelawatKaunter />

    </div>
  );
}
