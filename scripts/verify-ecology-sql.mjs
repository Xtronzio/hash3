// Disposable PostgreSQL fixtures. No network, live users, or live rooms.
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

export async function ecologyDatabase(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key,aud text,role text,is_anonymous boolean);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
 create schema cron; create function cron.schedule(text,text,text) returns bigint language sql as $$ select 1::bigint $$;`);
 const files=[
  'supabase/schema.sql',
  'supabase/migrations/20261004155901_persistent_world.sql',
  'supabase/migrations/20261004161426_fix_world_expansion.sql',
  'supabase/migrations/20261004161646_preserve_world_deadlines.sql',
  'supabase/migrations/20261004170617_scoring_levels.sql',
  'supabase/migrations/20261004170821_scoring_levels_clock.sql',
  'supabase/common-world.sql','supabase/pair-lobby-max.sql',
  'supabase/session-management.sql','supabase/session-removal.sql',
  'supabase/migrations/20261005174801_host_symbol_choice.sql',
  'supabase/migrations/20261005175257_preserve_session_gateway.sql',
  'supabase/migrations/20261006171644_rodents_and_combo_records.sql',
  'supabase/migrations/20261006172126_optimize_rodent_search.sql',
  'supabase/migrations/20261006182139_fix_world_entry_terrain_performance.sql',
  'supabase/migrations/20261007115018_turn_clock_33_seconds.sql',
  'supabase/migrations/20261007132144_personal_metrics.sql',
  'supabase/migrations/20261007213210_board_inhabitants_33_66_99.sql',
  'supabase/migrations/20261007213852_protect_habitat_automatic_expansions.sql',
  'supabase/migrations/20261008082437_turn_rodents_neutral_hash.sql',
  'supabase/migrations/20261009081642_territorio_vivo.sql'
 ];
 for(const file of files){
  const sql=(await fs.readFile(file,'utf8')).replace('create extension if not exists pg_cron;','');
  try{await db.exec(sql);}catch(e){await db.close();throw new Error(file+': '+e.message);}
 }
 return db;
}
if(process.argv[1]?.endsWith('verify-ecology-sql.mjs')){
 const db=await ecologyDatabase();
 try{
  await db.exec(await fs.readFile('supabase/migrations/20261009081642_territorio_vivo.sql','utf8'));
  console.log('PASS migration reapplied without drift');
  for(const file of ['tests/database.sql','tests/territory-live.sql']){
   try{await db.exec(await fs.readFile(file,'utf8'));console.log('PASS '+file);}catch(e){console.error(file+': '+e.message+'\n'+(e.where||''));process.exitCode=1;break;}
  }
 }finally{await db.close();}
}
