# LinkScout — Plan de Tests Chirurgicaux

## Architecture des Tests

```
├── scraper/tests/                    # Python (pytest)
│   ├── conftest.py                   # Fixtures communs
│   ├── test_ai_pipeline.py           # SCÉNARIO 1: Scoring adaptatif
│   ├── test_notifier.py              # SCÉNARIO 2: Alertes & Token parsing
│   └── test_enrich.py                # Enrichissement Clearbit
│
├── linkscout/tests/                  # TypeScript (Vitest)
│   ├── setup.ts                      # MSW + mocks globaux
│   ├── test_store.test.ts            # Store unitaire (déduplication)
│   ├── test_api_routes.test.ts       # API payload validation
│   ├── test_dashboard_context.test.ts  # Stats + mutations
│   └── test_supabase_realtime_stress.test.ts  # SCÉNARIO 3
│
├── linkscout/mocks/                  # MSW (SCÉNARIO 4)
│   ├── handlers.ts                   # Intercepteurs Supabase/Groq/Clearbit
│   ├── server.ts                     # MSW Node server
│   └── browser.ts                    # MSW Service Worker
│
├── start-tests.sh                    # Runner tout-en-un
├── start-tests-watch.sh              # Mode watch (Fedora)
└── chirurgical-test-plan.md          # Ce document
```

---

## SCÉNARIO 1 : Pipeline de Scoring Adaptatif

### Fichier : `scraper/tests/test_ai_pipeline.py`

