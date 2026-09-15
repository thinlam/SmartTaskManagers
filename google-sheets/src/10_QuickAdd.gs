/**
 * 10_QuickAdd.gs
 * -----------------------------------------------------------------------
 * FRAME 07 — QUICK ADD TASK
 *
 * Professional Quick Add sidebar for the personal Smart Task Manager.
 * Uses createTask_() as the single source of truth.
 * -----------------------------------------------------------------------
 */


/* ==========================================================================
 * ENTRY POINT
 * ========================================================================== */

function showQuickAddTask_() {
  const html = HtmlService
    .createHtmlOutput(buildQuickAddHtml_())
    .setTitle('Quick Add Task');

  SpreadsheetApp.getUi().showSidebar(html);
}


/* ==========================================================================
 * PUBLIC SIDEBAR API
 * ========================================================================== */

function getQuickAddFormData() {
  return getQuickAddFormData_();
}


function createQuickAddTask(payload) {
  return createQuickAddTask_(payload);
}


function openCreatedTask(taskId) {
  taskId = String(taskId || '').trim();

  if (!taskId) {
    throw new Error('TaskId is required.');
  }

  showTaskDetails_(taskId);

  return true;
}


/* ==========================================================================
 * FORM DATA
 * ========================================================================== */

function getQuickAddFormData_() {
  const projects =
    getAllProjects_();

  const goals =
    getAllGoals_();

  const tasks =
    getAllTasks_();


  const openTasks =
    tasks

      .filter(
        function (task) {
          return (
            String(
              task.Status || ''
            ) !== 'Completed'
          );
        }
      )

      .map(
        function (task) {
          return {
            id:
              String(
                task.TaskId || ''
              ),

            name:
              String(
                task.TaskName || ''
              )
          };
        }
      );


  return {
    success: true,

    defaults: {
      status:
        String(
          getSetting_(
            'DefaultStatus',
            'Inbox'
          ) || 'Inbox'
        ),

      priority:
        String(
          getSetting_(
            'DefaultPriority',
            'Medium'
          ) || 'Medium'
        ),

      estimateMinutes:
        Number(
          getSetting_(
            'DefaultEstimateMinutes',
            30
          )
        ) || 30,

      energy:
        'Any',

      context:
        'Anywhere',

      recurringType:
        'None'
    },


    lists: {

      areas:
        getQuickAddLookup_(
          'Area',
          [
            'Career',
            'Learning',
            'Health',
            'Personal',
            'Personal Admin'
          ]
        ),


      priorities:
        getQuickAddLookup_(
          'Priority',
          [
            'Critical',
            'Urgent',
            'High',
            'Medium',
            'Low'
          ]
        ),


      statuses:
        getQuickAddLookup_(
          'Status',
          [
            'Inbox',
            'To Do',
            'In Progress',
            'Waiting',
            'Completed'
          ]
        ),


      energy:
        getQuickAddLookup_(
          'Energy',
          [
            'High',
            'Medium',
            'Low',
            'Any'
          ]
        ),


      contexts:
        getQuickAddLookup_(
          'Context',
          [
            'Computer',
            'Phone',
            'Anywhere',
            'Errand',
            'Home'
          ]
        ),


      recurring:
        getQuickAddLookup_(
          'RecurringType',
          [
            'None',
            'Daily',
            'Weekly',
            'Monthly'
          ]
        )
    },


    projects:
      projects.map(
        function (project) {
          return {
            id:
              String(
                project.ProjectId || ''
              ),

            name:
              String(
                project.ProjectName || ''
              )
          };
        }
      ),


    goals:
      goals.map(
        function (goal) {
          return {
            id:
              String(
                goal.GoalId || ''
              ),

            name:
              String(
                goal.GoalName || ''
              )
          };
        }
      ),


    dependencies:
      openTasks
  };
}


/* ==========================================================================
 * CREATE TASK
 * ========================================================================== */

