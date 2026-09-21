using SmartTask.Domain.Enums;

namespace SmartTask.Application.SmartEngine;

/// <summary>
/// 1:1 port of SMART_WEIGHTS in apps/google-sheets/src/05_SmartEngine.gs.
/// Every number here should match that file exactly — change SMART_WEIGHTS
/// first if a rule needs to change, then port the new number here.
/// </summary>
public static class SmartWeights
{
    public static readonly UrgencyWeights Urgency = new(Overdue: 30, DueToday: 25, DueSoon: 15, DueThisWeek: 8, Later: 0);

    public static readonly IReadOnlyDictionary<PriorityLevel, int> Impact = new Dictionary<PriorityLevel, int>
    {
        [PriorityLevel.Critical] = 25,
        [PriorityLevel.Urgent] = 20,
        [PriorityLevel.High] = 15,
        [PriorityLevel.Medium] = 8,
        [PriorityLevel.Low] = 3,
    };

    public static readonly EffortFitWeights EffortFit = new(Tiny: 15, Small: 12, Medium: 8, Large: 4, Xlarge: 0);

    public const int GoalAlignment = 15;
    public const int TaskAgePerTwoDays = 1;
    public const int TaskAgeCap = 15;

    public static readonly RiskWeights Risk = new(
        Overdue: 40,
        DueToday: 25,
        DueSoon: 10,
        Blocked: 20,
        DependencyPending: 15,
        Stalled: 15,
        CriticalPriority: 10
    );

    public const int RiskBucketCritical = 60;
    public const int RiskBucketHigh = 35;
    public const int RiskBucketMedium = 15;
}

public readonly record struct UrgencyWeights(int Overdue, int DueToday, int DueSoon, int DueThisWeek, int Later);

public readonly record struct EffortFitWeights(int Tiny, int Small, int Medium, int Large, int Xlarge);

public readonly record struct RiskWeights(
    int Overdue,
    int DueToday,
    int DueSoon,
    int Blocked,
    int DependencyPending,
    int Stalled,
    int CriticalPriority
);
