/**
 * 11_Kanban.gs
 * -----------------------------------------------------------------------
 * FRAME 08 — KANBAN
 *
 * Premium personal productivity Kanban.
 *
 * IMPORTANT:
 * - Tasks remains the single source of truth.
 * - Kanban is presentation only.
 * - No task business data is duplicated here.
 * - Task identity always uses TaskId.
 *
 * Lanes:
 * - Inbox
 * - To Do
 * - In Progress
 * - Waiting
 * - Completed
 * -----------------------------------------------------------------------
 */


/* ==========================================================================
 * CONFIG
 * ========================================================================== */

const KANBAN_LAYOUT = {

  accentRow:
    1,

  titleRow:
    2,

  subtitleRow:
    3,

  focusRow:
    4,


  kpiStartRow:
    6,

  kpiEndRow:
    8,


  laneHeaderRow:
    11,

  laneSubtitleRow:
    12,

  firstCardRow:
    14,


  laneWidth:
    3,

  laneGapCols:
    1,


  cardRows:
    4,

  cardGapRows:
    1,


  maxCardsPerLane:
    7,


  inProgressWipLimit:
    3
};


const KANBAN_THEME = {

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

  laneBackground:
    '#F4F6F9',


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
    '#EFF6FF'
};


/* ==========================================================================
 * NAVIGATION
 * ========================================================================== */

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
      'Kanban open failed:',
      getMenuErrorMessage_(
        error
      )
    );

  }
}


/* ==========================================================================
 * MAIN RENDER
 * ========================================================================== */

function renderKanban_() {

  const sheet =
    getOrCreateSheet_(
      SHEETS.KANBAN
    );


  const data =
    computeKanbanData_();


  prepareKanbanCanvas_(
    sheet,
    data.statuses.length
  );


  writeKanbanHeader_(
    sheet,
    data
  );


  writeKanbanKpis_(
    sheet,
    data
  );


  writeKanbanLanes_(
    sheet,
    data
  );


  writeKanbanFooter_(
    sheet,
    data
  );


  SpreadsheetApp.flush();
}


/* ==========================================================================
 * DATA
 * ========================================================================== */

function computeKanbanData_() {

  const tasks =
    getAllTasks_();


  const statuses =
    getKanbanStatuses_();


  const grouped = {};


  statuses.forEach(
    function (status) {

      grouped[
        status
      ] = [];

    }
  );


  /* ----------------------------------------------------------------------
   * GROUP
   * -------------------------------------------------------------------- */

  tasks.forEach(
    function (task) {

      let status =
        String(
          task.Status ||
          'Inbox'
        ).trim();


      if (!status) {
        status =
          'Inbox';
      }


      /*
       * Unknown status:
       * keep task visible by falling back to Inbox.
       */
      if (
        !grouped[
          status
        ]
      ) {

        if (
          grouped.Inbox
        ) {

          grouped
            .Inbox
            .push(
              task
            );

        }

        return;
      }


      grouped[
        status
      ].push(
        task
      );

    }
  );


  /* ----------------------------------------------------------------------
   * SORT
   * -------------------------------------------------------------------- */

  statuses.forEach(
    function (status) {

      grouped[
        status
      ].sort(
        function (a, b) {

          /*
           * Completed:
           * newest completion first.
           */
          if (
            status ===
            'Completed'
          ) {

            return (
              kanbanDateValue_(
                b.CompletedDate
              ) -
              kanbanDateValue_(
                a.CompletedDate
              )
            );

          }


          /*
           * Highest SmartScore first.
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
           * Earlier deadline first.
           */
          return (
            kanbanDueSortValue_(
              a.DueDate
            ) -
            kanbanDueSortValue_(
              b.DueDate
            )
          );

        }
      );

    }
  );


  /* ----------------------------------------------------------------------
   * COUNTS
   * -------------------------------------------------------------------- */

  const counts = {};


  statuses.forEach(
    function (status) {

      counts[
        status
      ] =
        grouped[
          status
        ].length;

    }
  );


  const today =
    stripTime_(
      now_()
    );


  const openTasks =
    tasks.filter(
      function (task) {

        return (
          String(
            task.Status || ''
          ) !==
          'Completed'
        );

      }
    );


  const completedTasks =
    tasks.filter(
      function (task) {

        return (
          String(
            task.Status || ''
          ) ===
          'Completed'
        );

      }
    );


  const dueTodayTasks =
    openTasks.filter(
      function (task) {

        const difference =
          daysBetween_(
            today,
            task.DueDate
          );


        return (
          difference ===
          0
        );

      }
    );


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


  const focusTask =
    openTasks
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

    statuses:
      statuses,

    grouped:
      grouped,

    counts:
      counts,

    today:
      today,

    openCount:
      openTasks.length,

    completedCount:
      completedTasks.length,

    dueTodayCount:
      dueTodayTasks.length,

    overdueCount:
      overdueTasks.length,

    focusTask:
      focusTask

  };
}


