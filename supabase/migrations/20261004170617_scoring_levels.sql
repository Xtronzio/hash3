-- Room-wide figure level; all new combinations remain payable.
create or replace function hash3_private.scoring_figures(s jsonb, px int, py int, sign text)
returns jsonb language plpgsql stable set search_path='' as $$
declare result jsonb;group_cells jsonb;coordinates text;n int;
begin
result:=hash3_private.figure_windows(s->'cells',px,py,sign);
if coalesce(s->>'level','normal')<>'advanced' then return result;end if;
select coalesce(jsonb_agg(v),'[]'::jsonb) into group_cells from jsonb_array_elements(s->'cells') v where v->>'symbol'=sign;
group_cells:=hash3_private.connected_terrain(group_cells,px,py);n:=jsonb_array_length(group_cells);
if n<4 then return result;end if;
select string_agg((v->>'x')||','||(v->>'y'),';' order by ((v->>'x')||','||(v->>'y')) collate "C") into coordinates from jsonb_array_elements(group_cells) v;
if not exists(select 1 from jsonb_array_elements(result) v where split_part(v->>'id',':',3)=coordinates) then
result:=result||jsonb_build_array(jsonb_build_object('id',sign||':grupo:'||coordinates,'kind','grupo','size',n));
end if;
return result;
end;
$$;
revoke all on function hash3_private.scoring_figures(jsonb,int,int,text) from public,anon,authenticated;

create or replace function hash3_private.legacy_command(action text, payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
    if (select count(*) from hash3_private.rooms where host_uid=uid and state->>'status'<>'finished') >= 3 then
      raise exception 'Ya tienes tres salas abiertas. Cierra una antes de crear otra.';
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
$$;

revoke all on function hash3_private.legacy_command(text,jsonb) from public,anon,authenticated;

-- Correct x/y coordinates in autonomous expansions.
create or replace function hash3_private.advance_state(state jsonb, at_time timestamptz)
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


-- Retries and membership changes must not extend an unchanged turn.
create or replace function hash3_private.command(action text, payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();r hash3_private.rooms%rowtype;s jsonb;before_state jsonb;own jsonb;p jsonb;q jsonb;bot jsonb;
ai int;bi int;pi int;slot int;sign text;name text;invite text;order_n int;ax int;ay int;n int;shuffled jsonb;
begin
if uid is null then raise exception 'Entra como invitado para continuar.' using errcode='28000';end if;
if action='create' then
if coalesce(payload->>'level','normal') not in ('normal','advanced') then raise exception 'Elige nivel Normal o Avanzado.';end if;
if coalesce(payload->>'kind','world') not in ('world','duel') or coalesce(payload->>'format','solo') not in ('solo','teams') then raise exception 'Elige mundo o duelo, individual o por equipos.';end if;
if payload->>'kind'='duel' and coalesce((payload->>'minutes')::int,5) not in (3,5,10) then raise exception 'El duelo dura 3, 5 o 10 minutos.';end if;
s:=hash3_private.legacy_command(action,payload);
s:=s||jsonb_build_object('level',coalesce(payload->>'level','normal'),'kind',coalesce(payload->>'kind','world'),'format',coalesce(payload->>'format','solo'),'durationSeconds',60*coalesce((payload->>'minutes')::int,5));
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

