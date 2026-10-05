create unique index if not exists hash3_one_common_world on hash3_private.rooms ((state->>'commonWorld')) where state->>'commonWorld'='true';
create or replace function hash3_private.gateway(action text,payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare s jsonb; c text; rid uuid;
begin
if auth.uid() is null then raise exception 'Entra como invitado para continuar.' using errcode='28000';end if;
if action='world' then
perform pg_advisory_xact_lock(8303109);
select code into c from hash3_private.rooms where state->>'commonWorld'='true';
if c is null then
s:=hash3_private.command('create',payload||jsonb_build_object('kind','world','level','normal'));
c:=s->>'code';rid:=(s->>'id')::uuid;
update hash3_private.rooms set state=state||'{"commonWorld":true}'::jsonb where id=rid;
s:=hash3_private.command('start',jsonb_build_object('code',c));
if payload->>'preference'='new' then s:=hash3_private.command('reserve',jsonb_build_object('code',c));end if;
else
s:=hash3_private.command('join',payload||jsonb_build_object('code',c));
end if;
return s;
end if;
if action='finish' and exists(select 1 from hash3_private.rooms where code=upper(btrim(payload->>'code')) and state->>'commonWorld'='true') then
raise exception 'Mundo es común y no puede cerrarse por un jugador.' using errcode='42501';
end if;
return hash3_private.command(action,payload);
end;$$;
revoke all on function hash3_private.gateway(text,jsonb) from public,anon;
grant execute on function hash3_private.gateway(text,jsonb) to authenticated;
revoke all on function hash3_private.command(text,jsonb) from public,anon,authenticated;
create or replace function public.hash3_command(action text,payload jsonb default '{}'::jsonb)
returns jsonb language sql set search_path='' as $$ select hash3_private.gateway(action,payload); $$;
revoke all on function public.hash3_command(text,jsonb) from public,anon;
grant execute on function public.hash3_command(text,jsonb) to authenticated;
