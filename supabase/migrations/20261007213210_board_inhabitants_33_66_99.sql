-- R0.21.0: neutral inhabitants and geometry projects. All state is resolved under
-- the existing room row lock; public commands retain membership/turn validation.
create or replace function hash3_private.habitat_initialize(state jsonb,at_time timestamptz)
returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare s jsonb:=state;p jsonb;i int;n int;r jsonb;animals jsonb:='[]';stamp numeric:=extract(epoch from at_time)*1000;
begin
if s->>'habitatVersion'='1' then return s;end if;
s:=s||jsonb_build_object('habitatVersion',1,'habitatLastCheck',stamp,'worms','[]'::jsonb,'works','[]'::jsonb,'bombs','[]'::jsonb,'eatenCells',coalesce(s->'eatenCells','[]'::jsonb));
for p,i in select v,(ord-1)::int from jsonb_array_elements(s->'players') with ordinality a(v,ord) loop
n:=coalesce((p->>'placements')::int,0);
p:=p||jsonb_build_object('placements',n,'habitatNext',jsonb_build_object('rodent',(n/33+1)*33,'bomb',(n/66+1)*66,'worm',(n/99+1)*99,'work',(n/198+1)*198),'rodentNextSpawn',(n/33+1)*33);
s:=jsonb_set(s,array['players',i::text],p);
end loop;
for r in select v from jsonb_array_elements(coalesce(s->'rodents','[]')) v loop
animals:=animals||jsonb_build_array(r||jsonb_build_object('kind','rodent','phase',0,'eaten',least(2,coalesce((r->>'eaten')::int,0)),'nextAt',stamp+33000));end loop;
return s||jsonb_build_object('rodents',animals);
end;$$;

