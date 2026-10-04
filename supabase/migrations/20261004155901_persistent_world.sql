-- Persistent participation. Existing boards and scores are retained.
alter function hash3_private.command(text,jsonb) rename to legacy_command;
revoke all on function hash3_private.legacy_command(text,jsonb) from public,anon,authenticated;

create or replace function hash3_private.normalize_state(state jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare s jsonb:=state;p jsonb;terrain jsonb;converted jsonb;forms jsonb;line text;coords jsonb;ax int;ay int;dx int;dy int;fid text;free int;idx int;
begin
if coalesce((s->>'ruleVersion')::int,1)<2 then
select coalesce(jsonb_agg(jsonb_build_object('x',(b->>'x')::int*3+step_x.n,'y',(b->>'y')::int*3+step_y.n)),'[]') into terrain from jsonb_array_elements(s->'blocks') b cross join generate_series(0,2) step_x(n) cross join generate_series(0,2) step_y(n);
select coalesce(jsonb_agg(jsonb_build_object('x',(b->>'x')::int*3,'y',(b->>'y')::int*3)),'[]') into converted from jsonb_array_elements(s->'blocks') b;
s:=s||jsonb_build_object('ruleVersion',2,'turnSeconds',30,'terrain',terrain,'blocks',converted,'forms','[]'::jsonb);
for p,idx in select v,(ord-1)::int from jsonb_array_elements(s->'pairs') with ordinality e(v,ord) loop
p:=p||jsonb_build_object('active',jsonb_build_object('x',(p->'active'->>'x')::int*3,'y',(p->'active'->>'y')::int*3),'credits',(p->>'pending')::int,'deadline',now()+interval '30 seconds');
s:=jsonb_set(s,array['pairs',idx::text],p);end loop;
forms:='[]';
for line in select jsonb_array_elements_text(s->'lines') loop
ax:=split_part(split_part(line,':',2),',',1)::int;ay:=split_part(split_part(line,':',2),',',2)::int;
dx:=split_part(split_part(line,':',3),',',1)::int;dy:=split_part(split_part(line,':',3),',',2)::int;
select split_part(line,':',1)||':línea:'||string_agg((ax+n*dx)::text||','||(ay+n*dy)::text,';' order by ((ax+n*dx)::text||','||(ay+n*dy)::text) collate "C") into fid from generate_series(0,2) n;
forms:=forms||jsonb_build_array(fid);end loop;s:=jsonb_set(s,'{forms}',forms);
end if;
if s->>'status'='playing' then
for p,idx in select v,(ord-1)::int from jsonb_array_elements(s->'pairs') with ordinality e(v,ord) loop
select count(*) into free from jsonb_array_elements(hash3_private.connected_terrain(s->'terrain',(p->'active'->>'x')::int,(p->'active'->>'y')::int)) t
where not exists(select 1 from jsonb_array_elements(s->'cells') c where c->>'x'=t->>'x' and c->>'y'=t->>'y');
if free>0 then p:=p||jsonb_build_object('pending',0,'expander',null,'deadline',coalesce(nullif(p->>'deadline','')::timestamptz,now()+interval '30 seconds'));
else p:=p||jsonb_build_object('pending',1,'credits',greatest(1,coalesce((p->>'credits')::int,0)),'expander',coalesce(p->>'expander',p->>lower(p->>'turn')),'deadline',coalesce(nullif(p->>'deadline','')::timestamptz,now()+interval '30 seconds'));end if;
s:=jsonb_set(s,array['pairs',idx::text],p);end loop;end if;return s;
end;
$$;

create function hash3_private.arm_pair(s jsonb, pi int, at_time timestamptz)
returns jsonb language plpgsql set search_path='' as $$
declare p jsonb:=s->'pairs'->pi; actor text; bot boolean;
begin
actor:=case when (p->>'pending')::int>0 then p->>'expander' else p->>lower(p->>'turn') end;
select coalesce((v->>'bot')::boolean,false) into bot from jsonb_array_elements(s->'players') v where v->>'id'=actor;
p:=p||jsonb_build_object('deadline',at_time+case when bot then interval '2 seconds' else interval '30 seconds' end);
return jsonb_set(s,array['pairs',pi::text],p);
end; $$;

create function hash3_private.put_bot(s jsonb, pi int, sign text)
returns jsonb language plpgsql set search_path='' as $$
declare bid text:=gen_random_uuid()::text; p jsonb:=s->'pairs'->pi; old_id text:=p->>lower(sign);
begin
s:=jsonb_set(s,'{players}',(s->'players')||jsonb_build_array(jsonb_build_object('id',bid,'name','Máquina','bot',true,'active',true,'symbol',sign,'pair',pi,'order',0,'score',0,'figures',0)));
p:=p||jsonb_build_object(lower(sign),bid);
if p->>'expander'=old_id then p:=p||jsonb_build_object('expander',bid);end if;
return jsonb_set(s,array['pairs',pi::text],p);
end; $$;

-- Never reveal another pair's reserved invitation to room members.
create function hash3_private.player_view(s jsonb, player_id text)
returns jsonb language plpgsql stable set search_path='' as $$
declare own jsonb; pairs jsonb;
begin
select v into own from jsonb_array_elements(s->'players') v where v->>'id'=player_id;
select coalesce(jsonb_agg(case when (v->>'id')::int=(own->>'pair')::int then v else v-'invite' end order by ord),'[]'::jsonb)
into pairs from jsonb_array_elements(s->'pairs') with ordinality e(v,ord);
s:=jsonb_set(s,'{pairs}',pairs);
if own->>'pair' is not null and s->'pairs'->((own->>'pair')::int)->'lastEvent' is not null then
s:=jsonb_set(s,'{lastEvent}',s->'pairs'->((own->>'pair')::int)->'lastEvent');end if;
return s;
end; $$;

-- One due action per populated pair; both browser ticks and Cron use this path.
create function hash3_private.advance_state(state jsonb, at_time timestamptz)
returns jsonb language plpgsql set search_path='' as $$
declare s jsonb:=state;p jsonb;actor jsonb;ai int;pi int;cell jsonb;free jsonb;terrain jsonb;
xy jsonb;f jsonb;points int;earned int;bonus int;old_figures int;event jsonb;sign text;changed boolean:=false;
begin
if s->>'status'='playing' and s->>'endsAt' is not null and (s->>'endsAt')::timestamptz<=at_time then return s||jsonb_build_object('status','finished','finishedAt',at_time,'version',(s->>'version')::int+1);end if;
if s->>'status'<>'playing' or not exists(select 1 from jsonb_array_elements(s->'pairs') v where (v->>'deadline')::timestamptz<=at_time) then return s;end if;
s:=hash3_private.normalize_state(s);
for pi in 0..jsonb_array_length(s->'pairs')-1 loop
p:=s->'pairs'->pi;
if (p->>'deadline')::timestamptz>at_time then continue;end if;
if not exists(select 1 from jsonb_array_elements(s->'players') v where (v->>'pair')::int=pi and coalesce((v->>'active')::boolean,true) and not coalesce((v->>'bot')::boolean,false)) then continue;end if;
select v,(ord-1)::int into actor,ai from jsonb_array_elements(s->'players') with ordinality e(v,ord)
where v->>'id'=case when (p->>'pending')::int>0 then p->>'expander' else p->>lower(p->>'turn') end;
if actor is null then continue;end if;
if (p->>'pending')::int>0 then
select v into xy from jsonb_array_elements(hash3_private.expansion_options(s->'terrain',(p->'active'->>'x')::int,(p->'active'->>'y')::int)) v order by random() limit 1;
if xy is null then continue;end if;
select jsonb_agg(v) into terrain from (select distinct v from (select v from jsonb_array_elements(s->'terrain') v union all select jsonb_build_object('x',(xy->>'x')::int+dx,(xy->>'y')::int+dy) from generate_series(0,2) dx cross join generate_series(0,2) dy) u(v)) unique_cells;
s:=jsonb_set(s,'{terrain}',terrain);s:=jsonb_set(s,'{blocks}',(s->'blocks')||jsonb_build_array(xy));
p:=p||jsonb_build_object('active',xy,'pending',0,'expander',null,'credits',greatest(0,(p->>'credits')::int-1));
event:=jsonb_build_object('id',gen_random_uuid(),'kind','expand','player',actor->>'id','automatic',true);
else
select coalesce(jsonb_agg(v),'[]'::jsonb) into free from jsonb_array_elements(hash3_private.connected_terrain(s->'terrain',(p->'active'->>'x')::int,(p->'active'->>'y')::int)) v
where not exists(select 1 from jsonb_array_elements(s->'cells') c where c->>'x'=v->>'x' and c->>'y'=v->>'y');
select v into xy from jsonb_array_elements(free) v order by random() limit 1;
if xy is null then continue;end if;
sign:=p->>'turn';
cell:=xy||jsonb_build_object('id',gen_random_uuid(),'requestId',gen_random_uuid(),'symbol',sign,'owner',actor->>'id');
s:=jsonb_set(s,'{cells}',(s->'cells')||jsonb_build_array(cell));points:=0;earned:=0;
for f in select value from jsonb_array_elements(hash3_private.figure_windows(s->'cells',(xy->>'x')::int,(xy->>'y')::int,sign)) loop
if not (s->'forms') ? (f->>'id') then
points:=points+(f->>'size')::int;earned:=earned+1;s:=jsonb_set(s,'{forms}',(s->'forms')||jsonb_build_array(f->>'id'));end if;end loop;
old_figures:=(actor->>'figures')::int;bonus:=3*(((old_figures+earned)/3)-(old_figures/3));
actor:=actor||jsonb_build_object('score',(actor->>'score')::int+points+bonus,'figures',old_figures+earned,'lastMove',cell);
s:=jsonb_set(s,array['players',ai::text],actor);
p:=p||jsonb_build_object('turn',case sign when 'X' then 'O' else 'X' end,'credits',coalesce((p->>'credits')::int,0)+earned);
if jsonb_array_length(free)=1 then p:=p||jsonb_build_object('pending',1,'expander',actor->>'id','credits',greatest(1,(p->>'credits')::int));end if;
event:=jsonb_build_object('id',cell->>'id','kind','move','player',actor->>'id','figures',earned,'points',points+bonus,'bonus',bonus,'automatic',not coalesce((actor->>'bot')::boolean,false),'machine',coalesce((actor->>'bot')::boolean,false),'continuation',jsonb_array_length(free)=1);
end if;
p:=p||jsonb_build_object('lastEvent',event);s:=jsonb_set(s,array['pairs',pi::text],p);s:=jsonb_set(s,'{lastEvent}',event);
s:=hash3_private.arm_pair(s,pi,at_time);changed:=true;
end loop;
if changed then s:=hash3_private.normalize_state(s);s:=jsonb_set(s,'{version}',to_jsonb((s->>'version')::int+1));end if;
return s;
end; $$;

create function hash3_private.command(action text, payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();r hash3_private.rooms%rowtype;s jsonb;before_state jsonb;own jsonb;p jsonb;q jsonb;bot jsonb;
ai int;bi int;pi int;slot int;sign text;name text;invite text;order_n int;ax int;ay int;n int;shuffled jsonb;
begin
if uid is null then raise exception 'Entra como invitado para continuar.' using errcode='28000';end if;
if action='create' then
if coalesce(payload->>'kind','world') not in ('world','duel') or coalesce(payload->>'format','solo') not in ('solo','teams') then raise exception 'Elige mundo o duelo, individual o por equipos.';end if;
if payload->>'kind'='duel' and coalesce((payload->>'minutes')::int,5) not in (3,5,10) then raise exception 'El duelo dura 3, 5 o 10 minutos.';end if;
s:=hash3_private.legacy_command(action,payload);
s:=s||jsonb_build_object('kind',coalesce(payload->>'kind','world'),'format',coalesce(payload->>'format','solo'),'durationSeconds',60*coalesce((payload->>'minutes')::int,5));
update hash3_private.rooms set state=s where id=(s->>'id')::uuid;return s;
end if;
if action not in ('join','get','start','move','expand','finish','leave','tick','reserve') then raise exception 'Acción desconocida.';end if;
if action='get' then select * into r from hash3_private.rooms where code=upper(btrim(payload->>'code'));
else select * into r from hash3_private.rooms where code=upper(btrim(payload->>'code')) for update;end if;
if r.id is null then raise exception 'No existe una sala con ese código.';end if;
s:=hash3_private.normalize_state(r.state);before_state:=s;
select v,(ord-1)::int into own,ai from jsonb_array_elements(s->'players') with ordinality e(v,ord) where v->>'id'=uid::text;
if action<>'join' and not exists(select 1 from hash3_private.members where room_id=r.id and user_id=uid) then raise exception 'No perteneces a esta sala.' using errcode='42501';end if;
if action='get' then
if payload->>'version'=s->>'version' then return jsonb_build_object('not_modified',true,'version',s->'version');end if;
return hash3_private.player_view(s,uid::text);
end if;
if s->>'status'='playing' and s->>'endsAt' is not null and (s->>'endsAt')::timestamptz<=now() then
s:=s||jsonb_build_object('status','finished','finishedAt',now(),'version',(s->>'version')::int+1);
update hash3_private.rooms set state=s,updated_at=now() where id=r.id;return hash3_private.player_view(s,uid::text);end if;
if action='tick' then
s:=hash3_private.advance_state(s,now());
if s<>before_state then update hash3_private.rooms set state=s,updated_at=now() where id=r.id;end if;
if payload->>'version'=s->>'version' then return jsonb_build_object('not_modified',true,'version',s->'version');end if;
return hash3_private.player_view(s,uid::text);
end if;
if action='join' then
if s->>'status'='finished' then raise exception 'Este mundo ya está cerrado.';end if;
name:=btrim(payload->>'name');
if name is null or char_length(name) not between 2 and 18 or name ~ '[[:cntrl:]]' then raise exception 'El apodo debe tener entre 2 y 18 caracteres.';end if;
if own is not null and coalesce((own->>'active')::boolean,true) then return hash3_private.player_view(s,uid::text);end if;
if (select count(*) from jsonb_array_elements(s->'players') v where not coalesce((v->>'bot')::boolean,false) and coalesce((v->>'active')::boolean,true))>=200 then raise exception 'Este mundo tiene 200 jugadores activos. Prueba más tarde.';end if;
if exists(select 1 from jsonb_array_elements(s->'players') v where v->>'id'<>uid::text and lower(v->>'name')=lower(name)) then raise exception 'Ese apodo ya está en la sala. Elige otro.';end if;
if own is null then
select coalesce(max((v->>'order')::int),0)+1 into order_n from jsonb_array_elements(s->'players') v;
own:=jsonb_build_object('id',uid,'name',name,'order',order_n,'score',0,'figures',0,'active',false);ai:=jsonb_array_length(s->'players');s:=jsonb_set(s,'{players}',(s->'players')||jsonb_build_array(own));
else own:=own||jsonb_build_object('name',name);end if;
if s->>'status'='lobby' then own:=own||jsonb_build_object('active',true);s:=jsonb_set(s,array['players',ai::text],own);
else
invite:=nullif(upper(btrim(payload->>'rival')),'');slot:=null;
if invite is not null then
select (v->>'id')::int,v->>'reserved' into slot,sign from jsonb_array_elements(s->'pairs') v where v->>'invite'=invite;
if slot is null then raise exception 'La invitación de pareja ya se ha usado o no existe.';end if;
elsif payload->>'preference'<>'new' or payload->>'preference' is null then
if own->>'returnPair' is not null then
pi:=(own->>'returnPair')::int;p:=s->'pairs'->pi;sign:=own->>'symbol';
if p->>'reserved' is null and exists(select 1 from jsonb_array_elements(s->'players') v where v->>'id'=p->>lower(sign) and coalesce((v->>'bot')::boolean,false)) then slot:=pi;end if;
end if;
if slot is null then
select (v->>'id')::int,case when coalesce((xp->>'bot')::boolean,false) then 'X' else 'O' end into slot,sign
from jsonb_array_elements(s->'pairs') v
cross join lateral (select a xp from jsonb_array_elements(s->'players') a where a->>'id'=v->>'x') x
cross join lateral (select a op from jsonb_array_elements(s->'players') a where a->>'id'=v->>'o') o
where v->>'reserved' is null and (coalesce((xp->>'bot')::boolean,false) or coalesce((op->>'bot')::boolean,false))
and (own->>'symbol' is null or (own->>'symbol'='X' and coalesce((xp->>'bot')::boolean,false)) or (own->>'symbol'='O' and coalesce((op->>'bot')::boolean,false)))
order by (coalesce((xp->>'bot')::boolean,false) and coalesce((op->>'bot')::boolean,false)),(v->>'id')::int limit 1;
end if;
end if;
if slot is null then
if s->>'kind'='duel' then raise exception 'El duelo ya está en marcha y no tiene un hueco libre.';end if;
slot:=jsonb_array_length(s->'pairs');sign:=coalesce(own->>'symbol',case when random()<0.5 then 'X' else 'O' end);
select coalesce(max((v->>'x')::int)+4,0) into ax from jsonb_array_elements(s->'terrain') v;ay:=0;
p:=jsonb_build_object('id',slot,'x',null,'o',null,'turn','X','active',jsonb_build_object('x',ax,'y',ay),'pending',0,'credits',0,'expander',null,'deadline',now()+interval '30 seconds');
if payload->>'preference'='new' then p:=p||jsonb_build_object('reserved',case sign when 'X' then 'O' else 'X' end,'invite',upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)));end if;
s:=jsonb_set(s,'{pairs}',(s->'pairs')||jsonb_build_array(p));
s:=jsonb_set(s,'{blocks}',(s->'blocks')||jsonb_build_array(jsonb_build_object('x',ax,'y',ay)));
s:=jsonb_set(s,'{terrain}',(s->'terrain')||(select jsonb_agg(jsonb_build_object('x',ax+dx,'y',ay+dy)) from generate_series(0,2) dx cross join generate_series(0,2) dy));
s:=hash3_private.put_bot(s,slot,case sign when 'X' then 'O' else 'X' end);
else
p:=s->'pairs'->slot;
select v,(ord-1)::int into bot,bi from jsonb_array_elements(s->'players') with ordinality e(v,ord) where v->>'id'=p->>lower(sign);
if not coalesce((bot->>'bot')::boolean,false) then raise exception 'Ese hueco ya tiene rival.';end if;
s:=jsonb_set(s,array['players',bi::text],bot||jsonb_build_object('active',false,'pair',null));
if p->>'expander'=bot->>'id' then p:=p||jsonb_build_object('expander',uid);end if;
if invite is not null then p:=p-'invite'-'reserved';end if;
s:=jsonb_set(s,array['pairs',slot::text],p);
end if;
p:=s->'pairs'->slot;p:=p||jsonb_build_object(lower(sign),uid);s:=jsonb_set(s,array['pairs',slot::text],p);
own:=own||jsonb_build_object('active',true,'symbol',sign,'pair',slot);s:=jsonb_set(s,array['players',ai::text],own);
s:=hash3_private.arm_pair(s,slot,now());
end if;
insert into hash3_private.members(room_id,user_id) values(r.id,uid) on conflict do nothing;
elsif action='leave' then
if own is null or not coalesce((own->>'active')::boolean,true) then return hash3_private.player_view(s,uid::text);end if;
if s->>'status'='playing' then
pi:=(own->>'pair')::int;sign:=own->>'symbol';
own:=own||jsonb_build_object('active',false,'returnPair',pi,'pair',null);s:=jsonb_set(s,array['players',ai::text],own);
s:=hash3_private.put_bot(s,pi,sign);p:=s->'pairs'->pi;
-- A departed invitation owner must not strand a reservation.
if p->>'reserved'<>sign then p:=p-'reserved'-'invite';s:=jsonb_set(s,array['pairs',pi::text],p);end if;
s:=hash3_private.arm_pair(s,pi,now());
else own:=own||jsonb_build_object('active',false);s:=jsonb_set(s,array['players',ai::text],own);end if;
elsif action='start' then
if r.host_uid<>uid then raise exception 'Solo el anfitrión puede hacerlo.' using errcode='42501';end if;
if s->>'status'<>'lobby' then raise exception 'La partida ya ha empezado.';end if;
select jsonb_agg(v order by random()) into shuffled from jsonb_array_elements(s->'players') v where coalesce((v->>'active')::boolean,true);n:=coalesce(jsonb_array_length(shuffled),0);
if n<1 then raise exception 'Hace falta un jugador para abrir el mundo.';end if;
if s->>'kind'='duel' and ((s->>'format'='solo' and n<>2) or (s->>'format'='teams' and (n<4 or n%2<>0))) then raise exception 'El duelo necesita 2 jugadores para 1 contra 1, o un número par de al menos 4 para equipos.';end if;
for pi in 0..((n+1)/2-1) loop
p:=shuffled->(2*pi);q:=shuffled->(2*pi+1);ax:=6*pi;
s:=jsonb_set(s,'{pairs}',(s->'pairs')||jsonb_build_array(jsonb_build_object('id',pi,'x',p->>'id','o',q->>'id','turn','X','active',jsonb_build_object('x',ax,'y',0),'pending',0,'credits',0,'expander',null,'deadline',now()+interval '30 seconds')));
for own,sign in select * from (values(p,'X'),(q,'O')) a(v,sign) where v is not null loop
select (ord-1)::int into ai from jsonb_array_elements(s->'players') with ordinality e(v,ord) where v->>'id'=own->>'id';
s:=jsonb_set(s,array['players',ai::text],own||jsonb_build_object('symbol',sign,'pair',pi,'active',true));end loop;
if q is null then s:=hash3_private.put_bot(s,pi,'O');end if;
s:=jsonb_set(s,'{blocks}',(s->'blocks')||jsonb_build_array(jsonb_build_object('x',ax,'y',0)));
s:=jsonb_set(s,'{terrain}',(s->'terrain')||(select jsonb_agg(jsonb_build_object('x',ax+dx,'y',dy)) from generate_series(0,2) dx cross join generate_series(0,2) dy));
end loop;
s:=s||jsonb_build_object('status','playing','startedAt',now());
if s->>'kind'='duel' then s:=s||jsonb_build_object('endsAt',now()+make_interval(secs=>(s->>'durationSeconds')::int));end if;
elsif action='reserve' then
if s->>'status'<>'playing' or own->>'pair' is null or not coalesce((own->>'active')::boolean,true) then raise exception 'Entra en la partida para invitar a un rival.';end if;
pi:=(own->>'pair')::int;p:=s->'pairs'->pi;sign:=case own->>'symbol' when 'X' then 'O' else 'X' end;
if not exists(select 1 from jsonb_array_elements(s->'players') v where v->>'id'=p->>lower(sign) and coalesce((v->>'bot')::boolean,false)) then raise exception 'Ya tienes un rival humano.';end if;
p:=p||jsonb_build_object('reserved',sign,'invite',coalesce(p->>'invite',upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))));s:=jsonb_set(s,array['pairs',pi::text],p);
else
if action in ('move','expand') and (own is null or not coalesce((own->>'active')::boolean,true) or own->>'pair' is null) then raise exception 'Has abandonado. Vuelve a entrar para jugar.' using errcode='42501';end if;
s:=hash3_private.legacy_command(action,payload);
if action in ('move','expand') then
pi:=(own->>'pair')::int;s:=hash3_private.arm_pair(s,pi,now());
if action='move' then s:=jsonb_set(s,array['pairs',pi::text,'lastEvent'],s->'lastEvent');end if;
end if;
-- The legacy command already increments the version.
update hash3_private.rooms set state=s,updated_at=now() where id=r.id;return hash3_private.player_view(s,uid::text);
end if;
s:=hash3_private.normalize_state(s);s:=jsonb_set(s,'{version}',to_jsonb((s->>'version')::int+1));
update hash3_private.rooms set state=s,updated_at=now() where id=r.id;
return hash3_private.player_view(s,uid::text);
end; $$;

