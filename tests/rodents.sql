-- Real four-player duel RPCs. All users, rooms and actions roll back.
begin;
do $$ declare i int;u uuid;begin
for i in 1..4 loop u:=gen_random_uuid();insert into auth.users(id,aud,role,is_anonymous) values(u,'authenticated','authenticated',true);perform set_config('hash3.rodent_user_'||i,u::text,true);end loop;
end;$$;
set local role authenticated;
do $$ declare s jsonb;c text;i int;begin
perform set_config('request.jwt.claim.sub',current_setting('hash3.rodent_user_1'),true);
s:=public.hash3_command('create','{"name":"Roedor QA 1","kind":"duel","format":"teams","timeMode":"untimed","symbol":"X"}');c:=s->>'code';perform set_config('hash3.rodent_code',c,true);
for i in 2..4 loop perform set_config('request.jwt.claim.sub',current_setting('hash3.rodent_user_'||i),true);s:=public.hash3_command('join',jsonb_build_object('code',c,'name','Roedor QA '||i));end loop;
perform set_config('request.jwt.claim.sub',current_setting('hash3.rodent_user_1'),true);s:=public.hash3_command('start',jsonb_build_object('code',c));
perform set_config('hash3.rodent_x',s->'pairs'->0->>'x',true);perform set_config('hash3.rodent_o',s->'pairs'->0->>'o',true);
end;$$;
reset role;
-- Seed only the rolled-back QA room close to the first threshold.
update hash3_private.rooms set state=jsonb_set(jsonb_set(jsonb_set(jsonb_set(state,'{terrain}',(select jsonb_agg(jsonb_build_object('x',x,'y',y)) from generate_series(0,119) x cross join generate_series(0,2) y)),'{cells}',(select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'x',x,'y',0,'symbol','X','owner',current_setting('hash3.rodent_x'))) from generate_series(0,119) x)),'{players}',(select jsonb_agg(case when p->>'id'=current_setting('hash3.rodent_x') then p||'{"placements":332}'::jsonb else p end) from jsonb_array_elements(state->'players') p)),'{forms}','[]'::jsonb) where code=current_setting('hash3.rodent_code');
set local role authenticated;
do $$ declare s jsonb;t jsonb;r jsonb;p jsonb;c text:=current_setting('hash3.rodent_code');xid text:=current_setting('hash3.rodent_x');oid text:=current_setting('hash3.rodent_o');request text:=gen_random_uuid()::text;i int;points int;denied boolean;
begin
perform set_config('request.jwt.claim.sub',xid,true);s:=public.hash3_command('move',jsonb_build_object('code',c,'x',0,'y',1,'requestId',request));
if jsonb_array_length(s->'rodents')<>1 or (s->'rodents'->0->>'eaten')::int<>0 then raise exception 'FAIL birth';end if;
select v into p from jsonb_array_elements(s->'players') v where v->>'id'=xid;
if (p->>'placements')::int<>333 or p->'max' is null or p->'bestCombo' is null then raise exception 'FAIL metrics';end if;
points:=(p->>'score')::int;
t:=public.hash3_command('move',jsonb_build_object('code',c,'x',0,'y',1,'requestId',request));
if t->'rodents'<>s->'rodents' then raise exception 'FAIL duplicate meal';end if;
select v into p from jsonb_array_elements(t->'players') v where v->>'id'=xid;if (p->>'placements')::int<>333 then raise exception 'FAIL duplicate placement';end if;
for i in 1..6 loop
perform set_config('request.jwt.claim.sub',oid,true);s:=public.hash3_command('move',jsonb_build_object('code',c,'x',i,'y',2,'requestId',gen_random_uuid()));
if i=1 and (s->'rodents'->0->>'age')::int<>0 then raise exception 'FAIL wrong-player clock';end if;
perform set_config('request.jwt.claim.sub',xid,true);s:=public.hash3_command('move',jsonb_build_object('code',c,'x',i,'y',1,'requestId',gen_random_uuid()));
if i=3 and ((s->'rodents'->0->>'eaten')::int<>3 or (s->'rodents'->0->>'phase')::int<>3) then raise exception 'FAIL sleep';end if;
if i=6 and (s->'rodents'->0->>'eaten')::int<>3 then raise exception 'FAIL eating while asleep';end if;
if i=33 and (s->'rodents'->0->>'eaten')::int<>18 then raise exception 'FAIL rhythm at 33';end if;
end loop;
-- Non-member cannot move or alter a roedor through forged payload values.
perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);denied:=false;
begin perform public.hash3_command('move',jsonb_build_object('code',c,'x',100,'y',1,'requestId',gen_random_uuid(),'rodents','[]'::jsonb,'bestCombo','{"points":999999}'::jsonb));exception when insufficient_privilege then denied:=true;end;
if not denied then raise exception 'FAIL outsider move';end if;
end;$$;
reset role;
-- The remaining full-life steps exercise the same private engine without 126 expensive score RPCs.
do $$ declare s jsonb;i int;before_points int;begin
select state into s from hash3_private.rooms where code=current_setting('hash3.rodent_code');
select (p->>'score')::int into before_points from jsonb_array_elements(s->'players') p where p->>'id'=current_setting('hash3.rodent_x');
for i in 7..63 loop
s:=s||jsonb_build_object('lastEvent',jsonb_build_object('id',gen_random_uuid(),'kind','move','player',current_setting('hash3.rodent_x'),'points',0,'figures',0));
s:=hash3_private.rodent_step(s,current_setting('hash3.rodent_x'));
if i=33 and (s->'rodents'->0->>'eaten')::int<>18 then raise exception 'FAIL rhythm at 33';end if;
end loop;
if jsonb_array_length(s->'rodents')<>0 then raise exception 'FAIL retire at 33 meals';end if;
if (select (p->>'score')::int from jsonb_array_elements(s->'players') p where p->>'id'=current_setting('hash3.rodent_x'))<>before_points then raise exception 'FAIL score lost';end if;
end;$$;
-- Timeout advances the same owner once; paused games never advance animals.
do $$ declare s jsonb;t jsonb;p jsonb;r jsonb;actor text;pi int;before_count int;food jsonb;begin
select state into s from hash3_private.rooms where code=current_setting('hash3.rodent_code');
for p,pi in select v,(ord-1)::int from jsonb_array_elements(s->'pairs') with ordinality a(v,ord) loop s:=jsonb_set(s,array['pairs',pi::text],p||jsonb_build_object('deadline',null));end loop;
p:=s->'pairs'->0;actor:=p->>lower(p->>'turn');food:=s->'cells'->0;
r:=jsonb_build_object('id',gen_random_uuid(),'player',actor,'x',(food->>'x')::int,'y',(food->>'y')::int,'phase',0,'eaten',0,'age',0);
s:=s||jsonb_build_object('rodents',jsonb_build_array(r),'timeMode','timed');
s:=jsonb_set(s,'{pairs,0}',p||jsonb_build_object('deadline',now()-interval '1 second','pending',0));
select coalesce((v->>'placements')::int,0) into before_count from jsonb_array_elements(s->'players') v where v->>'id'=actor;
t:=hash3_private.advance_state(s,now());
if (t->'rodents'->0->>'eaten')::int<>1 or (t->'rodents'->0->>'age')::int<>1 then raise exception 'FAIL timeout advances once';end if;
if (select (v->>'placements')::int from jsonb_array_elements(t->'players') v where v->>'id'=actor)<>before_count+1 then raise exception 'FAIL timeout placement counter';end if;
if hash3_private.rodent_step(t,actor)<>t then raise exception 'FAIL repeated event';end if;
s:=s||'{"status":"paused"}'::jsonb;if hash3_private.advance_state(s,now())<>s then raise exception 'FAIL paused roedor';end if;
end;$$;
rollback;
