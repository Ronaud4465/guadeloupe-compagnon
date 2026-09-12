
const P=window.GUADELOUPE_PLACES;
const defaults={today:[],delay:0,notes:"",custom:[],homes:[
{name:"Sainte-Anne",from:"2027-01-01",to:"2027-01-08",lat:16.2264,lng:-61.3850},
{name:"Deshaies",from:"2027-01-08",to:"2027-01-15",lat:16.3067,lng:-61.7925},
{name:"Bouillante",from:"2027-01-15",to:"2027-01-22",lat:16.1300,lng:-61.7690}],pos:null};
let S=Object.assign({},defaults,JSON.parse(localStorage.getItem("gw02")||"{}"));
const save=()=>localStorage.setItem("gw02",JSON.stringify(S));
const all=()=>P.concat(S.custom||[]);
function activeHome(){let d=new Date().toISOString().slice(0,10);return S.homes.find(h=>d>=h.from&&d<h.to)||S.homes[0]}
function maps(dest){return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`}
function searchMaps(q){let c=S.pos?`${S.pos.lat},${S.pos.lng}`:`${activeHome().lat},${activeHome().lng}`;return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q+" near "+c)}`}
function km(a,b){const R=6371,x=(b.lat-a.lat)*Math.PI/180,y=(b.lng-a.lng)*Math.PI/180;return R*Math.sqrt(x*x+(Math.cos(a.lat*Math.PI/180)*y)**2)}
function openModal(t,x,actions=[]){modalTitle.textContent=t;modalText.textContent=x;modalActions.innerHTML="";actions.forEach(a=>{let b=document.createElement("button");b.textContent=a.label;b.onclick=()=>{a.go();modal.classList.add("hidden")};modalActions.appendChild(b)});modal.classList.remove("hidden")}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{document.querySelectorAll("nav button,.tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.getElementById(b.dataset.tab).classList.add("active")});
closeModal.onclick=()=>modal.classList.add("hidden");

function renderToday(){
 let h=activeHome();homeName.textContent=h.name;
 dayList.innerHTML=all().map(p=>`<div class="card place"><input type="checkbox" data-day="${p.id}" ${S.today.includes(p.id)?"checked":""}><div><h3>${p.priority==="gem"?"💎":p.priority==="star"?"⭐":""} ${p.name}</h3><div class="meta">${p.cat} · env. ${p.duration||60} min</div><span class="tag">${p.note||"Lieu ajouté"}</span></div><button class="ghost" data-go="${p.id}">🧭</button></div>`).join("");
 document.querySelectorAll("[data-day]").forEach(c=>c.onchange=()=>{S.today=c.checked?[...new Set([...S.today,c.dataset.day])]:S.today.filter(x=>x!==c.dataset.day);save()});
 document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{let p=all().find(x=>x.id===b.dataset.go);location.href=maps(p.lat?`${p.lat},${p.lng}`:p.query||p.name)});
}
function renderPlaces(){
 let q=(search.value||"").toLowerCase(),w=week.value;
 let arr=all().filter(p=>(w==="all"||String(p.week)===w)&&p.name.toLowerCase().includes(q));
 placeList.innerHTML=arr.map(p=>`<div class="card"><h2>${p.priority==="gem"?"💎":p.priority==="star"?"⭐":""} ${p.name}</h2><div class="meta">${p.cat||"Lieu personnel"} · ${p.duration||60} min</div><p>${p.note||""}</p><div class="placeBtns"><button class="primary" onclick="location.href=maps('${p.lat?`${p.lat},${p.lng}`:(p.query||p.name).replaceAll("'","")}')">🧭 Y aller</button><button class="ghost" onclick="toggleDay('${p.id}')">${S.today.includes(p.id)?"✓ Dans la journée":"+ Journée"}</button>${p.custom?`<button class="ghost" onclick="removeCustom('${p.id}')">Supprimer</button>`:""}</div></div>`).join("")
}
window.toggleDay=id=>{S.today=S.today.includes(id)?S.today.filter(x=>x!==id):[...S.today,id];save();renderPlaces();renderToday()}
window.removeCustom=id=>{S.custom=S.custom.filter(x=>x.id!==id);S.today=S.today.filter(x=>x!==id);save();renderPlaces();renderToday()}
search.oninput=renderPlaces;week.onchange=renderPlaces;
addPlace.onclick=()=>{if(!newName.value.trim())return;S.custom.push({id:"c"+Date.now(),name:newName.value.trim(),query:newQuery.value.trim()||newName.value.trim(),cat:"Lieu personnel",duration:60,priority:"",custom:true});newName.value="";newQuery.value="";save();renderPlaces()}

function analyze(){
 if(!S.today.length)return openModal("Programme","Choisissez d’abord au moins une visite.");
 let chosen=S.today.map(id=>all().find(p=>p.id===id)).filter(Boolean), mins=chosen.reduce((a,p)=>a+(p.duration||60),0)+S.delay;
 let now=new Date(), remaining=Math.max(0,(19-now.getHours())*60-now.getMinutes());
 if(S.delay===0)return openModal("Programme prioritaire",`Vos ${chosen.length} visite(s) restent prévues. Aucun retard déclaré. Je ne change rien.`);
 let short=all().filter(p=>!S.today.includes(p.id)&&(p.duration||60)<=90).slice(0,3);
 let msg=`Retard déclaré : ${S.delay} min. Votre programme choisi reste prioritaire. Temps de visite estimé restant : environ ${mins} min.`;
 openModal("La journée a changé",msg,[
 {label:"➡️ Continuer exactement comme prévu",go:()=>{S.delay=0;save();advice.innerHTML='<div class="adviceResult">Programme conservé. La suite reste inchangée.</div>'}},
 {label:"🔄 Reporter la dernière visite",go:()=>{let last=S.today.at(-1);S.today=S.today.slice(0,-1);S.delay=0;save();renderToday();advice.innerHTML='<div class="adviceResult">La dernière visite a été retirée de la journée, mais reste dans À visiter.</div>'}},
 {label:"💡 Voir des alternatives plus courtes",go:()=>{advice.innerHTML='<div class="adviceResult"><b>Alternatives courtes possibles :</b><br>'+short.map(p=>`${p.name} — env. ${p.duration} min`).join("<br>")+'<br><small>Vous décidez : rien n’est remplacé automatiquement.</small></div>'}}
 ])
}
optimize.onclick=analyze;delay30.onclick=()=>{S.delay=30;save();analyze()};delay90.onclick=()=>{S.delay=90;save();analyze()};onTime.onclick=()=>{S.delay=0;save();advice.innerHTML='<div class="adviceResult">À l’heure : programme choisi conservé.</div>'}
routeBtn.onclick=()=>{let a=S.today.map(id=>all().find(p=>p.id===id)).filter(Boolean);if(!a.length)return openModal("Parcours","Choisissez au moins une visite.");let d=a.at(-1),wp=a.slice(0,-1).map(p=>p.lat?`${p.lat},${p.lng}`:p.query||p.name).join("|");let u=maps(d.lat?`${d.lat},${d.lng}`:d.query||d.name);if(wp)u+="&waypoints="+encodeURIComponent(wp);location.href=u}
homeBtn.onclick=()=>{let h=activeHome();location.href=maps(`${h.lat},${h.lng}`)}

function gpsMessage(e){
 if(!e)return "Erreur GPS inconnue.";
 if(e.code===1)return "Accès GPS refusé par Safari pour ce site. Vérifiez Safari > Réglages du site web > Localisation.";
 if(e.code===2)return "L’iPhone n’arrive pas à déterminer la position pour le moment.";
 if(e.code===3)return "La recherche de position a pris trop de temps. Réessayez à l’extérieur ou près d’une fenêtre.";
 return "Erreur GPS : "+(e.message||"inconnue");
}
function setGps(text,ok=false){
 const el=document.getElementById("gpsText"); if(el)el.textContent=text;
 const top=document.getElementById("locate"); if(top){top.textContent=ok?"🟢":"📍";top.title=text}
}
function locate(cb){
 if(!window.isSecureContext){let m="Le GPS exige une connexion HTTPS sécurisée.";setGps(m);return openModal("GPS",m)}
 if(!("geolocation" in navigator)){let m="La géolocalisation n’est pas disponible dans ce navigateur.";setGps(m);return openModal("GPS",m)}
 setGps("Recherche de votre position…");
 navigator.geolocation.getCurrentPosition(
   p=>{
     S.pos={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:Math.round(p.coords.accuracy),at:Date.now()};save();
     let m=`GPS actif — précision annoncée ±${S.pos.accuracy} m`;setGps(m,true);
     if(cb)cb(S.pos);
   },
   e=>{let m=gpsMessage(e);setGps(m,false);openModal("Diagnostic GPS",m)},
   {enableHighAccuracy:false,timeout:20000,maximumAge:60000}
 );
}
document.getElementById("locate").onclick=()=>locate(()=>openModal("GPS actif","Votre position est maintenant accessible à Guadeloupe 2027."));
document.getElementById("gpsTest").onclick=()=>locate();
document.querySelectorAll("[data-near]").forEach(b=>b.onclick=()=>locate(()=>location.href=searchMaps(b.dataset.near)));
nearSearch.onclick=()=>{if(!nearQuery.value.trim())return;locate(()=>location.href=searchMaps(nearQuery.value.trim()))}
checkGem.onclick=()=>locate(()=>{let pos=S.pos,cands=all().filter(p=>p.lat&&p.priority==="gem").map(p=>({...p,d:km(pos,p)})).filter(p=>p.d<1.2).sort((a,b)=>a.d-b.d);if(!cands.length)gemText.textContent="Aucune 💎 de notre sélection à moins d’environ 1,2 km. Pas de notification inutile.";else{let p=cands[0];gemText.innerHTML=`💎 <b>${p.name}</b> est à environ ${Math.round(p.d*1000)} m. ${p.note}`}})

notes.value=S.notes||"";saveNotes.onclick=()=>{S.notes=notes.value;save();openModal("Carnet","Informations enregistrées sur cet appareil.")}
function renderHomes(){homes.innerHTML=S.homes.map((h,i)=>`<div class="card"><h2>🏠 ${h.name}</h2><div class="homeRow"><div class="meta">${h.from} → ${h.to}<br>${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}</div><button class="ghost" data-home="${i}">Modifier</button></div></div>`).join("");document.querySelectorAll("[data-home]").forEach(b=>b.onclick=()=>{let i=+b.dataset.home,n=prompt("Nom du logement",S.homes[i].name),lat=prompt("Latitude",S.homes[i].lat),lng=prompt("Longitude",S.homes[i].lng);if(n&&lat&&lng){Object.assign(S.homes[i],{name:n,lat:+lat,lng:+lng});save();renderHomes();renderToday()}})}
notify.onclick=async()=>{if(!("Notification"in window))return openModal("Notifications","Ce navigateur ne prend pas en charge les notifications web.");let r=await Notification.requestPermission();openModal("Notifications",r==="granted"?"Notifications autorisées.":"Autorisation non accordée.")}
renderHomes();renderToday();renderPlaces();
if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js");

window.addEventListener("load",()=>{
 if(S.pos && Date.now()-S.pos.at<3600000) setGps(`Dernière position connue — précision ±${S.pos.accuracy||"?"} m`,true);
});


/* ===== Coffre voyage V0.3 : chiffrement local AES-GCM ===== */
let vaultKey=null;
const VAULT_DB="gw_vault_v1", VAULT_STORE="docs", VAULT_META="gw_vault_meta";

function b64(buf){return btoa(String.fromCharCode(...new Uint8Array(buf)))}
function unb64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer}
function rand(n){let a=new Uint8Array(n);crypto.getRandomValues(a);return a}