/* ==========================================================================
 * STATUSES
 * ========================================================================== */

function getKanbanStatuses_() {

  if (
    typeof LOOKUP_LISTS !==
      'undefined' &&
    LOOKUP_LISTS &&
    Array.isArray(
      LOOKUP_LISTS.Status
    ) &&
    LOOKUP_LISTS.Status.length
  ) {

    return LOOKUP_LISTS
      .Status
      .slice();

  }


  return [
    'Inbox',
    'To Do',
    'In Progress',
    'Waiting',
    'Completed'
  ];
}


/* ==========================================================================
 * LAYOUT HELPERS
 * ========================================================================== */

function getKanbanTotalColumns_(
  statusCount
) {

  return (
    (
      statusCount *
      KANBAN_LAYOUT.laneWidth
    ) +
    (
      Math.max(
        0,
        statusCount - 1
      ) *
      KANBAN_LAYOUT.laneGapCols
    )
  );
}


function getKanbanLaneStartColumn_(
  laneIndex
) {

  return (
    1 +
    (
      laneIndex *
      (
        KANBAN_LAYOUT.laneWidth +
        KANBAN_LAYOUT.laneGapCols
      )
    )
  );
}


/* ==========================================================================
 * CANVAS
 * ========================================================================== */

function prepareKanbanCanvas_(
  sheet,
  statusCount
) {

  const totalColumns =
    getKanbanTotalColumns_(
      statusCount
    );


  const requiredRows =
    KANBAN_LAYOUT.firstCardRow +
    (
      KANBAN_LAYOUT.maxCardsPerLane *
      (
        KANBAN_LAYOUT.cardRows +
        KANBAN_LAYOUT.cardGapRows
      )
    ) +
    10;


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
   * REMOVE OLD MERGES
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
    KANBAN_LAYOUT.laneSubtitleRow
  );


  try {

    sheet.setTabColor(
      KANBAN_THEME.primary
    );

  } catch (error) {

    console.warn(
      'Kanban tab color skipped:',
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
      requiredRows,
      totalColumns
    )
    .setBackground(
      KANBAN_THEME.background
    )
    .setFontColor(
      KANBAN_THEME.text
    )
    .setVerticalAlignment(
      'middle'
    )
    .setFontFamily(
      'Arial'
    );


  /* ----------------------------------------------------------------------
   * COLUMN WIDTHS
   * -------------------------------------------------------------------- */

  for (
    let laneIndex =
      0;
    laneIndex <
      statusCount;
    laneIndex++
  ) {

    const startColumn =
      getKanbanLaneStartColumn_(
        laneIndex
      );


    for (
      let offset =
        0;
      offset <
        KANBAN_LAYOUT.laneWidth;
      offset++
    ) {

      sheet.setColumnWidth(
        startColumn +
        offset,
        108
      );

    }


    /*
     * Spacer between lanes.
     */
    if (
      laneIndex <
      statusCount - 1
    ) {

      sheet.setColumnWidth(
        startColumn +
        KANBAN_LAYOUT.laneWidth,
        18
      );

    }

  }


  /* ----------------------------------------------------------------------
   * ROW HEIGHTS
   * -------------------------------------------------------------------- */

  sheet.setRowHeight(
    KANBAN_LAYOUT.accentRow,
    5
  );


  sheet.setRowHeight(
    KANBAN_LAYOUT.titleRow,
    43
  );


  sheet.setRowHeight(
    KANBAN_LAYOUT.subtitleRow,
    25
  );


  sheet.setRowHeight(
    KANBAN_LAYOUT.focusRow,
    27
  );


  sheet.setRowHeight(
    KANBAN_LAYOUT.kpiStartRow,
    24
  );


  sheet.setRowHeight(
    KANBAN_LAYOUT.kpiStartRow + 1,
    31
  );


  sheet.setRowHeight(
    KANBAN_LAYOUT.kpiEndRow,
    24
  );


  sheet.setRowHeight(
    KANBAN_LAYOUT.laneHeaderRow,
    36
  );


  sheet.setRowHeight(
    KANBAN_LAYOUT.laneSubtitleRow,
    25
  );
}


