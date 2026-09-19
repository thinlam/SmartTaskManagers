/**
 * 13_Timeline.gs
 * -----------------------------------------------------------------------
 * FRAME 10 — TIMELINE / GANTT — PROFESSIONAL V2
 *
 * Personal Smart Task Manager.
 *
 * Color meaning:
 * Indigo = In Progress
 * Blue   = To Do / Inbox
 * Amber  = Waiting
 * Red    = Overdue / Risk
 * Green  = Completed
 *
 * Filled bar = completed progress
 * Soft bar   = remaining duration
 * -----------------------------------------------------------------------
 */


/* ==========================================================================
 * CONFIG
 * ========================================================================== */

const TIMELINE_LAYOUT = {
  infoCols: 8,
  days: 28,

  accentRow: 1,
  titleRow: 2,
  subtitleRow: 3,
  healthRow: 4,

  kpiStartRow: 6,
  kpiEndRow: 8,

  legendRow: 9,

  weekHeaderRow: 10,
  dateHeaderRow: 11,
  weekdayHeaderRow: 12,

  firstTaskRow: 14,

  minTaskRows: 5,
  maxTasks: 18,

  insightsGap: 2
};


const TIMELINE_THEME = {
  background: COLORS.background || '#F8FAFC',
  surface: COLORS.surface || '#FFFFFF',
  surfaceAlt: '#FBFCFE',
  surface2: COLORS.surface2 || '#F1F5F9',

  primary: COLORS.primary || '#4F46E5',
  primaryHover: COLORS.primaryHover || '#4338CA',
  primaryLight: COLORS.primaryLight || '#EEF2FF',

  text: COLORS.text || '#1E293B',
  text2: COLORS.text2 || '#64748B',
  muted: COLORS.muted || '#94A3B8',

  border: COLORS.border || '#E2E8F0',
  divider: '#CBD5E1',

  success: COLORS.success || '#16A34A',
  warning: COLORS.warning || '#F59E0B',
  danger: COLORS.danger || '#DC2626',
  info: COLORS.info || '#2563EB',

  successSoft: '#DCFCE7',
  warningSoft: '#FEF3C7',
  dangerSoft: '#FEE2E2',
  infoSoft: '#DBEAFE',

  weekend: '#F8FAFC',
  today: '#EEF2FF',

  darkHeader: '#172033'
};


const TIMELINE_PROPERTY_KEY =
  'SMART_TASK_TIMELINE_START';


/* ==========================================================================
 * OPEN
 * ========================================================================== */

function openTimeline_() {
  const spreadsheet =
    SpreadsheetApp.getActive();

  const sheet =
    getOrCreateSheet_(SHEETS.TIMELINE);

  spreadsheet.setActiveSheet(sheet);

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
      current.getDate() - TIMELINE_LAYOUT.days
    );

  setTimelineAnchorDate_(previous);

  openTimeline_();
}


function timelineNextPeriod_() {
  const current =
    getTimelineAnchorDate_();

  const next =
    new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() + TIMELINE_LAYOUT.days
    );

  setTimelineAnchorDate_(next);

  openTimeline_();
}


function timelineCurrentPeriod_() {
  const today =
    stripTime_(now_());

  setTimelineAnchorDate_(
    getTimelineWeekStart_(today)
  );

  openTimeline_();
}


/* ==========================================================================
 * ANCHOR
 * ========================================================================== */

function getTimelineAnchorDate_() {
  const properties =
    PropertiesService.getDocumentProperties();

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
      return getTimelineWeekStart_(
        new Date(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3])
        )
      );
    }
  }

  return getTimelineWeekStart_(
    stripTime_(now_())
  );
}


