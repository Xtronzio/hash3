-- Real authenticated votes, clocks, multi-session discovery and history; fixtures roll back.
begin;
insert into auth.users(id,aud,role,is_anonymous)
select ('e'||lpad(i::text,7,'0')||'-1111-4111-8111-111111111111')::uuid,'authenticated','authenticated',true from generate_series(1,11) i;
set local role authenticated;
do $$
declare s jsonb;t jsonb;code text;vid text;i int;u text;denied boolean;ends text;old_deadline text;
begin
perform set_config('request.jwt.claim.sub','e0000001-1111-4111-8111-111111111111',true);
s:=public.hash3_command('create','{"name":"R11 Teams 1","kind":"duel","format":"teams","minutes":5}');code:=s->>'code';perform set_config('hash3.qa_team',code,true);
for i in 2..10 loop u:='e'||lpad(i::text,7,'0')||'-1111-4111-8111-111111111111';perform set_config('request.jwt.claim.sub',u,true);s:=public.hash3_command('join',jsonb_build_object('code',code,'name','R11 Teams '||i));end loop;
perform set_config('request.jwt.claim.sub','e0000001-1111-4111-8111-111111111111',true);s:=public.hash3_command('start',jsonb_build_object('code',code));ends:=s->>'endsAt';old_deadline:=s->'pairs'->0->>'deadline';
s:=public.hash3_command('pause',jsonb_build_object('code',code));vid:=s->'vote'->>'id';
if s->>'status'<>'playing' or jsonb_array_length(s->'vote'->'eligible')<>10 then raise exception 'FAIL one user paused ten';end if;
s:=public.hash3_command('pause',jsonb_build_object('code',code));if (select count(*) from jsonb_each(s->'vote'->'votes'))<>1 then raise exception 'FAIL repeated request inflated vote';end if;
perform set_config('request.jwt.claim.sub','e0000011-1111-4111-8111-111111111111',true);denied:=false;begin perform public.hash3_command('vote',jsonb_build_object('code',code,'voteId',vid,'yes',true));exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'FAIL outsider vote';end if;
for i in 2..6 loop u:='e'||lpad(i::text,7,'0')||'-1111-4111-8111-111111111111';perform set_config('request.jwt.claim.sub',u,true);s:=public.hash3_command('vote',jsonb_build_object('code',code,'voteId',vid,'yes',true));if i<6 and s->>'status'<>'playing' then raise exception 'FAIL paused before six';end if;end loop;
if s->>'status'<>'paused' or s ? 'vote' or s->>'endsAt' is not null or exists(select 1 from jsonb_array_elements(s->'pairs') item where item->>'deadline' is not null) then raise exception 'FAIL shared pause';end if;
perform set_config('hash3.qa_paused',s::text,true);t:=public.hash3_command('tick',jsonb_build_object('code',code));if t<>s then raise exception 'FAIL tick changed paused room';end if;
denied:=false;begin perform public.hash3_command('move',jsonb_build_object('code',code,'x',0,'y',0));exception when others then denied:=true;end;if not denied then raise exception 'FAIL move during pause';end if;
perform set_config('request.jwt.claim.sub','e0000001-1111-4111-8111-111111111111',true);s:=public.hash3_command('resume',jsonb_build_object('code',code));vid:=s->'vote'->>'id';if s->>'status'<>'paused' then raise exception 'FAIL one resumed ten';end if;
for i in 2..6 loop perform set_config('request.jwt.claim.sub','e'||lpad(i::text,7,'0')||'-1111-4111-8111-111111111111',true);s:=public.hash3_command('vote',jsonb_build_object('code',code,'voteId',vid,'yes',true));end loop;
if s->>'status'<>'playing' or (s->>'endsAt')::timestamptz<>ends::timestamptz or (s->'pairs'->0->>'deadline')::timestamptz<>old_deadline::timestamptz then raise exception 'FAIL clocks not preserved';end if;
denied:=false;begin perform public.hash3_command('vote',jsonb_build_object('code',code,'voteId',vid,'yes',true));exception when others then denied:=true;end;if not denied then raise exception 'FAIL stale vote accepted';end if;
perform set_config('request.jwt.claim.sub','e0000001-1111-4111-8111-111111111111',true);s:=public.hash3_command('pause',jsonb_build_object('code',code));vid:=s->'vote'->>'id';
for i in 2..6 loop perform set_config('request.jwt.claim.sub','e'||lpad(i::text,7,'0')||'-1111-4111-8111-111111111111',true);s:=public.hash3_command('vote',jsonb_build_object('code',code,'voteId',vid,'yes',false));end loop;
if s->>'status'<>'playing' or s ? 'vote' then raise exception 'FAIL rejected pause';end if;
end $$;
reset role;
do $$ declare s jsonb:=current_setting('hash3.qa_paused')::jsonb;begin if hash3_private.advance_state(s,now()+interval '7 days')<>s then raise exception 'FAIL paused scheduler after a week';end if;end $$;
set local role authenticated;
do $$
declare s jsonb;t jsonb;l jsonb;p jsonb;code text;uid text;wc text;pi int;vid text;denied boolean;i int;xy jsonb;event_id text;metric jsonb;
begin
perform set_config('request.jwt.claim.sub','e0000001-1111-4111-8111-111111111111',true);s:=public.hash3_command('create','{"name":"R11 Async A","kind":"duel","timeMode":"untimed"}');code:=s->>'code';perform set_config('hash3.qa_async',code,true);
perform set_config('request.jwt.claim.sub','e0000002-1111-4111-8111-111111111111',true);s:=public.hash3_command('join',jsonb_build_object('code',code,'name','R11 Async B'));
perform set_config('request.jwt.claim.sub','e0000001-1111-4111-8111-111111111111',true);s:=public.hash3_command('start',jsonb_build_object('code',code));
if s->>'endsAt' is not null or exists(select 1 from jsonb_array_elements(s->'pairs') item where item->>'deadline' is not null) then raise exception 'FAIL asynchronous clocks';end if;
perform set_config('hash3.qa_async_initial',s::text,true);
for xy in select value from jsonb_array_elements('[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]]'::jsonb) loop
p:=s->'pairs'->0;perform set_config('request.jwt.claim.sub',p->>lower(p->>'turn'),true);s:=public.hash3_command('move',jsonb_build_object('code',code,'x',xy->>0,'y',xy->>1,'requestId',gen_random_uuid()));
if s->'pairs'->0->>'deadline' is not null then raise exception 'FAIL async manual turn armed timer';end if;
end loop;
p:=s->'pairs'->0;perform set_config('request.jwt.claim.sub',p->>'expander',true);s:=public.hash3_command('expand',jsonb_build_object('code',code,'x',3,'y',0));if s->'pairs'->0->>'deadline' is not null or jsonb_array_length(s->'cells')<>9 then raise exception 'FAIL async expansion';end if;
-- A two-person untimed room needs both votes and restores null human deadlines.
perform set_config('request.jwt.claim.sub','e0000001-1111-4111-8111-111111111111',true);s:=public.hash3_command('pause',jsonb_build_object('code',code));vid:=s->'vote'->>'id';if s->>'status'<>'playing' then raise exception 'FAIL unilateral two-person pause';end if;
perform set_config('request.jwt.claim.sub','e0000002-1111-4111-8111-111111111111',true);s:=public.hash3_command('vote',jsonb_build_object('code',code,'voteId',vid,'yes',true));if s->>'status'<>'paused' then raise exception 'FAIL unanimous two-person pause';end if;
s:=public.hash3_command('resume',jsonb_build_object('code',code));vid:=s->'vote'->>'id';
perform set_config('request.jwt.claim.sub','e0000001-1111-4111-8111-111111111111',true);s:=public.hash3_command('vote',jsonb_build_object('code',code,'voteId',vid,'yes',true));if s->>'status'<>'playing' or s->'pairs'->0->>'deadline' is not null then raise exception 'FAIL unlimited resume';end if;
-- More than three separate open rooms can coexist, and closed rooms remain discoverable.
perform set_config('request.jwt.claim.sub','e0000001-1111-4111-8111-111111111111',true);
for i in 1..4 loop t:=public.hash3_command('create',jsonb_build_object('name','R11 extra '||i,'kind','duel'));if i=1 then t:=public.hash3_command('finish',jsonb_build_object('code',t->>'code'));perform set_config('hash3.qa_closed',t->>'code',true);end if;end loop;
t:=public.hash3_command('my_games');if jsonb_array_length(t->'games')<6 or not exists(select 1 from jsonb_array_elements(t->'games') g where g->>'code'=current_setting('hash3.qa_closed') and g->>'status'='finished') then raise exception 'FAIL session discovery';end if;
perform set_config('request.jwt.claim.sub','e0000011-1111-4111-8111-111111111111',true);t:=public.hash3_command('my_games');if t->'games'<>'[]' then raise exception 'FAIL other user sessions leak';end if;
-- Official World actions are logged once and can be queried in calendar periods.
perform set_config('request.jwt.claim.sub','e0000001-1111-4111-8111-111111111111',true);l:=public.hash3_command('pair_create','{"name":"R11 World A"}');code:=l->>'code';
perform set_config('request.jwt.claim.sub','e0000002-1111-4111-8111-111111111111',true);l:=public.hash3_command('pair_join',jsonb_build_object('code',code,'name','R11 World B'));
perform set_config('request.jwt.claim.sub','e0000001-1111-4111-8111-111111111111',true);s:=public.hash3_command('pair_start',jsonb_build_object('code',code));wc:=s->>'code';
select (v->>'pair')::int into pi from jsonb_array_elements(s->'players') v where v->>'id'='e0000001-1111-4111-8111-111111111111';p:=s->'pairs'->pi;uid:=p->>'x';perform set_config('request.jwt.claim.sub',uid,true);
event_id:=gen_random_uuid()::text;s:=public.hash3_command('move',jsonb_build_object('code',wc,'x',p->'active'->>'x','y',p->'active'->>'y','requestId',event_id));t:=public.hash3_command('move',jsonb_build_object('code',wc,'x',p->'active'->>'x','y',p->'active'->>'y','requestId',event_id));
t:=public.hash3_command('world_rank','{"period":"day"}');if t->'you'->'max'->>'actions'<>'1' or (t->'you'->>'rank')::int<1 then raise exception 'FAIL period history or duplicate';end if;
for code in select unnest(array['all','year','month','week','hour']) loop t:=public.hash3_command('world_rank',jsonb_build_object('period',code));if t->'you'->'max'->>'actions'<>'1' then raise exception 'FAIL ranking period %',code;end if;end loop;
t:=public.hash3_command('world_rank',jsonb_build_object('period','day','date',((now() at time zone 'Europe/Madrid')::date+1)::text));if t->'you'<>'null'::jsonb then raise exception 'FAIL out-of-period actions';end if;
denied:=false;begin perform public.hash3_command('pause',jsonb_build_object('code',wc));exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'FAIL World paused';end if;
end $$;
reset role;
do $$ declare s jsonb:=current_setting('hash3.qa_async_initial')::jsonb;t jsonb;bi int;begin
if hash3_private.advance_state(s,now()+interval '7 days')<>s then raise exception 'FAIL unlimited human auto move';end if;
-- The machine may respond, but the resulting human turn has no deadline.
select (ord-1)::int into bi from jsonb_array_elements(s->'players') with ordinality q(v,ord) where v->>'id'=s->'pairs'->0->>'o';s:=jsonb_set(s,array['players',bi::text,'bot'],'true');s:=jsonb_set(s,'{pairs,0,turn}','"O"');s:=hash3_private.arm_pair(s,0,now());t:=hash3_private.advance_state(s,now()+interval '3 seconds');
if jsonb_array_length(t->'cells')<>1 or t->'pairs'->0->>'turn'<>'X' or t->'pairs'->0->>'deadline' is not null then raise exception 'FAIL unlimited bot response';end if;
end $$;
rollback;
