namespace SmartTask.Domain.Enums;

/// <summary>
/// Every enum here matches LOOKUP_LISTS in apps/google-sheets/src/
/// 00_Constants.gs value-for-value (same source packages/types's Area/
/// Priority/TaskStatus/Risk/GoalStatus/HabitFrequency already port on the
/// frontend side). Persistence's EntityTypeConfiguration classes store
/// these as strings (HasConversion&lt;string&gt;()), not the EF Core
/// default int, so the database stays human-readable and directly
/// comparable against Sheets' own string values ahead of Phase 28 sync.
/// </summary>
public enum AreaType
{
    Career,
    Learning,
    Health,
    Personal,
    PersonalAdmin,
}

public enum PriorityLevel
{
    Critical,
    Urgent,
    High,
    Medium,
    Low,
}

public enum TaskStatusType
{
    Inbox,
    ToDo,
    InProgress,
    Waiting,
    Completed,
}

public enum RiskLevel
{
    Low,
    Medium,
    High,
    Critical,
}

public enum EnergyLevel
{
    High,
    Medium,
    Low,
    Any,
}

public enum TaskContextType
{
    Computer,
    Phone,
    Anywhere,
    Errand,
    Home,
}

public enum RecurringTypeOption
{
    None,
    Daily,
    Weekly,
    Monthly,
}

public enum ProjectHealthLevel
{
    Healthy,
    Attention,
    AtRisk,
    Critical,
}

public enum GoalStatusType
{
    OnTrack,
    AtRisk,
    Completed,
}

public enum HabitFrequencyType
{
    Daily,
    Weekly,
    Custom,
}
