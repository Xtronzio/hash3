-- Authenticated online fixtures. Everything is rolled back, including test users.
begin;
do $$ declare i int;u uuid;begin
for i in 1..3 loop u:=gen_random_uuid();insert into auth.users(id,aud,role,is_anonymous) values(u,'authenticated','authenticated',true);perform set_config('hash3.habitat_user_'||i,u::text,true);end loop;
end;$$;
set local role authenticated;
do $$ declare s jsonb;c text;begin
perform set_config('request.jwt.claim.sub',current_setting('hash3.habitat_user_1'),true);
s:=public.hash3_command('create','{"name":"Habitat QA X","kind":"duel","timeMode":"untimed","symbol":"X"}');c:=s->>'code';perform set_config('hash3.habitat_code',c,true);
perform set_config('request.jwt.claim.sub',current_setting('hash3.habitat_user_2'),true);s:=public.hash3_command('join',jsonb_build_object('code',c,'name','Habitat QA O'));
perform set_config('request.jwt.claim.sub',current_setting('hash3.habitat_user_1'),true);s:=public.hash3_command('start',jsonb_build_object('code',c));
perform set_config('hash3.habitat_x',s->'pairs'->0->>'x',true);perform set_config('hash3.habitat_o',s->'pairs'->0->>'o',true);
end;$$;
reset role;
update hash3_private.rooms set state=hash3_private.habitat_initialize(jsonb_set(jsonb_set(state,'{players}',(select jsonb_agg(case when p->>'id'=current_setting('hash3.habitat_x') then p||'{"placements":32}'::jsonb else p end) from jsonb_array_elements(state->'players') p)),'{cells}',jsonb_build_array(jsonb_build_object('id','food','x',0,'y',0,'symbol','X','owner',current_setting('hash3.habitat_x')))),now()) where code=current_setting('hash3.habitat_code');
set local role authenticated;
do $$ declare s jsonb;t jsonb;request text:=gen_random_uuid()::text;c text:=current_setting('hash3.habitat_code');denied boolean:=false;begin
perform set_config('request.jwt.claim.sub',current_setting('hash3.habitat_x'),true);
s:=public.hash3_command('move',jsonb_build_object('code',c,'x',1,'y',0,'requestId',request));assert jsonb_array_length(s->'rodents')=1 and (s->'rodents'->0->>'eaten')::int=0,'RPC birth after 33 actual own placements';
t:=public.hash3_command('move',jsonb_build_object('code',c,'x',1,'y',0,'requestId',request));assert t->'rodents'=s->'rodents' and t->'players'=s->'players','Duplicate placement cannot duplicate birth';
perform set_config('request.jwt.claim.sub',current_setting('hash3.habitat_user_3'),true);
begin perform public.hash3_command('tick',jsonb_build_object('code',c));exception when insufficient_privilege then denied:=true;end;assert denied,'Nonmember cannot tick inhabitants';
end;$$;
reset role;
-- Due meal via a real authenticated tick, without advancing the unlimited turn.
update hash3_private.rooms set state=jsonb_set(jsonb_set(state,'{rodents,0,nextAt}',to_jsonb(extract(epoch from now())*1000)),'{habitatLastCheck}',to_jsonb(extract(epoch from now())*1000)) where code=current_setting('hash3.habitat_code');
set local role authenticated;
do $$ declare s jsonb;t jsonb;c text:=current_setting('hash3.habitat_code');v text;begin
perform set_config('request.jwt.claim.sub',current_setting('hash3.habitat_x'),true);
s:=public.hash3_command('tick',jsonb_build_object('code',c));assert (s->'rodents'->0->>'eaten')::int=1,'Tick resolves independent timed meal';assert jsonb_array_length(s->'cells')=1,'Meal clears one token';
t:=public.hash3_command('tick',jsonb_build_object('code',c,'version',s->'version'));assert coalesce((t->>'not_modified')::boolean,false),'Second current tick must not eat twice';
s:=public.hash3_command('pause',jsonb_build_object('code',c));v:=s->'vote'->>'id';perform set_config('request.jwt.claim.sub',current_setting('hash3.habitat_o'),true);
s:=public.hash3_command('vote',jsonb_build_object('code',c,'voteId',v,'yes',true));assert s->>'status'='paused' and s->'rodents'->0 ? 'remainingMs','Online pause freezes habitat';
s:=public.hash3_command('resume',jsonb_build_object('code',c));v:=s->'vote'->>'id';perform set_config('request.jwt.claim.sub',current_setting('hash3.habitat_x'),true);
s:=public.hash3_command('vote',jsonb_build_object('code',c,'voteId',v,'yes',true));assert s->>'status'='playing' and not (s->'rodents'->0 ? 'remainingMs'),'Online resume rebases remaining interval';
end;$$;
reset role;
rollback;
