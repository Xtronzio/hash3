-- Private deterministic rules, invoked only after a validated authoritative placement.
create or replace function hash3_private.rodent_food(s jsonb,r jsonb,excluded text)
returns jsonb language sql stable set search_path='' as $$
select c from jsonb_array_elements(s->'cells') c
where c->>'id' is distinct from excluded
and exists(select 1 from jsonb_array_elements(s->'players') p
join lateral jsonb_array_elements(s->'pairs') pair on pair->>'id'=p->>'pair'
join lateral jsonb_array_elements(hash3_private.connected_terrain(s->'terrain',(pair->'active'->>'x')::int,(pair->'active'->>'y')::int)) t on t->>'x'=c->>'x' and t->>'y'=c->>'y'
where p->>'id'=r->>'player')
and not exists(select 1 from jsonb_array_elements(coalesce(s->'rodents','[]')) other where other->>'id'<>r->>'id' and (other->>'phase')::int<3 and other->>'x'=c->>'x' and other->>'y'=c->>'y')
order by abs((c->>'x')::int-(r->>'x')::int)+abs((c->>'y')::int-(r->>'y')::int),(c->>'x')::int,(c->>'y')::int limit 1;
$$;
create or replace function hash3_private.rodent_step(state jsonb,actor text)
returns jsonb language plpgsql set search_path='' as $$
declare s jsonb:=state;p jsonb;r jsonb;food jsonb;pair jsonb;e jsonb:=s->'lastEvent';pi int;ri int;counted int;coords text;phase int;consumed int;
begin
if s->>'rodentEvent'=e->>'id' or e->>'kind'<>'move' then return s;end if;
s:=s||jsonb_build_object('rodentEvent',e->>'id','rodents',coalesce(s->'rodents','[]'::jsonb),'eatenCells',coalesce(s->'eatenCells','[]'::jsonb));
select v,(ord-1)::int into p,pi from jsonb_array_elements(s->'players') with ordinality a(v,ord) where v->>'id'=actor;
if p is null then return s;end if;
counted:=coalesce((p->>'placements')::int,0)+1;p:=p||jsonb_build_object('placements',counted);s:=jsonb_set(s,array['players',pi::text],p);
s:=jsonb_set(s,'{eatenCells}',(select coalesce(jsonb_agg(v),'[]') from jsonb_array_elements(s->'eatenCells') v where not exists(select 1 from jsonb_array_elements(s->'cells') c where c->>'x'=v->>'x' and c->>'y'=v->>'y')));
select v,(ord-1)::int into r,ri from jsonb_array_elements(s->'rodents') with ordinality a(v,ord) where v->>'player'=actor;
if r is null and counted%333=0 then
select v into pair from jsonb_array_elements(s->'pairs') v where v->>'id'=p->>'pair';
r:=jsonb_build_object('id',gen_random_uuid(),'player',actor,'x',(pair->'active'->>'x')::int,'y',(pair->'active'->>'y')::int,'phase',0,'eaten',0,'age',0);
food:=hash3_private.rodent_food(s,r,e->>'id');
if food is not null then r:=r||jsonb_build_object('x',(food->>'x')::int,'y',(food->>'y')::int);s:=jsonb_set(s,'{rodents}',(s->'rodents')||jsonb_build_array(r));end if;
return s;
end if;
if r is null then return s;end if;
phase:=(r->>'phase')::int;consumed:=(r->>'eaten')::int;r:=r||jsonb_build_object('age',coalesce((r->>'age')::int,0)+1);
if phase<3 then
select c into food from jsonb_array_elements(s->'cells') c where c->>'x'=r->>'x' and c->>'y'=r->>'y' and c->>'id'<>e->>'id';
if food is null then food:=hash3_private.rodent_food(s,r,e->>'id');end if;
if food is not null then
r:=r||jsonb_build_object('x',(food->>'x')::int,'y',(food->>'y')::int);consumed:=consumed+1;
s:=jsonb_set(s,'{cells}',(select coalesce(jsonb_agg(c),'[]') from jsonb_array_elements(s->'cells') c where c->>'id'<>food->>'id'));
coords:=(food->>'x')||','||(food->>'y');
s:=jsonb_set(s,'{forms}',(select coalesce(jsonb_agg(f),'[]') from jsonb_array_elements_text(s->'forms') f where not coords=any(string_to_array(split_part(f,':',3),';'))));
s:=jsonb_set(s,'{eatenCells}',(select coalesce(jsonb_agg(c),'[]') from jsonb_array_elements(s->'eatenCells') c where c->>'x'<>food->>'x' or c->>'y'<>food->>'y')||jsonb_build_array(jsonb_build_object('x',(food->>'x')::int,'y',(food->>'y')::int)));
for p,pi in select v,(ord-1)::int from jsonb_array_elements(s->'players') with ordinality a(v,ord) loop
if p->'lastMove'->>'id'=food->>'id' then s:=jsonb_set(s,array['players',pi::text],p-'lastMove');end if;
end loop;
end if;
end if;
if consumed>=33 then
s:=jsonb_set(s,'{rodents}',(select coalesce(jsonb_agg(v),'[]') from jsonb_array_elements(s->'rodents') v where v->>'id'<>r->>'id'));
else
phase:=(phase+1)%6;r:=r||jsonb_build_object('phase',phase,'eaten',consumed);
if phase<3 then food:=hash3_private.rodent_food(s,r,e->>'id');if food is not null then r:=r||jsonb_build_object('x',(food->>'x')::int,'y',(food->>'y')::int);end if;end if;
s:=jsonb_set(s,array['rodents',ri::text],r);
end if;
-- Freed cells cancel pending expansions in every connected pair.
for pair,pi in select v,(ord-1)::int from jsonb_array_elements(s->'pairs') with ordinality a(v,ord) loop
if (pair->>'pending')::int>0 and exists(select 1 from jsonb_array_elements(hash3_private.connected_terrain(s->'terrain',(pair->'active'->>'x')::int,(pair->'active'->>'y')::int)) t where not exists(select 1 from jsonb_array_elements(s->'cells') c where c->>'x'=t->>'x' and c->>'y'=t->>'y')) then
pair:=pair||jsonb_build_object('pending',0,'expander',null);s:=jsonb_set(s,array['pairs',pi::text],pair);s:=hash3_private.arm_pair(s,pi,now());
end if;
end loop;
return s;
end;$$;
create or replace function hash3_private.figure_with_points(f jsonb)
returns jsonb language sql immutable set search_path='' as $$
select f||jsonb_build_object('points',(select jsonb_agg(jsonb_build_array(split_part(c,',',1)::int,split_part(c,',',2)::int)) from unnest(string_to_array(split_part(f->>'id',':',3),';')) c));
$$;
revoke all on function hash3_private.rodent_food(jsonb,jsonb,text),hash3_private.rodent_step(jsonb,text),hash3_private.figure_with_points(jsonb) from public,anon,authenticated;


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
  options jsonb; existing jsonb; figure jsonb; figure_points int:=0; automated boolean:=false;paid_figures jsonb:='[]'; terrain jsonb; expired_pair jsonb;
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
            earned:=earned+1;figure_points:=figure_points+(figure->>'size')::int;paid_figures:=paid_figures||jsonb_build_array(hash3_private.figure_with_points(figure));
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
        s:=s||jsonb_build_object('lastEvent',jsonb_build_object('id',cell->>'id','kind','move','player',uid,'figures',earned,'points',figure_points+bonus,'bonus',bonus,'paidFigures',paid_figures,'move',cell,'automatic',automated,'continuation',occupied=0));
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
  if action='move' then s:=hash3_private.rodent_step(s,uid::text);end if;
  s:=hash3_private.normalize_state(s);
  s:=jsonb_set(s,'{version}',to_jsonb((s->>'version')::int+1));
  update hash3_private.rooms set state=s,updated_at=now() where id=r.id;
  return s;
