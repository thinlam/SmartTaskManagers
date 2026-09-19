/**
 * 12_Calendar.gs
 * -----------------------------------------------------------------------
 * FRAME 09 — CALENDAR
 *
 * Premium personal productivity calendar.
 *
 * Tasks is the single source of truth.
 *
 * Features:
 * - Professional monthly calendar
 * - 3-column day cards
 * - Individual task rows
 * - Today / overdue / completed states
 * - Monthly KPI cards
 * - Planning health
 * - Previous / current / next month
 * - Upcoming & overdue agenda
 * - Open Task Details directly from calendar
 * -----------------------------------------------------------------------
 */


/* ==========================================================================
 * CONFIG
 * ========================================================================== */

const CALENDAR_LAYOUT = {

  cols:
    21,

  accentRow:
    1,

  titleRow:
    2,

  subtitleRow:
    3,

  planningRow:
    4,


  kpiStartRow:
    6,

  kpiEndRow:
    8,


  weekdayRow:
    10,

  calendarStartRow:
    11,


  weeks:
    6,

  dayCols:
    3,

  dayRows:
    6,

  maxTasksPerDay:
    4,


  agendaGap:
    2,

  agendaMaxRows:
    12
};


const CALENDAR_THEME = {

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

  outsideMonth:
    '#F8FAFC'
};


const CALENDAR_PROPERTY_KEY =
  'SMART_TASK_CALENDAR_MONTH';


/* ==========================================================================
 * MONTH NAVIGATION
 * ========================================================================== */

function calendarPreviousMonth_() {

  const current =
    getCalendarAnchorMonth_();


  const previous =
    new Date(
      current.getFullYear(),
      current.getMonth() - 1,
      1
    );


  setCalendarAnchorMonth_(
    previous
  );


  calendarActivateAndRender_();
}


function calendarNextMonth_() {

  const current =
    getCalendarAnchorMonth_();


  const next =
    new Date(
      current.getFullYear(),
      current.getMonth() + 1,
      1
    );


  setCalendarAnchorMonth_(
    next
  );


  calendarActivateAndRender_();
}


function calendarCurrentMonth_() {

  const today =
    stripTime_(
      now_()
    );


  const current =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );


  setCalendarAnchorMonth_(
    current
  );


  calendarActivateAndRender_();
}


/**
 * Activate Calendar sheet and render.
 *
 * openCalendar_() itself is already implemented
 * in 04_Menu.gs.
 */
function calendarActivateAndRender_() {

  const spreadsheet =
    SpreadsheetApp.getActive();


  const sheet =
    getOrCreateSheet_(
      SHEETS.CALENDAR
    );


  spreadsheet.setActiveSheet(
    sheet
  );


  renderCalendar_();
}


/* ==========================================================================
 * ANCHOR MONTH
 * ========================================================================== */

function getCalendarAnchorMonth_() {

  const properties =
    PropertiesService
      .getDocumentProperties();


  const saved =
    properties.getProperty(
      CALENDAR_PROPERTY_KEY
    );


  if (saved) {

    const match =
      saved.match(
        /^(\d{4})-(\d{2})$/
      );


    if (match) {

      return new Date(
        Number(
          match[1]
        ),
        Number(
          match[2]
        ) - 1,
        1
      );

    }

  }


  const today =
    stripTime_(
      now_()
    );


  return new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );
}


function setCalendarAnchorMonth_(
  date
) {

  const value =
    Utilities.formatDate(
      date,
      Session.getScriptTimeZone(),
      'yyyy-MM'
    );


  PropertiesService
    .getDocumentProperties()
    .setProperty(
      CALENDAR_PROPERTY_KEY,
      value
    );
}


/* ==========================================================================
 * MAIN RENDER
 * ========================================================================== */

function renderCalendar_() {

  const sheet =
    getOrCreateSheet_(
      SHEETS.CALENDAR
    );


  const data =
    computeCalendarData_();


  prepareCalendarCanvas_(
    sheet
  );


  writeCalendarHeader_(
    sheet,
    data
  );


  writeCalendarKpis_(
    sheet,
    data
  );


  writeCalendarWeekdays_(
    sheet
  );


  writeCalendarGrid_(
    sheet,
    data
  );


  const agendaStartRow =
    CALENDAR_LAYOUT.calendarStartRow +
    (
      CALENDAR_LAYOUT.weeks *
      CALENDAR_LAYOUT.dayRows
    ) +
    CALENDAR_LAYOUT.agendaGap;


  const agendaEndRow =
    writeCalendarAgenda_(
      sheet,
      data,
      agendaStartRow
    );


  writeCalendarFooter_(
    sheet,
    agendaEndRow + 2
  );


  SpreadsheetApp.flush();
}


/* ==========================================================================
 * DATA
 * ========================================================================== */

