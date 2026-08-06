/* =====================================================================
   Client Follow-Ups page — 4 tasks per serviced client, next-day due.
   ===================================================================== */
(function(){
"use strict";
const S=window.Store, COLL="clients";
const TODAY=S.todayStr();
const REVIEW_LINK="";  // ← paste your Google review link here to power "Send review"
const REVIEW_MSG="Hi {name}, thank you for choosing Right Choice Cleaning! If you have a moment we'd truly appreciate a quick review: {link}";
const GHL_URL="https://app.gohighlevel.com/";

const STATUSES=[
  {v:"NEW",t:"New",c:"#98A0AB"},
  {v:"CALLED_NA",t:"Called – no answer",c:"#EBAA3C"},
  {v:"SPOKE",t:"Spoke",c:"#5A93FF"},
  {v:"REVIEW",t:"Review requested",c:"#A585FF"},
  {v:"RECURRING",t:"Recurring booked",c:"#37C06B"},
  {v:"NOT_INT",t:"Not interested",c:"#F0575E"},
  {v:"DONE",t:"Complete",c:"#37C06B"},
];
const statusOf=v=>STATUSES.find(s=>s.v===v)||STATUSES[0];
const TASKS=[
  {key:"followUp",label:"Follow up",ico:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>'},
  {key:"reviewSent",label:"Review link sent",ico:'<path d="M12 2l2.4 7.4H22l-6 4.5 2.3 7.1L12 16.9 5.7 21l2.3-7.1-6-4.5h7.6z"/>'},
  {key:"recurring",label:"Recurring cleaning",ico:'<path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>'},
  {key:"ghlUpdated",label:"Status in GHL",ico:'<path d="M3 3v18h18M8 13l3 3 5-6"/>'},
];
const doneCount=t=>TASKS.reduce((n,k)=>n+(t[k.key]?1:0),0);
const isComplete=t=>t.status==="DONE"||t.status==="NOT_INT"||doneCount(t)===4;

function newClient(name,serviceDate){
  return {id:S.uid(),kind:"client",name:name.trim(),serviceDate,followDate:S.addDays(serviceDate,1),
    status:"NEW",followUp:false,reviewSent:false,recurring:false,ghlUpdated:false,phone:"",notes:"",createdAt:Date.now()};
}
// The app starts empty — you add clients daily (Sync from Claude / Add day).
// One-time cleanup removes the demo clients that shipped with earlier builds.
function purgeSeedOnce(){
  if(localStorage.getItem("rcc_seed_purged_v1"))return;
  S.all(COLL).forEach(c=>S.del(COLL,c.id));
  localStorage.setItem("rcc_seed_purged_v1","1");
}

/* ---------- Card ---------- */
function card(t){
  const s=statusOf(t.status),dc=doneCount(t),complete=isComplete(t);
  let badge="",acc="acc-gold";
  if(complete){acc="acc-green";}
  else if(t.followDate<TODAY){acc="acc-red";badge=`<span class="badge b-red">Overdue · ${S.fmtNice(t.followDate)}</span>`;}
  else if(t.followDate===TODAY){acc="acc-gold";badge=`<span class="badge b-gold">Due today</span>`;}
  else{acc="acc-blue";badge=`<span class="badge b-blue">Due ${S.fmtNice(t.followDate)}</span>`;}

  const R=15,C=2*Math.PI*R,off=C*(1-dc/4);
  const ring=`<div style="position:relative;width:38px;height:38px;flex-shrink:0">
    <svg width="38" height="38" viewBox="0 0 38 38" style="transform:rotate(-90deg)">
      <circle cx="19" cy="19" r="${R}" fill="none" stroke="var(--line-2)" stroke-width="3.5"/>
      <circle cx="19" cy="19" r="${R}" fill="none" stroke="url(#gg)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" style="transition:stroke-dashoffset .4s"/>
    </svg><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${complete?'var(--green)':'var(--gold)'}">${complete?'✓':dc+'/4'}</div></div>`;

  const checks=TASKS.map(k=>`<label class="chk${t[k.key]?' on':''}" data-check="${k.key}" data-id="${t.id}">
    <span class="box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
    <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${k.ico}</svg>${k.label}</label>`).join("");

  const opts=STATUSES.map(o=>`<option value="${o.v}"${o.v===t.status?" selected":""}>${o.t}</option>`).join("");
  const phoneBtn=t.phone
    ?`<a class="btn sm" href="tel:${t.phone.replace(/[^0-9+]/g,'')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Call</a>`
    :`<button class="btn sm" data-act="phone" data-id="${t.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>Phone</button>`;

  return `<div class="card ${acc}${complete?' dim':''}" data-id="${t.id}">
    <div style="display:flex;align-items:flex-start;gap:12px">
      <div style="flex:1;min-width:0">
        <div style="font-size:14.5px;font-weight:700;display:flex;align-items:center;gap:7px"><span class="dot" style="background:${s.c}"></span>${S.esc(t.name)}</div>
        <div style="font-size:11.5px;color:var(--muted);margin-top:2px">Serviced ${S.fmtNice(t.serviceDate)} · ${s.t}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:7px">${badge}${ring}</div>
    </div>
    <div class="checks" style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:12px">${checks}</div>
    <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:11px;align-items:center">
      <button class="btn sm gold" data-act="review" data-id="${t.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.4H22l-6 4.5 2.3 7.1L12 16.9 5.7 21l2.3-7.1-6-4.5h7.6z"/></svg>Send review</button>
      ${phoneBtn}
      <button class="btn sm" data-act="ghl" data-id="${t.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>GHL</button>
      <button class="btn sm" data-act="note" data-id="${t.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>Note</button>
      <select class="inp" data-act="status" data-id="${t.id}" style="width:auto;padding:8px 30px 8px 11px;font-size:12px;font-weight:600">${opts}</select>
      <button class="btn sm danger" data-act="del" data-id="${t.id}" style="margin-left:auto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
    </div>
    ${t.notes?`<div style="font-size:11.5px;color:var(--muted);margin-top:10px;background:var(--bg-2);padding:8px 11px;border-radius:8px">📝 ${S.esc(t.notes)}</div>`:""}
    <div data-slot="x"></div>
  </div>`;
}

/* ---------- Render ---------- */
function render(){
  const listEl=document.getElementById("list");
  const q=document.getElementById("search").value.trim().toLowerCase();
  const fst=document.getElementById("fState").value;
  let items=S.all(COLL).slice().sort((a,b)=>(a.followDate||"").localeCompare(b.followDate||"")||a.name.localeCompare(b.name));
  const open=items.filter(t=>!isComplete(t));

  // stats
  document.getElementById("stats").innerHTML=[
    ["Total",items.length,"var(--gold)"],
    ["Open",open.length,"var(--amber)"],
    ["Due now",open.filter(t=>t.followDate<=TODAY).length,"var(--red)"],
    ["Recurring",items.filter(t=>t.recurring).length,"var(--green)"],
  ].map(([l,n,c])=>`<div class="stat"><b style="color:${c}">${n}</b><span>${l}</span></div>`).join("");

  // header count badge
  const dueNow=open.filter(t=>t.followDate<=TODAY).length;
  const cc=document.getElementById("clientCount");
  if(cc){cc.textContent=dueNow;cc.classList.toggle("hide",!dueNow);}

  let list=items;
  if(q)list=list.filter(t=>t.name.toLowerCase().includes(q));
  if(fst==="due")list=list.filter(t=>!isComplete(t)&&t.followDate<=TODAY);
  else if(fst==="open")list=list.filter(t=>!isComplete(t));
  else if(fst==="done")list=list.filter(isComplete);

  if(fst==="due"){
    // grouped overdue / today
    const overdue=list.filter(t=>t.followDate<TODAY);
    const today=list.filter(t=>t.followDate===TODAY);
    let html="";
    if(overdue.length)html+=`<div class="sec red"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>Overdue<span class="n">${overdue.length}</span></div>`+overdue.map(card).join("");
    html+=`<div class="sec gold"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>Due today · ${S.fmtNice(TODAY)}<span class="n">${today.length}</span></div>`;
    html+= today.length?today.map(card).join(""):emptyBox("All caught up — no follow-ups due today.");
    listEl.innerHTML=html;
  }else{
    listEl.innerHTML=list.length?list.map(card).join(""):emptyBox("No follow-ups match.");
  }
}
function emptyBox(msg){return `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg><p>${msg}</p></div>`;}

/* ---------- Interactions ---------- */
document.addEventListener("click",e=>{
  const chk=e.target.closest("[data-check]");
  if(chk){
    const t=S.get(COLL,chk.dataset.id);if(!t)return;
    const was=isComplete(t);t[chk.dataset.key]=!t[chk.dataset.key];
    if(t[chk.dataset.key]&&chk.dataset.key==="recurring"&&t.status==="NEW")t.status="RECURRING";
    if(t[chk.dataset.key]&&chk.dataset.key==="reviewSent"&&t.status==="NEW")t.status="REVIEW";
    S.put(COLL,t);
    if(!was&&isComplete(t))S.toast("Nice — "+t.name.split(" ")[0]+" all done!");
    render();return;
  }
  const el=e.target.closest("[data-act]");if(!el)return;
  const t=S.get(COLL,el.dataset.id);if(!t)return;
  const act=el.dataset.act;
  if(act==="review"){
    if(!REVIEW_LINK){S.toast("Add your review link in assets/client.js");return;}
    const msg=REVIEW_MSG.replace(/\{name\}/g,t.name.split(" ")[0]).replace(/\{link\}/g,REVIEW_LINK);
    const phone=t.phone?t.phone.replace(/[^0-9+]/g,''):"";
    const url=phone?`sms:${phone}${/iPhone|iPad|Mac/.test(navigator.userAgent)?'&':'?'}body=${encodeURIComponent(msg)}`
      :`mailto:?subject=${encodeURIComponent("Thanks from Right Choice Cleaning")}&body=${encodeURIComponent(msg)}`;
    if(navigator.clipboard)navigator.clipboard.writeText(msg).catch(()=>{});
    window.open(url,"_blank");
    if(!t.reviewSent){t.reviewSent=true;if(t.status==="NEW")t.status="REVIEW";S.put(COLL,t);render();}
    return;
  }
  if(act==="ghl"){window.open(GHL_URL,"_blank");S.toast("Opening GHL — tick it off when done");return;}
  if(act==="del"){if(confirm(`Delete "${t.name}"?`)){S.del(COLL,t.id);render();}return;}
  if(act==="phone"){
    const slot=el.closest(".card").querySelector('[data-slot="x"]');
    slot.innerHTML=`<div style="display:flex;gap:7px;margin-top:9px"><input class="inp" placeholder="Phone number" value="${t.phone||''}" data-inp="phone"><button class="btn sm gold" data-act="savephone" data-id="${t.id}">Save</button></div>`;
    slot.querySelector("input").focus();return;
  }
  if(act==="savephone"){const inp=el.closest(".card").querySelector('[data-inp="phone"]');t.phone=inp.value.trim();S.put(COLL,t);render();S.toast("Phone saved");return;}
  if(act==="note"){
    const slot=el.closest(".card").querySelector('[data-slot="x"]');
    slot.innerHTML=`<textarea class="inp" data-inp="notes" style="margin-top:9px" placeholder="Notes…">${S.esc(t.notes||'')}</textarea><button class="btn sm gold" data-act="savenote" data-id="${t.id}" style="margin-top:7px">Save note</button>`;
    slot.querySelector("textarea").focus();return;
  }
  if(act==="savenote"){const inp=el.closest(".card").querySelector('[data-inp="notes"]');t.notes=inp.value.trim();S.put(COLL,t);render();S.toast("Note saved");return;}
});
document.addEventListener("change",e=>{
  const el=e.target.closest('[data-act="status"]');if(!el)return;
  const t=S.get(COLL,el.dataset.id);if(!t)return;
  t.status=el.value;if(t.status==="RECURRING")t.recurring=true;S.put(COLL,t);render();
});
document.getElementById("search").addEventListener("input",render);
document.getElementById("fState").addEventListener("change",render);

/* ---------- Add-day modal ---------- */
const addModal=document.getElementById("addModal");
document.getElementById("addBtn").addEventListener("click",()=>{document.getElementById("mDate").value=TODAY;addModal.classList.add("on");});
document.getElementById("mCancel").addEventListener("click",()=>addModal.classList.remove("on"));
addModal.addEventListener("click",e=>{if(e.target===addModal)addModal.classList.remove("on");});
document.getElementById("mCreate").addEventListener("click",()=>{
  const def=document.getElementById("mDate").value||TODAY;
  const parsed=parseNames(document.getElementById("mNames").value,def);
  const added=importItems(parsed);
  document.getElementById("mNames").value="";addModal.classList.remove("on");
  S.toast(added?`Added ${added} follow-up${added===1?"":"s"}`:"Nothing new to add");render();
});
function parseNames(text,def){
  const out=[];let cur=def;const dateRe=/^\d{4}-\d{2}-\d{2}$/;
  text.split(/\r?\n/).forEach(ln=>{ln=ln.trim();if(!ln)return;
    if(dateRe.test(ln)){cur=ln;return;}if(/^\d+$/.test(ln))return;
    out.push({name:ln.replace(/^[-•*\d.\)\s]+/,"").trim(),serviceDate:cur});});
  return out.filter(x=>x.name.length>1);
}
function importItems(items){
  const seen=new Set(S.all(COLL).map(t=>t.name.toLowerCase()+"|"+t.serviceDate));
  let added=0;
  items.forEach(p=>{const k=p.name.toLowerCase()+"|"+p.serviceDate;if(seen.has(k))return;seen.add(k);S.put(COLL,newClient(p.name,p.serviceDate));added++;});
  return added;
}

/* ---------- Sync from Claude (inbox.json) ---------- */
function inboxToItems(d){
  const out=[];
  if(Array.isArray(d))d.forEach(x=>{if(x&&x.name&&x.serviceDate)out.push({name:x.name,serviceDate:x.serviceDate});});
  else if(d&&Array.isArray(d.entries))d.entries.forEach(e=>{const dt=e.serviceDate||e.date;(e.names||[]).forEach(n=>{if(dt&&n)out.push({name:n,serviceDate:dt});});});
  return out;
}
async function sync(manual){
  try{
    const r=await fetch("inbox.json?_="+Date.now(),{cache:"no-store"});
    if(!r.ok)throw 0;
    const added=importItems(inboxToItems(await r.json()));
    render();
    if(manual)S.toast(added?`Synced ${added} new client${added===1?"":"s"}`:"Already up to date");
  }catch(e){if(manual)S.toast("No inbox.json yet — send Claude a screenshot");}
}
document.getElementById("syncBtn").addEventListener("click",()=>sync(true));

/* ---------- Boot ---------- */
S.boot("client",()=>{
  document.getElementById("daySub").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  purgeSeedOnce();
  S.watch(COLL,()=>render());
  sync(false);
});
})();
