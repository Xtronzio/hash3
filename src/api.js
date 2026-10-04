import {createClient} from '@supabase/supabase-js';
import {supabaseUrl, supabaseKey} from './config.js';
export const client = createClient(supabaseUrl, supabaseKey);
export async function ensurePlayer() {
  const {data: {session}, error: sessionError} = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (session) return session.user.id;
  const {data, error} = await client.auth.signInAnonymously();
  if (error) throw error;
  return data.user.id;
}
export async function command(action, payload = {}) {
  const {data, error} = await client.rpc('hash3_command', {action, payload}).abortSignal(AbortSignal.timeout(12000));
  if (error) throw error;
  return data;
}
