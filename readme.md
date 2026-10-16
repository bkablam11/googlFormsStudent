# ⏱️ FastQuiz-AntiIA — Évaluation Express, Multi-Filières & Anti-Triche

<p align="center">
  <img src="https://img.shields.io/badge/PLATFORM-WEB%20(MOBILE%20%7C%20TABLET%20%7C%20PC)-blue?style=for-the-badge&logo=googlechrome" alt="Platform">
  <img src="https://img.shields.io/badge/BACKEND-GOOGLE%20APPS%20SCRIPT-red?style=for-the-badge&logo=google" alt="Backend">
  <img src="https://img.shields.io/badge/DATABASE-GOOGLE%20SHEETS-success?style=for-the-badge&logo=googlesheets" alt="Database">
  <img src="https://img.shields.io/badge/SECURITY-ANTI--IA%20%26%20ANTI--LEAK-brightgreen?style=for-the-badge" alt="Security">
  <img src="https://img.shields.io/badge/ARCHITECTURE-MULTI--CLASSES%20SERVERLESS-orange?style=for-the-badge" alt="Architecture">
</p>

<p align="center">
  <strong>Application Web pédagogique d'évaluation flash sous haute contrainte temporelle, conçue pour neutraliser l'usage des IA génératives (ChatGPT, Gemini), éliminer les fuites de corrigés via WhatsApp et automatiser le tri des notes par filière.</strong>
</p>

---

## 📑 Sommaire

- [⏱️ FastQuiz-AntiIA — Évaluation Express, Multi-Filières \& Anti-Triche](#️-fastquiz-antiia--évaluation-express-multi-filières--anti-triche)
  - [📑 Sommaire](#-sommaire)
  - [🎯 Présentation \& Défi Pédagogique](#-présentation--défi-pédagogique)
  - [🛡️ L'Arsenal Anti-Fraude](#️-larsenal-anti-fraude)
  - [🏫 Architecture Multi-Classes Spécifique](#-architecture-multi-classes-spécifique)
  - [🔗 Accès à l'Application](#-accès-à-lapplication)
    - [🎓 Côté Étudiant](#-côté-étudiant)
    - [👨‍🏫 Côté Enseignant (`?view=admin`)](#-côté-enseignant-viewadmin)

---

## 🎯 Présentation & Défi Pédagogique

Dans l'enseignement supérieur technique (BTS Génie Civil, Informatique IDA, Finance FCGE, classes préparatoires), les QCM asynchrones classiques (Google Forms, Moodle) ne permettent plus d'évaluer fidèlement les connaissances :
1. **L'IA générative (ChatGPT, Claude, Gemini)** fournit la réponse en 10 secondes dès lors que l'étudiant peut copier le texte.
2. **Les groupes WhatsApp d'étudiants** permettent au premier ayant terminé de diffuser une capture d'écran des réponses aux autres.
3. **Le casse-tête multi-classes :** Gérer plusieurs filières avec des questions différentes et des emplois du temps distincts conduit souvent à écraser ou mélanger les résultats.

**FastQuiz-AntiIA** apporte une réponse systémique :
* **Cadence forcée de 10 secondes par question** (réflexe pur, zéro temps de triche).
* **Zéro corrigé envoyé avant la clôture officielle** (la note s'affiche, mais aucune réponse n'est divulguée).
* **Support natif de plusieurs filières** sur un seul lien avec routage automatique des questions.
* **Archivage et tri nocturne automatisé à 23h59** dans des onglets dédiés par classe et par date.

---

## 🛡️ L'Arsenal Anti-Fraude

| Barrière de Protection | Dispositif Technique | Bénéfice Pédagogique |
| :--- | :--- | :--- |
| **Pression temporelle stricte** | Minuteur JS 10s avec défilement irréversible | Neutralise la recherche documentaire et l'injection dans ChatGPT. |
| **Mélange Fisher-Yates** | `shuffleArray(questions)` aléatoire par élève | Deux voisins n'ont jamais la même question affichée au même moment. |
| **Rétention des corrigés** | Suppression des corrigés dans `submitQuiz()` | Empêche le partage précoce des solutions sur les réseaux sociaux. |
| **Filtre Regex d'e-mail** | Contrôle strict `^[a-zA-Z0-9._%+-]+@...` | Rejette les comptes anonymes et jetables (`v.mail`, `thjhh`, etc.). |
| **Verrouillage matériel** | Empreinte `localStorage` par module/session | Empêche un étudiant de recomposer sous un faux nom sur le même smartphone. |
| **Expiration à 23h59** | Horodatage du verrou matériel synchronisé | Déverrouille automatiquement tous les téléphones dès minuit pour la leçon suivante. |
| **Anti-Copier / Inspecter** | Écouteurs `copy`, `paste` bloqués & clic droit interdit | Bloque l'extraction textuelle des questions. |

---

## 🏫 Architecture Multi-Classes Spécifique

L'application prend en charge jusqu'à 3 filières distinctes avec leurs propres banques de 10 questions :
* **`GCBAT2`** : Génie Civil Bâtiment (2ᵉ année) — Questions techniques / mathématiques spéciales.
* **`IDA1`** : Informatique Développeur d'Applications (1ʳᵉ année) — Algorithmique / logique.
* **`FCGE1`** : Finance, Comptabilité et Gestion des Entreprises (1ʳᵉ année) — Mathématiques financières.

L'étudiant choisit sa filière dans un menu déroulant à l'accueil. Le système lui distribue automatiquement les 10 questions de sa filière sans qu'il puisse voir les autres.

---

## 🔗 Accès à l'Application

### 🎓 Côté Étudiant
- **Lien court :** `https://tinyurl.com/mon-quizz` (ou alias TinyURL personnalisé).
- **Accès mobile :** Flash du QR Code affiché au vidéoprojecteur.

### 👨‍🏫 Côté Enseignant (`?view=admin`)
Ajoutez `?view=admin` à la fin de votre URL de déploiement Google Apps Script :
```text
https://script.google.com/macros/s/VOTRE_DEPLOYMENT_ID/exec?view=admin