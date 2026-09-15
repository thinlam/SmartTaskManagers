/**
 * 08_Tasks.gs
 * -----------------------------------------------------------------------
 * FRAME 05 — TASKS
 *
 * Professional Tasks workspace.
 *
 * IMPORTANT:
 * The Tasks sheet IS the actual task source table.
 *
 * Therefore:
 * - Row 1 must remain TASK_HEADERS.
 * - No dashboard title rows may be inserted above the source table.
 * - TaskId remains the permanent identity.
 * - Formatting never creates a second copy of task data.
 *
 * Responsibilities:
 * 1. Native Tasks filter
 * 2. Professional Tasks table styling
 * 3. Summary workspace panel
 * 4. Status / Priority / Risk / Score visual states
 * 5. Selected-task resolution
 * 6. Tasks → Task Details navigation
 * -----------------------------------------------------------------------
 */


/* ==========================================================================
 * CONFIG
 * ========================================================================== */

const TASK_SUMMARY_START_COL = 30; // AD


const TASK_VIEW_THEME = {
  background:
    COLORS.background || '#F8FAFC',

  surface:
    COLORS.surface || '#FFFFFF',

  surfaceAlt:
    '#FBFCFE',

  surface2:
    COLORS.surface2 || '#F1F5F9',

  primary:
    COLORS.primary || '#6366F1',

  primaryHover:
    COLORS.primaryHover || '#4F46E5',

  primaryLight:
    COLORS.primaryLight || '#EEF2FF',

  text:
    COLORS.text || '#0F172A',

  text2:
    COLORS.text2 || '#475569',

  muted:
    COLORS.muted || '#94A3B8',

  border:
    COLORS.border || '#E2E8F0',

  success:
    COLORS.success || '#16A34A',

  warning:
    COLORS.warning || '#D97706',

  danger:
    COLORS.danger || '#DC2626',

  info:
    COLORS.info || '#0284C7',

  successSoft:
    '#ECFDF5',

  warningSoft:
    '#FFFBEB',

  dangerSoft:
    '#FEF2F2',

  infoSoft:
    '#F0F9FF',

  darkHeader:
    '#172033',

  darkHeaderText:
    '#F8FAFC'
};


/* ==========================================================================
 * FILTER
 * ========================================================================== */

/**
 * Enable Google Sheets native filtering.
 *
 * Existing filter criteria are intentionally preserved when a filter
 * already exists.
 */
function setupTasksFilter_() {
  const sheet =
    getOrCreateSheet_(
      SHEETS.TASKS
    );

  const existing =
    sheet.getFilter();

  if (existing) {
    return;
  }

  const lastRow =
    Math.max(
      sheet.getLastRow(),
      1
    );

  sheet
    .getRange(
      1,
      1,
      lastRow,
      TASK_HEADERS.length
    )
    .createFilter();
}


/* ==========================================================================
 * MAIN TASK WORKSPACE STYLE
 * ========================================================================== */

/**
 * Professional visual treatment for the Tasks source table.
 *
 * Does not change task values.
 */
