-- R0.12: personal session visibility. Shared rooms and rankings are preserved.
alter table hash3_private.members add column hidden_at timestamptz;
create or replace function hash3_private.session_queries(action text,payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();result jsonb;period text:=coalesce(payload->>'period','all');d date;starts timestamptz;ends timestamptz;local_start timestamp;local_end timestamp;hr int;off int;rows jsonb;target_room hash3_private.rooms%rowtype;s jsonb;own jsonb;
begin
if uid is null then raise exception 'Sin sesión.' using errcode='28000';end if;
if action='remove_game' then
select * into target_room from hash3_private.rooms where code=upper(btrim(payload->>'code')) for update;
if target_room.id is null or not exists(select 1 from hash3_private.members m where m.room_id=target_room.id and m.user_id=uid) then raise exception 'No perteneces a esta sala.' using errcode='42501';end if;
select v into own from jsonb_array_elements(target_room.state->'players') v where v->>'id'=uid::text;
if target_room.state->>'status'<>'finished' and coalesce((own->>'active')::boolean,false) then s:=hash3_private.gateway('leave',jsonb_build_object('code',target_room.code));end if;
update hash3_private.members set hidden_at=now() where room_id=target_room.id and user_id=uid;
return jsonb_build_object('removed',true);
end if;
if action='my_games' then
select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'code',r.code,'kind',coalesce(r.state->>'kind','world'),'commonWorld',coalesce((r.state->>'commonWorld')::boolean,false),'status',r.state->>'status','timeMode',coalesce(r.state->>'timeMode','timed'),'level',coalesce(r.state->>'level','normal'),'createdAt',r.created_at,'updatedAt',r.updated_at,'active',coalesce((p->>'active')::boolean,true),'score',p->'score','figures',p->'figures','yourTurn',coalesce(p->>'id'=case when (pair->>'pending')::int>0 then pair->>'expander' else pair->>lower(pair->>'turn') end,false),'players',(select coalesce(jsonb_agg(v->>'name'),'[]') from jsonb_array_elements(r.state->'players') v where not coalesce((v->>'bot')::boolean,false)),'vote',r.state->'vote') order by r.updated_at desc),'[]') into rows
from hash3_private.members m join hash3_private.rooms r on r.id=m.room_id
cross join lateral (select v p from jsonb_array_elements(r.state->'players') v where v->>'id'=uid::text) you
left join lateral (select v pair from jsonb_array_elements(r.state->'pairs') v where v->>'id'=p->>'pair') pa on true
where m.user_id=uid and m.hidden_at is null;
return jsonb_build_object('games',rows);
end if;
if action<>'world_rank' then raise exception 'Consulta desconocida.';end if;
if period not in ('all','year','month','week','day','hour') then raise exception 'Periodo no válido.';end if;
off:=coalesce((payload->>'offset')::int,0);if off<0 or off>100000 then raise exception 'Página no válida.';end if;
if period='all' then
with players as (select v from hash3_private.rooms r cross join lateral jsonb_array_elements(r.state->'players') v where r.state->>'commonWorld'='true' and not coalesce((v->>'bot')::boolean,false)),
ranked as (select v,row_number() over(order by (v->'max'->>'value')::numeric desc nulls last,(v->>'order')::int) position from players)
select coalesce(jsonb_agg(v||jsonb_build_object('rank',position) order by position),'[]') into rows from ranked;
else
d:=coalesce((payload->>'date')::date,(now() at time zone 'Europe/Madrid')::date);
hr:=coalesce((payload->>'hour')::int,extract(hour from now() at time zone 'Europe/Madrid')::int);if hr not between 0 and 23 then raise exception 'Hora no válida.';end if;
local_start:=case when period='hour' then d::timestamp+make_interval(hours=>hr) else date_trunc(period,d::timestamp) end;
local_end:=local_start+case period when 'year' then interval '1 year' when 'month' then interval '1 month' when 'week' then interval '1 week' when 'day' then interval '1 day' else interval '1 hour' end;
starts:=local_start at time zone 'Europe/Madrid';ends:=local_end at time zone 'Europe/Madrid';
with actions as (select a.*,row_number() over(partition by user_id order by happened_at desc,event_id desc) ord from hash3_private.world_actions a where happened_at>=starts and happened_at<ends),
metrics as (select user_id,(array_agg(name order by ord))[1] name,(array_agg(symbol order by ord))[1] symbol,sum(points) points,sum(figures) figures,count(*) total_actions,hash3_private.max_value(jsonb_agg(jsonb_build_object('points',metric_points,'figures',metric_figures) order by ord desc) filter(where ord<=100)) metric from actions group by user_id),
ranked as (select *,row_number() over(order by (metric->>'value')::numeric desc,user_id) position from metrics)
select coalesce(jsonb_agg(jsonb_build_object('id',user_id,'name',name,'symbol',symbol,'score',points,'figures',figures,'totalActions',total_actions,'max',metric,'rank',position) order by position),'[]') into rows from ranked;
end if;
return jsonb_build_object('period',period,'from',starts,'to',ends,'timezone','Europe/Madrid','historyStart',(select min(happened_at) from hash3_private.world_actions),'total',jsonb_array_length(rows),'players',(select coalesce(jsonb_agg(v order by ord),'[]') from jsonb_array_elements(rows) with ordinality q(v,ord) where ord>off and ord<=off+100),'you',(select own.item from jsonb_array_elements(rows) own(item) where own.item->>'id'=uid::text),'above',(select q.item from jsonb_array_elements(rows) with ordinality q(item,ord) where q.ord=(select (own.item->>'rank')::int-1 from jsonb_array_elements(rows) own(item) where own.item->>'id'=uid::text)));
end;$$;

create function hash3_private.session_gateway(action text,payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;uid uuid:=auth.uid();
begin
if uid is null then raise exception 'Sin sesión.' using errcode='28000';end if;
if action in ('my_games','world_rank','remove_game') then return hash3_private.session_queries(action,payload);end if;
result:=hash3_private.hydrate_result(hash3_private.gateway(action,payload));
if action in ('get','join','world','pair_start') and result->>'id' is not null then
update hash3_private.members set hidden_at=null where user_id=uid and room_id=(result->>'id')::uuid and hidden_at is not null;
end if;
return result;
end;$$;
revoke all on function hash3_private.session_gateway(text,jsonb) from public,anon;
grant execute on function hash3_private.session_gateway(text,jsonb) to authenticated;
create or replace function public.hash3_command(action text,payload jsonb default '{}'::jsonb)
returns jsonb language sql set search_path='' as $$ select hash3_private.session_gateway(action,payload); $$;
