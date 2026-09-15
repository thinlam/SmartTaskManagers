/**
 * 03_Data.gs
 * -----------------------------------------------------------------------
 * CRUD for the four core entities. Tasks stays the single source of truth
 * - Dashboard/Today/Calendar/Kanban/Timeline (built later) all read from
 * here, none of them keep their own copy of task data.
 *
 * SmartScore / Risk / RecommendedAction are computed by 05_SmartEngine.gs
 * (computeSmartFields_) every time a task is created or updated, so they
 * are never stale between edits. recalculateAllSmartFields_() additionally
 * refreshes every task on a daily trigger, since due-date urgency shifts
 * even when nobody touches a task.
 * -----------------------------------------------------------------------
 */

function createTask_(fields) {
  if (!fields || !String(fields.TaskName || '').trim()) {
    throw new Error('TaskName is required to create a task.');
  }

  const taskId = generateNextId_(SHEETS.TASKS, 'TaskId', TASK_HEADERS, ID_PREFIX.TASK);
  const timestamp = now_();

  const task = Object.assign({
    Area: '',
    Project: '',
    Category: '',
    Tags: '',
    Priority: getSetting_('DefaultPriority', 'Medium'),
    Status: getSetting_('DefaultStatus', 'Inbox'),
    StartDate: '',
    DueDate: '',
    DueTime: '',
    CompletedDate: '',
    Progress: 0,
    EstimateMinutes: getSetting_('DefaultEstimateMinutes', 30),
    Energy: 'Any',
    Context: 'Anywhere',
    GoalId: '',
    RecurringType: 'None',
    DependencyTaskId: '',
    SmartScore: '',
    Risk: '',
    RecommendedAction: '',
    Notes: ''
  }, fields, {
    TaskId: taskId,
    CreatedAt: timestamp,
    UpdatedAt: timestamp,
    LastStatusChangedAt: timestamp
  });

  Object.assign(task, computeSmartFields_(task));
  appendRow_(SHEETS.TASKS, objectToRow_(task, TASK_HEADERS));
  logActivity_('Task', taskId, 'Created', '', task.TaskName);
  return taskId;
}

function updateTask_(taskId, patch) {
  const row = findRowByEntityId_(SHEETS.TASKS, TASK_HEADERS, 'TaskId', taskId);
  if (row === -1) throw new Error('Task not found: ' + taskId);

  const sheet = getOrCreateSheet_(SHEETS.TASKS);
  const current = sheet.getRange(row, 1, 1, TASK_HEADERS.length).getValues()[0];
  const currentObj = {};
  TASK_HEADERS.forEach(function (h, i) { currentObj[h] = current[i]; });

  const statusChanged = patch.Status !== undefined && patch.Status !== currentObj.Status;
  const updated = Object.assign({}, currentObj, patch, { UpdatedAt: now_() });
  if (statusChanged) {
    updated.LastStatusChangedAt = now_();
    if (patch.Status === 'Completed' && !patch.CompletedDate) {
      updated.CompletedDate = now_();
      updated.Progress = 100;
    }
  }

  Object.assign(updated, computeSmartFields_(updated));
  sheet.getRange(row, 1, 1, TASK_HEADERS.length).setValues([objectToRow_(updated, TASK_HEADERS)]);

  if (statusChanged) {
    logActivity_('Task', taskId, 'StatusChanged', currentObj.Status, updated.Status);
  } else {
    logActivity_('Task', taskId, 'Updated', '', '');
  }
}

function completeTask_(taskId) {
  updateTask_(taskId, { Status: 'Completed' });
}

function getTaskById_(taskId) {
  const row = findRowByEntityId_(SHEETS.TASKS, TASK_HEADERS, 'TaskId', taskId);
  if (row === -1) return null;
  const sheet = getOrCreateSheet_(SHEETS.TASKS);
  const values = sheet.getRange(row, 1, 1, TASK_HEADERS.length).getValues()[0];
  const obj = {};
  TASK_HEADERS.forEach(function (h, i) { obj[h] = values[i]; });
  return obj;
}

function getAllTasks_() {
  return readTable_(SHEETS.TASKS, TASK_HEADERS);
}

function createProject_(fields) {
  if (!fields || !String(fields.ProjectName || '').trim()) {
    throw new Error('ProjectName is required to create a project.');
  }
  const projectId = generateNextId_(SHEETS.PROJECTS, 'ProjectId', PROJECT_HEADERS, ID_PREFIX.PROJECT);
  const timestamp = now_();
  const project = Object.assign({
    Area: '', Health: 'Healthy', TargetDate: '', Description: ''
  }, fields, { ProjectId: projectId, CreatedAt: timestamp, UpdatedAt: timestamp });

  appendRow_(SHEETS.PROJECTS, objectToRow_(project, PROJECT_HEADERS));
  logActivity_('Project', projectId, 'Created', '', project.ProjectName);
  return projectId;
}

function getAllProjects_() {
  return readTable_(SHEETS.PROJECTS, PROJECT_HEADERS);
}

function createGoal_(fields) {
  if (!fields || !String(fields.GoalName || '').trim()) {
    throw new Error('GoalName is required to create a goal.');
  }
  const goalId = generateNextId_(SHEETS.GOALS, 'GoalId', GOAL_HEADERS, ID_PREFIX.GOAL);
  const timestamp = now_();
  const goal = Object.assign({
    Area: '', TargetDate: '', Progress: 0, Status: 'On Track'
  }, fields, { GoalId: goalId, CreatedAt: timestamp, UpdatedAt: timestamp });

  appendRow_(SHEETS.GOALS, objectToRow_(goal, GOAL_HEADERS));
  logActivity_('Goal', goalId, 'Created', '', goal.GoalName);
  return goalId;
}

function getAllGoals_() {
  return readTable_(SHEETS.GOALS, GOAL_HEADERS);
}

function createHabit_(fields) {
  if (!fields || !String(fields.HabitName || '').trim()) {
    throw new Error('HabitName is required to create a habit.');
  }
  const habitId = generateNextId_(SHEETS.HABITS, 'HabitId', HABIT_HEADERS, ID_PREFIX.HABIT);
  const timestamp = now_();
  const habit = Object.assign({
    Frequency: 'Daily', Streak: 0, TargetCount: 0, CompletedCount: 0, LastCompletedDate: ''
  }, fields, { HabitId: habitId, CreatedAt: timestamp, UpdatedAt: timestamp });

  appendRow_(SHEETS.HABITS, objectToRow_(habit, HABIT_HEADERS));
  logActivity_('Habit', habitId, 'Created', '', habit.HabitName);
  return habitId;
}

function getAllHabits_() {
  return readTable_(SHEETS.HABITS, HABIT_HEADERS);
}