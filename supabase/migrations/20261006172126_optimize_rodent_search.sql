-- Private deterministic rules, invoked only after a validated authoritative placement.
create or replace function hash3_private.rodent_food(s jsonb,r jsonb,excluded text)
returns jsonb language sql stable set search_path='' as $$
with area as materialized (
select t from jsonb_array_elements(s->'players') p
join lateral jsonb_array_elements(s->'pairs') pair on pair->>'id'=p->>'pair'
join lateral jsonb_array_elements(hash3_private.connected_terrain(s->'terrain',(pair->'active'->>'x')::int,(pair->'active'->>'y')::int)) t on true
where p->>'id'=r->>'player'
)
select c from jsonb_array_elements(s->'cells') c
join area on area.t->>'x'=c->>'x' and area.t->>'y'=c->>'y'
where c->>'id' is distinct from excluded
and not exists(select 1 from jsonb_array_elements(coalesce(s->'rodents','[]')) other where other->>'id'<>r->>'id' and (other->>'phase')::int<3 and other->>'x'=c->>'x' and other->>'y'=c->>'y')
order by abs((c->>'x')::int-(r->>'x')::int)+abs((c->>'y')::int-(r->>'y')::int),(c->>'x')::int,(c->>'y')::int limit 1;
$$;
revoke all on function hash3_private.rodent_food(jsonb,jsonb,text) from public,anon,authenticated;
