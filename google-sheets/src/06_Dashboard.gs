/**
 * 06_Dashboard.gs
 * -----------------------------------------------------------------------
 * FRAME 03 — DASHBOARD
 *
 * Professional personal productivity dashboard.
 *
 * Pure view layer:
 * - Reads Tasks / Habits
 * - Never creates a second copy of task data
 * - Never writes business data back to Tasks
 *
 * Design goals:
 * - Modern
 * - Premium
 * - Clean
 * - Personal productivity focused
 * - Consistent with Task Details
 * -----------------------------------------------------------------------
 */


/* ==========================================================================
 * DASHBOARD CONFIG
 * ========================================================================== */

const DASHBOARD_LAYOUT = {
  cols: 10,

  accentRow: 1,

  titleRow: 2,
  subtitleRow: 3,

  spacerAfterHeader: 4,

  kpiStartRow: 5,
  kpiEndRow: 8,

  focusTitleRow: 10,
  focusHeaderRow: 11,
  focusFirstRow: 12,
  focusMaxRows: 6,

  lowerSpacerRows: 1,

  areaMaxRows: 6,
  insightMaxItems: 3,

  kpiCols: [
    { start: 1, end: 2 },
    { start: 3, end: 4 },
    { start: 5, end: 6 },
    { start: 7, end: 8 },
    { start: 9, end: 10 }
  ]
};


