using SmartTask.Application.Tasks;
using SmartTask.Application.Tests.Fakes;
using SmartTask.Domain.Enums;
using SmartTask.Domain.Tasks;

namespace SmartTask.Application.Tests.Tasks;

/// <summary>
/// Covers the validation/soft-delete/recurrence logic TaskService added in
/// Phase 1 of the Task redesign — the first backend tests in this repo
/// (see docs/project/04, 2026-11-07). Uses hand-written fakes, not a mocking
/// library or a real database, so these run anywhere with no setup.
/// </summary>
public sealed class TaskServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 7, 10, 0, 0, TimeSpan.Zero);

    private static TaskService CreateSut(FakeTaskRepository? repository = null) =>
        new(
            repository ?? new FakeTaskRepository(),
            new FakeTagRepository(),
            new FakeDateTimeProvider(Now),
            new FakeSmartEngineService()
        );

    private static CreateTaskRequest MinimalRequest(string name = "Buy milk") => new() { Name = name };

    [Fact]
    public async Task CreateAsync_TrimsNameAndAssignsEndOfListPosition()
    {
        var repository = new FakeTaskRepository();
        var sut = CreateSut(repository);

        var first = await sut.CreateAsync(MinimalRequest("  First task  "));
        var second = await sut.CreateAsync(MinimalRequest("Second task"));

        Assert.Equal("First task", first.Name);
        Assert.Equal(0, first.Position);
        Assert.Equal(1, second.Position);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateAsync_BlankName_ThrowsWithNameFieldError(string blankName)
    {
        var sut = CreateSut();

        var ex = await Assert.ThrowsAsync<TaskValidationException>(
            () => sut.CreateAsync(MinimalRequest(blankName))
        );

        Assert.True(ex.Errors.ContainsKey("Name"));
    }

    [Fact]
    public async Task CreateAsync_NameOver200Chars_Throws()
    {
        var sut = CreateSut();
        var tooLong = new string('a', 201);

        var ex = await Assert.ThrowsAsync<TaskValidationException>(
            () => sut.CreateAsync(MinimalRequest(tooLong))
        );

        Assert.True(ex.Errors.ContainsKey("Name"));
    }

    [Fact]
    public async Task CreateAsync_DueDateBeforeStartDate_Throws()
    {
        var sut = CreateSut();
        var request = new CreateTaskRequest
        {
            Name = "Buy milk",
            StartDate = new DateOnly(2026, 11, 10),
            DueDate = new DateOnly(2026, 11, 5),
        };

        var ex = await Assert.ThrowsAsync<TaskValidationException>(() => sut.CreateAsync(request));

        Assert.True(ex.Errors.ContainsKey("DueDate"));
    }

    [Fact]
    public async Task CreateAsync_ReminderAfterDueMoment_Throws()
    {
        var sut = CreateSut();
        var request = new CreateTaskRequest
        {
            Name = "Buy milk",
            DueDate = new DateOnly(2026, 11, 10),
            DueTime = new TimeOnly(9, 0),
            ReminderAt = new DateTimeOffset(2026, 11, 10, 9, 30, 0, TimeSpan.Zero),
        };

        var ex = await Assert.ThrowsAsync<TaskValidationException>(() => sut.CreateAsync(request));

        Assert.True(ex.Errors.ContainsKey("ReminderAt"));
    }

    [Fact]
    public async Task CreateAsync_ReminderBeforeDueMoment_Succeeds()
    {
        var sut = CreateSut();
        var request = new CreateTaskRequest
        {
            Name = "Buy milk",
            DueDate = new DateOnly(2026, 11, 10),
            DueTime = new TimeOnly(9, 0),
            ReminderAt = new DateTimeOffset(2026, 11, 9, 9, 0, 0, TimeSpan.Zero),
        };

        var created = await sut.CreateAsync(request);

        Assert.Equal(request.ReminderAt, created.ReminderAt);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(10081)]
    public async Task CreateAsync_EstimateMinutesOutOfRange_Throws(int estimateMinutes)
    {
        var sut = CreateSut();
        var request = new CreateTaskRequest { Name = "Buy milk", EstimateMinutes = estimateMinutes };

        var ex = await Assert.ThrowsAsync<TaskValidationException>(() => sut.CreateAsync(request));

        Assert.True(ex.Errors.ContainsKey("EstimateMinutes"));
    }

    [Fact]
    public async Task CreateAsync_MoreThan10Tags_Throws()
    {
        var sut = CreateSut();
        var elevenTags = Enumerable.Range(1, 11).Select(i => $"tag{i}").ToList();
        var request = new CreateTaskRequest { Name = "Buy milk", Tags = elevenTags };

        var ex = await Assert.ThrowsAsync<TaskValidationException>(() => sut.CreateAsync(request));

        Assert.True(ex.Errors.ContainsKey("Tags"));
    }

    [Fact]
    public async Task CreateAsync_TagLongerThan30Chars_Throws()
    {
        var sut = CreateSut();
        var request = new CreateTaskRequest
        {
            Name = "Buy milk",
            Tags = [new string('a', 31)],
        };

        var ex = await Assert.ThrowsAsync<TaskValidationException>(() => sut.CreateAsync(request));

        Assert.True(ex.Errors.ContainsKey("Tags"));
    }

    [Fact]
    public async Task CreateAsync_TagsAreCaseInsensitiveAndDeduped()
    {
        var repository = new FakeTaskRepository();
        var tagRepository = new FakeTagRepository();
        var sut = new TaskService(
            repository,
            tagRepository,
            new FakeDateTimeProvider(Now),
            new FakeSmartEngineService()
        );

        var created = await sut.CreateAsync(
            new CreateTaskRequest { Name = "Buy milk", Tags = ["Work", "work", " WORK ", "Home"] }
        );

        Assert.Equal(["Home", "Work"], created.Tags.OrderBy(t => t).ToList());
    }

    [Fact]
    public async Task UpdateAsync_TagsOmitted_LeavesExistingTagsUnchanged()
    {
        var sut = CreateSut();
        var created = await sut.CreateAsync(new CreateTaskRequest { Name = "Buy milk", Tags = ["Work"] });

        var updated = await sut.UpdateAsync(created.Id, new UpdateTaskRequest { Name = "Buy milk 2" });

        Assert.Equal(["Work"], updated!.Tags);
    }

    [Fact]
    public async Task UpdateAsync_EmptyTagsList_ClearsAllTags()
    {
        var sut = CreateSut();
        var created = await sut.CreateAsync(new CreateTaskRequest { Name = "Buy milk", Tags = ["Work"] });

        var updated = await sut.UpdateAsync(created.Id, new UpdateTaskRequest { Tags = [] });

        Assert.Empty(updated!.Tags);
    }

    [Fact]
    public async Task CreateAsync_ParentIsItselfASubtask_Throws()
    {
        var repository = new FakeTaskRepository();
        var sut = CreateSut(repository);
        var grandparent = await sut.CreateAsync(MinimalRequest("Grandparent"));
        var child = await sut.CreateAsync(
            new CreateTaskRequest { Name = "Child", ParentTaskId = grandparent.Id }
        );

        var ex = await Assert.ThrowsAsync<TaskValidationException>(
            () => sut.CreateAsync(new CreateTaskRequest { Name = "Grandchild", ParentTaskId = child.Id })
        );

        Assert.True(ex.Errors.ContainsKey("ParentTaskId"));
    }

    [Fact]
    public async Task CreateAsync_ParentDoesNotExist_Throws()
    {
        var sut = CreateSut();

        var ex = await Assert.ThrowsAsync<TaskValidationException>(
            () => sut.CreateAsync(new CreateTaskRequest { Name = "Buy milk", ParentTaskId = Guid.NewGuid() })
        );

        Assert.True(ex.Errors.ContainsKey("ParentTaskId"));
    }

    [Fact]
    public async Task CreateAsync_DuplicateOpenTitle_DoesNotBlockButFlagsResponse()
    {
        var repository = new FakeTaskRepository();
        var sut = CreateSut(repository);
        await sut.CreateAsync(MinimalRequest("Write report"));

        var second = await sut.CreateAsync(MinimalRequest("Write report"));

        Assert.True(second.HasOpenDuplicateName);
    }

    [Fact]
    public async Task CreateAsync_DuplicateTitleButOtherIsCompleted_NotFlagged()
    {
        var repository = new FakeTaskRepository();
        var sut = CreateSut(repository);
        var first = await sut.CreateAsync(MinimalRequest("Write report"));
        await sut.CompleteAsync(first.Id);

        var second = await sut.CreateAsync(MinimalRequest("Write report"));

        Assert.False(second.HasOpenDuplicateName);
    }

    [Fact]
    public async Task DeleteAsync_SoftDeletes_HidesFromGetAllButKeepsRow()
    {
        var repository = new FakeTaskRepository();
        var sut = CreateSut(repository);
        var created = await sut.CreateAsync(MinimalRequest());

        var deleted = await sut.DeleteAsync(created.Id);
        var all = await sut.GetAllAsync();
        var viaGetById = await sut.GetByIdAsync(created.Id);

        Assert.True(deleted);
        Assert.Empty(all);
        Assert.Null(viaGetById);
    }

    [Fact]
    public async Task DeleteAsync_UnknownId_ReturnsFalse()
    {
        var sut = CreateSut();

        var deleted = await sut.DeleteAsync(Guid.NewGuid());

        Assert.False(deleted);
    }

    [Fact]
    public async Task RestoreAsync_UndoesDelete()
    {
        var repository = new FakeTaskRepository();
        var sut = CreateSut(repository);
        var created = await sut.CreateAsync(MinimalRequest());
        await sut.DeleteAsync(created.Id);

        var restored = await sut.RestoreAsync(created.Id);
        var viaGetById = await sut.GetByIdAsync(created.Id);

        Assert.NotNull(restored);
        Assert.NotNull(viaGetById);
    }

    [Fact]
    public async Task RestoreAsync_TaskThatWasNeverDeleted_ReturnsNull()
    {
        var repository = new FakeTaskRepository();
        var sut = CreateSut(repository);
        var created = await sut.CreateAsync(MinimalRequest());

        var restored = await sut.RestoreAsync(created.Id);

        Assert.Null(restored);
    }

    [Fact]
    public async Task CompleteAsync_SetsStatusProgressAndCompletedDate()
    {
        var repository = new FakeTaskRepository();
        var sut = CreateSut(repository);
        var created = await sut.CreateAsync(MinimalRequest());

        var completed = await sut.CompleteAsync(created.Id);

        Assert.NotNull(completed);
        Assert.Equal(TaskStatusType.Completed, completed!.Status);
        Assert.Equal(100, completed.Progress);
        Assert.Equal(Now, completed.CompletedDate);
    }

    [Theory]
    [InlineData(RecurringTypeOption.Daily, 1)]
    [InlineData(RecurringTypeOption.Weekly, 7)]
    public async Task CompleteAsync_Recurring_CreatesNextOccurrenceShiftedByInterval(
        RecurringTypeOption recurringType,
        int expectedDayShift
    )
    {
        var repository = new FakeTaskRepository();
        var sut = CreateSut(repository);
        var created = await sut.CreateAsync(
            new CreateTaskRequest
            {
                Name = "Buy milk",
                DueDate = new DateOnly(2026, 11, 7),
                StartDate = new DateOnly(2026, 11, 6),
                RecurringType = recurringType,
            }
        );

        await sut.CompleteAsync(created.Id);
        var all = await sut.GetAllAsync();
        var next = Assert.Single(all, t => t.Status == TaskStatusType.ToDo);

        Assert.Equal(0, next.Progress);
        Assert.Equal(created.DueDate!.Value.AddDays(expectedDayShift), next.DueDate);
        Assert.Equal(created.StartDate!.Value.AddDays(expectedDayShift), next.StartDate);
    }

    [Fact]
    public async Task CompleteAsync_RecurringMonthly_ShiftsByOneCalendarMonth()
    {
        var repository = new FakeTaskRepository();
        var sut = CreateSut(repository);
        // Jan 31 -> Feb 28 is a 28-day shift, not a fixed 30 — exercises the
        // DayNumber-delta trick CreateNextOccurrenceAsync relies on.
        var created = await sut.CreateAsync(
            new CreateTaskRequest
            {
                Name = "Buy milk",
                DueDate = new DateOnly(2027, 1, 31),
                RecurringType = RecurringTypeOption.Monthly,
            }
        );

        await sut.CompleteAsync(created.Id);
        var all = await sut.GetAllAsync();
        var next = Assert.Single(all, t => t.Status == TaskStatusType.ToDo);

        Assert.Equal(new DateOnly(2027, 2, 28), next.DueDate);
    }

    [Fact]
    public async Task CompleteAsync_NonRecurring_DoesNotCreateAnotherTask()
    {
        var repository = new FakeTaskRepository();
        var sut = CreateSut(repository);
        var created = await sut.CreateAsync(MinimalRequest());

        await sut.CompleteAsync(created.Id);
        var all = await sut.GetAllAsync();

        Assert.Single(all, t => t.Id == created.Id);
    }

    [Fact]
    public async Task UpdateAsync_ParentSetToSelf_Throws()
    {
        var repository = new FakeTaskRepository();
        var sut = CreateSut(repository);
        var created = await sut.CreateAsync(MinimalRequest());

        var ex = await Assert.ThrowsAsync<TaskValidationException>(
            () => sut.UpdateAsync(created.Id, new UpdateTaskRequest { ParentTaskId = created.Id })
        );

        Assert.True(ex.Errors.ContainsKey("ParentTaskId"));
    }

    [Fact]
    public async Task UpdateAsync_UnknownId_ReturnsNull()
    {
        var sut = CreateSut();

        var result = await sut.UpdateAsync(Guid.NewGuid(), new UpdateTaskRequest { Name = "x" });

        Assert.Null(result);
    }
}
