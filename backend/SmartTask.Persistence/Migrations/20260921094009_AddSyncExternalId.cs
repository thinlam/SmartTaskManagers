using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartTask.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSyncExternalId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ExternalId",
                table: "Tasks",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalId",
                table: "Projects",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalId",
                table: "Habits",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalId",
                table: "Goals",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_ExternalId",
                table: "Tasks",
                column: "ExternalId",
                unique: true,
                filter: "[ExternalId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_ExternalId",
                table: "Projects",
                column: "ExternalId",
                unique: true,
                filter: "[ExternalId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Habits_ExternalId",
                table: "Habits",
                column: "ExternalId",
                unique: true,
                filter: "[ExternalId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Goals_ExternalId",
                table: "Goals",
                column: "ExternalId",
                unique: true,
                filter: "[ExternalId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tasks_ExternalId",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Projects_ExternalId",
                table: "Projects");

            migrationBuilder.DropIndex(
                name: "IX_Habits_ExternalId",
                table: "Habits");

            migrationBuilder.DropIndex(
                name: "IX_Goals_ExternalId",
                table: "Goals");

            migrationBuilder.DropColumn(
                name: "ExternalId",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "ExternalId",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "ExternalId",
                table: "Habits");

            migrationBuilder.DropColumn(
                name: "ExternalId",
                table: "Goals");
        }
    }
}