function styleTasksWorkspace_() {
  const sheet =
    getOrCreateSheet_(
      SHEETS.TASKS
    );

  const lastRow =
    Math.max(
      sheet.getLastRow(),
      1
    );

  const columnCount =
    TASK_HEADERS.length;


  /* ----------------------------------------------------------------------
   * SHEET
   * -------------------------------------------------------------------- */

  sheet.setHiddenGridlines(
    true
  );

  sheet.setFrozenRows(
    1
  );

  /*
   * TaskId + TaskName remain visible
   * while horizontal scrolling.
   */
  sheet.setFrozenColumns(
    Math.min(
      2,
      columnCount
    )
  );

  try {
    sheet.setTabColor(
      TASK_VIEW_THEME.primary
    );
  } catch (error) {
    console.warn(
      'Tasks tab color skipped:',
      error.message
    );
  }


  /* ----------------------------------------------------------------------
   * SOURCE TABLE BASE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      1,
      1,
      Math.max(
        lastRow,
        2
      ),
      columnCount
    )
    .setFontFamily(
      'Arial'
    )
    .setVerticalAlignment(
      'middle'
    );


  /* ----------------------------------------------------------------------
   * HEADER
   * -------------------------------------------------------------------- */

  const headerRange =
    sheet.getRange(
      1,
      1,
      1,
      columnCount
    );

  headerRange
    .setBackground(
      TASK_VIEW_THEME.darkHeader
    )
    .setFontColor(
      TASK_VIEW_THEME.darkHeaderText
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      9
    )
    .setHorizontalAlignment(
      'left'
    )
    .setVerticalAlignment(
      'middle'
    )
    .setWrap(
      false
    )
    .setBorder(
      false,
      false,
      true,
      false,
      false,
      false,
      TASK_VIEW_THEME.primary,
      SpreadsheetApp
        .BorderStyle
        .SOLID_MEDIUM
    );

  sheet.setRowHeight(
    1,
    38
  );


  /* ----------------------------------------------------------------------
   * COLUMN WIDTHS
   * -------------------------------------------------------------------- */

  applyTaskColumnWidths_(
    sheet
  );


  /* ----------------------------------------------------------------------
   * DATA ROW BASE
   * -------------------------------------------------------------------- */

  if (
    lastRow <= 1
  ) {
    return;
  }

  const dataRowCount =
    lastRow - 1;

  const dataRange =
    sheet.getRange(
      2,
      1,
      dataRowCount,
      columnCount
    );

  dataRange
    .setFontSize(
      10
    )
    .setFontColor(
      TASK_VIEW_THEME.text
    )
    .setVerticalAlignment(
      'middle'
    );


  /* ----------------------------------------------------------------------
   * ZEBRA ROWS
   * -------------------------------------------------------------------- */

  const backgrounds = [];

  for (
    let index = 0;
    index < dataRowCount;
    index++
  ) {
    const background =
      index % 2 === 0
        ? TASK_VIEW_THEME.surface
        : TASK_VIEW_THEME.surfaceAlt;

    backgrounds.push(
      new Array(
        columnCount
      ).fill(
        background
      )
    );
  }

  dataRange.setBackgrounds(
    backgrounds
  );


  /* ----------------------------------------------------------------------
   * ROW BORDERS
   * -------------------------------------------------------------------- */

  dataRange.setBorder(
    false,
    false,
    true,
    false,
    false,
    false,
    '#EDF1F5',
    SpreadsheetApp
      .BorderStyle
      .SOLID
  );


  for (
    let row = 2;
    row <= lastRow;
    row++
  ) {
    sheet.setRowHeight(
      row,
      42
    );
  }


  /* ----------------------------------------------------------------------
   * TASK NAME
   * -------------------------------------------------------------------- */

  formatTaskNameColumn_(
    sheet,
    dataRowCount
  );


  /* ----------------------------------------------------------------------
   * TEXT COLUMNS
   * -------------------------------------------------------------------- */

  setTaskColumnWrap_(
    sheet,
    'TaskName',
    dataRowCount,
    true
  );

  setTaskColumnWrap_(
    sheet,
    'RecommendedAction',
    dataRowCount,
    true
  );

  setTaskColumnWrap_(
    sheet,
    'Notes',
    dataRowCount,
    true
  );


  /* ----------------------------------------------------------------------
   * DATE / NUMBER FORMAT
   * -------------------------------------------------------------------- */

  setTaskColumnNumberFormat_(
    sheet,
    'StartDate',
    dataRowCount,
    'dd MMM yyyy'
  );

  setTaskColumnNumberFormat_(
    sheet,
    'DueDate',
    dataRowCount,
    'dd MMM yyyy'
  );

  setTaskColumnNumberFormat_(
    sheet,
    'CompletedDate',
    dataRowCount,
    'dd MMM yyyy HH:mm'
  );

  setTaskColumnNumberFormat_(
    sheet,
    'CreatedAt',
    dataRowCount,
    'dd MMM yyyy HH:mm'
  );

  setTaskColumnNumberFormat_(
    sheet,
    'UpdatedAt',
    dataRowCount,
    'dd MMM yyyy HH:mm'
  );

  setTaskColumnNumberFormat_(
    sheet,
    'LastStatusChangedAt',
    dataRowCount,
    'dd MMM yyyy HH:mm'
  );

  setTaskColumnNumberFormat_(
    sheet,
    'Progress',
    dataRowCount,
    '0"%"'
  );

  setTaskColumnNumberFormat_(
    sheet,
    'SmartScore',
    dataRowCount,
    '0'
  );


  /* ----------------------------------------------------------------------
   * ALIGNMENTS
   * -------------------------------------------------------------------- */

  centerTaskColumn_(
    sheet,
    'Priority',
    dataRowCount
  );

  centerTaskColumn_(
    sheet,
    'Status',
    dataRowCount
  );

  centerTaskColumn_(
    sheet,
    'DueDate',
    dataRowCount
  );

  centerTaskColumn_(
    sheet,
    'DueTime',
    dataRowCount
  );

  centerTaskColumn_(
    sheet,
    'Progress',
    dataRowCount
  );

  centerTaskColumn_(
    sheet,
    'SmartScore',
    dataRowCount
  );

  centerTaskColumn_(
    sheet,
    'Risk',
    dataRowCount
  );

  centerTaskColumn_(
    sheet,
    'Energy',
    dataRowCount
  );


  /* ----------------------------------------------------------------------
   * MUTED TECHNICAL COLUMNS
   * -------------------------------------------------------------------- */

  [
    'TaskId',
    'GoalId',
    'DependencyTaskId',
    'CreatedAt',
    'UpdatedAt',
    'LastStatusChangedAt'
  ].forEach(
    function (header) {
      muteTaskColumn_(
        sheet,
        header,
        dataRowCount
      );
    }
  );


  /* ----------------------------------------------------------------------
   * ROW-SPECIFIC VISUAL STATES
   * -------------------------------------------------------------------- */

  applyTaskVisualStates_(
    sheet
  );
}


