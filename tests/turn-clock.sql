-- Authenticated fixture rooms are rolled back; no real game is changed.
begin;
insert into auth.users(id,aud,role,is_anonymous) values
('d1900001-1111-4111-8111-111111111111','authenticated','authenticated',true),
('d1900002-1111-4111-8111-111111111111','authenticated','authenticated',true);
set local role authenticated;
do $$
declare s jsonb;t jsonb;c text;v text;deadline timestamptz;end_time timestamptz;u text;
begin
perform set_config('request.jwt.claim.sub','d1900001-1111-4111-8111-111111111111',true);
s:=public.hash3_command('create','{"name":"Clock QA X","kind":"duel","minutes":5}');c:=s->>'code';
assert s->>'turnSeconds'='33','New room metadata must declare 33 seconds';
perform set_config('request.jwt.claim.sub','d1900002-1111-4111-8111-111111111111',true);
s:=public.hash3_command('join',jsonb_build_object('code',c,'name','Clock QA O'));
perform set_config('request.jwt.claim.sub','d1900001-1111-4111-8111-111111111111',true);
s:=public.hash3_command('start',jsonb_build_object('code',c));
assert (s->'pairs'->0->>'deadline')::timestamptz=now()+interval '33 seconds','Start must arm 33 seconds';
assert (s->>'endsAt')::timestamptz=now()+interval '5 minutes','Total duel duration must remain five minutes';
u:=s->'pairs'->0->>'x';perform set_config('request.jwt.claim.sub',u,true);
s:=public.hash3_command('move',jsonb_build_object('code',c,'x',0,'y',0,'requestId',gen_random_uuid()));
deadline:=(s->'pairs'->0->>'deadline')::timestamptz;end_time:=(s->>'endsAt')::timestamptz;
assert deadline=now()+interval '33 seconds','Move must arm next turn for 33 seconds';
s:=public.hash3_command('pause',jsonb_build_object('code',c));v:=s->'vote'->>'id';
perform set_config('request.jwt.claim.sub',case when u='d1900001-1111-4111-8111-111111111111' then 'd1900002-1111-4111-8111-111111111111' else 'd1900001-1111-4111-8111-111111111111' end,true);
s:=public.hash3_command('vote',jsonb_build_object('code',c,'voteId',v,'yes',true));
assert s->>'status'='paused' and s->'pairs'->0->>'deadline' is null,'Pause must freeze the clock';
s:=public.hash3_command('resume',jsonb_build_object('code',c));v:=s->'vote'->>'id';perform set_config('request.jwt.claim.sub',u,true);
s:=public.hash3_command('vote',jsonb_build_object('code',c,'voteId',v,'yes',true));
assert (s->'pairs'->0->>'deadline')::timestamptz=deadline and (s->>'endsAt')::timestamptz=end_time,'Resume must preserve both clocks';
s:=public.hash3_command('create','{"name":"Clock QA Untimed","kind":"duel","timeMode":"untimed"}');c:=s->>'code';
perform set_config('request.jwt.claim.sub',case when u='d1900001-1111-4111-8111-111111111111' then 'd1900002-1111-4111-8111-111111111111' else 'd1900001-1111-4111-8111-111111111111' end,true);
s:=public.hash3_command('join',jsonb_build_object('code',c,'name','Clock QA Other'));
perform set_config('request.jwt.claim.sub',u,true);s:=public.hash3_command('start',jsonb_build_object('code',c));
assert s->'pairs'->0->>'deadline' is null and s->>'endsAt' is null,'Untimed must retain null clocks';
end $$;
reset role;
-- A legacy state is migrated without changing an existing deadline or pause.
do $$
declare s jsonb:='{"ruleVersion":2,"status":"paused","turnSeconds":30,"terrain":[],"cells":[],"pairs":[{"deadline":null,"pauseRemainingMs":12000}],"players":[]}';t jsonb;
begin
t:=hash3_private.normalize_state(s);assert t->>'turnSeconds'='33','Legacy metadata must migrate';assert t->'pairs'=s->'pairs','Saved pause must not change';
s:=s||'{"status":"playing","terrain":[{"x":0,"y":0}],"pairs":[{"x":"x","o":"o","turn":"X","pending":0,"active":{"x":0,"y":0},"deadline":"2026-10-07T23:59:00Z"}]}';
t:=hash3_private.normalize_state(s);assert (t->'pairs'->0->>'deadline')::timestamptz=(s->'pairs'->0->>'deadline')::timestamptz,'In-flight deadline must not change';
end $$;
rollback;
