/**
 * 07_Today.gs
 * -----------------------------------------------------------------------
 * FRAME 04 — TODAY
 *
 * Personal daily productivity dashboard.
 *
 * Pure view layer:
 * - Reads Tasks only
 * - Never writes task data
 * - Safe to redraw at any time
 *
 * Sections:
 * - Daily header
 * - KPI cards
 * - Best Next Action
 * - Do Now
 * - Scheduled
 * - Quick Wins
 * - End-of-Day Review
 * -----------------------------------------------------------------------
 */


/* ==========================================================================
 * CONFIG
 * ========================================================================== */

const TODAY_LAYOUT = {
  cols: 10,

  accentRow: 1,

  titleRow: 2,
  subtitleRow: 3,
  summaryRow: 4,

  spacerAfterHeader: 5,

  kpiStartRow: 6,
  kpiEndRow: 9,

  bestActionStartRow: 11,

  sectionGap: 2,

  doNowMaxRows: 5,
  scheduledMaxRows: 6,
  quickWinsMaxRows: 5
};


const TODAY_THEME = {
  background:
    COLORS.background || '#F8FAFC',

  surface:
    COLORS.surface || '#FFFFFF',

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
    '#F0F9FF'
};


/* ==========================================================================
 * MAIN RENDER
 * ========================================================================== */

function renderToday_() {
  const sheet =
    getOrCreateSheet_(
      SHEETS.TODAY
    );

  prepareTodayCanvas_(
    sheet
  );

  const data =
    computeTodayData_();

  writeTodayHeader_(
    sheet,
    data
  );

  writeTodayKpis_(
    sheet,
    data
  );

  let row =
    writeBestNextAction_(
      sheet,
      data,
      TODAY_LAYOUT.bestActionStartRow
    );

  row =
    writeTodaySection_(
      sheet,
      {
        title: 'DO NOW',
        subtitle: 'Your most important work right now',
        tasks: data.doNow,
        tone: 'danger',
        emptyText:
          'Nothing urgent right now. You have breathing room.',
        maxRows:
          TODAY_LAYOUT.doNowMaxRows
      },
      row +
      TODAY_LAYOUT.sectionGap
    );

  row =
    writeTodaySection_(
      sheet,
      {
        title: 'SCHEDULED',
        subtitle: 'Time-specific tasks for today',
        tasks: data.scheduled,
        tone: 'info',
        emptyText:
          'No time-blocked tasks scheduled today.',
        maxRows:
          TODAY_LAYOUT.scheduledMaxRows
      },
      row +
      TODAY_LAYOUT.sectionGap
    );

  row =
    writeTodaySection_(
      sheet,
      {
        title: 'QUICK WINS',
        subtitle: 'Small tasks you can finish fast',
        tasks: data.quickWins,
        tone: 'success',
        emptyText:
          'No quick wins available right now.',
        maxRows:
          TODAY_LAYOUT.quickWinsMaxRows
      },
      row +
      TODAY_LAYOUT.sectionGap
    );

  row =
    writeEndOfDayReview_(
      sheet,
      data,
      row +
      TODAY_LAYOUT.sectionGap
    );

  writeTodayFooter_(
    sheet,
    row + 2
  );

  SpreadsheetApp.flush();
}


/* ==========================================================================
 * CANVAS
 * ========================================================================== */

function prepareTodayCanvas_(sheet) {
  const minRows = 70;
  const minCols =
    TODAY_LAYOUT.cols;

  if (
    sheet.getMaxRows() <
    minRows
  ) {
    sheet.insertRowsAfter(
      sheet.getMaxRows(),
      minRows -
      sheet.getMaxRows()
    );
  }

  if (
    sheet.getMaxColumns() <
    minCols
  ) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      minCols -
      sheet.getMaxColumns()
    );
  }

  /*
   * Remove previous merges before redraw.
   */
  sheet
    .getRange(
      1,
      1,
      Math.min(
        80,
        sheet.getMaxRows()
      ),
      minCols
    )
    .breakApart();

  sheet.clear();

  sheet.setHiddenGridlines(
    true
  );

  sheet.setFrozenRows(
    4
  );

  try {
    sheet.setTabColor(
      TODAY_THEME.primary
    );
  } catch (error) {
    console.warn(
      'Today tab color skipped:',
      error.message
    );
  }


  /* ----------------------------------------------------------------------
   * BACKGROUND
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      1,
      1,
      70,
      minCols
    )
    .setBackground(
      TODAY_THEME.background
    )
    .setFontColor(
      TODAY_THEME.text
    )
    .setVerticalAlignment(
      'middle'
    );


  /* ----------------------------------------------------------------------
   * FIXED COLUMN WIDTHS
   * -------------------------------------------------------------------- */

  const widths = [
    110, // A
    110, // B
    108, // C
    108, // D
    92,  // E
    92,  // F
    90,  // G
    80,  // H
    130, // I
    130  // J
  ];

  widths.forEach(
    function (width, index) {
      sheet.setColumnWidth(
        index + 1,
        width
      );
    }
  );


  /* ----------------------------------------------------------------------
   * ROW HEIGHTS
   * -------------------------------------------------------------------- */

  sheet.setRowHeight(
    TODAY_LAYOUT.accentRow,
    5
  );

  sheet.setRowHeight(
    TODAY_LAYOUT.titleRow,
    42
  );

  sheet.setRowHeight(
    TODAY_LAYOUT.subtitleRow,
    27
  );

  sheet.setRowHeight(
    TODAY_LAYOUT.summaryRow,
    25
  );

  sheet.setRowHeight(
    TODAY_LAYOUT.spacerAfterHeader,
    10
  );
}


