-- Cell-level terrain; previous pieces, scores and paid lines are retained.
create or replace function hash3_private.connected_terrain(terrain jsonb, ax int, ay int)
returns jsonb language sql stable set search_path='' as $$
with recursive t as(select (v->>'x')::int x,(v->>'y')::int y from jsonb_array_elements(terrain) v),
c(x,y) as(select x,y from t where x=ax and y=ay union select t.x,t.y from t join c on abs(t.x-c.x)+abs(t.y-c.y)=1)
select coalesce(jsonb_agg(jsonb_build_object('x',x,'y',y)),'[]'::jsonb) from c;
$$;
create or replace function hash3_private.expansion_options(blocks jsonb, active_x integer, active_y integer)
returns jsonb language sql stable set search_path='' as $$
with t as(select (v->>'x')::int x,(v->>'y')::int y from jsonb_array_elements(blocks) v),
c as(select (v->>'x')::int x,(v->>'y')::int y from jsonb_array_elements(hash3_private.connected_terrain(blocks,active_x,active_y)) v),
anchors as(select distinct c.x+dx x,c.y+dy y from c cross join generate_series(-3,1) dx cross join generate_series(-3,1) dy),
valid as(select a.* from anchors a where
exists(select 1 from generate_series(0,2) dx cross join generate_series(0,2) dy where not exists(select 1 from t where t.x=a.x+dx and t.y=a.y+dy))
and exists(select 1 from c where c.x between a.x-1 and a.x+3 and c.y between a.y-1 and a.y+3
and not(c.x in(a.x-1,a.x+3) and c.y in(a.y-1,a.y+3))))
select coalesce(jsonb_agg(jsonb_build_object('x',x,'y',y) order by x,y),'[]'::jsonb) from valid;
$$;
create or replace function hash3_private.figure_windows(cells jsonb, px int, py int, sign text)
returns jsonb language plpgsql stable set search_path='' as $$
declare dx int;dy int;sx int;sy int;points jsonb; result jsonb:='[]'; ids jsonb:='[]'; pattern jsonb; anchor jsonb; translated jsonb; fid text;ok boolean;
begin
for dx,dy in select * from(values(1,0),(0,1),(1,1),(1,-1)) d(x,y) loop
sx:=px;sy:=py;
while exists(select 1 from jsonb_array_elements(cells) v where (v->>'x')::int=sx-dx and (v->>'y')::int=sy-dy and v->>'symbol'=sign) loop sx:=sx-dx;sy:=sy-dy;end loop;
points:='[]';
while exists(select 1 from jsonb_array_elements(cells) v where (v->>'x')::int=sx and (v->>'y')::int=sy and v->>'symbol'=sign) loop
points:=points||jsonb_build_array(jsonb_build_array(sx,sy));sx:=sx+dx;sy:=sy+dy;end loop;
if jsonb_array_length(points)>=3 then
select sign||':línea:'||string_agg((v->>0)||','||(v->>1),';' order by ((v->>0)||','||(v->>1)) collate "C") into fid from jsonb_array_elements(points) v;
result:=result||jsonb_build_array(jsonb_build_object('id',fid,'kind','línea','size',jsonb_array_length(points)));
end if;
end loop;
for pattern in select value from jsonb_array_elements('[{"kind":"L","points":[[0,0],[0,1],[1,0]]},{"kind":"L","points":[[1,0],[0,0],[1,1]]},{"kind":"L","points":[[1,1],[1,0],[0,1]]},{"kind":"L","points":[[0,1],[1,1],[0,0]]},{"kind":"L","points":[[0,0],[1,0],[2,0],[0,1]]},{"kind":"L","points":[[1,0],[1,1],[1,2],[0,0]]},{"kind":"L","points":[[2,1],[1,1],[0,1],[2,0]]},{"kind":"L","points":[[0,2],[0,1],[0,0],[1,2]]},{"kind":"L","points":[[2,0],[1,0],[0,0],[2,1]]},{"kind":"L","points":[[1,2],[1,1],[1,0],[0,2]]},{"kind":"L","points":[[0,1],[1,1],[2,1],[0,0]]},{"kind":"L","points":[[0,0],[0,1],[0,2],[1,0]]},{"kind":"cuadrado","points":[[0,0],[0,1],[1,0],[1,1]]},{"kind":"cruz","points":[[0,1],[1,0],[1,1],[1,2],[2,1]]}]'::jsonb) loop
for anchor in select value from jsonb_array_elements(pattern->'points') loop
select jsonb_agg(jsonb_build_array(px+(v->>0)::int-(anchor->>0)::int,py+(v->>1)::int-(anchor->>1)::int)) into translated from jsonb_array_elements(pattern->'points') v;
select bool_and(exists(select 1 from jsonb_array_elements(cells) v where (v->>'x')::int=(pt->>0)::int and (v->>'y')::int=(pt->>1)::int and v->>'symbol'=sign)) into ok from jsonb_array_elements(translated) pt;
if ok then
select sign||':'||(pattern->>'kind')||':'||string_agg((v->>0)||','||(v->>1),';' order by ((v->>0)||','||(v->>1)) collate "C") into fid from jsonb_array_elements(translated) v;
if not ids ? fid then ids:=ids||jsonb_build_array(fid);result:=result||jsonb_build_array(jsonb_build_object('id',fid,'kind',pattern->>'kind','size',jsonb_array_length(translated)));end if;
end if;
end loop;end loop;return result;
end;
$$;
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
else p:=p||jsonb_build_object('pending',1,'credits',greatest(1,coalesce((p->>'credits')::int,0)),'expander',coalesce(p->>'expander',p->>lower(p->>'turn')),'deadline',null);end if;
s:=jsonb_set(s,array['pairs',idx::text],p);end loop;end if;return s;
end;
$$;
revoke all on function hash3_private.connected_terrain(jsonb,int,int),hash3_private.expansion_options(jsonb,int,int),hash3_private.figure_windows(jsonb,int,int,text),hash3_private.normalize_state(jsonb) from public,anon,authenticated;

create or replace function hash3_private.command(action text, payload jsonb)
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
        for figure in select value from jsonb_array_elements(hash3_private.figure_windows(s->'cells',x,y,symbol)) loop
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
revoke all on function hash3_private.command(text,jsonb) from public, anon;
grant execute on function hash3_private.command(text,jsonb) to authenticated;


-- Upgrade existing rooms without deleting cells, players, figures or scores.
update hash3_private.rooms set state=jsonb_set(hash3_private.normalize_state(state),'{version}',to_jsonb((state->>'version')::int+1)),updated_at=now() where coalesce((state->>'ruleVersion')::int,1)<2;
