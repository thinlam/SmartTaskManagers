/**
 * 15_Sync.gs
 * -----------------------------------------------------------------------
 * Phase 28 — Google Sheets <-> Backend sync engine. Bidirectional,
 * last-write-wins by UpdatedAt (mirrors the backend's SyncService exactly
 * - see backend/SmartTask.Application/Sync/SyncContracts.cs's doc comment
 * for the full push/pull design). Manual ("Sync Now" menu item) and
 * automatic (15-minute time trigger) both call syncAll_() - one engine,
 * no duplicated business logic between the two entry points.
 *
 * Known, deliberate scope limits (documented, not bugs):
 *  - Deletes don't propagate either direction. Deleting a Sheets row just
 *    removes it locally; the backend row (and anything reading it through
 *    the Desktop app) is untouched. Deleting via the API/Desktop app
 *    doesn't remove the Sheets row either - pull only asks "what
 *    changed", and a deleted row has nothing left to report. Real
 *    two-way delete needs tombstones, out of scope for this phase.
 *  - A row just written by applyPulled*_ will very likely get marked
 *    dirty again by onEdit(e) (the write touches business columns, which
 *    onEdit can't distinguish from a real user edit) and get pushed once
 *    more next cycle - harmless, since the server sees an equal
 *    UpdatedAt and treats it as a no-op Update, but it is one wasted
 *    request per pulled row.
 *  - DependencyTaskId only resolves on pull if the depended-on task was
 *    already synced before this pull ran. Two brand-new tasks with a
 *    fresh dependency link, synced in the very same push, will have that
 *    one field come back empty on pull until the next cycle (once the
 *    depended-on task has a BackendId to resolve against).
 * -----------------------------------------------------------------------
 */

const SYNC_PROP = {
  BASE_URL: "SYNC_API_BASE_URL",
  TOKEN: "SYNC_JWT_TOKEN",
  TOKEN_EXPIRES_AT: "SYNC_JWT_EXPIRES_AT",
  TOKEN_EMAIL: "SYNC_ACCOUNT_EMAIL",
  LAST_PULL_AT: "SYNC_LAST_PULL_AT",
};

const SYNC_TRIGGER_HANDLER = "runScheduledSync_";
const SYNC_TRIGGER_INTERVAL_MINUTES = 15;
const SYNC_LOCK_WAIT_MS = 5000;
const SYNC_MAX_RETRIES = 3;
const SYNC_RETRY_BASE_DELAY_MS = 1000;

/* ==========================================================================
 * CONNECTION CONFIG
 *
 * PropertiesService (script-scoped), not the visible Settings sheet - the
 * API URL and JWT are connection plumbing, not a business setting a user
 * tweaks the way DueSoonDays is. The password itself is never stored,
 * only the token exchanged for it.
 * ========================================================================== */

function getSyncProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}
function setSyncProp_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

function getSyncBaseUrl_() {
  return getSyncProp_(SYNC_PROP.BASE_URL) || "http://localhost:5277";
}