/* ==========================================================================
 * COLUMN WIDTHS
 * ========================================================================== */

function applyTaskColumnWidths_(
  sheet
) {
  const widths = {
    TaskId:
      108,

    TaskName:
      250,

    Description:
      230,

    Area:
      110,

    Project:
      135,

    Category:
      115,

    Tags:
      150,

    Priority:
      92,

    Status:
      112,

    StartDate:
      105,

    DueDate:
      105,

    DueTime:
      82,

    CompletedDate:
      145,

    Progress:
      82,

    EstimateMinutes:
      102,

    Energy:
      88,

    Context:
      110,

    GoalId:
      108,

    RecurringType:
      110,

    DependencyTaskId:
      130,

    SmartScore:
      88,

    Risk:
      88,

    RecommendedAction:
      265,

    Notes:
      230,

    CreatedAt:
      145,

    UpdatedAt:
      145,

    LastStatusChangedAt:
      160
  };

  TASK_HEADERS.forEach(
    function (header, index) {
      sheet.setColumnWidth(
        index + 1,
        widths[header] || 115
      );
    }
  );
}


/* ==========================================================================
 * ROW VISUAL STATES
 * ========================================================================== */

function applyTaskVisualStates_(
  sheet
) {
  const tasks =
    getAllTasks_();

  if (
    tasks.length === 0
  ) {
    return;
  }

  const today =
    stripTime_(
      now_()
    );

  const indexes = {
    taskName:
      getTaskHeaderColumn_(
        'TaskName'
      ),

    priority:
      getTaskHeaderColumn_(
        'Priority'
      ),

    status:
      getTaskHeaderColumn_(
        'Status'
      ),

    dueDate:
      getTaskHeaderColumn_(
        'DueDate'
      ),

    progress:
      getTaskHeaderColumn_(
        'Progress'
      ),

    smartScore:
      getTaskHeaderColumn_(
        'SmartScore'
      ),

    risk:
      getTaskHeaderColumn_(
        'Risk'
      )
  };


  tasks.forEach(
    function (task, index) {
      const row =
        index + 2;


      /* ------------------------------------------------------------------
       * STATUS
       * ---------------------------------------------------------------- */

      if (
        indexes.status
      ) {
        const cell =
          sheet.getRange(
            row,
            indexes.status
          );

        const tone =
          getTaskStatusTone_(
            task.Status
          );

        cell
          .setBackground(
            tone.soft
          )
          .setFontColor(
            tone.text
          )
          .setFontWeight(
            'bold'
          )
          .setHorizontalAlignment(
            'center'
          );
      }


      /* ------------------------------------------------------------------
       * PRIORITY
       * ---------------------------------------------------------------- */

      if (
        indexes.priority
      ) {
        const cell =
          sheet.getRange(
            row,
            indexes.priority
          );

        const tone =
          getTaskPriorityTone_(
            task.Priority
          );

        cell
          .setBackground(
            tone.soft
          )
          .setFontColor(
            tone.text
          )
          .setFontWeight(
            'bold'
          )
          .setHorizontalAlignment(
            'center'
          );
      }


      /* ------------------------------------------------------------------
       * RISK
       * ---------------------------------------------------------------- */

      if (
        indexes.risk
      ) {
        const cell =
          sheet.getRange(
            row,
            indexes.risk
          );

        const tone =
          getTaskRiskTone_(
            task.Risk
          );

        cell
          .setBackground(
            tone.soft
          )
          .setFontColor(
            tone.text
          )
          .setFontWeight(
            'bold'
          );
      }


      /* ------------------------------------------------------------------
       * SMART SCORE
       * ---------------------------------------------------------------- */

      if (
        indexes.smartScore
      ) {
        const score =
          Number(
            task.SmartScore
          ) || 0;

        const tone =
          getTaskScoreTone_(
            score
          );

        sheet
          .getRange(
            row,
            indexes.smartScore
          )
          .setBackground(
            tone.soft
          )
          .setFontColor(
            tone.text
          )
          .setFontWeight(
            'bold'
          );
      }


      /* ------------------------------------------------------------------
       * PROGRESS
       * ---------------------------------------------------------------- */

      if (
        indexes.progress
      ) {
        const progress =
          Math.max(
            0,
            Math.min(
              100,
              Number(
                task.Progress
              ) || 0
            )
          );

        const tone =
          getTaskProgressTone_(
            progress
          );

        sheet
          .getRange(
            row,
            indexes.progress
          )
          .setBackground(
            tone.soft
          )
          .setFontColor(
            tone.text
          )
          .setFontWeight(
            'bold'
          );
      }


      /* ------------------------------------------------------------------
       * DUE DATE
       * ---------------------------------------------------------------- */

      if (
        indexes.dueDate
      ) {
        const due =
          stripTime_(
            task.DueDate
          );

        if (
          due &&
          String(
            task.Status || ''
          ) !== 'Completed'
        ) {
          const difference =
            daysBetween_(
              today,
              due
            );

          const cell =
            sheet.getRange(
              row,
              indexes.dueDate
            );

          if (
            difference < 0
          ) {
            cell
              .setBackground(
                TASK_VIEW_THEME.dangerSoft
              )
              .setFontColor(
                TASK_VIEW_THEME.danger
              )
              .setFontWeight(
                'bold'
              );
          } else if (
            difference === 0
          ) {
            cell
              .setBackground(
                TASK_VIEW_THEME.warningSoft
              )
              .setFontColor(
                TASK_VIEW_THEME.warning
              )
              .setFontWeight(
                'bold'
              );
          }
        }
      }


      /* ------------------------------------------------------------------
       * COMPLETED TASK TITLE
       * ---------------------------------------------------------------- */

      if (
        indexes.taskName &&
        String(
          task.Status || ''
        ) === 'Completed'
      ) {
        sheet
          .getRange(
            row,
            indexes.taskName
          )
          .setFontColor(
            TASK_VIEW_THEME.muted
          )
          .setFontStyle(
            'italic'
          );
      }
    }
  );
}


