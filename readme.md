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
  - [🔗 Accès à l'application](#-accès-à-lapplication)
    - [🎓 Accès étudiant](#-accès-étudiant)
    - [👨‍🏫 Accès enseignant](#-accès-enseignant)
  - [📱 Aperçu \& Captures](#-aperçu--captures)
  - [⚡ Fonctionnalités Clés](#-fonctionnalités-clés)
    - [🎓 Côté Étudiant](#-côté-étudiant)
    - [👨‍🏫 Côté Enseignant (`?view=admin`)](#-côté-enseignant-viewadmin)
  - [🛡️ Mécanismes Anti-Triche / Anti-IA](#️-mécanismes-anti-triche--anti-ia)
  - [🏗️ Architecture \& Flux de Données](#️-architecture--flux-de-données)
  - [🚀 Utilisation](#-utilisation)
    - [Pour l'étudiant](#pour-létudiant)
    - [Pour l'enseignant](#pour-lenseignant)

---

## 🎯 Présentation

Face à l'essor des IA génératives (ChatGPT, Gemini, etc.), les questionnaires en ligne classiques (Google Forms, QCM asynchrones) ne permettent plus d'évaluer la compréhension réelle des étudiants à distance.

**FastQuiz-AntiIA** résout ce défi en appliquant une contrainte cognitive stricte : **10 secondes par question avec saut forcé et mélange aléatoire**. L'étudiant n'a techniquement pas le temps de copier l'intitulé, de l'injecter dans une IA et de revenir cocher la réponse.

---

## 🔗 Accès à l'application

### 🎓 Accès étudiant

<p align="center">
  <a href="https://tinyurl.com/quizz-python"><strong>👉 Ouvrir l'évaluation Python Express</strong></a>
</p>

Lien court à partager aux étudiants : **https://tinyurl.com/quizz-python**

### 👨‍🏫 Accès enseignant

Depuis l'URL de déploiement Google Apps Script, ajouter le paramètre `?view=admin` pour ouvrir le tableau de bord de débriefing enseignant.

---

## 📱 Aperçu & Captures

<p align="center">
  <img src="pageaccueil.png" alt="Écran d'accueil de l'évaluation Python Express" width="80%">
</p>

<p align="center"><em>Écran d'accueil étudiant : saisie du nom, du prénom et de l'adresse e-mail avant le lancement.</em></p>

<p align="center">
  <img src="formclose.png" alt="Écran indiquant que l'évaluation est clôturée" width="80%">
</p>

<p align="center"><em>Écran affiché lorsque l'enseignant a fermé le test ou que la date limite est dépassée.</em></p>

<p align="center">
  <img src="qrapp.jpeg" alt="QR code pour accéder à l'application étudiant" width="280">
</p>

<p align="center"><em>QR code permettant d'accéder rapidement à l'application depuis un smartphone.</em></p>

<p align="center"><em>Dashboard des profs</em></p>

<p align="center">
  <img src="dashboardprof.jpeg" alt="Écran indiquant que l'évaluation est clôturée" width="80%">
</p>

</div>

---

## ⚡ Fonctionnalités Clés

### 🎓 Côté Étudiant
- **Zéro installation :** Fonctionne directement sur smartphone, tablette ou ordinateur via un simple lien court.
- **Identification avant le test :** L'étudiant renseigne son nom, son prénom et son e-mail avant de commencer.
- **Timer dynamique (10s) :** Barre visuelle de défilement (vert $\rightarrow$ rouge).
- **Progression question par question :** Une réponse sélectionnée entraîne automatiquement le passage à la suivante ; une question sans réponse est également passée à l'expiration du délai.
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
```

---

## 🚀 Utilisation

### Pour l'étudiant

1. Ouvrir le [lien de l'application](https://tinyurl.com/quizz-python) ou scanner le QR code ci-dessus.
2. Saisir le nom, le prénom et l'adresse e-mail.
3. Cliquer sur **Lancer le test**.
4. Répondre à chaque question dans le délai de 10 secondes.
5. Consulter la note affichée à la fin et le récapitulatif envoyé par e-mail.

### Pour l'enseignant

1. Ouvrir l'URL de déploiement avec `?view=admin`.
2. Vérifier le nombre de participants, la moyenne, la médiane et les notes extrêmes.
3. Cliquer sur une barre de réponse pour afficher les étudiants concernés.
4. Ouvrir ou fermer la session, ou programmer sa fermeture automatique.

