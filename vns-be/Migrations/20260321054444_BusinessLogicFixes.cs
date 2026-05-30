using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VNS.API.Migrations
{
    /// <inheritdoc />
    public partial class BusinessLogicFixes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ProcessedBy",
                table: "RefundRequests",
                type: "uniqueidentifier",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProcessedBy",
                table: "RefundRequests");
        }
    }
}
