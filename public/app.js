// Escritório virtual da Venus — motor do mapa, personagens e painel
(()=>{
const el=id=>document.getElementById(id);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function visit(inside){el('exterior').hidden=inside;el('interior').hidden=!inside;(inside?el('back'):el('enter')).focus();if(inside)resize()}
el('enter').onclick=()=>visit(true);el('back').onclick=()=>visit(false);

/* ---------- sprites desenhados (atlas) ---------- */
const ATLAS=new Image();let SPR={};
ATLAS.onload=()=>{if(typeof renderList==='function')renderList()};ATLAS.src='/sprites.png';
fetch('/sprites.json').then(r=>r.json()).then(j=>{SPR=j;try{renderList()}catch{}}).catch(()=>{});
const spriteOk=id=>id&&id[0]!=='_'&&SPR[id]&&ATLAS.complete&&ATLAS.naturalWidth>0;
function drawSprite(c,t,sp){
  const x=Math.round(c.x),y=Math.round(c.y),moving=c.path.length>0||!!c.final;
  if(c.dir==='l'||c.dir==='r')c.lastSide=c.dir;
  let key,flip=false,dy=0;
  if(c.sit&&c.working){const k=Math.floor(t/1000+c.idx*7)%14;key=(sp.sit2&&k===0)?'sit2':(Math.floor(t/260+c.idx)%2?'sit1':'sit0');dy=0}
  else if(c.sit&&c.dir==='d'){key='sofa';dy=1}
  else{
    let d=c.dir;if(d==='u'&&!sp.up0)d=c.lastSide||'r';
    const base=d==='d'?'down':d==='u'?'up':'side';flip=d==='l';
    if(moving){key=base+[1,0,2,0][Math.floor(c.dist/6)%4]}
    else key=(base==='down'&&sp.blink&&Math.floor(t/140+c.idx*17)%36===0)?'blink':base+'0';
  }
  if(moving&&!c.sit&&Math.floor(c.dist/6)%2)dy-=1; // leve balanço ao andar
  const f=sp[key]||sp.down0,[sx,sy,w,h,ax]=f,K=SPR._scale||1,dw=w/K,dh=h/K,da=ax/K;
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(x-6,y+dy-1,12,2);ctx.fillRect(x-5,y+dy+1,10,1);
  // o boneco é guardado em alta resolução e reduzido aqui com suavização de qualidade
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';if(NIGHT)ctx.filter='brightness(.8) saturate(.92)';
  if(flip){ctx.translate(x,0);ctx.scale(-1,1);ctx.drawImage(ATLAS,sx,sy,w,h,-da,y+dy-dh,dw,dh)}
  else ctx.drawImage(ATLAS,sx,sy,w,h,x-da,y+dy-dh,dw,dh);
  ctx.restore();
  c._h=dh-dy;
}

/* ---------- mapa: fundo pintado (1328x800) sobre grade lógica 640x384 ---------- */
const T=16,COLS=40,ROWS=24,W=COLS*T,H=ROWS*T,IMG=1328/W;
const BG={dia:new Image(),noite:new Image()};BG.dia.src='/escritorio-dia.jpg';BG.noite.src='/escritorio-noite.jpg';
const grid=[...Array(ROWS)].map(()=>Array(COLS).fill(null)); // null = parede
const block=[...Array(ROWS)].map(()=>Array(COLS).fill(false));
function carve(x1,y1,x2,y2,f){for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)grid[y][x]=f}
function solid(x1,y1,x2,y2){for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)block[y][x]=true}
const P=v=>v/IMG; // pixel da imagem -> pixel lógico
// pisos
carve(1,3,12,10,'rec');carve(14,3,25,10,'mkt');carve(27,3,38,10,'dev');
carve(6,11,7,11,'cor');carve(19,11,20,11,'cor');carve(32,11,33,11,'cor');   // portas das salas
carve(0,12,38,13,'cor');carve(24,14,24,16,'cor');                           // corredor + porta da reunião
carve(1,17,20,22,'copa');carve(22,17,38,22,'meet');carve(21,19,21,20,'cor'); // copa, reunião e porta entre elas
// móveis
solid(1,3,12,3);solid(1,6,1,10);solid(2,9,4,10);solid(12,6,12,10);                                  // recepção
solid(14,3,25,3);solid(14,5,14,7);solid(15,7,16,8);solid(14,9,14,10);solid(25,6,25,7);solid(21,8,25,10); // marketing
solid(27,3,38,3);solid(32,6,34,7);solid(27,8,28,10);solid(29,8,30,10);solid(35,8,36,10);solid(38,5,38,10); // software
solid(1,17,1,17);solid(5,17,16,17);solid(19,17,19,17);solid(1,19,1,22);solid(3,20,5,20);solid(3,22,5,22);solid(19,20,20,22); // copa
solid(30,18,35,20);solid(31,17,35,17);solid(31,21,35,21);solid(29,19,29,20);solid(36,19,36,20);solid(22,17,22,17);solid(38,17,38,17);solid(22,22,22,22);solid(38,22,38,22); // reunião

