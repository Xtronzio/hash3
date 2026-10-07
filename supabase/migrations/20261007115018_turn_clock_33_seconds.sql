-- Only turn durations change. Presence checks, bot response latency, duel
-- duration, active deadlines and saved pause time remain intact.
DO $migration$
DECLARE f record; definition text; changed int:=0;
BEGIN
 FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='hash3_private' AND p.proname IN
 ('legacy_command','command','arm_pair','normalize_state','gateway_before_symbols')
 LOOP
  definition:=pg_get_functiondef(f.oid);
  IF f.proname='gateway_before_symbols' THEN
   definition:=replace(definition,'to_jsonb(now()+interval ''30 seconds'')) where code=c;',
                                  'to_jsonb(now()+interval ''33 seconds'')) where code=c;');
  ELSE
   definition:=replace(definition,'interval ''30 seconds''','interval ''33 seconds''');
   definition:=replace(definition,'''turnSeconds'',30','''turnSeconds'',33');
  END IF;
  IF f.proname='normalize_state' THEN
   IF position('end loop;end if;return s;' in definition)=0 THEN
    RAISE EXCEPTION 'Unexpected normalize_state layout; review clock migration';
   END IF;
   definition:=replace(definition,'end loop;end if;return s;',
    'end loop;end if;s:=jsonb_set(s,''{turnSeconds}'',case when s->>''timeMode''=''untimed'' then ''null''::jsonb else ''33''::jsonb end);return s;');
  END IF;
  EXECUTE definition; changed:=changed+1;
 END LOOP;
 IF changed<>5 THEN RAISE EXCEPTION 'Expected five clock functions, got %',changed;END IF;
END $migration$;

-- Publish the new turn duration without extending or replaying any current turn.
UPDATE hash3_private.rooms SET state=jsonb_set(jsonb_set(state,'{turnSeconds}',
 CASE WHEN state->>'timeMode'='untimed' THEN 'null'::jsonb ELSE '33'::jsonb END),
 '{version}',to_jsonb(coalesce((state->>'version')::int,0)+1))
 WHERE state->>'status' IN ('lobby','playing','paused');

-- Verify manual turns, expansion, untimed play, bots and pause invariants.
DO $verify$
DECLARE at_time timestamptz:='2026-10-07 12:00:00+00';
 s jsonb:='{"status":"playing","players":[{"id":"x","bot":false},{"id":"o","bot":true}],"pairs":[{"x":"x","o":"o","turn":"X","pending":0}]}';
 t jsonb;
BEGIN
 t:=hash3_private.arm_pair(s,0,at_time);
 ASSERT (t->'pairs'->0->>'deadline')::timestamptz=at_time+interval '33 seconds','Human clock must be 33 seconds';
 t:=hash3_private.arm_pair(jsonb_set(jsonb_set(s,'{pairs,0,pending}','1'),'{pairs,0,expander}','"x"'),0,at_time);
 ASSERT (t->'pairs'->0->>'deadline')::timestamptz=at_time+interval '33 seconds','Expansion clock must be 33 seconds';
 t:=hash3_private.arm_pair(s||'{"timeMode":"untimed"}',0,at_time);
 ASSERT t->'pairs'->0->>'deadline' IS NULL,'Untimed human must retain null deadline';
 t:=hash3_private.arm_pair(jsonb_set(s,'{pairs,0,turn}','"O"'),0,at_time);
 ASSERT (t->'pairs'->0->>'deadline')::timestamptz=at_time+interval '2 seconds','Bot response latency must remain two seconds';
 t:=hash3_private.arm_pair(s||'{"status":"paused"}',0,at_time);
 ASSERT t->'pairs'->0->>'deadline' IS NULL,'Paused clock must remain null';
END $verify$;
