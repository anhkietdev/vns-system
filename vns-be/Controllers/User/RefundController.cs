using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using VNS.API.Helpers;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.User
{
    [ApiController]
    [Route("api/[controller]")]
    public class RefundController : ControllerBase
    {
        private readonly IRefundService _refundService;

        public RefundController(IRefundService refundService)
        {
            _refundService = refundService;
        }

        [HttpGet("my-requests")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> GetMyRefundRequests()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var result = await _refundService.GetMyRefundRequestsAsync(userId);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lấy danh sách yêu cầu hoàn tiền thành công"));
        }
    }
}