// cadeiras das mesas (centro da cadeira e base das rodinhas, em px da imagem)
const ROOMS=[
  {name:'Recepção',lab:[226,228],seats:[123,233,343],mon:[123,233,343]},
  {name:'Estúdio de marketing',lab:[663,228],seats:[551,663,775],mon:[551,663,775]},
  {name:'Laboratório de software',lab:[955,232],seats:[988,1099,1211],mon:[988,1099,1211]}
];
const SEAT_PY=183,MON_PY=[88,110];
const ENTRY={x:0,y:13};
const IDLE=[
  {x:7,y:18,d:'u',ic:'agua'},{x:9,y:18,d:'u',ic:'cafe'},{x:10,y:18,d:'u',ic:'cafe'},{x:15,y:18,d:'u',ic:'cafe'},
  {x:18,y:17,d:'r',ic:'papo',sit:1,fx:P(592),fy:P(600)},{x:20,y:17,d:'l',ic:'papo',sit:1,fx:P(682),fy:P(600)},
  {x:3,y:20,d:'d',ic:'zz',sit:1,fx:P(112),fy:P(706)},{x:4,y:20,d:'d',ic:'zz',sit:1,fx:P(143),fy:P(706)},{x:5,y:20,d:'d',ic:'zz',sit:1,fx:P(174),fy:P(706)},
  {x:11,y:20,d:'r',ic:'papo'},{x:12,y:20,d:'l',ic:'papo'},{x:14,y:21,d:'r',ic:'papo'},{x:15,y:21,d:'l',ic:'papo'}
];
const spotPos=s=>({x:s.fx??s.x*T+8,y:s.fy??s.y*T+13});
const noite=()=>{if(/[?&]noite/.test(location.search))return true;if(/[?&]dia/.test(location.search))return false;const h=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Cuiaba',hour:'2-digit',hourCycle:'h23'}).format(new Date()));return h<6||h>=18};
let NIGHT=false,nightAt=0;
const DEBUG=/[?&]debug/.test(location.search);

/* ---------- utilidades de desenho ---------- */
const cv=el('office'),g=cv.getContext('2d');
let ctx=g;
const R=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x|0,y|0,w,h)};
const hash=(x,y)=>{let h=x*374761393+y*668265263;h=(h^(h>>13))*1274126177;return((h^(h>>16))>>>0)/4294967295};

/* ---------- pathfinding (BFS) ---------- */
function walk(x,y){return x>=0&&y>=0&&x<COLS&&y<ROWS&&grid[y][x]&&!block[y][x]}
function bfs(sx,sy,tx,ty){
  if(sx===tx&&sy===ty)return[];
  const prev=new Map(),k=(x,y)=>y*COLS+x,q=[[sx,sy]];prev.set(k(sx,sy),null);
  while(q.length){const[x,y]=q.shift();if(x===tx&&y===ty)break;
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(!prev.has(k(nx,ny))&&(walk(nx,ny)||(nx===tx&&ny===ty))){prev.set(k(nx,ny),[x,y]);q.push([nx,ny])}}}
  if(!prev.has(k(tx,ty)))return[];
  const path=[];let c=[tx,ty];while(c&&!(c[0]===sx&&c[1]===sy)){path.unshift(c);c=prev.get(k(c[0],c[1]))}
  return path;
}

