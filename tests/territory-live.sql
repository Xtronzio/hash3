-- Standalone JSON fixtures and RPC fixtures in a reverted transaction.
begin;
DO $test$
#variable_conflict use_column
declare s jsonb;base jsonb;t jsonb;plan jsonb;c jsonb;e jsonb;kind text;expected text;cfg jsonb:=hash3_private.eco_config();stamp numeric:=extract(epoch from now())*1000;old_size int;old_pieces int;n int;before_cells jsonb;protected_count int;
begin
 select jsonb_build_object('status','playing','version',1,'ruleVersion',2,'kind','duel','timeMode','untimed','terrain',jsonb_agg(jsonb_build_object('x',x,'y',y)),'pairs','[{"id":0,"x":"x","o":"o","turn":"X","active":{"x":0,"y":0}}]'::jsonb,'players','[{"id":"x","symbol":"X","pair":0,"active":true,"figures":120,"placements":500,"score":73},{"id":"o","symbol":"O","pair":0,"active":true,"figures":0,"placements":500,"score":15}]'::jsonb,'cells','[]'::jsonb,'forms','[]'::jsonb) into s from generate_series(0,32) x cross join generate_series(0,29) y;
 select jsonb_agg(c||jsonb_build_object('id','p-'||hash3_private.eco_key(c),'symbol',case (c->>'x')::int%2 when 0 then 'X' else 'O' end,'owner',case (c->>'x')::int%2 when 0 then 'x' else 'o' end)) into c from jsonb_array_elements(s->'terrain') c;
 s:=s||jsonb_build_object('cells',c);base:=hash3_private.eco_initialize(s,now());
 assert hash3_private.eco_initialize(base,now()+interval '1 hour')=base,'Migration idempotent';
 assert (base->>'territoryNextPlacement')::int=1495,'No historical announcements';
 assert (base->>'territoryNextInvasion')::int=1099,'Independent future invasion clock';
 assert jsonb_array_length(base->'worms')=0 and jsonb_array_length(base->'rodentRaids')=0,'No historical births';
 for kind in select jsonb_array_elements_text((cfg->'naturalRotation')||(cfg->'invaderRotation')) loop
  s:=base;plan:=hash3_private.eco_plan(s,kind,now());assert jsonb_array_length(plan->'region')>0,'Viable footprint: '||kind;
  assert (select count(distinct hash3_private.eco_key(c))=count(*) from jsonb_array_elements(plan->'region') c),'Unique footprint';
  assert (select bool_and(hash3_private.eco_index(s->'terrain') ? hash3_private.eco_key(c)) from jsonb_array_elements(plan->'region') c),'Footprint exists';
  e:=plan||jsonb_build_object('id','fixture-'||kind,'kind',kind,'nextAt',stamp);
  old_size:=jsonb_array_length(s->'terrain');old_pieces:=jsonb_array_length(s->'cells');t:=hash3_private.eco_apply(s,e,now());expected:=cfg->'rules'->kind->>'effect';
  assert t->'players'->0->'score'=s->'players'->0->'score','Retain points: '||kind;
  assert (select count(distinct hash3_private.eco_key(c))=count(*) from jsonb_array_elements(t->'cells') c),'Unique occupied slots';
  assert (select bool_and(hash3_private.eco_index(t->'terrain') ? hash3_private.eco_key(c)) from jsonb_array_elements(t->'cells') c),'No pieces outside terrain';
  if expected='demolish' then assert jsonb_array_length(t->'terrain')=old_size-jsonb_array_length(plan->'region'),'Demolish terrain: '||kind;assert jsonb_array_length(t->'cells')=old_pieces-jsonb_array_length(plan->'region'),'Demolish pieces';
  else assert jsonb_array_length(t->'terrain')=old_size,'Preserve terrain: '||kind;end if;
  if expected='vacate' then assert jsonb_array_length(t->'cells')=old_pieces-jsonb_array_length(plan->'region'),'Vacate: '||kind;
  elsif expected='shuffle' then assert jsonb_array_length(t->'cells')=old_pieces,'Shuffle conserves pieces';
  elsif expected='colonize' then assert (select count(*) from jsonb_array_elements(t->'cells') c where c->>'symbol'='*' and c->'owner'='null'::jsonb)=jsonb_array_length(plan->'region'),'Invaders use neutral asterisks';
  elsif expected='blackhole' then assert jsonb_array_length(t->'cells')=old_pieces-9,'Black hole core clears exactly nine';end if;
 end loop;
 -- Independent clocks: small invasions preserve fauna budgets and natural deadline.
 s:=base||jsonb_build_object('territoryNextInvasion',0);t:=hash3_private.eco_announce(s,now(),'placements');
 assert t->'territoryEvents'->0->>'kind'='invader-rain','Frequent invasion family';
 assert t->'territoryNextPlacement'=s->'territoryNextPlacement','Invasion does not postpone natural deadline';
 assert not hash3_private.eco_suspended(t,stamp),'Invasion leaves fauna active';
 assert hash3_private.eco_announce(t,now(),'placements')=t,'No simultaneous queue';
 t:=jsonb_set(t,'{territoryEvents,0,nextAt}',to_jsonb(stamp));t:=hash3_private.eco_events_advance(t,now());
 assert not t ? 'ecologyRecovery' and t->'habitatZones'=s->'habitatZones','No invasion recovery or budget reset';
 s:=base||jsonb_build_object('territoryNextPlacement',0,'territoryNextInvasion',0);t:=hash3_private.eco_announce(s,now(),'placements');
 assert t->'territoryEvents'->0->>'kind'='meteorites' and hash3_private.eco_suspended(t,stamp),'Due natural event has priority';
 assert t->'territoryNextInvasion'=s->'territoryNextInvasion','Natural event does not reset invasion deadline';
 s:=base||jsonb_build_object('terrain',(base->'terrain')||'[{"x":33,"y":0}]'::jsonb);t:=hash3_private.eco_growth(s,now());
 assert jsonb_array_length(t->'territoryEvents')=0,'Growth cannot bypass cycle';
 -- Immunity may be invoked after a warning; all protected cells survive.
 s:=base||jsonb_build_object('inventoryEffects',jsonb_build_object('immunities',jsonb_build_array(jsonb_build_object('player','x','expiresAt',stamp+33000))));
 plan:=hash3_private.eco_plan(base,'meteorites',now());e:=plan||jsonb_build_object('id','protected','kind','meteorites');
 t:=hash3_private.eco_apply(s,e,now());assert (select count(*) from jsonb_array_elements(t->'cells') c where c->>'owner'='x')=(select count(*) from jsonb_array_elements(s->'cells') c where c->>'owner'='x'),'Protection after warning';
 -- Anchor moves after the warning; execution rechecks it.
 s:=base;plan:=hash3_private.eco_plan(s,'meteorites',now());s:=jsonb_set(s,'{pairs,0,terrainAnchor}',plan->'region'->0);t:=hash3_private.eco_apply(s,plan||jsonb_build_object('kind','meteorites'),now());
 assert hash3_private.eco_index(t->'terrain') ? hash3_private.eco_key(plan->'region'->0),'Current anchor survives impact';
 -- Known cells only: stale tornado slots never create pieces outside terrain.
 s:=base;plan:=hash3_private.eco_plan(s,'tornado-rain',now());c:=plan->'region'->0;s:=jsonb_set(s,'{terrain}',(select jsonb_agg(v) from jsonb_array_elements(s->'terrain') v where hash3_private.eco_key(v)<>hash3_private.eco_key(c)));s:=hash3_private.habitat_clear(s,c);
 t:=hash3_private.eco_apply(s,plan||jsonb_build_object('kind','tornado-rain'),now());assert (select bool_and(hash3_private.eco_index(t->'terrain') ? hash3_private.eco_key(c)) from jsonb_array_elements(t->'cells') c),'Stale tornado slot ignored';
 -- Freeze warning AND recovery, exactly, including repeated pause calls.
 s:=base||jsonb_build_object('territoryEvents',jsonb_build_array(jsonb_build_object('id','clock','kind','pandemic','region','[{"x":1,"y":0}]'::jsonb,'nextAt',stamp+33000)),'ecologyRecovery',jsonb_build_object('until',stamp+50000,'moves',3));
 t:=hash3_private.habitat_freeze(s,now()+interval '10 seconds');assert (t->'territoryEvents'->0->>'remainingMs')::numeric=23000,'Exact warning pause';assert (t->'ecologyRecovery'->>'remainingMs')::numeric=40000,'Exact recovery pause';
 assert hash3_private.habitat_freeze(t,now()+interval '1 hour')->'territoryEvents'=t->'territoryEvents','Repeat pause does not reset';
 t:=hash3_private.habitat_freeze(t,now()+interval '1 hour',true);assert (t->'territoryEvents'->0->>'nextAt')::numeric=stamp+3600000+23000,'Exact resume';
 -- Impact consumed once even when entirely immune; no second strike.
 s:=base||jsonb_build_object('inventoryEffects',jsonb_build_object('immunities',jsonb_build_array(jsonb_build_object('player','x','expiresAt',stamp+100000),jsonb_build_object('player','o','expiresAt',stamp+100000))),'territoryEvents',jsonb_build_array(jsonb_build_object('id','immune','kind','pandemic','region','[{"x":0,"y":0}]'::jsonb,'nextAt',stamp)));
 t:=hash3_private.habitat_advance(s,now());assert jsonb_array_length(t->'territoryEvents')=0 and t->'cells'=s->'cells','Protected strike consumed';assert hash3_private.habitat_advance(t,now())->'cells'=t->'cells','No repeated strike';
 -- Inactive World zone freezes rather than executing a missed impact.
 s:=base||jsonb_build_object('players',(select jsonb_agg(p||jsonb_build_object('active',false)) from jsonb_array_elements(base->'players') p),'territoryEvents',jsonb_build_array(jsonb_build_object('id','inactive','kind','pandemic','region','[{"x":0,"y":0}]'::jsonb,'nextAt',stamp+33000)));
 t:=hash3_private.habitat_advance(s,now()+interval '1 hour');assert t->'cells'=s->'cells' and t->'territoryEvents'->0 ? 'remainingMs','Inactive zone frozen';
 -- Invader impacts and due worms coexist, retaining both animation actions.
 s:=base||jsonb_build_object('territoryEvents','[{"id":"small-impact","kind":"invader-rain","region":[{"x":1,"y":1}],"nextAt":0}]'::jsonb,'worms',jsonb_build_array(jsonb_build_object('id','worm-coexist','kind','worm','player','x','x',5,'y',5,'body','[{"x":5,"y":5}]'::jsonb,'eaten',0,'nextAt',stamp)));
 t:=hash3_private.habitat_advance(s,now());
 assert (t->'worms'->0->>'eaten')::int=1,'Worm active on invasion impact';
 assert exists(select 1 from jsonb_array_elements(t->'habitatEvent'->'actions') a where a->>'kind'='invader-rain') and exists(select 1 from jsonb_array_elements(t->'habitatEvent'->'actions') a where a->>'kind'='worm'),'Both animation actions survive';
 -- Rat appearance/eating/absence is nine completed turns, never nine ticks.
 s:=base||jsonb_build_object('territoryEnabled',false,'rodentRaids',jsonb_build_array(jsonb_build_object('id','rat','player','x','x',1,'y',0,'count',1,'remaining',3,'mealsLeft',3,'turn',0,'phase','arriving','visited','[]'::jsonb,'members',jsonb_build_array(jsonb_build_object('id','rat:0','x',1,'y',0,'cellId','p-1,0')))));
 old_pieces:=jsonb_array_length(s->'cells');
 for n in 1..9 loop s:=hash3_private.eco_visit_rodents(s,'{"x":0,"y":0}',now());end loop;
 assert jsonb_array_length(s->'rodentRaids')=0 and jsonb_array_length(s->'cells')=old_pieces-3,'Three meals in nine turns';
 -- A compact promotion exchanges nine for nine. Its clock cannot grow the board.
 s:=jsonb_set(base,'{cells}','[]');s:=hash3_private.habitat_project(s,'{"x":0,"y":0}','x',now());assert jsonb_array_length(s->'works')=3,'Three worker pairs';
 old_size:=jsonb_array_length(s->'terrain');
 for n in 1..3 loop s:=s||jsonb_build_object('habitatLastCheck',stamp+n*33000-1000);s:=hash3_private.habitat_advance(s,now()+make_interval(secs=>n*33));end loop;
 assert jsonb_array_length(s->'works')=0 and jsonb_array_length(s->'terrain')=old_size,'Balanced nine-cell promotion';
 -- Authoritative placement idempotency survives deleted pieces.
 s:=base||jsonb_build_object('territoryEnabled',false,'faunaEnabled',false,'lastEvent',jsonb_build_object('id','p-1,0','kind','move'));
 t:=hash3_private.rodent_step(s,'o');assert (t->'players'->1->>'placements')::int=501,'One placement';assert hash3_private.rodent_step(t,'o')=t,'Repeated placement does not increment';
 assert not has_function_privilege('authenticated','hash3_private.eco_apply(jsonb,jsonb,timestamptz)','execute'),'No direct engine access';
 assert not has_table_privilege('authenticated','hash3_private.rooms','update'),'No room writes';
