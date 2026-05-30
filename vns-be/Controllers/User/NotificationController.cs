using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.User
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;

        public NotificationController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _notificationService.GetNotificationsAsync(userId, page, pageSize);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy thông báo thành công"));
        }

        [HttpGet("unread-count")]
        [Authorize]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _notificationService.GetUnreadCountAsync(userId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy số thông báo chưa đọc thành công"));
        }

        [HttpPut("{id}/read")]
        [Authorize]
        public async Task<IActionResult> MarkAsRead(Guid id)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _notificationService.MarkAsReadAsync(userId, id);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Đánh dấu đã đọc thành công"));
        }

        [HttpPut("read-all")]
        [Authorize]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _notificationService.MarkAllAsReadAsync(userId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Đánh dấu tất cả đã đọc thành công"));
        }
    }
}
