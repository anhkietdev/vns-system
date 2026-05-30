using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VNS.API.Migrations
{
    /// <inheritdoc />
    public partial class RemovePartnerVoucherFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Vouchers_Partners_PartnerId",
                table: "Vouchers");

            migrationBuilder.DropIndex(
                name: "IX_Vouchers_PartnerId",
                table: "Vouchers");

            migrationBuilder.DropColumn(
                name: "FundedBy",
                table: "Vouchers");

            migrationBuilder.DropColumn(
                name: "PartnerId",
                table: "Vouchers");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FundedBy",
                table: "Vouchers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "PartnerId",
                table: "Vouchers",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vouchers_PartnerId",
                table: "Vouchers",
                column: "PartnerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Vouchers_Partners_PartnerId",
                table: "Vouchers",
                column: "PartnerId",
                principalTable: "Partners",
                principalColumn: "Id");
        }
    }
}