end $test$;
-- Real public commands: payload cannot forge the server ecology.
insert into auth.users(id,aud,role,is_anonymous) values
 ('a3110001-1111-4111-8111-111111111111','authenticated','authenticated',true),
 ('a3110002-1111-4111-8111-111111111111','authenticated','authenticated',true);
set local role authenticated;
DO $rpc_create$
declare s jsonb;code text;
begin
 perform set_config('request.jwt.claim.sub','a3110001-1111-4111-8111-111111111111',true);
 s:=public.hash3_command('create','{"name":"Ecology QA X","kind":"duel","timeMode":"untimed"}');code:=s->>'code';perform set_config('hash3.ecology_fixture',code,true);
 perform set_config('request.jwt.claim.sub','a3110002-1111-4111-8111-111111111111',true);
 perform public.hash3_command('join',jsonb_build_object('code',code,'name','Ecology QA O'));
 perform set_config('request.jwt.claim.sub','a3110001-1111-4111-8111-111111111111',true);
 perform public.hash3_command('start',jsonb_build_object('code',code));
end $rpc_create$;
reset role;
DO $fixture$
declare s jsonb;terrain jsonb;
begin
 select state into s from hash3_private.rooms where code=current_setting('hash3.ecology_fixture');
 select jsonb_agg(jsonb_build_object('x',x,'y',y)) into terrain from generate_series(0,32) x cross join generate_series(0,10) y;
 s:=hash3_private.eco_initialize(s,now());s:=s||jsonb_build_object('terrain',terrain,'cells','[]'::jsonb,'timeMode','untimed','territoryNextInvasion',66,'territoryNextPlacement',333);
 s:=jsonb_set(s,'{players,0,placements}','65');s:=jsonb_set(s,'{players,0,figures}','99');
 update hash3_private.rooms set state=s where code=current_setting('hash3.ecology_fixture');
