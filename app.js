
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
