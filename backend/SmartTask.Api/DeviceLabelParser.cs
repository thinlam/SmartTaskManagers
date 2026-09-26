namespace SmartTask.Api;

/// <summary>
/// A small heuristic for the Active Sessions list's "MacBook Pro ·
/// Chrome"-style label — not a security boundary (the actual boundary
/// is the session id / revocation, not this string) and not a full
/// user-agent parsing library. Good enough for a human glancing at
/// their own device list.
/// </summary>
public static class DeviceLabelParser
{
    public static string Parse(string? userAgent)
    {
        if (string.IsNullOrWhiteSpace(userAgent))
        {
            return "Unknown device";
        }

        var browser = userAgent switch
        {
            _ when userAgent.Contains("Edg/") => "Edge",
            _ when userAgent.Contains("Chrome/") => "Chrome",
            _ when userAgent.Contains("Firefox/") => "Firefox",
            _ when userAgent.Contains("Safari/") && !userAgent.Contains("Chrome/") => "Safari",
            _ => null,
        };

        var os = userAgent switch
        {
            _ when userAgent.Contains("Windows") => "Windows",
            _ when userAgent.Contains("Mac OS X") && userAgent.Contains("Mobile") => "iPhone",
            _ when userAgent.Contains("Mac OS X") => "Mac",
            _ when userAgent.Contains("Android") => "Android",
            _ when userAgent.Contains("Linux") => "Linux",
            _ => null,
        };

        return (browser, os) switch
        {
            (not null, not null) => $"{browser} on {os}",
            (not null, null) => browser,
            (null, not null) => os,
            (null, null) => "Unknown device",
        };
    }
}
