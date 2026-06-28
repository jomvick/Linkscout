Voici le fichier `DESIGN.md` complet, structuré comme un véritable cahier des charges de direction artistique (DA). Il fusionne les codes institutionnels de LinkedIn avec le minimalisme ultra-fluide des plus beaux produits SaaS modernes (comme Linear ou Vercel), le tout adapté à ton ADN "Zen-Tech".

---

# Fichier : `DESIGN.md`

# Direction Artistique & UI/UX Design System — LinkScout MVP

Ce document définit l'identité visuelle, la charte graphique et l'expérience utilisateur de **LinkScout**. L'objectif est de réinterpréter l'univers corporate de LinkedIn à travers les standards du design d'interface moderne : minimalisme, typographies premium, espaces aérés, et animations fluides à haute performance.

---

## 1. La Palette de Couleurs (LinkedIn Identity, Refined)

Nous reprenons le bleu et le blanc historiques de LinkedIn, mais nous les transposons dans une palette plus vibrante et contrastée, inspirée des guidelines de design de Stripe et Vercel. Le mode clair est lumineux et "Clinical Pro", tandis que le mode sombre est profond et immersif.

### A. Mode Clair (Principal — Pro & Épuré)

* **Background (Canvas) :** `#F8FAFC` (Slate 50) — Un blanc cassé très doux pour éviter la fatigue visuelle.
* **Surface (Cards & Panels) :** `#FFFFFF` (Pure White) — Pour détacher nettement les éléments du fond.
* **Brand Primary (Le Bleu) :** `#0A66C2` (LinkedIn Blue officiel, traité en accent électrique).
* **Brand Hover/Active :** `#004182` (Bleu profond pour les états actifs).
* **Text Primary :** `#0F172A` (Slate 900) — Un bleu-noir ultra-dense pour une lisibilité maximale.
* **Text Secondary :** `#475569` (Slate 600) — Pour les métadonnées et les descriptions.
* **Border / Divider :** `#E2E8F0` (Slate 200) — Des lignes micro-fines (1px) pour structurer sans alourdir.

### B. Signaux Lumineux (Indicateurs IA)

* **Match Élevé (90%+) :** `#10B981` (Émeraude) — Succès / Haute pertinence.
* **Match Moyen (70-89%) :** `#F59E0B` (Ambre) — À surveiller.
* **Accent Technique :** `#6366F1` (Indigo) — Pour les éléments liés à l'IA et à l'automatisation.

---

## 2. Typographie & Alignement (L'Effet "Grande Boîte")

Pour obtenir ce rendu premium propre aux outils d'ingénierie et de productivité modernes, la typographie doit être géométrique, lisible et hiérarchisée.

* **Police Principale (Sans-Serif) :** `Geist Sans` ou `Inter` (Google Fonts / Vercel Open Source).
* **Police Mono (Métadonnées & Tech) :** `Geist Mono` ou `JetBrains Mono` (pour les badges de stack technique et les scores de match).

### Échelle des Textes

```markdown
H1 (Titres principaux)   -> 24px | Medium (Tracking: -0.02em)
H2 (Titres de sections)  -> 18px | Medium (Tracking: -0.01em)
Body (Contenu / Offres)  -> 14px | Regular
Subtext (Tags / Dates)   -> 12px | Regular / Mono

```

---

## 3. Layout & Structure UX (The "Zen-Tech" Workspace)

L'interface est divisée en un layout asymétrique à deux colonnes (Master-Detail), évitant à l'utilisateur de changer de page ou d'ouvrir de multiples onglets.

```
+-----------------------------------------------------------------------+
|  Topbar: [Command Bar / Recherche "Rechercher une opportunité..."]    |
+-----------------------------------------------------------------------+
|                 |                                                     |
|                 |  [Panneau de Détails Actif]                         |
|                 |                                                     |
|  [Flux de Cards |  Logo + Titre du Poste (Grand)                      |
|   d'Offres]     |  Entreprise | Localisation | Contrat                |
|                 |  -------------------------------------------------  |
|  Card 1 (Active)|  [Onglets: Résumé IA | Offre Brute | Accroche ]     |
|  Card 2         |                                                     |
|  Card 3         |  > Résumé IA :                                      |
|                 |    • Mission principale : ...                       |
|                 |    • Stack demandée : [Rust] [Next.js]              |
|                 |                                                     |
|                 |  [Bouton Action: Générer Message d'Approche]        |
|                 |                                                     |
+-----------------+-----------------------------------------------------+

```

### Les Composants Clés

1. **La Barre de Commande Centrale (Style Raycast/Linear) :**
* Un input géant, sans bordure, flottant au centre supérieur de l’écran.
* Placeholder : `Rechercher un rôle, une techno ou un lieu... (ex: Rust Remote)`
* Raccourci clavier `CMD + K` pour y accéder instantanément.


2. **La Carte d’Opportunité (Le Flux) :**
* `border border-slate-200 bg-white rounded-xl p-4 transition-all`
* *Au survol :* Légère ombre portée (`shadow-md`) et déplacement de 1px vers le haut.
* *État Actif :* Une bordure gauche de 3px de couleur bleu LinkedIn (`#0A66C2`) pour indiquer la sélection.


3. **L'Écran de Détails (Glassmorphism & Focus) :**
* Zone de lecture principale. Utilisation d’onglets fluides pour basculer entre l'analyse IA (synthétique) et le texte original de l'offre (dense).



---

## 4. Micro-Interactions & Fluidité (L'Expérience Motion)

C'est ici que l'application se démarque d'un simple tableau de données. Nous utilisons des transitions physiques via `framer-motion` (ou CSS transitions optimisées hardware).

* **Entrée des données (Stagger Effect) :** Quand le scraper renvoie les résultats, les cartes n'apparaissent pas d'un coup sec. Elles effectuent un fondu enchaîné ascendant les unes après les autres avec un délai de `0.05s`.
* **Le Switch d'Onglet (Smooth Indicator) :** L'indicateur sous l'onglet actif (Résumé IA / Texte brut) est un pillule de fond qui glisse d'un onglet à l'autre avec un effet de ressort (`type: "spring", stiffness: 300, damping: 30`).
* **Le Bouton "Générer l'accroche" (Glow Effect) :** Un bouton bleu LinkedIn avec un léger dégradé linéaire discret. Lors du clic pour générer le message par l'IA, le texte passe en opacité 0, et un loader minimaliste (une ligne blanche qui traverse le bouton de gauche à droite en boucle) s'active.

---

## 5. Spécifications Tailwind CSS (Pour le Code)

Pour accélérer le dev lors de tes sessions de *vibe coding*, voici les classes d'UI de référence à copier-coller :

* **Le Container de Carte :**
```html
class="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-200 active:translate-y-0"

```



```
*   **Le Badge Score IA (Style Pro / Mono) :**
    ```html
    class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-mono font-medium text-emerald-700 border border-emerald-200"

```

* **La Topbar Flottante :**
```html
class="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md"

```



```

***

Ce fichier `DESIGN.md` te sert maintenant de boussole visuelle. Prêt à ce qu'on traduise cette DA en code en créant les premiers composants layout sur Next.js ?

```
