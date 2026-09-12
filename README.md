# Guadeloupe Compagnon V0.2

PWA statique prête pour GitHub + Vercel.

## Déploiement
1. Créer un nouveau dépôt GitHub.
2. Envoyer tous les fichiers de ce dossier à la racine du dépôt.
3. Dans Vercel : Add New > Project > Import Git Repository.
4. Framework Preset: Other. Aucun Build Command nécessaire.
5. Deploy.

## Important
- Les données et notes sont pour l'instant enregistrées localement dans le navigateur (localStorage).
- La géolocalisation nécessite HTTPS : Vercel le fournit.
- Les liens de navigation ouvrent Google Maps.
- Les recherches "Autour de nous" utilisent la position GPS puis Google Maps.
- Les logements sont des coordonnées approximatives jusqu'à saisie des adresses exactes.
- Les événements, horaires, prix, parkings et données temporaires devront être vérifiés/actualisés avant le séjour.
- Les notifications push en arrière-plan nécessitent un service push/backend ; cette V0.2 ne les simule pas.


## V0.2.1
Diagnostic GPS détaillé pour Safari/iPhone, état GPS visible, délai 20 s et précision non forcée au premier test.

## V0.3 — Coffre voyage
- Ajout d'un coffre local chiffré AES-GCM.
- Code utilisateur dérivé par PBKDF2 (210 000 itérations, SHA-256).
- Import appareil photo iPhone, photos et PDF.
- Données conservées dans IndexedDB, métadonnées et contenu chiffrés.
- Rien n'est envoyé vers GitHub/Vercel.
- Limite actuelle : 15 Mo par document.
- Attention : effacer les données Safari ou perdre l'appareil peut supprimer le coffre. Garder les originaux.
