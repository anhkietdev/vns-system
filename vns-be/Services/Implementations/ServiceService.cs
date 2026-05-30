using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Models.DTOs.Admin;
using VNS.API.Models.DTOs.Partner;
using VNS.API.Models.DTOs.Service;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;
using VNS.API.Helpers;
using VNS.API.Services.Interfaces;
using System.Text.Json;

namespace VNS.API.Services.Implementations
{
    public class ServiceService : IServiceService
    {
        private const decimal MinRoomNightlyPrice = 100000m;
        private const decimal MaxRoomNightlyPrice = 20000000m;
        private static readonly HashSet<string> AllowedTourActivityTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "transport",
            "visit",
            "meal",
            "pickup",
            "dropoff",
            "free_time"
        };

        private readonly VNSDbContext _context;

        public ServiceService(VNSDbContext context)
        {
            _context = context;
        }

        public async Task<object> GetServicesAsync(ServiceFilterDto filter)
        {
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1) filter.PageSize = 10;
            if (filter.PageSize > 100) filter.PageSize = 100;

            var query = _context.Services.Include(s => s.Partner).Include(s => s.Destination)
                .Where(s => s.IsActive && s.ApprovalStatus == ServiceApprovalStatus.Approved).AsQueryable();

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(s => s.Name.ToLower().Contains(kw) || (s.Description != null && s.Description.ToLower().Contains(kw)) || (s.Address != null && s.Address.ToLower().Contains(kw)));
            }
            if (filter.ServiceType.HasValue) query = query.Where(s => s.ServiceType == filter.ServiceType.Value);
            if (filter.DestinationId.HasValue) query = query.Where(s => s.DestinationId == filter.DestinationId.Value);
            if (filter.MinPrice.HasValue) query = query.Where(s => (s.DiscountPrice ?? s.BasePrice) >= filter.MinPrice.Value);
            if (filter.MaxPrice.HasValue) query = query.Where(s => (s.DiscountPrice ?? s.BasePrice) <= filter.MaxPrice.Value);
            if (filter.MinRating.HasValue) query = query.Where(s => s.AverageRating >= filter.MinRating.Value);

            // Lọc theo ngày khả dụng
            if (filter.Date.HasValue)
            {
                var date = filter.Date.Value.Date;
                query = query.Where(s =>
                    // Tour: có TourSchedule bao phủ ngày đó, còn slot
                    (s.ServiceType == ServiceType.Tour &&
                        s.Tours.Any(t => t.TourSchedules.Any(ts =>
                            ts.StartDate.Date <= date && ts.EndDate.Date >= date
                            && (Math.Max(ts.RunCount, 1) * ts.AvailableSlots) > ts.BookedSlots)))
                    ||
                    // Homestay: có phòng active
                    (s.ServiceType == ServiceType.Homestay &&
                        s.Homestay != null &&
                        s.Homestay.Rooms.Any(r => r.IsActive))
                );
            }

            query = filter.SortBy switch
            {
                "price_asc" => query.OrderBy(s => s.DiscountPrice ?? s.BasePrice),
                "price_desc" => query.OrderByDescending(s => s.DiscountPrice ?? s.BasePrice),
                "rating" => query.OrderByDescending(s => s.AverageRating),
                "popular" => query.OrderByDescending(s => s.TotalBookings),
                "newest" => query.OrderByDescending(s => s.CreatedAt),
                _ => query.OrderByDescending(s => s.CreatedAt)
            };

            var totalCount = await query.CountAsync();
            var items = await query.Skip((filter.Page - 1) * filter.PageSize).Take(filter.PageSize)
                .Select(s => MapToListDto(s)).ToListAsync();

            return new { Items = items, TotalCount = totalCount, Page = filter.Page, PageSize = filter.PageSize, TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize) };
        }

        public async Task<ServiceDetailDto> GetServiceByIdAsync(Guid id)
        {
            var service = await _context.Services.Include(s => s.Partner).ThenInclude(p => p.User)
                .Include(s => s.Destination)
                .Include(s => s.ServiceImages.OrderBy(i => i.DisplayOrder))
                .Include(s => s.ChangeRequests)
                .Include(s => s.Tours).ThenInclude(t => t.TourSchedules).ThenInclude(ts => ts.PricingOverrides).ThenInclude(item => item.TourPricingTier)
                .Include(s => s.Tours).ThenInclude(t => t.TourItineraries)
                .Include(s => s.Tours).ThenInclude(t => t.TourImages)
                .Include(s => s.Tours).ThenInclude(t => t.TourPricingTiers)
                .Include(s => s.Homestay).ThenInclude(h => h!.Rooms).ThenInclude(r => r.RoomImages)
                .Include(s => s.Homestay).ThenInclude(h => h!.Rooms).ThenInclude(r => r.RoomAmenities)
                .Include(s => s.Homestay).ThenInclude(h => h!.Rooms).ThenInclude(r => r.RoomAvailabilities)
                .Include(s => s.Homestay).ThenInclude(h => h!.HomestayAmenities)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (service == null) throw new BusinessException("Không tìm thấy dịch vụ");

            var dto = new ServiceDetailDto
            {
                Id = service.Id, PartnerId = service.PartnerId, Name = service.Name, Description = service.Description,
                ServiceType = service.ServiceType, DestinationId = service.DestinationId, Address = service.Address, Latitude = service.Latitude, Longitude = service.Longitude,
                BasePrice = service.BasePrice, DiscountPrice = service.DiscountPrice, ThumbnailUrl = service.ThumbnailUrl,
                AverageRating = service.AverageRating, TotalReviews = service.TotalReviews, TotalBookings = service.TotalBookings,
                CancellationPolicyType = service.CancellationPolicyType, CancellationPolicyDescription = service.CancellationPolicyDescription,
                ApprovalStatus = service.ApprovalStatus, RejectionReason = service.RejectionReason,
                HasPendingChanges = service.ChangeRequests.Any(cr => cr.Status == ServiceApprovalStatus.Pending),
                PendingChangeId = service.ChangeRequests.Where(cr => cr.Status == ServiceApprovalStatus.Pending).OrderByDescending(cr => cr.CreatedAt).Select(cr => (Guid?)cr.Id).FirstOrDefault(),
                IsActive = service.IsActive,
                DestinationName = service.Destination.Name, PartnerName = service.Partner.BusinessName, PartnerPhone = service.Partner.User?.PhoneNumber, CreatedAt = service.CreatedAt,
                Images = service.ServiceImages.Select(i => new ServiceImageDto { Id = i.Id, ImageUrl = i.ImageUrl, DisplayOrder = i.DisplayOrder }).ToList()
            };

            if (service.ServiceType == ServiceType.Tour && service.Tours.Any())
            {
                dto.TourPackages = service.Tours
                    .OrderBy(tour => tour.DisplayOrder)
                    .ThenBy(tour => tour.Id)
                    .Select(tour => MapTourDetailDto(tour, service))
                    .ToList();
                dto.Tour = dto.TourPackages.FirstOrDefault();
            }

            if (service.ServiceType == ServiceType.Homestay && service.Homestay != null)
            {
                dto.Homestay = new HomestayDetailDto
                {
                    Id = service.Homestay.Id, CheckInTime = service.Homestay.CheckInTime, CheckOutTime = service.Homestay.CheckOutTime,
                    MinNights = service.Homestay.MinNights, MaxNights = service.Homestay.MaxNights,
                    AvailableFrom = service.Homestay.AvailableFrom, AvailableTo = service.Homestay.AvailableTo,
                    Rooms = service.Homestay.Rooms
                        .Where(r => r.IsActive)
                        .Select(r => new RoomDto
                        {
                            Id = r.Id,
                            Name = r.Name,
                            Description = r.Description,
                            BedType = r.BedType,
                            BedCount = r.BedCount,
                            MaxGuests = r.MaxGuests,
                            Quantity = r.Quantity,
                            BasePrice = r.BasePrice,
                            WeekendPrice = r.WeekendPrice,
                            HolidayPrice = r.HolidayPrice,
                            ImageUrl = r.ImageUrl,
                            Images = r.RoomImages
                                .OrderBy(ri => ri.DisplayOrder)
                                .Select(ri => new RoomImageDto
                                {
                                    Id = ri.Id,
                                    ImageUrl = ri.ImageUrl,
                                    DisplayOrder = ri.DisplayOrder,
                                    IsCover = ri.IsCover
                                })
                                .ToList(),
                            Amenities = r.RoomAmenities
                                .Select(a => new AmenityDto
                                {
                                    Id = a.Id,
                                    Name = a.Name,
                                    Icon = a.Icon
                                })
                                .ToList(),
                            Availability = r.RoomAvailabilities
                                .OrderBy(a => a.Date)
                                .Select(a => new RoomAvailabilityDto
                                {
                                    Id = a.Id,
                                    Date = a.Date,
                                    AvailableCount = a.AvailableCount,
                                    PriceOverride = a.PriceOverride,
                                    IsBlocked = a.IsBlocked
                                })
                                .ToList(),
                            IsActive = r.IsActive
                        })
                        .ToList(),
                    Amenities = service.Homestay.HomestayAmenities.Select(a => new AmenityDto { Id = a.Id, Name = a.Name, Icon = a.Icon }).ToList()
                };
            }

            return dto;
        }

        public async Task<List<ServiceListDto>> GetPopularServicesAsync(int count)
        {
            return await _context.Services.Include(s => s.Partner).Include(s => s.Destination)
                .Where(s => s.IsActive && s.ApprovalStatus == ServiceApprovalStatus.Approved)
                .OrderByDescending(s => s.TotalBookings).ThenByDescending(s => s.AverageRating).Take(count)
                .Select(s => MapToListDto(s)).ToListAsync();
        }

        public async Task<List<ServiceListDto>> GetNearbyServicesAsync(double lat, double lng, double radiusKm)
        {
            var services = await _context.Services.Include(s => s.Partner).Include(s => s.Destination)
                .Where(s => s.IsActive && s.ApprovalStatus == ServiceApprovalStatus.Approved && s.Latitude.HasValue && s.Longitude.HasValue)
                .ToListAsync();

            return services.Where(s => GetDistance(lat, lng, s.Latitude!.Value, s.Longitude!.Value) <= radiusKm)
                .OrderBy(s => GetDistance(lat, lng, s.Latitude!.Value, s.Longitude!.Value))
                .Select(s => new ServiceListDto { Id = s.Id, Name = s.Name, Description = s.Description, ServiceType = s.ServiceType, DestinationId = s.DestinationId, Address = s.Address, BasePrice = s.BasePrice, DiscountPrice = s.DiscountPrice, ThumbnailUrl = s.ThumbnailUrl, AverageRating = s.AverageRating, TotalReviews = s.TotalReviews, TotalBookings = s.TotalBookings, DestinationName = s.Destination.Name, PartnerId = s.PartnerId, PartnerName = s.Partner.BusinessName, ApprovalStatus = s.ApprovalStatus, IsActive = s.IsActive })
                .ToList();
        }

        public async Task<object> CreateTourAsync(Guid userId, CreateTourDto dto)
        {
            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            if (partner == null || partner.VerificationStatus != PartnerVerificationStatus.Approved)
                throw new BusinessException("Đối tác chưa được xác minh");

            var packages = BuildTourPackages(dto);
            ValidateTourPackages(packages);

            var cheapestTier = packages
                .SelectMany(package => package.PricingTiers)
                .OrderBy(tier => tier.UnitPrice)
                .FirstOrDefault();
            if (cheapestTier == null)
                throw new BusinessException("Mỗi gói tour phải có ít nhất một mức giá.");

            var firstPackage = packages[0];
            var firstPackageImages = firstPackage.Images
                .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                .OrderBy(image => image.DisplayOrder)
                .ToList();
            var topLevelImages = dto.ImageUrls
                .Where(url => !string.IsNullOrWhiteSpace(url))
                .Select((url, index) => new CreateTourImageDto
                {
                    ImageUrl = url.Trim(),
                    DisplayOrder = index,
                    IsCover = StringComparer.OrdinalIgnoreCase.Equals(url.Trim(), dto.ThumbnailUrl?.Trim()) || index == 0
                })
                .ToList();
            var serviceImages = firstPackageImages.Count > 0 ? firstPackageImages : topLevelImages;
            var coverImage = serviceImages.FirstOrDefault(image => image.IsCover) ?? serviceImages.FirstOrDefault();
            var strictestPackage = packages
                .OrderByDescending(package => package.CancellationPolicyType)
                .ThenBy(package => package.Name, StringComparer.OrdinalIgnoreCase)
                .First();

            var destId = dto.DestinationId ?? (await _context.Destinations.Select(d => d.Id).FirstOrDefaultAsync());
            var service = new Service
            {
                Id = Guid.NewGuid(),
                PartnerId = partner.Id,
                DestinationId = destId,
                Name = dto.Name,
                Description = dto.Description,
                ServiceType = dto.ServiceType ?? ServiceType.Tour,
                Address = dto.Address,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                BasePrice = cheapestTier.UnitPrice,
                DiscountPrice = dto.Packages.Any() ? null : dto.DiscountPrice,
                ThumbnailUrl = coverImage?.ImageUrl ?? dto.ThumbnailUrl,
                CancellationPolicyType = strictestPackage.CancellationPolicyType,
                CancellationPolicyDescription = strictestPackage.CancellationPolicyDescription,
                ApprovalStatus = ServiceApprovalStatus.Pending,
                IsActive = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.Services.Add(service);

            foreach (var image in firstPackageImages.Select((value, index) => new { value, index }))
            {
                _context.ServiceImages.Add(new ServiceImage
                {
                    Id = Guid.NewGuid(),
                    ServiceId = service.Id,
                    ImageUrl = image.value.ImageUrl,
                    DisplayOrder = image.value.DisplayOrder != 0 ? image.value.DisplayOrder : image.index,
                    CreatedAt = DateTime.UtcNow
                });
            }

            for (var packageIndex = 0; packageIndex < packages.Count; packageIndex++)
            {
                var package = packages[packageIndex];
                var participantBounds = ResolveParticipantBounds(package);
                var tour = new Tour
                {
                    Id = Guid.NewGuid(),
                    ServiceId = service.Id,
                    Name = package.Name.Trim(),
                    Duration = package.Duration.Trim(),
                    MaxParticipants = participantBounds.MaxParticipants,
                    MinParticipants = participantBounds.MinParticipants,
                    BookingCutoffHours = package.BookingCutoffHours,

                    MeetingPoint = package.MeetingPoint?.Trim(),
                    IncludedItemsText = JoinBulletLines(package.Includes),
                    ExcludedItemsText = JoinBulletLines(package.Excludes),
                    CancellationPolicyType = package.CancellationPolicyType,
                    CancellationPolicyDescription = package.CancellationPolicyDescription,
                    DisplayOrder = packageIndex
                };
                _context.Tours.Add(tour);

                foreach (var image in package.Images
                    .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                    .OrderBy(image => image.DisplayOrder)
                    .Select((value, index) => new { value, index }))
                {
                    _context.TourImages.Add(new TourImage
                    {
                        Id = Guid.NewGuid(),
                        TourId = tour.Id,
                        ImageUrl = image.value.ImageUrl.Trim(),
                        DisplayOrder = image.value.DisplayOrder != 0 ? image.value.DisplayOrder : image.index,
                        IsCover = image.value.IsCover,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                var createdPricingTiers = package.PricingTiers
                    .OrderBy(tier => tier.DisplayOrder)
                    .Select((value, index) => new TourPricingTier
                    {
                        Id = Guid.NewGuid(),
                        TourId = tour.Id,
                        Name = value.Name.Trim(),
                        Description = string.IsNullOrWhiteSpace(value.Description) ? null : value.Description.Trim(),
                        UnitPrice = value.UnitPrice,
                        MinQuantity = NormalizeTierMinQuantity(value, participantBounds.MaxParticipants),
                        MaxQuantity = NormalizeTierMaxQuantity(value, participantBounds.MaxParticipants),
                        DisplayOrder = value.DisplayOrder != 0 ? value.DisplayOrder : index
                    })
                    .ToList();

                _context.TourPricingTiers.AddRange(createdPricingTiers);

                foreach (var session in package.Sessions.OrderBy(session => session.StartDate))
                {
                    var scheduleEntity = new TourSchedule
                    {
                        Id = Guid.NewGuid(),
                        TourId = tour.Id,
                        StartDate = session.StartDate,
                        EndDate = session.EndDate,
                        RunCount = NormalizeScheduleRunCount(session),
                        AvailableSlots = NormalizeScheduleAvailableSlots(participantBounds.MaxParticipants),
                        PriceOverride = ResolveLegacySchedulePriceOverride(session, package.PricingTiers),
                        Status = TourScheduleStatus.Active
                    };
                    scheduleEntity.PricingOverrides = BuildSchedulePricingOverrides(
                        scheduleEntity.Id,
                        session.PricingOverrides ?? new List<CreateTourSchedulePricingOverrideDto>(),
                        createdPricingTiers);
                    scheduleEntity.ScheduleRuns = BuildScheduleRuns(
                        scheduleEntity.Id,
                        session,
                        participantBounds.MaxParticipants);
                    _context.TourSchedules.Add(scheduleEntity);
                }

                foreach (var itinerary in package.Itinerary
                    .OrderBy(item => item.DayNumber)
                    .ThenBy(item => item.DisplayOrder)
                    .Select((value, index) => new { value, index }))
                {
                    _context.TourItineraries.Add(new TourItinerary
                    {
                        Id = Guid.NewGuid(),
                        TourId = tour.Id,
                        DayNumber = itinerary.value.DayNumber > 0 ? itinerary.value.DayNumber : itinerary.index + 1,
                        DisplayOrder = itinerary.value.DisplayOrder,
                        Title = itinerary.value.Title.Trim(),
                        Description = itinerary.value.Description?.Trim(),
                        StartTime = itinerary.value.StartTime,
                        EndTime = itinerary.value.EndTime,
                        Location = string.IsNullOrWhiteSpace(itinerary.value.Location) ? null : itinerary.value.Location.Trim(),
                        ActivityType = NormalizeActivityType(itinerary.value.ActivityType),
                        ImageUrl = string.IsNullOrWhiteSpace(itinerary.value.ImageUrl) ? null : itinerary.value.ImageUrl.Trim()
                    });
                }
            }

            await _context.SaveChangesAsync();
            return new { ServiceId = service.Id, Message = "Tạo tour thành công, đang chờ phê duyệt" };
        }

        public async Task<object> CreateHomestayAsync(Guid userId, CreateHomestayDto dto)
        {
            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            if (partner == null || partner.VerificationStatus != PartnerVerificationStatus.Approved)
                throw new BusinessException("Đối tác chưa được xác minh");

            if (!dto.Rooms.Any())
                throw new BusinessException("Please add at least one room type.");

            ValidateNightlyPrice(dto.BasePrice, "Homestay base price");
            if (dto.MinNights < 1 || dto.MinNights > 30)
                throw new BusinessException("Minimum nights must be between 1 and 30.");
            if (dto.MaxNights < dto.MinNights || dto.MaxNights > 30)
                throw new BusinessException("Maximum nights must be between minimum nights and 30.");

            var roomNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var r in dto.Rooms)
            {
                if (string.IsNullOrWhiteSpace(r.Name))
                    throw new BusinessException("Every room type needs a name.");
                if (!roomNames.Add(r.Name.Trim()))
                    throw new BusinessException($"Room name '{r.Name}' is duplicated. Please use unique room names.");
                if (r.Quantity < 1)
                    throw new BusinessException($"Room '{r.Name}' must have at least 1 available unit.");
                if (r.BedCount < 1)
                    throw new BusinessException($"Room '{r.Name}' must have at least 1 bed.");
                if (r.MaxGuests < 1)
                    throw new BusinessException($"Room '{r.Name}' must allow at least 1 guest.");

                var weekendPrice = r.WeekendPrice ?? r.BasePrice;
                var holidayPrice = r.HolidayPrice ?? weekendPrice;
                ValidateNightlyPrice(r.BasePrice, $"Base price for room '{r.Name}'");
                ValidateNightlyPrice(weekendPrice, $"Weekend price for room '{r.Name}'");
                ValidateNightlyPrice(holidayPrice, $"Holiday price for room '{r.Name}'");
                if (weekendPrice < r.BasePrice)
                    throw new BusinessException($"Weekend price for room '{r.Name}' cannot be lower than base price.");
                if (holidayPrice < weekendPrice)
                    throw new BusinessException($"Holiday price for room '{r.Name}' cannot be lower than weekend price.");
            }

            var availabilityWindows = BuildAvailabilityWindows(dto);
            if (!availabilityWindows.Any())
                throw new BusinessException("Please open at least one availability window.");

            var vietnamToday = GetVietnamToday();
            var maxOpenDate = vietnamToday.AddYears(1);
            ValidateAvailabilityWindows(availabilityWindows, dto.Rooms, vietnamToday, maxOpenDate);

            var availableFrom = availabilityWindows.Min(w => w.StartDate.Date);
            var availableTo = availabilityWindows.Max(w => w.EndDate.Date);

            // Parse destinationId - nếu không có thì lấy destination đầu tiên
            var destId = dto.DestinationId ?? (await _context.Destinations.Select(d => d.Id).FirstOrDefaultAsync());

            var service = new Service { Id = Guid.NewGuid(), PartnerId = partner.Id, DestinationId = destId, Name = dto.Name, Description = dto.Description, ServiceType = ServiceType.Homestay, Address = dto.Address, Latitude = dto.Latitude, Longitude = dto.Longitude, BasePrice = dto.BasePrice, DiscountPrice = dto.DiscountPrice, ThumbnailUrl = dto.ThumbnailUrl, CancellationPolicyType = dto.CancellationPolicyType, CancellationPolicyDescription = dto.CancellationPolicyDescription, ApprovalStatus = ServiceApprovalStatus.Pending, IsActive = false, CreatedAt = DateTime.UtcNow };
            _context.Services.Add(service);

            for (int i = 0; i < dto.ImageUrls.Count; i++)
                _context.ServiceImages.Add(new ServiceImage { Id = Guid.NewGuid(), ServiceId = service.Id, ImageUrl = dto.ImageUrls[i], DisplayOrder = i, CreatedAt = DateTime.UtcNow });

            // Parse TimeSpan từ string "HH:mm" hoặc "HH:mm:ss"
            TimeSpan.TryParse(dto.CheckInTime, out var checkIn);
            TimeSpan.TryParse(dto.CheckOutTime, out var checkOut);
            if (checkIn == default) checkIn = new TimeSpan(14, 0, 0);
            if (checkOut == default) checkOut = new TimeSpan(12, 0, 0);

            var homestay = new Homestay { Id = Guid.NewGuid(), ServiceId = service.Id, CheckInTime = checkIn, CheckOutTime = checkOut, MinNights = dto.MinNights, MaxNights = dto.MaxNights, AvailableFrom = availableFrom, AvailableTo = availableTo };
            _context.Homestays.Add(homestay);

            var roomsByKey = new Dictionary<string, Room>(StringComparer.OrdinalIgnoreCase);
            foreach (var r in dto.Rooms)
            {
                var roomImages = (r.Images ?? new List<CreateRoomImageDto>())
                    .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                    .OrderBy(image => image.DisplayOrder)
                    .ToList();

                var coverImage = roomImages.FirstOrDefault(image => image.IsCover)
                    ?? roomImages.FirstOrDefault();

                var room = new Room
                {
                    Id = Guid.NewGuid(),
                    HomestayId = homestay.Id,
                    Name = r.Name,
                    Description = r.Description,
                    BedType = r.BedType,
                    BedCount = Math.Max(r.BedCount, 1),
                    MaxGuests = r.MaxGuests,
                    Quantity = r.Quantity,
                    BasePrice = r.BasePrice,
                    WeekendPrice = r.WeekendPrice ?? r.BasePrice,
                    HolidayPrice = r.HolidayPrice ?? r.WeekendPrice ?? r.BasePrice,
                    ImageUrl = coverImage?.ImageUrl ?? r.ImageUrl,
                    IsActive = true
                };

                _context.Rooms.Add(room);
                roomsByKey[r.Name.Trim()] = room;

                foreach (var image in roomImages.Select((value, index) => new { value, index }))
                {
                    _context.RoomImages.Add(new RoomImage
                    {
                        Id = Guid.NewGuid(),
                        RoomId = room.Id,
                        ImageUrl = image.value.ImageUrl,
                        DisplayOrder = image.value.DisplayOrder != 0 ? image.value.DisplayOrder : image.index,
                        IsCover = coverImage != null && image.value.ImageUrl == coverImage.ImageUrl,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                foreach (var amenity in r.Amenities.Where(a => !string.IsNullOrWhiteSpace(a.Name)))
                {
                    _context.RoomAmenities.Add(new RoomAmenity
                    {
                        Id = Guid.NewGuid(),
                        RoomId = room.Id,
                        Name = amenity.Name.Trim(),
                        Icon = amenity.Icon
                    });
                }
            }

            foreach (var a in dto.Amenities)
                _context.HomestayAmenities.Add(new HomestayAmenity { Id = Guid.NewGuid(), HomestayId = homestay.Id, Name = a.Name, Icon = a.Icon });

            var holidayStart = DateOnly.FromDateTime(availableFrom);
            var holidayEnd = DateOnly.FromDateTime(availableTo);
            var holidayDates = (await _context.VietnamPublicHolidays
                .Where(h => h.IsActive && h.Date >= holidayStart && h.Date <= holidayEnd)
                .Select(h => h.Date)
                .ToListAsync())
                .ToHashSet();

            foreach (var window in availabilityWindows)
            {
                var roomEntity = roomsByKey[window.RoomKey.Trim()];
                var availableCount = window.AvailableCount ?? roomEntity.Quantity;

                for (var d = window.StartDate.Date; d <= window.EndDate.Date; d = d.AddDays(1))
                {
                    var dateOnly = DateOnly.FromDateTime(d);
                    _context.RoomAvailabilities.Add(new RoomAvailability
                    {
                        Id = Guid.NewGuid(),
                        RoomId = roomEntity.Id,
                        Date = dateOnly,
                        AvailableCount = availableCount,
                        PriceOverride = holidayDates.Contains(dateOnly) ? roomEntity.HolidayPrice : null,
                        IsBlocked = false
                    });
                }
            }

            await _context.SaveChangesAsync();
            return new { ServiceId = service.Id, Message = "Tạo homestay thành công, đang chờ phê duyệt" };
        }

        public async Task<object> UpdateServiceAsync(Guid userId, Guid serviceId, UpdateServiceDto dto)
        {
            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            if (partner == null) throw new BusinessException("Không tìm thấy đối tác");

            var service = await _context.Services
                .Include(s => s.ChangeRequests)
                .Include(s => s.Homestay).ThenInclude(h => h!.HomestayAmenities)
                .Include(s => s.Homestay).ThenInclude(h => h!.Rooms).ThenInclude(r => r.RoomImages)
                .Include(s => s.Homestay).ThenInclude(h => h!.Rooms).ThenInclude(r => r.RoomAmenities)
                .Include(s => s.Homestay).ThenInclude(h => h!.Rooms).ThenInclude(r => r.RoomAvailabilities)
                .Include(s => s.Tours).ThenInclude(t => t.TourImages)
                .Include(s => s.Tours).ThenInclude(t => t.TourPricingTiers)
                .Include(s => s.Tours).ThenInclude(t => t.TourSchedules).ThenInclude(ts => ts.PricingOverrides).ThenInclude(item => item.TourPricingTier)
                .Include(s => s.Tours).ThenInclude(t => t.TourItineraries)
                .FirstOrDefaultAsync(s => s.Id == serviceId && s.PartnerId == partner.Id);
            if (service == null) throw new BusinessException("Không tìm thấy dịch vụ");

            if (service.ApprovalStatus == ServiceApprovalStatus.Pending)
                throw new BusinessException("Dịch vụ đang chờ duyệt nên không thể chỉnh sửa.");

            if (service.ChangeRequests.Any(cr => cr.Status == ServiceApprovalStatus.Pending))
                throw new BusinessException("Dịch vụ đang có thay đổi chờ duyệt nên không thể chỉnh sửa thêm.");

            ValidateUpdateRequest(service, dto);

            if (service.ApprovalStatus == ServiceApprovalStatus.Approved)
            {
                if (RequiresReapproval(service, dto))
                {
                    var proposedJson = JsonSerializer.Serialize(dto);
                    _context.ServiceChangeRequests.Add(new ServiceChangeRequest
                    {
                        Id = Guid.NewGuid(),
                        ServiceId = service.Id,
                        ProposedJson = proposedJson,
                        Status = ServiceApprovalStatus.Pending,
                        CreatedAt = DateTime.UtcNow
                    });

                    await _context.SaveChangesAsync();
                    return new { Message = "Changes submitted for manager approval. The approved version remains bookable." };
                }

                await using var approvedTransaction = await _context.Database.BeginTransactionAsync();
                await ApplyApprovedDirectUpdateAsync(service, dto);
                await _context.SaveChangesAsync();
                await approvedTransaction.CommitAsync();
                return new { Message = "Service updated successfully. No reapproval required." };
            }

            await using var transaction = await _context.Database.BeginTransactionAsync();
            if (IsHomestayAvailabilityOnlyUpdate(service, dto))
            {
                await ApplyHomestayAvailabilityOnlyUpdateAsync(service, dto);
            }
            else if (IsHomestayOverviewOnlyUpdate(service, dto))
            {
                await ApplyHomestayOverviewOnlyUpdateAsync(service, dto);
            }
            else
            {
                await ApplyServiceUpdateForApprovalAsync(service, dto, replaceHomestayRooms: true);
            }
            service.ApprovalStatus = ServiceApprovalStatus.Pending;
            service.IsActive = false;
            service.RejectionReason = null;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return new { Message = "Cập nhật dịch vụ thành công, đang chờ phê duyệt lại" };
        }

        public async Task<object> DeleteServiceAsync(Guid userId, Guid serviceId)
        {
            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            if (partner == null) throw new BusinessException("Không tìm thấy đối tác");

            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == serviceId && s.PartnerId == partner.Id);
            if (service == null) throw new BusinessException("Không tìm thấy dịch vụ");

            _context.Services.Remove(service);
            await _context.SaveChangesAsync();
            return new { Message = "Xóa dịch vụ thành công" };
        }

        public async Task<object> DeactivateServiceAsync(Guid userId, Guid serviceId)
        {
            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            if (partner == null) throw new BusinessException("Không tìm thấy đối tác");

            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == serviceId && s.PartnerId == partner.Id);
            if (service == null) throw new BusinessException("Không tìm thấy dịch vụ");

            service.IsActive = false;
            service.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return new { Message = "Đã tắt dịch vụ" };
        }

        public async Task<object> GetPartnerServicesAsync(Guid userId, PartnerServiceFilterDto filter)
        {
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1) filter.PageSize = 10;
            if (filter.PageSize > 100) filter.PageSize = 100;

            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            if (partner == null) throw new BusinessException("Không tìm thấy đối tác");

            var query = _context.Services.Include(s => s.Partner).Include(s => s.Destination)
                .Where(s => s.PartnerId == partner.Id).AsQueryable();

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(s => s.Name.ToLower().Contains(kw));
            }
            if (filter.ServiceType.HasValue) query = query.Where(s => s.ServiceType == filter.ServiceType.Value);
            if (filter.ApprovalStatus.HasValue) query = query.Where(s => s.ApprovalStatus == filter.ApprovalStatus.Value);
            if (filter.IsActive.HasValue) query = query.Where(s => s.IsActive == filter.IsActive.Value);

            var totalCount = await query.CountAsync();
            var items = await query.OrderByDescending(s => s.CreatedAt)
                .Skip((filter.Page - 1) * filter.PageSize).Take(filter.PageSize)
                .Select(s => MapToListDto(s)).ToListAsync();

            return new { Items = items, TotalCount = totalCount, Page = filter.Page, PageSize = filter.PageSize, TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize) };
        }

        public async Task<object> GetPartnerServiceDetailAsync(Guid userId, Guid serviceId)
        {
            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            if (partner == null) throw new BusinessException("Không tìm thấy đối tác");

            var service = await _context.Services.FirstOrDefaultAsync(s => s.Id == serviceId && s.PartnerId == partner.Id);
            if (service == null) throw new BusinessException("Không tìm thấy dịch vụ");

            var detail = await GetServiceByIdAsync(serviceId);
            var pendingChange = await _context.ServiceChangeRequests
                .Where(cr => cr.ServiceId == serviceId && cr.Status == ServiceApprovalStatus.Pending)
                .OrderByDescending(cr => cr.CreatedAt)
                .FirstOrDefaultAsync();

            if (pendingChange == null) return detail;

            var proposedUpdate = JsonSerializer.Deserialize<UpdateServiceDto>(pendingChange.ProposedJson);
            if (proposedUpdate != null)
            {
                ApplyDetailPreview(detail, proposedUpdate);
                detail.HasPendingChanges = true;
                detail.PendingChangeId = pendingChange.Id;
            }

            return detail;
        }

        public async Task<ServiceDetailDto> GetApprovalDetailAsync(Guid approvalTargetId)
        {
            var pendingChange = await _context.ServiceChangeRequests
                .Where(cr => cr.Id == approvalTargetId && cr.Status == ServiceApprovalStatus.Pending)
                .Select(cr => new { cr.Id, cr.ServiceId, cr.ProposedJson })
                .FirstOrDefaultAsync();

            if (pendingChange != null)
            {
                var detail = await GetServiceByIdAsync(pendingChange.ServiceId);
                var proposedUpdate = JsonSerializer.Deserialize<UpdateServiceDto>(pendingChange.ProposedJson);
                if (proposedUpdate != null)
                {
                    ApplyDetailPreview(detail, proposedUpdate);
                    detail.HasPendingChanges = true;
                    detail.PendingChangeId = pendingChange.Id;
                }

                return detail;
            }

            return await GetServiceByIdAsync(approvalTargetId);
        }

        public async Task<object> GetPendingServicesAsync(ServiceApprovalFilterDto filter)
        {
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1) filter.PageSize = 10;
            if (filter.PageSize > 100) filter.PageSize = 100;

            var query = _context.Services.Include(s => s.Partner).Include(s => s.Destination).AsQueryable();

            if (filter.Status.HasValue) query = query.Where(s => s.ApprovalStatus == filter.Status.Value);

            if (filter.ServiceType.HasValue) query = query.Where(s => s.ServiceType == filter.ServiceType.Value);
            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(s => s.Name.ToLower().Contains(kw));
            }

            var serviceItems = await query.OrderByDescending(s => s.CreatedAt)
                .Skip((filter.Page - 1) * filter.PageSize).Take(filter.PageSize)
                .Select(s => new { s.Id, ServiceId = s.Id, ApprovalTargetId = s.Id, ApprovalKind = "Service", s.Name, s.Description, s.ServiceType, s.BasePrice, s.ThumbnailUrl, PartnerName = s.Partner.BusinessName, DestinationName = s.Destination.Name, s.Address, s.ApprovalStatus, s.RejectionReason, s.CreatedAt })
                .ToListAsync();

            var changeItems = await _context.ServiceChangeRequests
                .Include(cr => cr.Service).ThenInclude(s => s.Partner)
                .Include(cr => cr.Service).ThenInclude(s => s.Destination)
                .Where(cr => cr.Status == ServiceApprovalStatus.Pending)
                .Select(cr => new { Id = cr.Id, ServiceId = cr.ServiceId, ApprovalTargetId = cr.Id, ApprovalKind = "ChangeRequest", cr.Service.Name, cr.Service.Description, cr.Service.ServiceType, cr.Service.BasePrice, cr.Service.ThumbnailUrl, PartnerName = cr.Service.Partner.BusinessName, DestinationName = cr.Service.Destination.Name, cr.Service.Address, ApprovalStatus = cr.Status, cr.RejectionReason, cr.CreatedAt })
                .ToListAsync();

            var items = serviceItems.Cast<object>().Concat(changeItems.Cast<object>()).ToList();
            var totalCount = items.Count;

            return new { Items = items, TotalCount = totalCount, Page = filter.Page, PageSize = filter.PageSize, TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize) };
        }

        public async Task<object> ApproveServiceAsync(Guid serviceId, ServiceApprovalActionDto dto, Guid adminId)
        {
            var changeRequest = await _context.ServiceChangeRequests
                .Include(cr => cr.Service).ThenInclude(s => s.Homestay).ThenInclude(h => h!.HomestayAmenities)
                .Include(cr => cr.Service).ThenInclude(s => s.Homestay).ThenInclude(h => h!.Rooms).ThenInclude(r => r.RoomImages)
                .Include(cr => cr.Service).ThenInclude(s => s.Homestay).ThenInclude(h => h!.Rooms).ThenInclude(r => r.RoomAmenities)
                .Include(cr => cr.Service).ThenInclude(s => s.Homestay).ThenInclude(h => h!.Rooms).ThenInclude(r => r.RoomAvailabilities)
                .Include(cr => cr.Service).ThenInclude(s => s.Tours).ThenInclude(t => t.TourImages)
                .Include(cr => cr.Service).ThenInclude(s => s.Tours).ThenInclude(t => t.TourPricingTiers)
                .Include(cr => cr.Service).ThenInclude(s => s.Tours).ThenInclude(t => t.TourSchedules).ThenInclude(ts => ts.PricingOverrides).ThenInclude(item => item.TourPricingTier)
                .Include(cr => cr.Service).ThenInclude(s => s.Tours).ThenInclude(t => t.TourItineraries)
                .FirstOrDefaultAsync(cr => cr.Id == serviceId && cr.Status == ServiceApprovalStatus.Pending);
            if (changeRequest != null)
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();
                var proposedUpdate = JsonSerializer.Deserialize<UpdateServiceDto>(changeRequest.ProposedJson);
                if (proposedUpdate != null)
                {
                    ValidateUpdateRequest(changeRequest.Service, proposedUpdate);
                    await ApplyServiceUpdateForApprovalAsync(changeRequest.Service, proposedUpdate);
                }
                changeRequest.Status = ServiceApprovalStatus.Approved;
                changeRequest.ReviewedAt = DateTime.UtcNow;
                changeRequest.ReviewedBy = adminId;
                changeRequest.Service.ApprovalStatus = ServiceApprovalStatus.Approved;
                changeRequest.Service.IsActive = true;
                changeRequest.Service.RejectionReason = null;
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                return new { Message = $"Đã phê duyệt thay đổi dịch vụ {changeRequest.Service.Name}" };
            }

            var service = await _context.Services.Include(s => s.Partner).FirstOrDefaultAsync(s => s.Id == serviceId);
            if (service == null) throw new BusinessException("Không tìm thấy dịch vụ");

            service.ApprovalStatus = ServiceApprovalStatus.Approved;
            service.IsActive = true;
            service.RejectionReason = null;
            service.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new { Message = $"Đã phê duyệt dịch vụ {service.Name}" };
        }

        public async Task<object> RejectServiceAsync(Guid serviceId, ServiceApprovalActionDto dto, Guid adminId)
        {
            var reason = dto.Reason ?? dto.Note;
            var changeRequest = await _context.ServiceChangeRequests
                .Include(cr => cr.Service)
                .FirstOrDefaultAsync(cr => cr.Id == serviceId && cr.Status == ServiceApprovalStatus.Pending);
            if (changeRequest != null)
            {
                changeRequest.Status = ServiceApprovalStatus.Rejected;
                changeRequest.RejectionReason = reason;
                changeRequest.ReviewedAt = DateTime.UtcNow;
                changeRequest.ReviewedBy = adminId;
                await _context.SaveChangesAsync();
                return new { Message = $"Đã từ chối thay đổi dịch vụ {changeRequest.Service.Name}" };
            }

            var service = await _context.Services.Include(s => s.Partner).FirstOrDefaultAsync(s => s.Id == serviceId);
            if (service == null) throw new BusinessException("Không tìm thấy dịch vụ");

            service.ApprovalStatus = ServiceApprovalStatus.Rejected;
            service.IsActive = false;
            service.RejectionReason = reason;
            service.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new { Message = $"Đã từ chối dịch vụ {service.Name}" };
        }

        private static void ValidateNightlyPrice(decimal price, string label)
        {
            if (price < MinRoomNightlyPrice || price > MaxRoomNightlyPrice)
                throw new BusinessException($"{label} must be between {MinRoomNightlyPrice:N0} and {MaxRoomNightlyPrice:N0} VND.");
        }

        private static TourPricingTierType ResolveTierType(CreateTourPricingTierDto tier)
        {
            var normalizedName = tier.Name.Trim().ToLowerInvariant();
            return normalizedName switch
            {
                "người lớn" or "nguoi lon" or "adult" => TourPricingTierType.Adult,
                "trẻ em" or "tre em" or "child" => TourPricingTierType.Child,
                "em bé" or "infant" => TourPricingTierType.Infant,
                "người cao tuổi" or "senior" => TourPricingTierType.Senior,
                _ => TourPricingTierType.Standard
            };
        }

        private static TourPricingTierType ResolveTierType(TourPricingTier tier)
        {
            var normalizedName = tier.Name.Trim().ToLowerInvariant();
            return normalizedName switch
            {
                "người lớn" or "nguoi lon" or "adult" => TourPricingTierType.Adult,
                "trẻ em" or "tre em" or "child" => TourPricingTierType.Child,
                "em bé" or "infant" => TourPricingTierType.Infant,
                "người cao tuổi" or "senior" => TourPricingTierType.Senior,
                _ => TourPricingTierType.Standard
            };
        }

        private static (int MinGuests, int MaxGuests) GetGroupBounds(CreateTourPricingTierDto tier)
        {
            return (tier.MinQuantity, tier.MaxQuantity);
        }

        private static (int MinGuests, int MaxGuests) GetGroupBounds(TourPricingTier tier)
        {
            return (tier.MinQuantity, tier.MaxQuantity);
        }

        private static (int MinParticipants, int MaxParticipants) ResolveParticipantBounds(CreateTourPackageDto package)
        {
            return (
                Math.Max(package.MinParticipants, 1),
                Math.Max(package.MaxParticipants, Math.Max(package.MinParticipants, 1))
            );
        }

        private static int NormalizeTierMinQuantity(CreateTourPricingTierDto tier, int packageMaxParticipants)
        {
            return Math.Max(0, tier.MinQuantity);
        }

        private static int NormalizeTierMaxQuantity(CreateTourPricingTierDto tier, int packageMaxParticipants)
        {
            return tier.MaxQuantity > 1
                ? Math.Min(tier.MaxQuantity, packageMaxParticipants)
                : packageMaxParticipants;
        }

        private static int NormalizeScheduleRunCount(CreateTourScheduleDto session)
        {
            return Math.Max(session.RunCount, 1);
        }

        private static int NormalizeScheduleAvailableSlots(int packageMaxParticipants)
        {
            return Math.Max(packageMaxParticipants, 1);
        }

        private static int GetScheduleTotalCapacity(TourSchedule schedule)
        {
            return Math.Max(schedule.RunCount, 1) * Math.Max(schedule.AvailableSlots, 0);
        }

        private static List<TourScheduleRun> BuildScheduleRuns(
            Guid scheduleId,
            CreateTourScheduleDto session,
            int maxParticipants)
        {
            var runCount = NormalizeScheduleRunCount(session);
            var normalizedCapacity = NormalizeScheduleAvailableSlots(maxParticipants);
            var runs = new List<TourScheduleRun>(runCount);

            for (var runIndex = 1; runIndex <= runCount; runIndex++)
            {
                runs.Add(new TourScheduleRun
                {
                    Id = Guid.NewGuid(),
                    TourScheduleId = scheduleId,
                    RunIndex = runIndex,
                    StartDate = session.StartDate,
                    EndDate = session.EndDate,
                    MaxParticipants = normalizedCapacity,
                    BookedSlots = 0,
                    Status = TourScheduleStatus.Active
                });
            }

            return runs;
        }

        private static decimal? ResolveLegacySchedulePriceOverride(
            CreateTourScheduleDto session,
            IReadOnlyCollection<CreateTourPricingTierDto> packageTiers)
        {
            if (session.PriceOverride.HasValue && session.PriceOverride.Value > 0)
                return session.PriceOverride.Value;

            var customPrices = (session.PricingOverrides ?? new List<CreateTourSchedulePricingOverrideDto>())
                .Where(item => item.CustomPrice.HasValue && item.CustomPrice.Value > 0)
                .Select(item => item.CustomPrice!.Value)
                .OrderBy(price => price)
                .ToList();

            if (customPrices.Count == 0)
                return null;

            return customPrices[0];
        }

        private static decimal GetResolvedScheduleTierPrice(TourSchedule schedule, TourPricingTier pricingTier)
        {
            var customPrice = schedule.PricingOverrides
                .FirstOrDefault(item => item.TourPricingTierId == pricingTier.Id)
                ?.CustomPrice;

            return customPrice.HasValue && customPrice.Value > 0
                ? customPrice.Value
                : pricingTier.UnitPrice;
        }

        private static decimal? GetLowestResolvedScheduleTierPrice(TourSchedule schedule)
        {
            var tierPrices = schedule.Tour?.TourPricingTiers?
                .Select(tier => GetResolvedScheduleTierPrice(schedule, tier))
                .Where(price => price > 0)
                .OrderBy(price => price)
                .ToList();

            if (tierPrices == null || tierPrices.Count == 0)
                return null;

            return tierPrices[0];
        }

        private static List<TourSchedulePricingOverrideDto> MapSchedulePricingOverrides(TourSchedule schedule)
        {
            return schedule.PricingOverrides
                .OrderBy(item => item.TourPricingTier.DisplayOrder)
                .Select(item => new TourSchedulePricingOverrideDto
                {
                    TourPricingTierId = item.TourPricingTierId,
                    TierDisplayOrder = item.TourPricingTier.DisplayOrder,
                    TierName = item.TourPricingTier.Name,
                    CustomPrice = item.CustomPrice
                })
                .ToList();
        }

        private static List<TourSchedulePricingOverride> BuildSchedulePricingOverrides(
            Guid scheduleId,
            IReadOnlyCollection<CreateTourSchedulePricingOverrideDto> overrides,
            IReadOnlyCollection<TourPricingTier> pricingTiers)
        {
            var tiersByDisplayOrder = pricingTiers.ToDictionary(tier => tier.DisplayOrder, tier => tier);
            var results = new List<TourSchedulePricingOverride>();

            foreach (var item in overrides
                .Where(item => item.CustomPrice.HasValue && item.CustomPrice.Value > 0)
                .OrderBy(item => item.TierDisplayOrder))
            {
                if (!tiersByDisplayOrder.TryGetValue(item.TierDisplayOrder, out var matchingTier))
                    throw new BusinessException($"Session pricing override references unknown tier display order {item.TierDisplayOrder}.");

                results.Add(new TourSchedulePricingOverride
                {
                    Id = Guid.NewGuid(),
                    TourScheduleId = scheduleId,
                    TourPricingTierId = matchingTier.Id,
                    CustomPrice = item.CustomPrice!.Value
                });
            }

            return results;
        }

        private static TourDetailDto MapTourDetailDto(Tour tour, Service service)
        {
            return new TourDetailDto
            {
                Id = tour.Id,
                Name = string.IsNullOrWhiteSpace(tour.Name) ? service.Name : tour.Name,
                Duration = tour.Duration,
                MaxParticipants = tour.MaxParticipants,
                MinParticipants = tour.MinParticipants,
                BookingCutoffHours = tour.BookingCutoffHours,
                MeetingPoint = tour.MeetingPoint,
                CancellationPolicyType = tour.CancellationPolicyType,
                CancellationPolicyDescription = tour.CancellationPolicyDescription ?? service.CancellationPolicyDescription,
                DisplayOrder = tour.DisplayOrder,
                IncludedItems = SplitBulletLines(tour.IncludedItemsText),
                ExcludedItems = SplitBulletLines(tour.ExcludedItemsText),
                Images = tour.TourImages
                    .OrderBy(image => image.DisplayOrder)
                    .Select(image => new TourImageDto
                    {
                        Id = image.Id,
                        ImageUrl = image.ImageUrl,
                        DisplayOrder = image.DisplayOrder,
                        IsCover = image.IsCover
                    })
                    .ToList(),
                PricingTiers = tour.TourPricingTiers
                    .OrderBy(tier => tier.DisplayOrder)
                    .Select(tier => new TourPricingTierDto
                    {
                        Id = tier.Id,
                        Name = tier.Name,
                        Description = tier.Description,
                        UnitPrice = tier.UnitPrice,
                        MinQuantity = tier.MinQuantity,
                        MaxQuantity = tier.MaxQuantity,
                        DisplayOrder = tier.DisplayOrder
                    })
                    .ToList(),
                Schedules = tour.TourSchedules
                    .Where(schedule => schedule.StartDate >= DateTime.UtcNow)
                    .OrderBy(schedule => schedule.StartDate)
                    .Select(schedule => new TourScheduleDto
                    {
                        Id = schedule.Id,
                        StartDate = schedule.StartDate,
                        EndDate = schedule.EndDate,
                        RunCount = Math.Max(schedule.RunCount, 1),
                        AvailableSlots = schedule.AvailableSlots,
                        BookedSlots = schedule.BookedSlots,
                        PriceOverride = schedule.PriceOverride ?? GetLowestResolvedScheduleTierPrice(schedule),
                        PricingOverrides = MapSchedulePricingOverrides(schedule),
                        Status = schedule.Status
                    })
                    .ToList(),
                Itineraries = tour.TourItineraries
                    .OrderBy(item => item.DayNumber)
                    .ThenBy(item => item.DisplayOrder)
                    .Select(item => new TourItineraryDto
                    {
                        Id = item.Id,
                        DayNumber = item.DayNumber,
                        DisplayOrder = item.DisplayOrder,
                        Title = item.Title,
                        Description = item.Description,
                        StartTime = item.StartTime,
                        EndTime = item.EndTime,
                        Location = item.Location,
                        ActivityType = item.ActivityType,
                        ImageUrl = item.ImageUrl
                    })
                    .ToList()
            };
        }

        private static List<CreateTourPackageDto> BuildTourPackages(CreateTourDto dto)
        {
            if (dto.Packages.Any())
                return dto.Packages;

            var legacyImageUrls = dto.ImageUrls
                .Where(url => !string.IsNullOrWhiteSpace(url))
                .Select(url => url.Trim())
                .ToList();
            if (!string.IsNullOrWhiteSpace(dto.ThumbnailUrl) &&
                !legacyImageUrls.Contains(dto.ThumbnailUrl.Trim(), StringComparer.OrdinalIgnoreCase))
            {
                legacyImageUrls.Insert(0, dto.ThumbnailUrl.Trim());
            }

            return new List<CreateTourPackageDto>
            {
                new()
                {
                    Name = string.IsNullOrWhiteSpace(dto.Name) ? "Standard package" : dto.Name.Trim(),
                    Duration = string.IsNullOrWhiteSpace(dto.Duration) ? "1 day" : dto.Duration.Trim(),
                    MaxParticipants = Math.Max(dto.MaxParticipants, 1),
                    MinParticipants = Math.Max(dto.MinParticipants, 1),
                    BookingCutoffHours = dto.BookingCutoffHours,
                    CancellationPolicyType = dto.CancellationPolicyType,
                    CancellationPolicyDescription = dto.CancellationPolicyDescription,
                    Images = legacyImageUrls.Select((url, index) => new CreateTourImageDto
                    {
                        ImageUrl = url,
                        DisplayOrder = index,
                        IsCover = index == 0
                    }).ToList(),
                    PricingTiers = dto.BasePrice > 0
                        ? new List<CreateTourPricingTierDto>
                        {
                            new()
                            {
                                Name = "Standard",
                                Description = null,
                                UnitPrice = dto.BasePrice,
                                MinQuantity = 1,
                                MaxQuantity = Math.Max(dto.MaxParticipants, 1),
                                DisplayOrder = 0
                            }
                        }
                        : new List<CreateTourPricingTierDto>(),
                    Sessions = dto.Schedules,
                    Itinerary = dto.Itineraries
                }
            };
        }

        private static void ValidateTourPackages(List<CreateTourPackageDto> packages)
        {
            if (!packages.Any())
                throw new BusinessException("Please add at least one tour package.");

            var vietnamToday = GetVietnamToday();
            var packageNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var package in packages)
            {
                if (string.IsNullOrWhiteSpace(package.Name))
                    throw new BusinessException("Every tour package needs a name.");
                if (!packageNames.Add(package.Name.Trim()))
                    throw new BusinessException($"Tour package name '{package.Name}' is duplicated.");
                if (string.IsNullOrWhiteSpace(package.Duration))
                    throw new BusinessException($"Package '{package.Name}' needs a duration.");
                if (!package.PricingTiers.Any())
                    throw new BusinessException($"Package '{package.Name}' needs at least one pricing tier.");
                if (!package.Sessions.Any())
                    throw new BusinessException($"Package '{package.Name}' needs at least one departure session.");
                if (!package.Itinerary.Any())
                    throw new BusinessException($"Package '{package.Name}' needs at least one itinerary step.");

                var participantBounds = ResolveParticipantBounds(package);
                if (participantBounds.MinParticipants < 1)
                    throw new BusinessException($"Package '{package.Name}' must allow at least 1 participant.");
                if (participantBounds.MaxParticipants < participantBounds.MinParticipants)
                    throw new BusinessException($"Package '{package.Name}' must have max participants greater than or equal to min participants.");

                var pricingTierNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var tier in package.PricingTiers)
                {
                    if (string.IsNullOrWhiteSpace(tier.Name))
                        throw new BusinessException($"Every pricing tier in package '{package.Name}' needs a name.");
                    if (!pricingTierNames.Add(tier.Name.Trim()))
                        throw new BusinessException($"Pricing tier name '{tier.Name}' is duplicated in package '{package.Name}'.");
                    if (tier.UnitPrice <= 0)
                        throw new BusinessException($"Pricing tier '{tier.Name}' in package '{package.Name}' needs a valid price.");
                    if (tier.MinQuantity < 0)
                        throw new BusinessException($"Pricing tier '{tier.Name}' in package '{package.Name}' needs a valid minimum quantity.");
                    if (tier.MaxQuantity < Math.Max(0, tier.MinQuantity))
                        throw new BusinessException($"Pricing tier '{tier.Name}' in package '{package.Name}' needs max quantity greater than or equal to min quantity.");
                }

                foreach (var session in package.Sessions)
                {
                    if (session.StartDate == default || session.EndDate == default)
                        throw new BusinessException($"Every session in package '{package.Name}' needs a start and end time.");
                    if (session.EndDate < session.StartDate)
                        throw new BusinessException($"A session in package '{package.Name}' cannot end before it starts.");
                    if (session.StartDate.Date < vietnamToday)
                        throw new BusinessException($"A session in package '{package.Name}' cannot start in the past.");
                    if (NormalizeScheduleRunCount(session) < 1)
                        throw new BusinessException($"Every session in package '{package.Name}' must run at least once.");
                    if (session.PriceOverride.HasValue && session.PriceOverride.Value <= 0)
                        throw new BusinessException($"A special departure price in package '{package.Name}' must be greater than 0.");

                    var seenTierDisplayOrders = new HashSet<int>();
                    foreach (var pricingOverride in session.PricingOverrides ?? new List<CreateTourSchedulePricingOverrideDto>())
                    {
                        if (!seenTierDisplayOrders.Add(pricingOverride.TierDisplayOrder))
                            throw new BusinessException($"Session pricing overrides in package '{package.Name}' cannot repeat the same pricing tier.");
                        if (package.PricingTiers.All(tier => tier.DisplayOrder != pricingOverride.TierDisplayOrder))
                            throw new BusinessException($"Session pricing override in package '{package.Name}' references a pricing tier that does not exist.");
                        if (pricingOverride.CustomPrice.HasValue && pricingOverride.CustomPrice.Value <= 0)
                            throw new BusinessException($"Session custom tier prices in package '{package.Name}' must be greater than 0.");
                    }
                }

                foreach (var step in package.Itinerary)
                {
                    if (string.IsNullOrWhiteSpace(step.Title))
                        throw new BusinessException($"Every itinerary step in package '{package.Name}' needs a title.");
                    if (string.IsNullOrWhiteSpace(step.Description))
                        throw new BusinessException($"Every itinerary step in package '{package.Name}' needs a description.");
                    _ = NormalizeActivityType(step.ActivityType);
                }
            }
        }

        private static List<string> SplitBulletLines(string? rawText)
        {
            return (rawText ?? string.Empty)
                .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(line => line.Trim())
                .Where(line => !string.IsNullOrWhiteSpace(line))
                .Select(line => line.TrimStart('-', '*', '•', ' ').Trim())
                .Where(line => !string.IsNullOrWhiteSpace(line))
                .ToList();
        }

        private static string? JoinBulletLines(IEnumerable<string> values)
        {
            var items = values
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            return items.Count == 0
                ? null
                : string.Join("\n", items.Select(item => $"- {item}"));
        }

        private static string? NormalizeActivityType(string? activityType)
        {
            if (string.IsNullOrWhiteSpace(activityType))
                return null;

            var normalized = activityType.Trim().ToLowerInvariant().Replace("-", "_").Replace(" ", "_");
            if (!AllowedTourActivityTypes.Contains(normalized))
                throw new BusinessException($"Activity type '{activityType}' is not supported.");

            return normalized;
        }

        private async Task ApplyServiceUpdateForApprovalAsync(Service service, UpdateServiceDto dto, bool replaceHomestayRooms = false)
        {
            ApplyServiceScalarUpdate(service, dto);

            if (service.Homestay != null)
            {
                if (!string.IsNullOrWhiteSpace(dto.CheckInTime) && TimeSpan.TryParse(dto.CheckInTime, out var checkIn))
                    service.Homestay.CheckInTime = checkIn;
                if (!string.IsNullOrWhiteSpace(dto.CheckOutTime) && TimeSpan.TryParse(dto.CheckOutTime, out var checkOut))
                    service.Homestay.CheckOutTime = checkOut;
                if (dto.MinNights.HasValue) service.Homestay.MinNights = Math.Clamp(dto.MinNights.Value, 1, 30);
                if (dto.MaxNights.HasValue) service.Homestay.MaxNights = Math.Clamp(dto.MaxNights.Value, service.Homestay.MinNights, 30);

                if (dto.Amenities != null)
                {
                    var existingAmenities = service.Homestay.HomestayAmenities.ToList();
                    await _context.HomestayAmenities
                        .Where(amenity => amenity.HomestayId == service.Homestay.Id)
                        .ExecuteDeleteAsync();
                    DetachEntities(existingAmenities);
                    service.Homestay.HomestayAmenities = new List<HomestayAmenity>();

                    foreach (var amenity in dto.Amenities.Where(a => !string.IsNullOrWhiteSpace(a.Name)))
                    {
                        service.Homestay.HomestayAmenities.Add(new HomestayAmenity
                        {
                            Id = Guid.NewGuid(),
                            HomestayId = service.Homestay.Id,
                            Name = amenity.Name.Trim(),
                            Icon = amenity.Icon
                        });
                    }
                }

                if (replaceHomestayRooms && dto.Rooms.Count > 0)
                {
                    await ReplaceHomestayRoomsAsync(service, dto);
                }
                else
                {
                    foreach (var roomDto in dto.Rooms)
                    {
                        var room = roomDto.Id.HasValue
                            ? service.Homestay.Rooms.FirstOrDefault(r => r.Id == roomDto.Id.Value)
                            : null;

                        if (room == null)
                        {
                            room = new Room
                            {
                                Id = roomDto.Id ?? Guid.NewGuid(),
                                HomestayId = service.Homestay.Id,
                                IsActive = true
                            };
                            service.Homestay.Rooms.Add(room);
                        }

                        room.Name = roomDto.Name;
                        room.Description = roomDto.Description;
                        room.BedType = roomDto.BedType;
                        room.BedCount = Math.Max(roomDto.BedCount, 1);
                        room.MaxGuests = roomDto.MaxGuests;
                        room.Quantity = roomDto.Quantity;
                        room.BasePrice = roomDto.BasePrice;
                        room.WeekendPrice = roomDto.WeekendPrice ?? roomDto.BasePrice;
                        room.HolidayPrice = roomDto.HolidayPrice ?? roomDto.WeekendPrice ?? roomDto.BasePrice;
                        if (roomDto.ImageUrl != null) room.ImageUrl = roomDto.ImageUrl;

                        if (roomDto.Images != null)
                        {
                            var existingImages = room.RoomImages.ToList();
                            await _context.RoomImages
                                .Where(image => image.RoomId == room.Id)
                                .ExecuteDeleteAsync();
                            DetachEntities(existingImages);
                            room.RoomImages = new List<RoomImage>();

                            var roomImages = roomDto.Images
                                .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                                .OrderBy(image => image.DisplayOrder)
                                .ToList();
                            var coverImage = roomImages.FirstOrDefault(image => image.IsCover)
                                ?? roomImages.FirstOrDefault();
                            if (coverImage != null) room.ImageUrl = coverImage.ImageUrl;

                            foreach (var image in roomImages.Select((value, index) => new { value, index }))
                            {
                                room.RoomImages.Add(new RoomImage
                                {
                                    Id = Guid.NewGuid(),
                                    RoomId = room.Id,
                                    ImageUrl = image.value.ImageUrl,
                                    DisplayOrder = image.value.DisplayOrder != 0 ? image.value.DisplayOrder : image.index,
                                    IsCover = coverImage != null && image.value.ImageUrl == coverImage.ImageUrl,
                                    CreatedAt = DateTime.UtcNow
                                });
                            }
                        }

                        if (roomDto.Amenities != null)
                        {
                            var existingRoomAmenities = room.RoomAmenities.ToList();
                            await _context.RoomAmenities
                                .Where(amenity => amenity.RoomId == room.Id)
                                .ExecuteDeleteAsync();
                            DetachEntities(existingRoomAmenities);
                            room.RoomAmenities = new List<RoomAmenity>();

                            foreach (var amenity in roomDto.Amenities.Where(a => !string.IsNullOrWhiteSpace(a.Name)))
                            {
                                room.RoomAmenities.Add(new RoomAmenity
                                {
                                    Id = Guid.NewGuid(),
                                    RoomId = room.Id,
                                    Name = amenity.Name.Trim(),
                                    Icon = amenity.Icon
                                });
                            }
                        }
                    }
                }

                if (dto.AvailabilityWindows != null)
                {
                    var trackedAvailabilities = service.Homestay.Rooms
                        .SelectMany(room => room.RoomAvailabilities)
                        .ToList();
                    var roomIds = service.Homestay.Rooms.Select(room => room.Id).ToList();
                    if (roomIds.Count > 0)
                    {
                        await _context.RoomAvailabilities
                            .Where(availability => roomIds.Contains(availability.RoomId))
                            .ExecuteDeleteAsync();
                    }
                    DetachEntities(trackedAvailabilities);
                    foreach (var room in service.Homestay.Rooms)
                    {
                        room.RoomAvailabilities = new List<RoomAvailability>();
                    }

                    foreach (var window in dto.AvailabilityWindows.Where(w => w.RoomId != Guid.Empty))
                    {
                        var room = service.Homestay.Rooms.FirstOrDefault(r => r.Id == window.RoomId);
                        if (room == null) continue;

                        var availableCount = Math.Clamp(window.AvailableCount, 0, room.Quantity);
                        for (var date = window.StartDate.Date; date <= window.EndDate.Date; date = date.AddDays(1))
                        {
                            room.RoomAvailabilities.Add(new RoomAvailability
                            {
                                Id = Guid.NewGuid(),
                                RoomId = room.Id,
                                Date = DateOnly.FromDateTime(date),
                                AvailableCount = availableCount,
                                IsBlocked = window.IsBlocked || availableCount <= 0
                            });
                        }
                    }
                }
                else if (dto.Rooms.Count > 0)
                {
                    foreach (var room in service.Homestay.Rooms)
                    {
                        ClampRoomAvailability(room);
                    }
                }

                var roomBasePrices = service.Homestay.Rooms
                    .Where(room => room.IsActive)
                    .Select(room => room.BasePrice)
                    .ToList();
                if (roomBasePrices.Count > 0)
                    service.BasePrice = roomBasePrices.Min();

                var allDates = service.Homestay.Rooms
                    .SelectMany(room => room.RoomAvailabilities)
                    .Select(availability => availability.Date);
                service.Homestay.AvailableFrom = allDates.Any()
                    ? allDates.Min().ToDateTime(TimeOnly.MinValue)
                    : null;
                service.Homestay.AvailableTo = allDates.Any()
                    ? allDates.Max().ToDateTime(TimeOnly.MinValue)
                    : null;
            }

            if (service.ServiceType == ServiceType.Tour && dto.TourPackages != null)
            {
                await ReplaceTourPackagesAsync(service, dto.TourPackages);
            }

            service.UpdatedAt = DateTime.UtcNow;
        }

        private static void ApplyServiceUpdate(Service service, UpdateServiceDto dto)
        {
            ApplyServiceScalarUpdate(service, dto);

            if (service.Homestay != null)
            {
                if (!string.IsNullOrWhiteSpace(dto.CheckInTime) && TimeSpan.TryParse(dto.CheckInTime, out var checkIn))
                    service.Homestay.CheckInTime = checkIn;
                if (!string.IsNullOrWhiteSpace(dto.CheckOutTime) && TimeSpan.TryParse(dto.CheckOutTime, out var checkOut))
                    service.Homestay.CheckOutTime = checkOut;
                if (dto.MinNights.HasValue) service.Homestay.MinNights = Math.Clamp(dto.MinNights.Value, 1, 30);
                if (dto.MaxNights.HasValue) service.Homestay.MaxNights = Math.Clamp(dto.MaxNights.Value, service.Homestay.MinNights, 30);

                if (dto.Amenities != null)
                {
                    service.Homestay.HomestayAmenities.Clear();
                    foreach (var amenity in dto.Amenities.Where(a => !string.IsNullOrWhiteSpace(a.Name)))
                    {
                        service.Homestay.HomestayAmenities.Add(new HomestayAmenity
                        {
                            Id = Guid.NewGuid(),
                            HomestayId = service.Homestay.Id,
                            Name = amenity.Name.Trim(),
                            Icon = amenity.Icon
                        });
                    }
                }

                foreach (var roomDto in dto.Rooms)
                {
                    var room = roomDto.Id.HasValue
                        ? service.Homestay.Rooms.FirstOrDefault(r => r.Id == roomDto.Id.Value)
                        : null;

                    if (room == null)
                    {
                        room = new Room { Id = roomDto.Id ?? Guid.NewGuid(), HomestayId = service.Homestay.Id, IsActive = true };
                        service.Homestay.Rooms.Add(room);
                    }

                    room.Name = roomDto.Name;
                    room.Description = roomDto.Description;
                    room.BedType = roomDto.BedType;
                    room.BedCount = Math.Max(roomDto.BedCount, 1);
                    room.MaxGuests = roomDto.MaxGuests;
                    room.Quantity = roomDto.Quantity;
                    room.BasePrice = roomDto.BasePrice;
                    room.WeekendPrice = roomDto.WeekendPrice ?? roomDto.BasePrice;
                    room.HolidayPrice = roomDto.HolidayPrice ?? roomDto.WeekendPrice ?? roomDto.BasePrice;
                    if (roomDto.ImageUrl != null) room.ImageUrl = roomDto.ImageUrl;

                    if (roomDto.Images != null)
                    {
                        room.RoomImages.Clear();
                        var roomImages = roomDto.Images
                            .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                            .OrderBy(image => image.DisplayOrder)
                            .ToList();
                        var coverImage = roomImages.FirstOrDefault(image => image.IsCover)
                            ?? roomImages.FirstOrDefault();
                        if (coverImage != null) room.ImageUrl = coverImage.ImageUrl;

                        foreach (var image in roomImages.Select((value, index) => new { value, index }))
                        {
                            room.RoomImages.Add(new RoomImage
                            {
                                Id = Guid.NewGuid(),
                                RoomId = room.Id,
                                ImageUrl = image.value.ImageUrl,
                                DisplayOrder = image.value.DisplayOrder != 0 ? image.value.DisplayOrder : image.index,
                                IsCover = coverImage != null && image.value.ImageUrl == coverImage.ImageUrl,
                                CreatedAt = DateTime.UtcNow
                            });
                        }
                    }

                    if (roomDto.Amenities != null)
                    {
                        room.RoomAmenities.Clear();
                        foreach (var amenity in roomDto.Amenities.Where(a => !string.IsNullOrWhiteSpace(a.Name)))
                        {
                            room.RoomAmenities.Add(new RoomAmenity
                            {
                                Id = Guid.NewGuid(),
                                RoomId = room.Id,
                                Name = amenity.Name.Trim(),
                                Icon = amenity.Icon
                            });
                        }
                    }
                }

                if (dto.AvailabilityWindows != null)
                {
                    foreach (var room in service.Homestay.Rooms)
                    {
                        room.RoomAvailabilities.Clear();
                    }

                    foreach (var window in dto.AvailabilityWindows.Where(w => w.RoomId != Guid.Empty))
                    {
                        var room = service.Homestay.Rooms.FirstOrDefault(r => r.Id == window.RoomId);
                        if (room == null) continue;

                        var availableCount = Math.Clamp(window.AvailableCount, 0, room.Quantity);
                        for (var date = window.StartDate.Date; date <= window.EndDate.Date; date = date.AddDays(1))
                        {
                            room.RoomAvailabilities.Add(new RoomAvailability
                            {
                                Id = Guid.NewGuid(),
                                RoomId = room.Id,
                                Date = DateOnly.FromDateTime(date),
                                AvailableCount = availableCount,
                                IsBlocked = window.IsBlocked || availableCount <= 0
                            });
                        }
                    }
                }
                else if (dto.Rooms.Count > 0)
                {
                    foreach (var room in service.Homestay.Rooms)
                    {
                        ClampRoomAvailability(room);
                    }
                }

                var roomBasePrices = service.Homestay.Rooms
                    .Where(room => room.IsActive)
                    .Select(room => room.BasePrice)
                    .ToList();
                if (roomBasePrices.Count > 0)
                    service.BasePrice = roomBasePrices.Min();

                var allDates = service.Homestay.Rooms
                    .SelectMany(room => room.RoomAvailabilities)
                    .Select(availability => availability.Date);
                service.Homestay.AvailableFrom = allDates.Any()
                    ? allDates.Min().ToDateTime(TimeOnly.MinValue)
                    : null;
                service.Homestay.AvailableTo = allDates.Any()
                    ? allDates.Max().ToDateTime(TimeOnly.MinValue)
                    : null;
            }

            if (service.ServiceType == ServiceType.Tour && dto.TourPackages != null)
            {
                ApplyTourPackageUpdate(service, dto.TourPackages);
            }

            service.UpdatedAt = DateTime.UtcNow;
        }

        private static void ApplyServiceScalarUpdate(Service service, UpdateServiceDto dto)
        {
            if (dto.Name != null) service.Name = dto.Name;
            if (dto.Description != null) service.Description = dto.Description;
            if (dto.DestinationId.HasValue) service.DestinationId = dto.DestinationId.Value;
            if (dto.ServiceType.HasValue) service.ServiceType = dto.ServiceType.Value;
            if (dto.Address != null) service.Address = dto.Address;
            if (dto.Latitude.HasValue) service.Latitude = dto.Latitude;
            if (dto.Longitude.HasValue) service.Longitude = dto.Longitude;
            if (dto.BasePrice.HasValue) service.BasePrice = dto.BasePrice.Value;
            if (dto.DiscountPrice.HasValue) service.DiscountPrice = dto.DiscountPrice;
            if (dto.ThumbnailUrl != null) service.ThumbnailUrl = dto.ThumbnailUrl;
            if (dto.CancellationPolicyType.HasValue) service.CancellationPolicyType = dto.CancellationPolicyType.Value;
            if (dto.CancellationPolicyDescription != null) service.CancellationPolicyDescription = dto.CancellationPolicyDescription;
            if (dto.IsActive.HasValue) service.IsActive = dto.IsActive.Value;
        }

        private static bool IsHomestayOverviewOnlyUpdate(Service service, UpdateServiceDto dto)
        {
            return service.ServiceType == ServiceType.Homestay
                && dto.Rooms.Count == 0
                && dto.AvailabilityWindows == null;
        }

        private static bool IsHomestayAvailabilityOnlyUpdate(Service service, UpdateServiceDto dto)
        {
            return service.ServiceType == ServiceType.Homestay
                && dto.Rooms.Count == 0
                && dto.AvailabilityWindows != null;
        }

        private async Task ApplyApprovedDirectUpdateAsync(Service service, UpdateServiceDto dto)
        {
            if (IsHomestayAvailabilityOnlyUpdate(service, dto))
            {
                await ApplyHomestayAvailabilityOnlyUpdateAsync(service, dto);
                return;
            }

            if (IsHomestayOverviewOnlyUpdate(service, dto))
            {
                await ApplyHomestayOverviewOnlyUpdateAsync(service, dto);
                return;
            }

            if (service.ServiceType == ServiceType.Homestay && dto.Rooms.Count > 0)
            {
                await ApplyServiceUpdateForApprovalAsync(service, dto, replaceHomestayRooms: false);
                return;
            }

            if (service.ServiceType == ServiceType.Tour && dto.TourPackages != null)
            {
                throw new BusinessException("Tour package changes on approved services currently require manager approval.");
            }

            ApplyServiceScalarUpdate(service, dto);
            service.UpdatedAt = DateTime.UtcNow;
        }

        private static bool RequiresReapproval(Service service, UpdateServiceDto dto)
        {
            if (HasLocationChange(service, dto))
                return true;

            if (HasTopLevelImageChange(service, dto))
                return true;

            if (HasTopLevelPriceChange(service, dto))
                return true;

            if (HasCancellationNotesChange(service, dto))
                return true;

            if (service.ServiceType == ServiceType.Homestay)
                return RequiresHomestayReapproval(service, dto);

            if (service.ServiceType == ServiceType.Tour)
                return RequiresTourReapproval(service, dto);

            return false;
        }

        private static bool RequiresHomestayReapproval(Service service, UpdateServiceDto dto)
        {
            if (service.Homestay == null || dto.Rooms.Count == 0)
                return false;

            var existingRooms = service.Homestay.Rooms
                .Where(room => room.IsActive)
                .OrderBy(room => room.Id)
                .ToList();
            var existingRoomIds = existingRooms.Select(room => room.Id).ToHashSet();
            var incomingRoomIds = dto.Rooms
                .Where(room => room.Id.HasValue)
                .Select(room => room.Id!.Value)
                .ToHashSet();

            if (dto.Rooms.Any(room => !room.Id.HasValue || !existingRoomIds.Contains(room.Id.Value)))
                return true;

            if (existingRooms.Any(room => !incomingRoomIds.Contains(room.Id)))
                return true;

            foreach (var roomDto in dto.Rooms)
            {
                var room = existingRooms.First(existing => existing.Id == roomDto.Id!.Value);
                if (room.Quantity != roomDto.Quantity)
                    return true;
                if (room.BasePrice != roomDto.BasePrice)
                    return true;
                if ((room.WeekendPrice ?? room.BasePrice) != (roomDto.WeekendPrice ?? roomDto.BasePrice))
                    return true;
                if ((room.HolidayPrice ?? room.WeekendPrice ?? room.BasePrice) != (roomDto.HolidayPrice ?? roomDto.WeekendPrice ?? roomDto.BasePrice))
                    return true;
                if (HaveRoomImagesChanged(room, roomDto))
                    return true;
            }

            return false;
        }

        private static bool RequiresTourReapproval(Service service, UpdateServiceDto dto)
        {
            if (dto.TourPackages == null)
                return false;

            if (dto.TourPackages.Count != service.Tours.Count)
                return true;

            var existingPackages = service.Tours
                .OrderBy(tour => tour.DisplayOrder)
                .ThenBy(tour => tour.Id)
                .ToList();
            var incomingPackages = dto.TourPackages
                .Select((package, index) => new { package, index })
                .OrderBy(item => item.index)
                .ToList();

            for (var index = 0; index < existingPackages.Count; index++)
            {
                var existing = existingPackages[index];
                var incoming = incomingPackages[index].package;

                if (!StringEquals(existing.CancellationPolicyDescription, incoming.CancellationPolicyDescription))
                    return true;

                var existingPrices = existing.TourPricingTiers
                    .OrderBy(tier => tier.DisplayOrder)
                    .ThenBy(tier => tier.Id)
                    .Select(tier => tier.UnitPrice)
                    .ToList();
                var incomingPrices = incoming.PricingTiers
                    .OrderBy(tier => tier.DisplayOrder)
                    .Select(tier => tier.UnitPrice)
                    .ToList();
                if (!existingPrices.SequenceEqual(incomingPrices))
                    return true;

                var existingImages = existing.TourImages
                    .OrderBy(image => image.DisplayOrder)
                    .Select(image => $"{image.ImageUrl}|{image.IsCover}")
                    .ToList();
                var incomingImages = incoming.Images
                    .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                    .OrderBy(image => image.DisplayOrder)
                    .Select(image => $"{image.ImageUrl.Trim()}|{image.IsCover}")
                    .ToList();
                if (!existingImages.SequenceEqual(incomingImages))
                    return true;
            }

            return false;
        }

        private static bool HasLocationChange(Service service, UpdateServiceDto dto)
        {
            return (dto.DestinationId.HasValue && dto.DestinationId.Value != service.DestinationId)
                || (dto.Address != null && !StringEquals(dto.Address, service.Address))
                || (dto.Latitude.HasValue && !NullableDoubleEquals(dto.Latitude, service.Latitude))
                || (dto.Longitude.HasValue && !NullableDoubleEquals(dto.Longitude, service.Longitude));
        }

        private static bool HasTopLevelImageChange(Service service, UpdateServiceDto dto)
        {
            return dto.ThumbnailUrl != null && !StringEquals(dto.ThumbnailUrl, service.ThumbnailUrl);
        }

        private static bool HasTopLevelPriceChange(Service service, UpdateServiceDto dto)
        {
            return (dto.BasePrice.HasValue && dto.BasePrice.Value != service.BasePrice)
                || (dto.DiscountPrice.HasValue && dto.DiscountPrice != service.DiscountPrice);
        }

        private static bool HasCancellationNotesChange(Service service, UpdateServiceDto dto)
        {
            return dto.CancellationPolicyDescription != null
                && !StringEquals(dto.CancellationPolicyDescription, service.CancellationPolicyDescription);
        }

        private static bool HaveRoomImagesChanged(Room room, UpdateRoomDto roomDto)
        {
            if (roomDto.Images == null)
                return false;

            var existingImages = room.RoomImages
                .OrderBy(image => image.DisplayOrder)
                .Select(image => $"{image.ImageUrl}|{image.IsCover}")
                .ToList();
            if (existingImages.Count == 0 && !string.IsNullOrWhiteSpace(room.ImageUrl))
                existingImages.Add($"{room.ImageUrl}|True");

            var incomingImages = roomDto.Images
                .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                .OrderBy(image => image.DisplayOrder)
                .Select(image => $"{image.ImageUrl.Trim()}|{image.IsCover}")
                .ToList();
            if (incomingImages.Count == 0 && !string.IsNullOrWhiteSpace(roomDto.ImageUrl))
                incomingImages.Add($"{roomDto.ImageUrl.Trim()}|True");

            return !existingImages.SequenceEqual(incomingImages);
        }

        private static bool StringEquals(string? left, string? right)
        {
            return string.Equals((left ?? string.Empty).Trim(), (right ?? string.Empty).Trim(), StringComparison.Ordinal);
        }

        private static bool NullableDoubleEquals(double? left, double? right)
        {
            if (!left.HasValue && !right.HasValue)
                return true;
            if (!left.HasValue || !right.HasValue)
                return false;

            return Math.Abs(left.Value - right.Value) < 0.000001d;
        }

        private async Task ApplyHomestayOverviewOnlyUpdateAsync(Service service, UpdateServiceDto dto)
        {
            ApplyServiceScalarUpdate(service, dto);

            if (service.Homestay == null)
                return;

            if (!string.IsNullOrWhiteSpace(dto.CheckInTime) && TimeSpan.TryParse(dto.CheckInTime, out var checkIn))
                service.Homestay.CheckInTime = checkIn;
            if (!string.IsNullOrWhiteSpace(dto.CheckOutTime) && TimeSpan.TryParse(dto.CheckOutTime, out var checkOut))
                service.Homestay.CheckOutTime = checkOut;
            if (dto.MinNights.HasValue) service.Homestay.MinNights = Math.Clamp(dto.MinNights.Value, 1, 30);
            if (dto.MaxNights.HasValue) service.Homestay.MaxNights = Math.Clamp(dto.MaxNights.Value, service.Homestay.MinNights, 30);

            if (dto.Amenities != null)
            {
                var existingAmenities = service.Homestay.HomestayAmenities.ToList();
                await _context.HomestayAmenities
                    .Where(amenity => amenity.HomestayId == service.Homestay.Id)
                    .ExecuteDeleteAsync();
                DetachEntities(existingAmenities);
                service.Homestay.HomestayAmenities = new List<HomestayAmenity>();

                foreach (var amenity in dto.Amenities.Where(a => !string.IsNullOrWhiteSpace(a.Name)))
                {
                    _context.HomestayAmenities.Add(new HomestayAmenity
                    {
                        Id = Guid.NewGuid(),
                        HomestayId = service.Homestay.Id,
                        Name = amenity.Name.Trim(),
                        Icon = amenity.Icon
                    });
                }
            }

            service.UpdatedAt = DateTime.UtcNow;
        }

        private async Task ApplyHomestayAvailabilityOnlyUpdateAsync(Service service, UpdateServiceDto dto)
        {
            if (service.Homestay == null || dto.AvailabilityWindows == null)
                return;

            var trackedAvailabilities = service.Homestay.Rooms
                .SelectMany(room => room.RoomAvailabilities)
                .ToList();
            var roomLookup = service.Homestay.Rooms.ToDictionary(room => room.Id);
            var roomIds = roomLookup.Keys.ToList();

            if (roomIds.Count > 0)
            {
                await _context.RoomAvailabilities
                    .Where(availability => roomIds.Contains(availability.RoomId))
                    .ExecuteDeleteAsync();
            }

            DetachEntities(trackedAvailabilities);
            foreach (var room in service.Homestay.Rooms)
            {
                room.RoomAvailabilities = new List<RoomAvailability>();
            }

            foreach (var window in dto.AvailabilityWindows.Where(window => window.RoomId != Guid.Empty))
            {
                if (!roomLookup.TryGetValue(window.RoomId, out var room))
                    continue;

                var availableCount = Math.Clamp(window.AvailableCount, 0, room.Quantity);
                for (var date = window.StartDate.Date; date <= window.EndDate.Date; date = date.AddDays(1))
                {
                    _context.RoomAvailabilities.Add(new RoomAvailability
                    {
                        Id = Guid.NewGuid(),
                        RoomId = room.Id,
                        Date = DateOnly.FromDateTime(date),
                        AvailableCount = availableCount,
                        IsBlocked = window.IsBlocked || availableCount <= 0
                    });
                }
            }

            var allDates = dto.AvailabilityWindows
                .SelectMany(window => Enumerable.Range(0, (window.EndDate.Date - window.StartDate.Date).Days + 1)
                    .Select(offset => DateOnly.FromDateTime(window.StartDate.Date.AddDays(offset))))
                .OrderBy(date => date)
                .ToList();

            service.Homestay.AvailableFrom = allDates.Count > 0
                ? allDates.Min().ToDateTime(TimeOnly.MinValue)
                : null;
            service.Homestay.AvailableTo = allDates.Count > 0
                ? allDates.Max().ToDateTime(TimeOnly.MinValue)
                : null;
            service.UpdatedAt = DateTime.UtcNow;
        }

        private async Task ReplaceHomestayRoomsAsync(Service service, UpdateServiceDto dto)
        {
            if (service.Homestay == null)
                return;

            var existingRooms = service.Homestay.Rooms.ToList();
            var existingRoomIds = existingRooms.Select(room => room.Id).ToList();
            var trackedRoomChildren = existingRooms
                .SelectMany(room => room.RoomImages.Cast<object>()
                    .Concat(room.RoomAmenities)
                    .Concat(room.RoomAvailabilities))
                .ToList();
            var preservedAvailability = dto.AvailabilityWindows == null
                ? existingRooms
                    .SelectMany(room => room.RoomAvailabilities.Select(availability => new RoomAvailability
                    {
                        Id = Guid.NewGuid(),
                        RoomId = room.Id,
                        Date = availability.Date,
                        AvailableCount = availability.AvailableCount,
                        PriceOverride = availability.PriceOverride,
                        IsBlocked = availability.IsBlocked
                    }))
                    .ToList()
                : null;

            if (existingRoomIds.Count > 0)
            {
                await _context.RoomImages.Where(image => existingRoomIds.Contains(image.RoomId)).ExecuteDeleteAsync();
                await _context.RoomAmenities.Where(amenity => existingRoomIds.Contains(amenity.RoomId)).ExecuteDeleteAsync();
                await _context.RoomAvailabilities.Where(availability => existingRoomIds.Contains(availability.RoomId)).ExecuteDeleteAsync();
                await _context.Rooms.Where(room => room.HomestayId == service.Homestay.Id).ExecuteDeleteAsync();
            }

            DetachEntities(trackedRoomChildren);
            DetachEntities(existingRooms.Cast<object>());
            service.Homestay.Rooms = new List<Room>();

            var roomLookup = new Dictionary<Guid, Room>();
            foreach (var roomDto in dto.Rooms)
            {
                var roomId = roomDto.Id ?? Guid.NewGuid();
                var roomImages = roomDto.Images?
                    .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                    .OrderBy(image => image.DisplayOrder)
                    .ToList() ?? new List<CreateRoomImageDto>();
                var coverImage = roomImages.FirstOrDefault(image => image.IsCover) ?? roomImages.FirstOrDefault();

                var room = new Room
                {
                    Id = roomId,
                    HomestayId = service.Homestay.Id,
                    Name = roomDto.Name,
                    Description = roomDto.Description,
                    BedType = roomDto.BedType,
                    BedCount = Math.Max(roomDto.BedCount, 1),
                    MaxGuests = roomDto.MaxGuests,
                    Quantity = roomDto.Quantity,
                    BasePrice = roomDto.BasePrice,
                    WeekendPrice = roomDto.WeekendPrice ?? roomDto.BasePrice,
                    HolidayPrice = roomDto.HolidayPrice ?? roomDto.WeekendPrice ?? roomDto.BasePrice,
                    ImageUrl = coverImage?.ImageUrl ?? roomDto.ImageUrl,
                    IsActive = true
                };

                service.Homestay.Rooms.Add(room);
                _context.Rooms.Add(room);
                roomLookup[room.Id] = room;

                foreach (var image in roomImages.Select((value, index) => new { value, index }))
                {
                    _context.RoomImages.Add(new RoomImage
                    {
                        Id = Guid.NewGuid(),
                        RoomId = room.Id,
                        ImageUrl = image.value.ImageUrl,
                        DisplayOrder = image.value.DisplayOrder != 0 ? image.value.DisplayOrder : image.index,
                        IsCover = coverImage != null && image.value.ImageUrl == coverImage.ImageUrl,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                foreach (var amenity in roomDto.Amenities?.Where(a => !string.IsNullOrWhiteSpace(a.Name)) ?? Enumerable.Empty<CreateAmenityDto>())
                {
                    _context.RoomAmenities.Add(new RoomAmenity
                    {
                        Id = Guid.NewGuid(),
                        RoomId = room.Id,
                        Name = amenity.Name.Trim(),
                        Icon = amenity.Icon
                    });
                }
            }

            if (dto.AvailabilityWindows != null)
            {
                foreach (var window in dto.AvailabilityWindows.Where(window => window.RoomId != Guid.Empty))
                {
                    if (!roomLookup.TryGetValue(window.RoomId, out var room))
                        continue;

                    var availableCount = Math.Clamp(window.AvailableCount, 0, room.Quantity);
                    for (var date = window.StartDate.Date; date <= window.EndDate.Date; date = date.AddDays(1))
                    {
                        _context.RoomAvailabilities.Add(new RoomAvailability
                        {
                            Id = Guid.NewGuid(),
                            RoomId = room.Id,
                            Date = DateOnly.FromDateTime(date),
                            AvailableCount = availableCount,
                            IsBlocked = window.IsBlocked || availableCount <= 0
                        });
                    }
                }
            }
            else if (preservedAvailability != null)
            {
                foreach (var availability in preservedAvailability)
                {
                    if (!roomLookup.TryGetValue(availability.RoomId, out var room))
                        continue;

                    availability.AvailableCount = Math.Clamp(availability.AvailableCount, 0, room.Quantity);
                    availability.IsBlocked = availability.IsBlocked || availability.AvailableCount <= 0;
                    _context.RoomAvailabilities.Add(availability);
                }
            }
        }

        private async Task ReplaceTourPackagesAsync(Service service, List<CreateTourPackageDto> packages)
        {
            var trackedTourChildren = service.Tours
                .SelectMany(tour => tour.TourImages.Cast<object>()
                    .Concat(tour.TourPricingTiers)
                    .Concat(tour.TourSchedules)
                    .Concat(tour.TourItineraries))
                .ToList();
            var trackedTours = service.Tours.Cast<object>().ToList();
            var tourIds = service.Tours.Select(tour => tour.Id).ToList();

            if (tourIds.Count > 0)
            {
                await _context.TourImages.Where(image => tourIds.Contains(image.TourId)).ExecuteDeleteAsync();
                await _context.TourPricingTiers.Where(tier => tourIds.Contains(tier.TourId)).ExecuteDeleteAsync();
                await _context.TourSchedules.Where(schedule => tourIds.Contains(schedule.TourId)).ExecuteDeleteAsync();
                await _context.TourItineraries.Where(itinerary => tourIds.Contains(itinerary.TourId)).ExecuteDeleteAsync();
            }

            await _context.Tours.Where(tour => tour.ServiceId == service.Id).ExecuteDeleteAsync();
            await _context.ServiceImages.Where(image => image.ServiceId == service.Id).ExecuteDeleteAsync();

            DetachEntities(trackedTourChildren);
            DetachEntities(trackedTours);
            service.Tours = new List<Tour>();

            var cheapestTier = packages
                .SelectMany(package => package.PricingTiers)
                .OrderBy(tier => tier.UnitPrice)
                .FirstOrDefault();
            if (cheapestTier != null)
                service.BasePrice = cheapestTier.UnitPrice;

            var firstPackage = packages.FirstOrDefault();
            var firstPackageImages = firstPackage?.Images
                .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                .OrderBy(image => image.DisplayOrder)
                .ToList() ?? new List<CreateTourImageDto>();
            var coverImage = firstPackageImages.FirstOrDefault(image => image.IsCover) ?? firstPackageImages.FirstOrDefault();
            if (coverImage != null)
                service.ThumbnailUrl = coverImage.ImageUrl.Trim();

            foreach (var image in firstPackageImages.Select((value, index) => new { value, index }))
            {
                _context.ServiceImages.Add(new ServiceImage
                {
                    Id = Guid.NewGuid(),
                    ServiceId = service.Id,
                    ImageUrl = image.value.ImageUrl.Trim(),
                    DisplayOrder = image.value.DisplayOrder != 0 ? image.value.DisplayOrder : image.index,
                    CreatedAt = DateTime.UtcNow
                });
            }

            var strictestPackage = packages
                .OrderByDescending(package => package.CancellationPolicyType)
                .ThenBy(package => package.Name, StringComparer.OrdinalIgnoreCase)
                .FirstOrDefault();
            if (strictestPackage != null)
            {
                service.CancellationPolicyType = strictestPackage.CancellationPolicyType;
                service.CancellationPolicyDescription = strictestPackage.CancellationPolicyDescription;
            }

            for (var packageIndex = 0; packageIndex < packages.Count; packageIndex++)
            {
                var package = packages[packageIndex];
                var participantBounds = ResolveParticipantBounds(package);
                var tour = new Tour
                {
                    Id = Guid.NewGuid(),
                    ServiceId = service.Id,
                    Name = package.Name.Trim(),
                    Duration = package.Duration.Trim(),
                    MaxParticipants = participantBounds.MaxParticipants,
                    MinParticipants = participantBounds.MinParticipants,
                    BookingCutoffHours = package.BookingCutoffHours,

                    MeetingPoint = package.MeetingPoint?.Trim(),
                    IncludedItemsText = JoinBulletLines(package.Includes),
                    ExcludedItemsText = JoinBulletLines(package.Excludes),
                    CancellationPolicyType = package.CancellationPolicyType,
                    CancellationPolicyDescription = package.CancellationPolicyDescription,
                    DisplayOrder = packageIndex
                };
                _context.Tours.Add(tour);

                foreach (var image in package.Images
                    .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                    .OrderBy(image => image.DisplayOrder)
                    .Select((value, index) => new { value, index }))
                {
                    _context.TourImages.Add(new TourImage
                    {
                        Id = Guid.NewGuid(),
                        TourId = tour.Id,
                        ImageUrl = image.value.ImageUrl.Trim(),
                        DisplayOrder = image.value.DisplayOrder != 0 ? image.value.DisplayOrder : image.index,
                        IsCover = image.value.IsCover,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                var createdPricingTiers = package.PricingTiers
                    .OrderBy(tier => tier.DisplayOrder)
                    .Select((value, index) => new TourPricingTier
                    {
                        Id = Guid.NewGuid(),
                        TourId = tour.Id,
                        Name = value.Name.Trim(),
                        Description = string.IsNullOrWhiteSpace(value.Description) ? null : value.Description.Trim(),
                        UnitPrice = value.UnitPrice,
                        MinQuantity = NormalizeTierMinQuantity(value, participantBounds.MaxParticipants),
                        MaxQuantity = NormalizeTierMaxQuantity(value, participantBounds.MaxParticipants),
                        DisplayOrder = value.DisplayOrder != 0 ? value.DisplayOrder : index
                    })
                    .ToList();

                _context.TourPricingTiers.AddRange(createdPricingTiers);

                foreach (var session in package.Sessions.OrderBy(session => session.StartDate))
                {
                    var scheduleEntity = new TourSchedule
                    {
                        Id = Guid.NewGuid(),
                        TourId = tour.Id,
                        StartDate = session.StartDate,
                        EndDate = session.EndDate,
                        RunCount = NormalizeScheduleRunCount(session),
                        AvailableSlots = NormalizeScheduleAvailableSlots(participantBounds.MaxParticipants),
                        PriceOverride = ResolveLegacySchedulePriceOverride(session, package.PricingTiers),
                        Status = TourScheduleStatus.Active
                    };
                    scheduleEntity.PricingOverrides = BuildSchedulePricingOverrides(
                        scheduleEntity.Id,
                        session.PricingOverrides ?? new List<CreateTourSchedulePricingOverrideDto>(),
                        createdPricingTiers);
                    scheduleEntity.ScheduleRuns = BuildScheduleRuns(
                        scheduleEntity.Id,
                        session,
                        participantBounds.MaxParticipants);
                    _context.TourSchedules.Add(scheduleEntity);
                }

                foreach (var itinerary in package.Itinerary
                    .OrderBy(item => item.DayNumber)
                    .ThenBy(item => item.DisplayOrder)
                    .Select((value, index) => new { value, index }))
                {
                    _context.TourItineraries.Add(new TourItinerary
                    {
                        Id = Guid.NewGuid(),
                        TourId = tour.Id,
                        DayNumber = itinerary.value.DayNumber > 0 ? itinerary.value.DayNumber : itinerary.index + 1,
                        DisplayOrder = itinerary.value.DisplayOrder,
                        Title = itinerary.value.Title.Trim(),
                        Description = itinerary.value.Description?.Trim(),
                        StartTime = itinerary.value.StartTime,
                        EndTime = itinerary.value.EndTime,
                        Location = string.IsNullOrWhiteSpace(itinerary.value.Location) ? null : itinerary.value.Location.Trim(),
                        ActivityType = NormalizeActivityType(itinerary.value.ActivityType),
                        ImageUrl = string.IsNullOrWhiteSpace(itinerary.value.ImageUrl) ? null : itinerary.value.ImageUrl.Trim()
                    });
                }
            }
        }

        private void DetachEntities(IEnumerable<object> entities)
        {
            foreach (var entity in entities)
            {
                var entry = _context.Entry(entity);
                if (entry.State != EntityState.Detached)
                    entry.State = EntityState.Detached;
            }
        }

        private static void ApplyDetailPreview(ServiceDetailDto detail, UpdateServiceDto dto)
        {
            if (dto.Name != null) detail.Name = dto.Name;
            if (dto.Description != null) detail.Description = dto.Description;
            if (dto.DestinationId.HasValue) detail.DestinationId = dto.DestinationId.Value;
            if (dto.Address != null) detail.Address = dto.Address;
            if (dto.Latitude.HasValue) detail.Latitude = dto.Latitude.Value;
            if (dto.Longitude.HasValue) detail.Longitude = dto.Longitude.Value;
            if (dto.BasePrice.HasValue) detail.BasePrice = dto.BasePrice.Value;
            if (dto.DiscountPrice.HasValue) detail.DiscountPrice = dto.DiscountPrice;
            if (dto.ThumbnailUrl != null) detail.ThumbnailUrl = dto.ThumbnailUrl;
            if (dto.CancellationPolicyType.HasValue) detail.CancellationPolicyType = dto.CancellationPolicyType.Value;
            if (dto.CancellationPolicyDescription != null) detail.CancellationPolicyDescription = dto.CancellationPolicyDescription;

            if (detail.ServiceType == ServiceType.Tour && dto.TourPackages != null)
            {
                ApplyTourPackagePreview(detail, dto.TourPackages);
            }

            if (detail.Homestay == null) return;

            if (!string.IsNullOrWhiteSpace(dto.CheckInTime) && TimeSpan.TryParse(dto.CheckInTime, out var checkIn))
                detail.Homestay.CheckInTime = checkIn;
            if (!string.IsNullOrWhiteSpace(dto.CheckOutTime) && TimeSpan.TryParse(dto.CheckOutTime, out var checkOut))
                detail.Homestay.CheckOutTime = checkOut;
            if (dto.MinNights.HasValue) detail.Homestay.MinNights = Math.Clamp(dto.MinNights.Value, 1, 30);
            if (dto.MaxNights.HasValue) detail.Homestay.MaxNights = Math.Clamp(dto.MaxNights.Value, detail.Homestay.MinNights, 30);

            if (dto.Amenities != null)
            {
                detail.Homestay.Amenities = dto.Amenities
                    .Where(amenity => !string.IsNullOrWhiteSpace(amenity.Name))
                    .Select(amenity => new AmenityDto
                    {
                        Id = Guid.NewGuid(),
                        Name = amenity.Name.Trim(),
                        Icon = amenity.Icon
                    })
                    .ToList();
            }

            if (dto.Rooms.Count > 0)
            {
                foreach (var roomUpdate in dto.Rooms)
                {
                    var room = roomUpdate.Id.HasValue
                        ? detail.Homestay.Rooms.FirstOrDefault(item => item.Id == roomUpdate.Id.Value)
                        : null;

                    if (room == null)
                    {
                        room = new RoomDto
                        {
                            Id = roomUpdate.Id ?? Guid.NewGuid(),
                            IsActive = true
                        };
                        detail.Homestay.Rooms.Add(room);
                    }

                    room.Name = roomUpdate.Name;
                    room.Description = roomUpdate.Description;
                    room.BedType = roomUpdate.BedType;
                    room.BedCount = Math.Max(roomUpdate.BedCount, 1);
                    room.MaxGuests = roomUpdate.MaxGuests;
                    room.Quantity = roomUpdate.Quantity;
                    room.BasePrice = roomUpdate.BasePrice;
                    room.WeekendPrice = roomUpdate.WeekendPrice ?? roomUpdate.BasePrice;
                    room.HolidayPrice = roomUpdate.HolidayPrice ?? roomUpdate.WeekendPrice ?? roomUpdate.BasePrice;

                    if (roomUpdate.Images != null)
                    {
                        room.Images = roomUpdate.Images
                            .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                            .OrderBy(image => image.DisplayOrder)
                            .Select((image, index) => new RoomImageDto
                            {
                                Id = Guid.NewGuid(),
                                ImageUrl = image.ImageUrl,
                                DisplayOrder = image.DisplayOrder != 0 ? image.DisplayOrder : index,
                                IsCover = image.IsCover
                            })
                            .ToList();

                        var coverImage = room.Images.FirstOrDefault(image => image.IsCover)
                            ?? room.Images.FirstOrDefault();
                        room.ImageUrl = coverImage?.ImageUrl ?? roomUpdate.ImageUrl ?? room.ImageUrl;
                    }
                    else if (roomUpdate.ImageUrl != null)
                    {
                        room.ImageUrl = roomUpdate.ImageUrl;
                    }

                    if (roomUpdate.Amenities != null)
                    {
                        room.Amenities = roomUpdate.Amenities
                            .Where(amenity => !string.IsNullOrWhiteSpace(amenity.Name))
                            .Select(amenity => new AmenityDto
                            {
                                Id = Guid.NewGuid(),
                                Name = amenity.Name.Trim(),
                                Icon = amenity.Icon
                            })
                            .ToList();
                    }

                    ClampRoomAvailability(room);
                }
            }

            if (dto.AvailabilityWindows != null)
            {
                var availabilityByRoom = dto.AvailabilityWindows
                    .Where(window => window.RoomId != Guid.Empty)
                    .GroupBy(window => window.RoomId)
                    .ToDictionary(group => group.Key, group => group.ToList());

                foreach (var room in detail.Homestay.Rooms)
                {
                    var roomWindows = availabilityByRoom.TryGetValue(room.Id, out var windows)
                        ? windows
                        : new List<UpdateRoomAvailabilityWindowDto>();
                    room.Availability = ExpandAvailabilityWindows(roomWindows, room.Quantity);
                }
            }

            foreach (var room in detail.Homestay.Rooms)
            {
                ClampRoomAvailability(room);
            }

            var roomBasePrices = detail.Homestay.Rooms
                .Where(room => room.IsActive)
                .Select(room => room.BasePrice)
                .ToList();
            if (roomBasePrices.Count > 0)
                detail.BasePrice = roomBasePrices.Min();

            var allDates = detail.Homestay.Rooms
                .SelectMany(room => room.Availability)
                .Select(availability => availability.Date)
                .ToList();
            detail.Homestay.AvailableFrom = allDates.Count > 0
                ? allDates.Min().ToDateTime(TimeOnly.MinValue)
                : null;
            detail.Homestay.AvailableTo = allDates.Count > 0
                ? allDates.Max().ToDateTime(TimeOnly.MinValue)
                : null;
        }

        private static void ApplyTourPackageUpdate(Service service, List<CreateTourPackageDto> packages)
        {
            service.Tours.Clear();

            var cheapestTier = packages
                .SelectMany(package => package.PricingTiers)
                .OrderBy(tier => tier.UnitPrice)
                .FirstOrDefault();
            if (cheapestTier != null)
                service.BasePrice = cheapestTier.UnitPrice;

            var firstPackage = packages.FirstOrDefault();
            var firstPackageImages = firstPackage?.Images
                .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                .OrderBy(image => image.DisplayOrder)
                .ToList() ?? new List<CreateTourImageDto>();
            var coverImage = firstPackageImages.FirstOrDefault(image => image.IsCover) ?? firstPackageImages.FirstOrDefault();
            if (coverImage != null)
                service.ThumbnailUrl = coverImage.ImageUrl.Trim();

            var strictestPackage = packages
                .OrderByDescending(package => package.CancellationPolicyType)
                .ThenBy(package => package.Name, StringComparer.OrdinalIgnoreCase)
                .FirstOrDefault();
            if (strictestPackage != null)
            {
                service.CancellationPolicyType = strictestPackage.CancellationPolicyType;
                service.CancellationPolicyDescription = strictestPackage.CancellationPolicyDescription;
            }

            for (var packageIndex = 0; packageIndex < packages.Count; packageIndex++)
            {
                var package = packages[packageIndex];
                var participantBounds = ResolveParticipantBounds(package);
                var tour = new Tour
                {
                    Id = Guid.NewGuid(),
                    ServiceId = service.Id,
                    Name = package.Name.Trim(),
                    Duration = package.Duration.Trim(),
                    MaxParticipants = participantBounds.MaxParticipants,
                    MinParticipants = participantBounds.MinParticipants,
                    BookingCutoffHours = package.BookingCutoffHours,

                    MeetingPoint = package.MeetingPoint?.Trim(),
                    IncludedItemsText = JoinBulletLines(package.Includes),
                    ExcludedItemsText = JoinBulletLines(package.Excludes),
                    CancellationPolicyType = package.CancellationPolicyType,
                    CancellationPolicyDescription = package.CancellationPolicyDescription,
                    DisplayOrder = packageIndex
                };

                foreach (var image in package.Images
                    .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                    .OrderBy(image => image.DisplayOrder)
                    .Select((value, index) => new { value, index }))
                {
                    tour.TourImages.Add(new TourImage
                    {
                        Id = Guid.NewGuid(),
                        TourId = tour.Id,
                        ImageUrl = image.value.ImageUrl.Trim(),
                        DisplayOrder = image.value.DisplayOrder != 0 ? image.value.DisplayOrder : image.index,
                        IsCover = image.value.IsCover,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                foreach (var tier in package.PricingTiers
                    .OrderBy(tier => tier.DisplayOrder)
                    .Select((value, index) => new { value, index }))
                {
                    tour.TourPricingTiers.Add(new TourPricingTier
                    {
                        Id = Guid.NewGuid(),
                        TourId = tour.Id,
                        Name = tier.value.Name.Trim(),
                        Description = string.IsNullOrWhiteSpace(tier.value.Description) ? null : tier.value.Description.Trim(),
                        UnitPrice = tier.value.UnitPrice,
                        MinQuantity = NormalizeTierMinQuantity(tier.value, participantBounds.MaxParticipants),
                        MaxQuantity = NormalizeTierMaxQuantity(tier.value, participantBounds.MaxParticipants),
                        DisplayOrder = tier.value.DisplayOrder != 0 ? tier.value.DisplayOrder : tier.index
                    });
                }

                foreach (var session in package.Sessions.OrderBy(session => session.StartDate))
                {
                    var scheduleEntity = new TourSchedule
                    {
                        Id = Guid.NewGuid(),
                        TourId = tour.Id,
                        StartDate = session.StartDate,
                        EndDate = session.EndDate,
                        AvailableSlots = NormalizeScheduleAvailableSlots(participantBounds.MaxParticipants),
                        RunCount = NormalizeScheduleRunCount(session),
                        PriceOverride = ResolveLegacySchedulePriceOverride(session, package.PricingTiers),
                        Status = TourScheduleStatus.Active
                    };
                    scheduleEntity.PricingOverrides = BuildSchedulePricingOverrides(
                        scheduleEntity.Id,
                        session.PricingOverrides ?? new List<CreateTourSchedulePricingOverrideDto>(),
                        tour.TourPricingTiers.ToList());
                    scheduleEntity.ScheduleRuns = BuildScheduleRuns(
                        scheduleEntity.Id,
                        session,
                        participantBounds.MaxParticipants);
                    tour.TourSchedules.Add(scheduleEntity);
                }

                foreach (var itinerary in package.Itinerary
                    .OrderBy(item => item.DayNumber)
                    .ThenBy(item => item.DisplayOrder)
                    .Select((value, index) => new { value, index }))
                {
                    tour.TourItineraries.Add(new TourItinerary
                    {
                        Id = Guid.NewGuid(),
                        TourId = tour.Id,
                        DayNumber = itinerary.value.DayNumber > 0 ? itinerary.value.DayNumber : itinerary.index + 1,
                        DisplayOrder = itinerary.value.DisplayOrder,
                        Title = itinerary.value.Title.Trim(),
                        Description = itinerary.value.Description?.Trim(),
                        StartTime = itinerary.value.StartTime,
                        EndTime = itinerary.value.EndTime,
                        Location = string.IsNullOrWhiteSpace(itinerary.value.Location) ? null : itinerary.value.Location.Trim(),
                        ActivityType = NormalizeActivityType(itinerary.value.ActivityType),
                        ImageUrl = string.IsNullOrWhiteSpace(itinerary.value.ImageUrl) ? null : itinerary.value.ImageUrl.Trim()
                    });
                }

                service.Tours.Add(tour);
            }
        }

        private static void ApplyTourPackagePreview(ServiceDetailDto detail, List<CreateTourPackageDto> packages)
        {
            if (packages.Count == 0)
            {
                detail.TourPackages = new List<TourDetailDto>();
                detail.Tour = null;
                return;
            }

            var cheapestTier = packages
                .SelectMany(package => package.PricingTiers)
                .OrderBy(tier => tier.UnitPrice)
                .FirstOrDefault();
            if (cheapestTier != null)
                detail.BasePrice = cheapestTier.UnitPrice;

            var firstPackage = packages[0];
            var firstPackageImages = firstPackage.Images
                .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                .OrderBy(image => image.DisplayOrder)
                .ToList();
            var coverImage = firstPackageImages.FirstOrDefault(image => image.IsCover) ?? firstPackageImages.FirstOrDefault();
            if (coverImage != null)
                detail.ThumbnailUrl = coverImage.ImageUrl.Trim();

            var strictestPackage = packages
                .OrderByDescending(package => package.CancellationPolicyType)
                .ThenBy(package => package.Name, StringComparer.OrdinalIgnoreCase)
                .First();
            detail.CancellationPolicyType = strictestPackage.CancellationPolicyType;
            detail.CancellationPolicyDescription = strictestPackage.CancellationPolicyDescription;

            detail.TourPackages = packages
                .Select((package, packageIndex) => new TourDetailDto
                {
                    Id = Guid.NewGuid(),
                    Name = package.Name.Trim(),
                    Duration = package.Duration.Trim(),
                    MaxParticipants = ResolveParticipantBounds(package).MaxParticipants,
                    MinParticipants = ResolveParticipantBounds(package).MinParticipants,
                    BookingCutoffHours = package.BookingCutoffHours,

                    MeetingPoint = package.MeetingPoint?.Trim(),
                    CancellationPolicyType = package.CancellationPolicyType,
                    CancellationPolicyDescription = package.CancellationPolicyDescription,
                    DisplayOrder = packageIndex,
                    IncludedItems = SplitBulletLines(JoinBulletLines(package.Includes)),
                    ExcludedItems = SplitBulletLines(JoinBulletLines(package.Excludes)),
                    Images = package.Images
                        .Where(image => !string.IsNullOrWhiteSpace(image.ImageUrl))
                        .OrderBy(image => image.DisplayOrder)
                        .Select((image, imageIndex) => new TourImageDto
                        {
                            Id = Guid.NewGuid(),
                            ImageUrl = image.ImageUrl.Trim(),
                            DisplayOrder = image.DisplayOrder != 0 ? image.DisplayOrder : imageIndex,
                            IsCover = image.IsCover
                        })
                        .ToList(),
                    PricingTiers = package.PricingTiers
                        .OrderBy(tier => tier.DisplayOrder)
                        .Select((tier, tierIndex) => new TourPricingTierDto
                        {
                            Id = Guid.NewGuid(),
                            Name = tier.Name.Trim(),
                            Description = tier.Description?.Trim(),
                            UnitPrice = tier.UnitPrice,
                            MinQuantity = NormalizeTierMinQuantity(tier, ResolveParticipantBounds(package).MaxParticipants),
                            MaxQuantity = NormalizeTierMaxQuantity(tier, ResolveParticipantBounds(package).MaxParticipants),
                            DisplayOrder = tier.DisplayOrder != 0 ? tier.DisplayOrder : tierIndex
                        })
                        .ToList(),
                    Schedules = package.Sessions
                        .OrderBy(session => session.StartDate)
                        .Select(session => new TourScheduleDto
                        {
                            Id = Guid.NewGuid(),
                            StartDate = session.StartDate,
                            EndDate = session.EndDate,
                            AvailableSlots = NormalizeScheduleAvailableSlots(
                                ResolveParticipantBounds(package).MaxParticipants),
                            RunCount = NormalizeScheduleRunCount(session),
                            BookedSlots = 0,
                            PriceOverride = ResolveLegacySchedulePriceOverride(session, package.PricingTiers),
                            PricingOverrides = (session.PricingOverrides ?? new List<CreateTourSchedulePricingOverrideDto>())
                                .Where(item => item.CustomPrice.HasValue && item.CustomPrice.Value > 0)
                                .Join(
                                    package.PricingTiers,
                                    item => item.TierDisplayOrder,
                                    tier => tier.DisplayOrder,
                                    (item, tier) => new TourSchedulePricingOverrideDto
                                    {
                                        TourPricingTierId = Guid.NewGuid(),
                                        TierDisplayOrder = tier.DisplayOrder,
                                        TierName = tier.Name.Trim(),
                                        CustomPrice = item.CustomPrice!.Value
                                    })
                                .OrderBy(item => item.TierDisplayOrder)
                                .ToList(),
                            Status = TourScheduleStatus.Active
                        })
                        .ToList(),
                    Itineraries = package.Itinerary
                        .OrderBy(item => item.DayNumber)
                        .ThenBy(item => item.DisplayOrder)
                        .Select((item, itemIndex) => new TourItineraryDto
                        {
                            Id = Guid.NewGuid(),
                            DayNumber = item.DayNumber > 0 ? item.DayNumber : itemIndex + 1,
                            DisplayOrder = item.DisplayOrder,
                            Title = item.Title.Trim(),
                            Description = item.Description?.Trim(),
                            StartTime = item.StartTime,
                            EndTime = item.EndTime,
                            Location = item.Location?.Trim(),
                            ActivityType = NormalizeActivityType(item.ActivityType),
                            ImageUrl = item.ImageUrl?.Trim()
                        })
                        .ToList()
                })
                .OrderBy(package => package.DisplayOrder)
                .ToList();

            detail.Tour = detail.TourPackages.FirstOrDefault();
        }

        private static void ValidateUpdateRequest(Service service, UpdateServiceDto dto)
        {
            if (service.ServiceType == ServiceType.Tour)
            {
                if (dto.TourPackages != null)
                {
                    ValidateTourPackages(dto.TourPackages);
                }

                return;
            }

            if (service.ServiceType != ServiceType.Homestay || service.Homestay == null)
                return;

            if (dto.MinNights.HasValue && (dto.MinNights.Value < 1 || dto.MinNights.Value > 30))
                throw new BusinessException("Minimum nights must be between 1 and 30.");

            var effectiveMaxNights = dto.MaxNights ?? service.Homestay.MaxNights;
            var effectiveMinNights = dto.MinNights ?? service.Homestay.MinNights;
            if (effectiveMaxNights < effectiveMinNights || effectiveMaxNights > 30)
                throw new BusinessException("Maximum nights must be between minimum nights and 30.");

            var effectiveRooms = service.Homestay.Rooms
                .Where(room => room.IsActive)
                .Select(room => new Room
                {
                    Id = room.Id,
                    Name = room.Name,
                    Description = room.Description,
                    BedType = room.BedType,
                    BedCount = room.BedCount,
                    MaxGuests = room.MaxGuests,
                    Quantity = room.Quantity,
                    BasePrice = room.BasePrice,
                    WeekendPrice = room.WeekendPrice,
                    HolidayPrice = room.HolidayPrice
                })
                .ToList();

            foreach (var roomDto in dto.Rooms)
            {
                var room = roomDto.Id.HasValue
                    ? effectiveRooms.FirstOrDefault(item => item.Id == roomDto.Id.Value)
                    : null;

                if (room == null)
                {
                    room = new Room { Id = roomDto.Id ?? Guid.NewGuid() };
                    effectiveRooms.Add(room);
                }

                if (string.IsNullOrWhiteSpace(roomDto.Name))
                    throw new BusinessException("Every room type needs a name.");
                if (roomDto.Quantity < 1)
                    throw new BusinessException($"Room '{roomDto.Name}' must have at least 1 available unit.");
                if (roomDto.MaxGuests < 1)
                    throw new BusinessException($"Room '{roomDto.Name}' must allow at least 1 guest.");
                if (roomDto.BedCount < 1)
                    throw new BusinessException($"Room '{roomDto.Name}' must have at least 1 bed.");

                var weekendPrice = roomDto.WeekendPrice ?? roomDto.BasePrice;
                var holidayPrice = roomDto.HolidayPrice ?? roomDto.WeekendPrice ?? roomDto.BasePrice;
                ValidateNightlyPrice(roomDto.BasePrice, $"Base price for room '{roomDto.Name}'");
                ValidateNightlyPrice(weekendPrice, $"Weekend price for room '{roomDto.Name}'");
                ValidateNightlyPrice(holidayPrice, $"Holiday price for room '{roomDto.Name}'");
                if (weekendPrice < roomDto.BasePrice)
                    throw new BusinessException($"Weekend price for room '{roomDto.Name}' cannot be lower than base price.");
                if (holidayPrice < weekendPrice)
                    throw new BusinessException($"Holiday price for room '{roomDto.Name}' cannot be lower than weekend price.");

                room.Name = roomDto.Name.Trim();
                room.Description = roomDto.Description;
                room.BedType = roomDto.BedType;
                room.BedCount = roomDto.BedCount;
                room.MaxGuests = roomDto.MaxGuests;
                room.Quantity = roomDto.Quantity;
                room.BasePrice = roomDto.BasePrice;
                room.WeekendPrice = weekendPrice;
                room.HolidayPrice = holidayPrice;
            }

            var duplicateRoomName = effectiveRooms
                .Where(room => !string.IsNullOrWhiteSpace(room.Name))
                .GroupBy(room => room.Name.Trim(), StringComparer.OrdinalIgnoreCase)
                .FirstOrDefault(group => group.Count() > 1);
            if (duplicateRoomName != null)
                throw new BusinessException($"Room name '{duplicateRoomName.Key}' is duplicated. Please use unique room names.");

            if (dto.AvailabilityWindows == null)
                return;

            var vietnamToday = GetVietnamToday();
            var maxOpenDate = vietnamToday.AddYears(1);
            var roomLookup = effectiveRooms.ToDictionary(room => room.Id, room => room, EqualityComparer<Guid>.Default);

            foreach (var window in dto.AvailabilityWindows)
            {
                if (!roomLookup.TryGetValue(window.RoomId, out var room))
                    throw new BusinessException("Every availability window must belong to an existing room type.");

                var start = window.StartDate.Date;
                var end = window.EndDate.Date;
                if (end < start)
                    throw new BusinessException($"Availability for room '{room.Name}' cannot end before it starts.");
                if (start < vietnamToday)
                    throw new BusinessException($"Availability for room '{room.Name}' cannot start in the past.");
                if (end > maxOpenDate)
                    throw new BusinessException($"Availability for room '{room.Name}' cannot be opened more than 1 year ahead.");
                if (window.AvailableCount < 0 || window.AvailableCount > room.Quantity)
                    throw new BusinessException($"Availability count for room '{room.Name}' must be from 0 to {room.Quantity}.");
                if (!window.IsBlocked && window.AvailableCount < 1)
                    throw new BusinessException($"Availability count for room '{room.Name}' must be at least 1 unless the window is blocked.");
            }

            foreach (var group in dto.AvailabilityWindows.GroupBy(window => window.RoomId))
            {
                var room = roomLookup[group.Key];
                var ordered = group.OrderBy(window => window.StartDate.Date).ToList();
                for (var i = 1; i < ordered.Count; i++)
                {
                    if (ordered[i].StartDate.Date <= ordered[i - 1].EndDate.Date)
                        throw new BusinessException($"Availability windows for room '{room.Name}' cannot overlap.");
                }
            }
        }

        private static List<RoomAvailabilityDto> ExpandAvailabilityWindows(IEnumerable<UpdateRoomAvailabilityWindowDto> windows, int roomQuantity)
        {
            var rows = new List<RoomAvailabilityDto>();
            foreach (var window in windows.OrderBy(window => window.StartDate.Date))
            {
                var availableCount = Math.Clamp(window.AvailableCount, 0, Math.Max(roomQuantity, 0));
                for (var date = window.StartDate.Date; date <= window.EndDate.Date; date = date.AddDays(1))
                {
                    rows.Add(new RoomAvailabilityDto
                    {
                        Id = Guid.NewGuid(),
                        Date = DateOnly.FromDateTime(date),
                        AvailableCount = availableCount,
                        IsBlocked = window.IsBlocked || availableCount <= 0
                    });
                }
            }

            return rows.OrderBy(row => row.Date).ToList();
        }

        private static void ClampRoomAvailability(Room room)
        {
            foreach (var availability in room.RoomAvailabilities)
            {
                availability.AvailableCount = Math.Clamp(availability.AvailableCount, 0, room.Quantity);
                availability.IsBlocked = availability.IsBlocked || availability.AvailableCount <= 0;
            }
        }

        private static void ClampRoomAvailability(RoomDto room)
        {
            foreach (var availability in room.Availability)
            {
                availability.AvailableCount = Math.Clamp(availability.AvailableCount, 0, room.Quantity);
                availability.IsBlocked = availability.IsBlocked || availability.AvailableCount <= 0;
            }
        }

        private static DateTime GetVietnamToday()
        {
            try
            {
                var timezone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timezone).Date;
            }
            catch (TimeZoneNotFoundException)
            {
                var timezone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timezone).Date;
            }
        }

        private static List<CreateRoomAvailabilityWindowDto> BuildAvailabilityWindows(CreateHomestayDto dto)
        {
            if (dto.AvailabilityWindows.Any())
                return dto.AvailabilityWindows;

            if (!dto.AvailableFrom.HasValue || !dto.AvailableTo.HasValue)
                return new List<CreateRoomAvailabilityWindowDto>();

            return dto.Rooms.Select(room => new CreateRoomAvailabilityWindowDto
            {
                RoomKey = room.Name,
                StartDate = dto.AvailableFrom.Value,
                EndDate = dto.AvailableTo.Value,
                AvailableCount = room.Quantity
            }).ToList();
        }

        private static void ValidateAvailabilityWindows(
            List<CreateRoomAvailabilityWindowDto> windows,
            List<CreateRoomDto> rooms,
            DateTime vietnamToday,
            DateTime maxOpenDate)
        {
            var roomQuantityByKey = rooms.ToDictionary(r => r.Name.Trim(), r => r.Quantity, StringComparer.OrdinalIgnoreCase);

            foreach (var window in windows)
            {
                if (string.IsNullOrWhiteSpace(window.RoomKey) || !roomQuantityByKey.ContainsKey(window.RoomKey.Trim()))
                    throw new BusinessException("Every availability window must belong to an existing room type.");

                var start = window.StartDate.Date;
                var end = window.EndDate.Date;
                if (end < start)
                    throw new BusinessException($"Availability for room '{window.RoomKey}' cannot end before it starts.");
                if (start < vietnamToday)
                    throw new BusinessException($"Availability for room '{window.RoomKey}' cannot start in the past.");
                if (end > maxOpenDate)
                    throw new BusinessException($"Availability for room '{window.RoomKey}' cannot be opened more than 1 year ahead.");

                var roomQuantity = roomQuantityByKey[window.RoomKey.Trim()];
                if (window.AvailableCount.HasValue && (window.AvailableCount.Value < 1 || window.AvailableCount.Value > roomQuantity))
                    throw new BusinessException($"Availability count for room '{window.RoomKey}' must be from 1 to {roomQuantity}.");
            }

            foreach (var group in windows.GroupBy(w => w.RoomKey.Trim(), StringComparer.OrdinalIgnoreCase))
            {
                var ordered = group.OrderBy(w => w.StartDate.Date).ToList();
                for (var i = 1; i < ordered.Count; i++)
                {
                    if (ordered[i].StartDate.Date <= ordered[i - 1].EndDate.Date)
                        throw new BusinessException($"Availability windows for room '{group.Key}' cannot overlap.");
                }
            }
        }

        private static ServiceListDto MapToListDto(Service s) => new()
        {
            Id = s.Id, Name = s.Name, Description = s.Description, ServiceType = s.ServiceType, DestinationId = s.DestinationId, Address = s.Address,
            BasePrice = s.BasePrice, DiscountPrice = s.DiscountPrice, ThumbnailUrl = s.ThumbnailUrl,
            AverageRating = s.AverageRating, TotalReviews = s.TotalReviews, TotalBookings = s.TotalBookings,
            DestinationName = s.Destination.Name, PartnerId = s.PartnerId, PartnerName = s.Partner.BusinessName,
            ApprovalStatus = s.ApprovalStatus, RejectionReason = s.RejectionReason,
            HasPendingChanges = s.ChangeRequests.Any(cr => cr.Status == ServiceApprovalStatus.Pending),
            IsActive = s.IsActive
        };

        private static double GetDistance(double lat1, double lng1, double lat2, double lng2)
        {
            const double R = 6371;
            var dLat = (lat2 - lat1) * Math.PI / 180;
            var dLng = (lng2 - lng1) * Math.PI / 180;
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) + Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
            return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        }
    }
}
