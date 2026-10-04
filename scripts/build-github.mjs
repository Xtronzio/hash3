import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
// Build the public /hash3/ path separately from Sites' root-path deployment.
execFileSync('npm',['run','build'],{stdio:'inherit',env:{...process.env,HASH3_BASE_PATH:'/hash3/'}});
fs.rmSync('docs',{recursive:true,force:true});fs.cpSync('dist','docs',{recursive:true});fs.writeFileSync('docs/.nojekyll','');
// Leave the normal root-path output ready for the existing hosted Site.
execFileSync('npm',['run','build'],{stdio:'inherit'});