/* ==========================================================================
 * DATA
 * ========================================================================== */

function computeTodayData_() {
  const allTasks =
    getAllTasks_();

  const today =
    stripTime_(
      now_()
    );


  /* ----------------------------------------------------------------------
   * OPEN TASKS
   * -------------------------------------------------------------------- */

  const openTasks =
    allTasks.filter(
      function (task) {
        return String(
          task.Status || ''
        ) !== 'Completed';
      }
    );


  /* ----------------------------------------------------------------------
   * TODAY
   * -------------------------------------------------------------------- */

  const todayTasks =
    openTasks.filter(
      function (task) {
        return todaySameDay_(
          task.DueDate,
          today
        );
      }
    );


  /* ----------------------------------------------------------------------
   * OVERDUE
   * -------------------------------------------------------------------- */

  const overdueTasks =
    openTasks.filter(
      function (task) {
        const difference =
          daysBetween_(
            today,
            task.DueDate
          );

        return (
          difference !== null &&
          difference < 0
        );
      }
    );


  /* ----------------------------------------------------------------------
   * DO NOW
   * -------------------------------------------------------------------- */

  const urgentPool =
    todayTasks.concat(
      overdueTasks
    );


  const doNow =
    todayUniqueByTaskId_(
      urgentPool
    )
      .filter(
        function (task) {
          const difference =
            daysBetween_(
              today,
              task.DueDate
            );

          const urgent =
            difference !== null &&
            difference <= 0;

          return (
            urgent &&
            String(
              task.Status || ''
            ) !== 'Waiting'
          );
        }
      )
      .sort(
        todayByScoreDesc_
      )
      .slice(
        0,
        TODAY_LAYOUT.doNowMaxRows
      );


  const doNowIds =
    doNow.map(
      function (task) {
        return task.TaskId;
      }
    );


  /* ----------------------------------------------------------------------
   * SCHEDULED
   * -------------------------------------------------------------------- */

  const scheduled =
    todayTasks
      .filter(
        function (task) {
          return (
            task.DueTime &&
            doNowIds.indexOf(
              task.TaskId
            ) === -1
          );
        }
      )
      .sort(
        function (a, b) {
          return String(
            a.DueTime || ''
          ).localeCompare(
            String(
              b.DueTime || ''
            )
          );
        }
      )
      .slice(
        0,
        TODAY_LAYOUT.scheduledMaxRows
      );


  const scheduledIds =
    scheduled.map(
      function (task) {
        return task.TaskId;
      }
    );


  /* ----------------------------------------------------------------------
   * QUICK WINS
   * -------------------------------------------------------------------- */

  const quickWins =
    openTasks
      .filter(
        function (task) {
          const minutes =
            Number(
              task.EstimateMinutes
            ) || 0;

          return (
            minutes > 0 &&
            minutes <= 15 &&
            doNowIds.indexOf(
              task.TaskId
            ) === -1 &&
            scheduledIds.indexOf(
              task.TaskId
            ) === -1
          );
        }
      )
      .sort(
        todayByScoreDesc_
      )
      .slice(
        0,
        TODAY_LAYOUT.quickWinsMaxRows
      );


  /* ----------------------------------------------------------------------
   * BEST NEXT ACTION
   * -------------------------------------------------------------------- */

  const bestNext =
    urgentPool
      .slice()
      .sort(
        todayByScoreDesc_
      )[0] ||

    openTasks
      .slice()
      .sort(
        todayByScoreDesc_
      )[0] ||

    null;


  /* ----------------------------------------------------------------------
   * FOCUS MINUTES
   * -------------------------------------------------------------------- */

  const focusMinutes =
    todayTasks.reduce(
      function (sum, task) {
        return (
          sum +
          (
            Number(
              task.EstimateMinutes
            ) || 0
          )
        );
      },
      0
    );


  /* ----------------------------------------------------------------------
   * COMPLETED TODAY
   * -------------------------------------------------------------------- */

  const completedToday =
    allTasks.filter(
      function (task) {
        return (
          String(
            task.Status || ''
          ) === 'Completed' &&
          todaySameDay_(
            task.CompletedDate,
            today
          )
        );
      }
    );


  /* ----------------------------------------------------------------------
   * CAPACITY
   * -------------------------------------------------------------------- */

  const focusLimitHours =
    Number(
      getSetting_(
        'DailyFocusLimitHours',
        4
      )
    ) || 4;

  const focusLimitMinutes =
    focusLimitHours *
    60;

  const capacityPercent =
    focusLimitMinutes > 0
      ? Math.round(
          (
            focusMinutes /
            focusLimitMinutes
          ) *
          100
        )
      : 0;


  /* ----------------------------------------------------------------------
   * COMPLETION RATE
   * -------------------------------------------------------------------- */

  const plannedTodayCount =
    todayTasks.length +
    completedToday.length;

  const completionRate =
    plannedTodayCount > 0
      ? Math.round(
          (
            completedToday.length /
            plannedTodayCount
          ) *
          100
        )
      : 0;


  return {
    today:
      today,

    allTasks:
      allTasks,

    openTasks:
      openTasks,

    todayTasks:
      todayTasks,

    overdueTasks:
      overdueTasks,

    doNow:
      doNow,

    scheduled:
      scheduled,

    quickWins:
      quickWins,

    bestNext:
      bestNext,

    focusMinutes:
      focusMinutes,

    completedToday:
      completedToday,

    focusLimitHours:
      focusLimitHours,

    focusLimitMinutes:
      focusLimitMinutes,

    capacityPercent:
      capacityPercent,

    plannedTodayCount:
      plannedTodayCount,

    completionRate:
      completionRate
  };
}


