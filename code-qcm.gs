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
  template.questionsByClass = getAllQuestionsByClass();
  template.availableSheets = getAvailableSheets();
  template.adminStats = isAdmin ? getAdminStats("ALL", "Reponses") : null;
  
  return template.evaluate()
    .setTitle(isAdmin ? "📊 Débriefing Multi-Classes" : "⏱️ Évaluation")
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ==================== LISTE DES FEUILLES DISPONIBLES ====================
function getAvailableSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  const result = [];
  
  if (ss.getSheetByName("Reponses")) result.push("Reponses (Session en cours)");

  sheets.forEach(s => {
    const name = s.getName();
    if (name !== "Reponses" && !name.startsWith("Questions_")) {
      result.push(name);
    }
  });
  return result;
}

// ==================== CONFIGURATION DU QUIZ ====================
function getQuizConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    status: props.getProperty("QUIZ_STATUS") || "OPEN",
    closeTime: props.getProperty("QUIZ_CLOSE_TIME") || getDefaultClosingTime(),
    quizId: props.getProperty("QUIZ_ID") || "LECON_1",
    emailsSent: props.getProperty("EMAILS_ALREADY_SENT") || "false"
  };
}

function getDefaultClosingTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T23:59`;
}

function getTomorrowClosingTime() {
  const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T23:59`;
}

function getNextQuizId(currentId) {
  const match = String(currentId).match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const num = parseInt(match[2], 10) + 1;
    return prefix + num;
  }
  return currentId + "_SUIVANT";
}

function updateQuizConfig(status, closeTime, quizId) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty("QUIZ_STATUS", status);
  props.setProperty("QUIZ_CLOSE_TIME", closeTime || getDefaultClosingTime());
  if (quizId) props.setProperty("QUIZ_ID", quizId.trim().toUpperCase());

  if (status === "OPEN") {
    props.setProperty("EMAILS_ALREADY_SENT", "false");
  }

  setupAutoCloseTrigger(closeTime, status);
  return { 
    success: true, 
    status: status, 
    closeTime: closeTime, 
    quizId: props.getProperty("QUIZ_ID") 
  };
}