/* ==========================================================================
 * TASK COUNTS
 * ========================================================================== */

function computeTaskCounts_(
  tasks
) {
  tasks =
    Array.isArray(
      tasks
    )
      ? tasks
      : [];

  const today =
    stripTime_(
      now_()
    );

  const inbox =
    tasks.filter(
      function (task) {
        return String(
          task.Status || ''
        ) === 'Inbox';
      }
    ).length;


  const completed =
    tasks.filter(
      function (task) {
        return String(
          task.Status || ''
        ) === 'Completed';
      }
    ).length;


  const overdue =
    tasks.filter(
      function (task) {
        if (
          String(
            task.Status || ''
          ) === 'Completed'
        ) {
          return false;
        }

        const days =
          daysBetween_(
            today,
            task.DueDate
          );

        return (
          days !== null &&
          days < 0
        );
      }
    ).length;


  const dueToday =
    tasks.filter(
      function (task) {
        if (
          String(
            task.Status || ''
          ) === 'Completed'
        ) {
          return false;
        }

        const days =
          daysBetween_(
            today,
            task.DueDate
          );

        return days === 0;
      }
    ).length;


  const active =
    tasks.filter(
      function (task) {
        const status =
          String(
            task.Status || ''
          );

        return (
          status !== 'Inbox' &&
          status !== 'Completed'
        );
      }
    ).length;


  return {
    all:
      tasks.length,

    inbox:
      inbox,

    active:
      active,

    completed:
      completed,

    overdue:
      overdue,

    dueToday:
      dueToday
  };
}


