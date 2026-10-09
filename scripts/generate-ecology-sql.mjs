import fs from 'node:fs/promises';
import {TERRITORY_EVENT_RULES,EVENT_BALANCE,NATURAL_EVENT_ROTATION,INVADER_EVENT_ROTATION} from '../src/territory-event-rules.js';
import {HABITAT_FREQUENCIES,HABITAT_WEIGHTS,HABITAT_REFERENCE,HABITAT_INTERVAL_REFERENCE} from '../src/habitat-budget.js';
import {TERRITORY_MIN_FIGURES} from '../src/territory-tools.js';
const config={rules:TERRITORY_EVENT_RULES,balance:EVENT_BALANCE,naturalRotation:NATURAL_EVENT_ROTATION,invaderRotation:INVADER_EVENT_ROTATION,minFigures:TERRITORY_MIN_FIGURES,frequencies:HABITAT_FREQUENCIES,weights:HABITAT_WEIGHTS,habitatReference:HABITAT_REFERENCE,intervalReference:HABITAT_INTERVAL_REFERENCE};
const template=await fs.readFile('supabase/territorio-vivo.template.sql','utf8');
const sql=template.replace('__CONFIG__',JSON.stringify(config).replaceAll("'","''")).replace('jsonb_object_length_placeholder','(select count(*) from jsonb_each(selected))').replace(/returns jsonb language plpgsql set search_path='' as \$\$\n(?!#variable_conflict)/g,()=>"returns jsonb language plpgsql set search_path='' as $$\n#variable_conflict use_column\n");
const path='supabase/migrations/20261009081642_territorio_vivo.sql';
if(process.argv.includes('--check')){
 if(await fs.readFile(path,'utf8')!==sql)throw Error('Regenerate SQL with node scripts/generate-ecology-sql.mjs');
}else await fs.writeFile(path,sql);
