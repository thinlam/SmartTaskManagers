/**
 * 06_Dashboard.gs
 * -----------------------------------------------------------------------
 * Renders the Dashboard sheet (Frame 03). Pure view layer: reads Tasks/
 * Habits, never writes back to them, never keeps its own copy of task
 * data. Call renderDashboard_() any time to redraw from current data.
 * -----------------------------------------------------------------------
 */

const DASHBOARD_LAYOUT = {
  titleRow: 1,
  subtitleRow: 2,
  kpiLabelRow: 4,
  kpiValueRow: 5,
  kpiSubRow: 6,
  focusNowHeaderRow: 8,
  focusNowTableHeaderRow: 9,
  focusNowFirstDataRow: 10,
  focusNowMaxRows: 5,
  kpiCols: [
    { start: 1, end: 2 },
    { start: 3, end: 4 },
    { start: 5, end: 6 },
    { start: 7, end: 8 },
    { start: 9, end: 10 }
  ]
};

function renderDashboard_() {
  const sheet = getOrCreateSheet_(SHEETS.DASHBOARD);
  sheet.clear();
  sheet.setHiddenGridlines(true);

  const data = computeDashboardData_();

  writeDashboardHeader_(sheet);
  writeKpiCards_(sheet, data.kpis);
  const afterFocusNow = writeFocusNowSection_(sheet, data.focusNow);
  const afterAreas = writeMyAreasSection_(sheet, data.areas, afterFocusNow + 1);
  writeSmartInsightsSection_(sheet, data.insights, afterAreas + 1);

  sheet.autoResizeColumns(1, 10);
}

function computeDashboardData_() {
  const tasks = getAllTasks_();
  const today = stripTime_(now_());
  const week = getWeekRange_(today);
  const dueSoonDays = Number(getSetting_('DueSoonDays', 2)) || 2;
  const dailyFocusLimitHours = Number(getSetting_('DailyFocusLimitHours', 4)) || 4;

  const openTasks = tasks.filter(function (t) { return t.Status !== 'Completed'; });

  const todayTasks = openTasks.filter(function (t) {
    return sameDay_(t.DueDate, today);
  });
  const overdueTasks = openTasks.filter(function (t) {
    const d = daysBetween_(today, t.DueDate);
    return d !== null && d < 0;
  });
  const weekTasks = tasks.filter(function (t) {
    return isWithinRange_(t.DueDate, week.start, week.end);
  });
  const weekCompleted = weekTasks.filter(function (t) { return t.Status === 'Completed'; });

  const focusMinutesToday = todayTasks.reduce(function (sum, t) {
    return sum + (Number(t.EstimateMinutes) || 0);
  }, 0);

  const streak = getBestHabitStreak_();

  const kpis = {
    dueToday: { value: todayTasks.length, sub: countHighImpact_(todayTasks) + ' high impact' },
    overdue: { value: overdueTasks.length, sub: overdueTasks.length > 0 ? 'Needs cleanup' : 'All clear' },
    focusTime: { value: formatMinutes_(focusMinutesToday), sub: 'Planned today' },
    weeklyProgress: {
      value: weekTasks.length > 0 ? Math.round((weekCompleted.length / weekTasks.length) * 100) + '%' : '-',
      sub: weekTasks.length > 0 ? (weekCompleted.length + ' / ' + weekTasks.length + ' done') : 'No tasks due this week'
    },
    streak: { value: streak + (streak === 1 ? ' day' : ' days'), sub: 'Daily planning' }
  };

  const focusNow = openTasks
    .slice()
    .sort(function (a, b) { return (Number(b.SmartScore) || 0) - (Number(a.SmartScore) || 0); })
    .slice(0, DASHBOARD_LAYOUT.focusNowMaxRows);

  const areas = getAreaProgress_(tasks);

  const insights = generateInsights_({
    overdueTasks: overdueTasks,
    todayTasks: todayTasks,
    focusMinutesToday: focusMinutesToday,
    dailyFocusLimitHours: dailyFocusLimitHours,
    weekTasks: weekTasks,
    weekCompleted: weekCompleted,
    dueSoonDays: dueSoonDays
  });

  return { kpis: kpis, focusNow: focusNow, areas: areas, insights: insights };
}

