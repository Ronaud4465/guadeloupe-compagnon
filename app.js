
const P=window.GUADELOUPE_PLACES;
const defaults={today:[],done:[],history:[],hideDone:false,delay:0,notes:"",custom:[],homes:[
{name:"Sainte-Anne",from:"2027-01-01",to:"2027-01-08",lat:16.2264,lng:-61.3850},
{name:"Deshaies",from:"2027-01-08",to:"2027-01-15",lat:16.3067,lng:-61.7925},
{name:"Bouillante",from:"2027-01-15",to:"2027-01-22",lat:16.1300,lng:-61.7690}],pos:null,navPreference:"ask"};
let S=Object.assign({},defaults,JSON.parse(localStorage.getItem("gw02")||"{}"));
const save=()=>localStorage.setItem("gw02",JSON.stringify(S));
const all=()=>P.concat(S.custom||[]);
function activeHome(){let d=new Date().toISOString().slice(0,10);return S.homes.find(h=>d>=h.from&&d<h.to)||S.homes[0]}
function maps(dest){return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`}
function waze(dest){return `https://www.waze.com/ul?q=${encodeURIComponent(dest)}&navigate=yes`}
function launchNav(dest, provider){location.href=provider==="waze"?waze(dest):maps(dest)}
function navigateTo(dest){
 const pref=S.navPreference||"ask";
 if(pref==="google"||pref==="waze")return launchNav(dest,pref);
 openModal("Choisir la navigation","Avec quelle application voulez-vous effectuer ce trajet ?",[
  {label:"🗺️ Google Maps",go:()=>launchNav(dest,"google")},
  {label:"🚗 Waze",go:()=>launchNav(dest,"waze")}
 ]);
}
window.navigateTo=navigateTo;
function navigateRoute(stops){
 if(!stops.length)return;
 const pref=S.navPreference||"ask";
 const google=()=>{let d=stops.at(-1),wp=stops.slice(0,-1).join("|");let u=maps(d);if(wp)u+="&waypoints="+encodeURIComponent(wp);location.href=u};
 const wz=()=>launchNav(stops[0],"waze");
 if(pref==="google")return google();
 if(pref==="waze")return wz();
 openModal("Démarrer le parcours",stops.length>1?"Google Maps peut afficher toutes les étapes. Waze vous guidera vers la première étape, puis le compagnon ouvrira la suivante.":"Choisissez votre application de navigation.",[
  {label:"🗺️ Google Maps",go:google},{label:"🚗 Waze",go:wz}
 ]);
}
function searchMaps(q){let c=S.pos?`${S.pos.lat},${S.pos.lng}`:`${activeHome().lat},${activeHome().lng}`;return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q+" near "+c)}`}
function km(a,b){const R=6371,x=(b.lat-a.lat)*Math.PI/180,y=(b.lng-a.lng)*Math.PI/180;return R*Math.sqrt(x*x+(Math.cos(a.lat*Math.PI/180)*y)**2)}
function openModal(t,x,actions=[]){modalTitle.textContent=t;modalText.textContent=x;modalActions.innerHTML="";actions.forEach(a=>{let b=document.createElement("button");b.textContent=a.label;b.onclick=()=>{a.go();modal.classList.add("hidden")};modalActions.appendChild(b)});modal.classList.remove("hidden")}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{document.querySelectorAll("nav button,.tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.getElementById(b.dataset.tab).classList.add("active")});
closeModal.onclick=()=>modal.classList.add("hidden");

function isDone(id){return (S.done||[]).includes(id)}
function historyEntry(id){return (S.history||[]).find(x=>x.id===id)}
function markDone(id){
 if(isDone(id))return;
 S.done=[...new Set([...(S.done||[]),id])];
 S.today=(S.today||[]).filter(x=>x!==id);
 S.history=[{id,at:new Date().toISOString()},...(S.history||[]).filter(x=>x.id!==id)];
 save();renderToday();renderPlaces();renderHistory();renderHikes();if(S.pos)renderNearbyHikes(S.pos);if(S.pos)renderNearbyHikes(S.pos);
}
function restorePlace(id){
 S.done=(S.done||[]).filter(x=>x!==id);
 S.history=(S.history||[]).filter(x=>x.id!==id);
 save();renderToday();renderPlaces();renderHistory();renderHikes();
}
window.markDone=markDone; window.restorePlace=restorePlace;
function renderHistory(){
 const el=document.getElementById("historyList"); if(!el)return;
 const rows=(S.history||[]).map(h=>({h,p:all().find(x=>x.id===h.id)})).filter(x=>x.p);
 document.getElementById("historyCount").textContent=`${rows.length} lieu${rows.length>1?'x':''} effectué${rows.length>1?'s':''}`;
 el.innerHTML=rows.length?rows.map(({h,p})=>`<div class="historyItem"><div><b>✓ ${p.name}</b><div class="meta">${new Date(h.at).toLocaleDateString('fr-BE',{day:'2-digit',month:'short',year:'numeric'})}</div></div><button class="ghost" onclick="restorePlace('${p.id}')">Remettre à visiter</button></div>`).join(""):'<p class="meta">Aucune visite terminée pour le moment.</p>';
}
function renderToday(){
 let h=activeHome();homeName.textContent=h.name;
 const today=(S.today||[]).filter(id=>!isDone(id));
 dayList.innerHTML=all().filter(p=>!isDone(p.id)).map(p=>`<div class="card place"><input type="checkbox" data-day="${p.id}" ${today.includes(p.id)?"checked":""}><div><h3>${p.priority==="gem"?"💎":p.priority==="star"?"⭐":""} ${p.name}</h3><div class="meta">${p.cat} · env. ${p.duration||60} min</div><span class="tag">${p.note||"Lieu ajouté"}</span>${HIKES[p.id]?`<div class="miniHike">🥾 ${HIKES[p.id].difficulty} · ${HIKES[p.id].duration}</div>`:""}</div><div class="todayActions"><button class="ghost" data-go="${p.id}">🧭</button>${today.includes(p.id)?`<button class="doneBtn" onclick="markDone('${p.id}')">✓ Fait</button>`:""}</div></div>`).join("");
 document.querySelectorAll("[data-day]").forEach(c=>c.onchange=()=>{S.today=c.checked?[...new Set([...(S.today||[]),c.dataset.day])]:(S.today||[]).filter(x=>x!==c.dataset.day);save();renderToday()});
 document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{let p=all().find(x=>x.id===b.dataset.go);navigateTo(p.lat?`${p.lat},${p.lng}`:p.query||p.name)});
 const summary=document.getElementById("dayProgress"); if(summary)summary.textContent=`${today.length} à faire aujourd’hui · ${(S.done||[]).length} déjà effectuée(s) pendant le voyage`;
}
function renderPlaces(){
 let q=(search.value||"").toLowerCase(),w=week.value;
 let arr=all().filter(p=>(w==="all"||String(p.week)===w)&&p.name.toLowerCase().includes(q));
 if(S.hideDone)arr=arr.filter(p=>!isDone(p.id));
 placeList.innerHTML=arr.map(p=>{let done=isDone(p.id);return `<div class="card ${done?'completedPlace':''}"><div class="titleRow"><h2>${done?'✓ ':p.priority==="gem"?'💎 ':p.priority==="star"?'⭐ ':''}${p.name}</h2>${done?'<span class="doneBadge">FAIT</span>':''}</div><div class="meta">${p.cat||"Lieu personnel"} · ${p.duration||60} min</div><p>${p.note||""}</p>${HIKES[p.id]?hikeInline(p):''}<div class="placeBtns">${done?`<button class="ghost" onclick="restorePlace('${p.id}')">↩ Remettre à visiter</button>`:`<button class="primary" onclick="navigateTo('${p.lat?`${p.lat},${p.lng}`:(p.query||p.name).replaceAll("'","")}')">🧭 Y aller</button><button class="ghost" onclick="toggleDay('${p.id}')">${(S.today||[]).includes(p.id)?"✓ Dans la journée":"+ Journée"}</button><button class="doneBtn" onclick="markDone('${p.id}')">✓ Fait</button>`}${p.custom?`<button class="ghost" onclick="removeCustom('${p.id}')">Supprimer</button>`:""}</div></div>`}).join("")
 const hd=document.getElementById('hideDone'); if(hd)hd.textContent=S.hideDone?'Afficher aussi les lieux faits':'Masquer les lieux faits';
}
window.toggleDay=id=>{if(isDone(id))return;S.today=(S.today||[]).includes(id)?S.today.filter(x=>x!==id):[...(S.today||[]),id];save();renderPlaces();renderToday()}
window.removeCustom=id=>{S.custom=S.custom.filter(x=>x.id!==id);S.today=(S.today||[]).filter(x=>x!==id);S.done=(S.done||[]).filter(x=>x!==id);S.history=(S.history||[]).filter(x=>x.id!==id);save();renderPlaces();renderToday();renderHistory()}
search.oninput=renderPlaces;week.onchange=renderPlaces;
addPlace.onclick=()=>{if(!newName.value.trim())return;S.custom.push({id:"c"+Date.now(),name:newName.value.trim(),query:newQuery.value.trim()||newName.value.trim(),cat:"Lieu personnel",duration:60,priority:"",custom:true});newName.value="";newQuery.value="";save();renderPlaces()}

function analyze(){
 const selected=(S.today||[]).filter(id=>!isDone(id));
 if(!selected.length)return openModal("Programme","Choisissez d’abord au moins une visite encore à faire.");
 let chosen=selected.map(id=>all().find(p=>p.id===id)).filter(Boolean), visitMins=chosen.reduce((a,p)=>a+(p.duration||60),0), mins=visitMins+S.delay;
 let now=new Date(), remaining=Math.max(0,(19-now.getHours())*60-now.getMinutes());
 const names=chosen.map(p=>p.name).join(' → ');
 if(S.delay===0)return openModal("Programme prioritaire",`${chosen.length} visite(s) prévues : ${names}. Environ ${Math.round(visitMins/60*10)/10} h de visites hors trajets. Je ne change rien.`);
 let short=all().filter(p=>!selected.includes(p.id)&&!isDone(p.id)&&(p.duration||60)<=90).slice(0,3);
 let feasible=remaining>=mins?'Le programme reste encore compatible avec une fin vers 19 h, hors trajets.':'Le temps restant devient serré pour tout faire avant 19 h, hors trajets.';
 let msg=`Retard déclaré : ${S.delay} min. Votre programme choisi reste prioritaire. ${feasible}`;
 openModal("La journée a changé",msg,[
 {label:"➡️ Continuer exactement comme prévu",go:()=>{S.delay=0;save();advice.innerHTML='<div class="adviceResult">Programme conservé. Aucune visite n’a été retirée.</div>'}},
 {label:"🔄 Reporter la dernière visite",go:()=>{let last=selected.at(-1);S.today=(S.today||[]).filter(x=>x!==last);S.delay=0;save();renderToday();advice.innerHTML='<div class="adviceResult">La dernière visite est reportée. Elle reste disponible dans À visiter.</div>'}},
 {label:"💡 Voir des alternatives plus courtes",go:()=>{advice.innerHTML='<div class="adviceResult"><b>Alternatives courtes possibles :</b><br>'+short.map(p=>`${p.name} — env. ${p.duration} min`).join("<br>")+'<br><small>Vous décidez : rien n’est remplacé automatiquement.</small></div>'}}
 ])
}
optimize.onclick=analyze;delay30.onclick=()=>{S.delay=30;save();analyze()};delay90.onclick=()=>{S.delay=90;save();analyze()};onTime.onclick=()=>{S.delay=0;save();advice.innerHTML='<div class="adviceResult">À l’heure : programme choisi conservé.</div>'}
routeBtn.onclick=()=>{let a=(S.today||[]).filter(id=>!isDone(id)).map(id=>all().find(p=>p.id===id)).filter(Boolean);if(!a.length)return openModal("Parcours","Choisissez au moins une visite.");let stops=a.map(p=>p.lat?`${p.lat},${p.lng}`:p.query||p.name);navigateRoute(stops)}
homeBtn.onclick=()=>{let h=activeHome();navigateTo(`${h.lat},${h.lng}`)}

const HIKES={
 "soufriere":{difficulty:"Difficile",duration:"4 h 30",distance:"6 km A/R",note:"Durée/distance : Rando Guadeloupe (Parc national). Sommet exposé : météo et accès à contrôler le matin.",source:"Rando Guadeloupe"},
 "carbet":{difficulty:"Selon la chute",duration:"2e chute : 45 min A/R · 1re chute : 3 h A/R",distance:"selon chute choisie",note:"Durées officielles du Parc national. Le dernier tronçon vers la 3e chute est interdit ; l’accès varie selon l’itinéraire.",source:"Parc national de la Guadeloupe"},
 "trois-cornes":{difficulty:"Facile",duration:"2 h",distance:"3,2 km · boucle",note:"Boucle de Sofaïa / Trois Cornes : données Rando Guadeloupe.",source:"Rando Guadeloupe"},
 "paradis":{difficulty:"Facile avec passages techniques",duration:"2–3 h A/R",distance:"env. 5 km A/R",note:"Durée documentée par un guide local ; deux traversées de rivière. À éviter par temps de pluie.",source:"Gwadaexplo"},
 "traversee":{difficulty:"Variable",duration:"Durée : non renseignée",distance:"plusieurs sentiers",note:"La Route de la Traversée regroupe plusieurs départs : la durée dépend du sentier choisi.",source:""},
 "ecrevisses":{difficulty:"Très facile",duration:"30 min A/R",distance:"415 m A/R",note:"Itinéraire aménagé depuis le parking ; données Rando Guadeloupe.",source:"Rando Guadeloupe"}
};
let ignMap=null,ignMarker=null,gpsMarker=null;
let nearHikeRadius=10;
function approxDriveMinutes(kmVal){return Math.max(3,Math.round((kmVal*1.22)/38*60));}
function renderNearbyHikes(pos){
 const el=document.getElementById("nearHikeList"), status=document.getElementById("nearHikeStatus"); if(!el)return;
 const rows=Object.keys(HIKES).map(id=>all().find(p=>p.id===id)).filter(Boolean).map(p=>({...p,nearKm:km(pos,p)})).filter(p=>p.nearKm<=nearHikeRadius).sort((x,y)=>x.nearKm-y.nearKm);
 if(status)status.textContent=`${rows.length} promenade${rows.length>1?'s':''} dans ${nearHikeRadius} km`;
 if(!rows.length){el.innerHTML=`<div class="card"><p>Aucune promenade de notre sélection dans un rayon de ${nearHikeRadius} km.</p><p class="meta">Augmentez le rayon ou utilisez la recherche libre. La base de promenades sera enrichie au fur et à mesure.</p></div>`;return;}
 el.innerHTML=rows.map(p=>{const h=HIKES[p.id], mins=approxDriveMinutes(p.nearKm);return `<div class="card nearbyHike ${isDone(p.id)?'completedPlace':''}"><div class="titleRow"><h2>${isDone(p.id)?'✓ ':''}🥾 ${p.name}</h2><span class="distanceBadge">${p.nearKm<1?Math.round(p.nearKm*1000)+' m':p.nearKm.toFixed(1)+' km'}</span></div><p><b>🚗 env. ${mins} min jusqu’au départ</b> · estimation</p><div class="meta">${h.distance} · ${h.duration} · ${h.difficulty}</div><p>${h.note}</p>${h.source?`<div class="sourceTag">Source : ${h.source}</div>`:''}<div class="placeBtns"><button class="ignBtn" onclick="openIgnMap('${p.id}')">🗺️ Voir sur IGN</button><button class="primary" onclick="navigateTo('${p.lat},${p.lng}')">🚗 Aller au départ</button>${isDone(p.id)?`<button class="ghost" onclick="restorePlace('${p.id}')">↻ Refaire</button>`:`<button class="ghost" onclick="toggleDay('${p.id}')">+ Ajouter aujourd’hui</button>`}</div></div>`}).join('');
}
function escHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function osmDifficulty(tags){
 const s=tags.sac_scale||"";
 const map={hiking:"Randonnée",mountain_hiking:"Randonnée montagne",demanding_mountain_hiking:"Montagne exigeante",alpine_hiking:"Alpin",demanding_alpine_hiking:"Alpin exigeant",difficult_alpine_hiking:"Alpin difficile"};
 return map[s]||"Difficulté non renseignée";
}
function osmDuration(tags){
 const d=tags.duration||tags.time||tags["roundtrip:duration"];
 return d?`Durée indiquée : ${escHtml(d)}`:"Durée non renseignée";
}
function osmDistance(tags){
 const d=tags.distance||tags.length;
 return d?`Distance indiquée : ${escHtml(d)}`:"Distance du parcours non renseignée";
}

const OVERPASS_ENDPOINTS=[
 "https://overpass.kumi.systems/api/interpreter",
 "https://overpass-api.de/api/interpreter",
 "https://overpass.nchc.org.tw/api/interpreter"
];

async function fetchOverpass(query){
 let lastError=null;
 for(const endpoint of OVERPASS_ENDPOINTS){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
   const url=endpoint+"?data="+encodeURIComponent(query);
   const r=await fetch(url,{method:"GET",headers:{"Accept":"application/json"},signal:controller.signal,cache:"no-store"});
   clearTimeout(timer);
   if(!r.ok)throw new Error("HTTP "+r.status);
   const data=await r.json();
   if(!data || !Array.isArray(data.elements))throw new Error("Réponse invalide");
   return {data,endpoint};
  }catch(err){
   clearTimeout(timer);
   lastError=err;
  }
 }
 throw lastError||new Error("Aucun serveur disponible");
}

async function discoverNearbyHikes(pos){
 const el=document.getElementById("nearHikeList"),status=document.getElementById("nearHikeStatus");
 if(!el)return;
 status.textContent="Recherche des promenades…";
 el.innerHTML='<div class="card"><p>🔎 Recherche d’itinéraires pédestres publics autour de votre position…</p><p class="meta">Plusieurs serveurs sont essayés automatiquement. Les durées et difficultés ne sont jamais inventées.</p></div>';

 const radius=Math.round(nearHikeRadius*1000);
 const q=`[out:json][timeout:18];(
   relation(around:${radius},${pos.lat},${pos.lng})["route"~"^(hiking|foot|walking)$"];
 );out center tags;`;

 try{
  const result=await fetchOverpass(q);
  const data=result.data;
  const seen=new Set();

  const rows=(data.elements||[]).map(x=>{
   const t=x.tags||{},lat=x.center?.lat,lng=x.center?.lon;
   if(!lat||!lng)return null;
   const name=t.name||t.ref||"Itinéraire pédestre sans nom";
   const key=(name+"|"+lat.toFixed(3)+"|"+lng.toFixed(3)).toLowerCase();
   if(seen.has(key))return null;
   seen.add(key);
   return {name,lat,lng,t,nearKm:km(pos,{lat,lng})};
  }).filter(Boolean)
    .filter(x=>x.nearKm<=nearHikeRadius*1.15)
    .sort((a,b)=>a.nearKm-b.nearKm)
    .slice(0,25);

  if(!rows.length){
   status.textContent="Aucune promenade référencée dans ce rayon";
   el.innerHTML=`<div class="card"><p>Aucun itinéraire pédestre public référencé n’a été trouvé dans un rayon de ${nearHikeRadius} km.</p><p class="meta">Cela ne veut pas dire qu’il n’existe aucune promenade à proximité : seulement qu’aucun itinéraire exploitable n’est référencé par la source dans ce rayon. Essaie 10 ou 20 km.</p></div>`;
   return;
  }

  status.textContent=`${rows.length} promenade${rows.length>1?"s":""} trouvée${rows.length>1?"s":""}`;
  el.innerHTML=rows.map(x=>`<div class="card nearbyHike">
    <div class="titleRow"><h2>🥾 ${escHtml(x.name)}</h2><span class="distanceBadge">${x.nearKm<1?Math.round(x.nearKm*1000)+" m":x.nearKm.toFixed(1)+" km"}</span></div>
    <div class="meta">${osmDistance(x.t)} · ${osmDuration(x.t)} · ${osmDifficulty(x.t)}</div>
    ${x.t.description?`<p>${escHtml(x.t.description)}</p>`:""}
    <div class="sourceTag">Source : OpenStreetMap · données contributives</div>
    <div class="placeBtns">
      <button class="ignBtn" onclick='openIgnCoords(${JSON.stringify(x.name)},${x.lat},${x.lng})'>🗺️ Voir sur IGN</button>
      <button class="primary" onclick="navigateTo('${x.lat},${x.lng}')">🚗 Aller à proximité</button>
    </div>
  </div>`).join("");
 }catch(e){
  status.textContent="Service de recherche indisponible";
  el.innerHTML=`<div class="card">
    <p>⚠️ Le GPS fonctionne, mais aucun des serveurs de recherche de promenades n’a répondu.</p>
    <p class="meta">Ce n’est pas un problème de localisation. Réessaie dans quelques instants ; l’app bascule automatiquement entre plusieurs serveurs.</p>
  </div>`;
 }
}
function setupNearbyHikes(){
 const btn=document.getElementById('nearHikesBtn'); if(btn)btn.onclick=()=>locate(pos=>discoverNearbyHikes(pos));
 document.querySelectorAll('.hikeRadius').forEach(b=>b.onclick=()=>{nearHikeRadius=+b.dataset.radius;document.querySelectorAll('.hikeRadius').forEach(x=>x.classList.toggle('active',x===b));});
}
function hikeInline(p){const h=HIKES[p.id];return `<div class="hikeBox"><b>🥾 Promenade / randonnée</b><div>${h.distance} · ${h.duration} · ${h.difficulty}</div><small>${h.note}</small>${h.source?`<div class="sourceTag">Source : ${h.source}</div>`:''}<div class="placeBtns"><button class="ignBtn" onclick="openIgnMap('${p.id}')">🗺️ Carte IGN</button><button class="ghost" onclick="navigateTo('${p.lat},${p.lng}')">🚗 Parking / départ</button></div></div>`}
function renderHikes(){
 const el=document.getElementById('hikeList'); if(!el)return;
 el.innerHTML=Object.keys(HIKES).map(id=>all().find(p=>p.id===id)).filter(Boolean).map(p=>`<div class="card ${isDone(p.id)?'completedPlace':''}"><div class="titleRow"><h2>${isDone(p.id)?'✓ ':''}🥾 ${p.name}</h2>${isDone(p.id)?'<span class="doneBadge">FAIT</span>':''}</div>${hikeInline(p)}${!isDone(p.id)?`<button class="doneBtn wide" onclick="markDone('${p.id}')">✓ Marquer comme fait</button>`:`<button class="ghost wide" onclick="restorePlace('${p.id}')">↩ Remettre à visiter</button>`}</div>`).join('');
}
window.openIgnCoords=function(name,lat,lng){
 document.getElementById('ignMapTitle').textContent=`🗺️ IGN · ${name}`;
 document.getElementById('ignMapModal').classList.remove('hidden');
 setTimeout(()=>{
  if(!window.L){document.getElementById('ignMapFallback').classList.remove('hidden');return;}
  if(ignMap){ignMap.remove();ignMap=null;}
  ignMap=L.map('ignMap',{zoomControl:true}).setView([lat,lng],14);
  L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png',{maxZoom:18,attribution:'IGN · Géoplateforme'}).addTo(ignMap);
  ignMarker=L.marker([lat,lng]).addTo(ignMap).bindPopup(name).openPopup();
 },120);
};
window.openIgnMap=function(id){
 const p=all().find(x=>x.id===id); if(!p||!p.lat)return;
 document.getElementById('ignMapTitle').textContent=`🗺️ IGN · ${p.name}`;
 document.getElementById('ignMapModal').classList.remove('hidden');
 setTimeout(()=>{
  if(!window.L){document.getElementById('ignMapFallback').classList.remove('hidden');return;}
  if(ignMap){ignMap.remove();ignMap=null;}
  ignMap=L.map('ignMap',{zoomControl:true}).setView([p.lat,p.lng],14);
  L.tileLayer('https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png',{maxZoom:18,attribution:'© IGN / Géoplateforme'}).addTo(ignMap);
  ignMarker=L.marker([p.lat,p.lng]).addTo(ignMap).bindPopup(p.name).openPopup();
  if(S.pos)gpsMarker=L.circleMarker([S.pos.lat,S.pos.lng],{radius:8}).addTo(ignMap).bindPopup('Votre position GPS');
  setTimeout(()=>ignMap.invalidateSize(),200);
 },80);
};
function closeIgn(){document.getElementById('ignMapModal').classList.add('hidden');if(ignMap){ignMap.remove();ignMap=null}}
window.closeIgn=closeIgn;
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
     const nhs=document.getElementById("nearHikeStatus"); if(nhs) nhs.textContent=`GPS accessible · ±${S.pos.accuracy} m`;
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
const hideDoneBtn=document.getElementById('hideDone'); if(hideDoneBtn)hideDoneBtn.onclick=()=>{S.hideDone=!S.hideDone;save();renderPlaces()};
const closeIgnBtn=document.getElementById('closeIgnMap'); if(closeIgnBtn)closeIgnBtn.onclick=closeIgn;
const useGpsIgn=document.getElementById('ignUseGps'); if(useGpsIgn)useGpsIgn.onclick=()=>locate(pos=>{if(ignMap){if(gpsMarker)ignMap.removeLayer(gpsMarker);gpsMarker=L.circleMarker([pos.lat,pos.lng],{radius:8}).addTo(ignMap).bindPopup('Votre position GPS').openPopup();ignMap.setView([pos.lat,pos.lng],15)}});

const navPrefEl=document.getElementById("navPreference");
if(navPrefEl){navPrefEl.value=S.navPreference||"ask";navPrefEl.onchange=()=>{S.navPreference=navPrefEl.value;save();openModal("Navigation enregistrée",navPrefEl.value==="google"?"Google Maps sera utilisé par défaut.":navPrefEl.value==="waze"?"Waze sera utilisé par défaut.":"L’application vous demandera à chaque trajet.")}}


setupNearbyHikes();
if(S.pos){const nhs=document.getElementById("nearHikeStatus");if(nhs)nhs.textContent="Dernière position disponible · appuyez sur Rechercher pour actualiser";}
renderHomes();renderToday();renderPlaces();renderHistory();renderHikes();
if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js");


async function changeVaultPin(){
 if(!vaultKey)return openModal("Coffre","Déverrouillez d’abord le coffre.");
 const pin=document.getElementById("newVaultPin").value.trim();
 const confirmPin=document.getElementById("confirmVaultPin").value.trim();
 if(pin.length<4)return openModal("Nouveau code","Choisissez un code d’au moins 4 chiffres.");
 if(pin!==confirmPin)return openModal("Nouveau code","Les deux codes ne correspondent pas.");
 try{
  const rows=await getAllVaultRows();
  const salt=rand(16);
  const newKey=await deriveVaultKey(pin,salt);
  const converted=[];
  for(const row of rows){
   const m=await decJSON(row.meta,vaultKey);
   const bytes=await decryptBytes({iv:row.iv,data:row.data},vaultKey);
   const enc=await encryptBytes(bytes,newKey);
   const meta=await encJSON(m,newKey);
   converted.push({...row,meta,iv:enc.iv,data:enc.data});
  }
  const db=await openVaultDB();
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(VAULT_STORE,"readwrite");
   const store=tx.objectStore(VAULT_STORE);
   converted.forEach(row=>store.put(row));
   tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error||new Error("transaction annulée"));
  });
  const check=await encJSON({ok:"GUAD-V03"},newKey);
  localStorage.setItem(VAULT_META,JSON.stringify({salt:b64(salt),check}));
  vaultKey=newKey;
  document.getElementById("newVaultPin").value="";
  document.getElementById("confirmVaultPin").value="";
  document.getElementById("changePinBox").classList.add("hidden");
  await renderVaultDocs();
  openModal("Code modifié","Le nouveau code est actif et les documents du coffre ont été rechiffrés.");
 }catch(e){
  openModal("Modification impossible","Le code n’a pas été modifié. Vos documents restent avec le code actuel.");
 }
}


// ===== V0.3.3 : scanner carte recto / verso =====
let cardFrontFile=null, cardBackFile=null;
function resetCardScan(){cardFrontFile=cardBackFile=null;const a=document.getElementById("cardFrontInput"),b=document.getElementById("cardBackInput");if(a)a.value="";if(b)b.value="";document.getElementById("frontStatus").textContent="Recto non photographié.";document.getElementById("backStatus").textContent="Verso non photographié.";document.getElementById("saveCardScan").disabled=true}
function imageFromFile(file){return new Promise((resolve,reject)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);resolve(im)};im.onerror=e=>{URL.revokeObjectURL(u);reject(e)};im.src=u})}
async function makeTwoSidedCard(front,back){const a=await imageFromFile(front),b=await imageFromFile(back),W=1600,gap=40,margin=50;const h=im=>Math.round(W*im.height/im.width),ah=h(a),bh=h(b),c=document.createElement("canvas");c.width=W+margin*2;c.height=ah+bh+gap+margin*2;const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(a,margin,margin,W,ah);x.drawImage(b,margin,margin+ah+gap,W,bh);const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",0.9));if(!blob)throw new Error("Création impossible");return new File([blob],"carte-recto-verso-"+new Date().toISOString().slice(0,10)+".jpg",{type:"image/jpeg"})}
async function saveCardScan(){if(!cardFrontFile||!cardBackFile)return openModal("Scanner","Photographiez d’abord le recto et le verso.");try{const f=await makeTwoSidedCard(cardFrontFile,cardBackFile);await addVaultFile(f);resetCardScan();document.getElementById("cardScanBox").classList.add("hidden")}catch(e){openModal("Scanner","Impossible de créer le document : "+(e.message||e))}}

window.addEventListener("load",()=>{
 document.querySelectorAll("[data-app-version]").forEach(el=>el.textContent="v"+APP_VERSION);
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


async function changeVaultPin(){
 if(!vaultKey)return openModal("Coffre","Déverrouillez d’abord le coffre.");
 const pin=document.getElementById("newVaultPin").value.trim();
 const confirmPin=document.getElementById("confirmVaultPin").value.trim();
 if(pin.length<4)return openModal("Nouveau code","Choisissez un code d’au moins 4 chiffres.");
 if(pin!==confirmPin)return openModal("Nouveau code","Les deux codes ne correspondent pas.");
 try{
  const rows=await getAllVaultRows();
  const salt=rand(16);
  const newKey=await deriveVaultKey(pin,salt);
  const converted=[];
  for(const row of rows){
   const m=await decJSON(row.meta,vaultKey);
   const bytes=await decryptBytes({iv:row.iv,data:row.data},vaultKey);
   const enc=await encryptBytes(bytes,newKey);
   const meta=await encJSON(m,newKey);
   converted.push({...row,meta,iv:enc.iv,data:enc.data});
  }
  const db=await openVaultDB();
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(VAULT_STORE,"readwrite");
   const store=tx.objectStore(VAULT_STORE);
   converted.forEach(row=>store.put(row));
   tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error||new Error("transaction annulée"));
  });
  const check=await encJSON({ok:"GUAD-V03"},newKey);
  localStorage.setItem(VAULT_META,JSON.stringify({salt:b64(salt),check}));
  vaultKey=newKey;
  document.getElementById("newVaultPin").value="";
  document.getElementById("confirmVaultPin").value="";
  document.getElementById("changePinBox").classList.add("hidden");
  await renderVaultDocs();
  openModal("Code modifié","Le nouveau code est actif et les documents du coffre ont été rechiffrés.");
 }catch(e){
  openModal("Modification impossible","Le code n’a pas été modifié. Vos documents restent avec le code actuel.");
 }
}

window.addEventListener("load",()=>{
 const u=document.getElementById("unlockVault"); if(u)u.onclick=createOrUnlockVault;
 const l=document.getElementById("lockVault"); if(l)l.onclick=lockVault;
 const sp=document.getElementById("showChangePin"); if(sp)sp.onclick=()=>document.getElementById("changePinBox").classList.remove("hidden");
 const cp=document.getElementById("changeVaultPin"); if(cp)cp.onclick=changeVaultPin;
 const cc=document.getElementById("cancelChangePin"); if(cc)cc.onclick=()=>document.getElementById("changePinBox").classList.add("hidden");
 const r=document.getElementById("refreshDocs"); if(r)r.onclick=renderVaultDocs;
 const ss=document.getElementById("startCardScan"); if(ss)ss.onclick=()=>{resetCardScan();document.getElementById("cardScanBox").classList.remove("hidden")};
 const sf=document.getElementById("cardFrontInput"); if(sf)sf.onchange=e=>{cardFrontFile=e.target.files[0]||null;document.getElementById("frontStatus").textContent=cardFrontFile?"✅ Recto prêt.":"Recto non photographié.";document.getElementById("saveCardScan").disabled=!(cardFrontFile&&cardBackFile)};
 const sb=document.getElementById("cardBackInput"); if(sb)sb.onchange=e=>{cardBackFile=e.target.files[0]||null;document.getElementById("backStatus").textContent=cardBackFile?"✅ Verso prêt.":"Verso non photographié.";document.getElementById("saveCardScan").disabled=!(cardFrontFile&&cardBackFile)};
 const sv=document.getElementById("saveCardScan"); if(sv)sv.onclick=saveCardScan;
 const sc=document.getElementById("cancelCardScan"); if(sc)sc.onclick=()=>{resetCardScan();document.getElementById("cardScanBox").classList.add("hidden")};
 const c=document.getElementById("cameraInput"); if(c)c.onchange=e=>{addVaultFile(e.target.files[0]);e.target.value=""};
 const f=document.getElementById("fileInput"); if(f)f.onchange=e=>{addVaultFile(e.target.files[0]);e.target.value=""};
});

/* ===== V0.3.4 : IGN + journée intelligente + historique ===== */
const APP_VERSION = "0.4.7";
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

/* ===== V0.4.0 : moteur séjour + météo + progression + journée réaliste ===== */
S.revisit=S.revisit||[]; S.homeOverride=S.homeOverride||"auto"; S.weatherCache=S.weatherCache||{}; save();

function tripDateISO(){ return new Date().toISOString().slice(0,10); }
function activeHome(){
 if(S.homeOverride!=="auto" && S.homes[+S.homeOverride]) return S.homes[+S.homeOverride];
 const d=tripDateISO(); return S.homes.find(h=>d>=h.from&&d<h.to)||S.homes[0];
}
function activeHomeIndex(){return Math.max(0,S.homes.indexOf(activeHome()))}
function placeWeekForHome(){return activeHomeIndex()+1}
function isRevisit(id){return (S.revisit||[]).includes(id)}
function eligibleToday(id){return !isDone(id)||isRevisit(id)}
function roadKm(a,b){return Math.max(.3,km(a,b)*1.28)}
function driveMin(a,b){const d=roadKm(a,b); return Math.max(5,Math.round((d/43)*60+3));}
function fmtKm(v){return v<10?v.toFixed(1):String(Math.round(v))}
function coords(x){return {lat:+x.lat,lng:+x.lng}}
function pDurationText(p){const m=p.duration||60;if(m>=360)return `${Math.round(m/60)} h environ`;if(m>=120){let a=(m-30)/60,b=(m+30)/60;return `${a%1?a.toFixed(1):a}–${b%1?b.toFixed(1):b} h`;}return `${m} min environ`}
function weatherSensitivity(p){
 const c=(p.cat||"").toLowerCase(),id=p.id;
 if(["petite-terre","saintes"].includes(id)||c.includes("bateau")||c.includes("snorkeling"))return "sun";
 if(c.includes("plage"))return "sun";
 if(id==="soufriere")return "mountain";
 if(c.includes("forêt")||c.includes("cascade")||c.includes("jardin")||c.includes("village")||c.includes("ville"))return "cloud";
 return "neutral";
}
function sectorStatus(p){
 const w=placeWeekForHome();
 if(String(p.week)===String(w))return {rank:0,label:"🟢 Idéal depuis ce logement",cls:"sectorGood"};
 const h=activeHome(); if(p.lat){const d=roadKm(h,p); if(d<22)return {rank:1,label:"🟡 Possible, mais mieux depuis une autre base",cls:"sectorLater"};}
 return {rank:2,label:"⚪ Hors secteur actuellement",cls:"sectorFar"};
}
function weatherLabel(p){
 const wx=S.weatherNow; if(!wx)return "";
 const s=weatherSensitivity(p);
 if(wx.kind==="sun" && (s==="sun"||s==="mountain"))return '<span class="sectorBadge weatherGood">☀️ Bonne fenêtre météo</span>';
 if(wx.kind!=="sun" && s==="sun")return '<span class="sectorBadge weatherNeutral">🌥️ À garder si possible pour une belle journée</span>';
 if(wx.kind!=="sun" && s==="cloud")return '<span class="sectorBadge weatherGood">🌿 Adapté à une journée maussade</span>';
 if(s==="mountain" && wx.kind!=="sun")return '<span class="sectorBadge weatherNeutral">⛰️ Météo à contrôler avant départ</span>';
 return "";
}
async function loadWeather(force=false){
 const h=activeHome(),key=`${h.lat.toFixed(2)},${h.lng.toFixed(2)}`;
 const old=S.weatherCache[key]; if(!force&&old&&Date.now()-old.at<30*60*1000){S.weatherNow=old.data;renderWeather();return old.data}
 try{
  const u=`https://api.open-meteo.com/v1/forecast?latitude=${h.lat}&longitude=${h.lng}&current=temperature_2m,precipitation,weather_code,cloud_cover&daily=weather_code,precipitation_probability_max&timezone=America%2FGuadeloupe&forecast_days=7`;
  const r=await fetch(u,{cache:"no-store"}); if(!r.ok)throw new Error("weather"); const j=await r.json();
  const code=j.current?.weather_code??0,cloud=j.current?.cloud_cover??0,prec=j.current?.precipitation??0;
  let kind=(code<=2&&cloud<55&&prec<0.2)?"sun":((code>=51||prec>0.5)?"rain":"cloud");
  const data={kind,temp:Math.round(j.current?.temperature_2m||0),cloud,prec,code,daily:j.daily};
  S.weatherNow=data;S.weatherCache[key]={at:Date.now(),data};save();renderWeather();renderPlaces();return data;
 }catch(e){const el=document.getElementById("weatherToday");if(el)el.textContent="🌤️ Météo indisponible pour le moment.";return null}
}
function renderWeather(){
 const el=document.getElementById("weatherToday"),w=S.weatherNow;if(!el)return;if(!w){el.textContent="🌤️ Météo : connexion nécessaire.";return}
 const t=w.kind==="sun"?"Belle fenêtre météo":w.kind==="rain"?"Journée humide / maussade":"Ciel mitigé / maussade";
 el.innerHTML=`${w.kind==="sun"?"☀️":w.kind==="rain"?"🌧️":"🌥️"} <b>${t}</b> · ${w.temp} °C · nuages ${w.cloud}%<br><span class="meta">La météo influence le type d’activité, jamais le secteur du logement.</span>`;
}
function selectedPlaces(){return (S.today||[]).filter(eligibleToday).map(id=>all().find(p=>p.id===id)).filter(Boolean)}
function routeHTML(list){
 if(!list.length)return ""; const h=activeHome();let prev=h,totalKm=0,totalDrive=0,totalVisit=0,out='<div class="routePlan"><b>🚗 Parcours du jour</b>';
 list.forEach((p,i)=>{const d=roadKm(prev,p),m=driveMin(prev,p);totalKm+=d;totalDrive+=m;totalVisit+=p.duration||60;out+=`<div class="routeStep"><b>${i?`${i+1}. `:"1. "}${p.name}</b><div class="routeArrow">${i?prev.name:"🏠 "+h.name} → ${p.name} : <b>${fmtKm(d)} km · ${m} min</b><br>⏱️ Sur place : <b>${pDurationText(p)}</b></div></div>`;prev=p});
 const d=roadKm(prev,h),m=driveMin(prev,h);totalKm+=d;totalDrive+=m;out+=`<div class="routeStep"><b>🏠 Retour au logement</b><div class="routeArrow">${prev.name} → ${h.name} : <b>${fmtKm(d)} km · ${m} min</b></div></div>`;
 out+=`<div class="adviceResult"><b>Total indicatif :</b> ${fmtKm(totalKm)} km · ${Math.round(totalDrive/5)*5} min de conduite · ${Math.round(totalVisit/30)/2} h sur les lieux.<br><small>Les temps routiers sont des estimations. Google Maps donnera le trafic réel au départ.</small></div></div>`;return out;
}
function renderRouteSummary(){const el=document.getElementById("dayRouteSummary");if(el)el.innerHTML=routeHTML(selectedPlaces())}
function setTodayPlan(ids,revisits=[]){S.today=[...new Set(ids)];S.revisit=[...new Set([...(S.revisit||[]),...revisits])];save();renderToday();renderRouteSummary()}
function scorePlace(p){
 const h=activeHome(),sec=sectorStatus(p); if(sec.rank===2)return -9999; let s=100-sec.rank*35; const d=roadKm(h,p);s-=d*.7;
 const ws=weatherSensitivity(p),wk=S.weatherNow?.kind;if(wk==="sun"&&(ws==="sun"||ws==="mountain"))s+=28;if(wk!=="sun"&&ws==="sun")s-=28;if(wk!=="sun"&&ws==="cloud")s+=18;
 if(p.priority==="gem")s+=10;if((p.duration||60)>360)s-=4;
 const recent=(S.history||[]).slice(0,3).map(x=>all().find(p=>p.id===x.id)).filter(Boolean); if(recent.some(r=>r.lat&&p.lat&&roadKm(r,p)<7))s-=18;
 return s;
}
function proposeDay(){
 let c=all().filter(p=>!isDone(p.id)&&sectorStatus(p).rank<2).sort((a,b)=>scorePlace(b)-scorePlace(a)); if(!c.length)return openModal("Proposition","Il ne reste plus de visite non effectuée dans ce secteur.");
 let main=c[0]; const mainDur=main.duration||60; let plan=[main];
 // Maximum un complément, uniquement s'il est réellement proche et si la journée reste raisonnable.
 if(mainDur<260){let near=c.slice(1).filter(p=>(p.duration||60)<=180&&roadKm(main,p)<=8).sort((a,b)=>roadKm(main,a)-roadKm(main,b))[0];if(near&&(mainDur+(near.duration||60))<=360)plan.push(near)}
 const msg=routeHTML(plan)+`<p><b>Pourquoi :</b> secteur ${activeHome().name}, météo actuelle et regroupement géographique. Par défaut, une activité principale${plan.length>1?' + un complément proche':''}.</p>`;
 openModal("✨ Proposition de journée","",[
  {label:"✓ Utiliser cette proposition",go:()=>setTodayPlan(plan.map(p=>p.id))},
  {label:"Non, garder mes choix",go:()=>{}}
 ]);document.getElementById("modalText").innerHTML=msg;
}
function fatigueAlternatives(){
 const origin=S.pos||coords(activeHome()); let c=all().filter(p=>!isDone(p.id)&&sectorStatus(p).rank<2&&p.lat).map(p=>({...p,near:roadKm(origin,p)})).filter(p=>p.near<16&&(p.cat||"").match(/Plage|Ville|Village|Jardin/)).sort((a,b)=>a.near-b.near).slice(0,4);
 if(!c.length)return "Aucune alternative calme de notre sélection à proximité immédiate.";
 return c.map(p=>`<b>${p.name}</b> — ${fmtKm(p.near)} km · env. ${driveMin(origin,p)} min · ${pDurationText(p)}`).join("<br>")+`<br><small>Possibilité de l’avancer même si elle était prévue plus tard.</small>`;
}
function adaptDayMenu(){
 openModal("🔄 Adapter ma journée","Choisissez la raison. Rien ne sera modifié sans votre accord.",[
  {label:"😴 Nous sommes fatigués",go:()=>{openModal("Alternatives plus tranquilles",fatigueAlternatives(),[{label:"Fermer",go:()=>{}}]);}},
  {label:"🌥️ Journée maussade",go:()=>{let c=all().filter(p=>!isDone(p.id)&&sectorStatus(p).rank<2&&weatherSensitivity(p)==="cloud").sort((a,b)=>scorePlace(b)-scorePlace(a)).slice(0,4);openModal("Moins dépendant du beau temps",c.map(p=>`<b>${p.name}</b> — ${fmtKm(roadKm(activeHome(),p))} km · env. ${driveMin(activeHome(),p)} min · ${pDurationText(p)}`).join("<br>")||"Aucune alternative enregistrée.");document.getElementById('modalText').innerHTML=document.getElementById('modalText').textContent;}},
  {label:"🏖️ Envie d’une plage",go:()=>{let c=all().filter(p=>!isDone(p.id)&&sectorStatus(p).rank<2&&(p.cat||"").includes("Plage")).sort((a,b)=>scorePlace(b)-scorePlace(a)).slice(0,4);openModal("Plages cohérentes avec votre secteur",c.map(p=>`${p.name} — ${fmtKm(roadKm(S.pos||activeHome(),p))} km · ${pDurationText(p)}`).join("\n"));}},
  {label:"🏠 Rentrer plus tôt",go:()=>openModal("Retour logement",`Depuis votre position, utilisez « Retour logement ». Le reste du programme restera disponible pour un autre jour.`)}
 ]);
}
function addRevisit(id){ if(!(S.today||[]).includes(id))S.today.push(id);S.revisit=[...new Set([...(S.revisit||[]),id])];save();renderToday();renderPlaces(); }
window.addRevisit=addRevisit;

