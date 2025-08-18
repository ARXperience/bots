// bot.js — PRO + Flujo de Cotización + Botones con contacto fijo
const msgs  = document.getElementById('messages');
const input = document.getElementById('input');
const send  = document.getElementById('send');
const typing= document.getElementById('typing');
const clear = document.getElementById('clear');

const STORAGE_KEY = 'cdd_chat_history_v1';
const QUOTE_KEY   = 'cdd_quote_leads_v1';
const FLOW_KEY    = 'cdd_quote_flow_state_v1';

// === Datos oficiales de contacto ===
const OFICIAL_PHONE = "573028618806";
const OFICIAL_MAIL  = "centrodigitaldediseno@gmail.com";

// === Base de conocimiento ===
const CTA = `\n\n**Contáctanos:** WhatsApp +${OFICIAL_PHONE} · ${OFICIAL_MAIL}`;
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

// === Estado del flujo ===
let flow = loadFlowState() || { activo:false, paso:0, datos:{nombre:"",servicios:"",empresa:"",telefono:""} };

// ====== Arranque ======
restoreHistory();
if (historyEmpty()) {
  botMsg("👋 **Hola, soy el asistente del Centro Digital de Diseño.**\nRespondo sobre **servicios**, **páginas web**, **automatizaciones** y **cotización**.");
}

send.onclick = () => {
  const txt = input.value.trim();
  if (!txt) return;
  input.value = "";
  userMsg(txt);
  route(txt);
};
input.addEventListener("keydown", e => { if (e.key==="Enter"&&!e.shiftKey){e.preventDefault();send.click();} });
document.querySelectorAll(".chip").forEach(c=>{c.onclick=()=>{userMsg(c.dataset.q);route(c.dataset.q);};});
if (clear) clear.onclick=()=>{localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(FLOW_KEY);msgs.innerHTML="";typing.style.display="none";flow={activo:false,paso:0,datos:{nombre:"",servicios:"",empresa:"",telefono:""}};botMsg("🧹 Historial limpio. ¿Quieres **cotizar**? Puedo guiarte paso a paso.");};

// ====== Router ======
function route(q){
  if (/^cancelar$/i.test(q.trim())) {
    if (flow.activo){flow={activo:false,paso:0,datos:{nombre:"",servicios:"",empresa:"",telefono:""}};saveFlowState();return botMsg("Flujo de cotización **cancelado**.");}
  }
  if (flow.activo){handleCotizacion(q);return;}
  if (/(cotiz|presupuesto|precio|cu[aá]nto vale|cu[aá]nto cuesta)/.test(norm(q))){startCotizacion();return;}
  respond(q);
}

// ====== Flujo ======
function startCotizacion(){
  flow={activo:true,paso:1,datos:{nombre:"",servicios:"",empresa:"",telefono:""}};saveFlowState();
  botMsg("¡Perfecto! Para darte una **cotización personalizada** necesito unos datos.\n\n1️⃣ ¿Cuál es tu **nombre completo**?\n\n*(Escribe `cancelar` para salir.)*");
}
function handleCotizacion(txt){
  switch(flow.paso){
    case 1: 
      flow.datos.nombre = txt;
      flow.paso = 2; 
      saveFlowState();
      botMsg(`Gracias, **${escapeHTML(txt)}**.  
2️⃣ Cuéntame: ¿Qué **servicios** te interesan?  
_Ejemplo: “Landing page + automatización WhatsApp”, “E-commerce con branding”, “Bot de IA para atención”, etc._`);
      break;

    case 2: 
      flow.datos.servicios = txt;
      flow.paso = 3; 
      saveFlowState();
      botMsg("3️⃣ ¿Cómo se llama tu **empresa o proyecto**?");
      break;

    case 3: 
      flow.datos.empresa = txt;
      flow.paso = 4; 
      saveFlowState();
      botMsg("4️⃣ ¿Cuál es tu **número de WhatsApp o teléfono**?");
      break;

    case 4: 
      flow.datos.telefono = txt;
      finalizeQuote();
      break;
  }
}

