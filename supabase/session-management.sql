-- R0.11: shared pause, unlimited human turns and multiple sessions.
CREATE OR REPLACE FUNCTION hash3_private.arm_pair(s jsonb, pi integer, at_time timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare p jsonb:=s->'pairs'->pi; actor text; bot boolean;
begin
actor:=case when (p->>'pending')::int>0 then p->>'expander' else p->>lower(p->>'turn') end;
select coalesce((v->>'bot')::boolean,false) into bot from jsonb_array_elements(s->'players') v where v->>'id'=actor;
p:=p||jsonb_build_object('deadline',case when s->>'status'='paused' or (s->>'timeMode'='untimed' and not coalesce(bot,false)) then null else at_time+case when bot then interval '2 seconds' else interval '30 seconds' end end);
return jsonb_set(s,array['pairs',pi::text],p);
end; $function$;


CREATE OR REPLACE FUNCTION hash3_private.normalize_state(state jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
if s->>'timeMode'='untimed' then
if not exists(select 1 from jsonb_array_elements(s->'players') v where v->>'id'=case when (p->>'pending')::int>0 then p->>'expander' else p->>lower(p->>'turn') end and coalesce((v->>'bot')::boolean,false)) then p:=p||jsonb_build_object('deadline',null);end if;
end if;
s:=jsonb_set(s,array['pairs',idx::text],p);end loop;end if;return s;
end;
$function$;


CREATE OR REPLACE FUNCTION hash3_private.advance_state(state jsonb, at_time timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare s jsonb:=state;p jsonb;actor jsonb;ai int;pi int;cell jsonb;free jsonb;terrain jsonb;
xy jsonb;f jsonb;points int;earned int;bonus int;old_figures int;event jsonb;sign text;changed boolean:=false;
begin
if s->>'status'='playing' and s->>'endsAt' is not null and (s->>'endsAt')::timestamptz<=at_time then return s||jsonb_build_object('status','finished','finishedAt',at_time,'version',(s->>'version')::int+1);end if;
if s->>'status'<>'playing' or not exists(select 1 from jsonb_array_elements(s->'pairs') v where (v->>'deadline')::timestamptz<=at_time) then return s;end if;
s:=hash3_private.normalize_state(s);
for pi in 0..jsonb_array_length(s->'pairs')-1 loop
p:=s->'pairs'->pi;
if p->>'deadline' is null or (p->>'deadline')::timestamptz>at_time then continue;end if;
if not exists(select 1 from jsonb_array_elements(s->'players') v where (v->>'pair')::int=pi and coalesce((v->>'active')::boolean,true) and not coalesce((v->>'bot')::boolean,false)) then continue;end if;
select v,(ord-1)::int into actor,ai from jsonb_array_elements(s->'players') with ordinality e(v,ord)
where v->>'id'=case when (p->>'pending')::int>0 then p->>'expander' else p->>lower(p->>'turn') end;
if actor is null then continue;end if;
if (p->>'pending')::int>0 then
select v into xy from jsonb_array_elements(hash3_private.expansion_options(s->'terrain',(p->'active'->>'x')::int,(p->'active'->>'y')::int)) v order by random() limit 1;
if xy is null then continue;end if;
select jsonb_agg(v) into terrain from (select distinct v from (select v from jsonb_array_elements(s->'terrain') v union all select jsonb_build_object('x',(xy->>'x')::int+dx,'y',(xy->>'y')::int+dy) from generate_series(0,2) dx cross join generate_series(0,2) dy) u(v)) unique_cells;
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
for f in select value from jsonb_array_elements(hash3_private.scoring_figures(s,(xy->>'x')::int,(xy->>'y')::int,sign)) loop
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
end; $function$;


CREATE OR REPLACE FUNCTION hash3_private.command(action text, payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid();r hash3_private.rooms%rowtype;s jsonb;before_state jsonb;own jsonb;p jsonb;q jsonb;bot jsonb;
ai int;bi int;pi int;slot int;sign text;name text;invite text;order_n int;ax int;ay int;n int;shuffled jsonb;remaining numeric;vote_kind text;eligible jsonb;voters int;yes_count int;no_count int;
begin
if uid is null then raise exception 'Entra como invitado para continuar.' using errcode='28000';end if;
if action='create' then
if coalesce(payload->>'timeMode','timed') not in ('timed','untimed') then raise exception 'Elige Con reloj o Sin reloj.';end if;
if coalesce(payload->>'kind','world')='world' and payload->>'timeMode'='untimed' then raise exception 'Mundo mantiene sus turnos con reloj.';end if;
if coalesce(payload->>'level','normal') not in ('normal','advanced') then raise exception 'Elige nivel Normal o Avanzado.';end if;
if coalesce(payload->>'kind','world') not in ('world','duel') or coalesce(payload->>'format','solo') not in ('solo','teams') then raise exception 'Elige mundo o duelo, individual o por equipos.';end if;
if payload->>'kind'='duel' and coalesce((payload->>'minutes')::int,5) not in (3,5,10) then raise exception 'El duelo dura 3, 5 o 10 minutos.';end if;
s:=hash3_private.legacy_command(action,payload);
s:=s||jsonb_build_object('level',coalesce(payload->>'level','normal'),'kind',coalesce(payload->>'kind','world'),'format',coalesce(payload->>'format','solo'),'timeMode',coalesce(payload->>'timeMode','timed'),'durationSeconds',case when payload->>'timeMode'='untimed' then null else 60*coalesce((payload->>'minutes')::int,5) end);
update hash3_private.rooms set state=s where id=(s->>'id')::uuid;return s;
end if;
if action not in ('join','get','start','move','expand','finish','leave','tick','reserve','pause','resume','vote') then raise exception 'Acción desconocida.';end if;
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
if action in ('pause','resume','vote') then
if coalesce((s->>'commonWorld')::boolean,false) then raise exception 'Mundo no se puede pausar.' using errcode='42501';end if;
if own is null or not coalesce((own->>'active')::boolean,true) then raise exception 'Solo un jugador activo puede votar.' using errcode='42501';end if;
vote_kind:=case when action='vote' then s->'vote'->>'kind' else action end;
if vote_kind is null or (vote_kind='pause' and s->>'status'<>'playing') or (vote_kind='resume' and s->>'status'<>'paused') then raise exception 'Esta votación ya no está disponible.';end if;
if action='vote' and (s->'vote'->>'id' is distinct from payload->>'voteId' or (s->'vote'->>'expiresAt')::timestamptz<=now()) then raise exception 'La votación ha terminado.';end if;
if action='vote' and jsonb_typeof(payload->'yes') is distinct from 'boolean' then raise exception 'Elige Sí o No.';end if;
if action<>'vote' and (s->'vote'->>'kind' is distinct from vote_kind or (s->'vote'->>'expiresAt')::timestamptz<=now()) then
select jsonb_agg(v->>'id') into eligible from jsonb_array_elements(s->'players') v where coalesce((v->>'active')::boolean,true) and not coalesce((v->>'bot')::boolean,false);
s:=s||jsonb_build_object('vote',jsonb_build_object('id',gen_random_uuid(),'kind',vote_kind,'eligible',eligible,'votes','{}'::jsonb,'expiresAt',now()+interval '60 seconds','requestedBy',own->>'name'));
end if;
if not (s->'vote'->'eligible') ? uid::text then raise exception 'No participas en esta votación.' using errcode='42501';end if;
s:=jsonb_set(s,array['vote','votes',uid::text],case when action='vote' then payload->'yes' else 'true'::jsonb end);
select count(*) into voters from jsonb_array_elements_text(s->'vote'->'eligible') id;
select count(*) into yes_count from jsonb_each(s->'vote'->'votes') q where q.value='true'::jsonb;
select count(*) into no_count from jsonb_each(s->'vote'->'votes') q where q.value='false'::jsonb;
if yes_count>voters/2 then
if vote_kind='pause' then
s:=hash3_private.advance_state(s,now());
if s->>'status'='playing' then
for p,pi in select v,(ord-1)::int from jsonb_array_elements(s->'pairs') with ordinality e(v,ord) loop
remaining:=case when p->>'deadline' is null then null else greatest(0,extract(epoch from ((p->>'deadline')::timestamptz-now()))*1000) end;
p:=p||jsonb_build_object('pauseRemainingMs',remaining,'deadline',null);s:=jsonb_set(s,array['pairs',pi::text],p);end loop;
s:=s||jsonb_build_object('status','paused','pausedAt',now(),'pausedBy',own->>'name','pauseDuelMs',case when s->>'endsAt' is null then null else greatest(0,extract(epoch from ((s->>'endsAt')::timestamptz-now()))*1000) end,'endsAt',null);

end if;
else
s:=s||jsonb_build_object('status','playing','endsAt',case when s->>'pauseDuelMs' is null then null else now()+make_interval(secs=>(s->>'pauseDuelMs')::double precision/1000) end);
for p,pi in select v,(ord-1)::int from jsonb_array_elements(s->'pairs') with ordinality e(v,ord) loop
p:=(p-'pauseRemainingMs')||jsonb_build_object('deadline',case when p->>'pauseRemainingMs' is null then null else now()+make_interval(secs=>(p->>'pauseRemainingMs')::double precision/1000) end);s:=jsonb_set(s,array['pairs',pi::text],p);
end loop;
s:=s-'pausedAt'-'pausedBy'-'pauseDuelMs';

end if;
s:=s-'vote';
elsif no_count>=(voters+1)/2 then s:=s-'vote';end if;
s:=s||jsonb_build_object('version',(s->>'version')::int+1);update hash3_private.rooms set state=s,updated_at=now() where id=r.id;return hash3_private.player_view(s,uid::text);
end if;
if action='tick' then
if s->'vote'->>'expiresAt' is not null and (s->'vote'->>'expiresAt')::timestamptz<=now() then s:=(s-'vote')||jsonb_build_object('version',(s->>'version')::int+1);end if;
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
if s->>'status' in ('playing','paused') then
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
if s->>'kind'='duel' and coalesce(s->>'timeMode','timed')='timed' then s:=s||jsonb_build_object('endsAt',now()+make_interval(secs=>(s->>'durationSeconds')::int));end if;
for pi in 0..jsonb_array_length(s->'pairs')-1 loop s:=hash3_private.arm_pair(s,pi,now());end loop;
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
if action in ('join','leave') then s:=s-'vote';end if;
s:=hash3_private.normalize_state(s);s:=jsonb_set(s,'{version}',to_jsonb((s->>'version')::int+1));
update hash3_private.rooms set state=s,updated_at=now() where id=r.id;
return hash3_private.player_view(s,uid::text);
end; $function$;


-- Append-only, server-generated actions for real historical World rankings.
create table hash3_private.world_actions (
 event_id text primary key,
 user_id uuid not null references auth.users(id),
 room_id uuid not null references hash3_private.rooms(id),
 happened_at timestamptz not null default clock_timestamp(),
 name text not null, symbol text not null,
 points int not null, figures int not null,
 metric_points int not null, metric_figures int not null
);
create index hash3_world_actions_time_user on hash3_private.world_actions(happened_at,user_id);
create index hash3_world_actions_user_time on hash3_private.world_actions(user_id,happened_at desc);
create index hash3_world_actions_room on hash3_private.world_actions(room_id);
alter table hash3_private.world_actions enable row level security;
revoke all on hash3_private.world_actions from public,anon,authenticated;
create function hash3_private.log_world_actions()
returns trigger language plpgsql security definer set search_path='' as $$
declare e jsonb;p jsonb;seen jsonb;automatic boolean;
begin
if new.state->>'commonWorld'<>'true' or new.state->>'commonWorld' is null then return new;end if;
select coalesce(jsonb_agg(v->'lastEvent'),'[]')||case when old.state->'lastEvent' is not null then jsonb_build_array(old.state->'lastEvent') else '[]'::jsonb end into seen from jsonb_array_elements(old.state->'pairs') v;
for e in select v from jsonb_array_elements((select coalesce(jsonb_agg(v->'lastEvent'),'[]') from jsonb_array_elements(new.state->'pairs') v)||case when new.state->'lastEvent' is not null then jsonb_build_array(new.state->'lastEvent') else '[]'::jsonb end) v where v->>'kind'='move' loop
if exists(select 1 from jsonb_array_elements(seen) v where v->>'id'=e->>'id') then continue;end if;
select v into p from jsonb_array_elements(new.state->'players') v where v->>'id'=e->>'player';
if p is null or coalesce((p->>'bot')::boolean,false) then continue;end if;
automatic:=coalesce((e->>'automatic')::boolean,false);
insert into hash3_private.world_actions(event_id,user_id,room_id,name,symbol,points,figures,metric_points,metric_figures)
values(e->>'id',(p->>'id')::uuid,new.id,p->>'name',p->>'symbol',coalesce((e->>'points')::int,0),coalesce((e->>'figures')::int,0),case when automatic then 0 else greatest(0,coalesce((e->>'points')::int,0)-coalesce((e->>'bonus')::int,0)) end,case when automatic then 0 else coalesce((e->>'figures')::int,0) end) on conflict do nothing;
end loop;return new;
end;$$;
revoke all on function hash3_private.log_world_actions() from public,anon,authenticated;
create trigger hash3_world_history_after_update after update of state on hash3_private.rooms for each row execute function hash3_private.log_world_actions();

create function hash3_private.session_queries(action text,payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();result jsonb;period text:=coalesce(payload->>'period','all');d date;starts timestamptz;ends timestamptz;local_start timestamp;local_end timestamp;hr int;off int;rows jsonb;
begin
if uid is null then raise exception 'Sin sesión.' using errcode='28000';end if;
if action='my_games' then
select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'code',r.code,'kind',coalesce(r.state->>'kind','world'),'commonWorld',coalesce((r.state->>'commonWorld')::boolean,false),'status',r.state->>'status','timeMode',coalesce(r.state->>'timeMode','timed'),'level',coalesce(r.state->>'level','normal'),'createdAt',r.created_at,'updatedAt',r.updated_at,'active',coalesce((p->>'active')::boolean,true),'score',p->'score','figures',p->'figures','yourTurn',coalesce(p->>'id'=case when (pair->>'pending')::int>0 then pair->>'expander' else pair->>lower(pair->>'turn') end,false),'players',(select coalesce(jsonb_agg(v->>'name'),'[]') from jsonb_array_elements(r.state->'players') v where not coalesce((v->>'bot')::boolean,false)),'vote',r.state->'vote') order by r.updated_at desc),'[]') into rows
from hash3_private.members m join hash3_private.rooms r on r.id=m.room_id
cross join lateral (select v p from jsonb_array_elements(r.state->'players') v where v->>'id'=uid::text) you
left join lateral (select v pair from jsonb_array_elements(r.state->'pairs') v where v->>'id'=p->>'pair') pa on true
where m.user_id=uid;
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
revoke all on function hash3_private.session_queries(text,jsonb) from public,anon;
grant execute on function hash3_private.session_queries(text,jsonb) to authenticated;
create or replace function public.hash3_command(action text,payload jsonb default '{}'::jsonb)
returns jsonb language sql set search_path='' as $$
select case when action in ('my_games','world_rank') then hash3_private.session_queries(action,payload) else hash3_private.hydrate_result(hash3_private.gateway(action,payload)) end;
$$;
CREATE OR REPLACE FUNCTION hash3_private.legacy_command(action text, payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid := auth.uid();
  r hash3_private.rooms%rowtype;
  s jsonb; name text; room_code text; room_id uuid;
  players jsonb; pairs jsonb; shuffled jsonb; p jsonb; q jsonb; own jsonb;
  pair_index int; own_index int; n int; i int; x int; y int; bx int; block_y int;
  symbol text; opponent_symbol text; request_id text; cell jsonb;
  dx int; dy int; offset_n int; sx int; sy int; window_id text;
  earned int := 0; old_figures int; bonus int; pending int; occupied int;
  options jsonb; existing jsonb; figure jsonb; figure_points int:=0; automated boolean:=false; terrain jsonb; expired_pair jsonb;
begin
  if uid is null then raise exception 'Entra como invitado para continuar.' using errcode='28000'; end if;
  if action is null or action not in ('create','join','get','start','move','expand','finish','leave','tick') then
    raise exception 'Acción desconocida.';
  end if;
  if action in ('create','join') then
    name := btrim(payload->>'name');
    if name is null or char_length(name) not between 2 and 18 or name ~ '[[:cntrl:]]' then
      raise exception 'El apodo debe tener entre 2 y 18 caracteres.';
    end if;
  end if;
  if action='create' then
    if (select count(*) from hash3_private.rooms where host_uid=uid and state->>'status'<>'finished') >= 50 then
      raise exception 'Ya tienes 50 salas abiertas. Cierra alguna antes de crear otra.';
    end if;
    room_id:=gen_random_uuid();
    loop
      room_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
      s:=jsonb_build_object('id',room_id,'code',room_code,'host',uid,'status','lobby','version',1,
        'players',jsonb_build_array(jsonb_build_object('id',uid,'name',name,'order',1,'score',0,'figures',0)),
        'pairs','[]'::jsonb,'blocks','[]'::jsonb,'cells','[]'::jsonb,'lines','[]'::jsonb,'forms','[]'::jsonb,'terrain','[]'::jsonb,'ruleVersion',2,'turnSeconds',30);
      begin
        insert into hash3_private.rooms(id,code,host_uid,state) values(room_id,room_code,uid,s);
        exit;
      exception when unique_violation then null;
      end;
    end loop;
    insert into hash3_private.members(room_id,user_id) values(room_id,uid);
    return s;
  end if;
  room_code:=upper(btrim(payload->>'code'));
  if action='get' then
    select * into r from hash3_private.rooms where rooms.code=room_code;
  else
    select * into r from hash3_private.rooms where rooms.code=room_code for update;
  end if;
  if r.id is null then raise exception 'No existe una sala con ese código.'; end if;
  s:=hash3_private.normalize_state(r.state);
  if action='join' then
    if exists(select 1 from hash3_private.members where members.room_id=r.id and user_id=uid) then return s; end if;
    if s->>'status'<>'lobby' then raise exception 'La partida ya ha empezado. Entra en otra sala.'; end if;
    if jsonb_array_length(s->'players')>=12 then raise exception 'La sala está completa (12 jugadores).'; end if;
    if exists(select 1 from jsonb_array_elements(s->'players') v where lower(v->>'name')=lower(name)) then
      raise exception 'Ese apodo ya está en la sala. Elige otro.';
    end if;
    select coalesce(max((v->>'order')::int),0)+1 into n from jsonb_array_elements(s->'players') v;
    s:=jsonb_set(s,'{players}',(s->'players')||jsonb_build_array(jsonb_build_object('id',uid,'name',name,'order',n,'score',0,'figures',0)));
    insert into hash3_private.members(room_id,user_id) values(r.id,uid);
  else
    if not exists(select 1 from hash3_private.members where members.room_id=r.id and user_id=uid) then
      raise exception 'No perteneces a esta sala.' using errcode='42501';
    end if;
    if action='tick' then
      if s->>'status'='playing' then
        select v into expired_pair from jsonb_array_elements(s->'pairs') v where (v->>'pending')::int=0 and (v->>'deadline')::timestamptz<=now() order by (v->>'deadline')::timestamptz limit 1;
      end if;
      if expired_pair is null then
        if payload->>'version'=s->>'version' then return jsonb_build_object('not_modified',true,'version',s->'version');end if;
        return s;
      end if;
      uid:=(expired_pair->>lower(expired_pair->>'turn'))::uuid;
      select v into cell from jsonb_array_elements(hash3_private.connected_terrain(s->'terrain',(expired_pair->'active'->>'x')::int,(expired_pair->'active'->>'y')::int)) v
      where not exists(select 1 from jsonb_array_elements(s->'cells') c where c->>'x'=v->>'x' and c->>'y'=v->>'y') order by random() limit 1;
      payload:=payload||cell||jsonb_build_object('requestId',gen_random_uuid());action:='move';automated:=true;
    end if;
    if action='get' then
      if payload->>'version'=s->>'version' then
        return jsonb_build_object('not_modified',true,'version',s->'version');
      end if;
      return s;
    end if;
    if action in ('start','finish') and r.host_uid<>uid then raise exception 'Solo el anfitrión puede hacerlo.' using errcode='42501'; end if;
    if action='start' then
      if s->>'status'<>'lobby' then raise exception 'La partida ya ha empezado.'; end if;
      n:=jsonb_array_length(s->'players');
      if n<2 or n%2<>0 then raise exception 'Necesitamos un número par de jugadores (de 2 a 12).'; end if;
      select jsonb_agg(v order by random()) into shuffled from jsonb_array_elements(s->'players') v;
      players:='[]'; pairs:='[]';
      for i in 0..(n/2-1) loop
        p:=shuffled->(2*i); q:=shuffled->(2*i+1);
        players:=players||jsonb_build_array(p||jsonb_build_object('symbol','X','pair',i),q||jsonb_build_object('symbol','O','pair',i));
        pairs:=pairs||jsonb_build_array(jsonb_build_object('id',i,'x',p->>'id','o',q->>'id','turn','X',
          'active',jsonb_build_object('x',6*i,'y',0),'pending',0,'credits',0,'expander',null,'deadline',now()+interval '30 seconds'));
        s:=jsonb_set(s,'{blocks}',(s->'blocks')||jsonb_build_array(jsonb_build_object('x',6*i,'y',0)));
      end loop;
      select jsonb_agg(jsonb_build_object('x',(b->>'x')::int+step_x.n,'y',(b->>'y')::int+step_y.n)) into terrain from jsonb_array_elements(s->'blocks') b cross join generate_series(0,2) step_x(n) cross join generate_series(0,2) step_y(n);
      s:=jsonb_set(s,'{terrain}',terrain);
      s:=s||jsonb_build_object('players',players,'pairs',pairs,'status','playing','startedAt',now());
    elsif action='finish' then
      s:=s||jsonb_build_object('status','finished','finishedAt',now());
    elsif action='leave' then
      if s->>'status'<>'lobby' then raise exception 'Durante la partida puedes salir y volver con este navegador.'; end if;
      if r.host_uid=uid then raise exception 'Como anfitrión, cierra la sala para salir.'; end if;
      select coalesce(jsonb_agg(v),'[]') into players from jsonb_array_elements(s->'players') v where v->>'id'<>uid::text;
      s:=jsonb_set(s,'{players}',players);
      delete from hash3_private.members where members.room_id=r.id and user_id=uid;
    elsif action in ('move','expand') then
      if s->>'status'<>'playing' then raise exception 'La partida no está activa.'; end if;
      select v,(ord-1)::int into own,own_index from jsonb_array_elements(s->'players') with ordinality e(v,ord) where v->>'id'=uid::text;
      pair_index:=(own->>'pair')::int; p:=s->'pairs'->pair_index;
      symbol:=own->>'symbol';
      if action='move' then
        request_id:=payload->>'requestId';
        if request_id is null or char_length(request_id)>64 then raise exception 'Falta el identificador de jugada.'; end if;
        select v into existing from jsonb_array_elements(s->'cells') v where v->>'requestId'=request_id;
        if existing is not null then
          if existing->>'owner'=uid::text and existing->>'x'=payload->>'x' and existing->>'y'=payload->>'y' then return s; end if;
          raise exception 'Identificador de jugada ya utilizado.';
        end if;
        if (p->>'pending')::int>0 then raise exception 'Primero hay que colocar la expansión.'; end if;
        if p->>'turn'<>symbol then raise exception 'Es el turno de tu rival.'; end if;
        if not automated and (p->>'deadline')::timestamptz<=now() then raise exception 'Tiempo agotado: se jugará automáticamente.';end if;
        x:=(payload->>'x')::int; y:=(payload->>'y')::int;
        bx:=(p->'active'->>'x')::int; block_y:=(p->'active'->>'y')::int;
        if x is null or y is null or not exists(select 1 from jsonb_array_elements(hash3_private.connected_terrain(s->'terrain',bx,block_y)) v where (v->>'x')::int=x and (v->>'y')::int=y) then
          raise exception 'Juega en una celda vacía de tu territorio conectado.';
        end if;
        if exists(select 1 from jsonb_array_elements(s->'cells') v where (v->>'x')::int=x and (v->>'y')::int=y) then
          raise exception 'Esa celda ya está ocupada.';
        end if;
        cell:=jsonb_build_object('id',gen_random_uuid(),'requestId',request_id,'x',x,'y',y,'symbol',symbol,'owner',uid);
        s:=jsonb_set(s,'{cells}',(s->'cells')||jsonb_build_array(cell));
        for figure in select value from jsonb_array_elements(hash3_private.scoring_figures(s,x,y,symbol)) loop
          if not (s->'forms') ? (figure->>'id') then
            earned:=earned+1;figure_points:=figure_points+(figure->>'size')::int;
            s:=jsonb_set(s,'{forms}',(s->'forms')||jsonb_build_array(figure->>'id'));
          end if;
        end loop;
        old_figures:=(own->>'figures')::int;
        bonus:=3*(((old_figures+earned)/3)-(old_figures/3));
        own:=own||jsonb_build_object('score',(own->>'score')::int+figure_points+bonus,'figures',old_figures+earned,'lastMove',cell);
        s:=jsonb_set(s,array['players',own_index::text],own);
        select count(*) into occupied from jsonb_array_elements(hash3_private.connected_terrain(s->'terrain',bx,block_y)) t where not exists(select 1 from jsonb_array_elements(s->'cells') c where c->>'x'=t->>'x' and c->>'y'=t->>'y');
        pending:=case when occupied=0 then 1 else 0 end;
        opponent_symbol:=case symbol when 'X' then 'O' else 'X' end;
        p:=p||jsonb_build_object('turn',opponent_symbol,'pending',pending,'credits',coalesce((p->>'credits')::int,0)+earned,'expander',case when pending>0 then uid else null end,'deadline',case when pending=0 then now()+interval '30 seconds' else null end);
        s:=s||jsonb_build_object('lastEvent',jsonb_build_object('id',cell->>'id','kind','move','player',uid,'figures',earned,'points',figure_points+bonus,'bonus',bonus,'automatic',automated,'continuation',occupied=0));
      else
        if (p->>'pending')::int<=0 or p->>'expander'<>uid::text then raise exception 'No tienes una expansión pendiente.'; end if;
        bx:=(payload->>'x')::int; block_y:=(payload->>'y')::int;
        options:=hash3_private.expansion_options(s->'terrain',(p->'active'->>'x')::int,(p->'active'->>'y')::int);
        if bx is null or block_y is null or not exists(select 1 from jsonb_array_elements(options) v where (v->>'x')::int=bx and (v->>'y')::int=block_y) then
          raise exception 'La ampliación debe tocar tu territorio y añadir alguna celda.';
        end if;
        s:=jsonb_set(s,'{blocks}',(s->'blocks')||jsonb_build_array(jsonb_build_object('x',bx,'y',block_y)));
        select jsonb_agg(v) into terrain from (select distinct v from (select v from jsonb_array_elements(s->'terrain') v union all select jsonb_build_object('x',bx+step_x.n,'y',block_y+step_y.n) from generate_series(0,2) step_x(n) cross join generate_series(0,2) step_y(n)) u(v)) unique_cells;
        s:=jsonb_set(s,'{terrain}',terrain);
        pending:=0;
        p:=p||jsonb_build_object('active',jsonb_build_object('x',bx,'y',block_y),'pending',pending,'credits',greatest(0,(p->>'credits')::int-1),'expander',null,'deadline',now()+interval '30 seconds');
      end if;
      s:=jsonb_set(s,array['pairs',pair_index::text],p);
    end if;
  end if;
  s:=hash3_private.normalize_state(s);
  s:=jsonb_set(s,'{version}',to_jsonb((s->>'version')::int+1));
  update hash3_private.rooms set state=s,updated_at=now() where id=r.id;
  return s;
end;
$function$;

