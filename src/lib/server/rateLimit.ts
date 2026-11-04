// Simple per-IP limit so one person can't burn through the API budget.
//
// Caveat: this lives in memory, so each serverless instance has its own count
// and it resets on cold start. Good enough to stop casual spam for now;
// the plan is to move it to a database (Supabase) in the next step.
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PER_WINDOW = 5;

const hits = new Map<string, number[]>();

export function allowRequest(ip: string, now = Date.now()) {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);

  // keep the map from growing forever
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return true;
}
