// ==================== POINT D'ENTRÉE ====================
function doGet(e) {
  const isAdmin = (e && e.parameter && e.parameter.view === 'admin');
  const template = HtmlService.createTemplateFromFile('index');
  
  const config = getQuizConfig();
  const now = new Date().getTime();
  let isClosed = (config.status === "CLOSED");
  
  if (config.closeTime && now > new Date(config.closeTime).getTime()) {
    isClosed = true;
  }

  template.isAdmin = isAdmin;
  template.isClosed = isClosed;
  template.config = config;
  template.questionsData = getQuestions();
  template.adminStats = isAdmin ? getAdminStats() : null;
  
  return template.evaluate()
    .setTitle(isAdmin ? "📊 Débriefing Enseignant" : "⏱️ Évaluation")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ==================== CONFIGURATION DU QUIZ ====================
function getQuizConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    status: props.getProperty("QUIZ_STATUS") || "OPEN",
    closeTime: props.getProperty("QUIZ_CLOSE_TIME") || "",
    emailsSent: props.getProperty("EMAILS_ALREADY_SENT") || "false"
  };
}

// Mise à jour de la configuration et programmation du déclencheur automatique
function updateQuizConfig(status, closeTime) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty("QUIZ_STATUS", status);
  props.setProperty("QUIZ_CLOSE_TIME", closeTime || "");

  // Si on rouvre le test, on réinitialise l'indicateur d'envoi
  if (status === "OPEN") {
    props.setProperty("EMAILS_ALREADY_SENT", "false");
  }

  // Programmation automatique du robot d'envoi à l'heure limite
  setupAutoCloseTrigger(closeTime, status);

  return { success: true, status: status, closeTime: closeTime };
}

// Création du Trigger automatique Google Apps Script
function setupAutoCloseTrigger(closeTimeStr, status) {
  // Supprimer les anciens déclencheurs pour éviter les doublons
  deleteTriggersByName('autoCloseAndSendEmails');

  if (status === "CLOSED" || !closeTimeStr) return;

  const closeDate = new Date(closeTimeStr);
  const now = new Date().getTime();

  // Si la date limite est bien dans le futur, on programme l'exécution automatique
  if (closeDate.getTime() > now) {
    ScriptApp.newTrigger('autoCloseAndSendEmails')
      .timeBased()
      .at(closeDate)
      .create();
    Logger.log("Déclencheur automatique programmé pour : " + closeDate);
  }
}

function deleteTriggersByName(functionName) {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === functionName) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

// Fonction exécutée AUTOMATIQUEMENT par Google à 23h59
function autoCloseAndSendEmails() {
  const props = PropertiesService.getScriptProperties();
  props.setProperty("QUIZ_STATUS", "CLOSED");
  
  // Envoi automatique des corrigés
  sendAllCorrections();
  deleteTriggersByName('autoCloseAndSendEmails');
}

// ==================== DONNÉES DU QUIZ ====================
function getQuestions() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Questions");
  const data = sheet.getDataRange().getDisplayValues();
  const questions = [];
  
  for (let i = 1; i < data.length; i++) {
    questions.push({
      id: data[i][0],
      question: data[i][1],
      options: [
        { key: 'A', text: data[i][2] },
        { key: 'B', text: data[i][3] },
        { key: 'C', text: data[i][4] }
      ]
    });
  }
  return questions;
}

function checkEmailExists(email) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Reponses");
  const data = sheet.getDataRange().getValues();
  const cleanEmail = String(email).trim().toLowerCase();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][3]).trim().toLowerCase() === cleanEmail) {
      return true;
    }
  }
  return false;
}

