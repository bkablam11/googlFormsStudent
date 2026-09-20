// Point d'entrée
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
    .setTitle(isAdmin ? "📊 Débriefing Enseignant - Python" : "⏱️ Évaluation Python Express")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Récupération de l'état du Quiz (Ouvert/Fermé + Date limite)
function getQuizConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    status: props.getProperty("QUIZ_STATUS") || "OPEN",
    closeTime: props.getProperty("QUIZ_CLOSE_TIME") || ""
  };
}

// Enregistrement par l'enseignant depuis l'écran admin
function updateQuizConfig(status, closeTime) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty("QUIZ_STATUS", status);
  props.setProperty("QUIZ_CLOSE_TIME", closeTime || "");
  return { success: true, status: status, closeTime: closeTime };
}

// Questions en texte brut
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

// Vérification de doublon d'e-mail
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

// Soumission et enregistrement
function submitQuiz(studentData, answers) {
  const config = getQuizConfig();
  const now = new Date().getTime();
  if (config.status === "CLOSED" || (config.closeTime && now > new Date(config.closeTime).getTime())) {
    return { error: "Le test est désormais clos. Votre soumission a expiré." };
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
  
  let detailedReviewHtml = "";
  let studentAnswersRow = [];

  for (let i = 1; i < qData.length; i++) {
    const qId = qData[i][0];
    const qTitle = qData[i][1];
    const realAnswer = String(qData[i][5]).trim().toUpperCase();
    const studentAnswer = answers[qId] ? String(answers[qId]).trim().toUpperCase() : "-";

    studentAnswersRow.push(studentAnswer);
    const isCorrect = (studentAnswer === realAnswer);
    if (isCorrect) correctCount++;

    detailedReviewHtml += `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 8px;"><strong>Q${i}:</strong> ${qTitle}</td>
        <td style="padding: 8px; color: ${isCorrect ? '#16a34a' : '#dc2626'}; font-weight: bold;">${studentAnswer}</td>
        <td style="padding: 8px; font-weight: bold; color: #16a34a;">${realAnswer}</td>
        <td style="padding: 8px;">${isCorrect ? '✅' : '❌'}</td>
      </tr>
    `;
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

  if (studentData.email && studentData.email.includes("@")) {
    try {
      MailApp.sendEmail({
        to: studentData.email,
        subject: `Résultat QCM Python : ${scoreOn20}/20`,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #2563eb; color: white; padding: 18px; text-align: center;">
              <h2 style="margin:0;">Résultat du QCM Python</h2>
              <p style="margin: 5px 0 0;">Étudiant : ${studentData.prenom} ${studentData.nom}</p>
            </div>
            <div style="padding: 20px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 36px; font-weight: bold; color: ${scoreOn20 >= 10 ? '#16a34a' : '#dc2626'};">${scoreOn20} / 20</span>
                <p style="color: #64748b; margin: 5px 0;">${correctCount} / ${totalQuestions} réponses correctes</p>
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="background: #f1f5f9; text-align: left;">
                    <th style="padding: 8px;">Question</th>
                    <th style="padding: 8px;">Votre choix</th>
                    <th style="padding: 8px;">Bonne rép.</th>
                    <th style="padding: 8px;">Statut</th>
                  </tr>
                </thead>
                <tbody>${detailedReviewHtml}</tbody>
              </table>
            </div>
          </div>`
      });
    } catch (e) {
      Logger.log("Erreur mail: " + e);
    }
  }

  return { score: scoreOn20, total: totalQuestions, correct: correctCount };
}

// Statistiques pour l'admin
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