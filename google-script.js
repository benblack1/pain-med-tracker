/**
 * Shared Pain Medication Tracker - Google Apps Script Backend
 * Supports:
 * - Multi-user tracking with dynamic profiles
 * - Shared configuration and dosages per user
 * - Round management (archive/clear without deleting history)
 * - Caregiver logging ("Logged By")
 * - ntfy.sh push notification scheduling
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = ensureSheets(ss);
    const logsSheet = sheets.logs;
    const settingsSheet = sheets.settings;

    const action = (e && e.parameter && e.parameter.action) || 'read';
    const user = (e && e.parameter && e.parameter.user) ? e.parameter.user.trim() : 'Ben';

    // 1. ADD DOSE
    if (action === 'add') {
      const med = e.parameter.med || 'Unknown';
      const dose = Number(e.parameter.dose) || (med === 'Ibuprofen' ? 400 : 500);
      const loggedBy = e.parameter.loggedBy || user;
      const round = Number(e.parameter.round) || 1;
      
      let timestamp = Date.now();
      if (e.parameter.passedTime) {
        const parsed = Number(e.parameter.passedTime);
        if (!isNaN(parsed) && parsed > 0) {
          timestamp = parsed;
        }
      }
      
      const readableDate = new Date(timestamp).toLocaleString();
      // Row schema: [Timestamp, ReadableDate, User, Medication, DoseMg, LoggedBy, Round]
      logsSheet.appendRow([timestamp, readableDate, user, med, dose, loggedBy, round]);

      // Schedule ntfy notification if enabled
      scheduleNtfy(ss, user, med, timestamp);
    } 
    // 2. UNDO DOSE
    else if (action === 'undo') {
      const targetUser = e.parameter.user || user;
      const targetRound = e.parameter.round ? Number(e.parameter.round) : null;
      deleteLastLog(logsSheet, targetUser, targetRound);
    }
    // 3. SAVE SETTINGS
    else if (action === 'saveSettings') {
      const userSettings = {
        user: user,
        doseIbu: Number(e.parameter.doseIbu) || 400,
        doseAceta: Number(e.parameter.doseAceta) || 500,
        limitIbu: Number(e.parameter.limitIbu) || 2400,
        limitAceta: Number(e.parameter.limitAceta) || 3000,
        intervalHours: Number(e.parameter.intervalHours) || 4,
        ntfyEnabled: e.parameter.ntfyEnabled === 'true' || e.parameter.ntfyEnabled === true,
        ntfyTopic: (e.parameter.ntfyTopic || '').trim(),
        activeRound: Number(e.parameter.activeRound) || 1
      };
      saveUserSettings(settingsSheet, userSettings);
    }
    // 4. RESET ROUND (Start New Round)
    else if (action === 'resetRound') {
      const current = getUserSettings(settingsSheet, user);
      current.activeRound = (current.activeRound || 1) + 1;
      saveUserSettings(settingsSheet, current);
    }
    // 5. TEST NTFY NOTIFICATION
    else if (action === 'testNtfy') {
      const topic = (e.parameter.ntfyTopic || '').trim();
      if (topic) {
        sendNtfyDirect(topic, 'Test notification from Pain Med Sync! Alerts are working.', 'Pain Med Sync Test');
      }
    }

    // Return unified application state (Logs, Settings, Users)
    const allSettings = getAllSettings(settingsSheet);
    const usersList = Object.keys(allSettings);
    if (!usersList.includes(user)) {
      usersList.push(user);
    }

    const logs = getLogs(logsSheet);

    const payload = {
      success: true,
      logs: logs,
      settings: allSettings,
      users: usersList
    };

    return ContentService.createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Ensures 'Logs' and 'Settings' sheets exist.
 * Seamlessly migrates legacy 'Sheet1' data if present.
 */
function ensureSheets(ss) {
  let logs = ss.getSheetByName('Logs');
  let settings = ss.getSheetByName('Settings');
  const legacy = ss.getSheetByName('Sheet1');

  // If Logs doesn't exist, check if legacy Sheet1 exists
  if (!logs) {
    if (legacy) {
      legacy.setName('Logs');
      logs = legacy;
    } else {
      logs = ss.insertSheet('Logs');
      logs.appendRow(['Timestamp', 'ReadableDate', 'User', 'Medication', 'DoseMg', 'LoggedBy', 'Round']);
    }
  }

  // Ensure header on Logs if empty
  if (logs.getLastRow() === 0) {
    logs.appendRow(['Timestamp', 'ReadableDate', 'User', 'Medication', 'DoseMg', 'LoggedBy', 'Round']);
  }

  // Ensure Settings sheet exists
  if (!settings) {
    settings = ss.insertSheet('Settings');
    settings.appendRow(['User', 'DoseIbu', 'DoseAceta', 'LimitIbu', 'LimitAceta', 'IntervalHours', 'NtfyEnabled', 'NtfyTopic', 'ActiveRound']);
    
    // Seed default profiles
    saveUserSettings(settings, {
      user: 'Ben',
      doseIbu: 400,
      doseAceta: 500,
      limitIbu: 2400,
      limitAceta: 3000,
      intervalHours: 4,
      ntfyEnabled: false,
      ntfyTopic: 'painmed-ben-' + Math.floor(1000 + Math.random() * 9000),
      activeRound: 1
    });

    saveUserSettings(settings, {
      user: 'Wife',
      doseIbu: 600,
      doseAceta: 1000,
      limitIbu: 3200,
      limitAceta: 4000,
      intervalHours: 4,
      ntfyEnabled: false,
      ntfyTopic: 'painmed-wife-' + Math.floor(1000 + Math.random() * 9000),
      activeRound: 1
    });
  }

  return { logs: logs, settings: settings };
}

