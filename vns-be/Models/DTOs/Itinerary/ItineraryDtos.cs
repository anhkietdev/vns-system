namespace VNS.API.Models.DTOs.Itinerary
{
    // ────────────── TOP LEVEL ──────────────

    public class UserItineraryDto
    {
        public List<ItineraryTripDto> Trips { get; set; } = new();
        public int TotalActiveBookings { get; set; }
        public int UpcomingCount { get; set; }
        public int InProgressCount { get; set; }
        public int CompletedCount { get; set; }
    }

    // ────────────── TRIP ──────────────

    public class ItineraryTripDto
    {
        public string TripId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int TotalDays { get; set; }
        public int BookingCount { get; set; }
        public decimal TotalCost { get; set; }
        public string? PrimaryDestination { get; set; }
        public List<ItineraryDayDto> Days { get; set; } = new();
        public List<MapMarkerDto> MapMarkers { get; set; } = new();
        public MapBoundsDto? MapBounds { get; set; }
    }

    // ────────────── DAY ──────────────

    public class ItineraryDayDto
    {
        public DateTime Date { get; set; }
        public string DayLabel { get; set; } = string.Empty;
        public int DayNumber { get; set; }
        public decimal DayTotalCost { get; set; }
        public List<ItineraryTimelineItemDto> Items { get; set; } = new();
    }

    // ────────────── TIMELINE ITEM ──────────────

    public class ItineraryTimelineItemDto
    {
        public Guid BookingId { get; set; }
        public string BookingCode { get; set; } = string.Empty;
        public Guid? BookingDetailId { get; set; }
        public Guid ServiceId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public string ServiceType { get; set; } = string.Empty;
        public string? ThumbnailUrl { get; set; }
        public string? Description { get; set; }
        public string? Address { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string? TimeDisplay { get; set; }
        public string? MeetingPoint { get; set; }
        public string? RoomName { get; set; }
        public string? Duration { get; set; }
        public int NumberOfGuests { get; set; }
        public string BookingStatus { get; set; } = string.Empty;
        public bool CanCancel { get; set; }
        public string? CancellationPolicy { get; set; }
        public string? CancellationPolicyDescription { get; set; }
        public string? ContactName { get; set; }
        public string? ContactPhone { get; set; }
        public string? PartnerName { get; set; }
        public string? DestinationName { get; set; }
        public string ItemType { get; set; } = "booking";
        public string? Note { get; set; }
        public decimal EstimatedCost { get; set; }
    }

    // ────────────── MAP ──────────────

    public class MapMarkerDto
    {
        public Guid BookingId { get; set; }
        public string Title { get; set; } = string.Empty;
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public string? Address { get; set; }
        public string ServiceType { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string? TimeDisplay { get; set; }
        public string? IconType { get; set; } = "default";
    }

    public class MapBoundsDto
    {
        public double MinLat { get; set; }
        public double MaxLat { get; set; }
        public double MinLng { get; set; }
        public double MaxLng { get; set; }
    }

    // ────────────── REQUEST DTOs ──────────────

    public class ItineraryFilterDto
    {
        public string? Period { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public string? Status { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class CancelBookingFromItineraryDto
    {
        public string? Reason { get; set; }
    }
}
