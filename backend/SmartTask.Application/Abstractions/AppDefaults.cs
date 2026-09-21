namespace SmartTask.Application.Abstractions;

/// <summary>
/// Hard-coded values matching DEFAULT_SETTINGS in
/// apps/google-sheets/src/00_Constants.gs — used wherever the backend
/// would otherwise read from a Settings store that doesn't exist yet
/// (see SmartEngineService's and NotificationService's doc comments; a
/// real Settings API is its own future phase). Shared here instead of
/// duplicated per-service so the two stay in sync.
/// </summary>
public static class AppDefaults
{
    public const int DueSoonDays = 2;
}
