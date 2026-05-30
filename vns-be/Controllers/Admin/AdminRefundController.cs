using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Admin;
using VNS.API.Services.Interfaces;

namespace VNS.API.Controllers.Admin
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Manager")]
    public class AdminRefundController : ControllerBase
    {
        private readonly IRefundService _refundService;

        public AdminRefundController(IRefundService refundService)
        {
            _refundService = refundService;
        }

        [HttpGet]
        public async Task<IActionResult> GetRefundRequests([FromQuery] RefundFilterDto filter)
        {
            var result = await _refundService.GetRefundRequestsAsync(filter);
            return Ok(ApiResponse<object>.SuccessResponse(result, "Lay danh sach yeu cau hoan tien thanh cong"));
        }
    }
}
