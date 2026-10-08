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
export async function profileAccess(action,payload={}){
 const {data:{session},error}=await client.auth.getSession();if(error)throw error;
 if(action!=='restore'&&!session)throw Error('No se pudo verificar tu acceso.');
 const response=await fetch(supabaseUrl+'/functions/v1/profile-link',{method:'POST',headers:{apikey:supabaseKey,'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.access_token}:{})},body:JSON.stringify({action,...payload}),signal:AbortSignal.timeout(15000),cache:'no-store'});
 const data=await response.json();
 if(!response.ok||data.error){const messages={INVALID_LINK:'El enlace no es válido o se ha renovado. Tu perfil actual se conserva.',LINK_EXISTS:'Ya tienes un enlace. Usa el guardado o pulsa Renovar enlace.',BAD_NAME:'Guarda antes un apodo de 2 a 18 caracteres.'};throw Error(messages[data.error]||'No se pudo acceder al perfil. Inténtalo de nuevo con conexión.');}
 return data;
}
