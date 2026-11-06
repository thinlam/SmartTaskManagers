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

/// <summary>
/// Project's own priority scale — deliberately a separate enum from
/// PriorityLevel (no Urgent): entered by hand on the create/edit form,
/// unlike Task's Priority which that form's spec never asked to touch.
/// </summary>
public enum ProjectPriorityLevel
{
    Critical,
    High,
    Medium,
    Low,
}

/// <summary>"Lĩnh vực" on the create/edit Project form — optional.</summary>
public enum ProjectFieldType
{
    Technology,
    Education,
    Business,
    Marketing,
    Finance,
    Hr,
    Design,
    Operations,
    Healthcare,
    Legal,
    Research,
    Personal,
    Other,
}

/// <summary>"Danh mục" on the create/edit Project form — optional.</summary>
public enum ProjectCategoryType
{
    Work,
    Study,
    SideProject,
    Personal,
    Family,
    Health,
    PersonalFinance,
    Other,
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
