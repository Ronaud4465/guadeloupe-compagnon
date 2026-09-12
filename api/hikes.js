// Ordre choisi d'après un test en conditions réelles (voir README v0.5.9) : overpass-api.de est
// le plus fiable aujourd'hui, lz4.overpass-api.de (nœud "lambert" du même projet officiel) est
// rapide et a été validé sur une vraie requête, kumi.systems est gardé en dernier car il ne
// répondait plus du tout au moment du test (18s perdus à chaque requête s'il est en tête).
// overpass.nchc.org.tw a été retiré : son nom DNS n'existe plus.
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
];

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  const query = typeof req.query.data === "string" ? req.query.data : "";
  if (!query || query.length > 18000) {
    return res.status(400).json({ error: "Requête de promenade invalide." });
  }

  let lastError = "Aucun serveur de données n'a répondu.";
  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController();
    // 3 miroirs x 18s = 54s dans le pire cas. Le timeout client (fetchOverpass dans app.js,
    // 60s) doit rester au-dessus de cette valeur, sinon le navigateur abandonne avant que ce
    // serveur ait fini d'essayer tous les miroirs.
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "Accept": "application/json",
          "User-Agent": "Guadeloupe-Compagnon/0.5.9"
        },
        body: "data=" + encodeURIComponent(query),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!r.ok) {
        lastError = `Serveur ${r.status}`;
        continue;
      }
      const data = await r.json();
      if (!data || !Array.isArray(data.elements)) {
        lastError = "Réponse de données invalide.";
        continue;
      }
      return res.status(200).json(data);
    } catch (e) {
      clearTimeout(timer);
      lastError = e && e.name === "AbortError" ? "Délai dépassé." : "Erreur de connexion.";
    }
  }
  return res.status(503).json({ error: lastError });
};
