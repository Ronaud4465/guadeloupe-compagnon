# Guadeloupe Compagnon v0.4.6

Corrections principales :
- Recherche de promenades autour de la position GPS avec bascule automatique entre plusieurs serveurs Overpass.
- Délai maximal par serveur pour éviter un blocage interminable.
- Messages distincts :
  - GPS indisponible
  - aucune promenade référencée dans le rayon
  - service de recherche indisponible
- Les durées, distances de parcours et difficultés ne sont affichées que si la source les fournit.
- Version centralisée dans l'application pour éviter les affichages contradictoires.

Test conseillé :
Autour → Promenades autour de moi → 5 km → Rechercher.
Si aucun résultat n'est trouvé, essayer 10 puis 20 km.
