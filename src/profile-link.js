const tokenPattern=/^h31_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_[A-Za-z0-9_-]{43}$/;
export const validProfileToken=value=>typeof value==='string'&&tokenPattern.test(value);
export function profileToken(input,base){
 try{const url=new URL(String(input).trim());const site=new URL(base);if(url.origin!==site.origin||url.pathname!==site.pathname||url.search)return null;const token=new URLSearchParams(url.hash.slice(1)).get('perfil');return validProfileToken(token)?token:null;}catch{return null;}
}
export function profileUrl(token,base){if(!validProfileToken(token))throw Error('Enlace no válido.');const url=new URL(base);url.search='';url.hash=new URLSearchParams({perfil:token}).toString();return url.href;}
export async function restoreProfile(client,result){
 if(!result?.user_id||typeof result.name!=='string'||result.name.length<2||result.name.length>18||!result.session?.access_token||!result.session?.refresh_token)throw Error('No se pudo verificar el perfil.');
 const {data:previous,error:readError}=await client.auth.getSession();if(readError)throw readError;
 try{
  const {data,error}=await client.auth.setSession(result.session);
  if(error||data?.user?.id!==result.user_id)throw error||Error('No se pudo verificar el perfil.');
  return data.user.id;
 }catch(error){if(previous.session)await client.auth.setSession({access_token:previous.session.access_token,refresh_token:previous.session.refresh_token});else await client.auth.signOut({scope:'local'});throw error;}
}
