/**
 * 04_Menu.gs
 * -----------------------------------------------------------------------
 * SMART TASK MANAGER — MAIN NAVIGATION
 *
 * Modules:
 *
 * ⚡ Smart Task
 * ├── Navigation
 * │   ├── Dashboard
 * │   ├── Today
 * │   ├── Tasks
 * │   ├── Projects
 * │   ├── Kanban
 * │   ├── Calendar
 * │   └── Timeline
 * │
 * ├── Task Actions
 * │   ├── Quick Add Task
 * │   ├── Quick Add Project
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
 * │   ├── Refresh Projects
 * │   ├── Refresh Kanban
 * │   ├── Refresh Calendar
 * │   └── Refresh Timeline
 * │
 * └── Workspace
 *     └── Set Up / Repair Workspace
 *
 * Error handling:
 * - User-facing actions -> runSafely_()
 * - Background refresh -> runQuietly_()
 * - Professional modal -> 98_AppDialog.gs
 * -----------------------------------------------------------------------
 */

/* ==========================================================================
 * MAIN MENU
 * ========================================================================== */

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  /* ----------------------------------------------------------------------
   * NAVIGATION
   * -------------------------------------------------------------------- */

  const navigationMenu = ui
    .createMenu("Navigation")

    .addItem("Dashboard", "openDashboard_")

    .addItem("Today", "openToday_")

    .addItem("Tasks", "openTasks_")

    .addSeparator()

    .addItem("Projects", "openProjectsFromMenu_")

    .addItem("Kanban", "openKanbanFromMenu_")

    .addItem("Calendar", "openCalendar_")

    .addItem("Timeline", "openTimelineFromMenu_");

  /* ----------------------------------------------------------------------
   * TASK ACTIONS
   * -------------------------------------------------------------------- */

  const taskActionsMenu = ui
    .createMenu("Task Actions")

    .addItem("➕  Quick Add Task", "quickAddTaskPrompt_")

    .addItem("➕  Quick Add Project", "quickAddProjectFromMenu_")

    .addSeparator()

    .addItem("↗  Open Selected Task", "openSelectedTaskContext_");

  /* ----------------------------------------------------------------------
   * CALENDAR VIEW
   * -------------------------------------------------------------------- */

  const calendarMenu = ui
    .createMenu("Calendar View")

    .addItem("←  Previous Month", "calendarPreviousMonthSafe_")

    .addItem("Current Month", "calendarCurrentMonthSafe_")

    .addItem("Next Month  →", "calendarNextMonthSafe_")

    .addSeparator()

    .addItem("Refresh Calendar", "refreshCalendarSafe_");

  /* ----------------------------------------------------------------------
   * TIMELINE VIEW
   * -------------------------------------------------------------------- */

  const timelineMenu = ui
    .createMenu("Timeline View")

    .addItem("←  Previous 4 Weeks", "timelinePreviousPeriodSafe_")

    .addItem("Current 4 Weeks", "timelineCurrentPeriodSafe_")

    .addItem("Next 4 Weeks  →", "timelineNextPeriodSafe_")

    .addSeparator()

    .addItem("Refresh Timeline", "refreshTimelineSafe_");

  /* ----------------------------------------------------------------------
   * REFRESH
   * -------------------------------------------------------------------- */

  const refreshMenu = ui
    .createMenu("Refresh")

    .addItem("↻  Refresh Everything", "refreshAll_")

    .addSeparator()

    .addItem("Refresh Dashboard", "refreshDashboardSafe_")

    .addItem("Refresh Today", "refreshTodaySafe_")

    .addItem("Refresh Tasks", "refreshTasksSafe_")

    .addItem("Refresh Projects", "refreshProjectsSafe_")

    .addItem("Refresh Kanban", "refreshKanbanSafe_")

    .addItem("Refresh Calendar", "refreshCalendarSafe_")

    .addItem("Refresh Timeline", "refreshTimelineSafe_");

  /* ----------------------------------------------------------------------
   * WORKSPACE
   * -------------------------------------------------------------------- */

  const workspaceMenu = ui
    .createMenu("Workspace")

    .addItem("⚙  Set Up / Repair Workspace", "setupSmartTaskSafe_");

  /* ----------------------------------------------------------------------
   * SYNC (Phase 28)
   * -------------------------------------------------------------------- */

  const syncMenu = ui
    .createMenu("Sync")

    .addItem("🔄  Sync Now", "syncNowManual_")

    .addSeparator()

    .addItem("🔌  Connect to Backend...", "connectToBackendPrompt_")

    .addSeparator()

    .addItem("⏱  Enable Auto-Sync (every 15 min)", "setupSyncTrigger_")

    .addItem("⏹  Disable Auto-Sync", "disableSyncTrigger_");

  /* ----------------------------------------------------------------------
   * ROOT MENU
   * -------------------------------------------------------------------- */

  ui.createMenu("⚡ Smart Task")

    .addSubMenu(navigationMenu)

    .addSubMenu(taskActionsMenu)

    .addSeparator()

    .addSubMenu(calendarMenu)

    .addSubMenu(timelineMenu)

    .addSeparator()

    .addSubMenu(refreshMenu)

    .addSeparator()

    .addSubMenu(workspaceMenu)

    .addSubMenu(syncMenu)

    .addToUi();
}