/* ---------- personagem: sprite ---------- */
function drawChar(c,t){
  if(c.id&&spriteOk(c.id)){drawSprite(c,t,SPR[c.id]);return}
  c._h=c.sit?(c.working?22:20):24;
  const x=Math.round(c.x),y=Math.round(c.y),dark=shade(c.color,.72),moving=c.path.length>0||c.final;
  const step=moving?Math.floor(c.dist/5)%4:0,bob=moving&&(step%2)?1:0;
  const pants='#2f3446',shoe='#1c1e26';
  R(x-5,y,10,2,'rgba(0,0,0,.25)');
  if(c.sit&&c.working){ // sentado na mesa, de costas
    const tap=Math.floor(t/140+c.idx)%2;
    R(x-5,y-12,10,9,c.color);R(x-5,y-12,10,2,shade(c.color,1.12));R(x-6,y-11,2,6,dark);R(x+4,y-11,2,6,dark);
    R(x-6,y-14+tap,2,3,c.skin);R(x+4,y-14+(1-tap),2,3,c.skin);
    R(x-4,y-20,8,8,c.hair);R(x-4,y-20,8,2,shade(c.hair,1.3));R(x-3,y-13,6,1,c.skin);
    return;
  }
  if(c.sit&&c.dir==='d'){ // sentado de frente
    R(x-4,y-3,3,3,pants);R(x+1,y-3,3,3,pants);R(x-4,y,3,1,shoe);R(x+1,y,3,1,shoe);
    R(x-5,y-11,10,8,c.color);R(x-5,y-11,10,1,shade(c.color,1.12));R(x-6,y-10,2,6,c.skin);R(x+4,y-10,2,6,c.skin);
    head(x,y-11,'d',c);return;
  }
  if(c.sit){ // banqueta, de lado
    const f=c.dir==='l'?-1:1;R(x-3,y-3,6,3,pants);R(x+f*2-1,y-1,3,2,shoe);
    R(x-4,y-11,8,8,c.color);R(x+f*2-1,y-9,2,5,c.skin);head(x,y-11,c.dir,c);return;
  }
  const yy=y-bob;
  if(c.dir==='l'||c.dir==='r'){
    const f=c.dir==='l'?-1:1,a=[0,2,0,-2][step];
    R(x-2+a,yy-5,3,5,pants);R(x-1-a,yy-5,3,5,shade(pants,.85));R(x-2+a+f,yy-1,3,1,shoe);R(x-1-a+f,yy-1,3,1,shoe);
    R(x-4,yy-13,8,8,c.color);R(x-4,yy-13,8,1,shade(c.color,1.12));R(x-1-a,yy-12,3,6,dark);R(x-1-a,yy-7,3,2,c.skin);
    head(x,yy-13,c.dir,c);
  }else{
    const l=step===1?1:0,r=step===3?1:0;
    R(x-4,yy-5,3,5-l,pants);R(x+1,yy-5,3,5-r,pants);R(x-4,yy-1-l,3,1,shoe);R(x+1,yy-1-r,3,1,shoe);
    R(x-5,yy-13,10,8,c.color);R(x-5,yy-13,10,1,shade(c.color,1.12));
    R(x-6,yy-12+r,2,6,dark);R(x+4,yy-12+l,2,6,dark);R(x-6,yy-7+r,2,2,c.skin);R(x+4,yy-7+l,2,2,c.skin);
    head(x,yy-13,c.dir,c);
  }
}
function head(x,top,dir,c){
  R(x-4,top-8,8,8,c.skin);
  if(dir==='u'){R(x-4,top-9,8,8,c.hair);R(x-4,top-9,8,2,shade(c.hair,1.3));return}
  R(x-4,top-9,8,3,c.hair);R(x-4,top-9,8,1,shade(c.hair,1.3));
  if(dir==='d'){R(x-5,top-8,1,5,c.hair);R(x+4,top-8,1,5,c.hair);R(x-2,top-4,1,2,'#1d1b25');R(x+1,top-4,1,2,'#1d1b25');R(x-3,top-2,1,1,'rgba(230,120,120,.5)');R(x+2,top-2,1,1,'rgba(230,120,120,.5)')}
  else{const f=dir==='l'?-1:1;R(x-4*f-(f>0?0:1)+(f>0?-1:1),top-8,2,6,c.hair);R(x+f*2-(f<0?1:0),top-4,1,2,'#1d1b25')}
}
function chairBack(sx,sy,col,occupied){
  ctx=g;const x=sx,y=sy;
  if(!occupied){R(x-6,y-9,12,8,'#3a3f52');R(x-5,y-8,10,6,col)}
  R(x-7,y-3,14,5,'#2f3446');R(x-6,y-2,12,3,shade(col,.8));R(x-1,y+2,2,2,'#1c1e26');
}
function bubble(x,y,kind,t){
  ctx=g;const bx=x+6,by=y-30;
  R(bx,by,14,11,'#2a2340');R(bx+1,by+1,12,9,'#ffffff');R(bx+1,by+10,3,2,'#ffffff');R(bx,by+10,1,3,'#2a2340');R(bx+1,by+12,2,1,'#2a2340');R(bx-1,by+13,2,1,'#2a2340');
  if(kind==='dots'){const n=Math.floor(t/300)%4;for(let i=0;i<3;i++)R(bx+3+i*3,by+5,2,2,i<n?'#6d4fa0':'#d6cde6')}
  else if(kind==='cafe'){R(bx+4,by+4,5,4,'#8a5a3b');R(bx+4,by+4,5,1,'#5b3a26');R(bx+9,by+5,1,2,'#8a5a3b');const s=Math.floor(t/400)%2;R(bx+5+s,by+2,1,1,'#bdb6c9')}
  else if(kind==='agua'){R(bx+6,by+2,2,1,'#3b82c4');R(bx+5,by+3,4,3,'#7cc3f0');R(bx+5,by+6,4,2,'#3b82c4')}
  else if(kind==='zz'){const s=Math.floor(t/500)%2;R(bx+3,by+3+s,4,1,'#6d4fa0');R(bx+5,by+4+s,1,1,'#6d4fa0');R(bx+4,by+5+s,1,1,'#6d4fa0');R(bx+3,by+6+s,4,1,'#6d4fa0');R(bx+9,by+3,2,1,'#9b8fb5');R(bx+10,by+4,1,1,'#9b8fb5');R(bx+9,by+5,2,1,'#9b8fb5')}
  else if(kind==='papo'){R(bx+3,by+3,8,1,'#9b8fb5');R(bx+3,by+5,6,1,'#9b8fb5');R(bx+3,by+7,7,1,'#9b8fb5')}
}

/* ---------- elementos dinâmicos ---------- */
function screens(t){
  ctx=g;
  ROOMS.forEach((room,ri)=>room.mon.forEach((mx,i)=>{
    const role=setores[ri];
    const on=chars.some(c=>c.setor===role?.id&&c.working&&c.sit&&c.desk===i);
    if(!on)return;
    const x=P(mx)-8,y=P(MON_PY[0])+1,w=16,h=P(MON_PY[1]-MON_PY[0])-2;
    ctx.fillStyle='rgba(120,190,255,.18)';ctx.fillRect(x-2,y-2,w+4,h+4);
    R(x,y,w,h,'#0f1a2a');const col=role.cor,off=Math.floor(t/220+i*3);
    for(let r=0;r<4;r++){const lw=3+((hash(r+off,i+ri)*10)|0);R(x+1+((r+off)%3),y+1.5+r*2.2,Math.min(lw,w-3),1,r%2?col:'#8fb3d9')}
  }));
}

/* ---------- estado ---------- */
let setores=[],funcs=[],chars=[],connected=false,demo=false,selected=null,me=null,worker=null,firstChars=true,firstPoll=true;
const live=()=>demo||connected;
const funcById=id=>funcs.find(f=>f.id===id);
const roomIdx=setor=>setores.findIndex(s=>s.id===setor);
const corSetor=setor=>(setores.find(s=>s.id===setor)||{}).cor||'#999';
const salaSetor=setor=>(setores.find(s=>s.id===setor)||{}).sala||'';
const primeiro=n=>n.split(' ')[0];
function deskIdx(f){return funcs.filter(x=>x.setor===f.setor).indexOf(f)%3}
function present(f){return live()?f.emTurno:true}
function working(f){return live()&&f.emTurno&&f.trabalhando}
function statusOf(f){if(!live())return['off','Offline'];if(!f.emTurno)return['off','Fora do turno'];return f.trabalhando?['on','Trabalhando']:['idle','Em pausa']}
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g2=n>>8&255,b=n&255;r=Math.min(255,r*f)|0;g2=Math.min(255,g2*f)|0;b=Math.min(255,b*f)|0;return'#'+((1<<24)|(r<<16)|(g2<<8)|b).toString(16).slice(1)}

