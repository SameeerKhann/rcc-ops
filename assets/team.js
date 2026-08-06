/* =====================================================================
   Team Tasks — Sameer & Dmitry assign work to each other / themselves.
   New tasks assigned to the current user (from another device via cloud,
   or another tab) trigger a Chrome notification.
   ===================================================================== */
(function(){
"use strict";
const S=window.Store, COLL="tasks";
const TODAY=S.todayStr();

const PRIO={
  urgent:{t:"Urgent",b:"b-red",dot:"#F0575E",rank:0},
  high:{t:"High",b:"b-amber",dot:"#EBAA3C",rank:1},
  normal:{t:"Normal",b:"b-blue",dot:"#5A93FF",rank:2},
  low:{t:"Low",b:"b-gray",dot:"#98A0AB",rank:3},
};
const STATE={
  todo:{t:"To do",b:"b-gray"},
  doing:{t:"In progress",b:"b-violet"},
  done:{t:"Done",b:"b-green"},
};
let scope="mine";
let seen=loadSeen();          // task ids we've already notified about
function loadSeen(){try{return new Set(JSON.parse(localStorage.getItem("rcc_task_seen")||"[]"));}catch(e){return new Set();}}
function saveSeen(){localStorage.setItem("rcc_task_seen",JSON.stringify([...seen]));}

function newTask(){
  const me=S.getMe();
  return {id:S.uid(),kind:"task",title:"",desc:"",assignee:me,assignedBy:me,
    priority:"normal",status:"todo",due:"",createdAt:Date.now()};
}

/* ---------- Card ---------- */
function card(t){
  const p=PRIO[t.priority]||PRIO.normal, st=STATE[t.status]||STATE.todo;
  const by=S.userById(t.assignedBy), to=S.userById(t.assignee);
  const me=S.getMe();
  const acc=t.status==="done"?"acc-green":(t.priority==="urgent"?"acc-red":(t.priority==="high"?"acc-gold":"acc-violet"));
  const overdue=t.due&&t.due<TODAY&&t.status!=="done";
  const dueBadge=t.due?`<span class="badge ${overdue?'b-red':'b-gray'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${overdue?'Overdue · ':''}${S.fmtNice(t.due)}</span>`:"";
  const dir = t.assignedBy===t.assignee
    ? `<span class="badge b-gray">Self</span>`
    : `<span style="font-size:11px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">
         <span class="av-mini" style="background:${by.color}">${S.initials(by.name)}</span>${by.name}
         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
         <span class="av-mini" style="background:${to.color}">${S.initials(to.name)}</span>${to.name}${t.assignee===me?' (you)':''}</span>`;

  const stOpts=Object.entries(STATE).map(([v,o])=>`<option value="${v}"${v===t.status?" selected":""}>${o.t}</option>`).join("");
  return `<div class="card ${acc}${t.status==='done'?' dim':''}" data-id="${t.id}">
    <div style="display:flex;align-items:flex-start;gap:12px">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="badge ${p.b}"><span class="dot" style="background:${p.dot};width:7px;height:7px"></span>${p.t}</span>
          <span class="badge ${st.b}">${st.t}</span>${dueBadge}
        </div>
        <div style="font-size:14.5px;font-weight:700;margin-top:9px${t.status==='done'?';text-decoration:line-through;opacity:.7':''}">${S.esc(t.title)}</div>
        ${t.desc?`<div style="font-size:12px;color:var(--muted);margin-top:3px">${S.esc(t.desc)}</div>`:""}
        <div style="margin-top:10px">${dir}</div>
      </div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:12px;align-items:center">
      <select class="inp" data-act="status" data-id="${t.id}" style="width:auto;padding:8px 30px 8px 11px;font-size:12px;font-weight:600">${stOpts}</select>
      ${t.status!=="done"?`<button class="btn sm" data-act="done" data-id="${t.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Mark done</button>`:""}
      <button class="btn sm" data-act="edit" data-id="${t.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>Edit</button>
      <button class="btn sm danger" data-act="del" data-id="${t.id}" style="margin-left:auto"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>
    </div>
  </div>`;
}

/* ---------- Render ---------- */
function render(){
  const me=S.getMe();
  let items=S.all(COLL).slice();

  // stats
  const mine=items.filter(t=>t.assignee===me&&t.status!=="done");
  document.getElementById("stats").innerHTML=[
    ["Assigned to me",mine.length,"var(--gold)"],
    ["Due / overdue",mine.filter(t=>t.due&&t.due<=TODAY).length,"var(--red)"],
    ["In progress",items.filter(t=>t.status==="doing").length,"var(--violet)"],
    ["Done",items.filter(t=>t.status==="done").length,"var(--green)"],
  ].map(([l,n,c])=>`<div class="stat"><b style="color:${c}">${n}</b><span>${l}</span></div>`).join("");

  const teamCount=document.getElementById("teamCount");
  if(teamCount){teamCount.textContent=mine.length;teamCount.classList.toggle("hide",!mine.length);}

  // scope
  if(scope==="mine")items=items.filter(t=>t.assignee===me);
  else if(scope==="iassigned")items=items.filter(t=>t.assignedBy===me&&t.assignee!==me);

  // filters
  const q=document.getElementById("search").value.trim().toLowerCase();
  const fa=document.getElementById("fAssignee").value;
  const fs=document.getElementById("fStatus").value;
  const fp=document.getElementById("fPriority").value;
  const sort=document.getElementById("fSort").value;
  if(q)items=items.filter(t=>(t.title+" "+t.desc).toLowerCase().includes(q));
  if(fa)items=items.filter(t=>t.assignee===fa);
  if(fs)items=items.filter(t=>t.status===fs);
  if(fp)items=items.filter(t=>t.priority===fp);

  items.sort((a,b)=>{
    if(sort==="priority")return (PRIO[a.priority].rank-PRIO[b.priority].rank)||(a.due||"9").localeCompare(b.due||"9");
    if(sort==="created")return b.createdAt-a.createdAt;
    return (a.due||"9999").localeCompare(b.due||"9999")||(PRIO[a.priority].rank-PRIO[b.priority].rank);
  });
  // done last
  items.sort((a,b)=>(a.status==="done")-(b.status==="done"));

  document.getElementById("list").innerHTML=items.length?items.map(card).join("")
    :`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg><p>No tasks here yet. Hit <b>New task</b> to assign one.</p></div>`;
}

/* ---------- Notification diffing ---------- */
function checkNotifs(){
  const me=S.getMe();
  S.all(COLL).forEach(t=>{
    if(t.assignee===me && t.assignedBy!==me && t.status!=="done" && !seen.has(t.id)){
      seen.add(t.id);
      S.fireNotif("New task from "+S.userById(t.assignedBy).name, t.title, t.id);
    }
    // mark self/own as seen silently so they don't notify later
    if(!seen.has(t.id) && (t.assignee!==me || t.assignedBy===me)) seen.add(t.id);
  });
  saveSeen();
}

/* ---------- Modal ---------- */
const modal=document.getElementById("taskModal");
let editing=null;
function openModal(t){
  editing=t;
  document.getElementById("mTitle").lastChild.textContent = t._new?" New task":" Edit task";
  document.getElementById("tTitle").value=t.title||"";
  document.getElementById("tDesc").value=t.desc||"";
  const asgn=document.getElementById("tAssignee");
  asgn.innerHTML=S.USERS.map(u=>`<option value="${u.id}"${u.id===t.assignee?" selected":""}>${u.name}${u.id===S.getMe()?" (me)":""}</option>`).join("");
  document.getElementById("tPriority").value=t.priority||"normal";
  document.getElementById("tDue").value=t.due||"";
  document.getElementById("tSave").textContent=t._new?"Create & assign":"Save changes";
  modal.classList.add("on");
  setTimeout(()=>document.getElementById("tTitle").focus(),120);
}
document.getElementById("newBtn").addEventListener("click",()=>{const t=newTask();t._new=true;openModal(t);});
document.getElementById("tCancel").addEventListener("click",()=>modal.classList.remove("on"));
modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("on");});
document.getElementById("tSave").addEventListener("click",()=>{
  const title=document.getElementById("tTitle").value.trim();
  if(!title){document.getElementById("tTitle").focus();S.toast("Give the task a title");return;}
  const t=editing;
  t.title=title;
  t.desc=document.getElementById("tDesc").value.trim();
  t.assignee=document.getElementById("tAssignee").value;
  t.priority=document.getElementById("tPriority").value;
  t.due=document.getElementById("tDue").value;
  delete t._new;
  // if I assign to myself, mark seen so no self-notification
  if(t.assignee===S.getMe()||t.assignedBy!==S.getMe())seen.add(t.id);
  saveSeen();
  S.put(COLL,t);
  modal.classList.remove("on");
  const to=S.userById(t.assignee);
  S.toast(t.assignee===S.getMe()?"Task added":"Assigned to "+to.name);
  render();
});

/* ---------- Interactions ---------- */
document.addEventListener("click",e=>{
  const el=e.target.closest("[data-act]");if(!el)return;
  const t=S.get(COLL,el.dataset.id);if(!t)return;
  const act=el.dataset.act;
  if(act==="done"){t.status="done";S.put(COLL,t);S.toast("Marked done");render();return;}
  if(act==="edit"){openModal(t);return;}
  if(act==="del"){if(confirm("Delete this task?")){S.del(COLL,t.id);render();}return;}
});
document.addEventListener("change",e=>{
  const el=e.target.closest('[data-act="status"]');if(!el)return;
  const t=S.get(COLL,el.dataset.id);if(!t)return;t.status=el.value;S.put(COLL,t);render();
});

/* ---------- Filters / scope ---------- */
["search","fAssignee","fStatus","fPriority","fSort"].forEach(id=>{
  const el=document.getElementById(id);el.addEventListener(id==="search"?"input":"change",render);
});
document.querySelectorAll("#scope button").forEach(b=>b.addEventListener("click",()=>{
  scope=b.dataset.scope;
  document.querySelectorAll("#scope button").forEach(x=>x.classList.toggle("on",x===b));
  render();
}));

/* ---------- Boot ---------- */
S.boot("team",()=>{
  // populate assignee filter
  document.getElementById("fAssignee").innerHTML='<option value="">Anyone</option>'+S.USERS.map(u=>`<option value="${u.id}">${u.name}${u.id===S.getMe()?" (me)":""}</option>`).join("");
  S.watch(COLL,()=>{checkNotifs();render();});
  // nudge for notification permission on first team-page visit
  if(S.notifState()==="default")setTimeout(()=>S.requestNotif(),800);
});
})();
