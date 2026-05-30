using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VNS.API.Migrations
{
    /// <inheritdoc />
    public partial class RevertTourPricingModes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MinGuestsToOperate",
                table: "Tours");

            migrationBuilder.DropColumn(
                name: "PricingModel",
                table: "Tours");

            migrationBuilder.DropColumn(
                name: "GroupMaxGuests",
                table: "TourPricingTiers");

            migrationBuilder.DropColumn(
                name: "GroupMinGuests",
                table: "TourPricingTiers");

            migrationBuilder.DropColumn(
                name: "TierType",
                table: "TourPricingTiers");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MinGuestsToOperate",
                table: "Tours",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PricingModel",
                table: "Tours",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GroupMaxGuests",
                table: "TourPricingTiers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GroupMinGuests",
                table: "TourPricingTiers",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TierType",
                table: "TourPricingTiers",
                type: "int",
                nullable: true);
        }
    }
}
