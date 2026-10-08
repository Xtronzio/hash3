-- Pure JSON fixtures only: never modifies any live room or user.
DO $test$
#variable_conflict use_column
declare s jsonb;t jsonb;p jsonb;seen jsonb;count int;group_size int;i int;stamp numeric:=extract(epoch from now())*1000;
begin
for count,group_size in select * from (values(33,1),(66,2),(99,3)) d(n,g) loop
select jsonb_build_object('status','playing','version',1,'habitatVersion',2,'habitatLastCheck',stamp,'rodents','[]'::jsonb,'rodentRaids','[]'::jsonb,'worms','[]'::jsonb,'works','[]'::jsonb,'bombs','[]'::jsonb,'eatenCells','[]'::jsonb,'forms','[]'::jsonb,'terrain',jsonb_agg(jsonb_build_object('x',x,'y',y)),'players',jsonb_build_array(jsonb_build_object('id','x','active',true,'placements',count-1,'score',70,'habitatNext',jsonb_build_object('rodent',count,'bomb',(count/66+1)*66,'worm',(count/99+1)*99,'work',198))),'pairs','[{"id":0,"x":"x","o":"o","active":{"x":0,"y":0}}]'::jsonb) into s from generate_series(0,14) x cross join generate_series(0,9) y;
select jsonb_agg(t||jsonb_build_object('id','food-'||(t->>'x')||','||(t->>'y'),'owner','x','symbol','X')) into p from jsonb_array_elements(s->'terrain') t where (t->>'y')::int<4;
s:=s||jsonb_build_object('cells',p,'lastEvent',jsonb_build_object('id','food-0,0','kind','move'));
s:=hash3_private.rodent_step(s,'x');assert jsonb_array_length(s->'rodents')=0,'No resident rats';assert (s->'rodentRaids'->0->>'count')::int=group_size,'Scale groups 1/2/3';assert (s->'rodentRaids'->0->>'remaining')::int=2,'First visit at activating move';assert jsonb_array_length(s->'rodentVisit'->'visits')=group_size,'One meal per rat per move';assert hash3_private.rodent_step(s,'x')=s,'Idempotent event';
t:=hash3_private.habitat_advance(s,now()+interval '1 hour');assert t->'rodentRaids'=s->'rodentRaids' and t->'cells'=s->'cells','Clock never feeds rats';
seen:=s->'rodentVisit'->'visits';
for i in 1..2 loop
s:=s||jsonb_build_object('lastEvent',jsonb_build_object('id','food-0,0','kind','move'),'rodentEvent','fixture-other-'||i);
s:=hash3_private.rodent_step(s,'x');seen:=seen||(s->'rodentVisit'->'visits');
end loop;
assert jsonb_array_length(s->'rodentRaids')=0 and jsonb_array_length(seen)=group_size*3,'Three visits then no queue';
assert (select count(distinct (v->>'x',v->>'y')) from jsonb_array_elements(seen) v)=group_size*3,'Different places';
assert (select count(*) from jsonb_array_elements(s->'cells') v where v->>'symbol' in ('X','O'))=60-group_size*3,'Exactly 3/6/9 meals';assert (s->'players'->0->>'score')::int=70,'Paid points retained';
end loop;
-- Worm body immediately disappears with its third real meal at 99 seconds.
s:=s||jsonb_build_object('rodentRaids','[]'::jsonb,'cells','[{"id":"a","x":0,"y":0,"symbol":"X","owner":"x"},{"id":"b","x":1,"y":1,"symbol":"O","owner":"o"},{"id":"c","x":2,"y":2,"symbol":"X","owner":"x"}]'::jsonb,'worms',jsonb_build_array(jsonb_build_object('id','w','kind','worm','player','x','x',0,'y',0,'eaten',0,'body','[{"x":0,"y":0}]'::jsonb,'nextAt',stamp+33000)));
for i in 1..3 loop s:=s||jsonb_build_object('habitatLastCheck',stamp+i*33000-1000);s:=hash3_private.habitat_advance(s,now()+make_interval(secs=>i*33));end loop;
assert jsonb_array_length(s->'worms')=0 and jsonb_array_length(s->'cells')=0,'Three worm meals and retirement at 99 seconds';assert not hash3_private.habitat_reserved(s,1,1),'Trail released immediately';
-- Neutral cell sabotages a completion without becoming a player piece.
s:=s||jsonb_build_object('terrain','[{"x":0,"y":0},{"x":1,"y":0},{"x":2,"y":0},{"x":2,"y":2}]'::jsonb,'cells','[{"id":"a","x":0,"y":0,"symbol":"X","owner":"x"},{"id":"b","x":1,"y":0,"symbol":"X","owner":"x"}]'::jsonb);
-- Use connected comparison vacancy; the isolated cell is not a legal destination.
s:=jsonb_set(s,'{terrain}',(s->'terrain')||'[{"x":2,"y":1}]'::jsonb);
t:=hash3_private.territory_neutral(s,'{"x":0,"y":0}');assert exists(select 1 from jsonb_array_elements(t->'cells') v where v->>'symbol'='#' and v->>'x'='2' and v->>'y'='0' and v->'owner'='null'::jsonb),'Neutral blocks completion and has no owner';
-- Existing saves migrate once without historic births or timed rat clocks.
s:=s||jsonb_build_object('habitatVersion',1,'rodents','[{"id":"old","player":"x","x":0,"y":0,"eaten":1,"nextAt":0}]'::jsonb);
t:=hash3_private.habitat_initialize(s,now());assert t->>'habitatVersion'='2' and jsonb_array_length(t->'rodents')=0 and (t->'rodentRaids'->0->>'remaining')::int=2,'Adopt remaining move visits';assert hash3_private.habitat_initialize(t,now())=t,'Migration is idempotent';
end $test$;
