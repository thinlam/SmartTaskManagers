/**
 * 13_Timeline.gs
 * -----------------------------------------------------------------------
 * FRAME 10 — TIMELINE / GANTT
 *
 * Premium personal productivity timeline.
 *
 * IMPORTANT:
 * - Tasks remains the single source of truth.
 * - Timeline is presentation only.
 * - No task business data is duplicated.
 * - Task identity always uses TaskId.
 *
 * Features:
 * - 28-day / 4-week timeline
 * - Previous / Current / Next period
 * - Start → Due visualization
 * - Progress visualization
 * - Today column
 * - Weekend shading
 * - Overdue / At Risk highlighting
 * - KPI cards
 * - Planning Health
 * - Unscheduled / At Risk insights
 * - Open Task Details from selected row
 * -----------------------------------------------------------------------
 */


/* ==========================================================================
 * CONFIG
 * ========================================================================== */

const TIMELINE_LAYOUT = {

  infoCols:
    8,

  days:
    28,

  accentRow:
    1,

  titleRow:
    2,

  subtitleRow:
    3,

  healthRow:
    4,


  kpiStartRow:
    6,

  kpiEndRow:
    8,


  weekHeaderRow:
    10,

  dateHeaderRow:
    11,

  weekdayHeaderRow:
    12,


  firstTaskRow:
    14,

  maxTasks:
    18,


  insightsGap:
    2
};


const TIMELINE_THEME = {

  background:
    COLORS.background ||
    '#F8FAFC',

  surface:
    COLORS.surface ||
    '#FFFFFF',

  surfaceAlt:
    '#FBFCFE',

  surface2:
    COLORS.surface2 ||
    '#F1F5F9',


  primary:
    COLORS.primary ||
    '#4F46E5',

  primaryHover:
    COLORS.primaryHover ||
    '#4338CA',

  primaryLight:
    COLORS.primaryLight ||
    '#EEF2FF',


  text:
    COLORS.text ||
    '#1E293B',

  text2:
    COLORS.text2 ||
    '#64748B',

  muted:
    COLORS.muted ||
    '#94A3B8',

  border:
    COLORS.border ||
    '#E2E8F0',


  success:
    COLORS.success ||
    '#16A34A',

  warning:
    COLORS.warning ||
    '#F59E0B',

  danger:
    COLORS.danger ||
    '#DC2626',

  info:
    COLORS.info ||
    '#2563EB',


  successSoft:
    '#ECFDF5',

  warningSoft:
    '#FFF7ED',

  dangerSoft:
    '#FEF2F2',

  infoSoft:
    '#EFF6FF',

  weekend:
    '#F8FAFC',

  today:
    '#EEF2FF',

  darkHeader:
    '#172033'
};


const TIMELINE_PROPERTY_KEY =
  'SMART_TASK_TIMELINE_START';


/* ==========================================================================
 * NAVIGATION
 * ========================================================================== */

function openTimeline_() {

  const spreadsheet =
    SpreadsheetApp.getActive();


  const sheet =
    getOrCreateSheet_(
      SHEETS.TIMELINE
    );


  spreadsheet.setActiveSheet(
    sheet
  );


  renderTimeline_();
}


/* ==========================================================================
 * PERIOD NAVIGATION
 * ========================================================================== */

function timelinePreviousPeriod_() {

  const current =
    getTimelineAnchorDate_();


  const previous =
    new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() -
      TIMELINE_LAYOUT.days
    );


  setTimelineAnchorDate_(
    previous
  );


  openTimeline_();
}


function timelineNextPeriod_() {

  const current =
    getTimelineAnchorDate_();


  const next =
    new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() +
      TIMELINE_LAYOUT.days
    );


  setTimelineAnchorDate_(
    next
  );


  openTimeline_();
}


function timelineCurrentPeriod_() {

  const today =
    stripTime_(
      now_()
    );


  const monday =
    getTimelineWeekStart_(
      today
    );


  setTimelineAnchorDate_(
    monday
  );


  openTimeline_();
}


/* ==========================================================================
 * ANCHOR DATE
 * ========================================================================== */

function getTimelineAnchorDate_() {

  const properties =
    PropertiesService
      .getDocumentProperties();


  const saved =
    properties.getProperty(
      TIMELINE_PROPERTY_KEY
    );


  if (saved) {

    const match =
      saved.match(
        /^(\d{4})-(\d{2})-(\d{2})$/
      );


    if (match) {

      const date =
        new Date(
          Number(
            match[1]
          ),
          Number(
            match[2]
          ) - 1,
          Number(
            match[3]
          )
        );


      return getTimelineWeekStart_(
        date
      );

    }

  }


  return getTimelineWeekStart_(
    stripTime_(
      now_()
    )
  );
}


function setTimelineAnchorDate_(
  date
) {

  const monday =
    getTimelineWeekStart_(
      date
    );


  const value =
    Utilities.formatDate(
      monday,
      Session.getScriptTimeZone(),
      'yyyy-MM-dd'
    );


  PropertiesService
    .getDocumentProperties()
    .setProperty(
      TIMELINE_PROPERTY_KEY,
      value
    );
}


/* ==========================================================================
 * MAIN RENDER
 * ========================================================================== */

function renderTimeline_() {

  const sheet =
    getOrCreateSheet_(
      SHEETS.TIMELINE
    );


  const data =
    computeTimelineData_();


  prepareTimelineCanvas_(
    sheet
  );


  writeTimelineHeader_(
    sheet,
    data
  );


  writeTimelineKpis_(
    sheet,
    data
  );


  writeTimelineHeaders_(
    sheet,
    data
  );


  writeTimelineRows_(
    sheet,
    data
  );


  const insightStartRow =
    TIMELINE_LAYOUT.firstTaskRow +
    TIMELINE_LAYOUT.maxTasks +
    TIMELINE_LAYOUT.insightsGap;


  const insightEndRow =
    writeTimelineInsights_(
      sheet,
      data,
      insightStartRow
    );


  writeTimelineFooter_(
    sheet,
    insightEndRow + 2
  );


  SpreadsheetApp.flush();
}


/* ==========================================================================
 * DATA
 * ========================================================================== */

