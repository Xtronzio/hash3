-- Keep discovery, ranking and recoverable removal on the existing session route.
create or replace function public.hash3_command(action text,payload jsonb default '{}'::jsonb)
returns jsonb language sql set search_path='' as $$ select hash3_private.session_gateway(action,payload); $$;
