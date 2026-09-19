/**
 * 14_Projects.gs
 * -----------------------------------------------------------------------
 * FRAME 11 — PROJECTS — PROFESSIONAL V3
 *
 * A:H  = live CRUD table (owned by 03_Data.gs)
 * I    = spacer
 * J:X  = dashboard overlay
 *
 * This file NEVER rewrites the business table layout in A:H.
 * It only:
 * - recomputes Health
 * - renders a professional dashboard overlay in J:X
 * -----------------------------------------------------------------------
 */

/* ==========================================================================
 * CONFIG
 * ========================================================================== */

const PROJECT_OVERLAY_START_COL = 10; // J
const PROJECT_OVERLAY_WIDTH = 15; // J:X

const PROJECT_LAYOUT = {
  accentRow: 1,
  titleRow: 2,
  subtitleRow: 3,
  contextRow: 4,

  kpiLabelRow: 6,
  kpiValueRow: 7,
  kpiDescRow: 8,

  sectionRow: 10,
  firstCardRow: 12,

  cardBodyRows: 6,
  cardGapRows: 1,
};

const PROJECT_THEME = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  surface2: "#F1F5F9",

  text: "#0F172A",
  text2: "#475569",
  muted: "#94A3B8",

  border: "#E2E8F0",
  borderStrong: "#CBD5E1",

  primary: "#4F46E5",
  primarySoft: "#EEF2FF",

  info: "#2563EB",
  infoSoft: "#EFF6FF",

  success: "#16A34A",
  successSoft: "#ECFDF5",

  warning: "#D97706",
  warningSoft: "#FFF7ED",

  danger: "#DC2626",
  dangerSoft: "#FEF2F2",

  dark: "#172033",
  white: "#FFFFFF",
};

const PROJECT_HEALTH_WEIGHTS = {
  perOverdueTask: 15,
  perBlockedTask: 8,
  perCriticalTask: 10,
  lowProgressPenalty: 10,
  buckets: {
    critical: 40,
    atRisk: 25,
    attention: 10,
  },
};

/* ==========================================================================
 * NAVIGATION
 * ========================================================================== */

function openProjects_() {
  const spreadsheet = SpreadsheetApp.getActive();
  const sheet = getOrCreateSheet_(SHEETS.PROJECTS);
  spreadsheet.setActiveSheet(sheet);
  refreshProjects_();
}

function refreshProjects_() {
  recalculateAllProjectHealth_();
  renderProjectsOverlay_();
}

/* ==========================================================================
 * DATA HELPERS
 * ========================================================================== */

function isMeaningfulProjectRow_(project) {
  if (!project) return false;

  const projectId = String(project.ProjectId || "").trim();
  const projectName = String(project.ProjectName || "").trim();

  /*
   * A real project must have an ID or a name.
   *
   * IMPORTANT:
   * Do not use Health / Area / Description to determine whether a row
   * is a real project because those columns may contain validation,
   * computed values or stale formatting/content on otherwise empty rows.
   */
  return Boolean(projectId || projectName);
}

function normalizeProjects_(projects) {
  return (projects || []).filter(function (project) {
    return isMeaningfulProjectRow_(project);
  });
}