function hasValidSyncToken_() {
  const token = getSyncProp_(SYNC_PROP.TOKEN);
  const expiresAt = getSyncProp_(SYNC_PROP.TOKEN_EXPIRES_AT);
  if (!token || !expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
}

/**
 * Menu-bound: "Connect to Backend...". Prompts for the API base URL
 * (once - reused after) and email/password, exchanges them for a JWT via
 * POST /api/auth/login, and stores only the token + its expiry.
 */
function connectToBackendPrompt_() {
  const ui = SpreadsheetApp.getUi();

  const urlResponse = ui.prompt(
    "Connect to Backend — Step 1/3",
    "Backend API URL (current: " + getSyncBaseUrl_() + "):",
    ui.ButtonSet.OK_CANCEL,
  );
  if (urlResponse.getSelectedButton() !== ui.Button.OK) return;
  const typedUrl = (urlResponse.getResponseText() || "").trim();
  const url = typedUrl || getSyncBaseUrl_();
  setSyncProp_(SYNC_PROP.BASE_URL, url);

  const emailResponse = ui.prompt(
    "Connect to Backend — Step 2/3",
    "Email:",
    ui.ButtonSet.OK_CANCEL,
  );
  if (emailResponse.getSelectedButton() !== ui.Button.OK) return;
  const email = (emailResponse.getResponseText() || "").trim();

  const passwordResponse = ui.prompt(
    "Connect to Backend — Step 3/3",
    "Password:",
    ui.ButtonSet.OK_CANCEL,
  );
  if (passwordResponse.getSelectedButton() !== ui.Button.OK) return;
  const password = passwordResponse.getResponseText() || "";

  try {
    const response = UrlFetchApp.fetch(url + "/api/auth/login", {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ email: email, password: password }),
      muteHttpExceptions: true,
    });

    if (response.getResponseCode() !== 200) {
      ui.alert(
        "Connect failed",
        "Login rejected (HTTP " + response.getResponseCode() + "). Check email/password.",
        ui.ButtonSet.OK,
      );
      return;
    }

    const body = JSON.parse(response.getContentText());
    setSyncProp_(SYNC_PROP.TOKEN, body.token);
    setSyncProp_(SYNC_PROP.TOKEN_EXPIRES_AT, body.expiresAt);
    setSyncProp_(SYNC_PROP.TOKEN_EMAIL, body.email);
    ui.alert("Connected", "Signed in as " + body.email + ". You can now use \"Sync Now\".", ui.ButtonSet.OK);
  } catch (e) {
    ui.alert("Connect failed", "Could not reach " + url + ": " + e.message, ui.ButtonSet.OK);
  }
}

/* ==========================================================================
 * HTTP + RETRY
 * ========================================================================== */

function fetchWithRetry_(url, options) {
  let lastError = null;
  for (let attempt = 1; attempt <= SYNC_MAX_RETRIES; attempt++) {
    try {
      const response = UrlFetchApp.fetch(
        url,
        Object.assign({ muteHttpExceptions: true }, options),
      );
      const code = response.getResponseCode();
      // Retry only transient server-side failures - a 4xx is a real
      // rejection (bad token, bad payload) that retrying won't fix.
      if (code >= 500 && attempt < SYNC_MAX_RETRIES) {
        Utilities.sleep(SYNC_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1));
        continue;
      }
      return response;
    } catch (e) {
      lastError = e;
      if (attempt < SYNC_MAX_RETRIES) {
        Utilities.sleep(SYNC_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1));
      }
    }
  }
  throw lastError || new Error("fetchWithRetry_ exhausted retries");
}

function syncAuthHeaders_() {
  return { Authorization: "Bearer " + getSyncProp_(SYNC_PROP.TOKEN) };
}

/* ==========================================================================
 * ENUM + DATE MAPPING
 * ========================================================================== */

function toBackendEnum_(category, sheetValue) {
  if (!sheetValue) return sheetValue;
  const map = SYNC_ENUM_TO_BACKEND[category];
  return (map && map[sheetValue]) || sheetValue;
}
function toSheetEnum_(category, backendValue) {
  if (!backendValue) return backendValue;
  const map = SYNC_ENUM_TO_SHEET[category];
  return (map && map[backendValue]) || backendValue;
}

function dateOnlyToIso_(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
}
function timeOnlyToIso_(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "HH:mm:ss");
}
function dateTimeToIso_(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}
function isoToDate_(iso) {
  if (!iso) return "";
  return new Date(iso);
}

/* ==========================================================================
 * ID LOOKUP MAPS
 * ========================================================================== */

/** Sheets display id -> BackendId, for resolving push-time FK references. */
function buildExternalToBackendMap_(descriptor) {
  const rows = readTable_(descriptor.sheet, descriptor.headers);
  const map = {};
  rows.forEach(function (r) {
    const localId = r[descriptor.idHeader];
    if (localId && r.BackendId) map[localId] = r.BackendId;
  });
  return map;
}

/** BackendId -> Sheets display id, for resolving pull-time FK references. */
function buildBackendToExternalMap_(descriptor) {
  const rows = readTable_(descriptor.sheet, descriptor.headers);
  const map = {};
  rows.forEach(function (r) {
    if (r.BackendId) map[r.BackendId] = r[descriptor.idHeader];
  });
  return map;
}

