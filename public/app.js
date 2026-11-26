// Escritório virtual da Venus — motor do mapa, personagens e painel
(()=>{
const el=id=>document.getElementById(id);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function visit(inside){el('exterior').hidden=inside;el('interior').hidden=!inside;(inside?el('back'):el('enter')).focus();if(inside)resize()}
el('enter').onclick=()=>visit(true);el('back').onclick=()=>visit(false);

/* ---------- mapa (grade lógica; 1 casa = 16 px lógicos = 0,5 unidade no 3D) ---------- */
const T=16,COLS=40,ROWS=24,W=COLS*T,H=ROWS*T;
const grid=[...Array(ROWS)].map(()=>Array(COLS).fill(null)); // null = parede
const block=[...Array(ROWS)].map(()=>Array(COLS).fill(false));
const FLOORS=[];
function carve(x1,y1,x2,y2,f){FLOORS.push({x1,y1,x2,y2,f});for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)grid[y][x]=f}
carve(1,3,12,10,'rec');carve(14,3,25,10,'mkt');carve(27,3,38,10,'dev');
carve(6,11,7,11,'cor');carve(19,11,20,11,'cor');carve(32,11,33,11,'cor');   // portas das salas
carve(0,12,38,14,'cor');                                                    // corredor (entrada à esquerda)
carve(10,15,11,16,'cor');carve(29,15,30,16,'cor');                          // portas da copa e da reunião
carve(1,17,20,22,'copa');carve(22,17,38,22,'meet');carve(21,19,21,20,'cor'); // copa, reunião e passagem entre elas

// móveis: m = modelo, x/y = centro em casas, r = giro em graus, s = escala, e = elevação, c = cor do tecido, b = casas bloqueadas
const FURN=[];
const F=(m,x,y,o={})=>FURN.push({m,x,y,...o});
const ROOMS=[
  {name:'Recepção',desks:[3,7,11],plate:[7,11.5]},
  {name:'Estúdio de marketing',desks:[16,20,24],plate:[20,11.5]},
  {name:'Laboratório de software',desks:[29,33,37],plate:[33,11.5]}
];
const DESK_H=.494,SEAT_Y=5.05;
ROOMS.forEach((r,ri)=>r.desks.forEach(cx=>{
  F('desk',cx,3.8,{b:[cx-1,3,cx,4]});F('computerScreen',cx,3.5,{e:DESK_H});F('computerKeyboard',cx-.05,4.15,{e:DESK_H});F('computerMouse',cx+.5,4.15,{e:DESK_H});
  F('chairDesk',cx,SEAT_Y+.1,{r:180,c:['#f0946e','#c78ae0','#4fb8bd'][ri]});
}));
// recepção
F('rugRound',7,7.8,{s:1.7,c:'#7c5bb0'});F('loungeSofa',1.7,8,{r:90,s:1.5,c:'#8d6bc2',b:[1,7,1,9]});F('loungeSofa',4.2,10.3,{r:180,s:1.5,c:'#8d6bc2',b:[3,10,5,10]});
F('pottedPlant',12.4,10.4,{b:[12,10,12,10]});F('pottedPlant',1.5,10.4,{b:[1,10,1,10]});F('cabinetTelevision',12.45,7.5,{r:-90,b:[12,7,12,8]});F('televisionModern',12.45,7.5,{r:-90,e:.4});
F('plantSmall1',12.3,3.5,{e:0,s:2.2,b:[12,3,12,3]});F('coatRackStanding',1.5,5.8,{b:[1,5,1,5]});
// marketing
F('rugRectangle',22.5,8.8,{s:1.5,c:'#c98ad9'});F('loungeDesignChair',21.6,9,{r:160,c:'#e879b9',b:[21,9,21,9]});F('loungeDesignChair',23.8,9.3,{r:200,c:'#f0a35e',b:[23,9,24,9]});
F('tableRound',15.8,8.2,{b:[15,8,16,8]});F('laptop',15.8,8.2,{e:.48,s:.6,r:30});F('lampRoundFloor',14.5,6.3,{b:[14,6,14,6]});
F('pottedPlant',25.4,10.4,{b:[25,10,25,10]});F('pottedPlant',14.5,10.4,{b:[14,10,14,10]});F('bookcaseOpenLow',25.5,6.5,{r:-90,b:[25,6,25,7]});
// software
F('rack',38.4,8,{b:[38,7,38,10]});F('rack',38.4,9.6,{});F('whiteboard',27.15,7.5,{});
F('bookcaseOpen',28,10.5,{r:180,b:[27,10,28,10]});F('books',28,10.5,{e:.62,r:180,s:1.2});
F('loungeDesignChair',31.5,9.4,{r:170,c:'#4a7fd9',b:[31,9,32,9]});F('loungeDesignChair',34.5,9.4,{r:195,c:'#d9534a',b:[34,9,35,9]});F('tableCoffee',33,9.2,{b:[33,9,33,9]});
F('pottedPlant',27.5,5.8,{b:[27,5,27,5]});F('trashcan',36,10.5,{s:.5,b:[36,10,36,10]});
// corredor
F('rugDoormat',1.2,13.5,{r:90,s:1.6});F('pottedPlant',38.4,12.5,{b:[38,12,38,12]});F('benchCushion',14,12.35,{b:[13,12,14,12]});
// copa
F('kitchenFridge',1.8,17.45,{b:[1,17,2,17]});
[['kitchenCabinet',3.3],['kitchenSink',4.4],['kitchenCabinet',5.5],['kitchenCabinetDrawer',6.6]].forEach(([m,x])=>F(m,x,17.5,{}));
block[17][3]=block[17][4]=block[17][5]=block[17][6]=block[17][7]=true;
F('kitchenCoffeeMachine',3.3,17.45,{e:.59});F('kitchenMicrowave',6.6,17.45,{e:.59});F('toaster',5.5,17.45,{e:.59});
F('tableRound',15,18.6,{b:[14,18,15,18]});F('stoolBar',13.3,18.6,{});F('stoolBar',16.7,18.6,{});F('plantSmall2',15,18.6,{e:.48,s:1.4});
F('loungeSofa',4.5,19.5,{s:1.6,c:'#7c5bb0',b:[3,19,5,19]});F('rugRectangle',4.5,21.2,{s:1.5,c:'#c87f5a'});F('tableCoffee',4.5,21.6,{b:[4,21,4,21]});
F('loungeSofa',20.2,21.2,{r:-90,s:1.4,c:'#3f8f9c',b:[20,21,20,22]});F('pottedPlant',1.5,22.4,{b:[1,22,1,22]});F('pottedPlant',20.4,17.5,{b:[20,17,20,17]});
F('televisionModern',17.5,16.5,{e:.5,s:1.5});F('lampSquareFloor',1.5,19.5,{b:[1,19,1,19]});
// reunião
F('table',30,19.9,{s:[4.2,1.3,3.0],b:[27,19,32,20]});
[27.2,29.1,30.9,32.8].forEach(x=>{F('chairModernCushion',x,18.3,{s:1.5});F('chairModernCushion',x,21.5,{r:180,s:1.5})});
F('televisionModern',33.5,16.5,{e:.5,s:2});F('laptop',28.5,19.9,{e:.43,s:.5,r:180});F('laptop',31.5,19.9,{e:.43,s:.5});
F('pottedPlant',22.5,22.4,{b:[22,22,22,22]});F('pottedPlant',38.4,22.4,{b:[38,22,38,22]});F('pottedPlant',38.4,17.5,{b:[38,17,38,17]});F('rugRectangle',30,19.9,{s:[3.4,1,2.6],c:'#3d5a8c'});
FURN.forEach(f=>{if(f.b)for(let y=f.b[1];y<=f.b[3];y++)for(let x=f.b[0];x<=f.b[2];x++)block[y][x]=true});

const ENTRY={x:0,y:13};
const SH={chair:.33,sofa:.36,stool:.52}; // altura dos assentos (unidades 3D)
const IDLE=[
  {x:3,y:18,d:'u',ic:'cafe'},{x:4,y:18,d:'u',ic:'agua'},{x:6,y:18,d:'u',ic:'cafe'},
  {x:13,y:19,d:'r',ic:'papo',sit:1,sh:SH.stool,fx:13.3*T,fy:18.6*T},{x:16,y:19,d:'l',ic:'papo',sit:1,sh:SH.stool,fx:16.7*T,fy:18.6*T},
  {x:3,y:20,d:'d',ic:'zz',sit:1,sh:SH.sofa,fx:3.6*T,fy:19.75*T},{x:4,y:20,d:'d',ic:'zz',sit:1,sh:SH.sofa,fx:4.5*T,fy:19.75*T},{x:5,y:20,d:'d',ic:'zz',sit:1,sh:SH.sofa,fx:5.4*T,fy:19.75*T},
  {x:9,y:20,d:'r',ic:'papo'},{x:10,y:20,d:'l',ic:'papo'},{x:16,y:21,d:'r',ic:'papo'},{x:17,y:21,d:'l',ic:'papo'}
];
const spotPos=s=>({x:s.fx??s.x*T+8,y:s.fy??s.y*T+8});
const noite=()=>{if(/[?&]noite/.test(location.search))return true;if(/[?&]dia/.test(location.search))return false;const h=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Cuiaba',hour:'2-digit',hourCycle:'h23'}).format(new Date()));return h<6||h>=18};
let NIGHT=noite(),nightAt=0;
window.OFFICE={grid,COLS,ROWS,FLOORS,FURN,ROOMS,DESK_H,night:NIGHT};

/* ---------- camada 2D por cima do 3D (nomes e balões) ---------- */
const cv=el('office'),g=cv.getContext('2d');
let ctx=g;
const R=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x|0,y|0,w,h)};

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

