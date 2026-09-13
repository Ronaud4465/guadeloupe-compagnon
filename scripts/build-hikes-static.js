#!/usr/bin/env node
// Construit un fichier statique de promenades (hikes-data-<zone>.js) à partir d'un dump brut
// Overpass (relation(area...);out geom;), pour permettre une recherche "promenades autour de
// moi" instantanée et hors-ligne dans les zones couvertes, sans dépendre d'Overpass en direct.
//
// Usage : node scripts/build-hikes-static.js <raw-overpass-dump.json> <output.js> <VAR_NAME> <maxPointsPerRelation>
// Voir README.md pour la commande complète de régénération par zone.

const fs = require("fs");

const [, , inputPath, outputPath, varName, maxPtsArg, bboxArg] = process.argv;
if (!inputPath || !outputPath || !varName) {
  console.error("Usage: node build-hikes-static.js <input.json> <output.js> <VAR_NAME> [maxPointsPerRelation] [minLat,minLon,maxLat,maxLon]");
  process.exit(1);
}
const maxPts = parseInt(maxPtsArg || "100000", 10); // pas de plafond réel par défaut si omis
// La bbox de la zone (utilisée par app.js pour savoir si la position GPS de l'utilisateur tombe
// dans cette zone) DOIT être la vraie étendue administrative de la région, pas déduite des
// itinéraires : un GR qui traverse la Wallonie vers la France/l'Allemagne a un bounding box qui
// déborde largement de la vraie région, ce qui gonflerait la zone de détection à tort.
const bboxOverride = bboxArg ? (() => {
  const [minLat, minLon, maxLat, maxLon] = bboxArg.split(",").map(Number);
  return { minLat, minLon, maxLat, maxLon };
})() : null;

const raw = JSON.parse(fs.readFileSync(inputPath, "utf8").replace(/^﻿/, ""));

function capMembers(members, cap) {
  const capped = [];
  let remaining = cap;
  for (const m of (members || [])) {
    const geom = Array.isArray(m.geometry) ? m.geometry : [];
    if (geom.length <= remaining) {
      capped.push(m);
      remaining -= geom.length;
    } else {
      if (remaining > 0) capped.push({ ...m, geometry: geom.slice(0, remaining) });
      break;
    }
  }
  return capped;
}

let excludedNetwork = 0, noBounds = 0, truncated = 0;
const relations = [];
let minLat = Infinity, minLon = Infinity, maxLat = -Infinity, maxLon = -Infinity;

for (const el of raw.elements || []) {
  if (el.type !== "relation") continue;
  const t = el.tags || {};
  if (t.type === "network" || t.type === "superroute") { excludedNetwork++; continue; }
  if (!el.bounds) { noBounds++; continue; }

  const totalPts = (el.members || []).reduce((s, m) => s + ((m.geometry || []).length), 0);
  const members = capMembers(el.members, maxPts);
  if (totalPts > maxPts) truncated++;

  minLat = Math.min(minLat, el.bounds.minlat); maxLat = Math.max(maxLat, el.bounds.maxlat);
  minLon = Math.min(minLon, el.bounds.minlon); maxLon = Math.max(maxLon, el.bounds.maxlon);

  relations.push({
    id: el.id,
    tags: el.tags,
    bounds: el.bounds,
    members
  });
}

const bbox = bboxOverride || { minLat, minLon, maxLat, maxLon };
const out = `// Fichier généré automatiquement par scripts/build-hikes-static.js — NE PAS ÉDITER À LA MAIN.
// Voir README.md ("Régénérer les données de promenades statiques") pour la commande de régénération.
// Généré le ${new Date().toISOString()} · ${relations.length} itinéraires · plafond ${maxPts} points/itinéraire.
window.${varName}={bbox:${JSON.stringify(bbox)},relations:${JSON.stringify(relations)}};
`;

fs.writeFileSync(outputPath, out);

const rawBytes = Buffer.byteLength(out);
console.log(`Écrit ${outputPath}`);
console.log(`  Relations : ${relations.length} (${excludedNetwork} exclues type=network/superroute, ${noBounds} sans bounds)`);
console.log(`  Tronquées au plafond de ${maxPts} pts : ${truncated}`);
console.log(`  Bbox utilisée : ${JSON.stringify(bbox)}${bboxOverride ? " (fournie en argument)" : " (déduite des itinéraires — vérifier qu'aucun itinéraire ne déborde à l'étranger)"}`);
if (bboxOverride) console.log(`  Bbox déduite des itinéraires (pour comparaison) : ${JSON.stringify({ minLat, minLon, maxLat, maxLon })}`);
console.log(`  Taille fichier : ${(rawBytes/1024/1024).toFixed(2)} Mo (brut, non compressé)`);