function writeDashboardHeader_(sheet) {
  sheet.getRange(DASHBOARD_LAYOUT.titleRow, 1, 1, 6).merge()
    .setValue('Dashboard')
    .setFontSize(28).setFontWeight('bold').setFontColor(COLORS.text);

  const greeting = buildGreeting_();
  sheet.getRange(DASHBOARD_LAYOUT.subtitleRow, 1, 1, 10).merge()
    .setValue(greeting)
    .setFontSize(14).setFontColor(COLORS.text2);
}

function writeKpiCards_(sheet, kpis) {
  const order = ['dueToday', 'overdue', 'focusTime', 'weeklyProgress', 'streak'];
  const labels = ['DUE TODAY', 'OVERDUE', 'FOCUS TIME', 'WEEKLY PROGRESS', 'STREAK'];

  order.forEach(function (key, i) {
    const col = DASHBOARD_LAYOUT.kpiCols[i];
    const width = col.end - col.start + 1;

    sheet.getRange(DASHBOARD_LAYOUT.kpiLabelRow, col.start, 1, width).merge()
      .setValue(labels[i]).setFontSize(11).setFontColor(COLORS.text2).setFontWeight('bold');

    const isDanger = key === 'overdue' && kpis[key].value > 0;
    sheet.getRange(DASHBOARD_LAYOUT.kpiValueRow, col.start, 1, width).merge()
      .setValue(kpis[key].value).setFontSize(26).setFontWeight('bold')
      .setFontColor(isDanger ? COLORS.danger : COLORS.text);

    sheet.getRange(DASHBOARD_LAYOUT.kpiSubRow, col.start, 1, width).merge()
      .setValue(kpis[key].sub).setFontSize(11).setFontColor(COLORS.text2);

    sheet.getRange(DASHBOARD_LAYOUT.kpiLabelRow, col.start, 3, width)
      .setBackground(COLORS.surface2)
      .setBorder(true, true, true, true, false, false, COLORS.border, SpreadsheetApp.BorderStyle.SOLID);
  });
}

function writeFocusNowSection_(sheet, focusNow) {
  const headerRow = DASHBOARD_LAYOUT.focusNowHeaderRow;
  sheet.getRange(headerRow, 1).setValue('FOCUS NOW').setFontSize(16).setFontWeight('bold').setFontColor(COLORS.text);

  const tableHeaderRow = DASHBOARD_LAYOUT.focusNowTableHeaderRow;
  const headers = ['TASK', 'AREA', 'DUE', 'SCORE', 'RECOMMENDED ACTION'];
  sheet.getRange(tableHeaderRow, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setFontSize(11).setFontColor(COLORS.text2).setBackground(COLORS.surface2);

  if (focusNow.length === 0) {
    sheet.getRange(tableHeaderRow + 1, 1).setValue('No open tasks. Add one from the Smart Task menu.')
      .setFontColor(COLORS.text2);
    return tableHeaderRow + 1;
  }

  const today = stripTime_(now_());
  const rows = focusNow.map(function (t) {
    return [t.TaskName, t.Area || '-', dueLabel_(t.DueDate, today), t.SmartScore, t.RecommendedAction];
  });
  const startRow = DASHBOARD_LAYOUT.focusNowFirstDataRow;
  sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);

  focusNow.forEach(function (t, i) {
    const cell = sheet.getRange(startRow + i, 4);
    if (Number(t.SmartScore) >= 85) cell.setBackground('#FEE2E2').setFontColor('#B91C1C').setFontWeight('bold');
    else if (Number(t.SmartScore) >= 60) cell.setBackground('#FFEDD5').setFontColor('#C2410C');
  });

  return startRow + rows.length - 1;
}

function writeMyAreasSection_(sheet, areas, startRow) {
  sheet.getRange(startRow, 1).setValue('MY AREAS').setFontSize(16).setFontWeight('bold').setFontColor(COLORS.text);
  const rowAfterHeader = startRow + 1;

  if (areas.length === 0) {
    sheet.getRange(rowAfterHeader, 1).setValue('No tasks assigned to an Area yet.').setFontColor(COLORS.text2);
    return rowAfterHeader;
  }

  areas.forEach(function (a, i) {
    const row = rowAfterHeader + i;
    sheet.getRange(row, 1).setValue(a.area).setFontWeight('bold');
    sheet.getRange(row, 2).setValue(a.progress + '%').setFontColor(COLORS.text2);
  });
  return rowAfterHeader + areas.length - 1;
}

