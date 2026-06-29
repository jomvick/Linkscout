# LinkScout — AI-Powered Job Search Intelligence

> **Version 1.0** — Transformez votre recherche d'emploi tech avec l'intelligence artificielle.

LinkScout est un dashboard intelligent qui scrappe LinkedIn, analyse les offres via l'IA (Groq), et vous présente les meilleures opportunités avec un score de matching personnalisé.

## ✨ Fonctionnalités

### 🎯 Recherche Intelligente
- **Langage naturel** — Tapez *"je cherche un poste React à Paris en full remote"* — l'IA traduit en mots-clés LinkedIn optimisés.
- **Recherche directe** — Mots-clés classiques pour les experts.
- **Scan de CV** — Uploadez votre CV (PDF/TXT), LinkScout extrait automatiquement vos compétences et lance une recherche ciblée.

### 🤖 Analyse IA (Groq Llama 3.3 70B)
Chaque offre est enrichie automatiquement :
- **Match Score** — Score de compatibilité sur 100%
- **Score Breakdown** — Alignement mots-clés, compétences, séniorité
- **Tech Stack** — Extraction des technologies demandées
- **Salaire / TJM** — Détection et normalisation
- **Pitch IA** — Accroche personnalisée pour votre candidature
- **Verdict** — Analyse et recommandation

### 📊 Dashboard Zen
- **Command Bar** (CMD+K) — Navigation rapide type Raycast
- **Slide-over detail** — 4 onglets : Aperçu, Assistant (IA), Entreprise, Compétences
- **Filtres avancés** — Lieu, télétravail, salaire, stack technique
- **Favoris** — Bookmarkez les offres prometteuses
- **Historique** — Retrouvez vos recherches passées
- **Mode clair/sombre** — Thème automatique

### 🔔 Alertes Temps Réel
- **Discord** — Webhook embed avec score, salaire, stack
- **Telegram** — Notification formatée avec lien direct
- **Seuils configurables** — Déclenchement à partir d'un match score minimum
- **Auto-collection** — Les offres à >80% sont bookmarked automatiquement

### 🌍 International
- Français & Anglais
- Détection automatique du navigateur

## 🏗 Architecture

```
[Browser] → Next.js 15 (App Router, SSR)
              │
              ├── Supabase (Auth, Storage, DB, Realtime)
              ├── Rust Worker (scraping, analyse, enrichissement)
              └── Groq API (LLM, analyse NL → keywords)
```

### Stack Technique

| Couche | Technologie |
|---|---|
| **Framework** | Next.js 15.5 (App Router) |
| **UI** | React 19, Tailwind CSS 4, Framer Motion 12 |
| **Base de données** | Supabase (PostgreSQL) |
| **Auth** | Supabase SSR (email + OAuth) |
| **IA** | Groq API (Llama 3.3 70B) |
| **i18n** | next-intl (🇫🇷 FR / 🇬🇧 EN) |
| **Logo** | Clearbit API |
| **Tests** | Vitest, Testing Library, MSW |
| **CI/CD** | Vercel |

## 🚀 Démarrage Rapide

### Prérequis
- Node.js 20+
- Compte [Supabase](https://supabase.com)
- Clé API [Groq](https://groq.com)
- Worker Rust (optionnel en dev)

### Installation

```bash
# Cloner le projet
git clone https://github.com/jomvick/Linkscout.git
cd Linkscout/linkscout

# Installer les dépendances
npm install

# Copier et remplir les variables d'environnement
cp .env.example .env.local
```

**Variables d'environnement :**
```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anonyme
NEXT_PUBLIC_WORKER_URL=http://localhost:8001
GROQ_API_KEY=votre-cle-groq
```

### Lancer en développement

```bash
npm run dev        # → http://localhost:3000
npm run test       # 35 tests unitaires
npm run build      # Build production
```

## 📁 Structure du Projet

```
linkscout/
├── app/
│   ├── [locale]/            # Pages internationalisées
│   │   ├── dashboard/       # Dashboard principal
│   │   ├── login/           # Connexion
│   │   └── page.tsx         # Landing page
│   ├── api/                 # Routes API (proxy → Rust Worker + Supabase)
│   │   ├── intent/          # Analyse langage naturel (Groq)
│   │   ├── jobs/            # Liste des offres
│   │   ├── resume/          # Upload CV
│   │   ├── alerts/          # Alertes Discord/Telegram
│   │   ├── favorites/       # Bookmark
│   │   └── history/         # Historique recherches
│   └── layout.tsx           # Layout racine
├── components/
│   ├── landing/             # 15 composants landing page
│   ├── DetailPanel*.tsx     # Slide-over détails (4 onglets)
│   ├── CommandPalette.tsx   # CMD+K
│   └── ...                  # 30+ composants
├── lib/
│   ├── supabase/            # Clients Supabase
│   ├── api-client.ts        # Appels worker Rust
│   ├── store.ts             # Store local (fallback)
│   └── types.ts             # Types TypeScript
├── messages/                # Traductions (en.json, fr.json)
├── tests/                   # Tests Vitest
└── middleware.ts            # i18n + auth guard + sécurité
```

## 🧪 Tests

```bash
npm test              # 35 tests, 4 suites
npm run test:watch    # Mode watch
npm run test:coverage # Rapport de couverture
```

## 🛣 Roadmap

- [x] Moteur de scraping LinkedIn
- [x] Pipeline d'enrichissement IA (Groq)
- [x] Dashboard zen avec match score
- [x] Alertes Discord + Telegram
- [x] Scan de CV
- [ ] Recommandations prédictives
- [ ] Génération de lettre de motivation IA
- [ ] Extension navigateur
- [ ] Mode hors-ligne (PWA)

## 📄 License

MIT