function setupAutoCloseTrigger(closeTimeStr, status) {
  deleteTriggersByName('autoCloseAndSendEmails');
  if (status === "CLOSED" || !closeTimeStr) return;

  const closeDate = new Date(closeTimeStr);
  const now = new Date().getTime();

  if (closeDate.getTime() > now) {
    ScriptApp.newTrigger('autoCloseAndSendEmails')
      .timeBased()
      .at(closeDate)
      .create();
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

// ==================== EXTRACTION DE LA VRAIE DATE D'ÉPREUVE ====================
function extractDateStrFromCell(cellVal) {
  if (!cellVal) return null;
  if (cellVal instanceof Date) {
    const d = String(cellVal.getDate()).padStart(2, '0');
    const m = String(cellVal.getMonth() + 1).padStart(2, '0');
    const y = String(cellVal.getFullYear()).slice(-2);
    return `${d}-${m}-${y}`;
  }
  const str = String(cellVal).trim();
  const frMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (frMatch) {
    const d = frMatch[1].padStart(2, '0');
    const m = frMatch[2].padStart(2, '0');
    const y = frMatch[3].slice(-2);
    return `${d}-${m}-${y}`;
  }
  return null;
}

// ==================== PROCESSUS DE CLÔTURE UNIQUE ====================
function closeAndProcessSession() {
  const props = PropertiesService.getScriptProperties();

  // 1. Envoi des e-mails avec corrigés notés sur 10
  sendAllCorrections();

  // 2. Tri et archivage automatique par classe (sans doublon et avec vraie date)
  const createdSheets = archiveAndSplitByClass();

  // 3. Bascule du statut sur FERMÉ
  props.setProperty("QUIZ_STATUS", "CLOSED");
  props.setProperty("EMAILS_ALREADY_SENT", "true");

  // 4. Passage automatique au module suivant et préparation pour le lendemain
  const currentQuizId = props.getProperty("QUIZ_ID") || "LECON_1";
  const nextQuizId = getNextQuizId(currentQuizId);
  props.setProperty("QUIZ_ID", nextQuizId);

  const nextClose = getTomorrowClosingTime();
  props.setProperty("QUIZ_CLOSE_TIME", nextClose);

  deleteTriggersByName('autoCloseAndSendEmails');
  setupAutoCloseTrigger(nextClose, "OPEN");

  return { success: true, createdSheets: createdSheets, nextQuizId: nextQuizId };
}

function autoCloseAndSendEmails() {
  closeAndProcessSession();
}

function getAllQuestionsByClass() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const classes = ["GCBAT2", "IDA1", "FCGE1"];
  const result = {};

  classes.forEach(cls => {
    let sheet = ss.getSheetByName("Questions_" + cls);
    if (!sheet) sheet = ss.getSheetByName("Questions");

    const list = [];
    if (sheet) {
      const data = sheet.getDataRange().getDisplayValues();
      for (let i = 1; i < data.length; i++) {
        if (!data[i][1] || !data[i][1].trim()) continue;
        list.push({
          id: data[i][0] || i,
          question: data[i][1],
          options: [
            { key: 'A', text: data[i][2] || "" },
            { key: 'B', text: data[i][3] || "" },
            { key: 'C', text: data[i][4] || "" }
          ],
          correctKey: String(data[i][5] || "").trim().toUpperCase()
        });
      }
    }
    result[cls] = list;
  });

  return result;
}

// ==================== ARCHIVAGE AVEC VRAIE DATE ET SANS DOUBLONS ====================
function archiveAndSplitByClass() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rSheet = ss.getSheetByName("Reponses");
  if (!rSheet) return "Erreur: feuille Reponses introuvable";

  const rData = rSheet.getDataRange().getDisplayValues();
  if (rData.length <= 1) return "Aucune réponse à archiver";

  const cfg = getQuizConfig();

  // Extraction de la vraie date depuis les réponses de la feuille
  let defaultDateStr = "";
  for (let i = 1; i < rData.length; i++) {
    const extracted = extractDateStrFromCell(rData[i][0]);
    if (extracted) {
      defaultDateStr = extracted;
      break;
    }
  }

  if (!defaultDateStr) {
    const now = new Date();
    defaultDateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getFullYear()).slice(-2)}`;
  }

  const rowsByClass = {};
  for (let i = 1; i < rData.length; i++) {
    const row = rData[i];
    if (!row[1] && !row[4]) continue;
    const cls = String(row[3] || "AUTRE").trim().toUpperCase();
    if (!rowsByClass[cls]) rowsByClass[cls] = [];
    rowsByClass[cls].push(row);
  }

  const processedSheets = [];

  for (const cls in rowsByClass) {
    const classRows = rowsByClass[cls];
    let classDateStr = defaultDateStr;

    for (let r = 0; r < classRows.length; r++) {
      const rowDate = extractDateStrFromCell(classRows[r][0]);
      if (rowDate) {
        classDateStr = rowDate;
        break;
      }
    }

    const targetName = `${classDateStr}-${cfg.quizId}-${cls}`;
    let targetSheet = ss.getSheetByName(targetName);

    // Si la feuille n'existe pas encore, on la crée proprement
    if (!targetSheet) {
      targetSheet = ss.insertSheet(targetName);
      targetSheet.appendRow([
        "Date", "Nom", "Prénom", "Classe", "Email", "Score / 10",
        "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10"
      ]);
      targetSheet.getRange(1, 1, 1, 16).setFontWeight("bold").setBackground("#e2e8f0");
      processedSheets.push(targetName);
    } else {
      processedSheets.push(`${targetName} (complété)`);
    }

    // Protection anti-doublon d'étudiants par e-mail
    const existingData = targetSheet.getDataRange().getDisplayValues();
    const existingEmails = new Set();
    for (let k = 1; k < existingData.length; k++) {
      if (existingData[k][4]) {
        existingEmails.add(String(existingData[k][4]).trim().toLowerCase());
      }
    }

    classRows.forEach(r => {
      const email = String(r[4] || "").trim().toLowerCase();
      if (!existingEmails.has(email)) {
        targetSheet.appendRow(r);
        existingEmails.add(email);
      }
    });
  }

  // Nettoyage complet du sas Reponses
  const lastRow = rSheet.getLastRow();
  if (lastRow > 1) {
    rSheet.deleteRows(2, lastRow - 1);
  }

  // S'assurer que l'en-tête de Reponses affiche bien Score / 10
  rSheet.getRange(1, 6).setValue("Score / 10");

  return processedSheets.join(", ");
}

function isValidEmail(email) {
  if (!email) return false;
  const regex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  return regex.test(String(email).trim().toLowerCase());
}

function checkEmailExists(email) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Reponses");
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  const cleanEmail = String(email).trim().toLowerCase();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][4]).trim().toLowerCase() === cleanEmail) {
      return true;
    }
  }
  return false;
}

// ==================== SOUMISSION DU TEST (NOTE STRICTE SUR 10) ====================
function submitQuiz(studentData, answers) {
  const config = getQuizConfig();
  const now = new Date().getTime();
  if (config.status === "CLOSED" || (config.closeTime && now > new Date(config.closeTime).getTime())) {
    return { error: "Le test est clos. Votre soumission a expiré." };
  }

  if (!isValidEmail(studentData.email)) {
    return { error: "Adresse e-mail invalide. Veuillez fournir une adresse réelle (ex: etudiant@gmail.com)." };
  }

  if (checkEmailExists(studentData.email)) {
    return { error: "Tentative multiple détectée. Vous avez déjà validé cette épreuve !" };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cls = studentData.classe || "GCBAT2";
  
  let qSheet = ss.getSheetByName("Questions_" + cls);
  if (!qSheet) qSheet = ss.getSheetByName("Questions");
  const rSheet = ss.getSheetByName("Reponses");

  const qData = qSheet.getDataRange().getDisplayValues();
  let correctCount = 0;
  const totalQuestions = Math.max(1, qData.length - 1);
  let studentAnswersRow = [];

  for (let i = 1; i < qData.length; i++) {
    const qId = qData[i][0];
    const realAnswer = String(qData[i][5]).trim().toUpperCase();
    const studentAnswer = answers[qId] ? String(answers[qId]).trim().toUpperCase() : "-";

    studentAnswersRow.push(studentAnswer);
    if (studentAnswer === realAnswer) correctCount++;
  }

  // 1 point par réponse correcte sur un total de 10 questions
  const scoreOn10 = totalQuestions === 10 ? correctCount : Math.round(((correctCount / totalQuestions) * 10) * 10) / 10;

  // Harmonisation de l'en-tête Col F
  if (rSheet.getRange(1, 6).getValue() !== "Score / 10") {
    rSheet.getRange(1, 6).setValue("Score / 10");
  }

  rSheet.appendRow([
    new Date(),
    studentData.nom,
    studentData.prenom,
    cls,
    studentData.email.trim().toLowerCase(),
    scoreOn10,
    ...studentAnswersRow
  ]);

  return { score: scoreOn10, total: totalQuestions, correct: correctCount };
}

// ==================== ENVOI DES CORRIGÉS PAR EMAIL (SUR 10) ====================
function sendAllCorrections() {
  const props = PropertiesService.getScriptProperties();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rSheet = ss.getSheetByName("Reponses");
  if (!rSheet) return 0;

  const rData = rSheet.getDataRange().getDisplayValues();
  if (rData.length <= 1) return 0;

  const allQuestions = getAllQuestionsByClass();
  let sentCount = 0;

  for (let r = 1; r < rData.length; r++) {
    const studentNom = rData[r][1];
    const studentPrenom = rData[r][2];
    const studentClass = String(rData[r][3] || "GCBAT2").trim().toUpperCase();
    const studentEmail = String(rData[r][4]).trim();
    
    let rawScore = parseFloat(rData[r][5]);
    // Sécurité rétrocompatible : si une ancienne note sur 20 était restée, conversion sur 10
    if (rawScore > 10) rawScore = rawScore / 2;
    const scoreOn10 = isNaN(rawScore) ? 0 : rawScore;

    if (!isValidEmail(studentEmail)) continue;

    const classQuestions = allQuestions[studentClass] || allQuestions["GCBAT2"] || [];
    const totalQuestions = classQuestions.length;

    let correctCount = 0;
    let questionsCardsHtml = "";

    for (let q = 0; q < totalQuestions; q++) {
      const qObj = classQuestions[q];
      const qNum = q + 1;
      const qTitle = qObj.question;
      const realAnswerKey = qObj.correctKey;

      const studentKey = String(rData[r][6 + q] || "-").trim().toUpperCase();
      const isCorrect = (studentKey === realAnswerKey);
      if (isCorrect) correctCount++;

      const optA = qObj.options.find(o => o.key === 'A')?.text || "";
      const optB = qObj.options.find(o => o.key === 'B')?.text || "";
      const optC = qObj.options.find(o => o.key === 'C')?.text || "";

      let studentText = "Temps écoulé (Non répondu)";
      if (studentKey === 'A') studentText = `A. ${optA}`;
      else if (studentKey === 'B') studentText = `B. ${optB}`;
      else if (studentKey === 'C') studentText = `C. ${optC}`;

      let realText = "";
      if (realAnswerKey === 'A') realText = `A. ${optA}`;
      else if (realAnswerKey === 'B') realText = `B. ${optB}`;
      else if (realAnswerKey === 'C') realText = `C. ${optC}`;

      questionsCardsHtml += `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 5px solid ${isCorrect ? '#16a34a' : '#dc2626'}; border-radius: 8px; padding: 14px; margin-bottom: 14px;">
          <div style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 8px;">
            Q${qNum}. ${qTitle}
          </div>
          <div style="font-size: 13px; margin: 4px 0;">
            <span style="color: #64748b;">Votre choix :</span> 
            <strong style="color: ${isCorrect ? '#16a34a' : '#dc2626'};">${studentText}</strong> ${isCorrect ? '✅' : '❌'}
          </div>
          ${!isCorrect ? `
          <div style="font-size: 13px; margin: 4px 0;">
            <span style="color: #64748b;">Réponse correcte attendue :</span> 
            <strong style="color: #16a34a;">${realText}</strong>
          </div>` : ''}
        </div>
      `;
    }

    try {
      MailApp.sendEmail({
        to: studentEmail,
        subject: `Corrigé QCM [${studentClass}] : Note ${scoreOn10}/10 - ${studentPrenom} ${studentNom}`,
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; background: #f8fafc;">
            <div style="background-color: #0f172a; color: white; padding: 22px; text-align: center;">
              <h2 style="margin: 0; color: #38bdf8;">Corrigé Officiel & Auto-Évaluation</h2>
              <p style="margin: 6px 0 0; color: #cbd5e1;">Classe : <strong>${studentClass}</strong> | Étudiant : <strong>${studentPrenom} ${studentNom}</strong></p>
            </div>
            <div style="padding: 22px;">
              <div style="text-align: center; background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <div style="font-size: 34px; font-weight: bold; color: ${scoreOn10 >= 5 ? '#16a34a' : '#dc2626'};">
                  ${scoreOn10} / 10
                </div>
                <div style="color: #64748b; font-size: 14px; margin-top: 4px;">
                  ${correctCount} réponse(s) exacte(s) sur ${totalQuestions} (1 pt / question)
                </div>
              </div>
              ${questionsCardsHtml}
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

// ==================== STATISTIQUES DASHBOARD ADMIN (SUR 10) ====================
function getAdminStats(filterClass, targetSheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let cleanSheetName = (targetSheetName || "Reponses").replace(" (Session en cours)", "").trim();
  let rSheet = ss.getSheetByName(cleanSheetName);
  if (!rSheet) rSheet = ss.getSheetByName("Reponses");
  if (!rSheet) return null;

  const rData = rSheet.getDataRange().getDisplayValues();
  const allQuestions = getAllQuestionsByClass();
  
  filterClass = (filterClass || "ALL").trim().toUpperCase();

  let filteredRows = [];
  for (let i = 1; i < rData.length; i++) {
    if (!rData[i][1] && !rData[i][4]) continue;
    const studentClass = String(rData[i][3] || "").trim().toUpperCase();
    if (filterClass === "ALL" || studentClass === filterClass) {
      filteredRows.push(rData[i]);
    }
  }

  const isLegacyOn20 = (rData[0] && String(rData[0][5]).includes("20"));

  const studentsCount = filteredRows.length;
  const scores = filteredRows.map(r => {
    let s = parseFloat(r[5]);
    if (isNaN(s)) return null;
    if (isLegacyOn20 || s > 10) s = s / 2; // Rétrocompatibilité transparente
    return Math.round(s * 10) / 10;
  }).filter(s => s !== null);

  scores.sort((a, b) => a - b);

  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : "0.00";
  let median = "0.00";
  if (scores.length) {
    const mid = Math.floor(scores.length / 2);
    median = scores.length % 2 !== 0 ? scores[mid].toFixed(2) : (((scores[mid - 1] + scores[mid]) / 2)).toFixed(2);
  }

  let activeClass = filterClass;
  if (activeClass === "ALL") {
    if (cleanSheetName.includes("GCBAT")) activeClass = "GCBAT2";
    else if (cleanSheetName.includes("IDA")) activeClass = "IDA1";
    else if (cleanSheetName.includes("FCGE")) activeClass = "FCGE1";
    else activeClass = "GCBAT2";
  }

  const refQuestions = allQuestions[activeClass] || allQuestions["GCBAT2"] || [];
  const questionsStats = [];

  for (let q = 0; q < refQuestions.length; q++) {
    const qObj = refQuestions[q];
    const correctKey = qObj.correctKey;

    const optA = qObj.options.find(o => o.key === 'A');
    const optB = qObj.options.find(o => o.key === 'B');
    const optC = qObj.options.find(o => o.key === 'C');

    const options = [
      { key: 'A', text: optA ? optA.text : "", count: 0, students: [] },
      { key: 'B', text: optB ? optB.text : "", count: 0, students: [] },
      { key: 'C', text: optC ? optC.text : "", count: 0, students: [] }
    ];

    for (let r = 0; r < filteredRows.length; r++) {
      const studentName = `${filteredRows[r][2]} ${filteredRows[r][1]} (${filteredRows[r][3]})`;
      const ans = String(filteredRows[r][6 + q] || "").trim().toUpperCase();
      const opt = options.find(o => o.key === ans);
      if (opt) {
        opt.count++;
        opt.students.push(studentName);
      }
    }

    const correctOpt = options.find(o => o.key === correctKey);
    const correctCount = correctOpt ? correctOpt.count : 0;
    const successRate = studentsCount > 0 ? ((correctCount / studentsCount) * 100).toFixed(1) : "0.0";

    questionsStats.push({
      num: q + 1,
      title: qObj.question,
      correctKey: correctKey,
      successRate: successRate,
      correctCount: correctCount,
      options: options
    });
  }

  return {
    filterClass: filterClass,
    activeClass: activeClass,
    targetSheet: cleanSheetName,
    studentsCount: studentsCount,
    average: avg,
    median: median,
    max: scores.length ? Math.max(...scores) : 0,
    min: scores.length ? Math.min(...scores) : 0,
    questions: questionsStats
  };
}