function computeCalendarData_() {

  const tasks =
    getAllTasks_();


  const anchor =
    getCalendarAnchorMonth_();


  const monthStart =
    new Date(
      anchor.getFullYear(),
      anchor.getMonth(),
      1
    );


  const monthEnd =
    new Date(
      anchor.getFullYear(),
      anchor.getMonth() + 1,
      0
    );


  const gridStart =
    getCalendarGridStart_(
      monthStart
    );


  const gridEnd =
    new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + 41
    );


  const today =
    stripTime_(
      now_()
    );


  const tasksByDate = {};


  /* ----------------------------------------------------------------------
   * GROUP TASKS BY DUE DATE
   * -------------------------------------------------------------------- */

  tasks.forEach(
    function (task) {

      const due =
        stripTime_(
          task.DueDate
        );


      if (!due) {
        return;
      }


      const key =
        calendarDateKey_(
          due
        );


      if (
        !tasksByDate[
          key
        ]
      ) {

        tasksByDate[
          key
        ] = [];

      }


      tasksByDate[
        key
      ].push(
        task
      );

    }
  );


  Object
    .keys(
      tasksByDate
    )
    .forEach(
      function (key) {

        tasksByDate[
          key
        ].sort(
          calendarTaskSort_
        );

      }
    );


  /* ----------------------------------------------------------------------
   * OPEN TASKS
   * -------------------------------------------------------------------- */

  const openTasks =
    tasks.filter(
      function (task) {

        return (
          String(
            task.Status || ''
          ) !== 'Completed'
        );

      }
    );


  /* ----------------------------------------------------------------------
   * SCHEDULED THIS MONTH
   * -------------------------------------------------------------------- */

  const scheduledThisMonth =
    openTasks.filter(
      function (task) {

        return calendarDateInRange_(
          task.DueDate,
          monthStart,
          monthEnd
        );

      }
    );


  /* ----------------------------------------------------------------------
   * DUE TODAY
   * -------------------------------------------------------------------- */

  const dueToday =
    openTasks.filter(
      function (task) {

        return calendarSameDay_(
          task.DueDate,
          today
        );

      }
    );


  /* ----------------------------------------------------------------------
   * COMPLETED THIS MONTH
   * -------------------------------------------------------------------- */

  const completedThisMonth =
    tasks.filter(
      function (task) {

        return (
          String(
            task.Status || ''
          ) === 'Completed' &&
          calendarDateInRange_(
            task.CompletedDate,
            monthStart,
            monthEnd
          )
        );

      }
    );


  /* ----------------------------------------------------------------------
   * OVERDUE
   * -------------------------------------------------------------------- */

  const overdue =
    openTasks.filter(
      function (task) {

        const due =
          stripTime_(
            task.DueDate
          );


        return (
          due &&
          due.getTime() <
          today.getTime()
        );

      }
    );


  /* ----------------------------------------------------------------------
   * UNSCHEDULED
   * -------------------------------------------------------------------- */

  const unscheduled =
    openTasks.filter(
      function (task) {

        return (
          !stripTime_(
            task.DueDate
          )
        );

      }
    );


  /* ----------------------------------------------------------------------
   * AGENDA
   * -------------------------------------------------------------------- */

  const agenda =
    openTasks

      .filter(
        function (task) {

          const due =
            stripTime_(
              task.DueDate
            );


          if (!due) {
            return false;
          }


          return (
            due.getTime() <
              today.getTime() ||
            (
              due.getTime() >=
                gridStart.getTime() &&
              due.getTime() <=
                gridEnd.getTime()
            )
          );

        }
      )

      .sort(
        function (a, b) {

          const aDue =
            stripTime_(
              a.DueDate
            );


          const bDue =
            stripTime_(
              b.DueDate
            );


          if (
            aDue &&
            bDue &&
            aDue.getTime() !==
            bDue.getTime()
          ) {

            return (
              aDue.getTime() -
              bDue.getTime()
            );

          }


          return calendarTaskSort_(
            a,
            b
          );

        }
      )

      .slice(
        0,
        CALENDAR_LAYOUT.agendaMaxRows
      );


  return {

    tasks:
      tasks,

    anchor:
      anchor,

    monthStart:
      monthStart,

    monthEnd:
      monthEnd,

    gridStart:
      gridStart,

    gridEnd:
      gridEnd,

    today:
      today,

    tasksByDate:
      tasksByDate,

    scheduledThisMonth:
      scheduledThisMonth,

    dueToday:
      dueToday,

    completedThisMonth:
      completedThisMonth,

    overdue:
      overdue,

    unscheduled:
      unscheduled,

    agenda:
      agenda

  };
}


/* ==========================================================================
 * CANVAS
 * ========================================================================== */

