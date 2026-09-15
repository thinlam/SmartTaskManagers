/**
 * 09_TaskDetails.gs
 * -----------------------------------------------------------------------
 * FRAME 06 — TASK DETAILS
 *
 * Personal Smart Task Manager
 *
 * Responsibilities:
 * - Open Task Details sidebar
 * - Load selected task
 * - Task information
 * - Schedule
 * - Progress
 * - Smart analysis
 * - Personal productivity context
 * - Quick edit
 * - Complete task
 * - Delete task
 *
 * IMPORTANT:
 * - Tasks sheet remains the single source of truth.
 * - Internal Apps Script functions use trailing "_".
 * - Functions called by google.script.run MUST NOT end with "_".
 * -----------------------------------------------------------------------
 */


/* ==========================================================================
 * ENTRY POINT
 * ========================================================================== */

/**
 * Opens the Task Details sidebar.
 *
 * Called internally from 08_Tasks.gs.
 *
 * @param {string} taskId
 */
function showTaskDetails_(taskId) {
  taskId = String(taskId || '').trim();

  if (!taskId) {
    throw new Error('TaskId is required.');
  }

  const html = HtmlService
    .createHtmlOutput(
      buildTaskDetailsHtml_(taskId)
    )
    .setTitle('Task Details');

  SpreadsheetApp
    .getUi()
    .showSidebar(html);
}


/* ==========================================================================
 * PUBLIC SIDEBAR API
 * --------------------------------------------------------------------------
 * google.script.run cannot call Apps Script functions whose names end "_".
 *
 * Therefore:
 *
 * Browser:
 *   getTaskDetailsPayload()
 *
 * Apps Script internal:
 *   getTaskDetailsPayload_()
 *
 * Same rule applies to update / complete / delete.
 * ========================================================================== */

/**
 * Public API used by Sidebar.
 */
function getTaskDetailsPayload(taskId) {
  return getTaskDetailsPayload_(taskId);
}


/**
 * Public API used by Sidebar.
 */
function updateTaskQuickField(
  taskId,
  field,
  value
) {
  return updateTaskQuickField_(
    taskId,
    field,
    value
  );
}


/**
 * Public API used by Sidebar.
 */
function completeTaskFromDetails(taskId) {
  return completeTaskFromDetails_(taskId);
}


/**
 * Public API used by Sidebar.
 */
function deleteTaskFromDetails(taskId) {
  return deleteTaskFromDetails_(taskId);
}


/* ==========================================================================
 * DATA
 * ========================================================================== */

/**
 * Returns prepared Task Detail data.
 *
 * Native Date objects are converted to strings before being returned
 * to google.script.run.
 *
 * @param {string} taskId
 * @return {Object}
 */
function getTaskDetailsPayload_(taskId) {
  taskId = String(taskId || '').trim();

  if (!taskId) {
    return {
      success: false,
      message: 'Task ID is required.'
    };
  }

  const task = getTaskById_(taskId);

  if (!task) {
    return {
      success: false,
      message:
        'Task not found. It may have been deleted or moved.'
    };
  }

  const projects = getAllProjects_();
  const goals = getAllGoals_();

  const project = projects.find(
    function (item) {
      return String(
        item.ProjectId || ''
      ) === String(
        task.Project || ''
      );
    }
  );

  const goal = goals.find(
    function (item) {
      return String(
        item.GoalId || ''
      ) === String(
        task.GoalId || ''
      );
    }
  );

  const priorityList =
    LOOKUP_LISTS &&
    Array.isArray(LOOKUP_LISTS.Priority)
      ? LOOKUP_LISTS.Priority.slice()
      : [
          'Low',
          'Medium',
          'High',
          'Critical'
        ];

  const statusList =
    LOOKUP_LISTS &&
    Array.isArray(LOOKUP_LISTS.Status)
      ? LOOKUP_LISTS.Status.slice()
      : [
          'Inbox',
          'Next',
          'In Progress',
          'Waiting',
          'Completed'
        ];

  return {
    success: true,

    task: {
      TaskId:
        safeTaskDetailString_(
          task.TaskId
        ),

      TaskName:
        safeTaskDetailString_(
          task.TaskName
        ),

      Description:
        safeTaskDetailString_(
          task.Description
        ),

      Area:
        safeTaskDetailString_(
          task.Area
        ),

      Project:
        safeTaskDetailString_(
          task.Project
        ),

      ProjectName:
        project
          ? safeTaskDetailString_(
              project.ProjectName
            )
          : '',

      Category:
        safeTaskDetailString_(
          task.Category
        ),

      Tags:
        safeTaskDetailString_(
          task.Tags
        ),

      Priority:
        safeTaskDetailString_(
          task.Priority
        ),

      Status:
        safeTaskDetailString_(
          task.Status
        ),

      StartDate:
        formatTaskDetailDate_(
          task.StartDate
        ),

      DueDate:
        formatTaskDetailDate_(
          task.DueDate
        ),

      DueDateInput:
        formatTaskDetailInputDate_(
          task.DueDate
        ),

      DueTime:
        safeTaskDetailString_(
          task.DueTime
        ),

      CompletedDate:
        formatTaskDetailDateTime_(
          task.CompletedDate
        ),

      Progress:
        normalizeTaskDetailProgress_(
          task.Progress
        ),

      EstimateMinutes:
        normalizeTaskDetailNumber_(
          task.EstimateMinutes,
          0
        ),

      Energy:
        safeTaskDetailString_(
          task.Energy
        ),

      Context:
        safeTaskDetailString_(
          task.Context
        ),

      GoalId:
        safeTaskDetailString_(
          task.GoalId
        ),

      GoalName:
        goal
          ? safeTaskDetailString_(
              goal.GoalName
            )
          : '',

      RecurringType:
        safeTaskDetailString_(
          task.RecurringType
        ),

      DependencyTaskId:
        safeTaskDetailString_(
          task.DependencyTaskId
        ),

      SmartScore:
        normalizeTaskDetailSmartScore_(
          task.SmartScore
        ),

      Risk:
        safeTaskDetailString_(
          task.Risk
        ),

      RecommendedAction:
        safeTaskDetailString_(
          task.RecommendedAction
        ),

      DeadlineStatus:
        getTaskDetailDeadlineStatus_(
          task
        ),

      CreatedAt:
        formatTaskDetailDateTime_(
          task.CreatedAt
        ),

      UpdatedAt:
        formatTaskDetailDateTime_(
          task.UpdatedAt
        ),

      LastStatusChangedAt:
        formatTaskDetailDateTime_(
          task.LastStatusChangedAt
        ),

      Notes:
        safeTaskDetailString_(
          task.Notes
        )
    },

    lists: {
      Priority: priorityList,
      Status: statusList
    }
  };
}


