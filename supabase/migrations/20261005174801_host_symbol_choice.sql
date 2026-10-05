-- Preserve the existing gateway and the same public RPC and permissions.
alter function hash3_private.gateway(text,jsonb) rename to gateway_before_symbols;
revoke all on function hash3_private.gateway_before_symbols(text,jsonb) from public,anon,authenticated;

create function hash3_private.apply_host_symbol(s jsonb, chosen text)
returns jsonb language plpgsql set search_path='' as $$
declare owner jsonb;p jsonb;v jsonb;pi int;ai int;xid text;oid text;
begin
if chosen not in ('X','O') or chosen is null then return s;end if;
select value into owner from jsonb_array_elements(s->'players') where value->>'id'=s->>'host';
if owner is null or owner->>'pair' is null then raise exception 'No se ha podido asignar el símbolo del creador.';end if;
if owner->>'symbol'=chosen then return s;end if;
pi:=(owner->>'pair')::int;p:=s->'pairs'->pi;xid:=p->>'x';oid:=p->>'o';
if xid is null or oid is null then raise exception 'El duelo necesita dos rivales por pareja.';end if;
-- Swap only the creator's pair. Each pair and each team stays balanced.
p:=p||jsonb_build_object('x',oid,'o',xid);s:=jsonb_set(s,array['pairs',pi::text],p);
for v,ai in select value,(ordinality-1)::int from jsonb_array_elements(s->'players') with ordinality loop
if v->>'id'=xid then s:=jsonb_set(s,array['players',ai::text],v||jsonb_build_object('symbol','O'));
elsif v->>'id'=oid then s:=jsonb_set(s,array['players',ai::text],v||jsonb_build_object('symbol','X'));end if;
end loop;
return s;
end;$$;
revoke all on function hash3_private.apply_host_symbol(jsonb,text) from public,anon,authenticated;

create function hash3_private.gateway(action text,payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();r hash3_private.rooms%rowtype;s jsonb;changed jsonb;chosen text:=payload->>'symbol';
begin
if uid is null then raise exception 'Entra como invitado para continuar.' using errcode='28000';end if;
if (action='choose_symbol' or (action='create' and payload ? 'symbol')) and (chosen is null or chosen not in ('X','O')) then raise exception 'Elige X u O.';end if;
if action='choose_symbol' then
select * into r from hash3_private.rooms where code=upper(btrim(payload->>'code')) for update;
if r.id is null then raise exception 'No existe una sala con ese código.';end if;
if r.host_uid<>uid then raise exception 'El símbolo lo elige quien crea el duelo.' using errcode='42501';end if;
if r.state->>'kind' is distinct from 'duel' or r.state->>'status' is distinct from 'lobby' then raise exception 'Elige el símbolo antes de empezar el duelo.';end if;
s:=r.state||jsonb_build_object('hostSymbol',chosen,'version',(r.state->>'version')::int+1);
update hash3_private.rooms set state=s,updated_at=now() where id=r.id;
return hash3_private.player_view(s,uid::text);
end if;
-- Existing authorization, joining, clocks, world pairing and scoring still run.
s:=hash3_private.gateway_before_symbols(action,payload);
if action='create' and s->>'kind'='duel' and chosen is not null then
s:=s||jsonb_build_object('hostSymbol',chosen);
update hash3_private.rooms set state=s where id=(s->>'id')::uuid;
elsif action='start' and s->>'kind'='duel' then
select * into r from hash3_private.rooms where id=(s->>'id')::uuid for update;
s:=r.state;changed:=hash3_private.apply_host_symbol(s,s->>'hostSymbol');
if changed is distinct from s then
s:=changed||jsonb_build_object('version',(s->>'version')::int+1);
update hash3_private.rooms set state=s,updated_at=now() where id=r.id;
end if;
end if;
return s;
end;$$;
revoke all on function hash3_private.gateway(text,jsonb) from public,anon;
grant execute on function hash3_private.gateway(text,jsonb) to authenticated;
create or replace function public.hash3_command(action text,payload jsonb default '{}'::jsonb)
returns jsonb language sql set search_path='' as $$ select hash3_private.hydrate_result(hash3_private.gateway(action,payload)); $$;