function prepareCalendarCanvas_(
  sheet
) {

  const requiredRows =
    75;


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
    CALENDAR_LAYOUT.cols
  ) {

    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      CALENDAR_LAYOUT.cols -
      sheet.getMaxColumns()
    );

  }


  /* ----------------------------------------------------------------------
   * CLEAN OLD VIEW
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      1,
      1,
      Math.min(
        requiredRows,
        sheet.getMaxRows()
      ),
      CALENDAR_LAYOUT.cols
    )
    .breakApart();


  sheet.clear();


  sheet.setHiddenGridlines(
    true
  );


  sheet.setFrozenRows(
    CALENDAR_LAYOUT.weekdayRow
  );


  try {

    sheet.setTabColor(
      CALENDAR_THEME.primary
    );

  } catch (error) {

    console.warn(
      'Calendar tab color skipped:',
      error.message
    );

  }


  /* ----------------------------------------------------------------------
   * GLOBAL STYLE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      1,
      1,
      requiredRows,
      CALENDAR_LAYOUT.cols
    )
    .setBackground(
      CALENDAR_THEME.background
    )
    .setFontColor(
      CALENDAR_THEME.text
    )
    .setFontFamily(
      'Arial'
    )
    .setVerticalAlignment(
      'middle'
    );


  /* ----------------------------------------------------------------------
   * COLUMN WIDTHS
   *
   * 21 columns / 7 days / 3 cols each
   * -------------------------------------------------------------------- */

  for (
    let column = 1;
    column <= CALENDAR_LAYOUT.cols;
    column++
  ) {

    sheet.setColumnWidth(
      column,
      52
    );

  }


  /* ----------------------------------------------------------------------
   * TOP ROW HEIGHTS
   * -------------------------------------------------------------------- */

  sheet.setRowHeight(
    CALENDAR_LAYOUT.accentRow,
    5
  );


  sheet.setRowHeight(
    CALENDAR_LAYOUT.titleRow,
    46
  );


  sheet.setRowHeight(
    CALENDAR_LAYOUT.subtitleRow,
    26
  );


  sheet.setRowHeight(
    CALENDAR_LAYOUT.planningRow,
    28
  );


  sheet.setRowHeight(
    CALENDAR_LAYOUT.kpiStartRow,
    24
  );


  sheet.setRowHeight(
    CALENDAR_LAYOUT.kpiStartRow + 1,
    34
  );


  sheet.setRowHeight(
    CALENDAR_LAYOUT.kpiEndRow,
    24
  );


  sheet.setRowHeight(
    CALENDAR_LAYOUT.weekdayRow,
    31
  );
}


/* ==========================================================================
 * HEADER
 * ========================================================================== */

function writeCalendarHeader_(
  sheet,
  data
) {

  /* ----------------------------------------------------------------------
   * ACCENT
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      CALENDAR_LAYOUT.accentRow,
      1,
      1,
      CALENDAR_LAYOUT.cols
    )
    .setBackground(
      CALENDAR_THEME.primary
    );


  /* ----------------------------------------------------------------------
   * TITLE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      CALENDAR_LAYOUT.titleRow,
      1,
      1,
      12
    )
    .merge()
    .setValue(
      'Calendar'
    )
    .setFontSize(
      27
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      CALENDAR_THEME.text
    );


  const monthLabel =
    Utilities.formatDate(
      data.anchor,
      Session.getScriptTimeZone(),
      'MMMM yyyy'
    );


  sheet
    .getRange(
      CALENDAR_LAYOUT.titleRow,
      13,
      1,
      9
    )
    .merge()
    .setValue(
      monthLabel.toUpperCase()
    )
    .setFontSize(
      14
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      CALENDAR_THEME.primary
    )
    .setHorizontalAlignment(
      'right'
    );


  /* ----------------------------------------------------------------------
   * SUBTITLE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      CALENDAR_LAYOUT.subtitleRow,
      1,
      1,
      13
    )
    .merge()
    .setValue(
      'See deadlines clearly, protect your focus and keep your month realistic.'
    )
    .setFontSize(
      10
    )
    .setFontColor(
      CALENDAR_THEME.text2
    );


  sheet
    .getRange(
      CALENDAR_LAYOUT.subtitleRow,
      14,
      1,
      8
    )
    .merge()
    .setValue(
      '← Previous   •   Current   •   Next →'
    )
    .setFontSize(
      9
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      CALENDAR_THEME.muted
    )
    .setHorizontalAlignment(
      'right'
    );


  /* ----------------------------------------------------------------------
   * PLANNING HEALTH
   * -------------------------------------------------------------------- */

  const unscheduledCount =
    data.unscheduled.length;


  const planningTone =
    unscheduledCount > 0
      ? getCalendarTone_(
          'warning'
        )
      : getCalendarTone_(
          'success'
        );


  const planningText =
    unscheduledCount > 0
      ? (
          'PLANNING HEALTH  •  ' +
          unscheduledCount +
          ' open task' +
          (
            unscheduledCount === 1
              ? ''
              : 's'
          ) +
          ' without a due date'
        )
      : (
          'PLANNING HEALTH  •  All open tasks are scheduled'
        );


  sheet
    .getRange(
      CALENDAR_LAYOUT.planningRow,
      1,
      1,
      CALENDAR_LAYOUT.cols
    )
    .merge()
    .setValue(
      planningText
    )
    .setBackground(
      planningTone.soft
    )
    .setFontColor(
      planningTone.text
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      9
    )
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      CALENDAR_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );
}


/* ==========================================================================
 * KPI CARDS
 * ========================================================================== */

