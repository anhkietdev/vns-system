using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Itinerary;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.User
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ItineraryController : ControllerBase
    {
        private readonly IItineraryService _itineraryService;

        public ItineraryController(IItineraryService itineraryService)
        {
            _itineraryService = itineraryService;
        }

        private Guid GetUserId() =>
            Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        /// <summary>Get full itinerary timeline with trips grouped by date proximity</summary>
        [HttpGet("timeline")]
        public async Task<IActionResult> GetTimeline([FromQuery] ItineraryFilterDto filter)
        {
            var result = await _itineraryService.GetUserTimelineAsync(GetUserId(), filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy hành trình thành công"));
        }

        /// <summary>Get a specific trip's detailed day-by-day breakdown</summary>
        [HttpGet("trips/{tripId}")]
        public async Task<IActionResult> GetTripDetail(string tripId)
        {
            var result = await _itineraryService.GetTripDetailAsync(GetUserId(), tripId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy chi tiết chuyến đi thành công"));
        }

        /// <summary>Get upcoming itinerary items for the next 7 days</summary>
        [HttpGet("upcoming")]
        public async Task<IActionResult> GetUpcoming()
        {
            var result = await _itineraryService.GetUpcomingAsync(GetUserId());
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy hành trình sắp tới thành công"));
        }

        /// <summary>Get map markers for Leaflet rendering within a date range</summary>
        [HttpGet("map-data")]
        public async Task<IActionResult> GetMapData([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        {
            var result = await _itineraryService.GetMapDataAsync(GetUserId(), fromDate, toDate);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy dữ liệu bản đồ thành công"));
        }

        /// <summary>Cancel a booking from the itinerary view</summary>
        [HttpPost("bookings/{bookingId}/cancel")]
        public async Task<IActionResult> CancelBooking(Guid bookingId, [FromBody] CancelBookingFromItineraryDto? dto)
        {
            var result = await _itineraryService.CancelBookingAsync(GetUserId(), bookingId, dto?.Reason);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Hủy đặt chỗ thành công"));
        }
    }
}