/* ---------- personagens ---------- */
function tileOf(c){return[Math.floor(c.x/T),Math.floor((c.y-1)/T)]}
function freeSpot(){const f=IDLE.filter(s=>!s.by);return f.length?f[(Math.random()*f.length)|0]:null}
function release(c){if(c.spot&&c.spot.by===c)c.spot.by=null;c.spot=null}
function seatOf(c){const room=ROOMS[roomIdx(c.setor)];if(!room)return null;const x=P(room.seats[c.desk]);return{tx:Math.floor(x/T),ty:4,x,y:P(SEAT_PY)}}
function makeChar(f,mode){
  const ap=f.aparencia||{},i=funcs.indexOf(f);
  const c={id:f.id,setor:f.setor,desk:deskIdx(f),idx:i,name:primeiro(f.nome),color:corSetor(f.setor),hair:ap.cabelo||'#2b1d17',skin:ap.pele||'#f1c7a5',
    x:ENTRY.x*T+8,y:ENTRY.y*T+13,path:[],dir:'r',sit:false,spot:null,final:null,dist:0,leaving:false,nextIdle:0,working:false,arrivedAt:performance.now()};
  if(mode==='place'){
    if(working(f)){const s=seatOf(c);if(s){c.x=s.x;c.y=s.y;c.working=true;c.sit=true;c.dir='u'}}
    else{const s=freeSpot();if(s){c.spot=s;s.by=c;const p=spotPos(s);c.x=p.x;c.y=p.y;c.sit=!!s.sit;c.dir=s.d}}
  }
  return c;
}
function goTile(c,tx,ty,final){const[sx,sy]=tileOf(c);c.path=bfs(sx,sy,tx,ty);c.final=final;c.sit=false;if(reduce){const f=final||{x:tx*T+8,y:ty*T+13};c.x=f.x;c.y=f.y;c.path=[];c.final=null;arrive(c)}}
function arrive(c){
  c.arrivedAt=performance.now();
  if(c.leaving){chars=chars.filter(o=>o!==c);return}
  if(c.working){c.sit=true;c.dir='u'}
  else if(c.spot){c.sit=!!c.spot.sit;c.dir=c.spot.d}
}
function toIdle(c,now){const s=freeSpot();release(c);if(s){c.spot=s;s.by=c;goTile(c,s.x,s.y,spotPos(s))}c.nextIdle=now+20000+Math.random()*25000}
function plan(c,now){
  const f=funcById(c.id);if(!f||c.leaving)return;
  if(!present(f)){c.leaving=true;c.working=false;release(c);goTile(c,ENTRY.x,ENTRY.y,null);return}
  if(working(f)){
    if(!c.working){c.working=true;release(c);const s=seatOf(c);if(s)goTile(c,s.tx,s.ty,{x:s.x,y:s.y})}
  }else if(c.working||(!c.spot&&!c.path.length&&!c.final))toIdle(c,now);
  else if(now>c.nextIdle&&!c.path.length&&!c.final)toIdle(c,now);
  if(!c.working&&!c.nextIdle)c.nextIdle=now+20000+Math.random()*25000;
}
function sync(){
  funcs.forEach(f=>{if(present(f)&&!chars.some(c=>c.id===f.id&&!c.leaving))chars.push(makeChar(f,firstChars?'place':'entry'))});
  if(funcs.length)firstChars=false;
}

/* ---------- render ---------- */
let S=2,DPR=1;
function resize(){
  DPR=window.devicePixelRatio||1;
  const wrap=el('wrap').parentElement,cs=getComputedStyle(wrap),cw=wrap.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),ch=Math.max(300,wrap.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom));
  const fit=Math.min(cw/W,ch/H);
  let s=Math.floor(fit*DPR);
  if(s<1||s/DPR<fit*.82)s=fit*DPR;
  S=s;cv.width=Math.round(W*S);cv.height=Math.round(H*S);
  cv.style.width=(cv.width/DPR)+'px';cv.style.height=(cv.height/DPR)+'px';
}
addEventListener('resize',resize);