// Soumission : enregistrement SANS envoi immédiat de corrigé
function submitQuiz(studentData, answers) {
  const config = getQuizConfig();
  const now = new Date().getTime();
  if (config.status === "CLOSED" || (config.closeTime && now > new Date(config.closeTime).getTime())) {
    return { error: "Le test est clos. Votre soumission a expiré." };
  }

  if (checkEmailExists(studentData.email)) {
    return { error: "Tentative multiple détectée. Vous avez déjà soumis ce test !" };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const qSheet = ss.getSheetByName("Questions");
  const rSheet = ss.getSheetByName("Reponses");

  const qData = qSheet.getDataRange().getDisplayValues();
  let correctCount = 0;
  const totalQuestions = qData.length - 1;
  let studentAnswersRow = [];

  for (let i = 1; i < qData.length; i++) {
    const qId = qData[i][0];
    const realAnswer = String(qData[i][5]).trim().toUpperCase();
    const studentAnswer = answers[qId] ? String(answers[qId]).trim().toUpperCase() : "-";

    studentAnswersRow.push(studentAnswer);
    if (studentAnswer === realAnswer) correctCount++;
  }

  const scoreOn20 = Math.round(((correctCount / totalQuestions) * 20) * 100) / 100;

  rSheet.appendRow([
    new Date(),
    studentData.nom,
    studentData.prenom,
    studentData.email,
    scoreOn20,
    ...studentAnswersRow
  ]);

  return { score: scoreOn20, total: totalQuestions, correct: correctCount };
}

// ==================== ENVOI DU CORRIGÉ DÉTAILLÉ AVEC FORMULES EN CLAIR ====================
function sendAllCorrections() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const qSheet = ss.getSheetByName("Questions");
  const rSheet = ss.getSheetByName("Reponses");
  if (!qSheet || !rSheet) return 0;

  const qData = qSheet.getDataRange().getDisplayValues();
  const rData = rSheet.getDataRange().getDisplayValues();
  if (rData.length <= 1) return 0;

  const totalQuestions = qData.length - 1;
  let sentCount = 0;

  // Dictionnaire des explications / rappels de cours pour chaque question
  const explications = {
    1: "La formule de Leibniz donne la dérivée n-ième d'un produit. C'est l'analogue exact de la formule du binôme de Newton.",
    2: "Chaque dérivation de e^(ax) multiplie par la constante a. À l'ordre n, on a donc aⁿ · e^(ax).",
    3: "Avec a = -3, la dérivée n-ième vaut (-3)ⁿ · e^(-3x) = (-1)ⁿ · 3ⁿ · e^(-3x).",
    4: "Pour 1/(x+a) = (x+a)⁻¹, chaque dérivation fait sortir un signe moins et incrémente l'exposant : (-1)ⁿ · n! / (x+a)ⁿ⁺¹.",
    5: "La dérivée 1ère de ln(x+a) est 1/(x+a). On dérive ensuite (n-1) fois, d'où le décalage (-1)ⁿ⁻¹ · (n-1)! / (x+a)ⁿ.",
    6: "Dériver un cosinus ou sinus ajoute un déphasage de +π/2 à chaque étape et multiplie par a : aⁿ · cos(ax + nπ/2).",
    7: "De même pour le sinus : la dérivée n-ième est aⁿ · sin(ax + nπ/2).",
    8: "Une fonction est de classe Cⁿ si elle est n fois dérivable ET que sa dérivée n-ième f^(n) est continue.",
    9: "Un polynôme de degré d a toutes ses dérivées strictement supérieures à d identiquement nulles (P^(n) = 0 pour n > d).",
    10: "Par définition des coefficients binomiaux, C(n, 1) = n."
  };

  // Parcourir chaque étudiant
  for (let r = 1; r < rData.length; r++) {
    const studentNom = rData[r][1];
    const studentPrenom = rData[r][2];
    const studentEmail = String(rData[r][3]).trim();
    const scoreOn20 = rData[r][4];

    if (!studentEmail || !studentEmail.includes("@")) continue;

    let correctCount = 0;
    let questionsCardsHtml = "";

    for (let q = 1; q <= totalQuestions; q++) {
      const qTitle = qData[q][1];
      const optA = qData[q][2];
      const optB = qData[q][3];
      const optC = qData[q][4];
      const realAnswerKey = String(qData[q][5]).trim().toUpperCase();

      const studentKey = String(rData[r][4 + q] || "-").trim().toUpperCase();
      const isCorrect = (studentKey === realAnswerKey);
      if (isCorrect) correctCount++;

      // Retrouver le texte complet de l'option choisie
      let studentText = "Aucune réponse (temps écoulé)";
      if (studentKey === 'A') studentText = `A. ${optA}`;
      else if (studentKey === 'B') studentText = `B. ${optB}`;
      else if (studentKey === 'C') studentText = `C. ${optC}`;

      // Retrouver le texte complet de la bonne réponse
      let realText = "";
      if (realAnswerKey === 'A') realText = `A. ${optA}`;
      else if (realAnswerKey === 'B') realText = `B. ${optB}`;
      else if (realAnswerKey === 'C') realText = `C. ${optC}`;

      const astuce = explications[q] || "Formule fondamentale du cours à mémoriser.";

      questionsCardsHtml += `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 5px solid ${isCorrect ? '#16a34a' : '#dc2626'}; border-radius: 8px; padding: 14px; margin-bottom: 14px;">
          <div style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 8px;">
            Q${q}. ${qTitle}
          </div>
          <div style="font-size: 13px; margin: 4px 0;">
            <span style="color: #64748b;">Votre réponse :</span> 
            <strong style="color: ${isCorrect ? '#16a34a' : '#dc2626'};">${studentText}</strong> ${isCorrect ? '✅' : '❌'}
          </div>
          ${!isCorrect ? `
          <div style="font-size: 13px; margin: 4px 0;">
            <span style="color: #64748b;">Bonne réponse attendue :</span> 
            <strong style="color: #16a34a;">${realText}</strong>
          </div>` : ''}
          <div style="font-size: 12px; background: #f8fafc; border-radius: 4px; padding: 8px; margin-top: 8px; color: #334155;">
            💡 <strong>Rappel du cours :</strong> ${astuce}
          </div>
        </div>
      `;
    }

    try {
      MailApp.sendEmail({
        to: studentEmail,
        subject: `Corrigé Détaillé du QCM : ${scoreOn20}/20 - ${studentPrenom} ${studentNom}`,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #f8fafc;">
            <div style="background-color: #0f172a; color: white; padding: 22px; text-align: center;">
              <h2 style="margin: 0; color: #38bdf8;">Corrigé Officiel & Auto-Évaluation</h2>
              <p style="margin: 6px 0 0; color: #cbd5e1;">Étudiant : <strong>${studentPrenom} ${studentNom}</strong></p>
            </div>
            <div style="padding: 22px;">
              <div style="text-align: center; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <div style="font-size: 34px; font-weight: bold; color: ${parseFloat(scoreOn20) >= 10 ? '#16a34a' : '#dc2626'};">
                  ${scoreOn20} / 20
                </div>
                <div style="color: #64748b; font-size: 14px; margin-top: 4px;">
                  ${correctCount} réponse(s) exacte(s) sur ${totalQuestions}
                </div>
              </div>
              <p style="font-size: 14px; color: #475569; margin-bottom: 15px;">
                Prenez le temps d'analyser vos erreurs ci-dessous avant notre prochaine séance :
              </p>
              ${questionsCardsHtml}
              <div style="text-align: center; font-size: 12px; color: #94a3b8; margin-top: 25px;">
                BTS Bâtiment & Génie Civil — Mathématiques Spécialisées
              </div>
            </div>
          </div>`
      });
      sentCount++;
    } catch (err) {
      Logger.log("Erreur mail à " + studentEmail + " : " + err);
    }
  }

  props.setProperty("EMAILS_ALREADY_SENT", "true");
  return sentCount;
}

// ==================== STATISTIQUES ADMIN ====================
function getAdminStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const qSheet = ss.getSheetByName("Questions");
  const rSheet = ss.getSheetByName("Reponses");
  if (!qSheet || !rSheet) return null;

  const qData = qSheet.getDataRange().getDisplayValues();
  const rData = rSheet.getDataRange().getDisplayValues();
  const studentsCount = rData.length > 1 ? rData.length - 1 : 0;

  const scores = [];
  for (let i = 1; i < rData.length; i++) {
    const s = parseFloat(rData[i][4]);
    if (!isNaN(s)) scores.push(s);
  }

  scores.sort((a, b) => a - b);
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0;
  let median = 0;
  if (scores.length) {
    const mid = Math.floor(scores.length / 2);
    median = scores.length % 2 !== 0 ? scores[mid] : ((scores[mid - 1] + scores[mid]) / 2).toFixed(1);
  }

  const questionsStats = [];
  const totalQ = qData.length - 1;

  for (let q = 1; q <= totalQ; q++) {
    const qTitle = qData[q][1];
    const correctKey = String(qData[q][5]).trim().toUpperCase();
    
    const options = [
      { key: 'A', text: qData[q][2], count: 0, students: [] },
      { key: 'B', text: qData[q][3], count: 0, students: [] },
      { key: 'C', text: qData[q][4], count: 0, students: [] }
    ];
    let unanswered = { count: 0, students: [] };

    const colIndex = 4 + q;
    for (let r = 1; r < rData.length; r++) {
      const studentName = `${rData[r][2]} ${rData[r][1]}`.trim();
      const ans = String(rData[r][colIndex] || "").trim().toUpperCase();
      
      const opt = options.find(o => o.key === ans);
      if (opt) {
        opt.count++;
        opt.students.push(studentName);
      } else {
        unanswered.count++;
        unanswered.students.push(studentName);
      }
    }

    const correctOpt = options.find(o => o.key === correctKey);
    const correctCount = correctOpt ? correctOpt.count : 0;
    const successRate = studentsCount > 0 ? ((correctCount / studentsCount) * 100).toFixed(1) : 0;

    questionsStats.push({
      num: q,
      title: qTitle,
      correctKey: correctKey,
      successRate: successRate,
      correctCount: correctCount,
      options: options,
      unanswered: unanswered
    });
  }

  return {
    studentsCount: studentsCount,
    average: avg,
    median: median,
    max: scores.length ? Math.max(...scores) : 0,
    min: scores.length ? Math.min(...scores) : 0,
    questions: questionsStats
  };
}