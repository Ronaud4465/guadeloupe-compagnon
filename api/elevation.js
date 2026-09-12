// Relais serveur pour la recherche d'altitude le long d'un tracé (nécessaire pour estimer
// un temps de marche qui tienne compte du dénivelé : "à plat" et "en montée" ne se marchent
// pas à la même vitesse). Plusieurs fournisseurs gratuits sont essayés, dans l'ordre, comme
// pour /api/hikes.js — aucune clé n'est requise.

async function fromOpenElevation(points) {
  const r = await fetch("https://api.open-elevation.com/api/v1/lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      locations: points.map((p) => ({ latitude: p.lat, longitude: p.lng }))
    }),
    signal: AbortSignal.timeout(15000)
  });
  if (!r.ok) throw new Error("open-elevation " + r.status);
  const data = await r.json();
  if (!Array.isArray(data.results)) throw new Error("open-elevation: réponse invalide");
  return data.results.map((x) => (typeof x.elevation === "number" ? x.elevation : null));
}

async function fromOpenTopoData(points) {
  // Limite d'usage public : on découpe par lots de 100 points.
  const chunks = [];
  for (let i = 0; i < points.length; i += 100) chunks.push(points.slice(i, i + 100));
  const out = [];
  for (const chunk of chunks) {
    const locs = chunk.map((p) => `${p.lat},${p.lng}`).join("|");
    const r = await fetch(
      "https://api.opentopodata.org/v1/srtm90m?locations=" + encodeURIComponent(locs),
      { signal: AbortSignal.timeout(15000) }
    );
    if (!r.ok) throw new Error("opentopodata " + r.status);
    const data = await r.json();
    if (!Array.isArray(data.results)) throw new Error("opentopodata: réponse invalide");
    out.push(...data.results.map((x) => (typeof x.elevation === "number" ? x.elevation : null)));
  }
  return out;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non supportée." });
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (_) { body = null; }
  }
  const points = body && Array.isArray(body.points) ? body.points : null;
  if (!points || !points.length || points.length > 300) {
    return res.status(400).json({ error: "Liste de points invalide (1 à 300 attendus)." });
  }
  for (const p of points) {
    if (typeof p.lat !== "number" || typeof p.lng !== "number") {
      return res.status(400).json({ error: "Point de tracé invalide." });
    }
  }

  const providers = [fromOpenElevation, fromOpenTopoData];
  let lastError = "Aucun service d'altitude n'a répondu.";
  for (const provider of providers) {
    try {
      const elevations = await provider(points);
      return res.status(200).json({ elevations });
    } catch (e) {
      lastError = e && e.message ? e.message : "Erreur de service d'altitude.";
    }
  }
  return res.status(503).json({ error: lastError });
};
