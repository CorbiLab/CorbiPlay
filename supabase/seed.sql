-- Hockey Trace — demo data
-- Deterministic UUIDs so this file is idempotent (safe to re-run) and so
-- docs/setup instructions can reference stable ids.
-- Spec §77: Waterloo Ducks, season 2026-2027, 4 teams, 16 fictional U16 Boys
-- players including #8 Théo (PRIMARY U16, TEMPORARY U19), opponent Leopold
-- U16 Boys (lightweight — no managed roster, per spec §16).

-- ---------------------------------------------------------------------
-- Club / Season / Teams
-- ---------------------------------------------------------------------

insert into clubs (id, name, short_name, country, primary_color, secondary_color)
values ('11111111-1111-1111-1111-111111111111', 'Waterloo Ducks', 'Ducks', 'BE', '#008E46', '#FFFFFF')
on conflict (id) do nothing;

insert into seasons (id, club_id, name, start_date, end_date, active)
values ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111',
        '2026-2027', '2026-08-01', '2027-06-30', true)
on conflict (id) do nothing;

insert into teams (id, club_id, season_id, name, short_name, age_category, gender, level)
values
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'Waterloo Ducks U14 Boys', 'U14 Boys', 'U14', 'BOYS', 'CLUB'),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'Waterloo Ducks U16 Boys', 'U16 Boys', 'U16', 'BOYS', 'CLUB'),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'Waterloo Ducks U19 Boys', 'U19 Boys', 'U19', 'BOYS', 'CLUB'),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'Waterloo Ducks Men 1', 'Men 1', 'SENIOR', 'MEN', 'PREMIER')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Players — Waterloo Ducks U16 Boys (16 fictional athletes)
-- ---------------------------------------------------------------------

insert into players (id, club_id, first_name, last_name, display_name, birth_date)
values
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111111', 'Noah', 'Delvaux', 'Noah', '2010-02-11'),
  ('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111111', 'Liam', 'Verhoeven', 'Liam', '2010-05-23'),
  ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111111', 'Adam', 'Lefèvre', 'Adam', '2010-01-30'),
  ('44444444-4444-4444-4444-444444444404', '11111111-1111-1111-1111-111111111111', 'Ethan', 'Maes', 'Ethan', '2009-11-02'),
  ('44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111111', 'Gabriel', 'Willems', 'Gabriel', '2010-07-19'),
  ('44444444-4444-4444-4444-444444444406', '11111111-1111-1111-1111-111111111111', 'Nathan', 'Peeters', 'Nathan', '2010-03-14'),
  ('44444444-4444-4444-4444-444444444407', '11111111-1111-1111-1111-111111111111', 'Hugo', 'Lambert', 'Hugo', '2009-09-27'),
  ('44444444-4444-4444-4444-444444444408', '11111111-1111-1111-1111-111111111111', 'Théo', 'Dubois', 'Théo', '2010-04-05'),
  ('44444444-4444-4444-4444-444444444409', '11111111-1111-1111-1111-111111111111', 'Arthur', 'Claes', 'Arthur', '2010-06-08'),
  ('44444444-4444-4444-4444-444444444410', '11111111-1111-1111-1111-111111111111', 'Louis', 'Vandenberghe', 'Louis', '2009-12-17'),
  ('44444444-4444-4444-4444-444444444411', '11111111-1111-1111-1111-111111111111', 'Mathis', 'Janssens', 'Mathis', '2010-08-21'),
  ('44444444-4444-4444-4444-444444444412', '11111111-1111-1111-1111-111111111111', 'Tom', 'Wouters', 'Tom', '2010-02-28'),
  ('44444444-4444-4444-4444-444444444413', '11111111-1111-1111-1111-111111111111', 'Victor', 'Michaux', 'Victor', '2009-10-09'),
  ('44444444-4444-4444-4444-444444444414', '11111111-1111-1111-1111-111111111111', 'Antoine', 'Gerard', 'Antoine', '2010-05-04'),
  ('44444444-4444-4444-4444-444444444415', '11111111-1111-1111-1111-111111111111', 'Simon', 'Dumont', 'Simon', '2010-09-13'),
  ('44444444-4444-4444-4444-444444444416', '11111111-1111-1111-1111-111111111111', 'Léo', 'Bosmans', 'Léo', '2010-01-22')
on conflict (id) do nothing;

