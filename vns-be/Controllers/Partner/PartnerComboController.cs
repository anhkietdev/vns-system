using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using VNS.API.Data;
using VNS.API.Helpers;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;

namespace VNS.API.Controllers.Partner
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Partner")]
    public class PartnerComboController : ControllerBase
    {
        private readonly VNSDbContext _context;

        public PartnerComboController(VNSDbContext context)
        {
            _context = context;
        }

        private sealed class ComboUsageState
        {
            public bool HasBookings { get; init; }
            public bool HasActiveQuotes { get; init; }
            public bool IsUsageLocked => HasBookings || HasActiveQuotes;
        }

        private async Task<Guid> GetPartnerIdAsync()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            if (partner == null)
                throw new Exception("Khong tim thay doi tac");

            return partner.Id;
        }

        [HttpGet]
        public async Task<IActionResult> GetCombos()
        {
            var partnerId = await GetPartnerIdAsync();
            var combos = await _context.Combos
                .Where(c => c.PartnerId == partnerId)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Destination)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Homestay)
                            .ThenInclude(h => h!.Rooms)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Tours)
                            .ThenInclude(t => t.TourSchedules)
                                .ThenInclude(ts => ts.PricingOverrides)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Tours)
                            .ThenInclude(t => t.TourPricingTiers)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            var usageStates = await GetUsageStatesAsync(combos.Select(combo => combo.Id).ToList());
            var response = combos
                .Select(combo => BuildComboResponse(combo, includePartnerName: false, usageStates.GetValueOrDefault(combo.Id)))
                .ToList();

            return Ok(ApiResponse<object>.SuccessResponse(response, "Lay danh sach combo thanh cong"));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetComboDetail(Guid id)
        {
            var partnerId = await GetPartnerIdAsync();
            var combo = await _context.Combos
                .Where(c => c.Id == id && c.PartnerId == partnerId)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Destination)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Homestay)
                            .ThenInclude(h => h!.Rooms)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Tours)
                            .ThenInclude(t => t.TourSchedules)
                                .ThenInclude(ts => ts.PricingOverrides)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Tours)
                            .ThenInclude(t => t.TourPricingTiers)
                .FirstOrDefaultAsync();

            if (combo == null)
                return NotFound(ApiResponse<object>.ErrorResponse("Khong tim thay combo"));

            var usageState = await GetUsageStateAsync(combo.Id);
            return Ok(ApiResponse<object>.SuccessResponse(
                BuildComboResponse(combo, includePartnerName: false, usageState),
                "Lay chi tiet combo thanh cong"));
        }

        [HttpPost]
        public async Task<IActionResult> CreateCombo([FromBody] CreateComboDto dto)
        {
            var partnerId = await GetPartnerIdAsync();
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(ApiResponse<object>.ErrorResponse("Ten combo khong duoc de trong"));

            if (dto.DiscountValue < 0)
                return BadRequest(ApiResponse<object>.ErrorResponse("Gia tri giam khong hop le"));

            var requestedItems = NormalizeRequestedItems(dto.Items, dto.ServiceIds);
            if (!requestedItems.Any())
                return BadRequest(ApiResponse<object>.ErrorResponse("Combo phai chon it nhat 2 dich vu."));

            var services = await GetRequestedServicesAsync(partnerId, requestedItems);
            if (services.Count != requestedItems.Count)
                return BadRequest(ApiResponse<object>.ErrorResponse("Mot so dich vu khong ton tai hoac khong thuoc ve ban"));

            try
            {
                ValidateBundleServices(services);
            }
            catch (BusinessException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }

            var orderedServices = requestedItems
                .OrderBy(item => item.DisplayOrder)
                .Select(item => services.First(service => service.Id == item.ServiceId))
                .ToList();

            var combo = new Combo
            {
                Id = Guid.NewGuid(),
                PartnerId = partnerId,
                Name = dto.Name.Trim(),
                Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
                DiscountType = dto.DiscountType,
                DiscountValue = dto.DiscountValue,
                DateDriver = dto.DateDriver,
                StayOffsetBeforeDays = Math.Max(0, dto.StayOffsetBeforeDays),
                StayOffsetAfterDays = Math.Max(0, dto.StayOffsetAfterDays),
                ThumbnailUrl = string.IsNullOrWhiteSpace(dto.ThumbnailUrl)
                    ? orderedServices.FirstOrDefault(service => !string.IsNullOrWhiteSpace(service.ThumbnailUrl))?.ThumbnailUrl
                    : dto.ThumbnailUrl,
                CreatedAt = DateTime.UtcNow,
            };

            try
            {
                ValidateBookingConfig(combo, requestedItems, orderedServices);
            }
            catch (BusinessException ex)
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
            }

            combo.OriginalPrice = orderedServices.Sum(ComboBundleHelper.GetServiceFromPrice);
            combo.ComboPrice = ComboBundleHelper.CalculateDiscountedTotal(dto.DiscountType, dto.DiscountValue, combo.OriginalPrice);

            var publicReadiness = EvaluatePublicReadiness(combo, orderedServices);
            combo.IsActive = publicReadiness.IsEligible;

            _context.Combos.Add(combo);
            foreach (var item in requestedItems.OrderBy(item => item.DisplayOrder))
            {
                _context.ComboItems.Add(new ComboItem
                {
                    Id = Guid.NewGuid(),
                    ComboId = combo.Id,
                    ServiceId = item.ServiceId,
                    DisplayOrder = item.DisplayOrder,
                    PreferredRoomId = item.PreferredRoomId,
                });
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                combo.Id,
                IsPubliclyBookable = publicReadiness.IsEligible,
                BlockingReasons = publicReadiness.BlockingReasons
            }, "Tao combo thanh cong"));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCombo(Guid id, [FromBody] UpdateComboDto dto)
        {
            var partnerId = await GetPartnerIdAsync();
            var combo = await _context.Combos
                .Where(c => c.Id == id && c.PartnerId == partnerId)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Homestay)
                            .ThenInclude(h => h!.Rooms)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Tours)
                            .ThenInclude(t => t.TourSchedules)
                                .ThenInclude(ts => ts.PricingOverrides)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Tours)
                            .ThenInclude(t => t.TourPricingTiers)
                .FirstOrDefaultAsync();

            if (combo == null)
                return NotFound(ApiResponse<object>.ErrorResponse("Khong tim thay combo"));

            if (dto.DiscountValue.HasValue && dto.DiscountValue.Value < 0)
                return BadRequest(ApiResponse<object>.ErrorResponse("Gia tri giam khong hop le"));

            var usageState = await GetUsageStateAsync(combo.Id);
            if (usageState.IsUsageLocked && HasRestrictedChanges(combo, dto))
            {
                return BadRequest(ApiResponse<object>.ErrorResponse(
                    "Combo da co booking hoac bao gia con hieu luc. Chi duoc cap nhat ten, mo ta, anh dai dien va trang thai hoat dong."));
            }

            if (!string.IsNullOrWhiteSpace(dto.Name))
                combo.Name = dto.Name.Trim();
            if (dto.Description != null)
                combo.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
            if (dto.ThumbnailUrl != null)
                combo.ThumbnailUrl = dto.ThumbnailUrl;
            if (dto.IsActive.HasValue)
                combo.IsActive = dto.IsActive.Value;
            if (dto.DiscountType.HasValue)
                combo.DiscountType = dto.DiscountType.Value;
            if (dto.DiscountValue.HasValue)
                combo.DiscountValue = dto.DiscountValue.Value;
            if (dto.DateDriver.HasValue)
                combo.DateDriver = dto.DateDriver.Value;
            if (dto.StayOffsetBeforeDays.HasValue)
                combo.StayOffsetBeforeDays = Math.Max(0, dto.StayOffsetBeforeDays.Value);
            if (dto.StayOffsetAfterDays.HasValue)
                combo.StayOffsetAfterDays = Math.Max(0, dto.StayOffsetAfterDays.Value);

            var requestedItems = NormalizeRequestedItems(dto.Items, dto.ServiceIds);
            List<Service> orderedServices;

            if (requestedItems.Any())
            {
                var services = await GetRequestedServicesAsync(partnerId, requestedItems);
                if (services.Count != requestedItems.Count)
                    return BadRequest(ApiResponse<object>.ErrorResponse("Mot so dich vu khong ton tai hoac khong thuoc ve ban"));

                try
                {
                    ValidateBundleServices(services);
                }
                catch (BusinessException ex)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
                }

                orderedServices = requestedItems
                    .OrderBy(item => item.DisplayOrder)
                    .Select(item => services.First(service => service.Id == item.ServiceId))
                    .ToList();

                try
                {
                    ValidateBookingConfig(combo, requestedItems, orderedServices);
                }
                catch (BusinessException ex)
                {
                    return BadRequest(ApiResponse<object>.ErrorResponse(ex.Message));
                }

                _context.ComboItems.RemoveRange(combo.ComboItems);
                combo.ComboItems = requestedItems
                    .OrderBy(item => item.DisplayOrder)
                    .Select(item => new ComboItem
                    {
                        Id = Guid.NewGuid(),
                        ComboId = combo.Id,
                        ServiceId = item.ServiceId,
                        DisplayOrder = item.DisplayOrder,
                        PreferredRoomId = item.PreferredRoomId,
                    })
                    .ToList();

                foreach (var comboItem in combo.ComboItems)
                    _context.ComboItems.Add(comboItem);

                if (string.IsNullOrWhiteSpace(combo.ThumbnailUrl))
                {
                    combo.ThumbnailUrl = orderedServices.FirstOrDefault(service => !string.IsNullOrWhiteSpace(service.ThumbnailUrl))?.ThumbnailUrl;
                }
            }
            else
            {
                orderedServices = combo.ComboItems
                    .OrderBy(item => item.DisplayOrder)
                    .Select(item => item.Service)
                    .ToList();
            }

            combo.OriginalPrice = orderedServices.Sum(ComboBundleHelper.GetServiceFromPrice);
            combo.ComboPrice = ComboBundleHelper.CalculateDiscountedTotal(combo.DiscountType, combo.DiscountValue, combo.OriginalPrice);

            var publicReadiness = EvaluatePublicReadiness(combo, orderedServices);
            if (!publicReadiness.IsEligible)
            {
                combo.IsActive = false;
            }
            else if (dto.IsActive.HasValue)
            {
                combo.IsActive = dto.IsActive.Value;
            }

            combo.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                Message = "Cap nhat combo thanh cong",
                IsPubliclyBookable = publicReadiness.IsEligible,
                BlockingReasons = publicReadiness.BlockingReasons
            }));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCombo(Guid id)
        {
            var partnerId = await GetPartnerIdAsync();
            var combo = await _context.Combos
                .FirstOrDefaultAsync(c => c.Id == id && c.PartnerId == partnerId);

            if (combo == null)
                return NotFound(ApiResponse<object>.ErrorResponse("Khong tim thay combo"));

            combo.IsActive = false;
            combo.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new { Message = "Luu tru combo thanh cong" }));
        }

        private async Task<List<Service>> GetRequestedServicesAsync(Guid partnerId, List<ComboItemInputDto> requestedItems)
        {
            var serviceIds = requestedItems.Select(item => item.ServiceId).Distinct().ToList();
            return await _context.Services
                .Where(service => serviceIds.Contains(service.Id) && service.PartnerId == partnerId)
                .Include(service => service.Destination)
                .Include(service => service.Homestay)
                    .ThenInclude(h => h!.Rooms)
                .Include(service => service.Tours)
                    .ThenInclude(t => t.TourSchedules)
                        .ThenInclude(ts => ts.PricingOverrides)
                .Include(service => service.Tours)
                    .ThenInclude(t => t.TourPricingTiers)
                .ToListAsync();
        }

        private static ComboEligibilityResult EvaluatePublicReadiness(Combo combo, IReadOnlyCollection<Service> orderedServices)
        {
            return ComboBundleHelper.EvaluateComboReadiness(
                orderedServices,
                combo.DateDriver,
                combo.StayOffsetBeforeDays,
                combo.StayOffsetAfterDays,
                requireApproved: true);
        }

        private static void ValidateBundleServices(List<Service> services)
        {
            ComboBundleHelper.ValidateBundleComposition(services);

            if (services.Any(service => !ComboBundleHelper.IsBundleEligibleService(service, requireApproved: false)))
                throw new BusinessException("Combo chi duoc ghep tu homestay va tour dang hoat dong, khong bi tu choi.");
        }

        private static bool HasRestrictedChanges(Combo combo, UpdateComboDto dto)
        {
            if (dto.DiscountType.HasValue && dto.DiscountType.Value != combo.DiscountType)
                return true;
            if (dto.DiscountValue.HasValue && dto.DiscountValue.Value != combo.DiscountValue)
                return true;
            if (dto.DateDriver.HasValue && dto.DateDriver.Value != combo.DateDriver)
                return true;
            if (dto.StayOffsetBeforeDays.HasValue && Math.Max(0, dto.StayOffsetBeforeDays.Value) != combo.StayOffsetBeforeDays)
                return true;
            if (dto.StayOffsetAfterDays.HasValue && Math.Max(0, dto.StayOffsetAfterDays.Value) != combo.StayOffsetAfterDays)
                return true;

            var requestedItems = NormalizeRequestedItems(dto.Items, dto.ServiceIds);
            if (!requestedItems.Any())
                return false;

            var currentItems = combo.ComboItems
                .OrderBy(item => item.DisplayOrder)
                .Select(item => new ComboItemInputDto
                {
                    ServiceId = item.ServiceId,
                    DisplayOrder = item.DisplayOrder,
                    PreferredRoomId = item.PreferredRoomId,
                })
                .ToList();

            if (currentItems.Count != requestedItems.Count)
                return true;

            return currentItems.Zip(requestedItems, (current, next) =>
                    current.ServiceId != next.ServiceId
                    || current.DisplayOrder != next.DisplayOrder
                    || current.PreferredRoomId != next.PreferredRoomId)
                .Any(changed => changed);
        }

        private async Task<Dictionary<Guid, ComboUsageState>> GetUsageStatesAsync(List<Guid> comboIds)
        {
            if (!comboIds.Any())
                return new Dictionary<Guid, ComboUsageState>();

            var bookedIds = await _context.ComboBookingItems
                .Where(item => comboIds.Contains(item.ComboId))
                .Select(item => item.ComboId)
                .Distinct()
                .ToListAsync();

            var quotedIds = await _context.ComboBookingQuotes
                .Where(item => comboIds.Contains(item.ComboId) && item.ExpiresAt > DateTime.UtcNow)
                .Select(item => item.ComboId)
                .Distinct()
                .ToListAsync();

            return comboIds.Distinct().ToDictionary(
                comboId => comboId,
                comboId => new ComboUsageState
                {
                    HasBookings = bookedIds.Contains(comboId),
                    HasActiveQuotes = quotedIds.Contains(comboId)
                });
        }

        private async Task<ComboUsageState> GetUsageStateAsync(Guid comboId)
        {
            var states = await GetUsageStatesAsync(new List<Guid> { comboId });
            return states.GetValueOrDefault(comboId) ?? new ComboUsageState();
        }

        private static List<ComboItemInputDto> NormalizeRequestedItems(List<ComboItemInputDto>? items, List<Guid>? serviceIds)
        {
            var normalizedItems = (items ?? new List<ComboItemInputDto>())
                .Where(item => item.ServiceId != Guid.Empty)
                .GroupBy(item => item.ServiceId)
                .Select(group => group.First())
                .OrderBy(item => item.DisplayOrder)
                .Select((item, index) => new ComboItemInputDto
                {
                    ServiceId = item.ServiceId,
                    DisplayOrder = index,
                    PreferredRoomId = item.PreferredRoomId,
                })
                .ToList();

            if (normalizedItems.Any())
                return normalizedItems;

            return (serviceIds ?? new List<Guid>())
                .Where(serviceId => serviceId != Guid.Empty)
                .Distinct()
                .Select((serviceId, index) => new ComboItemInputDto
                {
                    ServiceId = serviceId,
                    DisplayOrder = index,
                })
                .ToList();
        }

        private static void ValidateBookingConfig(Combo combo, List<ComboItemInputDto> requestedItems, List<Service> orderedServices)
        {
            var orderedByConfig = requestedItems
                .OrderBy(item => item.DisplayOrder)
                .Select(item => new
                {
                    Item = item,
                    Service = orderedServices.First(service => service.Id == item.ServiceId),
                })
                .ToList();

            var homestay = orderedByConfig.First(item => item.Service.ServiceType == ServiceType.Homestay);
            var tour = orderedByConfig.First(item => item.Service.ServiceType == ServiceType.Tour);

            var activeRooms = homestay.Service.Homestay?.Rooms.Where(room => room.IsActive).ToList() ?? new List<Room>();
            if (!activeRooms.Any())
                throw new BusinessException("Homestay in combo must have at least one active room.");

            if (homestay.Item.PreferredRoomId.HasValue &&
                activeRooms.All(room => room.Id != homestay.Item.PreferredRoomId.Value))
                throw new BusinessException("Preferred room does not belong to the selected homestay.");

            var futureSchedules = tour.Service.Tours
                .SelectMany(package => package.TourSchedules.Select(schedule => new { Package = package, Schedule = schedule }))
                .Where(item => item.Schedule.Status == TourScheduleStatus.Active && item.Schedule.StartDate > DateTime.UtcNow)
                .ToList();
            if (!futureSchedules.Any())
                throw new BusinessException("Tour in combo must have at least one future active schedule.");

            if (combo.DateDriver == ComboDateDriver.Tour)
            {
                var stayLength = Math.Max(1, combo.StayOffsetBeforeDays + combo.StayOffsetAfterDays + 1);
                var minNights = homestay.Service.Homestay?.MinNights ?? 1;
                if (stayLength < minNights)
                    throw new BusinessException("Tour-driven combo stay offsets do not satisfy the homestay minimum nights.");
            }
        }

        private static object BuildComboResponse(Combo combo, bool includePartnerName, ComboUsageState? usageState)
        {
            var orderedItems = combo.ComboItems.OrderBy(item => item.DisplayOrder).ToList();
            var homestay = orderedItems.FirstOrDefault(item => item.Service.ServiceType == ServiceType.Homestay);
            var tour = orderedItems.FirstOrDefault(item => item.Service.ServiceType == ServiceType.Tour);
            var discountAmount = Math.Max(0, combo.OriginalPrice - combo.ComboPrice);
            var discountPercent = ComboBundleHelper.GetDiscountPercent(combo.OriginalPrice, combo.ComboPrice);
            var publicReadiness = EvaluatePublicReadiness(combo, orderedItems.Select(item => item.Service).ToList());

            return new
            {
                combo.Id,
                combo.Name,
                combo.Description,
                combo.OriginalPrice,
                combo.ComboPrice,
                FromOriginalPrice = combo.OriginalPrice,
                FromComboPrice = combo.ComboPrice,
                DiscountAmount = discountAmount,
                DiscountPercent = discountPercent,
                Discount = discountPercent,
                combo.DiscountType,
                combo.DiscountValue,
                combo.DateDriver,
                combo.StayOffsetBeforeDays,
                combo.StayOffsetAfterDays,
                combo.ThumbnailUrl,
                combo.IsActive,
                combo.CreatedAt,
                ServiceCount = orderedItems.Count,
                PartnerName = includePartnerName ? combo.Partner?.BusinessName : null,
                Homestay = homestay != null ? BuildServiceSummary(homestay) : null,
                Tour = tour != null ? BuildServiceSummary(tour) : null,
                Services = orderedItems.Select(BuildServiceSummary).ToList(),
                IsPubliclyBookable = publicReadiness.IsEligible,
                BlockingReasons = publicReadiness.BlockingReasons,
                HasBookings = usageState?.HasBookings ?? false,
                HasActiveQuotes = usageState?.HasActiveQuotes ?? false,
                IsUsageLocked = usageState?.IsUsageLocked ?? false
            };
        }

        private static object BuildServiceSummary(ComboItem item)
        {
            var fromPrice = ComboBundleHelper.GetServiceFromPrice(item.Service);
            return new
            {
                item.Id,
                item.DisplayOrder,
                item.ServiceId,
                item.PreferredRoomId,
                item.PreferredTourPricingTierId,
                item.Service.Name,
                item.Service.ServiceType,
                BasePrice = item.Service.BasePrice,
                DiscountPrice = item.Service.DiscountPrice,
                FromPrice = fromPrice,
                item.Service.ThumbnailUrl,
                item.Service.Description,
                DestinationName = item.Service.Destination?.Name,
                CancellationPolicyType = item.Service.CancellationPolicyType,
            };
        }
    }

    public class CreateComboDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public ComboDiscountType DiscountType { get; set; } = ComboDiscountType.Percentage;
        public decimal DiscountValue { get; set; }
        public ComboDateDriver DateDriver { get; set; } = ComboDateDriver.Stay;
        public int StayOffsetBeforeDays { get; set; }
        public int StayOffsetAfterDays { get; set; }
        public string? ThumbnailUrl { get; set; }
        public List<Guid> ServiceIds { get; set; } = new();
        public List<ComboItemInputDto> Items { get; set; } = new();
    }

    public class UpdateComboDto
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public ComboDiscountType? DiscountType { get; set; }
        public decimal? DiscountValue { get; set; }
        public ComboDateDriver? DateDriver { get; set; }
        public int? StayOffsetBeforeDays { get; set; }
        public int? StayOffsetAfterDays { get; set; }
        public string? ThumbnailUrl { get; set; }
        public bool? IsActive { get; set; }
        public List<Guid>? ServiceIds { get; set; }
        public List<ComboItemInputDto>? Items { get; set; }
    }

    public class ComboItemInputDto
    {
        public Guid ServiceId { get; set; }
        public int DisplayOrder { get; set; }
        public Guid? PreferredRoomId { get; set; }
        public Guid? PreferredTourPackageId { get; set; }
    }
}
