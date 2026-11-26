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
  if(c.sit&&c.working){const k=Math.floor(t/1000+c.idx*7)%14;key=(sp.sit2&&k===0)?'sit2':(Math.floor(t/260+c.idx)%2?'sit1':'sit0');dy=19}
  else if(c.sit&&c.dir==='d'){key='sofa';dy=1}
  else{
    let d=c.dir;if(d==='u'&&!sp.up0)d=c.lastSide||'r';
    const base=d==='d'?'down':d==='u'?'up':'side';flip=d==='l';
    if(moving){key=base+[1,0,2,0][Math.floor(c.dist/6)%4]}
    else key=(base==='down'&&sp.blink&&Math.floor(t/140+c.idx*17)%36===0)?'blink':base+'0';
  }
  const f=sp[key]||sp.down0,[sx,sy,w,h,ax]=f,K=SPR._scale||1,dw=w/K,dh=h/K,da=ax/K;
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(x-6,y+dy-1,12,2);ctx.fillRect(x-5,y+dy+1,10,1);
  // o boneco é guardado em alta resolução e reduzido aqui com suavização de qualidade
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  if(flip){ctx.translate(x,0);ctx.scale(-1,1);ctx.drawImage(ATLAS,sx,sy,w,h,-da,y+dy-dh,dw,dh)}
  else ctx.drawImage(ATLAS,sx,sy,w,h,x-da,y+dy-dh,dw,dh);
  ctx.restore();
  c._h=dh-dy;
}

/* ---------- mapa ---------- */
const T=16,COLS=40,ROWS=24,W=COLS*T,H=ROWS*T;
const grid=[...Array(ROWS)].map(()=>Array(COLS).fill(null)); // null = parede
const block=[...Array(ROWS)].map(()=>Array(COLS).fill(false));
function carve(x1,y1,x2,y2,f){for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)grid[y][x]=f}
function solid(x1,y1,x2,y2){for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)block[y][x]=true}
carve(1,2,12,11,'rec');carve(14,2,25,11,'mkt');carve(27,2,38,11,'dev');
carve(1,13,38,14,'cor');carve(0,13,0,14,'cor');
carve(6,12,7,12,'cor');carve(19,12,20,12,'cor');carve(32,12,33,12,'cor');
carve(1,16,20,22,'copa');carve(22,16,38,22,'meet');
carve(10,15,11,15,'cor');carve(23,15,24,15,'cor');

const ROOMS=[
  {name:'RECEPÇÃO',x:1,w:12,desks:[2,6,10]},
  {name:'ESTÚDIO DE MARKETING',x:14,w:12,desks:[15,19,23]},
  {name:'LABORATÓRIO DE SOFTWARE',x:27,w:12,desks:[28,32,36]}
];
const DESK_Y=3,SEAT_Y=4;
ROOMS.forEach(r=>r.desks.forEach(x=>solid(x,DESK_Y,x+1,DESK_Y)));

/* mobília fixa (bloqueios) */
// recepção
solid(1,2,1,2);solid(12,2,12,2);           // plantas
solid(2,10,5,10);                          // sofá visitantes (encosto)
solid(11,10,12,11);                        // planta grande
// marketing
solid(18,7,20,8);                          // mesa redonda
solid(14,10,14,11);solid(25,10,25,11);     // plantas
solid(25,2,25,2);solid(14,5,15,6);
// dev
solid(37,7,38,11);                         // racks
solid(27,10,28,11);                        // estante
solid(27,2,27,2);
// copa
solid(1,16,7,16);solid(9,16,9,16);solid(1,17,1,18); // bancada, bebedouro, geladeira
solid(13,18,14,19);                        // mesa redonda
solid(2,19,5,19);solid(3,21,4,22);         // sofá + mesinha
solid(15,19,18,19);                        // sofá 2
solid(20,16,20,16);solid(1,22,1,22);solid(20,22,20,22);
// reunião
solid(26,18,34,19);solid(22,16,22,16);solid(38,16,38,16);solid(38,22,38,22);solid(22,22,22,22);

