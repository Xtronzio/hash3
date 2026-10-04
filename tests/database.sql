-- Integration tests execute as the real authenticated role and roll back all fixtures.
begin;
insert into auth.users(id,aud,role,is_anonymous) values
 ('11111111-1111-4111-8111-111111111111','authenticated','authenticated',true),
 ('22222222-2222-4222-8222-222222222222','authenticated','authenticated',true),
 ('33333333-3333-4333-8333-333333333333','authenticated','authenticated',true);
set local role authenticated;
do $$
declare
  a text:='11111111-1111-4111-8111-111111111111';
  b text:='22222222-2222-4222-8222-222222222222';
  outsider text:='33333333-3333-4333-8333-333333333333';
  s jsonb; same jsonb; code text; xp text; op text; bx int; block_y int; round_n int; n int; denied boolean;
  request_id text; xy jsonb; choice jsonb; move_id text;
begin
  perform set_config('request.jwt.claim.sub',a,true);
  s:=public.hash3_command('create','{"name":"Test X"}');code:=s->>'code';
  -- An outsider cannot read or finish a known room.
  perform set_config('request.jwt.claim.sub',outsider,true);denied:=false;
  begin perform public.hash3_command('get',jsonb_build_object('code',code)); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'FAIL outsider read'; end if;
  perform set_config('request.jwt.claim.sub',b,true);
  s:=public.hash3_command('join',jsonb_build_object('code',code,'name','Test O'));
  denied:=false;
  begin perform public.hash3_command('start',jsonb_build_object('code',code)); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'FAIL non-host start'; end if;
  perform set_config('request.jwt.claim.sub',a,true);
  s:=public.hash3_command('start',jsonb_build_object('code',code));
  xp:=s->'pairs'->0->>'x';op:=s->'pairs'->0->>'o';
  for round_n in 1..3 loop
    bx:=(s->'pairs'->0->'active'->>'x')::int;block_y:=(s->'pairs'->0->'active'->>'y')::int;
    if s->'pairs'->0->>'turn'='O' then
      perform set_config('request.jwt.claim.sub',op,true);
      s:=public.hash3_command('move',jsonb_build_object('code',code,'x',bx*3+2,'y',block_y*3+1,'requestId',gen_random_uuid()));
    end if;
    for n in 0..2 loop
      perform set_config('request.jwt.claim.sub',xp,true);
      request_id:=gen_random_uuid()::text;
      s:=public.hash3_command('move',jsonb_build_object('code',code,'x',bx*3+n,'y',block_y*3,'requestId',request_id));
      same:=public.hash3_command('move',jsonb_build_object('code',code,'x',bx*3+n,'y',block_y*3,'requestId',request_id));
      if same<>s then raise exception 'FAIL idempotent move'; end if;
      -- Playing again out of turn must fail.
      denied:=false;
      begin perform public.hash3_command('move',jsonb_build_object('code',code,'x',bx*3+n,'y',block_y*3+2,'requestId',gen_random_uuid())); exception when others then denied:=true; end;
      if not denied then raise exception 'FAIL out-of-turn move'; end if;
      if n<2 and s->'pairs'->0->>'turn'='O' then
        perform set_config('request.jwt.claim.sub',op,true);
        s:=public.hash3_command('move',jsonb_build_object('code',code,'x',bx*3+n,'y',block_y*3+case n when 1 then 2 else 1 end,'requestId',gen_random_uuid()));
      end if;
    end loop;
    perform set_config('request.jwt.claim.sub',xp,true);
    if (s->'pairs'->0->>'pending')::int<>1 then raise exception 'FAIL expansion after figure: %',s; end if;
    denied:=false;
    begin perform public.hash3_command('expand',jsonb_build_object('code',code,'x',999,'y',999)); exception when others then denied:=true; end;
    if not denied then raise exception 'FAIL remote expansion'; end if;
    s:=public.hash3_command('expand',jsonb_build_object('code',code,'x',bx,'y',block_y+1));
  end loop;
  select v into same from jsonb_array_elements(s->'players') v where v->>'id'=xp;
  if (same->>'score')::int<>12 or (same->>'figures')::int<>3 then raise exception 'FAIL score/bonus: %',same; end if;
  same:=public.hash3_command('get',jsonb_build_object('code',code,'version',s->'version'));
  if same->>'not_modified'<>'true' then raise exception 'FAIL version polling'; end if;
  -- The private tables cannot be altered directly by a player.
  denied:=false;
  begin update hash3_private.rooms set state='{}'; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'FAIL table write permissions'; end if;
  perform set_config('request.jwt.claim.sub',a,true);
  s:=public.hash3_command('finish',jsonb_build_object('code',code));
  if s->>'status'<>'finished' then raise exception 'FAIL finishing'; end if;
  -- A full block without a figure awards continuation, not points.
  s:=public.hash3_command('create','{"name":"Draw X"}');code:=s->>'code';
  perform set_config('request.jwt.claim.sub',b,true);
  s:=public.hash3_command('join',jsonb_build_object('code',code,'name','Draw O'));
  perform set_config('request.jwt.claim.sub',a,true);
  s:=public.hash3_command('start',jsonb_build_object('code',code));
  xp:=s->'pairs'->0->>'x';op:=s->'pairs'->0->>'o';
  for xy in select value from jsonb_array_elements('[[0,0],[1,0],[2,0],[1,1],[0,1],[2,1],[1,2],[0,2],[2,2]]'::jsonb) loop
    perform set_config('request.jwt.claim.sub',case when s->'pairs'->0->>'turn'='X' then xp else op end,true);
    s:=public.hash3_command('move',jsonb_build_object('code',code,'x',xy->>0,'y',xy->>1,'requestId',gen_random_uuid()));
  end loop;
  if jsonb_array_length(s->'lines')<>0 or (s->'pairs'->0->>'pending')::int<>1 then raise exception 'FAIL draw continuation'; end if;
  if exists(select 1 from jsonb_array_elements(s->'players') v where (v->>'score')::int<>0) then raise exception 'FAIL draw points'; end if;
  perform set_config('request.jwt.claim.sub',xp,true);
  s:=public.hash3_command('expand',jsonb_build_object('code',code,'x',1,'y',0));
  if jsonb_array_length(s->'blocks')<>2 then raise exception 'FAIL draw expansion'; end if;
end;
$$;
reset role;
rollback;
