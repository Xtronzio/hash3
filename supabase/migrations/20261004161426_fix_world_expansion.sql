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