const ENTRY={x:0,y:13};
const IDLE=[
  {x:3,y:17,d:'u',ic:'cafe'},{x:5,y:17,d:'u',ic:'cafe'},{x:9,y:17,d:'u',ic:'agua'},
  {x:12,y:18,d:'r',ic:'papo',sit:1},{x:15,y:19,d:'l',ic:'papo',sit:1},
  {x:3,y:20,d:'d',ic:'zz',sit:1},{x:4,y:20,d:'d',ic:'zz',sit:1},
  {x:16,y:20,d:'d',ic:'zz',sit:1},{x:17,y:20,d:'d',ic:'zz',sit:1},
  {x:8,y:20,d:'r',ic:'papo'},{x:9,y:20,d:'l',ic:'papo'}
];

/* ---------- utilidades de desenho ---------- */
const stat=document.createElement('canvas');stat.width=W;stat.height=H;
const sg=stat.getContext('2d');
const cv=el('office'),g=cv.getContext('2d');
let ctx=sg;
const R=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x|0,y|0,w,h)};
const hash=(x,y)=>{let h=x*374761393+y*668265263;h=(h^(h>>13))*1274126177;return((h^(h>>16))>>>0)/4294967295};

/* ---------- pisos ---------- */
const FLOOR={
  rec(x,y,tx,ty){const off=(ty%2)*8;for(let r=0;r<4;r++){const c=['#c99f72','#c19566','#cca577','#bf9263'][(r+tx+ty)%4];R(x,y+r*4,16,4,c);R(x,y+r*4+3,16,1,'#a97f55');const s=(off+r*5+tx*3)%16;R(x+s,y+r*4,1,3,'#ae845a')}},
  mkt(x,y,tx,ty){R(x,y,16,16,'#8f7cb2');for(let i=0;i<16;i+=4)for(let j=0;j<16;j+=4)if(((i+j)/4+tx+ty)%2===0)R(x+i+1,y+j+1,1,1,'#9a88bc');if(hash(tx,ty)>.85)R(x+6,y+7,2,1,'#8572a8')},
  dev(x,y,tx,ty){R(x,y,16,16,(tx+ty)%2?'#394252':'#343c4b');R(x,y,16,1,'#2c3340');R(x,y,1,16,'#2c3340');R(x+1,y+1,14,1,'rgba(255,255,255,.04)')},
  cor(x,y,tx,ty){R(x,y,16,16,'#cbc4b7');R(x,y+15,16,1,'#b6ae9f');R(x+15,y,1,16,'#b6ae9f');if(hash(tx,ty)>.7)R(x+3+((hash(ty,tx)*8)|0),y+5,2,1,'#c0b8aa')},
  copa(x,y,tx,ty){for(let c=0;c<4;c++){R(x+c*4,y,4,16,['#d8b88a','#cfae7f','#dcbe92','#d2b183'][(c+tx)%4]);R(x+c*4+3,y,1,16,'#bf9d6f');const s=((ty*7+c*5+tx)%16);R(x+c*4,y+s,3,1,'#c4a274')}},
  meet(x,y,tx,ty){R(x,y,16,16,'#4c5f80');for(let i=0;i<16;i+=2)R(x,y+i,16,1,(i/2+ty)%2?'#51658a':'#4a5c7c')}
};

/* ---------- desenho estático ---------- */
function wallFace(x,y){R(x,y,16,16,'#e9e3f1');R(x,y,16,2,'#f5f1fa');R(x,y+9,16,4,'#ddd4ea');R(x,y+13,16,3,'#7c6c96');R(x,y+13,16,1,'#8f80a8')}
function wallTop(x,y){R(x,y,16,16,'#2a2340');R(x,y,16,1,'#3a3156')}
function windowOn(tx,ty){const x=tx*T,y=ty*T;R(x+1,y+2,30,10,'#6f6189');R(x+2,y+3,28,8,'#9fc6e8');R(x+2,y+3,28,3,'#c3dcf2');R(x+16,y+3,1,8,'#6f6189');R(x+4,y+4,6,1,'rgba(255,255,255,.6)');R(x,y+12,32,1,'#c9bfd8')}
function plant(tx,ty){const x=tx*T,y=ty*T;R(x+4,y+15,9,1,'rgba(0,0,0,.18)');R(x+5,y+10,6,5,'#a85b3a');R(x+4,y+9,8,2,'#c06c46');R(x+3,y+3,10,7,'#3f8a4e');R(x+5,y+1,6,4,'#4fa25e');R(x+2,y+5,3,3,'#357a43');R(x+11,y+4,3,4,'#357a43');R(x+6,y+2,2,2,'#6cc07a');R(x+9,y+5,2,1,'#6cc07a')}
function bigPlant(tx,ty){const x=tx*T,y=ty*T;R(x+8,y+29,16,2,'rgba(0,0,0,.18)');R(x+10,y+22,12,8,'#8b4d33');R(x+9,y+21,14,2,'#a75e3e');
  [[4,8,12,10,'#2f7040'],[14,4,12,12,'#3f8a4e'],[8,0,10,10,'#4fa25e'],[2,14,10,8,'#357a43'],[18,12,12,9,'#357a43'],[12,8,8,6,'#5fb46e']].forEach(([a,b,w,h,c])=>R(x+a,y+b,w,h,c))}