create or replace function hash3_private.habitat_reserved(s jsonb,x int,y int)
returns boolean language sql stable set search_path='' as $$
select exists(select 1 from jsonb_array_elements(coalesce(s->'worms','[]')) w cross join lateral jsonb_array_elements(w->'body') c where (c->>'x')::int=x and (c->>'y')::int=y)
or exists(select 1 from jsonb_array_elements(coalesce(s->'works','[]')) w cross join lateral jsonb_array_elements((w->'destroy')||(w->'build')) with ordinality a(c,ord) where ((ord-1)::int%3)>=coalesce((w->>'done')::int,0) and (c->>'x')::int=x and (c->>'y')::int=y);
$$;
create or replace function hash3_private.habitat_occupied(s jsonb,point jsonb,excluded text default null)
returns boolean language sql stable set search_path='' as $$
select hash3_private.habitat_reserved(s,(point->>'x')::int,(point->>'y')::int) or exists(select 1 from jsonb_array_elements(coalesce(s->'rodents','[]')) r where r->>'id' is distinct from excluded and r->>'x'=point->>'x' and r->>'y'=point->>'y');
$$;
create or replace function hash3_private.habitat_edge_blocked(s jsonb,ax int,ay int,bx int,by int)
returns boolean language sql stable set search_path='' as $$
select exists(select 1 from jsonb_array_elements(coalesce(s->'frontiers','[]')) f cross join lateral jsonb_array_elements(f->'edges') e where
((e->'a'->>'x')::int=ax and (e->'a'->>'y')::int=ay and (e->'b'->>'x')::int=bx and (e->'b'->>'y')::int=by)
or ((e->'b'->>'x')::int=ax and (e->'b'->>'y')::int=ay and (e->'a'->>'x')::int=bx and (e->'a'->>'y')::int=by));
$$;
create or replace function hash3_private.habitat_area(s jsonb,point jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
#variable_conflict use_column
declare area jsonb;
begin
if jsonb_array_length(coalesce(s->'frontiers','[]'))=0 then return hash3_private.connected_terrain(s->'terrain',(point->>'x')::int,(point->>'y')::int);end if;
with recursive tiles as materialized (select (t->>'x')::int x,(t->>'y')::int y from jsonb_array_elements(s->'terrain') t),
walk(x,y) as (select x,y from tiles where x=(point->>'x')::int and y=(point->>'y')::int union select t.x,t.y from tiles t join walk w on abs(t.x-w.x)+abs(t.y-w.y)=1 where not hash3_private.habitat_edge_blocked(s,w.x,w.y,t.x,t.y))
select coalesce(jsonb_agg(jsonb_build_object('x',x,'y',y)),'[]') into area from walk;
return area;
end;$$;
create or replace function hash3_private.habitat_food(s jsonb,r jsonb,adjacent boolean default false,excluded text default null)
returns jsonb language sql volatile set search_path='' as $$
select c from jsonb_array_elements(s->'cells') c join jsonb_array_elements(hash3_private.habitat_area(s,r)) t on t->>'x'=c->>'x' and t->>'y'=c->>'y'
where c->>'id' is distinct from excluded and not hash3_private.habitat_occupied(s,c,r->>'id')
and (not adjacent or (greatest(abs((c->>'x')::int-(r->>'x')::int),abs((c->>'y')::int-(r->>'y')::int))=1
and not hash3_private.habitat_edge_blocked(s,(r->>'x')::int,(r->>'y')::int,(c->>'x')::int,(c->>'y')::int)
and ((c->>'x'=r->>'x' or c->>'y'=r->>'y') or (not hash3_private.habitat_edge_blocked(s,(r->>'x')::int,(r->>'y')::int,(r->>'x')::int,(c->>'y')::int) and not hash3_private.habitat_edge_blocked(s,(r->>'x')::int,(c->>'y')::int,(c->>'x')::int,(c->>'y')::int) and not hash3_private.habitat_edge_blocked(s,(r->>'x')::int,(r->>'y')::int,(c->>'x')::int,(r->>'y')::int) and not hash3_private.habitat_edge_blocked(s,(c->>'x')::int,(r->>'y')::int,(c->>'x')::int,(c->>'y')::int)))))
order by random() limit 1;
$$;
create or replace function hash3_private.habitat_clear(state jsonb,point jsonb)
returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare s jsonb:=state;ids text[];coordinate text:=(point->>'x')||','||(point->>'y');p jsonb;i int;
begin
select array_agg(c->>'id') into ids from jsonb_array_elements(s->'cells') c where c->>'x'=point->>'x' and c->>'y'=point->>'y';
s:=jsonb_set(s,'{cells}',(select coalesce(jsonb_agg(c),'[]') from jsonb_array_elements(s->'cells') c where c->>'x'<>point->>'x' or c->>'y'<>point->>'y'));
s:=jsonb_set(s,'{forms}',(select coalesce(jsonb_agg(f),'[]') from jsonb_array_elements_text(coalesce(s->'forms','[]')) f where not coordinate=any(string_to_array(split_part(f,':',3),';'))));
s:=jsonb_set(s,'{eatenCells}',(select coalesce(jsonb_agg(c),'[]') from jsonb_array_elements(s->'eatenCells') c where c->>'x'<>point->>'x' or c->>'y'<>point->>'y')||jsonb_build_array(jsonb_build_object('x',(point->>'x')::int,'y',(point->>'y')::int)));
for p,i in select v,(ord-1)::int from jsonb_array_elements(s->'players') with ordinality a(v,ord) loop
if p->'lastMove'->>'id'=any(ids) then s:=jsonb_set(s,array['players',i::text],p-'lastMove');end if;end loop;
if s ? 'inventoryEffects' then
s:=jsonb_set(s,'{inventoryEffects,shields}',(select coalesce(jsonb_agg(v),'[]') from jsonb_array_elements(coalesce(s->'inventoryEffects'->'shields','[]')) v where not coalesce(v->>'cell'=any(ids),false)));
s:=jsonb_set(s,'{inventoryEffects,blocks}',(select coalesce(jsonb_agg(v),'[]') from jsonb_array_elements(coalesce(s->'inventoryEffects'->'blocks','[]')) v where v->>'x'<>point->>'x' or v->>'y'<>point->>'y'));
end if;
return s;
end;$$;

create or replace function hash3_private.habitat_project(state jsonb,point jsonb,actor text,at_time timestamptz)
returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare s jsonb:=state;area jsonb:=hash3_private.habitat_area(s,point);remove jsonb;build jsonb:='[]';c jsonb;work jsonb;edge jsonb;known jsonb:=s->'terrain';i int;j int;stamp numeric:=extract(epoch from at_time)*1000;
begin
select coalesce(jsonb_agg(v),'[]') into remove from (select t v from jsonb_array_elements(area) t
where not exists(select 1 from jsonb_array_elements(s->'cells') c where c->>'x'=t->>'x' and c->>'y'=t->>'y')
and not hash3_private.habitat_occupied(s,t)
and not exists(select 1 from jsonb_array_elements(s->'pairs') p where coalesce(p->'terrainAnchor',p->'active')->>'x'=t->>'x' and coalesce(p->'terrainAnchor',p->'active')->>'y'=t->>'y')
and not exists(select 1 from jsonb_array_elements(coalesce(s->'frontiers','[]')) f cross join lateral jsonb_array_elements(f->'edges') e where (e->'a'->>'x'=t->>'x' and e->'a'->>'y'=t->>'y') or (e->'b'->>'x'=t->>'x' and e->'b'->>'y'=t->>'y'))
order by random() limit 9) candidates;
if jsonb_array_length(remove)<>9 then return s;end if;
edge:=area;
for i in 0..8 loop
with candidates as (select distinct jsonb_build_object('x',(t->>'x')::int+dx,'y',(t->>'y')::int+dy) p,t from jsonb_array_elements(edge) t cross join (values (1,0),(-1,0),(0,1),(0,-1)) d(dx,dy))
select p into c from candidates where not exists(select 1 from jsonb_array_elements(known) k where k->>'x'=p->>'x' and k->>'y'=p->>'y') and not hash3_private.habitat_reserved(s,(p->>'x')::int,(p->>'y')::int) and not hash3_private.habitat_edge_blocked(s,(t->>'x')::int,(t->>'y')::int,(p->>'x')::int,(p->>'y')::int) order by random() limit 1;
if c is null then return state;end if;
build:=build||jsonb_build_array(c);known:=known||jsonb_build_array(c);edge:=edge||jsonb_build_array(c);
end loop;
for i in 0..2 loop
work:=jsonb_build_object('id',gen_random_uuid(),'kind','work','player',actor,'done',0,'nextAt',stamp+33000,'destroy',jsonb_build_array(remove->(i*3),remove->(i*3+1),remove->(i*3+2)),'build',jsonb_build_array(build->(i*3),build->(i*3+1),build->(i*3+2)));
s:=jsonb_set(s,'{works}',(s->'works')||jsonb_build_array(work));end loop;
return s;
end;$$;
create or replace function hash3_private.habitat_blast(s jsonb,point jsonb)
returns jsonb language sql volatile set search_path='' as $$
with area as materialized (select t from jsonb_array_elements(hash3_private.habitat_area(s,point)) t),shapes as (select v from jsonb_array_elements('[[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],[[0,0],[1,1],[2,2]],[[0,0],[1,-1],[2,-2]],[[0,0],[1,0],[0,1]],[[0,0],[-1,0],[0,1]],[[0,0],[1,0],[0,-1]],[[0,0],[-1,0],[0,-1]]]'::jsonb) v),
options as (select (select jsonb_agg(jsonb_build_object('x',(t->>'x')::int+(d->>0)::int,'y',(t->>'y')::int+(d->>1)::int)) from jsonb_array_elements(v) d) blast from area cross join shapes)
select blast from options where not exists(select 1 from jsonb_array_elements(blast) b where not exists(select 1 from area where t->>'x'=b->>'x' and t->>'y'=b->>'y')) order by random() limit 1;
$$;
create or replace function hash3_private.rodent_step(state jsonb,actor text)
returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare s jsonb:=hash3_private.habitat_initialize(state,now());p jsonb;pi int;n int;e jsonb:=s->'lastEvent';point jsonb;food jsonb;r jsonb;i int;kind text;frequency int;blast jsonb;animals jsonb;stamp numeric:=extract(epoch from now())*1000;
begin
if e->>'kind'<>'move' or s->>'rodentEvent'=e->>'id' then return s;end if;
select v,(ord-1)::int into p,pi from jsonb_array_elements(s->'players') with ordinality a(v,ord) where v->>'id'=actor;
if p is null then return s;end if;
select c into point from jsonb_array_elements(s->'cells') c where c->>'id'=e->>'id';
if point is null then return s;end if;
s:=s||jsonb_build_object('rodentEvent',e->>'id');n:=(p->>'placements')::int+1;p:=p||jsonb_build_object('placements',n);
s:=jsonb_set(s,'{eatenCells}',(select coalesce(jsonb_agg(c),'[]') from jsonb_array_elements(s->'eatenCells') c where c->>'x'<>point->>'x' or c->>'y'<>point->>'y'));
animals:='[]';for r in select v from jsonb_array_elements(s->'rodents') v loop
if r->>'x'=point->>'x' and r->>'y'=point->>'y' then food:=hash3_private.habitat_food(s,r,false,point->>'id');
if food is null then select c into food from jsonb_array_elements(hash3_private.habitat_area(s,r)) c where (c->>'x'<>point->>'x' or c->>'y'<>point->>'y') and not hash3_private.habitat_occupied(s,c,r->>'id') order by random() limit 1;end if;
if food is not null then r:=r||jsonb_build_object('x',(food->>'x')::int,'y',(food->>'y')::int);end if;end if;
animals:=animals||jsonb_build_array(r);end loop;s:=jsonb_set(s,'{rodents}',animals);
for kind,frequency in select * from (values ('rodent',33),('bomb',66),('worm',99),('work',198)) d(k,f) loop
if n<coalesce((p->'habitatNext'->>kind)::int,(n/frequency+1)*frequency) then continue;end if;
p:=jsonb_set(p,array['habitatNext',kind],to_jsonb((n/frequency+1)*frequency));
if kind='work' then s:=hash3_private.habitat_project(s,point,actor,now());
elsif kind='bomb' then
blast:=hash3_private.habitat_blast(s,point);if blast is not null then s:=jsonb_set(s,'{bombs}',(s->'bombs')||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'kind','bomb','player',actor,'x',blast->0->'x','y',blast->0->'y','blast',blast,'nextAt',stamp+33000)));end if;
else
r:=jsonb_build_object('id',gen_random_uuid(),'kind',kind,'player',actor,'x',point->'x','y',point->'y','eaten',0,'phase',0,'nextAt',stamp+33000);
food:=hash3_private.habitat_food(s,r,false,point->>'id');
if food is not null then r:=r||jsonb_build_object('x',food->'x','y',food->'y');
if kind='worm' then r:=r||jsonb_build_object('body',jsonb_build_array(jsonb_build_object('x',food->'x','y',food->'y')));s:=jsonb_set(s,'{worms}',(s->'worms')||jsonb_build_array(r));
else s:=jsonb_set(s,'{rodents}',(s->'rodents')||jsonb_build_array(r));end if;end if;
end if;
end loop;
p:=p||jsonb_build_object('rodentNextSpawn',p->'habitatNext'->'rodent');return jsonb_set(s,array['players',pi::text],p);
end;$$;