insert into team_memberships (team_id, player_id, shirt_number, positions, membership_type, start_date)
values
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444401', 1, '{GOALKEEPER}', 'PERMANENT', '2026-08-01'),
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444402', 2, '{DEFENDER}', 'PERMANENT', '2026-08-01'),
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444403', 3, '{DEFENDER}', 'PERMANENT', '2026-08-01'),
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444404', 4, '{DEFENDER}', 'PERMANENT', '2026-08-01'),
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444405', 5, '{DEFENDER}', 'PERMANENT', '2026-08-01'),
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444406', 6, '{MIDFIELDER}', 'PERMANENT', '2026-08-01'),
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444407', 7, '{MIDFIELDER}', 'PERMANENT', '2026-08-01'),
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444408', 8, '{MIDFIELDER,FORWARD}', 'PERMANENT', '2026-08-01'),
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444409', 10, '{MIDFIELDER}', 'PERMANENT', '2026-08-01'),
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444410', 11, '{FORWARD}', 'PERMANENT', '2026-08-01'),
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444411', 12, '{FORWARD}', 'PERMANENT', '2026-08-01'),
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444412', 14, '{FORWARD}', 'PERMANENT', '2026-08-01'),
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444413', 15, '{DEFENDER}', 'PERMANENT', '2026-08-01'),
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444414', 16, '{MIDFIELDER}', 'PERMANENT', '2026-08-01'),
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444415', 17, '{FORWARD}', 'PERMANENT', '2026-08-01'),
  ('33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444416', 18, '{GOALKEEPER}', 'PERMANENT', '2026-08-01')
on conflict do nothing;

-- Théo also plays up with U19 Boys (spec §7/§64): dual membership, same athlete identity.
insert into team_memberships (team_id, player_id, shirt_number, positions, membership_type, start_date)
values ('33333333-3333-3333-3333-333333333303', '44444444-4444-4444-4444-444444444408', 22, '{MIDFIELDER}', 'TEMPORARY', '2026-08-01')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Demo match #1 — SCHEDULED, for the Sprint 1 live-encoding walkthrough.
-- ---------------------------------------------------------------------

insert into matches (
  id, season_id, team_id, competition, match_date, venue,
  opponent_name, home_or_away, status, number_of_quarters, quarter_duration_minutes
) values (
  '55555555-5555-5555-5555-555555555501', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333302',
  'Championnat U16', current_date + 3, 'Terrain Waterloo Ducks',
  'Leopold U16 Boys', 'HOME', 'SCHEDULED', 4, 15
) on conflict (id) do nothing;

insert into match_rosters (match_id, player_id, shirt_number, starter, goalkeeper)
values
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444401', 1, true, true),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444402', 2, true, false),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444403', 3, true, false),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444404', 4, true, false),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444405', 5, true, false),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444406', 6, true, false),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444407', 7, true, false),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444408', 8, true, false),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444409', 10, true, false),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444410', 11, true, false),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444411', 12, true, false),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444412', 14, false, false),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444413', 15, false, false),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444414', 16, false, false),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444415', 17, false, false),
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444416', 18, false, true)
on conflict (match_id, player_id) do nothing;

-- ---------------------------------------------------------------------
-- Demo match #2 — FINISHED, with seeded events, so the match dashboard and
-- athlete history have real derived data to show without waiting on a live
-- walkthrough.
-- ---------------------------------------------------------------------

insert into matches (
  id, season_id, team_id, competition, match_date, venue,
  opponent_name, home_or_away, our_score, opponent_score, status,
  number_of_quarters, quarter_duration_minutes, current_quarter
) values (
  '55555555-5555-5555-5555-555555555502', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333302',
  'Championnat U16', current_date - 14, 'Terrain Dragons HC',
  'Dragons U16 Boys', 'AWAY', 3, 1, 'FINISHED', 4, 15, 4
) on conflict (id) do nothing;

insert into match_rosters (match_id, player_id, shirt_number, starter, goalkeeper)
select '55555555-5555-5555-5555-555555555502', player_id, shirt_number, starter, goalkeeper
from match_rosters where match_id = '55555555-5555-5555-5555-555555555501'
on conflict (match_id, player_id) do nothing;