function computeProjectMetrics_(project, allTasks) {
  const projectId = String((project && project.ProjectId) || "").trim();
  const projectName = String((project && project.ProjectName) || "").trim();

  /*
   * CRITICAL GUARD
   * ---------------------------------------------------------------------
   * An empty project must never match tasks whose Project field is empty.
   *
   * Without this guard:
   *   task.Project === "" && project.ProjectId === ""
   * could make every empty project row inherit all unassigned tasks.
   */
  if (!projectId && !projectName) {
    return {
      taskCount: 0,
      openCount: 0,
      completedCount: 0,
      overdueCount: 0,
      blockedCount: 0,
      criticalCount: 0,
      progress: 0,
      topTask: null,
    };
  }

  const tasks = (allTasks || []).filter(function (task) {
    const taskProject = String(task.Project || "").trim();

    /*
     * Unassigned tasks do not belong to any project.
     */
    if (!taskProject) return false;

    /*
     * Prefer ProjectId.
     * ProjectName is kept as a compatibility fallback for older rows
     * where Task.Project may have stored the project name.
     */
    if (projectId && taskProject === projectId) return true;
    if (projectName && taskProject === projectName) return true;

    return false;
  });

  const openTasks = tasks.filter(function (task) {
    return String(task.Status || "") !== "Completed";
  });

  const completedTasks = tasks.filter(function (task) {
    return String(task.Status || "") === "Completed";
  });

  const today = stripTime_(now_());

  const overdueTasks = openTasks.filter(function (task) {
    const difference = daysBetween_(today, task.DueDate);
    return difference !== null && difference < 0;
  });

  const blockedTasks = openTasks.filter(function (task) {
    return String(task.Status || "") === "Waiting";
  });

  const criticalTasks = openTasks.filter(function (task) {
    const priority = String(task.Priority || "");
    return priority === "Critical" || priority === "Urgent";
  });

  /*
   * Project progress = average progress of linked tasks.
   * Completed tasks are always counted as 100% for display consistency.
   */
  const progress =
    tasks.length > 0
      ? Math.round(
          tasks.reduce(function (total, task) {
            const status = String(task.Status || "");

            const value =
              status === "Completed"
                ? 100
                : Math.max(0, Math.min(100, Number(task.Progress) || 0));

            return total + value;
          }, 0) / tasks.length,
        )
      : 0;

  const topTask =
    openTasks.slice().sort(function (first, second) {
      return (Number(second.SmartScore) || 0) - (Number(first.SmartScore) || 0);
    })[0] || null;

  return {
    taskCount: tasks.length,
    openCount: openTasks.length,
    completedCount: completedTasks.length,
    overdueCount: overdueTasks.length,
    blockedCount: blockedTasks.length,
    criticalCount: criticalTasks.length,
    progress: progress,
    topTask: topTask,
  };
}

function computeProjectHealth_(metrics) {
  let points = 0;

  points += metrics.overdueCount * PROJECT_HEALTH_WEIGHTS.perOverdueTask;
  points += metrics.blockedCount * PROJECT_HEALTH_WEIGHTS.perBlockedTask;
  points += metrics.criticalCount * PROJECT_HEALTH_WEIGHTS.perCriticalTask;

  if (metrics.taskCount > 0 && metrics.progress < 30) {
    points += PROJECT_HEALTH_WEIGHTS.lowProgressPenalty;
  }

  if (points >= PROJECT_HEALTH_WEIGHTS.buckets.critical) return "Critical";
  if (points >= PROJECT_HEALTH_WEIGHTS.buckets.atRisk) return "At Risk";
  if (points >= PROJECT_HEALTH_WEIGHTS.buckets.attention) return "Attention";
  return "Healthy";
}

/* ==========================================================================
 * RECALCULATE HEALTH
 * ========================================================================== */

function recalculateAllProjectHealth_() {
  const sheet = getOrCreateSheet_(SHEETS.PROJECTS);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return;

  const allTasks = getAllTasks_();

  const values = sheet
    .getRange(2, 1, lastRow - 1, PROJECT_HEADERS.length)
    .getValues();

  const healthCol = PROJECT_HEADERS.indexOf("Health");

  if (healthCol < 0) {
    throw new Error("Projects schema is missing the Health column.");
  }

  values.forEach(function (row) {
    const project = {};

    PROJECT_HEADERS.forEach(function (header, index) {
      project[header] = row[index];
    });

    /*
     * Empty row:
     * clear stale Health and do not calculate metrics.
     */
    if (!isMeaningfulProjectRow_(project)) {
      row[healthCol] = "";
      return;
    }

    const metrics = computeProjectMetrics_(project, allTasks);
    row[healthCol] = computeProjectHealth_(metrics);
  });

  sheet.getRange(2, 1, values.length, PROJECT_HEADERS.length).setValues(values);
}

/* ==========================================================================
 * MAIN RENDER
 * ========================================================================== */

function renderProjectsOverlay_() {
  const sheet = getOrCreateSheet_(SHEETS.PROJECTS);
  const rawProjects = getAllProjects_();
  const projects = normalizeProjects_(rawProjects);
  const allTasks = getAllTasks_();

  const enriched = projects.map(function (project) {
    const metrics = computeProjectMetrics_(project, allTasks);
    return {
      project: project,
      metrics: metrics,
      health: project.Health || computeProjectHealth_(metrics),
    };
  });

  prepareProjectsCanvas_(sheet, enriched.length);
  writeProjectsHeader_(sheet, enriched);
  writeProjectsKpis_(sheet, enriched);
  writeProjectsSectionHeader_(sheet, enriched);

  if (enriched.length === 0) {
    writeProjectsEmptyState_(sheet);
    return;
  }

  writeProjectsCards_(sheet, enriched);
}

