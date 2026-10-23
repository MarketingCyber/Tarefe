import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { contentTypeFor, readBannerImage } from "@/lib/document-storage";

/** Slider image (marketing, public). Only images of active slides are served. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const banner = await prisma.appBanner.findUnique({ where: { id }, select: { imagePath: true, active: true } });
  if (!banner?.imagePath || !banner.active) return NextResponse.json({ error: { code: "not_found" } }, { status: 404 });
  const buffer = await readBannerImage(banner.imagePath).catch(() => null);
  if (!buffer) return NextResponse.json({ error: { code: "not_found" } }, { status: 404 });
  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    headers: { "Content-Type": contentTypeFor(banner.imagePath), "Cache-Control": "public, max-age=86400" },
  });
}
