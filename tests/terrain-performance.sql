begin;
set local statement_timeout='8s';
do $$
declare terrain jsonb; cells jsonb; s jsonb; n jsonb; actual jsonb; expected jsonb;
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); l jsonb; c text; t timestamptz;
begin
 -- Equality joins preserve orthogonal connectivity, including negative coordinates,
 -- missing anchors and disconnected islands.
 terrain:='[{"x":-1,"y":0},{"x":0,"y":0},{"x":0,"y":1},{"x":1,"y":1},{"x":3,"y":3},{"x":3,"y":3}]';
 actual:=hash3_private.connected_terrain(terrain,-1,0);
 if jsonb_array_length(actual)<>4 or actual @> '[{"x":3,"y":3}]' then raise exception 'FAIL connectivity';end if;
 if hash3_private.connected_terrain(terrain,99,99)<>'[]'::jsonb then raise exception 'FAIL missing anchor';end if;
 with recursive t as(select (v->>'x')::int x,(v->>'y')::int y from jsonb_array_elements(terrain) v),
 component(x,y) as(select x,y from t where x=-1 and y=0 union select t.x,t.y from t join component c on abs(t.x-c.x)+abs(t.y-c.y)=1)
 select jsonb_agg(jsonb_build_object('x',x,'y',y)) into expected from component;
 if not(actual @> expected and expected @> actual) then raise exception 'FAIL old traversal equivalence';end if;
 -- A nearly full 5,151-cell territory plus a separate island. This previously
 -- performed quadratic scans both during flood fill and occupancy checks.
 select jsonb_agg(jsonb_build_object('x',x,'y',y)) into terrain from generate_series(0,100) x cross join generate_series(0,50) y;
 select jsonb_agg(v) into cells from jsonb_array_elements(terrain) v where v<>'{"x":0,"y":0}'::jsonb;
 terrain:=terrain||'[{"x":1000,"y":1000}]'::jsonb;
 s:=jsonb_build_object('status','playing','ruleVersion',2,'timeMode','timed','terrain',terrain,'cells',cells,'players','[]'::jsonb,
 'pairs',jsonb_build_array(jsonb_build_object('id',0,'active',jsonb_build_object('x',0,'y',0),'pending',1,'credits',7,'turn','X','x','qa-a','deadline',now()+interval '30 seconds'),
 jsonb_build_object('id',1,'active',jsonb_build_object('x',1000,'y',1000),'pending',1,'credits',2,'turn','X','x','qa-b','deadline',now()+interval '30 seconds')));
 t:=clock_timestamp();n:=hash3_private.normalize_state(s);
 if n->'cells'<>cells or n->'terrain'<>terrain or (n->'pairs'->0->>'pending')::int<>0 or (n->'pairs'->1->>'pending')::int<>0 or (n->'pairs'->0->>'credits')::int<>7 then raise exception 'FAIL board or expansion state';end if;
 perform set_config('hash3.qa_normalize_ms',(extract(epoch from clock_timestamp()-t)*1000)::text,true);
 -- Exercise the actual authorized entry path against the existing MUNDO,
 -- keeping users, memberships and board changes inside this rollback.
 insert into auth.users(id,aud,role,is_anonymous) values(a,'authenticated','authenticated',true),(b,'authenticated','authenticated',true);
 perform set_config('request.jwt.claim.sub',a::text,true);
 l:=public.hash3_command('pair_create',jsonb_build_object('name','QA '||substr(a::text,1,8)));c:=l->>'code';
 perform set_config('request.jwt.claim.sub',b::text,true);
 l:=public.hash3_command('pair_join',jsonb_build_object('code',c,'name','QA '||substr(b::text,1,8)));
 perform set_config('request.jwt.claim.sub',a::text,true);t:=clock_timestamp();
 n:=public.hash3_command('pair_start',jsonb_build_object('code',c));
 if n->>'status'<>'playing' or not exists(select 1 from jsonb_array_elements(n->'players') p where p->>'id'=b::text and (p->>'active')::boolean) then raise exception 'FAIL paired entry';end if;
 perform set_config('hash3.qa_entry_ms',(extract(epoch from clock_timestamp()-t)*1000)::text,true);
end $$;
select current_setting('hash3.qa_normalize_ms') normalize_ms,current_setting('hash3.qa_entry_ms') pair_entry_ms;
rollback;
