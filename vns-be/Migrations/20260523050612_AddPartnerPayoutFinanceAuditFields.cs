using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VNS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPartnerPayoutFinanceAuditFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryReservations_Bookings_BookingId",
                table: "InventoryReservations");

            migrationBuilder.AddColumn<string>(
                name: "BankAccount",
                table: "PartnerPayouts",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankName",
                table: "PartnerPayouts",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ProcessedAt",
                table: "PartnerPayouts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ProcessedBy",
                table: "PartnerPayouts",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryReservations_Bookings_BookingId",
                table: "InventoryReservations",
                column: "BookingId",
                principalTable: "Bookings",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InventoryReservations_Bookings_BookingId",
                table: "InventoryReservations");

            migrationBuilder.DropColumn(
                name: "BankAccount",
                table: "PartnerPayouts");

            migrationBuilder.DropColumn(
                name: "BankName",
                table: "PartnerPayouts");

            migrationBuilder.DropColumn(
                name: "ProcessedAt",
                table: "PartnerPayouts");

            migrationBuilder.DropColumn(
                name: "ProcessedBy",
                table: "PartnerPayouts");

            migrationBuilder.AddForeignKey(
                name: "FK_InventoryReservations_Bookings_BookingId",
                table: "InventoryReservations",
                column: "BookingId",
                principalTable: "Bookings",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
