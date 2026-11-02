import {normalizeCode,validRequest,authorizedCall,CaptureSession,randomCode,nonce} from './core.mjs';
const $=id=>document.getElementById(id);
const capture=new CaptureSession();
let role='phone',epoch=0,peer=null,data=null,media=null,pending=null,expected=null,remote=null;
let timers=new Set(),closed=new WeakSet();
const later=(fn,ms)=>{const t=setTimeout(()=>{timers.delete(t);fn();},ms);timers.add(t);return t;};
const message=(text,r=role)=>{$(`${r}-status`).textContent=text;};
function close(x){if(x&&!closed.has(x)){closed.add(x);try{x.close();}catch{}}}
function teardown(text){epoch++;capture.end();for(const t of timers)clearTimeout(t);timers.clear();const p=peer;peer=null;close(media);close(data);close(pending?.conn);media=data=pending=expected=remote=null;p?.destroy();$('screen').srcObject=null;$('screen').muted=true;$('sound').textContent='소리 켜기';for(const id of ['pairing','approval','phone-stop','car-stop','car-confirm','screen-wrap'])$(id).hidden=true;document.body.classList.remove('viewer');$('start').disabled=false;$('connect').disabled=false;$('capture-info').textContent='';if(text)message(text);}
function switchRole(next){if(next===role)return;teardown();role=next;for(const r of ['phone','car']){$(`${r}-panel`).hidden=r!==role;$(`${r}-role`).classList.toggle('selected',r===role);$(`${r}-role`).setAttribute('aria-pressed',String(r===role));}message(role==='phone'?'공유 시작 전입니다.':'연결 코드를 기다리고 있습니다.');}
$('phone-role').onclick=()=>switchRole('phone');$('car-role').onclick=()=>switchRole('car');
const supported=isSecureContext&&typeof navigator.mediaDevices?.getDisplayMedia==='function';
$('support').textContent=supported?'화면 공유 API 감지됨 · 전체 화면과 앱 전환은 연결 후 확인하세요.':'이 브라우저에는 화면 공유 기능이 없습니다. 아이폰 Safari에서 다시 열어 주세요.';
$('support').classList.toggle('unsupported',!supported);
const errors={ 'peer-unavailable':'아이폰을 찾지 못했습니다. 아이폰의 공유가 켜져 있는지와 코드를 확인하세요.', 'network':'연결 서비스에 접속하지 못했습니다. 인터넷 연결을 확인하세요.', 'server-error':'무료 연결 서비스가 응답하지 않습니다. 잠시 후 다시 시도하세요.', 'socket-error':'연결 서비스와 통신하지 못했습니다. 다시 연결해 주세요.', 'socket-closed':'연결 서비스 연결이 종료되었습니다.', 'unavailable-id':'코드가 사용 중입니다. 공유를 다시 시작해 주세요.', 'webrtc':'두 기기의 직접 연결에 실패했습니다. 같은 Wi-Fi 또는 개인용 핫스팟에서 다시 시도하세요.', 'browser-incompatible':'이 브라우저는 WebRTC 연결을 지원하지 않습니다.', 'ssl-unavailable':'보안 연결을 사용할 수 없습니다.'};
function createPeer(id,g,onOpen){if(typeof window.Peer!=='function')throw Error('연결 모듈을 불러오지 못했습니다. 인터넷 연결 후 페이지를 새로 여세요.');
 const p=new window.Peer(id,{debug:0,secure:true,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'}]}});peer=p;
 p.on('open',()=>{if(g!==epoch||p!==peer){p.destroy();return;}onOpen(p);});
 p.on('error',err=>{if(g!==epoch||p!==peer)return;teardown(errors[err.type]||'연결 오류가 발생했습니다. 공유를 종료하고 다시 시작하세요.');});
 p.on('disconnected',()=>{if(g===epoch&&p===peer)message(media?'연결 서비스가 끊겼습니다. 기존 영상이 멈추면 다시 연결하세요.':'연결 서비스가 끊겼습니다. 다시 시작해 주세요.');});
 p.on('close',()=>{if(g===epoch&&p===peer)teardown('연결이 종료되었습니다. 다시 시작해 주세요.');});return p;}
function deadline(g,ms,text){return later(()=>{if(g===epoch)teardown(text);},ms);}
function clear(t){if(t){clearTimeout(t);timers.delete(t);}}
$('start').onclick=async()=>{
 if(!supported){message('이 Safari에서 전체 화면 공유를 시작할 수 없습니다. 웹앱만으로 이 제한을 우회할 수 없습니다.');return;}
 teardown();const g=epoch,cg=capture.begin();$('start').disabled=true;$('phone-stop').hidden=false;message('시스템 선택창에서 전체 화면을 선택해 주세요.');
 // No awaited network operation before this user-activation-sensitive API.
 let promise;try{promise=navigator.mediaDevices.getDisplayMedia({video:{width:{ideal:1280},height:{ideal:720},frameRate:{ideal:24,max:30},displaySurface:'monitor'},audio:true});}catch(err){teardown(captureError(err));return;}
 try{const stream=await promise;if(!capture.accept(cg,stream)||g!==epoch)return;
 const video=stream.getVideoTracks()[0];if(!video){teardown('화면 영상 트랙을 받지 못했습니다. 다시 시작하세요.');return;}
 video.onended=()=>{if(g===epoch)teardown('아이폰의 화면 공유가 종료되었습니다.');};
 video.onmute=()=>{if(g===epoch)message('화면 입력이 일시 중지되었습니다. Safari로 돌아와 공유 상태를 확인하세요.');};
 video.onunmute=()=>{if(g===epoch)message(media?'화면을 차량에 보내고 있습니다.':'화면 입력이 다시 시작되었습니다. 차량 연결을 진행하세요.');};
 const surface=video.getSettings?.().displaySurface;
 $('capture-info').textContent=`캡처 범위: ${surface==='monitor'?'전체 화면':surface==='browser'?'브라우저 탭 (다른 앱은 공유되지 않음)':surface==='window'?'선택한 창':'기기가 범위를 제공하지 않음 — 다른 앱 전환으로 확인'} · ${stream.getAudioTracks().length?'오디오 트랙 있음':'오디오 트랙 없음 — 차량 Bluetooth 사용'}`;
 message('무료 연결 서비스에 접속하고 있습니다.');const code=randomCode();
 createPeer(`ym-${code}`,g,p=>{clear(openTimeout);$('code').textContent=code.slice(0,4)+' '+code.slice(4);$('pairing').hidden=false;message('테슬라에서 코드를 입력해 주세요.');const pairTimeout=deadline(g,120000,'연결 코드가 만료되어 화면 공유를 종료했습니다. 다시 시작하세요.');
 p.on('connection',conn=>{if(g!==epoch||pending||data||media){close(conn);return;}pending={conn};const requestTimeout=later(()=>{if(pending?.conn===conn){pending=null;close(conn);$('approval').hidden=true;message('차량 요청이 만료되었습니다. 차량에서 다시 연결하세요.');}},45000);
 conn.on('error',()=>rejectPending(conn,'차량 연결 요청에 오류가 발생했습니다.'));
 conn.on('close',()=>{if(pending?.conn===conn)rejectPending(conn,'차량의 연결 요청이 종료되었습니다.');if(data===conn&&g===epoch)teardown('차량 연결이 종료되었습니다.');});
 conn.on('data',v=>{if(g!==epoch||pending?.conn!==conn)return;if(pending.request||!validRequest(v)){rejectPending(conn,'올바르지 않은 차량 요청을 거절했습니다.');return;}pending={conn,request:v,timeout:requestTimeout,pairTimeout};$('phone-challenge').textContent=v.challenge;$('approval').hidden=false;message('테슬라의 숫자를 확인한 후 공유를 허용하세요.');});
 });
 p.on('call',c=>close(c));
 });const openTimeout=deadline(g,20000,'무료 연결 서비스 접속 시간이 초과되었습니다. 다시 시작하세요.');
 }catch(err){if(g===epoch)teardown(captureError(err));}
};
function captureError(e){if(e?.name==='NotAllowedError'||e?.name==='AbortError')return '화면 공유가 허용되지 않았거나 취소되었습니다. 다시 시작하여 전체 화면을 선택하세요.';if(e?.name==='NotSupportedError'||e?.name==='TypeError')return '이 기기가 요청한 화면 공유를 지원하지 않습니다. 웹앱만으로 전체 화면 공유를 보장할 수 없습니다.';return '화면 공유를 시작하지 못했습니다. Safari 일반 탭에서 다시 시도하세요.';}
function rejectPending(conn,text){if(pending?.conn!==conn)return;const old=pending;pending=null;clear(old.timeout);close(conn);$('approval').hidden=true;message(text,'phone');}
$('reject').onclick=()=>{if(pending)rejectPending(pending.conn,'차량 연결을 거절했습니다.');};
$('approve').onclick=()=>{const entry=pending;if(!entry?.request||!entry.conn.open||!capture.stream||!peer){if(entry)rejectPending(entry.conn,'요청이 종료되었습니다. 차량에서 다시 연결하세요.');return;}pending=null;clear(entry.timeout);clear(entry.pairTimeout);data=entry.conn;$('approval').hidden=true;$('pairing').hidden=true;const g=epoch;
 try{media=peer.call(data.peer,capture.stream,{metadata:entry.request});if(!media)throw Error();media.on('error',()=>{if(g===epoch)teardown('영상 전송에 실패했습니다. 같은 네트워크에서 다시 연결하세요.');});media.on('close',()=>{if(g===epoch)teardown('영상 연결이 종료되었습니다.');});data.send({protocol:'ym1',type:'approved'});message('화면을 차량에 보내고 있습니다. 네이버 지도나 YouTube 앱으로 전환해 확인하세요.');deadline(g,3600000,'1시간이 지나 화면 공유를 종료했습니다. 다시 연결하세요.');}catch{teardown('영상 연결을 시작하지 못했습니다. 다시 시도하세요.');}
};
$('join').onsubmit=e=>{e.preventDefault();const code=normalizeCode($('car-code').value);if(!code){message('아이폰에 표시된 영문·숫자 8자리 코드를 입력하세요.','car');$('car-code').focus();return;}teardown();const g=epoch;const request={protocol:'ym1',nonce:nonce(),challenge:String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0')};expected={peer:`ym-${code}`,nonce:request.nonce,challenge:request.challenge};$('connect').disabled=true;$('car-stop').hidden=false;message('아이폰에 연결하고 있습니다.');
 try{createPeer(undefined,g,p=>{clear(openTimeout);data=p.connect(expected.peer,{reliable:true,serialization:'json'});const conn=data;conn.on('open',()=>{if(g!==epoch)return;conn.send(request);$('car-challenge').textContent=request.challenge;$('car-confirm').hidden=false;message('아이폰에서 확인 숫자를 비교하고 공유를 허용하세요.');});conn.on('error',()=>{if(g===epoch)teardown('아이폰과 데이터 연결에 실패했습니다. 다시 연결하세요.');});conn.on('close',()=>{if(g===epoch)teardown('아이폰과 연결이 종료되었습니다.');});
 });const openTimeout=deadline(g,20000,'무료 연결 서비스 접속 시간이 초과되었습니다.');const approvalTimeout=deadline(g,60000,'아이폰의 공유 허용 시간이 초과되었습니다. 다시 연결하세요.');
 peer.on('call',call=>{if(g!==epoch||media||!authorizedCall(expected,call.peer,call.metadata,!!data?.open)){close(call);return;}media=call;call.answer();const mediaTimeout=deadline(g,25000,'영상을 받지 못했습니다. 같은 Wi-Fi 또는 개인용 핫스팟에서 다시 시도하세요.');
 call.on('stream',stream=>{if(g!==epoch)return;clear(approvalTimeout);clear(mediaTimeout);remote=stream;$('screen').srcObject=stream;$('screen-wrap').hidden=false;$('car-confirm').hidden=true;document.body.classList.add('viewer');$('screen').play().catch(()=>message('화면 재생 버튼을 눌러 주세요.'));message('아이폰 화면 수신 중 · 앱 조작은 아이폰에서 하세요.');$('audio-info').textContent=stream.getAudioTracks().length?'오디오 트랙을 받았습니다. 소리 켜기를 누르세요. Bluetooth와 동시에 사용하면 소리가 겹칠 수 있습니다.':'오디오 트랙이 없습니다. 소리는 차량 Bluetooth 오디오로 들으세요.';deadline(g,3600000,'1시간이 지나 연결을 종료했습니다.');});
 call.on('close',()=>{if(g===epoch)teardown('아이폰의 영상 공유가 종료되었습니다.');});call.on('error',()=>{if(g===epoch)teardown('영상 연결에 실패했습니다. 같은 네트워크에서 다시 시도하세요.');});
 });
 }catch(err){teardown(err.message||'연결을 시작하지 못했습니다.');}
};
$('phone-stop').onclick=()=>teardown('화면 공유를 종료했습니다.');$('car-stop').onclick=()=>teardown('연결을 종료했습니다.');
$('play').onclick=()=>{$('screen').play().then(()=>message('화면 재생 중입니다.')).catch(()=>message('브라우저가 영상을 재생하지 못했습니다. 연결을 다시 시도하세요.'));};
$('sound').onclick=async()=>{if(!remote?.getAudioTracks().length){message('아이폰에서 소리 트랙을 보내지 않았습니다. 차량 Bluetooth 오디오를 선택하세요.');return;}const v=$('screen');v.muted=!v.muted;try{await v.play();$('sound').textContent=v.muted?'소리 켜기':'소리 끄기';message(v.muted?'브라우저 소리를 껐습니다.':'브라우저 소리를 켰습니다.');}catch{v.muted=true;message('브라우저에서 소리를 재생하지 못했습니다. 차량 Bluetooth를 사용하세요.');}};
$('fullscreen').onclick=async()=>{const v=$('screen');try{if(v.requestFullscreen)await v.requestFullscreen();else if(v.webkitEnterFullscreen)v.webkitEnterFullscreen();else message('이 차량 브라우저는 전체 화면 API를 제공하지 않습니다.');}catch{message('전체 화면으로 전환하지 못했습니다. 기본 화면에서 확인하세요.');}};
let probe=null,probeTimer=null;
function endProbe(){clearTimeout(probeTimer);probe?.destroy();probe=null;$('diagnose').disabled=false;}
$('diagnose').onclick=()=>{if(peer||capture.stream){$('diagnostic').textContent='현재 공유를 종료한 뒤 점검해 주세요.';return;}if(typeof window.Peer!=='function'){$('diagnostic').textContent='연결 모듈을 불러오지 못했습니다.';return;}endProbe();$('diagnose').disabled=true;$('diagnostic').textContent='무료 연결 서비스 확인 중…';try{const p=new window.Peer(undefined,{debug:0,secure:true});probe=p;probeTimer=setTimeout(()=>{if(probe===p){endProbe();$('diagnostic').textContent='접속 시간이 초과되었습니다. 인터넷 연결을 확인하세요.';}},15000);p.on('open',()=>{if(probe===p){endProbe();$('diagnostic').textContent='무료 연결 서비스 접속 확인됨. 화면 캡처·차량 연결·앱 전환은 별도 확인이 필요합니다.';}});p.on('error',()=>{if(probe===p){endProbe();$('diagnostic').textContent='무료 연결 서비스에 접속하지 못했습니다.';}});}catch{endProbe();$('diagnostic').textContent='연결 서비스를 시작하지 못했습니다.';}};
window.addEventListener('pagehide',()=>{endProbe();teardown();});
window.addEventListener('pageshow',e=>{if(e.persisted)teardown('페이지가 복원되었습니다. 새로 연결해 주세요.');});
if(location.hash==='#car')switchRole('car');
