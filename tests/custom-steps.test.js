'use strict';
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const customSteps=require('../custom-steps');

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'custom-steps-test-'));process.env.WORKFLOW_DATA_DIR=tmp;
const bin=path.join(tmp,'bin');fs.mkdirSync(bin);
const promptPath=path.join(tmp,'prompt.txt');process.env.OPEN_DEV_FLOW_TEST_PROMPT_PATH=promptPath;
// The fixture agent first writes an invalid draft, waits for the workspace rejection, then writes a valid definition.
fs.writeFileSync(path.join(bin,'codex'),`#!/bin/sh
printf '%s' "$1" > "$OPEN_DEV_FLOW_TEST_PROMPT_PATH"
out=$(printf '%s\\n' "$1" | awk 'f{print;exit} /to this exact path:/{f=1}')
echo "What should the step produce?"
printf '{"title":"Incomplete"}' > "$out"
IFS= read -r feedback
echo "agent-received: $feedback"
printf '%s' '{"title":"Migration safety check","description":"Check database migrations for backward compatibility.","role":"service","inputs":["discovery"],"requiresApproval":true,"skill":"# Check migrations\\n\\nReview each migration with the engineer."}' > "$out.tmp" && mv "$out.tmp" "$out"
IFS= read -r saved
echo "agent-saved: $saved"
`,{mode:0o755});
process.env.PATH=bin+path.delimiter+process.env.PATH;

