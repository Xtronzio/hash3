const TOKEN=/^h31_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_([A-Za-z0-9_-]{43})$/;
const NAME=value=>typeof value==='string'&&value.trim().length>=2&&value.trim().length<=18;
export async function digest(token){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');}
export function newToken(id){const bytes=crypto.getRandomValues(new Uint8Array(32));return `h31_${id}_`+btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export async function handleProfileLink(body,bearer,admin,login){
 if(body.action==='restore'){
  const match=typeof body.token==='string'&&body.token.match(TOKEN);
  if(!match)return {status:403,error:'INVALID_LINK'};
  const {data,error}=await admin.auth.admin.getUserById(match[1]);
  const user=data?.user,record=user?.app_metadata?.hash3_access;
  if(error||!user?.email||!record?.hash||await digest(body.token)!==record.hash)return {status:403,error:'INVALID_LINK'};
  const {data:magic,error:magicError}=await admin.auth.admin.generateLink({type:'magiclink',email:user.email});
  if(magicError||magic?.user?.id!==user.id||!magic.properties?.hashed_token)return {status:503,error:'UNAVAILABLE'};
  const {data:verified,error:verifyError}=await login.auth.verifyOtp({token_hash:magic.properties.hashed_token,type:'email'});
  if(verifyError||!verified?.session||verified.user?.id!==user.id)return {status:503,error:'UNAVAILABLE'};
  return {user_id:user.id,name:record.name,session:{access_token:verified.session.access_token,refresh_token:verified.session.refresh_token}};
 }
 if(!bearer)return {status:401,error:'AUTH_REQUIRED'};
 const {data,error}=await admin.auth.getUser(bearer);const owner=data?.user;
 if(error||!owner)return {status:401,error:'AUTH_REQUIRED'};
 if(!['copy','renew','sync'].includes(body.action))return {status:400,error:'BAD_ACTION'};
 if(!NAME(body.name))return {status:400,error:'BAD_NAME'};
 // Read only server-owned app_metadata. User-editable metadata never authorizes recovery.
 const {data:fresh,error:readError}=await admin.auth.admin.getUserById(owner.id);
 if(readError||!fresh?.user)return {status:503,error:'UNAVAILABLE'};
 const record=fresh.user.app_metadata?.hash3_access;
 if(body.action==='sync'&&!record?.hash)return {ok:true};
 let token;
 if(body.action!=='sync'){
  const candidate=typeof body.token==='string'&&body.token.match(TOKEN);
  const valid=candidate?.[1]===owner.id&&record?.hash===await digest(body.token);
  if(body.action==='copy'&&record?.hash&&!valid)return {status:409,error:'LINK_EXISTS'};
  token=body.action==='copy'&&valid?body.token:newToken(owner.id);
 }
 const hash=token?await digest(token):record.hash;
 const changes={app_metadata:{...fresh.user.app_metadata,hash3_access:{hash,name:body.name.trim()}}};
 if(!fresh.user.email)Object.assign(changes,{email:owner.id+'@access.hash3.invalid',email_confirm:true});
 const {error:writeError}=await admin.auth.admin.updateUserById(owner.id,changes);
 return writeError?{status:503,error:'UNAVAILABLE'}:token?{token}:{ok:true};
}
