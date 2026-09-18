/**
 * 98_AppDialog.gs
 * -----------------------------------------------------------------------
 * SMART TASK MANAGER — PROFESSIONAL DIALOG SYSTEM
 *
 * Responsibilities:
 * - Friendly error dialogs
 * - Success dialogs
 * - Centralized error mapping
 * - Safe menu execution
 * - Quiet background execution
 * - Safe range validation
 * -----------------------------------------------------------------------
 */

/* ==========================================================================
 * DIALOG CONFIG
 * ========================================================================== */

const APP_DIALOG = {
  errorWidth: 560,
  errorHeight: 430,

  successWidth: 500,
  successHeight: 310,
};

/* ==========================================================================
 * SAFE EXECUTION
 * ========================================================================== */

/**
 * Runs a user-facing action safely.
 *
 * If an exception occurs:
 * - log full error
 * - convert technical error to a friendly message
 * - show professional modal
 *
 * @param {string} context
 * @param {Function} callback
 * @return {*}
 */
function runSafely_(context, callback) {
  try {
    return callback();
  } catch (error) {
    logAppError_(context, error);

    showMappedErrorDialog_(context, error);

    return null;
  }
}

/**
 * Runs background refresh logic without showing modal.
 *
 * Useful for:
 * - refreshViewsAfterTaskChange_
 * - refreshAll_
 *
 * @param {string} context
 * @param {Function} callback
 * @return {boolean}
 */
function runQuietly_(context, callback) {
  try {
    callback();

    return true;
  } catch (error) {
    logAppError_(context, error);

    return false;
  }
}

/* ==========================================================================
 * ERROR DIALOG
 * ========================================================================== */

function showMappedErrorDialog_(context, error) {
  const mapped = mapSmartTaskError_(error);

  showErrorDialog_({
    title: context || "Something went wrong",

    summary: mapped.summary,

    detail: mapped.detail,

    code: mapped.code,

    help: mapped.help,
  });
}

/**
 * Professional error modal.
 */
function showErrorDialog_(options) {
  options = options || {};

  const template = HtmlService.createTemplateFromFile("Dialog_Error");

  template.title = String(options.title || "Something went wrong");

  template.summary = String(
    options.summary || "Smart Task Manager could not complete this action.",
  );

  template.detail = String(options.detail || "");

  template.code = String(options.code || "SMART_TASK_ERROR");

  template.help = Array.isArray(options.help) ? options.help : [];

  const output = template
    .evaluate()
    .setWidth(APP_DIALOG.errorWidth)
    .setHeight(APP_DIALOG.errorHeight);

  SpreadsheetApp.getUi().showModalDialog(output, "Smart Task");
}

/* ==========================================================================
 * SUCCESS DIALOG
 * ========================================================================== */

function showSuccessDialog_(options) {
  options = options || {};

  const template = HtmlService.createTemplateFromFile("Dialog_Success");

  template.title = String(options.title || "Completed");

  template.summary = String(
    options.summary || "The action was completed successfully.",
  );

  template.detail = String(options.detail || "");

  const output = template
    .evaluate()
    .setWidth(APP_DIALOG.successWidth)
    .setHeight(APP_DIALOG.successHeight);

  SpreadsheetApp.getUi().showModalDialog(output, "Smart Task");
}

/* ==========================================================================
 * ERROR MAPPER
 * ========================================================================== */