function bubble(x,y,kind,t){
  ctx=g;const bx=x+6,by=y-30;
  R(bx,by,14,11,'#2a2340');R(bx+1,by+1,12,9,'#ffffff');R(bx+1,by+10,3,2,'#ffffff');R(bx,by+10,1,3,'#2a2340');R(bx+1,by+12,2,1,'#2a2340');R(bx-1,by+13,2,1,'#2a2340');
  if(kind==='dots'){const n=Math.floor(t/300)%4;for(let i=0;i<3;i++)R(bx+3+i*3,by+5,2,2,i<n?'#6d4fa0':'#d6cde6')}
  else if(kind==='cafe'){R(bx+4,by+4,5,4,'#8a5a3b');R(bx+4,by+4,5,1,'#5b3a26');R(bx+9,by+5,1,2,'#8a5a3b');const s=Math.floor(t/400)%2;R(bx+5+s,by+2,1,1,'#bdb6c9')}
  else if(kind==='agua'){R(bx+6,by+2,2,1,'#3b82c4');R(bx+5,by+3,4,3,'#7cc3f0');R(bx+5,by+6,4,2,'#3b82c4')}
  else if(kind==='zz'){const s=Math.floor(t/500)%2;R(bx+3,by+3+s,4,1,'#6d4fa0');R(bx+5,by+4+s,1,1,'#6d4fa0');R(bx+4,by+5+s,1,1,'#6d4fa0');R(bx+3,by+6+s,4,1,'#6d4fa0');R(bx+9,by+3,2,1,'#9b8fb5');R(bx+10,by+4,1,1,'#9b8fb5');R(bx+9,by+5,2,1,'#9b8fb5')}
  else if(kind==='papo'){R(bx+3,by+3,8,1,'#9b8fb5');R(bx+3,by+5,6,1,'#9b8fb5');R(bx+3,by+7,7,1,'#9b8fb5')}
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
function seatOf(c){const room=ROOMS[roomIdx(c.setor)];if(!room)return null;const cx=room.desks[c.desk];return{tx:cx,ty:5,x:cx*T,y:SEAT_Y*T}}
function makeChar(f,mode){
  const ap=f.aparencia||{},i=funcs.indexOf(f);
  const c={id:f.id,setor:f.setor,desk:deskIdx(f),idx:i,name:primeiro(f.nome),color:corSetor(f.setor),hair:ap.cabelo||'#2b1d17',skin:ap.pele||'#f1c7a5',
    x:ENTRY.x*T+8,y:ENTRY.y*T+8,model:f.modelo,path:[],dir:'r',sit:false,spot:null,final:null,dist:0,leaving:false,nextIdle:0,working:false,arrivedAt:performance.now()};
  if(mode==='place'){
    if(working(f)){const s=seatOf(c);if(s){c.x=s.x;c.y=s.y;c.working=true;c.sit=true;c.dir='u'}}
    else{const s=freeSpot();if(s){c.spot=s;s.by=c;const p=spotPos(s);c.x=p.x;c.y=p.y;c.sit=!!s.sit;c.dir=s.d}}
  }
  return c;
}
function goTile(c,tx,ty,final){const[sx,sy]=tileOf(c);c.path=bfs(sx,sy,tx,ty);c.final=final;c.sit=false;if(reduce){const f=final||{x:tx*T+8,y:ty*T+8};c.x=f.x;c.y=f.y;c.path=[];c.final=null;arrive(c)}}
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
let DPR=1,CW=300,CH=300;
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  const w=el('wrap');CW=Math.max(200,w.clientWidth);CH=Math.max(200,w.clientHeight);
  cv.width=Math.round(CW*DPR);cv.height=Math.round(CH*DPR);
  if(window.V3D)window.V3D.resize(CW,CH,DPR);
}
addEventListener('resize',resize);
new ResizeObserver(()=>resize()).observe(el('wrap'));

