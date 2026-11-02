import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {readFile} from 'node:fs/promises';
const elements=new Map();
const list=()=>({toggle(){},add(){},remove(){}});
for(const match of (await readFile(new URL('./index.html',import.meta.url),'utf8')).matchAll(/id="([^"]+)"/g))elements.set(match[1],{hidden:false,disabled:false,textContent:'',value:'',classList:list(),setAttribute(){},focus(){},play:async()=>{},muted:true});
globalThis.document={getElementById:id=>elements.get(id),body:{classList:list()}};
globalThis.window=globalThis;globalThis.isSecureContext=true;globalThis.location={hash:''};
const listeners={};globalThis.addEventListener=(key,fn)=>listeners[key]=fn;
let acquire;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getDisplayMedia:()=>acquire()}}});
class Conn extends EventEmitter {open=true;peer='car-peer';metadata=null;closed=false;answerCount=0;send(value){this.sent=value;}close(){this.closed=true;}answer(){this.answerCount++;}}
const peers=[];
class FakePeer extends EventEmitter {constructor(id){super();this.id=id;this.calls=[];peers.push(this);queueMicrotask(()=>this.emit('open',id));}destroy(){this.destroyed=true;}connect(id){this.outgoing=new Conn();this.outgoing.peer=id;return this.outgoing;}call(id,stream,options){const c=new Conn();c.metadata=options.metadata;this.calls.push({id,stream,options,c});return c;}}
globalThis.Peer=FakePeer;
await import('./app.mjs');
const $=id=>elements.get(id);
function stream(){const track={kind:'video',getSettings:()=>({displaySurface:'monitor'}),stop(){this.stopped=true;}};return {track,getTracks:()=>[track],getVideoTracks:()=>[track],getAudioTracks:()=>[]};}
const tick=async()=>{await Promise.resolve();await Promise.resolve();};
test('UI cancels pending capture, requires phone approval, and rejects untrusted incoming media',async()=>{
 let resolve,called=false;acquire=()=>{called=true;return new Promise(r=>resolve=r);};
 const starting=$('start').onclick();assert.equal(called,true,'capture invoked within button event');$('phone-stop').onclick();const late=stream();resolve(late);await starting;assert.equal(late.track.stopped,true);assert.equal(peers.length,0,'canceled capture never registers peer');
 const local=stream();acquire=()=>Promise.resolve(local);await $('start').onclick();await tick();const sender=peers.at(-1);assert.match(sender.id,/^ym-[A-HJ-NP-Z2-9]{8}$/);
 const connection=new Conn();sender.emit('connection',connection);const request={protocol:'ym1',nonce:'a'.repeat(32),challenge:'123456'};connection.emit('data',request);assert.equal(sender.calls.length,0,'no media before explicit phone approval');assert.equal($('phone-challenge').textContent,'123456');$('approve').onclick();assert.equal(sender.calls.length,1);assert.deepEqual(sender.calls[0].options.metadata,request);$('phone-stop').onclick();assert.equal(local.track.stopped,true);assert.equal(sender.destroyed,true);
 $('car-role').onclick();$('car-code').value='ABCD2345';$('join').onsubmit({preventDefault(){}});await tick();const receiver=peers.at(-1);receiver.outgoing.emit('open');const sent=receiver.outgoing.sent;
 const bad=new Conn();bad.peer='ym-WRONG234';bad.metadata=sent;receiver.emit('call',bad);assert.equal(bad.closed,true);assert.equal(bad.answerCount,0);
 const good=new Conn();good.peer='ym-ABCD2345';good.metadata=sent;receiver.emit('call',good);assert.equal(good.answerCount,1);const incoming=stream();good.emit('stream',incoming);assert.equal($('screen').srcObject,incoming);assert.equal($('screen-wrap').hidden,false);$('car-stop').onclick();assert.equal($('screen').srcObject,null);assert.equal(receiver.destroyed,true);
});