function mapSmartTaskError_(error) {
  const raw = getAppErrorMessage_(error);

  const lower = raw.toLowerCase();

  /* ----------------------------------------------------------------------
   * INVALID RANGE / ZERO COLUMN
   * -------------------------------------------------------------------- */

  if (
    lower.indexOf("số cột trong dải") !== -1 ||
    lower.indexOf("number of columns in the range") !== -1 ||
    lower.indexOf("[invalid_range]") !== -1
  ) {
    return {
      code: "INVALID_RANGE",

      summary:
        "Không thể hiển thị giao diện vì kích thước vùng dữ liệu không hợp lệ.",

      detail:
        "Một thành phần giao diện đang cố tạo vùng có số cột bằng 0 hoặc nhỏ hơn 0. " +
        "Đây thường là lỗi tính toán width, remainingColumns hoặc totalColumns khi render.",

      help: [
        "Kiểm tra các lệnh getRange(row, column, rows, columns).",

        "Đảm bảo số hàng và số cột luôn lớn hơn hoặc bằng 1.",

        "Kiểm tra các phép tính dạng totalColumns - x hoặc width = end - start + 1.",

        "Refresh lại view sau khi sửa code.",
      ],
    };
  }

  /* ----------------------------------------------------------------------
   * FROZEN COLUMN MERGE
   * -------------------------------------------------------------------- */

  if (
    lower.indexOf("frozen columns") !== -1 ||
    lower.indexOf("cột được cố định") !== -1
  ) {
    return {
      code: "FROZEN_MERGE_CONFLICT",

      summary:
        "Không thể hợp nhất vùng dữ liệu vì vùng merge đi qua ranh giới cột cố định.",

      detail:
        "Google Sheets không cho phép một merged range chứa đồng thời cột frozen và cột không frozen.",

      help: [
        "Bỏ frozen columns trước khi render.",

        "Chỉ freeze hàng nếu layout có merged range trải ngang nhiều cột.",

        "Chạy lại view sau khi reset frozen columns.",
      ],
    };
  }

  /* ----------------------------------------------------------------------
   * TASK NOT FOUND
   * -------------------------------------------------------------------- */

  if (
    lower.indexOf("task not found") !== -1 ||
    lower.indexOf("could not be found") !== -1
  ) {
    return {
      code: "TASK_NOT_FOUND",

      summary: "Không tìm thấy công việc được chọn.",

      detail:
        "Task có thể đã bị xóa hoặc vùng đang chọn không còn liên kết với TaskId hợp lệ.",

      help: [
        "Refresh lại Tasks, Kanban, Calendar hoặc Timeline.",

        "Chọn lại đúng task.",

        "Kiểm tra TaskId trong sheet Tasks.",
      ],
    };
  }

  /* ----------------------------------------------------------------------
   * PROJECT NOT FOUND
   * -------------------------------------------------------------------- */

  if (lower.indexOf("project not found") !== -1) {
    return {
      code: "PROJECT_NOT_FOUND",

      summary: "Không tìm thấy project.",

      detail: raw,

      help: [
        "Kiểm tra ProjectId.",

        "Refresh lại Projects.",

        "Đảm bảo project vẫn tồn tại trong bảng dữ liệu.",
      ],
    };
  }

  /* ----------------------------------------------------------------------
   * PERMISSION
   * -------------------------------------------------------------------- */

  if (
    lower.indexOf("permission") !== -1 ||
    lower.indexOf("authorization") !== -1 ||
    lower.indexOf("you do not have permission") !== -1
  ) {
    return {
      code: "PERMISSION_REQUIRED",

      summary:
        "Smart Task Manager cần quyền truy cập để thực hiện thao tác này.",

      detail: raw,

      help: [
        "Mở Apps Script và chạy lại function cần thiết.",

        "Chấp nhận yêu cầu cấp quyền của Google.",

        "Reload Google Sheets sau khi hoàn tất authorization.",
      ],
    };
  }

  /* ----------------------------------------------------------------------
   * DEFAULT
   * -------------------------------------------------------------------- */

  return {
    code: "UNEXPECTED_ERROR",

    summary: "Smart Task Manager không thể hoàn tất thao tác này.",

    detail: raw,

    help: [
      "Thử refresh lại view và thực hiện lại thao tác.",

      "Kiểm tra dữ liệu đầu vào.",

      "Nếu lỗi tiếp tục xảy ra, mở Apps Script Executions để xem log kỹ thuật.",
    ],
  };
}

/* ==========================================================================
 * ERROR LOGGING
 * ========================================================================== */

function logAppError_(context, error) {
  const message = getAppErrorMessage_(error);

  const stack = error && error.stack ? error.stack : "No stack trace";

  console.error(
    [
      "========================================",
      "SMART TASK MANAGER ERROR",
      "Context: " + context,
      "Message: " + message,
      "Stack:",
      stack,
      "========================================",
    ].join("\n"),
  );
}

function getAppErrorMessage_(error) {
  if (error && error.message) {
    return String(error.message);
  }

  return String(error || "Unknown error");
}

/* ==========================================================================
 * RANGE SAFETY
 * ========================================================================== */

/**
 * Throws a clear error before Google Sheets throws
 * its cryptic "columns must be at least 1" exception.
 */
function assertValidRangeSize_(numRows, numCols, context) {
  const rows = Number(numRows);

  const cols = Number(numCols);

  if (!isFinite(rows) || rows < 1) {
    throw new Error(
      "[INVALID_RANGE] Invalid row count" +
        (context ? " in " + context : "") +
        ": " +
        numRows,
    );
  }

  if (!isFinite(cols) || cols < 1) {
    throw new Error(
      "[INVALID_RANGE] Invalid column count" +
        (context ? " in " + context : "") +
        ": " +
        numCols,
    );
  }
}

/**
 * Safe alternative to sheet.getRange().
 */
function getSafeRange_(sheet, row, column, numRows, numCols, context) {
  assertValidRangeSize_(numRows, numCols, context);

  return sheet.getRange(
    Number(row),
    Number(column),
    Number(numRows),
    Number(numCols),
  );
}

/**
 * Converts dynamic width into at least 1.
 *
 * Only use this where a 1-column fallback
 * makes sense visually.
 */
function safeColumnSpan_(value, fallback) {
  const parsed = Number(value);

  if (!isFinite(parsed) || parsed < 1) {
    return Math.max(1, Number(fallback) || 1);
  }

  return Math.floor(parsed);
}
