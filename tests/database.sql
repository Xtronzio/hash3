-- Real RPC and permissions, with every test fixture rolled back.
begin;
insert into auth.users(id,aud,role,is_anonymous) values
 ('11111111-1111-4111-8111-111111111111','authenticated','authenticated',true),
 ('22222222-2222-4222-8222-222222222222','authenticated','authenticated',true),
 ('33333333-3333-4333-8333-333333333333','authenticated','authenticated',true);
set local role authenticated;
do $$
declare a text:='11111111-1111-4111-8111-111111111111';b text:='22222222-2222-4222-8222-222222222222';
s jsonb;same jsonb;code text;xp text;op text;xy jsonb;n int:=0;denied boolean;request_id text;
begin
perform set_config('request.jwt.claim.sub',a,true);
s:=public.hash3_command('create','{"name":"Test A"}');code:=s->>'code';
perform set_config('hash3.test_room',code,true);
perform set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);denied:=false;
begin perform public.hash3_command('tick',jsonb_build_object('code',code));exception when insufficient_privilege then denied:=true;end;
if not denied then raise exception 'FAIL outsider tick';end if;
perform set_config('request.jwt.claim.sub',b,true);
s:=public.hash3_command('join',jsonb_build_object('code',code,'name','Test B'));
denied:=false;begin perform public.hash3_command('start',jsonb_build_object('code',code));exception when insufficient_privilege then denied:=true;end;
if not denied then raise exception 'FAIL non-host start';end if;
perform set_config('request.jwt.claim.sub',a,true);s:=public.hash3_command('start',jsonb_build_object('code',code));
xp:=s->'pairs'->0->>'x';op:=s->'pairs'->0->>'o';
for xy in select value from jsonb_array_elements('[[0,0],[0,1],[1,0],[1,1],[2,0],[2,2],[0,2],[2,1],[1,2]]'::jsonb) loop
perform set_config('request.jwt.claim.sub',case s->'pairs'->0->>'turn' when 'X' then xp else op end,true);
request_id:=gen_random_uuid()::text;
s:=public.hash3_command('move',jsonb_build_object('code',code,'x',xy->>0,'y',xy->>1,'requestId',request_id));n:=n+1;
same:=public.hash3_command('move',jsonb_build_object('code',code,'x',xy->>0,'y',xy->>1,'requestId',request_id));
if same<>s then raise exception 'FAIL idempotent move';end if;
if n=5 then
if (s->'lastEvent'->>'points')::int<>3 or (s->'pairs'->0->>'pending')::int<>0 then raise exception 'FAIL early score must not force expansion: %',s;end if;
denied:=false;begin perform public.hash3_command('expand',jsonb_build_object('code',code,'x',3,'y',0));exception when others then denied:=true;end;
if not denied then raise exception 'FAIL early expansion';end if;
end if;
if n<9 and (s->'pairs'->0->>'pending')::int<>0 then raise exception 'FAIL premature expansion';end if;
end loop;
if (s->'pairs'->0->>'pending')::int<>1 then raise exception 'FAIL full territory expansion';end if;
perform set_config('request.jwt.claim.sub',s->'pairs'->0->>'expander',true);
denied:=false;begin perform public.hash3_command('expand',jsonb_build_object('code',code,'x',999,'y',999));exception when others then denied:=true;end;
if not denied then raise exception 'FAIL distant expansion';end if;
same:=s;
s:=public.hash3_command('expand',jsonb_build_object('code',code,'x',2,'y',0));
if jsonb_array_length(s->'terrain')<>15 or s->'cells'<>same->'cells' or (s->'pairs'->0->>'pending')::int<>0 then raise exception 'FAIL partial overlap';end if;
denied:=false;begin perform public.hash3_command('expand',jsonb_build_object('code',code,'x',5,'y',0));exception when others then denied:=true;end;
if not denied then raise exception 'FAIL second expansion with holes';end if;
denied:=false;begin update hash3_private.rooms set state='{}';exception when insufficient_privilege then denied:=true;end;
if not denied then raise exception 'FAIL direct writes';end if;
end;
$$;
reset role;
-- Simulate a prior territory with a remaining hole, then expire its turn.
do $$
declare s jsonb;begin
select state into s from hash3_private.rooms where code=current_setting('hash3.test_room');
s:=jsonb_set(s,'{cells}',(select jsonb_agg(v) from jsonb_array_elements(s->'cells') v where not(v->>'x'='0' and v->>'y'='0')));
s:=jsonb_set(s,'{pairs,0,deadline}',to_jsonb(now()-interval '1 second'));
update hash3_private.rooms set state=s where code=current_setting('hash3.test_room');end;
$$;
set local role authenticated;
do $$
declare s jsonb;same jsonb;code text:=current_setting('hash3.test_room');uid text;denied boolean;
begin
perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
s:=public.hash3_command('get',jsonb_build_object('code',code));
uid:=s->'pairs'->0->>lower(s->'pairs'->0->>'turn');
same:=public.hash3_command('tick',jsonb_build_object('code',code));
if jsonb_array_length(same->'cells')<>jsonb_array_length(s->'cells')+1 or same->'lastEvent'->>'automatic'<>'true' or same->'lastEvent'->>'player'<>uid then raise exception 'FAIL timed move';end if;
s:=same;same:=public.hash3_command('tick',jsonb_build_object('code',code));if same<>s then raise exception 'FAIL double timed move';end if;
perform set_config('request.jwt.claim.sub',s->'pairs'->0->>lower(s->'pairs'->0->>'turn'),true);
if not exists(select 1 from jsonb_array_elements(s->'cells') c where c->>'x'='0' and c->>'y'='0') then
s:=public.hash3_command('move',jsonb_build_object('code',code,'x',0,'y',0,'requestId',gen_random_uuid()));
end if;
perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);denied:=false;
begin perform public.hash3_command('finish',jsonb_build_object('code',code));exception when insufficient_privilege then denied:=true;end;
if not denied then raise exception 'FAIL non-host finish';end if;
perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
s:=public.hash3_command('finish',jsonb_build_object('code',code));
if s->>'status'<>'finished' then raise exception 'FAIL finishing';end if;
same:=public.hash3_command('get',jsonb_build_object('code',code,'version',s->'version'));if same->>'not_modified'<>'true' then raise exception 'FAIL version polling';end if;
end;
$$;
reset role;
-- Upgrade retains scores, pieces, paid figures, and unlocks previous empty cells.
do $$
declare original jsonb;upgraded jsonb;begin
original:='{"status":"playing","version":8,"blocks":[{"x":0,"y":0},{"x":1,"y":0}],"cells":[{"x":0,"y":0,"symbol":"X","owner":"A"}],"players":[{"id":"A","score":12,"figures":3}],"lines":["X:0,0:1,0"],"pairs":[{"active":{"x":1,"y":0},"pending":1,"expander":"A","turn":"O","x":"A","o":"B"}]}';
upgraded:=hash3_private.normalize_state(original);
if upgraded->'cells'<>original->'cells' or upgraded->'players'<>original->'players' or jsonb_array_length(upgraded->'terrain')<>18 or upgraded->'pairs'->0->'active'->>'x'<>'3' or upgraded->'pairs'->0->>'pending'<>'0' then raise exception 'FAIL upgrade preservation';end if;
if not(upgraded->'forms') ? 'X:línea:0,0;1,0;2,0' then raise exception 'FAIL previous paid lines';end if;
end;
$$;
rollback;
