using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartTask.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectExtraFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Projects",
                type: "varchar(20)",
                maxLength: 20,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "Projects",
                type: "varchar(7)",
                maxLength: 7,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Field",
                table: "Projects",
                type: "varchar(20)",
                maxLength: 20,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<string>(
                name: "Priority",
                table: "Projects",
                type: "varchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Medium")
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Projects_UserId_Name",
                table: "Projects",
                columns: new[] { "UserId", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Projects_UserId_Name",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Color",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Field",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "Projects");
        }
    }
}
