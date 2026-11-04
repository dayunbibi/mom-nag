// Talks to Supabase through its REST API (PostgREST) with plain fetch.
// The SQL functions it calls live in supabase/schema.sql.
import { createHmac } from "node:crypto";
import type { MomKey } from "../moms";

const URL = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
const KEY = process.env.SUPABASE_SECRET_KEY?.trim(); // sb_secret_..., server only

const DAILY_CAP = Number(process.env.NAG_DAILY_CAP) || 300;

// Only turn the DB on when both values look right. A key pasted into the URL field
// (it happened) would otherwise end up inside error messages and logs.
const urlOk = !!URL && /^https:\/\/[^\s/]+$/.test(URL) && (!KEY || !URL.includes(KEY));
const configured = urlOk && !!KEY;

if ((URL || KEY) && !configured) {
  // never print the values themselves
  console.warn("Supabase is off: SUPABASE_URL must look like https://xxxx.supabase.co and SUPABASE_SECRET_KEY must be set");
}

export function dbEnabled() {
  return configured;
}

// We never store the raw IP. HMAC with our secret means nobody can reverse it
// or match it against a list of IPs, but the same person still gets the same hash.
export function hashIp(ip: string) {
  return createHmac("sha256", KEY ?? "").update(ip).digest("hex");
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      // new Supabase keys go in the apikey header only (not Authorization)
      headers: { apikey: KEY!, "content-type": "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
  } catch (err) {
    // fetch errors can include the full URL/request, so only keep the error type
    throw new Error(`Supabase ${fn} request failed (${err instanceof Error ? err.name : "unknown"})`);
  }
  if (!res.ok) {
    // PostgREST error bodies describe the SQL problem, they don't echo the key
    throw new Error(`Supabase ${fn} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export type TryResult = { allowed: true; id: number } | { allowed: false; reason: "ip" | "daily" };

// checks the per-person + daily limits and records the request, in one DB call
export function tryNag(ipHash: string, mom: MomKey) {
  return rpc<TryResult>("try_nag", { p_ip_hash: ipHash, p_mom: mom, p_daily_cap: DAILY_CAP });
}

export function finishNag(id: number, smash: number, provider: string) {
  return rpc<null>("finish_nag", { p_id: id, p_smash: smash, p_provider: provider });
}

export type TodayStats = { count: number; avg: number };

export function todayStats() {
  return rpc<TodayStats>("today_stats");
}