/* ==========================================================================
 * WORKSPACE SETUP
 * ========================================================================== */

function setupSmartTaskSafe_() {
  runSafely_("Workspace Setup", function () {
    if (typeof setupSmartTask !== "function") {
      throw new Error("Workspace setup module is not available.");
    }

    setupSmartTask();
  });
}

/* ==========================================================================
 * DASHBOARD
 * ========================================================================== */

function openDashboard_() {
  runSafely_("Dashboard", function () {
    const spreadsheet = SpreadsheetApp.getActive();

    const sheet = getOrCreateSheet_(SHEETS.DASHBOARD);

    spreadsheet.setActiveSheet(sheet);

    if (typeof renderDashboard_ === "function") {
      renderDashboard_();
    }
  });
}

function refreshDashboardSafe_() {
  runSafely_("Refresh Dashboard", function () {
    requireMenuFunction_(renderDashboard_, "Dashboard renderer");

    renderDashboard_();
  });
}

/* ==========================================================================
 * TODAY
 * ========================================================================== */

function openToday_() {
  runSafely_("Today", function () {
    const spreadsheet = SpreadsheetApp.getActive();

    const sheet = getOrCreateSheet_(SHEETS.TODAY);

    spreadsheet.setActiveSheet(sheet);

    if (typeof renderToday_ === "function") {
      renderToday_();
    }
  });
}

function refreshTodaySafe_() {
  runSafely_("Refresh Today", function () {
    requireMenuFunction_(renderToday_, "Today renderer");

    renderToday_();
  });
}

/* ==========================================================================
 * TASKS
 * ========================================================================== */

function openTasks_() {
  runSafely_("Tasks", function () {
    const spreadsheet = SpreadsheetApp.getActive();

    const sheet = getOrCreateSheet_(SHEETS.TASKS);

    spreadsheet.setActiveSheet(sheet);

    /* ------------------------------------------------------------------
     * SUMMARY / STYLE
     * ---------------------------------------------------------------- */

    if (typeof renderTaskSummary_ === "function") {
      renderTaskSummary_();
    }

    /* ------------------------------------------------------------------
     * FILTER
     * ---------------------------------------------------------------- */

    if (typeof setupTasksFilter_ === "function") {
      setupTasksFilter_();
    }
  });
}

function refreshTasksSafe_() {
  runSafely_("Refresh Tasks", function () {
    if (typeof renderTaskSummary_ !== "function") {
      throw new Error("Tasks renderer is not available.");
    }

    renderTaskSummary_();
  });
}

/* ==========================================================================
 * PROJECTS
 * ========================================================================== */

/**
 * 14_Projects.gs owns:
 *
 * openProjects_()
 * refreshProjects_()
 * quickAddProjectPrompt_()
 *
 * These wrappers prevent duplicate global module functions.
 */
function openProjectsFromMenu_() {
  runSafely_("Projects", function () {
    if (typeof openProjects_ !== "function") {
      throw new Error(
        "Projects module is not available. Make sure 14_Projects.gs has been added and pushed.",
      );
    }

    openProjects_();
  });
}