/* ==========================================================================
 * CANVAS
 * ========================================================================== */

function prepareProjectsCanvas_(sheet, projectCount) {
  const col = PROJECT_OVERLAY_START_COL;
  const totalRows =
    PROJECT_LAYOUT.firstCardRow +
    Math.max(projectCount, 1) *
      (PROJECT_LAYOUT.cardBodyRows + PROJECT_LAYOUT.cardGapRows) +
    4;
  const lastOverlayCol = col + PROJECT_OVERLAY_WIDTH - 1;

  if (sheet.getMaxRows() < totalRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), totalRows - sheet.getMaxRows());
  }

  if (sheet.getMaxColumns() < lastOverlayCol) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      lastOverlayCol - sheet.getMaxColumns(),
    );
  }

  sheet.setHiddenGridlines(true);

  sheet.getRange(1, col, totalRows, PROJECT_OVERLAY_WIDTH).breakApart();
  sheet
    .getRange(1, col, totalRows, PROJECT_OVERLAY_WIDTH)
    .clearContent()
    .clearFormat()
    .clearNote();

  sheet
    .getRange(1, col, totalRows, PROJECT_OVERLAY_WIDTH)
    .setBackground(PROJECT_THEME.bg)
    .setFontFamily("Arial")
    .setFontColor(PROJECT_THEME.text)
    .setVerticalAlignment("middle");

  // spacer column I
  sheet.setColumnWidth(9, 20);

  // J:X widths
  const widths = [
    28, // J stripe
    120, // K
    120, // L
    120, // M
    120, // N
    110, // O
    110, // P
    110, // Q
    110, // R
    110, // S
    110, // T
    110, // U
    110, // V
    110, // W
    110, // X
  ];

  widths.forEach(function (width, index) {
    sheet.setColumnWidth(col + index, width);
  });

  sheet.setRowHeight(PROJECT_LAYOUT.accentRow, 6);
  sheet.setRowHeight(PROJECT_LAYOUT.titleRow, 48);
  sheet.setRowHeight(PROJECT_LAYOUT.subtitleRow, 26);
  sheet.setRowHeight(PROJECT_LAYOUT.contextRow, 28);

  sheet.setRowHeight(PROJECT_LAYOUT.kpiLabelRow, 24);
  sheet.setRowHeight(PROJECT_LAYOUT.kpiValueRow, 34);
  sheet.setRowHeight(PROJECT_LAYOUT.kpiDescRow, 24);

  sheet.setRowHeight(PROJECT_LAYOUT.sectionRow, 34);

  try {
    sheet.setFrozenColumns(PROJECT_HEADERS.length); // freeze A:H only
  } catch (error) {
    console.warn("Freeze skipped:", error.message);
  }
}

/* ==========================================================================
 * HEADER
 * ========================================================================== */

