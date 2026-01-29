function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  const action = e.parameter.action;
  
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    if (action === 'add') {
      const med = e.parameter.med;
      
      // SAFETIY CHECK: Only use passedTime if it's a valid number
      let timestamp = new Date().getTime(); // Default to now
      if (e.parameter.passedTime) {
        const parsed = Number(e.parameter.passedTime);
        if (!isNaN(parsed)) {
          timestamp = parsed;
        }
      }
      
      const readableDate = new Date(timestamp).toLocaleString();
      sheet.appendRow([readableDate, med, timestamp]);
    } 
    else if (action === 'undo') {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) { 
        sheet.deleteRow(lastRow);
      }
    }

    // Return the latest 50 rows
    const data = sheet.getDataRange().getValues();
    const logs = data.slice(1).map(row => ({
      time: row[2], 
      med: row[1]
    })).reverse().slice(0, 50);

    return ContentService.createTextOutput(JSON.stringify(logs))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // If an error happens, return it as JSON instead of crashing (avoids CORS error)
    return ContentService.createTextOutput(JSON.stringify({error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
