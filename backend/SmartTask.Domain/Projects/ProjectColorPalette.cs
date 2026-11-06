namespace SmartTask.Domain.Projects;

/// <summary>
/// Preset swatches offered on the create/edit Project form. Order matters:
/// when a user leaves Color blank, ProjectService assigns
/// Colors[existingProjectCount % Colors.Length] so each new project gets
/// the next color in rotation. Keep this list identical, in the same
/// order, to packages/ui's PROJECT_COLOR_PALETTE — the two are not wired
/// together programmatically, just kept in sync by hand.
/// </summary>
public static class ProjectColorPalette
{
    public static readonly string[] Colors =
    [
        "#6366F1",
        "#06B6D4",
        "#10B981",
        "#F59E0B",
        "#EF4444",
        "#EC4899",
        "#8B5CF6",
        "#14B8A6",
        "#F97316",
        "#6B7280",
    ];

    public static string NextColor(int existingProjectCount) =>
        Colors[existingProjectCount % Colors.Length];
}