function openVaultDB(){
 return new Promise((resolve,reject)=>{
  const r=indexedDB.open(VAULT_DB,1);
  r.onupgradeneeded=()=>r.result.createObjectStore(VAULT_STORE,{keyPath:"id"});
  r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
 });
}
async function deriveVaultKey(pin,salt){
 const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(pin),"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey(
  {name:"PBKDF2",salt,iterations:210000,hash:"SHA-256"},
  material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]
 );
}
async function encJSON(obj,key){
 const iv=rand(12), plain=new TextEncoder().encode(JSON.stringify(obj));
 const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plain);
 return {iv:b64(iv),data:b64(cipher)};
}
async function decJSON(payload,key){
 const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(unb64(payload.iv))},key,unb64(payload.data));
 return JSON.parse(new TextDecoder().decode(plain));
}
async function encryptBytes(bytes,key){
 const iv=rand(12), cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,bytes);
 return {iv:b64(iv),data:cipher};
}
async function decryptBytes(payload,key){
 return crypto.subtle.decrypt({name:"AES-GCM",iv:new Uint8Array(unb64(payload.iv))},key,payload.data);
}

async function createOrUnlockVault(){
 const pin=document.getElementById("vaultPin").value.trim();
 if(pin.length<4){openModal("Coffre","Choisissez un code d’au moins 4 chiffres.");return}
 let meta=JSON.parse(localStorage.getItem(VAULT_META)||"null");
 try{
  if(!meta){
   const salt=rand(16);
   const key=await deriveVaultKey(pin,salt);
   const check=await encJSON({ok:"GUAD-V03"},key);
   meta={salt:b64(salt),check};
   localStorage.setItem(VAULT_META,JSON.stringify(meta));
   vaultKey=key;
  }else{
   const key=await deriveVaultKey(pin,new Uint8Array(unb64(meta.salt)));
   const test=await decJSON(meta.check,key);
   if(test.ok!=="GUAD-V03")throw new Error("bad pin");
   vaultKey=key;
  }
  document.getElementById("vaultPin").value="";
  document.getElementById("vaultLocked").classList.add("hidden");
  document.getElementById("vaultOpen").classList.remove("hidden");
  document.getElementById("vaultManager").classList.remove("hidden");
  await renderVaultDocs();
 }catch(e){
  vaultKey=null;
  openModal("Code incorrect","Impossible d’ouvrir le coffre avec ce code.");
 }
}
function lockVault(){
 vaultKey=null;
 document.getElementById("vaultLocked").classList.remove("hidden");
 document.getElementById("vaultOpen").classList.add("hidden");
 document.getElementById("vaultManager").classList.add("hidden");
 document.getElementById("docsList").innerHTML='<p class="meta">Coffre verrouillé.</p>';
}
async function addVaultFile(file){
 if(!vaultKey)return openModal("Coffre","Déverrouillez d’abord le coffre.");
 if(!file)return;
 if(file.size>15*1024*1024)return openModal("Fichier trop volumineux","Limite actuelle : 15 Mo par document.");
 try{
  const bytes=await file.arrayBuffer();
  const enc=await encryptBytes(bytes,vaultKey);
  const meta=await encJSON({
    name:file.name||("scan-"+new Date().toISOString().slice(0,10)+".jpg"),
    type:file.type||"application/octet-stream",
    category:document.getElementById("docCategory").value,
    created:new Date().toISOString()
  },vaultKey);
  const db=await openVaultDB();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(VAULT_STORE,"readwrite");
    tx.objectStore(VAULT_STORE).put({id:"d"+Date.now()+Math.random(),meta,iv:enc.iv,data:enc.data});
    tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
  });
  await renderVaultDocs();
  openModal("Document ajouté","Le document a été chiffré et enregistré uniquement sur cet appareil.");
 }catch(e){openModal("Erreur","Impossible d’enregistrer ce document : "+(e.message||e))}
}
async function getAllVaultRows(){
 const db=await openVaultDB();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(VAULT_STORE,"readonly"),r=tx.objectStore(VAULT_STORE).getAll();
  r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);
 });
}
async function renderVaultDocs(){
 if(!vaultKey)return;
 const box=document.getElementById("docsList");
 const rows=await getAllVaultRows();
 if(!rows.length){box.innerHTML='<p class="meta">Aucun document dans le coffre.</p>';return}
 box.innerHTML="";
 for(const row of rows.sort((a,b)=>String(b.id).localeCompare(String(a.id)))){
  let m;
  try{m=await decJSON(row.meta,vaultKey)}catch{continue}
  const div=document.createElement("div"); div.className="docItem";
  div.innerHTML=`<h3>${m.category}</h3><div class="meta">${m.name}<br>${new Date(m.created).toLocaleString("fr-BE")}</div>
  <div class="docActions"><button class="primary">Ouvrir</button><button class="ghost">Supprimer</button></div>`;
  const [openBtn,delBtn]=div.querySelectorAll("button");
  openBtn.onclick=()=>openVaultDoc(row,m,div);
  delBtn.onclick=()=>deleteVaultDoc(row.id);
  box.appendChild(div);
 }
}
async function openVaultDoc(row,m,div){
 try{
  const bytes=await decryptBytes({iv:row.iv,data:row.data},vaultKey);
  const blob=new Blob([bytes],{type:m.type});
  const url=URL.createObjectURL(blob);
  let old=div.querySelector(".previewWrap"); if(old){URL.revokeObjectURL(old.dataset.url||"");old.remove()}
  const w=document.createElement("div");w.className="previewWrap";w.dataset.url=url;
  if(m.type.startsWith("image/"))w.innerHTML=`<img alt="Document">`;
  else if(m.type==="application/pdf")w.innerHTML=`<iframe title="PDF"></iframe>`;
  else w.innerHTML=`<a class="btn primary" href="${url}" target="_blank">Ouvrir le fichier</a>`;
  div.appendChild(w);
  const el=w.querySelector("img,iframe"); if(el)el.src=url;
 }catch(e){openModal("Erreur","Impossible de déchiffrer le document.")}
}
async function deleteVaultDoc(id){
 if(!confirm("Supprimer définitivement ce document de cet appareil ?"))return;
 const db=await openVaultDB();
 await new Promise((resolve,reject)=>{
  const tx=db.transaction(VAULT_STORE,"readwrite");tx.objectStore(VAULT_STORE).delete(id);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
 });
 renderVaultDocs();
}

