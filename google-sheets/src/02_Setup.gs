/**
 * 02_Setup.gs
 */

function setupSmartTask() {
  setupDataSheets_();
  setupListsSheet_();
  setupSettingsSheet_();
  setupTaskValidation_();
  setupProjectValidation_();
  setupGoalValidation_();
  setupHabitValidation_();
  setupTaskFormatting_();
  setupTasksFilter_();
  setupViewSheetPlaceholders_();
  orderSheetTabs_();
  ensureDailyRecalcTrigger_();
  refreshAll_();
  toast_('Workspace is set up and ready.', 'Smart Task');
}

function setupDataSheets_() {
  ensureHeaders_(getOrCreateSheet_(SHEETS.TASKS), TASK_HEADERS);
  ensureHeaders_(getOrCreateSheet_(SHEETS.PROJECTS), PROJECT_HEADERS);
  ensureHeaders_(getOrCreateSheet_(SHEETS.GOALS), GOAL_HEADERS);
  ensureHeaders_(getOrCreateSheet_(SHEETS.HABITS), HABIT_HEADERS);
  ensureHeaders_(getOrCreateSheet_(SHEETS.ACTIVITY_LOG), ACTIVITY_LOG_HEADERS);

  const tasksSheet = getOrCreateSheet_(SHEETS.TASKS);
  tasksSheet.setColumnWidth(TASK_HEADERS.indexOf('TaskName') + 1, 260);
  tasksSheet.setColumnWidth(TASK_HEADERS.indexOf('Description') + 1, 260);
  tasksSheet.setColumnWidth(TASK_HEADERS.indexOf('Notes') + 1, 220);
}

function setupListsSheet_() {
  const sheet = getOrCreateSheet_(SHEETS.LISTS);
  const listNames = Object.keys(LOOKUP_LISTS);

  sheet.getRange(1, 1, 1, listNames.length).setValues([listNames])
    .setFontWeight('bold').setBackground(COLORS.surface2).setFontColor(COLORS.text);
  sheet.setFrozenRows(1);

  const maxLen = listNames.reduce(function (m, name) { return Math.max(m, LOOKUP_LISTS[name].length); }, 0);
  const grid = [];
  for (let r = 0; r < maxLen; r++) {
    grid.push(listNames.map(function (name) { return LOOKUP_LISTS[name][r] || ''; }));
  }
  if (grid.length > 0) {
    sheet.getRange(2, 1, grid.length, listNames.length).setValues(grid);
  }
}

function setupSettingsSheet_() {
  const sheet = getOrCreateSheet_(SHEETS.SETTINGS);
  const headers = ['Key', 'Value', 'Category'];
  ensureHeaders_(sheet, headers);

  if (sheet.getLastRow() < 2) {
    sheet.getRange(2, 1, DEFAULT_SETTINGS.length, 3).setValues(DEFAULT_SETTINGS);
  } else {
    const existing = readTable_(SHEETS.SETTINGS, headers).map(function (r) { return r.Key; });
    const missing = DEFAULT_SETTINGS.filter(function (row) { return existing.indexOf(row[0]) === -1; });
    missing.forEach(function (row) { appendRow_(SHEETS.SETTINGS, row); });
  }
  sheet.setColumnWidth(2, 220);
}

function setupTaskValidation_() {
  const sheet = getOrCreateSheet_(SHEETS.TASKS);
  const maxRows = Math.max(sheet.getMaxRows() - 1, 500);

  applyListValidation_(sheet, TASK_HEADERS.indexOf('Area') + 1, maxRows, LOOKUP_LISTS.Area);
  applyListValidation_(sheet, TASK_HEADERS.indexOf('Priority') + 1, maxRows, LOOKUP_LISTS.Priority);
  applyListValidation_(sheet, TASK_HEADERS.indexOf('Status') + 1, maxRows, LOOKUP_LISTS.Status);
  applyListValidation_(sheet, TASK_HEADERS.indexOf('Energy') + 1, maxRows, LOOKUP_LISTS.Energy);
  applyListValidation_(sheet, TASK_HEADERS.indexOf('Context') + 1, maxRows, LOOKUP_LISTS.Context);
  applyListValidation_(sheet, TASK_HEADERS.indexOf('RecurringType') + 1, maxRows, LOOKUP_LISTS.RecurringType);

  const progressCol = TASK_HEADERS.indexOf('Progress') + 1;
  const progressRule = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(0, 100).setAllowInvalid(false)
    .setHelpText('Progress must be a number from 0 to 100.').build();
  sheet.getRange(2, progressCol, maxRows, 1).setDataValidation(progressRule);
}

function setupProjectValidation_() {
  const sheet = getOrCreateSheet_(SHEETS.PROJECTS);
  const maxRows = Math.max(sheet.getMaxRows() - 1, 200);
  applyListValidation_(sheet, PROJECT_HEADERS.indexOf('Area') + 1, maxRows, LOOKUP_LISTS.Area);
  applyListValidation_(sheet, PROJECT_HEADERS.indexOf('Health') + 1, maxRows, LOOKUP_LISTS.ProjectHealth);
}

