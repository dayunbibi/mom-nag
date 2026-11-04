import { dbEnabled, todayStats } from "@/lib/server/db";

export const dynamic = "force-dynamic";

// Today's count + average score. Cached at Vercel's edge for 30s
// so a busy page doesn't hit the database on every visit.
export async function GET() {
  if (!dbEnabled()) return Response.json({ count: null, avg: null });

  try {
    const stats = await todayStats();
    return Response.json(
      { count: Number(stats.count), avg: Number(stats.avg) },
      { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (err) {
    console.error("today_stats failed", err);
    return Response.json({ count: null, avg: null });
  }
}
