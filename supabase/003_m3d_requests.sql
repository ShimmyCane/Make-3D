-- Make 3D: new requests. Architecture project (xabgankckrcuhcgdolrg).
-- One row per "New request" saved on the front page: what the owner would like a 3-D model of, in which category.
-- The gather-todo skill (.claude/skills/gather-todo) reads the rows with status 'new', writes them into todo.md,
-- and deletes each row once it is on the list.
-- Access: owner only, the same rule as public.m3d_scene_log and public.m3d_scenes: the signed-in email is the owner's.
-- Applied as migration "m3d_requests" on 2026-11-05. (002 and 001 name public.platform_is_owner(), which this project
-- does not have; the live policies use the email check below. Keep the three in step.)

create table if not exists public.m3d_requests (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('science', 'tests', 'architecture', 'fun', 'unsorted')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  status text not null default 'new' check (status in ('new', 'to_do', 'done')),
  created_at timestamptz not null default now()
);

create index if not exists m3d_requests_status_idx on public.m3d_requests (status, created_at);

alter table public.m3d_requests enable row level security;
revoke all on public.m3d_requests from anon;

create policy "owner full access" on public.m3d_requests for all to authenticated
  using ((auth.jwt() ->> 'email') = 'splusystudio@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'splusystudio@gmail.com');

insert into public.table_index (table_name, project, purpose) values
  ('m3d_requests', 'Make 3D', 'New 3-D model requests from the front page: category, description, status (new, to_do, done); the gather-todo skill moves them to todo.md and deletes the rows')
on conflict (table_name) do update set project = excluded.project, purpose = excluded.purpose;

-- TEST (run after 04 AI/Supabase/platform_owner.sql; run as one statement; the final raise rolls back the test rows):
-- do $$
-- declare owner_n int; other_n int;
-- begin
--   insert into public.platform_owners (user_id, note) values ('00000000-0000-4000-8000-000000000001', 'test');
--   perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000001"}', true);
--   set local role authenticated;
--   insert into public.m3d_requests (category, body) values ('fun', 'test');
--   select count(*) into owner_n from public.m3d_requests;
--   perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-4000-8000-000000000002"}', true);
--   select count(*) into other_n from public.m3d_requests;
--   reset role;
--   raise exception 'TEST RESULT owner_sees=% other_sees=% (rolled back)', owner_n, other_n;
-- end $$;