function createQuickAddTask_(
  payload
) {
  payload =
    payload || {};


  /* ----------------------------------------------------------------------
   * TASK NAME
   * -------------------------------------------------------------------- */

  const taskName =
    String(
      payload.TaskName || ''
    ).trim();


  if (!taskName) {
    throw new Error(
      'Task name is required.'
    );
  }


  if (
    taskName.length >
    160
  ) {
    throw new Error(
      'Task name must be 160 characters or fewer.'
    );
  }


  /* ----------------------------------------------------------------------
   * VALUES
   * -------------------------------------------------------------------- */

  const priority =
    String(
      payload.Priority || ''
    ).trim();


  const status =
    String(
      payload.Status || ''
    ).trim();


  const energy =
    String(
      payload.Energy ||
      'Any'
    ).trim();


  const context =
    String(
      payload.Context ||
      'Anywhere'
    ).trim();


  const recurringType =
    String(
      payload.RecurringType ||
      'None'
    ).trim();


  /* ----------------------------------------------------------------------
   * VALIDATE LOOKUPS
   * -------------------------------------------------------------------- */

  validateQuickAddLookup_(
    'Priority',
    priority
  );


  validateQuickAddLookup_(
    'Status',
    status
  );


  validateQuickAddLookup_(
    'Energy',
    energy
  );


  validateQuickAddLookup_(
    'Context',
    context
  );


  validateQuickAddLookup_(
    'RecurringType',
    recurringType
  );


  /* ----------------------------------------------------------------------
   * ESTIMATE
   * -------------------------------------------------------------------- */

  let estimate =
    Number(
      payload.EstimateMinutes
    );


  if (
    !Number.isFinite(
      estimate
    ) ||
    estimate < 0
  ) {
    estimate =
      Number(
        getSetting_(
          'DefaultEstimateMinutes',
          30
        )
      ) || 30;
  }


  estimate =
    Math.round(
      estimate
    );


  /* ----------------------------------------------------------------------
   * DATES
   * -------------------------------------------------------------------- */

  const startDate =
    parseQuickAddDate_(
      payload.StartDate
    );


  const dueDate =
    parseQuickAddDate_(
      payload.DueDate
    );


  if (
    startDate &&
    dueDate &&
    dueDate.getTime() <
      startDate.getTime()
  ) {
    throw new Error(
      'Due date cannot be before start date.'
    );
  }


  /* ----------------------------------------------------------------------
   * TASK FIELDS
   * -------------------------------------------------------------------- */

  const fields = {

    TaskName:
      taskName,


    Description:
      String(
        payload.Description || ''
      ).trim(),


    Area:
      String(
        payload.Area || ''
      ).trim(),


    Project:
      String(
        payload.Project || ''
      ).trim(),


    Category:
      String(
        payload.Category || ''
      ).trim(),


    Tags:
      String(
        payload.Tags || ''
      ).trim(),


    Priority:
      priority ||
      getSetting_(
        'DefaultPriority',
        'Medium'
      ),


    Status:
      status ||
      getSetting_(
        'DefaultStatus',
        'Inbox'
      ),


    StartDate:
      startDate || '',


    DueDate:
      dueDate || '',


    DueTime:
      normalizeQuickAddTime_(
        payload.DueTime
      ),


    Progress:
      0,


    EstimateMinutes:
      estimate,


    Energy:
      energy ||
      'Any',


    Context:
      context ||
      'Anywhere',


    GoalId:
      String(
        payload.GoalId || ''
      ).trim(),


    RecurringType:
      recurringType ||
      'None',


    DependencyTaskId:
      String(
        payload.DependencyTaskId ||
        ''
      ).trim(),


    Notes:
      String(
        payload.Notes || ''
      ).trim()
  };


  /* ----------------------------------------------------------------------
   * COMPLETED
   * -------------------------------------------------------------------- */

  if (
    fields.Status ===
    'Completed'
  ) {
    fields.Progress =
      100;

    fields.CompletedDate =
      now_();
  }


  /* ----------------------------------------------------------------------
   * CREATE
   * -------------------------------------------------------------------- */

  const taskId =
    createTask_(
      fields
    );


  /* ----------------------------------------------------------------------
   * REFRESH
   * -------------------------------------------------------------------- */

  try {

    if (
      typeof refreshViewsAfterTaskChange_ ===
      'function'
    ) {
      refreshViewsAfterTaskChange_();
    } else {
      refreshQuickAddViews_();
    }

  } catch (error) {

    console.warn(
      'Quick Add refresh skipped:',
      error &&
      error.message
        ? error.message
        : error
    );

  }


  return {
    success:
      true,

    taskId:
      taskId,

    taskName:
      taskName
  };
}


/* ==========================================================================
 * REFRESH
 * ========================================================================== */

function refreshQuickAddViews_() {

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
      error.message
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
      error.message
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
      'Tasks refresh skipped:',
      error.message
    );

  }
}


/* ==========================================================================
 * VALIDATION / HELPERS
 * ========================================================================== */