end $fixture$;
set local role authenticated;
DO $rpc_invasion$
declare s jsonb;t jsonb;code text:=current_setting('hash3.ecology_fixture');actor text;request text:=gen_random_uuid()::text;
begin
 perform set_config('request.jwt.claim.sub','a3110001-1111-4111-8111-111111111111',true);
 s:=public.hash3_command('get',jsonb_build_object('code',code));actor:=s->'pairs'->0->>lower(s->'pairs'->0->>'turn');perform set_config('request.jwt.claim.sub',actor,true);
 s:=public.hash3_command('move',jsonb_build_object('code',code,'x',0,'y',0,'requestId',request,'territoryNextPlacement',0,'territoryEvents','[{"kind":"meteorites"}]'::jsonb,'terrain','[]'::jsonb));
 assert s->'territoryEvents'->0->>'kind'='invader-rain','RPC uses server invasion cadence';
 assert (s->>'territoryNextPlacement')::int=333 and jsonb_array_length(s->'terrain')=363,'Forged rules and terrain ignored';
 t:=public.hash3_command('move',jsonb_build_object('code',code,'x',0,'y',0,'requestId',request));assert t=s,'RPC invasion idempotent';
end $rpc_invasion$;
reset role;
DO $natural_fixture$
declare s jsonb;
begin
 select state into s from hash3_private.rooms where code=current_setting('hash3.ecology_fixture');
 s:=s||jsonb_build_object('territoryEvents','[]'::jsonb,'habitatLastCheck',extract(epoch from now())*1000,'worms',jsonb_build_array(jsonb_build_object('id','due-worm','kind','worm','player',s->'players'->0->>'id','x',5,'y',5,'body','[{"x":5,"y":5}]'::jsonb,'eaten',0,'nextAt',extract(epoch from now())*1000)));
 s:=jsonb_set(s,'{players,0,placements}','331');s:=jsonb_set(s,'{players,1,placements}','1');
 update hash3_private.rooms set state=s where code=current_setting('hash3.ecology_fixture');
end $natural_fixture$;
set local role authenticated;
DO $rpc_natural$
declare s jsonb;code text:=current_setting('hash3.ecology_fixture');actor text;
begin
 perform set_config('request.jwt.claim.sub','a3110001-1111-4111-8111-111111111111',true);
 s:=public.hash3_command('get',jsonb_build_object('code',code));actor:=s->'pairs'->0->>lower(s->'pairs'->0->>'turn');perform set_config('request.jwt.claim.sub',actor,true);
 s:=public.hash3_command('move',jsonb_build_object('code',code,'x',1,'y',0,'requestId',gen_random_uuid()));
 assert s->'territoryEvents'->0->>'kind'='meteorites','RPC schedules natural event independently';
 assert (s->'worms'->0->>'eaten')::int=0 and s->'worms'->0 ? 'remainingMs','Natural announcement freezes due fauna';
end $rpc_natural$;
reset role;
rollback;
