/**
 * 04_Menu.gs
 * -----------------------------------------------------------------------
 * SMART TASK MANAGER — MAIN NAVIGATION
 *
 * Current modules:
 *
 * Smart Task
 * ├── Navigation
 * │   ├── Dashboard
 * │   ├── Today
 * │   ├── Tasks
 * │   ├── Kanban
 * │   └── Calendar
 * │
 * ├── Task Actions
 * │   ├── Quick Add Task
 * │   └── Open Selected Task
 * │
 * ├── Calendar View
 * │   ├── Previous Month
 * │   ├── Current Month
 * │   ├── Next Month
 * │   └── Refresh Calendar
 * │
 * ├── Refresh
 * │   ├── Refresh Everything
 * │   ├── Refresh Dashboard
 * │   ├── Refresh Today
 * │   ├── Refresh Tasks
 * │   ├── Refresh Kanban
 * │   └── Refresh Calendar
 * │
 * └── Workspace
 *     └── Set Up / Repair Workspace
 *
 * Future:
 * - Timeline / Gantt
 * - Projects
 * - Reports
 * - Notifications
 * - Settings
 * -----------------------------------------------------------------------
 */


/* ==========================================================================
 * MAIN MENU
 * ========================================================================== */

function onOpen() {
  const ui =
    SpreadsheetApp.getUi();


  /* ----------------------------------------------------------------------
   * NAVIGATION
   * -------------------------------------------------------------------- */

  const navigationMenu =
    ui
      .createMenu(
        'Navigation'
      )

      .addItem(
        'Dashboard',
        'openDashboard_'
      )

      .addItem(
        'Today',
        'openToday_'
      )

      .addItem(
        'Tasks',
        'openTasks_'
      )

      .addSeparator()

      .addItem(
        'Kanban',
        'openKanban_'
      )

      .addItem(
        'Calendar',
        'openCalendar_'
      );


  /* ----------------------------------------------------------------------
   * TASK ACTIONS
   * -------------------------------------------------------------------- */

  const taskActionsMenu =
    ui
      .createMenu(
        'Task Actions'
      )

      .addItem(
        '➕  Quick Add Task',
        'quickAddTaskPrompt_'
      )

      .addItem(
        '↗  Open Selected Task',
        'openSelectedTaskContext_'
      );


  /* ----------------------------------------------------------------------
   * CALENDAR VIEW
   * -------------------------------------------------------------------- */

  const calendarMenu =
    ui
      .createMenu(
        'Calendar View'
      )

      .addItem(
        '←  Previous Month',
        'calendarPreviousMonth_'
      )

      .addItem(
        'Current Month',
        'calendarCurrentMonth_'
      )

      .addItem(
        'Next Month  →',
        'calendarNextMonth_'
      )

      .addSeparator()

      .addItem(
        'Refresh Calendar',
        'renderCalendar_'
      );


  /* ----------------------------------------------------------------------
   * REFRESH
   * -------------------------------------------------------------------- */

  const refreshMenu =
    ui
      .createMenu(
        'Refresh'
      )

      .addItem(
        '↻  Refresh Everything',
        'refreshAll_'
      )

      .addSeparator()

      .addItem(
        'Refresh Dashboard',
        'renderDashboard_'
      )

      .addItem(
        'Refresh Today',
        'renderToday_'
      )

      .addItem(
        'Refresh Tasks',
        'renderTaskSummary_'
      )

      .addItem(
        'Refresh Kanban',
        'renderKanban_'
      )

      .addItem(
        'Refresh Calendar',
        'renderCalendar_'
      );


  /* ----------------------------------------------------------------------
   * WORKSPACE
   * -------------------------------------------------------------------- */

  const workspaceMenu =
    ui
      .createMenu(
        'Workspace'
      )

      .addItem(
        '⚙  Set Up / Repair Workspace',
        'setupSmartTask'
      );


  /* ----------------------------------------------------------------------
   * ROOT MENU
   * -------------------------------------------------------------------- */

  ui
    .createMenu(
      '⚡ Smart Task'
    )

    .addSubMenu(
      navigationMenu
    )

    .addSubMenu(
      taskActionsMenu
    )

    .addSubMenu(
      calendarMenu
    )

    .addSeparator()

    .addSubMenu(
      refreshMenu
    )

    .addSeparator()

    .addSubMenu(
      workspaceMenu
    )

    .addToUi();
}


/* ==========================================================================
 * NAVIGATION
 * ========================================================================== */

/**
 * Open Dashboard.
 */
