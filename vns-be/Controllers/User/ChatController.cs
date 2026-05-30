using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Chat;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.User
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly IChatService _chatService;

        public ChatController(IChatService chatService)
        {
            _chatService = chatService;
        }

        [HttpGet("conversations")]
        [Authorize]
        public async Task<IActionResult> GetConversations()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _chatService.GetConversationsAsync(userId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách hội thoại thành công"));
        }

        [HttpGet("{conversationId}/messages")]
        [Authorize]
        public async Task<IActionResult> GetMessages(Guid conversationId, [FromQuery] int page = 1, [FromQuery] int pageSize = 30)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _chatService.GetMessagesAsync(userId, conversationId, page, pageSize);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy tin nhắn thành công"));
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageDto dto)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _chatService.SendMessageAsync(userId, dto);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Gửi tin nhắn thành công"));
        }

        [HttpPut("{conversationId}/read")]
        [Authorize]
        public async Task<IActionResult> MarkAsRead(Guid conversationId)
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _chatService.MarkAsReadAsync(userId, conversationId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Đánh dấu đã đọc thành công"));
        }
    }
}