function writeCalendarKpis_(
  sheet,
  data
) {

  const cards = [

    {
      label:
        'SCHEDULED',

      value:
        data
          .scheduledThisMonth
          .length,

      sub:
        'Open tasks this month',

      tone:
        'primary'
    },


    {
      label:
        'DUE TODAY',

      value:
        data
          .dueToday
          .length,

      sub:
        data.dueToday.length > 0
          ? 'Needs attention today'
          : 'Nothing due today',

      tone:
        data.dueToday.length > 0
          ? 'warning'
          : 'success'
    },


    {
      label:
        'OVERDUE',

      value:
        data.overdue.length,

      sub:
        data.overdue.length > 0
          ? 'Resolve these first'
          : 'All clear',

      tone:
        data.overdue.length > 0
          ? 'danger'
          : 'success'
    },


    {
      label:
        'COMPLETED',

      value:
        data
          .completedThisMonth
          .length,

      sub:
        'Finished this month',

      tone:
        'success'
    }

  ];


  const blocks =
    buildCalendarMetricBlocks_(
      CALENDAR_LAYOUT.cols,
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
        getCalendarTone_(
          card.tone
        );


      /* ------------------------------------------------------------------
       * CARD
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          CALENDAR_LAYOUT.kpiStartRow,
          block.start,
          3,
          width
        )
        .setBackground(
          CALENDAR_THEME.surface
        )
        .setBorder(
          true,
          true,
          true,
          true,
          false,
          false,
          CALENDAR_THEME.border,
          SpreadsheetApp
            .BorderStyle
            .SOLID
        );


      /* ------------------------------------------------------------------
       * LABEL
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          CALENDAR_LAYOUT.kpiStartRow,
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
          CALENDAR_LAYOUT.kpiStartRow + 1,
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
          CALENDAR_LAYOUT.kpiEndRow,
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
          CALENDAR_THEME.text2
        );

    }
  );
}


/* ==========================================================================
 * KPI BLOCKS
 * ========================================================================== */

function buildCalendarMetricBlocks_(
  totalColumns,
  cardCount,
  gap
) {

  const usable =
    totalColumns -
    (
      (
        cardCount - 1
      ) *
      gap
    );


  const base =
    Math.floor(
      usable /
      cardCount
    );


  let extra =
    usable %
    cardCount;


  let column =
    1;


  const blocks = [];


  for (
    let index = 0;
    index < cardCount;
    index++
  ) {

    const width =
      base +
      (
        extra > 0
          ? 1
          : 0
      );


    if (
      extra > 0
    ) {
      extra--;
    }


    blocks.push({

      start:
        column,

      end:
        column +
        width -
        1

    });


    column +=
      width +
      gap;

  }


  return blocks;
}


/* ==========================================================================
 * WEEKDAYS
 * ========================================================================== */

function writeCalendarWeekdays_(
  sheet
) {

  const weekdays = [

    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY'

  ];


  weekdays.forEach(
    function (
      day,
      index
    ) {

      const startColumn =
        1 +
        (
          index *
          CALENDAR_LAYOUT.dayCols
        );


      const isWeekend =
        index >= 5;


      sheet
        .getRange(
          CALENDAR_LAYOUT.weekdayRow,
          startColumn,
          1,
          CALENDAR_LAYOUT.dayCols
        )
        .merge()
        .setValue(
          day
        )
        .setBackground(
          isWeekend
            ? '#F1F5F9'
            : CALENDAR_THEME.surface2
        )
        .setFontColor(
          CALENDAR_THEME.text2
        )
        .setFontWeight(
          'bold'
        )
        .setFontSize(
          8
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
          CALENDAR_THEME.border,
          SpreadsheetApp
            .BorderStyle
            .SOLID
        );

    }
  );
}


/* ==========================================================================
 * MONTH GRID
 * ========================================================================== */

function writeCalendarGrid_(
  sheet,
  data
) {

  for (
    let week = 0;
    week < CALENDAR_LAYOUT.weeks;
    week++
  ) {

    for (
      let day = 0;
      day < 7;
      day++
    ) {

      const offset =
        (
          week *
          7
        ) +
        day;


      const date =
        new Date(
          data.gridStart.getFullYear(),
          data.gridStart.getMonth(),
          data.gridStart.getDate() +
          offset
        );


      const startRow =
        CALENDAR_LAYOUT.calendarStartRow +
        (
          week *
          CALENDAR_LAYOUT.dayRows
        );


      const startColumn =
        1 +
        (
          day *
          CALENDAR_LAYOUT.dayCols
        );


      const key =
        calendarDateKey_(
          date
        );


      const tasks =
        data.tasksByDate[
          key
        ] || [];


      writeCalendarDayCard_(
        sheet,
        date,
        tasks,
        startRow,
        startColumn,
        data
      );

    }

  }
}


/* ==========================================================================
 * DAY CARD
 * ========================================================================== */

function writeCalendarDayCard_(
  sheet,
  date,
  tasks,
  startRow,
  startColumn,
  data
) {

  const isCurrentMonth =
    (
      date.getMonth() ===
        data.anchor.getMonth() &&
      date.getFullYear() ===
        data.anchor.getFullYear()
    );


  const isToday =
    calendarSameDay_(
      date,
      data.today
    );


  const isWeekend =
    (
      date.getDay() === 0 ||
      date.getDay() === 6
    );


  const openTasks =
    tasks.filter(
      function (task) {

        return (
          String(
            task.Status || ''
          ) !== 'Completed'
        );

      }
    );


  const hasOverdue =
    (
      date.getTime() <
        data.today.getTime() &&
      openTasks.length >
        0
    );


  let background =
    CALENDAR_THEME.surface;


  if (!isCurrentMonth) {

    background =
      CALENDAR_THEME.outsideMonth;

  } else if (isWeekend) {

    background =
      CALENDAR_THEME.weekend;

  }


  /* ----------------------------------------------------------------------
   * ENTIRE DAY BACKGROUND
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow,
      startColumn,
      CALENDAR_LAYOUT.dayRows,
      CALENDAR_LAYOUT.dayCols
    )
    .setBackground(
      background
    );


  /* ----------------------------------------------------------------------
   * DATE HEADER
   * -------------------------------------------------------------------- */

  let dateLabel =
    String(
      date.getDate()
    );


  if (
    isToday
  ) {

    dateLabel +=
      '   TODAY';

  }


  const headerRange =
    sheet.getRange(
      startRow,
      startColumn,
      1,
      CALENDAR_LAYOUT.dayCols
    );


  headerRange
    .merge()
    .setValue(
      dateLabel
    )
    .setBackground(
      isToday
        ? CALENDAR_THEME.primary
        : (
            hasOverdue
              ? CALENDAR_THEME.dangerSoft
              : background
          )
    )
    .setFontColor(
      isToday
        ? '#FFFFFF'
        : (
            hasOverdue
              ? CALENDAR_THEME.danger
              : (
                  isCurrentMonth
                    ? CALENDAR_THEME.text
                    : CALENDAR_THEME.muted
                )
          )
    )
    .setFontSize(
      9
    )
    .setFontWeight(
      'bold'
    )
    .setHorizontalAlignment(
      'left'
    )
    .setBorder(
      true,
      true,
      false,
      true,
      false,
      false,
      isToday
        ? CALENDAR_THEME.primary
        : CALENDAR_THEME.border,
      isToday
        ? SpreadsheetApp
            .BorderStyle
            .SOLID_MEDIUM
        : SpreadsheetApp
            .BorderStyle
            .SOLID
    );


  /* ----------------------------------------------------------------------
   * TASK ROWS
   * -------------------------------------------------------------------- */

  const visibleTasks =
    tasks.slice(
      0,
      CALENDAR_LAYOUT.maxTasksPerDay
    );


  for (
    let taskIndex = 0;
    taskIndex <
      CALENDAR_LAYOUT.maxTasksPerDay;
    taskIndex++
  ) {

    const row =
      startRow +
      1 +
      taskIndex;


    const rowRange =
      sheet.getRange(
        row,
        startColumn,
        1,
        CALENDAR_LAYOUT.dayCols
      );


    rowRange.merge();


    const task =
      visibleTasks[
        taskIndex
      ];


    if (!task) {

      rowRange
        .setValue(
          ''
        )
        .setBackground(
          background
        )
        .setBorder(
          false,
          true,
          false,
          true,
          false,
          false,
          isToday
            ? CALENDAR_THEME.primary
            : CALENDAR_THEME.border,
          SpreadsheetApp
            .BorderStyle
            .SOLID
        );


      continue;
    }


    const tone =
      getCalendarTaskTone_(
        task,
        data.today
      );


    const prefix =
      getCalendarTaskPrefix_(
        task,
        data.today
      );


    rowRange
      .setValue(
        prefix +
        ' ' +
        String(
          task.TaskName ||
          'Untitled task'
        )
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
        tone.bold
          ? 'bold'
          : 'normal'
      )
      .setWrap(
        false
      )
      .setBorder(
        false,
        true,
        false,
        true,
        false,
        false,
        isToday
          ? CALENDAR_THEME.primary
          : CALENDAR_THEME.border,
        SpreadsheetApp
          .BorderStyle
          .SOLID
      )
      .setNote(
        'TASK_ID:' +
        String(
          task.TaskId || ''
        )
      );

  }


  /* ----------------------------------------------------------------------
   * DAY FOOTER
   * -------------------------------------------------------------------- */

  const footerRow =
    startRow +
    CALENDAR_LAYOUT.dayRows -
    1;


  const hiddenCount =
    Math.max(
      0,
      tasks.length -
      visibleTasks.length
    );


  let footerText =
    'No tasks';


  if (
    tasks.length === 1
  ) {

    footerText =
      '1 task';

  } else if (
    tasks.length > 1
  ) {

    footerText =
      tasks.length +
      ' tasks';

  }


  if (
    hiddenCount > 0
  ) {

    footerText +=
      '  •  +' +
      hiddenCount +
      ' more';

  }


  sheet
    .getRange(
      footerRow,
      startColumn,
      1,
      CALENDAR_LAYOUT.dayCols
    )
    .merge()
    .setValue(
      footerText
    )
    .setBackground(
      background
    )
    .setFontColor(
      tasks.length > 0
        ? CALENDAR_THEME.text2
        : CALENDAR_THEME.muted
    )
    .setFontSize(
      7
    )
    .setFontWeight(
      tasks.length > 0
        ? 'bold'
        : 'normal'
    )
    .setHorizontalAlignment(
      'right'
    )
    .setBorder(
      false,
      true,
      true,
      true,
      false,
      false,
      isToday
        ? CALENDAR_THEME.primary
        : CALENDAR_THEME.border,
      isToday
        ? SpreadsheetApp
            .BorderStyle
            .SOLID_MEDIUM
        : SpreadsheetApp
            .BorderStyle
            .SOLID
    );


  /* ----------------------------------------------------------------------
   * ROW HEIGHT
   * -------------------------------------------------------------------- */

  sheet.setRowHeight(
    startRow,
    25
  );


  for (
    let offset = 1;
    offset <= 4;
    offset++
  ) {

    sheet.setRowHeight(
      startRow +
      offset,
      23
    );

  }


  sheet.setRowHeight(
    footerRow,
    20
  );
}


/* ==========================================================================
 * TASK ROW TONE
 * ========================================================================== */

function getCalendarTaskTone_(
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

      text:
        CALENDAR_THEME.success,

      soft:
        CALENDAR_THEME.successSoft,

      bold:
        false

    };

  }


  const due =
    stripTime_(
      task.DueDate
    );


  if (
    due &&
    due.getTime() <
      today.getTime()
  ) {

    return {

      text:
        CALENDAR_THEME.danger,

      soft:
        CALENDAR_THEME.dangerSoft,

      bold:
        true

    };

  }


  if (
    task.Priority ===
      'Critical' ||
    task.Priority ===
      'Urgent'
  ) {

    return {

      text:
        CALENDAR_THEME.danger,

      soft:
        CALENDAR_THEME.dangerSoft,

      bold:
        true

    };

  }


  if (
    task.Priority ===
    'High'
  ) {

    return {

      text:
        '#B45309',

      soft:
        CALENDAR_THEME.warningSoft,

      bold:
        true

    };

  }


  return {

    text:
      CALENDAR_THEME.text2,

    soft:
      CALENDAR_THEME.surface,

    bold:
      false

  };
}


