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
// The recovery endpoint works without a pre-existing session. In particular
// never refresh a stale/failed anonymous session before importing a link.
export async function profileAccess(action,payload={}){
 let session=null;
 if(action!=='restore'){
  const {data,error}=await client.auth.getSession();
  if(error)throw Error('No se pudo verificar tu sesión. Comprueba tu conexión e inténtalo otra vez.');
  session=data?.session;
  if(!session)throw Error('No hay sesión online. Prueba a entrar en Mundo o Duelo y vuelve a Perfil.');
 }
 let response;
 try{
  response=await fetch(supabaseUrl+'/functions/v1/profile-link',{
   method:'POST',
   headers:{apikey:supabaseKey,'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.access_token}:{})},
   body:JSON.stringify({action,...payload}),
   signal:AbortSignal.timeout(15000),
   cache:'no-store'
  });
 }catch(error){
  if(error?.name==='TimeoutError'||error?.name==='AbortError')throw Error('Supabase no ha respondido. Conservamos tu perfil; vuelve a probar cuando haya conexión.');
  throw Error('No se pudo conectar con Supabase. Comprueba la conexión y reinténtalo.');
 }
 let data;
 try{data=await response.json();}catch{throw Error('Supabase ha devuelto una respuesta inesperada. Inténtalo más tarde.');}
 if(!response.ok||data?.error){
  const messages={
   INVALID_LINK:'El enlace ha caducado, es incorrecto o ha sido renovado. Tu perfil actual no cambia.',
   LINK_EXISTS:'Ya existe un enlace para este perfil pero no está guardado en este navegador. Puedes renovarlo para generar otro (el anterior dejará de funcionar).',
   BAD_NAME:'Escribe un apodo de 2 a 18 caracteres.',
   AUTH_REQUIRED:'Tu sesión ha caducado. Recupera primero tu acceso o vuelve a iniciar sesión.',
   UNAVAILABLE:'El servidor de perfiles no está disponible. No se ha modificado tu acceso.',
   NOT_ALLOWED:'Esta dirección no está autorizada para recuperar perfiles.'
  };
  if(response.status===504||response.status===502||response.status===503)throw Error('Supabase está tardando o no responde (error '+response.status+'). No se ha modificado tu perfil.');
  throw Error(messages[data?.error]||'No se pudo acceder a tu perfil (error '+response.status+').');
 }
 return data;
}