function desk(tx,ty){const x=tx*T,y=ty*T;R(x+1,y+15,30,2,'rgba(0,0,0,.2)');R(x+1,y+3,30,12,'#9a6a45');R(x+1,y+3,30,2,'#b37d53');R(x+1,y+13,30,2,'#6e4a30');R(x+2,y+15,2,1,'#5a3c27');R(x+28,y+15,2,1,'#5a3c27');
  R(x+14,y+5,4,3,'#2a2d36');R(x+8,y-4,16,10,'#1d2029');R(x+11,y+9,10,3,'#d4d7df');R(x+11,y+9,10,1,'#eceef3');R(x+24,y+8,3,3,'#efeaf5');R(x+27,y+9,1,1,'#efeaf5');R(x+3,y+6,6,5,'#f3efe6');R(x+4,y+7,4,1,'#bdb6c9');R(x+4,y+9,3,1,'#bdb6c9')}
function sofaBack(tx,ty,w,col,dark){const x=tx*T,y=ty*T;R(x-1,y+3,w*T+2,14,dark);R(x,y+4,w*T,10,col);for(let i=1;i<w;i++)R(x+i*T,y+5,1,8,dark)}
function sofaSeat(tx,ty,w,col,dark){const x=tx*T,y=ty*T;R(x-2,y+1,w*T+4,12,dark);R(x,y,w*T,11,col);R(x,y,w*T,2,'rgba(255,255,255,.15)');R(x-3,y-12,4,24,dark);R(x+w*T-1,y-12,4,24,dark);R(x,y+13,w*T,2,'rgba(0,0,0,.2)')}
function rug(tx,ty,w,h,a,b){const x=tx*T,y=ty*T;R(x,y,w*T,h*T,b);R(x+3,y+3,w*T-6,h*T-6,a);R(x+5,y+5,w*T-10,h*T-10,b);R(x+6,y+6,w*T-12,h*T-12,a)}
function roundTable(tx,ty,top,edge){const x=tx*T,y=ty*T;R(x+4,y+28,24,3,'rgba(0,0,0,.18)');R(x+6,y+4,20,22,edge);R(x+4,y+6,24,18,edge);R(x+7,y+5,18,19,top);R(x+5,y+7,22,15,top);R(x+9,y+7,6,2,'rgba(255,255,255,.25)')}
function shelf(tx,ty,w,h){const x=tx*T,y=ty*T;R(x,y,w*T,h*T,'#5d4030');R(x+1,y+1,w*T-2,h*T-2,'#6f4d38');const cols=['#c25b5b','#5b8bc2','#e0b44c','#6ab07a','#9b6bd6','#e48a4a','#e6e1d6'];for(let r=0;r<h*2;r++){const yy=y+3+r*8;R(x+1,yy+5,w*T-2,2,'#4a3224');let xx=x+2;let i=r*3+tx;while(xx<x+w*T-4){const bw=2+((hash(i,r)*3)|0);R(xx,yy,bw,5,cols[i%cols.length]);xx+=bw+1;i++}}}
function rack(tx,ty,h){const x=tx*T,y=ty*T;R(x,y,16,h*T,'#1b1e26');R(x+1,y+1,14,h*T-2,'#262b36');for(let i=0;i<h*4;i++){R(x+2,y+3+i*4,12,3,'#323946');R(x+3,y+4+i*4,6,1,'#1b1e26')}}
function counter(tx,ty,w){const x=tx*T,y=ty*T;R(x,y,w*T,16,'#8c7764');R(x,y,w*T,9,'#e8e3db');R(x,y+9,w*T,1,'#bfb6aa');for(let i=0;i<w;i++)R(x+i*T+7,y+11,2,3,'#6e5c4c')}
function coffeeMachine(tx,ty){const x=tx*T,y=ty*T;R(x+3,y-6,10,13,'#2b2b31');R(x+4,y-5,8,3,'#45454f');R(x+6,y+1,4,4,'#151518');R(x+7,y+4,2,2,'#f2efe9');R(x+10,y-4,1,1,'#ef4444')}
function sink(tx,ty){const x=tx*T,y=ty*T;R(x+2,y+1,12,6,'#aeb6c2');R(x+3,y+2,10,4,'#c9d0da');R(x+7,y-1,2,3,'#8a93a0')}
function microwave(tx,ty){const x=tx*T,y=ty*T;R(x+1,y-5,14,10,'#d6d6dc');R(x+2,y-4,9,7,'#2a2f3a');R(x+12,y-4,2,7,'#a9a9b2')}
function cooler(tx,ty){const x=tx*T,y=ty*T;R(x+3,y+15,10,1,'rgba(0,0,0,.2)');R(x+3,y+4,10,11,'#e9eaee');R(x+4,y-6,8,10,'#7cc3f0');R(x+5,y-5,2,8,'#a8dcfa');R(x+6,y-8,4,2,'#4d9fd6');R(x+6,y+7,4,2,'#3b82c4')}
function fridge(tx,ty){const x=tx*T,y=ty*T;R(x+1,y-4,14,36,'#d7dbe2');R(x+2,y-3,12,34,'#eef0f4');R(x+2,y+9,12,1,'#b8bec9');R(x+11,y,1,6,'#9aa2af');R(x+11,y+12,1,8,'#9aa2af')}
function tv(tx,ty,w){const x=tx*T,y=ty*T;R(x+2,y+1,w*T-4,11,'#15161c');R(x+3,y+2,w*T-6,9,'#22283a')}
function whiteboard(tx,ty,w){const x=tx*T,y=ty*T;R(x+2,y+1,w*T-4,11,'#9aa1ad');R(x+3,y+2,w*T-6,9,'#f7f8fb');}
function pic(tx,ty,c1,c2){const x=tx*T,y=ty*T;R(x+3,y+2,10,9,'#6b4a33');R(x+4,y+3,8,7,c1);R(x+5,y+6,6,3,c2)}
function chairDecor(tx,ty,dir,col){const x=tx*T,y=ty*T;R(x+3,y+4,10,9,col);if(dir==='d')R(x+3,y+1,10,4,'#2f3446');else R(x+3,y+11,10,4,'#2f3446')}
function stool(tx,ty){const x=tx*T,y=ty*T;R(x+4,y+6,8,7,'#4b3a2c');R(x+5,y+6,6,5,'#c6553f')}
function logoRug(tx,ty){const x=tx*T,y=ty*T;R(x,y,64,48,'#3b2c55');R(x+2,y+2,60,44,'#4a3870');const cx=x+32,cy=y+24;for(let i=0;i<14;i++){R(cx-i,cy-14+i,i*2,1,'#9b6bd6');R(cx-i,cy+14-i,i*2,1,'#9b6bd6')}for(let i=0;i<7;i++){R(cx-i,cy-7+i,i*2,1,'#d8bff5');R(cx-i,cy+7-i,i*2,1,'#d8bff5')}}
function lamp(tx,ty){const x=tx*T,y=ty*T;R(x+7,y+2,2,12,'#2b2b31');R(x+4,y-3,8,6,'#f4e1b3');R(x+5,y+13,6,2,'#2b2b31')}
function beanbag(tx,ty,c){const x=tx*T,y=ty*T;R(x+2,y+4,12,10,c);R(x+1,y+6,14,7,c);R(x+4,y+5,6,3,'rgba(255,255,255,.2)')}
function mat(tx,ty){const x=tx*T,y=ty*T;R(x+2,y+1,12,30,'#5b4636');R(x+3,y+2,10,28,'#6e5642')}