/* ==========================================================================
 * SUMMARY PANEL
 * ========================================================================== */

/**
 * Refreshes both:
 * - Tasks source-table visual style
 * - Summary workspace
 */
function renderTaskSummary_() {
  const sheet =
    getOrCreateSheet_(
      SHEETS.TASKS
    );

  styleTasksWorkspace_();

  const counts =
    computeTaskCounts_(
      getAllTasks_()
    );

  const col =
    TASK_SUMMARY_START_COL;


  /* ----------------------------------------------------------------------
   * RESET
   * -------------------------------------------------------------------- */

  const panel =
    sheet.getRange(
      1,
      col,
      8,
      5
    );

  panel
    .breakApart()
    .clearContent()
    .clearFormat();


  /* ----------------------------------------------------------------------
   * PANEL TITLE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      1,
      col,
      1,
      5
    )
    .merge()
    .setValue(
      'TASK WORKSPACE'
    )
    .setBackground(
      TASK_VIEW_THEME.darkHeader
    )
    .setFontColor(
      TASK_VIEW_THEME.darkHeaderText
    )
    .setFontSize(
      11
    )
    .setFontWeight(
      'bold'
    )
    .setHorizontalAlignment(
      'left'
    )
    .setVerticalAlignment(
      'middle'
    );


  sheet.setRowHeight(
    1,
    38
  );


  /* ----------------------------------------------------------------------
   * SUMMARY CARDS
   * -------------------------------------------------------------------- */

  const cards = [
    {
      label:
        'ALL',

      value:
        counts.all,

      tone:
        'primary'
    },

    {
      label:
        'INBOX',

      value:
        counts.inbox,

      tone:
        'info'
    },

    {
      label:
        'ACTIVE',

      value:
        counts.active,

      tone:
        'warning'
    },

    {
      label:
        'DONE',

      value:
        counts.completed,

      tone:
        'success'
    },

    {
      label:
        'OVERDUE',

      value:
        counts.overdue,

      tone:
        counts.overdue > 0
          ? 'danger'
          : 'success'
    }
  ];


  cards.forEach(
    function (card, index) {
      const column =
        col + index;

      const tone =
        getTaskViewTone_(
          card.tone
        );


      sheet
        .getRange(
          2,
          column
        )
        .setValue(
          card.label
        )
        .setBackground(
          tone.soft
        )
        .setFontColor(
          tone.text
        )
        .setFontSize(
          8
        )
        .setFontWeight(
          'bold'
        )
        .setHorizontalAlignment(
          'center'
        );


      sheet
        .getRange(
          3,
          column
        )
        .setValue(
          card.value
        )
        .setBackground(
          TASK_VIEW_THEME.surface
        )
        .setFontColor(
          tone.text
        )
        .setFontSize(
          19
        )
        .setFontWeight(
          'bold'
        )
        .setHorizontalAlignment(
          'center'
        );


      sheet
        .getRange(
          2,
          column,
          2,
          1
        )
        .setBorder(
          true,
          true,
          true,
          true,
          false,
          false,
          TASK_VIEW_THEME.border,
          SpreadsheetApp
            .BorderStyle
            .SOLID
        );
    }
  );


  sheet.setRowHeight(
    2,
    25
  );

  sheet.setRowHeight(
    3,
    36
  );


  /* ----------------------------------------------------------------------
   * TODAY STATUS
   * -------------------------------------------------------------------- */

  const todayTone =
    counts.overdue > 0
      ? getTaskViewTone_(
          'danger'
        )
      : getTaskViewTone_(
          'success'
        );


  sheet
    .getRange(
      5,
      col,
      1,
      5
    )
    .merge()
    .setValue(
      counts.dueToday +
      ' due today  •  ' +
      counts.overdue +
      ' overdue'
    )
    .setBackground(
      todayTone.soft
    )
    .setFontColor(
      todayTone.text
    )
    .setFontSize(
      9
    )
    .setFontWeight(
      'bold'
    )
    .setHorizontalAlignment(
      'center'
    )
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      TASK_VIEW_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );


  sheet.setRowHeight(
    5,
    30
  );


  /* ----------------------------------------------------------------------
   * QUICK GUIDE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      7,
      col,
      1,
      5
    )
    .merge()
    .setValue(
      'QUICK ACTION'
    )
    .setFontSize(
      8
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TASK_VIEW_THEME.muted
    );


  sheet
    .getRange(
      8,
      col,
      1,
      5
    )
    .merge()
    .setValue(
      'Select a task row → Smart Task → Open Selected Task'
    )
    .setBackground(
      TASK_VIEW_THEME.primaryLight
    )
    .setFontColor(
      TASK_VIEW_THEME.primaryHover
    )
    .setFontSize(
      9
    )
    .setFontWeight(
      'bold'
    )
    .setWrap(
      true
    )
    .setHorizontalAlignment(
      'center'
    )
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      TASK_VIEW_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );


  sheet.setRowHeight(
    8,
    38
  );


  /* ----------------------------------------------------------------------
   * SUMMARY COLUMN WIDTHS
   * -------------------------------------------------------------------- */

  for (
    let index = 0;
    index < 5;
    index++
  ) {
    sheet.setColumnWidth(
      col + index,
      105
    );
  }
}


