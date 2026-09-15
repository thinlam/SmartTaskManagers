/**
 * 05_SmartEngine.gs
 * -----------------------------------------------------------------------
 * Personal Smart Engine (Frame 01):
 *   SmartScore = urgency + impact + effort fit + goal alignment + task age
 *   Risk       = deadline pressure + blocked state + stalled progress
 *   Action     = Do now / Schedule / Break down / Defer (rule-based)
 *
 * Every number here is a named, explainable rule — nothing random, nothing
 * hidden. Weights live in one place (SMART_WEIGHTS) so they're easy to
 * tune without hunting through the logic.
 * -----------------------------------------------------------------------
 */

const SMART_WEIGHTS = {
  urgency: { overdue: 30, dueToday: 25, dueSoon: 15, dueThisWeek: 8, later: 0 },
  impact: { Critical: 25, Urgent: 20, High: 15, Medium: 8, Low: 3 },
  effortFit: { tiny: 15, small: 12, medium: 8, large: 4, xlarge: 0 },
  goalAlignment: 15,
  taskAge: { perTwoDays: 1, cap: 15 },
  risk: {
    overdue: 40, dueToday: 25, dueSoon: 10,
    blocked: 20, dependencyPending: 15, stalled: 15, criticalPriority: 10
  },
  riskBuckets: { critical: 60, high: 35, medium: 15 }
};

function computeSmartFields_(task, referenceDate) {
  const today = stripTime_(referenceDate || now_());
  const dueSoonDays = Number(getSetting_('DueSoonDays', 2)) || 2;

  const daysUntilDue = daysBetween_(today, task.DueDate);
  const ageDays = daysBetween_(task.CreatedAt ? stripTime_(task.CreatedAt) : today, today);
  const isCompleted = task.Status === 'Completed';
  const isBlocked = task.Status === 'Waiting';
  const dependencyPending = !!task.DependencyTaskId && !isDependencyCompleted_(task.DependencyTaskId);
  const stalled = !isCompleted && isStalled_(task, ageDays);

  const urgency = isCompleted ? 0 : urgencyScore_(daysUntilDue, dueSoonDays);
  const impact = SMART_WEIGHTS.impact[task.Priority] || 0;
  const effort = effortFitScore_(task.EstimateMinutes);
  const goalAlign = task.GoalId ? SMART_WEIGHTS.goalAlignment : 0;
  const age = Math.min(Math.floor(ageDays / 2) * SMART_WEIGHTS.taskAge.perTwoDays, SMART_WEIGHTS.taskAge.cap);

  let smartScore = isCompleted ? 0 : Math.round(urgency + impact + effort + goalAlign + age);
  smartScore = Math.max(0, Math.min(100, smartScore));

  let riskPoints = 0;
  if (!isCompleted) {
    if (daysUntilDue !== null) {
      if (daysUntilDue < 0) riskPoints += SMART_WEIGHTS.risk.overdue;
      else if (daysUntilDue === 0) riskPoints += SMART_WEIGHTS.risk.dueToday;
      else if (daysUntilDue <= dueSoonDays) riskPoints += SMART_WEIGHTS.risk.dueSoon;
    }
    if (isBlocked) riskPoints += SMART_WEIGHTS.risk.blocked;
    if (dependencyPending) riskPoints += SMART_WEIGHTS.risk.dependencyPending;
    if (stalled) riskPoints += SMART_WEIGHTS.risk.stalled;
    if (task.Priority === 'Critical') riskPoints += SMART_WEIGHTS.risk.criticalPriority;
  }
  const risk = riskBucket_(riskPoints);

  const action = recommendAction_({
    isCompleted: isCompleted,
    isBlocked: isBlocked,
    dependencyPending: dependencyPending,
    stalled: stalled,
    daysUntilDue: daysUntilDue,
    dueSoonDays: dueSoonDays,
    estimateMinutes: Number(task.EstimateMinutes) || 0,
    smartScore: smartScore
  });

  return { SmartScore: smartScore, Risk: risk, RecommendedAction: action };
}

function urgencyScore_(daysUntilDue, dueSoonDays) {
  if (daysUntilDue === null) return SMART_WEIGHTS.urgency.later;
  if (daysUntilDue < 0) return SMART_WEIGHTS.urgency.overdue;
  if (daysUntilDue === 0) return SMART_WEIGHTS.urgency.dueToday;
  if (daysUntilDue <= dueSoonDays) return SMART_WEIGHTS.urgency.dueSoon;
  if (daysUntilDue <= 7) return SMART_WEIGHTS.urgency.dueThisWeek;
  return SMART_WEIGHTS.urgency.later;
}