/* ==========================================================================
 * HEADER
 * ========================================================================== */

function writeKanbanHeader_(
  sheet,
  data
) {

  const totalColumns =
    getKanbanTotalColumns_(
      data.statuses.length
    );


  /* ----------------------------------------------------------------------
   * ACCENT
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      KANBAN_LAYOUT.accentRow,
      1,
      1,
      totalColumns
    )
    .setBackground(
      KANBAN_THEME.primary
    );


  /* ----------------------------------------------------------------------
   * TITLE
   * -------------------------------------------------------------------- */

  const titleColumns =
    Math.max(
      3,
      Math.floor(
        totalColumns *
        0.62
      )
    );


  sheet
    .getRange(
      KANBAN_LAYOUT.titleRow,
      1,
      1,
      titleColumns
    )
    .merge()
    .setValue(
      'Kanban'
    )
    .setFontSize(
      26
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      KANBAN_THEME.text
    );


  /* ----------------------------------------------------------------------
   * DATE
   * -------------------------------------------------------------------- */

  const dateLabel =
    Utilities.formatDate(
      now_(),
      Session.getScriptTimeZone(),
      'EEE, dd MMM yyyy'
    );


  sheet
    .getRange(
      KANBAN_LAYOUT.titleRow,
      titleColumns + 1,
      1,
      totalColumns -
      titleColumns
    )
    .merge()
    .setValue(
      dateLabel
    )
    .setFontSize(
      10
    )
    .setFontWeight(
      'bold'
    )
    .setFontColor(
      KANBAN_THEME.text2
    )
    .setHorizontalAlignment(
      'right'
    );


  /* ----------------------------------------------------------------------
   * SUBTITLE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      KANBAN_LAYOUT.subtitleRow,
      1,
      1,
      totalColumns
    )
    .merge()
    .setValue(
      'Move intentionally. Keep active work small and finish before starting more.'
    )
    .setFontSize(
      11
    )
    .setFontColor(
      KANBAN_THEME.text2
    );


  /* ----------------------------------------------------------------------
   * TOP FOCUS
   * -------------------------------------------------------------------- */

  let focusText =
    'No open tasks right now.';


  if (
    data.focusTask
  ) {

    focusText =
      'TOP FOCUS  •  ' +
      (
        data.focusTask.TaskName ||
        'Untitled task'
      ) +
      '  •  Score ' +
      (
        Number(
          data.focusTask.SmartScore
        ) || 0
      );


    if (
      data.focusTask.RecommendedAction
    ) {

      focusText +=
        '  •  ' +
        data.focusTask.RecommendedAction;

    }

  }


  sheet
    .getRange(
      KANBAN_LAYOUT.focusRow,
      1,
      1,
      totalColumns
    )
    .merge()
    .setValue(
      focusText
    )
    .setBackground(
      data.focusTask
        ? KANBAN_THEME.primaryLight
        : KANBAN_THEME.successSoft
    )
    .setFontColor(
      data.focusTask
        ? KANBAN_THEME.primaryHover
        : KANBAN_THEME.success
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
      KANBAN_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );
}


/* ==========================================================================
 * KPI CARDS
 * ========================================================================== */