/* ==========================================================================
 * HEADER
 * ========================================================================== */

function writeTodayHeader_(
  sheet,
  data
) {

  /* ----------------------------------------------------------------------
   * ACCENT BAR
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      TODAY_LAYOUT.accentRow,
      1,
      1,
      10
    )
    .setBackground(
      TODAY_THEME.primary
    );


  /* ----------------------------------------------------------------------
   * TITLE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      TODAY_LAYOUT.titleRow,
      1,
      1,
      6
    )
    .merge()
    .setValue(
      'Today'
    )
    .setFontSize(
      26
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TODAY_THEME.text
    )
    .setHorizontalAlignment(
      'left'
    );


  /* ----------------------------------------------------------------------
   * DAY LABEL
   * -------------------------------------------------------------------- */

  const shortDate =
    Utilities.formatDate(
      data.today,
      Session.getScriptTimeZone(),
      'EEEE, dd MMM yyyy'
    );

  sheet
    .getRange(
      TODAY_LAYOUT.titleRow,
      7,
      1,
      4
    )
    .merge()
    .setValue(
      shortDate
    )
    .setFontSize(
      11
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TODAY_THEME.text2
    )
    .setHorizontalAlignment(
      'right'
    );


  /* ----------------------------------------------------------------------
   * SUBTITLE
   * -------------------------------------------------------------------- */

  const subtitle =
    buildTodayGreeting_();

  sheet
    .getRange(
      TODAY_LAYOUT.subtitleRow,
      1,
      1,
      7
    )
    .merge()
    .setValue(
      subtitle
    )
    .setFontSize(
      12
    )
    .setFontColor(
      TODAY_THEME.text2
    );


  /* ----------------------------------------------------------------------
   * STATUS
   * -------------------------------------------------------------------- */

  const status =
    data.overdueTasks.length > 0
      ? (
          data.overdueTasks.length +
          ' overdue task' +
          (
            data.overdueTasks.length === 1
              ? ''
              : 's'
          )
        )
      : 'No overdue tasks';

  sheet
    .getRange(
      TODAY_LAYOUT.subtitleRow,
      8,
      1,
      3
    )
    .merge()
    .setValue(
      status
    )
    .setFontSize(
      9
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      data.overdueTasks.length > 0
        ? TODAY_THEME.danger
        : TODAY_THEME.success
    )
    .setHorizontalAlignment(
      'right'
    );


  /* ----------------------------------------------------------------------
   * SUMMARY LINE
   * -------------------------------------------------------------------- */

  const summary =
    data.todayTasks.length +
    ' due today' +
    '  •  ' +
    todayFormatMinutes_(
      data.focusMinutes
    ) +
    ' planned focus' +
    '  •  ' +
    data.completedToday.length +
    ' completed';


  sheet
    .getRange(
      TODAY_LAYOUT.summaryRow,
      1,
      1,
      10
    )
    .merge()
    .setValue(
      summary
    )
    .setFontSize(
      9
    )
    .setFontColor(
      TODAY_THEME.muted
    );
}


/* ==========================================================================
 * KPI CARDS
 * ========================================================================== */