function writeSmartInsightsSection_(sheet, insights, startRow) {
  sheet.getRange(startRow, 1).setValue('SMART INSIGHTS').setFontSize(16).setFontWeight('bold').setFontColor(COLORS.text);
  const rowAfterHeader = startRow + 1;

  if (insights.length === 0) {
    sheet.getRange(rowAfterHeader, 1).setValue('Nothing notable right now.').setFontColor(COLORS.text2);
    return;
  }
  insights.forEach(function (text, i) {
    sheet.getRange(rowAfterHeader + i, 1, 1, 6).merge()
      .setValue(text)
      .setBackground(COLORS.primaryLight).setFontColor(COLORS.primaryHover)
      .setBorder(true, true, true, true, false, false, COLORS.primary, SpreadsheetApp.BorderStyle.SOLID);
  });
}

function buildGreeting_() {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'morning' : (hour < 18 ? 'afternoon' : 'evening');
  const name = getSetting_('WorkspaceName', 'there');
  return 'Good ' + period + ', ' + name + '. Here is what matters today.';
}

function countHighImpact_(tasks) {
  return tasks.filter(function (t) { return t.Priority === 'Critical' || t.Priority === 'Urgent'; }).length;
}

function formatMinutes_(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return m + 'm';
  if (m === 0) return h + 'h';
  return h + 'h ' + m + 'm';
}

function sameDay_(dateValue, referenceDate) {
  const d = stripTime_(dateValue);
  if (!d) return false;
  return d.getTime() === stripTime_(referenceDate).getTime();
}

function isWithinRange_(dateValue, start, end) {
  const d = stripTime_(dateValue);
  if (!d || !start || !end) return false;
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

function getWeekRange_(date) {
  const d = stripTime_(date);
  const day = d.getDay();
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const start = new Date(d.getTime());
  start.setDate(start.getDate() + diffToMonday);
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + 6);
  return { start: start, end: end };
}

function dueLabel_(dueDate, today) {
  const d = stripTime_(dueDate);
  if (!d) return 'No date';
  const diff = daysBetween_(today, d);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return Utilities.formatDate(d, Session.getScriptTimeZone() || 'Etc/UTC', 'MMM d');
}

function getAreaProgress_(tasks) {
  const byArea = {};
  tasks.forEach(function (t) {
    if (!t.Area) return;
    if (!byArea[t.Area]) byArea[t.Area] = { sum: 0, count: 0 };
    byArea[t.Area].sum += Number(t.Progress) || 0;
    byArea[t.Area].count += 1;
  });
  return Object.keys(byArea).map(function (area) {
    return { area: area, progress: Math.round(byArea[area].sum / byArea[area].count) };
  }).sort(function (a, b) { return b.progress - a.progress; });
}

function getBestHabitStreak_() {
  const habits = getAllHabits_();
  if (habits.length === 0) return 0;
  return habits.reduce(function (max, h) { return Math.max(max, Number(h.Streak) || 0); }, 0);
}

function generateInsights_(ctx) {
  const insights = [];

  if (ctx.overdueTasks.length > 0) {
    const quickOverdueMinutes = ctx.overdueTasks
      .filter(function (t) { return (Number(t.EstimateMinutes) || 0) > 0 && Number(t.EstimateMinutes) <= 20; })
      .reduce(function (sum, t) { return sum + Number(t.EstimateMinutes); }, 0);
    if (quickOverdueMinutes > 0) {
      insights.push(ctx.overdueTasks.length + ' overdue task(s) - some can be cleared in under ' +
        formatMinutes_(quickOverdueMinutes) + '.');
    } else {
      insights.push(ctx.overdueTasks.length + ' task(s) are overdue and need attention.');
    }
  }

  const limitMinutes = ctx.dailyFocusLimitHours * 60;
  if (ctx.focusMinutesToday > limitMinutes) {
    insights.push('Today is overloaded by ' + formatMinutes_(ctx.focusMinutesToday - limitMinutes) +
      ' versus your daily focus limit. Consider rescheduling something.');
  }

  if (ctx.weekTasks.length > 0) {
    const pct = Math.round((ctx.weekCompleted.length / ctx.weekTasks.length) * 100);
    insights.push('Weekly completion is at ' + pct + '% (' + ctx.weekCompleted.length + ' of ' + ctx.weekTasks.length + ').');
  }

  return insights.slice(0, 3);
}