/* ==========================================================================
 * QUICK EDIT
 * ========================================================================== */

/**
 * Quick edit supported fields:
 *
 * - Status
 * - Priority
 * - DueDate
 * - Progress
 *
 * @param {string} taskId
 * @param {string} field
 * @param {*} value
 * @return {Object}
 */
function updateTaskQuickField_(
  taskId,
  field,
  value
) {
  taskId = String(
    taskId || ''
  ).trim();

  field = String(
    field || ''
  ).trim();

  if (!taskId) {
    throw new Error(
      'TaskId is required.'
    );
  }

  const allowedFields = [
    'Status',
    'Priority',
    'DueDate',
    'Progress'
  ];

  if (
    allowedFields.indexOf(field) === -1
  ) {
    throw new Error(
      'Unsupported quick-edit field: ' +
      field
    );
  }

  const task = getTaskById_(
    taskId
  );

  if (!task) {
    throw new Error(
      'Task not found: ' +
      taskId
    );
  }

  const patch = {};


  /* ----------------------------------------------------------------------
   * STATUS
   * -------------------------------------------------------------------- */

  if (field === 'Status') {
    const status = String(
      value || ''
    ).trim();

    if (
      !LOOKUP_LISTS ||
      !Array.isArray(
        LOOKUP_LISTS.Status
      ) ||
      LOOKUP_LISTS.Status.indexOf(
        status
      ) === -1
    ) {
      throw new Error(
        'Invalid task status: ' +
        status
      );
    }

    patch.Status = status;

    if (
      status === 'Completed'
    ) {
      patch.Progress = 100;

      if (!task.CompletedDate) {
        patch.CompletedDate =
          now_();
      }
    }

    if (
      status !== 'Completed' &&
      String(
        task.Status || ''
      ) === 'Completed'
    ) {
      patch.CompletedDate = '';
    }
  }


  /* ----------------------------------------------------------------------
   * PRIORITY
   * -------------------------------------------------------------------- */

  if (field === 'Priority') {
    const priority = String(
      value || ''
    ).trim();

    if (
      !LOOKUP_LISTS ||
      !Array.isArray(
        LOOKUP_LISTS.Priority
      ) ||
      LOOKUP_LISTS.Priority.indexOf(
        priority
      ) === -1
    ) {
      throw new Error(
        'Invalid priority: ' +
        priority
      );
    }

    patch.Priority =
      priority;
  }


  /* ----------------------------------------------------------------------
   * DUE DATE
   * -------------------------------------------------------------------- */

  if (field === 'DueDate') {
    const dateValue = String(
      value || ''
    ).trim();

    if (!dateValue) {
      patch.DueDate = '';
    } else {
      const parsed =
        parseTaskDetailInputDate_(
          dateValue
        );

      if (!parsed) {
        throw new Error(
          'Invalid due date.'
        );
      }

      patch.DueDate =
        parsed;
    }
  }


  /* ----------------------------------------------------------------------
   * PROGRESS
   * -------------------------------------------------------------------- */

  if (field === 'Progress') {
    const progress =
      Number(value);

    if (
      !Number.isFinite(progress) ||
      progress < 0 ||
      progress > 100
    ) {
      throw new Error(
        'Progress must be between 0 and 100.'
      );
    }

    patch.Progress =
      Math.round(progress);

    /*
     * 100% means Completed.
     */
    if (
      patch.Progress === 100
    ) {
      patch.Status =
        'Completed';

      if (!task.CompletedDate) {
        patch.CompletedDate =
          now_();
      }
    }

    /*
     * Reopening completed task.
     */
    else if (
      String(
        task.Status || ''
      ) === 'Completed'
    ) {
      patch.Status =
        'In Progress';

      patch.CompletedDate =
        '';
    }
  }


  /* ----------------------------------------------------------------------
   * SAVE
   * -------------------------------------------------------------------- */

  updateTask_(
    taskId,
    patch
  );


  /* ----------------------------------------------------------------------
   * REFRESH VIEWS
   * -------------------------------------------------------------------- */

  refreshTaskDetailRelatedViews_();


  /* ----------------------------------------------------------------------
   * RETURN FRESH DATA
   * -------------------------------------------------------------------- */

  return getTaskDetailsPayload_(
    taskId
  );
}


/* ==========================================================================
 * COMPLETE TASK
 * ========================================================================== */

/**
 * Complete a task from Task Details.
 *
 * @param {string} taskId
 * @return {Object}
 */
function completeTaskFromDetails_(
  taskId
) {
  taskId = String(
    taskId || ''
  ).trim();

  if (!taskId) {
    throw new Error(
      'TaskId is required.'
    );
  }

  const task =
    getTaskById_(
      taskId
    );

  if (!task) {
    throw new Error(
      'Task not found: ' +
      taskId
    );
  }

  if (
    String(
      task.Status || ''
    ) !== 'Completed'
  ) {
    completeTask_(
      taskId
    );
  }

  refreshTaskDetailRelatedViews_();

  return getTaskDetailsPayload_(
    taskId
  );
}