function writeProjectsHeader_(sheet, enriched) {
  const col = PROJECT_OVERLAY_START_COL;
  const worst = worstProjectHealth_(enriched);
  const tone = getProjectHealthTone_(worst);

  sheet
    .getRange(PROJECT_LAYOUT.accentRow, col, 1, PROJECT_OVERLAY_WIDTH)
    .setBackground(tone.text);

  try {
    sheet.setTabColor(tone.text);
  } catch (error) {}

  sheet
    .getRange(PROJECT_LAYOUT.titleRow, col, 1, 8)
    .merge()
    .setValue("Projects")
    .setFontSize(28)
    .setFontWeight("bold")
    .setFontColor(PROJECT_THEME.text);

  const dateLabel = Utilities.formatDate(
    now_(),
    Session.getScriptTimeZone(),
    "EEE, dd MMM yyyy",
  ).toUpperCase();
  sheet
    .getRange(PROJECT_LAYOUT.titleRow, col + 8, 1, 7)
    .merge()
    .setValue(dateLabel)
    .setFontSize(10)
    .setFontWeight("bold")
    .setFontColor(PROJECT_THEME.primary)
    .setHorizontalAlignment("right");

  sheet
    .getRange(PROJECT_LAYOUT.subtitleRow, col, 1, PROJECT_OVERLAY_WIDTH)
    .merge()
    .setValue(
      "A clear view of your personal projects, progress, risks and next focus.",
    )
    .setFontSize(10)
    .setFontColor(PROJECT_THEME.text2);

  const attentionCount = enriched.filter(function (entry) {
    return (
      entry.health === "Attention" ||
      entry.health === "At Risk" ||
      entry.health === "Critical"
    );
  }).length;

  const activeCount = enriched.filter(function (entry) {
    return entry.metrics.openCount > 0;
  }).length;

  let context = "PORTFOLIO HEALTH  •  ";
  if (enriched.length === 0) {
    context += "No projects yet";
  } else if (attentionCount > 0) {
    context +=
      attentionCount +
      " project" +
      (attentionCount === 1 ? "" : "s") +
      " need attention";
  } else {
    context += "All projects look healthy";
  }
  context += "  •  " + activeCount + " active";

  sheet
    .getRange(PROJECT_LAYOUT.contextRow, col, 1, PROJECT_OVERLAY_WIDTH)
    .merge()
    .setValue(context)
    .setBackground(tone.soft)
    .setFontColor(tone.text)
    .setFontSize(9)
    .setFontWeight("bold")
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      PROJECT_THEME.border,
      SpreadsheetApp.BorderStyle.SOLID,
    );
}

/* ==========================================================================
 * KPI
 * ========================================================================== */

function writeProjectsKpis_(sheet, enriched) {
  const col = PROJECT_OVERLAY_START_COL;

  const total = enriched.length;

  const active = enriched.filter(function (entry) {
    return entry.metrics.openCount > 0;
  }).length;

  const atRisk = enriched.filter(function (entry) {
    return entry.health === "At Risk" || entry.health === "Critical";
  }).length;

  const avgProgress =
    total > 0
      ? Math.round(
          enriched.reduce(function (sum, entry) {
            return sum + entry.metrics.progress;
          }, 0) / total,
        )
      : 0;

  const cards = [
    {
      start: 0,
      width: 3,
      label: "TOTAL PROJECTS",
      value: total,
      description: "Personal projects",
      tone: getTone_("primary"),
    },
    {
      start: 4,
      width: 3,
      label: "ACTIVE",
      value: active,
      description: "With open tasks",
      tone: getTone_("info"),
    },
    {
      start: 8,
      width: 3,
      label: "AT RISK",
      value: atRisk,
      description: atRisk > 0 ? "Needs attention" : "No critical risks",
      tone: atRisk > 0 ? getTone_("danger") : getTone_("success"),
    },
    {
      start: 12,
      width: 3,
      label: "AVG PROGRESS",
      value: avgProgress + "%",
      description: "Across all projects",
      tone:
        avgProgress >= 75
          ? getTone_("success")
          : avgProgress >= 45
            ? getTone_("primary")
            : getTone_("warning"),
    },
  ];

  cards.forEach(function (card) {
    const startCol = col + card.start;

    sheet
      .getRange(PROJECT_LAYOUT.kpiLabelRow, startCol, 3, card.width)
      .setBackground(PROJECT_THEME.surface)
      .setBorder(
        true,
        true,
        true,
        true,
        false,
        false,
        PROJECT_THEME.border,
        SpreadsheetApp.BorderStyle.SOLID,
      );

    sheet
      .getRange(PROJECT_LAYOUT.kpiLabelRow, startCol, 1, card.width)
      .merge()
      .setValue(card.label)
      .setBackground(card.tone.soft)
      .setFontColor(card.tone.text)
      .setFontSize(8)
      .setFontWeight("bold");

    sheet
      .getRange(PROJECT_LAYOUT.kpiValueRow, startCol, 1, card.width)
      .merge()
      .setValue(card.value)
      .setFontColor(card.tone.text)
      .setFontSize(21)
      .setFontWeight("bold");

    sheet
      .getRange(PROJECT_LAYOUT.kpiDescRow, startCol, 1, card.width)
      .merge()
      .setValue(card.description)
      .setFontColor(PROJECT_THEME.text2)
      .setFontSize(8);
  });
}

/* ==========================================================================
 * SECTION HEADER
 * ========================================================================== */

