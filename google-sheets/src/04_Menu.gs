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
 * │   ├── Calendar
 * │   └── Timeline
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
 * ├── Timeline View
 * │   ├── Previous 4 Weeks
 * │   ├── Current 4 Weeks
 * │   ├── Next 4 Weeks
 * │   └── Refresh Timeline
 * │
 * ├── Refresh
 * │   ├── Refresh Everything
 * │   ├── Refresh Dashboard
 * │   ├── Refresh Today
 * │   ├── Refresh Tasks
 * │   ├── Refresh Kanban
 * │   ├── Refresh Calendar
 * │   └── Refresh Timeline
 * │
 * └── Workspace
 *     └── Set Up / Repair Workspace
 *
 * Future:
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
      )

      .addItem(
        'Timeline',
        'openTimelineFromMenu_'
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
   * TIMELINE VIEW
   * -------------------------------------------------------------------- */

  const timelineMenu =
    ui
      .createMenu(
        'Timeline View'
      )

      .addItem(
        '←  Previous 4 Weeks',
        'timelinePreviousPeriod_'
      )

      .addItem(
        'Current 4 Weeks',
        'timelineCurrentPeriod_'
      )

      .addItem(
        'Next 4 Weeks  →',
        'timelineNextPeriod_'
      )

      .addSeparator()

      .addItem(
        'Refresh Timeline',
        'renderTimeline_'
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
      )

      .addItem(
        'Refresh Timeline',
        'renderTimeline_'
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

    .addSeparator()

    .addSubMenu(
      calendarMenu
    )

    .addSubMenu(
      timelineMenu
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
   * TASK SUMMARY / STYLE
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


/**
 * Open Timeline through the Timeline module.
 *
 * Module:
 * 13_Timeline.gs
 *
 * IMPORTANT:
 * openTimeline_() is implemented in 13_Timeline.gs.
 * This wrapper prevents a duplicate global function.
 */
function openTimelineFromMenu_() {

  if (
    typeof openTimeline_ !==
    'function'
  ) {

    SpreadsheetApp
      .getUi()
      .alert(
        'Timeline',
        'Timeline module is not available. Make sure 13_Timeline.gs has been added and pushed.',
        SpreadsheetApp
          .getUi()
          .ButtonSet
          .OK
      );

    return;
  }


  try {

    openTimeline_();

  } catch (error) {

    console.warn(
      'Timeline refresh failed:',
      getMenuErrorMessage_(
        error
      )
    );


    SpreadsheetApp
      .getUi()
      .alert(
        'Timeline Error',
        getMenuErrorMessage_(
          error
        ),
        SpreadsheetApp
          .getUi()
          .ButtonSet
          .OK
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
 * Smart contextual task opener.
 *
 * Supported:
 * - Tasks
 * - Kanban
 * - Calendar
 * - Timeline
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
   * TIMELINE
   * -------------------------------------------------------------------- */

  if (
    sheetName ===
    SHEETS.TIMELINE
  ) {

    if (
      typeof openSelectedTimelineTask_ ===
      'function'
    ) {

      openSelectedTimelineTask_();

      return;

    }

  }


  /* ----------------------------------------------------------------------
   * UNSUPPORTED WORKSPACE
   * -------------------------------------------------------------------- */

  ui.alert(
    'Open Task',
    'Open Tasks, Kanban, Calendar or Timeline and select a task first.',
    ui.ButtonSet.OK
  );
}


/* ==========================================================================
 * REFRESH AFTER TASK CHANGE
 * ========================================================================== */

/**
 * Refresh all task-powered views after:
 *
 * - Create task
 * - Update task
 * - Complete task
 * - Delete task
 *
 * Each renderer is isolated so one module error
 * does not prevent the others from refreshing.
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


  /* ----------------------------------------------------------------------
   * TIMELINE
   * -------------------------------------------------------------------- */

  try {

    if (
      typeof renderTimeline_ ===
      'function'
    ) {

      renderTimeline_();

    }

  } catch (error) {

    console.warn(
      'Timeline refresh skipped:',
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
 * IMPORTANT:
 * If refreshAll_() exists in another file,
 * keep only ONE global refreshAll_() implementation.
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
    },


    {
      name:
        'Timeline',

      fn:
        typeof renderTimeline_ ===
        'function'
          ? renderTimeline_
          : null
    }

  ];


  let refreshedCount =
    0;


  let failedCount =
    0;


  jobs.forEach(
    function (job) {

      if (!job.fn) {
        return;
      }


      try {

        job.fn();


        refreshedCount++;

      } catch (error) {

        failedCount++;


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


  /* ----------------------------------------------------------------------
   * USER FEEDBACK
   * -------------------------------------------------------------------- */

  let message =
    refreshedCount +
    ' workspace view' +
    (
      refreshedCount === 1
        ? ''
        : 's'
    ) +
    ' refreshed';


  if (
    failedCount > 0
  ) {

    message +=
      ' • ' +
      failedCount +
      ' failed';

  }


  if (
    typeof toast_ ===
    'function'
  ) {

    toast_(
      message,
      'Smart Task'
    );

  } else {

    SpreadsheetApp
      .getActive()
      .toast(
        message,
        'Smart Task',
        4
      );

  }
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