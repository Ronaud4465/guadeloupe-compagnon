# Guadeloupe Compagnon v0.5.13

## v0.5.13 — données de promenades pré-téléchargées pour la Guadeloupe et la Wallonie (recherche hors-ligne)

Objectif : pouvoir tester la recherche "promenades autour de moi" en Belgique/Wallonie avant le
départ, dans des conditions représentatives de ce qui sera vécu en Guadeloupe (recherche
instantanée, sans dépendre de la disponibilité des miroirs Overpass publics) — et une fois sur
place, ne plus du tout dépendre d'eux pour la zone réellement utilisée.

**Estimation avant téléchargement** (comptages réels via une requête Overpass légère `out
count;`) :
- Guadeloupe entière : 45 itinéraires — négligeable.
- Wallonie entière : 4174 itinéraires (5 exclus `type=network`/`superroute`) — 92 % sont de
  petites promenades ponctuelles (<5 km de diagonale de bounding box), ~172 sont de grands
  itinéraires nationaux/internationaux (GR, pèlerinages), dont certains énormes (le GR 128
  Vlaanderenroute à lui seul : 21 073 points de géométrie).
- Belgique entière (21 490 itinéraires, 5× la Wallonie) écartée : clairement disproportionné par
  rapport à l'usage réel (tests depuis la région liégeoise/wallonne).

Sans plafond, la géométrie complète de la Wallonie pèserait ~85 Mo (mesuré sur un échantillon
représentatif de 123 itinéraires puis extrapolé). Avec un **plafond de 1000 points de géométrie
par itinéraire** (même logique que `capRouteMembers` côté recherche en direct, mais sans le tri
par proximité puisqu'il n'y a pas de position de référence au moment de la génération) : 156
itinéraires sur 4174 (3,7 %) sont tronqués, pour un fichier de 37,4 Mo bruts. Ces données JSON
(coordonnées très répétitives) compressent très bien : **4,16 Mo réels en Brotli** (déjà activé
par défaut sur Vercel), mesuré directement, pas juste estimé. Le fichier n'est téléchargé qu'une
seule fois puis mis en cache par le service worker existant — pas à chaque recherche.

**Fonctionnement** : `HIKE_STATIC_ZONES` (dans `app.js`) définit, pour chaque zone couverte, sa
bounding box **administrative réelle** (PAS déduite des itinéraires eux-mêmes — un GR qui
traverse la Wallonie vers la France/l'Allemagne a un bounding box qui déborde largement de la
vraie région, ce qui fausserait la détection de zone). `discoverNearbyHikes` vérifie d'abord si
la position GPS de l'utilisateur tombe dans une zone couverte :
- **oui** → chargement paresseux du fichier statique correspondant (`<script>` injecté
  dynamiquement, mis en cache par le service worker après le premier chargement), recherche
  instantanée, aucun appel réseau à Overpass ;
- **non** (n'importe où ailleurs dans le monde) → pipeline actuel inchangé (Overpass en direct
  depuis le navigateur, retries, repli serveur).

La construction des lignes affichées (`buildHikeRows`) et leur rendu (`renderHikeRows`) sont
maintenant partagés entre les deux chemins (statique et en direct) — même logique, même format
de données en entrée (forme `relation` d'Overpass avec `members[].geometry`), donc aucune
différence de comportement visible pour l'utilisateur entre une zone couverte et une zone non
couverte, à part la vitesse.

**Testé** (Chromium réel, serveur local) :
- Position à Liège (dans la bbox Wallonie) → "Recherche instantanée (données hors-ligne :
  Wallonie)…" affiché immédiatement, un seul chargement réseau (`hikes-data-wallonie.js`, pas
  d'appel à Overpass), résultat correct (ex. "GR 57 Liaison Barchon" à 392 m, cohérent avec les
  tests en direct précédents sur ce même point).
- Position à Paris (hors des deux zones) → pipeline Overpass en direct inchangé, comme avant
  cette version (aucune régression).

### Régénérer les données de promenades statiques

Si OpenStreetMap est mis à jour, ou pour ajouter une nouvelle zone :

1. Récupérer le dump brut Overpass pour la zone (adapter la clause `area[...]`) :
   ```
   curl -X POST https://overpass-api.de/api/interpreter \
     -H "Content-Type: application/x-www-form-urlencoded;charset=UTF-8" \
     --data-urlencode 'data=[out:json][timeout:180];area["name"="Wallonie"]["admin_level"="4"]->.a;relation(area.a)["route"~"^(hiking|foot|walking)$"];out geom;' \
     -o wallonie-raw.json
   ```
   Pour la Guadeloupe, remplacer la clause `area` par `area["ISO3166-1"="GP"]->.a;`.