| Test | Type | What it validates |
|---|---|---|
| `test_keyword_only_sets_skills_seniority_to_null` | Unitaire | Prompt adaptatif — mode keyword-only |
| `test_resume_only_sets_keyword_alignment_to_null` | Unitaire | Prompt adaptatif — mode CV-only |
| `test_keyword_and_resume_uses_weighted_average` | Unitaire | Prompt adaptatif — mode combiné |
| `test_groq_timeout_returns_empty_fallback` | Intégration | Timeout → `{}` sans crash |
| `test_groq_429_rate_limit_returns_empty_fallback` | Intégration | 429 → `{}` sans crash |
| `test_groq_malformed_json_returns_empty` | Intégration | JSON invalide → `{}` |
| `test_groq_returns_markdown_wrapped_json` | Intégration | ```json nettoyé avant parse |
| `test_long_resume_is_truncated_gracefully` | Intégration | 15k char → tronqué à 2000 |
| `test_no_groq_key_returns_empty_early` | Unitaire | Pas de clé → early return |

### Coverage cible : 100% de `ai.py` sur les chemins d'erreur.

---

## SCÉNARIO 2 : Robustesse des Alertes

### Fichier : `scraper/tests/test_notifier.py`

| Test | Type | What it validates |
|---|---|---|
| `test_split_extracts_token_and_chat_id_with_negative_chat_id` | Unitaire | `-100123456789` parsé correctement |
| `test_split_with_multiple_separators_not_present` | Unitaire | Format `token\|\|\|id` |
| `test_malformed_payload_missing_chat_id` | Unitaire | 1 seul token → échoue |
| `test_404_webhook_deleted_returns_false` | Intégration | Discord 404 → False |
| `test_discord_timeout_returns_false` | Intégration | Timeout → False |
| `test_telegram_invalid_token_returns_false` | Intégration | Telegram 401 → False |
| `test_notify_alert_unknown_platform_returns_false` | Unitaire | Platform inconnue → False |
| `test_notify_alert_telegram_parses_correctly` | Intégration | Vérifie que `parts` → `send_telegram(token,chat_id,...)` |

### Slack Test (incomplet — ajout de la plateforme)
Le test `test_notify_alert_unknown_platform` garantit qu'une plateforme inconnue
ne bloque pas le pipeline — True/False propre, pas d'exception.

---

## SCÉNARIO 3 : Intégrité Transversale Supabase Realtime

### Fichier : `linkscout/tests/test_supabase_realtime_stress.test.ts`

| Test | What it validates |
|---|---|
| `10 inserts simultanés avec IDs uniques` | Aucun doublon, `uniqueIds.size === 10` |
| `10 inserts avec IDs identiques` | Upsert: 1 seul job (dernier gagne) |
| `10 inserts avec URLs identiques` | Déduplication par URL: 1 seul job |
| `2 vagues de 5 inserts avec 2 doublons` | Fusion partielle: 8 jobs finaux |
| `ne panique pas avec des données partielles` | Champs `undefined` tolérés |
| `changement de status recalcule appliedCount` | `updateJob` → `getStats()` cohérent |

### Comment le pattern Realtime est testé sans Supabase
`DashboardContext.tsx:232` souscrit à `postgres_changes` via `supabaseBrowser.channel`.
Dans nos tests, on mocke `@/lib/supabase` pour renvoyer `null`, et on teste
**directement** `addJobs()` (la fonction appelée dans le handler Realtime) pour
vérifier le comportement de fusion. Cela isole la logique de déduplication sans
dépendre du WebSocket Supabase.

### Test StatsOverview (composant)
Le composant `StatsOverview.tsx` utilise `computeStats` (inline, pas de service).
Le test `test_dashboard_context` valide que `refreshStats()` recalcule correctement
`avgMatchScore`, `analyzedCount`, et `totalJobs` via le `useMemo` du contexte.

---

## SCÉNARIO 4 : Stratégie de Mocking MSW

### Configuration

```
linkscout/mocks/
├── handlers.ts      # Tous les intercepteurs (12 handlers)
├── server.ts        # setupServer() pour Node (Vitest)
└── browser.ts       # setupWorker() pour navigateur (Storybook/Playwright)
```

### Handlers disponibles

| Handler | URL | Comportement |
|---|---|---|
| Supabase SELECT | `/rest/v1/jobs` | Retourne `MOCK_JOBS_DB` filtré |
| Supabase INSERT | `POST /rest/v1/jobs` | Ajoute au tableau, retourne 201 |
| Supabase PATCH | `PATCH /rest/v1/jobs` | Met à jour par ID |
| Groq /analyze | `POST /v1/chat/completions` | JSON adaptatif (keyword/resume) |
| Groq 429 | `?simulate=429` | Rate limit simulé |
| Groq timeout | `?simulate=timeout` | Délai de 30s |
| Clearbit suggest | `GET /v1/companies/suggest` | Retourne domaine mocké |
| Clearbit logo | `HEAD logo.clearbit.com/*` | 200 OK |
| Discord webhook | `POST discord.com/api/webhooks/*` | 204 No Content |
| Discord 404 | `POST .../deleted/*` | 404 Not Found |
| Telegram | `POST api.telegram.org/bot*/sendMessage` | 200 OK |
| Next.js /api/* | `POST localhost:3000/api/*` | Réponses mockées |

### Activer MSW

Dans `linkscout/tests/setup.ts`, **décommenter** le bloc MSW :

```typescript
import { server } from "../mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Installation MSW

```bash
cd linkscout && npm install -D msw
npx msw init public/ --save
```

---

## Commandes d'exécution (Fedora)

### Installation des dépendances

```bash
# Python
pip install -r scraper/requirements-test.txt
pip install pytest-watch   # optionnel: watch mode

# Frontend
cd linkscout && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

### Lancer les tests

```bash
# Tout en un coup
./start-tests.sh

# Python seulement
./start-tests.sh --python-only
# ou: cd scraper && python -m pytest tests/ -v --tb=short --cov=.

# Frontend seulement
./start-tests.sh --frontend-only
# ou: cd linkscout && npx vitest run --reporter=verbose

# Mode watch (développement)
./start-tests-watch.sh

# En arrière-plan (daemon)
nohup ./start-tests-watch.sh > /tmp/linkscout-test.log 2>&1 &

# Avec couverture HTML
cd scraper && python -m pytest tests/ --cov-report=html:coverage_html
cd linkscout && npx vitest run --coverage

# Tests lents exclus
cd scraper && python -m pytest tests/ -m "not slow"
```

### Fedora-specific (dependances systeme)

```bash
sudo dnf install -y python3-pip python3-devel nodejs npm
```

---

## Métriques de Qualité

| Métrique | Cible | Mesure |
|---|---|---|
| Couverture Python (ai.py) | 100% | `pytest --cov=ai` |
| Couverture Python (notifier.py) | 95%+ | `pytest --cov=notifier` |
| Couverture TS (store.ts) | 100% | `vitest --coverage` |
| Tests async timeout | < 5s | `httpx.AsyncClient(timeout=...)` mocké |
| Aucun test flaky | 0 | 3 runs consécutifs identiques |
| Aucun appel réseau réel | 0 | `mock_env` + MSW |

---

## Arbre de Décision — Panne Groq

```
analyze_job() appelé
  ├─ GROQ_API_KEY manquante → return {} (early)
  ├─ description vide → return {} (early)
  ├─ httpx.TimeoutError → return {} (fallback)
  ├─ httpx.HTTPStatusError (429) → return {} (fallback)
  ├─ json.JSONDecodeError → return {} (fallback)
  ├─ Exception générique → return {} (filet de sécurité)
  └─ Succès → return { summary, match_score, score_breakdown, ... }
```

L'UI Next.js reçoit `match_score: null` → affiche "N/A" au lieu de crasher.
Les cartes `OpportunityCard`, `StatsOverview`, et `MatchScore` gèrent toutes `null`.

---

## Arbre de Décision — Panne Discord

```
notify_alert(platform="discord", webhook_url)
  └─ send_discord(url, job)
      ├─ httpx.TimeoutError → return False
      ├─ 404 Not Found → return False
      ├─ 410 Gone → return False
      └─ 429 Rate Limited → return False

→ Le scheduler doit mettre is_active = FALSE sur la ligne Supabase alerts
  après N échecs consécutifs pour éviter de harceler l'API.
```

**TODO Feature**: Implémenter le compteur d'échecs dans le scheduler pour
passer `is_active = FALSE` après 3 échecs consécutifs.

---

## Annexe : Exemple d'exécution

```bash
$ ./start-tests.sh
╔══════════════════════════════════════════╗
║       LinkScout — Test Suite Runner      ║
╚══════════════════════════════════════════╝

[1/4]🔍 Installing Python test deps...
[2/4]🐍 Running Python tests (scraper)...
  │ ============================== test session starts ==============================
  │ platform linux -- Python 3.12.3, pytest-8.3.0, asyncio-0.24.0
  │ rootdir: /home/.../scraper
  │ configfile: pytest.ini
  │ collected 32 items
  │
  │ tests/test_ai_pipeline.py ............                                 [ 37%]
  │ tests/test_enrich.py ......                                               [ 56%]
  │ tests/test_notifier.py ...............                                    [100%]
  │
  │ ============================== 32 passed in 1.24s ==============================
  │
  │ ---------- coverage: platform linux, python 3.12.3-final-0 -----------
  │ Name              Stmts   Miss  Cover   Missing
  │ -----------------------------------------------
  │ ai.py                45      0   100%
  │ enrich.py            30      1    97%   38
  │ notifier.py          41      0   100%
  │ -----------------------------------------------
  │ TOTAL               116      1    99%
  │

  ✅ Python tests PASSED

[3/4]📦 Installing frontend deps if needed...
[4/4]⚡ Running Vitest tests (frontend)...
  │
  │  ✓ tests/test_store.test.ts (10 tests)
  │  ✓ tests/test_api_routes.test.ts (3 tests)
  │  ✓ tests/test_dashboard_context.test.ts (5 tests)
  │  ✓ tests/test_supabase_realtime_stress.test.ts (7 tests)
  │
  │  Test Files  4 passed (4)
  │       Tests  25 passed (25)
  │
  │  ---------- Coverage ----------
  │  lib/store.ts         100%
  │  context/DashboardContext  92%
  │

  ✅ Frontend tests PASSED

╔══════════════════════════════════════════╗
║            Test Suite Summary            ║
╚══════════════════════════════════════════╝
  ✅ ALL TESTS PASSED
```
