using SmartTask.Application.Tasks;
using SmartTask.Application.Tests.Fakes;
using SmartTask.Domain.Tasks;

namespace SmartTask.Application.Tests.Tasks;

public sealed class TaskAreaServiceTests
{
    [Fact]
    public async Task CreateAsync_BlankNameEn_FallsBackToNameVi()
    {
        var sut = new TaskAreaService(new FakeTaskAreaRepository());

        var created = await sut.CreateAsync(new CreateTaskAreaRequest { NameVi = "Nấu ăn" });

        Assert.Equal("Nấu ăn", created.NameVi);
        Assert.Equal("Nấu ăn", created.NameEn);
        Assert.False(created.IsSystem);
    }

    [Fact]
    public async Task RenameAsync_SystemArea_Throws()
    {
        var repository = new FakeTaskAreaRepository();
        var system = new TaskArea { Key = "career", NameVi = "Sự nghiệp", NameEn = "Career", IsSystem = true };
        repository.Seed(system);
        var sut = new TaskAreaService(repository);

        await Assert.ThrowsAsync<TaskAreaValidationException>(
            () => sut.RenameAsync(system.Id, new RenameTaskAreaRequest { NameVi = "x" })
        );
    }

    [Fact]
    public async Task DeleteAsync_SystemArea_Throws()
    {
        var repository = new FakeTaskAreaRepository();
        var system = new TaskArea { Key = "career", NameVi = "Sự nghiệp", NameEn = "Career", IsSystem = true };
        repository.Seed(system);
        var sut = new TaskAreaService(repository);

        await Assert.ThrowsAsync<TaskAreaValidationException>(
            () => sut.DeleteAsync(system.Id, new DeleteTaskAreaRequest())
        );
    }

    [Fact]
    public async Task DeleteAsync_InUseWithoutReplacement_ThrowsInUseException()
    {
        var repository = new FakeTaskAreaRepository();
        var custom = await new TaskAreaService(repository).CreateAsync(
            new CreateTaskAreaRequest { NameVi = "Nấu ăn" }
        );
        var area = await repository.GetByIdAsync(custom.Id);
        area!.Tasks.Add(new TaskItem { Name = "Buy milk" });
        var sut = new TaskAreaService(repository);

        var ex = await Assert.ThrowsAsync<TaskAreaInUseException>(
            () => sut.DeleteAsync(custom.Id, new DeleteTaskAreaRequest())
        );
        Assert.Equal(1, ex.TaskCount);
    }

    [Fact]
    public async Task DeleteAsync_InUseWithReplacement_ReassignsTasksThenDeletes()
    {
        var repository = new FakeTaskAreaRepository();
        var sut = new TaskAreaService(repository);
        var source = await sut.CreateAsync(new CreateTaskAreaRequest { NameVi = "Nấu ăn" });
        var target = await sut.CreateAsync(new CreateTaskAreaRequest { NameVi = "Sở thích" });
        var sourceEntity = await repository.GetByIdAsync(source.Id);
        var task = new TaskItem { Name = "Buy milk", AreaId = source.Id };
        sourceEntity!.Tasks.Add(task);

        var deleted = await sut.DeleteAsync(
            source.Id,
            new DeleteTaskAreaRequest { ReplacementAreaId = target.Id }
        );

        Assert.True(deleted);
        Assert.Equal(target.Id, task.AreaId);
    }
}