2. Retrouver la bbox **administrative réelle** de la zone (à ne jamais déduire des itinéraires) :
   ```
   curl -X POST https://overpass-api.de/api/interpreter \
     -H "Content-Type: application/x-www-form-urlencoded;charset=UTF-8" \
     --data-urlencode 'data=[out:json];relation["name"="<NomDeLaRégion>"]["admin_level"="4"];out bb;'
   ```

3. Construire le fichier statique :
   ```
   node scripts/build-hikes-static.js wallonie-raw.json hikes-data-wallonie.js HIKES_STATIC_WALLONIE 1000 "49.4969821,2.8420347,50.8121222,6.4080970"
   node scripts/build-hikes-static.js guadeloupe-raw.json hikes-data-guadeloupe.js HIKES_STATIC_GUADELOUPE 4000 "15.8319758,-61.8097640,16.5144801,-61.0013039"
   ```
   4e argument : plafond de points de géométrie par itinéraire. 5e argument (optionnel) : bbox
   `minLat,minLon,maxLat,maxLon` de l'étape 2 — si omis, le script déduit une bbox des itinéraires
   eux-mêmes et affiche un avertissement (à éviter pour une zone traversée par de grands GR).

4. Pour une **nouvelle** zone (pas juste une mise à jour), ajouter une entrée dans
   `HIKE_STATIC_ZONES` (`app.js`) avec le nom, le chemin du fichier, le nom de variable et la bbox.

## v0.5.12 — retour visuel progressif pendant les tentatives, et vérification du signalement v0.5.11

Après la v0.5.11, deux points ont été signalés en conditions réelles : un échec après ~15s au
lieu des ~35s de budget prévus, et un message de statut qui reste figé pendant toute l'attente.

