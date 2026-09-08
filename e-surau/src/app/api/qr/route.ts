import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Jana imej QR di sisi pelayan (elak isu CSP skrip pihak ketiga di pelayar).
// Pelayar hanya memuat dari domain sendiri: /api/qr?data=...
export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get("data") || "";
  if (!data || data.length > 512) return new Response("bad request", { status: 400 });

  const sumber = [
    `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=1&qzone=1&data=${encodeURIComponent(data)}`,
    `https://quickchart.io/qr?size=280&margin=1&text=${encodeURIComponent(data)}`,
  ];

  for (const url of sumber) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) continue;
      const buf = await r.arrayBuffer();
      const ct = r.headers.get("content-type") || "image/png";
      return new Response(buf, {
        headers: { "content-type": ct, "cache-control": "public, max-age=3600" },
      });
    } catch { /* cuba sumber seterusnya */ }
  }
  return new Response("qr unavailable", { status: 502 });
}
