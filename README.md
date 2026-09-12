# Guadeloupe Compagnon v0.5.6

## v0.5.6 — correctif de régression sur la recherche de promenades

La v0.5.4 avait ajouté un filtre `["type"!~"network|superroute"]` **directement dans la
requête Overpass** pour exclure les réseaux régionaux entiers. Combiner un filtre regex
négatif avec un autre filtre regex dans la même requête est connu pour être instable selon
la version du serveur Overpass interrogé (comportement documenté côté Overpass-API) : ça
pouvait faire échouer la requête sur un ou plusieurs des 3 miroirs, d'où le message
« Service de recherche indisponible » apparaissant plus souvent qu'avant.

- la requête Overpass est revenue à sa forme simple (celle de la v0.5.3) ;
- l'exclusion des réseaux régionaux (`type=network`/`superroute`) se fait maintenant **côté
  app**, sur les résultats déjà reçus — même effet, mais aucun risque de casser la requête
  envoyée au serveur ;
- en cas d'échec, le message affiche maintenant le détail technique de l'erreur, pour
  distinguer plus vite une vraie panne réseau d'un bug côté app.

## v0.5.5 — suivi GPS en direct sur la carte

Nouveau bouton **🎯 Suivre ma position en direct** dans la fenêtre carte (IGN ou tracé de
promenade) :
- utilise `watchPosition` (et non plus un seul relevé ponctuel) : le point bleu bouge sur la
  carte au fur et à mesure que vous marchez, sans avoir à rappuyer sur un bouton ;
- la carte se recentre automatiquement si votre position sort du cadre visible ;
- si un tracé de promenade est chargé, l'app affiche en continu votre distance au tracé le
  plus proche ("à X m du tracé"), pour savoir si vous vous en écartez ;
- le suivi s'arrête automatiquement en fermant la carte ou en ouvrant une autre carte, pour ne
  pas consommer de GPS inutilement en arrière-plan.

Le suivi ne fonctionne que pendant que la page reste ouverte et affichée à l'écran (limite du
navigateur, pas de suivi en tâche de fond une fois l'app quittée).

## v0.5.3 — distance sur le tracé réel

Avant, la distance était calculée par rapport au centre administratif/géométrique d'une relation OpenStreetMap.
Pour un long itinéraire comme « Pays de Liège », cela pouvait donner un résultat absurde.

- la recherche récupère la géométrie du parcours ;
- la distance est calculée entre la position GPS et le segment réel le plus proche du tracé ;
- un résultat n'est affiché que si le tracé lui-même passe réellement dans le rayon choisi ;
- le badge indique « à X km du tracé ».

## v0.5.4 — exclusion des réseaux régionaux + dénivelé

Le calcul de distance de la v0.5.3 était juste, mais un cas restait trompeur : certains noms
(« Pays de Liège », etc.) ne désignent pas une promenade précise mais un **réseau régional**
entier (relation OSM `type=network`, qui regroupe tout un territoire). Le tracé passait bien à
X km à un endroit, mais le reste du réseau pouvait s'étendre sur toute la région — ce n'était
pas « une promenade à X km ».

- les relations `type=network` / `type=superroute` (réseaux entiers) sont maintenant exclues de
  la recherche par position GPS ; seuls de vrais itinéraires ponctuels sont proposés ;
- seuls les membres avec un rôle de chemin marchable (main/alternative/approach/excursion/
  connection, ou rôle vide) comptent dans le calcul de distance et de tracé — les membres
  « limite », « étiquette », etc. sont ignorés ;
- si un itinéraire retenu reste malgré tout très long (> 25 km référencés), l'app l'affiche
  quand même (rien n'est masqué) mais ajoute un avertissement explicite : seule une portion
  est proche, le reste peut être loin ;
- **Dénivelé (D+/D-) et estimation de temps adaptée à la pente** : en ouvrant « PARCOURS +
  TEMPS », l'app interroge un service d'altitude public (open-elevation, puis opentopodata en
  secours) le long du tracé, calcule le dénivelé positif/négatif, et affiche une estimation de
  marche (4 km/h à plat + majoration selon la montée/descente). Cette estimation est toujours
  clairement marquée comme indicative — elle ne remplace jamais une durée officielle fournie
  par la source, et n'apparaît pas si le service d'altitude est injoignable (rien n'est inventé).

Le rayon 5 km signifie donc désormais : une vraie promenade ponctuelle passe réellement à 5 km
maximum de la position GPS — pas un réseau régional entier.