revoke all on function hash3_private.command(text,jsonb) from public,anon;
grant execute on function hash3_private.command(text,jsonb) to authenticated;
revoke all on function hash3_private.arm_pair(jsonb,int,timestamptz),hash3_private.put_bot(jsonb,int,text),hash3_private.player_view(jsonb,text),hash3_private.advance_state(jsonb,timestamptz),hash3_private.normalize_state(jsonb) from public,anon,authenticated;

-- Only the trusted scheduler can run worlds without a connected browser.
create function hash3_private.advance_worlds()
returns int language plpgsql security definer set search_path='' as $$
declare r record;s jsonb;n int:=0;
begin
for r in select id,state from hash3_private.rooms where state->>'status'='playing'
and ((state->>'endsAt')::timestamptz<=now() or (exists(select 1 from jsonb_array_elements(state->'pairs') v where (v->>'deadline')::timestamptz<=now()) and exists(select 1 from jsonb_array_elements(state->'players') v where coalesce((v->>'active')::boolean,true) and not coalesce((v->>'bot')::boolean,false))))
order by updated_at limit 20 for update skip locked loop
s:=hash3_private.advance_state(r.state,now());
if s<>r.state then update hash3_private.rooms set state=s,updated_at=now() where id=r.id;n:=n+1;end if;
end loop;return n;
end; $$;
revoke all on function hash3_private.advance_worlds() from public,anon,authenticated;
create index if not exists hash3_playing_worlds on hash3_private.rooms(updated_at) where state->>'status'='playing';
update hash3_private.rooms set state=hash3_private.normalize_state(state) where state->>'status'='playing';
create extension if not exists pg_cron;
select cron.schedule('hash3-world-clock','2 seconds','select hash3_private.advance_worlds()');
select cron.schedule('hash3-clock-log-cleanup','17 3 * * *',$job$delete from cron.job_run_details where jobid in(select jobid from cron.job where jobname in('hash3-world-clock','hash3-clock-log-cleanup')) and end_time<now()-interval '2 days'$job$);

create or replace function public.hash3_command(action text, payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select hash3_private.command(action,payload); $$;
revoke all on function public.hash3_command(text,jsonb) from public,anon;
grant execute on function public.hash3_command(text,jsonb) to authenticated;
