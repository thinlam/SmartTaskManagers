using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartTask.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTagsRelational : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotency guard: on Railway this migration previously crashed partway through
            // (CREATE TABLE Tags succeeded, a later statement failed, so EF never recorded the
            // migration as applied). Each restart retried from the top and hit "Table 'Tags'
            // already exists". Drop any leftover partial state first — these tables are brand
            // new and, if they exist at all here, hold at most a partial backfill with no real
            // user-facing data, so dropping them is safe.
            migrationBuilder.Sql("DROP TABLE IF EXISTS `TaskTags`;");
            migrationBuilder.Sql("DROP TABLE IF EXISTS `Tags`;");

            migrationBuilder.CreateTable(
                name: "Tags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    UserId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    Name = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    NormalizedName = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tags", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tags_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "TaskTags",
                columns: table => new
                {
                    TagsId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    TasksId = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskTags", x => new { x.TagsId, x.TasksId });
                    table.ForeignKey(
                        name: "FK_TaskTags_Tags_TagsId",
                        column: x => x.TagsId,
                        principalTable: "Tags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TaskTags_Tasks_TasksId",
                        column: x => x.TasksId,
                        principalTable: "Tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Tags_UserId",
                table: "Tags",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Tags_UserId_NormalizedName",
                table: "Tags",
                columns: new[] { "UserId", "NormalizedName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TaskTags_TasksId",
                table: "TaskTags",
                column: "TasksId");

            // Backfill: split the legacy comma-separated Tags column (now LegacyTagsCsv in C#,
            // still the physical "Tags" column) into the new Tags/TaskTags relational tables,
            // normalized (trim + lowercase) and deduped per user. The old column is left intact.
            //
            // Uses SUBSTRING_INDEX against a fixed 1..10 "numbers" table instead of a recursive
            // CTE (`WITH RECURSIVE`): a task can have at most 10 tags (TaskService.ValidateTags),
            // so no real recursion is needed, and this avoids relying on recursive-CTE support,
            // which isn't available on every MySQL/MariaDB version/configuration.
            migrationBuilder.Sql(
                @"
                INSERT INTO Tags (Id, UserId, Name, NormalizedName, CreatedAt)
                SELECT UUID(), UserId, MIN(Name), NormalizedName, UTC_TIMESTAMP(6)
                FROM (
                    SELECT Tasks.UserId AS UserId,
                           TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(Tasks.Tags, ',', n), ',', -1)) AS Name,
                           LOWER(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(Tasks.Tags, ',', n), ',', -1))) AS NormalizedName
                    FROM Tasks
                    JOIN (
                        SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
                        UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
                    ) AS numbers
                        ON CHAR_LENGTH(Tasks.Tags) - CHAR_LENGTH(REPLACE(Tasks.Tags, ',', '')) >= n - 1
                    WHERE Tasks.Tags IS NOT NULL AND TRIM(Tasks.Tags) <> ''
                ) AS parsed
                WHERE Name <> ''
                GROUP BY UserId, NormalizedName;
                "
            );

            migrationBuilder.Sql(
                @"
                INSERT INTO TaskTags (TagsId, TasksId)
                SELECT t.Id, task_tag.TaskId
                FROM (
                    SELECT Tasks.Id AS TaskId, Tasks.UserId AS UserId,
                           LOWER(TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(Tasks.Tags, ',', n), ',', -1))) AS NormalizedName
                    FROM Tasks
                    JOIN (
                        SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
                        UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
                    ) AS numbers
                        ON CHAR_LENGTH(Tasks.Tags) - CHAR_LENGTH(REPLACE(Tasks.Tags, ',', '')) >= n - 1
                    WHERE Tasks.Tags IS NOT NULL AND TRIM(Tasks.Tags) <> ''
                ) AS task_tag
                JOIN Tags t ON t.UserId = task_tag.UserId AND t.NormalizedName = task_tag.NormalizedName;
                "
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TaskTags");

            migrationBuilder.DropTable(
                name: "Tags");
        }
    }
}
