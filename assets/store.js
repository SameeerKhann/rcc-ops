/* =====================================================================
   Right Choice Cleaning — shared store, users, sync, notifications, nav.
   Works LOCAL-first (localStorage). If assets/firebase-config.js provides
   a real config, it upgrades to CLOUD sync (Firestore) so Sameer & Dmitry
   share tasks across devices and get Chrome notifications.
   ===================================================================== */
(function(){
"use strict";

/* ---------- Team ---------- */
const USERS=[
  {id:"sameer",name:"Sameer",color:"#E0BB55"},
  {id:"dmitry",name:"Dmitry",color:"#5A93FF"},
];
const userById=id=>USERS.find(u=>u.id===id)||{id,name:id,color:"#98A0AB"};
const initials=name=>name.slice(0,1).toUpperCase();

/* ---------- Helpers ---------- */
const pad=n=>String(n).padStart(2,"0");
function todayStr(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function addDays(iso,n){const[y,m,d]=iso.split("-").map(Number);const dt=new Date(y,m-1,d);dt.setDate(dt.getDate()+n);
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;}
function fmtNice(iso){if(!iso)return"";const[y,m,d]=iso.split("-").map(Number);
  return new Date(y,m-1,d).toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
let _c=0;
function uid(){return Date.now().toString(36)+"-"+(_c++).toString(36)+Math.random().toString(36).slice(2,5);}

/* ---------- Current user ---------- */
const ME_KEY="rcc_me";
function getMe(){return localStorage.getItem(ME_KEY);}
function setMe(id){localStorage.setItem(ME_KEY,id);}

/* ---------- Toast ---------- */
let toastT;
function toast(msg,icon){
  let el=document.getElementById("rcc-toast");
  if(!el){el=document.createElement("div");el.id="rcc-toast";el.className="toast";document.body.appendChild(el);}
  el.innerHTML=(icon||'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>')+"<span>"+esc(msg)+"</span>";
  el.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove("show"),2600);
}

/* ---------- Notifications ---------- */
function notifState(){return ("Notification" in window)?Notification.permission:"unsupported";}
async function requestNotif(){
  if(!("Notification" in window)){toast("Notifications not supported here");return "unsupported";}
  if(Notification.permission==="granted")return "granted";
  const p=await Notification.requestPermission();
  chrome.updateBell();
  if(p==="granted")toast("Chrome notifications on");
  return p;
}
function fireNotif(title,body,tag){
  try{
    if(("Notification" in window)&&Notification.permission==="granted"){
      const n=new Notification(title,{body,tag,icon:"assets/logo.png",badge:"assets/logo.png"});
      n.onclick=()=>{window.focus();if(location.pathname.indexOf("team")<0)location.href="team.html";n.close();};
    }
  }catch(e){}
}

/* =====================================================================
   DATA LAYER — local-first with optional Firestore cloud
   ===================================================================== */
const cache={};        // coll -> {id:obj}
const listeners={};    // coll -> [cb]
let mode="local";
let fb=null;           // {db, fns...}
const bc=("BroadcastChannel" in window)?new BroadcastChannel("rcc-sync"):null;

function lkey(coll){return "rcc_"+coll;}
function loadLocal(coll){
  try{return JSON.parse(localStorage.getItem(lkey(coll))||"{}");}catch(e){return {};}
}
function saveLocal(coll){localStorage.setItem(lkey(coll),JSON.stringify(cache[coll]||{}));}
function emit(coll){(listeners[coll]||[]).forEach(cb=>{try{cb(all(coll));}catch(e){console.error(e);}});}

function ensure(coll){if(!cache[coll])cache[coll]=loadLocal(coll);return cache[coll];}
function all(coll){return Object.values(ensure(coll));}
function get(coll,id){return ensure(coll)[id];}

function put(coll,obj){
  if(!obj.id)obj.id=uid();
  obj.updatedAt=Date.now();
  ensure(coll)[obj.id]=obj;
  saveLocal(coll);emit(coll);
  if(mode==="cloud"&&fb){fb.setDoc(fb.doc(fb.db,coll,obj.id),obj).catch(e=>console.warn("cloud put",e));}
  else if(bc){bc.postMessage({coll});}
  return obj;
}
function del(coll,id){
  delete ensure(coll)[id];saveLocal(coll);emit(coll);
  if(mode==="cloud"&&fb){fb.deleteDoc(fb.doc(fb.db,coll,id)).catch(e=>console.warn("cloud del",e));}
  else if(bc){bc.postMessage({coll});}
}
function watch(coll,cb){(listeners[coll]=listeners[coll]||[]).push(cb);cb(all(coll));}

/* cross-tab (local mode) */
if(bc)bc.onmessage=e=>{const coll=e.data&&e.data.coll;if(coll){cache[coll]=loadLocal(coll);emit(coll);}};

/* ---------- Cloud init (optional) ---------- */
async function initCloud(){
  const cfg=window.RCC_FIREBASE;
  if(!cfg||!cfg.apiKey||/YOUR_/.test(cfg.apiKey)||/PASTE/.test(cfg.apiKey))return false;
  try{
    const appMod=await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    const fsMod=await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const app=appMod.initializeApp(cfg);
    const db=fsMod.getFirestore(app);
    fb={db,doc:fsMod.doc,setDoc:fsMod.setDoc,deleteDoc:fsMod.deleteDoc,
        collection:fsMod.collection,onSnapshot:fsMod.onSnapshot};
    mode="cloud";
    return true;
  }catch(e){console.warn("Firebase init failed, staying local:",e);return false;}
}
function cloudSubscribe(coll){
  if(mode!=="cloud"||!fb)return;
  fb.onSnapshot(fb.collection(fb.db,coll),snap=>{
    const map={};snap.forEach(d=>map[d.id]=d.data());
    cache[coll]=map;saveLocal(coll);emit(coll);
  },err=>console.warn("snapshot",coll,err));
}

/* =====================================================================
   TOP NAV / CHROME
   ===================================================================== */
const chrome={
  updateBell(){
    const b=document.getElementById("bellBtn");if(!b)return;
    const st=notifState();
    b.classList.toggle("alert",st==="granted");
    const dot=b.querySelector(".dot");if(dot)dot.style.display=st==="granted"?"none":"";
    b.title=st==="granted"?"Notifications on":"Enable Chrome notifications";
  },
};
function menuItem(icon,label,attrs){return `<button ${attrs}>${icon}<span>${label}</span></button>`;}

function mountChrome(active){
  const me=userById(getMe());
  const el=document.getElementById("topbar");if(!el)return;
  const followBadge=""; // filled by client page
  el.innerHTML=`<div class="wrap"><div class="topbar__row">
    <a class="brand" href="index.html">
      <img src="assets/logo.png" alt="RCC">
      <b>Right <span>Choice</span><small>Operations</small></b>
    </a>
    <nav class="mainnav">
      <a href="index.html" class="${active==='client'?'active':''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>
        <span class="lbl">Client Follow-Ups</span><span class="pill hide" id="clientCount">0</span>
      </a>
      <a href="team.html" class="${active==='team'?'active':''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <span class="lbl">Team Tasks</span><span class="pill hide" id="teamCount">0</span>
      </a>
    </nav>
    <div class="topbar__right">
      <button class="iconbtn" id="bellBtn" title="Enable Chrome notifications">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <span class="dot"></span>
      </button>
      <div style="position:relative">
        <div class="userpill" id="userPill">
          <span class="av" style="background:${me.color}">${initials(me.name)}</span>
          <b>${me.name}</b>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
        <div class="menu" id="userMenu">
          <div class="who">Signed in as</div>
          ${USERS.map(u=>`<button data-switch="${u.id}"><span class="av" style="width:20px;height:20px;font-size:10px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${u.color};color:#12130f;font-weight:700">${initials(u.name)}</span>${u.name}${u.id===me.id?' ·  ✓':''}</button>`).join("")}
          <div class="sep"></div>
          ${menuItem('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>','Enable notifications','id="mNotif"')}
          ${menuItem('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>','Export backup','id="mExport"')}
          ${menuItem('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 8l5-5 5 5M12 3v12"/></svg>','Restore backup','id="mImport"')}
          <div class="sep"></div>
          <div class="who" id="syncMode">Local mode</div>
        </div>
      </div>
    </div>
  </div></div>
  <input type="file" id="restoreFile" accept="application/json" class="hide">`;

  // user menu
  const pill=document.getElementById("userPill"),menu=document.getElementById("userMenu");
  pill.addEventListener("click",e=>{e.stopPropagation();menu.classList.toggle("on");});
  document.addEventListener("click",()=>menu.classList.remove("on"));
  menu.addEventListener("click",e=>e.stopPropagation());
  menu.querySelectorAll("[data-switch]").forEach(b=>b.addEventListener("click",()=>{
    setMe(b.dataset.switch);location.reload();
  }));
  document.getElementById("mNotif").addEventListener("click",requestNotif);
  document.getElementById("bellBtn").addEventListener("click",requestNotif);
  document.getElementById("mExport").addEventListener("click",exportBackup);
  document.getElementById("mImport").addEventListener("click",()=>document.getElementById("restoreFile").click());
  document.getElementById("restoreFile").addEventListener("change",restoreBackup);
  document.getElementById("syncMode").textContent = mode==="cloud"?"☁ Cloud sync on":"Local mode (this device)";
  chrome.updateBell();
}

/* ---------- Backup ---------- */
function exportBackup(){
  const data={};["clients","tasks"].forEach(c=>data[c]=ensure(c));
  const blob=new Blob([JSON.stringify({...data,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download=`rcc-backup-${todayStr()}.json`;a.click();URL.revokeObjectURL(a.href);toast("Backup downloaded");
}
function restoreBackup(e){
  const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{
    const d=JSON.parse(r.result);let n=0;
    ["clients","tasks"].forEach(c=>{if(d[c]&&typeof d[c]==="object"){cache[c]=d[c];saveLocal(c);emit(c);
      if(mode==="cloud"&&fb)Object.values(d[c]).forEach(o=>fb.setDoc(fb.doc(fb.db,c,o.id),o).catch(()=>{}));n+=Object.keys(d[c]).length;}});
    toast("Restored "+n+" items");
  }catch(err){alert("That file isn't a valid backup.");}};
  r.readAsText(f);e.target.value="";
}

/* ---------- First-run identity picker ---------- */
function ensureIdentity(cb){
  if(getMe()){cb();return;}
  const bg=document.createElement("div");bg.className="modal-bg on";
  bg.innerHTML=`<div class="modal"><h3><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Who's using this?</h3>
    <p style="color:var(--muted);font-size:12.5px;margin:0 0 16px">Pick your name so tasks are assigned and notified correctly. You can switch anytime from the top-right.</p>
    <div style="display:flex;gap:10px">${USERS.map(u=>`<button class="btn" data-pick="${u.id}" style="flex:1;padding:16px;flex-direction:column;gap:8px">
      <span class="av" style="width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${u.color};color:#12130f;font-weight:700;font-size:16px">${initials(u.name)}</span>
      <b style="font-size:14px">${u.name}</b></button>`).join("")}</div></div>`;
  document.body.appendChild(bg);
  bg.querySelectorAll("[data-pick]").forEach(b=>b.addEventListener("click",()=>{setMe(b.dataset.pick);bg.remove();cb();}));
}

/* ---------- Boot ---------- */
async function boot(active,onReady){
  await initCloud();
  ensureIdentity(async()=>{
    mountChrome(active);
    if(mode==="cloud"){cloudSubscribe("clients");cloudSubscribe("tasks");}
    onReady();
  });
}

/* ---------- Public API ---------- */
window.Store={
  USERS,userById,initials,getMe,setMe,
  all,get,put,del,watch,
  uid,esc,todayStr,addDays,fmtNice,toast,
  requestNotif,fireNotif,notifState,
  boot,mountChrome,
  get mode(){return mode;},
};
})();
