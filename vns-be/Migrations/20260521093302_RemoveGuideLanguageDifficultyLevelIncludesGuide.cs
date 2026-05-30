using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VNS.API.Migrations
{
    /// <inheritdoc />
    public partial class RemoveGuideLanguageDifficultyLevelIncludesGuide : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DifficultyLevel",
                table: "Tours");

            migrationBuilder.DropColumn(
                name: "GuideLanguage",
                table: "Tours");

            migrationBuilder.DropColumn(
                name: "IncludesGuide",
                table: "Tours");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DifficultyLevel",
                table: "Tours",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuideLanguage",
                table: "Tours",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IncludesGuide",
                table: "Tours",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
