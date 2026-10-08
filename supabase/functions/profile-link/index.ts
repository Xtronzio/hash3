import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {handleProfileLink} from './handler.js';
const origin='https://xtronzio.github.io';
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':origin,'access-control-allow-headers':'authorization, apikey, content-type, x-client-info','access-control-allow-methods':'POST, OPTIONS','vary':'Origin'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return reply({error:'NOT_ALLOWED'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'METHOD'},405);
 try{
  const raw=await req.text();if(raw.length>4096)return reply({error:'TOO_LARGE'},413);
  const body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=='object')return reply({error:'BAD_BODY'},400);
  const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const options={auth:{persistSession:false,autoRefreshToken:false}};
  // Recovery authenticates with the private 256-bit link; every other action verifies the user's JWT.
  const result=await handleProfileLink(body,req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1],createClient(url,key,options),createClient(url,key,options));
  const {status=200,...value}=result;return reply(value,status);
 }catch{return reply({error:'UNAVAILABLE'},503);}
});