function quickAddProjectFromMenu_() {
  runSafely_("Quick Add Project", function () {
    if (typeof quickAddProjectPrompt_ !== "function") {
      throw new Error("Quick Add Project is not available.");
    }

    quickAddProjectPrompt_();
  });
}

function refreshProjectsSafe_() {
  runSafely_("Refresh Projects", function () {
    if (typeof refreshProjects_ !== "function") {
      throw new Error("Projects renderer is not available.");
    }

    refreshProjects_();
  });
}

/* ==========================================================================
 * KANBAN
 * ========================================================================== */

/**
 * 11_Kanban.gs may own openKanban_().
 *
 * Use a menu wrapper to avoid duplicate global functions.
 */
function openKanbanFromMenu_() {
  runSafely_("Kanban", function () {
    const spreadsheet = SpreadsheetApp.getActive();

    const sheet = getOrCreateSheet_(SHEETS.KANBAN);

    spreadsheet.setActiveSheet(sheet);

    if (typeof renderKanban_ !== "function") {
      throw new Error(
        "Kanban module is not available. Make sure 11_Kanban.gs has been added and pushed.",
      );
    }

    renderKanban_();
  });
}

function refreshKanbanSafe_() {
  runSafely_("Refresh Kanban", function () {
    if (typeof renderKanban_ !== "function") {
      throw new Error("Kanban renderer is not available.");
    }

    renderKanban_();
  });
}

/* ==========================================================================
 * CALENDAR
 * ========================================================================== */

function openCalendar_() {
  runSafely_("Calendar", function () {
    const spreadsheet = SpreadsheetApp.getActive();

    const sheet = getOrCreateSheet_(SHEETS.CALENDAR);

    spreadsheet.setActiveSheet(sheet);

    if (typeof renderCalendar_ !== "function") {
      throw new Error(
        "Calendar module is not available. Make sure 12_Calendar.gs has been added and pushed.",
      );
    }

    renderCalendar_();
  });
}

function calendarPreviousMonthSafe_() {
  runSafely_("Previous Month", function () {
    if (typeof calendarPreviousMonth_ !== "function") {
      throw new Error("Calendar month navigation is not available.");
    }

    calendarPreviousMonth_();
  });
}

function calendarCurrentMonthSafe_() {
  runSafely_("Current Month", function () {
    if (typeof calendarCurrentMonth_ !== "function") {
      throw new Error("Calendar month navigation is not available.");
    }

    calendarCurrentMonth_();
  });
}

function calendarNextMonthSafe_() {
  runSafely_("Next Month", function () {
    if (typeof calendarNextMonth_ !== "function") {
      throw new Error("Calendar month navigation is not available.");
    }

    calendarNextMonth_();
  });
}

function refreshCalendarSafe_() {
  runSafely_("Refresh Calendar", function () {
    if (typeof renderCalendar_ !== "function") {
      throw new Error("Calendar renderer is not available.");
    }

    renderCalendar_();
  });
}

/* ==========================================================================
 * TIMELINE
 * ========================================================================== */

/**
 * 13_Timeline.gs owns openTimeline_().
 */
function openTimelineFromMenu_() {
  runSafely_("Timeline", function () {
    if (typeof openTimeline_ !== "function") {
      throw new Error(
        "Timeline module is not available. Make sure 13_Timeline.gs has been added and pushed.",
      );
    }

    openTimeline_();
  });
}

function timelinePreviousPeriodSafe_() {
  runSafely_("Previous Timeline Period", function () {
    if (typeof timelinePreviousPeriod_ !== "function") {
      throw new Error("Timeline navigation is not available.");
    }

    timelinePreviousPeriod_();
  });
}

function timelineCurrentPeriodSafe_() {
  runSafely_("Current Timeline Period", function () {
    if (typeof timelineCurrentPeriod_ !== "function") {
      throw new Error("Timeline navigation is not available.");
    }

    timelineCurrentPeriod_();
  });
}