const DASHBOARD_THEME = {
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

function renderDashboard_() {
  const sheet =
    getOrCreateSheet_(
      SHEETS.DASHBOARD
    );

  prepareDashboardCanvas_(
    sheet
  );

  const data =
    computeDashboardData_();

  writeDashboardHeader_(
    sheet,
    data
  );

  writeKpiCards_(
    sheet,
    data.kpis
  );

  const focusEndRow =
    writeFocusNowSection_(
      sheet,
      data.focusNow
    );

  const lowerStartRow =
    focusEndRow +
    DASHBOARD_LAYOUT.lowerSpacerRows +
    2;

  const lowerEndRow =
    writeDashboardLowerPanels_(
      sheet,
      data,
      lowerStartRow
    );

  writeDashboardFooter_(
    sheet,
    lowerEndRow + 2
  );

  SpreadsheetApp.flush();
}


/* ==========================================================================
 * CANVAS
 * ========================================================================== */

function prepareDashboardCanvas_(sheet) {
  const minRows = 50;
  const minCols =
    DASHBOARD_LAYOUT.cols;

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
   * Break previous dashboard merges.
   */
  sheet
    .getRange(
      1,
      1,
      Math.min(
        sheet.getMaxRows(),
        60
      ),
      minCols
    )
    .breakApart();

  sheet.clear();

  sheet.setHiddenGridlines(
    true
  );

  sheet.setFrozenRows(
    3
  );

  try {
    sheet.setTabColor(
      DASHBOARD_THEME.primary
    );
  } catch (error) {
    console.warn(
      'Dashboard tab color skipped:',
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
      50,
      minCols
    )
    .setBackground(
      DASHBOARD_THEME.background
    )
    .setFontColor(
      DASHBOARD_THEME.text
    )
    .setVerticalAlignment(
      'middle'
    );


  /* ----------------------------------------------------------------------
   * COLUMN WIDTHS
   * -------------------------------------------------------------------- */

  const widths = [
    108, // A
    108, // B
    108, // C
    108, // D
    92,  // E
    92,  // F
    90,  // G
    78,  // H
    126, // I
    126  // J
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
   * BASE ROW HEIGHTS
   * -------------------------------------------------------------------- */

  sheet.setRowHeight(
    DASHBOARD_LAYOUT.accentRow,
    5
  );

  sheet.setRowHeight(
    DASHBOARD_LAYOUT.titleRow,
    42
  );

  sheet.setRowHeight(
    DASHBOARD_LAYOUT.subtitleRow,
    28
  );

  sheet.setRowHeight(
    DASHBOARD_LAYOUT.spacerAfterHeader,
    12
  );
}


/* ==========================================================================
 * DATA
 * ========================================================================== */

function computeDashboardData_() {
  const tasks =
    getAllTasks_();

  const today =
    stripTime_(
      now_()
    );

  const week =
    getWeekRange_(
      today
    );

  const dueSoonDays =
    Number(
      getSetting_(
        'DueSoonDays',
        2
      )
    ) || 2;

  const dailyFocusLimitHours =
    Number(
      getSetting_(
        'DailyFocusLimitHours',
        4
      )
    ) || 4;


  /* ----------------------------------------------------------------------
   * CORE SETS
   * -------------------------------------------------------------------- */

  const openTasks =
    tasks.filter(
      function (task) {
        return String(
          task.Status || ''
        ) !== 'Completed';
      }
    );


  const todayTasks =
    openTasks.filter(
      function (task) {
        return sameDay_(
          task.DueDate,
          today
        );
      }
    );


  const overdueTasks =
    openTasks.filter(
      function (task) {
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
    );


  const weekTasks =
    tasks.filter(
      function (task) {
        return isWithinRange_(
          task.DueDate,
          week.start,
          week.end
        );
      }
    );


  const weekCompleted =
    weekTasks.filter(
      function (task) {
        return String(
          task.Status || ''
        ) === 'Completed';
      }
    );


  /* ----------------------------------------------------------------------
   * FOCUS TIME
   * -------------------------------------------------------------------- */

  const focusMinutesToday =
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


  const focusCapacityMinutes =
    dailyFocusLimitHours *
    60;


  const focusLoadPercent =
    focusCapacityMinutes > 0
      ? Math.round(
          (
            focusMinutesToday /
            focusCapacityMinutes
          ) * 100
        )
      : 0;


  /* ----------------------------------------------------------------------
   * WEEK PROGRESS
   * -------------------------------------------------------------------- */

  const weeklyPercent =
    weekTasks.length > 0
      ? Math.round(
          (
            weekCompleted.length /
            weekTasks.length
          ) * 100
        )
      : 0;


  /* ----------------------------------------------------------------------
   * STREAK
   * -------------------------------------------------------------------- */

  const streak =
    getBestHabitStreak_();


  /* ----------------------------------------------------------------------
   * KPI
   * -------------------------------------------------------------------- */

  const kpis = {

    dueToday: {
      value:
        todayTasks.length,

      sub:
        countHighImpact_(
          todayTasks
        ) +
        ' high priority',

      tone:
        todayTasks.length > 0
          ? 'primary'
          : 'success'
    },


    overdue: {
      value:
        overdueTasks.length,

      sub:
        overdueTasks.length > 0
          ? 'Needs attention'
          : 'All clear',

      tone:
        overdueTasks.length > 0
          ? 'danger'
          : 'success'
    },


    focusTime: {
      value:
        formatMinutes_(
          focusMinutesToday
        ),

      sub:
        Math.min(
          focusLoadPercent,
          999
        ) +
        '% of daily capacity',

      tone:
        focusLoadPercent > 100
          ? 'warning'
          : 'info'
    },


    weeklyProgress: {
      value:
        weekTasks.length > 0
          ? weeklyPercent + '%'
          : '—',

      sub:
        weekTasks.length > 0
          ? (
              weekCompleted.length +
              ' of ' +
              weekTasks.length +
              ' completed'
            )
          : 'No tasks due this week',

      tone:
        weeklyPercent >= 70
          ? 'success'
          : 'primary'
    },


    streak: {
      value:
        streak,

      sub:
        streak === 1
          ? 'day planning streak'
          : 'days planning streak',

      tone:
        streak > 0
          ? 'warning'
          : 'primary'
    }
  };


  /* ----------------------------------------------------------------------
   * FOCUS NOW
   * -------------------------------------------------------------------- */

  const focusNow =
    openTasks
      .slice()
      .sort(
        function (a, b) {
          const scoreDifference =
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
            scoreDifference !== 0
          ) {
            return scoreDifference;
          }

          return compareDashboardDueDates_(
            a.DueDate,
            b.DueDate
          );
        }
      )
      .slice(
        0,
        DASHBOARD_LAYOUT.focusMaxRows
      );


  const areas =
    getAreaProgress_(
      tasks
    );


  const insights =
    generateInsights_({
      overdueTasks:
        overdueTasks,

      todayTasks:
        todayTasks,

      focusMinutesToday:
        focusMinutesToday,

      focusCapacityMinutes:
        focusCapacityMinutes,

      dailyFocusLimitHours:
        dailyFocusLimitHours,

      weekTasks:
        weekTasks,

      weekCompleted:
        weekCompleted,

      dueSoonDays:
        dueSoonDays,

      focusNow:
        focusNow
    });


  return {
    tasks:
      tasks,

    openTasks:
      openTasks,

    todayTasks:
      todayTasks,

    overdueTasks:
      overdueTasks,

    weekTasks:
      weekTasks,

    weekCompleted:
      weekCompleted,

    focusMinutesToday:
      focusMinutesToday,

    focusCapacityMinutes:
      focusCapacityMinutes,

    weeklyPercent:
      weeklyPercent,

    streak:
      streak,

    kpis:
      kpis,

    focusNow:
      focusNow,

    areas:
      areas,

    insights:
      insights
  };
}


/* ==========================================================================
 * HEADER
 * ========================================================================== */

function writeDashboardHeader_(
  sheet,
  data
) {

  /* ----------------------------------------------------------------------
   * TOP ACCENT
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      DASHBOARD_LAYOUT.accentRow,
      1,
      1,
      DASHBOARD_LAYOUT.cols
    )
    .setBackground(
      DASHBOARD_THEME.primary
    );


  /* ----------------------------------------------------------------------
   * TITLE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      DASHBOARD_LAYOUT.titleRow,
      1,
      1,
      6
    )
    .merge()
    .setValue(
      'Dashboard'
    )
    .setFontSize(
      26
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      DASHBOARD_THEME.text
    )
    .setHorizontalAlignment(
      'left'
    );


  /* ----------------------------------------------------------------------
   * DATE
   * -------------------------------------------------------------------- */

  const currentDate =
    Utilities.formatDate(
      now_(),
      Session.getScriptTimeZone(),
      'EEE, dd MMM yyyy'
    );

  sheet
    .getRange(
      DASHBOARD_LAYOUT.titleRow,
      7,
      1,
      4
    )
    .merge()
    .setValue(
      currentDate
    )
    .setFontSize(
      11
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      DASHBOARD_THEME.text2
    )
    .setHorizontalAlignment(
      'right'
    );


  /* ----------------------------------------------------------------------
   * GREETING / STATUS
   * -------------------------------------------------------------------- */

  const greeting =
    buildGreeting_();

  const statusText =
    data.openTasks.length +
    ' open tasks' +
    '  •  ' +
    data.todayTasks.length +
    ' due today' +
    '  •  ' +
    data.weekCompleted.length +
    '/' +
    data.weekTasks.length +
    ' completed this week';


  sheet
    .getRange(
      DASHBOARD_LAYOUT.subtitleRow,
      1,
      1,
      6
    )
    .merge()
    .setValue(
      greeting
    )
    .setFontSize(
      12
    )
    .setFontColor(
      DASHBOARD_THEME.text2
    )
    .setHorizontalAlignment(
      'left'
    );


  sheet
    .getRange(
      DASHBOARD_LAYOUT.subtitleRow,
      7,
      1,
      4
    )
    .merge()
    .setValue(
      statusText
    )
    .setFontSize(
      9
    )
    .setFontColor(
      DASHBOARD_THEME.muted
    )
    .setHorizontalAlignment(
      'right'
    );
}


/* ==========================================================================
 * KPI CARDS
 * ========================================================================== */

function writeKpiCards_(
  sheet,
  kpis
) {
  const configs = [
    {
      key:
        'dueToday',

      label:
        'DUE TODAY'
    },
    {
      key:
        'overdue',

      label:
        'OVERDUE'
    },
    {
      key:
        'focusTime',

      label:
        'FOCUS TIME'
    },
    {
      key:
        'weeklyProgress',

      label:
        'WEEKLY PROGRESS'
    },
    {
      key:
        'streak',

      label:
        'STREAK'
    }
  ];


  configs.forEach(
    function (config, index) {

      const columns =
        DASHBOARD_LAYOUT
          .kpiCols[index];

      const width =
        columns.end -
        columns.start +
        1;

      const data =
        kpis[
          config.key
        ];

      const tone =
        getDashboardTone_(
          data.tone
        );


      /* ------------------------------------------------------------------
       * CARD BODY
       * ---------------------------------------------------------------- */

      const cardRange =
        sheet.getRange(
          DASHBOARD_LAYOUT.kpiStartRow,
          columns.start,
          4,
          width
        );

      cardRange
        .setBackground(
          DASHBOARD_THEME.surface
        )
        .setBorder(
          true,
          true,
          true,
          true,
          false,
          false,
          DASHBOARD_THEME.border,
          SpreadsheetApp
            .BorderStyle
            .SOLID
        );


      /* ------------------------------------------------------------------
       * LABEL
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          DASHBOARD_LAYOUT.kpiStartRow,
          columns.start,
          1,
          width
        )
        .merge()
        .setValue(
          config.label
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
          'left'
        );


      /* ------------------------------------------------------------------
       * VALUE
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          DASHBOARD_LAYOUT.kpiStartRow + 1,
          columns.start,
          2,
          width
        )
        .merge()
        .setValue(
          data.value
        )
        .setFontSize(
          24
        )
        .setFontWeight(
          'bold'
        )
        .setFontColor(
          tone.text
        )
        .setHorizontalAlignment(
          'left'
        );


      /* ------------------------------------------------------------------
       * SUB
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          DASHBOARD_LAYOUT.kpiEndRow,
          columns.start,
          1,
          width
        )
        .merge()
        .setValue(
          data.sub
        )
        .setFontSize(
          9
        )
        .setFontColor(
          DASHBOARD_THEME.text2
        )
        .setHorizontalAlignment(
          'left'
        );


      sheet.setRowHeight(
        DASHBOARD_LAYOUT.kpiStartRow,
        25
      );

      sheet.setRowHeight(
        DASHBOARD_LAYOUT.kpiStartRow + 1,
        28
      );

      sheet.setRowHeight(
        DASHBOARD_LAYOUT.kpiStartRow + 2,
        26
      );

      sheet.setRowHeight(
        DASHBOARD_LAYOUT.kpiEndRow,
        27
      );
    }
  );
}


/* ==========================================================================
 * FOCUS NOW
 * ========================================================================== */

function writeFocusNowSection_(
  sheet,
  focusNow
) {
  const titleRow =
    DASHBOARD_LAYOUT.focusTitleRow;

  const headerRow =
    DASHBOARD_LAYOUT.focusHeaderRow;

  const firstDataRow =
    DASHBOARD_LAYOUT.focusFirstRow;


  /* ----------------------------------------------------------------------
   * SECTION HEADER
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      titleRow,
      1,
      1,
      7
    )
    .merge()
    .setValue(
      'FOCUS NOW'
    )
    .setFontSize(
      14
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      DASHBOARD_THEME.text
    );


  sheet
    .getRange(
      titleRow,
      8,
      1,
      3
    )
    .merge()
    .setValue(
      focusNow.length > 0
        ? 'Top priorities by Smart Score'
        : 'Nothing urgent'
    )
    .setFontSize(
      9
    )
    .setFontColor(
      DASHBOARD_THEME.muted
    )
    .setHorizontalAlignment(
      'right'
    );


  sheet.setRowHeight(
    titleRow,
    30
  );


  /* ----------------------------------------------------------------------
   * TABLE HEADER
   * -------------------------------------------------------------------- */

  mergeFocusColumns_(
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
      'DUE'
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
      'RECOMMENDED ACTION'
    );


  sheet
    .getRange(
      headerRow,
      1,
      1,
      10
    )
    .setBackground(
      DASHBOARD_THEME.surface2
    )
    .setFontSize(
      9
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      DASHBOARD_THEME.text2
    )
    .setVerticalAlignment(
      'middle'
    )
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      DASHBOARD_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );

  sheet.setRowHeight(
    headerRow,
    30
  );


  /* ----------------------------------------------------------------------
   * EMPTY STATE
   * -------------------------------------------------------------------- */

  if (
    focusNow.length === 0
  ) {
    sheet
      .getRange(
        firstDataRow,
        1,
        2,
        10
      )
      .merge()
      .setValue(
        'You are all clear. Add a task or enjoy the extra space in your day.'
      )
      .setBackground(
        DASHBOARD_THEME.successSoft
      )
      .setFontColor(
        DASHBOARD_THEME.success
      )
      .setFontSize(
        11
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
        DASHBOARD_THEME.border,
        SpreadsheetApp
          .BorderStyle
          .SOLID
      );

    sheet.setRowHeight(
      firstDataRow,
      30
    );

    sheet.setRowHeight(
      firstDataRow + 1,
      30
    );

    return (
      firstDataRow + 1
    );
  }


  /* ----------------------------------------------------------------------
   * TASK ROWS
   * -------------------------------------------------------------------- */

  const today =
    stripTime_(
      now_()
    );


  focusNow.forEach(
    function (task, index) {
      const row =
        firstDataRow +
        index;

      mergeFocusColumns_(
        sheet,
        row
      );

      const background =
        index % 2 === 0
          ? DASHBOARD_THEME.surface
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
          DASHBOARD_THEME.border,
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
          11
        )
        .setFontWeight(
          'bold'
        )
        .setFontColor(
          DASHBOARD_THEME.text
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
          10
        )
        .setFontColor(
          DASHBOARD_THEME.text2
        );


      /* ------------------------------------------------------------------
       * DUE
       * ---------------------------------------------------------------- */

      const dueLabel =
        dueLabel_(
          task.DueDate,
          today
        );

      const dueTone =
        dashboardDueTone_(
          task.DueDate,
          today
        );

      sheet
        .getRange(
          row,
          7
        )
        .setValue(
          dueLabel
        )
        .setFontSize(
          9
        )
        .setFontWeight(
          'bold'
        )
        .setFontColor(
          dueTone.text
        )
        .setBackground(
          dueTone.soft
        )
        .setHorizontalAlignment(
          'center'
        );


      /* ------------------------------------------------------------------
       * SMART SCORE
       * ---------------------------------------------------------------- */

      const score =
        Number(
          task.SmartScore
        ) || 0;

      const scoreTone =
        dashboardScoreTone_(
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
          11
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
       * RECOMMENDATION
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
          DASHBOARD_THEME.text2
        )
        .setWrap(
          true
        );


      sheet.setRowHeight(
        row,
        44
      );
    }
  );


  return (
    firstDataRow +
    focusNow.length -
    1
  );
}


/* ==========================================================================
 * LOWER PANELS
 * ========================================================================== */

function writeDashboardLowerPanels_(
  sheet,
  data,
  startRow
) {
  const areaEnd =
    writeMyAreasPanel_(
      sheet,
      data.areas,
      startRow
    );

  const insightEnd =
    writeSmartInsightsPanel_(
      sheet,
      data.insights,
      startRow
    );

  return Math.max(
    areaEnd,
    insightEnd
  );
}


/* ==========================================================================
 * MY AREAS
 * ========================================================================== */

function writeMyAreasPanel_(
  sheet,
  areas,
  startRow
) {

  /* ----------------------------------------------------------------------
   * HEADER
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow,
      1,
      1,
      5
    )
    .merge()
    .setValue(
      'MY AREAS'
    )
    .setBackground(
      DASHBOARD_THEME.surface
    )
    .setFontColor(
      DASHBOARD_THEME.text
    )
    .setFontSize(
      13
    )
    .setFontWeight(
      'bold'
    )
    .setBorder(
      true,
      true,
      false,
      true,
      false,
      false,
      DASHBOARD_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );

  sheet.setRowHeight(
    startRow,
    32
  );


  const list =
    areas.slice(
      0,
      DASHBOARD_LAYOUT.areaMaxRows
    );


  /* ----------------------------------------------------------------------
   * EMPTY
   * -------------------------------------------------------------------- */

  if (
    list.length === 0
  ) {
    sheet
      .getRange(
        startRow + 1,
        1,
        2,
        5
      )
      .merge()
      .setValue(
        'No Areas yet. Add an Area to your tasks to see progress here.'
      )
      .setBackground(
        DASHBOARD_THEME.surface
      )
      .setFontColor(
        DASHBOARD_THEME.muted
      )
      .setFontSize(
        10
      )
      .setWrap(
        true
      )
      .setBorder(
        false,
        true,
        true,
        true,
        false,
        false,
        DASHBOARD_THEME.border,
        SpreadsheetApp
          .BorderStyle
          .SOLID
      );

    return (
      startRow + 2
    );
  }


  list.forEach(
    function (area, index) {
      const row =
        startRow +
        1 +
        index;

      const background =
        index % 2 === 0
          ? DASHBOARD_THEME.surface
          : '#FBFCFE';


      sheet
        .getRange(
          row,
          1,
          1,
          5
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
          DASHBOARD_THEME.border,
          SpreadsheetApp
            .BorderStyle
            .SOLID
        );


      sheet
        .getRange(
          row,
          1,
          1,
          2
        )
        .merge()
        .setValue(
          area.area
        )
        .setFontSize(
          10
        )
        .setFontWeight(
          'bold'
        )
        .setFontColor(
          DASHBOARD_THEME.text
        );


      sheet
        .getRange(
          row,
          3,
          1,
          2
        )
        .merge()
        .setValue(
          buildDashboardProgressBar_(
            area.progress,
            8
          )
        )
        .setFontSize(
          10
        )
        .setFontColor(
          DASHBOARD_THEME.primary
        );


      sheet
        .getRange(
          row,
          5
        )
        .setValue(
          area.progress + '%'
        )
        .setFontSize(
          10
        )
        .setFontWeight(
          'bold'
        )
        .setFontColor(
          dashboardProgressColor_(
            area.progress
          )
        )
        .setHorizontalAlignment(
          'right'
        );


      sheet.setRowHeight(
        row,
        33
      );
    }
  );


  return (
    startRow +
    list.length
  );
}


/* ==========================================================================
 * SMART INSIGHTS
 * ========================================================================== */

function writeSmartInsightsPanel_(
  sheet,
  insights,
  startRow
) {

  /* ----------------------------------------------------------------------
   * HEADER
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow,
      6,
      1,
      5
    )
    .merge()
    .setValue(
      'SMART INSIGHTS'
    )
    .setBackground(
      DASHBOARD_THEME.surface
    )
    .setFontColor(
      DASHBOARD_THEME.text
    )
    .setFontSize(
      13
    )
    .setFontWeight(
      'bold'
    )
    .setBorder(
      true,
      true,
      false,
      true,
      false,
      false,
      DASHBOARD_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );

  sheet.setRowHeight(
    startRow,
    32
  );


  const list =
    insights.slice(
      0,
      DASHBOARD_LAYOUT.insightMaxItems
    );


  if (
    list.length === 0
  ) {
    sheet
      .getRange(
        startRow + 1,
        6,
        2,
        5
      )
      .merge()
      .setValue(
        'Everything looks balanced. Keep moving through your focus list.'
      )
      .setBackground(
        DASHBOARD_THEME.successSoft
      )
      .setFontColor(
        DASHBOARD_THEME.success
      )
      .setFontSize(
        10
      )
      .setFontWeight(
        'bold'
      )
      .setWrap(
        true
      )
      .setBorder(
        true,
        true,
        true,
        true,
        false,
        false,
        DASHBOARD_THEME.border,
        SpreadsheetApp
          .BorderStyle
          .SOLID
      );

    return (
      startRow + 2
    );
  }


  let lastRow =
    startRow;


  list.forEach(
    function (insight, index) {
      const row =
        startRow +
        1 +
        (
          index * 2
        );

      const tone =
        insight.tone
          ? getDashboardTone_(
              insight.tone
            )
          : getDashboardTone_(
              'primary'
            );


      sheet
        .getRange(
          row,
          6,
          2,
          5
        )
        .merge()
        .setValue(
          insight.text ||
          insight
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
        .setWrap(
          true
        )
        .setVerticalAlignment(
          'middle'
        )
        .setBorder(
          true,
          true,
          true,
          true,
          false,
          false,
          DASHBOARD_THEME.border,
          SpreadsheetApp
            .BorderStyle
            .SOLID
        );


      sheet.setRowHeight(
        row,
        25
      );

      sheet.setRowHeight(
        row + 1,
        25
      );

      lastRow =
        row + 1;
    }
  );


  return lastRow;
}


/* ==========================================================================
 * FOOTER
 * ========================================================================== */

function writeDashboardFooter_(
  sheet,
  row
) {
  const time =
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
      'Smart Task Manager  •  Last refreshed ' +
      time
    )
    .setFontSize(
      8
    )
    .setFontColor(
      DASHBOARD_THEME.muted
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
 * MERGE HELPERS
 * ========================================================================== */

function mergeFocusColumns_(
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

function getDashboardTone_(
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
          DASHBOARD_THEME.danger,

        soft:
          DASHBOARD_THEME.dangerSoft
      };

    case 'warning':
      return {
        text:
          DASHBOARD_THEME.warning,

        soft:
          DASHBOARD_THEME.warningSoft
      };

    case 'success':
      return {
        text:
          DASHBOARD_THEME.success,

        soft:
          DASHBOARD_THEME.successSoft
      };

    case 'info':
      return {
        text:
          DASHBOARD_THEME.info,

        soft:
          DASHBOARD_THEME.infoSoft
      };

    default:
      return {
        text:
          DASHBOARD_THEME.primary,

        soft:
          DASHBOARD_THEME.primaryLight
      };
  }
}


function dashboardScoreTone_(
  score
) {
  score =
    Number(
      score
    ) || 0;

  /*
   * Higher Smart Score means
   * more urgent / important.
   */

  if (
    score >= 85
  ) {
    return getDashboardTone_(
      'danger'
    );
  }

  if (
    score >= 65
  ) {
    return getDashboardTone_(
      'warning'
    );
  }

  if (
    score >= 40
  ) {
    return getDashboardTone_(
      'primary'
    );
  }

  return getDashboardTone_(
    'success'
  );
}


function dashboardDueTone_(
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
        DASHBOARD_THEME.muted,

      soft:
        DASHBOARD_THEME.surface2
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
    return getDashboardTone_(
      'danger'
    );
  }

  if (
    difference <= 1
  ) {
    return getDashboardTone_(
      'warning'
    );
  }

  return getDashboardTone_(
    'success'
  );
}


function dashboardProgressColor_(
  progress
) {
  progress =
    Number(
      progress
    ) || 0;

  if (
    progress >= 80
  ) {
    return DASHBOARD_THEME.success;
  }

  if (
    progress >= 40
  ) {
    return DASHBOARD_THEME.primary;
  }

  return DASHBOARD_THEME.warning;
}


/* ==========================================================================
 * PROGRESS BAR
 * ========================================================================== */

function buildDashboardProgressBar_(
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
    ) || 8;

  const completed =
    Math.round(
      (
        progress /
        100
      ) *
      segments
    );

  const remaining =
    segments -
    completed;

  return (
    '▰'.repeat(
      completed
    ) +
    '▱'.repeat(
      remaining
    )
  );
}


/* ==========================================================================
 * DASHBOARD BUSINESS HELPERS
 * ========================================================================== */

function buildGreeting_() {
  const hour =
    new Date().getHours();

  let period =
    'evening';

  if (
    hour < 12
  ) {
    period =
      'morning';
  } else if (
    hour < 18
  ) {
    period =
      'afternoon';
  }

  const workspaceName =
    String(
      getSetting_(
        'WorkspaceName',
        ''
      ) || ''
    ).trim();

  if (
    workspaceName &&
    workspaceName !==
      'Smart Task Manager'
  ) {
    return (
      'Good ' +
      period +
      ', ' +
      workspaceName +
      '. Here is what matters today.'
    );
  }

  return (
    'Good ' +
    period +
    '. Here is what matters today.'
  );
}


function countHighImpact_(
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


function formatMinutes_(
  totalMinutes
) {
  totalMinutes =
    Math.max(
      0,
      Number(
        totalMinutes
      ) || 0
    );

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


function sameDay_(
  dateValue,
  referenceDate
) {
  const date =
    stripTime_(
      dateValue
    );

  if (!date) {
    return false;
  }

  const reference =
    stripTime_(
      referenceDate
    );

  if (!reference) {
    return false;
  }

  return (
    date.getTime() ===
    reference.getTime()
  );
}


function isWithinRange_(
  dateValue,
  start,
  end
) {
  const date =
    stripTime_(
      dateValue
    );

  if (
    !date ||
    !start ||
    !end
  ) {
    return false;
  }

  return (
    date.getTime() >=
      start.getTime() &&
    date.getTime() <=
      end.getTime()
  );
}


function getWeekRange_(
  date
) {
  const value =
    stripTime_(
      date
    );

  const day =
    value.getDay();

  const differenceToMonday =
    day === 0
      ? -6
      : 1 - day;

  const start =
    new Date(
      value.getTime()
    );

  start.setDate(
    start.getDate() +
    differenceToMonday
  );

  const end =
    new Date(
      start.getTime()
    );

  end.setDate(
    end.getDate() +
    6
  );

  return {
    start:
      start,

    end:
      end
  };
}


function dueLabel_(
  dueDate,
  today
) {
  const date =
    stripTime_(
      dueDate
    );

  if (!date) {
    return 'No date';
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
    return 'Today';
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


function compareDashboardDueDates_(
  first,
  second
) {
  const firstDate =
    stripTime_(
      first
    );

  const secondDate =
    stripTime_(
      second
    );

  if (
    !firstDate &&
    !secondDate
  ) {
    return 0;
  }

  if (!firstDate) {
    return 1;
  }

  if (!secondDate) {
    return -1;
  }

  return (
    firstDate.getTime() -
    secondDate.getTime()
  );
}


/* ==========================================================================
 * AREAS
 * ========================================================================== */

function getAreaProgress_(
  tasks
) {
  const byArea = {};

  (
    tasks || []
  ).forEach(
    function (task) {
      const area =
        String(
          task.Area || ''
        ).trim();

      if (!area) {
        return;
      }

      if (
        !byArea[area]
      ) {
        byArea[area] = {
          sum:
            0,

          count:
            0,

          completed:
            0,

          open:
            0
        };
      }

      byArea[area].sum +=
        Number(
          task.Progress
        ) || 0;

      byArea[area].count +=
        1;

      if (
        String(
          task.Status || ''
        ) === 'Completed'
      ) {
        byArea[area].completed +=
          1;
      } else {
        byArea[area].open +=
          1;
      }
    }
  );


  return Object
    .keys(
      byArea
    )
    .map(
      function (area) {
        const item =
          byArea[area];

        return {
          area:
            area,

          progress:
            Math.round(
              item.sum /
              item.count
            ),

          completed:
            item.completed,

          open:
            item.open,

          total:
            item.count
        };
      }
    )
    .sort(
      function (a, b) {
        return (
          b.progress -
          a.progress
        );
      }
    );
}


/* ==========================================================================
 * HABITS
 * ========================================================================== */

function getBestHabitStreak_() {
  const habits =
    getAllHabits_();

  if (
    habits.length === 0
  ) {
    return 0;
  }

  return habits.reduce(
    function (maximum, habit) {
      return Math.max(
        maximum,
        Number(
          habit.Streak
        ) || 0
      );
    },
    0
  );
}


/* ==========================================================================
 * SMART INSIGHTS
 * ========================================================================== */

function generateInsights_(
  context
) {
  const insights = [];


  /* ----------------------------------------------------------------------
   * OVERDUE
   * -------------------------------------------------------------------- */

  if (
    context.overdueTasks.length > 0
  ) {
    const quickOverdueTasks =
      context.overdueTasks.filter(
        function (task) {
          const minutes =
            Number(
              task.EstimateMinutes
            ) || 0;

          return (
            minutes > 0 &&
            minutes <= 20
          );
        }
      );

    if (
      quickOverdueTasks.length > 0
    ) {
      insights.push({
        tone:
          'danger',

        text:
          context.overdueTasks.length +
          ' overdue task(s). ' +
          quickOverdueTasks.length +
          ' can be cleared in 20 minutes or less.'
      });
    } else {
      insights.push({
        tone:
          'danger',

        text:
          context.overdueTasks.length +
          ' overdue task(s) need attention before taking on more work.'
      });
    }
  }


  /* ----------------------------------------------------------------------
   * DAILY CAPACITY
   * -------------------------------------------------------------------- */

  if (
    context.focusMinutesToday >
    context.focusCapacityMinutes
  ) {
    insights.push({
      tone:
        'warning',

      text:
        'Today is overloaded by ' +
        formatMinutes_(
          context.focusMinutesToday -
          context.focusCapacityMinutes
        ) +
        '. Consider moving a lower-priority task.'
    });
  } else if (
    context.todayTasks.length > 0
  ) {
    insights.push({
      tone:
        'success',

      text:
        'Today uses ' +
        formatMinutes_(
          context.focusMinutesToday
        ) +
        ' of your ' +
        context.dailyFocusLimitHours +
        'h focus capacity.'
    });
  }


  /* ----------------------------------------------------------------------
   * WEEK
   * -------------------------------------------------------------------- */

  if (
    context.weekTasks.length > 0
  ) {
    const percentage =
      Math.round(
        (
          context.weekCompleted.length /
          context.weekTasks.length
        ) *
        100
      );

    insights.push({
      tone:
        percentage >= 70
          ? 'success'
          : 'primary',

      text:
        'Weekly completion is ' +
        percentage +
        '% — ' +
        context.weekCompleted.length +
        ' of ' +
        context.weekTasks.length +
        ' scheduled tasks completed.'
    });
  }


  /* ----------------------------------------------------------------------
   * TOP FOCUS
   * -------------------------------------------------------------------- */

  if (
    insights.length <
      DASHBOARD_LAYOUT.insightMaxItems &&
    context.focusNow.length > 0
  ) {
    const topTask =
      context.focusNow[0];

    insights.push({
      tone:
        'primary',

      text:
        'Best next move: "' +
        String(
          topTask.TaskName ||
          'Top priority task'
        ) +
        '"' +
        (
          topTask.RecommendedAction
            ? ' — ' +
              topTask.RecommendedAction
            : '.'
        )
    });
  }


  return insights.slice(
    0,
    DASHBOARD_LAYOUT.insightMaxItems
  );
}