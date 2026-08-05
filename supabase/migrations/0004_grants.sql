-- 360 Review SaaS: base table privileges
--
-- RLS policies only *restrict* rows an already-permitted role can see --
-- they don't grant access on their own. Tables created via a raw SQL
-- migration (rather than the Supabase dashboard's table editor) don't pick
-- up the dashboard's automatic GRANTs, so we do it explicitly here.
--
-- `anon` gets nothing at the table level: the only anon-facing read is
-- get_invite_by_token(), which is SECURITY DEFINER and doesn't need a table
-- grant. Everything else requires `authenticated`.

grant usage on schema public to authenticated;

grant select, update on organizations to authenticated;
grant select, insert, update, delete on org_members to authenticated;
grant select on invites to authenticated;
grant select, insert, update, delete on review_cycles to authenticated;
grant select, insert, update, delete on competencies to authenticated;
grant select, insert, update, delete on questions to authenticated;
grant select, insert, update, delete on assignments to authenticated;
grant select, insert, update on responses to authenticated;
