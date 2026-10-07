-- Synthetic users and rooms only; the entire fixture rolls back.
begin;
insert into auth.users(id,aud,role,is_anonymous) values
 ('d1910001-1111-4111-8111-111111111111','authenticated','authenticated',true),
 ('d1910002-1111-4111-8111-111111111111','authenticated','authenticated',true);
insert into hash3_private.rooms(id,code,host_uid,state) values
 ('d1910003-1111-4111-8111-111111111111','METQA191','d1910001-1111-4111-8111-111111111111',
 '{"id":"d1910003-1111-4111-8111-111111111111","code":"METQA191","kind":"duel","status":"finished","version":1,"ruleVersion":2,"commonWorld":false,"pairs":[],"terrain":[],"blocks":[],"cells":[],"forms":[],"lines":[],"players":[{"id":"d1910001-1111-4111-8111-111111111111","name":"Metrics QA A","score":123,"figures":8,"placements":12,"bestCombo":{"points":33},"max":{"value":70,"actions":12,"provisional":true}},{"id":"d1910002-1111-4111-8111-111111111111","name":"Metrics QA B","score":456,"figures":20}]}');
insert into hash3_private.members(room_id,user_id,hidden_at) values
 ('d1910003-1111-4111-8111-111111111111','d1910001-1111-4111-8111-111111111111',now()),
 ('d1910003-1111-4111-8111-111111111111','d1910002-1111-4111-8111-111111111111',null);
set local role authenticated;
do $$
declare data jsonb;before_state jsonb;
begin
 perform set_config('request.jwt.claim.sub','d1910001-1111-4111-8111-111111111111',true);
 data:=public.hash3_command('my_metrics','{"user_id":"d1910002-1111-4111-8111-111111111111"}');
 assert jsonb_array_length(data->'entries')=1,'Hidden games must remain in personal metrics';
 assert data->'entries'->0->>'participant'='d1910001-1111-4111-8111-111111111111','Caller cannot impersonate requested user';
 assert data->'entries'->0->>'score'='123' and data->'entries'->0->>'bestCombo'='33','Records are returned';
 assert data->'entries'->0->>'mode'='duel','Duels must not be World';
 assert not ((data->'entries'->0) ? 'cells'),'Metrics must not expose board contents';
 perform set_config('request.jwt.claim.sub','d1910002-1111-4111-8111-111111111111',true);
 data:=public.hash3_command('my_metrics','{}');
 assert data->'entries'->0->>'score'='456','Each caller sees only own score';
 assert data->'entries'->0->>'bestCombo' is null,'Missing historical records stay null';
 perform set_config('request.jwt.claim.sub','',true);
 begin perform public.hash3_command('my_metrics','{}');raise exception 'Unauthenticated metrics accepted';exception when invalid_authorization_specification then null;end;
end $$;
reset role;
do $$
begin
 assert (select state->>'version'='1' from hash3_private.rooms where code='METQA191'),'Reading metrics must not tick or mutate a room';
 assert (select hidden_at is not null from hash3_private.members where user_id='d1910001-1111-4111-8111-111111111111'),'Reading metrics must not unhide games';
 assert not has_function_privilege('anon','hash3_private.personal_metrics()','execute'),'No anonymous direct access';
 assert not has_function_privilege('authenticated','hash3_private.personal_metrics()','execute'),'Only gateway exposes the private function';
end $$;
rollback;
