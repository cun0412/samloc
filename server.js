const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const RANKS=["3","4","5","6","7","8","9","10","J","Q","K","A","2"],SUITS=["♠","♣","♦","♥"],VAL=Object.fromEntries(RANKS.map((r,i)=>[r,i]));
const app = express();
app.use(express.static('.'));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = new Map();
const randCode=()=>Math.random().toString(36).slice(2,7).toUpperCase();
const card=(rank,suit)=>({rank,suit,v:VAL[rank]});
const deck=()=>RANKS.flatMap(r=>SUITS.map(s=>card(r,s)));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}};
const sort=h=>h.sort((a,b)=>a.v-b.v||SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit));
function classify(cards){ cards=[...cards].sort((a,b)=>a.v-b.v); const n=cards.length,same=cards.every(c=>c.rank===cards[0].rank); if(n===1)return{kind:"single",high:cards[n-1].v,cards}; if(n===2&&same)return{kind:"pair",high:cards[n-1].v,cards}; if(n===3&&same)return{kind:"triple",high:cards[n-1].v,cards}; if(n===4&&same)return{kind:"four",high:cards[n-1].v,cards}; if(n>=3){ if(cards.some(c=>c.rank==='2')) return null; for(let i=1;i<n;i++) if(cards[i-1].v+1!==cards[i].v) return null; return{kind:'straight',high:cards[n-1].v,len:n,cards};} return null; }
const canBeat=(m,p)=>!p|| (m.kind==='four'&&p.kind==='single'&&p.cards[0].rank==='2') || (m.kind===p.kind && (m.kind!=='straight'||m.len===p.len) && m.high>p.high);

function send(ws, type, payload){ ws.send(JSON.stringify({type,payload})); }
function broadcast(room,type,payload){ room.players.forEach(p=> send(p.ws,type,payload)); }

function startGame(room){
  const d=deck(); shuffle(d);
  room.hands=room.players.map(()=>sort(d.splice(0,10)));
  room.lastMove=null; room.pass=0;
  room.turn=room.hands[0][0].v<=room.hands[1][0].v?0:1;
  room.started=true;
  room.players.forEach((p,i)=>send(p.ws,'state',{you:i,turn:room.turn,lastMove:room.lastMove,opponentCount:room.hands[1-i].length,hand:room.hands[i]}));
  broadcast(room,'msg',`Bắt đầu ván: ${room.players[room.turn].name} đi trước`);
}

wss.on('connection', ws=>{
  ws.on('message', raw=>{
    let m; try{ m=JSON.parse(raw);}catch{return; }
    if(m.type==='create'){
      const code=randCode(); rooms.set(code,{code,players:[{ws,name:m.name||'P1'}],started:false}); send(ws,'created',{code});
    }
    if(m.type==='join'){
      const room=rooms.get(m.code); if(!room) return send(ws,'err','Không tìm thấy phòng');
      if(room.players.length>=2) return send(ws,'err','Phòng đã đủ 2 người');
      room.players.push({ws,name:m.name||'P2'});
      broadcast(room,'msg','Đủ người, chủ phòng bấm Bắt đầu');
    }
    if(m.type==='start'){
      const room=[...rooms.values()].find(r=>r.players[0].ws===ws); if(!room) return;
      if(room.players.length!==2) return send(ws,'err','Cần 2 người');
      startGame(room);
    }
    if(m.type==='play'){
      const room=[...rooms.values()].find(r=>r.players.some(p=>p.ws===ws)&&r.started); if(!room) return;
      const i=room.players.findIndex(p=>p.ws===ws); if(i!==room.turn) return;
      const hand=room.hands[i]; const cards=m.cards.map(c=>hand.find(h=>h.rank===c.rank&&h.suit===c.suit)).filter(Boolean);
      if(cards.length!==m.cards.length) return send(ws,'err','Bài không hợp lệ');
      const mv=classify(cards); if(!mv||!canBeat(mv,room.lastMove)) return send(ws,'err','Nước đi không hợp lệ');
      if(cards.length===hand.length&&cards[0].rank==='2') return send(ws,'err','Không được về nhất bằng 2');
      cards.forEach(c=>hand.splice(hand.findIndex(x=>x.rank===c.rank&&x.suit===c.suit),1));
      room.lastMove=mv; room.pass=0;
      if(hand.length===0){ broadcast(room,'msg',`${room.players[i].name} thắng!`); room.started=false; return; }
      room.turn=1-room.turn;
      room.players.forEach((p,idx)=>send(p.ws,'state',{you:idx,turn:room.turn,lastMove:room.lastMove,opponentCount:room.hands[1-idx].length,hand:room.hands[idx]}));
    }
    if(m.type==='pass'){
      const room=[...rooms.values()].find(r=>r.players.some(p=>p.ws===ws)&&r.started); if(!room) return;
      const i=room.players.findIndex(p=>p.ws===ws); if(i!==room.turn) return; if(!room.lastMove) return send(ws,'err','Không thể bỏ lượt lúc mở vòng');
      room.pass++; if(room.pass>=1){ room.lastMove=null; room.pass=0; }
      room.turn=1-room.turn;
      room.players.forEach((p,idx)=>send(p.ws,'state',{you:idx,turn:room.turn,lastMove:room.lastMove,opponentCount:room.hands[1-idx].length,hand:room.hands[idx]}));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log(`http://localhost:${PORT}`));
