using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VNS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTourPackagesAndTieredPricing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CancellationPolicyDescription",
                table: "Tours",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CancellationPolicyType",
                table: "Tours",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "DisplayOrder",
                table: "Tours",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ExcludedItemsText",
                table: "Tours",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IncludedItemsText",
                table: "Tours",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MeetingPoint",
                table: "Tours",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "Tours",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ActivityType",
                table: "TourItineraries",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "TourItineraries",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TourPricingTierId",
                table: "BookingDetails",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE t
                SET
                    t.[Name] = CASE WHEN t.[Name] = '' THEN s.[Name] ELSE t.[Name] END,
                    t.[CancellationPolicyType] = s.[CancellationPolicyType],
                    t.[CancellationPolicyDescription] = s.[CancellationPolicyDescription],
                    t.[DisplayOrder] = 0
                FROM [Tours] t
                INNER JOIN [Services] s ON s.[Id] = t.[ServiceId];
                """);

            migrationBuilder.CreateTable(
                name: "TourImages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TourId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    IsCover = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TourImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TourImages_Tours_TourId",
                        column: x => x.TourId,
                        principalTable: "Tours",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TourPricingTiers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TourId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    MinQuantity = table.Column<int>(type: "int", nullable: false),
                    MaxQuantity = table.Column<int>(type: "int", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TourPricingTiers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TourPricingTiers_Tours_TourId",
                        column: x => x.TourId,
                        principalTable: "Tours",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BookingDetails_TourPricingTierId",
                table: "BookingDetails",
                column: "TourPricingTierId");

            migrationBuilder.CreateIndex(
                name: "IX_TourImages_TourId",
                table: "TourImages",
                column: "TourId");

            migrationBuilder.CreateIndex(
                name: "IX_TourPricingTiers_TourId",
                table: "TourPricingTiers",
                column: "TourId");

            migrationBuilder.AddForeignKey(
                name: "FK_BookingDetails_TourPricingTiers_TourPricingTierId",
                table: "BookingDetails",
                column: "TourPricingTierId",
                principalTable: "TourPricingTiers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BookingDetails_TourPricingTiers_TourPricingTierId",
                table: "BookingDetails");

            migrationBuilder.DropTable(
                name: "TourImages");

            migrationBuilder.DropTable(
                name: "TourPricingTiers");

            migrationBuilder.DropIndex(
                name: "IX_BookingDetails_TourPricingTierId",
                table: "BookingDetails");

            migrationBuilder.DropColumn(
                name: "CancellationPolicyDescription",
                table: "Tours");

            migrationBuilder.DropColumn(
                name: "CancellationPolicyType",
                table: "Tours");

            migrationBuilder.DropColumn(
                name: "DisplayOrder",
                table: "Tours");

            migrationBuilder.DropColumn(
                name: "ExcludedItemsText",
                table: "Tours");

            migrationBuilder.DropColumn(
                name: "IncludedItemsText",
                table: "Tours");

            migrationBuilder.DropColumn(
                name: "MeetingPoint",
                table: "Tours");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "Tours");

            migrationBuilder.DropColumn(
                name: "ActivityType",
                table: "TourItineraries");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "TourItineraries");

            migrationBuilder.DropColumn(
                name: "TourPricingTierId",
                table: "BookingDetails");
        }
    }
}
