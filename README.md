# Guadeloupe Compagnon v0.4.8

## Promenades autour de moi
La recherche ne contacte plus directement Overpass depuis l'iPhone ou le navigateur.
Elle passe maintenant par `/api/hikes`, une fonction serveur Vercel du même projet.

La fonction Vercel :
- essaie plusieurs serveurs Overpass ;
- utilise des requêtes POST côté serveur ;
- applique un délai maximum par serveur ;
- renvoie les données à l'application sur le même domaine.

## Déploiement
Décompresser le ZIP à la racine du dépôt GitHub en conservant le dossier `api`.
Le fichier `api/hikes.js` doit donc apparaître dans GitHub.
Vercel créera automatiquement l'endpoint `/api/hikes`.

## Test
1. Vérifier que l'app affiche v0.4.8.
2. Autour → Promenades autour de moi.
3. Choisir 5 km.
4. Rechercher.