// Seed one valid stored step and one invalid file before the server loads.
const storeDir=path.join(tmp,'custom-steps');fs.mkdirSync(storeDir,{recursive:true});
fs.writeFileSync(path.join(storeDir,'custom-release-notes.json'),JSON.stringify({id:'custom-release-notes',title:'Release notes',description:'Draft release notes.',role:'service',inputs:['implementation','custom-missing'],requiresApproval:false,skill:'# Release notes',created:'2026-01-01T00:00:00Z'}));
fs.writeFileSync(path.join(storeDir,'custom-broken.json'),'{not json');
const warnings=[];const originalWarn=console.warn;console.warn=message=>warnings.push(message);
const {server}=require('../server');
console.warn=originalWarn;
let base,token;
async function request(url,method='GET',body){const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json','x-workflow-token':token||''},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
async function eventually(check,label){for(let i=0;i<150;i++){const value=await check();if(value)return value;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out waiting for '+label);}
after(()=>{server.close();fs.rmSync(tmp,{recursive:true,force:true});});

test('definitions are validated and normalized',()=>{
 const options={roles:['service','api'],kinds:['discovery','plan','test-data']};
 const step=customSteps.normalizeDefinition({title:'  Schema   check ',description:'Checks.',role:'service',inputs:['discovery'],requiresApproval:true,skill:'# Do it'},options);
 assert.equal(step.title,'Schema check');assert.deepEqual(step.inputs,['discovery','plan','test-data']);
 assert.deepEqual(customSteps.normalizeDefinition({title:'T',description:'D',role:'api',skill:'S'},options).inputs,[]);
 for(const bad of [null,[],{title:'',description:'D',role:'api',skill:'S'},{title:'T',description:'D',role:'ui',skill:'S'},{title:'T',description:'D',role:'api',skill:' '},{title:'T',description:'D',role:'api',skill:'S',inputs:['unknown']},{title:'T',description:'D',role:'api',skill:'S',inputs:['plan','plan']},{title:'T',description:'D',role:'api',skill:'S',requiresApproval:'yes'},{title:'x'.repeat(81),description:'D',role:'api',skill:'S'}])assert.throws(()=>customSteps.normalizeDefinition(bad,options));
 assert.equal(customSteps.uniqueId('Release Notes!',new Set()),'custom-release-notes');
 assert.equal(customSteps.uniqueId('Release notes',new Set(['custom-release-notes'])),'custom-release-notes-2');
 assert.equal(customSteps.uniqueId('***',new Set()),'custom-step');
});

test('stored custom steps load at startup and invalid files are skipped',async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${server.address().port}`;
 const boot=(await request('/api/bootstrap')).data;token=boot.token;assert.equal(boot.customSteps,true);
 const stage=boot.stages.find(s=>s.id==='custom-release-notes');
 assert.ok(stage);assert.equal(stage.custom,true);assert.equal(stage.skill,undefined);assert.deepEqual(stage.artifacts,['implementation','custom-release-notes']);
 assert.ok(boot.kinds.includes('custom-release-notes'));assert.ok(warnings.some(w=>/custom-broken\.json/.test(w)));
 const listed=(await request('/api/custom-steps')).data;assert.deepEqual(listed.map(s=>s.id),['custom-release-notes']);
});

test('an agent interview refines and saves a custom step that can be used in workflows',async()=>{
 assert.equal((await request('/api/custom-steps/session','POST',{provider:'codex',request:'  '})).status,400);
 assert.equal((await request('/api/custom-steps/session','POST',{provider:'codex',request:'x'.repeat(4001)})).status,400);
 assert.equal((await request('/api/custom-steps/session','POST',{provider:'missing-agent',request:'Check migrations'})).status,400);
 const started=await request('/api/custom-steps/session','POST',{provider:'codex',request:'Check migrations are backward compatible'});
 assert.equal(started.status,200);assert.equal(started.data.status,'interviewing');
 assert.equal((await request('/api/custom-steps/session','POST',{provider:'codex',request:'Another'})).status,400);
 const prompt=await eventually(()=>fs.existsSync(promptPath)&&fs.readFileSync(promptPath,'utf8'),'prompt');
 assert.match(prompt,/Check migrations are backward compatible/);assert.match(prompt,/Ask focused clarifying questions/);assert.match(prompt,/explicitly confirms/);assert.match(prompt,/Respond to the engineer in English/);
 const saved=await eventually(async()=>{const s=(await request('/api/custom-steps/session')).data;return s?.status==='saved'&&s;},'saved step');
 assert.equal(saved.step.id,'custom-migration-safety-check');
 const stored=JSON.parse(fs.readFileSync(path.join(storeDir,'custom-migration-safety-check.json'),'utf8'));
 assert.equal(stored.request,'Check migrations are backward compatible');assert.equal(stored.provider,'codex');assert.deepEqual(stored.inputs,['discovery','plan','test-data']);
 await eventually(async()=>!(await request('/api/custom-steps/session')).data,'session exit');
 const log=fs.readdirSync(path.join(tmp,'custom-step-drafts'));assert.deepEqual(log,[],'draft folders are removed after the session');

 const boot=(await request('/api/bootstrap')).data;assert.ok(boot.approvalGatedStages.includes('custom-migration-safety-check'));
 assert.equal((await request('/api/changes','POST',{title:'Wrong order',workflow:['custom-migration-safety-check','planning']})).status,400);
 const created=await request('/api/changes','POST',{title:'Uses custom',workflow:['discovery','planning','custom-migration-safety-check']});assert.equal(created.status,200);
 const change=created.data.id;for(const role of ['discovery','service'])await request(`/api/changes/${change}/repos/${role}`,'PUT',{path:tmp});
 assert.equal((await request(`/api/changes/${change}/preview`,'POST',{stage:'custom-migration-safety-check'})).status,400);
 for(const [kind,content] of [['plan','Plan'],['test-data','Cases'],['discovery','Evidence']])await request(`/api/changes/${change}/artifacts/${kind}`,'PUT',{content});
 await request(`/api/changes/${change}/approve`,'POST',{approver:'Engineer'});
 const preview=await request(`/api/changes/${change}/preview`,'POST',{stage:'custom-migration-safety-check'});
 assert.equal(preview.status,200);assert.match(preview.data.skill,/Review each migration/);assert.deepEqual(preview.data.artifacts.map(a=>a.kind),['discovery','plan','test-data']);
 assert.equal((await request(`/api/changes/${change}/artifacts/custom-migration-safety-check`,'PUT',{content:'Result'})).status,200);
 assert.equal((await request(`/api/changes/${change}/stages/custom-migration-safety-check`,'PUT',{status:'skipped'})).status,200);

 const inUse=await request('/api/custom-steps/custom-migration-safety-check','DELETE');assert.equal(inUse.status,400);assert.match(inUse.data.error,/Uses custom/);
 const listed=(await request('/api/custom-steps')).data.find(s=>s.id==='custom-migration-safety-check');assert.deepEqual(listed.usage.initiatives,['Uses custom']);
});

test('unused custom steps can be removed',async()=>{
 assert.equal((await request('/api/custom-steps/custom-release-notes','DELETE')).status,200);
 assert.equal(fs.existsSync(path.join(storeDir,'custom-release-notes.json')),false);
 const boot=(await request('/api/bootstrap')).data;assert.equal(boot.stages.some(s=>s.id==='custom-release-notes'),false);assert.equal(boot.kinds.includes('custom-release-notes'),false);
 assert.equal((await request('/api/custom-steps/custom-release-notes','DELETE')).status,404);
});
