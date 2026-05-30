using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VNS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRoomBedCountAndLargeServiceChangeRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "ProposedJson",
                table: "ServiceChangeRequests",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(4000)",
                oldMaxLength: 4000);

            migrationBuilder.AddColumn<int>(
                name: "BedCount",
                table: "Rooms",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.Sql(
                """
                UPDATE [Rooms]
                SET [BedCount] = 1
                WHERE [BedCount] < 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BedCount",
                table: "Rooms");

            migrationBuilder.AlterColumn<string>(
                name: "ProposedJson",
                table: "ServiceChangeRequests",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");
        }
    }
}