/* ==========================================================================
 * DELETE TASK
 * ========================================================================== */

/**
 * Delete task from Task Details.
 *
 * @param {string} taskId
 * @return {Object}
 */
function deleteTaskFromDetails_(
  taskId
) {
  taskId = String(
    taskId || ''
  ).trim();

  if (!taskId) {
    throw new Error(
      'TaskId is required.'
    );
  }

  const task =
    getTaskById_(
      taskId
    );

  if (!task) {
    throw new Error(
      'Task not found: ' +
      taskId
    );
  }

  deleteTask_(
    taskId
  );

  refreshTaskDetailRelatedViews_();

  return {
    success: true,
    taskId: taskId
  };
}


/* ==========================================================================
 * RELATED VIEW REFRESH
 * ========================================================================== */

/**
 * Refresh current views that depend on Tasks.
 *
 * Errors are intentionally isolated because one broken view should
 * not prevent a valid task update from completing.
 */
function refreshTaskDetailRelatedViews_() {
  try {
    if (
      typeof renderDashboard_ ===
      'function'
    ) {
      renderDashboard_();
    }
  } catch (error) {
    console.warn(
      'Dashboard refresh skipped:',
      error &&
      error.message
        ? error.message
        : error
    );
  }

  try {
    if (
      typeof renderToday_ ===
      'function'
    ) {
      renderToday_();
    }
  } catch (error) {
    console.warn(
      'Today refresh skipped:',
      error &&
      error.message
        ? error.message
        : error
    );
  }

  try {
    if (
      typeof renderTaskSummary_ ===
      'function'
    ) {
      renderTaskSummary_();
    }
  } catch (error) {
    console.warn(
      'Task Summary refresh skipped:',
      error &&
      error.message
        ? error.message
        : error
    );
  }
}


/* ==========================================================================
 * DEADLINE STATUS
 * ========================================================================== */

/**
 * Returns deadline state used by Task Details UI.
 *
 * @param {Object} task
 * @return {Object}
 */
function getTaskDetailDeadlineStatus_(
  task
) {
  if (!task) {
    return {
      label: 'No deadline',
      tone: 'neutral',
      message:
        'No deadline assigned'
    };
  }

  if (
    String(
      task.Status || ''
    ) === 'Completed'
  ) {
    return {
      label: 'Completed',
      tone: 'success',
      message:
        'Task completed'
    };
  }

  const dueDate =
    normalizeTaskDetailDateObject_(
      task.DueDate
    );

  if (!dueDate) {
    return {
      label: 'No deadline',
      tone: 'neutral',
      message:
        'No deadline assigned'
    };
  }

  const today =
    taskDetailStartOfDay_(
      new Date()
    );

  const due =
    taskDetailStartOfDay_(
      dueDate
    );

  const diffDays =
    Math.round(
      (
        due.getTime() -
        today.getTime()
      ) /
      86400000
    );


  /* ----------------------------------------------------------------------
   * OVERDUE
   * -------------------------------------------------------------------- */

  if (diffDays < 0) {
    const overdueDays =
      Math.abs(
        diffDays
      );

    return {
      label: 'Overdue',
      tone: 'danger',
      message:
        overdueDays === 1
          ? '1 day overdue'
          : overdueDays +
            ' days overdue'
    };
  }


  /* ----------------------------------------------------------------------
   * TODAY
   * -------------------------------------------------------------------- */

  if (diffDays === 0) {
    return {
      label: 'Due today',
      tone: 'warning',
      message: 'Due today'
    };
  }


  /* ----------------------------------------------------------------------
   * TOMORROW
   * -------------------------------------------------------------------- */

  if (diffDays === 1) {
    return {
      label: 'Due tomorrow',
      tone: 'warning',
      message:
        '1 day remaining'
    };
  }


  /* ----------------------------------------------------------------------
   * DUE SOON
   * -------------------------------------------------------------------- */

  const dueSoonDays =
    Number(
      getSetting_(
        'DueSoonDays',
        2
      )
    );

  if (
    diffDays <= dueSoonDays
  ) {
    return {
      label: 'Due soon',
      tone: 'warning',
      message:
        diffDays +
        ' days remaining'
    };
  }


  /* ----------------------------------------------------------------------
   * ON TRACK
   * -------------------------------------------------------------------- */

  return {
    label: 'On track',
    tone: 'success',
    message:
      diffDays +
      ' days remaining'
  };
}


/* ==========================================================================
 * FORMAT HELPERS
 * ========================================================================== */

function safeTaskDetailString_(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value);
}


function normalizeTaskDetailNumber_(
  value,
  fallback
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : fallback;
}


function normalizeTaskDetailProgress_(
  value
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(number)
    )
  );
}


function normalizeTaskDetailSmartScore_(
  value
) {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(number)
    )
  );
}


function normalizeTaskDetailDateObject_(
  value
) {
  if (!value) {
    return null;
  }

  if (
    Object.prototype
      .toString
      .call(value) ===
    '[object Date]'
  ) {
    return isNaN(
      value.getTime()
    )
      ? null
      : value;
  }

  const parsed =
    new Date(value);

  return isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;
}


function taskDetailStartOfDay_(
  date
) {
  const value =
    new Date(date);

  value.setHours(
    0,
    0,
    0,
    0
  );

  return value;
}


function formatTaskDetailDate_(
  value
) {
  const date =
    normalizeTaskDetailDateObject_(
      value
    );

  if (!date) {
    return '';
  }

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'dd MMM yyyy'
  );
}


function formatTaskDetailDateTime_(
  value
) {
  const date =
    normalizeTaskDetailDateObject_(
      value
    );

  if (!date) {
    return '';
  }

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'dd MMM yyyy HH:mm'
  );
}


function formatTaskDetailInputDate_(
  value
) {
  const date =
    normalizeTaskDetailDateObject_(
      value
    );

  if (!date) {
    return '';
  }

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd'
  );
}


