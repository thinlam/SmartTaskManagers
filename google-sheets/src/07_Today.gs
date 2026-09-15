/**
 * 07_Today.gs
 * -----------------------------------------------------------------------
 * Renders the Today sheet (Frame 04). Pure view layer over Tasks - same
 * rule as Dashboard: read-only, never writes back, always safe to redraw.
 * -----------------------------------------------------------------------
 */

function renderToday_() {
  const sheet = getOrCreateSheet_(SHEETS.TODAY);
  sheet.clear();
  sheet.setHiddenGridlines(true);

  const data = computeTodayData_();

  let row = writeTodayHeader_(sheet, data);
  row = writeBestNextAction_(sheet, data, row + 1);
  row = writeTodaySection_(sheet, 'DO NOW', data.doNow, row + 2);
  row = writeTodaySection_(sheet, 'SCHEDULED', data.scheduled, row + 2);
  row = writeTodaySection_(sheet, 'QUICK WINS', data.quickWins, row + 2);
  writeEndOfDayReview_(sheet, data, row + 2);

  sheet.autoResizeColumns(1, 6);
}

function computeTodayData_() {
  const allTasks = getAllTasks_();
  const today = stripTime_(now_());

  const openTasks = allTasks.filter(function (t) { return t.Status !== 'Completed'; });
  const todayTasks = openTasks.filter(function (t) { return sameDay_(t.DueDate, today); });
  const overdueTasks = openTasks.filter(function (t) {
    const d = daysBetween_(today, t.DueDate);
    return d !== null && d < 0;
  });

  const urgentPool = todayTasks.concat(overdueTasks);
  const doNow = uniqueByTaskId_(urgentPool)
    .filter(function (t) {
      const d = daysBetween_(today, t.DueDate);
      const isOverdue = d !== null && d < 0;
      const isDueToday = d === 0;
      return (isOverdue || isDueToday) && t.Status !== 'Waiting';
    })
    .sort(byScoreDesc_)
    .slice(0, 4);
  const doNowIds = doNow.map(function (t) { return t.TaskId; });

  const scheduled = todayTasks
    .filter(function (t) { return t.DueTime && doNowIds.indexOf(t.TaskId) === -1; })
    .sort(function (a, b) { return String(a.DueTime).localeCompare(String(b.DueTime)); });
  const scheduledIds = scheduled.map(function (t) { return t.TaskId; });

  const quickWins = openTasks
    .filter(function (t) {
      const m = Number(t.EstimateMinutes) || 0;
      return m > 0 && m <= 15 && doNowIds.indexOf(t.TaskId) === -1 && scheduledIds.indexOf(t.TaskId) === -1;
    })
    .sort(byScoreDesc_)
    .slice(0, 4);

  const bestNext = urgentPool.slice().sort(byScoreDesc_)[0] || openTasks.slice().sort(byScoreDesc_)[0] || null;

  const focusMinutes = todayTasks.reduce(function (sum, t) { return sum + (Number(t.EstimateMinutes) || 0); }, 0);
  const completedToday = allTasks.filter(function (t) { return t.Status === 'Completed' && sameDay_(t.CompletedDate, today); });

  return {
    today: today,
    todayTasks: todayTasks,
    doNow: doNow,
    scheduled: scheduled,
    quickWins: quickWins,
    bestNext: bestNext,
    focusMinutes: focusMinutes,
    completedToday: completedToday
  };
}

function writeTodayHeader_(sheet, data) {
  sheet.getRange(1, 1, 1, 6).merge().setValue('Today')
    .setFontSize(28).setFontWeight('bold').setFontColor(COLORS.text);

  const dateLabel = Utilities.formatDate(data.today, Session.getScriptTimeZone() || 'Etc/UTC', 'EEEE, MMMM d, yyyy');
  sheet.getRange(2, 1, 1, 6).merge().setValue(dateLabel)
    .setFontSize(14).setFontWeight('bold').setFontColor(COLORS.primary);

  const blockCount = data.doNow.length + data.scheduled.length;
  const summary = data.todayTasks.length + ' task(s) - ' + formatMinutes_(data.focusMinutes) +
    ' focus - ' + blockCount + ' scheduled block(s)';
  sheet.getRange(3, 1, 1, 6).merge().setValue(summary).setFontSize(12).setFontColor(COLORS.text2);

  return 3;
}

function writeBestNextAction_(sheet, data, startRow) {
  const range = sheet.getRange(startRow, 1, 1, 6).merge();
  if (!data.bestNext) {
    range.setValue('No open tasks right now.').setBackground(COLORS.surface2).setFontColor(COLORS.text2);
    return startRow;
  }
  const label = 'Best next action: ' + data.bestNext.TaskName + ' (' + formatMinutes_(Number(data.bestNext.EstimateMinutes) || 0) +
    ', Score ' + data.bestNext.SmartScore + ')';
  range.setValue(label)
    .setBackground(COLORS.primaryLight).setFontColor(COLORS.primaryHover).setFontWeight('bold')
    .setBorder(true, true, true, true, false, false, COLORS.primary, SpreadsheetApp.BorderStyle.SOLID);
  return startRow;
}

function writeTodaySection_(sheet, title, taskList, startRow) {
  sheet.getRange(startRow, 1).setValue(title + ' (' + taskList.length + ')')
    .setFontSize(14).setFontWeight('bold').setFontColor(COLORS.text);

  if (taskList.length === 0) {
    sheet.getRange(startRow + 1, 1).setValue('Nothing here.').setFontColor(COLORS.text2);
    return startRow + 1;
  }

  const headers = ['TASK', 'AREA', 'TIME / ESTIMATE', 'SCORE', 'ACTION'];
  sheet.getRange(startRow + 1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setFontSize(11).setFontColor(COLORS.text2).setBackground(COLORS.surface2);

  const rows = taskList.map(function (t) {
    const timeOrEstimate = t.DueTime ? String(t.DueTime) : formatMinutes_(Number(t.EstimateMinutes) || 0);
    return [t.TaskName, t.Area || '-', timeOrEstimate, t.SmartScore, t.RecommendedAction];
  });
  sheet.getRange(startRow + 2, 1, rows.length, headers.length).setValues(rows);

  return startRow + 1 + rows.length;
}

function writeEndOfDayReview_(sheet, data, startRow) {
  sheet.getRange(startRow, 1).setValue('END-OF-DAY REVIEW')
    .setFontSize(14).setFontWeight('bold').setFontColor(COLORS.text);
  sheet.getRange(startRow + 1, 1).setValue(
    'Completed today: ' + data.completedToday.length + ' / ' + data.todayTasks.length + ' planned'
  ).setFontColor(COLORS.text2);
}

function byScoreDesc_(a, b) {
  return (Number(b.SmartScore) || 0) - (Number(a.SmartScore) || 0);
}

function uniqueByTaskId_(tasks) {
  const seen = {};
  return tasks.filter(function (t) {
    if (seen[t.TaskId]) return false;
    seen[t.TaskId] = true;
    return true;
  });
}