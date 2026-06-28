Voici la structure complète de ton MVP pensée pour coller à ta philosophie de dev : rapide, minimaliste, axée sur l'IA (*vibe coding*) et redoutablement efficace.

L'objectif de ce MVP est simple : **Entrer un mot-clé (ex: "Développeur Rust Freelance" ou "Next.js Remote"), récupérer les opportunités LinkedIn sans se faire bannir, les enrichir, et les afficher dans un dashboard ultra-propre.**

---

## 1. La Stack Technique (Le Noyau "Zen-Tech")

* **Frontend & Fullstack Core :** **Next.js 15 (App Router)** avec **Tailwind CSS**. Pour l'UI, des animations fluides (framer-motion) et un thème sombre/minimaliste très épuré.
* **Database & Auth :** **Supabase**. Stockage des offres scrapées, gestion des mots-clés favoris de l'utilisateur, et triggers pour l'automatisation.
* **Scraping & Extraction (Le Pipeline) :**
* **Option Locale / Gratuite :** Un micro-service **Python (FastAPI)** qui fait tourner le repo `joeyism/linkedin_scraper` avec Playwright en tâche de fond.
* **Option Cloud / Production :** Un worker en **Rust** (pour la vitesse et la légèreté) qui appelle les endpoints managés du repo `cporter202/social-media-scraping-apis` (via Apify ou Proxy APIs) pour ne jamais risquer de blocage IP.


* **IA Layer :** API **DeepSeek-V3** ou **Claude 3.5 Sonnet** pour analyser l'offre, extraire le TJM (Taux Journalier Moyen) / Salaire caché, et générer un score de match.

---

## 2. Intégration Tactique des Repositories

Voici exactement comment chaque brique que tu as trouvée s'imbrique dans l'architecture :

```
[Utilisateur tape Mot-Clé]
       │
       ▼
 [Next.js / Rust Backend] ──(Si scraping maison)──► Repo: joeyism/linkedin_scraper (Playwright/Session cookies)
       │                  ──(Si cloud stable)────► Repo: cporter202/social-media-scraping-apis (Apify/Proxy endpoints)
       ▼
 [JSON Brut Reçu]
       │
       ├─► Enrichissement via Repo: public-apis/public-apis (Logos d'entreprises via Clearbit, Data Geo)
       ├─► Extraction IA (Compétences clés, Match Score, Message d'approche)
       │
       ▼
 [Supabase Database] ──► [Dashboard Next.js Premium UI]

```

### Étape A : La Collecte avec `linkedin_scraper` & `social-media-scraping-apis`

Pour ton MVP, tu vas créer une route API `/api/scrape` dans ton backend.

* **En développement :** Tu lances le script Python basé sur `joeyism/linkedin_scraper`. Tu exportes tes cookies de session LinkedIn une bonne fois pour toutes dans un fichier `session.json`. Le script automatise la recherche par mot-clé et te recrache les URLs des posts et des offres d'emploi.
* **En production :** Pour éviter que ton serveur domestique tourne H24, tu bascules sur un endpoint d'Apify trouvé dans le repo de `cporter202`. Une simple requête HTTP `POST` en Rust ou Next.js lui demande : *"Scrape-moi les 20 derniers posts contenant le mot-clé X"*. Tu récupères un JSON propre sans gérer les proxies.

### Étape B : L'Enrichissement avec `public-apis`

Une fois que tu as le JSON de l'offre (ex: Entreprise: "TechCorp", Ville: "Paris"), tu lances des requêtes d'enrichissement asynchrones en parallèle :

* **Logo de l'entreprise :** Utilisation de l'API combinée de Clearbit (trouvée via `public-apis`) : `[https://logo.clearbit.com/techcorp.com](https://logo.clearbit.com/techcorp.com)` pour afficher directement l'avatar de la boîte sur ton app.
* **Données Économiques / News :** Une requête rapide sur une API d'actualités pour voir si la boîte vient de lever des fonds ou de recruter massivement.

