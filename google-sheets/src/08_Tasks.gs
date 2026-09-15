/**
 * 08_Tasks.gs
 * -----------------------------------------------------------------------
 * The Tasks sheet (Frame 05) IS the Tasks table itself - the same
 * spreadsheet range CRUD in 03_Data.gs reads and writes. There is no
 * separate "view" copy of the data (Single Source of Truth).
 *
 * What this file adds on top of the raw table, without ever touching its
 * columns A:AA:
 *   - setupTasksFilter_()  turns on Google Sheets' native column filter
 *     (dropdown arrows on every header) so Area/Project/Status/Priority/
 *     Date/SmartScore filtering and sorting all come from the platform
 *     itself, not a reimplementation.
 *   - renderTaskSummary_() writes small All/Inbox/Active/Completed/
 *     Overdue counters in a block to the right of the table (columns
 *     AD:AH), matching the tab counts in Frame 05.
 * -----------------------------------------------------------------------
 */

const TASK_SUMMARY_START_COL = 30;

function setupTasksFilter_() {
  const sheet = getOrCreateSheet_(SHEETS.TASKS);
  const existing = sheet.getFilter();
  if (existing) existing.remove();

  const lastRow = Math.max(sheet.getLastRow(), 1);
  sheet.getRange(1, 1, lastRow, TASK_HEADERS.length).createFilter();
}

function computeTaskCounts_(tasks) {
  const today = stripTime_(now_());
  const inbox = tasks.filter(function (t) { return t.Status === 'Inbox'; }).length;
  const completed = tasks.filter(function (t) { return t.Status === 'Completed'; }).length;
  const overdue = tasks.filter(function (t) {
    if (t.Status === 'Completed') return false;
    const d = daysBetween_(today, t.DueDate);
    return d !== null && d < 0;
  }).length;
  const active = tasks.length - inbox - completed;

  return { all: tasks.length, inbox: inbox, active: active, completed: completed, overdue: overdue };
}

function renderTaskSummary_() {
  const sheet = getOrCreateSheet_(SHEETS.TASKS);
  const counts = computeTaskCounts_(getAllTasks_());
  const col = TASK_SUMMARY_START_COL;

  sheet.getRange(1, col, 3, 5).clearContent().clearFormat();

  sheet.getRange(1, col, 1, 5).merge()
    .setValue('TASK SUMMARY').setFontSize(12).setFontWeight('bold').setFontColor(COLORS.text);

  const labels = ['ALL', 'INBOX', 'ACTIVE', 'COMPLETED', 'OVERDUE'];
  const values = [counts.all, counts.inbox, counts.active, counts.completed, counts.overdue];

  sheet.getRange(2, col, 1, 5).setValues([labels])
    .setFontSize(10).setFontWeight('bold').setFontColor(COLORS.text2).setBackground(COLORS.surface2);

  sheet.getRange(3, col, 1, 5).setValues([values])
    .setFontSize(16).setFontWeight('bold').setFontColor(COLORS.text);

  if (counts.overdue > 0) {
    sheet.getRange(3, col + 4).setFontColor(COLORS.danger);
  }

  sheet.getRange(1, col, 3, 5)
    .setBorder(true, true, true, true, false, false, COLORS.border, SpreadsheetApp.BorderStyle.SOLID);
  sheet.autoResizeColumns(col, 5);
}