function computeTimelineData_() {

  const tasks =
    getAllTasks_();


  const windowStart =
    getTimelineAnchorDate_();


  const windowEnd =
    new Date(
      windowStart.getFullYear(),
      windowStart.getMonth(),
      windowStart.getDate() +
      TIMELINE_LAYOUT.days -
      1
    );


  const today =
    stripTime_(
      now_()
    );


  const scheduled = [];


  const unscheduled = [];


  const atRisk = [];


  tasks.forEach(
    function (task) {

      const status =
        String(
          task.Status || ''
        );


      const dates =
        getTimelineTaskDates_(
          task
        );


      /* ------------------------------------------------------------------
       * UNSCHEDULED
       * ---------------------------------------------------------------- */

      if (
        !dates.start &&
        !dates.end
      ) {

        if (
          status !==
          'Completed'
        ) {

          unscheduled.push(
            task
          );

        }


        return;
      }


      const start =
        dates.start;


      const end =
        dates.end;


      /* ------------------------------------------------------------------
       * RISK
       * ---------------------------------------------------------------- */

      const risk =
        String(
          task.Risk || ''
        );


      const isOverdue =
        (
          status !==
            'Completed' &&
          end &&
          end.getTime() <
            today.getTime()
        );


      if (
        status !==
          'Completed' &&
        (
          risk ===
            'Critical' ||
          risk ===
            'High' ||
          isOverdue
        )
      ) {

        atRisk.push(
          task
        );

      }


      /* ------------------------------------------------------------------
       * OVERLAPS CURRENT WINDOW
       * ---------------------------------------------------------------- */

      const overlaps =
        (
          start.getTime() <=
            windowEnd.getTime() &&
          end.getTime() >=
            windowStart.getTime()
        );


      if (
        overlaps
      ) {

        scheduled.push(
          task
        );

      }

    }
  );


  /* ----------------------------------------------------------------------
   * SORT TIMELINE
   * -------------------------------------------------------------------- */

  scheduled.sort(
    timelineTaskSort_
  );


  unscheduled.sort(
    timelineTaskSort_
  );


  atRisk.sort(
    timelineTaskSort_
  );


  /* ----------------------------------------------------------------------
   * IN PROGRESS
   * -------------------------------------------------------------------- */

  const inProgress =
    tasks.filter(
      function (task) {

        return (
          String(
            task.Status || ''
          ) ===
          'In Progress'
        );

      }
    );


  /* ----------------------------------------------------------------------
   * COMPLETED IN WINDOW
   * -------------------------------------------------------------------- */

  const completedInWindow =
    tasks.filter(
      function (task) {

        return (
          String(
            task.Status || ''
          ) ===
            'Completed' &&
          timelineDateInRange_(
            task.CompletedDate,
            windowStart,
            windowEnd
          )
        );

      }
    );


  /* ----------------------------------------------------------------------
   * TOP FOCUS
   * -------------------------------------------------------------------- */

  const focusTask =
    scheduled
      .filter(
        function (task) {

          return (
            String(
              task.Status || ''
            ) !==
            'Completed'
          );

        }
      )
      .slice()
      .sort(
        function (a, b) {

          return (
            (
              Number(
                b.SmartScore
              ) || 0
            ) -
            (
              Number(
                a.SmartScore
              ) || 0
            )
          );

        }
      )[0] ||
    null;


  return {

    tasks:
      tasks,

    scheduled:
      scheduled,

    visibleTasks:
      scheduled.slice(
        0,
        TIMELINE_LAYOUT.maxTasks
      ),

    unscheduled:
      unscheduled,

    atRisk:
      atRisk,

    inProgress:
      inProgress,

    completedInWindow:
      completedInWindow,

    focusTask:
      focusTask,

    today:
      today,

    windowStart:
      windowStart,

    windowEnd:
      windowEnd

  };
}


/* ==========================================================================
 * TASK DATES
 * ========================================================================== */

function getTimelineTaskDates_(
  task
) {

  let start =
    stripTime_(
      task.StartDate
    );


  let end =
    stripTime_(
      task.DueDate
    );


  /*
   * Due date only:
   * one-day task.
   */
  if (
    !start &&
    end
  ) {

    start =
      new Date(
        end.getTime()
      );

  }


  /*
   * Start date only:
   * one-day task.
   */
  if (
    start &&
    !end
  ) {

    end =
      new Date(
        start.getTime()
      );

  }


  /*
   * Protect against invalid range.
   */
  if (
    start &&
    end &&
    start.getTime() >
      end.getTime()
  ) {

    const temp =
      start;

    start =
      end;

    end =
      temp;

  }


  return {

    start:
      start,

    end:
      end

  };
}


/* ==========================================================================
 * CANVAS
 * ========================================================================== */

function prepareTimelineCanvas_(
  sheet
) {

  const totalColumns =
    TIMELINE_LAYOUT.infoCols +
    TIMELINE_LAYOUT.days;


  const requiredRows =
    55;


  /* ----------------------------------------------------------------------
   * ENSURE SIZE
   * -------------------------------------------------------------------- */

  if (
    sheet.getMaxRows() <
    requiredRows
  ) {

    sheet.insertRowsAfter(
      sheet.getMaxRows(),
      requiredRows -
      sheet.getMaxRows()
    );

  }


  if (
    sheet.getMaxColumns() <
    totalColumns
  ) {

    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      totalColumns -
      sheet.getMaxColumns()
    );

  }


  /* ----------------------------------------------------------------------
   * CLEAN
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      1,
      1,
      Math.min(
        requiredRows,
        sheet.getMaxRows()
      ),
      totalColumns
    )
    .breakApart();


  sheet.clear();


  sheet.setHiddenGridlines(
    true
  );


  sheet.setFrozenRows(
    TIMELINE_LAYOUT.weekdayHeaderRow
  );


  sheet.setFrozenColumns(
    TIMELINE_LAYOUT.infoCols
  );


  try {

    sheet.setTabColor(
      TIMELINE_THEME.primary
    );

  } catch (error) {

    console.warn(
      'Timeline tab color skipped:',
      error.message
    );

  }


  /* ----------------------------------------------------------------------
   * GLOBAL BACKGROUND
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      1,
      1,
      requiredRows,
      totalColumns
    )
    .setBackground(
      TIMELINE_THEME.background
    )
    .setFontColor(
      TIMELINE_THEME.text
    )
    .setFontFamily(
      'Arial'
    )
    .setVerticalAlignment(
      'middle'
    );


  /* ----------------------------------------------------------------------
   * INFO COLUMN WIDTHS
   * -------------------------------------------------------------------- */

  sheet.setColumnWidth(
    1,
    95
  );

  sheet.setColumnWidth(
    2,
    95
  );

  sheet.setColumnWidth(
    3,
    95
  );

  sheet.setColumnWidth(
    4,
    92
  );

  sheet.setColumnWidth(
    5,
    82
  );

  sheet.setColumnWidth(
    6,
    76
  );

  sheet.setColumnWidth(
    7,
    76
  );

  sheet.setColumnWidth(
    8,
    72
  );


  /* ----------------------------------------------------------------------
   * DAY WIDTH
   * -------------------------------------------------------------------- */

  for (
    let column =
      TIMELINE_LAYOUT.infoCols + 1;
    column <=
      totalColumns;
    column++
  ) {

    sheet.setColumnWidth(
      column,
      34
    );

  }


  /* ----------------------------------------------------------------------
   * HEIGHTS
   * -------------------------------------------------------------------- */

  sheet.setRowHeight(
    TIMELINE_LAYOUT.accentRow,
    5
  );


  sheet.setRowHeight(
    TIMELINE_LAYOUT.titleRow,
    45
  );


  sheet.setRowHeight(
    TIMELINE_LAYOUT.subtitleRow,
    26
  );


  sheet.setRowHeight(
    TIMELINE_LAYOUT.healthRow,
    28
  );


  sheet.setRowHeight(
    TIMELINE_LAYOUT.kpiStartRow,
    24
  );


  sheet.setRowHeight(
    TIMELINE_LAYOUT.kpiStartRow + 1,
    34
  );


  sheet.setRowHeight(
    TIMELINE_LAYOUT.kpiEndRow,
    24
  );


  sheet.setRowHeight(
    TIMELINE_LAYOUT.weekHeaderRow,
    27
  );


  sheet.setRowHeight(
    TIMELINE_LAYOUT.dateHeaderRow,
    26
  );


  sheet.setRowHeight(
    TIMELINE_LAYOUT.weekdayHeaderRow,
    24
  );
}


