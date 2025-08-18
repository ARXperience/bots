// bot.js — UI estilo GPT5 + KB CDD
function initAssistant(opts={mode:'embedded'}) {
  const ui = {
    messages: document.getElementById('messages'),
    typing: document.getElementById('typing'),
    input: document.getElementById('input'),
    send: document.getElementById('send'),
    chips: document.getElementById('chips'),
    chat: document.getElementById('chat'),
    fab: document.getElementById('fab'),
    panel: document.getElementById('panel'),
  };

  // Modo flotante (clona chat)
  if (opts.mode === 'floating') {
    const clone = ui.chat.cloneNode(true);
    ui.panel.appendChild(clone);
    ui.panel.classList.add('open');
    ui.chat.style.display = 'none';
    // Re-map refs
    ui.messages = ui.panel.querySelector('#messages');
    ui.typing   = ui.panel.querySelector('#typing');
    ui.input    = ui.panel.querySelector('#input');
    ui.send     = ui.panel.querySelector('#send');
    ui.chips    = ui.panel.querySelector('#chips');
    ui.fab.style.display = 'grid';
    ui.panel.classList.remove('open');
    ui.fab.addEventListener('click', ()=> ui.panel.classList.toggle('open'));
  }

  const KB = buildKB();
  const state = { history: [] };

  greet();

  // Handlers
  ui.send.addEventListener('click', onSend);
  ui.input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  });
  ui.chips.querySelectorAll('[data-q]').forEach(btn => {
    btn.addEventListener('click', ()=> handleUser(btn.dataset.q));
  });

  function greet(){
    const msg = [
      '**Hola, soy tu asistente de Centro Digital de Diseño.**',
      'Te ayudo con **servicios**, **proceso**, **tiempos** y **cotizaciones**.',
      'Ejemplos: “¿Qué servicios ofrecen?”, “Necesito landing + WhatsApp”, “¿Cuánto tardan?”'
    ].join('\n');
    render('bot', msg);
  }

  function onSend(){
    const text = (ui.input.value || '').trim();
    if (!text) return;
    handleUser(text);
  }

  function handleUser(text){
    ui.input.value = '';
    render('user', text);
    typeOn();
    setTimeout(() => {
      const answer = reply(text);
      typeOff();
      render('bot', answer);
    }, 450 + Math.random()*250); // breve delay para realismo
  }

  function reply(q){
    // precio / cotización directo
    const qn = norm(q);
    if (/(precio|cu[aá]nto vale|cu[aá]nto cuesta|cotizaci[oó]n|presupuesto)/.test(qn)) {
      return blocks.quote;
    }
    const hit = searchKB(q, KB);
    if (hit.score >= 0.22) return hit.item.answer;
    return blocks.fallback;
  }

  // ---------- KB ----------
  function buildKB(){
    const services =
`### ¿Qué hacemos?
- **Páginas web con IA**: landing, web multipágina y e-commerce orientado a conversión.
- **Branding**: identidad visual y lineamientos.
- **Contenido para redes** (Reels/TikTok/Shorts) con **SEO social**.
- **Automatizaciones** con ManyChat, Make y WhatsApp Business API.
- **Bots de IA** para atención y ventas 24/7.
- **E-commerce y embudos**: optimización de tienda, checkout, analítica.
- **Creativos con IA**: foto/video de producto, anuncios.
- **Realidad aumentada (AR)** para campañas.
- **Ads (Meta)** y testing A/B.
- **Growth Partner**: consultoría orientada a KPIs.`;

    const process =
`### Proceso & tiempos
1. **Diagnóstico**: objetivos y audiencia (brief + llamada).
2. **Plan & prioridades**: MVP + quick wins.
3. **Producción por sprints**: web, contenidos y automatizaciones.
4. **QA & medición**: eventos y dashboards básicos.
5. **Iteración** con datos.

**Estimados**  
- Landing: **1–2 semanas**  
- Web multipágina: **3–5 semanas**  
- Bot/automatización: **2–10 días**  
- Calendario + 4–8 piezas: **1–2 semanas**  
*(depende del alcance e integraciones)*`;

    const web =
`### Páginas web & tiendas
Diseño moderno, claro y rápido, con estructura de conversión, buen copy y analítica.  
Integración con **WhatsApp/CRM/ManyChat** para capturar y nutrir leads.`;

    const autom =
`### Automatizaciones & Bots de IA
- **ManyChat/WhatsApp**: flujos, segmentación y campañas.  
- **Make**: integra formularios, CRMs, Google, Email, Meta, etc.  
- **Bots de IA** entrenados con tus textos/FAQs para calificar leads y derivar a humano.`;

    const seoSocial =
`### SEO para redes
- Investigación de temas y preguntas.  
- Guiones (gancho → valor → CTA) y **calendario editorial**.  
- Copies, hashtags y A/B de ganchos/creatividades.`;

    const portfolio =
`### Portafolio / casos
Ejemplos en **decoración (Alma Home)**, **alojamientos (Anfitrión Inteligente)**, **educación cripto (Staking Pro)** y negocios que buscan **automatizar**.  
Cuéntame tu industria y te comparto ejemplos relevantes.`;

    const contact =
`### Contacto & siguientes pasos
1) Te paso un **brief** (3–5 min).  
2) **Llamada de diagnóstico** (15–20 min).  
3) Propuesta con entregables, tiempos y valor.

**Email:** hola@centrodigitaldediseno.com  
**WhatsApp:** +57 000 000 0000 *(actualiza tu número)*`;

    const apps =
`### Apps premium
Gestionamos/asesoramos **apps premium** de terceros.  
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

  // ---------- Motor de búsqueda ligero ----------
  function searchKB(q, items){
    const qn = norm(q);
    let best = {item:null, score:0};
    for (const item of items){
      const pats = (item.patterns||[]).map(norm);
      const kws  = (item.keywords||[]).map(norm);
      let s=0;
      if (norm(item.title).includes(qn)) s+=.2;
      if (norm(item.answer).includes(qn)) s+=.15;
      for (const p of pats) if (qn.includes(p)) s+=.12;
      for (const k of kws)  if (qn.includes(k)) s+=.07;
      s += jacc(tokens(qn), new Set([...kws,...pats])) * .22;
      if (s>best.score) best={item,score:s};
    }
    return best;
  }
  const norm = s => (s||'').toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')
    .replace(/[^a-z0-9áéíóúñü\s]/g,' ')
    .replace(/\s+/g,' ').trim();
  const tokens = s => new Set(norm(s).split(' ').filter(Boolean));
  const jacc = (aSet,bSet)=>{const a=new Set(aSet),b=new Set(bSet);const i=[...a].filter(x=>b.has(x));const u=new Set([...a,...b]);return u.size?i.length/u.size:0;}

  // ---------- Bloques comunes ----------
  const blocks = {
    quote:
`### Precios & cotización
Trabajamos **por alcance y objetivos**; el valor depende de páginas, integraciones, volumen de contenido y automatizaciones.  
> Nota: las **apps premium** no son gratuitas (costo mensual del proveedor).

**Cómo cotizamos**
1) **Brief** rápido + **llamada** de 15–20 min  
2) Propuesta con **entregables, tiempos y valor**  
3) Alineación y arranque del **Sprint 1**

