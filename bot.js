// Bot muy simple estilo ChatGPT
const msgs = document.getElementById('messages');
const input = document.getElementById('input');
const send = document.getElementById('send');

// base de conocimiento simple
const KB = {
  "servicios": "Ofrecemos páginas web con IA, branding, contenido para redes sociales, SEO social, automatizaciones (ManyChat, Make, WhatsApp), bots de IA, e-commerce, realidad aumentada y más.",
  "web": "Diseñamos páginas web y tiendas online modernas, rápidas y optimizadas para conversión, con integración a WhatsApp o CRM.",
  "automat": "Automatizamos procesos con WhatsApp, ManyChat y Make. También creamos bots de IA para atención y ventas.",
  "cotiz": "Trabajamos por alcance. Para cotizar: 1) Brief rápido, 2) Llamada de diagnóstico, 3) Propuesta con entregables y tiempos."
};

// enviar mensaje usuario
function userMsg(text){
  render("user", text);
  answer(text);
}
send.onclick = ()=> {
  const txt = input.value.trim();
  if(!txt) return;
  input.value = "";
  userMsg(txt);
};
input.addEventListener("keydown", e=>{
  if(e.key==="Enter"){ e.preventDefault(); send.click(); }
});

// chips
document.querySelectorAll(".chip").forEach(c=>{
  c.onclick = ()=> userMsg(c.dataset.q);
});

// render mensaje
function render(role, text){
  const row = document.createElement("div");
  row.className = "row "+role;
  const av = document.createElement("div");
  av.className = "avatar";
  av.textContent = role==="assistant"?"AI":"Tú";
  const bub = document.createElement("div");
  bub.className = "bubble";
  bub.textContent = text;
  row.appendChild(av); row.appendChild(bub);
  msgs.appendChild(row);
  msgs.scrollTop = msgs.scrollHeight;
}

// responder
function answer(q){
  q = q.toLowerCase();
  let res = KB["servicios"]; // default
  if(q.includes("web")) res = KB["web"];
  if(q.includes("automat")) res = KB["automat"];
  if(q.includes("precio")||q.includes("cotiz")) res = KB["cotiz"];
  setTimeout(()=>render("assistant", res), 500);
}

// mensaje inicial
render("assistant", "👋 Hola, soy el asistente del Centro Digital de Diseño. Pregunta por servicios, páginas web, automatizaciones o cotización.");