function openDashboard_() {
  const spreadsheet =
    SpreadsheetApp.getActive();

  const sheet =
    getOrCreateSheet_(
      SHEETS.DASHBOARD
    );

  spreadsheet.setActiveSheet(
    sheet
  );


  try {

    if (
      typeof renderDashboard_ ===
      'function'
    ) {
      renderDashboard_();
    }

  } catch (error) {

    console.warn(
      'Dashboard refresh failed:',
      getMenuErrorMessage_(
        error
      )
    );

  }
}


/**
 * Open Today.
 */
function openToday_() {
  const spreadsheet =
    SpreadsheetApp.getActive();

  const sheet =
    getOrCreateSheet_(
      SHEETS.TODAY
    );

  spreadsheet.setActiveSheet(
    sheet
  );


  try {

    if (
      typeof renderToday_ ===
      'function'
    ) {
      renderToday_();
    }

  } catch (error) {

    console.warn(
      'Today refresh failed:',
      getMenuErrorMessage_(
        error
      )
    );

  }
}


/**
 * Open Tasks.
 */
function openTasks_() {
  const spreadsheet =
    SpreadsheetApp.getActive();

  const sheet =
    getOrCreateSheet_(
      SHEETS.TASKS
    );

  spreadsheet.setActiveSheet(
    sheet
  );


  /* ----------------------------------------------------------------------
   * STYLE / SUMMARY
   * -------------------------------------------------------------------- */

  try {

    if (
      typeof renderTaskSummary_ ===
      'function'
    ) {
      renderTaskSummary_();
    }

  } catch (error) {

    console.warn(
      'Tasks refresh failed:',
      getMenuErrorMessage_(
        error
      )
    );

  }


  /* ----------------------------------------------------------------------
   * FILTER
   * -------------------------------------------------------------------- */

  try {

    if (
      typeof setupTasksFilter_ ===
      'function'
    ) {
      setupTasksFilter_();
    }

  } catch (error) {

    console.warn(
      'Tasks filter setup failed:',
      getMenuErrorMessage_(
        error
      )
    );

  }
}


/**
 * Open Kanban.
 *
 * Module:
 * 11_Kanban.gs
 */
function openKanban_() {
  const spreadsheet =
    SpreadsheetApp.getActive();

  const sheet =
    getOrCreateSheet_(
      SHEETS.KANBAN
    );

  spreadsheet.setActiveSheet(
    sheet
  );


  try {

    if (
      typeof renderKanban_ ===
      'function'
    ) {

      renderKanban_();

    } else {

      SpreadsheetApp
        .getUi()
        .alert(
          'Kanban',
          'Kanban module is not available. Make sure 11_Kanban.gs has been added and pushed.',
          SpreadsheetApp
            .getUi()
            .ButtonSet
            .OK
        );

    }

  } catch (error) {

    console.warn(
      'Kanban refresh failed:',
      getMenuErrorMessage_(
        error
      )
    );

  }
}


/**
 * Open Calendar.
 *
 * Module:
 * 12_Calendar.gs
 */
function openCalendar_() {
  const spreadsheet =
    SpreadsheetApp.getActive();

  const sheet =
    getOrCreateSheet_(
      SHEETS.CALENDAR
    );

  spreadsheet.setActiveSheet(
    sheet
  );


  try {

    if (
      typeof renderCalendar_ ===
      'function'
    ) {

      renderCalendar_();

    } else {

      SpreadsheetApp
        .getUi()
        .alert(
          'Calendar',
          'Calendar module is not available. Make sure 12_Calendar.gs has been added and pushed.',
          SpreadsheetApp
            .getUi()
            .ButtonSet
            .OK
        );

    }

  } catch (error) {

    console.warn(
      'Calendar refresh failed:',
      getMenuErrorMessage_(
        error
      )
    );

  }
}


/* ==========================================================================
 * QUICK ADD TASK
 * ========================================================================== */

/**
 * Open professional Quick Add sidebar.
 *
 * Module:
 * 10_QuickAdd.gs
 */
function quickAddTaskPrompt_() {

  if (
    typeof showQuickAddTask_ !==
    'function'
  ) {

    SpreadsheetApp
      .getUi()
      .alert(
        'Quick Add Task',
        'Quick Add module is not available. Make sure 10_QuickAdd.gs has been added and pushed.',
        SpreadsheetApp
          .getUi()
          .ButtonSet
          .OK
      );

    return;
  }


  showQuickAddTask_();
}


/* ==========================================================================
 * OPEN SELECTED TASK
 * ========================================================================== */

/**
 * Smart context action.
 *
 * Supported:
 * - Tasks
 * - Kanban
 * - Calendar
 */