function getCalendarTaskPrefix_(
  task,
  today
) {

  if (
    String(
      task.Status || ''
    ) ===
    'Completed'
  ) {

    return '✓';

  }


  const due =
    stripTime_(
      task.DueDate
    );


  if (
    due &&
    due.getTime() <
      today.getTime()
  ) {

    return '!';

  }


  if (
    task.Priority ===
      'Critical' ||
    task.Priority ===
      'Urgent'
  ) {

    return '!';

  }


  if (
    task.Priority ===
    'High'
  ) {

    return '◆';

  }


  return '•';
}


/* ==========================================================================
 * AGENDA
 * ========================================================================== */

function writeCalendarAgenda_(
  sheet,
  data,
  startRow
) {

  /* ----------------------------------------------------------------------
   * SECTION HEADER
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow,
      1,
      1,
      13
    )
    .merge()
    .setValue(
      'Upcoming & Overdue'
    )
    .setFontSize(
      15
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      CALENDAR_THEME.text
    );


  sheet
    .getRange(
      startRow,
      14,
      1,
      8
    )
    .merge()
    .setValue(
      'Select a task → Open Selected Task'
    )
    .setFontSize(
      8
    )
    .setFontColor(
      CALENDAR_THEME.muted
    )
    .setHorizontalAlignment(
      'right'
    );


  const headerRow =
    startRow + 1;


  /* ----------------------------------------------------------------------
   * COLUMN HEADERS
   * -------------------------------------------------------------------- */

  writeCalendarAgendaHeaderCell_(
    sheet,
    headerRow,
    1,
    8,
    'TASK'
  );


  writeCalendarAgendaHeaderCell_(
    sheet,
    headerRow,
    9,
    3,
    'AREA'
  );


  writeCalendarAgendaHeaderCell_(
    sheet,
    headerRow,
    12,
    3,
    'STATUS'
  );


  writeCalendarAgendaHeaderCell_(
    sheet,
    headerRow,
    15,
    3,
    'DUE'
  );


  writeCalendarAgendaHeaderCell_(
    sheet,
    headerRow,
    18,
    2,
    'PRIORITY'
  );


  writeCalendarAgendaHeaderCell_(
    sheet,
    headerRow,
    20,
    2,
    'SCORE'
  );


  sheet
    .getRange(
      headerRow,
      1,
      1,
      CALENDAR_LAYOUT.cols
    )
    .setBackground(
      '#172033'
    )
    .setFontColor(
      '#F8FAFC'
    );


  sheet.setRowHeight(
    headerRow,
    29
  );


  /* ----------------------------------------------------------------------
   * EMPTY
   * -------------------------------------------------------------------- */

  if (
    data.agenda.length ===
    0
  ) {

    sheet
      .getRange(
        headerRow + 1,
        1,
        2,
        CALENDAR_LAYOUT.cols
      )
      .merge()
      .setValue(
        'Nothing overdue or upcoming in this calendar window.'
      )
      .setBackground(
        CALENDAR_THEME.successSoft
      )
      .setFontColor(
        CALENDAR_THEME.success
      )
      .setFontSize(
        10
      )
      .setFontWeight(
        'bold'
      )
      .setHorizontalAlignment(
        'center'
      );


    return (
      headerRow + 2
    );
  }


  /* ----------------------------------------------------------------------
   * TASK ROWS
   * -------------------------------------------------------------------- */

  data.agenda.forEach(
    function (
      task,
      index
    ) {

      const row =
        headerRow +
        1 +
        index;


      writeCalendarAgendaRow_(
        sheet,
        task,
        row,
        index,
        data.today
      );

    }
  );


  return (
    headerRow +
    data.agenda.length
  );
}