function writeProjectsSectionHeader_(sheet, enriched) {
  const col = PROJECT_OVERLAY_START_COL;

  sheet
    .getRange(PROJECT_LAYOUT.sectionRow, col, 1, 8)
    .merge()
    .setValue("Project Portfolio")
    .setFontSize(15)
    .setFontWeight("bold")
    .setFontColor(PROJECT_THEME.text);

  sheet
    .getRange(PROJECT_LAYOUT.sectionRow, col + 8, 1, 7)
    .merge()
    .setValue(
      enriched.length +
        " project" +
        (enriched.length === 1 ? "" : "s") +
        "  •  Sorted by health",
    )
    .setFontSize(8)
    .setFontColor(PROJECT_THEME.muted)
    .setHorizontalAlignment("right");
}

/* ==========================================================================
 * EMPTY STATE
 * ========================================================================== */

function writeProjectsEmptyState_(sheet) {
  const col = PROJECT_OVERLAY_START_COL;

  sheet
    .getRange(PROJECT_LAYOUT.firstCardRow, col, 4, PROJECT_OVERLAY_WIDTH)
    .merge()
    .setValue(
      "NO PROJECTS YET\n\n" +
        "Create your first project from:\n" +
        "⚡ Smart Task → Task Actions → Quick Add Project",
    )
    .setBackground(PROJECT_THEME.surface)
    .setFontColor(PROJECT_THEME.muted)
    .setFontSize(10)
    .setFontWeight("bold")
    .setWrap(true)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      PROJECT_THEME.border,
      SpreadsheetApp.BorderStyle.SOLID,
    );

  for (
    let row = PROJECT_LAYOUT.firstCardRow;
    row < PROJECT_LAYOUT.firstCardRow + 4;
    row++
  ) {
    sheet.setRowHeight(row, 32);
  }
}

/* ==========================================================================
 * PROJECT CARDS
 * ========================================================================== */

function writeProjectsCards_(sheet, enriched) {
  const order = {
    Critical: 0,
    "At Risk": 1,
    Attention: 2,
    Healthy: 3,
  };

  const sorted = enriched.slice().sort(function (a, b) {
    const healthDiff = order[a.health] - order[b.health];
    if (healthDiff !== 0) return healthDiff;
    if (b.metrics.overdueCount !== a.metrics.overdueCount)
      return b.metrics.overdueCount - a.metrics.overdueCount;
    if (b.metrics.openCount !== a.metrics.openCount)
      return b.metrics.openCount - a.metrics.openCount;
    return String(a.project.ProjectName || "").localeCompare(
      String(b.project.ProjectName || ""),
    );
  });

  let row = PROJECT_LAYOUT.firstCardRow;
  sorted.forEach(function (entry) {
    row = writeProjectCard_(sheet, row, entry);
  });
}

