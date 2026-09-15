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


/* ==========================================================================
 * TASKS
 * ========================================================================== */

/**
 * Create a new task.
 *
 * @param {Object} fields
 * @return {string} TaskId
 */
function createTask_(fields) {
  if (!fields || !String(fields.TaskName || '').trim()) {
    throw new Error('TaskName is required to create a task.');
  }

  const taskId = generateNextId_(
    SHEETS.TASKS,
    'TaskId',
    TASK_HEADERS,
    ID_PREFIX.TASK
  );

  const timestamp = now_();

  const task = Object.assign(
    {
      Area: '',
      Project: '',
      Category: '',
      Tags: '',

      Priority: getSetting_(
        'DefaultPriority',
        'Medium'
      ),

      Status: getSetting_(
        'DefaultStatus',
        'Inbox'
      ),

      StartDate: '',
      DueDate: '',
      DueTime: '',
      CompletedDate: '',

      Progress: 0,

      EstimateMinutes: getSetting_(
        'DefaultEstimateMinutes',
        30
      ),

      Energy: 'Any',
      Context: 'Anywhere',

      GoalId: '',

      RecurringType: 'None',
      DependencyTaskId: '',

      SmartScore: '',
      Risk: '',
      RecommendedAction: '',

      Notes: ''
    },
    fields,
    {
      TaskId: taskId,
      CreatedAt: timestamp,
      UpdatedAt: timestamp,
      LastStatusChangedAt: timestamp
    }
  );

  // Calculate smart fields before persisting.
  Object.assign(
    task,
    computeSmartFields_(task)
  );

  appendRow_(
    SHEETS.TASKS,
    objectToRow_(task, TASK_HEADERS)
  );

  logActivity_(
    'Task',
    taskId,
    'Created',
    '',
    task.TaskName
  );

  return taskId;
}


/**
 * Update an existing task.
 *
 * All modules should use this function instead of directly writing
 * into the Tasks sheet.
 *
 * @param {string} taskId
 * @param {Object} patch
 */
function updateTask_(taskId, patch) {
  taskId = String(taskId || '').trim();

  if (!taskId) {
    throw new Error('TaskId is required.');
  }

  if (!patch || typeof patch !== 'object') {
    throw new Error('Task update patch is required.');
  }

  const row = findRowByEntityId_(
    SHEETS.TASKS,
    TASK_HEADERS,
    'TaskId',
    taskId
  );

  if (row === -1) {
    throw new Error(
      'Task not found: ' + taskId
    );
  }

  const sheet = getOrCreateSheet_(
    SHEETS.TASKS
  );

  const current = sheet
    .getRange(
      row,
      1,
      1,
      TASK_HEADERS.length
    )
    .getValues()[0];

  const currentObj = {};

  TASK_HEADERS.forEach(
    function (header, index) {
      currentObj[header] = current[index];
    }
  );

  const statusChanged =
    patch.Status !== undefined &&
    String(patch.Status) !==
      String(currentObj.Status);

  const timestamp = now_();

  const updated = Object.assign(
    {},
    currentObj,
    patch,
    {
      UpdatedAt: timestamp
    }
  );


  /* ----------------------------------------------------------------------
   * STATUS TRANSITIONS
   * -------------------------------------------------------------------- */

  if (statusChanged) {
    updated.LastStatusChangedAt =
      timestamp;

    /*
     * Moving INTO Completed.
     */
    if (String(updated.Status) === 'Completed') {
      updated.Progress = 100;

      if (!patch.CompletedDate) {
        updated.CompletedDate =
          currentObj.CompletedDate ||
          timestamp;
      }
    }

    /*
     * Moving OUT of Completed.
     *
     * A reopened task is no longer considered completed,
     * so CompletedDate must not remain populated.
     */
    if (
      String(currentObj.Status) === 'Completed' &&
      String(updated.Status) !== 'Completed'
    ) {
      updated.CompletedDate = '';
    }
  }


  /* ----------------------------------------------------------------------
   * PROGRESS SAFETY
   * -------------------------------------------------------------------- */

  if (updated.Progress !== '') {
    const progress = Number(
      updated.Progress
    );

    if (Number.isFinite(progress)) {
      updated.Progress = Math.max(
        0,
        Math.min(
          100,
          Math.round(progress)
        )
      );
    }
  }


  /* ----------------------------------------------------------------------
   * SMART ENGINE
   * -------------------------------------------------------------------- */

  Object.assign(
    updated,
    computeSmartFields_(updated)
  );


  /* ----------------------------------------------------------------------
   * SAVE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      row,
      1,
      1,
      TASK_HEADERS.length
    )
    .setValues([
      objectToRow_(
        updated,
        TASK_HEADERS
      )
    ]);


  /* ----------------------------------------------------------------------
   * ACTIVITY LOG
   * -------------------------------------------------------------------- */

  if (statusChanged) {
    logActivity_(
      'Task',
      taskId,
      'StatusChanged',
      currentObj.Status,
      updated.Status
    );
  } else {
    logActivity_(
      'Task',
      taskId,
      'Updated',
      '',
      ''
    );
  }
}


/**
 * Mark task as completed.
 *
 * @param {string} taskId
 */
function completeTask_(taskId) {
  taskId = String(taskId || '').trim();

  if (!taskId) {
    throw new Error('TaskId is required.');
  }

  const task = getTaskById_(taskId);

  if (!task) {
    throw new Error(
      'Task not found: ' + taskId
    );
  }

  /*
   * Keep original completion time
   * when already completed.
   */
  if (
    String(task.Status) === 'Completed'
  ) {
    return;
  }

  updateTask_(
    taskId,
    {
      Status: 'Completed',
      Progress: 100
    }
  );
}


