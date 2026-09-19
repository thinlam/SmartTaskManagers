/**
 * 01_Utils.gs
 * -----------------------------------------------------------------------
 * Shared helpers. Everything here batches reads/writes - never loop
 * getRange().setValue() cell by cell.
 * -----------------------------------------------------------------------
 */

function ss_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet_(name) {
  const spreadsheet = ss_();
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  const range = sheet.getRange(1, 1, 1, headers.length);
  const current = sheet.getLastColumn() > 0
    ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0]
    : [];

  const matches = headers.every((h, i) => current[i] === h);
  if (!matches) {
    range.setValues([headers]);
  }
  sheet.setFrozenRows(1);
  range.setFontWeight('bold')
    .setBackground(COLORS.surface2)
    .setFontColor(COLORS.text);
}

function readTable_(sheetName, headers) {
  const sheet = getOrCreateSheet_(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(function (row) {
    const obj = {};
    headers.forEach(function (h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function writeTableRows_(sheetName, rows) {
  const sheet = getOrCreateSheet_(sheetName);
  const lastRow = sheet.getLastRow();
  const width = rows.length > 0 ? rows[0].length : sheet.getLastColumn();

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, width).setValues(rows);
  }
}

function appendRow_(sheetName, rowArray) {
  const sheet = getOrCreateSheet_(sheetName);
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, rowArray.length).setValues([rowArray]);
}

function generateNextId_(sheetName, idHeader, headers, prefix) {
  const idColIndex = headers.indexOf(idHeader);
  const sheet = getOrCreateSheet_(sheetName);
  const lastRow = sheet.getLastRow();

  let maxN = 0;
  if (lastRow >= 2) {
    const ids = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues();
    ids.forEach(function (r) {
      const v = String(r[0] || '');
      if (v.indexOf(prefix) === 0) {
        const n = parseInt(v.substring(prefix.length), 10);
        if (!isNaN(n) && n > maxN) maxN = n;
      }
    });
  }
  const next = maxN + 1;
  return prefix + String(next).padStart(ID_PAD_LENGTH, '0');
}

function objectToRow_(obj, headers) {
  return headers.map(function (h) { return (obj[h] !== undefined && obj[h] !== null) ? obj[h] : ''; });
}

function now_() {
  return new Date();
}

function logActivity_(entityType, entityId, action, oldValue, newValue) {
  appendRow_(SHEETS.ACTIVITY_LOG, [
    now_(), entityType, entityId, action,
    oldValue === undefined ? '' : oldValue,
    newValue === undefined ? '' : newValue
  ]);
}

function toast_(message, title) {
  try { ss_().toast(message, title || 'Smart Task', 4); } catch (e) { /* no UI context, ignore */ }
}

function getSetting_(key, fallback) {
  const rows = readTable_(SHEETS.SETTINGS, ['Key', 'Value', 'Category']);
  const row = rows.find(function (r) { return r.Key === key; });
  return row ? row.Value : fallback;
}

function findRowByEntityId_(sheetName, headers, idHeader, idValue) {
  const sheet = getOrCreateSheet_(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const idColIndex = headers.indexOf(idHeader);
  const ids = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === idValue) return i + 2;
  }
  return -1;
}