/**
 * Parse logs with backward compatibility for old 3-column rows [date, med, timestamp]
 */
function getLogs(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const data = sheet.getDataRange().getValues();
  const header = data[0];
  const isModern = header[0] === 'Timestamp' && header.length >= 7;

  const rows = data.slice(1);
  const parsed = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[0]) continue;

    if (isModern) {
      parsed.push({
        time: Number(row[0]),
        readable: row[1],
        user: String(row[2] || 'Ben'),
        med: String(row[3] || 'Ibuprofen'),
        dose: Number(row[4]) || 400,
        loggedBy: String(row[5] || row[2] || 'Ben'),
        round: Number(row[6]) || 1
      });
    } else {
      // Legacy Sheet1 format: [readableDate, med, timestamp]
      const timeVal = Number(row[2]) || new Date(row[0]).getTime() || Date.now();
      const medVal = String(row[1] || 'Ibuprofen');
      parsed.push({
        time: timeVal,
        readable: String(row[0]),
        user: 'Ben',
        med: medVal,
        dose: medVal === 'Ibuprofen' ? 400 : 500,
        loggedBy: 'Ben',
        round: 1
      });
    }
  }

  // Return most recent first, max 200 items for snappy mobile responses
  return parsed.reverse().slice(0, 200);
}

/**
 * Delete the latest log matching user and round
 */
function deleteLastLog(sheet, targetUser, targetRound) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const rowUser = String(row[2] || 'Ben');
    const rowRound = Number(row[6]) || 1;

    if (rowUser === targetUser && (targetRound === null || rowRound === targetRound)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
}

/**
 * Get all user settings as a dictionary
 */
function getAllSettings(settingsSheet) {
  const data = settingsSheet.getDataRange().getValues();
  const settings = {};

  if (data.length <= 1) return settings;

  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const userName = String(r[0]).trim();
    if (!userName) continue;

    settings[userName] = {
      user: userName,
      doseIbu: Number(r[1]) || 400,
      doseAceta: Number(r[2]) || 500,
      limitIbu: Number(r[3]) || 2400,
      limitAceta: Number(r[4]) || 3000,
      intervalHours: Number(r[5]) || 4,
      ntfyEnabled: r[6] === true || r[6] === 'true',
      ntfyTopic: String(r[7] || ''),
      activeRound: Number(r[8]) || 1
    };
  }

  return settings;
}

/**
 * Get or create setting for a specific user
 */
function getUserSettings(settingsSheet, user) {
  const all = getAllSettings(settingsSheet);
  if (all[user]) return all[user];

  return {
    user: user,
    doseIbu: 400,
    doseAceta: 500,
    limitIbu: 2400,
    limitAceta: 3000,
    intervalHours: 4,
    ntfyEnabled: false,
    ntfyTopic: 'painmed-' + user.toLowerCase() + '-' + Math.floor(1000 + Math.random() * 9000),
    activeRound: 1
  };
}

/**
 * Upsert user settings into Settings sheet
 */
function saveUserSettings(settingsSheet, s) {
  const data = settingsSheet.getDataRange().getValues();
  let rowIdx = -1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === s.user.trim().toLowerCase()) {
      rowIdx = i + 1;
      break;
    }
  }

  const rowValues = [
    s.user,
    s.doseIbu,
    s.doseAceta,
    s.limitIbu,
    s.limitAceta,
    s.intervalHours,
    s.ntfyEnabled,
    s.ntfyTopic,
    s.activeRound
  ];

  if (rowIdx > 0) {
    settingsSheet.getRange(rowIdx, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    settingsSheet.appendRow(rowValues);
  }
}

/**
 * Send an immediate notification via ntfy.sh
 */
function sendNtfyDirect(topic, message, title) {
  try {
    const url = 'https://ntfy.sh/' + encodeURIComponent(topic);
    UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Title': title || 'Pain Med Tracker',
        'Tags': 'pill,bell',
        'Priority': 'default'
      },
      payload: message,
      muteHttpExceptions: true
    });
  } catch (err) {
    Logger.log('ntfy error: ' + err);
  }
}

/**
 * Schedules a delayed ntfy.sh notification for the next dose using ntfy's native Delay header
 */
function scheduleNtfy(ss, user, lastMed, lastDoseTime) {
  try {
    const settingsSheet = ss.getSheetByName('Settings');
    if (!settingsSheet) return;
    
    const settings = getUserSettings(settingsSheet, user);
    if (!settings.ntfyEnabled || !settings.ntfyTopic) return;

    const intervalHours = Number(settings.intervalHours) || 4;
    const nextMed = lastMed === 'Ibuprofen' ? 'Acetaminophen' : 'Ibuprofen';
    const nextDose = nextMed === 'Ibuprofen' ? settings.doseIbu : settings.doseAceta;
    
    // Calculate delay in seconds
    const nextTime = lastDoseTime + (intervalHours * 3600 * 1000);
    const delaySec = Math.round((nextTime - Date.now()) / 1000);

    // Only schedule if it's in the future (minimum 10 seconds per ntfy spec)
    if (delaySec < 10) return;

    const url = 'https://ntfy.sh/' + encodeURIComponent(settings.ntfyTopic);
    const bodyMessage = user + ' is eligible for ' + nextMed + ' (' + nextDose + 'mg).';

    UrlFetchApp.fetch(url, {
      method: 'post',
      headers: {
        'Title': 'Pain Med Due: ' + nextMed + ' (' + user + ')',
        'Tags': 'pill,alarm_clock',
        'Delay': delaySec.toString(),
        'Priority': 'high'
      },
      payload: bodyMessage,
      muteHttpExceptions: true
    });

  } catch (err) {
    Logger.log('Schedule ntfy error: ' + err);
  }
}