end;
$function$;



CREATE OR REPLACE FUNCTION hash3_private.advance_state(state jsonb, at_time timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare s jsonb:=state;p jsonb;actor jsonb;ai int;pi int;cell jsonb;free jsonb;terrain jsonb;
xy jsonb;f jsonb;points int;earned int;bonus int;old_figures int;event jsonb;sign text;changed boolean:=false;paid_figures jsonb:='[]';
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
s:=jsonb_set(s,'{cells}',(s->'cells')||jsonb_build_array(cell));points:=0;earned:=0;paid_figures:='[]';
for f in select value from jsonb_array_elements(hash3_private.scoring_figures(s,(xy->>'x')::int,(xy->>'y')::int,sign)) loop
if not (s->'forms') ? (f->>'id') then
points:=points+(f->>'size')::int;earned:=earned+1;paid_figures:=paid_figures||jsonb_build_array(hash3_private.figure_with_points(f));s:=jsonb_set(s,'{forms}',(s->'forms')||jsonb_build_array(f->>'id'));end if;end loop;
old_figures:=(actor->>'figures')::int;bonus:=3*(((old_figures+earned)/3)-(old_figures/3));
actor:=actor||jsonb_build_object('score',(actor->>'score')::int+points+bonus,'figures',old_figures+earned,'lastMove',cell);
s:=jsonb_set(s,array['players',ai::text],actor);
p:=p||jsonb_build_object('turn',case sign when 'X' then 'O' else 'X' end,'credits',coalesce((p->>'credits')::int,0)+earned);
if jsonb_array_length(free)=1 then p:=p||jsonb_build_object('pending',1,'expander',actor->>'id','credits',greatest(1,(p->>'credits')::int));end if;
event:=jsonb_build_object('id',cell->>'id','kind','move','player',actor->>'id','figures',earned,'points',points+bonus,'bonus',bonus,'paidFigures',paid_figures,'move',cell,'automatic',not coalesce((actor->>'bot')::boolean,false),'machine',coalesce((actor->>'bot')::boolean,false),'continuation',jsonb_array_length(free)=1);
end if;
p:=p||jsonb_build_object('lastEvent',event);s:=jsonb_set(s,array['pairs',pi::text],p);s:=jsonb_set(s,'{lastEvent}',event);
if event->>'kind'='move' then s:=hash3_private.rodent_step(s,actor->>'id');end if;
s:=hash3_private.arm_pair(s,pi,at_time);changed:=true;
end loop;
if changed then s:=hash3_private.normalize_state(s);s:=jsonb_set(s,'{version}',to_jsonb((s->>'version')::int+1));end if;
return s;
end; $function$;



CREATE OR REPLACE FUNCTION hash3_private.track_max()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s jsonb:=new.state;p jsonb;oldp jsonb;e jsonb;ai int;seen jsonb;event_ids text[]:='{}';
begin
-- Carry metrics across legacy functions' intermediate writes.
for p,ai in select v,(ord-1)::int from jsonb_array_elements(s->'players') with ordinality q(v,ord) loop
select v into oldp from jsonb_array_elements(old.state->'players') v where v->>'id'=p->>'id';
if coalesce((oldp->'bestCombo'->>'points')::int,0)>coalesce((p->'bestCombo'->>'points')::int,0) then p:=p||jsonb_build_object('bestCombo',oldp->'bestCombo');s:=jsonb_set(s,array['players',ai::text],p);end if;
if oldp ? 'maxActions' then p:=p||jsonb_build_object('maxActions',oldp->'maxActions','max',oldp->'max');s:=jsonb_set(s,array['players',ai::text],p);end if;
end loop;
select coalesce(jsonb_agg(v->'lastEvent'),'[]')||case when old.state->'lastEvent' is not null then jsonb_build_array(old.state->'lastEvent') else '[]'::jsonb end into seen from jsonb_array_elements(old.state->'pairs') v;
for e in select v from jsonb_array_elements((select coalesce(jsonb_agg(v->'lastEvent'),'[]') from jsonb_array_elements(s->'pairs') v)||case when s->'lastEvent' is not null then jsonb_build_array(s->'lastEvent') else '[]'::jsonb end) v where v->>'kind'='move' loop
if e->>'id'=any(event_ids) or exists(select 1 from jsonb_array_elements(seen) v where v->>'id'=e->>'id') then continue;end if;
event_ids:=array_append(event_ids,e->>'id');
select v,(ord-1)::int into p,ai from jsonb_array_elements(s->'players') with ordinality q(v,ord) where v->>'id'=e->>'player';
if p is null or coalesce((p->>'bot')::boolean,false) then continue;end if;
if not coalesce((e->>'automatic')::boolean,false) and coalesce((e->>'points')::int,0)>coalesce((p->'bestCombo'->>'points')::int,0) then p:=p||jsonb_build_object('bestCombo',jsonb_build_object('points',(e->>'points')::int,'figures',(e->>'figures')::int,'moveId',e->>'id'));end if;
p:=hash3_private.max_record(p,coalesce((e->>'points')::int,0)-coalesce((e->>'bonus')::int,0),coalesce((e->>'figures')::int,0),coalesce((e->>'automatic')::boolean,false));
s:=jsonb_set(s,array['players',ai::text],p);
end loop;
new.state:=s;return new;
end;$function$;



CREATE OR REPLACE FUNCTION hash3_private.session_queries(action text, payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
metrics as (select user_id,(array_agg(name order by ord))[1] name,(array_agg(symbol order by ord))[1] symbol,sum(points) points,sum(figures) figures,count(*) total_actions,max(case when metric_points>0 or metric_figures>0 then points else 0 end) best_combo,hash3_private.max_value(jsonb_agg(jsonb_build_object('points',metric_points,'figures',metric_figures) order by ord desc) filter(where ord<=100)) metric from actions group by user_id),
ranked as (select *,row_number() over(order by (metric->>'value')::numeric desc,user_id) position from metrics)
select coalesce(jsonb_agg(jsonb_build_object('id',user_id,'name',name,'symbol',symbol,'score',points,'figures',figures,'totalActions',total_actions,'bestCombo',jsonb_build_object('points',best_combo),'max',metric,'rank',position) order by position),'[]') into rows from ranked;
end if;
return jsonb_build_object('period',period,'from',starts,'to',ends,'timezone','Europe/Madrid','historyStart',(select min(happened_at) from hash3_private.world_actions),'total',jsonb_array_length(rows),'players',(select coalesce(jsonb_agg(v order by ord),'[]') from jsonb_array_elements(rows) with ordinality q(v,ord) where ord>off and ord<=off+100),'you',(select own.item from jsonb_array_elements(rows) own(item) where own.item->>'id'=uid::text),'above',(select q.item from jsonb_array_elements(rows) with ordinality q(item,ord) where q.ord=(select (own.item->>'rank')::int-1 from jsonb_array_elements(rows) own(item) where own.item->>'id'=uid::text)));
end;$function$;

