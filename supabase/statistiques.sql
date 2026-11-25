-- ════════════════════════════════════════════════════════════════════════
-- STATISTIQUES ANONYMES — Bubble Nostalgia et Les Mots Fléchés
-- À exécuter dans Supabase : SQL Editor → New query → coller → Run.
-- Peut être relancé sans risque (ne supprime aucune donnée).
--
-- Mot de passe du tableau de bord (sergebelmont.com/stats/) : tout en bas.
--  • Première installation : remplacez REMPLACEZ-MOI par un mot de passe de
--    votre choix (12 caractères au moins), sinon le script refuse de tourner.
--  • Mise à jour : laissez REMPLACEZ-MOI tel quel, votre mot de passe actuel
--    est conservé. Pour le changer, mettez le nouveau à la place.
--  Il n'est enregistré que sous forme chiffrée (empreinte), jamais en clair.
--
-- Principe (conforme à l'exemption de consentement de la CNIL pour la mesure
-- d'audience) :
--  • un identifiant anonyme tiré au hasard par appareil, aucune adresse IP,
--    aucun nom, aucune donnée partagée ni croisée ;
--  • les données de plus de 13 mois sont effacées automatiquement ;
--  • les jeux ne peuvent QU'AJOUTER des événements (fonction log_events) ; seul
--    le tableau de bord, avec le mot de passe, peut lire des totaux (get_stats).
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.events (
  id       bigserial primary key,
  visitor  uuid        not null,
  session  uuid        not null,
  ts       timestamptz not null default now(),
  type     text        not null,
  level    int,
  seconds  int,
  percent  int,
  result   text,
  lang     text,
  src      text,
  device   text
);
-- Jeu concerné (« bubble » ou « mf » = Les Mots Fléchés) et indices utilisés.
alter table public.events add column if not exists game text not null default 'bubble';
alter table public.events add column if not exists hints int;
create index if not exists events_ts_idx on public.events (ts);
create index if not exists events_visitor_idx on public.events (visitor, ts);
create index if not exists events_game_ts_idx on public.events (game, ts);

create table if not exists public.stats_access (
  id        int primary key default 1 check (id = 1),
  key_hash  bytea not null
);

alter table public.events enable row level security;
alter table public.stats_access enable row level security;
revoke all on public.events from anon, authenticated;
revoke all on public.stats_access from anon, authenticated;

-- ── Enregistrer des événements (appelé par les jeux, par lots) ───────────
create or replace function public.log_events(p_visitor uuid, p_session uuid, p_events jsonb)
returns int
language plpgsql security definer set search_path = public as $$
declare
  e jsonb;
  n int := 0;
  recent int;
begin
  if p_visitor is null or p_session is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'requete_invalide';
  end if;
  if jsonb_array_length(p_events) > 50 then raise exception 'trop_evenements'; end if;
  -- Anti-abus : 600 événements par appareil et par heure au plus.
  select count(*) into recent from events where visitor = p_visitor and ts > now() - interval '1 hour';
  if recent > 600 then return 0; end if;

  for e in select * from jsonb_array_elements(p_events) loop
    if (e->>'type') not in ('open', 'time', 'level_start', 'level_end', 'collection', 'photo', 'guide',
                            'board', 'pseudo', 'lang', 'optout', 'stats', 'univers') then
      continue;
    end if;
    insert into events (visitor, session, type, level, seconds, percent, result, lang, src, device, game, hints)
    values (
      p_visitor, p_session, e->>'type',
      case when (e->>'level') ~ '^\d{1,3}$' then (e->>'level')::int end,
      case when (e->>'seconds') ~ '^\d{1,5}$' then least((e->>'seconds')::int, 7200) end,
      case when (e->>'percent') ~ '^\d{1,3}$' then least((e->>'percent')::int, 100) end,
      case when (e->>'result') in ('won', 'lost', 'quit') then e->>'result' end,
      case when (e->>'lang') ~ '^[a-z]{2}$' then e->>'lang' end,
      case when (e->>'src') ~ '^[a-z0-9_.-]{1,30}$' then e->>'src' end,
      case when (e->>'device') in ('mobile', 'tablet', 'desktop') then e->>'device' end,
      case when (e->>'game') = 'mf' then 'mf' else 'bubble' end,
      case when (e->>'hints') ~ '^\d{1,3}$' then (e->>'hints')::int end
    );
    n := n + 1;
  end loop;

  -- Conservation limitée à 13 mois (nettoyage de temps en temps).
  if random() < 0.02 then
    delete from events where ts < now() - interval '13 months';
  end if;
  return n;
end $$;

-- ── Lire les statistiques (tableau de bord, protégé par mot de passe) ─────
-- p_game : null = les deux jeux ensemble, 'bubble' ou 'mf' = un seul jeu.
drop function if exists public.get_stats(text, int);
create or replace function public.get_stats(p_password text, p_days int default 30, p_game text default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz;
  v_out jsonb;
begin
  if not exists (
    select 1 from stats_access where key_hash = sha256(convert_to(coalesce(p_password, ''), 'UTF8'))
  ) then
    perform pg_sleep(1); -- freine les essais de mots de passe en série
    raise exception 'mot_de_passe';
  end if;
  if p_game is not null and p_game not in ('bubble', 'mf') then raise exception 'jeu_inconnu'; end if;
  since := date_trunc('day', now()) - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)) - 1);

  with allev as (select * from events where p_game is null or game = p_game),
  ev as (select * from allev where ts >= since),
  firsts as (select visitor, min(date_trunc('day', ts)) as first_day from allev group by visitor),
  days as (
    select generate_series(date_trunc('day', since), date_trunc('day', now()), interval '1 day') as d
  ),
  daily as (
    select d.d as day,
           (select count(distinct visitor) from ev where date_trunc('day', ev.ts) = d.d) as visitors,
           (select count(*) from firsts f where f.first_day = d.d) as new_visitors,
           (select count(distinct session) from ev where date_trunc('day', ev.ts) = d.d) as sessions
    from days d
  ),
  visit_days as (select distinct visitor, date_trunc('day', ts) as day from allev),
  cohort as (
    select f.visitor, f.first_day,
           exists (select 1 from visit_days v where v.visitor = f.visitor and v.day = f.first_day + interval '1 day') as d1,
           exists (select 1 from visit_days v where v.visitor = f.visitor
                     and v.day > f.first_day and v.day <= f.first_day + interval '7 days') as d7,
           (select count(*) from visit_days v where v.visitor = f.visitor) as nb_days
    from firsts f
    where f.first_day >= since
  ),
  session_time as (
    select session, sum(seconds) as secs from ev where type = 'time' group by session
  ),
  levels as (
    select game, level,
           count(*) filter (where type = 'level_start') as started,
           count(*) filter (where type = 'level_end' and result = 'won') as won,
           count(*) filter (where type = 'level_end' and result = 'lost') as lost,
           count(*) filter (where type = 'level_end' and result = 'quit') as quit,
           count(distinct visitor) filter (where type = 'level_start') as players,
           round(avg(seconds) filter (where type = 'level_end'))::int as avg_seconds,
           round(avg(percent) filter (where type = 'level_end' and result <> 'won'))::int as avg_percent_failed,
           round(avg(hints) filter (where type = 'level_end' and result = 'won'), 1) as avg_hints
    from ev where level is not null group by game, level
  ),
  furthest as (
    -- Bubble : dernier niveau gagné ; Mots Fléchés : dernière grille du parcours terminée.
    select game, visitor,
           coalesce(max(level) filter (where type = 'level_end' and result = 'won' and level between 1 and 99), 0) as best
    from allev group by game, visitor
  )
  select jsonb_build_object(
    'since', since,
    'game', p_game,
    'totals', jsonb_build_object(
      'visitors', (select count(distinct visitor) from ev),
      'new_visitors', (select count(*) from firsts where first_day >= since),
      'sessions', (select count(distinct session) from ev),
      'levels_played', (select count(*) from ev where type = 'level_start'),
      'levels_won', (select count(*) from ev where type = 'level_end' and result = 'won'),
      'avg_session_seconds', (select coalesce(round(avg(secs))::int, 0) from session_time),
      'total_play_hours', (select coalesce(round(sum(secs) / 3600.0, 1), 0) from session_time)
    ),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'), 'visitors', visitors,
                                 'new', new_visitors, 'sessions', sessions) order by day), '[]') from daily),
    'retention', jsonb_build_object(
      'cohort', (select count(*) from cohort),
      'cohort_d1_eligible', (select count(*) from cohort where first_day <= date_trunc('day', now()) - interval '1 day'),
      'd1', (select count(*) from cohort where d1 and first_day <= date_trunc('day', now()) - interval '1 day'),
      'cohort_d7_eligible', (select count(*) from cohort where first_day <= date_trunc('day', now()) - interval '7 days'),
      'd7', (select count(*) from cohort where d7 and first_day <= date_trunc('day', now()) - interval '7 days'),
      'multi_days', (select count(*) from cohort where nb_days >= 2)
    ),
    'levels', (select coalesce(jsonb_agg(to_jsonb(levels) order by game, level), '[]') from levels),
    'furthest', (select coalesce(jsonb_agg(jsonb_build_object('game', game, 'level', best, 'visitors', n) order by game, best), '[]')
                 from (select game, best, count(*) as n from furthest
                       where visitor in (select distinct visitor from ev) group by game, best) x),
    'by_game', (select coalesce(jsonb_agg(jsonb_build_object('key', game, 'visitors', n) order by n desc), '[]')
                from (select game, count(distinct visitor) as n from ev group by game) x),
    'by_lang', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'visitors', n) order by n desc), '[]')
                from (select coalesce(lang, '?') as k, count(distinct visitor) as n from ev where type = 'open' group by 1) x),
    'by_src', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'visitors', n) order by n desc), '[]')
               from (select coalesce(src, 'direct') as k, count(distinct visitor) as n from ev where type = 'open' group by 1) x),
    'by_device', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'visitors', n) order by n desc), '[]')
                  from (select coalesce(device, '?') as k, count(distinct visitor) as n from ev where type = 'open' group by 1) x),
    'features', jsonb_build_object(
      'collection', (select count(distinct visitor) from ev where type = 'collection'),
      'photo', (select count(*) from ev where type = 'photo'),
      'guide', (select count(distinct visitor) from ev where type = 'guide'),
      'board', (select count(distinct visitor) from ev where type = 'board'),
      'pseudo', (select count(distinct visitor) from ev where type = 'pseudo'),
      'lang_change', (select count(distinct visitor) from ev where type = 'lang'),
      'stats', (select count(distinct visitor) from ev where type = 'stats'),
      'univers', (select count(distinct visitor) from ev where type = 'univers')
    )
  ) into v_out;
  return v_out;
end $$;

revoke all on function public.log_events(uuid, uuid, jsonb) from public;
revoke all on function public.get_stats(text, int, text) from public;
grant execute on function public.log_events(uuid, uuid, jsonb) to anon;
grant execute on function public.get_stats(text, int, text) to anon;

-- ── Mot de passe du tableau de bord ──────────────────────────────────────
-- Première installation : remplacez REMPLACEZ-MOI par votre mot de passe
-- (gardez les apostrophes). Mise à jour : laissez tel quel pour garder l'actuel.
do $$
declare
  pw text := 'REMPLACEZ-MOI';
begin
  if pw = 'REMPLACEZ-' || 'MOI' then
    if exists (select 1 from stats_access) then
      raise notice 'Mot de passe inchangé.';
      return;
    end if;
    raise exception 'Choisissez un mot de passe de 12 caractères ou plus à la place de REMPLACEZ-MOI.';
  end if;
  if char_length(pw) < 12 then
    raise exception 'Le mot de passe doit faire 12 caractères ou plus.';
  end if;
  insert into stats_access (id, key_hash) values (1, sha256(convert_to(pw, 'UTF8')))
  on conflict (id) do update set key_hash = excluded.key_hash;
end $$;