function writeProjectCard_(sheet, startRow, entry) {
  const col = PROJECT_OVERLAY_START_COL;
  const project = entry.project;
  const metrics = entry.metrics;
  const healthTone = getProjectHealthTone_(entry.health);
  const progressTone = getProgressTone_(metrics.progress);

  const bodyRows = PROJECT_LAYOUT.cardBodyRows;

  // Card shell
  sheet
    .getRange(startRow, col, bodyRows, PROJECT_OVERLAY_WIDTH)
    .setBackground(PROJECT_THEME.surface)
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      PROJECT_THEME.border,
      SpreadsheetApp.BorderStyle.SOLID,
    );

  // Left colored stripe
  sheet.getRange(startRow, col, bodyRows, 1).setBackground(healthTone.text);

  // Row 1: name + badge
  sheet
    .getRange(startRow, col + 1, 1, 8)
    .merge()
    .setValue(project.ProjectName || "Untitled project")
    .setFontSize(14)
    .setFontWeight("bold")
    .setFontColor(PROJECT_THEME.text);

  sheet
    .getRange(startRow, col + 10, 1, 4)
    .merge()
    .setValue(String(entry.health || "Healthy").toUpperCase())
    .setBackground(healthTone.soft)
    .setFontColor(healthTone.text)
    .setFontSize(8)
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  // Row 2: meta + progress summary
  sheet
    .getRange(startRow + 1, col + 1, 1, 8)
    .merge()
    .setValue(
      (project.Area || "No area") +
        "  •  " +
        getProjectTargetLabel_(project.TargetDate),
    )
    .setFontSize(9)
    .setFontColor(PROJECT_THEME.text2);

  sheet
    .getRange(startRow + 1, col + 10, 1, 4)
    .merge()
    .setValue(metrics.progress + "% COMPLETE")
    .setFontSize(8)
    .setFontWeight("bold")
    .setFontColor(progressTone.text)
    .setHorizontalAlignment("right");

  // Row 3: progress bar
  sheet
    .getRange(startRow + 2, col + 1, 1, 13)
    .merge()
    .setValue(buildProjectProgressBar_(metrics.progress, 30))
    .setFontSize(10)
    .setFontColor(progressTone.text);

  // Row 4: metric chips
  writeMetricChip_(
    sheet,
    startRow + 3,
    col + 1,
    3,
    "OPEN",
    metrics.openCount,
    getTone_("info"),
  );
  writeMetricChip_(
    sheet,
    startRow + 3,
    col + 4,
    3,
    "DONE",
    metrics.completedCount,
    getTone_("success"),
  );
  writeMetricChip_(
    sheet,
    startRow + 3,
    col + 7,
    4,
    "OVERDUE",
    metrics.overdueCount,
    metrics.overdueCount > 0 ? getTone_("danger") : getTone_("neutral"),
  );
  writeMetricChip_(
    sheet,
    startRow + 3,
    col + 11,
    3,
    "WAITING",
    metrics.blockedCount,
    metrics.blockedCount > 0 ? getTone_("warning") : getTone_("neutral"),
  );

  // Row 5: top focus
  sheet
    .getRange(startRow + 4, col + 1, 1, 2)
    .merge()
    .setValue("TOP FOCUS")
    .setBackground(PROJECT_THEME.primarySoft)
    .setFontColor(PROJECT_THEME.primary)
    .setFontSize(8)
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  sheet
    .getRange(startRow + 4, col + 3, 1, 11)
    .merge()
    .setValue(getProjectTopFocusText_(metrics))
    .setFontSize(9)
    .setFontWeight(metrics.topTask ? "bold" : "normal")
    .setFontColor(metrics.topTask ? PROJECT_THEME.text : PROJECT_THEME.muted);

  // Row 6: next action
  sheet
    .getRange(startRow + 5, col + 1, 1, 2)
    .merge()
    .setValue("NEXT")
    .setBackground(healthTone.soft)
    .setFontColor(healthTone.text)
    .setFontSize(8)
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  sheet
    .getRange(startRow + 5, col + 3, 1, 11)
    .merge()
    .setValue(getProjectNextAction_(entry))
    .setFontSize(9)
    .setFontColor(PROJECT_THEME.text2)
    .setWrap(true);

  // Row heights
  sheet.setRowHeight(startRow, 30);
  sheet.setRowHeight(startRow + 1, 24);
  sheet.setRowHeight(startRow + 2, 24);
  sheet.setRowHeight(startRow + 3, 28);
  sheet.setRowHeight(startRow + 4, 28);
  sheet.setRowHeight(startRow + 5, 30);

  const gapRow = startRow + bodyRows;
  sheet.setRowHeight(gapRow, 12);

  return gapRow + PROJECT_LAYOUT.cardGapRows;
}

/* ==========================================================================
 * SMALL UI HELPERS
 * ========================================================================== */

function writeMetricChip_(sheet, row, startCol, width, label, value, tone) {
  sheet
    .getRange(row, startCol, 1, width)
    .merge()
    .setValue(label + "  " + value)
    .setBackground(tone.soft)
    .setFontColor(tone.text)
    .setFontSize(8)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      PROJECT_THEME.border,
      SpreadsheetApp.BorderStyle.SOLID,
    );
}

function buildProjectProgressBar_(progress, segments) {
  progress = Math.max(0, Math.min(100, Number(progress) || 0));
  segments = Math.max(10, Number(segments) || 20);
  const filled = Math.round((progress / 100) * segments);
  return "█".repeat(filled) + "░".repeat(segments - filled);
}

function getProjectTopFocusText_(metrics) {
  if (metrics.topTask) {
    return (
      metrics.topTask.TaskName +
      ((Number(metrics.topTask.SmartScore) || 0) > 0
        ? "  •  Score " + metrics.topTask.SmartScore
        : "")
    );
  }

  if (metrics.taskCount === 0) return "No tasks linked yet";
  return "Nothing open right now";
}