function buildStatic(){
  ctx=sg;
  R(0,0,W,H,'#1a1527');
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
    const f=grid[y][x],px=x*T,py=y*T;
    if(f)FLOOR[f](px,py,x,y);
    else if(y+1<ROWS&&grid[y+1][x])wallFace(px,py);
    else wallTop(px,py);
  }
  // sombras sob paredes
  for(let y=1;y<ROWS;y++)for(let x=0;x<COLS;x++)if(grid[y][x]&&!grid[y-1][x])R(x*T,y*T,16,3,'rgba(0,0,0,.14)');
  for(let y=0;y<ROWS;y++)for(let x=1;x<COLS;x++)if(grid[y][x]&&!grid[y][x-1])R(x*T,y*T,2,16,'rgba(0,0,0,.10)');
  // janelas
  [[2,1],[8,1],[15,1],[21,1],[28,1],[34,1]].forEach(([a,b])=>windowOn(a,b));
  // placas das salas
  ROOMS.forEach(r=>{const cx=(r.x+r.w/2)*T;R(cx-30,13*T-14,60,11,'#3a3156');R(cx-29,13*T-13,58,9,'#4a3e6b')});
  ROOMS.forEach(r=>r.desks.forEach(x=>desk(x,DESK_Y)));
  // ---- recepção
  logoRug(5,6);plant(1,2);plant(12,2);bigPlant(11,10);
  // ---- marketing
  whiteboard(24,1,1);pic(18,1,'#f0b27a','#e06a6a');
  roundTable(18,7,'#b88558','#7d5434');R(18*T+10,7*T+9,10,7,'#2a2d36');R(18*T+11,7*T+10,8,4,'#6d8fc2');R(19*T+6,7*T+16,6,5,'#f3efe6');R(18*T+22,7*T+18,3,3,'#efeaf5');
  plant(14,10);plant(14,11);plant(25,10);plant(25,11);plant(25,2);
  lamp(15,8);bigPlant(14,5);
  pic(16,1,'#f0b27a','#e06a6a');pic(17,1,'#82d9db','#9b6bd6');pic(22,1,'#e5a5ee','#ffb38e');
  R(24*T+4,T+3,8,2,'#e06a6a');R(24*T+4,T+6,6,1,'#5b8bc2');R(24*T+4,T+8,7,1,'#9b6bd6');
  beanbag(22,8,'#e5a5ee');beanbag(23,9,'#ffb38e');rug(21,8,3,2,'#a691c9','#8a74b0');beanbag(22,8,'#e5a5ee');beanbag(23,9,'#c97a9a');
  // ---- dev
  whiteboard(31,1,2);[[4,10,'#2f6fb0'],[6,14,'#3a9a5b'],[6,8,'#c2635a'],[4,12,'#2f6fb0']].forEach(([a,w,c],i)=>R(31*T+a+(i%2)*2,T+3+i*2,w,1,c));R(33*T,T+3,10,6,'#d6dbe6');R(33*T+2,T+5,6,1,'#9b6bd6');rack(37,7,5);rack(38,7,5);shelf(27,10,2,2);plant(27,2);
  beanbag(29,8,'#4a6fa5');beanbag(31,9,'#c2635a');
  // ---- corredor
  mat(0,13);
  // ---- copa
  counter(1,16,7);coffeeMachine(3,16);sink(5,16);microwave(6,16);cooler(9,16);fridge(1,17);
  tv(14,15,2);pic(17,15,'#7cc3f0','#4fa25e');
  roundTable(13,18,'#f2e6d3','#b48b5e');
  stool(12,18);stool(15,19);
  rug(2,20,4,3,'#c87f5a','#a86444');
  sofaBack(2,19,4,'#7c5bb0','#5b4285');
  R(3*T+2,21*T+3,28,22,'#7a5236');R(3*T+3,21*T+4,26,18,'#966746');R(3*T+8,21*T+8,6,4,'#eae3d6');
  sofaBack(15,19,4,'#3f7f8c','#2e5f69');
  plant(20,16);plant(1,22);plant(20,22);
  // ---- reunião
  tv(29,15,4);
  for(let i=27;i<=33;i+=2){chairDecor(i,17,'d','#4a4f63');chairDecor(i,20,'u','#4a4f63')}
  R(26*T,18*T+2,9*T,28,'#5a3e2b');R(26*T+1,18*T+3,9*T-2,24,'#8a5f40');R(26*T+1,18*T+3,9*T-2,3,'#a3734f');
  R(28*T,18*T+10,10,7,'#f2efe6');R(31*T,18*T+12,4,4,'#efeaf5');R(33*T,18*T+9,12,8,'#1d2029');
  plant(22,16);plant(38,16);plant(38,22);plant(22,22);
  // sofá visitante recepção (encosto + assento)
  sofaBack(2,10,4,'#9b6bd6','#6f4aa3');
}

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
  ROOMS.forEach((room,ri)=>room.desks.forEach((dx,i)=>{
    const x=dx*T+9,y=DESK_Y*T-3,role=setores[ri];
    const on=chars.some(c=>c.setor===role?.id&&c.working&&c.sit&&c.desk===i);
    if(!on){R(x,y,14,8,'#141820');R(x+1,y+1,4,1,'#1f2531');R(x+12,y+7,1,1,'#2e3a4f');return}
    R(x,y,14,8,'#0f1a2a');const col=role.cor;const off=Math.floor(t/220+i*3);
    for(let r=0;r<4;r++){const w=3+((hash(r+off,i+ri)*9)|0);R(x+1+((r+off)%3),y+1+r*2,w,1,r%2?col:'#8fb3d9')}
    if(Math.floor(t/500)%2)R(x+12,y+6,1,1,'#ffffff');
  }));
  // LEDs dos racks
  for(let i=0;i<20;i++){const rx=(i<10?37:38)*T+10,ry=7*T+4+(i%10)*8;const on=hash(i,Math.floor(t/350))>.45;R(rx,ry,1,1,on?'#4ade80':'#14351f');R(rx+2,ry,1,1,hash(i+9,Math.floor(t/600))>.6?'#60a5fa':'#16243a')}
  // TV da copa
  const tvx=14*T+3,tvy=15*T+2,ph=Math.floor(t/1800)%3;R(tvx,tvy,26,9,['#2b3c63','#3a2b5c','#24484f'][ph]);R(tvx+3,tvy+2,8,1,'#d8bff5');R(tvx+3,tvy+4,14,1,'#8a7fa8');R(tvx+3,tvy+6,10,1,'#8a7fa8');
  // TV reunião
  const mx=29*T+3,my=15*T+2;R(mx,my,58,9,'#1c2236');R(mx+4,my+2,10,5,'#9b6bd6');R(mx+16,my+4,4,3,'#82d9db');R(mx+22,my+3,4,4,'#e5a5ee');R(mx+28,my+2,4,5,'#ffb38e');R(mx+40,my+2,14,1,'#8a7fa8');R(mx+40,my+5,10,1,'#8a7fa8');
  // céu nas janelas conforme horário
  const h=new Date().getHours()+new Date().getMinutes()/60;
  const sky=h<5.5||h>19?['#1f2a4a','#2c3a63']:h<7||h>17.5?['#f2a271','#f7c69b']:['#9fc6e8','#c3dcf2'];
  [[2,1],[8,1],[15,1],[21,1],[28,1],[34,1]].forEach(([a,b])=>{const x=a*T,y=b*T;R(x+2,y+3,14,8,sky[0]);R(x+17,y+3,13,8,sky[0]);R(x+2,y+3,14,3,sky[1]);R(x+17,y+3,13,3,sky[1]);R(x+4,y+4,5,1,'rgba(255,255,255,.5)')});
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
function seatOf(c){const room=ROOMS[roomIdx(c.setor)];if(!room)return null;const dx=room.desks[c.desk];return{tx:dx,ty:SEAT_Y,x:dx*T+16,y:SEAT_Y*T+11}}
function makeChar(f,mode){
  const ap=f.aparencia||{},i=funcs.indexOf(f);
  const c={id:f.id,setor:f.setor,desk:deskIdx(f),idx:i,name:primeiro(f.nome),color:corSetor(f.setor),hair:ap.cabelo||'#2b1d17',skin:ap.pele||'#f1c7a5',
    x:ENTRY.x*T+8,y:ENTRY.y*T+13,path:[],dir:'r',sit:false,spot:null,final:null,dist:0,leaving:false,nextIdle:0,working:false,arrivedAt:performance.now()};
  if(mode==='place'){
    if(working(f)){const s=seatOf(c);if(s){c.x=s.x;c.y=s.y;c.working=true;c.sit=true;c.dir='u'}}
    else{const s=freeSpot();if(s){c.spot=s;s.by=c;c.x=s.x*T+8;c.y=s.y*T+13;c.sit=!!s.sit;c.dir=s.d}}
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
function toIdle(c,now){const s=freeSpot();release(c);if(s){c.spot=s;s.by=c;goTile(c,s.x,s.y,{x:s.x*T+8,y:s.y*T+13})}c.nextIdle=now+20000+Math.random()*25000}
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
  g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;
  g.drawImage(stat,0,0,W,H,0,0,cv.width,cv.height);
  g.setTransform(S,0,0,S,0,0);g.imageSmoothingEnabled=false;
  ctx=g;
  screens(t);
  const seats=[];
  ROOMS.forEach((room,ri)=>room.desks.forEach((dx,i)=>{
    const occ=chars.find(c=>c.setor===setores[ri]?.id&&c.working&&c.sit&&c.desk===i);
    seats.push({x:dx*T+16,y:SEAT_Y*T+11,occ,col:setores[ri]?.cor||'#888'});
  }));
  const items=[];
  seats.forEach(s=>{if(!s.occ)items.push({y:s.y,f:()=>chairBack(s.x,s.y,s.col,false)})});
  chars.forEach(c=>items.push({y:c.y+(c.sit&&c.working?19:0),f:()=>{
    ctx=g;
    if(selected===c.id){R(Math.round(c.x)-7,Math.round(c.y)-1,14,3,'rgba(201,166,242,.7)')}
    drawChar(c,t);
    if(c.sit&&c.working&&!spriteOk(c.id)){const s=seats.find(s=>s.occ===c);if(s)chairBack(s.x,s.y,s.col,true)}
  }}));
  items.push({y:20*T+12,f:()=>{ctx=g;sofaSeat(2,20,4,'#8d6bc2','#5b4285');sofaSeat(15,20,4,'#4a919f','#2e5f69')}});
  items.push({y:11*T+12,f:()=>{ctx=g;sofaSeat(2,11,4,'#ad80e6','#6f4aa3')}});
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
  g.font=`700 ${Math.round(fs*.78)}px system-ui,sans-serif`;g.textAlign='center';g.textBaseline='middle';
  ROOMS.forEach(r=>{const cx=(r.x+r.w/2)*T*S,cy=(13*T-8.5)*S;g.fillStyle='#e9def8';g.fillText(r.name.length>14?r.name.split(' ').pop():r.name,cx,cy)});
  g.fillStyle='rgba(233,222,248,.75)';g.font=`700 ${Math.round(fs*.75)}px system-ui,sans-serif`;
  g.fillText('COPA',4*T*S,23*T*S+8*S);g.fillText('SALA DE REUNIÃO',30*T*S,23*T*S+8*S);g.fillText('ENTRADA',1.6*T*S,12.3*T*S);
  const now=new Date(),hh=String(now.getHours()).padStart(2,'0'),mm=String(now.getMinutes()).padStart(2,'0');
  g.fillStyle='#2a2340';g.fillRect(36*T*S,12*T*S+3*S,24*S,10*S);g.fillStyle='#82d9db';g.font=`700 ${Math.round(fs*.85)}px ui-monospace,monospace`;g.fillText(hh+':'+mm,(36*T+12)*S,(12*T+8)*S);
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
  if(full)renderTaskBox(f);
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
  if(!list.length){ul.append(h('li',{class:'muted small'},'Nenhuma tarefa ainda.'));return}
  list.forEach(t=>{
    const[lab,cls]=ST[t.status]||[t.status,'q'];
    const li=h('li',{'data-id':t.id,class:open.has(t.id)?'open':''},
      h('div',{class:'trow'},h('span',{class:'tag '+cls},lab),h('span',{class:'tt'},t.titulo),h('time',{},fmtDia(t.concluida||t.iniciada||t.criada))),
      h('div',{class:'tbody'},h('p',{class:'muted small'},`Pedido por ${t.autor} · ${fmtDia(t.criada)}`),h('pre',{},t.texto),t.resultado?h('div',{},h('b',{class:'small'},'Resultado'),h('pre',{class:'res'},t.resultado)):'',
        t.status==='fila'?h('button',{class:'ghost sm',onclick:async ev=>{ev.stopPropagation();try{await api(`/api/tasks/${t.id}/cancelar`,{});loadTasks(selected)}catch(e){alert(e.message)}}},'Cancelar'):''));
    li.querySelector('.trow').onclick=()=>li.classList.toggle('open');
    ul.append(li);
  });
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

buildStatic();renderEvents();renderWho();resize();requestAnimationFrame(frame);poll();
})();
