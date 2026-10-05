-- Real RPC calls as authenticated players; all fixtures and rooms roll back.
begin;
do $$ declare i int;u uuid;begin
for i in 1..5 loop u:=gen_random_uuid();insert into auth.users(id,aud,role,is_anonymous) values(u,'authenticated','authenticated',true);perform set_config('hash3.symbol_user_'||i,u::text,true);end loop;
end;$$;
set local role authenticated;
do $$
declare a text:=current_setting('hash3.symbol_user_1');b text:=current_setting('hash3.symbol_user_2');
s jsonb;t jsonb;c text;chosen text;denied boolean;i int;v jsonb;
begin
for chosen in select unnest(array['X','O']) loop
perform set_config('request.jwt.claim.sub',a,true);
s:=public.hash3_command('create',jsonb_build_object('name','Creator','kind','duel','format','solo','timeMode','untimed','symbol',chosen));c:=s->>'code';
if s->>'hostSymbol'<>chosen then raise exception 'FAIL choice on create';end if;
perform set_config('request.jwt.claim.sub',b,true);s:=public.hash3_command('join',jsonb_build_object('name','Opponent','code',c));
denied:=false;begin perform public.hash3_command('choose_symbol',jsonb_build_object('code',c,'symbol','X'));exception when insufficient_privilege then denied:=true;end;
if not denied then raise exception 'FAIL guest can choose creator symbol';end if;
perform set_config('request.jwt.claim.sub',current_setting('hash3.symbol_user_5'),true);
denied:=false;begin perform public.hash3_command('choose_symbol',jsonb_build_object('code',c,'symbol','O'));exception when insufficient_privilege then denied:=true;end;
if not denied then raise exception 'FAIL outsider choice';end if;
perform set_config('request.jwt.claim.sub',a,true);
-- Change it twice in the lobby; the last choice is the one that starts.
s:=public.hash3_command('choose_symbol',jsonb_build_object('code',c,'symbol',case chosen when 'X' then 'O' else 'X' end));
s:=public.hash3_command('choose_symbol',jsonb_build_object('code',c,'symbol',chosen));
s:=public.hash3_command('start',jsonb_build_object('code',c));
if s->'pairs'->0->>lower(chosen)<>a or s->'pairs'->0->>'turn'<>'X' then raise exception 'FAIL creator symbol or opening turn';end if;
select value into v from jsonb_array_elements(s->'players') where value->>'id'=a;
if v->>'symbol'<>chosen then raise exception 'FAIL player symbol disagrees with pair';end if;
perform set_config('request.jwt.claim.sub',s->'pairs'->0->>'x',true);
s:=public.hash3_command('move',jsonb_build_object('code',c,'x',0,'y',0,'requestId',gen_random_uuid()));
if s->'cells'->0->>'symbol'<>'X' or s->'pairs'->0->>'turn'<>'O' then raise exception 'FAIL correct first move';end if;
perform set_config('request.jwt.claim.sub',a,true);
denied:=false;begin perform public.hash3_command('choose_symbol',jsonb_build_object('code',c,'symbol','X'));exception when others then denied:=true;end;
if not denied then raise exception 'FAIL choice after start';end if;
end loop;
-- Teams remain balanced, with one X and one O in every pair.
s:=public.hash3_command('create','{"name":"Creator teams","kind":"duel","format":"teams","timeMode":"untimed","symbol":"O"}');c:=s->>'code';
for i in 2..4 loop perform set_config('request.jwt.claim.sub',current_setting('hash3.symbol_user_'||i),true);s:=public.hash3_command('join',jsonb_build_object('name','Player '||i,'code',c));end loop;
perform set_config('request.jwt.claim.sub',a,true);s:=public.hash3_command('start',jsonb_build_object('code',c));
select value into v from jsonb_array_elements(s->'players') where value->>'id'=a;
if v->>'symbol'<>'O' then raise exception 'FAIL team creator O';end if;
if (select count(*) from jsonb_array_elements(s->'players') where value->>'symbol'='X')<>2 then raise exception 'FAIL team balance';end if;
for v in select value from jsonb_array_elements(s->'pairs') loop
if v->>'turn'<>'X' or not exists(select 1 from jsonb_array_elements(s->'players') where value->>'id'=v->>'x' and value->>'symbol'='X') or not exists(select 1 from jsonb_array_elements(s->'players') where value->>'id'=v->>'o' and value->>'symbol'='O') then raise exception 'FAIL pair symbol links';end if;
end loop;
-- Invalid symbols and non-duel rooms cannot use the new choice endpoint.
denied:=false;begin perform public.hash3_command('create','{"name":"Invalid","kind":"duel","symbol":"Z"}');exception when others then denied:=true;end;
if not denied then raise exception 'FAIL invalid choice';end if;
s:=public.hash3_command('create','{"name":"World unchanged","kind":"world"}');c:=s->>'code';
denied:=false;begin perform public.hash3_command('choose_symbol',jsonb_build_object('code',c,'symbol','O'));exception when others then denied:=true;end;
if not denied then raise exception 'FAIL world choice';end if;
end;$$;
reset role;
rollback;
