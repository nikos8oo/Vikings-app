import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  const { data, error } = await db().storage.from("videos").createSignedUploadUrl(`test/${Date.now()}.webm`);
  return Response.json({ ok: !!data?.token, error: error?.message ?? null });
}