create or replace function hash3_private.habitat_active(s jsonb,point jsonb)
returns boolean language sql stable set search_path='' as $$
select exists(select 1 from jsonb_array_elements(hash3_private.connected_terrain(s->'terrain',(point->>'x')::int,(point->>'y')::int)) t join jsonb_array_elements(s->'pairs') pair on coalesce(pair->'terrainAnchor',pair->'active')->>'x'=t->>'x' and coalesce(pair->'terrainAnchor',pair->'active')->>'y'=t->>'y' join jsonb_array_elements(s->'players') p on p->>'id' in (pair->>'x',pair->>'o') where coalesce((p->>'active')::boolean,true) and not coalesce((p->>'bot')::boolean,false));
$$;
create or replace function hash3_private.habitat_freeze(state jsonb,at_time timestamptz,resume boolean default false)
returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare s jsonb:=hash3_private.habitat_initialize(state,at_time);kind text;all_events jsonb;r jsonb;stamp numeric:=extract(epoch from at_time)*1000;
begin
foreach kind in array array['rodents','worms','works','bombs'] loop
all_events:='[]';for r in select v from jsonb_array_elements(s->kind) v loop
if resume then r:=(r-'remainingMs')||jsonb_build_object('nextAt',stamp+coalesce((r->>'remainingMs')::numeric,33000));
else r:=r||jsonb_build_object('remainingMs',greatest(0,(r->>'nextAt')::numeric-stamp));end if;
all_events:=all_events||jsonb_build_array(r);end loop;s:=jsonb_set(s,array[kind],all_events);end loop;
return s||jsonb_build_object('habitatLastCheck',stamp);
end;$$;
create or replace function hash3_private.habitat_advance(state jsonb,at_time timestamptz)
returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare s jsonb:=hash3_private.habitat_initialize(state,at_time);r jsonb;food jsonb;point jsonb;add_point jsonb;kind text;all_events jsonb;keep boolean;changed boolean:=false;stamp numeric:=extract(epoch from at_time)*1000;gap numeric:=stamp-coalesce((s->>'habitatLastCheck')::numeric,stamp);i int;n int;area jsonb;
begin
if s->>'status'<>'playing' then return s;end if;
foreach kind in array array['rodents','worms','works','bombs'] loop
all_events:='[]';for r in select v from jsonb_array_elements(s->kind) v loop
keep:=true;point:=case when kind='works' then r->'destroy'->((r->>'done')::int) else r end;
if not hash3_private.habitat_active(s,point) then
if not r ? 'remainingMs' then r:=r||jsonb_build_object('remainingMs',greatest(0,(r->>'nextAt')::numeric-coalesce((s->>'habitatLastCheck')::numeric,stamp)));end if;
elsif r ? 'remainingMs' then r:=(r-'remainingMs')||jsonb_build_object('nextAt',stamp+(r->>'remainingMs')::numeric);
elsif gap>10000 then r:=r||jsonb_build_object('nextAt',(r->>'nextAt')::numeric+gap);
elsif (r->>'nextAt')::numeric<=stamp then
r:=r||jsonb_build_object('nextAt',stamp+33000);
if kind='works' then
n:=(r->>'done')::int;add_point:=r->'build'->n;
if exists(select 1 from jsonb_array_elements(s->'terrain') c where c->>'x'=point->>'x' and c->>'y'=point->>'y') and not exists(select 1 from jsonb_array_elements(s->'cells') c where c->>'x'=point->>'x' and c->>'y'=point->>'y') and not exists(select 1 from jsonb_array_elements(s->'terrain') c where c->>'x'=add_point->>'x' and c->>'y'=add_point->>'y') then
s:=jsonb_set(s,'{terrain}',(select coalesce(jsonb_agg(c),'[]') from jsonb_array_elements(s->'terrain') c where c->>'x'<>point->>'x' or c->>'y'<>point->>'y')||jsonb_build_array(add_point));
r:=r||jsonb_build_object('done',n+1);keep:=n<2;
else keep:=false;end if;changed:=true;
elsif kind='bombs' then
for food in select c from jsonb_array_elements(r->'blast') c loop s:=hash3_private.habitat_clear(s,food);end loop;
s:=jsonb_set(s,'{frontiers}',(select coalesce(jsonb_agg(f),'[]') from jsonb_array_elements(coalesce(s->'frontiers','[]')) f where not exists(select 1 from jsonb_array_elements(f->'edges') e cross join jsonb_array_elements(r->'blast') b where (e->'a'->>'x'=b->>'x' and e->'a'->>'y'=b->>'y') or (e->'b'->>'x'=b->>'x' and e->'b'->>'y'=b->>'y'))));
keep:=false;changed:=true;
elsif kind='worms' and (r->>'eaten')::int>=3 then keep:=false;changed:=true;
else
food:=null;
if kind='worms' and (r->>'eaten')::int>0 then food:=hash3_private.habitat_food(s,r,true);
else select c into food from jsonb_array_elements(s->'cells') c where c->>'x'=r->>'x' and c->>'y'=r->>'y';if food is null then food:=hash3_private.habitat_food(s,r,false);end if;end if;
if food is not null then
s:=hash3_private.habitat_clear(s,food);n:=(r->>'eaten')::int+1;r:=r||jsonb_build_object('eaten',n,'x',food->'x','y',food->'y');changed:=true;
if kind='worms' then
if not exists(select 1 from jsonb_array_elements(r->'body') c where c->>'x'=food->>'x' and c->>'y'=food->>'y') then r:=jsonb_set(r,'{body}',(r->'body')||jsonb_build_array(jsonb_build_object('x',food->'x','y',food->'y')));end if;
else keep:=n<3;if keep then food:=hash3_private.habitat_food(s,r,false);if food is not null then r:=r||jsonb_build_object('x',food->'x','y',food->'y');end if;end if;end if;
end if;
end if;
end if;
if keep then all_events:=all_events||jsonb_build_array(r);end if;
-- Refresh this entity by identity so the next one sees the current reservations.
s:=jsonb_set(s,array[kind],(select coalesce(jsonb_agg(case when v->>'id'=r->>'id' then r else v end),'[]') from jsonb_array_elements(s->kind) v where keep or v->>'id'<>r->>'id'));
end loop;
s:=jsonb_set(s,array[kind],all_events);
end loop;
s:=s||jsonb_build_object('habitatLastCheck',stamp);
if changed then s:=s||jsonb_build_object('habitatEvent',jsonb_build_object('id',gen_random_uuid(),'kind','habitat','at',stamp),'version',(s->>'version')::int+1);end if;
return s;
end;$$;
-- Hook the existing authoritative commands rather than introducing a client state upload.
DO $migration$
declare definition text;
begin
select pg_get_functiondef('hash3_private.advance_state(jsonb,timestamptz)'::regprocedure) into definition;
if position('s:=hash3_private.habitat_advance(s,at_time);' in definition)=0 then
if position($text$if s->>'status'<>'playing' or not exists$text$ in definition)=0 then raise exception 'Unexpected advance_state layout';end if;
definition:=replace(definition,$text$if s->>'status'<>'playing' or not exists$text$,$text$s:=hash3_private.habitat_advance(s,at_time);$text$||chr(10)||$text$if s->>'status'<>'playing' or not exists$text$);
definition:=replace(definition,$text$where not exists(select 1 from jsonb_array_elements(s->'cells') c where c->>'x'=v->>'x' and c->>'y'=v->>'y')$text$,$text$where not hash3_private.habitat_reserved(s,(v->>'x')::int,(v->>'y')::int) and not exists(select 1 from jsonb_array_elements(s->'cells') c where c->>'x'=v->>'x' and c->>'y'=v->>'y')$text$);
execute definition;end if;
select pg_get_functiondef('hash3_private.normalize_state(jsonb)'::regprocedure) into definition;
if position('habitat_reserved' in definition)=0 then
definition:=replace(definition,$text$where not exists(select 1 from jsonb_array_elements(s->'cells') c where c->>'x'=t->>'x' and c->>'y'=t->>'y')$text$,$text$where not hash3_private.habitat_reserved(s,(t->>'x')::int,(t->>'y')::int) and not exists(select 1 from jsonb_array_elements(s->'cells') c where c->>'x'=t->>'x' and c->>'y'=t->>'y')$text$);execute definition;end if;
select pg_get_functiondef('hash3_private.legacy_command(text,jsonb)'::regprocedure) into definition;
if position('Celda reservada por un habitante' in definition)=0 then
if position($text$cell:=jsonb_build_object('id',gen_random_uuid(),'requestId',request_id$text$ in definition)=0 then raise exception 'Unexpected legacy placement layout';end if;
definition:=replace(definition,$text$cell:=jsonb_build_object('id',gen_random_uuid(),'requestId',request_id$text$,$text$if hash3_private.habitat_reserved(s,x,y) then raise exception 'Celda reservada por un habitante o una obra.';end if;$text$||chr(10)||$text$cell:=jsonb_build_object('id',gen_random_uuid(),'requestId',request_id$text$);
definition:=replace(definition,$text$s:=jsonb_set(s,'{blocks}',(s->'blocks')||jsonb_build_array(jsonb_build_object('x',bx,'y',block_y)));$text$,$text$if exists(select 1 from generate_series(0,2) dx(n) cross join generate_series(0,2) dy(n) where hash3_private.habitat_reserved(s,bx+dx.n,block_y+dy.n)) then raise exception 'La ampliación invade un proyecto reservado.';end if;$text$||chr(10)||$text$s:=jsonb_set(s,'{blocks}',(s->'blocks')||jsonb_build_array(jsonb_build_object('x',bx,'y',block_y)));$text$);
execute definition;end if;
select pg_get_functiondef('hash3_private.command(text,jsonb)'::regprocedure) into definition;
if position('habitat_freeze' in definition)=0 then
-- An accepted pause retains the remaining habitat interval exactly.
definition:=replace(definition,$text$s:=s||jsonb_build_object('status','paused','pausedAt',now()$text$,$text$s:=hash3_private.habitat_freeze(s,now(),false);$text$||chr(10)||$text$s:=s||jsonb_build_object('status','paused','pausedAt',now()$text$);
definition:=replace(definition,$text$s:=s||jsonb_build_object('status','playing','endsAt',case when s->>'pauseDuelMs'$text$,$text$s:=hash3_private.habitat_freeze(s,now(),true);$text$||chr(10)||$text$s:=s||jsonb_build_object('status','playing','endsAt',case when s->>'pauseDuelMs'$text$);
-- Before a validated move/expansion, resolve due inhabitants and make the server
-- reject stale target cells; errors roll back the complete transaction.
definition:=replace(definition,$text$s:=hash3_private.legacy_command(action,payload);$text$||chr(10)||$text$if s->>'version'=before_state->>'version'$text$,$text$if action in ('move','expand') then s:=hash3_private.habitat_advance(s,now());update hash3_private.rooms set state=s where id=r.id;end if;$text$||chr(10)||$text$s:=hash3_private.legacy_command(action,payload);$text$||chr(10)||$text$if s->>'version'=before_state->>'version'$text$);
-- Freeze disconnected areas immediately when the last human leaves, and rebase
-- them before a join so time away never becomes a pending burst.
definition:=replace(definition,$text$if action in ('join','leave') then s:=s-'vote';end if;$text$,$text$if action in ('join','leave') then s:=hash3_private.habitat_advance(s,now());s:=s-'vote';end if;$text$);
execute definition;end if;
end $migration$;

DO $privileges$
declare f record;
begin
for f in select p.oid::regprocedure identity from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='hash3_private' and p.proname like 'habitat_%' loop
execute format('revoke all on function %s from public,anon,authenticated',f.identity);end loop;
end $privileges$;

-- State-only fixtures. No real rooms, users or player records are modified.
DO $test$
#variable_conflict use_column
declare s jsonb;t jsonb;p jsonb;r jsonb;at_time timestamptz:='2026-10-07 12:00:00+00';stamp numeric:=extract(epoch from at_time)*1000;i int;size int;
begin
select jsonb_build_object('status','playing','version',1,'ruleVersion',2,'terrain',jsonb_agg(jsonb_build_object('x',x,'y',y)),'cells','[]'::jsonb,'forms','[]'::jsonb,'blocks','[]'::jsonb,'players','[{"id":"x","symbol":"X","pair":0,"active":true,"score":70,"placements":197},{"id":"o","symbol":"O","pair":0,"active":true,"score":0,"placements":0}]'::jsonb,'pairs','[{"id":0,"x":"x","o":"o","turn":"X","active":{"x":0,"y":0},"pending":0}]'::jsonb) into s from generate_series(0,14) x cross join generate_series(0,9) y;
select jsonb_agg(t||jsonb_build_object('id','food-'||(t->>'x')||','||(t->>'y'),'owner','x','symbol','X')) into p from jsonb_array_elements(s->'terrain') t where (t->>'y')::int<4;
s:=jsonb_set(s,'{cells}',p);s:=hash3_private.habitat_initialize(s,at_time);
s:=s||jsonb_build_object('lastEvent',jsonb_build_object('kind','move','id','food-0,0','player','x'));
t:=hash3_private.rodent_step(s,'x');
assert (t->'players'->0->>'placements')::int=198,'Count actual placements';
assert jsonb_array_length(t->'rodents')=1 and jsonb_array_length(t->'worms')=1 and jsonb_array_length(t->'bombs')=1,'Independent milestones coincide at 198';
assert jsonb_array_length(t->'works')=3,'Three paired workers reserve nine plus nine cells';
assert hash3_private.rodent_step(t,'x')=t,'Idempotent same placement event';
assert jsonb_array_length(t->'cells')=60,'Birth never eats';
-- Adopt old placements without retroactive births.
assert jsonb_array_length(hash3_private.habitat_initialize(s-'habitatVersion',at_time)->'rodents')=0,'No historic births';
-- Independent real-time meals, earned score unchanged, only three meals.
s:=hash3_private.habitat_initialize(s,at_time)||jsonb_build_object('worms','[]'::jsonb,'works','[]'::jsonb,'bombs','[]'::jsonb,'rodents',jsonb_build_array(jsonb_build_object('id','rat','kind','rodent','player','x','x',0,'y',0,'eaten',0,'nextAt',stamp+33000)));
for i in 1..3 loop
s:=s||jsonb_build_object('habitatLastCheck',stamp+i*33000-1000);s:=hash3_private.habitat_advance(s,at_time+make_interval(secs=>i*33));
end loop;
assert jsonb_array_length(s->'rodents')=0 and jsonb_array_length(s->'cells')=57,'Three timed meals then retirement';
assert (s->'players'->0->>'score')::int=70,'Never take paid points back';
-- Worm grows on adjacent diagonals, blocks its body, disappears one interval later.
s:=s||jsonb_build_object('cells','[{"id":"a","x":0,"y":0,"symbol":"X","owner":"x"},{"id":"b","x":1,"y":1,"symbol":"O","owner":"o"},{"id":"c","x":2,"y":2,"symbol":"X","owner":"x"}]'::jsonb,'worms',jsonb_build_array(jsonb_build_object('id','worm','kind','worm','player','x','x',0,'y',0,'eaten',0,'body','[{"x":0,"y":0}]'::jsonb,'nextAt',stamp+33000)));
for i in 1..3 loop s:=s||jsonb_build_object('habitatLastCheck',stamp+i*33000-1000);s:=hash3_private.habitat_advance(s,at_time+make_interval(secs=>i*33));end loop;
assert (s->'worms'->0->>'eaten')::int=3 and jsonb_array_length(s->'worms'->0->'body')=3,'Three adjacent meals and length three';
assert hash3_private.habitat_reserved(s,1,1),'Worm reserves its body';
s:=s||jsonb_build_object('habitatLastCheck',stamp+132000-1000);s:=hash3_private.habitat_advance(s,at_time+interval '132 seconds');assert jsonb_array_length(s->'worms')=0 and not hash3_private.habitat_reserved(s,1,1),'Release after third meal plus 33 seconds';
-- Pauses preserve the remaining interval; no actions accumulated after a gap.
s:=s||jsonb_build_object('rodents',jsonb_build_array(jsonb_build_object('id','rat','kind','rodent','player','x','x',0,'y',0,'eaten',0,'nextAt',stamp+33000)));
s:=hash3_private.habitat_freeze(s,at_time+interval '10 seconds',false);assert (s->'rodents'->0->>'remainingMs')::numeric=23000,'Freeze exact remaining time';
s:=hash3_private.habitat_freeze(s,at_time+interval '1 hour',true);assert (s->'rodents'->0->>'nextAt')::numeric=stamp+3600000+23000,'Resume exact remaining time';
t:=hash3_private.habitat_advance(s,at_time+interval '2 hours');assert (t->'rodents'->0->>'eaten')::int=0,'No offline catch-up';
-- Work executes destruction/construction atomically and only on empty terrain.
s:=s||jsonb_build_object('rodents','[]'::jsonb,'works','[{"id":"work","kind":"work","player":"x","done":0,"destroy":[{"x":3,"y":0},{"x":4,"y":0},{"x":5,"y":0}],"build":[{"x":0,"y":10},{"x":1,"y":10},{"x":2,"y":10}]}]'::jsonb,'habitatLastCheck',stamp);
s:=jsonb_set(s,'{works,0,nextAt}',to_jsonb(stamp));size:=jsonb_array_length(s->'terrain');s:=hash3_private.habitat_advance(s,at_time);
assert jsonb_array_length(s->'terrain')=size and (s->'works'->0->>'done')::int=1,'Each paired work step has balance zero';
-- A bomb clears contents, not geometry, and breaks a complete barrier.
s:=s||jsonb_build_object('works','[]'::jsonb,'frontiers','[{"id":"f","edges":[{"a":{"x":1,"y":0},"b":{"x":2,"y":0}}]}]'::jsonb,'bombs',jsonb_build_array(jsonb_build_object('id','bomb','kind','bomb','x',0,'y',0,'nextAt',stamp,'blast','[{"x":0,"y":0},{"x":1,"y":0},{"x":2,"y":0}]'::jsonb)));
s:=hash3_private.habitat_advance(s,at_time);assert jsonb_array_length(s->'terrain')=size and jsonb_array_length(s->'frontiers')=0,'Bombs never remove terrain and break barriers';
end $test$;
