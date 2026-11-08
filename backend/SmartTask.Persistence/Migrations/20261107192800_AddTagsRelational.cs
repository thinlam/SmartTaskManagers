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
            migrationBuilder.Sql(
                @"
                INSERT INTO Tags (Id, UserId, Name, NormalizedName, CreatedAt)
                SELECT UUID(), UserId, Name, NormalizedName, UTC_TIMESTAMP(6)
                FROM (
                    WITH RECURSIVE split AS (
                        SELECT Id AS TaskId, UserId, CONCAT(TRIM(Tags), ',') AS rest
                        FROM Tasks
                        WHERE Tags IS NOT NULL AND TRIM(Tags) <> ''
                        UNION ALL
                        SELECT TaskId, UserId, SUBSTRING(rest, LOCATE(',', rest) + 1)
                        FROM split
                        WHERE LOCATE(',', rest) > 1
                    )
                    SELECT UserId,
                           TRIM(SUBSTRING(rest, 1, LOCATE(',', rest) - 1)) AS Name,
                           LOWER(TRIM(SUBSTRING(rest, 1, LOCATE(',', rest) - 1))) AS NormalizedName
                    FROM split
                    WHERE LOCATE(',', rest) > 1
                      AND TRIM(SUBSTRING(rest, 1, LOCATE(',', rest) - 1)) <> ''
                ) parsed
                GROUP BY UserId, NormalizedName;
                "
            );

            migrationBuilder.Sql(
                @"
                INSERT INTO TaskTags (TagsId, TasksId)
                SELECT t.Id, task_tag.TaskId
                FROM (
                    WITH RECURSIVE split AS (
                        SELECT Id AS TaskId, UserId, CONCAT(TRIM(Tags), ',') AS rest
                        FROM Tasks
                        WHERE Tags IS NOT NULL AND TRIM(Tags) <> ''
                        UNION ALL
                        SELECT TaskId, UserId, SUBSTRING(rest, LOCATE(',', rest) + 1)
                        FROM split
                        WHERE LOCATE(',', rest) > 1
                    )
                    SELECT TaskId, UserId,
                           LOWER(TRIM(SUBSTRING(rest, 1, LOCATE(',', rest) - 1))) AS NormalizedName
                    FROM split
                    WHERE LOCATE(',', rest) > 1
                      AND TRIM(SUBSTRING(rest, 1, LOCATE(',', rest) - 1)) <> ''
                ) task_tag
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