---

## 3. L'Aspect Visuel (Interface "Zen-Tech")

L'application doit s'éloigner du bruit visuel de LinkedIn pour offrir un espace de travail calme et ultra-focus.

* **Le Dashboard Principal :** Un thème *Midnight Blue* ou *Pure Black* (`bg-zinc-950`). Une grille asymétrique très propre.
* **La Barre de Recherche :** Centrée, imposante, style "Command Menu" (à la Raycast/Linear). Tu tapes ton mot-clé, tu fais `Entrée`, une onde de chargement minimaliste traverse l'écran.
* **Les Cartes d'Opportunités :** Pas de texte compact indigeste. Chaque carte affiche :
* Le logo de l'entreprise (arrondi, épuré).
* Le titre du poste en gras (`text-zinc-100`).
* Des badges de couleur très discrets : `[Rust]`, `[Remote 100%]`, `[Freelance]`.
* **Le "Match Score" de l'IA :** Un cercle lumineux (Vert, Orange ou Bleu) indiquant le pourcentage de pertinence par rapport à ton profil.


* **Le Panneau Latéral (Slide-over) :** Quand tu cliques sur une opportunité, un panneau glisse depuis la droite sans recharger la page. Il affiche :
* Le résumé de l'offre généré par l'IA en 3 puces claires (Mission, Stack, Points forts).
* Un bouton d'action principal : **"Générer une accroche personnalisée"**. En un clic, l'IA te rédige le message parfait à envoyer au recruteur.



---

## 4. Le Plan d'Exécution MVP (Sprint de 4 Semaines)

```
┌────────────────────────────────────────────────────────────────────────┐
│  SEMAINE 1 : Le Moteur de Collecte (Python/Rust + Scraping Repos)     │
├────────────────────────────────────────────────────────────────────────┤
│  SEMAINE 2 : Pipeline de Données, IA Layer & Supabase                  │
├────────────────────────────────────────────────────────────────────────┤
│  SEMAINE 3 : Frontend Next.js (Design Zen-Tech & Dashboard)            │
├────────────────────────────────────────────────────────────────────────┤
│  SEMAINE 4 : Systèmes d'Alertes (Webhook Telegram/Discord) & Polissage │
└────────────────────────────────────────────────────────────────────────┘

```

### Semaine 1 : Le Moteur (Back)

* Mettre en place le script de scraping avec `linkedin_scraper` en local.
* Valider que tu arrives à extraire 20 offres sur un mot-clé précis sans déclencher de CAPTCHA (en ajustant les `sleep` aléatoires).
* Structurer le schéma de données dans Supabase (`jobs`: id, title, company, description, url, raw_json, processed).

### Semaine 2 : L'Intelligence (Data & IA)

* Créer le script d'enrichissement (Logos, News via `public-apis`).
* Connecter l'API LLM (DeepSeek ou Claude). Lui envoyer la description brute et lui demander de retourner un JSON strict : `{ "summary": "...", "tech_stack": [], "estimated_salary": "...", "match_score": 85 }`.

### Semaine 3 : L'Écrin (Front)

* Monter l'application Next.js 15.
* Coder l'interface utilisateur minimaliste avec Tailwind CSS.
* Connecter le front à Supabase en temps réel pour voir les offres apparaître sur le dashboard au fur et à mesure que le scraper travaille en tâche de fond.

### Semaine 4 : Les Automatisation & Finitions

* Ajouter un système d'alerte : si une offre obtient un score de match > 90%, ton backend envoie un webhook avec un résumé directement sur ton Discord ou ton Telegram.
* Fignoler les animations de l'UI pour donner cet effet premium et fluide.

Quelle est la première brique sur laquelle tu veux qu'on commence à poser des lignes de code ? On configure le script de scraping avec Playwright ou on prépare directement l'interface Next.js et la structure de la base de données ?
