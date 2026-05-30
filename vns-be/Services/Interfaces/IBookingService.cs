using VNS.API.Models.DTOs.Booking;
using VNS.API.Models.DTOs.Partner;

namespace VNS.API.Services.Interfaces
{
    public interface IBookingService
    {
        Task<BookingDetailDto> CreateBookingAsync(Guid userId, CreateBookingDto dto);
        Task<ComboBookingQuoteDto> CreateComboQuoteAsync(Guid userId, CreateComboQuoteDto dto);
        Task<object> GetUserBookingsAsync(Guid userId, BookingFilterDto filter);
        Task<BookingDetailDto> GetBookingByIdAsync(Guid userId, Guid bookingId);
        Task<object> CancelBookingAsync(Guid userId, Guid bookingId, string? reason = null);
        Task<object> CancelPartnerBookingAsync(Guid userId, Guid bookingId, string? reason = null);
        Task<object> GetPartnerBookingsAsync(Guid userId, PartnerBookingFilterDto filter);
        Task<object> GetPartnerBookingDetailAsync(Guid userId, Guid bookingId);
        Task<object> ConfirmBookingAsync(Guid userId, Guid bookingId);
        Task<object> CompleteBookingAsync(Guid userId, Guid bookingId);
        Task ExpireBookingsAsync();
        Task AutoCompleteConfirmedBookingsAsync();
        Task<object> GetScheduleAvailabilityAsync(Guid scheduleId);
    }
}