/* ==========================================================================
 * HEADER/COLUMN HELPERS
 * ========================================================================== */

/**
 * Returns 1-based sheet column.
 */
function getTaskHeaderColumn_(
  header
) {
  const index =
    TASK_HEADERS.indexOf(
      header
    );

  return index === -1
    ? 0
    : index + 1;
}


function setTaskColumnNumberFormat_(
  sheet,
  header,
  rowCount,
  format
) {
  const column =
    getTaskHeaderColumn_(
      header
    );

  if (
    !column ||
    rowCount <= 0
  ) {
    return;
  }

  sheet
    .getRange(
      2,
      column,
      rowCount,
      1
    )
    .setNumberFormat(
      format
    );
}


function setTaskColumnWrap_(
  sheet,
  header,
  rowCount,
  wrap
) {
  const column =
    getTaskHeaderColumn_(
      header
    );

  if (
    !column ||
    rowCount <= 0
  ) {
    return;
  }

  sheet
    .getRange(
      2,
      column,
      rowCount,
      1
    )
    .setWrap(
      wrap
    );
}


function centerTaskColumn_(
  sheet,
  header,
  rowCount
) {
  const column =
    getTaskHeaderColumn_(
      header
    );

  if (
    !column ||
    rowCount <= 0
  ) {
    return;
  }

  sheet
    .getRange(
      2,
      column,
      rowCount,
      1
    )
    .setHorizontalAlignment(
      'center'
    );
}


function muteTaskColumn_(
  sheet,
  header,
  rowCount
) {
  const column =
    getTaskHeaderColumn_(
      header
    );

  if (
    !column ||
    rowCount <= 0
  ) {
    return;
  }

  sheet
    .getRange(
      2,
      column,
      rowCount,
      1
    )
    .setFontColor(
      TASK_VIEW_THEME.muted
    )
    .setFontSize(
      9
    );
}


