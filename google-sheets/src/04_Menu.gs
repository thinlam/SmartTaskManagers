/**
 * 04_Menu.gs
 * -----------------------------------------------------------------------
 * Custom menu. Kept minimal for this build step (Setup + Data Model
 * only) - Dashboard/Today/Smart Engine/Sidebar UI are later steps and
 * will add their own menu items here without touching this file's
 * existing entries.
 * -----------------------------------------------------------------------
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Smart Task')
    .addItem('Set Up / Repair Workspace', 'setupSmartTask')
    .addSeparator()
    .addItem('Quick Add Task...', 'quickAddTaskPrompt_')
    .addItem('Refresh Everything', 'refreshAll_')
    .addItem('Refresh Dashboard', 'renderDashboard_')
    .addItem('Refresh Today', 'renderToday_')
    .addItem('Refresh Task Summary', 'renderTaskSummary_')
    .addToUi();
}

function quickAddTaskPrompt_() {
  const ui = SpreadsheetApp.getUi();
  const result = ui.prompt('Quick Add Task', 'Task name:', ui.ButtonSet.OK_CANCEL);
  if (result.getSelectedButton() !== ui.Button.OK) return;

  const name = result.getResponseText().trim();
  if (!name) {
    ui.alert('Task name cannot be empty.');
    return;
  }
  const taskId = createTask_({ TaskName: name });
  renderDashboard_();
  renderToday_();
  renderTaskSummary_();
  toast_('Added "' + name + '" (' + taskId + ') to Inbox.', 'Smart Task');
}