**Vérifié avec le vrai code de production** (les fonctions `fetchOverpass`/`withRetries` sont
accessibles directement depuis la console du navigateur, `app.js` étant un script classique et
non un module) dans un vrai Chromium, avec instrumentation de tous les appels réseau :
- **Le budget de 35s n'est pas dépassé — mais ce n'est pas non plus une durée fixe.** C'est un
  plafond maximum (pire cas si tous les miroirs restent muets jusqu'à leur timeout), pas une
  durée garantie. Rejoué avec une échéance calculée correctement, le code réel s'est arrêté à
  35013ms pile, comme attendu. Un échec plus rapide (~15s) signifie simplement que les serveurs
  ont répondu avec une erreur plus vite ce jour-là, plutôt que de rester muets jusqu'au bout du
  délai — c'est le comportement voulu, pas un raccourci anormal.
- **Le texte figé, en revanche, était un vrai manque : jamais implémenté.** Le retour visuel
  progressif demandé pendant les retries n'avait pas été codé en v0.5.11 (seule la logique de
  retry elle-même l'avait été) — confirmé en traçant `#nearHikeStatus` toutes les 250ms pendant
  35s : une seule valeur observée du début à la fin.

**Ajout du retour visuel progressif** : `withRetries`/`fetchOverpass` acceptent maintenant un
callback `onProgress`, appelé avant chaque tentative avec un message indiquant le miroir en
cours et le numéro de tentative (ex. « [1/2] Recherche sur overpass-api.de… », puis « [1/2]
Nouvelle tentative sur overpass-api.de (2/2)… », puis « [1/2] Recherche sur
lz4.overpass-api.de… »). `discoverNearbyHikes` l'affiche dans `#nearHikeStatus` (préfixé de
l'étape 1/2 ou 2/2 du pipeline), et `openOsmHikeRoute` (chargement du tracé complet) l'affiche
de la même façon dans son propre encart.

Testé en local (serveur statique + Chromium instrumenté, sur le code réel) : la séquence de
messages s'affiche bien au fil des tentatives réelles, aux mêmes instants que les vrais appels
réseau.

## v0.5.11 — tentatives multiples avec budget de temps total borné

Après la v0.5.10, l'appel direct depuis le navigateur a été confirmé fonctionnel (CORS ouvert),
mais `overpass-api.de`/`lz4.overpass-api.de` (même infrastructure) se sont révélés instables de
façon **probabiliste** sous charge réelle : selon le moment, une même requête peut réussir, ou
échouer avec 406, 429, 504, ou rester sans réponse — indépendamment du client (curl, Node,
navigateur) et des en-têtes envoyés. Une seule tentative par miroir n'a donc qu'une chance
partielle d'aboutir.

**Ajout de tentatives automatiques (2 par miroir), avec une échéance totale unique et partagée**
plutôt qu'un timeout par requête pris isolément :
- chaque miroir est retenté une fois (2 tentatives au total) si le premier essai échoue, avec
  une courte pause de 700 ms entre les deux — pour laisser une chance au serveur de sortir de
  son état transitoire plutôt que de le re-solliciter instantanément ;
- **une échéance unique de 35 s est partagée entre les 2 requêtes séquentielles de
  `discoverNearbyHikes`** (tags+bb, puis géométrie) et tous leurs retries confondus — pas un
  budget par requête, sinon les retries d'une étape pourraient faire exploser l'attente totale
  perçue par l'utilisateur, exactement le problème déjà rencontré avec le design précédent ;
  chaque tentative individuelle est bornée par le temps réellement restant sur cette échéance
  partagée, jamais par un délai fixe indépendant ;
- en dessous de 3 s de budget restant, l'app abandonne proprement (message clair) plutôt que de
  lancer une nouvelle tentative vouée à l'échec ou de faire attendre indéfiniment.

2 tentatives par miroir plutôt que 3 : avec 2 miroirs directs × 2 tentatives à 9 s chacune, le
pire cas (tout échoue au maximum du délai) reste sous les 35 s du budget total ; 3 tentatives
l'aurait dépassé.

**Tests effectués** :
- Logique validée par un test déterministe (scénarios contrôlés, sans dépendre de l'état réel
  des serveurs) : le délai de 700 ms entre tentatives est bien respecté, le budget total de 35 s
  n'est jamais dépassé même si tous les miroirs et le repli restent bloqués au maximum du délai,
  et le budget est bien partagé entre les 2 étapes (une étape qui consomme du temps réduit
  d'autant le temps disponible pour la suivante, au lieu de repartir sur une horloge fraîche).
- Test en conditions réelles (10 lancers du pipeline complet) non concluant : après des heures
  de tests cumulés sur `overpass-api.de` pendant tout ce diagnostic, l'IP de test a fini par être
  limitée de façon quasi systématique par ce serveur (jusqu'à des requêtes isolées, sans aucune
  logique de retry, qui n'obtenaient plus de réponse du tout) — un taux de succès mesuré dans
  ces conditions n'aurait pas été représentatif de ce qu'un utilisateur réel, avec une IP neuve,
  rencontrerait. Le taux de succès réel reste donc à confirmer sur le terrain (téléphone, IP
  jamais sollicitée pour ces tests).

## v0.5.10 — appel Overpass direct depuis le navigateur : overpass-api.de bloque les IP cloud (donc Vercel)

Après la v0.5.9, la recherche de promenades a recommencé à échouer en production
(« Service de recherche indisponible » après une longue attente) alors que les miroirs
fonctionnaient parfaitement en les testant directement depuis un poste de travail au même
moment. La cause : **`overpass-api.de` bloque délibérément les IP de fournisseurs cloud
(AWS/Azure) pour lutter contre les abus** (politique documentée par la communauté
OpenStreetMap). Vercel exécute ses fonctions serverless sur de l'infrastructure cloud, donc les
requêtes envoyées depuis `api/hikes.js` tombent probablement dans ce blocage — ce qui touche
d'un coup **2 des 3 miroirs de la liste**, puisque `overpass-api.de` et `lz4.overpass-api.de`
sont deux nœuds du même projet officiel.

**Changement d'architecture** : `app.js` appelle désormais `overpass-api.de` et
`lz4.overpass-api.de` **directement depuis le navigateur** (CORS vérifié ouvert sur les deux :
`Access-Control-Allow-Origin: *`, testé avec de vraies requêtes POST), plutôt que via le proxy
serverless. L'IP vue par ces serveurs est alors celle de l'utilisateur (résidentielle/mobile),
hors de portée de ce blocage. `overpass.kumi.systems` est exclu de cette cascade directe : il ne
répondait plus du tout au moment du diagnostic, inutile de perdre 18 s dessus depuis chaque
navigateur.

`api/hikes.js` (le proxy serverless) reste en place comme **filet de sécurité uniquement**,
appelé avec `?mirrors=kumi` si les deux appels directs échouent — il ne retente plus
`overpass-api.de`/`lz4.overpass-api.de` depuis le serveur : si l'appel direct vient d'échouer
dessus à cause du blocage d'IP, le refaire depuis ce même serveur cloud donnerait exactement le
même résultat, juste plus lentement. Seul `kumi.systems` a une chance différente dans ce filet,
puisque son éventuel échec n'est pas lié à une IP bloquée. Le endpoint reste adressable avec la
cascade complète via `?mirrors=overpass,lz4,kumi` pour un usage autonome (tests, débogage).

Testé : CORS confirmé ouvert sur les deux miroirs directs (en-tête `Access-Control-Allow-Origin:
*` reçu sur une vraie requête POST). Le nouveau comportement de `api/hikes.js` a été vérifié en
important directement le module (sans passer par Vercel) : `?mirrors=kumi` seul prend bien 18 s
(un seul miroir tenté, pas 3×18 s) avant d'échouer proprement tant que kumi reste indisponible,
et la cascade complète explicite (`?mirrors=overpass,lz4,kumi`) fonctionne toujours pour un appel
autonome. Note pour la suite : l'adresse IP utilisée pour tester `overpass-api.de` pendant tout
le diagnostic de cette session a été très sollicitée (dizaines de requêtes), ce qui a pu
provoquer des réponses `406`/`504` ponctuelles côté test sans rapport avec le comportement réel
attendu pour un utilisateur final dont l'IP n'a pas cet historique — à confirmer sur un vrai
téléphone en conditions réelles.

## v0.5.9 — liste de miroirs Overpass obsolète : un mort en DNS, un autre en tête qui ne répondait plus

Après publication de la v0.5.8, la recherche de promenades en production prenait très longtemps
puis affichait « Service de recherche indisponible ». Vérifié en conditions réelles :

- **`overpass.nchc.org.tw`** (3e miroir de la liste) : **le nom DNS n'existe plus du tout**
  (`Resolve-DnsName` renvoie "Le nom DNS n'existe pas"). Ce miroir est mort — sans rapport avec
  la charge qu'on a mise sur les autres serveurs pendant les tests de cette session.
- **`overpass.kumi.systems`** (1er miroir de la liste, donc essayé en premier à chaque
  recherche) : ne répondait plus du tout au moment du test — 0 réponse après 30 s, confirmé sur
  un second essai. Comme c'était le premier de la liste, chaque recherche perdait
  systématiquement 18 s (le timeout par miroir) avant même d'essayer un autre serveur.
- **`overpass-api.de`** (2e miroir) : fonctionnait, mais intermittent sous charge publique (un
  essai a renvoyé `504` avec "the server is probably too busy", un essai identique juste après a
  réussi proprement). Aucun des serveurs ne renvoie de message de rate-limiting explicite
  ("rate limit", "too many requests", en-tête `Retry-After`) — c'est de la surcharge générique,
  pas un blocage ciblé.

Avec 2 miroirs sur 3 hors service, et le pipeline v0.5.8 qui fait maintenant 2 requêtes
séquentielles (tags+bb puis géométrie) au lieu d'une seule, chaque recherche était deux fois
plus exposée à ce miroir mort en tête de liste.

Recherché un miroir de remplacement fiable, testé un par un en conditions réelles avant de
l'adopter :
- `overpass.private.coffee`, souvent cité comme alternative, s'est révélé être **le même
  serveur que kumi.systems** (confirmé par la chaîne DNS `overpass.kumi.systems` →
  `overpass.private.coffee` → `flanders.servers.private.coffee`) — donc mort lui aussi au même
  moment, pas une vraie alternative.
- `overpass.osm.ch` répond mais **ne couvre que la Suisse** (0 élément renvoyé pour une requête
  sur la Belgique) — inutilisable pour une app qui doit chercher n'importe où.
- `maps.mail.ru` (miroir russe) : injoignable, timeout complet.
- `lz4.overpass-api.de` : **fonctionne, rapide (2,6 s sur un test réel), données correctes.**
  C'est le nœud "lambert", l'un des deux serveurs physiques derrière le nom `overpass-api.de`
  (l'autre est "gall", alias `z.overpass-api.de`, lui aussi fonctionnel mais plus lent le jour du
  test) — donc pas un tiers totalement indépendant, mais un point d'entrée distinct et fiable du
  même projet officiel.

Changements dans `api/hikes.js` :
- `overpass.nchc.org.tw` retiré (mort) ;
- `overpass-api.de` passé en premier (le plus fiable des trois aujourd'hui) ;
- `lz4.overpass-api.de` ajouté en deuxième position ;
- `overpass.kumi.systems` conservé mais relégué en dernier, pour qu'il ne bloque plus 18 s
  devant un miroir qui fonctionne s'il reste indisponible.

Testé en conditions réelles après changement (pipeline complet, Liège 5 km) : les 2 requêtes
séquentielles aboutissent maintenant en **7,5 s au total** (contre ~50 s juste avant ce
correctif, quand `kumi.systems` mort était en tête de liste).

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
