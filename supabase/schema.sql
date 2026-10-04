-- R0.1: all authoritative game state is private. The only public API is hash3_command.
create schema if not exists hash3_private;
revoke all on schema hash3_private from public, anon;
grant usage on schema hash3_private to authenticated;

create table hash3_private.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_uid uuid not null references auth.users(id),
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index hash3_rooms_host on hash3_private.rooms(host_uid);
create table hash3_private.members (
  room_id uuid not null references hash3_private.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  primary key(room_id, user_id)
);
create index hash3_members_user on hash3_private.members(user_id);
alter table hash3_private.rooms enable row level security;
alter table hash3_private.members enable row level security;
revoke all on all tables in schema hash3_private from public, anon, authenticated;

create function hash3_private.expansion_options(blocks jsonb, active_x integer, active_y integer)
returns jsonb language sql stable set search_path = '' as $$
  with recursive b as (
    select (v->>'x')::int x, (v->>'y')::int y from jsonb_array_elements(blocks) v
  ), connected(x,y) as (
    select x,y from b where x=active_x and y=active_y
    union
    select b.x,b.y from b join connected c on abs(b.x-c.x)+abs(b.y-c.y)=1
  ), frontier as (
    select distinct c.x+d.dx x,c.y+d.dy y
    from connected c cross join (values(1,0),(-1,0),(0,1),(0,-1)) d(dx,dy)
    where not exists(select 1 from b where b.x=c.x+d.dx and b.y=c.y+d.dy)
  ), distances as (
    select x,y,abs(x-active_x)+abs(y-active_y) distance from frontier
  )
  select coalesce(jsonb_agg(jsonb_build_object('x',x,'y',y) order by x,y),'[]'::jsonb)
  from distances where distance=(select min(distance) from distances);
$$;
revoke all on function hash3_private.expansion_options(jsonb,integer,integer) from public, anon, authenticated;

create function hash3_private.command(action text, payload jsonb)
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
  options jsonb; existing jsonb;
begin
  if uid is null then raise exception 'Entra como invitado para continuar.' using errcode='28000'; end if;
  if action is null or action not in ('create','join','get','start','move','expand','finish','leave') then
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
        'pairs','[]'::jsonb,'blocks','[]'::jsonb,'cells','[]'::jsonb,'lines','[]'::jsonb);
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
  s:=r.state;
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
          'active',jsonb_build_object('x',2*i,'y',0),'pending',0,'expander',null));
        s:=jsonb_set(s,'{blocks}',(s->'blocks')||jsonb_build_array(jsonb_build_object('x',2*i,'y',0)));
      end loop;
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
        x:=(payload->>'x')::int; y:=(payload->>'y')::int;
        bx:=(p->'active'->>'x')::int; block_y:=(p->'active'->>'y')::int;
        if x is null or y is null or x not between bx*3 and bx*3+2 or y not between block_y*3 and block_y*3+2 then
          raise exception 'Juega dentro de tu # activo.';
        end if;
        if exists(select 1 from jsonb_array_elements(s->'cells') v where (v->>'x')::int=x and (v->>'y')::int=y) then
          raise exception 'Esa celda ya está ocupada.';
        end if;
        cell:=jsonb_build_object('id',gen_random_uuid(),'requestId',request_id,'x',x,'y',y,'symbol',symbol,'owner',uid);
        s:=jsonb_set(s,'{cells}',(s->'cells')||jsonb_build_array(cell));
        for dx,dy in select * from (values(1,0),(0,1),(1,1),(1,-1)) d(x,y) loop
          for offset_n in -2..0 loop
            sx:=x+offset_n*dx; sy:=y+offset_n*dy;
            select count(*) into occupied from generate_series(0,2) step(n)
              where exists(select 1 from jsonb_array_elements(s->'cells') v
                where (v->>'x')::int=sx+step.n*dx and (v->>'y')::int=sy+step.n*dy and v->>'symbol'=symbol);
            window_id:=symbol||':'||sx||','||sy||':'||dx||','||dy;
            if occupied=3 and not (s->'lines') ? window_id then
              earned:=earned+1;
              s:=jsonb_set(s,'{lines}',(s->'lines')||jsonb_build_array(window_id));
            end if;
          end loop;
        end loop;
        old_figures:=(own->>'figures')::int;
        bonus:=3*(((old_figures+earned)/3)-(old_figures/3));
        own:=own||jsonb_build_object('score',(own->>'score')::int+3*earned+bonus,'figures',old_figures+earned,'lastMove',cell);
        s:=jsonb_set(s,array['players',own_index::text],own);
        select count(*) into occupied from jsonb_array_elements(s->'cells') v
          where (v->>'x')::int between bx*3 and bx*3+2 and (v->>'y')::int between block_y*3 and block_y*3+2;
        pending:=case when earned>0 then earned when occupied=9 then 1 else 0 end;
        opponent_symbol:=case symbol when 'X' then 'O' else 'X' end;
        p:=p||jsonb_build_object('turn',opponent_symbol,'pending',pending,'expander',case when pending>0 then uid else null end);
        s:=s||jsonb_build_object('lastEvent',jsonb_build_object('id',cell->>'id','kind','move','player',uid,'figures',earned,'points',3*earned+bonus,'bonus',bonus,'continuation',occupied=9 and earned=0));
      else
        if (p->>'pending')::int<=0 or p->>'expander'<>uid::text then raise exception 'No tienes una expansión pendiente.'; end if;
        bx:=(payload->>'x')::int; block_y:=(payload->>'y')::int;
        options:=hash3_private.expansion_options(s->'blocks',(p->'active'->>'x')::int,(p->'active'->>'y')::int);
        if bx is null or block_y is null or not exists(select 1 from jsonb_array_elements(options) v where (v->>'x')::int=bx and (v->>'y')::int=block_y) then
          raise exception 'Elige un hueco conectado válido cerca de tu # activo.';
        end if;
        s:=jsonb_set(s,'{blocks}',(s->'blocks')||jsonb_build_array(jsonb_build_object('x',bx,'y',block_y)));
        pending:=(p->>'pending')::int-1;
        p:=p||jsonb_build_object('active',jsonb_build_object('x',bx,'y',block_y),'pending',pending,'expander',case when pending>0 then uid else null end);
      end if;
      s:=jsonb_set(s,array['pairs',pair_index::text],p);
    end if;
  end if;
  s:=jsonb_set(s,'{version}',to_jsonb((s->>'version')::int+1));
  update hash3_private.rooms set state=s,updated_at=now() where id=r.id;
  return s;
end;
$$;
revoke all on function hash3_private.command(text,jsonb) from public, anon;
grant execute on function hash3_private.command(text,jsonb) to authenticated;

create function public.hash3_command(action text, payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path = '' as $$
  select hash3_private.command(action,payload);
$$;
revoke all on function public.hash3_command(text,jsonb) from public, anon;
grant execute on function public.hash3_command(text,jsonb) to authenticated;

-- Auto-RLS is an event trigger, not an app endpoint.
do $$ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
