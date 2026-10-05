begin;
insert into auth.users(id,aud,role,is_anonymous) values
('a1111111-1111-4111-8111-111111111111','authenticated','authenticated',true),
('a2222222-2222-4222-8222-222222222222','authenticated','authenticated',true),
('a3333333-3333-4333-8333-333333333333','authenticated','authenticated',true);
set local role authenticated;
do $$ declare a text:='a1111111-1111-4111-8111-111111111111';b text:='a2222222-2222-4222-8222-222222222222';z text:='a3333333-3333-4333-8333-333333333333';l jsonb;s jsonb;t jsonb;p jsonb;o jsonb;code text;wc text;pi int;denied boolean;before_actions int;rid text;
begin
perform set_config('request.jwt.claim.sub',a,true);l:=public.hash3_command('pair_create','{"name":"Pair QA A"}');code:=l->>'code';
if not (l->>'pairLobby')::boolean or (l->>'ready')::boolean then raise exception 'FAIL waiting lobby';end if;
-- start alone is forbidden
 denied:=false;begin perform public.hash3_command('pair_start',jsonb_build_object('code',code));exception when others then denied:=true;end;if not denied then raise exception 'FAIL lone start';end if;
perform set_config('request.jwt.claim.sub',b,true);l:=public.hash3_command('pair_join',jsonb_build_object('code',code,'name','Pair QA B'));
if not (l->>'ready')::boolean then raise exception 'FAIL ready';end if;
 denied:=false;begin perform public.hash3_command('pair_start',jsonb_build_object('code',code));exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'FAIL guest start';end if;
perform set_config('request.jwt.claim.sub',z,true);
 denied:=false;begin perform public.hash3_command('pair_get',jsonb_build_object('code',code));exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'FAIL unauthorized lobby';end if;
 denied:=false;begin perform public.hash3_command('pair_join',jsonb_build_object('code',code,'name','Pair QA C'));exception when others then denied:=true;end;if not denied then raise exception 'FAIL third member';end if;
perform set_config('request.jwt.claim.sub',a,true);s:=public.hash3_command('pair_start',jsonb_build_object('code',code));wc:=s->>'code';
select (v->>'pair')::int into pi from jsonb_array_elements(s->'players') v where v->>'id'=a;p:=s->'pairs'->pi;
if not (p->>'x'=a and p->>'o'=b or p->>'x'=b and p->>'o'=a) then raise exception 'FAIL pair not together';end if;
if (p->>'deadline')::timestamptz<now()+interval '29 seconds' then raise exception 'FAIL shared fresh clock';end if;
t:=public.hash3_command('pair_start',jsonb_build_object('code',code));if jsonb_array_length(t->'pairs')<>jsonb_array_length(s->'pairs') then raise exception 'FAIL repeat start';end if;
perform set_config('request.jwt.claim.sub',b,true);t:=public.hash3_command('pair_get',jsonb_build_object('code',code));if t->>'id'<>s->>'id' then raise exception 'FAIL guest world';end if;
-- first authoritative move obtains MAX and repeating it cannot add an action
perform set_config('request.jwt.claim.sub',p->>'x',true);rid:=gen_random_uuid()::text;
s:=public.hash3_command('move',jsonb_build_object('code',wc,'x',(p->'active'->>'x')::int,'y',(p->'active'->>'y')::int,'requestId',rid));
select v into o from jsonb_array_elements(s->'players') v where v->>'id'=p->>'x';
if (o->'max'->>'actions')::int<>1 then raise exception 'FAIL max action recorded';end if;
t:=public.hash3_command('move',jsonb_build_object('code',wc,'x',(p->'active'->>'x')::int,'y',(p->'active'->>'y')::int,'requestId',rid));
select v into o from jsonb_array_elements(t->'players') v where v->>'id'=p->>'x';
if (o->'max'->>'actions')::int<>1 then raise exception 'FAIL duplicate max action';end if;
end $$;
rollback;
