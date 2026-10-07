DO $migration$
declare definition text;needle text:=$text$select v into xy from jsonb_array_elements(hash3_private.expansion_options(s->'terrain',(p->'active'->>'x')::int,(p->'active'->>'y')::int)) v order by random() limit 1;$text$;
begin
select pg_get_functiondef('hash3_private.advance_state(jsonb,timestamptz)'::regprocedure) into definition;
if position(needle in definition)=0 then raise exception 'Unexpected expansion selection layout';end if;
definition:=replace(definition,needle,$text$select v into xy from jsonb_array_elements(hash3_private.expansion_options(s->'terrain',(p->'active'->>'x')::int,(p->'active'->>'y')::int)) v where not exists(select 1 from generate_series(0,2) dx(n) cross join generate_series(0,2) dy(n) where hash3_private.habitat_reserved(s,(v->>'x')::int+dx.n,(v->>'y')::int+dy.n)) order by random() limit 1;$text$);
execute definition;
end $migration$;