function findRowIndexByExternalId_(descriptor, externalId) {
  if (!externalId) return -1;
  return findRowByEntityId_(descriptor.sheet, descriptor.headers, descriptor.idHeader, externalId);
}

function findRowIndexByBackendId_(descriptor, backendId) {
  if (!backendId) return -1;
  const sheet = getOrCreateSheet_(descriptor.sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const backendIdCol = descriptor.headers.indexOf("BackendId");
  const values = sheet.getRange(2, backendIdCol + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === backendId) return i + 2;
  }
  return -1;
}

/* ==========================================================================
 * PUSH — Sheets row -> sync payload item
 * ========================================================================== */

function collectDirtyRows_(descriptor) {
  const sheet = getOrCreateSheet_(descriptor.sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, descriptor.headers.length).getValues();
  const statusCol = descriptor.headers.indexOf("SyncStatus");
  const dirty = [];
  values.forEach(function (rowArray, i) {
    if (String(rowArray[statusCol]) !== "Synced") {
      const obj = {};
      descriptor.headers.forEach(function (h, idx) {
        obj[h] = rowArray[idx];
      });
      dirty.push({ rowIndex: i + 2, obj: obj });
    }
  });
  return dirty;
}

function taskRowToSyncItem_(row, projectMap, goalMap, taskMap) {
  return {
    externalId: row.TaskId,
    id: row.BackendId || null,
    name: row.TaskName,
    description: row.Description || null,
    area: toBackendEnum_("Area", row.Area) || "Personal",
    projectId: row.Project ? projectMap[row.Project] || null : null,
    category: row.Category || null,
    tags: row.Tags || null,
    priority: row.Priority || "Medium",
    status: toBackendEnum_("Status", row.Status) || "Inbox",
    startDate: dateOnlyToIso_(row.StartDate),
    dueDate: dateOnlyToIso_(row.DueDate),
    dueTime: timeOnlyToIso_(row.DueTime),
    completedDate: dateTimeToIso_(row.CompletedDate),
    progress: Number(row.Progress) || 0,
    estimateMinutes: row.EstimateMinutes ? Number(row.EstimateMinutes) : null,
    energy: row.Energy || null,
    context: row.Context || null,
    goalId: row.GoalId ? goalMap[row.GoalId] || null : null,
    recurringType: row.RecurringType || "None",
    dependencyTaskId: row.DependencyTaskId ? taskMap[row.DependencyTaskId] || null : null,
    notes: row.Notes || null,
    updatedAt: dateTimeToIso_(row.UpdatedAt) || new Date().toISOString(),
  };
}

function projectRowToSyncItem_(row) {
  return {
    externalId: row.ProjectId,
    id: row.BackendId || null,
    name: row.ProjectName,
    area: toBackendEnum_("Area", row.Area) || "Personal",
    targetDate: dateOnlyToIso_(row.TargetDate),
    description: row.Description || null,
    updatedAt: dateTimeToIso_(row.UpdatedAt) || new Date().toISOString(),
  };
}

function goalRowToSyncItem_(row) {
  return {
    externalId: row.GoalId,
    id: row.BackendId || null,
    name: row.GoalName,
    area: toBackendEnum_("Area", row.Area) || "Personal",
    targetDate: dateOnlyToIso_(row.TargetDate),
    progress: Number(row.Progress) || 0,
    status: toBackendEnum_("GoalStatus", row.Status) || "OnTrack",
    updatedAt: dateTimeToIso_(row.UpdatedAt) || new Date().toISOString(),
  };
}

function habitRowToSyncItem_(row) {
  return {
    externalId: row.HabitId,
    id: row.BackendId || null,
    name: row.HabitName,
    frequency: row.Frequency || "Daily",
    streak: Number(row.Streak) || 0,
    targetCount: Number(row.TargetCount) || 0,
    completedCount: Number(row.CompletedCount) || 0,
    lastCompletedDate: dateOnlyToIso_(row.LastCompletedDate),
    updatedAt: dateTimeToIso_(row.UpdatedAt) || new Date().toISOString(),
  };
}

