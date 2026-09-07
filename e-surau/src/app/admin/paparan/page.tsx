import Link from "next/link";
import AdminNav from "@/components/AdminNav";
import { PerluMasuk, TiadaAkses } from "@/components/PerluMasuk";
import { getProfil, isPentadbir } from "@/lib/sesi";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { tetapanPaparan } from "@/lib/tetapanSistem";
import { simpanPaparan } from "./actions";

export const dynamic = "force-dynamic";

const HARI = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
const BULAN = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"];

function labelTarikh(t: string): string {
  const d = new Date(t + "T00:00:00");
  if (isNaN(d.getTime())) return t;
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]}`;
}

export default async function AdminPaparanPage() {
  if (!adminConfigured)
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>;

  const profil = await getProfil();
  if (!profil) return <PerluMasuk />;
  if (!isPentadbir(profil)) return <TiadaAkses />;

  const tp = await tetapanPaparan();

  const db = createAdminClient();
  const hariIni = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
  const [pRes, aRes] = await Promise.all([
    db.from("program")
      .select("id, tajuk, tarikh, masa, lokasi, kategori, poster_urls, poster_url")
      .eq("diterbitkan", true)
      .is("dibuang_pada", null)
      .gte("tarikh", hariIni)
      .order("tarikh", { ascending: true })
      .limit(10),
    db.from("pengumuman")
      .select("id, tajuk, penting, diterbitkan")
      .eq("diterbitkan", true)
      .order("tarikh", { ascending: false })
      .limit(12),
  ]);
  const programs = (pRes.data as any[]) ?? [];
  const pengumuman = (aRes.data as any[]) ?? [];

  const jumPoster = programs.reduce((n, p) => n + (p.poster_urls?.length ? p.poster_urls.length : p.poster_url ? 1 : 0), 0);

  return (
    <div className="space-y-6">
      <AdminNav aktif="/admin/paparan" nama={profil.nama ?? profil.emel ?? undefined} peranan={profil.peranan} master={profil.master} />

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paparan TV (Mod Skrin Surau)</h1>
        <p className="mt-1 text-sm text-slate-600">
          Skrin penuh untuk TV surau — jam, waktu solat, jadual program, poster & azan automatik.
          Kandungan <b>auto-tarik</b> dari modul Program &amp; Pengumuman.
        </p>
      </div>

      {/* Buka skrin */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-slate-900">Buka Skrin Paparan</div>
            <div className="text-sm text-slate-500">Buka di TV / mini-PC, tekan &quot;Sentuh untuk Mula&quot; — skrin terus penuh sendiri (tak perlu F11).</div>
          </div>
          <a
            href="/paparan"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-surau px-5 py-2.5 text-sm font-bold text-white hover:bg-surau-dark"
          >
            ▶ Buka Paparan TV
          </a>
        </div>
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Alamat: <span className="font-mono text-slate-700">arraudhahecomajestic.com/paparan</span> — buka terus di pelayar TV (tanpa perlu log masuk).
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-1 flex items-center justify-between">
          <div className="font-semibold text-slate-900">Pratonton Langsung</div>
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">● Live</span>
        </div>
        <p className="mb-3 text-sm text-slate-500">Beginilah rupa skrin di TV. Ia berjalan sebenar (jam, waktu solat, program bertukar). Azan disenyapkan dalam pratonton.</p>
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-inner">
          <div className="aspect-video w-full">
            {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
            <iframe src="/paparan?pratonton=1" title="Pratonton Paparan TV" className="h-full w-full border-0" />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">Tukar tetapan di bawah &amp; simpan, kemudian muat semula halaman ini untuk lihat kesan.</p>
      </div>

      {/* Tetapan */}
      <form action={simpanPaparan} className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 font-semibold text-slate-900">Tetapan Paparan</div>

        <label className="mb-4 block">
          <span className="text-sm font-medium text-slate-700">Tema warna skrin</span>
          <select name="paparan_tema" defaultValue={tp.tema} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-xs">
            <option value="hijau">Hijau Surau (lalai)</option>
            <option value="gelap">Gelap / Hitam</option>
            <option value="biru">Biru Malam</option>
            <option value="ungu">Ungu Senja</option>
            <option value="sejuk">Teal Sejuk</option>
          </select>
          <span className="mt-1 block text-xs text-slate-400">Tukar latar warna skrin. Simpan &amp; muat semula untuk lihat di pratonton atas.</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Tempoh tukar paparan (saat)</span>
            <input
              type="number" name="paparan_saat" min={5} max={120} defaultValue={tp.saat}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-400">Berapa lama setiap skrin (jam / program / poster) sebelum bertukar. Lalai 15 saat.</span>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Masa menunggu iqamah (minit)</span>
            <input
              type="number" name="paparan_iqamah" min={1} max={30} defaultValue={tp.iqamah}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-400">Kiraan mengundur selepas azan sebelum &quot;SOLAT&quot;. Lalai 10 minit.</span>
          </label>
        </div>

        <label className="mt-4 flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-3">
          <input type="checkbox" name="paparan_azan" defaultChecked={tp.azan} className="mt-0.5 h-4 w-4" />
          <span>
            <span className="text-sm font-medium text-slate-700">Bunyikan azan automatik bila masuk waktu</span>
            <span className="mt-0.5 block text-xs text-slate-400">
              Perlu fail <span className="font-mono">azan.mp3</span> (dan pilihan <span className="font-mono">azan-subuh.mp3</span>) dalam folder awam.
              Jika tiada, skrin tetap bertukar tetapi bunyi &quot;beep&quot; sahaja.
            </span>
          </span>
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700">Teks berjalan tambahan (TV sahaja)</span>
          <textarea
            name="paparan_teks" rows={2} defaultValue={tp.teks}
            placeholder="Cth: Kutipan Jumaat minggu ini untuk tabung pembinaan. Terima kasih."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-slate-400">Muncul di teks berjalan bawah skrin, di depan pengumuman. Tidak keluar di website.</span>
        </label>

        <div className="mt-5">
          <button type="submit" className="rounded-lg bg-surau px-5 py-2.5 text-sm font-bold text-white hover:bg-surau-dark">
            Simpan Tetapan
          </button>
        </div>
      </form>

      {/* Apa yang sedang dipaparkan */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-1 font-semibold text-slate-900">Apa yang sedang dipaparkan</div>
        <p className="mb-4 text-sm text-slate-500">
          Skrin auto-tunjuk program akan datang (diterbitkan) &amp; pengumuman terkini. Nak ubah? Edit terus di modul berkenaan.
        </p>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Program */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Program &amp; Kuliah ({programs.length})</span>
              <Link href="/admin/program" className="text-xs font-medium text-surau hover:underline">Urus Program →</Link>
            </div>
            {programs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-400">
                Tiada program akan datang. Skrin akan tunjuk jam sahaja.
              </div>
            ) : (
              <ul className="space-y-2">
                {programs.map((p) => {
                  const bilPoster = p.poster_urls?.length ? p.poster_urls.length : p.poster_url ? 1 : 0;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-800">{p.tajuk}</div>
                        <div className="text-xs text-slate-500">
                          {labelTarikh(p.tarikh)}{p.masa ? ` · ${p.masa}` : ""} ·{" "}
                          {bilPoster > 0 ? `${bilPoster} poster` : <span className="text-amber-600">tiada poster</span>}
                        </div>
                      </div>
                      <Link href={`/admin/program/${p.id}`} className="whitespace-nowrap text-xs font-medium text-surau hover:underline">
                        Edit / Poster
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Pengumuman */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Pengumuman (teks berjalan) ({pengumuman.length})</span>
              <Link href="/admin/pengumuman" className="text-xs font-medium text-surau hover:underline">Urus Pengumuman →</Link>
            </div>
            {pengumuman.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-400">
                Tiada pengumuman diterbitkan.
              </div>
            ) : (
              <ul className="space-y-2">
                {pengumuman.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    {a.penting && <span className="text-red-500">❗</span>}
                    <span className="truncate text-sm text-slate-700">{a.tajuk}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
