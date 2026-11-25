'use strict';
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const run=promisify(execFile);
const names=['appointment-availability-diagnosis','atlassian-version-creation','auto-review-pr','claude-technical-note-writer','code-review','confluence-writer','graphify-layers','source-cited-investigation','technical-note-writer'];
const exists=p=>{try{return fs.statSync(p).isFile()}catch{return false}};
function cacheSkills(home,agent){const base=path.join(home,agent==='codex'?'.codex/plugins/cache':'.claude/plugins/cache','bfi-ai-agents','bfi-agent-skills');try{return fs.readdirSync(base).map(v=>path.join(base,v,'skills'))}catch{return []}}
async function check(agent){
 if(!['codex','claude','opencode'].includes(agent)) throw Error('Unknown agent');
 const home=os.homedir(); let cli=true;try{await run('which',[agent],{timeout:3000})}catch{cli=false}
 let mcp={status:'unknown',detail:cli?'Could not verify Atlassian MCP. Check the agent configuration and authentication.':'Install the agent CLI to check its MCP configuration.'};
 if(cli)try{
  const {stdout}=await run(agent,agent==='codex'?['mcp','list','--json']:['mcp','list'],{timeout:10000,maxBuffer:1024*1024});
  if(agent==='codex'){const servers=JSON.parse(stdout);const match=servers.find(s=>/atlassian/i.test(s.name));mcp=match?{status:match.enabled?'configured':'missing',detail:match.enabled?'Atlassian MCP is configured and enabled. Connection and authentication were not tested.':'Atlassian MCP is configured but disabled.'}:{status:'missing',detail:'No Atlassian MCP server was found in the agent configuration.'}}
  else {const line=stdout.split('\n').find(s=>/atlassian/i.test(s));mcp=line?{status:/connected/i.test(line)&&!/not connected|disconnected/i.test(line)?'connected':'configured',detail:/connected/i.test(line)&&!/not connected|disconnected/i.test(line)?'Atlassian MCP reports a connection.':'Atlassian MCP appears in the agent list; connection and authentication may need attention.'}:{status:'missing',detail:'No Atlassian MCP server was found in the agent list.'}}
 }catch{}
 const dirs=agent==='codex'?[path.join(home,'.codex/skills'),path.join(home,'.agents/skills'),...cacheSkills(home,agent)]:agent==='claude'?[path.join(home,'.claude/skills'),...cacheSkills(home,agent)]:[path.join(home,'.config/opencode/skills'),path.join(home,'.agents/skills'),path.join(home,'.claude/skills')];
 const skills=names.map(name=>({name,found:dirs.some(dir=>exists(path.join(dir,name,'SKILL.md')))}));
 return {agent,cli,mcp,skills};
}
module.exports={check};
