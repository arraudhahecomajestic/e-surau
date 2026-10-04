import { NextResponse } from "next/server";
import { getProfil } from "@/lib/sesi";

export const dynamic = "force-dynamic";

// Pulangkan peranan berkesan pengguna semasa (untuk menu dwi-peranan di AdminNav).
export async function GET() {
  const p = await getProfil();
  if (!p) return NextResponse.json({ peranan: null, peranan_tambahan: [], master: false });
  return NextResponse.json({
    peranan: p.peranan,
    peranan_tambahan: p.peranan_tambahan ?? [],
    master: p.master === true,
  });
}
