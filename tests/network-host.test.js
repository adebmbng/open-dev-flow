'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const http=require('node:http');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

function request(port,host){return new Promise((resolve,reject)=>{http.get({host:'127.0.0.1',port,path:'/api/bootstrap',headers:{host}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));}).on('error',reject);});}
async function runServer(env,check){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'workflow-host-'));
 const child=spawn(process.execPath,['server.js'],{env:{...process.env,HOST:'127.0.0.1',ALLOWED_HOSTS:'',...env,PORT:'0',WORKFLOW_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});
 let output='';child.stderr.on('data',chunk=>{output+=chunk;});
 try{
  const port=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timed out: '+output)),10000);child.on('error',reject);child.on('exit',code=>reject(Error(`Server exited ${code}: ${output}`)));child.stdout.on('data',chunk=>{const match=chunk.toString().match(/listening on .*:(\d+)/);if(match){clearTimeout(timer);resolve(Number(match[1]));}});});
  await check(port);
 }finally{if(child.exitCode===null&&child.signalCode===null){child.kill();await new Promise(resolve=>child.once('exit',resolve));}fs.rmSync(dir,{recursive:true,force:true});}
}
test('default bind permits loopback hostnames and rejects other hosts',async()=>runServer({},async port=>{
 assert.equal(await request(port,`localhost:${port}`),200);
 assert.equal(await request(port,`127.0.0.1:${port}`),200);
 assert.equal(await request(port,`workspace.test:${port}`),403);
}));
test('configured browser hostname works with wildcard binding without allowing arbitrary hosts',async()=>runServer({HOST:'0.0.0.0',ALLOWED_HOSTS:'workspace.test, 127.0.0.2'},async port=>{
 assert.equal(await request(port,`workspace.test:${port}`),200);
 assert.equal(await request(port,`127.0.0.2:${port}`),200);
 assert.equal(await request(port,`unexpected.test:${port}`),403);
}));