function writeSyncColumnsBack_(descriptor, rowIndex, backendId, syncStatus, version) {
  const sheet = getOrCreateSheet_(descriptor.sheet);
  const backendIdCol = descriptor.headers.indexOf("BackendId") + 1;
  // BackendId/SyncStatus/LastSyncedAt/Version are guaranteed trailing and
  // contiguous (see 00_Constants.gs) - one range write, and critically
  // one that never touches a business column, so onEdit(e) can tell this
  // apart from a real edit (see onEdit's own column-range check below).
  sheet
    .getRange(rowIndex, backendIdCol, 1, 4)
    .setValues([[backendId || "", syncStatus, now_(), version || 1]]);
}

function pushAllDirty_() {
  const projectMap = buildExternalToBackendMap_(SYNC_ENTITIES[1]);
  const goalMap = buildExternalToBackendMap_(SYNC_ENTITIES[2]);
  const taskMap = buildExternalToBackendMap_(SYNC_ENTITIES[0]);

  const dirtyByEntity = {};
  SYNC_ENTITIES.forEach(function (d) {
    dirtyByEntity[d.key] = collectDirtyRows_(d);
  });

  const totalDirty = SYNC_ENTITIES.reduce(function (sum, d) {
    return sum + dirtyByEntity[d.key].length;
  }, 0);

  if (totalDirty === 0) {
    return { pushed: 0, created: 0, updated: 0, skipped: 0, errors: 0 };
  }

  const body = {
    tasks: dirtyByEntity.tasks.map(function (r) {
      return taskRowToSyncItem_(r.obj, projectMap, goalMap, taskMap);
    }),
    projects: dirtyByEntity.projects.map(function (r) {
      return projectRowToSyncItem_(r.obj);
    }),
    goals: dirtyByEntity.goals.map(function (r) {
      return goalRowToSyncItem_(r.obj);
    }),
    habits: dirtyByEntity.habits.map(function (r) {
      return habitRowToSyncItem_(r.obj);
    }),
  };

  const response = fetchWithRetry_(getSyncBaseUrl_() + "/api/sync/push", {
    method: "post",
    contentType: "application/json",
    headers: syncAuthHeaders_(),
    payload: JSON.stringify(body),
  });

  if (response.getResponseCode() === 401) {
    throw new Error('Not authenticated — use "Connect to Backend..." first.');
  }
  if (response.getResponseCode() >= 300) {
    throw new Error(
      "Push failed: HTTP " + response.getResponseCode() + " — " + response.getContentText(),
    );
  }

  const result = JSON.parse(response.getContentText());
  let created = 0,
    updated = 0,
    skipped = 0,
    errors = 0;

  SYNC_ENTITIES.forEach(function (descriptor) {
    const results = result[descriptor.key] || [];
    const dirtyRows = dirtyByEntity[descriptor.key];
    results.forEach(function (itemResult, i) {
      const dirtyRow = dirtyRows[i]; // response array is same order/length as the request array we sent
      if (itemResult.outcome === "Error") {
        errors++;
        // Leave SyncStatus = NotSynced untouched so it retries next cycle
        // instead of silently losing the edit.
        return;
      }
      if (itemResult.outcome === "Created") created++;
      else if (itemResult.outcome === "Updated") updated++;
      else if (itemResult.outcome === "SkippedOlder") skipped++;
      writeSyncColumnsBack_(descriptor, dirtyRow.rowIndex, itemResult.id, "Synced", itemResult.version);
    });
  });

  return { pushed: totalDirty, created: created, updated: updated, skipped: skipped, errors: errors };
}

/* ==========================================================================
 * PULL — sync response item -> Sheets row
 * ========================================================================== */