/* ==========================================================================
 * AGENDA HEADER CELL
 * ========================================================================== */

function writeCalendarAgendaHeaderCell_(
  sheet,
  row,
  column,
  width,
  text
) {

  sheet
    .getRange(
      row,
      column,
      1,
      width
    )
    .merge()
    .setValue(
      text
    )
    .setFontSize(
      8
    )
    .setFontWeight(
      'bold'
    )
    .setHorizontalAlignment(
      'left'
    );
}


/* ==========================================================================
 * AGENDA ROW
 * ========================================================================== */

function writeCalendarAgendaRow_(
  sheet,
  task,
  row,
  index,
  today
) {

  const background =
    index % 2 === 0
      ? CALENDAR_THEME.surface
      : CALENDAR_THEME.surfaceAlt;


  const taskId =
    String(
      task.TaskId || ''
    );


  const note =
    'TASK_ID:' +
    taskId;


  const score =
    Number(
      task.SmartScore
    ) || 0;


  const dueTone =
    getCalendarDueTone_(
      task.DueDate,
      today
    );


  const priorityTone =
    getCalendarPriorityTone_(
      task.Priority
    );


  const statusTone =
    getCalendarStatusTone_(
      task.Status
    );


  const scoreTone =
    getCalendarScoreTone_(
      score
    );


  /* ----------------------------------------------------------------------
   * FULL ROW
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      row,
      1,
      1,
      CALENDAR_LAYOUT.cols
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
      CALENDAR_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );


  /* ----------------------------------------------------------------------
   * TASK
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      row,
      1,
      1,
      8
    )
    .merge()
    .setValue(
      task.TaskName ||
      'Untitled task'
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      9
    )
    .setFontColor(
      CALENDAR_THEME.text
    )
    .setNote(
      note
    );


  /* ----------------------------------------------------------------------
   * AREA
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      row,
      9,
      1,
      3
    )
    .merge()
    .setValue(
      task.Area ||
      'Personal'
    )
    .setFontSize(
      8
    )
    .setFontColor(
      CALENDAR_THEME.text2
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
      12,
      1,
      3
    )
    .merge()
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
    )
    .setNote(
      note
    );


  /* ----------------------------------------------------------------------
   * DUE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      row,
      15,
      1,
      3
    )
    .merge()
    .setValue(
      calendarDueLabel_(
        task.DueDate,
        today
      )
    )
    .setBackground(
      dueTone.soft
    )
    .setFontColor(
      dueTone.text
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
    .setNote(
      note
    );


  /* ----------------------------------------------------------------------
   * PRIORITY
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      row,
      18,
      1,
      2
    )
    .merge()
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
    )
    .setNote(
      note
    );


  /* ----------------------------------------------------------------------
   * SCORE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      row,
      20,
      1,
      2
    )
    .merge()
    .setValue(
      score ||
      '—'
    )
    .setBackground(
      scoreTone.soft
    )
    .setFontColor(
      scoreTone.text
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
    .setNote(
      note
    );


  sheet.setRowHeight(
    row,
    35
  );
}


/* ==========================================================================
 * OPEN SELECTED TASK
 * ========================================================================== */

function openSelectedCalendarTask_() {

  const ui =
    SpreadsheetApp.getUi();


  const sheet =
    SpreadsheetApp
      .getActive()
      .getActiveSheet();


  if (
    !sheet ||
    sheet.getName() !==
      SHEETS.CALENDAR
  ) {

    ui.alert(
      'Open Task',
      'Open Calendar and select a task first.',
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


  /*
   * Merged range / neighbouring cell fallback.
   */
  if (!note) {

    note =
      findCalendarTaskNoteNearSelection_(
        sheet,
        range.getRow(),
        range.getColumn()
      );

  }


  if (
    note.indexOf(
      'TASK_ID:'
    ) === 0
  ) {

    const taskId =
      note
        .substring(
          'TASK_ID:'.length
        )
        .trim();


    if (
      taskId
    ) {

      showTaskDetails_(
        taskId
      );

    }


    return;
  }


  ui.alert(
    'Open Task',
    'Select a task inside the calendar or the Upcoming & Overdue list.',
    ui.ButtonSet.OK
  );
}


/* ==========================================================================
 * FIND TASK NOTE
 * ========================================================================== */

function findCalendarTaskNoteNearSelection_(
  sheet,
  row,
  column
) {

  const startRow =
    Math.max(
      1,
      row - 2
    );


  const endRow =
    Math.min(
      sheet.getMaxRows(),
      row + 2
    );


  const startColumn =
    Math.max(
      1,
      column - 2
    );


  const endColumn =
    Math.min(
      CALENDAR_LAYOUT.cols,
      column + 2
    );


  for (
    let currentRow =
      startRow;
    currentRow <=
      endRow;
    currentRow++
  ) {

    for (
      let currentColumn =
        startColumn;
      currentColumn <=
        endColumn;
      currentColumn++
    ) {

      const note =
        String(
          sheet
            .getRange(
              currentRow,
              currentColumn
            )
            .getNote() ||
          ''
        ).trim();


      if (
        note.indexOf(
          'TASK_ID:'
        ) === 0
      ) {

        return note;

      }

    }

  }


  return '';
}


/* ==========================================================================
 * FOOTER
 * ========================================================================== */

function writeCalendarFooter_(
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
      CALENDAR_LAYOUT.cols
    )
    .merge()
    .setValue(
      'Select any task → ⚡ Smart Task → Task Actions → Open Selected Task' +
      '   •   Refreshed ' +
      refreshTime
    )
    .setFontSize(
      8
    )
    .setFontColor(
      CALENDAR_THEME.muted
    )
    .setHorizontalAlignment(
      'right'
    );
}


/* ==========================================================================
 * DATE HELPERS
 * ========================================================================== */

function getCalendarGridStart_(
  monthStart
) {

  const date =
    new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      monthStart.getDate()
    );


  const day =
    date.getDay();


  const difference =
    day === 0
      ? -6
      : 1 - day;


  date.setDate(
    date.getDate() +
    difference
  );


  return date;
}


function calendarDateKey_(
  date
) {

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd'
  );
}


