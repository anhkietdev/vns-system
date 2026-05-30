using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Booking;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.User
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingController : ControllerBase
    {
        private readonly IBookingService _bookingService;

        public BookingController(IBookingService bookingService)
        {
            _bookingService = bookingService;
        }

        [HttpPost]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _bookingService.CreateBookingAsync(userId, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Tao dat cho thanh cong"));
        }

        [HttpPost("combo-quote")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> CreateComboQuote([FromBody] CreateComboQuoteDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _bookingService.CreateComboQuoteAsync(userId, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Tao bao gia combo thanh cong"));
        }

        [HttpGet]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> GetUserBookings([FromQuery] BookingFilterDto filter)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _bookingService.GetUserBookingsAsync(userId, filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lay danh sach dat cho thanh cong"));
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<IActionResult> GetBookingById(Guid id)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _bookingService.GetBookingByIdAsync(userId, id);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lay thong tin dat cho thanh cong"));
        }

        [HttpGet("schedule-availability/{scheduleId}")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> GetScheduleAvailability(Guid scheduleId)
        {
            var result = await _bookingService.GetScheduleAvailabilityAsync(scheduleId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lay thong tin cho trong thanh cong"));
        }

        [HttpPut("{id}/cancel")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> CancelBooking(Guid id, [FromBody] CancelBookingDto? dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _bookingService.CancelBookingAsync(userId, id, dto?.Reason);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Huy dat cho thanh cong"));
        }
    }
}
