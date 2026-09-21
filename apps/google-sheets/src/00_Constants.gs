/**
 * 00_Constants.gs
 * -----------------------------------------------------------------------
 * Single source of truth for sheet names, column headers, lookup lists,
 * ID prefixes and design tokens. Never hard-code these strings elsewhere.
 * Personal Mode: no Owner/Member/Team fields anywhere in this file.
 * -----------------------------------------------------------------------
 */

// SHEET NAMES
const SHEETS = {
  DASHBOARD: 'Dashboard',
  TODAY: 'Today',
  TASKS: 'Tasks',
  PROJECTS: 'Projects',
  CALENDAR: 'Calendar',
  KANBAN: 'Kanban',
  TIMELINE: 'Timeline',
  GOALS: 'Goals',
  HABITS: 'Habits',
  REPORTS: 'Reports',
  SETTINGS: 'Settings',
  LISTS: 'Lists',
  ACTIVITY_LOG: 'ActivityLog'
};

// Sheets that are pure "data" sheets (setup creates headers + validation).
// Dashboard/Today/Calendar/Kanban/Timeline/Reports are VIEW sheets built
// later on top of this data - they read from these, never store their own copy.
const DATA_SHEETS = [
  SHEETS.TASKS,
  SHEETS.PROJECTS,
  SHEETS.GOALS,
  SHEETS.HABITS,
  SHEETS.SETTINGS,
  SHEETS.LISTS,
  SHEETS.ACTIVITY_LOG
];

const VIEW_SHEETS = [
  SHEETS.DASHBOARD,
  SHEETS.TODAY,
  SHEETS.CALENDAR,
  SHEETS.KANBAN,
  SHEETS.TIMELINE,
  SHEETS.REPORTS
];

// ID PREFIXES
const ID_PREFIX = {
  TASK: 'TASK-',
  PROJECT: 'PRJ-',
  GOAL: 'GOAL-',
  HABIT: 'HAB-'
};
const ID_PAD_LENGTH = 4; // TASK-0001

// TASKS
// Matches Frame 05 (Tasks list), Frame 06 (Task Detail), Frame 07 (Quick Add)
const TASK_HEADERS = [
  'TaskId',            // A  TASK-0001
  'TaskName',          // B
  'Description',       // C
  'Area',              // D  Career / Learning / Health / Personal / Personal Admin
  'Project',           // E  ProjectId (blank = no project)
  'Category',          // F  e.g. Deep Work, Admin, Errand
  'Tags',              // G  comma-separated
  'Priority',          // H  Critical/Urgent/High/Medium/Low
  'Status',            // I  Inbox/To Do/In Progress/Waiting/Completed
  'StartDate',         // J
  'DueDate',           // K
  'DueTime',           // L  optional HH:mm
  'CompletedDate',     // M
  'Progress',          // N  0-100
  'EstimateMinutes',   // O
  'Energy',            // P  High/Medium/Low/Any
  'Context',           // Q  Computer/Phone/Anywhere/Errand/Home
  'GoalId',            // R  optional link to Goals
  'RecurringType',     // S  None/Daily/Weekly/Monthly
  'DependencyTaskId',  // T  optional TaskId this depends on
  'SmartScore',        // U  0-100, computed
  'Risk',              // V  Low/Medium/High/Critical, computed
  'RecommendedAction', // W  computed
  'CreatedAt',         // X
  'UpdatedAt',         // Y
  'LastStatusChangedAt', // Z
  'Notes',             // AA

  // Phase 28 — sync columns, always trailing so appending them never
  // shifts an existing row's business columns. BackendId is the join key
  // the other direction (this row's UUID once pushed at least once).
  'BackendId',         // AB  UUID once synced, blank until first successful push
  'SyncStatus',        // AC  NotSynced/Synced/Conflict — see LOOKUP_LISTS.SyncStatus
  'LastSyncedAt',       // AD
  'Version'             // AE  bumped by the backend on every accepted push
];

// PROJECTS
// Matches Frame 11 (Projects)
const PROJECT_HEADERS = [
  'ProjectId',    // PRJ-0001
  'ProjectName',
  'Area',
  'Health',       // Healthy/Attention/At Risk/Critical
  'TargetDate',
  'Description',
  'CreatedAt',
  'UpdatedAt',

  // Phase 28 — see TASK_HEADERS's identical trailing block.
  'BackendId',
  'SyncStatus',
  'LastSyncedAt',
  'Version'
];

// GOALS
// Matches Frame 13 (Goals & Habits)
const GOAL_HEADERS = [
  'GoalId',       // GOAL-0001
  'GoalName',
  'Area',
  'TargetDate',
  'Progress',     // 0-100
  'Status',       // On Track/At Risk/Completed
  'CreatedAt',
  'UpdatedAt',

  // Phase 28 — see TASK_HEADERS's identical trailing block.
  'BackendId',
  'SyncStatus',
  'LastSyncedAt',
  'Version'
];

// HABITS
const HABIT_HEADERS = [
  'HabitId',          // HAB-0001
  'HabitName',
  'Frequency',        // Daily/Weekly/Custom
  'Streak',           // consecutive days/weeks
  'TargetCount',       // e.g. 15 (per period tracked in Reports)
  'CompletedCount',
  'LastCompletedDate',
  'CreatedAt',
  'UpdatedAt',

  // Phase 28 — see TASK_HEADERS's identical trailing block.
  'BackendId',
  'SyncStatus',
  'LastSyncedAt',
  'Version'
];