function formatTaskNameColumn_(
  sheet,
  rowCount
) {
  const column =
    getTaskHeaderColumn_(
      'TaskName'
    );

  if (
    !column ||
    rowCount <= 0
  ) {
    return;
  }

  sheet
    .getRange(
      2,
      column,
      rowCount,
      1
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      10
    )
    .setFontColor(
      TASK_VIEW_THEME.text
    );
}


/* ==========================================================================
 * TONES
 * ========================================================================== */

function getTaskViewTone_(
  tone
) {
  switch (
    String(
      tone || ''
    )
  ) {
    case 'danger':
      return {
        text:
          TASK_VIEW_THEME.danger,

        soft:
          TASK_VIEW_THEME.dangerSoft
      };

    case 'warning':
      return {
        text:
          TASK_VIEW_THEME.warning,

        soft:
          TASK_VIEW_THEME.warningSoft
      };

    case 'success':
      return {
        text:
          TASK_VIEW_THEME.success,

        soft:
          TASK_VIEW_THEME.successSoft
      };

    case 'info':
      return {
        text:
          TASK_VIEW_THEME.info,

        soft:
          TASK_VIEW_THEME.infoSoft
      };

    default:
      return {
        text:
          TASK_VIEW_THEME.primary,

        soft:
          TASK_VIEW_THEME.primaryLight
      };
  }
}


function getTaskStatusTone_(
  status
) {
  switch (
    String(
      status || ''
    )
  ) {
    case 'Completed':
      return getTaskViewTone_(
        'success'
      );

    case 'In Progress':
    case 'Next':
      return getTaskViewTone_(
        'primary'
      );

    case 'Waiting':
      return getTaskViewTone_(
        'warning'
      );

    case 'Inbox':
      return getTaskViewTone_(
        'info'
      );

    default:
      return {
        text:
          TASK_VIEW_THEME.text2,

        soft:
          TASK_VIEW_THEME.surface2
      };
  }
}


function getTaskPriorityTone_(
  priority
) {
  switch (
    String(
      priority || ''
    )
  ) {
    case 'Urgent':
    case 'Critical':
      return getTaskViewTone_(
        'danger'
      );

    case 'High':
      return getTaskViewTone_(
        'warning'
      );

    case 'Medium':
      return getTaskViewTone_(
        'primary'
      );

    case 'Low':
      return getTaskViewTone_(
        'success'
      );

    default:
      return {
        text:
          TASK_VIEW_THEME.text2,

        soft:
          TASK_VIEW_THEME.surface2
      };
  }
}


function getTaskRiskTone_(
  risk
) {
  const value =
    String(
      risk || ''
    ).toLowerCase();

  if (
    value.indexOf(
      'high'
    ) !== -1 ||
    value.indexOf(
      'critical'
    ) !== -1
  ) {
    return getTaskViewTone_(
      'danger'
    );
  }

  if (
    value.indexOf(
      'medium'
    ) !== -1
  ) {
    return getTaskViewTone_(
      'warning'
    );
  }

  if (
    value.indexOf(
      'low'
    ) !== -1
  ) {
    return getTaskViewTone_(
      'success'
    );
  }

  return {
    text:
      TASK_VIEW_THEME.text2,

    soft:
      TASK_VIEW_THEME.surface2
  };
}


function getTaskScoreTone_(
  score
) {
  score =
    Number(
      score
    ) || 0;

  /*
   * Smart Score is urgency/importance,
   * so a higher score deserves more attention.
   */
  if (
    score >= 85
  ) {
    return getTaskViewTone_(
      'danger'
    );
  }

  if (
    score >= 65
  ) {
    return getTaskViewTone_(
      'warning'
    );
  }

  if (
    score >= 40
  ) {
    return getTaskViewTone_(
      'primary'
    );
  }

  return getTaskViewTone_(
    'success'
  );
}


