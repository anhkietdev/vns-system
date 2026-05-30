using VNS.API.Models.DTOs.Itinerary;

namespace VNS.API.Services.Interfaces
{
    public interface IItineraryService
    {
        /// <summary>Get the user's full itinerary timeline with trips grouped by date proximity</summary>
        Task<object> GetUserTimelineAsync(Guid userId, ItineraryFilterDto filter);

        /// <summary>Get a single trip's detailed day-by-day breakdown</summary>
        Task<object> GetTripDetailAsync(Guid userId, string tripId);

        /// <summary>Get map markers for a date range (for Leaflet rendering)</summary>
        Task<object> GetMapDataAsync(Guid userId, DateTime? fromDate, DateTime? toDate);

        /// <summary>Get upcoming itinerary items (next 7 days)</summary>
        Task<object> GetUpcomingAsync(Guid userId);

        /// <summary>Cancel a booking from the itinerary view (delegates to BookingService)</summary>
        Task<object> CancelBookingAsync(Guid userId, Guid bookingId, string? reason);
    }
}