function openSelectedTaskContext_() {
  const ui =
    SpreadsheetApp.getUi();


  const sheet =
    SpreadsheetApp
      .getActive()
      .getActiveSheet();


  if (!sheet) {

    ui.alert(
      'Open Task',
      'No active sheet was found.',
      ui.ButtonSet.OK
    );

    return;
  }


  const sheetName =
    sheet.getName();


  /* ----------------------------------------------------------------------
   * TASKS
   * -------------------------------------------------------------------- */

  if (
    sheetName ===
    SHEETS.TASKS
  ) {

    if (
      typeof openSelectedTaskDetails_ ===
      'function'
    ) {

      openSelectedTaskDetails_();

      return;

    }

  }


  /* ----------------------------------------------------------------------
   * KANBAN
   * -------------------------------------------------------------------- */

  if (
    sheetName ===
    SHEETS.KANBAN
  ) {

    if (
      typeof openSelectedKanbanTask_ ===
      'function'
    ) {

      openSelectedKanbanTask_();

      return;

    }

  }


  /* ----------------------------------------------------------------------
   * CALENDAR
   * -------------------------------------------------------------------- */

  if (
    sheetName ===
    SHEETS.CALENDAR
  ) {

    if (
      typeof openSelectedCalendarTask_ ===
      'function'
    ) {

      openSelectedCalendarTask_();

      return;

    }

  }


  /* ----------------------------------------------------------------------
   * UNSUPPORTED
   * -------------------------------------------------------------------- */

  ui.alert(
    'Open Task',
    'Open Tasks, Kanban or Calendar and select a task first.',
    ui.ButtonSet.OK
  );
}


/* ==========================================================================
 * REFRESH AFTER TASK CHANGE
 * ========================================================================== */

/**
 * Refresh task-powered views after:
 *
 * - Create task
 * - Update task
 * - Complete task
 * - Delete task
 */
function refreshViewsAfterTaskChange_() {

  /* ----------------------------------------------------------------------
   * DASHBOARD
   * -------------------------------------------------------------------- */

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
      getMenuErrorMessage_(
        error
      )
    );

  }


  /* ----------------------------------------------------------------------
   * TODAY
   * -------------------------------------------------------------------- */

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
      getMenuErrorMessage_(
        error
      )
    );

  }


  /* ----------------------------------------------------------------------
   * TASKS
   * -------------------------------------------------------------------- */

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
      getMenuErrorMessage_(
        error
      )
    );

  }


  /* ----------------------------------------------------------------------
   * KANBAN
   * -------------------------------------------------------------------- */

  try {

    if (
      typeof renderKanban_ ===
      'function'
    ) {

      renderKanban_();

    }

  } catch (error) {

    console.warn(
      'Kanban refresh skipped:',
      getMenuErrorMessage_(
        error
      )
    );

  }


  /* ----------------------------------------------------------------------
   * CALENDAR
   * -------------------------------------------------------------------- */

  try {

    if (
      typeof renderCalendar_ ===
      'function'
    ) {

      renderCalendar_();

    }

  } catch (error) {

    console.warn(
      'Calendar refresh skipped:',
      getMenuErrorMessage_(
        error
      )
    );

  }
}


/* ==========================================================================
 * REFRESH EVERYTHING
 * ========================================================================== */

/**
 * Full workspace refresh.
 *
 * NOTE:
 * If refreshAll_() already exists in another file,
 * keep only ONE version.
 */
function refreshAll_() {

  const jobs = [

    {
      name:
        'Dashboard',

      fn:
        typeof renderDashboard_ ===
        'function'
          ? renderDashboard_
          : null
    },


    {
      name:
        'Today',

      fn:
        typeof renderToday_ ===
        'function'
          ? renderToday_
          : null
    },


    {
      name:
        'Tasks',

      fn:
        typeof renderTaskSummary_ ===
        'function'
          ? renderTaskSummary_
          : null
    },


    {
      name:
        'Kanban',

      fn:
        typeof renderKanban_ ===
        'function'
          ? renderKanban_
          : null
    },


    {
      name:
        'Calendar',

      fn:
        typeof renderCalendar_ ===
        'function'
          ? renderCalendar_
          : null
    }

  ];


  jobs.forEach(
    function (job) {

      if (!job.fn) {
        return;
      }


      try {

        job.fn();

      } catch (error) {

        console.warn(
          job.name +
          ' refresh failed:',
          getMenuErrorMessage_(
            error
          )
        );

      }

    }
  );


  toast_(
    'Dashboard, Today, Tasks, Kanban and Calendar refreshed.',
    'Smart Task'
  );
}


/* ==========================================================================
 * MENU HELPERS
 * ========================================================================== */

function getMenuErrorMessage_(
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
    'Unknown error'
  );
}