function setTimelineAnchorDate_(date) {
  const monday =
    getTimelineWeekStart_(date);

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
 * RENDER
 * ========================================================================== */

function renderTimeline_() {
  const sheet =
    getOrCreateSheet_(SHEETS.TIMELINE);

  const data =
    computeTimelineData_();

  prepareTimelineCanvas_(sheet);

  writeTimelineHeader_(sheet, data);

  writeTimelineKpis_(sheet, data);

  writeTimelineLegend_(sheet);

  writeTimelineHeaders_(sheet, data);

  const lastTaskRow =
    writeTimelineRows_(
      sheet,
      data
    );

  const insightStartRow =
    lastTaskRow +
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
    stripTime_(now_());

  const scheduled = [];
  const unscheduled = [];
  const atRisk = [];

  tasks.forEach(function (task) {
    const status =
      String(task.Status || '');

    const dates =
      getTimelineTaskDates_(task);

    if (!dates.start && !dates.end) {
      if (status !== 'Completed') {
        unscheduled.push(task);
      }

      return;
    }

    const risk =
      String(task.Risk || '');

    const overdue =
      status !== 'Completed' &&
      dates.end &&
      dates.end.getTime() <
      today.getTime();

    if (
      status !== 'Completed' &&
      (
        risk === 'Critical' ||
        risk === 'High' ||
        overdue
      )
    ) {
      atRisk.push(task);
    }

    const overlaps =
      dates.start.getTime() <=
      windowEnd.getTime() &&
      dates.end.getTime() >=
      windowStart.getTime();

    if (overlaps) {
      scheduled.push(task);
    }
  });

  scheduled.sort(timelineTaskSort_);
  unscheduled.sort(timelineTaskSort_);
  atRisk.sort(timelineTaskSort_);

  const inProgress =
    tasks.filter(function (task) {
      return (
        String(task.Status || '') ===
        'In Progress'
      );
    });

  const completedInWindow =
    tasks.filter(function (task) {
      return (
        String(task.Status || '') ===
          'Completed' &&
        timelineDateInRange_(
          task.CompletedDate,
          windowStart,
          windowEnd
        )
      );
    });

  const focusTask =
    scheduled
      .filter(function (task) {
        return (
          String(task.Status || '') !==
          'Completed'
        );
      })
      .slice()
      .sort(function (a, b) {
        return (
          (Number(b.SmartScore) || 0) -
          (Number(a.SmartScore) || 0)
        );
      })[0] || null;

  return {
    tasks: tasks,

    scheduled: scheduled,

    visibleTasks:
      scheduled.slice(
        0,
        TIMELINE_LAYOUT.maxTasks
      ),

    unscheduled: unscheduled,
    atRisk: atRisk,
    inProgress: inProgress,

    completedInWindow:
      completedInWindow,

    focusTask: focusTask,

    today: today,

    windowStart: windowStart,
    windowEnd: windowEnd
  };
}


/* ==========================================================================
 * TASK DATES
 * ========================================================================== */

function getTimelineTaskDates_(task) {
  let start =
    stripTime_(task.StartDate);

  let end =
    stripTime_(task.DueDate);

  if (!start && end) {
    start =
      new Date(end.getTime());
  }

  if (start && !end) {
    end =
      new Date(start.getTime());
  }

  if (
    start &&
    end &&
    start.getTime() >
    end.getTime()
  ) {
    const temp = start;

    start = end;
    end = temp;
  }

  return {
    start: start,
    end: end
  };
}


/* ==========================================================================
 * CANVAS
 * ========================================================================== */

function prepareTimelineCanvas_(sheet) {
  const totalColumns =
    TIMELINE_LAYOUT.infoCols +
    TIMELINE_LAYOUT.days;

  const requiredRows = 60;

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


  /*
   * IMPORTANT:
   * Do not freeze columns because the premium
   * layout uses merged ranges across H | I.
   */
  sheet.setFrozenColumns(0);
  sheet.setFrozenRows(0);


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


  sheet.setHiddenGridlines(true);


  sheet.setFrozenRows(
    TIMELINE_LAYOUT.weekdayHeaderRow
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
    .setFontFamily('Arial')
    .setVerticalAlignment(
      'middle'
    );


  /* ----------------------------------------------------------------------
   * INFORMATION AREA
   * -------------------------------------------------------------------- */

  sheet.setColumnWidth(1, 115);
  sheet.setColumnWidth(2, 115);
  sheet.setColumnWidth(3, 115);

  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 90);

  sheet.setColumnWidth(6, 82);
  sheet.setColumnWidth(7, 82);
  sheet.setColumnWidth(8, 80);


  /* ----------------------------------------------------------------------
   * DAY COLUMNS
   * -------------------------------------------------------------------- */

  for (
    let column =
      TIMELINE_LAYOUT.infoCols + 1;
    column <= totalColumns;
    column++
  ) {
    sheet.setColumnWidth(
      column,
      42
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
    48
  );

  sheet.setRowHeight(
    TIMELINE_LAYOUT.subtitleRow,
    28
  );

  sheet.setRowHeight(
    TIMELINE_LAYOUT.healthRow,
    30
  );

  sheet.setRowHeight(
    TIMELINE_LAYOUT.kpiStartRow,
    24
  );

  sheet.setRowHeight(
    TIMELINE_LAYOUT.kpiStartRow + 1,
    36
  );

  sheet.setRowHeight(
    TIMELINE_LAYOUT.kpiEndRow,
    24
  );

  sheet.setRowHeight(
    TIMELINE_LAYOUT.legendRow,
    29
  );

  sheet.setRowHeight(
    TIMELINE_LAYOUT.weekHeaderRow,
    29
  );

  sheet.setRowHeight(
    TIMELINE_LAYOUT.dateHeaderRow,
    28
  );

  sheet.setRowHeight(
    TIMELINE_LAYOUT.weekdayHeaderRow,
    25
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
    .setFontSize(28)
    .setFontWeight('bold')
    .setFontColor(
      TIMELINE_THEME.text
    );


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
    .setFontSize(13)
    .setFontWeight('bold')
    .setFontColor(
      TIMELINE_THEME.primary
    )
    .setHorizontalAlignment(
      'right'
    );


  sheet
    .getRange(
      TIMELINE_LAYOUT.subtitleRow,
      1,
      1,
      21
    )
    .merge()
    .setValue(
      'Plan visually • Filled bar = progress • Soft bar = remaining duration'
    )
    .setFontSize(10)
    .setFontColor(
      TIMELINE_THEME.text2
    );


  sheet
    .getRange(
      TIMELINE_LAYOUT.subtitleRow,
      22,
      1,
      totalColumns - 21
    )
    .merge()
    .setValue(
      '← Previous   •   Current   •   Next →'
    )
    .setFontSize(9)
    .setFontWeight('bold')
    .setFontColor(
      TIMELINE_THEME.muted
    )
    .setHorizontalAlignment(
      'right'
    );


  /* ----------------------------------------------------------------------
   * PLANNING HEALTH
   * -------------------------------------------------------------------- */

  let tone =
    getTimelineTone_('success');


  let text =
    'PLANNING HEALTH  •  Your active plan looks healthy';


  if (
    data.atRisk.length > 0
  ) {
    tone =
      getTimelineTone_('danger');

    text =
      'PLANNING HEALTH  •  ' +
      data.atRisk.length +
      ' task' +
      (
        data.atRisk.length === 1
          ? ''
          : 's'
      ) +
      ' need attention';
  } else if (
    data.unscheduled.length > 0
  ) {
    tone =
      getTimelineTone_('warning');

    text =
      'PLANNING HEALTH  •  ' +
      data.unscheduled.length +
      ' task' +
      (
        data.unscheduled.length === 1
          ? ''
          : 's'
      ) +
      ' still need scheduling';
  }


  if (data.focusTask) {
    text +=
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
    .setValue(text)
    .setBackground(tone.soft)
    .setFontColor(tone.text)
    .setFontSize(9)
    .setFontWeight('bold')
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
      label: 'SCHEDULED',
      value: data.scheduled.length,
      sub: 'Tasks in this 4-week view',
      tone: 'primary'
    },

    {
      label: 'IN PROGRESS',
      value: data.inProgress.length,
      sub: 'Currently active',
      tone:
        data.inProgress.length > 3
          ? 'warning'
          : 'primary'
    },

    {
      label: 'AT RISK',
      value: data.atRisk.length,
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
      label: 'UNSCHEDULED',
      value: data.unscheduled.length,
      sub: 'Open tasks without dates',
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
        blocks[index];

      const width =
        block.end -
        block.start +
        1;

      const tone =
        getTimelineTone_(
          card.tone
        );


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


      sheet
        .getRange(
          TIMELINE_LAYOUT.kpiStartRow,
          block.start,
          1,
          width
        )
        .merge()
        .setValue(card.label)
        .setBackground(tone.soft)
        .setFontColor(tone.text)
        .setFontSize(8)
        .setFontWeight('bold');


      sheet
        .getRange(
          TIMELINE_LAYOUT.kpiStartRow + 1,
          block.start,
          1,
          width
        )
        .merge()
        .setValue(card.value)
        .setFontSize(22)
        .setFontWeight('bold')
        .setFontColor(tone.text);


      sheet
        .getRange(
          TIMELINE_LAYOUT.kpiEndRow,
          block.start,
          1,
          width
        )
        .merge()
        .setValue(card.sub)
        .setFontSize(8)
        .setFontColor(
          TIMELINE_THEME.text2
        );
    }
  );
}


function buildTimelineMetricBlocks_(
  totalColumns,
  count,
  gap
) {
  const usable =
    totalColumns -
    (
      (count - 1) *
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

  let current = 1;

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

    if (remaining > 0) {
      remaining--;
    }

    result.push({
      start: current,

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
 * LEGEND
 * ========================================================================== */

function writeTimelineLegend_(sheet) {
  writeTimelineLegendBlock_(
    sheet,
    1,
    8,
    'HOW TO READ  •  solid = progress',
    '#172033',
    '#FFFFFF'
  );


  writeTimelineLegendBlock_(
    sheet,
    9,
    5,
    'TODAY',
    TIMELINE_THEME.primaryLight,
    TIMELINE_THEME.primary
  );


  writeTimelineLegendBlock_(
    sheet,
    14,
    5,
    'IN PROGRESS',
    '#E0E7FF',
    TIMELINE_THEME.primary
  );


  writeTimelineLegendBlock_(
    sheet,
    19,
    5,
    'TO DO',
    TIMELINE_THEME.infoSoft,
    TIMELINE_THEME.info
  );


  writeTimelineLegendBlock_(
    sheet,
    24,
    5,
    'WAITING',
    TIMELINE_THEME.warningSoft,
    '#B45309'
  );


  writeTimelineLegendBlock_(
    sheet,
    29,
    5,
    'OVERDUE',
    TIMELINE_THEME.dangerSoft,
    TIMELINE_THEME.danger
  );


  writeTimelineLegendBlock_(
    sheet,
    34,
    3,
    'DONE ✓',
    TIMELINE_THEME.successSoft,
    TIMELINE_THEME.success
  );
}


function writeTimelineLegendBlock_(
  sheet,
  column,
  width,
  text,
  background,
  color
) {
  sheet
    .getRange(
      TIMELINE_LAYOUT.legendRow,
      column,
      1,
      width
    )
    .merge()
    .setValue(text)
    .setBackground(background)
    .setFontColor(color)
    .setFontSize(8)
    .setFontWeight('bold')
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


/* ==========================================================================
 * HEADERS
 * ========================================================================== */

function writeTimelineHeaders_(
  sheet,
  data
) {
  writeTimelineInfoHeaders_(sheet);

  writeTimelineWeekHeaders_(
    sheet,
    data
  );

  writeTimelineDayHeaders_(
    sheet,
    data
  );
}


function writeTimelineInfoHeaders_(sheet) {
  const headers = [
    {
      start: 1,
      width: 3,
      text: 'TASK'
    },

    {
      start: 4,
      width: 1,
      text: 'STATUS'
    },

    {
      start: 5,
      width: 1,
      text: 'PRIORITY'
    },

    {
      start: 6,
      width: 1,
      text: 'START'
    },

    {
      start: 7,
      width: 1,
      text: 'DUE'
    },

    {
      start: 8,
      width: 1,
      text: 'PROGRESS'
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
        .setValue(header.text)
        .setBackground(
          TIMELINE_THEME.darkHeader
        )
        .setFontColor('#F8FAFC')
        .setFontSize(8)
        .setFontWeight('bold')
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


function writeTimelineWeekHeaders_(
  sheet,
  data
) {
  const startColumn =
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
        week * 7
      );


    const weekEnd =
      new Date(
        weekStart.getFullYear(),
        weekStart.getMonth(),
        weekStart.getDate() + 6
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
        startColumn +
        week * 7,
        1,
        7
      )
      .merge()
      .setValue(
        'WEEK ' +
        (
          week + 1
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
      .setFontSize(8)
      .setFontWeight('bold')
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


function writeTimelineDayHeaders_(
  sheet,
  data
) {
  const startColumn =
    TIMELINE_LAYOUT.infoCols +
    1;


  for (
    let index = 0;
    index <
      TIMELINE_LAYOUT.days;
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
      date.getDay() === 0 ||
      date.getDay() === 6;


    let background =
      TIMELINE_THEME.surface;

    let color =
      TIMELINE_THEME.text2;


    if (isWeekend) {
      background =
        TIMELINE_THEME.weekend;
    }


    if (isToday) {
      background =
        TIMELINE_THEME.primary;

      color = '#FFFFFF';
    }


    sheet
      .getRange(
        TIMELINE_LAYOUT.dateHeaderRow,
        column
      )
      .setValue(
        date.getDate()
      )
      .setBackground(background)
      .setFontColor(color)
      .setFontSize(9)
      .setFontWeight('bold')
      .setHorizontalAlignment(
        'center'
      );


    sheet
      .getRange(
        TIMELINE_LAYOUT.weekdayHeaderRow,
        column
      )
      .setValue(
        isToday
          ? 'TODAY'
          : Utilities.formatDate(
              date,
              Session.getScriptTimeZone(),
              'EEE'
            )
      )
      .setBackground(
        isToday
          ? TIMELINE_THEME.primaryHover
          : background
      )
      .setFontColor(color)
      .setFontSize(
        isToday
          ? 6
          : 7
      )
      .setFontWeight('bold')
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
  const tasks =
    data.visibleTasks;


  if (tasks.length === 0) {
    return writeTimelineEmptyState_(
      sheet,
      data
    );
  }


  tasks.forEach(
    function (
      task,
      index
    ) {
      writeTimelineTaskRow_(
        sheet,
        task,
        TIMELINE_LAYOUT.firstTaskRow +
        index,
        index,
        data
      );
    }
  );


  const fillerCount =
    Math.max(
      0,
      TIMELINE_LAYOUT.minTaskRows -
      tasks.length
    );


  for (
    let index = 0;
    index < fillerCount;
    index++
  ) {
    const row =
      TIMELINE_LAYOUT.firstTaskRow +
      tasks.length +
      index;


    writeTimelineBlankRow_(
      sheet,
      row,
      tasks.length +
      index,
      data
    );
  }


  let lastRow =
    TIMELINE_LAYOUT.firstTaskRow +
    tasks.length +
    fillerCount -
    1;


  if (
    data.scheduled.length >
    tasks.length
  ) {
    const count =
      data.scheduled.length -
      tasks.length;


    lastRow++;


    sheet
      .getRange(
        lastRow,
        1,
        1,
        TIMELINE_LAYOUT.infoCols +
        TIMELINE_LAYOUT.days
      )
      .merge()
      .setValue(
        '+' +
        count +
        ' additional task' +
        (
          count === 1
            ? ''
            : 's'
        ) +
        ' not shown'
      )
      .setBackground(
        TIMELINE_THEME.primaryLight
      )
      .setFontColor(
        TIMELINE_THEME.primary
      )
      .setFontSize(8)
      .setFontWeight('bold')
      .setHorizontalAlignment(
        'center'
      );

    sheet.setRowHeight(
      lastRow,
      27
    );
  }


  return lastRow;
}


/* ==========================================================================
 * TASK ROW
 * ========================================================================== */

function writeTimelineTaskRow_(
  sheet,
  task,
  row,
  index,
  data
) {
  const background =
    index % 2 === 0
      ? TIMELINE_THEME.surface
      : TIMELINE_THEME.surfaceAlt;


  const taskId =
    String(task.TaskId || '');


  const note =
    'TASK_ID:' +
    taskId;


  const dates =
    getTimelineTaskDates_(task);


  const isCompleted =
    String(task.Status || '') ===
    'Completed';


  /*
   * A Completed task must visually appear as 100%.
   *
   * This fixes old/test rows where:
   * Status = Completed
   * Progress = 10
   */
  const progress =
    isCompleted
      ? 100
      : Math.max(
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


  sheet
    .getRange(
      row,
      1,
      1,
      TIMELINE_LAYOUT.infoCols +
      TIMELINE_LAYOUT.days
    )
    .setBackground(background)
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


  /* TASK */

  sheet
    .getRange(
      row,
      1,
      1,
      3
    )
    .merge()
    .setValue(
      isCompleted
        ? (
            '✓  ' +
            (
              task.TaskName ||
              'Untitled task'
            )
          )
        : (
            task.TaskName ||
            'Untitled task'
          )
    )
    .setFontSize(9)
    .setFontWeight('bold')
    .setFontColor(
      isCompleted
        ? TIMELINE_THEME.success
        : TIMELINE_THEME.text
    )
    .setNote(note);


  /* STATUS */

  sheet
    .getRange(row, 4)
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
    .setFontSize(8)
    .setFontWeight('bold')
    .setHorizontalAlignment(
      'center'
    )
    .setNote(note);


  /* PRIORITY */

  sheet
    .getRange(row, 5)
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
    .setFontSize(8)
    .setFontWeight('bold')
    .setHorizontalAlignment(
      'center'
    )
    .setNote(note);


  /* START */

  sheet
    .getRange(row, 6)
    .setValue(
      timelineShortDate_(
        dates.start
      )
    )
    .setFontColor(
      TIMELINE_THEME.text2
    )
    .setFontSize(8)
    .setHorizontalAlignment(
      'center'
    )
    .setNote(note);


  /* DUE */

  const overdue =
    isTimelineTaskOverdue_(
      task,
      data.today
    );


  sheet
    .getRange(row, 7)
    .setValue(
      timelineShortDate_(
        dates.end
      )
    )
    .setFontColor(
      overdue
        ? TIMELINE_THEME.danger
        : TIMELINE_THEME.text2
    )
    .setFontWeight(
      overdue
        ? 'bold'
        : 'normal'
    )
    .setFontSize(8)
    .setHorizontalAlignment(
      'center'
    )
    .setNote(note);


  /* PROGRESS */

  sheet
    .getRange(row, 8)
    .setValue(
      progress + '%'
    )
    .setBackground(
      progressTone.soft
    )
    .setFontColor(
      progressTone.text
    )
    .setFontSize(8)
    .setFontWeight('bold')
    .setHorizontalAlignment(
      'center'
    )
    .setNote(note);


  /*
   * Strong vertical divider between task
   * information and timeline.
   */
  sheet
    .getRange(row, 8)
    .setBorder(
      false,
      false,
      false,
      true,
      false,
      false,
      TIMELINE_THEME.divider,
      SpreadsheetApp
        .BorderStyle
        .SOLID_MEDIUM
    );


  writeTimelineBar_(
    sheet,
    task,
    row,
    data,
    dates,
    progress,
    note
  );


  sheet.setRowHeight(
    row,
    36
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
  progress,
  note
) {
  if (
    !dates.start ||
    !dates.end
  ) {
    return;
  }


  const firstDayColumn =
    TIMELINE_LAYOUT.infoCols +
    1;


  const backgrounds = [];

  const values = [];

  const fontColors = [];

  const fontWeights = [];


  for (
    let index = 0;
    index <
      TIMELINE_LAYOUT.days;
    index++
  ) {
    const date =
      new Date(
        data.windowStart.getFullYear(),
        data.windowStart.getMonth(),
        data.windowStart.getDate() +
        index
      );


    const isWeekend =
      date.getDay() === 0 ||
      date.getDay() === 6;


    const isToday =
      timelineSameDay_(
        date,
        data.today
      );


    backgrounds.push(
      isToday
        ? TIMELINE_THEME.today
        : (
            isWeekend
              ? TIMELINE_THEME.weekend
              : TIMELINE_THEME.surface
          )
    );


    values.push('');
    fontColors.push(
      TIMELINE_THEME.text2
    );
    fontWeights.push('normal');
  }


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


  const isCompleted =
    String(task.Status || '') ===
    'Completed';


  const completedCells =
    isCompleted
      ? duration
      : (
          progress > 0
            ? Math.min(
                duration,
                Math.max(
                  1,
                  Math.round(
                    duration *
                    progress /
                    100
                  )
                )
              )
            : 0
        );


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


    const completed =
      relative <
      completedCells;


    backgrounds[index] =
      completed
        ? tone.fill
        : tone.soft;


    fontColors[index] =
      completed
        ? '#FFFFFF'
        : tone.text;


    fontWeights[index] =
      'bold';
  }


  /*
   * Explicit marker solves the confusing
   * "single colored cell" problem.
   */
  values[startIndex] =
    getTimelineBarMarker_(
      task,
      data.today
    );


  const range =
    sheet.getRange(
      row,
      firstDayColumn,
      1,
      TIMELINE_LAYOUT.days
    );


  range
    .setBackgrounds(
      [backgrounds]
    )
    .setValues(
      [values]
    )
    .setFontColors(
      [fontColors]
    )
    .setFontWeights(
      [fontWeights]
    )
    .setFontSize(8)
    .setHorizontalAlignment(
      'center'
    )
    .setNote(note);


  /* TODAY VERTICAL MARKER */

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
        firstDayColumn +
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


function getTimelineBarMarker_(
  task,
  today
) {
  const status =
    String(task.Status || '');


  if (status === 'Completed') {
    return '✓';
  }


  if (
    isTimelineTaskOverdue_(
      task,
      today
    )
  ) {
    return '!';
  }


  if (status === 'In Progress') {
    return '▶';
  }


  if (status === 'Waiting') {
    return '…';
  }


  return '•';
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
    .setBackground(background)
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


  const backgrounds = [];


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
      date.getDay() === 0 ||
      date.getDay() === 6;


    const isToday =
      timelineSameDay_(
        date,
        data.today
      );


    backgrounds.push(
      isToday
        ? TIMELINE_THEME.today
        : (
            isWeekend
              ? TIMELINE_THEME.weekend
              : background
          )
    );
  }


  sheet
    .getRange(
      row,
      TIMELINE_LAYOUT.infoCols + 1,
      1,
      TIMELINE_LAYOUT.days
    )
    .setBackgrounds(
      [backgrounds]
    );


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
  const totalColumns =
    TIMELINE_LAYOUT.infoCols +
    TIMELINE_LAYOUT.days;


  const startRow =
    TIMELINE_LAYOUT.firstTaskRow;


  sheet
    .getRange(
      startRow,
      1,
      4,
      totalColumns
    )
    .merge()
    .setValue(
      'NO SCHEDULED TASKS\n' +
      'Add a Start Date or Due Date to place a task on your timeline.'
    )
    .setBackground(
      TIMELINE_THEME.surface
    )
    .setFontColor(
      TIMELINE_THEME.muted
    )
    .setFontSize(10)
    .setFontWeight('bold')
    .setWrap(true)
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


  return startRow + 3;
}


/* ==========================================================================
 * INSIGHTS
 * ========================================================================== */

function writeTimelineInsights_(
  sheet,
  data,
  startRow
) {
  const totalColumns =
    TIMELINE_LAYOUT.infoCols +
    TIMELINE_LAYOUT.days;


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
    .setFontSize(15)
    .setFontWeight('bold')
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
      'Keep your workload realistic'
    )
    .setFontSize(8)
    .setFontColor(
      TIMELINE_THEME.muted
    )
    .setHorizontalAlignment(
      'right'
    );


  const cardRow =
    startRow + 1;


  const leftWidth =
    Math.floor(
      (totalColumns - 1) /
      2
    );


  const rightStart =
    leftWidth + 2;


  const rightWidth =
    totalColumns -
    rightStart +
    1;


  const unscheduledText =
    data.unscheduled.length
      ? data.unscheduled
          .slice(0, 5)
          .map(function (task) {
            return (
              '• ' +
              (
                task.TaskName ||
                'Untitled task'
              )
            );
          })
          .join('\n')
      : '✓ All open tasks have a schedule.';


  writeTimelineInsightCard_(
    sheet,
    cardRow,
    1,
    leftWidth,
    'UNSCHEDULED',
    data.unscheduled.length,
    unscheduledText,
    data.unscheduled.length
      ? 'warning'
      : 'success'
  );


  const riskText =
    data.atRisk.length
      ? data.atRisk
          .slice(0, 5)
          .map(function (task) {
            return (
              '• ' +
              (
                task.TaskName ||
                'Untitled task'
              )
            );
          })
          .join('\n')
      : '✓ No overdue or high-risk tasks.';


  writeTimelineInsightCard_(
    sheet,
    cardRow,
    rightStart,
    rightWidth,
    'AT RISK',
    data.atRisk.length,
    riskText,
    data.atRisk.length
      ? 'danger'
      : 'success'
  );


  return cardRow + 5;
}


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
    .setBackground(tone.soft)
    .setFontColor(tone.text)
    .setFontSize(9)
    .setFontWeight('bold');


  sheet
    .getRange(
      row + 1,
      column,
      4,
      width
    )
    .merge()
    .setValue(content)
    .setFontColor(
      TIMELINE_THEME.text2
    )
    .setFontSize(9)
    .setWrap(true)
    .setVerticalAlignment(
      'top'
    );


  sheet.setRowHeight(
    row,
    27
  );


  for (
    let offset = 1;
    offset <= 4;
    offset++
  ) {
    sheet.setRowHeight(
      row + offset,
      24
    );
  }
}


/* ==========================================================================
 * OPEN SELECTED TASK
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
      range.getNote() || ''
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
    ) !== 0
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


  const task =
    getTaskById_(taskId);


  if (!task) {
    ui.alert(
      'Task Not Found',
      'The selected task could not be found.',
      ui.ButtonSet.OK
    );

    return;
  }


  showTaskDetails_(taskId);
}


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


  return String(
    sheet
      .getRange(row, 1)
      .getNote() ||
    ''
  ).trim();
}


/* ==========================================================================
 * BAR COLORS
 * ========================================================================== */

function getTimelineBarTone_(
  task,
  today
) {
  const status =
    String(task.Status || '');


  if (status === 'Completed') {
    return {
      fill: '#16A34A',
      soft: '#DCFCE7',
      text: '#15803D'
    };
  }


  if (
    isTimelineTaskOverdue_(
      task,
      today
    )
  ) {
    return {
      fill: '#DC2626',
      soft: '#FEE2E2',
      text: '#B91C1C'
    };
  }


  if (status === 'Waiting') {
    return {
      fill: '#D97706',
      soft: '#FEF3C7',
      text: '#B45309'
    };
  }


  if (status === 'In Progress') {
    return {
      fill: '#4F46E5',
      soft: '#E0E7FF',
      text: '#4338CA'
    };
  }


  return {
    fill: '#2563EB',
    soft: '#DBEAFE',
    text: '#1D4ED8'
  };
}


/* ==========================================================================
 * GENERAL COLORS
 * ========================================================================== */

function getTimelineTone_(tone) {
  switch (
    String(tone || '')
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
          '#B45309',

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


function getTimelineStatusTone_(
  status
) {
  switch (
    String(status || '')
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
        'info'
      );

    case 'Inbox':
      return {
        text:
          TIMELINE_THEME.text2,

        soft:
          TIMELINE_THEME.surface2
      };

    default:
      return {
        text:
          TIMELINE_THEME.text2,

        soft:
          TIMELINE_THEME.surface2
      };
  }
}


function getTimelinePriorityTone_(
  priority
) {
  switch (
    String(priority || '')
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
      return {
        text:
          TIMELINE_THEME.text2,

        soft:
          TIMELINE_THEME.surface2
      };
  }
}


function getTimelineProgressTone_(
  progress
) {
  progress =
    Number(progress) || 0;


  if (progress >= 100) {
    return getTimelineTone_(
      'success'
    );
  }


  if (progress >= 60) {
    return getTimelineTone_(
      'primary'
    );
  }


  if (progress > 0) {
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
 * OVERDUE
 * ========================================================================== */

function isTimelineTaskOverdue_(
  task,
  today
) {
  if (
    String(task.Status || '') ===
    'Completed'
  ) {
    return false;
  }


  const dates =
    getTimelineTaskDates_(task);


  return Boolean(
    dates.end &&
    dates.end.getTime() <
      today.getTime()
  );
}


/* ==========================================================================
 * SORT
 * ========================================================================== */

function timelineTaskSort_(a, b) {
  const aCompleted =
    String(a.Status || '') ===
    'Completed';

  const bCompleted =
    String(b.Status || '') ===
    'Completed';


  if (aCompleted !== bCompleted) {
    return aCompleted
      ? 1
      : -1;
  }


  const aActive =
    String(a.Status || '') ===
    'In Progress';

  const bActive =
    String(b.Status || '') ===
    'In Progress';


  if (aActive !== bActive) {
    return aActive
      ? -1
      : 1;
  }


  const scoreDifference =
    (
      Number(b.SmartScore) || 0
    ) -
    (
      Number(a.SmartScore) || 0
    );


  if (scoreDifference !== 0) {
    return scoreDifference;
  }


  const aDates =
    getTimelineTaskDates_(a);

  const bDates =
    getTimelineTaskDates_(b);


  const aStart =
    aDates.start
      ? aDates.start.getTime()
      : Number.MAX_SAFE_INTEGER;


  const bStart =
    bDates.start
      ? bDates.start.getTime()
      : Number.MAX_SAFE_INTEGER;


  if (aStart !== bStart) {
    return aStart -
      bStart;
  }


  return String(
    a.TaskName || ''
  ).localeCompare(
    String(
      b.TaskName || ''
    )
  );
}


/* ==========================================================================
 * DATE HELPERS
 * ========================================================================== */

function getTimelineWeekStart_(date) {
  const result =
    stripTime_(date);


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
    stripTime_(first);

  const b =
    stripTime_(second);


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
    stripTime_(value);


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
    stripTime_(start);

  const second =
    stripTime_(end);


  if (!first || !second) {
    return 0;
  }


  return Math.round(
    (
      second.getTime() -
      first.getTime()
    ) /
    86400000
  );
}


function timelineShortDate_(date) {
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
      'Select a task → ⚡ Smart Task → Task Actions → Open Selected Task' +
      '   •   Refreshed ' +
      refreshTime
    )
    .setFontSize(8)
    .setFontColor(
      TIMELINE_THEME.muted
    )
    .setHorizontalAlignment(
      'right'
    );
}