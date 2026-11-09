using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartTask.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskAreasRelational : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AreaId",
                table: "Tasks",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");

            migrationBuilder.CreateTable(
                name: "TaskAreas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UserId = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    Key = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    NameVi = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    NameEn = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    IsSystem = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskAreas", x => x.Id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_AreaId",
                table: "Tasks",
                column: "AreaId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskAreas_UserId_Key",
                table: "TaskAreas",
                columns: new[] { "UserId", "Key" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_TaskAreas_AreaId",
                table: "Tasks",
                column: "AreaId",
                principalTable: "TaskAreas",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Seed 14 lĩnh vực hệ thống song ngữ (UserId NULL = dùng chung mọi tài khoản), GUID cố định
            // để UPDATE backfill dưới đây tham chiếu được trực tiếp — không cần round-trip qua C#.
            migrationBuilder.Sql(
                """
                INSERT INTO TaskAreas (Id, UserId, `Key`, NameVi, NameEn, IsSystem, SortOrder) VALUES
                ('a0000000-0000-0000-0000-000000000001', NULL, 'personal', 'Cá nhân', 'Personal', 1, 0),
                ('a0000000-0000-0000-0000-000000000002', NULL, 'career', 'Sự nghiệp', 'Career', 1, 1),
                ('a0000000-0000-0000-0000-000000000003', NULL, 'work', 'Công việc', 'Work', 1, 2),
                ('a0000000-0000-0000-0000-000000000004', NULL, 'learning', 'Học tập', 'Learning', 1, 3),
                ('a0000000-0000-0000-0000-000000000005', NULL, 'health', 'Sức khỏe & Thể dục', 'Health & Fitness', 1, 4),
                ('a0000000-0000-0000-0000-000000000006', NULL, 'finance', 'Tài chính', 'Finance', 1, 5),
                ('a0000000-0000-0000-0000-000000000007', NULL, 'family', 'Gia đình', 'Family', 1, 6),
                ('a0000000-0000-0000-0000-000000000008', NULL, 'relationships', 'Quan hệ & Bạn bè', 'Relationships & Social', 1, 7),
                ('a0000000-0000-0000-0000-000000000009', NULL, 'home', 'Nhà cửa', 'Home', 1, 8),
                ('a0000000-0000-0000-0000-00000000000a', NULL, 'hobbies', 'Sở thích', 'Hobbies', 1, 9),
                ('a0000000-0000-0000-0000-00000000000b', NULL, 'travel', 'Du lịch', 'Travel', 1, 10),
                ('a0000000-0000-0000-0000-00000000000c', NULL, 'side-project', 'Dự án cá nhân', 'Side Projects', 1, 11),
                ('a0000000-0000-0000-0000-00000000000d', NULL, 'spiritual', 'Tinh thần', 'Mindfulness & Spirituality', 1, 12),
                ('a0000000-0000-0000-0000-00000000000e', NULL, 'other', 'Khác', 'Other', 1, 13);
                """
            );

            // Map dữ liệu cũ từ enum AreaType (cột "Area", lưu dạng chuỗi) sang AreaId tương ứng.
            // PersonalAdmin không có lĩnh vực tương đương trực tiếp trong 14 lĩnh vực mới -> rơi vào
            // "Khác" (other) — không mất dữ liệu, chỉ đổi cách phân loại; cột "Area" cũ vẫn giữ nguyên
            // giá trị gốc (xem TaskItem.Area, [Obsolete]) nên có thể tra lại/rollback nếu cần.
            migrationBuilder.Sql(
                """
                UPDATE Tasks SET AreaId = CASE Area
                    WHEN 'Career' THEN 'a0000000-0000-0000-0000-000000000002'
                    WHEN 'Learning' THEN 'a0000000-0000-0000-0000-000000000004'
                    WHEN 'Health' THEN 'a0000000-0000-0000-0000-000000000005'
                    WHEN 'Personal' THEN 'a0000000-0000-0000-0000-000000000001'
                    WHEN 'PersonalAdmin' THEN 'a0000000-0000-0000-0000-00000000000e'
                    ELSE 'a0000000-0000-0000-0000-00000000000e'
                END
                WHERE AreaId IS NULL;
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_TaskAreas_AreaId",
                table: "Tasks");

            migrationBuilder.DropTable(
                name: "TaskAreas");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_AreaId",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "AreaId",
                table: "Tasks");
        }
    }
}
