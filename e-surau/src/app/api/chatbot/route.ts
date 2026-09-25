import { NextResponse } from "next/server";
import { getProfil } from "@/lib/sesi";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";
import { khairatDibuka, pampasanKhairat, yuranKhairat, bacaTetapan } from "@/lib/tetapanSistem";
import {
  NAMA_SURAU,
  ALAMAT_SURAU,
  EMEL_SURAU,
  BANK_SURAU,
  ZON_SOLAT,
} from "@/lib/tetapan";

export const dynamic = "force-dynamic";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL_ENDPOINT = "https://api.anthropic.com/v1/models?limit=100";
// Model lalai (ID bertarikh — lebih stabil dari alias "-latest").
// Boleh ganti dengan env ANTHROPIC_MODEL. Jika tak sah, sistem cari sendiri.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
const MAX_SEJARAH = 12; // had mesej dihantar (jimat kos)

type Msg = { role: "user" | "assistant"; content: string };

function tajukAnthropic(apiKey: string) {
  return { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
}

async function panggilClaude(apiKey: string, model: string, sistem: string, mesej: Msg[]) {
  return fetch(ENDPOINT, {
    method: "POST",
    headers: tajukAnthropic(apiKey),
    body: JSON.stringify({ model, max_tokens: 1024, system: sistem, messages: mesej }),
  });
}

// Cari model sah pada akaun (utamakan Sonnet terkini). Auto-pulih bila alias bersara.
async function cariModelSah(apiKey: string, lalai: string): Promise<string> {
  try {
    const res = await fetch(MODEL_ENDPOINT, { headers: tajukAnthropic(apiKey) });
    if (!res.ok) return lalai;
    const data = await res.json();
    const ids: string[] = ((data?.data as any[]) ?? []).map((m) => m?.id).filter(Boolean);
    if (!ids.length) return lalai;
    // Senarai dari API disusun terkini dahulu → ambil Sonnet pertama, jika tiada ambil yang pertama.
    return ids.find((id) => id.includes("sonnet")) || ids[0];
  } catch {
    return lalai;
  }
}

// ---- Kumpul data langsung dari sistem untuk konteks chatbot ----
async function ambilKonteksLangsung(): Promise<string> {
  const bahagian: string[] = [];

  // Program akan datang
  if (adminConfigured) {
    try {
      const db = createAdminClient();
      const { data } = await db.from("v_program_awam").select("*").limit(6);
      const prog = (data as any[]) ?? [];
      if (prog.length) {
        const senarai = prog
          .map((p) => `- ${p.tajuk}${p.tarikh ? ` (${p.tarikh})` : ""}${p.masa ? `, ${p.masa}` : ""}${p.lokasi ? ` @ ${p.lokasi}` : ""}`)
          .join("\n");
        bahagian.push(`PROGRAM AKAN DATANG:\n${senarai}`);
      } else {
        bahagian.push("PROGRAM AKAN DATANG: Tiada program dijadualkan buat masa ini.");
      }
    } catch {
      /* abai */
    }
  }

  // Waktu solat hari ini
  try {
    const res = await fetch(`https://api.waktusolat.app/v2/solat/${ZON_SOLAT}`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const hariIni = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
      const hb = Number(hariIni.split("-")[2]);
      const list: any[] = data?.prayers ?? [];
      const t = list.find((p) => Number(p.day) === hb) ?? list[0];
      if (t) {
        const jam = (e: number) =>
          new Date(e * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kuala_Lumpur" });
        bahagian.push(
          `WAKTU SOLAT HARI INI (${hariIni}, zon ${ZON_SOLAT}): Subuh ${jam(t.fajr)}, Syuruk ${jam(t.syuruk)}, Zohor ${jam(t.dhuhr)}, Asar ${jam(t.asr)}, Maghrib ${jam(t.maghrib)}, Isyak ${jam(t.isha)}.`,
        );
      }
    }
  } catch {
    /* abai */
  }

  // Status khairat
  try {
    const [dibuka, pampasan, yuran] = await Promise.all([khairatDibuka(), pampasanKhairat(), yuranKhairat()]);
    bahagian.push(
      `KHAIRAT KEMATIAN: Yuran RM${yuran}/tahun. Pampasan RM${pampasan} setiap kematian dilindungi. Sertai skim: ${dibuka ? "DIBUKA sekarang" : "belum dibuka buat masa ini (pendaftaran tanggungan tetap boleh)"}.`,
    );
  } catch {
    /* abai */
  }

  // Baki Tabung Ihsan (bantuan kecemasan) — angka keseluruhan sahaja, tanpa nama.
  if (adminConfigured) {
    try {
      const db = createAdminClient();
      const { data } = await db.from("bantuan_tabung").select("arah, jumlah");
      const t = (data as any[]) ?? [];
      const masuk = t.filter((x) => x.arah === "masuk").reduce((s, x) => s + Number(x.jumlah || 0), 0);
      const keluar = t.filter((x) => x.arah === "keluar").reduce((s, x) => s + Number(x.jumlah || 0), 0);
      bahagian.push(
        `TABUNG IHSAN (BANTUAN KECEMASAN): Baki semasa RM${(masuk - keluar).toFixed(2)}. Jumlah disalurkan setakat ini RM${keluar.toFixed(2)}. (Angka keseluruhan sahaja — identiti penerima dirahsiakan.)`,
      );
    } catch {
      /* abai */
    }
  }

  // Pengumuman terkini (yang diterbitkan) — auto dari modul Pengumuman.
  // Setiap kali AJK terbitkan pengumuman baharu, Ayaan terus tahu tanpa ubah kod.
  if (adminConfigured) {
    try {
      const db = createAdminClient();
      const { data } = await db
        .from("pengumuman")
        .select("tajuk, kandungan, penting, tarikh")
        .eq("diterbitkan", true)
        .order("tarikh", { ascending: false })
        .limit(6);
      const peng = (data as any[]) ?? [];
      if (peng.length) {
        const senarai = peng
          .map((p) => {
            const isi = String(p.kandungan || "").replace(/\s+/g, " ").trim().slice(0, 400);
            return `- ${p.penting ? "[PENTING] " : ""}${p.tajuk}${p.tarikh ? ` (${p.tarikh})` : ""}: ${isi}`;
          })
          .join("\n");
        bahagian.push(`PENGUMUMAN TERKINI SURAU:\n${senarai}`);
      }
    } catch {
      /* abai */
    }
  }

  // Pengetahuan tambahan yang dikemas kini terus oleh admin di /admin/tetapan.
  // Kotak teks bebas — AJK boleh tulis apa-apa maklumat terkini untuk Ayaan.
  try {
    const t = await bacaTetapan();
    const nota = String(t.ayaan_pengetahuan || "").trim();
    if (nota) {
      bahagian.push(`MAKLUMAT TERKINI DARIPADA AJK (utamakan maklumat ini jika berkaitan):\n${nota.slice(0, 4000)}`);
    }
  } catch {
    /* abai */
  }

  return bahagian.join("\n\n");
}

function binaSistemPrompt(konteks: string, namaAhli: string): string {
  return `Anda ialah "Ayaan Ilhan", Pembantu Surau Ar Raudhah — chatbot rasmi untuk ${NAMA_SURAU}. Perkenalkan diri sebagai Ayaan Ilhan bila sesuai. Anda membantu ahli kariah menjawab soalan berkaitan surau dengan mesra, ringkas dan tepat.

SKOP & PERANAN:
- Anda pakar tentang SEGALA perkara berkaitan Surau Ar Raudhah: pendaftaran ahli kariah, skim khairat kematian, tanggungan, program & aktiviti, sewaan ruang, Yaasin & Tahlil, infaq/sumbangan, Tabung Ihsan & bantuan kecemasan, Gerobok Prihatin, pembayaran, waktu solat, dasar privasi & keselamatan data, cara guna portal, dan urusan pembekal/vendor. Jawab soalan sebegini dengan yakin, mesra & membantu.
- Jika soalan LANGSUNG tiada kaitan dengan surau (cth kuiz umum, hal peribadi bukan surau), tolak dengan sopan dan pelawa pengguna tanya hal surau.
- Soal hukum agama yang rumit/khilaf: boleh beri panduan umum ringkas jika jelas, tetapi cadangkan sahkan dengan imam/AJK surau. Jangan keluarkan fatwa muktamad sendiri.
- Jujur bila tidak pasti — cadangkan hubungi AJK/Setiausaha atau hantar melalui /maklum-balas. JANGAN reka fakta.
- Jawab ikut bahasa pengguna (Bahasa Melayu atau English), nada mesra, sopan & ringkas. Beri pautan halaman bila relevan (cth /daftar, /khairat, /sewaan, /tahlil, /program, /infaq, /bantuan, /gerobok-prihatin, /maklum-balas, /dasar-privasi).
- Nama ahli yang bertanya: ${namaAhli || "ahli kariah"}.

MAKLUMAT SURAU:
- Nama: ${NAMA_SURAU}
- Alamat: ${ALAMAT_SURAU}
- Emel: ${EMEL_SURAU}
- Akaun bank sumbangan: ${BANK_SURAU.bank} ${BANK_SURAU.no_akaun} (${BANK_SURAU.nama_akaun})
- Zon waktu solat: ${ZON_SOLAT}

PANDUAN PERKHIDMATAN (cara buat):
- Daftar ahli kariah: ke /daftar, masukkan No. Kad Pengenalan → sistem semak status → jika belum, isi borang. PERCUMA.
- Log masuk / akses portal ahli: /masuk (guna e-mel & kata laluan) → portal /ahli untuk kemas kini maklumat & lihat status.
- Lupa kata laluan: ke /lupa-kata-laluan, masukkan e-mel → pautan set semula dihantar ke e-mel.
- Semak status pendaftaran: /daftar guna No. KP; status dipapar (belum lengkap / menunggu pengesahan / disahkan).
- Khairat Kematian: info penuh /khairat. Daftar tanggungan yang dilindungi melalui borang /daftar. Untuk tuntutan kematian, hubungi AJK/Setiausaha surau segera.
- Sewaan ruang: mohon di /sewaan (isi Seksyen A dahulu, kemudian sambung).
- Yaasin & Tahlil (malam Jumaat, selepas Maghrib): hantar nama arwah di /tahlil sebelum 7:00 malam setiap Khamis; senarai dipapar sehingga 8:00 malam.
- Program & aktiviti: lihat /program; sahkan kehadiran (RSVP) melalui pautan jemputan.
- Infaq / sumbangan: /infaq, atau terus ke akaun bank surau di atas.
- Tabung Ihsan / Bantuan Kecemasan: info & sumbangan di /bantuan. Sesiapa boleh menyumbang wang terus ke Tabung Ihsan (online via CHIP) di halaman itu — sumbangan membantu ahli kariah yang memerlukan.
- Gerobok Prihatin (rak sumbangan barang keperluan asas di surau): info di /gerobok-prihatin. Boleh letak/ambil barang terus di surau tanpa daftar, ATAU sumbang wang online (surau belikan barang) di halaman itu.
- Aduan/cadangan: /maklum-balas.
- Pembekal/vendor: daftar di /pembekal/daftar → tunggu kelulusan AJK → log masuk & hantar tuntutan bayaran di /pembekal/portal.

SOALAN LAZIM (FAQ):
- Kenapa perlu swafoto (selfie) semasa daftar? Untuk mengesahkan pendaftar benar-benar pemilik Kad Pengenalan tersebut — mengelak penyamaran/penyalahgunaan identiti dan melindungi hak ahli, terutama pampasan khairat. Swafoto adalah SULIT, disimpan selamat, hanya boleh dilihat pentadbir dibenarkan, dan TIDAK diguna untuk tujuan lain.
- Kenapa perlu salinan KP (depan & belakang) & e-tandatangan? Untuk pengesahan identiti & rekod keahlian rasmi (dikongsi dengan JAIS untuk pendaftaran kariah). e-tandatangan sebagai pengakuan persetujuan borang.
- Selamat ke data saya? Siapa boleh lihat? Ya — dilindungi di bawah PDPA 2010. Tidak dijual/dikongsi untuk tujuan komersial. Hanya pentadbir surau yang dibenarkan boleh lihat data sensitif (KP, telefon, swafoto). Butiran: /dasar-privasi & /keselamatan.
- Pendaftaran berbayar? Tidak, pendaftaran ahli kariah PERCUMA.
- Siapa layak jadi ahli kariah? Penduduk kawasan kariah surau (Eco Majestic & kawasan berdekatan).
- Apa itu khairat kematian & siapa dilindungi? Skim bantuan yang membayar pampasan tetap kepada waris bagi setiap kematian yang dilindungi (ahli & tanggungan yang didaftarkan). Butiran yuran/pampasan lihat "DATA TERKINI" di bawah & /khairat.
- Apa itu Tabung Ihsan? Dana kebajikan surau yang dikumpul daripada sedekah, derma & infaq (bukan zakat) untuk membantu ahli kariah yang benar-benar memerlukan ketika kesempitan — sara hidup, perubatan, pendidikan, sewa, modal kecil & keperluan asas. Diuruskan Biro Kebajikan secara amanah & telus; maruah penerima dijaga (tiada nama didedahkan, hanya jumlah keseluruhan dilapor). Info & cara menyumbang: /bantuan.
- Macam mana nak MOHON bantuan kecemasan? Permohonan TIDAK dibuat sendiri secara online. Sila hubungi AJK/Setiausaha atau Biro Kebajikan surau. Pihak Biro akan menemu bual & menilai, kemudian merekod permohonan dalam sistem. Ini bagi menjaga kerahsiaan & memastikan bantuan sampai kepada yang layak. Info am: /bantuan.
- Apa itu Gerobok Prihatin? Rak sumbangan barang keperluan asas (beras, susu, minyak, biskut, dll) di surau — konsep "beri bila mampu, ambil bila perlu". Yang mampu letak barang, yang perlu ambil percuma, tanpa borang & tanpa soal. Boleh juga sumbang wang online (surau belikan barang). Info: /gerobok-prihatin.

HEBAHAN SEMASA (sebut secara mesra bila relevan — cth bila pengguna tanya pasal khairat kematian, pengurusan jenazah, atau nak menyumbang tenaga/sukarelawan):
- Surau Ar-Raudhah sedang MENCARI SUKARELAWAN untuk menganggotai AJK Khairat Kematian & Pengurusan Jenazah. Tugas termasuk membantu urusan pengebumian ahli kariah — memandikan, mengkafankan, menyembahyangkan & menguruskan jenazah, serta menyelaras bantuan kepada keluarga si mati.
- Terbuka kepada ahli kariah lelaki & perempuan yang berminat & komited (pengalaman pengurusan jenazah satu kelebihan, tetapi latihan/bimbingan akan diberi bagi yang baharu).
- Cara nyatakan minat: hubungi Setiausaha / AJK surau, atau hantar melalui /maklum-balas (nyatakan "Sukarelawan Pengurusan Jenazah" + nama & no. telefon). AJK akan menghubungi semula.
- Galakkan pengguna secara sopan & tidak memaksa — ini peluang amal jariah & fardhu kifayah yang besar ganjarannya.

PRIVASI & KESELAMATAN:
- Data dilindungi bawah Akta Perlindungan Data Peribadi 2010 (PDPA). Tidak dijual/dikongsi komersial. Hanya dikongsi dengan JAIS (keahlian rasmi) & pemproses bayaran CHIP (transaksi yang anda mulakan). Swafoto & maklumat kewangan = data sensitif, akses terhad. Rujuk /dasar-privasi dan /keselamatan.

DATA TERKINI (dijana automatik):
${konteks || "(tiada data langsung tersedia)"}`;
}

export async function POST(request: Request) {
  // Akses: ahli berdaftar (log masuk) sahaja
  const profil = await getProfil();
  if (!profil) {
    return NextResponse.json({ ok: false, ralat: "Sila log masuk untuk guna Pembantu Maya." }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, ralat: "Pembantu Maya belum dikonfigurasi (ANTHROPIC_API_KEY tiada)." },
      { status: 200 },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, ralat: "Permintaan tidak sah." }, { status: 400 });
  }

  const mesejMasuk: Msg[] = Array.isArray(body?.messages) ? body.messages : [];
  const bersih = mesejMasuk
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_SEJARAH)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (!bersih.length || bersih[bersih.length - 1].role !== "user") {
    return NextResponse.json({ ok: false, ralat: "Tiada soalan diterima." }, { status: 400 });
  }

  const konteks = await ambilKonteksLangsung();
  const sistem = binaSistemPrompt(konteks, profil.nama ?? "");

  try {
    let res = await panggilClaude(apiKey, MODEL, sistem, bersih);

    // Auto-pulih: jika model tak wujud (404), cari model sah & cuba semula sekali.
    if (res.status === 404) {
      const modelSah = await cariModelSah(apiKey, MODEL);
      if (modelSah !== MODEL) res = await panggilClaude(apiKey, modelSah, sistem, bersih);
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, ralat: `Maaf, Ayaan tak dapat jawab sekejap (${res.status}). Cuba lagi sebentar.`, nyahpepijat: `${res.status} ${txt.slice(0, 300)}` },
        { status: 200 },
      );
    }

    const data = await res.json();
    const reply = Array.isArray(data?.content)
      ? data.content.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("\n").trim()
      : "";

    return NextResponse.json({ ok: true, reply: reply || "Maaf, saya tak dapat jawapan buat masa ini." });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, ralat: "Maaf, sambungan ke Ayaan gagal. Cuba lagi sebentar.", nyahpepijat: e?.message ?? "ralat" },
      { status: 200 },
    );
  }
}
