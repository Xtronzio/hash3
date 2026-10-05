create table if not exists hash3_private.pair_lobbies (
code text primary key default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
host_uid uuid not null references auth.users(id), host_name text not null,
guest_uid uuid references auth.users(id), guest_name text,
status text not null default 'waiting' check (status in ('waiting','started','cancelled')),
world_code text, created_at timestamptz not null default now(),
host_seen timestamptz not null default now(),guest_seen timestamptz,
expires_at timestamptz not null default now()+interval '30 minutes');
alter table hash3_private.pair_lobbies enable row level security;
revoke all on hash3_private.pair_lobbies from public,anon,authenticated;
create index if not exists hash3_pair_host on hash3_private.pair_lobbies(host_uid) where status='waiting';
create index if not exists hash3_pair_guest on hash3_private.pair_lobbies(guest_uid) where status='waiting';

create or replace function hash3_private.max_value(actions jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare n int:=jsonb_array_length(actions);eff numeric;means numeric[];m numeric;variance numeric;consistent numeric;combo numeric;value numeric;
begin
if n=0 then return jsonb_build_object('value',null,'actions',0,'provisional',true);end if;
select avg((v->>'points')::numeric) into eff from jsonb_array_elements(actions) v;
select array_agg(a order by block) into means from (select (ord-1)/10 as block,avg((v->>'points')::numeric) as a from jsonb_array_elements(actions) with ordinality e(v,ord) group by (ord-1)/10) q;
select avg(v) into m from unnest(means) v;
select avg((v-m)*(v-m)) into variance from unnest(means) v;
consistent:=case when m>0 then 1/(1+sqrt(variance)/m) else 0 end;
select coalesce(count(*) filter(where (v->>'figures')::int>1)::numeric/nullif(count(*) filter(where (v->>'figures')::int>0),0),0) into combo from jsonb_array_elements(actions) v;
value:=round(100*eff*(.8+.1*consistent+.1*combo),6);
return jsonb_build_object('value',value,'actions',n,'provisional',n<100);
end;$$;
create or replace function hash3_private.max_record(player jsonb,points int,figures int,automatic boolean)
returns jsonb language plpgsql immutable set search_path='' as $$
declare actions jsonb;metric jsonb;prev numeric:=(player->'max'->>'value')::numeric;
begin
select jsonb_agg(v order by ord) into actions from (select v,ord from jsonb_array_elements(coalesce(player->'maxActions','[]')||jsonb_build_array(jsonb_build_object('points',case when automatic then 0 else greatest(0,points) end,'figures',case when automatic then 0 else figures end))) with ordinality e(v,ord) order by ord desc limit 100) q;
metric:=hash3_private.max_value(actions);metric:=metric||jsonb_build_object('change',case when prev is null then 0 else sign((metric->>'value')::numeric-prev) end);
return player||jsonb_build_object('maxActions',actions,'max',metric);
end;$$;
revoke all on function hash3_private.max_value(jsonb),hash3_private.max_record(jsonb,int,int,boolean) from public,anon,authenticated;

-- Preserve the existing world entry implementation behind the new gateway.
alter function hash3_private.gateway(text,jsonb) rename to world_gateway;
revoke all on function hash3_private.world_gateway(text,jsonb) from public,anon,authenticated;
create function hash3_private.gateway(action text,payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();l hash3_private.pair_lobbies%rowtype;s jsonb;t jsonb;c text;invite text;n text;oldsub text;pi int;
begin
if uid is null then raise exception 'Entra como invitado para continuar.' using errcode='28000';end if;
if action like 'pair_%' then
if action in ('pair_create','pair_join') then
n:=btrim(payload->>'name');if n is null or length(n) not between 2 and 18 or n ~ '[[:cntrl:]]' then raise exception 'El apodo debe tener entre 2 y 18 caracteres.';end if;
if exists(select 1 from hash3_private.rooms r cross join lateral jsonb_array_elements(r.state->'players') p where r.state->>'commonWorld'='true' and p->>'id'=uid::text and coalesce((p->>'active')::boolean,true)) then raise exception 'Abandona tu partida actual de Mundo antes de preparar una nueva pareja.';end if;
end if;
if action='pair_create' then
perform pg_advisory_xact_lock(hashtext(uid::text));
select * into l from hash3_private.pair_lobbies where (host_uid=uid or guest_uid=uid) and status='waiting' and expires_at>now() order by created_at desc limit 1;
if l.code is null then insert into hash3_private.pair_lobbies(host_uid,host_name) values(uid,n) returning * into l;end if;
elsif action='pair_join' then
perform pg_advisory_xact_lock(hashtext(uid::text));
if exists(select 1 from hash3_private.pair_lobbies where (host_uid=uid or guest_uid=uid) and status='waiting' and expires_at>now() and code<>upper(btrim(payload->>'code'))) then raise exception 'Ya estás en otra antesala. Sal de ella primero.';end if;
select * into l from hash3_private.pair_lobbies where code=upper(btrim(payload->>'code')) for update;
if l.code is null or l.status<>'waiting' or l.expires_at<=now() then raise exception 'No hay una antesala abierta con ese código.';end if;
if l.host_uid=uid then raise exception 'Abre el código en el dispositivo de tu duelista.';end if;
if l.guest_uid is not null and l.guest_uid<>uid then raise exception 'Esta pareja ya está completa.';end if;
if lower(n)=lower(l.host_name) then raise exception 'Usad apodos distintos.';end if;
update hash3_private.pair_lobbies set guest_uid=uid,guest_name=n,guest_seen=now() where code=l.code returning * into l;
else
select * into l from hash3_private.pair_lobbies where code=upper(btrim(payload->>'code')) for update;
if l.code is null or (l.host_uid<>uid and l.guest_uid is distinct from uid) then raise exception 'No perteneces a esta antesala.' using errcode='42501';end if;
if action='pair_start' and l.status='started' then return hash3_private.command('get',jsonb_build_object('code',l.world_code));end if;
if action='pair_leave' then
if l.status='started' then raise exception 'Ya habéis entrado. Abandona desde la partida.';end if;
if l.host_uid=uid then update hash3_private.pair_lobbies set status='cancelled' where code=l.code returning * into l;
else update hash3_private.pair_lobbies set guest_uid=null,guest_name=null,guest_seen=null where code=l.code returning * into l;end if;
return jsonb_build_object('pairLobby',true,'status','left');
end if;
if l.status='started' then return hash3_private.command('get',jsonb_build_object('code',l.world_code));end if;
if l.status='cancelled' or l.expires_at<=now() then return jsonb_build_object('pairLobby',true,'status','cancelled');end if;
if action='pair_start' then
if l.host_uid<>uid then raise exception 'Quien creó la pareja pulsa Entrar al Mundo.' using errcode='42501';end if;
if l.guest_uid is null or l.guest_seen<now()-interval '30 seconds' then raise exception 'Espera a que tu duelista esté en la antesala.';end if;
perform pg_advisory_xact_lock(8303109);
if exists(select 1 from hash3_private.rooms r cross join lateral jsonb_array_elements(r.state->'players') p where r.state->>'commonWorld'='true' and p->>'id' in (l.host_uid::text,l.guest_uid::text) and coalesce((p->>'active')::boolean,true)) then raise exception 'Uno de vosotros ya está jugando en Mundo. Debe abandonar primero.';end if;
-- All changes, both memberships and the common turn deadline commit together.
s:=hash3_private.world_gateway('world',jsonb_build_object('name',l.host_name,'preference','new'));
c:=s->>'code';s:=hash3_private.command('reserve',jsonb_build_object('code',c));
select (p->>'pair')::int into pi from jsonb_array_elements(s->'players') p where p->>'id'=uid::text;
invite:=s->'pairs'->pi->>'invite';oldsub:=current_setting('request.jwt.claim.sub',true);
perform set_config('request.jwt.claim.sub',l.guest_uid::text,true);
-- If the second player entered elsewhere after joining the anteroom, refuse atomically.
if exists(select 1 from jsonb_array_elements(s->'players') p where p->>'id'=l.guest_uid::text and coalesce((p->>'active')::boolean,true)) then raise exception 'Tu duelista ya está jugando en Mundo. Debe abandonar primero.';end if;
t:=hash3_private.command('join',jsonb_build_object('code',c,'name',l.guest_name,'rival',invite));
perform set_config('request.jwt.claim.sub',coalesce(oldsub,''),true);
-- Both start with a fresh 30-second human turn, even after replacing a bot slot.
update hash3_private.rooms set state=jsonb_set(state,array['pairs',pi::text,'deadline'],to_jsonb(now()+interval '30 seconds')) where code=c;
update hash3_private.pair_lobbies set status='started',world_code=c where code=l.code;
return hash3_private.command('get',jsonb_build_object('code',c));
end if;
end if;
update hash3_private.pair_lobbies set host_seen=case when host_uid=uid then now() else host_seen end,guest_seen=case when guest_uid=uid then now() else guest_seen end where code=l.code returning * into l;
return jsonb_build_object('pairLobby',true,'code',l.code,'host',l.host_uid,'hostName',l.host_name,'guestName',l.guest_name,'ready',l.guest_uid is not null and l.guest_seen>now()-interval '30 seconds','status',l.status,'expiresAt',l.expires_at);
end if;
if action='reserve' or (action='join' and coalesce(payload->>'rival','')<>'') then
if exists(select 1 from hash3_private.rooms r where r.code=upper(btrim(payload->>'code')) and r.state->>'commonWorld'='true') then raise exception 'Para entrar juntos, preparad la pareja en la antesala de Mundo.';end if;
end if;
if action='world' and payload->>'preference'='new' then raise exception 'Para entrar juntos, preparad la pareja en la antesala.';end if;
return hash3_private.world_gateway(action,payload);
end;$$;
revoke all on function hash3_private.gateway(text,jsonb) from public,anon;
grant execute on function hash3_private.gateway(text,jsonb) to authenticated;
create or replace function public.hash3_command(action text,payload jsonb default '{}'::jsonb)
returns jsonb language sql set search_path='' as $$ select hash3_private.gateway(action,payload); $$;

create or replace function hash3_private.track_max()
returns trigger language plpgsql security definer set search_path='' as $$
declare s jsonb:=new.state;p jsonb;oldp jsonb;e jsonb;ai int;seen jsonb;event_ids text[]:='{}';
begin
-- Carry metrics across legacy functions' intermediate writes.
for p,ai in select v,(ord-1)::int from jsonb_array_elements(s->'players') with ordinality q(v,ord) loop
select v into oldp from jsonb_array_elements(old.state->'players') v where v->>'id'=p->>'id';
if oldp ? 'maxActions' then p:=p||jsonb_build_object('maxActions',oldp->'maxActions','max',oldp->'max');s:=jsonb_set(s,array['players',ai::text],p);end if;
end loop;
select coalesce(jsonb_agg(v->'lastEvent'),'[]')||case when old.state->'lastEvent' is not null then jsonb_build_array(old.state->'lastEvent') else '[]'::jsonb end into seen from jsonb_array_elements(old.state->'pairs') v;
for e in select v from jsonb_array_elements((select coalesce(jsonb_agg(v->'lastEvent'),'[]') from jsonb_array_elements(s->'pairs') v)||case when s->'lastEvent' is not null then jsonb_build_array(s->'lastEvent') else '[]'::jsonb end) v where v->>'kind'='move' loop
if e->>'id'=any(event_ids) or exists(select 1 from jsonb_array_elements(seen) v where v->>'id'=e->>'id') then continue;end if;
event_ids:=array_append(event_ids,e->>'id');
select v,(ord-1)::int into p,ai from jsonb_array_elements(s->'players') with ordinality q(v,ord) where v->>'id'=e->>'player';
if p is null or coalesce((p->>'bot')::boolean,false) then continue;end if;
p:=hash3_private.max_record(p,coalesce((e->>'points')::int,0)-coalesce((e->>'bonus')::int,0),coalesce((e->>'figures')::int,0),coalesce((e->>'automatic')::boolean,false));
s:=jsonb_set(s,array['players',ai::text],p);
end loop;
new.state:=s;return new;
end;$$;
revoke all on function hash3_private.track_max() from public,anon,authenticated;
create trigger hash3_max_before_update before update of state on hash3_private.rooms for each row execute function hash3_private.track_max();
create or replace function hash3_private.hydrate_result(result jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb;
begin
if auth.uid() is null then raise exception 'Sin sesión.' using errcode='28000';end if;
if result->>'id' is not null and exists(select 1 from hash3_private.members where room_id=(result->>'id')::uuid and user_id=auth.uid()) then
select state into s from hash3_private.rooms where id=(result->>'id')::uuid;
return hash3_private.player_view(s,auth.uid()::text);
end if;
return result;
end;$$;
revoke all on function hash3_private.hydrate_result(jsonb) from public,anon;
grant execute on function hash3_private.hydrate_result(jsonb) to authenticated;
create or replace function public.hash3_command(action text,payload jsonb default '{}'::jsonb)
returns jsonb language sql set search_path='' as $$ select hash3_private.hydrate_result(hash3_private.gateway(action,payload)); $$;
