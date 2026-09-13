// Depuis la v0.5.10, ce endpoint n'est plus le chemin principal de la recherche de promenades :
// app.js appelle désormais overpass-api.de et lz4.overpass-api.de DIRECTEMENT depuis le
// navigateur (CORS ouvert vérifié sur les deux : Access-Control-Allow-Origin: *), pour que l'IP
// vue par ces serveurs soit celle de l'utilisateur plutôt que celle de Vercel. Raison : ce sont
// deux nœuds du même projet officiel overpass-api.de, qui bloque les IP de fournisseurs cloud
// (AWS/Azure) contre les abus — ce qui inclut apparemment les IP sortantes de Vercel, et faisait
// systématiquement échouer ces deux miroirs quand ils étaient appelés depuis ce serveur.
//
// Ce endpoint ne sert donc plus que de filet de sécurité, appelé par app.js avec
// ?mirrors=kumi : seul overpass.kumi.systems a une chance différente ici, puisque son échec
// éventuel n'est pas lié à un blocage d'IP. Retenter overpass-api.de/lz4 depuis ce même serveur
// donnerait le même résultat que l'appel direct qui vient d'échouer, en plus lent — ils sont
// donc exclus par défaut de ce filet (voir DEFAULT_MIRROR_ORDER), mais restent adressables via
// ?mirrors=overpass,lz4,kumi pour un appel autonome (tests, débogage).
const ENDPOINTS = {
  overpass: "https://overpass-api.de/api/interpreter",
  lz4: "https://lz4.overpass-api.de/api/interpreter",
  kumi: "https://overpass.kumi.systems/api/interpreter"
};
const DEFAULT_MIRROR_ORDER = ["kumi"];

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  const query = typeof req.query.data === "string" ? req.query.data : "";
  if (!query || query.length > 18000) {
    return res.status(400).json({ error: "Requête de promenade invalide." });
  }

  const requested = typeof req.query.mirrors === "string"
    ? req.query.mirrors.split(",").map(s => s.trim()).filter(k => ENDPOINTS[k])
    : [];
  const mirrorOrder = requested.length ? requested : DEFAULT_MIRROR_ORDER;

  let lastError = "Aucun serveur de données n'a répondu.";
  for (const key of mirrorOrder) {
    const endpoint = ENDPOINTS[key];
    const controller = new AbortController();
    // 18s par miroir. Le timeout client (fetchOverpassViaProxy dans app.js, 60s) doit rester
    // au-dessus du pire cas ici, sinon le navigateur abandonne avant que ce serveur ait fini.
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "Accept": "application/json",
          "User-Agent": "Guadeloupe-Compagnon/0.5.14"
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
