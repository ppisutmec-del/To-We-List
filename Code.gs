const SHEET_NAME = 'tasks';

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['id','title','category','priority','owner','done','note','subtasks','created','dueTime']);
  }
  const data = sheet.getDataRange().getValues();
  const [headers, ...rows] = data;
  const tasks = rows.map(r => ({
    id: r[0], title: r[1], category: r[2], priority: r[3],
    owner: r[4], done: r[5] === 'TRUE' || r[5] === true,
    note: r[6] || '', subtasks: safeJson(r[7]), created: r[8] || '', dueTime: r[9] || ''
  }));
  return jsonResponse({ ok: true, tasks });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['id','title','category','priority','owner','done','note','subtasks','created','dueTime']);
    }
    
    // Safety: ensure sheet has at least 10 columns to prevent OUT_OF_BOUNDS errors
    if (sheet.getMaxColumns() < 10) {
      sheet.insertColumnsAfter(sheet.getMaxColumns(), 10 - sheet.getMaxColumns());
    }

    if (body.action === 'save_all') {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
      
      // Update header row (helps visual inspection in Google Sheets)
      sheet.getRange(1, 1, 1, 10).setValues([['id','title','category','priority','owner','done','note','subtasks','created','dueTime']]);

      const rows = body.tasks.map(t => [
        t.id, t.title, t.category, t.priority, t.owner,
        t.done ? 'TRUE' : 'FALSE', t.note || '',
        JSON.stringify(t.subtasks || []), t.created || '', t.dueTime || ''
      ]);
      
      if (rows.length) sheet.getRange(2, 1, rows.length, 10).setValues(rows);
      return jsonResponse({ ok: true, saved: rows.length });
    }
    return jsonResponse({ ok: false, error: 'unknown action' });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function safeJson(val) {
  try { return JSON.parse(val || '[]'); } catch { return []; }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}