function setupGoalValidation_() {
  const sheet = getOrCreateSheet_(SHEETS.GOALS);
  const maxRows = Math.max(sheet.getMaxRows() - 1, 200);
  applyListValidation_(sheet, GOAL_HEADERS.indexOf('Area') + 1, maxRows, LOOKUP_LISTS.Area);
  applyListValidation_(sheet, GOAL_HEADERS.indexOf('Status') + 1, maxRows, LOOKUP_LISTS.GoalStatus);
}

function setupHabitValidation_() {
  const sheet = getOrCreateSheet_(SHEETS.HABITS);
  const maxRows = Math.max(sheet.getMaxRows() - 1, 200);
  applyListValidation_(sheet, HABIT_HEADERS.indexOf('Frequency') + 1, maxRows, LOOKUP_LISTS.HabitFrequency);
}

function applyListValidation_(sheet, colIndex1Based, numRows, values) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, colIndex1Based, numRows, 1).setDataValidation(rule);
}

function setupTaskFormatting_() {
  const sheet = getOrCreateSheet_(SHEETS.TASKS);
  const lastRow = Math.max(sheet.getMaxRows(), 1000);

  const statusRange = sheet.getRange(2, TASK_HEADERS.indexOf('Status') + 1, lastRow, 1);
  const priorityRange = sheet.getRange(2, TASK_HEADERS.indexOf('Priority') + 1, lastRow, 1);
  const riskRange = sheet.getRange(2, TASK_HEADERS.indexOf('Risk') + 1, lastRow, 1);
  const dueDateRange = sheet.getRange(2, TASK_HEADERS.indexOf('DueDate') + 1, lastRow, 1);
  const statusColLetter = columnToLetter_(TASK_HEADERS.indexOf('Status') + 1);
  const dueDateColLetter = columnToLetter_(TASK_HEADERS.indexOf('DueDate') + 1);

  const statusColors = {
    'Inbox': ['#F1F5F9', '#64748B'],
    'To Do': ['#F1F5F9', '#475569'],
    'In Progress': ['#DBEAFE', '#1D4ED8'],
    'Waiting': ['#FEF3C7', '#B45309'],
    'Completed': ['#DCFCE7', '#15803D']
  };
  const priorityColors = {
    'Critical': ['#FEE2E2', '#B91C1C'],
    'Urgent': ['#FFEDD5', '#C2410C'],
    'High': ['#FEF3C7', '#B45309'],
    'Medium': ['#DBEAFE', '#1D4ED8'],
    'Low': ['#F1F5F9', '#475569']
  };
  const riskColors = {
    'Low': ['#DCFCE7', '#15803D'],
    'Medium': ['#FEF3C7', '#B45309'],
    'High': ['#FFEDD5', '#C2410C'],
    'Critical': ['#FEE2E2', '#B91C1C']
  };

  const rules = [];
  Object.keys(statusColors).forEach(function (val) {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(val).setBackground(statusColors[val][0]).setFontColor(statusColors[val][1])
      .setRanges([statusRange]).build());
  });
  Object.keys(priorityColors).forEach(function (val) {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(val).setBackground(priorityColors[val][0]).setFontColor(priorityColors[val][1])
      .setRanges([priorityRange]).build());
  });
  Object.keys(riskColors).forEach(function (val) {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(val).setBackground(riskColors[val][0]).setFontColor(riskColors[val][1])
      .setRanges([riskRange]).build());
  });

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($' + dueDateColLetter + '2<TODAY(),$' + dueDateColLetter + '2<>"",$' + statusColLetter + '2<>"Completed")')
    .setBackground(COLORS.danger).setFontColor('#FFFFFF').setBold(true)
    .setRanges([dueDateRange]).build());

  sheet.setConditionalFormatRules(rules);
}

function setupViewSheetPlaceholders_() {
  VIEW_SHEETS.forEach(function (name) {
    getOrCreateSheet_(name);
  });
}

function orderSheetTabs_() {
  const order = [
    SHEETS.DASHBOARD, SHEETS.TODAY, SHEETS.TASKS,
    SHEETS.PROJECTS, SHEETS.CALENDAR, SHEETS.KANBAN, SHEETS.TIMELINE,
    SHEETS.GOALS, SHEETS.HABITS, SHEETS.REPORTS,
    SHEETS.SETTINGS, SHEETS.LISTS, SHEETS.ACTIVITY_LOG
  ];
  const spreadsheet = ss_();
  order.forEach(function (name, i) {
    const sheet = spreadsheet.getSheetByName(name);
    if (sheet) {
      spreadsheet.setActiveSheet(sheet);
      spreadsheet.moveActiveSheet(i + 1);
    }
  });
}

function columnToLetter_(column) {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}