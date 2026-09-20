# ⏱️ FastQuiz-AntiIA — Évaluation Express & Anti-Triche

<p align="center">
  <img src="https://img.shields.io/badge/PLATFORM-WEB%20(MOBILE%20%7C%20TABLET%20%7C%20PC)-blue?style=for-the-badge&logo=googlechrome" alt="Platform">
  <img src="https://img.shields.io/badge/BACKEND-GOOGLE%20APPS%20SCRIPT-red?style=for-the-badge&logo=google" alt="Backend">
  <img src="https://img.shields.io/badge/DATABASE-GOOGLE%20SHEETS-success?style=for-the-badge&logo=googlesheets" alt="Database">
  <img src="https://img.shields.io/badge/STATUS-ACTIF%20%2F%20STABLE-brightgreen?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/COST-100%25%20GRATUIT-orange?style=for-the-badge" alt="Cost">
</p>

<p align="center">
  <strong>Application Web pédagogique d'évaluation chronométrée conçue pour neutraliser l'utilisation de l'Intelligence Artificielle (ChatGPT) lors d'examens en ligne et en présentiel avec 100+ étudiants.</strong>
</p>

---

## 📑 Sommaire

- [⏱️ FastQuiz-AntiIA — Évaluation Express \& Anti-Triche](#️-fastquiz-antiia--évaluation-express--anti-triche)
  - [📑 Sommaire](#-sommaire)
  - [🎯 Présentation](#-présentation)
  - [📱 Aperçu \& Maquettes (Démo)](#-aperçu--maquettes-démo)
  - [⚡ Fonctionnalités Clés](#-fonctionnalités-clés)
    - [🎓 Côté Étudiant](#-côté-étudiant)
    - [👨‍🏫 Côté Enseignant (`?view=admin`)](#-côté-enseignant-viewadmin)
  - [🛡️ Mécanismes Anti-Triche / Anti-IA](#️-mécanismes-anti-triche--anti-ia)
  - [🏗️ Architecture \& Flux de Données](#️-architecture--flux-de-données)

---

## 🎯 Présentation

Face à l'essor des IA génératives (ChatGPT, Gemini, etc.), les questionnaires en ligne classiques (Google Forms, QCM asynchrones) ne permettent plus d'évaluer la compréhension réelle des étudiants à distance.

**FastQuiz-AntiIA** résout ce défi en appliquant une contrainte cognitive stricte : **10 secondes par question avec saut forcé et mélange aléatoire**. L'étudiant n'a techniquement pas le temps de copier l'intitulé, de l'injecter dans une IA et de revenir cocher la réponse.

---

## 📱 Aperçu & Maquettes (Démo)

<!-- Placez ici votre vidéo ou GIF de démo -->
<p align="center">
  <img src="https://via.placeholder.com/800x450.png?text=Inserez+ici+votre+GIF+ou+Video+de+Demonstration" alt="Aperçu Démo" width="80%">
</p>

<div align="center">

| Vue Étudiant (Chrono 10s) | Vue Enseignant (Débriefing Direct) |
| :---: | :---: |
| *(Insérez capture mobile ici)* | *(Insérez capture dashboard admin ici)* |

</div>

---

## ⚡ Fonctionnalités Clés

### 🎓 Côté Étudiant
- **Zéro installation :** Fonctionne directement sur smartphone, tablette ou ordinateur via un simple lien court.
- **Timer dynamique (10s) :** Barre visuelle de défilement (vert $\rightarrow$ rouge).
- **Validation instantanée :** Dès que l'élève clique sur une réponse, un micro-délai de 350 ms confirme le choix et bascule immédiatement sur la question suivante.
- **Résultat & Corrigé immédiat :** Calcul automatique de la note sur 20 et envoi d'un e-mail formaté avec le détail des erreurs.

### 👨‍🏫 Côté Enseignant (`?view=admin`)
- **Dashboard en direct pour Google Meet :** Graphiques à barres horizontales façon Google Forms (barres vertes pour les bonnes réponses, grises pour les erreurs).
- **Révélation des noms au clic :** Cliquez sur n'importe quel choix (A, B ou C) pour afficher la liste des élèves l'ayant choisi et animer le débat en direct.
- **Verrouillage de session :** Bouton pour ouvrir/fermer le test en direct ou programmer une date et heure limite de clôture.
- **Indicateurs KPI instantanés :** Moyenne de la classe, note médiane, note maximale et minimale.

---

## 🛡️ Mécanismes Anti-Triche / Anti-IA

| Barrière de Sécurité | Effet Pédagogique |
| :--- | :--- |
| **Pression temporelle stricte (10s)** | Rend impossible le copier-coller vers ChatGPT ou la recherche Google. |
| **Mélange Fisher-Yates** | L'ordre des questions est unique pour chaque élève. Deux voisins n'ont jamais la même question au même moment. |
| **Réponses protégées côté serveur** | Les bonnes réponses ne transitent jamais dans le code source du navigateur (l'inspection DevTools est inutile). |
| **Anti Copier-Coller & Clic Droit** | Désactivation des événements `copy`, `paste` et `contextmenu`. |
| **Unicité par e-mail** | Blocage automatique de toute tentative de repassage avec la même adresse e-mail. |

---

## 🏗️ Architecture & Flux de Données

```text
[ Étudiant (Smartphone / PC) ]              [ Enseignant (Google Meet) ]
             │                                           │
             ▼                                           ▼
┌─────────────────────────┐                 ┌─────────────────────────┐
│   Interface Élève (Web) │                 │   Vue Admin / Débrief   │
│   - Minuteur 10s        │                 │   (?view=admin)         │
│   - Shuffle Fisher-Yates│                 │   - Graphiques interactifs│
│   - Anti-copier-coller  │                 │   - Noms des étudiants  │
└────────────┬────────────┘                 └────────────▲────────────┘
             │                                           │
             │ (Soumission HTTPS)                        │ (Lecture Stats)
             ▼                                           │
┌────────────────────────────────────────────────────────┴────────────┐
│                    Google Apps Script (Backend)                     │
│  - Correction côté serveur                                          │
│  - Clôture de session (PropertiesService)                           │
│  - Distribution d'e-mails (MailApp)                                 │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 Google Sheets (Base de Données)                     │
│  • Onglet 'Questions' : Banque de questions modifiable en direct    │
│  • Onglet 'Reponses'  : Historique des notes et choix par élève     │
└─────────────────────────────────────────────────────────────────────┘