function applyPulledTask_(item, projectExtMap, goalExtMap, taskExtMap) {
  const descriptor = SYNC_ENTITIES[0];
  let rowIndex = findRowIndexByExternalId_(descriptor, item.externalId);
  if (rowIndex === -1) rowIndex = findRowIndexByBackendId_(descriptor, item.id);

  const sheet = getOrCreateSheet_(SHEETS.TASKS);
  const isNew = rowIndex === -1;
  let currentObj = {};

  if (!isNew) {
    const current = sheet.getRange(rowIndex, 1, 1, TASK_HEADERS.length).getValues()[0];
    TASK_HEADERS.forEach(function (h, i) {
      currentObj[h] = current[i];
    });
    // Symmetric LWW: Sheets only accepts the backend's copy if it's
    // strictly newer than what's already here — mirrors the exact rule
    // SyncService applies on push, just run in the other direction.
    if (
      currentObj.UpdatedAt &&
      new Date(currentObj.UpdatedAt).getTime() >= new Date(item.updatedAt).getTime()
    ) {
      return { applied: false, isNew: false };
    }
  }

  const pulledFields = {
    TaskId: isNew
      ? generateNextId_(SHEETS.TASKS, "TaskId", TASK_HEADERS, ID_PREFIX.TASK)
      : currentObj.TaskId,
    TaskName: item.name,
    Description: item.description || "",
    Area: toSheetEnum_("Area", item.area),
    Project: item.projectId ? projectExtMap[item.projectId] || "" : "",
    Category: item.category || "",
    Tags: item.tags || "",
    Priority: item.priority,
    Status: toSheetEnum_("Status", item.status),
    StartDate: isoToDate_(item.startDate),
    DueDate: isoToDate_(item.dueDate),
    DueTime: isoToDate_(item.dueTime),
    CompletedDate: isoToDate_(item.completedDate),
    Progress: item.progress,
    EstimateMinutes:
      item.estimateMinutes === null || item.estimateMinutes === undefined ? "" : item.estimateMinutes,
    Energy: item.energy || "",
    Context: item.context || "",
    GoalId: item.goalId ? goalExtMap[item.goalId] || "" : "",
    RecurringType: item.recurringType,
    DependencyTaskId: item.dependencyTaskId ? taskExtMap[item.dependencyTaskId] || "" : "",
    Notes: item.notes || "",
    UpdatedAt: isoToDate_(item.updatedAt),
    BackendId: item.id,
    SyncStatus: "Synced",
    LastSyncedAt: now_(),
    Version: item.version,
  };

  // Defaults < existing row (preserves CreatedAt/SmartScore/Risk/
  // RecommendedAction/LastStatusChangedAt, none of which the backend
  // owns yet) < fields the backend response actually carries.
  const merged = Object.assign(
    { SmartScore: "", Risk: "", RecommendedAction: "", CreatedAt: now_(), LastStatusChangedAt: now_() },
    currentObj,
    pulledFields,
  );

  if (isNew) {
    appendRow_(SHEETS.TASKS, objectToRow_(merged, TASK_HEADERS));
  } else {
    sheet.getRange(rowIndex, 1, 1, TASK_HEADERS.length).setValues([objectToRow_(merged, TASK_HEADERS)]);
  }
  return { applied: true, isNew: isNew };
}

function applyPulledProject_(item) {
  const descriptor = SYNC_ENTITIES[1];
  let rowIndex = findRowIndexByExternalId_(descriptor, item.externalId);
  if (rowIndex === -1) rowIndex = findRowIndexByBackendId_(descriptor, item.id);

  const sheet = getOrCreateSheet_(SHEETS.PROJECTS);
  const isNew = rowIndex === -1;
  let currentObj = {};

  if (!isNew) {
    const current = sheet.getRange(rowIndex, 1, 1, PROJECT_HEADERS.length).getValues()[0];
    PROJECT_HEADERS.forEach(function (h, i) {
      currentObj[h] = current[i];
    });
    if (
      currentObj.UpdatedAt &&
      new Date(currentObj.UpdatedAt).getTime() >= new Date(item.updatedAt).getTime()
    ) {
      return { applied: false, isNew: false };
    }
  }

  const pulledFields = {
    ProjectId: isNew
      ? generateNextId_(SHEETS.PROJECTS, "ProjectId", PROJECT_HEADERS, ID_PREFIX.PROJECT)
      : currentObj.ProjectId,
    ProjectName: item.name,
    Area: toSheetEnum_("Area", item.area),
    Health: toSheetEnum_("ProjectHealth", item.health),
    TargetDate: isoToDate_(item.targetDate),
    Description: item.description || "",
    UpdatedAt: isoToDate_(item.updatedAt),
    BackendId: item.id,
    SyncStatus: "Synced",
    LastSyncedAt: now_(),
    Version: item.version,
  };

  const merged = Object.assign({ CreatedAt: now_() }, currentObj, pulledFields);

  if (isNew) {
    appendRow_(SHEETS.PROJECTS, objectToRow_(merged, PROJECT_HEADERS));
  } else {
    sheet
      .getRange(rowIndex, 1, 1, PROJECT_HEADERS.length)
      .setValues([objectToRow_(merged, PROJECT_HEADERS)]);
  }
  return { applied: true, isNew: isNew };
}

