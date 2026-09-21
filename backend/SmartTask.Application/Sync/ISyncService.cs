namespace SmartTask.Application.Sync;

public interface ISyncService
{
    Task<SyncPushResponse> PushAsync(SyncPushRequest request, CancellationToken cancellationToken = default);

    Task<SyncPullResponse> PullAsync(
        DateTimeOffset since,
        CancellationToken cancellationToken = default
    );
}
