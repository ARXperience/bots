// bot.js — versión PRO (Markdown + Copiar + Typing + Persistencia)
const msgs  = document.getElementById('messages');
const input = document.getElementById('input');
const send  = document.getElementById('send');
const typing= document.getElementById('typing');
const clear = document.getElementById('clear');

const STORAGE_KEY = 'cdd_chat_history_v1';

// === Base de conocimiento (con CTA integrado) ===
const CTA = "\n\n**Contáctanos:** WhatsApp +57 000 000 0000 · hola@centrodigitaldediseno.com";
const KB = {
  servicios:
    "### ¿Qué hacemos?\n- **Páginas web con IA** (landing, multipágina, e-commerce).\n- **Branding** (identidad visual).\n- **Contenido para redes** (Reels/TikTok/Shorts) con **SEO social**.\n- **Automatizaciones** (ManyChat, Make, WhatsApp Business API).\n- **Bots de IA** para atención y ventas 24/7.\n- **E-commerce & embudos** (checkout, analítica).\n- **Creativos con IA** (foto/video de producto, anuncios).\n- **AR** y **Ads (Meta)**.\n- **Growth Partner** enfocado en KPIs." + CTA,

  web:
    "### Páginas web & tiendas\nDiseño moderno, rápido y orientado a conversión (estructura, copy, analítica).\nIntegración con **WhatsApp/CRM/ManyChat** para capturar y nutrir leads." + CTA,

  automat:
    "### Automatizaciones & Bots de IA\n- **ManyChat/WhatsApp**: flujos, segmentación, campañas.\n- **Make**: integra formularios, CRMs, Google, Email, Meta, etc.\n- **Bots de IA** entrenados con tus textos/FAQs para calificar leads y derivar a humano." + CTA,

  cotiz:
    "### Precios & cotización\nTrabajamos **por alcance y objetivos**; el valor depende de páginas, integraciones, volumen de contenido y automatizaciones.\n> Nota: las **apps premium** no son gratuitas (costo mensual del proveedor).\n\n**Cómo cotizamos**\n1) **Brief** rápido + **llamada** de 15–20 min.\n2) Propuesta con **entregables, tiempos y valor**.\n3) Alineación y arranque del **Sprint 1**." + CTA
};

// === Estado y arranque ===
restoreHistory();
if (historyEmpty()) {
  botMsg("👋 **Hola, soy el asistente del Centro Digital de Diseño.**\nRespondo sobre **servicios**, **páginas web**, **automatizaciones** y **cotización**.");
}

send.onclick = () => {
  const txt = input.value.trim();
  if (!txt) return;
  input.value = "";
  userMsg(txt);
  respond(txt);
};
input.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send.click(); }
});
document.querySelectorAll(".chip").forEach(c => {
  c.onclick = () => { userMsg(c.dataset.q); respond(c.dataset.q); };
});
clear.onclick = () => { localStorage.removeItem(STORAGE_KEY); msgs.innerHTML = ""; typing.style.display="none"; };

// === Render con Markdown + botón Copiar ===
function render(role, mdText){
  const row = document.createElement("div");
  row.className = "row " + (role === "assistant" ? "assistant" : "user");

  const av = document.createElement("div");
  av.className = "avatar";
  av.textContent = role === "assistant" ? "AI" : "Tú";

  const bub = document.createElement("div");
  bub.className = "bubble";
  bub.innerHTML = mdToHTML(mdText);

  // Cabezal y botón Copiar en bloques <pre>
  bub.querySelectorAll("pre").forEach(pre => {
    const head = document.createElement("div");
    head.className = "code-head";
    head.innerHTML = `<span>código</span>`;
    const btn = document.createElement("button");
    btn.className = "copy";
    btn.textContent = "Copiar";
    btn.addEventListener("click", ()=>{
      const code = pre.querySelector("code")?.innerText || pre.innerText;
      navigator.clipboard.writeText(code);
      btn.textContent = "Copiado ✓";
      setTimeout(()=> btn.textContent = "Copiar", 1100);
    });
    // insert head justo antes del <pre>
    pre.parentNode.insertBefore(head, pre);
    head.appendChild(btn);
  });

  row.appendChild(av); row.appendChild(bub);
  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;

  // Persistencia
  saveToHistory(role, mdText);
}
function userMsg(text){ render("user", escapeHTML(text)); }
function botMsg(text){ render("assistant", text); }

