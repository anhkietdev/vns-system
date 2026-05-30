using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VNS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddComboQuoteAndBookingConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DateDriver",
                table: "Combos",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "StayOffsetAfterDays",
                table: "Combos",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "StayOffsetBeforeDays",
                table: "Combos",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "PreferredRoomId",
                table: "ComboItems",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PreferredTourPricingTierId",
                table: "ComboItems",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ComboBookingQuotes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ComboId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DateDriver = table.Column<int>(type: "int", nullable: false),
                    NumberOfGuests = table.Column<int>(type: "int", nullable: false),
                    TourScheduleId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CheckInDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CheckOutDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    OriginalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ComboDiscountAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    FinalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ResolvedSelectionsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComboBookingQuotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ComboBookingQuotes_Combos_ComboId",
                        column: x => x.ComboId,
                        principalTable: "Combos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ComboBookingQuotes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ComboBookingQuotes_ComboId",
                table: "ComboBookingQuotes",
                column: "ComboId");

            migrationBuilder.CreateIndex(
                name: "IX_ComboBookingQuotes_UserId_ExpiresAt",
                table: "ComboBookingQuotes",
                columns: new[] { "UserId", "ExpiresAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ComboBookingQuotes");

            migrationBuilder.DropColumn(
                name: "DateDriver",
                table: "Combos");

            migrationBuilder.DropColumn(
                name: "StayOffsetAfterDays",
                table: "Combos");

            migrationBuilder.DropColumn(
                name: "StayOffsetBeforeDays",
                table: "Combos");

            migrationBuilder.DropColumn(
                name: "PreferredRoomId",
                table: "ComboItems");

            migrationBuilder.DropColumn(
                name: "PreferredTourPricingTierId",
                table: "ComboItems");
        }
    }
}