function getProjectNextAction_(entry) {
  const metrics = entry.metrics;

  if (metrics.overdueCount > 0) {
    return "Resolve overdue work first before adding more tasks.";
  }

  if (metrics.criticalCount > 0) {
    return "Reduce risk by focusing on critical tasks now.";
  }

  if (metrics.blockedCount > 0) {
    return "Review waiting tasks and remove blockers.";
  }

  if (metrics.topTask) {
    return 'Continue with "' + metrics.topTask.TaskName + '".';
  }

  if (metrics.taskCount === 0) {
    return "Add the first actionable task for this project.";
  }

  if (metrics.progress >= 100) {
    return "Project work is complete — review and close it.";
  }

  return "Review this project and define the next concrete action.";
}

function getProjectTargetLabel_(targetDate) {
  const date = stripTime_(targetDate);
  if (!date) return "No target date";

  const today = stripTime_(now_());
  const difference = daysBetween_(today, date);
  const formatted = Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    "dd MMM yyyy",
  );

  if (difference !== null && difference < 0)
    return "Target " + formatted + " • OVERDUE";
  if (difference === 0) return "Target today";
  if (difference === 1) return "Target tomorrow";
  return "Target " + formatted;
}

function worstProjectHealth_(enriched) {
  const order = {
    Critical: 0,
    "At Risk": 1,
    Attention: 2,
    Healthy: 3,
  };

  let worst = "Healthy";

  (enriched || []).forEach(function (entry) {
    if (order[entry.health] < order[worst]) {
      worst = entry.health;
    }
  });

  return worst;
}

/* ==========================================================================
 * TONES
 * ========================================================================== */

function getTone_(name) {
  switch (String(name || "").toLowerCase()) {
    case "success":
      return { text: PROJECT_THEME.success, soft: PROJECT_THEME.successSoft };
    case "warning":
      return { text: PROJECT_THEME.warning, soft: PROJECT_THEME.warningSoft };
    case "danger":
      return { text: PROJECT_THEME.danger, soft: PROJECT_THEME.dangerSoft };
    case "info":
      return { text: PROJECT_THEME.info, soft: PROJECT_THEME.infoSoft };
    case "neutral":
      return { text: PROJECT_THEME.text2, soft: PROJECT_THEME.surface2 };
    default:
      return { text: PROJECT_THEME.primary, soft: PROJECT_THEME.primarySoft };
  }
}

function getProjectHealthTone_(health) {
  switch (String(health || "")) {
    case "Critical":
      return getTone_("danger");
    case "At Risk":
      return { text: "#EA580C", soft: "#FFF7ED" };
    case "Attention":
      return getTone_("warning");
    case "Healthy":
      return getTone_("success");
    default:
      return getTone_("neutral");
  }
}

function getProgressTone_(progress) {
  progress = Number(progress) || 0;

  if (progress >= 80) return getTone_("success");
  if (progress >= 50) return getTone_("primary");
  if (progress >= 25) return getTone_("warning");
  return getTone_("danger");
}

/* ==========================================================================
 * QUICK ADD PROJECT
 * ========================================================================== */

function quickAddProjectPrompt_() {
  const ui = SpreadsheetApp.getUi();

  const result = ui.prompt(
    "Quick Add Project",
    "Enter a project name:",
    ui.ButtonSet.OK_CANCEL,
  );

  if (result.getSelectedButton() !== ui.Button.OK) return;

  const name = String(result.getResponseText() || "").trim();

  if (!name) {
    if (typeof showErrorDialog_ === "function") {
      showErrorDialog_({
        title: "Quick Add Project",
        summary: "Project name is required.",
        detail: "Enter a clear project name before creating the project.",
        code: "PROJECT_NAME_REQUIRED",
        help: [
          "Use a short outcome-based name.",
          "Example: Portfolio Website, Smart Task Manager, English B2.",
        ],
      });
    } else {
      ui.alert("Project name cannot be empty.");
    }
    return;
  }

  const projectId = createProject_({
    ProjectName: name,
  });

  refreshProjects_();

  toast_('Added "' + name + '" (' + projectId + ").", "Smart Task");
}