function applyPulledGoal_(item) {
  const descriptor = SYNC_ENTITIES[2];
  let rowIndex = findRowIndexByExternalId_(descriptor, item.externalId);
  if (rowIndex === -1) rowIndex = findRowIndexByBackendId_(descriptor, item.id);

  const sheet = getOrCreateSheet_(SHEETS.GOALS);
  const isNew = rowIndex === -1;
  let currentObj = {};

  if (!isNew) {
    const current = sheet.getRange(rowIndex, 1, 1, GOAL_HEADERS.length).getValues()[0];
    GOAL_HEADERS.forEach(function (h, i) {
      currentObj[h] = current[i];
    });
    if (
      currentObj.UpdatedAt &&
      new Date(currentObj.UpdatedAt).getTime() >= new Date(item.updatedAt).getTime()
    ) {
      return { applied: false, isNew: false };
    }
  }

  const pulledFields = {
    GoalId: isNew
      ? generateNextId_(SHEETS.GOALS, "GoalId", GOAL_HEADERS, ID_PREFIX.GOAL)
      : currentObj.GoalId,
    GoalName: item.name,
    Area: toSheetEnum_("Area", item.area),
    TargetDate: isoToDate_(item.targetDate),
    Progress: item.progress,
    Status: toSheetEnum_("GoalStatus", item.status),
    UpdatedAt: isoToDate_(item.updatedAt),
    BackendId: item.id,
    SyncStatus: "Synced",
    LastSyncedAt: now_(),
    Version: item.version,
  };

  const merged = Object.assign({ CreatedAt: now_() }, currentObj, pulledFields);

  if (isNew) {
    appendRow_(SHEETS.GOALS, objectToRow_(merged, GOAL_HEADERS));
  } else {
    sheet.getRange(rowIndex, 1, 1, GOAL_HEADERS.length).setValues([objectToRow_(merged, GOAL_HEADERS)]);
  }
  return { applied: true, isNew: isNew };
}

function applyPulledHabit_(item) {
  const descriptor = SYNC_ENTITIES[3];
  let rowIndex = findRowIndexByExternalId_(descriptor, item.externalId);
  if (rowIndex === -1) rowIndex = findRowIndexByBackendId_(descriptor, item.id);

  const sheet = getOrCreateSheet_(SHEETS.HABITS);
  const isNew = rowIndex === -1;
  let currentObj = {};

  if (!isNew) {
    const current = sheet.getRange(rowIndex, 1, 1, HABIT_HEADERS.length).getValues()[0];
    HABIT_HEADERS.forEach(function (h, i) {
      currentObj[h] = current[i];
    });
    if (
      currentObj.UpdatedAt &&
      new Date(currentObj.UpdatedAt).getTime() >= new Date(item.updatedAt).getTime()
    ) {
      return { applied: false, isNew: false };
    }
  }

  const pulledFields = {
    HabitId: isNew
      ? generateNextId_(SHEETS.HABITS, "HabitId", HABIT_HEADERS, ID_PREFIX.HABIT)
      : currentObj.HabitId,
    HabitName: item.name,
    Frequency: item.frequency,
    Streak: item.streak,
    TargetCount: item.targetCount,
    CompletedCount: item.completedCount,
    LastCompletedDate: isoToDate_(item.lastCompletedDate),
    UpdatedAt: isoToDate_(item.updatedAt),
    BackendId: item.id,
    SyncStatus: "Synced",
    LastSyncedAt: now_(),
    Version: item.version,
  };

  const merged = Object.assign({ CreatedAt: now_() }, currentObj, pulledFields);

  if (isNew) {
    appendRow_(SHEETS.HABITS, objectToRow_(merged, HABIT_HEADERS));
  } else {
    sheet.getRange(rowIndex, 1, 1, HABIT_HEADERS.length).setValues([objectToRow_(merged, HABIT_HEADERS)]);
  }
  return { applied: true, isNew: isNew };
}