/* ==========================================================================
 * HEADER
 * ========================================================================== */

function writeTimelineHeader_(
  sheet,
  data
) {

  const totalColumns =
    TIMELINE_LAYOUT.infoCols +
    TIMELINE_LAYOUT.days;


  /* ----------------------------------------------------------------------
   * ACCENT
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      TIMELINE_LAYOUT.accentRow,
      1,
      1,
      totalColumns
    )
    .setBackground(
      TIMELINE_THEME.primary
    );


  /* ----------------------------------------------------------------------
   * TITLE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      TIMELINE_LAYOUT.titleRow,
      1,
      1,
      18
    )
    .merge()
    .setValue(
      'Timeline'
    )
    .setFontSize(
      27
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TIMELINE_THEME.text
    );


  /* ----------------------------------------------------------------------
   * PERIOD
   * -------------------------------------------------------------------- */

  const period =
    Utilities.formatDate(
      data.windowStart,
      Session.getScriptTimeZone(),
      'dd MMM'
    ) +
    '  —  ' +
    Utilities.formatDate(
      data.windowEnd,
      Session.getScriptTimeZone(),
      'dd MMM yyyy'
    );


  sheet
    .getRange(
      TIMELINE_LAYOUT.titleRow,
      19,
      1,
      totalColumns - 18
    )
    .merge()
    .setValue(
      period.toUpperCase()
    )
    .setFontSize(
      13
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TIMELINE_THEME.primary
    )
    .setHorizontalAlignment(
      'right'
    );


  /* ----------------------------------------------------------------------
   * SUBTITLE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      TIMELINE_LAYOUT.subtitleRow,
      1,
      1,
      22
    )
    .merge()
    .setValue(
      'See when work starts, when it is due and how much progress you are making.'
    )
    .setFontSize(
      10
    )
    .setFontColor(
      TIMELINE_THEME.text2
    );


  sheet
    .getRange(
      TIMELINE_LAYOUT.subtitleRow,
      23,
      1,
      totalColumns - 22
    )
    .merge()
    .setValue(
      '← Previous 4 Weeks   •   Current   •   Next 4 Weeks →'
    )
    .setFontSize(
      9
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TIMELINE_THEME.muted
    )
    .setHorizontalAlignment(
      'right'
    );


  /* ----------------------------------------------------------------------
   * PLANNING HEALTH
   * -------------------------------------------------------------------- */

  const riskCount =
    data.atRisk.length;


  const unscheduledCount =
    data.unscheduled.length;


  let healthTone =
    getTimelineTone_(
      'success'
    );


  let healthText =
    'PLANNING HEALTH  •  Your active plan looks healthy';


  if (
    riskCount > 0
  ) {

    healthTone =
      getTimelineTone_(
        'danger'
      );


    healthText =
      'PLANNING HEALTH  •  ' +
      riskCount +
      ' task' +
      (
        riskCount === 1
          ? ''
          : 's'
      ) +
      ' need attention';

  } else if (
    unscheduledCount > 0
  ) {

    healthTone =
      getTimelineTone_(
        'warning'
      );


    healthText =
      'PLANNING HEALTH  •  ' +
      unscheduledCount +
      ' open task' +
      (
        unscheduledCount === 1
          ? ''
          : 's'
      ) +
      ' still need scheduling';

  }


  if (
    data.focusTask
  ) {

    healthText +=
      '  •  TOP FOCUS: ' +
      (
        data.focusTask.TaskName ||
        'Untitled task'
      );

  }


  sheet
    .getRange(
      TIMELINE_LAYOUT.healthRow,
      1,
      1,
      totalColumns
    )
    .merge()
    .setValue(
      healthText
    )
    .setBackground(
      healthTone.soft
    )
    .setFontColor(
      healthTone.text
    )
    .setFontSize(
      9
    )
    .setFontWeight(
      'bold'
    )
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      TIMELINE_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );
}


/* ==========================================================================
 * KPI
 * ========================================================================== */