function effortFitScore_(estimateMinutes) {
  const m = Number(estimateMinutes) || 0;
  if (m <= 0) return SMART_WEIGHTS.effortFit.medium;
  if (m <= 15) return SMART_WEIGHTS.effortFit.tiny;
  if (m <= 30) return SMART_WEIGHTS.effortFit.small;
  if (m <= 60) return SMART_WEIGHTS.effortFit.medium;
  if (m <= 120) return SMART_WEIGHTS.effortFit.large;
  return SMART_WEIGHTS.effortFit.xlarge;
}

function isStalled_(task, ageDays) {
  const progress = Number(task.Progress) || 0;
  return ageDays >= 5 && progress < 20 && task.Status !== 'Inbox' && task.Status !== 'Completed';
}

function riskBucket_(points) {
  if (points >= SMART_WEIGHTS.riskBuckets.critical) return 'Critical';
  if (points >= SMART_WEIGHTS.riskBuckets.high) return 'High';
  if (points >= SMART_WEIGHTS.riskBuckets.medium) return 'Medium';
  return 'Low';
}

function recommendAction_(ctx) {
  if (ctx.isCompleted) return 'Completed';
  if (ctx.isBlocked) return 'Review blocked task';
  if (ctx.dependencyPending) return 'Waiting for dependency';
  if (ctx.daysUntilDue !== null && ctx.daysUntilDue < 0) return 'Overdue - do now';
  if (ctx.daysUntilDue === 0) {
    return ctx.estimateMinutes > 90 ? 'Break down' : 'Do now';
  }
  if (ctx.stalled) return 'Break down';
  if (ctx.smartScore >= 85) return 'Do now';
  if (ctx.estimateMinutes > 0 && ctx.estimateMinutes <= 15) return 'Quick win';
  if (ctx.daysUntilDue !== null && ctx.daysUntilDue <= ctx.dueSoonDays) return 'Schedule';
  return 'Defer';
}

function isDependencyCompleted_(dependencyTaskId) {
  const dep = getTaskById_(dependencyTaskId);
  return dep ? dep.Status === 'Completed' : true;
}

function stripTime_(value) {
  if (!value) return null;
  const d = (value instanceof Date) ? new Date(value.getTime()) : new Date(value);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween_(a, b) {
  const da = stripTime_(a);
  const db = stripTime_(b);
  if (!da || !db) return null;
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

function recalculateAllSmartFields_() {
  const sheet = getOrCreateSheet_(SHEETS.TASKS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { toast_('No tasks to recalculate.', 'Smart Task'); return; }

  const values = sheet.getRange(2, 1, lastRow - 1, TASK_HEADERS.length).getValues();
  const scoreCol = TASK_HEADERS.indexOf('SmartScore');
  const riskCol = TASK_HEADERS.indexOf('Risk');
  const actionCol = TASK_HEADERS.indexOf('RecommendedAction');
  const today = stripTime_(now_());

  values.forEach(function (row) {
    const task = {};
    TASK_HEADERS.forEach(function (h, i) { task[h] = row[i]; });
    const fields = computeSmartFields_(task, today);
    row[scoreCol] = fields.SmartScore;
    row[riskCol] = fields.Risk;
    row[actionCol] = fields.RecommendedAction;
  });

  sheet.getRange(2, 1, values.length, TASK_HEADERS.length).setValues(values);
  toast_('Recalculated Smart Score for ' + values.length + ' task(s).', 'Smart Task');
}

function refreshAll_() {
  recalculateAllSmartFields_();
  renderDashboard_();
  renderToday_();
  renderTaskSummary_();
}

function ensureDailyRecalcTrigger_() {
  const triggers = ScriptApp.getProjectTriggers();
  let hasCurrent = false;

  triggers.forEach(function (t) {
    const handler = t.getHandlerFunction();
    if (handler === 'refreshAll_') {
      hasCurrent = true;
    } else if (handler === 'recalculateAllSmartFields_') {
      ScriptApp.deleteTrigger(t);
    }
  });

  if (hasCurrent) return;

  ScriptApp.newTrigger('refreshAll_')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
}