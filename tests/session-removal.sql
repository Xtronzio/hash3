-- Per-user room removal is reversible; fixtures never persist.
begin;
insert into auth.users(id,aud,role,is_anonymous)
select ('f'||lpad(i::text,7,'0')||'-1212-4121-8121-121212121212')::uuid,'authenticated','authenticated',true from generate_series(1,3) i;
set local role authenticated;
do $$
declare s jsonb;t jsonb;code text;closed text;v int;denied boolean;
begin
perform set_config('request.jwt.claim.sub','f0000001-1212-4121-8121-121212121212',true);s:=public.hash3_command('create','{"kind":"duel","name":"R12 A","timeMode":"untimed"}');code:=s->>'code';
perform set_config('request.jwt.claim.sub','f0000002-1212-4121-8121-121212121212',true);s:=public.hash3_command('join',jsonb_build_object('code',code,'name','R12 B'));
perform set_config('request.jwt.claim.sub','f0000001-1212-4121-8121-121212121212',true);s:=public.hash3_command('start',jsonb_build_object('code',code));s:=public.hash3_command('pause',jsonb_build_object('code',code));
-- Removal leaves an active room and cancels membership-sensitive votes, without pausing it.
t:=public.hash3_command('remove_game',jsonb_build_object('code',code));if t->>'removed'<>'true' then raise exception 'FAIL remove result';end if;
t:=public.hash3_command('my_games');if t->'games'<>'[]' then raise exception 'FAIL removed room visible';end if;
perform set_config('request.jwt.claim.sub','f0000002-1212-4121-8121-121212121212',true);t:=public.hash3_command('my_games');if jsonb_array_length(t->'games')<>1 then raise exception 'FAIL another member list modified';end if;
s:=public.hash3_command('get',jsonb_build_object('code',code));if s->>'status'<>'playing' or s ? 'vote' or not exists(select 1 from jsonb_array_elements(s->'players') p where p->>'id'='f0000001-1212-4121-8121-121212121212' and p->>'active'='false') then raise exception 'FAIL leave semantics';end if;
-- Opening by code restores visibility, then explicit join restores participation.
perform set_config('request.jwt.claim.sub','f0000001-1212-4121-8121-121212121212',true);s:=public.hash3_command('get',jsonb_build_object('code',code));t:=public.hash3_command('my_games');if jsonb_array_length(t->'games')<>1 then raise exception 'FAIL restore visibility';end if;
s:=public.hash3_command('join',jsonb_build_object('code',code,'name','R12 A'));if not exists(select 1 from jsonb_array_elements(s->'players') p where p->>'id'='f0000001-1212-4121-8121-121212121212' and p->>'active'='true') then raise exception 'FAIL rejoin removed room';end if;
s:=public.hash3_command('finish',jsonb_build_object('code',code));v:=(s->>'version')::int;
perform public.hash3_command('remove_game',jsonb_build_object('code',code));perform public.hash3_command('remove_game',jsonb_build_object('code',code));
perform set_config('request.jwt.claim.sub','f0000002-1212-4121-8121-121212121212',true);s:=public.hash3_command('get',jsonb_build_object('code',code));if s->>'status'<>'finished' or (s->>'version')::int<>v then raise exception 'FAIL shared result modified';end if;
perform set_config('request.jwt.claim.sub','f0000003-1212-4121-8121-121212121212',true);denied:=false;begin perform public.hash3_command('remove_game',jsonb_build_object('code',code));exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'FAIL outsider removal';end if;
end $$;
rollback;
