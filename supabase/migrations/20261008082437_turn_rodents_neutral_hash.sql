-- R0.21.13: turn-based rodent visits, neutral territory #, three-meal worms.
create or replace function hash3_private.habitat_initialize_legacy(state jsonb,at_time timestamptz)
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

create or replace function hash3_private.habitat_initialize(state jsonb,at_time timestamptz)
returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare s jsonb:=state;r jsonb;raids jsonb:=coalesce(state->'rodentRaids','[]');
begin
if s->>'habitatVersion'='2' then return s;end if;
if s->>'habitatVersion' is distinct from '1' then s:=hash3_private.habitat_initialize_legacy(s,at_time);end if;
for r in select v from jsonb_array_elements(coalesce(s->'rodents','[]')) v loop
raids:=raids||jsonb_build_array(jsonb_build_object('id',r->>'id','player',r->>'player','x',r->'x','y',r->'y','count',1,'remaining',3-least(2,coalesce((r->>'eaten')::int,0)),'visited','[]'::jsonb));
end loop;
return s||jsonb_build_object('habitatVersion',2,'rodents','[]'::jsonb,'rodentRaids',raids,'worms',(select coalesce(jsonb_agg(w),'[]') from jsonb_array_elements(coalesce(s->'worms','[]')) w where coalesce((w->>'eaten')::int,0)<3));
end;$$;

create or replace function hash3_private.territory_neutral(state jsonb,point jsonb)
returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare s jsonb:=state;area jsonb:=hash3_private.habitat_area(s,point);options jsonb;c jsonb;cells jsonb;candidate jsonb;best int:=-1;score int;targets jsonb:='[]';shape jsonb;offset_point jsonb;part jsonb;sign text;ok boolean;ax int;ay int;dx int;dy int;i int;anchor int;
begin
select coalesce(jsonb_object_agg((v->>'x')||','||(v->>'y'),v->>'symbol'),'{}') into cells from jsonb_array_elements(s->'cells') v;
select coalesce(jsonb_agg(t),'[]') into options from jsonb_array_elements(area) t
where not cells ? ((t->>'x')||','||(t->>'y'))
and not hash3_private.habitat_reserved(s,(t->>'x')::int,(t->>'y')::int)
and not exists(select 1 from jsonb_array_elements(coalesce(s->'inventoryEffects'->'blocks','[]')) v where (v->>'remaining')::int>0 and v->>'x'=t->>'x' and v->>'y'=t->>'y');
if jsonb_array_length(options)<2 then return s;end if;
select coalesce(jsonb_agg(t),'[]') into targets from jsonb_array_elements(options) t where greatest(abs((t->>'x')::int-(point->>'x')::int),abs((t->>'y')::int-(point->>'y')::int))<=3;
if jsonb_array_length(targets)=0 then select jsonb_agg(t) into targets from (select v t from jsonb_array_elements(options) v order by random() limit 3) a;end if;
options:=targets;targets:='[]';
-- Prefer a hole completing a normal figure for either team.
for candidate in select v from jsonb_array_elements(options) v loop
score:=0;ax:=(candidate->>'x')::int;ay:=(candidate->>'y')::int;
foreach sign in array array['X','O'] loop
for dx,dy in select * from (values(1,0),(0,1),(1,1),(1,-1)) d(x,y) loop
for anchor in 0..2 loop
ok:=true;for i in 0..2 loop if i<>anchor and (cells->>((ax+(i-anchor)*dx)||','||(ay+(i-anchor)*dy))) is distinct from sign then ok:=false;exit;end if;end loop;
if ok then score:=score+1;end if;end loop;end loop;
for shape in select v from jsonb_array_elements('[[[0,0],[0,1],[1,0]],[[1,0],[0,0],[1,1]],[[1,1],[1,0],[0,1]],[[0,1],[1,1],[0,0]],[[0,0],[1,0],[2,0],[0,1]],[[1,0],[1,1],[1,2],[0,0]],[[2,1],[1,1],[0,1],[2,0]],[[0,2],[0,1],[0,0],[1,2]],[[2,0],[1,0],[0,0],[2,1]],[[1,2],[1,1],[1,0],[0,2]],[[0,1],[1,1],[2,1],[0,0]],[[0,0],[0,1],[0,2],[1,0]],[[0,0],[0,1],[1,0],[1,1]],[[0,1],[1,0],[1,1],[1,2],[2,1]]]'::jsonb) v loop
for offset_point in select v from jsonb_array_elements(shape) v loop
ok:=true;for part in select v from jsonb_array_elements(shape) v loop
if part<>offset_point and (cells->>((ax+(part->>0)::int-(offset_point->>0)::int)||','||(ay+(part->>1)::int-(offset_point->>1)::int))) is distinct from sign then ok:=false;exit;end if;end loop;
if ok then score:=score+1;end if;end loop;end loop;
end loop;
if score>best then best:=score;targets:=jsonb_build_array(candidate);elsif score=best then targets:=targets||jsonb_build_array(candidate);end if;
end loop;
select v into c from jsonb_array_elements(targets) v order by random() limit 1;
c:=c||jsonb_build_object('id',gen_random_uuid(),'symbol','#','owner',null,'neutral',true);
s:=jsonb_set(s,'{cells}',(s->'cells')||jsonb_build_array(c));
s:=jsonb_set(s,'{eatenCells}',(select coalesce(jsonb_agg(v),'[]') from jsonb_array_elements(s->'eatenCells') v where v->>'x'<>c->>'x' or v->>'y'<>c->>'y'));
return s||jsonb_build_object('neutralEvent',jsonb_build_object('id',c->>'id','kind','neutral','at',extract(epoch from now())*1000,'x',c->'x','y',c->'y'));
end;$$;

