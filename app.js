let ws, state={hand:[],turn:0,you:0,lastMove:null,opponentCount:0,selected:new Set()};
const $=id=>document.getElementById(id);
function log(t){$('log').innerHTML=`• ${t}<br>`+$('log').innerHTML;}
function send(type,payload={}){ ws?.send(JSON.stringify({type,...payload})); }
function render(){
  $('me').innerHTML=`<h3>Bạn ${state.turn===state.you?'←':''}</h3><div class='cards'>`+state.hand.map((c,i)=>`<span class='card ${state.selected.has(i)?'select':''}' data-i='${i}'>${c.rank}${c.suit}</span>`).join('')+'</div>';
  $('opp').innerHTML=`<h3>Đối thủ ${state.turn!==state.you?'←':''} (${state.opponentCount} lá)</h3><div class='cards'>`+Array.from({length:state.opponentCount}).map(()=>`<span class='card back'>🂠</span>`).join('')+'</div>';
  $('last').innerHTML=state.lastMove?`Bài trên bàn: ${state.lastMove.cards.map(c=>c.rank+c.suit).join(' ')} (${state.lastMove.kind})`:'Bài trên bàn: chưa có';
  document.querySelectorAll('[data-i]').forEach(el=>el.onclick=()=>{const i=Number(el.dataset.i); state.selected.has(i)?state.selected.delete(i):state.selected.add(i); render();});
}
$('create').onclick=()=>{ connect(); send('create',{name:$('name').value||'Bạn'}); };
$('join').onclick=()=>{ connect(); send('join',{code:$('code').value.trim().toUpperCase(),name:$('name').value||'Bạn'}); };
$('start').onclick=()=>send('start');
$('play').onclick=()=>{ if(state.turn!==state.you) return; const cards=[...state.selected].sort((a,b)=>a-b).map(i=>state.hand[i]); send('play',{cards}); state.selected.clear(); };
$('pass').onclick=()=>send('pass');
function connect(){ if(ws) return; ws=new WebSocket(`ws://${location.host}`); ws.onmessage=e=>{const m=JSON.parse(e.data); if(m.type==='created'){ $('room').textContent='Mã phòng: '+m.payload.code; $('code').value=m.payload.code; log('Đã tạo phòng'); }
if(m.type==='state'){ state={...state,...m.payload,selected:new Set()}; $('status').textContent=state.turn===state.you?'Tới lượt bạn':'Đợi đối thủ'; render(); }
if(m.type==='msg'){ log(m.payload); }
if(m.type==='err'){ log('Lỗi: '+m.payload); }
}; }