// Une visite refaite reste dans l'historique et peut donc apparaître plusieurs fois.
const markDoneBase=markDone;
markDone=function(id){
 if(isDone(id)&&isRevisit(id)){
  S.today=(S.today||[]).filter(x=>x!==id);S.revisit=(S.revisit||[]).filter(x=>x!==id);S.history=[{id,at:new Date().toISOString(),revisit:true},...(S.history||[])];save();renderToday();renderPlaces();renderHistory();renderHikes();return;
 }
 markDoneBase(id);
};window.markDone=markDone;

function renderToday(){
 const h=activeHome();homeName.textContent=h.name; const ids=(S.today||[]).filter(eligibleToday);const chosen=ids.map(id=>all().find(p=>p.id===id)).filter(Boolean);
 dayList.innerHTML=all().filter(p=>!isDone(p.id)||isRevisit(p.id)).map(p=>`<div class="card place"><input type="checkbox" data-day="${p.id}" ${ids.includes(p.id)?"checked":""}><div><h3>${isRevisit(p.id)?"↻ ":p.priority==="gem"?"💎 ":p.priority==="star"?"⭐ ":""}${p.name}</h3><div class="meta">${p.cat} · ${pDurationText(p)}</div><span class="tag">${p.note||"Lieu ajouté"}</span>${HIKES[p.id]?`<div class="miniHike">🥾 ${HIKES[p.id].difficulty} · ${HIKES[p.id].duration}</div>`:""}</div><div class="todayActions"><button class="ghost" data-go="${p.id}">🧭</button>${ids.includes(p.id)?`<button class="doneBtn" onclick="markDone('${p.id}')">✓ Fait</button>`:""}</div></div>`).join("");
 document.querySelectorAll("[data-day]").forEach(c=>c.onchange=()=>{S.today=c.checked?[...new Set([...(S.today||[]),c.dataset.day])]:(S.today||[]).filter(x=>x!==c.dataset.day);if(!c.checked)S.revisit=(S.revisit||[]).filter(x=>x!==c.dataset.day);save();renderToday()});
 document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{let p=all().find(x=>x.id===b.dataset.go);navigateTo(p.lat?`${p.lat},${p.lng}`:p.query||p.name)});
 const summary=document.getElementById("dayProgress");if(summary)summary.textContent=`${chosen.length} étape${chosen.length>1?'s':''} aujourd’hui · ${(S.history||[]).length} visite(s) enregistrée(s) dans l’historique`;
 renderRouteSummary();
}
function renderPlaces(){
 let q=(search.value||"").toLowerCase(),w=week.value;let arr=all().filter(p=>(w==="all"||String(p.week)===w)&&p.name.toLowerCase().includes(q));if(S.hideDone)arr=arr.filter(p=>!isDone(p.id));
 arr.sort((a,b)=>sectorStatus(a).rank-sectorStatus(b).rank||scorePlace(b)-scorePlace(a));
 placeList.innerHTML=arr.map(p=>{let done=isDone(p.id),sec=sectorStatus(p);return `<div class="card ${done?'completedPlace ':''}${sec.rank===0?'zoneGood':sec.rank===1?'zoneLater':'zoneFar'}"><div class="titleRow"><h2>${done?'✓ ':p.priority==="gem"?'💎 ':p.priority==="star"?'⭐ ':''}${p.name}</h2>${done?'<span class="doneBadge">FAIT</span>':''}</div><span class="sectorBadge ${sec.cls}">${sec.label}</span>${weatherLabel(p)}<div class="meta">${p.cat||"Lieu personnel"} · ${pDurationText(p)} · depuis ${activeHome().name}: ${p.lat?`${fmtKm(roadKm(activeHome(),p))} km · env. ${driveMin(activeHome(),p)} min`:"distance inconnue"}</div><p>${p.note||""}</p>${HIKES[p.id]?hikeInline(p):''}<div class="placeBtns">${done?`<button class="revisitBtn" onclick="addRevisit('${p.id}')">↻ Refaire cette visite</button><button class="ghost" onclick="restorePlace('${p.id}')">↩ Retirer de l’historique</button>`:`<button class="primary" onclick="navigateTo('${p.lat?`${p.lat},${p.lng}`:(p.query||p.name).replaceAll("'","")}')">🧭 Y aller</button><button class="ghost" onclick="toggleDay('${p.id}')">${(S.today||[]).includes(p.id)?"✓ Dans la journée":"+ Journée"}</button><button class="doneBtn" onclick="markDone('${p.id}')">✓ Fait</button>`}${p.custom?`<button class="ghost" onclick="removeCustom('${p.id}')">Supprimer</button>`:""}</div></div>`}).join("");
 const hd=document.getElementById('hideDone');if(hd)hd.textContent=S.hideDone?'Afficher aussi les lieux faits':'Masquer les lieux faits';
}
function renderHomes(){
 const ov=document.getElementById("homeOverride");if(ov){ov.innerHTML='<option value="auto">Automatique selon la date</option>'+S.homes.map((h,i)=>`<option value="${i}" ${String(S.homeOverride)===String(i)?'selected':''}>${h.name}</option>`).join('');ov.value=S.homeOverride;ov.onchange=()=>{S.homeOverride=ov.value;save();renderHomes();renderToday();renderPlaces();loadWeather(true)}}
 homes.innerHTML=S.homes.map((h,i)=>`<div class="card"><h2>🏠 Étape ${i+1} · ${h.name}</h2><div class="homeEditGrid"><label>Nom<input data-hname="${i}" value="${h.name.replaceAll('"','&quot;')}"></label><label>Adresse / repère<input data-haddr="${i}" value="${h.address||''}" placeholder="Adresse exacte du logement"></label><label>Du<input type="date" data-hfrom="${i}" value="${h.from}"></label><label>Au<input type="date" data-hto="${i}" value="${h.to}"></label><label>Latitude<input data-hlat="${i}" value="${h.lat}"></label><label>Longitude<input data-hlng="${i}" value="${h.lng}"></label><button class="ghost full" data-usegpshome="${i}">📍 Utiliser ma position GPS comme coordonnées du logement</button><button class="primary full" data-savehome="${i}">Enregistrer ce logement</button></div></div>`).join('');
 document.querySelectorAll('[data-savehome]').forEach(b=>b.onclick=()=>{const i=+b.dataset.savehome,g=a=>document.querySelector(`[${a}="${i}"]`).value.trim();Object.assign(S.homes[i],{name:g('data-hname'),address:g('data-haddr'),from:g('data-hfrom'),to:g('data-hto'),lat:+g('data-hlat'),lng:+g('data-hlng')});save();renderHomes();renderToday();renderPlaces();loadWeather(true)});
 document.querySelectorAll('[data-usegpshome]').forEach(b=>b.onclick=()=>locate(pos=>{const i=+b.dataset.usegpshome;S.homes[i].lat=pos.lat;S.homes[i].lng=pos.lng;save();renderHomes();renderToday();renderPlaces()}));
}

window.addEventListener("load",()=>{
 const s=document.getElementById("suggestDay");if(s)s.onclick=proposeDay;
 const a=document.getElementById("adaptDay");if(a)a.onclick=adaptDayMenu;
 renderHomes();renderToday();renderPlaces();renderHistory();loadWeather(false);
});
