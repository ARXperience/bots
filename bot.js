// bot.js — interfaz estilo ChatGPT + KB de Centro Digital de Diseño
(function(){
  const ui = {
    messages: document.getElementById('messages'),
    typing: document.getElementById('typing'),
    input: document.getElementById('input'),
    send: document.getElementById('send'),
  };

  const KB = buildKB();
  greet(); // primer mensaje + chips

  ui.send.addEventListener('click', onSend);
  ui.input.addEventListener('keydown', (e)=>{
    if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); onSend(); }
  });

  function onSend(){
    const text = (ui.input.value||'').trim();
    if(!text) return;
    ui.input.value = '';
    render('user', sanitize(text));
    think(()=> render('assistant', reply(text)));
  }

  function greet(){
    const intro = [
      '**Hola, soy el asistente del Centro Digital de Diseño.**',
      'Respondo sobre **servicios**, **proceso**, **tiempos** y **cotización**.',
      'Prueba: “¿Qué servicios ofrecen?”, “Landing + WhatsApp”, “¿Cómo cotizo?”'
    ].join('\n');
    render('assistant', intro);

    const chips = renderChips([
      '¿Qué servicios ofrecen?',
      '¿Diseñan páginas web y tiendas?',
      '¿Automatizan WhatsApp y ManyChat?',
      '¿Cómo es el proceso y los tiempos?',
      '¿Cómo cotizo?'
    ]);
    ui.messages.appendChild(chips);
  }

  function reply(q){
    const qn = norm(q);
    if (/(precio|cu[aá]nto vale|cu[aá]nto cuesta|cotizaci[oó]n|presupuesto)/.test(qn)) return blocks.quote;

    const hit = searchKB(q, KB);
    if (hit.score >= 0.23) return hit.item.answer;
    return blocks.fallback;
  }

  // ---------- Render ----------
  function render(role, md){
    const row = document.createElement('div');
    row.className = `row ${role}`;
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'assistant' ? 'AI' : 'Tú';
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = mdToHTML(md);

    // Botón copiar en bloques <pre>
    bubble.querySelectorAll('pre').forEach(pre=>{
      const head = document.createElement('div');
      head.className = 'code-head';
      head.innerHTML = `<span>código</span>`;
      const btn = document.createElement('button');
      btn.className = 'copy';
      btn.textContent = 'Copiar';
      btn.addEventListener('click', ()=>{
        const code = pre.querySelector('code')?.innerText || pre.innerText;
        navigator.clipboard.writeText(code);
        btn.textContent = 'Copiado ✓';
        setTimeout(()=>btn.textContent='Copiar',1100);
      });
      pre.parentNode.insertBefore(head, pre);
      head.appendChild(btn);
    });

    row.appendChild(avatar);
    row.appendChild(bubble);
    ui.messages.appendChild(row);
    ui.messages.scrollTop = ui.messages.scrollHeight;
  }

  function renderChips(labels){
    const wrap = document.createElement('div');
    wrap.className = 'chips';
    labels.forEach(text=>{
      const b = document.createElement('button');
      b.className = 'chip';
      b.textContent = text;
      b.addEventListener('click', ()=>{
        render('user', sanitize(text));
        think(()=> render('assistant', reply(text)));
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function think(cb){
    ui.typing.style.display = 'flex';
    setTimeout(()=>{ ui.typing.style.display = 'none'; cb(); }, 450 + Math.random()*300);
  }

  // ---------- Mini markdown ----------
  function mdToHTML(md){
    // bloque ``````
    md = md.replace(/```([\s\S]*?)```/g, (_,code)=> `<pre><code>${escapeHTML(code.trim())}</code></pre>`);
    // títulos + negritas + inline code
    md = md
      .replace(/^### (.*)$/gim,'<h3>$1</h3>')
      .replace(/^## (.*)$/gim,'<h2>$1</h2>')
      .replace(/^# (.*)$/gim,'<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/`([^`]+?)`/g,'<code>$1</code>');

    // viñetas simples
    const lines = md.split('\n').map(line=>{
      if (/^\s*-\s+/.test(line)) return `<li>${line.replace(/^\s*-\s+/, '')}</li>`;
      if (/^\s*•\s+/.test(line)) return `<li>${line.replace(/^\s*•\s+/, '')}</li>`;
      if (/^<h\d|^<pre|^<ul|^<li|^<\/li|^<\/ul/.test(line)) return line;
      return line.trim()? `<p>${line}</p>` : '<p style="margin:4px 0"></p>';
    });

    // agrupar <li> en <ul>
    const joined = lines.join('\n').replace(/(?:<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
    return joined;
  }
  function escapeHTML(s){return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function sanitize(s){return s.replace(/\s+/g,' ').trim();}

  // ---------- Búsqueda ligera ----------
  function buildKB(){
    const services =
`### ¿Qué hacemos?
- **Páginas web con IA**: landing, web multipágina y e-commerce orientado a conversión.
- **Branding** (identidad visual).
- **Contenido para redes** (Reels/TikTok/Shorts) con **SEO social**.
- **Automatizaciones** con ManyChat, Make y WhatsApp Business API.
- **Bots de IA** para atención y ventas 24/7.
- **E-commerce y embudos** (optimización, checkout, analítica).
- **Creativos con IA** (foto/video de producto, anuncios).
- **Realidad aumentada (AR)**.
- **Ads (Meta)** y testing A/B.
- **Growth Partner** enfocado en KPIs.`;

    const process =
`### Proceso & tiempos
1) **Diagnóstico** (brief + llamada).  
2) **Plan/MVP** con quick wins.  
3) **Producción por sprints** (web, contenidos, automatizaciones).  
4) **QA + medición** (eventos y dashboards).  
5) **Iteración** con datos.

**Estimados**
- Landing: **1–2 semanas**
- Web multipágina: **3–5 semanas**
- Bot/automatización: **2–10 días**
- Calendario + 4–8 piezas: **1–2 semanas**`;

    const web =
`### Páginas web & tiendas
Diseño moderno, claro y rápido (estructura de conversión, copy y analítica).  
Integración con **WhatsApp/CRM/ManyChat** para capturar y nutrir leads.`;

    const autom =
`### Automatizaciones & Bots de IA
- **ManyChat/WhatsApp**: flujos, segmentación, campañas.
- **Make**: integra formularios, CRMs, Google, Email, Meta, etc.
- **Bots de IA** entrenados con tus textos/FAQs para calificar leads y derivar a humano.`;

    const seoSocial =
`### SEO para redes
- Investigación de temas/preguntas.
- Guiones (gancho → valor → CTA) + **calendario editorial**.
- Copies, hashtags y A/B de ganchos y creatividades.`;

    const portfolio =
`### Portafolio / casos
Experiencia en **decoración (Alma Home)**, **alojamientos (Anfitrión Inteligente)**, **educación cripto (Staking Pro)** y marcas que quieren **automatizar** con IA.`;

    const contact =
`### Contacto & siguientes pasos
1) Te paso un **brief** (3–5 min).  
2) **Llamada de diagnóstico** (15–20 min).  
3) Propuesta con entregables, tiempos y valor.

**Email:** hola@centrodigitaldediseno.com  
**WhatsApp:** +57 000 000 0000`;

    const apps =
`### Apps premium
Asesoramos/gestionamos **apps premium** de terceros.  
> Importante: **no son gratuitas**; tienen costo mensual del proveedor.`;

    return [
      {title:'Servicios', patterns:['servicios','que hacen','qué hacen','ofrecen'], keywords:['web','branding','seo','bots','automatizaciones','ecommerce','ar','ads','growth'], answer:services},
      {title:'Proceso', patterns:['proceso','tiempos','metodologia','mvp','sprints'], keywords:['diagnostico','plan','qa','kpi'], answer:process},
      {title:'Web', patterns:['web','landing','tienda','ecommerce','shopify','woocommerce'], keywords:['conversion','analitica','whatsapp','crm'], answer:web},
      {title:'Automatizaciones', patterns:['automatizar','whatsapp','manychat','make','bot','ia'], keywords:['segmentacion','integraciones','derivar'], answer:autom},
      {title:'SEO social', patterns:['instagram','tiktok','shorts','reels','seo social','calendario'], keywords:['gancho','cta','ab'], answer:seoSocial},
      {title:'Portafolio', patterns:['portafolio','casos','ejemplos','muestras'], keywords:['decoracion','alojamientos','cripto'], answer:portfolio},
      {title:'Contacto', patterns:['contacto','llamada','reunion','agendar','whatsapp','correo','brief'], keywords:['diagnostico','propuesta'], answer:contact},
      {title:'Apps', patterns:['apps','premium','suscripcion','costo'], keywords:['proveedor','mensual'], answer:apps},
      {title:'Cotización', patterns:['precio','cotizacion','presupuesto','cuanto cuesta','cuanto vale'], keywords:['alcance','entregables'], answer:blocks.quote}
    ];
  }

  function searchKB(q, items){
    const qn = norm(q);
    let best = {item:null, score:0};
    for (const item of items){
      const pats=(item.patterns||[]).map(norm), kws=(item.keywords||[]).map(norm);
      let s=0;
      if (norm(item.title).includes(qn)) s+=.18;
      if (norm(item.answer).includes(qn)) s+=.12;
      for (const p of pats) if (qn.includes(p)) s+=.12;
      for (const k of kws) if (qn.includes(k)) s+=.07;
      s += jacc(tokens(qn), new Set([...kws,...pats])) * .23;
      if (s>best.score) best={item,score:s};
    }
    return best;
  }

  // Utilidades
  const norm = s => (s||'').toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/[^a-z0-9áéíóúñü\s]/g,' ')
    .replace(/\s+/g,' ').trim();
  const tokens = s => new Set(norm(s).split(' ').filter(Boolean));
  const jacc = (aSet,bSet)=>{const a=new Set(aSet),b=new Set(bSet);const i=[...a].filter(x=>b.has(x));const u=new Set([...a,...b]);return u.size?i.length/u.size:0;}

  const blocks = {
    quote:
`### Precios & cotización
Trabajamos **por alcance y objetivos**; el valor depende de páginas, integraciones, volumen de contenido y automatizaciones.  
> Nota: las **apps premium** no son gratuitas (costo mensual del proveedor).

**Cómo cotizamos**
1) **Brief** rápido + **llamada** de 15–20 min  
2) Propuesta con **entregables, tiempos y valor**  
3) Alineación y arranque del **Sprint 1**`,
    fallback:
`Puedo ayudarte con **servicios**, **proceso**, **tiempos** y **cotización**.  
Cuéntame tu caso (ej. “landing + automatización de WhatsApp”) y te indico el camino.`
  };
})();