function getQuickAddLookup_(
  key,
  fallback
) {

  if (
    typeof LOOKUP_LISTS !==
      'undefined' &&
    LOOKUP_LISTS &&
    Array.isArray(
      LOOKUP_LISTS[key]
    )
  ) {
    return LOOKUP_LISTS[
      key
    ].slice();
  }


  return (
    fallback || []
  ).slice();
}


function validateQuickAddLookup_(
  key,
  value
) {

  if (!value) {
    return;
  }


  const values =
    getQuickAddLookup_(
      key,
      []
    );


  if (
    values.length > 0 &&
    values.indexOf(
      value
    ) === -1
  ) {
    throw new Error(
      'Invalid ' +
      key +
      ': ' +
      value
    );
  }
}


function parseQuickAddDate_(
  value
) {

  value =
    String(
      value || ''
    ).trim();


  if (!value) {
    return null;
  }


  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );


  if (!match) {
    throw new Error(
      'Invalid date format.'
    );
  }


  const year =
    Number(
      match[1]
    );


  const month =
    Number(
      match[2]
    ) - 1;


  const day =
    Number(
      match[3]
    );


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
    date.getFullYear() !==
      year ||
    date.getMonth() !==
      month ||
    date.getDate() !==
      day
  ) {
    throw new Error(
      'Invalid date.'
    );
  }


  return date;
}


function normalizeQuickAddTime_(
  value
) {

  value =
    String(
      value || ''
    ).trim();


  if (!value) {
    return '';
  }


  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
      value
    )
  ) {
    throw new Error(
      'Invalid time.'
    );
  }


  return value;
}


/* ==========================================================================
 * SERVER HTML HELPERS
 * ========================================================================== */

