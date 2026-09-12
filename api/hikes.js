const ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter"
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
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "Accept": "application/json",
          "User-Agent": "Guadeloupe-Compagnon/0.5.5"
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
