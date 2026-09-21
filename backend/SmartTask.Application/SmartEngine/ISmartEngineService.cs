using SmartTask.Domain.Enums;
using SmartTask.Domain.Tasks;

namespace SmartTask.Application.SmartEngine;

public sealed record SmartFieldsResult(int SmartScore, RiskLevel Risk, string RecommendedAction);

public interface ISmartEngineService
{
    /// <summary>Computed fields for one task, "as of now" — never persists anything itself.</summary>
    Task<SmartFieldsResult> ComputeAsync(TaskItem task, CancellationToken cancellationToken = default);

    /// <summary>
    /// Recomputes and saves SmartScore/Risk/RecommendedAction for every
    /// task — port of recalculateAllSmartFields_(). Needed because
    /// urgency/risk shift with the calendar even when nobody edits a
    /// task (a task due "in 3 days" becomes "due today" without any
    /// write happening). Returns how many tasks were updated.
    /// </summary>
    Task<int> RecalculateAllAsync(CancellationToken cancellationToken = default);
}
