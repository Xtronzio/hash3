-- Level selection and scoring through real authenticated RPC; all fixtures roll back.
begin;
insert into auth.users(id,aud,role,is_anonymous) values
('71111111-1111-4111-8111-111111111111','authenticated','authenticated',true),
('72222222-2222-4222-8222-222222222222','authenticated','authenticated',true);
set local role authenticated;
do $$
declare s jsonb;code text;lv text;k text;denied boolean;begin
perform set_config('request.jwt.claim.sub','71111111-1111-4111-8111-111111111111',true);
for k in select unnest(array['world','duel']) loop
for lv in select unnest(array['normal','advanced']) loop
s:=public.hash3_command('create',jsonb_build_object('name','Level A','kind',k,'level',lv));code:=s->>'code';
if s->>'level'<>lv then raise exception 'FAIL create level % %',k,lv;end if;
perform set_config('request.jwt.claim.sub','72222222-2222-4222-8222-222222222222',true);
s:=public.hash3_command('join',jsonb_build_object('code',code,'name','Level B','level',case lv when 'normal' then 'advanced' else 'normal' end));
if s->>'level'<>lv then raise exception 'FAIL join can alter level';end if;
perform set_config('request.jwt.claim.sub','71111111-1111-4111-8111-111111111111',true);
s:=public.hash3_command('start',jsonb_build_object('code',code,'level','other'));
if s->>'level'<>lv then raise exception 'FAIL start can alter level';end if;
if k='world' then perform set_config('hash3.level_'||lv,code,true);else perform public.hash3_command('finish',jsonb_build_object('code',code));end if;
end loop;end loop;
s:=public.hash3_command('create','{"name":"Default A"}');if s->>'level'<>'normal' then raise exception 'FAIL default level';end if;
perform public.hash3_command('finish',jsonb_build_object('code',s->>'code'));
denied:=false;begin perform public.hash3_command('create','{"name":"Invalid A","level":"other"}');exception when others then denied:=true;end;
if not denied then raise exception 'FAIL invalid level';end if;
denied:=false;begin perform hash3_private.scoring_figures('{"cells":[]}',0,0,'X');exception when insufficient_privilege then denied:=true;end;
if not denied then raise exception 'FAIL helper exposed';end if;
end;$$;
reset role;
do $$
declare lv text;s jsonb;fixture jsonb;next_state jsonb;xp text;ai int;expected int;begin
for lv in select unnest(array['normal','advanced']) loop
select state into s from hash3_private.rooms where code=current_setting('hash3.level_'||lv);xp:=s->'pairs'->0->>'x';
s:=jsonb_set(s,'{cells}','[{"x":0,"y":0,"symbol":"X"},{"x":1,"y":0,"symbol":"X"},{"x":2,"y":0,"symbol":"X"}]');
s:=jsonb_set(s,'{terrain}','[{"x":0,"y":0},{"x":1,"y":0},{"x":2,"y":0},{"x":1,"y":1}]');
s:=jsonb_set(s,'{pairs,0,turn}','"X"');s:=jsonb_set(s,'{pairs,0,deadline}',to_jsonb(now()+interval '30 seconds'));
fixture:=s;expected:=case lv when 'advanced' then 13 else 6 end;
next_state:=hash3_private.advance_state(s,now()+interval '31 seconds');
if (next_state->'lastEvent'->>'points')::int<>expected or next_state->'lastEvent'->>'automatic'<>'true' then raise exception 'FAIL timed %: %',lv,next_state;end if;
-- The machine scores under the stored room level as well.
select (ord-1)::int into ai from jsonb_array_elements(s->'players') with ordinality e(v,ord) where v->>'id'=xp;
s:=jsonb_set(s,array['players',ai::text,'bot'],'true');
next_state:=hash3_private.advance_state(s,now()+interval '31 seconds');
if (next_state->'lastEvent'->>'points')::int<>expected or next_state->'lastEvent'->>'machine'<>'true' then raise exception 'FAIL machine %',lv;end if;
-- Old states retain Normal behavior without a level property.
next_state:=hash3_private.advance_state(fixture-'level',now()+interval '31 seconds');
if (next_state->'lastEvent'->>'points')::int<>6 then raise exception 'FAIL old room scoring';end if;
update hash3_private.rooms set state=fixture where code=current_setting('hash3.level_'||lv);
end loop;end;$$;
set local role authenticated;
do $$
declare lv text;s jsonb;same jsonb;request_id uuid;xp text;expected int;begin
for lv in select unnest(array['normal','advanced']) loop
perform set_config('request.jwt.claim.sub','71111111-1111-4111-8111-111111111111',true);
s:=public.hash3_command('get',jsonb_build_object('code',current_setting('hash3.level_'||lv)));xp:=s->'pairs'->0->>'x';
perform set_config('request.jwt.claim.sub',xp,true);request_id:=gen_random_uuid();
s:=public.hash3_command('move',jsonb_build_object('code',s->>'code','x',1,'y',1,'requestId',request_id,'level',case lv when 'normal' then 'advanced' else 'normal' end));
expected:=case lv when 'advanced' then 13 else 6 end;
if (s->'lastEvent'->>'points')::int<>expected or s->>'level'<>lv or (s->'lastEvent'->>'figures')::int<>(case lv when 'advanced' then 3 else 2 end) then raise exception 'FAIL manual scoring %: %',lv,s;end if;
same:=public.hash3_command('move',jsonb_build_object('code',s->>'code','x',1,'y',1,'requestId',request_id));
if same<>s then raise exception 'FAIL level idempotency';end if;
end loop;end;$$;
reset role;
do $$
declare s jsonb;f jsonb;n int;begin
s:='{"level":"advanced","cells":[{"x":0,"y":0,"symbol":"X"},{"x":1,"y":0,"symbol":"X"},{"x":0,"y":1,"symbol":"X"},{"x":1,"y":1,"symbol":"X"}]}';
f:=hash3_private.scoring_figures(s,1,1,'X');
select sum((v->>'size')::int) into n from jsonb_array_elements(f) v;
if n<>13 or jsonb_array_length(f)<>4 or exists(select 1 from jsonb_array_elements(f) v where v->>'kind'='grupo') then raise exception 'FAIL square preserves four basics without group duplication';end if;
s:='{"level":"advanced","cells":[{"x":0,"y":0,"symbol":"X"},{"x":1,"y":1,"symbol":"X"},{"x":2,"y":2,"symbol":"X"},{"x":3,"y":3,"symbol":"X"}]}';
f:=hash3_private.scoring_figures(s,3,3,'X');if jsonb_array_length(f)<>1 or f->0->>'kind'<>'línea' then raise exception 'FAIL diagonal groups';end if;
s:='{"level":"advanced","cells":[{"x":0,"y":0,"symbol":"X"},{"x":1,"y":0,"symbol":"X"},{"x":2,"y":0,"symbol":"X"},{"x":1,"y":1,"symbol":"X"},{"x":-1,"y":-1,"symbol":"X"},{"x":-2,"y":-2,"symbol":"X"}]}';
f:=hash3_private.scoring_figures(s,1,1,'X');
if not exists(select 1 from jsonb_array_elements(f) v where v->>'id'='X:grupo:0,0;1,0;1,1;2,0') or not exists(select 1 from jsonb_array_elements(f) v where v->>'kind'='línea' and v->>'size'='4') then raise exception 'FAIL equal-sized diagonal versus side group';end if;
s:=jsonb_set(s,'{cells}',s->'cells'||'[{"x":3,"y":0,"symbol":"X"}]');f:=hash3_private.scoring_figures(s,3,0,'X');
if not exists(select 1 from jsonb_array_elements(f) v where v->>'id'='X:grupo:0,0;1,0;1,1;2,0;3,0' and v->>'size'='5') then raise exception 'FAIL new complete extended group';end if;
end;$$;
rollback;