function parseTaskDetailInputDate_(
  value
) {
  if (!value) {
    return null;
  }

  const match = String(
    value
  )
    .trim()
    .match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (!match) {
    return null;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]) - 1;

  const day =
    Number(match[3]);

  const date =
    new Date(
      year,
      month,
      day,
      12,
      0,
      0,
      0
    );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}


/* ==========================================================================
 * HTML
 * ========================================================================== */

/**
 * Build Task Details sidebar HTML.
 *
 * @param {string} taskId
 * @return {string}
 */
function buildTaskDetailsHtml_(
  taskId
) {
  const encodedTaskId =
    JSON.stringify(
      String(
        taskId || ''
      )
    );

  return `
<!DOCTYPE html>
<html>

<head>

  <base target="_top">

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <style>

    :root {

      --primary:
        ${COLORS.primary};

      --primary-hover:
        ${COLORS.primaryHover};

      --primary-light:
        ${COLORS.primaryLight};

      --success:
        ${COLORS.success};

      --warning:
        ${COLORS.warning};

      --danger:
        ${COLORS.danger};

      --info:
        ${COLORS.info};

      --background:
        ${COLORS.background};

      --surface:
        ${COLORS.surface};

      --surface-2:
        ${COLORS.surface2};

      --text:
        ${COLORS.text};

      --text-2:
        ${COLORS.text2};

      --muted:
        ${COLORS.muted};

      --border:
        ${COLORS.border};

    }


    * {
      box-sizing:
        border-box;
    }


    html,
    body {
      margin: 0;
      padding: 0;

      background:
        var(--background);

      color:
        var(--text);

      font-family:
        Inter,
        Arial,
        Helvetica,
        sans-serif;
    }


    body {
      font-size: 13px;
    }


    button,
    select,
    input {
      font-family:
        inherit;
    }


    .app {
      min-height:
        100vh;

      padding:
        14px;
    }


    /* ================================================================
     * LOADING
     * ================================================================ */

    .loading {
      min-height:
        260px;

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      color:
        var(--text-2);
    }


    .loader {
      width:
        25px;

      height:
        25px;

      border-radius:
        999px;

      border:
        3px solid
        var(--border);

      border-top-color:
        var(--primary);

      animation:
        spin .8s linear infinite;

      margin-right:
        10px;
    }


    @keyframes spin {

      to {
        transform:
          rotate(360deg);
      }

    }


    /* ================================================================
     * ERROR STATE
     * ================================================================ */

    .error-state {
      padding:
        28px 18px;

      text-align:
        center;

      background:
        var(--surface);

      border:
        1px solid
        var(--border);

      border-radius:
        14px;
    }


    .error-icon {
      font-size:
        30px;

      margin-bottom:
        10px;
    }


    .error-title {
      font-size:
        16px;

      font-weight:
        700;

      margin-bottom:
        6px;
    }


    .error-message {
      line-height:
        1.55;

      color:
        var(--text-2);
    }


    /* ================================================================
     * HEADER
     * ================================================================ */

    .header {
      margin-bottom:
        14px;
    }


    .task-id {
      color:
        var(--muted);

      font-size:
        10px;

      font-weight:
        700;

      letter-spacing:
        .05em;

      text-transform:
        uppercase;

      margin-bottom:
        6px;
    }


    .task-name {
      font-size:
        20px;

      line-height:
        1.3;

      font-weight:
        800;

      letter-spacing:
        -.02em;

      margin:
        0 0 10px;
    }


    /* ================================================================
     * BADGES
     * ================================================================ */

    .badge-row {
      display:
        flex;

      flex-wrap:
        wrap;

      gap:
        6px;
    }


    .badge {
      display:
        inline-flex;

      align-items:
        center;

      min-height:
        24px;

      padding:
        4px 8px;

      border-radius:
        999px;

      font-size:
        11px;

      font-weight:
        700;

      background:
        var(--surface-2);

      color:
        var(--text-2);

      border:
        1px solid
        var(--border);
    }


    .badge-primary {
      background:
        var(--primary-light);

      color:
        var(--primary);

      border-color:
        transparent;
    }


    .badge-success {
      color:
        #15803d;

      background:
        #f0fdf4;

      border-color:
        #bbf7d0;
    }


    .badge-warning {
      color:
        #b45309;

      background:
        #fffbeb;

      border-color:
        #fde68a;
    }


    .badge-danger {
      color:
        var(--danger);

      background:
        #fef2f2;

      border-color:
        #fecaca;
    }


    /* ================================================================
     * CARD
     * ================================================================ */

    .card {
      background:
        var(--surface);

      border:
        1px solid
        var(--border);

      border-radius:
        14px;

      margin-bottom:
        12px;

      overflow:
        hidden;
    }


    .card-head {
      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      padding:
        13px 14px 8px;
    }


    .card-title {
      color:
        var(--text-2);

      font-size:
        10px;

      font-weight:
        800;

      letter-spacing:
        .08em;

      text-transform:
        uppercase;
    }


    .card-body {
      padding:
        5px 14px 14px;
    }


    /* ================================================================
     * TASK INFORMATION
     * ================================================================ */

    .description {
      line-height:
        1.6;

      white-space:
        pre-wrap;

      color:
        var(--text);
    }


    .empty {
      color:
        var(--muted);

      font-style:
        italic;
    }


    .info-grid {
      display:
        grid;

      grid-template-columns:
        1fr 1fr;

      gap:
        12px 10px;
    }


    .field {
      min-width:
        0;
    }


    .field-wide {
      grid-column:
        1 / -1;
    }


    .label {
      font-size:
        10px;

      font-weight:
        700;

      color:
        var(--muted);

      margin-bottom:
        4px;

      text-transform:
        uppercase;

      letter-spacing:
        .04em;
    }


    .value {
      line-height:
        1.4;

      font-weight:
        600;

      overflow-wrap:
        anywhere;
    }


    /* ================================================================
     * PROGRESS
     * ================================================================ */

    .progress-value {
      font-size:
        12px;

      font-weight:
        800;
    }


    .progress-track {
      width:
        100%;

      height:
        8px;

      border-radius:
        999px;

      overflow:
        hidden;

      background:
        var(--surface-2);
    }


    .progress-bar {
      height:
        100%;

      border-radius:
        999px;

      background:
        var(--primary);

      transition:
        width .2s ease;
    }


    /* ================================================================
     * SMART SCORE
     * ================================================================ */

    .smart-score {
      display:
        flex;

      align-items:
        center;

      gap:
        12px;

      margin-bottom:
        14px;
    }


    .score-ring {
      width:
        62px;

      height:
        62px;

      border-radius:
        50%;

      background:
        radial-gradient(
          closest-side,
          white 74%,
          transparent 75% 100%
        ),
        conic-gradient(
          var(--primary)
          var(--score-angle),
          var(--surface-2)
          0
        );

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      flex:
        none;
    }


    .score-number {
      font-size:
        18px;

      font-weight:
        800;
    }


    .smart-meta {
      min-width:
        0;
    }


    .smart-title {
      font-size:
        13px;

      font-weight:
        800;

      margin-bottom:
        5px;
    }


    .smart-caption {
      color:
        var(--text-2);

      line-height:
        1.45;
    }


    .recommendation {
      padding:
        11px;

      border-radius:
        10px;

      background:
        var(--primary-light);

      border:
        1px solid
        #e0e7ff;

      line-height:
        1.55;
    }


    .recommendation-title {
      color:
        var(--primary);

      font-size:
        10px;

      font-weight:
        800;

      letter-spacing:
        .04em;

      text-transform:
        uppercase;

      margin-bottom:
        5px;
    }


    /* ================================================================
     * QUICK EDIT
     * ================================================================ */

    .quick-grid {
      display:
        grid;

      gap:
        10px;
    }


    .control-label {
      display:
        block;

      color:
        var(--text-2);

      font-size:
        11px;

      font-weight:
        700;

      margin-bottom:
        5px;
    }


    .control {
      width:
        100%;

      height:
        36px;

      padding:
        0 10px;

      background:
        var(--surface);

      border:
        1px solid
        var(--border);

      border-radius:
        8px;

      color:
        var(--text);

      outline:
        none;
    }


    .control:focus {
      border-color:
        var(--primary);

      box-shadow:
        0 0 0 2px
        var(--primary-light);
    }


    .range-row {
      display:
        grid;

      grid-template-columns:
        1fr 48px;

      align-items:
        center;

      gap:
        8px;
    }


    .range {
      width:
        100%;

      accent-color:
        var(--primary);
    }


    .range-value {
      text-align:
        right;

      font-weight:
        800;

      color:
        var(--primary);
    }


    /* ================================================================
     * ACTIONS
     * ================================================================ */

    .actions {
      display:
        grid;

      gap:
        8px;

      margin-top:
        14px;
    }


    .btn {
      width:
        100%;

      min-height:
        38px;

      border-radius:
        9px;

      border:
        1px solid
        transparent;

      cursor:
        pointer;

      font-weight:
        700;

      font-size:
        12px;

      transition:
        transform .1s ease,
        background .15s ease;
    }


    .btn:active {
      transform:
        translateY(1px);
    }


    .btn:disabled {
      opacity:
        .55;

      cursor:
        default;
    }


    .btn-primary {
      color:
        white;

      background:
        var(--primary);
    }


    .btn-primary:hover {
      background:
        var(--primary-hover);
    }


    .btn-secondary {
      background:
        var(--surface);

      color:
        var(--text);

      border-color:
        var(--border);
    }


    .btn-danger {
      background:
        #fef2f2;

      color:
        var(--danger);

      border-color:
        #fecaca;
    }


    /* ================================================================
     * METADATA
     * ================================================================ */

    .metadata {
      color:
        var(--text-2);

      font-size:
        11px;

      line-height:
        1.65;
    }


    .metadata strong {
      color:
        var(--text);

      font-weight:
        700;
    }


    /* ================================================================
     * TOAST
     * ================================================================ */

    .toast {
      position:
        fixed;

      left:
        14px;

      right:
        14px;

      bottom:
        14px;

      padding:
        11px 12px;

      border-radius:
        10px;

      color:
        white;

      background:
        #0f172a;

      box-shadow:
        0 10px 24px
        rgba(15, 23, 42, .18);

      font-size:
        12px;

      line-height:
        1.4;

      opacity:
        0;

      transform:
        translateY(12px);

      pointer-events:
        none;

      transition:
        opacity .18s ease,
        transform .18s ease;

      z-index:
        999;
    }


    .toast.show {
      opacity:
        1;

      transform:
        translateY(0);
    }

  </style>

</head>


<body>

  <div
    class="app"
    id="app"
  >

    <div class="loading">

      <div class="loader"></div>

      Loading task...

    </div>

  </div>


  <div
    id="toast"
    class="toast"
  ></div>


<script>

  const TASK_ID =
    ${encodedTaskId};


  let currentData =
    null;


  let loadingTimeout =
    null;


  document.addEventListener(
    'DOMContentLoaded',
    function () {
      loadTask();
    }
  );


  /* ======================================================================
   * LOAD TASK
   * ====================================================================== */

  function loadTask() {

    const app =
      document.getElementById(
        'app'
      );


    app.innerHTML = \`

      <div class="loading">

        <div class="loader"></div>

        Loading task...

      </div>

    \`;


    if (loadingTimeout) {

      window.clearTimeout(
        loadingTimeout
      );

    }


    loadingTimeout =
      window.setTimeout(
        function () {

          const loading =
            document.querySelector(
              '.loading'
            );


          if (!loading) {
            return;
          }


          app.innerHTML = \`

            <div class="error-state">

              <div class="error-icon">
                !
              </div>

              <div class="error-title">
                Loading is taking too long
              </div>

              <div class="error-message">

                Smart Task Manager could not
                load this task.

                <br><br>

                Please try again.

              </div>

              <div
                style="height:12px"
              ></div>

              <button
                class="btn btn-secondary"
                onclick="loadTask()"
              >
                Try Again
              </button>

            </div>

          \`;

        },
        10000
      );


    /*
     * IMPORTANT:
     *
     * This MUST call the public wrapper:
     *
     * getTaskDetailsPayload()
     *
     * NOT:
     *
     * getTaskDetailsPayload_()
     */

    google.script.run

      .withSuccessHandler(
        function (payload) {

          window.clearTimeout(
            loadingTimeout
          );

          renderTask(
            payload
          );

        }
      )

      .withFailureHandler(
        function (error) {

          window.clearTimeout(
            loadingTimeout
          );

          showError(
            error
          );

        }
      )

      .getTaskDetailsPayload(
        TASK_ID
      );

  }


  /* ======================================================================
   * RENDER
   * ====================================================================== */

  function renderTask(
    payload
  ) {

    currentData =
      payload;


    if (
      !payload ||
      !payload.success
    ) {

      renderNotFound(
        payload &&
        payload.message
          ? payload.message
          : 'Unable to load task.'
      );

      return;

    }


    const task =
      payload.task;


    const lists =
      payload.lists;


    const score =
      task.SmartScore === null ||
      task.SmartScore === undefined
        ? 0
        : task.SmartScore;


    const deadline =
      task.DeadlineStatus ||
      {
        label:
          'No deadline',

        tone:
          'neutral',

        message:
          ''
      };


    const app =
      document.getElementById(
        'app'
      );


    app.innerHTML = \`

      <!-- ===========================================================
           HEADER
           =========================================================== -->

      <section class="header">

        <div class="task-id">
          \${escapeHtml(
            task.TaskId
          )}
        </div>


        <h1 class="task-name">

          \${escapeHtml(
            task.TaskName ||
            'Untitled task'
          )}

        </h1>


        <div class="badge-row">


          <span
            class="badge badge-primary"
          >

            \${escapeHtml(
              task.Status ||
              'No status'
            )}

          </span>


          <span
            class="badge"
          >

            \${escapeHtml(
              task.Priority ||
              'No priority'
            )}

          </span>


          <span
            class="
              badge
              \${deadlineBadgeClass(
                deadline.tone
              )}
            "
          >

            \${escapeHtml(
              deadline.label
            )}

          </span>


        </div>

      </section>


      <!-- ===========================================================
           TASK INFORMATION
           =========================================================== -->

      <section class="card">

        <div class="card-head">

          <div class="card-title">
            Task Information
          </div>

        </div>


        <div class="card-body">


          <div class="description">

            \${
              task.Description
                ? escapeHtml(
                    task.Description
                  )
                : '<span class="empty">No description</span>'
            }

          </div>


          <div
            style="height:14px"
          ></div>


          <div class="info-grid">

            \${fieldHtml(
              'Area',
              task.Area ||
              '—'
            )}


            \${fieldHtml(
              'Project',
              task.ProjectName ||
              task.Project ||
              '—'
            )}


            \${fieldHtml(
              'Category',
              task.Category ||
              '—'
            )}


            \${fieldHtml(
              'Tags',
              task.Tags ||
              '—'
            )}

          </div>


        </div>

      </section>


      <!-- ===========================================================
           SCHEDULE
           =========================================================== -->

      <section class="card">

        <div class="card-head">

          <div class="card-title">
            Schedule
          </div>

        </div>


        <div class="card-body">

          <div class="info-grid">


            \${fieldHtml(
              'Start Date',
              task.StartDate ||
              '—'
            )}


            \${fieldHtml(
              'Due Date',
              task.DueDate ||
              '—'
            )}


            \${fieldHtml(
              'Due Time',
              task.DueTime ||
              '—'
            )}


            \${fieldHtml(
              'Recurring',
              task.RecurringType ||
              'None'
            )}


            \${fieldHtml(
              'Estimate',
              formatMinutes(
                task.EstimateMinutes
              )
            )}


            \${fieldHtml(
              'Deadline',
              deadline.message ||
              deadline.label
            )}


          </div>

        </div>

      </section>


      <!-- ===========================================================
           PROGRESS
           =========================================================== -->

      <section class="card">

        <div class="card-head">

          <div class="card-title">
            Progress
          </div>


          <div class="progress-value">

            \${task.Progress}%

          </div>

        </div>


        <div class="card-body">


          <div class="progress-track">

            <div
              class="progress-bar"

              style="
                width:
                \${task.Progress}%
              "
            ></div>

          </div>


          <div
            style="height:13px"
          ></div>


          <div class="info-grid">


            \${fieldHtml(
              'Status',
              task.Status ||
              '—'
            )}


            \${fieldHtml(
              'Completed',
              task.CompletedDate ||
              '—'
            )}


          </div>

        </div>

      </section>


      <!-- ===========================================================
           SMART ANALYSIS
           =========================================================== -->

      <section class="card">

        <div class="card-head">

          <div class="card-title">
            Smart Analysis
          </div>

        </div>


        <div class="card-body">


          <div class="smart-score">


            <div
              class="score-ring"

              style="
                --score-angle:
                \${score * 3.6}deg
              "
            >

              <div class="score-number">

                \${
                  task.SmartScore === null
                    ? '—'
                    : escapeHtml(
                        String(
                          task.SmartScore
                        )
                      )
                }

              </div>

            </div>


            <div class="smart-meta">


              <div class="smart-title">
                Smart Score
              </div>


              <div class="smart-caption">

                Risk:

                <strong>

                  \${escapeHtml(
                    task.Risk ||
                    'Not calculated'
                  )}

                </strong>


                <br>


                \${escapeHtml(
                  deadline.message
                )}

              </div>


            </div>


          </div>


          <div class="recommendation">


            <div class="recommendation-title">

              Recommended Action

            </div>


            <div>

              \${
                task.RecommendedAction
                  ? escapeHtml(
                      task.RecommendedAction
                    )
                  : 'No recommendation available.'
              }

            </div>


          </div>


        </div>

      </section>


      <!-- ===========================================================
           PERSONAL PRODUCTIVITY
           =========================================================== -->

      <section class="card">

        <div class="card-head">

          <div class="card-title">
            Personal Productivity
          </div>

        </div>


        <div class="card-body">


          <div class="info-grid">


            \${fieldHtml(
              'Energy',
              task.Energy ||
              'Any'
            )}


            \${fieldHtml(
              'Context',
              task.Context ||
              'Anywhere'
            )}


            \${fieldHtml(
              'Goal',

              task.GoalName ||
              task.GoalId ||
              '—',

              true
            )}


          </div>


        </div>

      </section>


      <!-- ===========================================================
           QUICK EDIT
           =========================================================== -->

      <section class="card">

        <div class="card-head">

          <div class="card-title">
            Quick Edit
          </div>

        </div>


        <div class="card-body">


          <div class="quick-grid">


            <!-- STATUS -->

            <div>

              <label
                class="control-label"
              >
                Status
              </label>


              <select
                id="editStatus"

                class="control"

                onchange="
                  quickUpdate(
                    'Status',
                    this.value
                  )
                "
              >

                \${optionsHtml(
                  lists.Status,
                  task.Status
                )}

              </select>

            </div>


            <!-- PRIORITY -->

            <div>

              <label
                class="control-label"
              >
                Priority
              </label>


              <select
                id="editPriority"

                class="control"

                onchange="
                  quickUpdate(
                    'Priority',
                    this.value
                  )
                "
              >

                \${optionsHtml(
                  lists.Priority,
                  task.Priority
                )}

              </select>

            </div>


            <!-- DUE DATE -->

            <div>

              <label
                class="control-label"
              >
                Due Date
              </label>


              <input
                id="editDueDate"

                class="control"

                type="date"

                value="
                  \${escapeAttribute(
                    task.DueDateInput ||
                    ''
                  )}
                "

                onchange="
                  quickUpdate(
                    'DueDate',
                    this.value
                  )
                "
              >

            </div>


            <!-- PROGRESS -->

            <div>

              <label
                class="control-label"
              >
                Progress
              </label>


              <div class="range-row">


                <input
                  id="editProgress"

                  class="range"

                  type="range"

                  min="0"

                  max="100"

                  step="5"

                  value="
                    \${task.Progress}
                  "

                  oninput="
                    document
                      .getElementById(
                        'progressRangeValue'
                      )
                      .textContent =
                        this.value + '%'
                  "

                  onchange="
                    quickUpdate(
                      'Progress',
                      Number(
                        this.value
                      )
                    )
                  "
                >


                <div
                  id="progressRangeValue"

                  class="range-value"
                >

                  \${task.Progress}%

                </div>


              </div>

            </div>


          </div>


          <!-- ACTIONS -->

          <div class="actions">


            <button
              class="
                btn
                btn-primary
              "

              onclick="
                completeTask()
              "

              \${
                task.Status ===
                'Completed'
                  ? 'disabled'
                  : ''
              }
            >

              ✓ Mark Complete

            </button>


            <button
              class="
                btn
                btn-secondary
              "

              onclick="
                loadTask()
              "
            >

              ↻ Refresh

            </button>


            <button
              class="
                btn
                btn-danger
              "

              onclick="
                deleteTask()
              "
            >

              Delete Task

            </button>


          </div>


        </div>

      </section>


      <!-- ===========================================================
           METADATA
           =========================================================== -->

      <section class="card">


        <div class="card-head">

          <div class="card-title">
            Metadata
          </div>

        </div>


        <div class="
          card-body
          metadata
        ">


          <div>

            <strong>
              Created
            </strong>

            <br>

            \${escapeHtml(
              task.CreatedAt ||
              '—'
            )}

          </div>


          <div
            style="height:7px"
          ></div>


          <div>

            <strong>
              Updated
            </strong>

            <br>

            \${escapeHtml(
              task.UpdatedAt ||
              '—'
            )}

          </div>


          <div
            style="height:7px"
          ></div>


          <div>

            <strong>
              Last Status Change
            </strong>

            <br>

            \${escapeHtml(
              task.LastStatusChangedAt ||
              '—'
            )}

          </div>


          <div
            style="height:7px"
          ></div>


          <div>

            <strong>
              Task ID
            </strong>

            <br>

            \${escapeHtml(
              task.TaskId
            )}

          </div>


        </div>

      </section>

    \`;

  }


  /* ======================================================================
   * QUICK UPDATE
   * ====================================================================== */

  function quickUpdate(
    field,
    value
  ) {

    setControlsDisabled(
      true
    );


    /*
     * IMPORTANT:
     * Public wrapper without "_".
     */

    google.script.run

      .withSuccessHandler(
        function (payload) {

          renderTask(
            payload
          );

          showToast(
            'Task updated.'
          );

        }
      )

      .withFailureHandler(
        function (error) {

          setControlsDisabled(
            false
          );

          showErrorToast(
            error
          );


          /*
           * Reload original server state
           * after a failed update.
           */

          window.setTimeout(
            function () {
              loadTask();
            },
            800
          );

        }
      )

      .updateTaskQuickField(
        TASK_ID,
        field,
        value
      );

  }


  /* ======================================================================
   * COMPLETE
   * ====================================================================== */

  function completeTask() {

    const confirmed =
      window.confirm(
        'Mark this task as completed?'
      );


    if (!confirmed) {
      return;
    }


    setControlsDisabled(
      true
    );


    google.script.run

      .withSuccessHandler(
        function (payload) {

          renderTask(
            payload
          );

          showToast(
            'Task completed.'
          );

        }
      )

      .withFailureHandler(
        function (error) {

          setControlsDisabled(
            false
          );

          showErrorToast(
            error
          );

        }
      )

      .completeTaskFromDetails(
        TASK_ID
      );

  }


  /* ======================================================================
   * DELETE
   * ====================================================================== */

  function deleteTask() {

    const taskName =
      currentData &&
      currentData.task
        ? currentData
            .task
            .TaskName
        : TASK_ID;


    const confirmed =
      window.confirm(
        'Delete "' +
        taskName +
        '"?\\n\\n' +
        'This action cannot be undone.'
      );


    if (!confirmed) {
      return;
    }


    setControlsDisabled(
      true
    );


    google.script.run

      .withSuccessHandler(
        function () {

          document
            .getElementById(
              'app'
            )
            .innerHTML = \`

              <div class="error-state">

                <div class="error-icon">
                  ✓
                </div>

                <div class="error-title">
                  Task deleted
                </div>

                <div class="error-message">

                  The task was removed
                  successfully.

                </div>

              </div>

            \`;


          showToast(
            'Task deleted.'
          );

        }
      )

      .withFailureHandler(
        function (error) {

          setControlsDisabled(
            false
          );

          showErrorToast(
            error
          );

        }
      )

      .deleteTaskFromDetails(
        TASK_ID
      );

  }


  /* ======================================================================
   * ERROR UI
   * ====================================================================== */

  function renderNotFound(
    message
  ) {

    document
      .getElementById(
        'app'
      )
      .innerHTML = \`

        <div class="error-state">

          <div class="error-icon">
            ⌕
          </div>

          <div class="error-title">
            Task not found
          </div>

          <div class="error-message">

            \${escapeHtml(
              message
            )}

          </div>

        </div>

      \`;

  }


  function showError(
    error
  ) {

    const message =
      error &&
      error.message
        ? error.message
        : String(
            error ||
            'Unknown error'
          );


    document
      .getElementById(
        'app'
      )
      .innerHTML = \`

        <div class="error-state">

          <div class="error-icon">
            !
          </div>

          <div class="error-title">
            Unable to load task
          </div>

          <div class="error-message">

            \${escapeHtml(
              message
            )}

          </div>

          <div
            style="height:12px"
          ></div>

          <button
            class="
              btn
              btn-secondary
            "

            onclick="
              loadTask()
            "
          >

            Try Again

          </button>

        </div>

      \`;

  }


  /* ======================================================================
   * CONTROLS
   * ====================================================================== */

  function setControlsDisabled(
    disabled
  ) {

    document
      .querySelectorAll(
        'button, select, input'
      )
      .forEach(
        function (element) {

          element.disabled =
            disabled;

        }
      );

  }


  /* ======================================================================
   * TOAST
   * ====================================================================== */

  function showErrorToast(
    error
  ) {

    const message =
      error &&
      error.message
        ? error.message
        : String(
            error ||
            'Something went wrong.'
          );


    showToast(
      message
    );

  }


  function showToast(
    message
  ) {

    const toast =
      document.getElementById(
        'toast'
      );


    toast.textContent =
      message;


    toast.classList.add(
      'show'
    );


    window.clearTimeout(
      window
        .__taskDetailToastTimer
    );


    window
      .__taskDetailToastTimer =
        window.setTimeout(
          function () {

            toast.classList.remove(
              'show'
            );

          },
          2600
        );

  }


  /* ======================================================================
   * HTML HELPERS
   * ====================================================================== */

  function fieldHtml(
    label,
    value,
    wide
  ) {

    return \`

      <div
        class="
          field
          \${wide
            ? 'field-wide'
            : ''
          }
        "
      >

        <div class="label">

          \${escapeHtml(
            label
          )}

        </div>


        <div class="value">

          \${escapeHtml(
            value ||
            '—'
          )}

        </div>

      </div>

    \`;

  }


  function optionsHtml(
    items,
    selected
  ) {

    return (
      items || []
    )

      .map(
        function (item) {

          const isSelected =
            String(item) ===
            String(selected);


          return \`

            <option
              value="
                \${escapeAttribute(
                  item
                )}
              "

              \${
                isSelected
                  ? 'selected'
                  : ''
              }
            >

              \${escapeHtml(
                item
              )}

            </option>

          \`;

        }
      )

      .join('');

  }


  function deadlineBadgeClass(
    tone
  ) {

    if (
      tone === 'success'
    ) {
      return 'badge-success';
    }


    if (
      tone === 'warning'
    ) {
      return 'badge-warning';
    }


    if (
      tone === 'danger'
    ) {
      return 'badge-danger';
    }


    return '';

  }


  function formatMinutes(
    value
  ) {

    const minutes =
      Number(
        value || 0
      );


    if (!minutes) {
      return '—';
    }


    if (
      minutes < 60
    ) {
      return (
        minutes +
        ' min'
      );
    }


    const hours =
      Math.floor(
        minutes / 60
      );


    const remaining =
      minutes % 60;


    if (!remaining) {
      return (
        hours +
        ' hr'
      );
    }


    return (
      hours +
      ' hr ' +
      remaining +
      ' min'
    );

  }


  function escapeHtml(
    value
  ) {

    return String(
      value === null ||
      value === undefined
        ? ''
        : value
    )

      .replace(
        /&/g,
        '&amp;'
      )

      .replace(
        /</g,
        '&lt;'
      )

      .replace(
        />/g,
        '&gt;'
      )

      .replace(
        /"/g,
        '&quot;'
      )

      .replace(
        /'/g,
        '&#039;'
      );

  }


  function escapeAttribute(
    value
  ) {

    return escapeHtml(
      value
    );

  }

</script>

</body>

</html>
  `;
}