function timelineNextPeriodSafe_() {
  runSafely_("Next Timeline Period", function () {
    if (typeof timelineNextPeriod_ !== "function") {
      throw new Error("Timeline navigation is not available.");
    }

    timelineNextPeriod_();
  });
}

function refreshTimelineSafe_() {
  runSafely_("Refresh Timeline", function () {
    if (typeof renderTimeline_ !== "function") {
      throw new Error("Timeline renderer is not available.");
    }

    renderTimeline_();
  });
}

/* ==========================================================================
 * QUICK ADD TASK
 * ========================================================================== */

function quickAddTaskPrompt_() {
  runSafely_("Quick Add Task", function () {
    if (typeof showQuickAddTask_ !== "function") {
      throw new Error(
        "Quick Add module is not available. Make sure 10_QuickAdd.gs has been added and pushed.",
      );
    }

    showQuickAddTask_();
  });
}

/* ==========================================================================
 * OPEN SELECTED TASK
 * ========================================================================== */

/**
 * Context-aware Task Details opener.
 *
 * Supported:
 * Tasks
 * Kanban
 * Calendar
 * Timeline
 */
function openSelectedTaskContext_() {
  runSafely_("Task Details", function () {
    const sheet = SpreadsheetApp.getActive().getActiveSheet();

    if (!sheet) {
      throw new Error("No active sheet was found.");
    }

    const sheetName = sheet.getName();

    /* ------------------------------------------------------------------
     * TASKS
     * ---------------------------------------------------------------- */

    if (sheetName === SHEETS.TASKS) {
      if (typeof openSelectedTaskDetails_ !== "function") {
        throw new Error("Task Details module is not available.");
      }

      openSelectedTaskDetails_();

      return;
    }

    /* ------------------------------------------------------------------
     * KANBAN
     * ---------------------------------------------------------------- */

    if (sheetName === SHEETS.KANBAN) {
      if (typeof openSelectedKanbanTask_ !== "function") {
        throw new Error("Kanban task selection is not available.");
      }

      openSelectedKanbanTask_();

      return;
    }

    /* ------------------------------------------------------------------
     * CALENDAR
     * ---------------------------------------------------------------- */

    if (sheetName === SHEETS.CALENDAR) {
      if (typeof openSelectedCalendarTask_ !== "function") {
        throw new Error("Calendar task selection is not available.");
      }

      openSelectedCalendarTask_();

      return;
    }

    /* ------------------------------------------------------------------
     * TIMELINE
     * ---------------------------------------------------------------- */

    if (sheetName === SHEETS.TIMELINE) {
      if (typeof openSelectedTimelineTask_ !== "function") {
        throw new Error("Timeline task selection is not available.");
      }

      openSelectedTimelineTask_();

      return;
    }

    /* ------------------------------------------------------------------
     * INVALID CONTEXT
     * ---------------------------------------------------------------- */

    showErrorDialog_({
      title: "Open Task",

      summary: "Không tìm thấy task trong vùng đang chọn.",

      detail:
        "Open Selected Task chỉ hoạt động trên Tasks, Kanban, Calendar hoặc Timeline.",

      code: "INVALID_TASK_CONTEXT",

      help: [
        "Mở Tasks, Kanban, Calendar hoặc Timeline.",

        "Chọn đúng task cần xem.",

        "Chạy lại Open Selected Task.",
      ],
    });
  });
}

/* ==========================================================================
 * REFRESH AFTER TASK CHANGE
 * ========================================================================== */

/**
 * Called after:
 *
 * createTask_
 * updateTask_
 * completeTask_
 * deleteTask_
 *
 * Every renderer is isolated.
 */
function refreshViewsAfterTaskChange_() {
  const jobs = [
    {
      name: "Dashboard",

      fn: typeof renderDashboard_ === "function" ? renderDashboard_ : null,
    },

    {
      name: "Today",

      fn: typeof renderToday_ === "function" ? renderToday_ : null,
    },

    {
      name: "Tasks",

      fn: typeof renderTaskSummary_ === "function" ? renderTaskSummary_ : null,
    },

    {
      name: "Projects",

      fn: typeof refreshProjects_ === "function" ? refreshProjects_ : null,
    },

    {
      name: "Kanban",

      fn: typeof renderKanban_ === "function" ? renderKanban_ : null,
    },

    {
      name: "Calendar",

      fn: typeof renderCalendar_ === "function" ? renderCalendar_ : null,
    },

    {
      name: "Timeline",

      fn: typeof renderTimeline_ === "function" ? renderTimeline_ : null,
    },
  ];

  jobs.forEach(function (job) {
    if (!job.fn) {
      return;
    }

    runQuietly_("Auto Refresh: " + job.name, job.fn);
  });
}

