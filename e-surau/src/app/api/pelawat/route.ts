import { NextResponse } from "next/server";
import { createAdminClient, adminConfigured } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

async function bacaJumlah(db: any): Promise<number> {
  const { data } = await db.from("statistik_pelawat").select("jumlah").eq("id", 1).maybeSingle();
  return Number((data as any)?.jumlah ?? 0);
}

// Baca jumlah semasa (untuk paparan live / poll).
export async function GET() {
  if (!adminConfigured) return NextResponse.json({ jumlah: 0 });
  try {
    const db = createAdminClient();
    return NextResponse.json({ jumlah: await bacaJumlah(db) });
  } catch {
    return NextResponse.json({ jumlah: 0 });
  }
}

// Tambah 1 pelawat (dipanggil sekali sehari setiap pelawat — nyahduplikat di klien).
export async function POST() {
  if (!adminConfigured) return NextResponse.json({ jumlah: 0 });
  try {
    const db = createAdminClient();
    const { data, error } = await db.rpc("tambah_pelawat");
    if (!error && data !== null && data !== undefined) return NextResponse.json({ jumlah: Number(data) });
    return NextResponse.json({ jumlah: await bacaJumlah(db) });
  } catch {
    return NextResponse.json({ jumlah: 0 });
  }
}