// === Respuesta con intención mejorada + fallback ===
function respond(q){
  showTyping(true);
  setTimeout(() => {
    showTyping(false);
    const qn = norm(q);

    // Intenciones ampliadas
    if ( /(servicios|qué hacen|que hacen|ofrecen|todo lo que hacen)/.test(qn) ) return botMsg(KB.servicios);
    if ( /(web|landing|tienda|ecommerce|shopify|woocommerce|página|pagina)/.test(qn) ) return botMsg(KB.web);
    if ( /(automat|whatsapp|manychat|make|bot|ia|integraci[oó]n|crm)/.test(qn) ) return botMsg(KB.automat);
    if ( /(precio|cu[aá]nto vale|cu[aá]nto cuesta|cotizaci[oó]n|presupuesto|cotizar)/.test(qn) ) return botMsg(KB.cotiz);

    // Pequeño buscador difuso
    const hit = smallSearch(qn);
    if (hit) return botMsg(hit);

    // Fallback
    botMsg("Puedo ayudarte con **servicios**, **páginas web**, **automatizaciones** y **cotización**. ¿Qué necesitas exactamente?\n\nEj.: *“Landing + WhatsApp”*, *“Calendarizar contenido con IA”*." + CTA);
  }, 420 + Math.random()*260);
}

// === Buscador difuso muy simple ===
function smallSearch(q){
  const pairs = [
    [KB.servicios, ["branding","seo social","growth","ads","ar","reels","tiktok","shorts","contenido"]],
    [KB.web,       ["web","landing","tienda","ecommerce","shopify","woocommerce","velocidad","conversion","analitica","analytics"]],
    [KB.automat,   ["automat","manychat","whatsapp","make","bot","flow","crm","integracion","integración"]],
    [KB.cotiz,     ["precio","cotiz","presupuesto","propuesta","valor"]]
  ];
  let best=null,score=0;
  pairs.forEach(([text,keys])=>{
    const s = keys.reduce((acc,k)=> acc + (q.includes(k)?1:0), 0);
    if (s>score){score=s; best=text;}
  });
  return score>0 ? best : null;
}

// === Typing ===
function showTyping(v){ typing.style.display = v ? "flex" : "none"; }

// === Mini Markdown ===
function mdToHTML(md){
  // bloques ```code```
  md = md.replace(/```([\s\S]*?)```/g, (_,code)=> `<pre><code>${escapeHTML(code.trim())}</code></pre>`);
  // títulos, negritas, inline code
  md = md
    .replace(/^### (.*)$/gim,'<h3>$1</h3>')
    .replace(/^## (.*)$/gim,'<h2>$1</h2>')
    .replace(/^# (.*)$/gim,'<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/`([^`]+?)`/g,'<code>$1</code>');
  // listas simples y párrafos
  const lines = md.split('\n').map(line=>{
    if (/^\s*-\s+/.test(line)) return `<li>${line.replace(/^\s*-\s+/, '')}</li>`;
    if (/^\s*•\s+/.test(line)) return `<li>${line.replace(/^\s*•\s+/, '')}</li>`;
    if (/^<h\d|^<pre|^<ul|^<li|^<\/li|^<\/ul/.test(line)) return line;
    return line.trim()? `<p>${line}</p>` : '<p style="margin:4px 0"></p>';
  });
  const joined = lines.join('\n').replace(/(?:<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  return joined;
}
function escapeHTML(s){return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function norm(s){return (s||'').toLowerCase()
  .normalize('NFD').replace(/\p{Diacritic}/gu,'')
  .replace(/[^a-z0-9áéíóúñü\s]/g,' ')
  .replace(/\s+/g,' ')
  .trim();
}

// === Persistencia en localStorage ===
function saveToHistory(role, text){
  const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  arr.push({ role, text, t: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}
function restoreHistory(){
  const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (!arr.length) return;
  arr.forEach(m => {
    if (m.role === 'assistant') botMsg(m.text);
    else userMsg(m.text);
  });
}
function historyEmpty(){
  const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  return arr.length === 0;
}

/* ========= (Opcional) Hook para backend RAG / LLM =========
   Si luego quieres respuestas generativas:
   1) Monta un endpoint (por ej. /api/ask) que reciba {query, history[]} y devuelva {answer}.
   2) Reemplaza el cuerpo de respond() por un fetch:
      fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ query:q, history: JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]") })
      }).then(r=>r.json()).then(d=> botMsg(d.answer || KB.servicios));
   Mantén el KB como fallback si el backend no responde.
============================================================= */
