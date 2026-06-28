# LinkScout — Plan d'Exécution

## Overview
Scraper LinkedIn, enrichir les offres via IA, et les afficher dans un dashboard zen.

## Architecture

```
[User tape Mot-Clé]
       │
       ▼
 [Next.js Route /api/scrape]
       │
       ├──► [Python scraper (local)] ──► linkedin_scraper + Playwright
       │         │
       │         ▼
       │    Supabase (jobs table)
       │
       ├──► [Rust worker (prod)] ──► Apify endpoints
       │
       ▼
 [Pipeline Enrichissement]
       │
       ├──► Clearbit API (logos)
       ├──► public-apis (news/data)
       ├──► DeepSeek/Claude (analyse IA)
       │
       ▼
 [Dashboard Next.js 15 + Tailwind]
       │
       ├──► Command Bar (recherche)
       ├──► Liste d'offres + Match Score
       ├──► Panneau détail (slide-over)
       └──► Génération message IA
```

## Subagents Disponibles

| Agent | Rôle | Commande |
|-------|------|----------|
| `@scraper-engineer` | Moteur scraping Python/Rust + APIs | Phase 1 |
| `@pipeline-architect` | Enrichissement + IA + Supabase | Phase 2 |
| `@frontend-artisan` | Dashboard Next.js + animations | Phase 3 |
| `@devops-automator` | Alertes, CI/CD, polissage | Phase 4 |

## Phases

### Phase 1: Moteur de Collecte
- [ ] Initialiser projet Next.js 15 avec Tailwind
- [ ] Configurer Supabase (tables `jobs`, `keywords`, RLS)
- [ ] Créer le scraper Python (FastAPI + linkedin_scraper)
- [ ] Route `/api/scrape` (proxy Next.js → Python)
- [ ] Valider 20 offres sans CAPTCHA
- [ ] Worker Rust (Apify) pour production

### Phase 2: Pipeline IA
- [ ] Enrichissement logos (Clearbit) + news (public-apis)
- [ ] Intégration Groq API (analyse offre → JSON structuré via Llama/Mixtral)
- [ ] Match score et extraction TJM/salaire
- [ ] Route `/api/enrich`, `/api/analyze`, `/api/message`
- [ ] Cache et gestion quotas API

### Phase 3: Frontend Dashboard
- [ ] Command Bar (style Raycast, CMD+K)
- [ ] Cartes d'opportunités (logo, badges, match score)
- [ ] Panneau latéral slide-over (onglets Résumé/Brut/Accroche)
- [ ] Mode clair/sombre
- [ ] Connexion Supabase Realtime
- [ ] États vides, chargement, erreurs

### Phase 4: Alertes & Polissage
- [ ] Webhook Discord (match > 90%)
- [ ] Bot Telegram
- [ ] GitHub Actions CI/CD
- [ ] Animations framer-motion (stagger, spring, glow)
- [ ] Déploiement Vercel + Docker

## Usage

Lancer un agent :
```
@scraper-engineer crée le script de scraping Python avec Playwright
```

Ou pour une tâche complète :
```
@frontend-artisan construit la Command Bar avec l'animation CMD+K
```

Les agents peuvent être chaînés : finir Phase 1 avant d'attaquer Phase 2.
