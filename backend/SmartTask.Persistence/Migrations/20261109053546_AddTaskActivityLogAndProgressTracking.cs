using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartTask.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskActivityLogAndProgressTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ProgressBeforeComplete",
                table: "Tasks",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TaskActivityLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UserId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    TaskId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Action = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    OldValue = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    NewValue = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    At = table.Column<DateTimeOffset>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskActivityLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TaskActivityLogs_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_TaskActivityLogs_TaskId",
                table: "TaskActivityLogs",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskActivityLogs_UserId",
                table: "TaskActivityLogs",
                column: "UserId");

            // Dọn dữ liệu sai còn sót trước khi có bản sửa đồng bộ Progress/Status
            // (ví dụ task "test 1": mở lại từ Hoàn thành nhưng CompletedDate vẫn còn,
            // hiện sai "Hoàn thành ngày ..." thay vì "Quá hạn"). Chỉ xóa CompletedDate
            // còn sót — không đụng Progress vì không có cách suy ra giá trị đúng ngược
            // từ dữ liệu cũ một cách an toàn.
            migrationBuilder.Sql(
                "UPDATE Tasks SET CompletedDate = NULL WHERE Status <> 'Completed' AND CompletedDate IS NOT NULL;"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TaskActivityLogs");

            migrationBuilder.DropColumn(
                name: "ProgressBeforeComplete",
                table: "Tasks");
        }
    }
}
