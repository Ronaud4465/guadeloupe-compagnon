# Guadeloupe Compagnon v0.5.8

## v0.5.8 — la recherche de promenades ne téléchargeait plus aucune géométrie, puis téléchargeait trop

Deux bugs enchaînés sur la même fonctionnalité, corrigés dans cette version :

**1. `out geom tags;` supprimait silencieusement tout tracé.** La requête Overpass de
`discoverNearbyHikes` combinait le modifieur de géométrie `geom` avec le niveau de verbosité
`tags` (comme `ids`/`skel`/`body`/`tags`/`meta`) : `tags` ne charge pas le corps complet de
l'élément, dont `geom` a pourtant besoin pour y accrocher les coordonnées. Résultat : chaque
relation renvoyée n'avait ni `members` ni géométrie, donc plus aucune promenade n'était jamais
affichée (0 résultat à 5 km comme à 20 km), indépendamment du filtre `type=network`/`superroute`
et du filtrage par rôle retiré en v0.5.7 (qui n'étaient pour rien dans ce bug).

**2. Le correctif immédiat (`out geom;` seul) téléchargeait la géométrie complète et non
tronquée de chaque itinéraire matché** — y compris des GR de plusieurs centaines de km dont
seul un segment passe à proximité (GR 121 Liège→Bruxelles = 300 km entièrement téléchargés
pour une recherche à 5 km). Résultat : réponses de plusieurs Mo, dépassant régulièrement le
délai côté client ou le nombre de tentatives sur les miroirs Overpass publics → message
« Service de recherche indisponible » alors que le GPS et l'API fonctionnaient.

La requête est maintenant faite en 3 temps :
1. liste des relations proches avec seulement tags + bounding box (`out tags bb;`, réponse
   légère même avec des centaines de relations autour du point) ;
2. côté app, exclusion des super-relations "réseau" (`type=network`/`superroute`, comme avant)
   et des relations dont la bounding box dépasse 18 km de diagonale (trop étendues pour être
   une promenade ponctuelle : GR, itinéraires de pèlerinage...), puis on ne garde que les 70
   candidates les plus proches (distance point→bounding box, qui ne peut jamais écarter à tort
   un itinéraire réellement proche) ;
3. téléchargement de la géométrie complète uniquement pour ces survivantes, en un seul appel
   groupé par id.

Un plafond de 4000 points de géométrie par itinéraire a aussi été ajouté comme garde-fou
(troncature + mention « itinéraire étendu »), pour qu'un futur GR ne puisse plus jamais faire
exploser la réponse même s'il passait le filtre de bounding box.

Testé en conditions réelles sur 3 zones (Liège, Sainte-Anne en Guadeloupe, Bouillon en
Ardennes), 5/10/20 km : de 0 résultat dans une zone peu dense (Sainte-Anne, 5 km — confirmé
non lié au filtre, aucune relation n'est déjà renvoyée par l'étape 1) à 70 candidates
plafonnées dans les zones denses (jusqu'à 554 relations brutes trouvées à 20 km autour de
Liège) ; réponse complète en 1 à 27 s selon le rayon et la charge des miroirs Overpass publics
au moment du test, sans timeout, contre des échecs systématiques ou des réponses de plusieurs
Mo avant ce correctif. Le comportement visible pour l'utilisateur (cartes, bouton
« PARCOURS + TEMPS » avec tracé complet, limite de 25 résultats affichés) est inchangé.

**Timeout client/serveur incohérents.** Le délai d'abandon côté client (`fetchOverpass` dans
`app.js`) était de 30 s, alors que le serveur (`api/hikes.js`) peut mettre jusqu'à 54 s dans le
pire cas (3 miroirs Overpass essayés en cascade, 18 s chacun) — un cas mesuré à 26,9 s en
conditions réelles (Bouillon, 20 km) s'approchait dangereusement de cette limite. Le navigateur
pouvait donc abandonner et afficher « Service de recherche indisponible » alors que le serveur
était encore en train d'essayer un miroir suivant qui aurait fini par répondre. Le timeout
client passe à 60 s (`discoverNearbyHikes` fait 2 appels séquentiels — tags+bb puis géométrie —
ce délai s'applique à chacun indépendamment), ce qui reste cohérent avec le pire cas serveur
inchangé (54 s) tout en gardant une marge.

**Le plafond de points par itinéraire tronquait dans le mauvais ordre.** `capRouteMembers`
gardait les segments (`members`) dans l'ordre OSM d'origine de la relation, sans rapport avec
la position de l'utilisateur — si un itinéraire dépassait le plafond de 4000 points, le
segment réellement le plus proche pouvait se trouver dans la portion tronquée, faussant la
distance affichée. Vérifié sur des données réelles (relations autour de Liège, plafond abaissé
artificiellement pour forcer la troncature) : jusqu'à ~2 km d'écart entre la distance affichée
et la vraie distance. Les segments sont maintenant triés par proximité avant troncature, donc
le plus proche est toujours conservé en premier. Aucun itinéraire rencontré dans nos zones de
test (Liège, Sainte-Anne, Bouillon) n'a réellement dépassé 4000 points — mais le correctif
s'applique dès qu'un futur itinéraire le ferait.

## v0.5.7 — retrait du filtrage par rôle (qui faisait disparaître tous les résultats)

La v0.5.4 avait aussi ajouté un filtrage des membres de relation par "rôle" OSM (pour ignorer
des segments non marchables comme des limites administratives). C'était une supposition non
vérifiée sur la façon dont les tronçons de marche réels sont tagués localement — et elle a fait
disparaître TOUS les résultats à 5 km et 10 km, y compris des itinéraires bien réels.

- ce filtrage par rôle est retiré ; tous les membres de la relation comptent à nouveau pour le
  calcul de distance et de tracé, comme en v0.5.3 ;
- seule l'exclusion des réseaux régionaux entiers par tag `type=network`/`superroute`
  (v0.5.6, qui ne touche pas à la géométrie) est conservée.

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