window.addEventListener("load",()=>{
 const u=document.getElementById("unlockVault"); if(u)u.onclick=createOrUnlockVault;
 const l=document.getElementById("lockVault"); if(l)l.onclick=lockVault;
 const r=document.getElementById("refreshDocs"); if(r)r.onclick=renderVaultDocs;
 const c=document.getElementById("cameraInput"); if(c)c.onchange=e=>{addVaultFile(e.target.files[0]);e.target.value=""};
 const f=document.getElementById("fileInput"); if(f)f.onchange=e=>{addVaultFile(e.target.files[0]);e.target.value=""};
});

/* ===== V0.3.1 : mises à jour PWA fiables ===== */
const APP_VERSION = "0.3.1";
let swRegistration = null;
let refreshingForUpdate = false;

function setUpdateText(text){
 const el=document.getElementById("updateText");
 if(el) el.textContent=text;
}

async function checkForAppUpdate(manual=false){
 if(!("serviceWorker" in navigator)){
  if(manual) setUpdateText("Les mises à jour automatiques ne sont pas disponibles dans ce navigateur.");
  return;
 }
 try{
  const reg = swRegistration || await navigator.serviceWorker.getRegistration();
  if(!reg){
   if(manual) setUpdateText("Service de mise à jour non encore installé. Rechargez la page une fois.");
   return;
  }
  if(manual) setUpdateText("Vérification de la nouvelle version…");
  await reg.update();
  if(manual && !reg.waiting && !reg.installing) setUpdateText(`Vous utilisez la version ${APP_VERSION}, à jour.`);
 }catch(e){
  if(manual) setUpdateText("Impossible de vérifier maintenant. Réessayez avec une connexion internet.");
 }
}

