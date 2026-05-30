using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VNS.API.Migrations
{
    /// <inheritdoc />
    public partial class AddTourScheduleRunsAndAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TourScheduleRunId",
                table: "ComboBookingItems",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TourScheduleRunId",
                table: "BookingDetails",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TourScheduleRuns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TourScheduleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RunIndex = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    MaxParticipants = table.Column<int>(type: "int", nullable: false),
                    BookedSlots = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TourScheduleRuns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TourScheduleRuns_TourSchedules_TourScheduleId",
                        column: x => x.TourScheduleId,
                        principalTable: "TourSchedules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql(@"
UPDATE ts
SET
    RunCount = CASE WHEN ts.RunCount < 1 THEN 1 ELSE ts.RunCount END,
    AvailableSlots = CASE
        WHEN t.MaxParticipants < 1 THEN CASE WHEN ts.AvailableSlots < 1 THEN 1 ELSE ts.AvailableSlots END
        ELSE t.MaxParticipants
    END,
    BookedSlots = CASE
        WHEN ts.BookedSlots < 0 THEN 0
        WHEN ts.BookedSlots >
            (CASE WHEN ts.RunCount < 1 THEN 1 ELSE ts.RunCount END) *
            (CASE
                WHEN t.MaxParticipants < 1 THEN CASE WHEN ts.AvailableSlots < 1 THEN 1 ELSE ts.AvailableSlots END
                ELSE t.MaxParticipants
            END)
            THEN
            (CASE WHEN ts.RunCount < 1 THEN 1 ELSE ts.RunCount END) *
            (CASE
                WHEN t.MaxParticipants < 1 THEN CASE WHEN ts.AvailableSlots < 1 THEN 1 ELSE ts.AvailableSlots END
                ELSE t.MaxParticipants
            END)
        ELSE ts.BookedSlots
    END
FROM TourSchedules ts
INNER JOIN Tours t ON t.Id = ts.TourId;

;WITH NumberSeries AS
(
    SELECT TOP (1024) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS RunIndex
    FROM sys.all_objects
),
NormalizedSchedules AS
(
    SELECT
        ts.Id AS TourScheduleId,
        ts.StartDate,
        ts.EndDate,
        CASE WHEN ts.RunCount < 1 THEN 1 ELSE ts.RunCount END AS RunCount,
        CASE
            WHEN t.MaxParticipants < 1 THEN CASE WHEN ts.AvailableSlots < 1 THEN 1 ELSE ts.AvailableSlots END
            ELSE t.MaxParticipants
        END AS MaxParticipants,
        CASE
            WHEN ts.BookedSlots < 0 THEN 0
            ELSE ts.BookedSlots
        END AS BookedSlots
    FROM TourSchedules ts
    INNER JOIN Tours t ON t.Id = ts.TourId
)
INSERT INTO TourScheduleRuns (Id, TourScheduleId, RunIndex, StartDate, EndDate, MaxParticipants, BookedSlots, Status)
SELECT
    NEWID(),
    ns.TourScheduleId,
    nums.RunIndex,
    ns.StartDate,
    ns.EndDate,
    ns.MaxParticipants,
    CASE
        WHEN ns.BookedSlots <= (nums.RunIndex - 1) * ns.MaxParticipants THEN 0
        WHEN ns.BookedSlots >= nums.RunIndex * ns.MaxParticipants THEN ns.MaxParticipants
        ELSE ns.BookedSlots - ((nums.RunIndex - 1) * ns.MaxParticipants)
    END AS AssignedBookedSlots,
    CASE
        WHEN
            CASE
                WHEN ns.BookedSlots <= (nums.RunIndex - 1) * ns.MaxParticipants THEN 0
                WHEN ns.BookedSlots >= nums.RunIndex * ns.MaxParticipants THEN ns.MaxParticipants
                ELSE ns.BookedSlots - ((nums.RunIndex - 1) * ns.MaxParticipants)
            END >= ns.MaxParticipants
            THEN 2
        ELSE 0
    END AS Status
FROM NormalizedSchedules ns
INNER JOIN NumberSeries nums
    ON nums.RunIndex <= ns.RunCount;
");

            migrationBuilder.CreateIndex(
                name: "IX_ComboBookingItems_TourScheduleRunId",
                table: "ComboBookingItems",
                column: "TourScheduleRunId");

            migrationBuilder.CreateIndex(
                name: "IX_BookingDetails_TourScheduleRunId",
                table: "BookingDetails",
                column: "TourScheduleRunId");

            migrationBuilder.CreateIndex(
                name: "IX_TourScheduleRuns_TourScheduleId_RunIndex",
                table: "TourScheduleRuns",
                columns: new[] { "TourScheduleId", "RunIndex" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_BookingDetails_TourScheduleRuns_TourScheduleRunId",
                table: "BookingDetails",
                column: "TourScheduleRunId",
                principalTable: "TourScheduleRuns",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ComboBookingItems_TourScheduleRuns_TourScheduleRunId",
                table: "ComboBookingItems",
                column: "TourScheduleRunId",
                principalTable: "TourScheduleRuns",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BookingDetails_TourScheduleRuns_TourScheduleRunId",
                table: "BookingDetails");

            migrationBuilder.DropForeignKey(
                name: "FK_ComboBookingItems_TourScheduleRuns_TourScheduleRunId",
                table: "ComboBookingItems");

            migrationBuilder.DropTable(
                name: "TourScheduleRuns");

            migrationBuilder.DropIndex(
                name: "IX_ComboBookingItems_TourScheduleRunId",
                table: "ComboBookingItems");

            migrationBuilder.DropIndex(
                name: "IX_BookingDetails_TourScheduleRunId",
                table: "BookingDetails");

            migrationBuilder.DropColumn(
                name: "TourScheduleRunId",
                table: "ComboBookingItems");

            migrationBuilder.DropColumn(
                name: "TourScheduleRunId",
                table: "BookingDetails");
        }
    }
}
