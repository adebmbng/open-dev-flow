'use strict';
const $=s=>document.querySelector(s);
const roleLabels={discovery:'Service discovery checkout',service:'Service checkout',api:'API automation checkout',ui:'UI automation checkout'};
const requestInput=$('#custom-request'),agentSelect=$('#custom-agent'),startButton=$('#custom-start'),stopButton=$('#custom-stop'),statusLine=$('#custom-status'),terminalBox=$('#custom-terminal'),list=$('#custom-list');
let token,socket,sessionId=null,term,fit;

function setStatus(text,kind){statusLine.textContent=text;statusLine.className=kind||'';}
async function api(url,method='GET',body){const r=await fetch(url,{method,headers:{'Content-Type':'application/json','x-workflow-token':token||''},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');return d;}
function el(tag,props={},...children){const node=document.createElement(tag);Object.assign(node,props);node.append(...children);return node;}

function ensureTerminal(){
 if(term)return;
 terminalBox.hidden=false;
 term=new Terminal({cursorBlink:true,fontFamily:'Menlo, monospace',fontSize:12,theme:{background:'#142a33',foreground:'#dbe9e9'}});
 fit=new FitAddon.FitAddon();term.loadAddon(fit);term.open(terminalBox);fit.fit();
 term.onData(data=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'input',data}))});
 window.addEventListener('resize',resize);
}
function resize(){if(!fit||terminalBox.hidden)return;fit.fit();if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'resize',cols:term.cols,rows:term.rows}));}
function idle(){sessionId=null;startButton.disabled=false;stopButton.disabled=true;requestInput.disabled=false;agentSelect.disabled=false;}

function attach(session){
 if(socket)socket.close();
 ensureTerminal();term.reset();sessionId=session.id;
 startButton.disabled=true;stopButton.disabled=false;requestInput.disabled=true;agentSelect.disabled=true;
 if(session.request&&!requestInput.value)requestInput.value=session.request;
 agentSelect.value=session.provider;
 setStatus(session.status==='saved'&&session.step?`Saved “${session.step.title}”. You can keep chatting or stop the session.`:'Connecting to '+session.provider+'…',session.status==='saved'?'success':'');
 const ws=new WebSocket(`ws://${location.host}/?id=${encodeURIComponent(session.id)}&token=${encodeURIComponent(token)}`);socket=ws;
 ws.onopen=()=>{if(socket!==ws)return;if(session.status!=='saved')setStatus('Answer the agent’s questions in the terminal. It saves the step after you confirm the final draft.');resize();term.focus();};
 ws.onmessage=e=>{if(socket!==ws)return;const m=JSON.parse(e.data);
  if(m.type==='output')term.write(m.data);
  if(m.type==='custom-step-saved'){setStatus(`Saved “${m.step.title}”. It is now available under Add workflow step.`,'success');loadSteps();}
  if(m.type==='custom-step-rejected')setStatus('The agent’s draft was rejected: '+m.error+' The agent has been asked to fix it.','error');
  if(m.type==='exit'){idle();setStatus(m.step?`Session ended. “${m.step.title}” is saved.`:`Session ended (exit ${m.code}) without saving a step.`,m.step?'success':'');loadSteps();}
 };
 ws.onclose=async()=>{if(socket!==ws||!sessionId)return;try{const active=await api('/api/custom-steps/session');if(!active){idle();setStatus('Session ended.');loadSteps();}else setStatus('Disconnected. Reload to reconnect.','error');}catch{setStatus('Disconnected. Reload to reconnect.','error');}};
}

function renderSteps(steps){
 list.replaceChildren();
 if(!steps.length){list.append(el('p',{className:'empty-steps',textContent:'No custom steps yet. Describe one above to get started.'}));return;}
 for(const step of steps){
  const meta=el('div',{className:'step-meta'},el('span',{textContent:roleLabels[step.role]||step.role}),el('span',{textContent:step.requiresApproval?'Requires plan approval':'No approval required'}),el('span',{textContent:'Inputs: '+(step.inputs.length?step.inputs.join(', '):'none')}));
  const used=[...step.usage.initiatives.map(t=>'initiative “'+t+'”'),...step.usage.dependents.map(t=>'custom step “'+t+'”')];
  const remove=el('button',{type:'button',className:'secondary',textContent:'Remove'});
  const note=el('small',{textContent:used.length?'In use by '+used.join(', ')+'.':step.usage.artifacts?'Saved artifacts exist for this step.':''});
  remove.disabled=!!(used.length||step.usage.artifacts);
  remove.onclick=async()=>{if(!confirm(`Remove the custom step “${step.title}”? This deletes its local definition.`))return;try{await api('/api/custom-steps/'+encodeURIComponent(step.id),'DELETE');loadSteps();}catch(e){note.textContent=e.message;}};
  list.append(el('div',{className:'step-row'},el('strong',{textContent:step.title}),el('p',{textContent:step.description}),meta,el('details',{},el('summary',{textContent:'Step instructions'}),el('pre',{textContent:step.skill})),el('div',{className:'step-actions'},remove,note)));
 }
}
async function loadSteps(){try{renderSteps(await api('/api/custom-steps'));}catch(e){list.textContent='Custom steps are unavailable: '+e.message;}}

requestInput.addEventListener('input',()=>{$('#request-count').textContent=`${requestInput.value.length} / 4000`;});
startButton.onclick=async()=>{
 const request=requestInput.value.trim();
 if(!request){setStatus('Describe the step you want to add.','error');requestInput.focus();return;}
 startButton.disabled=true;
 try{attach(await api('/api/custom-steps/session','POST',{provider:agentSelect.value,request}));}catch(e){setStatus(e.message,'error');startButton.disabled=false;}
};
stopButton.onclick=async()=>{if(!sessionId)return;try{await api('/api/custom-steps/session/'+encodeURIComponent(sessionId),'DELETE');setStatus('Stopping session…');}catch(e){setStatus(e.message,'error');}};

(async()=>{
 try{
  const boot=await (await fetch('/api/bootstrap')).json();token=boot.token;
  if(!boot.customSteps)throw Error('restart the workspace server to enable custom steps.');
  for(const option of agentSelect.options)if(!boot.providers[option.value]){option.disabled=true;option.textContent+=' (not installed)';}
  const firstAvailable=[...agentSelect.options].find(o=>!o.disabled);if(firstAvailable)agentSelect.value=firstAvailable.value;
  loadSteps();
  const session=await api('/api/custom-steps/session');
  if(session)attach(session);
  else if(firstAvailable){startButton.disabled=false;setStatus('No session running');}
  else setStatus('Install Codex, Claude Code, or OpenCode to create a custom step.','error');
 }catch(e){setStatus('Custom steps unavailable: '+e.message,'error');list.textContent='';}
})();