if("serviceWorker" in navigator){
 window.addEventListener("load", async ()=>{
  try{
   swRegistration = await navigator.serviceWorker.register("/sw.js", {updateViaCache:"none"});
   setUpdateText(`Version ${APP_VERSION} · vérification automatique active.`);

   swRegistration.addEventListener("updatefound", ()=>{
    const worker = swRegistration.installing;
    if(!worker) return;
    setUpdateText("Nouvelle version détectée… installation en cours.");
    worker.addEventListener("statechange", ()=>{
     if(worker.state === "installed" && navigator.serviceWorker.controller){
      setUpdateText("Nouvelle version installée · actualisation…");
     }
    });
   });

   // Vérifie à l'ouverture et lorsque l'utilisateur revient dans l'app.
   checkForAppUpdate(false);
   document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) checkForAppUpdate(false); });
  }catch(e){
   setUpdateText("La vérification automatique n’a pas pu démarrer.");
  }
 });

 navigator.serviceWorker.addEventListener("controllerchange", ()=>{
  if(refreshingForUpdate) return;
  refreshingForUpdate = true;
  window.location.reload();
 });
}

window.addEventListener("load", ()=>{
 const v=document.getElementById("appVersion"); if(v) v.textContent=`v${APP_VERSION}`;
 const b=document.getElementById("checkUpdate"); if(b) b.onclick=()=>checkForAppUpdate(true);
});