function pullAllChanges_(sinceIso) {
  const response = fetchWithRetry_(
    getSyncBaseUrl_() + "/api/sync/pull?since=" + encodeURIComponent(sinceIso),
    { method: "get", headers: syncAuthHeaders_() },
  );

  if (response.getResponseCode() === 401) {
    throw new Error('Not authenticated — use "Connect to Backend..." first.');
  }
  if (response.getResponseCode() >= 300) {
    throw new Error(
      "Pull failed: HTTP " + response.getResponseCode() + " — " + response.getContentText(),
    );
  }

  const result = JSON.parse(response.getContentText());
  let applied = 0,
    newRows = 0,
    skippedStale = 0;

  // Projects/Goals first and with no cross-entity dependency of their
  // own, so Tasks (which reference them) can resolve BackendId -> Sheets
  // id against maps that already include anything just pulled in this
  // same cycle, not only what Sheets already knew about before it.
  (result.projects || []).forEach(function (item) {
    const r = applyPulledProject_(item);
    if (r.applied) {
      applied++;
      if (r.isNew) newRows++;
    } else skippedStale++;
  });
  (result.goals || []).forEach(function (item) {
    const r = applyPulledGoal_(item);
    if (r.applied) {
      applied++;
      if (r.isNew) newRows++;
    } else skippedStale++;
  });

  const projectExtMap = buildBackendToExternalMap_(SYNC_ENTITIES[1]);
  const goalExtMap = buildBackendToExternalMap_(SYNC_ENTITIES[2]);
  const taskExtMap = buildBackendToExternalMap_(SYNC_ENTITIES[0]);

  (result.tasks || []).forEach(function (item) {
    const r = applyPulledTask_(item, projectExtMap, goalExtMap, taskExtMap);
    if (r.applied) {
      applied++;
      if (r.isNew) newRows++;
    } else skippedStale++;
  });
  (result.habits || []).forEach(function (item) {
    const r = applyPulledHabit_(item);
    if (r.applied) {
      applied++;
      if (r.isNew) newRows++;
    } else skippedStale++;
  });

  return { serverTime: result.serverTime, applied: applied, newRows: newRows, skippedStale: skippedStale };
}

/* ==========================================================================
 * ORCHESTRATION — the one engine both "Sync Now" and the time trigger call
 * ========================================================================== */

function logSyncRun_(status, message) {
  logActivity_("Sync", "Sync", status, "", message);
}