/* ==========================================================================
 * REFRESH EVERYTHING
 * ========================================================================== */

function refreshAll_() {
  runSafely_("Refresh Workspace", function () {
    const failed = [];

    let refreshedCount = 0;

    /* ------------------------------------------------------------------
     * SMART ENGINE FIRST
     * ---------------------------------------------------------------- */

    if (typeof recalculateAllSmartFields_ === "function") {
      const smartEngineOk = runQuietly_(
        "Smart Engine Recalculation",
        recalculateAllSmartFields_,
      );

      if (!smartEngineOk) {
        failed.push("Smart Engine");
      }
    }

    /* ------------------------------------------------------------------
     * VIEWS
     * ---------------------------------------------------------------- */

    const jobs = [
      {
        name: "Dashboard",

        fn: typeof renderDashboard_ === "function" ? renderDashboard_ : null,
      },

      {
        name: "Today",

        fn: typeof renderToday_ === "function" ? renderToday_ : null,
      },

      {
        name: "Tasks",

        fn:
          typeof renderTaskSummary_ === "function" ? renderTaskSummary_ : null,
      },

      {
        name: "Projects",

        fn: typeof refreshProjects_ === "function" ? refreshProjects_ : null,
      },

      {
        name: "Kanban",

        fn: typeof renderKanban_ === "function" ? renderKanban_ : null,
      },

      {
        name: "Calendar",

        fn: typeof renderCalendar_ === "function" ? renderCalendar_ : null,
      },

      {
        name: "Timeline",

        fn: typeof renderTimeline_ === "function" ? renderTimeline_ : null,
      },
    ];

    jobs.forEach(function (job) {
      if (!job.fn) {
        return;
      }

      const success = runQuietly_("Refresh: " + job.name, job.fn);

      if (success) {
        refreshedCount++;
      } else {
        failed.push(job.name);
      }
    });

    /* ------------------------------------------------------------------
     * FEEDBACK
     * ---------------------------------------------------------------- */

    let message =
      refreshedCount +
      " view" +
      (refreshedCount === 1 ? "" : "s") +
      " refreshed";

    if (failed.length > 0) {
      message += " • " + failed.length + " failed";
    }

    if (typeof toast_ === "function") {
      toast_(message, "Smart Task");
    } else {
      SpreadsheetApp.getActive().toast(message, "Smart Task", 4);
    }

    /*
     * If something failed, show one useful dialog
     * after all other views finished refreshing.
     */
    if (failed.length > 0) {
      showErrorDialog_({
        title: "Refresh Workspace",

        summary: "Workspace đã refresh nhưng một số module gặp lỗi.",

        detail: "Failed modules: " + failed.join(", "),

        code: "PARTIAL_REFRESH_FAILURE",

        help: [
          "Các module còn lại vẫn được refresh bình thường.",

          "Kiểm tra module được liệt kê trong phần Technical Details.",

          "Mở Apps Script → Executions để xem log lỗi chi tiết.",
        ],
      });
    }
  });
}

/* ==========================================================================
 * MENU FUNCTION GUARD
 * ========================================================================== */

function requireMenuFunction_(fn, name) {
  if (typeof fn !== "function") {
    throw new Error(String(name || "Required module") + " is not available.");
  }

  return fn;
}

/* ==========================================================================
 * COMPATIBILITY HELPER
 * ========================================================================== */

function getMenuErrorMessage_(error) {
  if (typeof getAppErrorMessage_ === "function") {
    return getAppErrorMessage_(error);
  }

  if (error && error.message) {
    return error.message;
  }

  return String(error || "Unknown error");
}
