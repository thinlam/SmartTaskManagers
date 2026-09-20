namespace SmartTask.Domain.Common;

/// <summary>
/// Base type for every domain entity. Framework-free by design — Domain
/// has no package references at all (verify with `dotnet list package`),
/// matching Clean Architecture's dependency rule (Domain depends on
/// nothing, everything else depends inward on Domain).
///
/// Real entities (Task/Project/Goal/Habit, matching TASK_HEADERS/
/// PROJECT_HEADERS/GOAL_HEADERS/HABIT_HEADERS in
/// apps/google-sheets/src/00_Constants.gs) land in Phase 21 — this Phase
/// (20) is scaffolding only: the 5-project skeleton, correct reference
/// direction, and one real vertical slice (see SmartTask.Api's
/// HealthController) proving the layers actually compose.
/// </summary>
public abstract class Entity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();
}