function writeTimelineKpis_(
  sheet,
  data
) {

  const totalColumns =
    TIMELINE_LAYOUT.infoCols +
    TIMELINE_LAYOUT.days;


  const cards = [

    {
      label:
        'SCHEDULED',

      value:
        data.scheduled.length,

      sub:
        'Tasks in this 4-week view',

      tone:
        'primary'
    },


    {
      label:
        'IN PROGRESS',

      value:
        data.inProgress.length,

      sub:
        'Currently active',

      tone:
        data.inProgress.length > 3
          ? 'warning'
          : 'primary'
    },


    {
      label:
        'AT RISK',

      value:
        data.atRisk.length,

      sub:
        data.atRisk.length > 0
          ? 'Needs attention'
          : 'No current risks',

      tone:
        data.atRisk.length > 0
          ? 'danger'
          : 'success'
    },


    {
      label:
        'UNSCHEDULED',

      value:
        data.unscheduled.length,

      sub:
        'Open tasks without dates',

      tone:
        data.unscheduled.length > 0
          ? 'warning'
          : 'success'
    }

  ];


  const blocks =
    buildTimelineMetricBlocks_(
      totalColumns,
      4,
      1
    );


  cards.forEach(
    function (
      card,
      index
    ) {

      const block =
        blocks[
          index
        ];


      const width =
        block.end -
        block.start +
        1;


      const tone =
        getTimelineTone_(
          card.tone
        );


      /* ------------------------------------------------------------------
       * CARD BODY
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          TIMELINE_LAYOUT.kpiStartRow,
          block.start,
          3,
          width
        )
        .setBackground(
          TIMELINE_THEME.surface
        )
        .setBorder(
          true,
          true,
          true,
          true,
          false,
          false,
          TIMELINE_THEME.border,
          SpreadsheetApp
            .BorderStyle
            .SOLID
        );


      /* ------------------------------------------------------------------
       * LABEL
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          TIMELINE_LAYOUT.kpiStartRow,
          block.start,
          1,
          width
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
          8
        )
        .setFontWeight(
          'bold'
        );


      /* ------------------------------------------------------------------
       * VALUE
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          TIMELINE_LAYOUT.kpiStartRow + 1,
          block.start,
          1,
          width
        )
        .merge()
        .setValue(
          card.value
        )
        .setFontSize(
          21
        )
        .setFontWeight(
          'bold'
        )
        .setFontColor(
          tone.text
        );


      /* ------------------------------------------------------------------
       * SUBTEXT
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          TIMELINE_LAYOUT.kpiEndRow,
          block.start,
          1,
          width
        )
        .merge()
        .setValue(
          card.sub
        )
        .setFontSize(
          8
        )
        .setFontColor(
          TIMELINE_THEME.text2
        );

    }
  );
}


/* ==========================================================================
 * KPI BLOCKS
 * ========================================================================== */

function buildTimelineMetricBlocks_(
  totalColumns,
  count,
  gap
) {

  const usable =
    totalColumns -
    (
      (
        count - 1
      ) *
      gap
    );


  const base =
    Math.floor(
      usable /
      count
    );


  let remaining =
    usable %
    count;


  let current =
    1;


  const result = [];


  for (
    let index = 0;
    index < count;
    index++
  ) {

    const width =
      base +
      (
        remaining > 0
          ? 1
          : 0
      );


    if (
      remaining > 0
    ) {

      remaining--;

    }


    result.push({

      start:
        current,

      end:
        current +
        width -
        1

    });


    current +=
      width +
      gap;

  }


  return result;
}


/* ==========================================================================
 * TIMELINE HEADERS
 * ========================================================================== */

function writeTimelineHeaders_(
  sheet,
  data
) {

  writeTimelineInfoHeaders_(
    sheet
  );


  writeTimelineWeekHeaders_(
    sheet,
    data
  );


  writeTimelineDayHeaders_(
    sheet,
    data
  );
}


/* ==========================================================================
 * INFO HEADERS
 * ========================================================================== */

function writeTimelineInfoHeaders_(
  sheet
) {

  const headers = [

    {
      start:
        1,

      width:
        3,

      text:
        'TASK'
    },


    {
      start:
        4,

      width:
        1,

      text:
        'STATUS'
    },


    {
      start:
        5,

      width:
        1,

      text:
        'PRIORITY'
    },


    {
      start:
        6,

      width:
        1,

      text:
        'START'
    },


    {
      start:
        7,

      width:
        1,

      text:
        'DUE'
    },


    {
      start:
        8,

      width:
        1,

      text:
        'PROGRESS'
    }

  ];


  headers.forEach(
    function (header) {

      sheet
        .getRange(
          TIMELINE_LAYOUT.weekHeaderRow,
          header.start,
          3,
          header.width
        )
        .merge()
        .setValue(
          header.text
        )
        .setBackground(
          TIMELINE_THEME.darkHeader
        )
        .setFontColor(
          '#F8FAFC'
        )
        .setFontSize(
          8
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
          '#334155',
          SpreadsheetApp
            .BorderStyle
            .SOLID
        );

    }
  );
}


/* ==========================================================================
 * WEEK HEADERS
 * ========================================================================== */

function writeTimelineWeekHeaders_(
  sheet,
  data
) {

  const timelineStartColumn =
    TIMELINE_LAYOUT.infoCols +
    1;


  for (
    let week = 0;
    week < 4;
    week++
  ) {

    const weekStart =
      new Date(
        data.windowStart.getFullYear(),
        data.windowStart.getMonth(),
        data.windowStart.getDate() +
        (
          week *
          7
        )
      );


    const weekEnd =
      new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate() +
        6
      );


    const label =
      Utilities.formatDate(
        weekStart,
        Session.getScriptTimeZone(),
        'dd MMM'
      ) +
      ' — ' +
      Utilities.formatDate(
        weekEnd,
        Session.getScriptTimeZone(),
        'dd MMM'
      );


    sheet
      .getRange(
        TIMELINE_LAYOUT.weekHeaderRow,
        timelineStartColumn +
        (
          week *
          7
        ),
        1,
        7
      )
      .merge()
      .setValue(
        'WEEK ' +
        (
          week +
          1
        ) +
        '  •  ' +
        label
      )
      .setBackground(
        week % 2 === 0
          ? TIMELINE_THEME.primaryLight
          : TIMELINE_THEME.surface2
      )
      .setFontColor(
        week % 2 === 0
          ? TIMELINE_THEME.primary
          : TIMELINE_THEME.text2
      )
      .setFontSize(
        8
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
        TIMELINE_THEME.border,
        SpreadsheetApp
          .BorderStyle
          .SOLID
      );

  }
}


/* ==========================================================================
 * DAY HEADERS
 * ========================================================================== */

function writeTimelineDayHeaders_(
  sheet,
  data
) {

  const startColumn =
    TIMELINE_LAYOUT.infoCols +
    1;


  for (
    let index = 0;
    index < TIMELINE_LAYOUT.days;
    index++
  ) {

    const date =
      new Date(
        data.windowStart.getFullYear(),
        data.windowStart.getMonth(),
        data.windowStart.getDate() +
        index
      );


    const column =
      startColumn +
      index;


    const isToday =
      timelineSameDay_(
        date,
        data.today
      );


    const isWeekend =
      (
        date.getDay() ===
          0 ||
        date.getDay() ===
          6
      );


    let background =
      TIMELINE_THEME.surface;


    let fontColor =
      TIMELINE_THEME.text2;


    if (
      isWeekend
    ) {

      background =
        TIMELINE_THEME.weekend;

    }


    if (
      isToday
    ) {

      background =
        TIMELINE_THEME.primary;

      fontColor =
        '#FFFFFF';

    }


    /* ------------------------------------------------------------------
     * DATE
     * ---------------------------------------------------------------- */

    sheet
      .getRange(
        TIMELINE_LAYOUT.dateHeaderRow,
        column
      )
      .setValue(
        date.getDate()
      )
      .setBackground(
        background
      )
      .setFontColor(
        fontColor
      )
      .setFontSize(
        9
      )
      .setFontWeight(
        'bold'
      )
      .setHorizontalAlignment(
        'center'
      );


    /* ------------------------------------------------------------------
     * WEEKDAY
     * ---------------------------------------------------------------- */

    sheet
      .getRange(
        TIMELINE_LAYOUT.weekdayHeaderRow,
        column
      )
      .setValue(
        Utilities.formatDate(
          date,
          Session.getScriptTimeZone(),
          'EEE'
        )
          .substring(
            0,
            1
          )
          .toUpperCase()
      )
      .setBackground(
        background
      )
      .setFontColor(
        fontColor
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
        TIMELINE_LAYOUT.dateHeaderRow,
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
        isToday
          ? TIMELINE_THEME.primary
          : TIMELINE_THEME.border,
        isToday
          ? SpreadsheetApp
              .BorderStyle
              .SOLID_MEDIUM
          : SpreadsheetApp
              .BorderStyle
              .SOLID
      );

  }
}


/* ==========================================================================
 * TASK ROWS
 * ========================================================================== */

function writeTimelineRows_(
  sheet,
  data
) {

  const visibleTasks =
    data.visibleTasks;


  if (
    visibleTasks.length ===
    0
  ) {

    writeTimelineEmptyState_(
      sheet,
      data
    );


    return;
  }


  visibleTasks.forEach(
    function (
      task,
      index
    ) {

      const row =
        TIMELINE_LAYOUT.firstTaskRow +
        index;


      writeTimelineTaskRow_(
        sheet,
        task,
        row,
        index,
        data
      );

    }
  );


  /* ----------------------------------------------------------------------
   * REMAINING ROWS
   * -------------------------------------------------------------------- */

  for (
    let index =
      visibleTasks.length;
    index <
      TIMELINE_LAYOUT.maxTasks;
    index++
  ) {

    const row =
      TIMELINE_LAYOUT.firstTaskRow +
      index;


    writeTimelineBlankRow_(
      sheet,
      row,
      index,
      data
    );

  }


  /* ----------------------------------------------------------------------
   * MORE TASKS
   * -------------------------------------------------------------------- */

  if (
    data.scheduled.length >
    visibleTasks.length
  ) {

    const count =
      data.scheduled.length -
      visibleTasks.length;


    sheet
      .getRange(
        TIMELINE_LAYOUT.firstTaskRow +
        TIMELINE_LAYOUT.maxTasks,
        1,
        1,
        TIMELINE_LAYOUT.infoCols +
        TIMELINE_LAYOUT.days
      )
      .merge()
      .setValue(
        '+' +
        count +
        ' additional scheduled task' +
        (
          count === 1
            ? ''
            : 's'
        ) +
        ' not shown  •  Highest-priority tasks are displayed first'
      )
      .setBackground(
        TIMELINE_THEME.primaryLight
      )
      .setFontColor(
        TIMELINE_THEME.primary
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

  }
}


/* ==========================================================================
 * SINGLE TASK ROW
 * ========================================================================== */

function writeTimelineTaskRow_(
  sheet,
  task,
  row,
  index,
  data
) {

  const baseBackground =
    index % 2 === 0
      ? TIMELINE_THEME.surface
      : TIMELINE_THEME.surfaceAlt;


  const taskId =
    String(
      task.TaskId ||
      ''
    );


  const note =
    'TASK_ID:' +
    taskId;


  const dates =
    getTimelineTaskDates_(
      task
    );


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


  const statusTone =
    getTimelineStatusTone_(
      task.Status
    );


  const priorityTone =
    getTimelinePriorityTone_(
      task.Priority
    );


  const progressTone =
    getTimelineProgressTone_(
      progress
    );


  /* ----------------------------------------------------------------------
   * BASE ROW
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      row,
      1,
      1,
      TIMELINE_LAYOUT.infoCols +
      TIMELINE_LAYOUT.days
    )
    .setBackground(
      baseBackground
    )
    .setBorder(
      false,
      true,
      true,
      true,
      false,
      false,
      TIMELINE_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );


  /* ----------------------------------------------------------------------
   * TASK NAME
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      row,
      1,
      1,
      3
    )
    .merge()
    .setValue(
      task.TaskName ||
      'Untitled task'
    )
    .setFontSize(
      9
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      String(
        task.Status || ''
      ) === 'Completed'
        ? TIMELINE_THEME.muted
        : TIMELINE_THEME.text
    )
    .setWrap(
      false
    )
    .setNote(
      note
    );


  /* ----------------------------------------------------------------------
   * STATUS
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      row,
      4
    )
    .setValue(
      task.Status ||
      'Inbox'
    )
    .setBackground(
      statusTone.soft
    )
    .setFontColor(
      statusTone.text
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


  /* ----------------------------------------------------------------------
   * PRIORITY
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      row,
      5
    )
    .setValue(
      task.Priority ||
      'Medium'
    )
    .setBackground(
      priorityTone.soft
    )
    .setFontColor(
      priorityTone.text
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


  /* ----------------------------------------------------------------------
   * START / DUE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      row,
      6
    )
    .setValue(
      timelineShortDate_(
        dates.start
      )
    )
    .setFontColor(
      TIMELINE_THEME.text2
    )
    .setFontSize(
      8
    )
    .setHorizontalAlignment(
      'center'
    );


  sheet
    .getRange(
      row,
      7
    )
    .setValue(
      timelineShortDate_(
        dates.end
      )
    )
    .setFontColor(
      isTimelineTaskOverdue_(
        task,
        data.today
      )
        ? TIMELINE_THEME.danger
        : TIMELINE_THEME.text2
    )
    .setFontWeight(
      isTimelineTaskOverdue_(
        task,
        data.today
      )
        ? 'bold'
        : 'normal'
    )
    .setFontSize(
      8
    )
    .setHorizontalAlignment(
      'center'
    );


  /* ----------------------------------------------------------------------
   * PROGRESS
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      row,
      8
    )
    .setValue(
      progress +
      '%'
    )
    .setBackground(
      progressTone.soft
    )
    .setFontColor(
      progressTone.text
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


  /* ----------------------------------------------------------------------
   * GANTT
   * -------------------------------------------------------------------- */

  writeTimelineBar_(
    sheet,
    task,
    row,
    data,
    dates,
    progress
  );


  sheet.setRowHeight(
    row,
    33
  );
}


/* ==========================================================================
 * GANTT BAR
 * ========================================================================== */

function writeTimelineBar_(
  sheet,
  task,
  row,
  data,
  dates,
  progress
) {

  const startColumn =
    TIMELINE_LAYOUT.infoCols +
    1;


  const backgrounds = [];


  const fontColors = [];


  const values = [];


  /* ----------------------------------------------------------------------
   * BASE BACKGROUND
   * -------------------------------------------------------------------- */

  for (
    let index = 0;
    index < TIMELINE_LAYOUT.days;
    index++
  ) {

    const date =
      new Date(
        data.windowStart.getFullYear(),
        data.windowStart.getMonth(),
        data.windowStart.getDate() +
        index
      );


    const isToday =
      timelineSameDay_(
        date,
        data.today
      );


    const isWeekend =
      (
        date.getDay() === 0 ||
        date.getDay() === 6
      );


    let background =
      TIMELINE_THEME.surface;


    if (
      isWeekend
    ) {

      background =
        TIMELINE_THEME.weekend;

    }


    if (
      isToday
    ) {

      background =
        TIMELINE_THEME.today;

    }


    backgrounds.push(
      background
    );


    fontColors.push(
      TIMELINE_THEME.muted
    );


    values.push(
      ''
    );

  }


  /* ----------------------------------------------------------------------
   * CLIP TASK RANGE TO WINDOW
   * -------------------------------------------------------------------- */

  const clippedStart =
    dates.start.getTime() <
      data.windowStart.getTime()
      ? data.windowStart
      : dates.start;


  const clippedEnd =
    dates.end.getTime() >
      data.windowEnd.getTime()
      ? data.windowEnd
      : dates.end;


  const startIndex =
    timelineDaysDiff_(
      data.windowStart,
      clippedStart
    );


  const endIndex =
    timelineDaysDiff_(
      data.windowStart,
      clippedEnd
    );


  const duration =
    Math.max(
      1,
      endIndex -
      startIndex +
      1
    );


  const completedCells =
    progress > 0
      ? Math.max(
          1,
          Math.round(
            duration *
            progress /
            100
          )
        )
      : 0;


  const tone =
    getTimelineBarTone_(
      task,
      data.today
    );


  for (
    let index =
      startIndex;
    index <=
      endIndex;
    index++
  ) {

    const relative =
      index -
      startIndex;


    backgrounds[
      index
    ] =
      relative <
        completedCells
        ? tone.fill
        : tone.soft;


    fontColors[
      index
    ] =
      relative <
        completedCells
        ? '#FFFFFF'
        : tone.text;


    /*
     * Small bar marker.
     */
    values[
      index
    ] =
      '';


  }


  const range =
    sheet.getRange(
      row,
      startColumn,
      1,
      TIMELINE_LAYOUT.days
    );


  range
    .setBackgrounds(
      [
        backgrounds
      ]
    )
    .setFontColors(
      [
        fontColors
      ]
    );


  /* ----------------------------------------------------------------------
   * TODAY BORDER
   * -------------------------------------------------------------------- */

  const todayIndex =
    timelineDaysDiff_(
      data.windowStart,
      data.today
    );


  if (
    todayIndex >= 0 &&
    todayIndex <
      TIMELINE_LAYOUT.days
  ) {

    sheet
      .getRange(
        row,
        startColumn +
        todayIndex
      )
      .setBorder(
        false,
        true,
        false,
        true,
        false,
        false,
        TIMELINE_THEME.primary,
        SpreadsheetApp
          .BorderStyle
          .SOLID_MEDIUM
      );

  }
}


/* ==========================================================================
 * BLANK ROW
 * ========================================================================== */

function writeTimelineBlankRow_(
  sheet,
  row,
  index,
  data
) {

  const background =
    index % 2 === 0
      ? TIMELINE_THEME.surface
      : TIMELINE_THEME.surfaceAlt;


  sheet
    .getRange(
      row,
      1,
      1,
      TIMELINE_LAYOUT.infoCols
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
      TIMELINE_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );


  const dayStartColumn =
    TIMELINE_LAYOUT.infoCols +
    1;


  for (
    let indexDay = 0;
    indexDay <
      TIMELINE_LAYOUT.days;
    indexDay++
  ) {

    const date =
      new Date(
        data.windowStart.getFullYear(),
        data.windowStart.getMonth(),
        data.windowStart.getDate() +
        indexDay
      );


    const isWeekend =
      (
        date.getDay() === 0 ||
        date.getDay() === 6
      );


    const isToday =
      timelineSameDay_(
        date,
        data.today
      );


    sheet
      .getRange(
        row,
        dayStartColumn +
        indexDay
      )
      .setBackground(
        isToday
          ? TIMELINE_THEME.today
          : (
              isWeekend
                ? TIMELINE_THEME.weekend
                : background
            )
      );

  }


  sheet.setRowHeight(
    row,
    30
  );
}


/* ==========================================================================
 * EMPTY STATE
 * ========================================================================== */

function writeTimelineEmptyState_(
  sheet,
  data
) {

  sheet
    .getRange(
      TIMELINE_LAYOUT.firstTaskRow,
      1,
      4,
      TIMELINE_LAYOUT.infoCols +
      TIMELINE_LAYOUT.days
    )
    .merge()
    .setValue(
      'No scheduled tasks overlap this 4-week period.\n' +
      'Add a Start Date or Due Date, or move to another period.'
    )
    .setBackground(
      TIMELINE_THEME.surface
    )
    .setFontColor(
      TIMELINE_THEME.muted
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
    .setHorizontalAlignment(
      'center'
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
      TIMELINE_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );
}


/* ==========================================================================
 * PLANNING INSIGHTS
 * ========================================================================== */

function writeTimelineInsights_(
  sheet,
  data,
  startRow
) {

  const totalColumns =
    TIMELINE_LAYOUT.infoCols +
    TIMELINE_LAYOUT.days;


  /* ----------------------------------------------------------------------
   * TITLE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow,
      1,
      1,
      20
    )
    .merge()
    .setValue(
      'Planning Insights'
    )
    .setFontSize(
      15
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      TIMELINE_THEME.text
    );


  sheet
    .getRange(
      startRow,
      21,
      1,
      totalColumns - 20
    )
    .merge()
    .setValue(
      'Keep the plan realistic and actionable'
    )
    .setFontSize(
      8
    )
    .setFontColor(
      TIMELINE_THEME.muted
    )
    .setHorizontalAlignment(
      'right'
    );


  const cardRow =
    startRow +
    1;


  const leftWidth =
    Math.floor(
      (
        totalColumns -
        1
      ) /
      2
    );


  const rightStart =
    leftWidth +
    2;


  const rightWidth =
    totalColumns -
    rightStart +
    1;


  /* ----------------------------------------------------------------------
   * UNSCHEDULED
   * -------------------------------------------------------------------- */

  const unscheduledLines =
    data.unscheduled
      .slice(
        0,
        5
      )
      .map(
        function (task) {

          return (
            '• ' +
            (
              task.TaskName ||
              'Untitled task'
            )
          );

        }
      );


  if (
    data.unscheduled.length >
    5
  ) {

    unscheduledLines.push(
      '+' +
      (
        data.unscheduled.length -
        5
      ) +
      ' more'
    );

  }


  writeTimelineInsightCard_(
    sheet,
    cardRow,
    1,
    leftWidth,
    'UNSCHEDULED',
    data.unscheduled.length,
    unscheduledLines.length > 0
      ? unscheduledLines.join(
          '\n'
        )
      : 'All open tasks have a date.',
    data.unscheduled.length > 0
      ? 'warning'
      : 'success'
  );


  /* ----------------------------------------------------------------------
   * AT RISK
   * -------------------------------------------------------------------- */

  const riskLines =
    data.atRisk
      .slice(
        0,
        5
      )
      .map(
        function (task) {

          return (
            '• ' +
            (
              task.TaskName ||
              'Untitled task'
            )
          );

        }
      );


  if (
    data.atRisk.length >
    5
  ) {

    riskLines.push(
      '+' +
      (
        data.atRisk.length -
        5
      ) +
      ' more'
    );

  }


  writeTimelineInsightCard_(
    sheet,
    cardRow,
    rightStart,
    rightWidth,
    'AT RISK',
    data.atRisk.length,
    riskLines.length > 0
      ? riskLines.join(
          '\n'
        )
      : 'No high-risk or overdue tasks.',
    data.atRisk.length > 0
      ? 'danger'
      : 'success'
  );


  return (
    cardRow +
    5
  );
}


/* ==========================================================================
 * INSIGHT CARD
 * ========================================================================== */

function writeTimelineInsightCard_(
  sheet,
  row,
  column,
  width,
  title,
  count,
  content,
  toneName
) {

  const tone =
    getTimelineTone_(
      toneName
    );


  sheet
    .getRange(
      row,
      column,
      5,
      width
    )
    .setBackground(
      TIMELINE_THEME.surface
    )
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      TIMELINE_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );


  sheet
    .getRange(
      row,
      column,
      1,
      width
    )
    .merge()
    .setValue(
      title +
      '   ' +
      count
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


  sheet
    .getRange(
      row + 1,
      column,
      4,
      width
    )
    .merge()
    .setValue(
      content
    )
    .setFontColor(
      TIMELINE_THEME.text2
    )
    .setFontSize(
      9
    )
    .setWrap(
      true
    )
    .setVerticalAlignment(
      'top'
    );


  sheet.setRowHeight(
    row,
    26
  );


  for (
    let offset = 1;
    offset <= 4;
    offset++
  ) {

    sheet.setRowHeight(
      row +
      offset,
      24
    );

  }
}


/* ==========================================================================
 * OPEN SELECTED TIMELINE TASK
 * ========================================================================== */

function openSelectedTimelineTask_() {

  const ui =
    SpreadsheetApp.getUi();


  const sheet =
    SpreadsheetApp
      .getActive()
      .getActiveSheet();


  if (
    !sheet ||
    sheet.getName() !==
      SHEETS.TIMELINE
  ) {

    ui.alert(
      'Open Task',
      'Open Timeline and select a task row first.',
      ui.ButtonSet.OK
    );


    return;
  }


  const range =
    sheet.getActiveRange();


  if (!range) {
    return;
  }


  let note =
    String(
      range.getNote() ||
      ''
    ).trim();


  if (!note) {

    note =
      findTimelineTaskNoteNearSelection_(
        sheet,
        range.getRow()
      );

  }


  if (
    note.indexOf(
      'TASK_ID:'
    ) !==
    0
  ) {

    ui.alert(
      'Open Task',
      'Select a task row inside Timeline first.',
      ui.ButtonSet.OK
    );


    return;
  }


  const taskId =
    note
      .substring(
        'TASK_ID:'.length
      )
      .trim();


  if (!taskId) {
    return;
  }


  showTaskDetails_(
    taskId
  );
}


/* ==========================================================================
 * FIND ROW TASK NOTE
 * ========================================================================== */

function findTimelineTaskNoteNearSelection_(
  sheet,
  row
) {

  if (
    row <
      TIMELINE_LAYOUT.firstTaskRow ||
    row >=
      TIMELINE_LAYOUT.firstTaskRow +
      TIMELINE_LAYOUT.maxTasks
  ) {

    return '';

  }


  /*
   * TaskId note is stored in merged A:C task title.
   */
  return String(
    sheet
      .getRange(
        row,
        1
      )
      .getNote() ||
    ''
  ).trim();
}


/* ==========================================================================
 * BAR TONE
 * ========================================================================== */

function getTimelineBarTone_(
  task,
  today
) {

  const status =
    String(
      task.Status || ''
    );


  if (
    status ===
    'Completed'
  ) {

    return {

      fill:
        TIMELINE_THEME.success,

      soft:
        TIMELINE_THEME.successSoft,

      text:
        TIMELINE_THEME.success

    };

  }


  if (
    isTimelineTaskOverdue_(
      task,
      today
    )
  ) {

    return {

      fill:
        TIMELINE_THEME.danger,

      soft:
        TIMELINE_THEME.dangerSoft,

      text:
        TIMELINE_THEME.danger

    };

  }


  if (
    status ===
    'Waiting'
  ) {

    return {

      fill:
        TIMELINE_THEME.warning,

      soft:
        TIMELINE_THEME.warningSoft,

      text:
        TIMELINE_THEME.warning

    };

  }


  if (
    status ===
    'In Progress'
  ) {

    return {

      fill:
        TIMELINE_THEME.primary,

      soft:
        TIMELINE_THEME.primaryLight,

      text:
        TIMELINE_THEME.primary

    };

  }


  return {

    fill:
      TIMELINE_THEME.info,

    soft:
      TIMELINE_THEME.infoSoft,

    text:
      TIMELINE_THEME.info

  };
}


/* ==========================================================================
 * GENERAL TONES
 * ========================================================================== */

function getTimelineTone_(
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
          TIMELINE_THEME.danger,

        soft:
          TIMELINE_THEME.dangerSoft

      };


    case 'warning':

      return {

        text:
          TIMELINE_THEME.warning,

        soft:
          TIMELINE_THEME.warningSoft

      };


    case 'success':

      return {

        text:
          TIMELINE_THEME.success,

        soft:
          TIMELINE_THEME.successSoft

      };


    case 'info':

      return {

        text:
          TIMELINE_THEME.info,

        soft:
          TIMELINE_THEME.infoSoft

      };


    default:

      return {

        text:
          TIMELINE_THEME.primary,

        soft:
          TIMELINE_THEME.primaryLight

      };

  }
}


/* ==========================================================================
 * STATUS TONE
 * ========================================================================== */

function getTimelineStatusTone_(
  status
) {

  switch (
    String(
      status || ''
    )
  ) {

    case 'Completed':

      return getTimelineTone_(
        'success'
      );


    case 'Waiting':

      return getTimelineTone_(
        'warning'
      );


    case 'In Progress':

      return getTimelineTone_(
        'primary'
      );


    case 'To Do':

      return getTimelineTone_(
        'primary'
      );


    case 'Inbox':

      return getTimelineTone_(
        'info'
      );


    default:

      return {

        text:
          TIMELINE_THEME.text2,

        soft:
          TIMELINE_THEME.surface2

      };

  }
}


/* ==========================================================================
 * PRIORITY
 * ========================================================================== */

function getTimelinePriorityTone_(
  priority
) {

  switch (
    String(
      priority || ''
    )
  ) {

    case 'Critical':
    case 'Urgent':

      return getTimelineTone_(
        'danger'
      );


    case 'High':

      return getTimelineTone_(
        'warning'
      );


    case 'Low':

      return getTimelineTone_(
        'success'
      );


    default:

      return getTimelineTone_(
        'primary'
      );

  }
}


/* ==========================================================================
 * PROGRESS
 * ========================================================================== */

function getTimelineProgressTone_(
  progress
) {

  progress =
    Number(
      progress
    ) || 0;


  if (
    progress >= 100
  ) {

    return getTimelineTone_(
      'success'
    );

  }


  if (
    progress >= 60
  ) {

    return getTimelineTone_(
      'primary'
    );

  }


  if (
    progress > 0
  ) {

    return getTimelineTone_(
      'warning'
    );

  }


  return {

    text:
      TIMELINE_THEME.text2,

    soft:
      TIMELINE_THEME.surface2

  };
}


/* ==========================================================================
 * RISK
 * ========================================================================== */

function isTimelineTaskOverdue_(
  task,
  today
) {

  if (
    String(
      task.Status || ''
    ) ===
    'Completed'
  ) {

    return false;
  }


  const dates =
    getTimelineTaskDates_(
      task
    );


  return Boolean(
    dates.end &&
    dates.end.getTime() <
      today.getTime()
  );
}


/* ==========================================================================
 * SORT
 * ========================================================================== */

function timelineTaskSort_(
  a,
  b
) {

  /*
   * Open before completed.
   */
  const aCompleted =
    String(
      a.Status || ''
    ) ===
    'Completed';


  const bCompleted =
    String(
      b.Status || ''
    ) ===
    'Completed';


  if (
    aCompleted !==
    bCompleted
  ) {

    return aCompleted
      ? 1
      : -1;

  }


  /*
   * In Progress near top.
   */
  const aActive =
    String(
      a.Status || ''
    ) ===
    'In Progress';


  const bActive =
    String(
      b.Status || ''
    ) ===
    'In Progress';


  if (
    aActive !==
    bActive
  ) {

    return aActive
      ? -1
      : 1;

  }


  /*
   * SmartScore.
   */
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
    scoreDifference !==
    0
  ) {

    return scoreDifference;

  }


  /*
   * Start date.
   */
  const aDates =
    getTimelineTaskDates_(
      a
    );


  const bDates =
    getTimelineTaskDates_(
      b
    );


  return (
    aDates.start.getTime() -
    bDates.start.getTime()
  );
}


/* ==========================================================================
 * DATE HELPERS
 * ========================================================================== */

function getTimelineWeekStart_(
  date
) {

  const result =
    stripTime_(
      date
    );


  const day =
    result.getDay();


  const difference =
    day === 0
      ? -6
      : 1 - day;


  result.setDate(
    result.getDate() +
    difference
  );


  return result;
}


function timelineSameDay_(
  first,
  second
) {

  const a =
    stripTime_(
      first
    );


  const b =
    stripTime_(
      second
    );


  return Boolean(
    a &&
    b &&
    a.getTime() ===
      b.getTime()
  );
}


function timelineDateInRange_(
  value,
  start,
  end
) {

  const date =
    stripTime_(
      value
    );


  if (!date) {
    return false;
  }


  return (
    date.getTime() >=
      start.getTime() &&
    date.getTime() <=
      end.getTime()
  );
}


function timelineDaysDiff_(
  start,
  end
) {

  const first =
    stripTime_(
      start
    );


  const second =
    stripTime_(
      end
    );


  return Math.round(
    (
      second.getTime() -
      first.getTime()
    ) /
    86400000
  );
}


function timelineShortDate_(
  date
) {

  if (!date) {
    return '—';
  }


  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'dd MMM'
  );
}


/* ==========================================================================
 * FOOTER
 * ========================================================================== */

function writeTimelineFooter_(
  sheet,
  row
) {

  const totalColumns =
    TIMELINE_LAYOUT.infoCols +
    TIMELINE_LAYOUT.days;


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
      totalColumns
    )
    .merge()
    .setValue(
      'Select a task row → ⚡ Smart Task → Task Actions → Open Selected Task' +
      '   •   Refreshed ' +
      refreshTime
    )
    .setFontSize(
      8
    )
    .setFontColor(
      TIMELINE_THEME.muted
    )
    .setHorizontalAlignment(
      'right'
    );
}