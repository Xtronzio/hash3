-- State-only fixtures. No real rooms, users or player records are modified.
DO $test$
#variable_conflict use_column
declare s jsonb;t jsonb;p jsonb;r jsonb;at_time timestamptz:='2026-10-07 12:00:00+00';stamp numeric:=extract(epoch from at_time)*1000;i int;size int;
begin
select jsonb_build_object('status','playing','version',1,'ruleVersion',2,'terrain',jsonb_agg(jsonb_build_object('x',x,'y',y)),'cells','[]'::jsonb,'forms','[]'::jsonb,'blocks','[]'::jsonb,'players','[{"id":"x","symbol":"X","pair":0,"active":true,"score":70,"placements":197},{"id":"o","symbol":"O","pair":0,"active":true,"score":0,"placements":0}]'::jsonb,'pairs','[{"id":0,"x":"x","o":"o","turn":"X","active":{"x":0,"y":0},"pending":0}]'::jsonb) into s from generate_series(0,14) x cross join generate_series(0,9) y;
select jsonb_agg(t||jsonb_build_object('id','food-'||(t->>'x')||','||(t->>'y'),'owner','x','symbol','X')) into p from jsonb_array_elements(s->'terrain') t where (t->>'y')::int<4;
s:=jsonb_set(s,'{cells}',p);s:=hash3_private.habitat_initialize(s,at_time);
s:=s||jsonb_build_object('lastEvent',jsonb_build_object('kind','move','id','food-0,0','player','x'));
t:=hash3_private.rodent_step(s,'x');
assert (t->'players'->0->>'placements')::int=198,'Count actual placements';
assert jsonb_array_length(t->'rodents')=1 and jsonb_array_length(t->'worms')=1 and jsonb_array_length(t->'bombs')=1,'Independent milestones coincide at 198';
assert jsonb_array_length(t->'works')=3,'Three paired workers reserve nine plus nine cells';
assert hash3_private.rodent_step(t,'x')=t,'Idempotent same placement event';
assert jsonb_array_length(t->'cells')=60,'Birth never eats';
-- Adopt old placements without retroactive births.
assert jsonb_array_length(hash3_private.habitat_initialize(s-'habitatVersion',at_time)->'rodents')=0,'No historic births';
-- Independent real-time meals, earned score unchanged, only three meals.
s:=hash3_private.habitat_initialize(s,at_time)||jsonb_build_object('worms','[]'::jsonb,'works','[]'::jsonb,'bombs','[]'::jsonb,'rodents',jsonb_build_array(jsonb_build_object('id','rat','kind','rodent','player','x','x',0,'y',0,'eaten',0,'nextAt',stamp+33000)));
for i in 1..3 loop
s:=s||jsonb_build_object('habitatLastCheck',stamp+i*33000-1000);s:=hash3_private.habitat_advance(s,at_time+make_interval(secs=>i*33));
end loop;
assert jsonb_array_length(s->'rodents')=0 and jsonb_array_length(s->'cells')=57,'Three timed meals then retirement';
assert (s->'players'->0->>'score')::int=70,'Never take paid points back';
-- Worm grows on adjacent diagonals, blocks its body, disappears one interval later.
s:=s||jsonb_build_object('cells','[{"id":"a","x":0,"y":0,"symbol":"X","owner":"x"},{"id":"b","x":1,"y":1,"symbol":"O","owner":"o"},{"id":"c","x":2,"y":2,"symbol":"X","owner":"x"}]'::jsonb,'worms',jsonb_build_array(jsonb_build_object('id','worm','kind','worm','player','x','x',0,'y',0,'eaten',0,'body','[{"x":0,"y":0}]'::jsonb,'nextAt',stamp+33000)));
for i in 1..3 loop s:=s||jsonb_build_object('habitatLastCheck',stamp+i*33000-1000);s:=hash3_private.habitat_advance(s,at_time+make_interval(secs=>i*33));end loop;
assert (s->'worms'->0->>'eaten')::int=3 and jsonb_array_length(s->'worms'->0->'body')=3,'Three adjacent meals and length three';
assert hash3_private.habitat_reserved(s,1,1),'Worm reserves its body';
s:=s||jsonb_build_object('habitatLastCheck',stamp+132000-1000);s:=hash3_private.habitat_advance(s,at_time+interval '132 seconds');assert jsonb_array_length(s->'worms')=0 and not hash3_private.habitat_reserved(s,1,1),'Release after third meal plus 33 seconds';
-- Pauses preserve the remaining interval; no actions accumulated after a gap.
s:=s||jsonb_build_object('rodents',jsonb_build_array(jsonb_build_object('id','rat','kind','rodent','player','x','x',0,'y',0,'eaten',0,'nextAt',stamp+33000)));
s:=hash3_private.habitat_freeze(s,at_time+interval '10 seconds',false);assert (s->'rodents'->0->>'remainingMs')::numeric=23000,'Freeze exact remaining time';
s:=hash3_private.habitat_freeze(s,at_time+interval '1 hour',true);assert (s->'rodents'->0->>'nextAt')::numeric=stamp+3600000+23000,'Resume exact remaining time';
t:=hash3_private.habitat_advance(s,at_time+interval '2 hours');assert (t->'rodents'->0->>'eaten')::int=0,'No offline catch-up';
-- Work executes destruction/construction atomically and only on empty terrain.
s:=s||jsonb_build_object('rodents','[]'::jsonb,'works','[{"id":"work","kind":"work","player":"x","done":0,"destroy":[{"x":3,"y":0},{"x":4,"y":0},{"x":5,"y":0}],"build":[{"x":0,"y":10},{"x":1,"y":10},{"x":2,"y":10}]}]'::jsonb,'habitatLastCheck',stamp);
s:=jsonb_set(s,'{works,0,nextAt}',to_jsonb(stamp));size:=jsonb_array_length(s->'terrain');s:=hash3_private.habitat_advance(s,at_time);
assert jsonb_array_length(s->'terrain')=size and (s->'works'->0->>'done')::int=1,'Each paired work step has balance zero';
-- A bomb clears contents, not geometry, and breaks a complete barrier.
s:=s||jsonb_build_object('works','[]'::jsonb,'frontiers','[{"id":"f","edges":[{"a":{"x":1,"y":0},"b":{"x":2,"y":0}}]}]'::jsonb,'bombs',jsonb_build_array(jsonb_build_object('id','bomb','kind','bomb','x',0,'y',0,'nextAt',stamp,'blast','[{"x":0,"y":0},{"x":1,"y":0},{"x":2,"y":0}]'::jsonb)));
s:=hash3_private.habitat_advance(s,at_time);assert jsonb_array_length(s->'terrain')=size and jsonb_array_length(s->'frontiers')=0,'Bombs never remove terrain and break barriers';
end $test$;
