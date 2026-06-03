// CONFIG - MUDE AQUI
const CONFIG = {
  moeda: 'BRL',
  locale: 'pt-BR',
  habits: ['Economizar dinheiro','Trabalhar','Fazer live','Estudar','Evitar compras impulsivas','Beber água','Dormir cedo'],
  quotes: [
    'Cada real salvo é um passo mais perto do seu carro.',
    'Comprar por impulso rouba dinheiro do seu futuro.',
    'Você não precisa parecer rico. Precisa ficar rico.',
    'Disciplina hoje, liberdade amanhã.',
    'Isso aproxima ou afasta seus objetivos?'
  ]
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = v => Number(v || 0).toLocaleString(CONFIG.locale,{style:'currency',currency:CONFIG.moeda});
const today = () => new Date().toISOString().slice(0,10);

let state = JSON.parse(localStorage.getItem('finanpro-data')) || {
  expenses: [], incomes: [], settings: { monthlyGoal: 0, userName: '' },
  goals: { carTarget: 0, carSaved: 0, travelHotel: 0, travelTransport: 0, travelFood: 0, travelExtras: 0, travelSaved: 0, reserveTarget: 0, reserveCurrent: 0 },
  habits: {}, impulse: { count: 0, saved: 0 }
};

let charts = {};
function save(){ localStorage.setItem('finanpro-data', JSON.stringify(state)); }
function monthOf(d){ return new Date(d + 'T00:00:00').getMonth(); }
function isCurrentMonth(d){ const n = new Date(); const x = new Date(d + 'T00:00:00'); return x.getMonth()===n.getMonth() && x.getFullYear()===n.getFullYear(); }
function sum(arr, key='value'){ return arr.reduce((a,b)=>a+Number(b[key]||0),0); }
function percent(a,b){ return b > 0 ? Math.min(100, Math.round((a/b)*100)) : 0; }

window.addEventListener('load', () => {
  setTimeout(()=>$('#loader').classList.add('hidden'),600);
  initDates(); initNav(); initForms(); initSettings(); initGoals(); initHabits(); initImpulse(); updateAll();
});

function initDates(){ ['expenseDate','incomeDate'].forEach(id => $('#'+id).value = today()); }
function initNav(){
  $$('.menu-item').forEach(btn=>btn.onclick=()=>{ $$('.menu-item').forEach(b=>b.classList.remove('active')); $$('.page').forEach(p=>p.classList.remove('active')); btn.classList.add('active'); $('#'+btn.dataset.page).classList.add('active'); $('#pageTitle').textContent=btn.textContent.replace(/[▣💳🎯⚡📊⚙️]/g,'').trim(); $('#sidebar').classList.remove('open'); });
  $('#mobileMenu').onclick=()=>$('#sidebar').classList.toggle('open');
}

function initForms(){
  $('#expenseForm').onsubmit=e=>{ e.preventDefault(); state.expenses.push({id:Date.now(), value:+$('#expenseValue').value, category:$('#expenseCategory').value, description:$('#expenseDescription').value, date:$('#expenseDate').value, type:$('#expenseType').value}); e.target.reset(); $('#expenseDate').value=today(); save(); updateAll(); };
  $('#incomeForm').onsubmit=e=>{ e.preventDefault(); state.incomes.push({id:Date.now(), value:+$('#incomeValue').value, source:$('#incomeSource').value, description:$('#incomeDescription').value, date:$('#incomeDate').value}); e.target.reset(); $('#incomeDate').value=today(); save(); updateAll(); };
  $('#searchInput').oninput=renderTable;
}
function removeItem(kind,id){ state[kind]=state[kind].filter(i=>i.id!==id); save(); updateAll(); }
window.removeItem = removeItem;

function initSettings(){
  $('#monthlyGoal').value = state.settings.monthlyGoal || '';
  $('#userName').value = state.settings.userName || '';
  $('#saveSettings').onclick=()=>{ state.settings.monthlyGoal=+$('#monthlyGoal').value||0; state.settings.userName=$('#userName').value; save(); updateAll(); alert('Configurações salvas!'); };
  $('#resetAll').onclick=()=>{ if(confirm('Tem certeza que quer zerar tudo?')){ localStorage.removeItem('finanpro-data'); location.reload(); } };
}

function initGoals(){
  Object.keys(state.goals).forEach(k=>{ if($('#'+k)) $('#'+k).value = state.goals[k] || ''; });
  Object.keys(state.goals).forEach(k=>{ if($('#'+k)) $('#'+k).oninput=()=>{ state.goals[k] = +$('#'+k).value || 0; save(); updateAll(); }; });
}

function initHabits(){
  CONFIG.habits.forEach(h=>{ if(!state.habits[h]) state.habits[h]={done:false,streak:0}; });
  save();
}
function toggleHabit(h){ const item=state.habits[h]; item.done=!item.done; item.streak = item.done ? item.streak+1 : Math.max(0,item.streak-1); save(); updateAll(); }
window.toggleHabit = toggleHabit;

function initImpulse(){
  $('#openImpulse').onclick=()=>$('#impulseModal').classList.add('active');
  $('#closeImpulse').onclick=()=>$('#impulseModal').classList.remove('active');
  $('#avoidPurchase').onclick=()=>$('#impulseModal').classList.add('active');
  $('#confirmAvoided').onclick=()=>{ const v=+$('#avoidedValue').value||0; state.impulse.count++; state.impulse.saved += v; $('#avoidedValue').value=''; $('#impulseModal').classList.remove('active'); save(); updateAll(); };
}

function updateAll(){ renderCards(); renderTable(); renderGoals(); renderHabits(); renderImpulse(); renderAnalysis(); renderCharts(); }
function renderCards(){
  const monthExpenses = state.expenses.filter(e=>isCurrentMonth(e.date));
  const monthIncomes = state.incomes.filter(i=>isCurrentMonth(i.date));
  const gastos = sum(monthExpenses), ganhos = sum(monthIncomes);
  const rendaExtra = sum(monthIncomes.filter(i=>i.source !== 'Salário'));
  const saldo = sum(state.incomes) - sum(state.expenses);
  const guardado = (state.goals.carSaved||0)+(state.goals.travelSaved||0)+(state.goals.reserveCurrent||0);
  $('#saldoAtual').textContent=money(saldo); $('#totalGuardado').textContent=money(guardado); $('#gastosMes').textContent=money(gastos); $('#ganhosMes').textContent=money(ganhos); $('#metaMensalCard').textContent=money(state.settings.monthlyGoal); $('#economiaTotal').textContent=money(state.impulse.saved); $('#rendaExtraCard').textContent=money(rendaExtra); $('#reservaCard').textContent=money(state.goals.reserveCurrent);
  const habitPct = percent(Object.values(state.habits).filter(h=>h.done).length, CONFIG.habits.length);
  const savePct = ganhos ? Math.max(0, Math.round(((ganhos-gastos)/ganhos)*100)) : 0;
  const score = Math.min(100, Math.round((habitPct*0.45)+(savePct*0.35)+(state.impulse.count*3)));
  $('#disciplineScore').textContent = score; $('#disciplineBar').style.width = score+'%';
}
function renderTable(){
  const q = ($('#searchInput')?.value || '').toLowerCase();
  const rows = [
    ...state.expenses.map(e=>({...e, kind:'expenses', tipo:'Gasto', cat:e.category})),
    ...state.incomes.map(i=>({...i, kind:'incomes', tipo:'Ganho', cat:i.source}))
  ].sort((a,b)=>new Date(b.date)-new Date(a.date)).filter(r=>JSON.stringify(r).toLowerCase().includes(q));
  $('#financeTable').innerHTML = rows.map(r=>`<tr><td>${r.date}</td><td>${r.tipo}</td><td>${r.cat}</td><td>${r.description||'-'}</td><td class="${r.tipo==='Gasto'?'expense':'value'}">${money(r.value)}</td><td><button class="small-btn" onclick="removeItem('${r.kind}',${r.id})">Remover</button></td></tr>`).join('') || `<tr><td colspan="6">Nenhum lançamento ainda.</td></tr>`;
}
function renderGoals(){
  const carPct=percent(state.goals.carSaved,state.goals.carTarget); $('#carProgress').style.width=carPct+'%'; $('#carText').textContent=carPct+'%'; const faltCar=Math.max(0,state.goals.carTarget-state.goals.carSaved); $('#carForecast').textContent=faltCar?`Faltam ${money(faltCar)} para o Fiat Uno 2014.`:'Meta concluída ou ainda não configurada.';
  const travelTotal=(state.goals.travelHotel||0)+(state.goals.travelTransport||0)+(state.goals.travelFood||0)+(state.goals.travelExtras||0); const travelPct=percent(state.goals.travelSaved,travelTotal); $('#travelProgress').style.width=travelPct+'%'; $('#travelText').textContent=`${travelPct}% • total ${money(travelTotal)}`;
  const reservePct=percent(state.goals.reserveCurrent,state.goals.reserveTarget); $('#reserveProgress').style.width=reservePct+'%'; $('#reserveText').textContent=reservePct+'%'; $('#reserveAlert').textContent = reservePct < 30 ? 'Alerta: sua reserva ainda está baixa.' : reservePct < 100 ? 'Boa! Continue fortalecendo sua segurança.' : 'Reserva completa. Excelente disciplina!';
}
function renderHabits(){ $('#habitsList').innerHTML = CONFIG.habits.map(h=>`<div class="habit ${state.habits[h].done?'done':''}"><div><strong>${h}</strong><br><small>Streak: ${state.habits[h].streak}</small></div><button onclick="toggleHabit('${h}')">${state.habits[h].done?'✓':'+'}</button></div>`).join(''); }
function renderImpulse(){ $('#avoidedCount').textContent=state.impulse.count; $('#savedImpulse').textContent=money(state.impulse.saved); $('#quoteBox').textContent=CONFIG.quotes[Math.floor(Math.random()*CONFIG.quotes.length)]; }
function renderAnalysis(){
  const gastos = sum(state.expenses.filter(e=>isCurrentMonth(e.date))); const ganhos = sum(state.incomes.filter(i=>isCurrentMonth(i.date))); const top = topCategory();
  $('#smartAnalysis').innerHTML = [`${ganhos>gastos?'Você está terminando o mês positivo. Continue assim.':'Cuidado: seus gastos estão iguais ou acima dos ganhos.'}`, `${top?`Maior categoria de gasto: ${top}. Revise se existe impulso nela.`:'Adicione gastos para liberar análise por categoria.'}`, `${state.impulse.count>0?'Você já evitou compras impulsivas. Isso é dinheiro voltando para suas metas.':'Use o sistema anti-gasto antes de compras grandes.'}`].map(t=>`<div>${t}</div>`).join('');
}
function topCategory(){ const map={}; state.expenses.forEach(e=>map[e.category]=(map[e.category]||0)+Number(e.value)); return Object.entries(map).sort((a,b)=>b[1]-a[1])[0]?.[0]; }

function chart(id,type,data,options={}){ if(charts[id]) charts[id].destroy(); charts[id]=new Chart($('#'+id),{type,data,options:{responsive:true,plugins:{legend:{labels:{color:'#eef6ff'}}},scales:type==='doughnut'?{}:{x:{ticks:{color:'#8ea0b8'},grid:{color:'rgba(255,255,255,.06)'}},y:{ticks:{color:'#8ea0b8'},grid:{color:'rgba(255,255,255,.06)'}}},...options}}); }
function renderCharts(){
  const ganhos=sum(state.incomes.filter(i=>isCurrentMonth(i.date))); const gastos=sum(state.expenses.filter(e=>isCurrentMonth(e.date)));
  chart('incomeExpenseChart','bar',{labels:['Ganhos','Gastos','Saldo'],datasets:[{label:'Mês atual',data:[ganhos,gastos,ganhos-gastos],backgroundColor:['#20ff95','#ff4d6d','#2563ff']} ]});
  const cats={}; state.expenses.forEach(e=>cats[e.category]=(cats[e.category]||0)+Number(e.value));
  chart('categoryChart','doughnut',{labels:Object.keys(cats).length?Object.keys(cats):['Zerado'],datasets:[{data:Object.values(cats).length?Object.values(cats):[1],backgroundColor:['#20ff95','#2563ff','#ff4d6d','#f59e0b','#a855f7','#06b6d4','#94a3b8']} ]});
  chart('goalsChart','bar',{labels:['Carro','Viagem','Reserva'],datasets:[{label:'Progresso %',data:[percent(state.goals.carSaved,state.goals.carTarget),percent(state.goals.travelSaved,(state.goals.travelHotel||0)+(state.goals.travelTransport||0)+(state.goals.travelFood||0)+(state.goals.travelExtras||0)),percent(state.goals.reserveCurrent,state.goals.reserveTarget)],backgroundColor:['#20ff95','#2563ff','#8b5cf6']} ]},{scales:{y:{max:100,ticks:{color:'#8ea0b8'},grid:{color:'rgba(255,255,255,.06)'}},x:{ticks:{color:'#8ea0b8'},grid:{color:'rgba(255,255,255,.06)'}}}});
  const months=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const incomeBy=Array(12).fill(0), expenseBy=Array(12).fill(0); state.incomes.forEach(i=>incomeBy[monthOf(i.date)]+=Number(i.value)); state.expenses.forEach(e=>expenseBy[monthOf(e.date)]+=Number(e.value));
  chart('evolutionChart','line',{labels:months,datasets:[{label:'Ganhos',data:incomeBy,borderColor:'#20ff95',backgroundColor:'rgba(32,255,149,.1)',tension:.4},{label:'Gastos',data:expenseBy,borderColor:'#ff4d6d',backgroundColor:'rgba(255,77,109,.1)',tension:.4}]});
  chart('growthChart','line',{labels:months,datasets:[{label:'Saldo mensal',data:incomeBy.map((v,i)=>v-expenseBy[i]),borderColor:'#2563ff',backgroundColor:'rgba(37,99,255,.13)',tension:.4}]});
}
