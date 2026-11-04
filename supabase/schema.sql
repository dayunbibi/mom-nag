-- AI 엄마 잔소리 — run once in the Supabase SQL Editor.
-- Safe to run again: everything is "if not exists" / "or replace".
--
-- What gets stored: a hashed IP (for spam limits), which mom, the score, which AI.
-- What does NOT get stored: photos, nag text, raw IPs.

create table if not exists public.nags (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  mom text not null check (mom in ('kind', 'blunt', 'gyeongsang')),
  smash smallint check (smash between 0 and 100), -- null until the AI answers
  provider text,
  created_at timestamptz not null default now()
);

create index if not exists nags_ip_time on public.nags (ip_hash, created_at desc);
create index if not exists nags_time on public.nags (created_at desc);

-- RLS on with no policies = the public keys can't read or write anything.
-- Only the server (secret key -> service_role) can touch this table.
alter table public.nags enable row level security;
revoke all on public.nags from anon, authenticated;
grant select, insert, update, delete on public.nags to service_role;


-- Check both limits and record the request in ONE step, so two requests
-- arriving at the same time can't both slip under the limit.
create or replace function public.try_nag(
  p_ip_hash text,
  p_mom text,
  p_per_ip int default 5,       -- per person
  p_window_min int default 10,  -- ...per this many minutes
  p_daily_cap int default 300   -- for everyone, per Toronto day (protects the free AI quota)
)
returns jsonb
language plpgsql
as $$
declare
  v_recent int;
  v_today int;
  v_id bigint;
begin
  -- one request at a time per person
  perform pg_advisory_xact_lock(hashtext(p_ip_hash));

  select count(*) into v_recent
  from public.nags
  where ip_hash = p_ip_hash
    and created_at > now() - make_interval(mins => p_window_min);
  if v_recent >= p_per_ip then
    return jsonb_build_object('allowed', false, 'reason', 'ip');
  end if;

  select count(*) into v_today
  from public.nags
  where created_at >= date_trunc('day', now() at time zone 'America/Toronto') at time zone 'America/Toronto';
  if v_today >= p_daily_cap then
    return jsonb_build_object('allowed', false, 'reason', 'daily');
  end if;

  insert into public.nags (ip_hash, mom) values (p_ip_hash, p_mom)
  returning id into v_id;

  -- now and then, throw away rows older than 30 days
  if random() < 0.02 then
    delete from public.nags where created_at < now() - interval '30 days';
  end if;

  return jsonb_build_object('allowed', true, 'id', v_id);
end;
$$;


-- Fill in the score once the AI answered
create or replace function public.finish_nag(p_id bigint, p_smash int, p_provider text)
returns void
language sql
as $$
  update public.nags
  set smash = p_smash, provider = p_provider
  where id = p_id and smash is null;
$$;


-- "오늘 등짝 맞은 사람 n명 · 평균 지수 m" (Toronto day)
create or replace function public.today_stats()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'count', count(*),
    'avg', coalesce(round(avg(smash)), 0)
  )
  from public.nags
  where smash is not null
    and created_at >= date_trunc('day', now() at time zone 'America/Toronto') at time zone 'America/Toronto';
$$;


-- only the server may call these
revoke execute on function public.try_nag(text, text, int, int, int) from public, anon, authenticated;
revoke execute on function public.finish_nag(bigint, int, text) from public, anon, authenticated;
revoke execute on function public.today_stats() from public, anon, authenticated;
grant execute on function public.try_nag(text, text, int, int, int) to service_role;
grant execute on function public.finish_nag(bigint, int, text) to service_role;
grant execute on function public.today_stats() to service_role;
