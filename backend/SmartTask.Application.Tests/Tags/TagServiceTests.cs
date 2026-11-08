using SmartTask.Application.Tags;
using SmartTask.Application.Tests.Fakes;

namespace SmartTask.Application.Tests.Tags;

public sealed class TagServiceTests
{
    private static TagService CreateSut(FakeTagRepository? repository = null) =>
        new(repository ?? new FakeTagRepository());

    [Fact]
    public async Task RenameAsync_UnknownId_ReturnsNull()
    {
        var sut = CreateSut();

        var result = await sut.RenameAsync(Guid.NewGuid(), new RenameTagRequest { Name = "x" });

        Assert.Null(result);
    }

    [Fact]
    public async Task RenameAsync_BlankName_Throws()
    {
        var repository = new FakeTagRepository();
        var sut = CreateSut(repository);
        var tags = await repository.GetOrCreateManyAsync(["Work"]);

        var ex = await Assert.ThrowsAsync<TagValidationException>(
            () => sut.RenameAsync(tags[0].Id, new RenameTagRequest { Name = "   " })
        );

        Assert.True(ex.Errors.ContainsKey("Name"));
    }

    [Fact]
    public async Task RenameAsync_ValidName_UpdatesNameAndNormalizedName()
    {
        var repository = new FakeTagRepository();
        var sut = CreateSut(repository);
        var tags = await repository.GetOrCreateManyAsync(["Work"]);

        var renamed = await sut.RenameAsync(tags[0].Id, new RenameTagRequest { Name = "Career" });

        Assert.Equal("Career", renamed!.Name);
    }

    [Fact]
    public async Task MergeAsync_SameSourceAndTarget_Throws()
    {
        var repository = new FakeTagRepository();
        var sut = CreateSut(repository);
        var tags = await repository.GetOrCreateManyAsync(["Work"]);

        var ex = await Assert.ThrowsAsync<TagValidationException>(
            () =>
                sut.MergeAsync(
                    new MergeTagsRequest { SourceTagId = tags[0].Id, TargetTagId = tags[0].Id }
                )
        );

        Assert.True(ex.Errors.ContainsKey("TargetTagId"));
    }

    [Fact]
    public async Task MergeAsync_MovesTasksFromSourceToTargetAndDeletesSource()
    {
        var repository = new FakeTagRepository();
        var sut = CreateSut(repository);
        var tags = await repository.GetOrCreateManyAsync(["Work", "Career"]);
        var work = tags.Single(t => t.Name == "Work");
        var career = tags.Single(t => t.Name == "Career");
        var task = new Domain.Tasks.TaskItem { Name = "Report" };
        task.Tags.Add(work);
        work.Tasks.Add(task);

        var merged = await sut.MergeAsync(
            new MergeTagsRequest { SourceTagId = work.Id, TargetTagId = career.Id }
        );

        Assert.Equal("Career", merged!.Name);
        Assert.Equal(1, merged.TaskCount);
        Assert.Contains(career, task.Tags);
        Assert.DoesNotContain(work, task.Tags);
        Assert.Null(await repository.GetByIdAsync(work.Id));
    }

    [Fact]
    public async Task MergeAsync_TaskAlreadyHasTargetTag_DoesNotDuplicateLink()
    {
        var repository = new FakeTagRepository();
        var sut = CreateSut(repository);
        var tags = await repository.GetOrCreateManyAsync(["Work", "Career"]);
        var work = tags.Single(t => t.Name == "Work");
        var career = tags.Single(t => t.Name == "Career");
        var task = new Domain.Tasks.TaskItem { Name = "Report" };
        task.Tags.Add(work);
        task.Tags.Add(career);
        work.Tasks.Add(task);
        career.Tasks.Add(task);

        await sut.MergeAsync(new MergeTagsRequest { SourceTagId = work.Id, TargetTagId = career.Id });

        Assert.Single(task.Tags);
    }

    [Fact]
    public async Task DeleteAsync_UnlinksFromTasksButLeavesTasksIntact()
    {
        var repository = new FakeTagRepository();
        var sut = CreateSut(repository);
        var tags = await repository.GetOrCreateManyAsync(["Work"]);
        var work = tags[0];
        var task = new Domain.Tasks.TaskItem { Name = "Report" };
        task.Tags.Add(work);
        work.Tasks.Add(task);

        var deleted = await sut.DeleteAsync(work.Id);

        Assert.True(deleted);
        Assert.Empty(task.Tags);
        Assert.Equal("Report", task.Name);
    }

    [Fact]
    public async Task DeleteAsync_UnknownId_ReturnsFalse()
    {
        var sut = CreateSut();

        var deleted = await sut.DeleteAsync(Guid.NewGuid());

        Assert.False(deleted);
    }
}