function calendarSameDay_(
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


function calendarDateInRange_(
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


/* ==========================================================================
 * TASK SORT
 * ========================================================================== */

function calendarTaskSort_(
  a,
  b
) {

  /*
   * Open before completed.
   */
  const aCompleted =
    String(
      a.Status || ''
    ) === 'Completed';


  const bCompleted =
    String(
      b.Status || ''
    ) === 'Completed';


  if (
    aCompleted !==
    bCompleted
  ) {

    return aCompleted
      ? 1
      : -1;

  }


  /*
   * Priority.
   */
  const priorityDifference =
    calendarPriorityWeight_(
      b.Priority
    ) -
    calendarPriorityWeight_(
      a.Priority
    );


  if (
    priorityDifference !==
    0
  ) {

    return priorityDifference;

  }


  /*
   * SmartScore.
   */
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


function calendarPriorityWeight_(
  priority
) {

  switch (
    String(
      priority || ''
    )
  ) {

    case 'Critical':
      return 5;


    case 'Urgent':
      return 4;


    case 'High':
      return 3;


    case 'Medium':
      return 2;


    case 'Low':
      return 1;


    default:
      return 0;

  }
}


/* ==========================================================================
 * GENERAL TONES
 * ========================================================================== */

function getCalendarTone_(
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
          CALENDAR_THEME.danger,

        soft:
          CALENDAR_THEME.dangerSoft

      };


    case 'warning':

      return {

        text:
          CALENDAR_THEME.warning,

        soft:
          CALENDAR_THEME.warningSoft

      };


    case 'success':

      return {

        text:
          CALENDAR_THEME.success,

        soft:
          CALENDAR_THEME.successSoft

      };


    case 'info':

      return {

        text:
          CALENDAR_THEME.info,

        soft:
          CALENDAR_THEME.infoSoft

      };


    default:

      return {

        text:
          CALENDAR_THEME.primary,

        soft:
          CALENDAR_THEME.primaryLight

      };

  }
}


/* ==========================================================================
 * STATUS TONE
 * ========================================================================== */

function getCalendarStatusTone_(
  status
) {

  switch (
    String(
      status || ''
    )
  ) {

    case 'Completed':

      return getCalendarTone_(
        'success'
      );


    case 'Waiting':

      return getCalendarTone_(
        'warning'
      );


    case 'In Progress':

      return getCalendarTone_(
        'primary'
      );


    case 'To Do':

      return {

        text:
          CALENDAR_THEME.primary,

        soft:
          CALENDAR_THEME.primaryLight

      };


    case 'Inbox':

      return getCalendarTone_(
        'info'
      );


    default:

      return {

        text:
          CALENDAR_THEME.text2,

        soft:
          CALENDAR_THEME.surface2

      };

  }
}


/* ==========================================================================
 * PRIORITY TONE
 * ========================================================================== */

function getCalendarPriorityTone_(
  priority
) {

  switch (
    String(
      priority || ''
    )
  ) {

    case 'Critical':
    case 'Urgent':

      return getCalendarTone_(
        'danger'
      );


    case 'High':

      return getCalendarTone_(
        'warning'
      );


    case 'Low':

      return getCalendarTone_(
        'success'
      );


    default:

      return getCalendarTone_(
        'primary'
      );

  }
}


/* ==========================================================================
 * SCORE TONE
 * ========================================================================== */

function getCalendarScoreTone_(
  score
) {

  score =
    Number(
      score
    ) || 0;


  if (
    score >= 85
  ) {

    return getCalendarTone_(
      'danger'
    );

  }


  if (
    score >= 65
  ) {

    return getCalendarTone_(
      'warning'
    );

  }


  if (
    score >= 40
  ) {

    return getCalendarTone_(
      'primary'
    );

  }


  return getCalendarTone_(
    'success'
  );
}


/* ==========================================================================
 * DUE TONE
 * ========================================================================== */

function getCalendarDueTone_(
  dueDate,
  today
) {

  const due =
    stripTime_(
      dueDate
    );


  if (!due) {

    return {

      text:
        CALENDAR_THEME.muted,

      soft:
        CALENDAR_THEME.surface2

    };

  }


  const difference =
    daysBetween_(
      today,
      due
    );


  if (
    difference <
    0
  ) {

    return getCalendarTone_(
      'danger'
    );

  }


  if (
    difference <=
    1
  ) {

    return getCalendarTone_(
      'warning'
    );

  }


  return getCalendarTone_(
    'success'
  );
}


/* ==========================================================================
 * DUE LABEL
 * ========================================================================== */

function calendarDueLabel_(
  dueDate,
  today
) {

  const due =
    stripTime_(
      dueDate
    );


  if (!due) {

    return 'No date';

  }


  const difference =
    daysBetween_(
      today,
      due
    );


  if (
    difference <
    0
  ) {

    return 'Overdue';

  }


  if (
    difference ===
    0
  ) {

    return 'Today';

  }


  if (
    difference ===
    1
  ) {

    return 'Tomorrow';

  }


  return Utilities.formatDate(
    due,
    Session.getScriptTimeZone(),
    'dd MMM'
  );
}