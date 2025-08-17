// Studio Chatbot – lógica principal (separada del HTML)
// Autor: ChatGPT
// Notas:
// - Todo corre en el navegador (sin backend)
// - Usa TF‑IDF + coseno para buscar ejemplos similares
// - Guarda dataset y prompt en localStorage

(function(){
  'use strict';

  // ===== Helpers =====
  const $ = (id) => document.getElementById(id);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  const tokenize = (s)=> (s||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9áéíóúñü\s]/g,' ')
    .split(/\s+/).filter(Boolean);

  function buildTfIdf(userTexts){
    const docs = userTexts.map(t => tokenize(t));
    const df = new Map();
    const vocab = new Map();
    let vid = 0;
    // DF y vocab
    docs.forEach(tokens=>{
      const seen = new Set();
      tokens.forEach(tok=>{
        if(!vocab.has(tok)) vocab.set(tok, vid++);
        if(!seen.has(tok)){
          seen.add(tok);
          df.set(tok, (df.get(tok)||0)+1);
        }
      })
    });
    const N = docs.length;
    // Vectores TF-IDF normalizados
    const vectors = docs.map(tokens=>{
      const counts = new Map();
      tokens.forEach(t=>counts.set(t,(counts.get(t)||0)+1));
      const vec = new Float32Array(vocab.size);
      let norm=0;
      counts.forEach((c,tok)=>{
        const id = vocab.get(tok);
        const tf = c / tokens.length;
        const idf = Math.log((N+1)/((df.get(tok)||1))) + 1; // suavizado
        const val = tf * idf;
        vec[id] = val; norm += val*val;
      });
      norm = Math.sqrt(norm)||1;
      for(let i=0;i<vec.length;i++) vec[i]/=norm;
      return vec;
    });
    function vectorize(text){
      const tokens = tokenize(text);
      const counts = new Map();
      tokens.forEach(t=>counts.set(t,(counts.get(t)||0)+1));
      const vec = new Float32Array(vocab.size);
      let norm=0;
      counts.forEach((c,tok)=>{
        if(!vocab.has(tok)) return;
        const id = vocab.get(tok);
        const idf = Math.log((N+1)/((df.get(tok)||1))) + 1;
        const tf = c / tokens.length;
        const val = tf*idf; vec[id]=val; norm+=val*val;
      });
      norm = Math.sqrt(norm)||1;
      for(let i=0;i<vec.length;i++) vec[i]/=norm;
      return vec;
    }
    return {vectors, vectorize};
  }

  const cos = (a,b)=>{
    let s=0; const L=Math.min(a.length,b.length);
    for(let i=0;i<L;i++) s += a[i]*b[i];
    return s; // ya normalizados
  }

  // ===== Estado global =====
  const state = {
    systemPrompt: localStorage.getItem('sysPrompt') || 'Eres un asistente que responde breve y claramente en español. Si no tienes información suficiente, pide más detalles.',
    examples: JSON.parse(localStorage.getItem('examples')||'[]'),
    model: null,
  }

  // ===== Inicialización cuando el DOM esté listo =====
  document.addEventListener('DOMContentLoaded', () => {
    // DOM refs
    const systemPrompt = $('systemPrompt');
    const examplesList = $('examplesList');
    const count = $('count');

    // Precarga demo si no hay ejemplos
    if(state.examples.length===0){
      state.examples.push(
        {user:'¿Cuáles son sus horarios?', assistant:'Atendemos de lunes a sábado de 8:00 a.m. a 6:00 p.m. Los domingos estamos cerrados.'},
        {user:'¿Tienen servicio a domicilio?', assistant:'No ofrecemos servicio a domicilio. Si necesitas trasladar tu vehículo, te recomendamos gestionar la grúa con tu aseguradora o podemos sugerirte un proveedor de confianza.'},
        {user:'¿Cómo agendo una cita?', assistant:'Puedes agendar desde la web en el botón “Reservar”. El sistema solo muestra horarios disponibles y se sincroniza con Google Calendar.'}
      );
      persistExamples();
    }

    // Pintar estado inicial
    if(systemPrompt) systemPrompt.value = state.systemPrompt;
    renderExamples();
    buildEmbedSnippet();

    // ==== Listeners de UI panel izquierdo ====
    on($('btnAdd'), 'click', addExample);
    on($('btnTrain'), 'click', train);
    on($('btnClear'), 'click', clearAll);
    on($('btnExport'), 'click', exportJSON);
    on($('btnImport'), 'click', importFile);
    on(systemPrompt, 'input', () => {
      state.systemPrompt = systemPrompt.value;
      localStorage.setItem('sysPrompt', state.systemPrompt);
    });

    // Eventos delegados para editar/eliminar ejemplos
    on(examplesList, 'click', (e)=>{
      const t = e.target;
      if(!(t instanceof HTMLElement)) return;
      const del = t.getAttribute('data-del');
      const edit = t.getAttribute('data-edit');
      if(del!==null){ state.examples.splice(+del,1); renderExamples(); toast('Ejemplo eliminado','warn'); return; }
      if(edit!==null){
        const ex = state.examples[+edit];
        const u = prompt('Editar Usuario:', ex.user); if(u===null) return;
        const a = prompt('Editar Asistente:', ex.assistant); if(a===null) return;
        state.examples[+edit] = {user:u, assistant:a};
        renderExamples(); toast('Ejemplo actualizado','ok');
      }
    });

    // ==== Probador de chat ====
    on($('send'), 'click', () => handleAsk('ask','chatlog'));
    on($('ask'), 'keydown', (e)=>{ if((e.ctrlKey||e.metaKey)&&e.key==='Enter') $('send').click(); });

    // ==== Mini widget ====
    on($('launcher'), 'click', ()=>{
      const m = $('mini'); if(!m) return;
      m.classList.toggle('show');
    });
    on($('closeMini'), 'click', ()=>{ const m=$('mini'); if(m) m.classList.remove('show'); });
    on($('miniSend'), 'click', ()=> handleAsk('miniAsk','miniLog'));
    on($('miniAsk'), 'keydown', (e)=>{ if((e.ctrlKey||e.metaKey)&&e.key==='Enter') $('miniSend').click(); });

    // ==== Funciones de UI ====
    function renderExamples(){
      if(!examplesList) return;
      examplesList.innerHTML = '';
      state.examples.forEach((ex,idx)=>{
        const div = document.createElement('div');
        div.className='item';
        div.innerHTML = `
          <div class="badge"></div>
          <div>
            <div class="small muted">Usuario</div>
            <div>${escapeHTML(ex.user)}</div>
            <div class="small muted mt8">Asistente</div>
            <div>${escapeHTML(ex.assistant)}</div>
          </div>
          <div class="row">
            <button class="ghost small" data-edit="${idx}">Editar</button>
            <button class="ghost small" data-del="${idx}">Eliminar</button>
          </div>`;
        examplesList.appendChild(div);
      })
      if(count) count.textContent = `${state.examples.length} ejemplo${state.examples.length===1?'':'s'}`;
      persistExamples();
    }

    function addExample(){
      const u = $('exUser')?.value.trim();
      const a = $('exBot')?.value.trim();
      if(!u || !a){ alert('Completa ambos campos'); return; }
      state.examples.push({user:u, assistant:a});
      if($('exUser')) $('exUser').value='';
      if($('exBot')) $('exBot').value='';
      renderExamples();
      toast('Ejemplo agregado','ok');
    }

    function train(){
      if(state.examples.length===0){ alert('Agrega ejemplos primero'); return; }
      state.model = buildTfIdf(state.examples.map(e=>e.user));
      const s = $('modelStatus'); if(s) s.textContent='Entrenado';
      toast('Modelo entrenado (local)','ok');
    }

    function clearAll(){
      if(!confirm('¿Borrar todo (prompt y ejemplos)?')) return;
      state.examples = []; renderExamples();
      state.systemPrompt = 'Eres un asistente que responde breve y claramente en español. Si no tienes información suficiente, pide más detalles.';
      if(systemPrompt) systemPrompt.value = state.systemPrompt;
      state.model = null; const s=$('modelStatus'); if(s) s.textContent='Sin entrenar';
      localStorage.removeItem('examples'); localStorage.removeItem('sysPrompt');
      toast('Estado reiniciado','warn');
    }

    function exportJSON(){
      const blob = new Blob([JSON.stringify({systemPrompt:state.systemPrompt, examples:state.examples}, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'dataset_chatbot.json'; a.click();
    }

    async function importFile(){
      const input = $('file');
      const f = input && input.files && input.files[0];
      if(!f){ alert('Selecciona un archivo'); return; }
      const text = await f.text();
      try{
        let imported = [];
        if(f.name.endsWith('.json')){
          const j = JSON.parse(text);
          if(Array.isArray(j)) imported = j; else if(Array.isArray(j.examples)) imported = j.examples;
        }else{ imported = csvToPairs(text); }
        const cleaned = imported.filter(r=>r && r.user && r.assistant);
        state.examples.push(...cleaned);
        renderExamples();
        toast(`Importados ${cleaned.length} ejemplos`,'ok');
      }catch(err){
        console.error(err); alert('Archivo inválido');
      }
    }

    function handleAsk(inputId, logId){
      const inp = $(inputId); const log = $(logId);
      if(!inp || !log) return;
      const q = inp.value.trim(); if(!q) return; inp.value='';
      pushChat(log, q, 'user');
      const {text, used} = answer(q);
      pushChat(log, text, 'bot');
      if(logId==='chatlog' && used && used.length){
        const hint = document.createElement('div');
        hint.className='small muted';
        hint.textContent = `Contexto similar usado: `+ used.map(u=>`[${u.score}] "${u.user}"`).join('  ');
        log.appendChild(hint); log.scrollTop = log.scrollHeight;
      }
    }

    // ===== Motor de respuesta =====
    function answer(query){
      const topk = clamp(parseInt($('topk')?.value||'2',10),1,5);
      const thr = clamp(parseFloat($('threshold')?.value||'0.35'),0,1);
      if(!state.model){ return { text:'Aún no estoy entrenado. Ve al panel y pulsa "Entrenar".', used: [] } }
      const qv = state.model.vectorize(query);
      const sims = state.model.vectors.map((v,i)=>({i, s: cos(qv,v)})).sort((a,b)=>b.s-a.s);
      const picked = sims.slice(0, topk).filter(x=>x.s>=thr);
      if(picked.length===0){
        return { text: fallback(query), used: [] };
      }
      const best = state.examples[picked[0].i];
      const composed = composeWithSystem(best.assistant);
      return { text: composed, used: picked.map(p=>({score:+p.s.toFixed(3), user:state.examples[p.i].user})) };
    }

    function composeWithSystem(answer){
      const sp = (state.systemPrompt||'').trim();
      if(!sp) return answer;
      return `${answer}\n\n_${sp.replace(/\n+/g,' ')}_`;
    }

    function fallback(){
      return `No tengo información suficiente para responder eso todavía. ¿Puedes dar más contexto o agregar ejemplos al dataset?`;
    }

    // ===== Utilidades UI =====
    function pushChat(container, text, who='bot'){
      const div = document.createElement('div');
      div.className = `bubble ${who==='user'?'user':'bot'}`;
      div.textContent = text; container.appendChild(div); container.scrollTop = container.scrollHeight;
    }

    function persistExamples(){
      localStorage.setItem('examples', JSON.stringify(state.examples));
    }

    function csvToPairs(csv){
      const lines = csv.split(/\r?\n/).filter(Boolean);
      const head = lines.shift().split(',').map(s=>s.trim().toLowerCase());
      const ui = head.indexOf('user'); const ai = head.indexOf('assistant');
      if(ui===-1||ai===-1) throw new Error('CSV debe incluir columnas user,assistant');
      return lines.map(l=>{
        const cols = l.split(',');
        return {user: cols[ui]?.trim()||'', assistant: cols[ai]?.trim()||''}
      });
    }

    function buildEmbedSnippet(){
      const pre = $('embedSnippet'); if(!pre) return;
      const snippet = `<!-- Pega este bloque en tu web (antes de </body>) -->\n<div id=\"launcher\" style=\"position:fixed;right:16px;bottom:16px;width:56px;height:56px;border-radius:50%;background:#6c8cff;color:#fff;display:grid;place-items:center;box-shadow:0 10px 30px rgba(0,0,0,.35);cursor:pointer;z-index:9999\">💬</div>\n<div id=\"mini\" style=\"position:fixed;right:16px;bottom:86px;width:360px;max-width:92vw;height:520px;display:none;grid-template-rows:auto 1fr auto;background:#151a33;border:1px solid rgba(255,255,255,.08);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.35);overflow:hidden;z-index:9999\">\n  <div style=\"padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.1);font-weight:700;color:#e6e9ff\">Asistente</div>\n  <div id=\"miniLog\" style=\"padding:10px;overflow:auto;color:#e6e9ff\"></div>\n  <div style=\"display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.1)\">\n    <input id=\"miniAsk\" style=\"flex:1;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(5,8,18,.6);color:#e6e9ff\" placeholder=\"Pregunta aquí...\"/>\n    <button id=\"miniSend\" style=\"padding:10px 12px;border-radius:10px;border:1px solid rgba(108,140,255,.5);background:rgba(108,140,255,.2);color:#fff\">Enviar</button>\n  </div>\n</div>\n<script>\n(function(){\n  function tokenize(s){return (s||\'\').toLowerCase().normalize(\'NFD\').replace(/[\\u0300-\\u036f]/g,\'\').replace(/[^a-z0-9áéíóúñü\\s]/g,\' \').split(/\\s+/).filter(Boolean)}\n  function buildTfIdf(userTexts){\n    const docs=userTexts.map(t=>tokenize(t)), df=new Map(), vocab=new Map(); let vid=0;\n    docs.forEach(ts=>{const seen=new Set(); ts.forEach(t=>{if(!vocab.has(t))vocab.set(t,vid++); if(!seen.has(t)){seen.add(t); df.set(t,(df.get(t)||0)+1)}})});\n    const N=docs.length; const vectors=docs.map(tokens=>{const counts=new Map(); tokens.forEach(t=>counts.set(t,(counts.get(t)||0)+1)); const vec=new Float32Array(vocab.size); let norm=0; counts.forEach((c,t)=>{const id=vocab.get(t); const tf=c/tokens.length; const idf=Math.log((N+1)/((df.get(t)||1)))+1; const val=tf*idf; vec[id]=val; norm+=val*val}); norm=Math.sqrt(norm)||1; for(let i=0;i<vec.length;i++) vec[i]/=norm; return vec});\n    function vectorize(text){const tokens=tokenize(text); const counts=new Map(); tokens.forEach(t=>counts.set(t,(counts.get(t)||0)+1)); const vec=new Float32Array(vocab.size); let norm=0; counts.forEach((c,t)=>{if(!vocab.has(t))return; const id=vocab.get(t); const idf=Math.log((N+1)/((df.get(t)||1)))+1; const tf=c/tokens.length; const val=tf*idf; vec[id]=val; norm+=val*val}); norm=Math.sqrt(norm)||1; for(let i=0;i<vec.length;i++) vec[i]/=norm; return vec} return {vectors, vectorize};\n  }\n  function cos(a,b){let s=0; const L=Math.min(a.length,b.length); for(let i=0;i<L;i++) s+=a[i]*b[i]; return s}\n  const dataset = JSON.parse(localStorage.getItem(\'examples\')||\'[]\');\n  const model = dataset.length? buildTfIdf(dataset.map(e=>e.user)) : null;\n  const sys = (localStorage.getItem(\'sysPrompt\')||\'\').trim();\n  const thr = 0.35; const topk=2;\n  function respond(q){\n    if(!model) return 'Aún no estoy entrenado en esta página.';\n    const qv = model.vectorize(q); const sims = model.vectors.map((v,i)=>({i,s:cos(qv,v)})).sort((a,b)=>b.s-a.s);\n    const p = sims.slice(0, topk).filter(x=>x.s>=thr); if(!p.length) return 'No tengo datos para eso aún.';\n    const best = dataset[p[0].i].assistant; return sys? best+\"\\n\\n_\"+sys.replace(/\\n+/g,' ')+\"_\": best;\n  }\n  function push(c,t,w){const b=document.createElement('div'); b.style.maxWidth='80%'; b.style.padding='10px 12px'; b.style.borderRadius='14px'; b.style.margin='6px 0'; if(w==='user'){b.style.alignSelf='flex-end'; b.style.background='rgba(108,140,255,.18)'; b.style.border='1px solid rgba(108,140,255,.45)'} else {b.style.alignSelf='flex-start'; b.style.background='rgba(34,211,238,.12)'; b.style.border='1px solid rgba(34,211,238,.45)'} b.textContent=t; c.appendChild(b); c.scrollTop=c.scrollHeight }\n  const launcher=document.getElementById('launcher'); const mini=document.getElementById('mini'); const log=document.getElementById('miniLog'); const ask=document.getElementById('miniAsk'); const send=document.getElementById('miniSend');\n  launcher&&launcher.addEventListener('click',()=>{ mini.style.display = mini.style.display==='grid'?'none':'grid'; });\n  send&&send.addEventListener('click',()=>{ const q=ask.value.trim(); if(!q) return; ask.value=''; push(log,q,'user'); const a=respond(q); push(log,a,'bot'); });\n  ask&&ask.addEventListener('keydown',e=>{ if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){ send.click(); } });\n})();\n</script>`;
      pre.textContent = snippet;
    }

    function escapeHTML(s){
      return (s||'').replace(/[&<>"])/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
    }

    function clamp(v,min,max){ v=isNaN(v)?min:v; return Math.max(min, Math.min(max, v)); }

    function toast(msg, tone='ok'){
      const t = document.createElement('div');
      t.textContent = msg; t.style.position='fixed'; t.style.left='50%'; t.style.top='18px'; t.style.transform='translateX(-50%)';
      t.style.padding='10px 14px'; t.style.background='rgba(0,0,0,.65)'; t.style.border=`1px solid rgba(255,255,255,.18)`; t.style.borderRadius='10px';
      t.style.color = '#fff'; t.style.backdropFilter='blur(6px)'; t.style.zIndex='99999';
      document.body.appendChild(t); setTimeout(()=>t.remove(), 2000);
    }
  });
})();