function finalizeQuote(){
  const leads=JSON.parse(localStorage.getItem(QUOTE_KEY)||"[]");
  leads.push({...flow.datos,fecha:new Date().toISOString()});
  localStorage.setItem(QUOTE_KEY,JSON.stringify(leads));

  const {nombre,servicios,empresa,telefono}=flow.datos;
  const wappText=encodeURIComponent(`Hola, soy ${nombre} (${empresa}). Me interesa: ${servicios}. Mi contacto: ${telefono}.`);
  const mailBody=encodeURIComponent(`Nombre: ${nombre}\nServicios: ${servicios}\nEmpresa: ${empresa}\nTeléfono: ${telefono}\n\nMensaje: Hola, quiero avanzar con la cotización.`);

  const btnStyle="display:inline-block;margin-top:8px;margin-right:8px;background:#10a37f;color:#fff;text-decoration:none;padding:8px 14px;border-radius:10px;font-weight:600;font-size:14px";
  const resumen=
`### ¡Genial, ${escapeHTML(nombre)}! 🙌
Con estos datos armamos tu propuesta. Te contactaremos en breve.

**Resumen**
- **Servicios:** ${escapeHTML(servicios)}
- **Empresa/Proyecto:** ${escapeHTML(empresa)}
- **WhatsApp/Teléfono del cliente:** ${escapeHTML(telefono)}

**Acceso rápido**  
<a href="https://wa.me/${OFICIAL_PHONE}?text=${wappText}" target="_blank" style="${btnStyle}">📲 WhatsApp Oficial</a>
<a href="mailto:${OFICIAL_MAIL}?subject=Cotización&body=${mailBody}" style="${btnStyle}">✉️ Email Oficial</a>

> Si necesitas corregir algo, escribe **cotizar** para iniciar nuevamente.`;

  flow={activo:false,paso:0,datos:{nombre:"",servicios:"",empresa:"",telefono:""}};saveFlowState();
  botMsg(resumen); botMsg(KB.cotiz);
}

// ====== Respuestas ======
function respond(q){showTyping(true);setTimeout(()=>{showTyping(false);const qn=norm(q);
  if(/servicios|qué hacen|que hacen|ofrecen/.test(qn))return botMsg(KB.servicios);
  if(/web|landing|tienda|ecommerce|página|pagina/.test(qn))return botMsg(KB.web);
  if(/automat|whatsapp|manychat|make|bot|ia|crm/.test(qn))return botMsg(KB.automat);
  if(/precio|cu[aá]nto vale|cu[aá]nto cuesta|cotiz|presupuesto/.test(qn))return botMsg(KB.cotiz+"\n\n¿Quieres iniciar el flujo? Escribe **cotizar**.");
  botMsg("Puedo ayudarte con **servicios**, **páginas web**, **automatizaciones** y **cotización**."+CTA);
},400);}

// ====== Helpers ======
function render(role, mdText){
  const row = document.createElement("div");
  row.className = "row " + (role === "assistant" ? "assistant" : "user");

  const av = document.createElement("div");
  av.className = "avatar";
  av.textContent = role === "assistant" ? "AI" : "Tú";

  const bub = document.createElement("div");
  bub.className = "bubble";
  bub.innerHTML = mdToHTML(mdText);

  row.appendChild(av); 
  row.appendChild(bub);
  msgs.appendChild(row);

  // ⬇️ AUTOSCROLL seguro
  setTimeout(() => {
    msgs.scrollTop = msgs.scrollHeight;
  }, 50);

  saveToHistory(role, mdText);
}

function userMsg(t){render("user",escapeHTML(t));}function botMsg(t){render("assistant",t);}
function showTyping(v){typing.style.display=v?"flex":"none";}
function mdToHTML(md){md=md.replace(/```([\s\S]*?)```/g,(_,c)=>`<pre><code>${escapeHTML(c.trim())}</code></pre>`);md=md.replace(/^### (.*)$/gim,'<h3>$1</h3>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');return md.split('\n').map(l=>l.trim()?`<p>${l}</p>`:"").join('');}
function escapeHTML(s){return (s||"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function norm(s){return(s||"").toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[^a-z0-9\s]/g,' ').trim();}
function saveToHistory(role,t){const arr=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");arr.push({role,text:t});localStorage.setItem(STORAGE_KEY,JSON.stringify(arr));}
function restoreHistory(){const arr=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");arr.forEach(m=>{if(m.role==='assistant')botMsg(m.text);else userMsg(m.text);});}
function historyEmpty(){return !JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]").length;}
function saveFlowState(){localStorage.setItem(FLOW_KEY,JSON.stringify(flow));}
function loadFlowState(){try{return JSON.parse(localStorage.getItem(FLOW_KEY)||"null");}catch{return null;}}
