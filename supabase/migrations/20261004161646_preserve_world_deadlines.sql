-- Retries and membership changes must not extend an unchanged turn.
create or replace function hash3_private.command(action text, payload jsonb)
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
p:=before_state->'pairs'->slot;q:=s->'pairs'->slot;
if p is null or (case when (p->>'pending')::int>0 then p->>'expander' else p->>lower(p->>'turn') end) is distinct from (case when (q->>'pending')::int>0 then q->>'expander' else q->>lower(q->>'turn') end) then s:=hash3_private.arm_pair(s,slot,now());end if;
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
q:=before_state->'pairs'->pi;
if (case when (q->>'pending')::int>0 then q->>'expander' else q->>lower(q->>'turn') end) is distinct from (case when (p->>'pending')::int>0 then p->>'expander' else p->>lower(p->>'turn') end) then s:=hash3_private.arm_pair(s,pi,now());end if;
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
if s->>'version'=before_state->>'version' then return hash3_private.player_view(s,uid::text);end if;
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