let last=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  chars.slice().forEach(c=>plan(c,now));
  chars.slice().forEach(c=>{
    let target=null;
    if(c.path.length){const[tx,ty]=c.path[0];target={x:tx*T+8,y:ty*T+13,tile:true}}
    else if(c.final)target=c.final;
    if(!target)return;
    const dx=target.x-c.x,dy=target.y-c.y,d=Math.hypot(dx,dy),sp=64*dt;
    if(Math.abs(dx)>Math.abs(dy))c.dir=dx<0?'l':'r';else if(Math.abs(dy)>.1)c.dir=dy<0?'u':'d';
    if(d<=sp){c.x=target.x;c.y=target.y;c.dist+=d;if(target.tile){c.path.shift();if(!c.path.length&&!c.final)arrive(c)}else{c.final=null;arrive(c)}}
    else{c.x+=dx/d*sp;c.y+=dy/d*sp;c.dist+=sp}
  });
  draw(now);
  requestAnimationFrame(frame);
}
function roundRect(x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function draw(t){
  g.setTransform(S,0,0,S,0,0);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  if(t-nightAt>5000){NIGHT=noite();nightAt=t}
  const bg=NIGHT?BG.noite:BG.dia;
  if(bg.complete&&bg.naturalWidth)g.drawImage(bg,0,0,W,H);else{g.fillStyle='#1a1527';g.fillRect(0,0,W,H)}
  g.imageSmoothingEnabled=false;ctx=g;
  if(DEBUG){for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){ctx.fillStyle=!grid[y][x]?'rgba(255,0,0,.25)':block[y][x]?'rgba(255,160,0,.35)':'rgba(0,255,120,.12)';ctx.fillRect(x*T+.5,y*T+.5,T-1,T-1)}
    IDLE.forEach(s=>{const p=spotPos(s);R(p.x-1,p.y-1,3,3,'#00e5ff')});ROOMS.forEach(r=>r.seats.forEach(x=>R(P(x)-1,P(SEAT_PY)-1,3,3,'#ff00ff')))}
  screens(t);
  const items=[];
  chars.forEach(c=>items.push({y:c.y,f:()=>{
    ctx=g;
    if(selected===c.id){ctx.fillStyle='rgba(201,166,242,.75)';ctx.beginPath();ctx.ellipse(c.x,c.y,8,2.5,0,0,7);ctx.fill()}
    drawChar(c,t);
  }}));
  items.sort((a,b)=>a.y-b.y).forEach(i=>i.f());
  chars.forEach(c=>{
    if(c.path.length||c.final||!live()||c.leaving)return;
    const top=Math.round(c.y)-(c._h||24);
    if(c.working&&c.sit)bubble(Math.round(c.x)+2,top+30,'dots',t);
    else if(c.spot&&t-c.arrivedAt<6000+((c.idx*1300)%4000))bubble(Math.round(c.x),top+28,c.spot.ic,t);
  });
  // textos em resolução de tela
  g.setTransform(1,0,0,1,0,0);
  const fs=Math.max(9,Math.round(Math.min(11,4.2*S/DPR)*DPR));
  g.textAlign='center';g.textBaseline='middle';
  const plate=(txt,px,py)=>{g.font=`700 ${Math.round(fs*.82)}px system-ui,sans-serif`;const w=g.measureText(txt).width+fs*1.4,h=fs*1.5,x=P(px)*S,y=P(py)*S;
    g.fillStyle='rgba(20,17,31,.55)';roundRect(x-w/2,y-h/2,w,h,h/2);g.fill();g.fillStyle='rgba(243,239,250,.92)';g.fillText(txt,x,y+.5)};
  ROOMS.forEach(r=>plate(r.name.toUpperCase(),r.lab[0],r.lab[1]));
  plate('COPA',380,660);plate('SALA DE REUNIÃO',1095,750);
  const now=new Date(),hh=String(now.getHours()).padStart(2,'0'),mm=String(now.getMinutes()).padStart(2,'0');
  g.fillStyle='#ff5a4a';g.font=`700 ${Math.max(7,Math.round(fs*.62))}px ui-monospace,monospace`;g.fillText(hh+':'+mm,P(137)*S,P(401)*S);
  g.font=`600 ${fs}px system-ui,sans-serif`;
  const tags=chars.map(c=>{const w=g.measureText(c.name).width+fs*1.6,h=fs*1.55;
    return{c,label:c.name,w,h,x:c.x*S,y:(c.y-(c._h||24)-2)*S-h/2-2*DPR}}).sort((a,b)=>b.y-a.y);
  const placed=[];
  tags.forEach(tg=>{let guard=0;while(guard++<6&&placed.some(p=>Math.abs(p.x-tg.x)<(p.w+tg.w)/2+2*DPR&&Math.abs(p.y-tg.y)<(p.h+tg.h)/2+DPR))tg.y-=tg.h+2*DPR;placed.push(tg)});
  tags.forEach(({c,label,w,h,x,y})=>{
    const sel=selected===c.id;
    g.fillStyle=sel?'rgba(74,56,112,.95)':'rgba(20,17,31,.85)';
    roundRect(x-w/2,y-h/2,w,h,h/2);g.fill();
    g.strokeStyle=sel?'#c9a6f2':'rgba(255,255,255,.12)';g.lineWidth=DPR;g.stroke();
    g.fillStyle=!live()?'#6b6480':c.leaving?'#6b6480':c.working?'#4ade80':'#fbbf24';g.beginPath();g.arc(x-w/2+fs*.7,y,fs*.26,0,7);g.fill();
    g.fillStyle='#f3effa';g.textAlign='left';g.fillText(label,x-w/2+fs*1.15,y+.5);g.textAlign='center';
  });
}

/* ---------- avatar pequeno (ficha e lista) ---------- */
function avatar(f,scale=3){
  if(spriteOk(f.id)){const[sx,sy,w,h]=SPR[f.id].down0;const c=document.createElement('canvas');c.width=w;c.height=h;c.className='hdav';const ch=26*scale;c.style.height=ch+'px';c.style.width=(w*ch/h)+'px';c.getContext('2d').drawImage(ATLAS,sx,sy,w,h,0,0,w,h);return c}
  const c=document.createElement('canvas');c.width=20;c.height=26;c.className='pxav';c.style.width=20*scale+'px';c.style.height=26*scale+'px';
  const prev=ctx;ctx=c.getContext('2d');
  const ap=f.aparencia||{};
  drawChar({x:10,y:24,dir:'d',color:corSetor(f.setor),hair:ap.cabelo||'#2b1d17',skin:ap.pele||'#f1c7a5',path:[],final:null,dist:0,sit:false,idx:0,working:false},0);
  ctx=prev;return c;
}

/* ---------- interação no mapa ---------- */
function hit(e){const b=cv.getBoundingClientRect(),mx=(e.clientX-b.left)/b.width*W,my=(e.clientY-b.top)/b.height*H;let best=null,bd=14;chars.forEach(c=>{const d=Math.hypot(c.x-mx,(c.y-(c._h||24)/2)-my);if(d<bd){bd=d;best=c}});return best}
cv.addEventListener('click',e=>{const c=hit(e);openFicha(c?c.id:null)});
cv.addEventListener('mousemove',e=>{cv.style.cursor=hit(e)?'pointer':'default'});