/**
 * Delete a task permanently.
 *
 * Uses TaskId instead of row number because rows can move
 * when users sort or modify the Tasks sheet.
 *
 * @param {string} taskId
 * @return {boolean}
 */
function deleteTask_(taskId) {
  taskId = String(taskId || '').trim();

  if (!taskId) {
    throw new Error(
      'TaskId is required.'
    );
  }

  /*
   * Read task before deleting so we can
   * retain useful ActivityLog information.
   */
  const task = getTaskById_(taskId);

  if (!task) {
    throw new Error(
      'Task not found: ' + taskId
    );
  }

  const row = findRowByEntityId_(
    SHEETS.TASKS,
    TASK_HEADERS,
    'TaskId',
    taskId
  );

  if (row === -1) {
    throw new Error(
      'Task row not found: ' + taskId
    );
  }

  const sheet = getOrCreateSheet_(
    SHEETS.TASKS
  );

  /*
   * Never delete header.
   */
  if (row <= 1) {
    throw new Error(
      'Cannot delete Tasks header row.'
    );
  }

  sheet.deleteRow(row);

  logActivity_(
    'Task',
    taskId,
    'Deleted',
    String(task.TaskName || ''),
    ''
  );

  return true;
}


/**
 * Find task by TaskId.
 *
 * @param {string} taskId
 * @return {Object|null}
 */
function getTaskById_(taskId) {
  taskId = String(taskId || '').trim();

  if (!taskId) {
    return null;
  }

  const row = findRowByEntityId_(
    SHEETS.TASKS,
    TASK_HEADERS,
    'TaskId',
    taskId
  );

  if (row === -1) {
    return null;
  }

  const sheet = getOrCreateSheet_(
    SHEETS.TASKS
  );

  const values = sheet
    .getRange(
      row,
      1,
      1,
      TASK_HEADERS.length
    )
    .getValues()[0];

  const obj = {};

  TASK_HEADERS.forEach(
    function (header, index) {
      obj[header] = values[index];
    }
  );

  return obj;
}


/**
 * Return all tasks.
 *
 * @return {Object[]}
 */
function getAllTasks_() {
  return readTable_(
    SHEETS.TASKS,
    TASK_HEADERS
  );
}


/* ==========================================================================
 * PROJECTS
 * ========================================================================== */

function createProject_(fields) {
  if (
    !fields ||
    !String(
      fields.ProjectName || ''
    ).trim()
  ) {
    throw new Error(
      'ProjectName is required to create a project.'
    );
  }

  const projectId = generateNextId_(
    SHEETS.PROJECTS,
    'ProjectId',
    PROJECT_HEADERS,
    ID_PREFIX.PROJECT
  );

  const timestamp = now_();

  const project = Object.assign(
    {
      Area: '',
      Health: 'Healthy',
      TargetDate: '',
      Description: ''
    },
    fields,
    {
      ProjectId: projectId,
      CreatedAt: timestamp,
      UpdatedAt: timestamp
    }
  );

  appendRow_(
    SHEETS.PROJECTS,
    objectToRow_(
      project,
      PROJECT_HEADERS
    )
  );

  logActivity_(
    'Project',
    projectId,
    'Created',
    '',
    project.ProjectName
  );

  return projectId;
}


function getAllProjects_() {
  return readTable_(
    SHEETS.PROJECTS,
    PROJECT_HEADERS
  );
}


/* ==========================================================================
 * GOALS
 * ========================================================================== */

function createGoal_(fields) {
  if (
    !fields ||
    !String(
      fields.GoalName || ''
    ).trim()
  ) {
    throw new Error(
      'GoalName is required to create a goal.'
    );
  }

  const goalId = generateNextId_(
    SHEETS.GOALS,
    'GoalId',
    GOAL_HEADERS,
    ID_PREFIX.GOAL
  );

  const timestamp = now_();

  const goal = Object.assign(
    {
      Area: '',
      TargetDate: '',
      Progress: 0,
      Status: 'On Track'
    },
    fields,
    {
      GoalId: goalId,
      CreatedAt: timestamp,
      UpdatedAt: timestamp
    }
  );

  appendRow_(
    SHEETS.GOALS,
    objectToRow_(
      goal,
      GOAL_HEADERS
    )
  );

  logActivity_(
    'Goal',
    goalId,
    'Created',
    '',
    goal.GoalName
  );

  return goalId;
}


function getAllGoals_() {
  return readTable_(
    SHEETS.GOALS,
    GOAL_HEADERS
  );
}


/* ==========================================================================
 * HABITS
 * ========================================================================== */

function createHabit_(fields) {
  if (
    !fields ||
    !String(
      fields.HabitName || ''
    ).trim()
  ) {
    throw new Error(
      'HabitName is required to create a habit.'
    );
  }

  const habitId = generateNextId_(
    SHEETS.HABITS,
    'HabitId',
    HABIT_HEADERS,
    ID_PREFIX.HABIT
  );

  const timestamp = now_();

  const habit = Object.assign(
    {
      Frequency: 'Daily',
      Streak: 0,
      TargetCount: 0,
      CompletedCount: 0,
      LastCompletedDate: ''
    },
    fields,
    {
      HabitId: habitId,
      CreatedAt: timestamp,
      UpdatedAt: timestamp
    }
  );

  appendRow_(
    SHEETS.HABITS,
    objectToRow_(
      habit,
      HABIT_HEADERS
    )
  );

  logActivity_(
    'Habit',
    habitId,
    'Created',
    '',
    habit.HabitName
  );

  return habitId;
}


function getAllHabits_() {
  return readTable_(
    SHEETS.HABITS,
    HABIT_HEADERS
  );
}