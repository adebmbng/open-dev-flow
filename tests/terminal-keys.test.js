'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {installAgentKeybindings}=require('../public/terminal-keys');
test('Shift+Enter sends a distinct key sequence without submitting Enter',()=>{
 let handler, sent=[], prevented=false;
 installAgentKeybindings({attachCustomKeyEventHandler(fn){handler=fn}},data=>sent.push(data));
 const event={key:'Enter',shiftKey:true,type:'keydown',preventDefault(){prevented=true}};
 assert.equal(handler(event),false);assert.equal(prevented,true);assert.deepEqual(sent,['\x1b[13;2u']);
 assert.equal(handler({...event,type:'keyup'}),false);assert.equal(sent.length,1);
 assert.equal(handler({...event,shiftKey:false}),true);
 assert.equal(handler({...event,ctrlKey:true}),true);
});