/* ---------- utilidades de texto ---------- */
const fmt=d=>new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const fmtDia=d=>{const x=new Date(d),hoje=new Date();return x.toDateString()===hoje.toDateString()?fmt(x):x.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' '+fmt(x)};
function h(tag,attrs={},...kids){const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs)){if(k==='class')n.className=v;else if(k.startsWith('on'))n[k]=v;else if(v!==false&&v!=null)n.setAttribute(k,v===true?'':v)}kids.flat().forEach(k=>n.append(k instanceof Node?k:document.createTextNode(k??'')));return n}

/* ---------- lista da equipe ---------- */
function renderList(){
  const ul=el('agents');ul.replaceChildren();
  funcs.forEach(f=>{
    const[cls,txt]=statusOf(f);
    const li=h('li',{role:'option','aria-selected':selected===f.id,tabindex:0},
      h('div',{class:'av'},avatar(f,1.5)),
      h('div',{class:'who'},h('b',{},f.nome),h('span',{},f.cargo)),
      h('div',{class:'st'},h('span',{class:'dot '+cls}),txt));
    li.onclick=()=>openFicha(selected===f.id?null:f.id);
    li.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();li.click()}};
    ul.append(li);
  });
  const presentes=funcs.filter(f=>live()&&f.emTurno).length,trab=funcs.filter(f=>working(f)).length;
  el('summary').textContent=live()?`${presentes} no turno · ${trab} trabalhando`:`${funcs.length} funcionários`;
}

