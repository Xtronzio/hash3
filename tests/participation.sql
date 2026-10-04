-- New participation and timed duels. All users and rooms are rolled back.
begin;
insert into auth.users(id,aud,role,is_anonymous) select u::uuid,'authenticated','authenticated',true from unnest(array[
'41111111-1111-4111-8111-111111111111','42222222-2222-4222-8222-222222222222','43333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444','45555555-5555-4555-8555-555555555555']) u;
set local role authenticated;
do $$
declare a text:='41111111-1111-4111-8111-111111111111';b text:='42222222-2222-4222-8222-222222222222';c text:='43333333-3333-4333-8333-333333333333';d text:='44444444-4444-4444-8444-444444444444';e text:='45555555-5555-4555-8555-555555555555';s jsonb;before_state jsonb;code text;invite text;sign text;bot text;denied boolean;
begin
perform set_config('request.jwt.claim.sub',a,true);s:=public.hash3_command('create','{"name":"Participation A"}');code:=s->>'code';perform set_config('hash3.participation_room',code,true);
perform set_config('request.jwt.claim.sub',b,true);s:=public.hash3_command('join',jsonb_build_object('code',code,'name','Participation B'));
perform set_config('request.jwt.claim.sub',a,true);s:=public.hash3_command('start',jsonb_build_object('code',code));
select v->>'symbol' into sign from jsonb_array_elements(s->'players') v where v->>'id'=a;
before_state:=s;s:=public.hash3_command('leave',jsonb_build_object('code',code));
if not exists(select 1 from jsonb_array_elements(s->'players') v where v->>'id'=a and v->>'active'='false' and v->>'pair' is null) then raise exception 'FAIL leave marks inactive';end if;
bot:=s->'pairs'->0->>lower(sign);
if not exists(select 1 from jsonb_array_elements(s->'players') v where v->>'id'=bot and v->>'bot'='true') or s->'cells'<>before_state->'cells' then raise exception 'FAIL machine replacement preserves board';end if;
denied:=false;begin perform public.hash3_command('move',jsonb_build_object('code',code,'x',0,'y',0,'requestId',gen_random_uuid()));exception when insufficient_privilege then denied:=true;end;
if not denied then raise exception 'FAIL inactive player can move';end if;
denied:=false;begin perform hash3_private.advance_worlds();exception when insufficient_privilege then denied:=true;end;
if not denied then raise exception 'FAIL authenticated scheduler access';end if;
s:=public.hash3_command('join',jsonb_build_object('code',code,'name','Participation A'));
if s->'pairs'->0->>lower(sign)<>a then raise exception 'FAIL return original seat';end if;
s:=public.hash3_command('leave',jsonb_build_object('code',code));
perform set_config('request.jwt.claim.sub',c,true);s:=public.hash3_command('join',jsonb_build_object('code',code,'name','Participation C','preference','new'));
invite:=s->'pairs'->1->>'invite';if invite is null or jsonb_array_length(s->'pairs')<>2 then raise exception 'FAIL create reserved pair';end if;
perform set_config('request.jwt.claim.sub',d,true);s:=public.hash3_command('join',jsonb_build_object('code',code,'name','Participation D'));
if s->'pairs'->0->>lower(sign)<>d or s->'pairs'->1 ? 'invite' then raise exception 'FAIL fill vacancy or leaked invitation';end if;
perform set_config('request.jwt.claim.sub',e,true);s:=public.hash3_command('join',jsonb_build_object('code',code,'name','Participation E','rival',invite));
if not exists(select 1 from jsonb_array_elements(s->'players') v where v->>'id'=e and v->>'pair'='1') then raise exception 'FAIL friend enters same pair';end if;
perform set_config('request.jwt.claim.sub',a,true);s:=public.hash3_command('join',jsonb_build_object('code',code,'name','Participation A'));
if s->'pairs'->0->>lower(sign)<>d or not exists(select 1 from jsonb_array_elements(s->'players') v where v->>'id'=a and v->>'active'='true' and v->>'pair'='2') then raise exception 'FAIL returning player steals occupied seat';end if;
-- Start with an odd number: the third player gets a machine.
s:=public.hash3_command('create','{"name":"Odd A"}');code:=s->>'code';
perform set_config('request.jwt.claim.sub',b,true);perform public.hash3_command('join',jsonb_build_object('code',code,'name','Odd B'));
perform set_config('request.jwt.claim.sub',c,true);perform public.hash3_command('join',jsonb_build_object('code',code,'name','Odd C'));
perform set_config('request.jwt.claim.sub',a,true);s:=public.hash3_command('start',jsonb_build_object('code',code));
if jsonb_array_length(s->'pairs')<>2 or not exists(select 1 from jsonb_array_elements(s->'players') v where v->>'bot'='true') then raise exception 'FAIL odd start';end if;
-- Fixed individual duel; start is denied until the second player arrives.
s:=public.hash3_command('create','{"name":"Duel A","kind":"duel","format":"solo","minutes":3}');code:=s->>'code';perform set_config('hash3.duel_room',code,true);
denied:=false;begin perform public.hash3_command('start',jsonb_build_object('code',code));exception when others then denied:=true;end;
if not denied then raise exception 'FAIL duel started alone';end if;
perform set_config('request.jwt.claim.sub',b,true);perform public.hash3_command('join',jsonb_build_object('code',code,'name','Duel B'));
perform set_config('request.jwt.claim.sub',a,true);s:=public.hash3_command('start',jsonb_build_object('code',code));
if s->>'endsAt' is null or (s->>'durationSeconds')::int<>180 then raise exception 'FAIL duel duration';end if;
-- A late player cannot add an extra pair to an ongoing duel.
perform set_config('request.jwt.claim.sub',e,true);denied:=false;begin perform public.hash3_command('join',jsonb_build_object('code',code,'name','Late E','preference','new'));exception when others then denied:=true;end;
if not denied then raise exception 'FAIL duel extra pair';end if;
end; $$;
reset role;
do $$
declare s jsonb;next_state jsonb;bot text;pi int;old_score int;begin
select state into s from hash3_private.rooms where code=current_setting('hash3.participation_room');
select (v->>'id')::int,v->>'o' into pi,bot from jsonb_array_elements(s->'pairs') v where exists(select 1 from jsonb_array_elements(s->'players') q where q->>'id'=v->>'o' and q->>'bot'='true') limit 1;
if bot is null then select (v->>'id')::int,v->>'x' into pi,bot from jsonb_array_elements(s->'pairs') v where exists(select 1 from jsonb_array_elements(s->'players') q where q->>'id'=v->>'x' and q->>'bot'='true') limit 1;end if;
s:=jsonb_set(s,array['pairs',pi::text,'turn'],to_jsonb(case when s->'pairs'->pi->>'x'=bot then 'X'::text else 'O'::text end));
s:=jsonb_set(s,array['pairs',pi::text,'deadline'],to_jsonb(now()-interval '1 second'));
next_state:=hash3_private.advance_state(s,now());
if not exists(select 1 from jsonb_array_elements(next_state->'cells') v where v->>'owner'=bot) then raise exception 'FAIL autonomous machine move';end if;
-- All due pairs advance once without browsers, and turns never replay twice.
s:=next_state;next_state:=hash3_private.advance_state(s,now());if next_state<>s then raise exception 'FAIL repeated tick';end if;
select state into s from hash3_private.rooms where code=current_setting('hash3.duel_room');
next_state:=hash3_private.advance_state(s,(s->>'endsAt')::timestamptz+interval '1 second');
if next_state->>'status'<>'finished' or next_state->'cells'<>s->'cells' then raise exception 'FAIL automatic duel finish';end if;
update hash3_private.rooms set state=jsonb_set(s,'{endsAt}',to_jsonb(now()-interval '1 second')) where code=current_setting('hash3.duel_room');
end; $$;
set local role authenticated;
do $$ declare s jsonb;begin
perform set_config('request.jwt.claim.sub','41111111-1111-4111-8111-111111111111',true);
s:=public.hash3_command('move',jsonb_build_object('code',current_setting('hash3.duel_room'),'x',0,'y',0,'requestId',gen_random_uuid()));
if s->>'status'<>'finished' or jsonb_array_length(s->'cells')<>0 then raise exception 'FAIL move beyond duel end';end if;
end; $$;
-- Team duel: two humans per side after random assignment, fixed duration.
do $$
declare s jsonb;code text;pid text;begin
perform set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
s:=public.hash3_command('create','{"name":"Team Host","kind":"duel","format":"teams","minutes":5}');code:=s->>'code';
for pid in select unnest(array['41111111-1111-4111-8111-111111111111','42222222-2222-4222-8222-222222222222','43333333-3333-4333-8333-333333333333']) loop
perform set_config('request.jwt.claim.sub',pid,true);perform public.hash3_command('join',jsonb_build_object('code',code,'name','Team '||substr(pid,1,4)));end loop;
perform set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);s:=public.hash3_command('start',jsonb_build_object('code',code));
if jsonb_array_length(s->'pairs')<>2 or (s->>'durationSeconds')::int<>300 or (select count(*) from jsonb_array_elements(s->'players') v where v->>'symbol'='X')<>2 then raise exception 'FAIL team duel';end if;
end; $$;
reset role;
-- A repeated request and changes on the other side never extend a turn.
do $$ declare s jsonb;n jsonb;p jsonb;actor text;req text:=gen_random_uuid()::text;deadline timestamptz:=now()+interval '15 seconds';name text;begin
select state into s from hash3_private.rooms where code=current_setting('hash3.participation_room');
p:=s->'pairs'->0;actor:=p->>lower(p->>'turn');
select v->>'name' into name from jsonb_array_elements(s->'players') v where v->>'id'=actor;
perform set_config('request.jwt.claim.sub',actor,true);
s:=public.hash3_command('move',jsonb_build_object('code',s->>'code','x',p->'active'->>'x','y',p->'active'->>'y','requestId',req));
s:=jsonb_set(s,'{pairs,0,deadline}',to_jsonb(deadline));
update hash3_private.rooms set state=s where code=s->>'code';
n:=public.hash3_command('move',jsonb_build_object('code',s->>'code','x',p->'active'->>'x','y',p->'active'->>'y','requestId',req));
if (n->'pairs'->0->>'deadline')::timestamptz<>deadline or n->'cells'<>s->'cells' then raise exception 'FAIL retry extends timer';end if;
n:=public.hash3_command('leave',jsonb_build_object('code',s->>'code'));
if (n->'pairs'->0->>'deadline')::timestamptz<>deadline then raise exception 'FAIL leave extends opponent timer';end if;
n:=public.hash3_command('join',jsonb_build_object('code',s->>'code','name',name));
if (n->'pairs'->0->>'deadline')::timestamptz<>deadline then raise exception 'FAIL return extends opponent timer';end if;
end; $$;
-- Full territory expires into an automatic, valid expansion without losing pieces.
do $$ declare s jsonb;n jsonb;p jsonb;begin
select state into s from hash3_private.rooms where code=current_setting('hash3.participation_room');
p:=s->'pairs'->0;s:=jsonb_set(s,'{cells}',(select jsonb_agg(v||jsonb_build_object('symbol','X','owner',p->>'x')) from jsonb_array_elements(s->'terrain') v));
s:=hash3_private.normalize_state(s);s:=jsonb_set(s,'{pairs,0,deadline}',to_jsonb(now()-interval '1 second'));
n:=hash3_private.advance_state(s,now());
if jsonb_array_length(n->'terrain')<=jsonb_array_length(s->'terrain') or n->'cells'<>s->'cells' or n->'pairs'->0->>'pending'<>'0' then raise exception 'FAIL autonomous expansion';end if;
end; $$;
rollback;