-- Stints: the 11 starters play the full 60 minutes except Louis (#11), who is
-- substituted for Simon (#17) exactly at half-time (end of Q2, 30:00),
-- demonstrating PlayerStint + time-on-pitch without splitting a stint mid-quarter.
insert into player_stints (match_id, player_id, quarter, start_match_elapsed_ms, end_match_elapsed_ms)
values
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444401', 1, 0, 3600000),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444402', 1, 0, 3600000),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444403', 1, 0, 3600000),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444404', 1, 0, 3600000),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444405', 1, 0, 3600000),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444406', 1, 0, 3600000),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444407', 1, 0, 3600000),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444408', 1, 0, 3600000),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444409', 1, 0, 3600000),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444411', 1, 0, 3600000),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444410', 1, 0, 1800000),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444415', 3, 1800000, 3600000)
on conflict do nothing;

-- A realistic-enough spread of events across the 4 quarters (900000ms each).
insert into hockey_events (
  match_id, team_id, player_id, secondary_player_id, quarter,
  match_elapsed_ms, quarter_elapsed_ms, event_category, event_type, outcome, start_x, start_y
) values
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444408', null, 1, 95000, 95000, 'TRANSITION', 'BALL_WIN', 'SUCCESS', 42, 38),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444409', null, 1, 130000, 130000, 'PROGRESSION', 'ENTRY_25', 'SUCCESS', 68, 45),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444410', null, 1, 210000, 210000, 'PROGRESSION', 'CIRCLE_ENTRY', 'SUCCESS', 82, 50),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444410', null, 1, 225000, 225000, 'ATTACK', 'SHOT', 'FAIL', 90, 50),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444406', null, 1, 410000, 410000, 'DEFENCE', 'TACKLE', 'SUCCESS', 30, 20),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444408', '44444444-4444-4444-4444-444444444409', 2, 1050000, 150000, 'ATTACK', 'GOAL', 'SUCCESS', 94, 50),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444407', null, 2, 1200000, 300000, 'TRANSITION', 'TURNOVER', 'FAIL', 45, 60),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444411', null, 2, 1500000, 600000, 'PC', 'PC_WON', 'SUCCESS', 91, 50),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444408', null, 2, 1512000, 612000, 'PC', 'PC_SHOT', 'SUCCESS', 93, 50),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444408', null, 2, 1512000, 612000, 'PC', 'PC_GOAL', 'SUCCESS', 93, 50),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444402', null, 3, 2000000, 200000, 'DEFENCE', 'INTERCEPTION', 'SUCCESS', 22, 40),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444409', null, 3, 2300000, 500000, 'ATTACK', 'CHANCE', 'NEUTRAL', 85, 55),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444410', null, 2, 1800000, 900000, 'SUBSTITUTION', 'PLAYER_OUT', null, null, null),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444415', null, 3, 1800000, 0, 'SUBSTITUTION', 'PLAYER_IN', null, null, null),
  ('55555555-5555-5555-5555-555555555502', '33333333-3333-3333-3333-333333333302', '44444444-4444-4444-4444-444444444415', '44444444-4444-4444-4444-444444444409', 4, 3300000, 600000, 'ATTACK', 'GOAL', null, 96, 48)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Bootstrap helper: link the first real Supabase Auth user (created by
-- signing up through the app, or via the Studio) as club-wide ADMIN for the
-- demo club. Deliberately NOT granted to `authenticated` — run it from the
-- Supabase SQL editor (or `supabase db execute`), which runs as postgres, so
-- a signed-in app user can never call this on themselves. Refuses to run
-- once the club already has an admin, so it's a one-time bootstrap step, not
-- a standing privilege-escalation function. Usage, after signing up:
--   select app.bootstrap_admin('you@example.com');
-- ---------------------------------------------------------------------

create or replace function app.bootstrap_admin(user_email text)
  returns void language plpgsql security definer set search_path = public as $$
declare
  target_user_id uuid;
  demo_club_id uuid := '11111111-1111-1111-1111-111111111111';
begin
  if exists (
    select 1 from staff_access
    where club_id = demo_club_id and team_id is null and role in ('ADMIN', 'CLUB_ADMIN')
  ) then
    raise exception 'Demo club already has a club-wide admin. Grant access via the Settings > Staff UI instead.';
  end if;

  select id into target_user_id from auth.users where email = user_email;
  if target_user_id is null then
    raise exception 'No auth.users row for email %. Sign up in the app first.', user_email;
  end if;

  update profiles set club_id = demo_club_id where id = target_user_id;

  insert into staff_access (user_id, club_id, team_id, role)
  values (target_user_id, demo_club_id, null, 'ADMIN')
  on conflict (user_id, club_id, team_id, role) do nothing;
end;
$$;
