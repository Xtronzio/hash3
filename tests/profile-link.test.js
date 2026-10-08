import test from 'node:test';
import assert from 'node:assert/strict';
import {handleProfileLink,digest,newToken} from '../supabase/functions/profile-link/handler.js';
import {profileToken,profileUrl,restoreProfile} from '../src/profile-link.js';
const id='12345678-1234-1234-1234-123456789abc',other='87654321-1234-1234-1234-123456789abc',site='https://xtronzio.github.io/hash3/';
function backend(){
 const owner={id,app_metadata:{another:'kept'},user_metadata:{}},session={access_token:'test-access',refresh_token:'test-refresh'};
 const admin={auth:{getUser:async jwt=>({data:{user:jwt==='verified-jwt'?owner:null}}),admin:{getUserById:async uid=>({data:{user:uid===id?owner:null}}),updateUserById:async(uid,changes)=>{assert.equal(uid,id);Object.assign(owner,changes);return {data:{user:owner}};},generateLink:async({email})=>{assert.equal(email,owner.email);return {data:{user:owner,properties:{hashed_token:'one-use-otp'}}};}}}};
 const login={auth:{verifyOtp:async value=>{assert.deepEqual(value,{token_hash:'one-use-otp',type:'email'});return {data:{user:owner,session}};}}};
 return {owner,admin,login,call:(body,jwt)=>handleProfileLink(body,jwt,admin,login)};
}
test('Enlace privado reutilizable restaura el UUID original y renovar invalida el anterior',async()=>{
 const b=backend();assert.equal((await b.call({action:'copy',name:'Jorge'})).status,401);
 const first=await b.call({action:'copy',name:'Jorge'},'verified-jwt');assert.ok(first.token);
 assert.equal(b.owner.app_metadata.another,'kept');assert.equal(b.owner.app_metadata.hash3_access.hash,await digest(first.token));assert.ok(!JSON.stringify(b.owner).includes(first.token));
 assert.equal((await b.call({action:'restore',token:first.token})).user_id,id);
 assert.equal((await b.call({action:'copy',name:'Jorge',token:first.token},'verified-jwt')).token,first.token);
 assert.equal((await b.call({action:'copy',name:'Jorge'},'verified-jwt')).error,'LINK_EXISTS');
 await b.call({action:'sync',name:'Nuevo apodo'},'verified-jwt');assert.equal((await b.call({action:'restore',token:first.token})).name,'Nuevo apodo');
 const second=await b.call({action:'renew',name:'Jorge'},'verified-jwt');assert.notEqual(first.token,second.token);
 assert.equal((await b.call({action:'restore',token:first.token})).error,'INVALID_LINK');assert.equal((await b.call({action:'restore',token:second.token})).user_id,id);
});
test('No autoriza metadatos editables ni tokens de otros perfiles y valida acciones y apodos',async()=>{
 const b=backend(),forged=newToken(id);b.owner.email=id+'@access.hash3.invalid';b.owner.user_metadata.hash3_access={hash:await digest(forged),name:'Falso'};
 assert.equal((await b.call({action:'restore',token:forged})).error,'INVALID_LINK');
 assert.equal((await b.call({action:'restore',token:newToken(other)})).error,'INVALID_LINK');
 assert.equal((await b.call({action:'renew',name:'Jorge'},'fake-jwt')).error,'AUTH_REQUIRED');
 assert.equal((await b.call({action:'copy',name:'x'},'verified-jwt')).error,'BAD_NAME');
 assert.equal((await b.call({action:'delete',name:'Jorge'},'verified-jwt')).error,'BAD_ACTION');
});
test('El parser exige origen y ruta de #3, mantiene el secreto en el fragmento y no admite URL ajena',()=>{
 const token=newToken(id),url=profileUrl(token,site+'?sala=OTHER');assert.equal(profileToken(url,site),token);assert.equal(new URL(url).search,'');
 for(const invalid of [url.replace('xtronzio.github.io','example.com'),url.replace('/hash3/','/DILEMA/'),url+'bad',site+'?perfil='+token,'javascript:alert(1)',token])assert.equal(profileToken(invalid,site),null);
});
test('La instalación fallida de sesión restaura el perfil anterior y valida antes de cambiarlo',async()=>{
 const prior={access_token:'old-access',refresh_token:'old-refresh'},calls=[];
 const client={auth:{getSession:async()=>({data:{session:prior}}),setSession:async s=>{calls.push(s);return s===prior?{data:{user:{id:other}}}:{data:{user:{id:other}}};},signOut:async()=>{throw Error('No debía cerrar el perfil anterior');}}};
 await assert.rejects(()=>restoreProfile(client,{user_id:id,name:'Jorge',session:{access_token:'new-access',refresh_token:'new-refresh'}}));assert.deepEqual(calls[1],prior);
 calls.length=0;await assert.rejects(()=>restoreProfile(client,{}));assert.equal(calls.length,0);
});