/* ---------- ficha do funcionário ---------- */
let tasksCache=[],tasksFor=null;
function openFicha(id){
  selected=id;renderList();
  const box=el('ficha');
  if(!id){box.hidden=true;document.querySelector('.stage').classList.remove('withf');resize();return}
  const f=funcById(id);if(!f)return;
  const wasHidden=box.hidden;box.hidden=false;box.replaceChildren();document.querySelector('.stage').classList.add('withf');if(wasHidden)resize();
  const close=h('button',{class:'x','aria-label':'Fechar ficha',onclick:()=>openFicha(null)},'×');
  box.append(
    h('div',{class:'fhead'},h('div',{class:'big'},avatar(f,3)),h('div',{},h('h3',{},f.nome),h('p',{class:'muted'},f.cargo),h('p',{class:'muted small'},salaSetor(f.setor))),close),
    h('div',{class:'fstatus',id:'fstatus'}),
    h('div',{class:'now',id:'fnow'}),
    h('section',{},h('h4',{},'Sobre'),h('p',{},f.bio||'')),
    h('section',{},h('h4',{},'O que faz'),h('ul',{class:'faz'},(f.faz||[]).map(x=>h('li',{},x)))),
    h('section',{},h('h4',{},'Hobbies'),h('div',{class:'chips'},(f.hobbies||[]).map(x=>h('span',{class:'chip'},x)))),
    h('section',{id:'fagenda'}),
    h('section',{id:'ftasks'})
  );
  updateFicha(true);
  if(me&&!demo)loadTasks(id);
}
function updateFicha(full){
  const f=funcById(selected);if(!f||el('ficha').hidden)return;
  const[cls,txt]=statusOf(f);
  el('fstatus').replaceChildren(h('span',{class:'st'},h('span',{class:'dot '+cls}),txt),h('span',{class:'muted'},'Turno: '+f.turno));
  const now=el('fnow');
  if(demo){now.replaceChildren(h('b',{},'Agora'),h('p',{},f.atividade||(f.trabalhando?'Trabalhando':'Sem tarefa no momento')))}
  else if(me){now.replaceChildren(h('b',{},'Agora'),h('p',{},f.atividade||(f.trabalhando?'Em uma sessão do Claude Code':'Sem tarefa no momento')),f.fila?h('p',{class:'muted small'},`${f.fila} tarefa(s) na fila`):'')}
  else now.replaceChildren(h('b',{},'Agora'),h('p',{},f.trabalhando&&live()?'Trabalhando em uma tarefa':'Sem tarefa no momento'));
  renderAgenda(f);
  if(full)renderTaskBox(f);
}
const AG={feito:['Concluída','d'],fazendo:['Fazendo','r'],erro:['Erro','e'],proxima:['Próxima','q'],aguardando:['Aguardando','q'],'nao-rodou':['Não rodou','e'],agendada:['Agendada','q']};
function renderAgenda(f){
  const sec=el('fagenda');if(!sec)return;
  const open=new Set([...sec.querySelectorAll('li.open')].map(li=>li.dataset.k));
  sec.replaceChildren(h('h4',{},'Agenda de hoje'));
  if(demo||!me){sec.append(h('p',{class:'muted small'},f.rotinasHoje?`${f.rotinasHoje} rotina(s) programada(s) para hoje.`+(me?'':' Entre para ver os detalhes.'):'Nenhuma rotina programada para hoje.'));return}
  const list=f.agenda||[];
  if(!list.length){sec.append(h('p',{class:'muted small'},'Nenhuma rotina programada para hoje.'));return}
  const ul=h('ul',{class:'tasks agenda'});
  list.forEach(i=>{
    const[lab,cls]=AG[i.status]||[i.status,'q'],k=i.id+i.hora;
    const quando=i.status==='feito'&&i.fim?'às '+fmt(i.fim):i.status==='fazendo'&&i.inicio?'desde '+fmt(i.inicio):'';
    const li=h('li',{'data-k':k,class:open.has(k)?'open':''},
      h('div',{class:'trow'},h('time',{class:'hr'},i.hora),h('span',{class:'tt'},i.nome),h('span',{class:'tag '+cls},lab)),
      h('div',{class:'tbody'},quando?h('p',{class:'muted small'},quando):'',i.resumo?h('pre',{class:'res'},i.resumo):h('p',{class:'muted small'},i.status==='nao-rodou'?'Nenhum registro desta execução no Notion.':'Sem resumo ainda.')));
    li.querySelector('.trow').onclick=()=>li.classList.toggle('open');
    ul.append(li);
  });
  sec.append(ul);
}
function renderTaskBox(f){
  const sec=el('ftasks');sec.replaceChildren(h('h4',{},'Tarefas'));
  if(demo){sec.append(h('p',{class:'muted small'},'Desligue o modo demonstração para enviar tarefas.'));return}
  if(!me){sec.append(h('p',{class:'muted small'},'Só pessoas autorizadas podem mandar tarefas.'),h('button',{class:'cta sm',onclick:()=>openLogin()},'Entrar para enviar tarefas'));return}
  const ta=h('textarea',{id:'prompt',rows:4,maxlength:8000,placeholder:`O que ${primeiro(f.nome)} deve fazer?`});
  const msg=h('p',{class:'muted small',id:'pmsg'},f.emTurno?'':`Fora do expediente agora (${f.turno}). A tarefa fica na fila até o próximo turno.`);
  const btn=h('button',{class:'cta sm'},'Enviar tarefa');
  const form=h('form',{class:'prompt'},ta,h('div',{class:'prow'},msg,btn));
  form.onsubmit=async e=>{e.preventDefault();const texto=ta.value.trim();if(texto.length<3){msg.textContent='Descreva a tarefa.';return}
    btn.disabled=true;msg.textContent='Enviando…';
    try{const r=await api('/api/tasks',{func:f.id,texto});ta.value='';msg.textContent=worker&&worker.online?'Tarefa enviada.':'Tarefa na fila. O worker do PC de casa ainda não está conectado.';log(`${me.nome} enviou uma tarefa para ${primeiro(f.nome)}`);loadTasks(f.id)}
    catch(err){msg.textContent=err.message}btn.disabled=false};
  ta.onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))form.requestSubmit()};
  sec.append(form,h('ul',{class:'tasks',id:'tlist'}));
  renderTasks();
}
const ST={fila:['Na fila','q'],andamento:['Em andamento','r'],concluida:['Concluída','d'],erro:['Erro','e'],cancelada:['Cancelada','c']};
function renderTasks(){
  const ul=el('tlist');if(!ul)return;
  const list=tasksFor===selected?tasksCache:[];
  const open=new Set([...ul.querySelectorAll('li.open')].map(li=>li.dataset.id));
  ul.replaceChildren();
  if(!list.length){ul.append(h('li',{class:'muted small nob'},'Nenhuma tarefa ainda.'));return}
  const fila=list.filter(t=>t.status==='fila'),agora=list.filter(t=>t.status==='andamento'),resto=list.filter(t=>t.status!=='fila'&&t.status!=='andamento');
  const move=async(t,para,ev)=>{ev.stopPropagation();try{await api(`/api/tasks/${t.id}/mover`,{para});loadTasks(selected)}catch(e){alert(e.message)}};
  const item=(t,pos)=>{
    const[lab,cls]=ST[t.status]||[t.status,'q'];
    const ctrl=pos!=null?h('span',{class:'ord'},
      h('button',{class:'ib',title:'Subir',disabled:pos===0,onclick:e=>move(t,'cima',e)},'▲'),
      h('button',{class:'ib',title:'Descer',disabled:pos===fila.length-1,onclick:e=>move(t,'baixo',e)},'▼'),
      h('button',{class:'ib urg',title:'Fazer primeiro',disabled:pos===0,onclick:e=>move(t,'topo',e)},'⤒')):'';
    const li=h('li',{'data-id':t.id,class:open.has(t.id)?'open':''},
      h('div',{class:'trow'+(pos!=null?' q':'')},pos!=null?h('span',{class:'pos'},String(pos+1)):h('span',{class:'tag '+cls},lab),h('span',{class:'tt'},t.titulo),ctrl||h('time',{},fmtDia(t.concluida||t.iniciada||t.criada))),
      h('div',{class:'tbody'},h('p',{class:'muted small'},`Pedido por ${t.autor} · ${fmtDia(t.criada)}`),h('pre',{},t.texto),t.resultado?h('div',{},h('b',{class:'small'},'Resultado'),h('pre',{class:'res'},t.resultado)):'',
        t.status==='fila'?h('button',{class:'ghost sm',onclick:async ev=>{ev.stopPropagation();try{await api(`/api/tasks/${t.id}/cancelar`,{});loadTasks(selected)}catch(e){alert(e.message)}}},'Cancelar'):''));
    li.querySelector('.trow').onclick=()=>li.classList.toggle('open');
    return li;
  };
  if(agora.length){ul.append(h('li',{class:'sub nob'},'Fazendo agora'));agora.forEach(t=>ul.append(item(t,null)))}
  if(fila.length){ul.append(h('li',{class:'sub nob'},`Na fila (${fila.length}) · ${primeiro(funcById(selected)?.nome||'')} faz de cima para baixo`));fila.forEach((t,i)=>ul.append(item(t,i)))}
  if(resto.length){ul.append(h('li',{class:'sub nob'},'Histórico'));resto.forEach(t=>ul.append(item(t,null)))}
}
async function loadTasks(id){
  try{const r=await fetch('/api/tasks?func='+encodeURIComponent(id),{cache:'no-store'});if(!r.ok)throw 0;const list=await r.json();
    if(selected!==id)return;
    if(tasksFor===id){const old=Object.fromEntries(tasksCache.map(t=>[t.id,t.status]));list.forEach(t=>{if(old[t.id]&&old[t.id]!==t.status&&(t.status==='concluida'||t.status==='erro'))log(`${primeiro(funcById(id)?.nome||'')} ${t.status==='concluida'?'concluiu':'teve erro em'}: ${t.titulo}`)})}
    tasksCache=list;tasksFor=id;renderTasks()}catch{}
}
async function api(path,body){
  const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.erro||'Não foi possível concluir.');
  return j;
}