let last=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  chars.slice().forEach(c=>plan(c,now));
  chars.slice().forEach(c=>{
    let target=null;
    if(c.path.length){const[tx,ty]=c.path[0];target={x:tx*T+8,y:ty*T+8,tile:true}}
    else if(c.final)target=c.final;
    if(!target)return;
    const dx=target.x-c.x,dy=target.y-c.y,d=Math.hypot(dx,dy),sp=58*dt;
    if(Math.abs(dx)>Math.abs(dy))c.dir=dx<0?'l':'r';else if(Math.abs(dy)>.1)c.dir=dy<0?'u':'d';
    if(d<=sp){c.x=target.x;c.y=target.y;c.dist+=d;if(target.tile){c.path.shift();if(!c.path.length&&!c.final)arrive(c)}else{c.final=null;arrive(c)}}
    else{c.x+=dx/d*sp;c.y+=dy/d*sp;c.dist+=sp}
  });
  draw(now);
  requestAnimationFrame(frame);
}
function roundRect(x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function draw(t){
  const V=window.V3D;
  g.setTransform(DPR,0,0,DPR,0,0);g.clearRect(0,0,CW,CH);g.textAlign='center';g.textBaseline='middle';
  if(!V||!V.ready){g.fillStyle='#a59cb8';g.font='500 14px system-ui,sans-serif';g.fillText(V&&V.error?'Não foi possível carregar o 3D neste navegador.':'Carregando o escritório 3D…',CW/2,CH/2);if(!V)return}
  if(t-nightAt>5000){NIGHT=noite();nightAt=t}
  const on=[];chars.forEach(c=>{if(c.working&&c.sit&&!c.path.length&&!c.final)on.push(roomIdx(c.setor)+':'+c.desk)});
  V.update({night:NIGHT,screens:on,selected,chars:chars.map(c=>({id:c.id,model:c.model,x:c.x/32,z:c.y/32,dir:c.dir,moving:c.path.length>0||!!c.final,sit:c.sit,sh:c.working?SH.chair:(c.spot&&c.spot.sh)||SH.chair}))});
  if(!V.ready)return;
  // placas das salas
  const plate=(txt,x,y)=>{const p=V.project(x/2,.75,y/2);if(p.behind)return;g.font='700 10px system-ui,sans-serif';const w=g.measureText(txt).width+16,h=17;
    g.fillStyle='rgba(20,17,31,.72)';roundRect(p.x-w/2,p.y-h/2,w,h,h/2);g.fill();g.fillStyle='rgba(243,239,250,.95)';g.fillText(txt,p.x,p.y+.5)};
  if(CW>=640){  ROOMS.forEach(r=>plate(r.name.toUpperCase(),r.plate[0],r.plate[1]));plate('COPA',11,15.5);plate('SALA DE REUNIÃO',30,15.5);plate('ENTRADA',.6,11.4);}
  // balões e nomes
  const tags=[];
  chars.forEach(c=>{
    const p=V.project(c.x/32,c.sit?.95:1.08,c.y/32);if(p.behind)return;
    const idle=!c.path.length&&!c.final&&live()&&!c.leaving;
    if(idle&&((c.working&&c.sit)||(c.spot&&t-c.arrivedAt<6000+((c.idx*1300)%4000)))){
      g.save();g.translate(p.x+4,p.y+34);g.scale(1.6,1.6);ctx=g;bubble(0,0,c.working?'dots':c.spot.ic,t);g.restore();
    }
    g.font='600 11px system-ui,sans-serif';
    tags.push({c,w:g.measureText(c.name).width+18,h:17,x:p.x,y:p.y-10});
  });
  tags.sort((a,b)=>b.y-a.y);const placed=[];
  tags.forEach(tg=>{let guard=0;while(guard++<6&&placed.some(p=>Math.abs(p.x-tg.x)<(p.w+tg.w)/2+2&&Math.abs(p.y-tg.y)<(p.h+tg.h)/2+1))tg.y-=tg.h+2;placed.push(tg)});
  g.font='600 11px system-ui,sans-serif';
  tags.forEach(({c,w,h,x,y})=>{
    const sel=selected===c.id;
    g.fillStyle=sel?'rgba(74,56,112,.95)':'rgba(20,17,31,.85)';roundRect(x-w/2,y-h/2,w,h,h/2);g.fill();
    g.strokeStyle=sel?'#c9a6f2':'rgba(255,255,255,.14)';g.lineWidth=1;g.stroke();
    g.fillStyle=!live()||c.leaving?'#6b6480':c.working?'#4ade80':'#fbbf24';g.beginPath();g.arc(x-w/2+8,y,3,0,7);g.fill();
    g.fillStyle='#f3effa';g.textAlign='left';g.fillText(c.name,x-w/2+13,y+.5);g.textAlign='center';
  });
}

/* ---------- retrato (lista e ficha) ---------- */
function avatar(f,scale=3){
  const src=window.V3D&&window.V3D.portrait(f.modelo);
  if(src){const im=new Image();im.src=src;im.className='hdav';im.alt='';im.style.height=26*scale+'px';im.style.width=26*scale*.8+'px';return im}
  return h('div',{class:'inic',style:`width:${20*scale}px;height:${20*scale}px;background:${corSetor(f.setor)};font-size:${7*scale}px`},primeiro(f.nome)[0]);
}
addEventListener('v3d-ready',()=>{resize();renderList();if(selected)openFicha(selected)});

/* ---------- interação no mapa ---------- */
const glc=el('gl');let downAt=null;
function hit(e){const V=window.V3D;if(!V||!V.ready)return null;const b=glc.getBoundingClientRect(),mx=e.clientX-b.left,my=e.clientY-b.top;let best=null,bd=34;
  chars.forEach(c=>{const p=V.project(c.x/32,.45,c.y/32);if(p.behind)return;const d=Math.hypot(p.x-mx,p.y-my);if(d<bd){bd=d;best=c}});return best}
glc.addEventListener('pointerdown',e=>{downAt=[e.clientX,e.clientY]});
glc.addEventListener('pointerup',e=>{if(!downAt||Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>6)return;const c=hit(e);openFicha(c?c.id:null)});
glc.addEventListener('pointermove',e=>{if(!e.buttons)glc.style.cursor=hit(e)?'pointer':'grab'});

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
      h('div',{class:'av'},avatar(f,1.45)),
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