function qaEscapeHtml_(
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


function qaOptionsHtml_(
  items,
  selected
) {

  return (
    items || []
  )

    .map(
      function (item) {

        const value =
          String(
            item || ''
          );


        const active =
          value ===
          String(
            selected || ''
          );


        return (
          '<option value="' +
          qaEscapeHtml_(
            value
          ) +
          '"' +
          (
            active
              ? ' selected'
              : ''
          ) +
          '>' +
          qaEscapeHtml_(
            value
          ) +
          '</option>'
        );

      }
    )

    .join('');
}


function qaEntityOptionsHtml_(
  items
) {

  return (
    items || []
  )

    .map(
      function (item) {

        return (
          '<option value="' +
          qaEscapeHtml_(
            item.id
          ) +
          '">' +
          qaEscapeHtml_(
            item.name
          ) +
          '</option>'
        );

      }
    )

    .join('');
}


function qaDependencyOptionsHtml_(
  items
) {

  return (
    items || []
  )

    .map(
      function (item) {

        return (
          '<option value="' +
          qaEscapeHtml_(
            item.id
          ) +
          '">' +
          qaEscapeHtml_(
            item.id +
            ' — ' +
            item.name
          ) +
          '</option>'
        );

      }
    )

    .join('');
}


/* ==========================================================================
 * HTML
 * ========================================================================== */

function buildQuickAddHtml_() {

  const data =
    getQuickAddFormData_();


  const defaults =
    data.defaults ||
    {};


  const lists =
    data.lists ||
    {};


  /* ----------------------------------------------------------------------
   * SERVER-BUILT OPTIONS
   * -------------------------------------------------------------------- */

  const areaOptions =
    qaOptionsHtml_(
      lists.areas || [],
      ''
    );


  const priorityOptions =
    qaOptionsHtml_(
      lists.priorities || [],
      defaults.priority
    );


  const statusOptions =
    qaOptionsHtml_(
      lists.statuses || [],
      defaults.status
    );


  const energyOptions =
    qaOptionsHtml_(
      lists.energy || [],
      defaults.energy
    );


  const contextOptions =
    qaOptionsHtml_(
      lists.contexts || [],
      defaults.context
    );


  const recurringOptions =
    qaOptionsHtml_(
      lists.recurring || [],
      defaults.recurringType
    );


  const projectOptions =
    qaEntityOptionsHtml_(
      data.projects || []
    );


  const goalOptions =
    qaEntityOptionsHtml_(
      data.goals || []
    );


  const dependencyOptions =
    qaDependencyOptionsHtml_(
      data.dependencies || []
    );


  const estimateDefault =
    qaEscapeHtml_(
      defaults.estimateMinutes ||
      30
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

      --danger:
        ${COLORS.danger};

      --warning:
        ${COLORS.warning};

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

      --shadow:
        0 8px 24px
        rgba(
          15,
          23,
          42,
          .06
        );

    }


    * {
      box-sizing:
        border-box;
    }


    html,
    body {

      margin:
        0;

      padding:
        0;

      background:
        var(--background);

      color:
        var(--text);

      font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Arial,
        sans-serif;

    }


    body {
      font-size:
        12px;
    }


    input,
    textarea,
    select,
    button {

      font-family:
        inherit;

    }


    .app {

      min-height:
        100vh;

      padding:
        14px 12px 90px;

    }


    /* ================================================================
     * HERO
     * ================================================================ */

    .hero {

      position:
        relative;

      overflow:
        hidden;

      padding:
        16px;

      margin-bottom:
        12px;

      border:
        1px solid
        var(--border);

      border-radius:
        18px;

      background:
        linear-gradient(
          145deg,
          #ffffff 0%,
          #f8fafc 60%,
          var(--primary-light) 100%
        );

      box-shadow:
        var(--shadow);

    }


    .hero:after {

      content:
        "";

      position:
        absolute;

      width:
        100px;

      height:
        100px;

      right:
        -40px;

      top:
        -46px;

      border-radius:
        999px;

      background:
        var(--primary);

      opacity:
        .055;

      pointer-events:
        none;

    }


    .eyebrow {

      position:
        relative;

      z-index:
        1;

      margin-bottom:
        5px;

      color:
        var(--primary);

      font-size:
        9px;

      font-weight:
        800;

      letter-spacing:
        .12em;

      text-transform:
        uppercase;

    }


    .title {

      position:
        relative;

      z-index:
        1;

      margin:
        0 0 5px;

      font-size:
        20px;

      line-height:
        1.25;

      font-weight:
        850;

      letter-spacing:
        -.025em;

    }


    .subtitle {

      position:
        relative;

      z-index:
        1;

      color:
        var(--text-2);

      font-size:
        10px;

      line-height:
        1.55;

    }


    /* ================================================================
     * CARDS
     * ================================================================ */

    .card {

      margin-bottom:
        10px;

      overflow:
        hidden;

      border:
        1px solid
        var(--border);

      border-radius:
        14px;

      background:
        var(--surface);

      box-shadow:
        0 1px 3px
        rgba(
          15,
          23,
          42,
          .035
        );

    }


    .card-header {

      display:
        flex;

      align-items:
        center;

      gap:
        8px;

      padding:
        11px 12px 7px;

    }


    .card-icon {

      width:
        27px;

      height:
        27px;

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      flex:
        none;

      border-radius:
        8px;

      background:
        var(--primary-light);

      color:
        var(--primary);

      font-size:
        10px;

      font-weight:
        850;

    }


    .card-title {

      font-size:
        11px;

      font-weight:
        800;

      color:
        var(--text);

    }


    .card-subtitle {

      margin-top:
        2px;

      color:
        var(--muted);

      font-size:
        9px;

    }


    .card-body {

      padding:
        4px 12px 13px;

    }


    /* ================================================================
     * FORM
     * ================================================================ */

    .form-grid {

      display:
        grid;

      gap:
        11px;

    }


    .two-column {

      display:
        grid;

      grid-template-columns:
        1fr 1fr;

      gap:
        8px;

    }


    .field {

      min-width:
        0;

    }


    .label {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        8px;

      margin-bottom:
        5px;

      color:
        var(--text-2);

      font-size:
        10px;

      font-weight:
        700;

    }


    .required {

      color:
        var(--danger);

    }


    .hint {

      color:
        var(--muted);

      font-size:
        8px;

      font-weight:
        500;

    }


    .control {

      width:
        100%;

      min-height:
        38px;

      padding:
        0 10px;

      border:
        1px solid
        var(--border);

      border-radius:
        9px;

      outline:
        none;

      background:
        #ffffff;

      color:
        var(--text);

      font-size:
        11px;

      transition:
        border-color .15s ease,
        box-shadow .15s ease,
        background .15s ease;

    }


    textarea.control {

      min-height:
        78px;

      padding:
        9px 10px;

      resize:
        vertical;

      line-height:
        1.5;

    }


    .control:hover {

      border-color:
        #cbd5e1;

    }


    .control:focus {

      border-color:
        var(--primary);

      box-shadow:
        0 0 0 3px
        rgba(
          79,
          70,
          229,
          .10
        );

    }


    .task-name-control {

      min-height:
        46px;

      font-size:
        14px;

      font-weight:
        750;

    }


    /* ================================================================
     * ADVANCED
     * ================================================================ */

    .advanced {

      margin-bottom:
        10px;

      overflow:
        hidden;

      border:
        1px solid
        var(--border);

      border-radius:
        14px;

      background:
        var(--surface);

    }


    .advanced summary {

      cursor:
        pointer;

      padding:
        12px;

      color:
        var(--text);

      font-size:
        11px;

      font-weight:
        800;

      user-select:
        none;

    }


    .advanced[open] summary {

      border-bottom:
        1px solid
        var(--border);

    }


    .advanced-body {

      padding:
        12px;

    }


    /* ================================================================
     * FOOTER
     * ================================================================ */

    .footer {

      position:
        fixed;

      left:
        0;

      right:
        0;

      bottom:
        0;

      z-index:
        20;

      display:
        grid;

      grid-template-columns:
        1fr auto;

      gap:
        8px;

      padding:
        10px 12px;

      border-top:
        1px solid
        var(--border);

      background:
        rgba(
          248,
          250,
          252,
          .96
        );

      backdrop-filter:
        blur(10px);

    }


    .btn {

      min-height:
        40px;

      padding:
        0 15px;

      border:
        1px solid
        transparent;

      border-radius:
        10px;

      cursor:
        pointer;

      font-size:
        11px;

      font-weight:
        800;

      transition:
        transform .1s ease,
        background .15s ease,
        opacity .15s ease;

    }


    .btn:active {

      transform:
        translateY(1px);

    }


    .btn:disabled {

      cursor:
        not-allowed;

      opacity:
        .55;

    }


    .btn-primary {

      color:
        #ffffff;

      background:
        linear-gradient(
          135deg,
          var(--primary),
          var(--primary-hover)
        );

      box-shadow:
        0 6px 15px
        rgba(
          79,
          70,
          229,
          .18
        );

    }


    .btn-secondary {

      color:
        var(--text-2);

      background:
        #ffffff;

      border-color:
        var(--border);

    }


    /* ================================================================
     * SUCCESS
     * ================================================================ */

    .success {

      display:
        none;

      padding:
        26px 15px;

      text-align:
        center;

      border:
        1px solid
        var(--border);

      border-radius:
        16px;

      background:
        var(--surface);

      box-shadow:
        var(--shadow);

    }


    .success-icon {

      width:
        52px;

      height:
        52px;

      display:
        flex;

      align-items:
        center;

      justify-content:
        center;

      margin:
        0 auto 12px;

      border-radius:
        999px;

      background:
        #ecfdf5;

      color:
        var(--success);

      font-size:
        22px;

      font-weight:
        900;

    }


    .success-title {

      margin-bottom:
        5px;

      font-size:
        16px;

      font-weight:
        850;

    }


    .success-text {

      margin-bottom:
        16px;

      color:
        var(--text-2);

      font-size:
        10px;

      line-height:
        1.6;

    }


    .success-task {

      margin:
        10px 0 16px;

      padding:
        11px;

      border:
        1px solid
        #dbe4ff;

      border-radius:
        10px;

      background:
        var(--primary-light);

      color:
        var(--primary-hover);

      font-weight:
        800;

      overflow-wrap:
        anywhere;

    }


    .success-actions {

      display:
        grid;

      gap:
        8px;

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
        67px;

      z-index:
        100;

      padding:
        10px 12px;

      border-radius:
        10px;

      background:
        #0f172a;

      color:
        #ffffff;

      font-size:
        11px;

      line-height:
        1.4;

      opacity:
        0;

      transform:
        translateY(
          8px
        );

      pointer-events:
        none;

      transition:
        opacity .18s ease,
        transform .18s ease;

    }


    .toast.show {

      opacity:
        1;

      transform:
        translateY(
          0
        );

    }


    @media (
      max-width:
      300px
    ) {

      .two-column {

        grid-template-columns:
          1fr;

      }

    }

  </style>

</head>


<body>


  <div class="app">


    <!-- ===========================================================
         FORM
         =========================================================== -->

    <div id="formShell">


      <!-- HERO -->

      <section class="hero">

        <div class="eyebrow">
          Smart Task Manager
        </div>

        <h1 class="title">
          Quick Add Task
        </h1>

        <div class="subtitle">
          Capture the task first.
          Add only the context that helps you act on it.
        </div>

      </section>


      <form
        id="quickAddForm"
        onsubmit="return false;"
      >


        <!-- =======================================================
             TASK
             ======================================================= -->

        <section class="card">


          <div class="card-header">

            <div class="card-icon">
              01
            </div>

            <div>

              <div class="card-title">
                Task
              </div>

              <div class="card-subtitle">
                What needs to get done?
              </div>

            </div>

          </div>


          <div class="card-body">

            <div class="form-grid">


              <div class="field">

                <label class="label">

                  <span>

                    Task name

                    <span class="required">
                      *
                    </span>

                  </span>

                  <span class="hint">
                    Required
                  </span>

                </label>


                <input

                  id="taskName"

                  class="
                    control
                    task-name-control
                  "

                  type="text"

                  maxlength="160"

                  placeholder="
                    e.g. Finish Smart Task dashboard
                  "

                  autocomplete="off"

                >

              </div>


              <div class="field">

                <label class="label">
                  Description
                </label>


                <textarea

                  id="description"

                  class="control"

                  placeholder="
                    Add context, desired outcome,
                    or important details...
                  "

                ></textarea>

              </div>


            </div>

          </div>


        </section>


        <!-- =======================================================
             ORGANIZATION
             ======================================================= -->

        <section class="card">


          <div class="card-header">

            <div class="card-icon">
              02
            </div>

            <div>

              <div class="card-title">
                Organization
              </div>

              <div class="card-subtitle">
                Keep personal work easy to find
              </div>

            </div>

          </div>


          <div class="card-body">

            <div class="form-grid">


              <div class="two-column">


                <div class="field">

                  <label class="label">
                    Area
                  </label>


                  <select
                    id="area"
                    class="control"
                  >

                    <option value="">
                      No area
                    </option>

                    ${areaOptions}

                  </select>

                </div>


                <div class="field">

                  <label class="label">
                    Project
                  </label>


                  <select
                    id="project"
                    class="control"
                  >

                    <option value="">
                      No project
                    </option>

                    ${projectOptions}

                  </select>

                </div>


              </div>


              <div class="two-column">


                <div class="field">

                  <label class="label">
                    Priority
                  </label>


                  <select
                    id="priority"
                    class="control"
                  >

                    ${priorityOptions}

                  </select>

                </div>


                <div class="field">

                  <label class="label">
                    Status
                  </label>


                  <select
                    id="status"
                    class="control"
                  >

                    ${statusOptions}

                  </select>

                </div>


              </div>


              <div class="two-column">


                <div class="field">

                  <label class="label">
                    Category
                  </label>


                  <input

                    id="category"

                    class="control"

                    type="text"

                    placeholder="
                      e.g. Development
                    "

                  >

                </div>


                <div class="field">

                  <label class="label">
                    Tags
                  </label>


                  <input

                    id="tags"

                    class="control"

                    type="text"

                    placeholder="
                      ui, important
                    "

                  >

                </div>


              </div>


            </div>

          </div>


        </section>


        <!-- =======================================================
             SCHEDULE
             ======================================================= -->

        <section class="card">


          <div class="card-header">

            <div class="card-icon">
              03
            </div>

            <div>

              <div class="card-title">
                Schedule
              </div>

              <div class="card-subtitle">
                Plan when and how long
              </div>

            </div>

          </div>


          <div class="card-body">

            <div class="form-grid">


              <div class="two-column">


                <div class="field">

                  <label class="label">
                    Start date
                  </label>


                  <input

                    id="startDate"

                    class="control"

                    type="date"

                  >

                </div>


                <div class="field">

                  <label class="label">
                    Due date
                  </label>


                  <input

                    id="dueDate"

                    class="control"

                    type="date"

                  >

                </div>


              </div>


              <div class="two-column">


                <div class="field">

                  <label class="label">
                    Due time
                  </label>


                  <input

                    id="dueTime"

                    class="control"

                    type="time"

                  >

                </div>


                <div class="field">

                  <label class="label">

                    <span>
                      Estimate
                    </span>

                    <span class="hint">
                      minutes
                    </span>

                  </label>


                  <input

                    id="estimateMinutes"

                    class="control"

                    type="number"

                    min="0"

                    step="5"

                    value="${estimateDefault}"

                  >

                </div>


              </div>


            </div>

          </div>


        </section>


        <!-- =======================================================
             PERSONAL PRODUCTIVITY
             ======================================================= -->

        <section class="card">


          <div class="card-header">

            <div class="card-icon">
              04
            </div>

            <div>

              <div class="card-title">
                Personal Productivity
              </div>

              <div class="card-subtitle">
                Match the task to your energy and context
              </div>

            </div>

          </div>


          <div class="card-body">

            <div class="form-grid">


              <div class="two-column">


                <div class="field">

                  <label class="label">
                    Energy
                  </label>


                  <select
                    id="energy"
                    class="control"
                  >

                    ${energyOptions}

                  </select>

                </div>


                <div class="field">

                  <label class="label">
                    Context
                  </label>


                  <select
                    id="context"
                    class="control"
                  >

                    ${contextOptions}

                  </select>

                </div>


              </div>


              <div class="field">

                <label class="label">
                  Goal
                </label>


                <select
                  id="goalId"
                  class="control"
                >

                  <option value="">
                    No linked goal
                  </option>

                  ${goalOptions}

                </select>

              </div>


            </div>

          </div>


        </section>


        <!-- =======================================================
             ADVANCED
             ======================================================= -->

        <details class="advanced">


          <summary>
            Advanced options
          </summary>


          <div class="advanced-body">

            <div class="form-grid">


              <div class="field">

                <label class="label">
                  Recurring
                </label>


                <select
                  id="recurringType"
                  class="control"
                >

                  ${recurringOptions}

                </select>

              </div>


              <div class="field">

                <label class="label">
                  Dependency
                </label>


                <select
                  id="dependencyTaskId"
                  class="control"
                >

                  <option value="">
                    No dependency
                  </option>

                  ${dependencyOptions}

                </select>

              </div>


              <div class="field">

                <label class="label">
                  Notes
                </label>


                <textarea

                  id="notes"

                  class="control"

                  placeholder="
                    Private task notes...
                  "

                ></textarea>

              </div>


            </div>

          </div>


        </details>


      </form>


    </div>


    <!-- ===========================================================
         SUCCESS
         =========================================================== -->

    <section
      id="successShell"
      class="success"
    >


      <div class="success-icon">
        ✓
      </div>


      <div class="success-title">
        Task created
      </div>


      <div class="success-text">

        Your new task has been added
        to Smart Task Manager.

      </div>


      <div
        id="successTask"
        class="success-task"
      ></div>


      <div class="success-actions">


        <button

          type="button"

          class="
            btn
            btn-primary
          "

          onclick="
            openLastCreatedTask()
          "

        >
          Open Task Details
        </button>


        <button

          type="button"

          class="
            btn
            btn-secondary
          "

          onclick="
            addAnotherTask()
          "

        >
          + Add Another Task
        </button>


        <button

          type="button"

          class="
            btn
            btn-secondary
          "

          onclick="
            google.script.host.close()
          "

        >
          Done
        </button>


      </div>


    </section>


  </div>


  <!-- =============================================================
       FIXED FOOTER
       ============================================================= -->

  <div
    id="formFooter"
    class="footer"
  >


    <button

      id="createButton"

      type="button"

      class="
        btn
        btn-primary
      "

      onclick="
        submitTask()
      "

    >
      + Create Task
    </button>


    <button

      id="cancelButton"

      type="button"

      class="
        btn
        btn-secondary
      "

      onclick="
        google.script.host.close()
      "

    >
      Cancel
    </button>


  </div>


  <!-- =============================================================
       TOAST
       ============================================================= -->

  <div
    id="toast"
    class="toast"
  ></div>


  <script>

    var saving =
      false;


    var lastCreatedTaskId =
      '';


    /* ================================================================
     * INIT
     * ================================================================ */

    document.addEventListener(
      'DOMContentLoaded',
      function () {

        var taskName =
          document.getElementById(
            'taskName'
          );


        if (taskName) {

          window.setTimeout(
            function () {

              taskName.focus();

            },
            80
          );

        }


        /*
         * Ctrl + Enter / Cmd + Enter
         * creates task.
         */
        document.addEventListener(
          'keydown',
          function (event) {

            if (
              (
                event.ctrlKey ||
                event.metaKey
              ) &&
              event.key ===
                'Enter'
            ) {

              event.preventDefault();

              submitTask();

            }

          }
        );

      }
    );


    /* ================================================================
     * SUBMIT
     * ================================================================ */

    function submitTask() {

      if (saving) {
        return;
      }


      var taskName =
        getValue(
          'taskName'
        ).trim();


      if (!taskName) {

        showToast(
          'Task name is required.'
        );


        document
          .getElementById(
            'taskName'
          )
          .focus();


        return;

      }


      var payload = {

        TaskName:
          taskName,


        Description:
          getValue(
            'description'
          ),


        Area:
          getValue(
            'area'
          ),


        Project:
          getValue(
            'project'
          ),


        Category:
          getValue(
            'category'
          ),


        Tags:
          getValue(
            'tags'
          ),


        Priority:
          getValue(
            'priority'
          ),


        Status:
          getValue(
            'status'
          ),


        StartDate:
          getValue(
            'startDate'
          ),


        DueDate:
          getValue(
            'dueDate'
          ),


        DueTime:
          getValue(
            'dueTime'
          ),


        EstimateMinutes:
          Number(
            getValue(
              'estimateMinutes'
            ) || 0
          ),


        Energy:
          getValue(
            'energy'
          ),


        Context:
          getValue(
            'context'
          ),


        GoalId:
          getValue(
            'goalId'
          ),


        RecurringType:
          getValue(
            'recurringType'
          ),


        DependencyTaskId:
          getValue(
            'dependencyTaskId'
          ),


        Notes:
          getValue(
            'notes'
          )

      };


      setSaving(
        true
      );


      google.script.run

        .withSuccessHandler(
          function (result) {

            setSaving(
              false
            );


            renderSuccess(
              result
            );

          }
        )

        .withFailureHandler(
          function (error) {

            setSaving(
              false
            );


            showToast(
              getErrorMessage(
                error
              )
            );

          }
        )

        .createQuickAddTask(
          payload
        );

    }


    /* ================================================================
     * SUCCESS
     * ================================================================ */

    function renderSuccess(
      result
    ) {

      lastCreatedTaskId =
        String(
          result &&
          result.taskId
            ? result.taskId
            : ''
        );


      var taskName =
        String(
          result &&
          result.taskName
            ? result.taskName
            : 'New task'
        );


      document
        .getElementById(
          'formShell'
        )
        .style
        .display =
          'none';


      document
        .getElementById(
          'formFooter'
        )
        .style
        .display =
          'none';


      document
        .getElementById(
          'successShell'
        )
        .style
        .display =
          'block';


      document
        .getElementById(
          'successTask'
        )
        .textContent =
          taskName +
          '  •  ' +
          lastCreatedTaskId;

    }


    /* ================================================================
     * ADD ANOTHER
     * ================================================================ */

    function addAnotherTask() {

      lastCreatedTaskId =
        '';


      var form =
        document.getElementById(
          'quickAddForm'
        );


      if (form) {

        /*
         * reset() restores all defaults
         * generated by server HTML.
         */
        form.reset();

      }


      document
        .getElementById(
          'successShell'
        )
        .style
        .display =
          'none';


      document
        .getElementById(
          'formShell'
        )
        .style
        .display =
          'block';


      document
        .getElementById(
          'formFooter'
        )
        .style
        .display =
          'grid';


      window.setTimeout(
        function () {

          var taskName =
            document.getElementById(
              'taskName'
            );


          if (taskName) {

            taskName.focus();

          }

        },
        80
      );

    }


    /* ================================================================
     * OPEN CREATED TASK
     * ================================================================ */

    function openLastCreatedTask() {

      if (
        !lastCreatedTaskId
      ) {

        showToast(
          'Task ID is missing.'
        );

        return;

      }


      google.script.run

        .withFailureHandler(
          function (error) {

            showToast(
              getErrorMessage(
                error
              )
            );

          }
        )

        .openCreatedTask(
          lastCreatedTaskId
        );

    }


    /* ================================================================
     * SAVING STATE
     * ================================================================ */

    function setSaving(
      value
    ) {

      saving =
        value;


      var createButton =
        document.getElementById(
          'createButton'
        );


      var cancelButton =
        document.getElementById(
          'cancelButton'
        );


      if (
        createButton
      ) {

        createButton.disabled =
          value;


        createButton.textContent =
          value
            ? 'Creating...'
            : '+ Create Task';

      }


      if (
        cancelButton
      ) {

        cancelButton.disabled =
          value;

      }

    }


    /* ================================================================
     * VALUE
     * ================================================================ */

    function getValue(
      id
    ) {

      var element =
        document.getElementById(
          id
        );


      return element
        ? String(
            element.value ||
            ''
          )
        : '';

    }


    /* ================================================================
     * ERRORS
     * ================================================================ */

    function getErrorMessage(
      error
    ) {

      if (
        error &&
        error.message
      ) {

        return error.message;

      }


      return String(
        error ||
        'Something went wrong.'
      );

    }


    /* ================================================================
     * TOAST
     * ================================================================ */

    function showToast(
      message
    ) {

      var toast =
        document.getElementById(
          'toast'
        );


      toast.textContent =
        message;


      toast.classList.add(
        'show'
      );


      window.clearTimeout(
        window.__quickAddToast
      );


      window.__quickAddToast =
        window.setTimeout(
          function () {

            toast.classList.remove(
              'show'
            );

          },
          2600
        );

    }

  </script>


</body>

</html>
  `;
}