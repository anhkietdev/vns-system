using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VNS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTourSessionTierPricingV11 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RunCount",
                table: "TourSchedules",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "TourSchedulePricingOverrides",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TourScheduleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TourPricingTierId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CustomPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TourSchedulePricingOverrides", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TourSchedulePricingOverrides_TourPricingTiers_TourPricingTierId",
                        column: x => x.TourPricingTierId,
                        principalTable: "TourPricingTiers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_TourSchedulePricingOverrides_TourSchedules_TourScheduleId",
                        column: x => x.TourScheduleId,
                        principalTable: "TourSchedules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TourSchedulePricingOverrides_TourPricingTierId",
                table: "TourSchedulePricingOverrides",
                column: "TourPricingTierId");

            migrationBuilder.CreateIndex(
                name: "IX_TourSchedulePricingOverrides_TourScheduleId_TourPricingTierId",
                table: "TourSchedulePricingOverrides",
                columns: new[] { "TourScheduleId", "TourPricingTierId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TourSchedulePricingOverrides");

            migrationBuilder.DropColumn(
                name: "RunCount",
                table: "TourSchedules");
        }
    }
}
