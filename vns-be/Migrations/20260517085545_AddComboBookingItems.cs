using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VNS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddComboBookingItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ComboBookingItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BookingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ComboId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ComboItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ServiceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoomId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TourScheduleId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TourPricingTierId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CheckInDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CheckOutDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    SubTotal = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ComboBookingItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ComboBookingItems_Bookings_BookingId",
                        column: x => x.BookingId,
                        principalTable: "Bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ComboBookingItems_ComboItems_ComboItemId",
                        column: x => x.ComboItemId,
                        principalTable: "ComboItems",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ComboBookingItems_Combos_ComboId",
                        column: x => x.ComboId,
                        principalTable: "Combos",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ComboBookingItems_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "Rooms",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ComboBookingItems_Services_ServiceId",
                        column: x => x.ServiceId,
                        principalTable: "Services",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ComboBookingItems_TourPricingTiers_TourPricingTierId",
                        column: x => x.TourPricingTierId,
                        principalTable: "TourPricingTiers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ComboBookingItems_TourSchedules_TourScheduleId",
                        column: x => x.TourScheduleId,
                        principalTable: "TourSchedules",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ComboBookingItems_BookingId",
                table: "ComboBookingItems",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_ComboBookingItems_ComboId",
                table: "ComboBookingItems",
                column: "ComboId");

            migrationBuilder.CreateIndex(
                name: "IX_ComboBookingItems_ComboItemId",
                table: "ComboBookingItems",
                column: "ComboItemId");

            migrationBuilder.CreateIndex(
                name: "IX_ComboBookingItems_RoomId",
                table: "ComboBookingItems",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_ComboBookingItems_ServiceId",
                table: "ComboBookingItems",
                column: "ServiceId");

            migrationBuilder.CreateIndex(
                name: "IX_ComboBookingItems_TourPricingTierId",
                table: "ComboBookingItems",
                column: "TourPricingTierId");

            migrationBuilder.CreateIndex(
                name: "IX_ComboBookingItems_TourScheduleId",
                table: "ComboBookingItems",
                column: "TourScheduleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ComboBookingItems");
        }
    }
}
