-- Read-only, own-user summaries. Never send boards or other players' data.
create or replace function hash3_private.personal_metrics()
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();entries jsonb;
begin
 if uid is null then raise exception 'Sin sesión.' using errcode='28000';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'game',r.id,'mode',case when r.state->>'commonWorld'='true' then 'world' else 'duel' end,
  'name',p->>'name','participant',uid,'status',r.state->>'status',
  'score',coalesce((p->>'score')::numeric,0),'figures',coalesce((p->>'figures')::numeric,0),
  'placements',(p->>'placements')::numeric,'bestCombo',(p->'bestCombo'->>'points')::numeric,
  'max',(p->'max'->>'value')::numeric,'maxActions',p->'max'->'actions','provisional',p->'max'->'provisional',
  'level',r.state->>'level') order by r.updated_at desc),'[]'::jsonb) into entries
 from hash3_private.members m join hash3_private.rooms r on r.id=m.room_id
 cross join lateral (select v p from jsonb_array_elements(r.state->'players') v where v->>'id'=uid::text and not coalesce((v->>'bot')::boolean,false)) own
 where m.user_id=uid;
 return jsonb_build_object('entries',entries);
end $$;
revoke all on function hash3_private.personal_metrics() from public,anon,authenticated;
-- Preserve the existing gateway, authorization, voting and clock behavior.
do $$
declare definition text;
begin
 select pg_get_functiondef('hash3_private.session_gateway(text,jsonb)'::regprocedure) into definition;
 if position('if action=''my_metrics''' in definition)=0 then
  if position('if action in (''my_games'',''world_rank'',''remove_game'')' in definition)=0 then raise exception 'Unexpected session gateway definition';end if;
  definition:=replace(definition,'if action in (''my_games'',''world_rank'',''remove_game'')','if action=''my_metrics'' then return hash3_private.personal_metrics();end if;'||chr(10)||'if action in (''my_games'',''world_rank'',''remove_game'')');
  execute definition;
 end if;
end $$;
