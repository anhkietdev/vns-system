using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VNS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddComboToBooking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ComboId",
                table: "Bookings",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ComboName",
                table: "Bookings",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_ComboId",
                table: "Bookings",
                column: "ComboId");

            migrationBuilder.AddForeignKey(
                name: "FK_Bookings_Combos_ComboId",
                table: "Bookings",
                column: "ComboId",
                principalTable: "Combos",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Bookings_Combos_ComboId",
                table: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_ComboId",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "ComboId",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "ComboName",
                table: "Bookings");
        }
    }
}