function writeKanbanKpis_(
  sheet,
  data
) {

  const totalColumns =
    getKanbanTotalColumns_(
      data.statuses.length
    );


  const blocks =
    buildKanbanMetricBlocks_(
      totalColumns,
      4
    );


  const cards = [

    {
      label:
        'OPEN TASKS',

      value:
        data.openCount,

      sub:
        'Across active workflow',

      tone:
        'primary'
    },


    {
      label:
        'DUE TODAY',

      value:
        data.dueTodayCount,

      sub:
        data.dueTodayCount > 0
          ? 'Needs your attention'
          : 'Nothing due today',

      tone:
        data.dueTodayCount > 0
          ? 'warning'
          : 'success'
    },


    {
      label:
        'OVERDUE',

      value:
        data.overdueCount,

      sub:
        data.overdueCount > 0
          ? 'Clean these up first'
          : 'All clear',

      tone:
        data.overdueCount > 0
          ? 'danger'
          : 'success'
    },


    {
      label:
        'COMPLETED',

      value:
        data.completedCount,

      sub:
        'Total finished tasks',

      tone:
        'success'
    }

  ];


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
        getKanbanTone_(
          card.tone
        );


      /* ------------------------------------------------------------------
       * BODY
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          KANBAN_LAYOUT.kpiStartRow,
          block.start,
          3,
          width
        )
        .setBackground(
          KANBAN_THEME.surface
        )
        .setBorder(
          true,
          true,
          true,
          true,
          false,
          false,
          KANBAN_THEME.border,
          SpreadsheetApp
            .BorderStyle
            .SOLID
        );


      /* ------------------------------------------------------------------
       * LABEL
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          KANBAN_LAYOUT.kpiStartRow,
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
          KANBAN_LAYOUT.kpiStartRow + 1,
          block.start,
          1,
          width
        )
        .merge()
        .setValue(
          card.value
        )
        .setFontColor(
          tone.text
        )
        .setFontSize(
          20
        )
        .setFontWeight(
          'bold'
        );


      /* ------------------------------------------------------------------
       * SUBTEXT
       * ---------------------------------------------------------------- */

      sheet
        .getRange(
          KANBAN_LAYOUT.kpiEndRow,
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
          KANBAN_THEME.text2
        );

    }
  );
}


/* ==========================================================================
 * KPI BLOCK CALCULATION
 * ========================================================================== */

function buildKanbanMetricBlocks_(
  totalColumns,
  cardCount
) {

  const gap =
    1;


  const usableColumns =
    totalColumns -
    (
      (
        cardCount -
        1
      ) *
      gap
    );


  const baseWidth =
    Math.floor(
      usableColumns /
      cardCount
    );


  let remaining =
    usableColumns %
    cardCount;


  let currentColumn =
    1;


  const blocks = [];


  for (
    let index =
      0;
    index <
      cardCount;
    index++
  ) {

    const width =
      baseWidth +
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


    blocks.push({

      start:
        currentColumn,

      end:
        currentColumn +
        width -
        1

    });


    currentColumn +=
      width +
      gap;

  }


  return blocks;
}


/* ==========================================================================
 * LANES
 * ========================================================================== */

function writeKanbanLanes_(
  sheet,
  data
) {

  data.statuses.forEach(
    function (
      status,
      index
    ) {

      const startColumn =
        getKanbanLaneStartColumn_(
          index
        );


      writeKanbanLane_(
        sheet,
        status,
        data.grouped[
          status
        ] || [],
        startColumn,
        data.today
      );

    }
  );
}


/* ==========================================================================
 * SINGLE LANE
 * ========================================================================== */