function getTaskProgressTone_(
  progress
) {
  progress =
    Number(
      progress
    ) || 0;

  if (
    progress >= 100
  ) {
    return getTaskViewTone_(
      'success'
    );
  }

  if (
    progress >= 60
  ) {
    return getTaskViewTone_(
      'primary'
    );
  }

  if (
    progress > 0
  ) {
    return getTaskViewTone_(
      'warning'
    );
  }

  return {
    text:
      TASK_VIEW_THEME.text2,

    soft:
      TASK_VIEW_THEME.surface2
  };
}


/* ==========================================================================
 * SELECTED TASK
 * ========================================================================== */

/**
 * Resolve TaskId from current Tasks selection.
 *
 * @return {string|null}
 */
function getSelectedTaskId_() {
  const spreadsheet =
    SpreadsheetApp.getActive();

  const sheet =
    spreadsheet.getActiveSheet();

  if (
    !sheet ||
    sheet.getName() !==
      SHEETS.TASKS
  ) {
    return null;
  }

  const range =
    sheet.getActiveRange();

  if (!range) {
    return null;
  }

  const row =
    range.getRow();

  const column =
    range.getColumn();


  /*
   * Header is not a task.
   */
  if (
    row <= 1
  ) {
    return null;
  }


  /*
   * Ignore summary workspace
   * and all cells outside source table.
   */
  if (
    column < 1 ||
    column >
      TASK_HEADERS.length
  ) {
    return null;
  }


  const taskIdColumn =
    getTaskHeaderColumn_(
      'TaskId'
    );

  if (!taskIdColumn) {
    throw new Error(
      'TaskId column was not found in TASK_HEADERS.'
    );
  }


  const taskId =
    String(
      sheet
        .getRange(
          row,
          taskIdColumn
        )
        .getDisplayValue() ||
      ''
    ).trim();


  return taskId || null;
}


/* ==========================================================================
 * TASK DETAILS NAVIGATION
 * ========================================================================== */

/**
 * Open Task Details for current selected task.
 *
 * Smart Task
 * → Open Selected Task
 */
function openSelectedTaskDetails_() {
  const ui =
    SpreadsheetApp.getUi();

  const sheet =
    SpreadsheetApp
      .getActive()
      .getActiveSheet();


  /* ----------------------------------------------------------------------
   * WRONG SHEET
   * -------------------------------------------------------------------- */

  if (
    !sheet ||
    sheet.getName() !==
      SHEETS.TASKS
  ) {
    ui.alert(
      'Open Task',
      'Open the Tasks sheet and select a task first.',
      ui.ButtonSet.OK
    );

    return;
  }


  const range =
    sheet.getActiveRange();


  /* ----------------------------------------------------------------------
   * NO SELECTION
   * -------------------------------------------------------------------- */

  if (!range) {
    ui.alert(
      'Open Task',
      'Select a task row first.',
      ui.ButtonSet.OK
    );

    return;
  }


  /* ----------------------------------------------------------------------
   * HEADER
   * -------------------------------------------------------------------- */

  if (
    range.getRow() <= 1
  ) {
    ui.alert(
      'Open Task',
      'Select a task below the header row.',
      ui.ButtonSet.OK
    );

    return;
  }


  /* ----------------------------------------------------------------------
   * OUTSIDE TABLE
   * -------------------------------------------------------------------- */

  if (
    range.getColumn() >
    TASK_HEADERS.length
  ) {
    ui.alert(
      'Open Task',
      'Select a cell inside the Tasks table, not the Task Workspace panel.',
      ui.ButtonSet.OK
    );

    return;
  }


  const taskId =
    getSelectedTaskId_();


  if (!taskId) {
    ui.alert(
      'Open Task',
      'The selected row does not contain a Task ID.',
      ui.ButtonSet.OK
    );

    return;
  }


  const task =
    getTaskById_(
      taskId
    );


  if (!task) {
    ui.alert(
      'Task Not Found',
      'Task "' +
        taskId +
        '" could not be found. It may have been deleted.',
      ui.ButtonSet.OK
    );

    return;
  }


  /*
   * 09_TaskDetails.gs
   */
  showTaskDetails_(
    taskId
  );
}