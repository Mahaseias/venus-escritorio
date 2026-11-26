import http from 'node:http';
import {readFileSync} from 'node:fs';
import {timingSafeEqual,createHash} from 'node:crypto';
const page=readFileSync(new URL('./public/index.html',import.meta.url));
const facade=readFileSync(new URL('./public/fachada.jpg',import.meta.url));
const team=JSON.parse(readFileSync(new URL('./public/team.json',import.meta.url)));
const sessions=new Map();
const digest=s=>createHash('sha256').update(s).digest();
http.createServer(async(req,res)=>{
  const path=req.url.split('?')[0];
  function reply(code,data,type='application/json'){res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data)}
  if(req.method==='GET'){
    if(path==='/')return reply(200,page,'text/html; charset=utf-8');
    if(path==='/fachada.jpg')return reply(200,facade,'image/jpeg');
    if(path==='/health')return reply(200,'{"ok":true}');
    if(path==='/api/team'){
      const now=Date.now();
      for(const [k,v] of sessions)if(now-v.time>600000)sessions.delete(k);
      const all=[...sessions.values()];
      return reply(200,JSON.stringify(team.map(a=>{const count=all.filter(s=>s.role===a.id).length;return{...a,active:count>0,count}})));
    }
  }
  if(req.method==='POST'&&path==='/api/event'){
    if(!process.env.OFFICE_TOKEN||!timingSafeEqual(digest(req.headers.authorization||''),digest('Bearer '+process.env.OFFICE_TOKEN)))return reply(401,'{}');
    try{
      let body='';
      for await(const chunk of req){body+=chunk;if(body.length>2048)return reply(413,'{}')}
      const {role,session,active}=JSON.parse(body);
      if(!team.some(a=>a.id===role)||typeof session!=='string'||!/^\w{1,80}$/.test(session)||typeof active!=='boolean')return reply(400,'{}');
      const key=role+':'+session;
      if(active)sessions.set(key,{role,time:Date.now()});else sessions.delete(key);
      return reply(200,'{"ok":true}');
    }catch{return reply(400,'{}')}
  }
  reply(404,'{}');
}).listen(Number(process.env.PORT||3000),'0.0.0.0');