function syncAll_(options) {
  const verbose = !!(options && options.verbose);
  const lock = LockService.getScriptLock();
  const gotLock = lock.tryLock(SYNC_LOCK_WAIT_MS);

  if (!gotLock) {
    logSyncRun_("Skipped", "Another sync run is already in progress.");
    if (verbose) toast_("Another sync is already running — try again shortly.", "Sync");
    return { status: "Skipped" };
  }

  try {
    if (!hasValidSyncToken_()) {
      logSyncRun_("Failed", 'Not connected — use "Connect to Backend..." first.');
      if (verbose) {
        SpreadsheetApp.getUi().alert(
          "Not connected",
          'Use Smart Task > Sync > Connect to Backend... first.',
          SpreadsheetApp.getUi().ButtonSet.OK,
        );
      }
      return { status: "Failed", message: "Not connected" };
    }

    const pushSummary = pushAllDirty_();

    const since = getSyncProp_(SYNC_PROP.LAST_PULL_AT) || "1970-01-01T00:00:00Z";
    const pullSummary = pullAllChanges_(since);
    setSyncProp_(SYNC_PROP.LAST_PULL_AT, pullSummary.serverTime);

    const summary =
      "Push: " +
      pushSummary.created +
      " created, " +
      pushSummary.updated +
      " updated, " +
      pushSummary.skipped +
      " skipped (server newer), " +
      pushSummary.errors +
      " errors. Pull: " +
      pullSummary.applied +
      " applied (" +
      pullSummary.newRows +
      " new), " +
      pullSummary.skippedStale +
      " skipped (local newer).";

    logSyncRun_(pushSummary.errors > 0 ? "PartialFailure" : "Success", summary);
    if (verbose) toast_(summary, "Sync complete");

    return { status: "Success", push: pushSummary, pull: pullSummary };
  } catch (e) {
    // A failure here means the exception was thrown BEFORE any
    // SaveChangesAsync/setValues call that could have overwritten Sheets
    // data — pushAllDirty_/pullAllChanges_ only ever mutate the sheet
    // after a successful HTTP response, so a network/auth failure here
    // always leaves Sheets exactly as it was, dirty rows still dirty.
    logSyncRun_("Failed", e.message);
    if (verbose) {
      SpreadsheetApp.getUi().alert("Sync failed", e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    }
    return { status: "Failed", message: e.message };
  } finally {
    lock.releaseLock();
  }
}

function syncNowManual_() {
  syncAll_({ verbose: true });
}

function runScheduledSync_() {
  syncAll_({ verbose: false });
}

/* ==========================================================================
 * TRIGGER SETUP — idempotent, no duplicate time triggers
 * ========================================================================== */

function setupSyncTrigger_() {
  const existing = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === SYNC_TRIGGER_HANDLER;
  });
  // Delete-then-recreate is simpler and safer than trying to verify an
  // existing trigger's interval already matches, and guarantees exactly
  // one trigger regardless of how many stale ones accumulated before.
  existing.forEach(function (t) {
    ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger(SYNC_TRIGGER_HANDLER)
    .timeBased()
    .everyMinutes(SYNC_TRIGGER_INTERVAL_MINUTES)
    .create();

  toast_("Auto-sync enabled — runs every " + SYNC_TRIGGER_INTERVAL_MINUTES + " minutes.", "Sync");
}

function disableSyncTrigger_() {
  const existing = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === SYNC_TRIGGER_HANDLER;
  });
  existing.forEach(function (t) {
    ScriptApp.deleteTrigger(t);
  });
  toast_("Auto-sync disabled.", "Sync");
}

/* ==========================================================================
 * DIRTY-ROW DETECTION — simple trigger, covers both scripted edits
 * (createTask_/updateProject_/...) and direct hand-edits in the Goals/
 * Habits sheets (which have no dedicated dialog UI to route through)
 * ========================================================================== */

function onEdit(e) {
  try {
    if (!e || !e.range) return;

    const sheet = e.range.getSheet();
    const sheetName = sheet.getName();
    const descriptor = SYNC_ENTITIES.find(function (d) {
      return d.sheet === sheetName;
    });
    if (!descriptor) return;

    const row = e.range.getRow();
    if (row < 2) return; // header row

    const startCol = e.range.getColumn();
    const endCol = startCol + e.range.getNumColumns() - 1;
    const syncColStart = descriptor.headers.indexOf("BackendId") + 1; // 1-based
    const syncColEnd = descriptor.headers.indexOf("Version") + 1;

    // The edited range falls entirely inside the 4 trailing sync columns
    // — this is the sync engine's own write-back (writeSyncColumnsBack_/
    // applyPulled*_'s BackendId/SyncStatus/LastSyncedAt/Version fields),
    // not a real user edit. Skip, or every push/pull would immediately
    // re-dirty the very row it just finished syncing.
    if (startCol >= syncColStart && endCol <= syncColEnd) return;

    const statusCol = descriptor.headers.indexOf("SyncStatus") + 1;
    sheet.getRange(row, statusCol).setValue("NotSynced");
  } catch (err) {
    // Simple triggers can't show UI and must never throw — an uncaught
    // error here would break editing on the sheet entirely, which is far
    // worse than one row missing its dirty flag for a cycle.
  }
}