create or replace function hash3_private.rodent_step(state jsonb,actor text)
returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare s jsonb:=hash3_private.habitat_initialize(state,now());p jsonb;pi int;n int;e jsonb:=s->'lastEvent';point jsonb;food jsonb;r jsonb;kind text;frequency int;blast jsonb;stamp numeric:=extract(epoch from now())*1000;raids jsonb;next_raids jsonb:='[]';area jsonb;foods jsonb;visits jsonb:='[]';i int;
begin
if e->>'kind' is distinct from 'move' or s->>'rodentEvent'=e->>'id' then return s;end if;
select v,(ord-1)::int into p,pi from jsonb_array_elements(s->'players') with ordinality a(v,ord) where v->>'id'=actor;
if p is null then return s;end if;
select c into point from jsonb_array_elements(s->'cells') c where c->>'id'=e->>'id';
if point is null then return s;end if;
s:=s||jsonb_build_object('rodentEvent',e->>'id');n:=(p->>'placements')::int+1;p:=p||jsonb_build_object('placements',n);
s:=jsonb_set(s,'{eatenCells}',(select coalesce(jsonb_agg(c),'[]') from jsonb_array_elements(s->'eatenCells') c where c->>'x'<>point->>'x' or c->>'y'<>point->>'y'));
for kind,frequency in select * from (values ('rodent',33),('bomb',66),('worm',99),('work',198)) d(k,f) loop
if n<coalesce((p->'habitatNext'->>kind)::int,(n/frequency+1)*frequency) then continue;end if;
p:=jsonb_set(p,array['habitatNext',kind],to_jsonb((n/frequency+1)*frequency));
if kind='rodent' then s:=jsonb_set(s,'{rodentRaids}',(s->'rodentRaids')||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'player',actor,'x',point->'x','y',point->'y','count',n/33,'remaining',3,'visited','[]'::jsonb)));
elsif kind='work' then s:=hash3_private.habitat_project(s,point,actor,now());
elsif kind='bomb' then
blast:=hash3_private.habitat_blast(s,point);if blast is not null then s:=jsonb_set(s,'{bombs}',(s->'bombs')||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'kind','bomb','player',actor,'x',blast->0->'x','y',blast->0->'y','blast',blast,'nextAt',stamp+33000)));end if;
else
r:=jsonb_build_object('id',gen_random_uuid(),'kind','worm','player',actor,'x',point->'x','y',point->'y','eaten',0,'phase',0,'nextAt',stamp+33000);
food:=hash3_private.habitat_food(s,r,false,point->>'id');
if food is not null then r:=r||jsonb_build_object('x',food->'x','y',food->'y','body',jsonb_build_array(jsonb_build_object('x',food->'x','y',food->'y')));s:=jsonb_set(s,'{worms}',(s->'worms')||jsonb_build_array(r));end if;
end if;
end loop;
area:=hash3_private.habitat_area(s,point);
select coalesce(jsonb_agg(c),'[]') into foods from jsonb_array_elements(s->'cells') c where c->>'symbol' in ('X','O') and c->>'id'<>point->>'id'
and exists(select 1 from jsonb_array_elements(area) t where t->>'x'=c->>'x' and t->>'y'=c->>'y') and not hash3_private.habitat_occupied(s,c);
for r in select v from jsonb_array_elements(s->'rodentRaids') v loop
if exists(select 1 from jsonb_array_elements(area) t where t->>'x'=r->>'x' and t->>'y'=r->>'y') then
for i in 1..least((r->>'count')::int,jsonb_array_length(foods)) loop
select c into food from jsonb_array_elements(foods) c where not exists(select 1 from jsonb_array_elements(r->'visited') t where t->>'x'=c->>'x' and t->>'y'=c->>'y') order by random() limit 1;
if food is null then exit;end if;
s:=hash3_private.habitat_clear(s,food);visits:=visits||jsonb_build_array(jsonb_build_object('x',food->'x','y',food->'y','cellId',food->>'id','symbol',food->>'symbol','owner',food->'owner'));
r:=jsonb_set(r,'{visited}',(r->'visited')||jsonb_build_array(jsonb_build_object('x',food->'x','y',food->'y')));
select coalesce(jsonb_agg(c),'[]') into foods from jsonb_array_elements(foods) c where c->>'id'<>food->>'id';
end loop;
r:=jsonb_set(r,'{remaining}',to_jsonb((r->>'remaining')::int-1));
end if;
if (r->>'remaining')::int>0 then next_raids:=next_raids||jsonb_build_array(r);end if;
end loop;
s:=jsonb_set(s,'{rodentRaids}',next_raids);
if jsonb_array_length(visits)>0 then s:=s||jsonb_build_object('rodentVisit',jsonb_build_object('id',gen_random_uuid(),'kind','rodent','at',stamp,'visits',visits));end if;
if n%33=0 then s:=hash3_private.territory_neutral(s,point);end if;
p:=p||jsonb_build_object('rodentNextSpawn',p->'habitatNext'->'rodent');return jsonb_set(s,array['players',pi::text],p);
end;$$;

