using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Partner;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.Partner
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Partner")]
    public class PartnerBookingController : ControllerBase
    {
        private readonly IBookingService _bookingService;

        public PartnerBookingController(IBookingService bookingService)
        {
            _bookingService = bookingService;
        }

        [HttpGet]
        public async Task<IActionResult> GetPartnerBookings([FromQuery] PartnerBookingFilterDto filter)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _bookingService.GetPartnerBookingsAsync(userId, filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách đặt chỗ thành công"));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetBookingDetail(Guid id)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _bookingService.GetPartnerBookingDetailAsync(userId, id);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy chi tiết đặt chỗ thành công"));
        }

        [HttpPut("{id}/confirm")]
        public async Task<IActionResult> ConfirmBooking(Guid id)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _bookingService.ConfirmBookingAsync(userId, id);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Xác nhận đặt chỗ thành công"));
        }

        [HttpPut("{id}/complete")]
        public async Task<IActionResult> CompleteBooking(Guid id)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _bookingService.CompleteBookingAsync(userId, id);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Hoàn thành đặt chỗ thành công"));
        }

        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> CancelBooking(Guid id, [FromBody] CancelPartnerBookingDto? dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _bookingService.CancelPartnerBookingAsync(userId, id, dto?.Reason);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Hủy đặt chỗ thành công"));
        }
    }
}