function writeKanbanLane_(
  sheet,
  status,
  tasks,
  startColumn,
  today
) {

  const laneWidth =
    KANBAN_LAYOUT.laneWidth;


  const tone =
    getKanbanLaneTone_(
      status,
      tasks.length
    );


  /* ----------------------------------------------------------------------
   * LANE BACKGROUND
   * -------------------------------------------------------------------- */

  const laneBodyRows =
    (
      KANBAN_LAYOUT.maxCardsPerLane *
      (
        KANBAN_LAYOUT.cardRows +
        KANBAN_LAYOUT.cardGapRows
      )
    ) +
    3;


  sheet
    .getRange(
      KANBAN_LAYOUT.laneHeaderRow,
      startColumn,
      laneBodyRows,
      laneWidth
    )
    .setBackground(
      KANBAN_THEME.laneBackground
    );


  /* ----------------------------------------------------------------------
   * HEADER
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      KANBAN_LAYOUT.laneHeaderRow,
      startColumn,
      1,
      laneWidth
    )
    .merge()
    .setValue(
      status.toUpperCase() +
      '   ' +
      tasks.length
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
      'left'
    )
    .setBorder(
      true,
      true,
      false,
      true,
      false,
      false,
      KANBAN_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );


  /* ----------------------------------------------------------------------
   * LANE SUBTITLE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      KANBAN_LAYOUT.laneSubtitleRow,
      startColumn,
      1,
      laneWidth
    )
    .merge()
    .setValue(
      getKanbanLaneSubtitle_(
        status,
        tasks.length
      )
    )
    .setBackground(
      KANBAN_THEME.surface
    )
    .setFontColor(
      KANBAN_THEME.muted
    )
    .setFontSize(
      8
    )
    .setBorder(
      false,
      true,
      true,
      true,
      false,
      false,
      KANBAN_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );


  /* ----------------------------------------------------------------------
   * EMPTY STATE
   * -------------------------------------------------------------------- */

  if (
    tasks.length ===
    0
  ) {

    const empty =
      sheet.getRange(
        KANBAN_LAYOUT.firstCardRow,
        startColumn,
        4,
        laneWidth
      );


    empty
      .merge()
      .setValue(
        getKanbanEmptyText_(
          status
        )
      )
      .setBackground(
        KANBAN_THEME.surface
      )
      .setFontColor(
        KANBAN_THEME.muted
      )
      .setFontSize(
        9
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
        KANBAN_THEME.border,
        SpreadsheetApp
          .BorderStyle
          .SOLID
      );


    for (
      let row =
        KANBAN_LAYOUT.firstCardRow;
      row <
        KANBAN_LAYOUT.firstCardRow +
        4;
      row++
    ) {

      sheet.setRowHeight(
        row,
        24
      );

    }


    return;
  }


  /* ----------------------------------------------------------------------
   * CARDS
   * -------------------------------------------------------------------- */

  const visibleTasks =
    tasks.slice(
      0,
      KANBAN_LAYOUT.maxCardsPerLane
    );


  visibleTasks.forEach(
    function (
      task,
      index
    ) {

      const startRow =
        KANBAN_LAYOUT.firstCardRow +
        (
          index *
          (
            KANBAN_LAYOUT.cardRows +
            KANBAN_LAYOUT.cardGapRows
          )
        );


      writeKanbanCard_(
        sheet,
        task,
        startRow,
        startColumn,
        status,
        today
      );

    }
  );


  /* ----------------------------------------------------------------------
   * MORE
   * -------------------------------------------------------------------- */

  if (
    tasks.length >
    visibleTasks.length
  ) {

    const moreRow =
      KANBAN_LAYOUT.firstCardRow +
      (
        visibleTasks.length *
        (
          KANBAN_LAYOUT.cardRows +
          KANBAN_LAYOUT.cardGapRows
        )
      );


    sheet
      .getRange(
        moreRow,
        startColumn,
        1,
        laneWidth
      )
      .merge()
      .setValue(
        '+' +
        (
          tasks.length -
          visibleTasks.length
        ) +
        ' more'
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

  }
}


/* ==========================================================================
 * CARD
 * ========================================================================== */

function writeKanbanCard_(
  sheet,
  task,
  startRow,
  startColumn,
  status,
  today
) {

  const taskId =
    String(
      task.TaskId ||
      ''
    );


  const taskNote =
    'TASK_ID:' +
    taskId;


  const score =
    Number(
      task.SmartScore
    ) || 0;


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


  const priorityTone =
    getKanbanPriorityTone_(
      task.Priority
    );


  const scoreTone =
    getKanbanScoreTone_(
      score
    );


  const dueTone =
    getKanbanDueTone_(
      task.DueDate,
      today,
      status
    );


  const progressTone =
    getKanbanProgressTone_(
      progress
    );


  const cardRange =
    sheet.getRange(
      startRow,
      startColumn,
      KANBAN_LAYOUT.cardRows,
      KANBAN_LAYOUT.laneWidth
    );


  cardRange
    .setBackground(
      KANBAN_THEME.surface
    )
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false,
      KANBAN_THEME.border,
      SpreadsheetApp
        .BorderStyle
        .SOLID
    );


  /* ----------------------------------------------------------------------
   * TITLE
   * -------------------------------------------------------------------- */

  const titleRange =
    sheet.getRange(
      startRow,
      startColumn,
      1,
      KANBAN_LAYOUT.laneWidth
    );


  titleRange
    .merge()
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
      status ===
        'Completed'
        ? KANBAN_THEME.muted
        : KANBAN_THEME.text
    )
    .setWrap(
      true
    )
    .setNote(
      taskNote
    );


  if (
    status ===
    'Completed'
  ) {

    titleRange
      .setFontStyle(
        'italic'
      );

  }


  /* ----------------------------------------------------------------------
   * META
   * -------------------------------------------------------------------- */

  const meta = [];


  if (
    task.Priority
  ) {

    meta.push(
      task.Priority
    );

  }


  if (
    task.Area
  ) {

    meta.push(
      task.Area
    );

  }


  if (
    task.Project
  ) {

    meta.push(
      task.Project
    );

  }


  const metaRange =
    sheet.getRange(
      startRow + 1,
      startColumn,
      1,
      KANBAN_LAYOUT.laneWidth
    );


  metaRange
    .merge()
    .setValue(
      meta.length
        ? meta.join(
            '  •  '
          )
        : 'Personal'
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
    .setNote(
      taskNote
    );


  /* ----------------------------------------------------------------------
   * SMART ACTION
   * -------------------------------------------------------------------- */

  let action =
    String(
      task.RecommendedAction ||
      ''
    ).trim();


  if (!action) {

    action =
      String(
        task.Description ||
        ''
      ).trim();

  }


  if (!action) {

    action =
      status ===
        'Completed'
        ? 'Completed'
        : 'Continue with the next clear step';

  }


  const actionRange =
    sheet.getRange(
      startRow + 2,
      startColumn,
      1,
      KANBAN_LAYOUT.laneWidth
    );


  actionRange
    .merge()
    .setValue(
      action
    )
    .setFontColor(
      KANBAN_THEME.text2
    )
    .setFontSize(
      8
    )
    .setWrap(
      true
    )
    .setNote(
      taskNote
    );


  /* ----------------------------------------------------------------------
   * FOOTER — DUE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow + 3,
      startColumn
    )
    .setValue(
      kanbanDueLabel_(
        task.DueDate,
        today,
        status
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
      taskNote
    );


  /* ----------------------------------------------------------------------
   * FOOTER — PROGRESS
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow + 3,
      startColumn + 1
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
    )
    .setNote(
      taskNote
    );


  /* ----------------------------------------------------------------------
   * FOOTER — SCORE
   * -------------------------------------------------------------------- */

  sheet
    .getRange(
      startRow + 3,
      startColumn + 2
    )
    .setValue(
      score
        ? (
            'S ' +
            score
          )
        : 'S —'
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
      taskNote
    );


  /* ----------------------------------------------------------------------
   * HEIGHTS
   * -------------------------------------------------------------------- */

  sheet.setRowHeight(
    startRow,
    38
  );


  sheet.setRowHeight(
    startRow + 1,
    23
  );


  sheet.setRowHeight(
    startRow + 2,
    33
  );


  sheet.setRowHeight(
    startRow + 3,
    27
  );


  sheet.setRowHeight(
    startRow +
    KANBAN_LAYOUT.cardRows,
    9
  );
}