create or replace function hash3_private.habitat_freeze(state jsonb,at_time timestamptz,resume boolean default false)
returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare s jsonb:=hash3_private.habitat_initialize(state,at_time);kind text;all_events jsonb;r jsonb;stamp numeric:=extract(epoch from at_time)*1000;
begin
foreach kind in array array['worms','works','bombs'] loop
all_events:='[]';for r in select v from jsonb_array_elements(s->kind) v loop
if resume then r:=(r-'remainingMs')||jsonb_build_object('nextAt',stamp+coalesce((r->>'remainingMs')::numeric,33000));
else r:=r||jsonb_build_object('remainingMs',greatest(0,(r->>'nextAt')::numeric-stamp));end if;
all_events:=all_events||jsonb_build_array(r);end loop;s:=jsonb_set(s,array[kind],all_events);end loop;
return s||jsonb_build_object('habitatLastCheck',stamp);
end;$$;

create or replace function hash3_private.habitat_advance(state jsonb,at_time timestamptz)
returns jsonb language plpgsql set search_path='' as $$
#variable_conflict use_column
declare s jsonb:=hash3_private.habitat_initialize(state,at_time);r jsonb;food jsonb;point jsonb;add_point jsonb;kind text;all_events jsonb;keep boolean;changed boolean:=false;stamp numeric:=extract(epoch from at_time)*1000;gap numeric:=stamp-coalesce((s->>'habitatLastCheck')::numeric,stamp);i int;n int;area jsonb;actions jsonb:='[]';
begin
if s->>'status'<>'playing' then return s;end if;
foreach kind in array array['worms','works','bombs'] loop
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
actions:=actions||jsonb_build_array(point||jsonb_build_object('kind','destroy'),add_point||jsonb_build_object('kind','build'));
r:=r||jsonb_build_object('done',n+1);keep:=n<2;
else keep:=false;end if;changed:=true;
elsif kind='bombs' then
for food in select c from jsonb_array_elements(r->'blast') c loop s:=hash3_private.habitat_clear(s,food);actions:=actions||jsonb_build_array(food||jsonb_build_object('kind','bomb'));end loop;
s:=jsonb_set(s,'{frontiers}',(select coalesce(jsonb_agg(f),'[]') from jsonb_array_elements(coalesce(s->'frontiers','[]')) f where not exists(select 1 from jsonb_array_elements(f->'edges') e cross join jsonb_array_elements(r->'blast') b where (e->'a'->>'x'=b->>'x' and e->'a'->>'y'=b->>'y') or (e->'b'->>'x'=b->>'x' and e->'b'->>'y'=b->>'y'))));
keep:=false;changed:=true;
elsif kind='worms' and (r->>'eaten')::int>=3 then keep:=false;changed:=true;
else
food:=null;
if kind='worms' and (r->>'eaten')::int>0 then food:=hash3_private.habitat_food(s,r,true);
else select c into food from jsonb_array_elements(s->'cells') c where c->>'x'=r->>'x' and c->>'y'=r->>'y';if food is null then food:=hash3_private.habitat_food(s,r,false);end if;end if;
if food is not null then
s:=hash3_private.habitat_clear(s,food);actions:=actions||jsonb_build_array(jsonb_build_object('x',food->'x','y',food->'y','kind','worm'));n:=(r->>'eaten')::int+1;r:=r||jsonb_build_object('eaten',n,'x',food->'x','y',food->'y');changed:=true;
if kind='worms' then
keep:=n<3;
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
if changed then s:=s||jsonb_build_object('habitatEvent',jsonb_build_object('id',gen_random_uuid(),'kind','habitat','at',stamp,'actions',actions),'version',(s->>'version')::int+1);end if;
return s;
end;$$;

revoke all on function hash3_private.habitat_initialize_legacy(jsonb,timestamptz),hash3_private.territory_neutral(jsonb,jsonb) from public,anon,authenticated;