function writeTodayKpis_(
  sheet,
  data
) {
  const cards = [
    {
      label:
        'DUE TODAY',

      value:
        data.todayTasks.length,

      sub:
        todayCountHighPriority_(
          data.todayTasks
        ) +
        ' high priority',

      tone:
        data.todayTasks.length > 0
          ? 'primary'
          : 'success'
    },

    {
      label:
        'OVERDUE',

      value:
        data.overdueTasks.length,

      sub:
        data.overdueTasks.length > 0
          ? 'Needs attention'
          : 'All clear',

      tone:
        data.overdueTasks.length > 0
          ? 'danger'
          : 'success'
    },

    {
      label:
        'FOCUS LOAD',

      value:
        todayFormatMinutes_(
          data.focusMinutes
        ),

      sub:
        Math.min(
          data.capacityPercent,
          999
        ) +
        '% of ' +
        data.focusLimitHours +
        'h capacity',

      tone:
        data.capacityPercent > 100
          ? 'warning'
          : 'info'
    },

    {
      label:
        'COMPLETED',

      value:
        data.completedToday.length,

      sub:
        data.plannedTodayCount > 0
          ? (
              data.completionRate +
              '% completion rate'
            )
          : 'Nothing planned',

      tone:
        data.completedToday.length > 0
          ? 'success'
          : 'primary'
    },

    {
      label:
        'QUICK WINS',

      value:
        data.quickWins.length,

      sub:
        data.quickWins.length > 0
          ? '15 min or less'
          : 'No quick tasks',

      tone:
        data.quickWins.length > 0
          ? 'success'
          : 'primary'
    }
  ];


  cards.forEach(
    function (card, index) {
      const startColumn =
        1 +
        (
          index * 2
        );

      const tone =
        getTodayTone_(
          card.tone
        );


      const cardRange =
        sheet.getRange(
          TODAY_LAYOUT.kpiStartRow,
          startColumn,
          4,
          2
        );

      cardRange
        .setBackground(
          TODAY_THEME.surface
        )
        .setBorder(
          true,
          true,
          true,
          true,
          false,
          false,
          TODAY_THEME.border,
          SpreadsheetApp
            .BorderStyle
            .SOLID
        );


      /* ------------------------------------------------------------------
       * LABEL
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          TODAY_LAYOUT.kpiStartRow,
          startColumn,
          1,
          2
        )
        .merge()
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
          9
        )
        .setFontWeight(
          'bold'
        );


      /* ------------------------------------------------------------------
       * VALUE
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          TODAY_LAYOUT.kpiStartRow + 1,
          startColumn,
          2,
          2
        )
        .merge()
        .setValue(
          card.value
        )
        .setFontSize(
          23
        )
        .setFontWeight(
          'bold'
        )
        .setFontColor(
          tone.text
        );


      /* ------------------------------------------------------------------
       * SUB
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          TODAY_LAYOUT.kpiEndRow,
          startColumn,
          1,
          2
        )
        .merge()
        .setValue(
          card.sub
        )
        .setFontSize(
          8
        )
        .setFontColor(
          TODAY_THEME.text2
        );


      sheet.setRowHeight(
        TODAY_LAYOUT.kpiStartRow,
        24
      );

      sheet.setRowHeight(
        TODAY_LAYOUT.kpiStartRow + 1,
        27
      );

      sheet.setRowHeight(
        TODAY_LAYOUT.kpiStartRow + 2,
        27
      );

      sheet.setRowHeight(
        TODAY_LAYOUT.kpiEndRow,
        25
      );
    }
  );
}


/* ==========================================================================
 * BEST NEXT ACTION
 * ========================================================================== */

function writeBestNextAction_(
  sheet,
  data,
  startRow
) {

  /* ----------------------------------------------------------------------
   * EMPTY
   * -------------------------------------------------------------------- */

  if (!data.bestNext) {
    sheet
      .getRange(
        startRow,
        1,
        3,
        10
      )
      .merge()
      .setValue(
        '✓ You are clear. No open tasks need your attention right now.'
      )
      .setBackground(
        TODAY_THEME.successSoft
      )
      .setFontColor(
        TODAY_THEME.success
      )
      .setFontSize(
        12
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
        TODAY_THEME.border,
        SpreadsheetApp
          .BorderStyle
          .SOLID
      );

    sheet.setRowHeight(
      startRow,
      25
    );

    sheet.setRowHeight(
      startRow + 1,
      25
    );

    sheet.setRowHeight(
      startRow + 2,
      25
    );

    return (
      startRow + 2
    );
  }


  const task =
    data.bestNext;

  const score =
    Number(
      task.SmartScore
    ) || 0;

  const dueLabel =
    todayDueLabel_(
      task.DueDate,
      data.today
    );


  /* ----------------------------------------------------------------------
   * CONTAINER
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow,
      1,
      4,
      10
    )
    .setBackground(
      TODAY_THEME.surface
    )
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      TODAY_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );


  /* ----------------------------------------------------------------------
   * LEFT ACCENT
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow,
      1,
      4,
      1
    )
    .setBackground(
      TODAY_THEME.primary
    );


  /* ----------------------------------------------------------------------
   * LABEL
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow,
      2,
      1,
      6
    )
    .merge()
    .setValue(
      'BEST NEXT ACTION'
    )
    .setFontSize(
      9
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TODAY_THEME.primary
    );


  /* ----------------------------------------------------------------------
   * TASK NAME
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow + 1,
      2,
      1,
      6
    )
    .merge()
    .setValue(
      task.TaskName ||
      'Untitled task'
    )
    .setFontSize(
      16
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TODAY_THEME.text
    );


  /* ----------------------------------------------------------------------
   * CONTEXT
   * -------------------------------------------------------------------- */

  const context = [
    task.Area || '',
    task.Project || '',
    task.Priority || ''
  ]
    .filter(Boolean)
    .join('  •  ');


  sheet
    .getRange(
      startRow + 2,
      2,
      1,
      6
    )
    .merge()
    .setValue(
      context ||
      'Personal task'
    )
    .setFontSize(
      9
    )
    .setFontColor(
      TODAY_THEME.text2
    );


  /* ----------------------------------------------------------------------
   * RECOMMENDATION
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow + 3,
      2,
      1,
      6
    )
    .merge()
    .setValue(
      task.RecommendedAction ||
      'Start with the next clear step.'
    )
    .setFontSize(
      9
    )
    .setFontColor(
      TODAY_THEME.text2
    )
    .setWrap(
      true
    );


  /* ----------------------------------------------------------------------
   * SCORE
   * -------------------------------------------------------------------- */

  const scoreTone =
    todayScoreTone_(
      score
    );

  sheet
    .getRange(
      startRow,
      8,
      2,
      1
    )
    .merge()
    .setValue(
      score || '—'
    )
    .setBackground(
      scoreTone.soft
    )
    .setFontColor(
      scoreTone.text
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
      startRow + 2,
      8
    )
    .setValue(
      'SMART SCORE'
    )
    .setFontSize(
      7
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TODAY_THEME.muted
    )
    .setHorizontalAlignment(
      'center'
    );


  /* ----------------------------------------------------------------------
   * DUE / ESTIMATE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow,
      9,
      1,
      2
    )
    .merge()
    .setValue(
      dueLabel
    )
    .setFontSize(
      10
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      todayDueTone_(
        task.DueDate,
        data.today
      ).text
    )
    .setHorizontalAlignment(
      'center'
    );


  sheet
    .getRange(
      startRow + 1,
      9,
      2,
      2
    )
    .merge()
    .setValue(
      todayFormatMinutes_(
        Number(
          task.EstimateMinutes
        ) || 0
      )
    )
    .setFontSize(
      15
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TODAY_THEME.text
    )
    .setHorizontalAlignment(
      'center'
    );


  sheet
    .getRange(
      startRow + 3,
      9,
      1,
      2
    )
    .merge()
    .setValue(
      task.DueTime
        ? (
            'Scheduled ' +
            task.DueTime
          )
        : 'Estimated focus'
    )
    .setFontSize(
      8
    )
    .setFontColor(
      TODAY_THEME.muted
    )
    .setHorizontalAlignment(
      'center'
    );


  for (
    let row =
      startRow;
    row <=
      startRow + 3;
    row++
  ) {
    sheet.setRowHeight(
      row,
      row ===
        startRow + 1
        ? 31
        : 25
    );
  }


  return (
    startRow + 3
  );
}


/* ==========================================================================
 * TASK SECTIONS
 * ========================================================================== */

function writeTodaySection_(
  sheet,
  config,
  startRow
) {
  const tasks =
    (
      config.tasks ||
      []
    ).slice(
      0,
      config.maxRows || 5
    );

  const tone =
    getTodayTone_(
      config.tone
    );


  /* ----------------------------------------------------------------------
   * SECTION TITLE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow,
      1,
      1,
      6
    )
    .merge()
    .setValue(
      config.title +
      '  ' +
      tasks.length
    )
    .setFontSize(
      13
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TODAY_THEME.text
    );


  sheet
    .getRange(
      startRow,
      7,
      1,
      4
    )
    .merge()
    .setValue(
      config.subtitle ||
      ''
    )
    .setFontSize(
      9
    )
    .setFontColor(
      TODAY_THEME.muted
    )
    .setHorizontalAlignment(
      'right'
    );


  sheet.setRowHeight(
    startRow,
    30
  );


  /* ----------------------------------------------------------------------
   * EMPTY STATE
   * -------------------------------------------------------------------- */

  if (
    tasks.length === 0
  ) {
    sheet
      .getRange(
        startRow + 1,
        1,
        2,
        10
      )
      .merge()
      .setValue(
        config.emptyText ||
        'Nothing here.'
      )
      .setBackground(
        tone.soft
      )
      .setFontColor(
        tone.text
      )
      .setFontSize(
        10
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
        TODAY_THEME.border,
        SpreadsheetApp
          .BorderStyle
          .SOLID
      );

    sheet.setRowHeight(
      startRow + 1,
      27
    );

    sheet.setRowHeight(
      startRow + 2,
      27
    );

    return (
      startRow + 2
    );
  }


  const headerRow =
    startRow + 1;

  const firstDataRow =
    startRow + 2;


  /* ----------------------------------------------------------------------
   * HEADER MERGES
   * -------------------------------------------------------------------- */

  mergeTodayTaskRow_(
    sheet,
    headerRow
  );


  sheet
    .getRange(
      headerRow,
      1,
      1,
      4
    )
    .setValue(
      'TASK'
    );

  sheet
    .getRange(
      headerRow,
      5,
      1,
      2
    )
    .setValue(
      'AREA'
    );

  sheet
    .getRange(
      headerRow,
      7
    )
    .setValue(
      'TIME'
    );

  sheet
    .getRange(
      headerRow,
      8
    )
    .setValue(
      'SCORE'
    );

  sheet
    .getRange(
      headerRow,
      9,
      1,
      2
    )
    .setValue(
      'NEXT ACTION'
    );


  sheet
    .getRange(
      headerRow,
      1,
      1,
      10
    )
    .setBackground(
      TODAY_THEME.surface2
    )
    .setFontSize(
      8
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TODAY_THEME.text2
    )
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      TODAY_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );


  sheet.setRowHeight(
    headerRow,
    28
  );


  /* ----------------------------------------------------------------------
   * TASK ROWS
   * -------------------------------------------------------------------- */

  tasks.forEach(
    function (task, index) {
      const row =
        firstDataRow +
        index;

      mergeTodayTaskRow_(
        sheet,
        row
      );

      const background =
        index % 2 === 0
          ? TODAY_THEME.surface
          : '#FBFCFE';


      sheet
        .getRange(
          row,
          1,
          1,
          10
        )
        .setBackground(
          background
        )
        .setBorder(
          false,
          true,
          true,
          true,
          false,
          false,
          TODAY_THEME.border,
          SpreadsheetApp
            .BorderStyle
            .SOLID
        )
        .setVerticalAlignment(
          'middle'
        );


      /* ------------------------------------------------------------------
       * TASK
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          row,
          1,
          1,
          4
        )
        .setValue(
          task.TaskName ||
          'Untitled task'
        )
        .setFontSize(
          10
        )
        .setFontWeight(
          'bold'
        )
        .setFontColor(
          TODAY_THEME.text
        );


      /* ------------------------------------------------------------------
       * AREA
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          row,
          5,
          1,
          2
        )
        .setValue(
          task.Area ||
          'Personal'
        )
        .setFontSize(
          9
        )
        .setFontColor(
          TODAY_THEME.text2
        );


      /* ------------------------------------------------------------------
       * TIME
       * ---------------------------------------------------------------- */

      const timeLabel =
        task.DueTime
          ? String(
              task.DueTime
            )
          : todayFormatMinutes_(
              Number(
                task.EstimateMinutes
              ) || 0
            );

      sheet
        .getRange(
          row,
          7
        )
        .setValue(
          timeLabel
        )
        .setFontSize(
          9
        )
        .setFontWeight(
          'bold'
        )
        .setFontColor(
          tone.text
        )
        .setBackground(
          tone.soft
        )
        .setHorizontalAlignment(
          'center'
        );


      /* ------------------------------------------------------------------
       * SCORE
       * ---------------------------------------------------------------- */

      const score =
        Number(
          task.SmartScore
        ) || 0;

      const scoreTone =
        todayScoreTone_(
          score
        );

      sheet
        .getRange(
          row,
          8
        )
        .setValue(
          score || '—'
        )
        .setFontSize(
          10
        )
        .setFontWeight(
          'bold'
        )
        .setFontColor(
          scoreTone.text
        )
        .setBackground(
          scoreTone.soft
        )
        .setHorizontalAlignment(
          'center'
        );


      /* ------------------------------------------------------------------
       * NEXT ACTION
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          row,
          9,
          1,
          2
        )
        .setValue(
          task.RecommendedAction ||
          'Continue as planned'
        )
        .setFontSize(
          9
        )
        .setFontColor(
          TODAY_THEME.text2
        )
        .setWrap(
          true
        );


      sheet.setRowHeight(
        row,
        42
      );
    }
  );


  return (
    firstDataRow +
    tasks.length -
    1
  );
}


/* ==========================================================================
 * END OF DAY
 * ========================================================================== */

function writeEndOfDayReview_(
  sheet,
  data,
  startRow
) {
  const completionRate =
    Math.max(
      0,
      Math.min(
        100,
        data.completionRate || 0
      )
    );


  /* ----------------------------------------------------------------------
   * HEADER
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow,
      1,
      1,
      10
    )
    .merge()
    .setValue(
      'END-OF-DAY REVIEW'
    )
    .setFontSize(
      13
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TODAY_THEME.text
    );

  sheet.setRowHeight(
    startRow,
    30
  );


  /* ----------------------------------------------------------------------
   * REVIEW CARD
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow + 1,
      1,
      4,
      10
    )
    .setBackground(
      TODAY_THEME.surface
    )
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      TODAY_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );


  /* ----------------------------------------------------------------------
   * LEFT STATUS
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow + 1,
      1,
      1,
      5
    )
    .merge()
    .setValue(
      'TODAY\'S PROGRESS'
    )
    .setFontSize(
      8
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TODAY_THEME.muted
    );


  sheet
    .getRange(
      startRow + 2,
      1,
      1,
      5
    )
    .merge()
    .setValue(
      data.completedToday.length +
      ' completed'
    )
    .setFontSize(
      18
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      completionRate >= 70
        ? TODAY_THEME.success
        : TODAY_THEME.text
    );


  sheet
    .getRange(
      startRow + 3,
      1,
      1,
      5
    )
    .merge()
    .setValue(
      data.plannedTodayCount > 0
        ? (
            completionRate +
            '% of today\'s planned work'
          )
        : 'No planned tasks today'
    )
    .setFontSize(
      9
    )
    .setFontColor(
      TODAY_THEME.text2
    );


  /* ----------------------------------------------------------------------
   * RIGHT PROGRESS
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow + 1,
      6,
      1,
      5
    )
    .merge()
    .setValue(
      'COMPLETION'
    )
    .setFontSize(
      8
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TODAY_THEME.muted
    );


  sheet
    .getRange(
      startRow + 2,
      6,
      1,
      4
    )
    .merge()
    .setValue(
      buildTodayProgressBar_(
        completionRate,
        12
      )
    )
    .setFontSize(
      12
    )
    .setFontColor(
      completionRate >= 70
        ? TODAY_THEME.success
        : TODAY_THEME.primary
    );


  sheet
    .getRange(
      startRow + 2,
      10
    )
    .setValue(
      completionRate + '%'
    )
    .setFontSize(
      11
    )
    .setFontWeight(
      'bold'
    )
    .setHorizontalAlignment(
      'right'
    );


  /* ----------------------------------------------------------------------
   * MESSAGE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow + 4,
      6,
      1,
      5
    )
    .merge()
    .setValue(
      buildTodayReviewMessage_(
        data
      )
    )
    .setFontSize(
      9
    )
    .setFontColor(
      TODAY_THEME.text2
    )
    .setWrap(
      true
    );


  for (
    let row =
      startRow + 1;
    row <=
      startRow + 4;
    row++
  ) {
    sheet.setRowHeight(
      row,
      row ===
        startRow + 4
        ? 34
        : 25
    );
  }


  return (
    startRow + 4
  );
}


/* ==========================================================================
 * FOOTER
 * ========================================================================== */

function writeTodayFooter_(
  sheet,
  row
) {
  const refreshTime =
    Utilities.formatDate(
      now_(),
      Session.getScriptTimeZone(),
      'HH:mm'
    );

  sheet
    .getRange(
      row,
      1,
      1,
      10
    )
    .merge()
    .setValue(
      'Smart Task Manager  •  Today refreshed at ' +
      refreshTime
    )
    .setFontSize(
      8
    )
    .setFontColor(
      TODAY_THEME.muted
    )
    .setHorizontalAlignment(
      'right'
    );

  sheet.setRowHeight(
    row,
    22
  );
}


/* ==========================================================================
 * ROW MERGES
 * ========================================================================== */

function mergeTodayTaskRow_(
  sheet,
  row
) {
  sheet
    .getRange(
      row,
      1,
      1,
      4
    )
    .merge();

  sheet
    .getRange(
      row,
      5,
      1,
      2
    )
    .merge();

  sheet
    .getRange(
      row,
      9,
      1,
      2
    )
    .merge();
}


/* ==========================================================================
 * TONES
 * ========================================================================== */

function getTodayTone_(
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
          TODAY_THEME.danger,

        soft:
          TODAY_THEME.dangerSoft
      };

    case 'warning':
      return {
        text:
          TODAY_THEME.warning,

        soft:
          TODAY_THEME.warningSoft
      };

    case 'success':
      return {
        text:
          TODAY_THEME.success,

        soft:
          TODAY_THEME.successSoft
      };

    case 'info':
      return {
        text:
          TODAY_THEME.info,

        soft:
          TODAY_THEME.infoSoft
      };

    default:
      return {
        text:
          TODAY_THEME.primary,

        soft:
          TODAY_THEME.primaryLight
      };
  }
}


function todayScoreTone_(
  score
) {
  score =
    Number(
      score
    ) || 0;

  if (
    score >= 85
  ) {
    return getTodayTone_(
      'danger'
    );
  }

  if (
    score >= 65
  ) {
    return getTodayTone_(
      'warning'
    );
  }

  if (
    score >= 40
  ) {
    return getTodayTone_(
      'primary'
    );
  }

  return getTodayTone_(
    'success'
  );
}


function todayDueTone_(
  dueDate,
  today
) {
  const date =
    stripTime_(
      dueDate
    );

  if (!date) {
    return {
      text:
        TODAY_THEME.muted,

      soft:
        TODAY_THEME.surface2
    };
  }

  const difference =
    daysBetween_(
      today,
      date
    );

  if (
    difference < 0
  ) {
    return getTodayTone_(
      'danger'
    );
  }

  if (
    difference <= 1
  ) {
    return getTodayTone_(
      'warning'
    );
  }

  return getTodayTone_(
    'success'
  );
}


/* ==========================================================================
 * DAILY GREETING
 * ========================================================================== */

function buildTodayGreeting_() {
  const hour =
    new Date().getHours();

  if (
    hour < 12
  ) {
    return (
      'Good morning. Start with the work that creates the most momentum.'
    );
  }

  if (
    hour < 18
  ) {
    return (
      'Good afternoon. Stay focused on the few things that matter most.'
    );
  }

  return (
    'Good evening. Finish intentionally and close the day well.'
  );
}


/* ==========================================================================
 * DUE LABEL
 * ========================================================================== */

function todayDueLabel_(
  dueDate,
  today
) {
  const date =
    stripTime_(
      dueDate
    );

  if (!date) {
    return 'No deadline';
  }

  const difference =
    daysBetween_(
      today,
      date
    );

  if (
    difference < 0
  ) {
    return 'Overdue';
  }

  if (
    difference === 0
  ) {
    return 'Due today';
  }

  if (
    difference === 1
  ) {
    return 'Tomorrow';
  }

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'MMM d'
  );
}


/* ==========================================================================
 * FORMAT
 * ========================================================================== */

function todayFormatMinutes_(
  totalMinutes
) {
  totalMinutes =
    Math.max(
      0,
      Number(
        totalMinutes
      ) || 0
    );

  if (
    totalMinutes === 0
  ) {
    return '0m';
  }

  const hours =
    Math.floor(
      totalMinutes /
      60
    );

  const minutes =
    totalMinutes %
    60;

  if (
    hours === 0
  ) {
    return (
      minutes +
      'm'
    );
  }

  if (
    minutes === 0
  ) {
    return (
      hours +
      'h'
    );
  }

  return (
    hours +
    'h ' +
    minutes +
    'm'
  );
}


/* ==========================================================================
 * PROGRESS BAR
 * ========================================================================== */

function buildTodayProgressBar_(
  progress,
  segments
) {
  progress =
    Math.max(
      0,
      Math.min(
        100,
        Number(
          progress
        ) || 0
      )
    );

  segments =
    Number(
      segments
    ) || 10;

  const completed =
    Math.round(
      (
        progress /
        100
      ) *
      segments
    );

  return (
    '▰'.repeat(
      completed
    ) +
    '▱'.repeat(
      segments -
      completed
    )
  );
}


/* ==========================================================================
 * END-OF-DAY MESSAGE
 * ========================================================================== */

function buildTodayReviewMessage_(
  data
) {
  if (
    data.plannedTodayCount === 0
  ) {
    return (
      'No tasks were planned for today. Use the remaining time intentionally.'
    );
  }

  if (
    data.completionRate >= 100
  ) {
    return (
      'Everything planned for today is complete. Great time to stop and reset.'
    );
  }

  if (
    data.completionRate >= 70
  ) {
    return (
      'Strong progress today. Finish only what still matters before closing out.'
    );
  }

  if (
    data.overdueTasks.length > 0
  ) {
    return (
      'There is unfinished priority work. Consider rescheduling intentionally instead of carrying it silently.'
    );
  }

  return (
    'Progress is still available. Choose one meaningful task to finish before ending the day.'
  );
}


/* ==========================================================================
 * HELPERS
 * ========================================================================== */

function todayByScoreDesc_(
  a,
  b
) {
  const difference =
    (
      Number(
        b.SmartScore
      ) || 0
    ) -
    (
      Number(
        a.SmartScore
      ) || 0
    );

  if (
    difference !== 0
  ) {
    return difference;
  }

  const aDue =
    stripTime_(
      a.DueDate
    );

  const bDue =
    stripTime_(
      b.DueDate
    );

  if (
    !aDue &&
    !bDue
  ) {
    return 0;
  }

  if (!aDue) {
    return 1;
  }

  if (!bDue) {
    return -1;
  }

  return (
    aDue.getTime() -
    bDue.getTime()
  );
}


function todayUniqueByTaskId_(
  tasks
) {
  const seen = {};

  return (
    tasks || []
  ).filter(
    function (task) {
      const taskId =
        String(
          task.TaskId || ''
        );

      if (!taskId) {
        return false;
      }

      if (
        seen[
          taskId
        ]
      ) {
        return false;
      }

      seen[
        taskId
      ] =
        true;

      return true;
    }
  );
}


function todaySameDay_(
  dateValue,
  referenceDate
) {
  const date =
    stripTime_(
      dateValue
    );

  const reference =
    stripTime_(
      referenceDate
    );

  if (
    !date ||
    !reference
  ) {
    return false;
  }

  return (
    date.getTime() ===
    reference.getTime()
  );
}


function todayCountHighPriority_(
  tasks
) {
  return (
    tasks || []
  ).filter(
    function (task) {
      const priority =
        String(
          task.Priority || ''
        );

      return (
        priority ===
          'High' ||
        priority ===
          'Urgent' ||
        priority ===
          'Critical'
      );
    }
  ).length;
}