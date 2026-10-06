-- MUNDO entry traverses thousands of cells. Use equality joins for flood fill
-- and a materialized occupied-cell relation instead of repeated JSON scans.
CREATE OR REPLACE FUNCTION hash3_private.connected_terrain(terrain jsonb, ax integer, ay integer)
RETURNS jsonb LANGUAGE sql STABLE SET search_path TO '' AS $function$
WITH RECURSIVE
t AS MATERIALIZED (SELECT DISTINCT (v->>'x')::int x,(v->>'y')::int y FROM jsonb_array_elements(terrain) v),
c(x,y) AS (
 SELECT x,y FROM t WHERE x=ax AND y=ay
 UNION
 SELECT t.x,t.y FROM c
 CROSS JOIN (VALUES (1,0),(-1,0),(0,1),(0,-1)) d(dx,dy)
 JOIN t ON t.x=c.x+d.dx AND t.y=c.y+d.dy
)
SELECT coalesce(jsonb_agg(jsonb_build_object('x',x,'y',y)),'[]'::jsonb) FROM c;
$function$;

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
with occupied as materialized (
 select (c->>'x')::int x,(c->>'y')::int y from jsonb_array_elements(s->'cells') c
), territory as materialized (
 select (t->>'x')::int x,(t->>'y')::int y
 from jsonb_array_elements(hash3_private.connected_terrain(s->'terrain',(p->'active'->>'x')::int,(p->'active'->>'y')::int)) t
)
select count(*) into free from territory t
where not exists(select 1 from occupied c where c.x=t.x and c.y=t.y);
if free>0 then p:=p||jsonb_build_object('pending',0,'expander',null,'deadline',coalesce(nullif(p->>'deadline','')::timestamptz,now()+interval '30 seconds'));
else p:=p||jsonb_build_object('pending',1,'credits',greatest(1,coalesce((p->>'credits')::int,0)),'expander',coalesce(p->>'expander',p->>lower(p->>'turn')),'deadline',coalesce(nullif(p->>'deadline','')::timestamptz,now()+interval '30 seconds'));end if;
if s->>'timeMode'='untimed' then
if not exists(select 1 from jsonb_array_elements(s->'players') v where v->>'id'=case when (p->>'pending')::int>0 then p->>'expander' else p->>lower(p->>'turn') end and coalesce((v->>'bot')::boolean,false)) then p:=p||jsonb_build_object('deadline',null);end if;
end if;
s:=jsonb_set(s,array['pairs',idx::text],p);end loop;end if;return s;
end;
$function$;
