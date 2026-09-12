# Guadeloupe Compagnon v0.5.1

Correctifs :
- bouton très visible « PARCOURS + TEMPS » sur chaque promenade trouvée en ligne ;
- cache-busting de app.js / data.js / style.css pour éviter qu'un téléphone conserve l'ancienne interface ;
- stabilisation de la carte Leaflet après ouverture du panneau ;
- fond OpenStreetMap chargé sous le fond IGN ;
- si les tuiles IGN échouent, bascule automatique sur OpenStreetMap au lieu d'une carte grise ;
- plusieurs recalculs de taille de carte pour éviter de devoir jouer avec le zoom.

Le tracé, la distance et le temps restent issus des données disponibles ; aucun temps n'est inventé.