/* ==========================================================================
 * SELECTED TASK
 * ========================================================================== */

function openSelectedKanbanTask_() {

  const ui =
    SpreadsheetApp.getUi();


  const sheet =
    SpreadsheetApp
      .getActive()
      .getActiveSheet();


  if (
    !sheet ||
    sheet.getName() !==
      SHEETS.KANBAN
  ) {

    ui.alert(
      'Open Task',
      'Open Kanban and select a task card first.',
      ui.ButtonSet.OK
    );

    return;
  }


  const range =
    sheet.getActiveRange();


  if (!range) {

    ui.alert(
      'Open Task',
      'Select a Kanban task card first.',
      ui.ButtonSet.OK
    );

    return;
  }


  let note =
    String(
      range.getNote() ||
      ''
    ).trim();


  if (!note) {

    note =
      findKanbanTaskNoteNearSelection_(
        sheet,
        range.getRow(),
        range.getColumn()
      );

  }


  const match =
    note.match(
      /^TASK_ID:(.+)$/
    );


  if (!match) {

    ui.alert(
      'Open Task',
      'Select a task card first.',
      ui.ButtonSet.OK
    );

    return;
  }


  const taskId =
    String(
      match[
        1
      ] ||
      ''
    ).trim();


  if (!taskId) {
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
      '" could not be found.',
      ui.ButtonSet.OK
    );

    return;
  }


  showTaskDetails_(
    taskId
  );
}


/* ==========================================================================
 * FIND TASK NOTE
 * ========================================================================== */