¿Te paso el brief y agendamos?`,
    fallback:
`Puedo ayudarte con **servicios**, **proceso**, **tiempos** y **cotización**.  
Cuéntame tu caso (ej. “landing + automatización de WhatsApp”) y te indico el camino.`
  };

  // ---------- Render con Markdown + code copy ----------
  function render(role, content){
    const row = document.createElement('div');
    row.className = `msg ${role}`;
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = role === 'bot' ? 'AI' : 'Tú';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = mdToHTML(content);

    // Añadir botones de copiar a bloques <pre><code>
    bubble.querySelectorAll('pre').forEach(pre=>{
      const header = document.createElement('div');
      header.className = 'code-header';
      header.innerHTML = `<span>bloque de código</span>`;
      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = 'Copiar';
      btn.addEventListener('click', ()=>{
        const code = pre.querySelector('code')?.innerText || pre.innerText;
        navigator.clipboard.writeText(code);
        btn.textContent = 'Copiado ✓';
        setTimeout(()=>btn.textContent='Copiar',1200);
      });
      pre.parentNode.insertBefore(header, pre);
      header.appendChild(btn);
    });

    row.appendChild(avatar);
    row.appendChild(bubble);
    ui.messages.appendChild(row);
    ui.messages.scrollTop = ui.messages.scrollHeight;
  }

  function typeOn(){ ui.typing.style.display='flex'; }
  function typeOff(){ ui.typing.style.display='none'; }

  // Mini markdown parser (titulares, negritas, listas y code)
  function mdToHTML(md){
    let html = md
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+?)`/g, '<code>$1</code>');
    // listas
    html = html.replace(/^\s*-\s+(.*)$/gim, '• $1');
    html = html.split('\n').map(line=>{
      if (line.startsWith('• ')) return `<li>${line.slice(2)}</li>`;
      return `<p>${line}</p>`;
    }).join('\n');
    // bloques de código con ```lang
    html = html.replace(/<p>```([\s\S]*?)```<\/p>/g, (m,code)=>`<pre><code>${escapeHTML(code.trim())}</code></pre>`);
    return html;
  }
  function escapeHTML(str){return str.replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[m]));}
}