// ACTIVITY LOG
const ACTIVITY_LOG_HEADERS = [
  'Timestamp',
  'EntityType',  // Task/Project/Goal/Habit
  'EntityId',
  'Action',      // Created/Updated/StatusChanged/Completed/Deleted
  'OldValue',
  'NewValue'
];

// LOOKUP LISTS (source for Data Validation dropdowns)
// Each key becomes one column on the Lists sheet.
const LOOKUP_LISTS = {
  Area: ['Career', 'Learning', 'Health', 'Personal', 'Personal Admin'],
  Priority: ['Critical', 'Urgent', 'High', 'Medium', 'Low'],
  Status: ['Inbox', 'To Do', 'In Progress', 'Waiting', 'Completed'],
  Risk: ['Low', 'Medium', 'High', 'Critical'],
  Energy: ['High', 'Medium', 'Low', 'Any'],
  Context: ['Computer', 'Phone', 'Anywhere', 'Errand', 'Home'],
  RecurringType: ['None', 'Daily', 'Weekly', 'Monthly'],
  ProjectHealth: ['Healthy', 'Attention', 'At Risk', 'Critical'],
  GoalStatus: ['On Track', 'At Risk', 'Completed'],
  HabitFrequency: ['Daily', 'Weekly', 'Custom'],
  SyncStatus: ['NotSynced', 'Synced', 'Conflict']
};

// SYNC (Phase 28)
// -----------------------------------------------------------------------
// Which data sheets round-trip with the backend, and how to find each
// one's dirty rows. `key` matches the JSON array name the backend's
// SyncPushRequest/SyncPullResponse use (tasks/projects/goals/habits) —
// see backend/SmartTask.Application/Sync/SyncContracts.cs.
const SYNC_ENTITIES = [
  { key: 'tasks', sheet: SHEETS.TASKS, headers: TASK_HEADERS, idHeader: 'TaskId', prefix: ID_PREFIX.TASK },
  { key: 'projects', sheet: SHEETS.PROJECTS, headers: PROJECT_HEADERS, idHeader: 'ProjectId', prefix: ID_PREFIX.PROJECT },
  { key: 'goals', sheet: SHEETS.GOALS, headers: GOAL_HEADERS, idHeader: 'GoalId', prefix: ID_PREFIX.GOAL },
  { key: 'habits', sheet: SHEETS.HABITS, headers: HABIT_HEADERS, idHeader: 'HabitId', prefix: ID_PREFIX.HABIT }
];

// Enum values where the C# backend's enum member name (no spaces allowed)
// diverges from Sheets' own display string. Everything not listed here
// (Priority/Risk/Energy/Context/RecurringType/HabitFrequency) is identical
// on both sides and needs no mapping — mirrors
// packages/api-client/src/enumMappings.ts's frontend-side version of this
// exact problem, found independently in Phase 27.
const SYNC_ENUM_TO_BACKEND = {
  Area: { 'Personal Admin': 'PersonalAdmin' },
  Status: { 'To Do': 'ToDo', 'In Progress': 'InProgress' },
  GoalStatus: { 'On Track': 'OnTrack', 'At Risk': 'AtRisk' }
};
const SYNC_ENUM_TO_SHEET = {
  Area: { PersonalAdmin: 'Personal Admin' },
  Status: { ToDo: 'To Do', InProgress: 'In Progress' },
  GoalStatus: { OnTrack: 'On Track', AtRisk: 'At Risk' },
  // ProjectHealth is pull-only (never pushed — see backend's Project.Health
  // doc comment, Phase 21/24), so only the to-Sheet direction is needed.
  ProjectHealth: { AtRisk: 'At Risk' }
};

// SETTINGS DEFAULTS
// Matches Frame 15 (Settings). Row shape: [Key, Value, Category]
const DEFAULT_SETTINGS = [
  ['WorkspaceName', "My Smart Task", 'General'],
  ['Language', 'English', 'General'],
  ['WeekStart', 'Monday', 'General'],
  ['DateFormat', 'DD MMM YYYY', 'General'],
  ['DefaultStatus', 'Inbox', 'Task Defaults'],
  ['DefaultPriority', 'Medium', 'Task Defaults'],
  ['DefaultEstimateMinutes', 30, 'Task Defaults'],
  ['DueSoonDays', 2, 'Task Defaults'],
  ['FocusDaysStart', 'Monday', 'Focus & Schedule'],
  ['FocusDaysEnd', 'Saturday', 'Focus & Schedule'],
  ['FocusWindowStart', '09:00', 'Focus & Schedule'],
  ['FocusWindowEnd', '21:30', 'Focus & Schedule'],
  ['DailyFocusLimitHours', 4, 'Focus & Schedule'],
  ['Weekend', 'Sunday', 'Focus & Schedule'],
  ['SmartScoreEnabled', true, 'Smart Engine'],
  ['GoalAlignmentEnabled', true, 'Smart Engine'],
  ['ScheduleOverloadWarning', true, 'Smart Engine'],
  ['ExplainRecommendations', true, 'Smart Engine']
];

// DESIGN TOKENS (Frame 01)
const COLORS = {
  primary: '#4F46E5',
  primaryHover: '#4338CA',
  primaryLight: '#EEF2FF',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  info: '#2563EB',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surface2: '#F1F5F9',
  text: '#1E293B',
  text2: '#64748B',
  muted: '#94A3B8',
  border: '#E2E8F0'
};