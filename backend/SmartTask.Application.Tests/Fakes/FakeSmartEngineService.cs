using SmartTask.Application.SmartEngine;
using SmartTask.Domain.Enums;
using SmartTask.Domain.Tasks;

namespace SmartTask.Application.Tests.Fakes;

/// <summary>Stubbed-out Smart Engine — returns fixed, inert values so TaskServiceTests aren't coupled to the real scoring algorithm.</summary>
public sealed class FakeSmartEngineService : ISmartEngineService
{
    public Task<SmartFieldsResult> ComputeAsync(TaskItem task, CancellationToken cancellationToken = default) =>
        Task.FromResult(new SmartFieldsResult(50, RiskLevel.Low, "none"));

    public Task<int> RecalculateAllAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(0);
}