function findKanbanTaskNoteNearSelection_(
  sheet,
  row,
  column
) {

  const cycle =
    KANBAN_LAYOUT.laneWidth +
    KANBAN_LAYOUT.laneGapCols;


  const laneIndex =
    Math.floor(
      (
        column -
        1
      ) /
      cycle
    );


  const laneStartColumn =
    getKanbanLaneStartColumn_(
      laneIndex
    );


  /*
   * Clicked on lane spacer.
   */
  if (
    column >=
    laneStartColumn +
    KANBAN_LAYOUT.laneWidth
  ) {

    return '';

  }


  const startRow =
    Math.max(
      KANBAN_LAYOUT.firstCardRow,
      row - 4
    );


  const endRow =
    Math.min(
      sheet.getMaxRows(),
      row + 4
    );


  for (
    let currentRow =
      startRow;
    currentRow <=
      endRow;
    currentRow++
  ) {

    for (
      let offset =
        0;
      offset <
        KANBAN_LAYOUT.laneWidth;
      offset++
    ) {

      const note =
        String(
          sheet
            .getRange(
              currentRow,
              laneStartColumn +
              offset
            )
            .getNote() ||
          ''
        ).trim();


      if (
        note.indexOf(
          'TASK_ID:'
        ) ===
        0
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

function writeKanbanFooter_(
  sheet,
  data
) {

  const totalColumns =
    getKanbanTotalColumns_(
      data.statuses.length
    );


  const row =
    KANBAN_LAYOUT.firstCardRow +
    (
      KANBAN_LAYOUT.maxCardsPerLane *
      (
        KANBAN_LAYOUT.cardRows +
        KANBAN_LAYOUT.cardGapRows
      )
    ) +
    4;


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
      'Select a card → ⚡ Smart Task → Task Actions → Open Selected Task' +
      '   •   Refreshed ' +
      refreshTime
    )
    .setFontSize(
      8
    )
    .setFontColor(
      KANBAN_THEME.muted
    )
    .setHorizontalAlignment(
      'right'
    );

}


/* ==========================================================================
 * GENERAL TONES
 * ========================================================================== */

function getKanbanTone_(
  tone
) {

  switch (
    String(
      tone ||
      ''
    )
  ) {

    case 'danger':

      return {

        text:
          KANBAN_THEME.danger,

        soft:
          KANBAN_THEME.dangerSoft

      };


    case 'warning':

      return {

        text:
          KANBAN_THEME.warning,

        soft:
          KANBAN_THEME.warningSoft

      };


    case 'success':

      return {

        text:
          KANBAN_THEME.success,

        soft:
          KANBAN_THEME.successSoft

      };


    case 'info':

      return {

        text:
          KANBAN_THEME.info,

        soft:
          KANBAN_THEME.infoSoft

      };


    default:

      return {

        text:
          KANBAN_THEME.primary,

        soft:
          KANBAN_THEME.primaryLight

      };

  }
}


/* ==========================================================================
 * LANE TONES
 * ========================================================================== */

function getKanbanLaneTone_(
  status,
  count
) {

  if (
    status ===
      'In Progress' &&
    count >
      KANBAN_LAYOUT.inProgressWipLimit
  ) {

    return getKanbanTone_(
      'danger'
    );

  }


  return getKanbanStatusTone_(
    status
  );
}


function getKanbanStatusTone_(
  status
) {

  switch (
    String(
      status ||
      ''
    )
  ) {

    case 'Inbox':

      return getKanbanTone_(
        'info'
      );


    case 'To Do':

      return getKanbanTone_(
        'primary'
      );


    case 'In Progress':

      return {

        text:
          '#A16207',

        soft:
          '#FEF9C3'

      };


    case 'Waiting':

      return getKanbanTone_(
        'warning'
      );


    case 'Completed':

      return getKanbanTone_(
        'success'
      );


    default:

      return {

        text:
          KANBAN_THEME.text2,

        soft:
          KANBAN_THEME.surface2

      };

  }
}


/* ==========================================================================
 * LANE SUBTITLE
 * ========================================================================== */

function getKanbanLaneSubtitle_(
  status,
  count
) {

  switch (
    status
  ) {

    case 'Inbox':

      return (
        'Capture first, organize later'
      );


    case 'To Do':

      return (
        'Ready when you are'
      );


    case 'In Progress':

      return (
        count +
        ' / ' +
        KANBAN_LAYOUT.inProgressWipLimit +
        ' recommended WIP'
      );


    case 'Waiting':

      return (
        'Paused or waiting on something'
      );


    case 'Completed':

      return (
        'Recently finished work'
      );


    default:

      return (
        'Workflow stage'
      );

  }
}


/* ==========================================================================
 * PRIORITY
 * ========================================================================== */

function getKanbanPriorityTone_(
  priority
) {

  switch (
    String(
      priority ||
      ''
    )
  ) {

    case 'Critical':
    case 'Urgent':

      return getKanbanTone_(
        'danger'
      );


    case 'High':

      return getKanbanTone_(
        'warning'
      );


    case 'Medium':

      return getKanbanTone_(
        'primary'
      );


    case 'Low':

      return getKanbanTone_(
        'success'
      );


    default:

      return {

        text:
          KANBAN_THEME.text2,

        soft:
          KANBAN_THEME.surface2

      };

  }
}


/* ==========================================================================
 * SMART SCORE
 * ========================================================================== */

function getKanbanScoreTone_(
  score
) {

  score =
    Number(
      score
    ) || 0;


  if (
    score >=
    85
  ) {

    return getKanbanTone_(
      'danger'
    );

  }


  if (
    score >=
    65
  ) {

    return getKanbanTone_(
      'warning'
    );

  }


  if (
    score >=
    40
  ) {

    return getKanbanTone_(
      'primary'
    );

  }


  return getKanbanTone_(
    'success'
  );
}


/* ==========================================================================
 * PROGRESS
 * ========================================================================== */

function getKanbanProgressTone_(
  progress
) {

  progress =
    Number(
      progress
    ) || 0;


  if (
    progress >=
    100
  ) {

    return getKanbanTone_(
      'success'
    );

  }


  if (
    progress >=
    60
  ) {

    return getKanbanTone_(
      'primary'
    );

  }


  if (
    progress >
    0
  ) {

    return getKanbanTone_(
      'warning'
    );

  }


  return {

    text:
      KANBAN_THEME.text2,

    soft:
      KANBAN_THEME.surface2

  };
}


/* ==========================================================================
 * DUE DATE
 * ========================================================================== */

function getKanbanDueTone_(
  dueDate,
  today,
  status
) {

  if (
    status ===
    'Completed'
  ) {

    return getKanbanTone_(
      'success'
    );

  }


  const due =
    stripTime_(
      dueDate
    );


  if (!due) {

    return {

      text:
        KANBAN_THEME.muted,

      soft:
        KANBAN_THEME.surface2

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

    return getKanbanTone_(
      'danger'
    );

  }


  if (
    difference <=
    1
  ) {

    return getKanbanTone_(
      'warning'
    );

  }


  return getKanbanTone_(
    'success'
  );
}


function kanbanDueLabel_(
  dueDate,
  today,
  status
) {

  if (
    status ===
    'Completed'
  ) {

    return 'Done';

  }


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
    'MMM d'
  );
}


/* ==========================================================================
 * EMPTY STATES
 * ========================================================================== */

function getKanbanEmptyText_(
  status
) {

  switch (
    status
  ) {

    case 'Inbox':

      return (
        'Inbox is clear.\\nNew captures will appear here.'
      );


    case 'To Do':

      return (
        'Nothing queued.\\nChoose intentionally what comes next.'
      );


    case 'In Progress':

      return (
        'No active task.\\nStart one important thing.'
      );


    case 'Waiting':

      return (
        'Nothing is waiting.\\nNo blockers right now.'
      );


    case 'Completed':

      return (
        'Finished tasks will appear here.'
      );


    default:

      return (
        'No tasks in this stage.'
      );

  }
}


/* ==========================================================================
 * SORT HELPERS
 * ========================================================================== */

function kanbanDateValue_(
  value
) {

  if (!value) {

    return 0;

  }


  const date =
    new Date(
      value
    );


  return isNaN(
    date.getTime()
  )
    ? 0
    : date.getTime();
}


function kanbanDueSortValue_(
  value
) {

  if (!value) {

    return Number
      .MAX_SAFE_INTEGER;

  }


  const date =
    stripTime_(
      value
    );


  if (!date) {

    return Number
      .MAX_SAFE_INTEGER;

  }


  return date.getTime();
}