/* ---------- login ---------- */
function openLogin(){el('lerr').textContent='';el('login').showModal();el('lemail').focus()}
el('lform').onsubmit=async e=>{
  e.preventDefault();el('lerr').textContent='';
  try{await api('/api/login',{email:el('lemail').value,senha:el('lsenha').value});el('lsenha').value='';el('login').close();await poll(true);if(selected)openFicha(selected)}
  catch(err){el('lerr').textContent=err.message}
};
el('lcancel').onclick=()=>el('login').close();
function renderWho(){
  const w=el('who');w.replaceChildren();
  if(me){w.append(h('span',{class:'pill'},h('span',{class:'dot '+(worker&&worker.online?'on':'')}),worker&&worker.online?'Worker online':'Worker offline'),
    h('span',{class:'pill'},me.nome),h('button',{class:'ghost',onclick:async()=>{await api('/api/logout',{});me=null;tasksCache=[];await poll(true);if(selected)openFicha(selected)}},'Sair'))}
  else w.append(h('button',{class:'ghost',onclick:openLogin},'Entrar'));
}

/* ---------- atividade ---------- */
const events=[];
function log(text){events.unshift({t:new Date(),text});events.length=Math.min(events.length,40);renderEvents()}
function renderEvents(){
  const ul=el('events');ul.replaceChildren();
  if(!events.length){ul.append(h('li',{},h('span',{class:'em'},'Aguardando atividade…')));return}
  events.forEach(e=>ul.append(h('li',{},h('time',{},fmt(e.t)),h('span',{},e.text))));
}
function setConn(){
  const c=el('conn');c.replaceChildren(h('span',{class:'dot '+(demo?'idle':connected?'on':'')}),demo?'Demonstração':connected?'Ao vivo':'Sem conexão');
}
setInterval(()=>{el('clock').textContent=fmt(new Date())},1000);el('clock').textContent=fmt(new Date());

/* ---------- dados ---------- */
let prev={};
function apply(list){
  if(Object.keys(prev).length)list.forEach(f=>{
    const p=prev[f.id];if(!p)return;const n=primeiro(f.nome);
    if(p.emTurno!==f.emTurno)log(f.emTurno?`${n} chegou para o turno`:`${n} encerrou o turno`);
    else if(f.emTurno&&p.trabalhando!==f.trabalhando)log(f.trabalhando?`${n} começou a trabalhar${f.atividade?': '+f.atividade:''}`:`${n} terminou e foi para a copa`);
  });
  prev=Object.fromEntries(list.map(f=>[f.id,{emTurno:f.emTurno,trabalhando:f.trabalhando}]));
  funcs=list;sync();renderList();updateFicha(false);setConn();
}
let real=null;
async function poll(once){
  try{const r=await fetch('/api/office',{cache:'no-store'});if(!r.ok)throw 0;real=await r.json();
    if(!connected&&!firstPoll)log('Conexão com o escritório restabelecida');connected=true;
    setores=real.setores;
    const wasMe=!!me;me=real.logado;worker=real.worker||null;renderWho();
    if(wasMe!==!!me&&selected)renderTaskBox(funcById(selected)||{});
  }catch{if(connected)log('Conexão perdida');connected=false}
  if(firstPoll){firstPoll=false;log(connected?'Escritório aberto · acompanhando ao vivo':'Sem conexão com o servidor')}
  if(!demo&&real)apply(real.funcionarios);
  if(me&&selected&&!demo)loadTasks(selected);
  if(!once)setTimeout(poll,5000);
}

/* ---------- modo demonstração ---------- */
const FAKE={secretaria:['Organizando a agenda da semana','Respondendo e-mails de clientes','Preparando o resumo do dia'],marketing:['Escrevendo legendas para o Instagram','Montando o calendário editorial','Analisando métricas da semana','Pesquisando tendências'],dev:['Corrigindo um bug no Venora CRM','Revisando código','Acompanhando deploy no Render']};
let demoTimer=null,demoState=[];
function demoTick(){
  demoState=demoState.map(f=>{if(Math.random()<.4){const tr=!f.trabalhando;const opts=FAKE[f.setor]||['Trabalhando'];return{...f,trabalhando:tr,atividade:tr?opts[(Math.random()*opts.length)|0]:null}}return f});
  apply(demoState);demoTimer=setTimeout(demoTick,5000+Math.random()*5000);
}
el('tour').onclick=()=>{
  demo=!demo;el('tour').setAttribute('aria-pressed',demo);clearTimeout(demoTimer);
  if(demo){log('Modo demonstração ligado (atividade simulada)');demoState=funcs.map((f,i)=>({...f,emTurno:true,trabalhando:i%2===0,atividade:i%2===0?(FAKE[f.setor]||['Trabalhando'])[0]:null}));apply(demoState);demoTimer=setTimeout(demoTick,5000)}
  else{log('Modo demonstração desligado');if(real)apply(real.funcionarios)}
  if(selected)openFicha(selected);
};

renderEvents();renderWho();resize();requestAnimationFrame(frame);poll();
})();
