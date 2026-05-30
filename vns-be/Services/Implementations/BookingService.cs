using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using System.Text.Json;
using VNS.API.Data;
using VNS.API.Models.DTOs.Booking;
using VNS.API.Models.DTOs.Partner;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;
using VNS.API.Helpers;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public class BookingService : IBookingService
    {
        private readonly VNSDbContext _context;
        private readonly IVoucherService _voucherService;
        private readonly INotificationService _notificationService;
        private readonly IEmailService _emailService;
        private readonly ICommerceService _commerceService;

        public BookingService(
            VNSDbContext context,
            IVoucherService voucherService,
            INotificationService notificationService,
            IEmailService emailService,
            ICommerceService commerceService)
        {
            _context = context;
            _voucherService = voucherService;
            _notificationService = notificationService;
            _emailService = emailService;
            _commerceService = commerceService;
        }

        public async Task<ComboBookingQuoteDto> CreateComboQuoteAsync(Guid userId, CreateComboQuoteDto dto)
        {
            if (dto.ComboId == Guid.Empty)
                throw new BusinessException("Combo không hợp lệ.");
            if (dto.NumberOfGuests <= 0 && (dto.TierSelections == null || dto.TierSelections.Count == 0))
                throw new BusinessException("Số khách phải lớn hơn 0.");

            var effectiveGuests = dto.TierSelections.Count > 0
                ? dto.TierSelections.Sum(t => t.Quantity)
                : dto.NumberOfGuests;
            if (effectiveGuests <= 0)
                throw new BusinessException("Số khách phải lớn hơn 0.");

            var combo = await LoadComboForBookingAsync(dto.ComboId);
            if (combo == null || !combo.IsActive)
                throw new BusinessException("Combo is not available.");

            var orderedItems = combo.ComboItems.OrderBy(item => item.DisplayOrder).ToList();
            var readiness = ComboBundleHelper.EvaluateComboReadiness(
                orderedItems.Select(item => item.Service).ToList(),
                combo.DateDriver,
                combo.StayOffsetBeforeDays,
                combo.StayOffsetAfterDays,
                requireApproved: true);
            if (!readiness.IsEligible)
                throw new BusinessException(readiness.BlockingReasons.FirstOrDefault() ?? "Combo services are not available for booking.");

            var homestayItem = orderedItems.First(item => item.Service.ServiceType == ServiceType.Homestay);
            var tourItem = orderedItems.First(item => item.Service.ServiceType == ServiceType.Tour);

            ComboQuoteResolvedItem homestayResolved;
            ComboQuoteResolvedItem tourResolved;

            if (combo.DateDriver == ComboDateDriver.Stay)
            {
                if (!dto.CheckInDate.HasValue || !dto.CheckOutDate.HasValue)
                    throw new BusinessException("Stay-driven combos require check-in and check-out dates.");

                var checkIn = dto.CheckInDate.Value.Date;
                var checkOut = dto.CheckOutDate.Value.Date;
                if (checkIn < DateTime.UtcNow.Date)
                    throw new BusinessException("Stay dates cannot be in the past.");
                if (checkOut <= checkIn)
                    throw new BusinessException("Check-out date must be after check-in date.");

                homestayResolved = await ResolveComboHomestayQuoteItemAsync(homestayItem, effectiveGuests, checkIn, checkOut, dto.RoomId);
                tourResolved = ResolveComboTourQuoteItemForStay(tourItem, effectiveGuests, checkIn, checkOut, dto.TierSelections.Count > 0 ? dto.TierSelections : null);
            }
            else
            {
                if (!dto.TourScheduleId.HasValue)
                    throw new BusinessException("Tour-driven combos require a selected schedule.");

                tourResolved = ResolveComboTourQuoteItemForSchedule(tourItem, effectiveGuests, dto.TourScheduleId.Value, dto.TierSelections.Count > 0 ? dto.TierSelections : null);
                var computed = GetTourDrivenStayWindow(combo, homestayItem.Service, tourResolved.StartDate!.Value, tourResolved.EndDate!.Value);

                DateTime stayCheckIn;
                DateTime stayCheckOut;
                if (dto.CheckInDate.HasValue && dto.CheckOutDate.HasValue)
                {
                    stayCheckIn = dto.CheckInDate.Value.Date;
                    stayCheckOut = dto.CheckOutDate.Value.Date;
                    if (stayCheckIn > computed.CheckInDate)
                        throw new BusinessException($"Nhận phòng sớm nhất là {computed.CheckInDate:dd/MM/yyyy} theo cấu hình combo.");
                    if (stayCheckOut < computed.CheckOutDate)
                        throw new BusinessException($"Trả phòng trễ nhất là {computed.CheckOutDate:dd/MM/yyyy} theo cấu hình combo.");
                    if (stayCheckIn < DateTime.UtcNow.Date)
                        throw new BusinessException("Ngày nhận phòng không thể trong quá khứ.");
                    if (stayCheckOut <= stayCheckIn)
                        throw new BusinessException("Ngày trả phòng phải sau ngày nhận phòng.");
                }
                else
                {
                    stayCheckIn = computed.CheckInDate;
                    stayCheckOut = computed.CheckOutDate;
                }

                homestayResolved = await ResolveComboHomestayQuoteItemAsync(
                    homestayItem,
                    effectiveGuests,
                    stayCheckIn,
                    stayCheckOut,
                    dto.RoomId);
            }

            var originalAmount = homestayResolved.SubTotal + tourResolved.SubTotal;
            var comboDiscountAmount = ComboBundleHelper.CalculateDiscountAmount(combo.DiscountType, combo.DiscountValue, originalAmount);
            var finalAmount = Math.Max(0, originalAmount - comboDiscountAmount);

            var snapshots = new List<ComboQuoteSelectionSnapshot>
            {
                homestayResolved.ToSnapshot(),
                tourResolved.ToSnapshot(),
            };

            var quote = new ComboBookingQuote
            {
                Id = Guid.NewGuid(),
                ComboId = combo.Id,
                UserId = userId,
                DateDriver = combo.DateDriver,
                NumberOfGuests = effectiveGuests,
                TourScheduleId = tourResolved.TourScheduleId,
                CheckInDate = homestayResolved.CheckInDate,
                CheckOutDate = homestayResolved.CheckOutDate,
                OriginalAmount = originalAmount,
                ComboDiscountAmount = comboDiscountAmount,
                FinalAmount = finalAmount,
                ResolvedSelectionsJson = JsonSerializer.Serialize(snapshots),
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                CreatedAt = DateTime.UtcNow,
            };

            _context.ComboBookingQuotes.Add(quote);
            await _context.SaveChangesAsync();

            return new ComboBookingQuoteDto
            {
                QuoteId = quote.Id,
                ComboId = combo.Id,
                ComboName = combo.Name,
                DateDriver = combo.DateDriver,
                NumberOfGuests = effectiveGuests,
                CheckInDate = quote.CheckInDate,
                CheckOutDate = quote.CheckOutDate,
                TourScheduleId = quote.TourScheduleId,
                OriginalAmount = originalAmount,
                ComboDiscountAmount = comboDiscountAmount,
                FinalAmount = finalAmount,
                ExpiresAt = quote.ExpiresAt,
                Items = new List<ComboBookingQuoteItemDto>
                {
                    homestayResolved.ToDto(),
                    tourResolved.ToDto(),
                }
            };
        }

        public async Task<BookingDetailDto> CreateBookingAsync(Guid userId, CreateBookingDto dto)
        {
            // Fix #2: Wrap entire booking creation in a transaction to prevent race conditions
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var service = await _context.Services
                    .Include(s => s.Homestay).ThenInclude(h => h!.Rooms)
                    .Include(s => s.Tours).ThenInclude(t => t.TourSchedules).ThenInclude(ts => ts.PricingOverrides).ThenInclude(item => item.TourPricingTier)
                    .Include(s => s.Tours).ThenInclude(t => t.TourPricingTiers)
                    .FirstOrDefaultAsync(s => dto.ServiceId.HasValue && s.Id == dto.ServiceId.Value);

                if (!dto.ComboId.HasValue && service == null)
                    throw new BusinessException("Không tìm thấy dịch vụ");

                if (!dto.ComboId.HasValue && (!service!.IsActive || service.ApprovalStatus != ServiceApprovalStatus.Approved))
                    throw new BusinessException("Dịch vụ hiện không khả dụng");

                // Idempotency check: reject duplicate idempotencyKey
                if (!string.IsNullOrEmpty(dto.IdempotencyKey))
                {
                    var existingBooking = await _context.Bookings
                        .Where(b => b.IdempotencyKey == dto.IdempotencyKey && b.UserId == userId)
                        .FirstOrDefaultAsync();
                    if (existingBooking != null)
                        throw new BusinessException("Đơn đặt chỗ này đã được tạo trước đó.");
                }

                // Bug #9: Validate booking dates are not in the past
                if (dto.CheckInDate.HasValue && dto.CheckInDate.Value.Date < DateTime.UtcNow.Date)
                    throw new BusinessException("Ngày nhận phòng không thể trong quá khứ. Vui lòng chọn ngày từ hôm nay trở đi.");

                // Bug #10: Validate quantity > 0 for all details
                foreach (var d in dto.Details)
                {
                    if (d.Quantity <= 0)
                        throw new BusinessException("Số lượng phải lớn hơn 0.");
                }

                // Bug #11: Tour must have tourScheduleId (skip for combo bookings)
                foreach (var selection in dto.ComboSelections)
                {
                    if (selection.Quantity <= 0)
                        throw new BusinessException("Combo selection quantity must be greater than 0.");
                }

                var isComboBooking = dto.ComboId.HasValue;
                if (dto.ComboId.HasValue && !dto.ComboQuoteId.HasValue)
                    throw new BusinessException("Combo bookings must be created from a valid quote. Please refresh your combo selection.");

                if (dto.ComboId.HasValue)
                {
                    return await CreateComboBookingFromQuoteAsync(userId, dto, transaction);
                }
                if (service == null)
                    throw new BusinessException("KhĂ´ng tĂ¬m tháº¥y dá»‹ch vá»¥");
                if (!isComboBooking && service.ServiceType == ServiceType.Tour && service.Tours.Any(t => t.TourSchedules.Any()))
                {
                    if (!dto.Details.Any(d => d.TourScheduleId.HasValue))
                        throw new BusinessException("Vui lòng chọn lịch khởi hành cho tour.");
                }

                var schedulesById = service.Tours
                    .SelectMany(tour => tour.TourSchedules.Select(schedule => new { schedule, tour }))
                    .ToDictionary(item => item.schedule.Id, item => (Tour: item.tour, Schedule: item.schedule));
                var tourDetails = dto.Details.Where(detail => detail.TourScheduleId.HasValue).ToList();
                ValidateTourBooking(tourDetails, schedulesById);
                var scheduleQuantityUpdates = BuildScheduleQuantityUpdates(tourDetails, schedulesById);

                var roomDetails = dto.Details.Where(d => d.RoomId.HasValue && dto.CheckInDate.HasValue && dto.CheckOutDate.HasValue).ToList();
                var roomNights = dto.CheckInDate.HasValue && dto.CheckOutDate.HasValue
                    ? (int)(dto.CheckOutDate.Value.Date - dto.CheckInDate.Value.Date).TotalDays
                    : 0;

                decimal totalAmount = 0;
                var bookingDetails = new List<BookingDetail>();

                foreach (var detail in dto.Details)
                {
                    decimal unitPrice = 0;

                    if (detail.RoomId.HasValue)
                    {
                        var room = service.Homestay?.Rooms.FirstOrDefault(r => r.Id == detail.RoomId.Value);
                        if (room == null) throw new BusinessException("Không tìm thấy phòng");

                        if (room.MaxGuests > 0 && dto.NumberOfGuests > 0 && dto.NumberOfGuests / detail.Quantity > room.MaxGuests)
                            throw new BusinessException($"Phòng {room.Name} chỉ chứa tối đa {room.MaxGuests} khách mỗi phòng. Vui lòng giảm số lượng khách hoặc chọn thêm phòng.");

                        // Bug #6 & #7: Validate checkIn/checkOut dates
                        if (!dto.CheckInDate.HasValue || !dto.CheckOutDate.HasValue)
                            throw new BusinessException("Vui lòng nhập ngày nhận phòng và trả phòng.");
                        if (dto.CheckOutDate.Value.Date <= dto.CheckInDate.Value.Date)
                            throw new BusinessException("Ngày trả phòng phải sau ngày nhận phòng ít nhất 1 đêm.");

                        var checkIn = dto.CheckInDate.Value.Date;
                        var checkOut = dto.CheckOutDate.Value.Date;
                        var nights = (checkOut - checkIn).Days;

                        // Check Homestay-level availability range (AvailableFrom/AvailableTo)
                        var homestayForRoom = await _context.Homestays.FirstOrDefaultAsync(h => h.Id == room.HomestayId);
                        if (homestayForRoom != null && nights < homestayForRoom.MinNights)
                            throw new BusinessException($"Yêu cầu đặt tối thiểu {homestayForRoom.MinNights} đêm cho homestay này.");
                        if (homestayForRoom != null)
                        {
                            if (homestayForRoom.AvailableFrom.HasValue && checkIn < homestayForRoom.AvailableFrom.Value.Date)
                                throw new BusinessException($"Phòng chỉ khả dụng từ ngày {homestayForRoom.AvailableFrom.Value:dd/MM/yyyy}. Vui lòng chọn ngày khác.");
                            if (homestayForRoom.AvailableTo.HasValue && checkOut > homestayForRoom.AvailableTo.Value.Date)
                                throw new BusinessException($"Phòng chỉ khả dụng đến ngày {homestayForRoom.AvailableTo.Value:dd/MM/yyyy}. Vui lòng chọn ngày khác.");
                        }

                        // Bug #3, #4, #5, #8: Check RoomAvailabilities per-night
                        var roomAvailabilities = await _context.RoomAvailabilities
                            .Where(ra => ra.RoomId == detail.RoomId.Value
                                && ra.Date >= DateOnly.FromDateTime(checkIn)
                                && ra.Date < DateOnly.FromDateTime(checkOut))
                            .ToListAsync();
                        var holidayDates = (await _context.VietnamPublicHolidays
                            .Where(h => h.IsActive
                                && h.Date >= DateOnly.FromDateTime(checkIn)
                                && h.Date < DateOnly.FromDateTime(checkOut))
                            .Select(h => h.Date)
                            .ToListAsync())
                            .ToHashSet();

                        // Bug #5: If RoomAvailabilities exist for this room, ALL booked nights must have records
                        var hasAnyAvailability = await _context.RoomAvailabilities
                            .AnyAsync(ra => ra.RoomId == detail.RoomId.Value);
                        if (hasAnyAvailability)
                        {
                            for (var d = checkIn; d < checkOut; d = d.AddDays(1))
                            {
                                var dateOnly = DateOnly.FromDateTime(d);
                                var avail = roomAvailabilities.FirstOrDefault(ra => ra.Date == dateOnly);

                                // Bug #5: Night not in availability table → not available
                                if (avail == null)
                                    throw new BusinessException($"Phòng không khả dụng vào ngày {d:dd/MM/yyyy}. Vui lòng chọn ngày khác.");

                                // Bug #3: Check IsBlocked
                                if (avail.IsBlocked)
                                    throw new BusinessException($"Phòng đã bị chặn vào ngày {d:dd/MM/yyyy}. Vui lòng chọn ngày khác.");

                                // Bug #4: Check AvailableCount
                                if (avail.AvailableCount <= 0)
                                    throw new BusinessException($"Phòng đã hết vào ngày {d:dd/MM/yyyy}. Vui lòng chọn ngày khác.");

                                if (avail.AvailableCount < detail.Quantity)
                                    throw new BusinessException($"Chỉ còn {avail.AvailableCount} phòng vào ngày {d:dd/MM/yyyy}. Vui lòng giảm số lượng hoặc chọn ngày khác.");
                            }
                        }

                        // Check for overlapping room bookings to prevent double booking
                        var bookedQuantity = await _context.BookingDetails
                            .Include(bd => bd.Booking)
                            .Where(bd => bd.RoomId == detail.RoomId
                                && bd.Booking.Status != BookingStatus.Cancelled
                                && bd.Booking.Status != BookingStatus.Refunded
                                && bd.Booking.CheckInDate < dto.CheckOutDate
                                && bd.Booking.CheckOutDate > dto.CheckInDate)
                            .SumAsync(bd => (int?)bd.Quantity) ?? 0;
                        if (bookedQuantity + detail.Quantity > room.Quantity)
                            throw new BusinessException("Phòng đã hết trong khoảng thời gian này. Vui lòng chọn phòng khác hoặc ngày khác.");

                        // Bug #8: Per-night pricing with RoomAvailability PriceOverride support
                        decimal totalRoomPrice = 0;
                        for (var d = checkIn; d < checkOut; d = d.AddDays(1))
                        {
                            var dateOnly = DateOnly.FromDateTime(d);
                            var avail = roomAvailabilities.FirstOrDefault(ra => ra.Date == dateOnly);

                            // Bug #8: Use PriceOverride from RoomAvailability if set
                            if (avail?.PriceOverride.HasValue == true)
                            {
                                totalRoomPrice += avail.PriceOverride.Value;
                            }
                            else
                            {
                                if (holidayDates.Contains(dateOnly) && room.HolidayPrice.HasValue)
                                {
                                    totalRoomPrice += room.HolidayPrice.Value;
                                    continue;
                                }

                                // Weekend pricing fallback
                                totalRoomPrice += (d.DayOfWeek == DayOfWeek.Saturday || d.DayOfWeek == DayOfWeek.Sunday)
                                    ? (room.WeekendPrice ?? room.BasePrice) : room.BasePrice;
                            }
                        }
                        unitPrice = totalRoomPrice;
                    }
                    else if (detail.TourScheduleId.HasValue)
                    {
                        if (!schedulesById.TryGetValue(detail.TourScheduleId.Value, out var scheduleEntry))
                            throw new BusinessException("Không tìm thấy lịch tour");

                        var schedule = scheduleEntry.Schedule;
                        var tourPackage = scheduleEntry.Tour;
                        if (schedule.Status != TourScheduleStatus.Active)
                            throw new BusinessException("Lịch tour không còn khả dụng");

                        if (schedule.StartDate <= DateTime.UtcNow)
                            throw new BusinessException("Lịch khởi hành đã qua. Vui lòng chọn lịch khác.");

                        if (tourPackage.BookingCutoffHours > 0 && schedule.StartDate <= DateTime.UtcNow.AddHours(tourPackage.BookingCutoffHours))
                            throw new BusinessException($"Tour cần đặt trước {tourPackage.BookingCutoffHours} giờ so với giờ khởi hành. Vui lòng chọn lịch khác.");

                        // Fix #2: Atomic slot check removed from here, will use raw SQL below

                        if (detail.TourPricingTierId.HasValue)
                        {
                            var tier = tourPackage.TourPricingTiers
                                .FirstOrDefault(item => item.Id == detail.TourPricingTierId.Value);
                            if (tier == null)
                                throw new BusinessException("Không tìm thấy mức giá đã chọn cho gói tour.");
                            unitPrice = ResolveTourScheduleTierPrice(schedule, tier, service.BasePrice);
                        }
                        else
                        {
                            unitPrice = ResolveLowestTourSchedulePrice(schedule, service.BasePrice);
                        }
                    }
                    else
                    {
                        unitPrice = service.BasePrice;
                    }

                    // Fix #11: For rooms, unitPrice is already the total for all nights, so quantity=1 for rooms
                    var subTotal = detail.RoomId.HasValue ? unitPrice * detail.Quantity : unitPrice * detail.Quantity;
                    totalAmount += subTotal;

                    bookingDetails.Add(new BookingDetail
                    {
                        Id = Guid.NewGuid(),
                        RoomId = detail.RoomId,
                        TourScheduleId = detail.TourScheduleId,
                        TourPricingTierId = detail.TourPricingTierId,
                        Quantity = detail.Quantity,
                        UnitPrice = unitPrice,
                        SubTotal = subTotal
                    });
                }

                if (!dto.Details.Any())
                {
                    totalAmount = service.BasePrice * dto.NumberOfGuests;
                    bookingDetails.Add(new BookingDetail
                    {
                        Id = Guid.NewGuid(),
                        Quantity = dto.NumberOfGuests,
                        UnitPrice = service.BasePrice,
                        SubTotal = totalAmount
                    });
                }
                decimal discountAmount = 0;
                Guid? voucherId = null;

                if (!string.IsNullOrEmpty(dto.VoucherCode))
                {
                    var voucherServiceType = isComboBooking ? ServiceType.Combo : service.ServiceType;
                    var voucher = await _voucherService.ValidateVoucherAsync(dto.VoucherCode, userId, totalAmount, voucherServiceType);
                    if (voucher != null)
                    {
                        discountAmount = await _voucherService.CalculateDiscountAsync(voucher, totalAmount);
                        voucherId = voucher.Id;
                    }
                }

                var finalAmount = totalAmount - discountAmount;
                if (finalAmount < 0) finalAmount = 0;

                if (dto.CheckInDate == null && tourDetails.Any())
                {
                    var firstScheduleId = tourDetails.First().TourScheduleId!.Value;
                    if (schedulesById.TryGetValue(firstScheduleId, out var scheduleEntry))
                    {
                        dto.CheckInDate = scheduleEntry.Schedule.StartDate;
                        dto.CheckOutDate = scheduleEntry.Schedule.EndDate;
                    }
                }

                var scheduleRunAssignments = tourDetails.Any()
                    ? await AssignRunsToSchedulesAsync(scheduleQuantityUpdates, schedulesById)
                    : new Dictionary<Guid, AssignedScheduleRunInfo>();

                foreach (var detail in bookingDetails.Where(item => item.TourScheduleId.HasValue))
                {
                    if (scheduleRunAssignments.TryGetValue(detail.TourScheduleId!.Value, out var assignment))
                        detail.TourScheduleRunId = assignment.RunId;
                }
                scheduleQuantityUpdates.Clear();

                var bookingCode = $"VNS{DateTime.UtcNow:yyyyMMddHHmmss}{Guid.NewGuid():N}"[..30];
                var booking = new Booking
                {
                    Id = Guid.NewGuid(),
                    BookingCode = bookingCode,
                    UserId = userId,
                    ServiceId = service.Id,
                    PartnerId = service.PartnerId,
                    Status = BookingStatus.Pending,
                    CommercialStatus = BookingCommercialStatus.PendingPayment,
                    FulfillmentStatus = BookingFulfillmentStatus.AwaitingPartner,
                    TotalAmount = totalAmount,
                    DiscountAmount = discountAmount,
                    FinalAmount = finalAmount,
                    VoucherId = voucherId,
                    ComboId = dto.ComboId,
                    ComboName = dto.ComboName,
                    NumberOfGuests = dto.NumberOfGuests,
                    SpecialRequests = dto.SpecialRequests,
                    ContactName = dto.ContactName,
                    ContactPhone = dto.ContactPhone,
                    ContactEmail = dto.ContactEmail,
                    IdempotencyKey = string.IsNullOrEmpty(dto.IdempotencyKey) ? null : dto.IdempotencyKey,
                    CheckInDate = dto.CheckInDate,
                    CheckOutDate = dto.CheckOutDate,
                    BookingDate = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(30),
                    CreatedAt = DateTime.UtcNow
                };

                _context.Bookings.Add(booking);

                foreach (var detail in bookingDetails)
                {
                    detail.BookingId = booking.Id;
                    _context.BookingDetails.Add(detail);
                }

                var payment = new Payment
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    Amount = finalAmount,
                    PaymentMethod = dto.PaymentMethod,
                    PaymentStatus = PaymentStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                };
                _context.Payments.Add(payment);

                if (voucherId.HasValue)
                {
                    _context.VoucherUsages.Add(new VoucherUsage
                    {
                        Id = Guid.NewGuid(),
                        VoucherId = voucherId.Value,
                        UserId = userId,
                        BookingId = booking.Id,
                        DiscountAmount = discountAmount,
                        UsedAt = DateTime.UtcNow
                    });

                    var voucher = await _context.Vouchers.FindAsync(voucherId.Value);
                    if (voucher != null)
                    {
                        voucher.UsedCount++;
                    }
                }

                service.TotalBookings++;

                // Fix #2: Use raw SQL for atomic tour slot update to prevent race condition
                foreach (var scheduleUpdate in scheduleQuantityUpdates)
                {
                    var updated = await _context.Database.ExecuteSqlRawAsync(
                        "UPDATE TourSchedules SET BookedSlots = BookedSlots + {0} WHERE Id = {1} AND BookedSlots + {0} <= ((CASE WHEN RunCount < 1 THEN 1 ELSE RunCount END) * AvailableSlots)",
                        scheduleUpdate.Quantity, scheduleUpdate.ScheduleId);
                    if (updated == 0)
                    {
                        var schedule = await _context.TourSchedules.FindAsync(scheduleUpdate.ScheduleId);
                        var remaining = schedule != null ? GetScheduleRemainingCapacity(schedule) : 0;
                        throw new BusinessException(
                            remaining > 0
                                ? $"Tour này chỉ còn {remaining} chỗ trống. Bạn đang đặt {scheduleUpdate.Quantity} khách. Vui lòng giảm số lượng hoặc chọn lịch khác."
                                : "Tour này đã hết chỗ. Vui lòng chọn lịch khác.");
                    }

                    await _context.Database.ExecuteSqlRawAsync(
                        "UPDATE TourSchedules SET Status = {0} WHERE Id = {1} AND BookedSlots >= ((CASE WHEN RunCount < 1 THEN 1 ELSE RunCount END) * AvailableSlots)",
                        (int)TourScheduleStatus.Full, scheduleUpdate.ScheduleId);
                }

                // Atomic room availability decrement per night to prevent overbooking
                if (roomDetails.Any() && dto.CheckInDate.HasValue && dto.CheckOutDate.HasValue && roomNights > 0)
                {
                    var checkInDate = dto.CheckInDate.Value.Date;
                    var checkOutDate = dto.CheckOutDate.Value.Date;
                    var roomQuantityUpdates = roomDetails
                        .GroupBy(d => d.RoomId!.Value)
                        .Select(g => new { RoomId = g.Key, Quantity = g.Sum(d => d.Quantity) })
                        .ToList();

                    foreach (var ru in roomQuantityUpdates)
                    {
                        var updated = await _context.Database.ExecuteSqlRawAsync(
                            "UPDATE RoomAvailabilities SET AvailableCount = AvailableCount - {0} " +
                            "WHERE RoomId = {1} AND Date >= {2} AND Date < {3} AND AvailableCount >= {0}",
                            ru.Quantity, ru.RoomId, (object)checkInDate, (object)checkOutDate);

                        if (updated != roomNights)
                        {
                            // Rollback any partial decrements for this room
                            await _context.Database.ExecuteSqlRawAsync(
                                "UPDATE RoomAvailabilities SET AvailableCount = AvailableCount + {0} " +
                                "WHERE RoomId = {1} AND Date >= {2} AND Date < {3} AND AvailableCount + {0} <= (SELECT Quantity FROM Rooms WHERE Id = {1})",
                                ru.Quantity, ru.RoomId, (object)checkInDate, (object)checkOutDate);
                            throw new BusinessException("Phòng đã có người đặt trong khoảng thời gian này. Vui lòng chọn phòng khác hoặc ngày khác.");
                        }
                    }
                }

                await _context.SaveChangesAsync();
                await _commerceService.EnsureBookingArtifactsAsync(booking, service);

                await transaction.CommitAsync();

                var partnerUser = await _context.Users.FirstOrDefaultAsync(u => _context.Partners.Any(p => p.UserId == u.Id && p.Id == service.PartnerId));
                if (partnerUser != null)
                {
                    await _notificationService.SendNotificationAsync(
                        partnerUser.Id,
                        "Đặt chỗ mới",
                        $"Bạn có đặt chỗ mới #{bookingCode} cho dịch vụ {service.Name}",
                        NotificationType.BookingConfirmed,
                        booking.Id
                    );
                }

                _context.ChangeTracker.Clear();
                return await GetBookingByIdAsync(userId, booking.Id);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        private async Task<BookingDetailDto> CreateComboBookingFromQuoteAsync(
            Guid userId,
            CreateBookingDto dto,
            IDbContextTransaction transaction)
        {
            var quoteId = dto.ComboQuoteId!.Value;
            var comboId = dto.ComboId!.Value;
            var quote = await _context.ComboBookingQuotes
                .Include(item => item.Combo)
                .FirstOrDefaultAsync(item => item.Id == quoteId && item.UserId == userId && item.ComboId == comboId);

            if (quote == null)
                throw new BusinessException("Combo quote was not found.");
            if (quote.ExpiresAt <= DateTime.UtcNow)
                throw new BusinessException("Combo quote has expired. Please refresh your combo selection.");
            if (quote.NumberOfGuests != dto.NumberOfGuests)
                throw new BusinessException("Guest count changed. Please refresh your combo selection.");

            var snapshots = JsonSerializer.Deserialize<List<ComboQuoteSelectionSnapshot>>(quote.ResolvedSelectionsJson)
                ?? new List<ComboQuoteSelectionSnapshot>();
            if (snapshots.Count == 0)
                throw new BusinessException("Combo quote is missing resolved items.");

            dto.CheckInDate = quote.CheckInDate;
            dto.CheckOutDate = quote.CheckOutDate;
            dto.ComboSelections = snapshots
                .Select(item => new ComboBookingSelectionDto
                {
                    ComboItemId = item.ComboItemId,
                    ServiceId = item.ServiceId,
                    RoomId = item.RoomId,
                    TourScheduleId = item.TourScheduleId,
                    TourPricingTierId = item.TourPricingTierId,
                    CheckInDate = item.CheckInDate,
                    CheckOutDate = item.CheckOutDate,
                    Quantity = item.Quantity,
                })
                .ToList();

            return await CreateComboBookingAsync(userId, dto, transaction);
        }

        private async Task<Combo?> LoadComboForBookingAsync(Guid comboId)
        {
            return await _context.Combos
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Homestay)
                            .ThenInclude(h => h!.Rooms)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Tours)
                            .ThenInclude(t => t.TourSchedules)
                                .ThenInclude(ts => ts.PricingOverrides)
                                    .ThenInclude(item => item.TourPricingTier)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Tours)
                            .ThenInclude(t => t.TourPricingTiers)
                .FirstOrDefaultAsync(c => c.Id == comboId);
        }

        private async Task<ComboQuoteResolvedItem> ResolveComboHomestayQuoteItemAsync(
            ComboItem comboItem,
            int numberOfGuests,
            DateTime checkIn,
            DateTime checkOut,
            Guid? roomId = null)
        {
            var service = comboItem.Service;
            var homestay = service.Homestay ?? throw new BusinessException("Combo homestay is missing.");
            var nights = (checkOut - checkIn).Days;
            if (nights < 1)
                throw new BusinessException("Stay must be at least one night.");
            if (nights < homestay.MinNights)
                throw new BusinessException($"Service '{service.Name}' requires at least {homestay.MinNights} nights.");
            if (homestay.MaxNights > 0 && nights > homestay.MaxNights)
                throw new BusinessException($"Service '{service.Name}' only allows up to {homestay.MaxNights} nights.");
            if (homestay.AvailableFrom.HasValue && checkIn < homestay.AvailableFrom.Value.Date)
                throw new BusinessException($"Service '{service.Name}' is not available before {homestay.AvailableFrom.Value:dd/MM/yyyy}.");
            if (homestay.AvailableTo.HasValue && checkOut > homestay.AvailableTo.Value.Date)
                throw new BusinessException($"Service '{service.Name}' is not available after {homestay.AvailableTo.Value:dd/MM/yyyy}.");

            var candidateRooms = service.Homestay.Rooms
                .Where(room => room.IsActive)
                .OrderByDescending(room => roomId.HasValue && room.Id == roomId.Value)
                .ThenByDescending(room => comboItem.PreferredRoomId.HasValue && room.Id == comboItem.PreferredRoomId.Value)
                .ThenBy(room => room.BasePrice)
                .ThenByDescending(room => room.MaxGuests)
                .ThenBy(room => room.Id)
                .ToList();

            if (!candidateRooms.Any())
                throw new BusinessException($"Service '{service.Name}' does not have any active rooms.");

            ComboQuoteResolvedItem? selected = null;
            foreach (var room in candidateRooms)
            {
                var requiredRooms = Math.Max(1, room.MaxGuests > 0
                    ? (int)Math.Ceiling(numberOfGuests / (decimal)room.MaxGuests)
                    : 1);
                var roomResult = await TryResolveRoomStayAsync(service, room, checkIn, checkOut, requiredRooms);
                if (roomResult == null)
                    continue;

                selected = new ComboQuoteResolvedItem
                {
                    ComboItemId = comboItem.Id,
                    ServiceId = service.Id,
                    ServiceName = service.Name,
                    ServiceType = service.ServiceType,
                    RoomId = room.Id,
                    RoomName = room.Name,
                    CheckInDate = checkIn,
                    CheckOutDate = checkOut,
                    StartDate = checkIn,
                    EndDate = checkOut,
                    Quantity = requiredRooms,
                    UnitPrice = roomResult.Value.UnitPricePerRoomStay,
                    SubTotal = roomResult.Value.SubTotal,
                };
                break;
            }

            if (selected == null)
                throw new BusinessException($"No room in '{service.Name}' is available for the selected stay.");

            return selected;
        }

        private sealed class ComboTourQuoteAttempt
        {
            public ComboQuoteResolvedItem? ResolvedItem { get; set; }
            public string? FailureMessage { get; set; }
        }

        private ComboQuoteResolvedItem ResolveComboTourQuoteItemForStay(
            ComboItem comboItem,
            int numberOfGuests,
            DateTime checkIn,
            DateTime checkOut,
            List<ComboQuoteTierSelectionDto>? tierSelections = null)
        {
            var service = comboItem.Service;
            var futureSchedules = service.Tours
                .SelectMany(tour => tour.TourSchedules.Select(schedule => new { Tour = tour, Schedule = schedule }))
                .Where(item => item.Schedule.Status == TourScheduleStatus.Active)
                .Where(item => item.Schedule.StartDate > DateTime.UtcNow)
                .Where(item => !(item.Tour.BookingCutoffHours > 0 && item.Schedule.StartDate <= DateTime.UtcNow.AddHours(item.Tour.BookingCutoffHours)))
                .ToList();

            var candidates = futureSchedules
                .Where(item => item.Schedule.StartDate.Date >= checkIn && item.Schedule.EndDate.Date <= checkOut)
                .OrderByDescending(item => comboItem.PreferredTourPricingTierId.HasValue &&
                    item.Tour.TourPricingTiers.Any(tier => tier.Id == comboItem.PreferredTourPricingTierId.Value))
                .ThenBy(item => item.Schedule.StartDate)
                .ToList();

            if (!candidates.Any())
            {
                var dateRanges = futureSchedules
                    .OrderBy(item => item.Schedule.StartDate)
                    .Take(5)
                    .Select(item => $"{item.Schedule.StartDate:dd/MM} - {item.Schedule.EndDate:dd/MM}")
                    .ToList();

                var stayWindowOverlap = futureSchedules.Any(item =>
                    item.Schedule.StartDate.Date >= checkIn
                    && item.Schedule.StartDate.Date < checkOut
                    && item.Schedule.EndDate.Date > checkOut);

                if (stayWindowOverlap)
                {
                    throw new BusinessException(
                        $"Tour '{service.Name}' có lịch khởi hành nằm trong khoảng ở nhưng kết thúc sau ngày trả phòng. " +
                        $"Vui lòng kéo dài kỳ nghỉ hoặc chọn ngày khác. " +
                        $"Các lịch có sẵn: {string.Join("; ", dateRanges)}.");
                }

                throw new BusinessException(
                    $"Không tìm thấy lịch tour '{service.Name}' phù hợp trong khoảng ngày đã chọn. " +
                    $"Vui lòng chọn khoảng ngày khác. Các lịch có sẵn: {string.Join("; ", dateRanges)}.");
            }

            string? failureMessage = null;

            foreach (var candidate in candidates)
            {
                var attempt = tierSelections != null && tierSelections.Count > 0
                    ? TryResolveTourQuoteItem(comboItem, candidate.Tour, candidate.Schedule, tierSelections)
                    : TryResolveTourQuoteItem(comboItem, candidate.Tour, candidate.Schedule, numberOfGuests);
                if (attempt.ResolvedItem != null)
                    return attempt.ResolvedItem;
                failureMessage ??= attempt.FailureMessage;
            }

            throw new BusinessException(failureMessage ?? $"Tour '{service.Name}' không đáp ứng được yêu cầu đặt cho khoảng ngày hiện tại.");
        }

        private ComboQuoteResolvedItem ResolveComboTourQuoteItemForSchedule(
            ComboItem comboItem,
            int numberOfGuests,
            Guid scheduleId,
            List<ComboQuoteTierSelectionDto>? tierSelections = null)
        {
            var service = comboItem.Service;
            var match = service.Tours
                .SelectMany(tour => tour.TourSchedules.Select(schedule => new { Tour = tour, Schedule = schedule }))
                .FirstOrDefault(item => item.Schedule.Id == scheduleId);

            if (match == null)
                throw new BusinessException("Selected tour schedule does not belong to this combo.");

            var attempt = tierSelections != null && tierSelections.Count > 0
                ? TryResolveTourQuoteItem(comboItem, match.Tour, match.Schedule, tierSelections)
                : TryResolveTourQuoteItem(comboItem, match.Tour, match.Schedule, numberOfGuests);
            if (attempt.ResolvedItem == null)
                throw new BusinessException(attempt.FailureMessage ?? "Selected tour schedule is no longer available.");

            return attempt.ResolvedItem;
        }

        private ComboTourQuoteAttempt TryResolveTourQuoteItem(
            ComboItem comboItem,
            Tour tour,
            TourSchedule schedule,
            int numberOfGuests)
        {
            return TryResolveTourQuoteItemCore(comboItem, tour, schedule, numberOfGuests, null);
        }

        private ComboTourQuoteAttempt TryResolveTourQuoteItem(
            ComboItem comboItem,
            Tour tour,
            TourSchedule schedule,
            List<ComboQuoteTierSelectionDto> tierSelections)
        {
            var totalGuests = tierSelections.Sum(t => t.Quantity);
            return TryResolveTourQuoteItemCore(comboItem, tour, schedule, totalGuests, tierSelections);
        }

        private ComboTourQuoteAttempt TryResolveTourQuoteItemCore(
            ComboItem comboItem,
            Tour tour,
            TourSchedule schedule,
            int numberOfGuests,
            List<ComboQuoteTierSelectionDto>? tierSelections)
        {
            if (schedule.Status != TourScheduleStatus.Active)
            {
                return new ComboTourQuoteAttempt
                {
                    FailureMessage = $"Tour '{comboItem.Service.Name}' không còn hoạt động.",
                };
            }
            if (schedule.StartDate <= DateTime.UtcNow)
            {
                return new ComboTourQuoteAttempt
                {
                    FailureMessage = $"Tour '{comboItem.Service.Name}' đã khởi hành ({schedule.StartDate:dd/MM/yyyy HH:mm}).",
                };
            }
            if (tour.BookingCutoffHours > 0 && schedule.StartDate <= DateTime.UtcNow.AddHours(tour.BookingCutoffHours))
            {
                var deadline = schedule.StartDate.AddHours(-tour.BookingCutoffHours);
                return new ComboTourQuoteAttempt
                {
                    FailureMessage = $"Tour '{comboItem.Service.Name}' khởi hành lúc {schedule.StartDate:dd/MM/yyyy HH:mm}, " +
                        $"cần đặt trước {tour.BookingCutoffHours}h (hạn đặt: {deadline:dd/MM/yyyy HH:mm}). " +
                        $"Hiện tại đã quá hạn đặt cho lịch này. Vui lòng chọn lịch khởi hành khác.",
                };
            }
            if (GetScheduleRemainingCapacity(schedule) < numberOfGuests)
            {
                return new ComboTourQuoteAttempt
                {
                    FailureMessage = $"Tour '{comboItem.Service.Name}' không đủ chỗ cho {numberOfGuests} khách (còn {GetScheduleRemainingCapacity(schedule)} chỗ).",
                };
            }

            decimal subTotal = 0;
            decimal unitPrice = 0;
            TourPricingTier? selectedTier = null;
            string? tierNames = null;

            if (tierSelections != null && tierSelections.Count > 0)
            {
                var tierMap = tour.TourPricingTiers.ToDictionary(t => t.Id);
                foreach (var selection in tierSelections)
                {
                    if (!tierMap.TryGetValue(selection.TourPricingTierId, out var tier))
                    {
                        return new ComboTourQuoteAttempt
                        {
                            FailureMessage = $"Khung giá '{selection.TourPricingTierId}' không thuộc gói tour này.",
                        };
                    }
                    if (selection.Quantity < tier.MinQuantity)
                    {
                        return new ComboTourQuoteAttempt
                        {
                            FailureMessage = $"'{tier.Name}' yêu cầu tối thiểu {tier.MinQuantity} người.",
                        };
                    }
                    if (tier.MaxQuantity > 0 && selection.Quantity > tier.MaxQuantity)
                    {
                        return new ComboTourQuoteAttempt
                        {
                            FailureMessage = $"'{tier.Name}' chỉ chấp nhận tối đa {tier.MaxQuantity} người.",
                        };
                    }
                    var tierPrice = ResolveTourScheduleTierPrice(schedule, tier, comboItem.Service.BasePrice);
                    subTotal += tierPrice * selection.Quantity;
                    selectedTier ??= tier;
                    tierNames = tierNames == null ? tier.Name : $"{tierNames}, {tier.Name}";
                }
                unitPrice = numberOfGuests > 0 ? subTotal / numberOfGuests : 0;
            }
            else
            {
                if (tour.TourPricingTiers.Any())
                {
                    selectedTier = ResolvePreferredTourTier(comboItem, tour, schedule);
                    if (selectedTier == null)
                    {
                        return new ComboTourQuoteAttempt
                        {
                            FailureMessage = $"Tour '{comboItem.Service.Name}' không có khung giá phù hợp cho lịch khởi hành này.",
                        };
                    }
                    unitPrice = ResolveTourScheduleTierPrice(schedule, selectedTier, comboItem.Service.BasePrice);
                }
                else
                {
                    unitPrice = ResolveLowestTourSchedulePrice(schedule, comboItem.Service.BasePrice);
                }
                subTotal = unitPrice * numberOfGuests;
            }

            if (subTotal <= 0)
            {
                return new ComboTourQuoteAttempt
                {
                    FailureMessage = $"'{comboItem.Service.Name}' does not currently have a valid price for this departure.",
                };
            }

            return new ComboTourQuoteAttempt
            {
                ResolvedItem = new ComboQuoteResolvedItem
                {
                    ComboItemId = comboItem.Id,
                    ServiceId = comboItem.ServiceId,
                    ServiceName = comboItem.Service.Name,
                    ServiceType = comboItem.Service.ServiceType,
                    TourScheduleId = schedule.Id,
                    TourPricingTierId = selectedTier?.Id,
                    TourPricingTierName = tierNames ?? selectedTier?.Name,
                    StartDate = schedule.StartDate,
                    EndDate = schedule.EndDate,
                    Quantity = numberOfGuests,
                    UnitPrice = unitPrice,
                    SubTotal = subTotal,
                }
            };
        }

        private TourPricingTier? ResolvePreferredTourTier(ComboItem comboItem, Tour tour, TourSchedule schedule)
        {
            var tiers = tour.TourPricingTiers
                .OrderBy(tier => tier.DisplayOrder)
                .ThenBy(tier => ResolveTourScheduleTierPrice(schedule, tier, comboItem.Service.BasePrice))
                .ThenBy(tier => tier.Id)
                .ToList();

            if (!tiers.Any())
                return null;

            if (comboItem.PreferredTourPricingTierId.HasValue)
            {
                var preferred = tiers.FirstOrDefault(tier => tier.Id == comboItem.PreferredTourPricingTierId.Value);
                if (preferred != null)
                    return preferred;
            }

            return tiers.First();
        }

        private (DateTime CheckInDate, DateTime CheckOutDate) GetTourDrivenStayWindow(
            Combo combo,
            Service homestayService,
            DateTime scheduleStart,
            DateTime scheduleEnd)
        {
            var homestay = homestayService.Homestay ?? throw new BusinessException("Combo homestay is missing.");
            var checkIn = scheduleStart.Date.AddDays(-combo.StayOffsetBeforeDays);
            var checkOut = scheduleEnd.Date.AddDays(combo.StayOffsetAfterDays + 1);
            var nights = (checkOut - checkIn).Days;

            if (nights < homestay.MinNights)
                throw new BusinessException($"Combo configuration does not satisfy the minimum stay for '{homestayService.Name}'.");

            return (checkIn, checkOut);
        }

        private async Task<(decimal UnitPricePerRoomStay, decimal SubTotal)?> TryResolveRoomStayAsync(
            Service service,
            Room room,
            DateTime checkIn,
            DateTime checkOut,
            int quantity)
        {
            var roomAvailabilities = await _context.RoomAvailabilities
                .Where(ra => ra.RoomId == room.Id
                    && ra.Date >= DateOnly.FromDateTime(checkIn)
                    && ra.Date < DateOnly.FromDateTime(checkOut))
                .ToListAsync();
            var holidayDates = (await _context.VietnamPublicHolidays
                .Where(h => h.IsActive
                    && h.Date >= DateOnly.FromDateTime(checkIn)
                    && h.Date < DateOnly.FromDateTime(checkOut))
                .Select(h => h.Date)
                .ToListAsync())
                .ToHashSet();

            var hasAnyAvailability = await _context.RoomAvailabilities.AnyAsync(ra => ra.RoomId == room.Id);
            if (hasAnyAvailability)
            {
                for (var date = checkIn; date < checkOut; date = date.AddDays(1))
                {
                    var dateOnly = DateOnly.FromDateTime(date);
                    var availability = roomAvailabilities.FirstOrDefault(ra => ra.Date == dateOnly);
                    if (availability == null || availability.IsBlocked || availability.AvailableCount < quantity)
                        return null;
                }
            }

            var directBookedQuantity = await _context.BookingDetails
                .Include(bd => bd.Booking)
                .Where(bd => bd.RoomId == room.Id
                    && bd.Booking.Status != BookingStatus.Cancelled
                    && bd.Booking.Status != BookingStatus.Refunded
                    && bd.Booking.CheckInDate < checkOut
                    && bd.Booking.CheckOutDate > checkIn)
                .SumAsync(bd => (int?)bd.Quantity) ?? 0;
            var comboBookedQuantity = await _context.ComboBookingItems
                .Include(cbi => cbi.Booking)
                .Where(cbi => cbi.RoomId == room.Id
                    && cbi.CheckInDate.HasValue
                    && cbi.CheckOutDate.HasValue
                    && cbi.Booking.Status != BookingStatus.Cancelled
                    && cbi.Booking.Status != BookingStatus.Refunded
                    && cbi.CheckInDate < checkOut
                    && cbi.CheckOutDate > checkIn)
                .SumAsync(cbi => (int?)cbi.Quantity) ?? 0;

            if (directBookedQuantity + comboBookedQuantity + quantity > room.Quantity)
                return null;

            decimal totalRoomPrice = 0;
            for (var date = checkIn; date < checkOut; date = date.AddDays(1))
            {
                var dateOnly = DateOnly.FromDateTime(date);
                var availability = roomAvailabilities.FirstOrDefault(ra => ra.Date == dateOnly);
                if (availability?.PriceOverride.HasValue == true)
                {
                    totalRoomPrice += availability.PriceOverride.Value;
                }
                else if (holidayDates.Contains(dateOnly) && room.HolidayPrice.HasValue)
                {
                    totalRoomPrice += room.HolidayPrice.Value;
                }
                else
                {
                    totalRoomPrice += (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                        ? (room.WeekendPrice ?? room.BasePrice)
                        : room.BasePrice;
                }
            }

            return (totalRoomPrice, totalRoomPrice * quantity);
        }

        private async Task<BookingDetailDto> CreateComboBookingAsync(
            Guid userId,
            CreateBookingDto dto,
            IDbContextTransaction transaction)
        {
            var comboId = dto.ComboId!.Value;
            var combo = await _context.Combos
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Homestay)
                            .ThenInclude(h => h!.Rooms)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Tours)
                            .ThenInclude(t => t.TourSchedules)
                                .ThenInclude(ts => ts.PricingOverrides)
                                    .ThenInclude(item => item.TourPricingTier)
                .Include(c => c.ComboItems)
                    .ThenInclude(ci => ci.Service)
                        .ThenInclude(s => s.Tours)
                            .ThenInclude(t => t.TourPricingTiers)
                .FirstOrDefaultAsync(c => c.Id == comboId);

            if (combo == null || !combo.IsActive)
                throw new BusinessException("Combo is not available.");

            var comboItems = combo.ComboItems
                .OrderBy(ci => ci.DisplayOrder)
                .ToList();
            if (!comboItems.Any())
                throw new BusinessException("Combo does not contain any services.");

            var readiness = ComboBundleHelper.EvaluateComboReadiness(
                comboItems.Select(item => item.Service).ToList(),
                combo.DateDriver,
                combo.StayOffsetBeforeDays,
                combo.StayOffsetAfterDays,
                requireApproved: true);
            if (!readiness.IsEligible)
                throw new BusinessException(readiness.BlockingReasons.FirstOrDefault() ?? "Combo services are not available for booking.");

            if (!dto.ComboSelections.Any())
                throw new BusinessException("Combo selections are required.");

            var resolvedSelections = new List<(ComboBookingSelectionDto Selection, ComboItem ComboItem, Service Service)>();
            foreach (var selection in dto.ComboSelections)
            {
                ComboItem? comboItem = null;
                if (selection.ComboItemId.HasValue)
                    comboItem = comboItems.FirstOrDefault(ci => ci.Id == selection.ComboItemId.Value);
                else
                    comboItem = comboItems.FirstOrDefault(ci => ci.ServiceId == selection.ServiceId);

                if (comboItem == null)
                    throw new BusinessException("Selected combo item does not belong to this combo.");
                if (comboItem.ServiceId != selection.ServiceId)
                    throw new BusinessException("Combo selection service does not match the selected combo item.");

                resolvedSelections.Add((selection, comboItem, comboItem.Service));
            }

            var selectionsByComboItem = resolvedSelections
                .GroupBy(item => item.ComboItem.Id)
                .ToDictionary(group => group.Key, group => group.ToList());

            foreach (var comboItem in comboItems)
            {
                if (!selectionsByComboItem.TryGetValue(comboItem.Id, out var itemSelections) || itemSelections.Count != 1)
                    throw new BusinessException($"Combo item '{comboItem.Service.Name}' requires exactly one selection.");
            }

            var comboBookingItems = new List<ComboBookingItem>();
            var scheduleQuantityUpdates = new List<(Guid ScheduleId, int Quantity)>();
            var comboSchedulesById = comboItems
                .SelectMany(item => item.Service.Tours
                    .SelectMany(tour => tour.TourSchedules.Select(schedule => new { schedule, tour })))
                .GroupBy(item => item.schedule.Id)
                .ToDictionary(group => group.Key, group => (Tour: group.First().tour, Schedule: group.First().schedule));
            var roomQuantityUpdates = new List<(Guid RoomId, DateTime CheckInDate, DateTime CheckOutDate, int Quantity)>();
            var componentStarts = new List<DateTime>();
            var componentEnds = new List<DateTime>();
            var servicesToIncrement = new Dictionary<Guid, Service>();
            decimal originalTotal = 0;

            foreach (var comboItem in comboItems)
            {
                var selection = selectionsByComboItem[comboItem.Id][0].Selection;
                var service = comboItem.Service;
                servicesToIncrement[service.Id] = service;

                if (service.ServiceType == ServiceType.Homestay)
                {
                    if (!selection.RoomId.HasValue || !selection.CheckInDate.HasValue || !selection.CheckOutDate.HasValue)
                        throw new BusinessException("Homestay combo items require room and stay dates.");

                    var room = service.Homestay?.Rooms.FirstOrDefault(r => r.Id == selection.RoomId.Value);
                    if (room == null)
                        throw new BusinessException("Room selection does not belong to the selected combo service.");

                    var checkIn = selection.CheckInDate.Value.Date;
                    var checkOut = selection.CheckOutDate.Value.Date;
                    if (checkIn < DateTime.UtcNow.Date)
                        throw new BusinessException("Stay dates cannot be in the past.");
                    if (checkOut <= checkIn)
                        throw new BusinessException("Check-out date must be after check-in date.");

                    var roomQuantity = Math.Max(1, selection.Quantity);
                    if (room.MaxGuests > 0 && dto.NumberOfGuests > 0)
                    {
                        var requiredRooms = (int)Math.Ceiling(dto.NumberOfGuests / (decimal)room.MaxGuests);
                        roomQuantity = Math.Max(roomQuantity, Math.Max(1, requiredRooms));
                    }

                    var homestay = await _context.Homestays.FirstOrDefaultAsync(h => h.Id == room.HomestayId);
                    var nights = (checkOut - checkIn).Days;
                    if (homestay != null && nights < homestay.MinNights)
                        throw new BusinessException($"Service '{service.Name}' requires at least {homestay.MinNights} nights.");
                    if (homestay?.AvailableFrom.HasValue == true && checkIn < homestay.AvailableFrom.Value.Date)
                        throw new BusinessException($"Service '{service.Name}' is not available before {homestay.AvailableFrom.Value:dd/MM/yyyy}.");
                    if (homestay?.AvailableTo.HasValue == true && checkOut > homestay.AvailableTo.Value.Date)
                        throw new BusinessException($"Service '{service.Name}' is not available after {homestay.AvailableTo.Value:dd/MM/yyyy}.");

                    var roomAvailabilities = await _context.RoomAvailabilities
                        .Where(ra => ra.RoomId == room.Id
                            && ra.Date >= DateOnly.FromDateTime(checkIn)
                            && ra.Date < DateOnly.FromDateTime(checkOut))
                        .ToListAsync();
                    var holidayDates = (await _context.VietnamPublicHolidays
                        .Where(h => h.IsActive
                            && h.Date >= DateOnly.FromDateTime(checkIn)
                            && h.Date < DateOnly.FromDateTime(checkOut))
                        .Select(h => h.Date)
                        .ToListAsync())
                        .ToHashSet();

                    var hasAnyAvailability = await _context.RoomAvailabilities
                        .AnyAsync(ra => ra.RoomId == room.Id);
                    if (hasAnyAvailability)
                    {
                        for (var date = checkIn; date < checkOut; date = date.AddDays(1))
                        {
                            var dateOnly = DateOnly.FromDateTime(date);
                            var availability = roomAvailabilities.FirstOrDefault(ra => ra.Date == dateOnly);
                            if (availability == null)
                                throw new BusinessException($"Room '{room.Name}' is not available on {date:dd/MM/yyyy}.");
                            if (availability.IsBlocked)
                                throw new BusinessException($"Room '{room.Name}' is blocked on {date:dd/MM/yyyy}.");
                            if (availability.AvailableCount < roomQuantity)
                                throw new BusinessException($"Room '{room.Name}' only has {availability.AvailableCount} units left on {date:dd/MM/yyyy}.");
                        }
                    }

                    var directBookedQuantity = await _context.BookingDetails
                        .Include(bd => bd.Booking)
                        .Where(bd => bd.RoomId == room.Id
                            && bd.Booking.Status != BookingStatus.Cancelled
                        && bd.Booking.Status != BookingStatus.Refunded
                            && bd.Booking.CheckInDate < checkOut
                            && bd.Booking.CheckOutDate > checkIn)
                        .SumAsync(bd => (int?)bd.Quantity) ?? 0;
                    var comboBookedQuantity = await _context.ComboBookingItems
                        .Include(cbi => cbi.Booking)
                        .Where(cbi => cbi.RoomId == room.Id
                            && cbi.CheckInDate.HasValue
                            && cbi.CheckOutDate.HasValue
                            && cbi.Booking.Status != BookingStatus.Cancelled
                            && cbi.Booking.Status != BookingStatus.Refunded
                            && cbi.CheckInDate < checkOut
                            && cbi.CheckOutDate > checkIn)
                        .SumAsync(cbi => (int?)cbi.Quantity) ?? 0;
                    if (directBookedQuantity + comboBookedQuantity + roomQuantity > room.Quantity)
                        throw new BusinessException($"Room '{room.Name}' is sold out for the selected stay.");

                    decimal totalRoomPrice = 0;
                    for (var date = checkIn; date < checkOut; date = date.AddDays(1))
                    {
                        var dateOnly = DateOnly.FromDateTime(date);
                        var availability = roomAvailabilities.FirstOrDefault(ra => ra.Date == dateOnly);
                        if (availability?.PriceOverride.HasValue == true)
                        {
                            totalRoomPrice += availability.PriceOverride.Value;
                        }
                        else if (holidayDates.Contains(dateOnly) && room.HolidayPrice.HasValue)
                        {
                            totalRoomPrice += room.HolidayPrice.Value;
                        }
                        else
                        {
                            totalRoomPrice += (date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday)
                                ? (room.WeekendPrice ?? room.BasePrice)
                                : room.BasePrice;
                        }
                    }

                    var roomSubTotal = totalRoomPrice * roomQuantity;
                    originalTotal += roomSubTotal;
                    componentStarts.Add(checkIn);
                    componentEnds.Add(checkOut);
                    roomQuantityUpdates.Add((room.Id, checkIn, checkOut, roomQuantity));
                    comboBookingItems.Add(new ComboBookingItem
                    {
                        Id = Guid.NewGuid(),
                        ComboId = combo.Id,
                        ComboItemId = comboItem.Id,
                        ServiceId = service.Id,
                        RoomId = room.Id,
                        CheckInDate = checkIn,
                        CheckOutDate = checkOut,
                        StartDate = checkIn,
                        EndDate = checkOut,
                        Quantity = roomQuantity,
                        UnitPrice = totalRoomPrice,
                        SubTotal = roomSubTotal,
                        CreatedAt = DateTime.UtcNow
                    });

                    continue;
                }

                if (service.ServiceType == ServiceType.Tour)
                {
                    if (!selection.TourScheduleId.HasValue)
                        throw new BusinessException("Tour combo items require a selected schedule.");

                    var schedulesById = service.Tours
                        .SelectMany(tour => tour.TourSchedules.Select(schedule => new { schedule, tour }))
                        .ToDictionary(item => item.schedule.Id, item => (Tour: item.tour, Schedule: item.schedule));

                    var tourQuantity = Math.Max(1, dto.NumberOfGuests);
                    var tourDetails = new List<BookingDetailItemDto>
                    {
                        new BookingDetailItemDto
                        {
                            TourScheduleId = selection.TourScheduleId,
                            TourPricingTierId = selection.TourPricingTierId,
                            Quantity = tourQuantity
                        }
                    };

                    if (selection.TourPricingTierId == null && schedulesById[selection.TourScheduleId.Value].Tour.TourPricingTiers.Any())
                        throw new BusinessException("Tour combo items require a selected pricing tier.");

                    ValidateTourBooking(tourDetails, schedulesById);
                    scheduleQuantityUpdates.AddRange(BuildScheduleQuantityUpdates(tourDetails, schedulesById));

                    var scheduleEntry = schedulesById[selection.TourScheduleId!.Value];
                    var schedule = scheduleEntry.Schedule;
                    var tourPackage = scheduleEntry.Tour;

                    if (schedule.Status != TourScheduleStatus.Active)
                        throw new BusinessException($"Tour schedule for '{service.Name}' is not active.");
                    if (schedule.StartDate <= DateTime.UtcNow)
                        throw new BusinessException($"Tour '{service.Name}' has already passed. Please choose another schedule.");
                    if (tourPackage.BookingCutoffHours > 0 && schedule.StartDate <= DateTime.UtcNow.AddHours(tourPackage.BookingCutoffHours))
                        throw new BusinessException($"Tour '{service.Name}' is past the booking cutoff.");

                    decimal unitPrice;
                    if (selection.TourPricingTierId.HasValue)
                    {
                        var tier = tourPackage.TourPricingTiers.FirstOrDefault(item => item.Id == selection.TourPricingTierId.Value);
                        if (tier == null)
                            throw new BusinessException("Selected tour pricing tier does not belong to the combo service.");
                        unitPrice = ResolveTourScheduleTierPrice(schedule, tier, service.BasePrice);
                    }
                    else
                    {
                        unitPrice = ResolveLowestTourSchedulePrice(schedule, service.BasePrice);
                    }

                    var tourSubTotal = unitPrice * tourQuantity;
                    originalTotal += tourSubTotal;
                    componentStarts.Add(schedule.StartDate);
                    componentEnds.Add(schedule.EndDate);
                    comboBookingItems.Add(new ComboBookingItem
                    {
                        Id = Guid.NewGuid(),
                        ComboId = combo.Id,
                        ComboItemId = comboItem.Id,
                        ServiceId = service.Id,
                        TourScheduleId = schedule.Id,
                        TourPricingTierId = selection.TourPricingTierId,
                        StartDate = schedule.StartDate,
                        EndDate = schedule.EndDate,
                        Quantity = tourQuantity,
                        UnitPrice = unitPrice,
                        SubTotal = tourSubTotal,
                        CreatedAt = DateTime.UtcNow
                    });

                    continue;
                }

                throw new BusinessException("Combo only supports homestay and tour services.");
            }

            var comboBundleDiscountAmount = ComboBundleHelper.CalculateDiscountAmount(
                combo.DiscountType,
                combo.DiscountValue,
                originalTotal);
            var totalAmount = Math.Max(0, originalTotal - comboBundleDiscountAmount);

            decimal discountAmount = 0;
            Guid? voucherId = null;
            if (!string.IsNullOrEmpty(dto.VoucherCode))
            {
                var voucher = await _voucherService.ValidateVoucherAsync(dto.VoucherCode, userId, totalAmount, ServiceType.Combo);
                if (voucher != null)
                {
                    discountAmount = await _voucherService.CalculateDiscountAsync(voucher, totalAmount);
                    voucherId = voucher.Id;
                }
            }

            var finalAmount = totalAmount - discountAmount;
            if (finalAmount < 0)
                finalAmount = 0;

            var bookingStart = componentStarts.Any()
                ? componentStarts.Min()
                : dto.CheckInDate;
            var bookingEnd = componentEnds.Any()
                ? componentEnds.Max()
                : dto.CheckOutDate;

            var comboScheduleAssignments = scheduleQuantityUpdates.Any()
                ? await AssignRunsToSchedulesAsync(scheduleQuantityUpdates, comboSchedulesById)
                : new Dictionary<Guid, AssignedScheduleRunInfo>();

            foreach (var item in comboBookingItems.Where(line => line.TourScheduleId.HasValue))
            {
                if (comboScheduleAssignments.TryGetValue(item.TourScheduleId!.Value, out var assignment))
                    item.TourScheduleRunId = assignment.RunId;
            }
            scheduleQuantityUpdates.Clear();

            var primaryComboItem = dto.ServiceId.HasValue
                ? comboItems.FirstOrDefault(ci => ci.ServiceId == dto.ServiceId.Value) ?? comboItems.First()
                : comboItems.First();
            var primaryService = primaryComboItem.Service;
            var bookingCode = $"VNS{DateTime.UtcNow:yyyyMMddHHmmss}{Guid.NewGuid():N}"[..30];
            var booking = new Booking
            {
                Id = Guid.NewGuid(),
                BookingCode = bookingCode,
                UserId = userId,
                ServiceId = primaryService.Id,
                PartnerId = combo.PartnerId,
                Status = BookingStatus.Pending,
                CommercialStatus = BookingCommercialStatus.PendingPayment,
                FulfillmentStatus = BookingFulfillmentStatus.AwaitingPartner,
                TotalAmount = totalAmount,
                DiscountAmount = discountAmount,
                FinalAmount = finalAmount,
                VoucherId = voucherId,
                ComboId = combo.Id,
                ComboName = string.IsNullOrWhiteSpace(dto.ComboName) ? combo.Name : dto.ComboName,
                NumberOfGuests = dto.NumberOfGuests,
                SpecialRequests = dto.SpecialRequests,
                ContactName = dto.ContactName,
                ContactPhone = dto.ContactPhone,
                ContactEmail = dto.ContactEmail,
                IdempotencyKey = string.IsNullOrEmpty(dto.IdempotencyKey) ? null : dto.IdempotencyKey,
                CheckInDate = bookingStart,
                CheckOutDate = bookingEnd,
                BookingDate = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(30),
                CreatedAt = DateTime.UtcNow
            };

            _context.Bookings.Add(booking);

            foreach (var item in comboBookingItems)
            {
                item.BookingId = booking.Id;
                _context.ComboBookingItems.Add(item);
            }

            var payment = new Payment
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                Amount = finalAmount,
                PaymentMethod = dto.PaymentMethod,
                PaymentStatus = PaymentStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };
            _context.Payments.Add(payment);

            if (voucherId.HasValue)
            {
                _context.VoucherUsages.Add(new VoucherUsage
                {
                    Id = Guid.NewGuid(),
                    VoucherId = voucherId.Value,
                    UserId = userId,
                    BookingId = booking.Id,
                    DiscountAmount = discountAmount,
                    UsedAt = DateTime.UtcNow
                });

                var voucher = await _context.Vouchers.FindAsync(voucherId.Value);
                if (voucher != null)
                    voucher.UsedCount++;
            }

            foreach (var service in servicesToIncrement.Values)
                service.TotalBookings++;

            foreach (var scheduleUpdate in scheduleQuantityUpdates
                .GroupBy(item => item.ScheduleId)
                .Select(group => new { ScheduleId = group.Key, Quantity = group.Sum(item => item.Quantity) }))
            {
                var updated = await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE TourSchedules SET BookedSlots = BookedSlots + {0} WHERE Id = {1} AND BookedSlots + {0} <= ((CASE WHEN RunCount < 1 THEN 1 ELSE RunCount END) * AvailableSlots)",
                    scheduleUpdate.Quantity, scheduleUpdate.ScheduleId);
                if (updated == 0)
                {
                    var schedule = await _context.TourSchedules.FindAsync(scheduleUpdate.ScheduleId);
                    var remaining = schedule != null ? GetScheduleRemainingCapacity(schedule) : 0;
                    throw new BusinessException(
                        remaining > 0
                            ? $"Selected combo tour only has {remaining} seats left for this departure."
                            : "Selected combo tour departure is sold out.");
                }

                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE TourSchedules SET Status = {0} WHERE Id = {1} AND BookedSlots >= ((CASE WHEN RunCount < 1 THEN 1 ELSE RunCount END) * AvailableSlots)",
                    (int)TourScheduleStatus.Full, scheduleUpdate.ScheduleId);
            }

            foreach (var roomUpdate in roomQuantityUpdates
                .GroupBy(item => new { item.RoomId, item.CheckInDate, item.CheckOutDate })
                .Select(group => new
                {
                    group.Key.RoomId,
                    group.Key.CheckInDate,
                    group.Key.CheckOutDate,
                    Quantity = group.Sum(item => item.Quantity)
                }))
            {
                var roomNights = (roomUpdate.CheckOutDate.Date - roomUpdate.CheckInDate.Date).Days;
                var updated = await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE RoomAvailabilities SET AvailableCount = AvailableCount - {0} " +
                    "WHERE RoomId = {1} AND Date >= {2} AND Date < {3} AND AvailableCount >= {0}",
                    roomUpdate.Quantity, roomUpdate.RoomId, (object)roomUpdate.CheckInDate.Date, (object)roomUpdate.CheckOutDate.Date);

                if (updated != roomNights)
                {
                    await _context.Database.ExecuteSqlRawAsync(
                        "UPDATE RoomAvailabilities SET AvailableCount = AvailableCount + {0} " +
                        "WHERE RoomId = {1} AND Date >= {2} AND Date < {3} AND AvailableCount + {0} <= (SELECT Quantity FROM Rooms WHERE Id = {1})",
                        roomUpdate.Quantity, roomUpdate.RoomId, (object)roomUpdate.CheckInDate.Date, (object)roomUpdate.CheckOutDate.Date);
                    throw new BusinessException("Selected combo room is no longer available for the requested stay.");
                }
            }

            await _context.SaveChangesAsync();
            await _commerceService.EnsureBookingArtifactsAsync(booking, primaryService);
            await transaction.CommitAsync();

            var partnerUser = await _context.Users.FirstOrDefaultAsync(u => _context.Partners.Any(p => p.UserId == u.Id && p.Id == combo.PartnerId));
            if (partnerUser != null)
            {
                await _notificationService.SendNotificationAsync(
                    partnerUser.Id,
                    "Combo booking created",
                    $"A new combo booking #{bookingCode} was created for {booking.ComboName ?? combo.Name}.",
                    NotificationType.BookingConfirmed,
                    booking.Id
                );
            }

            _context.ChangeTracker.Clear();
            return await GetBookingByIdAsync(userId, booking.Id);
        }

        public async Task<object> GetUserBookingsAsync(Guid userId, BookingFilterDto filter)
        {
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1) filter.PageSize = 10;
            if (filter.PageSize > 100) filter.PageSize = 100;

            var query = _context.Bookings
                .Include(b => b.Service)
                    .ThenInclude(service => service.Homestay)
                .Include(b => b.Combo)
                .Include(b => b.Partner)
                .Include(b => b.Payment)
                .Include(b => b.RefundRequest)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.TourSchedule)
                .Include(b => b.BookingComponents)
                    .ThenInclude(component => component.Service)
                        .ThenInclude(service => service.Homestay)
                .Where(b => b.UserId == userId)
                .AsQueryable();

            if (filter.Status.HasValue)
                query = query.Where(b => b.Status == filter.Status.Value);

            if (filter.FromDate.HasValue)
                query = query.Where(b => b.BookingDate >= filter.FromDate.Value);

            if (filter.ToDate.HasValue)
                query = query.Where(b => b.BookingDate <= filter.ToDate.Value);

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var keyword = filter.Keyword.ToLower();
                query = query.Where(b => b.BookingCode.ToLower().Contains(keyword)
                    || b.Service.Name.ToLower().Contains(keyword)
                    || (b.ComboName != null && b.ComboName.ToLower().Contains(keyword)));
            }

            var totalCount = await query.CountAsync();

            var bookings = await query
                .OrderByDescending(b => b.BookingDate)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            var requestedAtUtc = DateTime.UtcNow;
            var items = bookings.Select(b =>
            {
                return new BookingListDto
                {
                    Id = b.Id,
                    BookingCode = b.BookingCode,
                    ServiceName = b.ComboId.HasValue ? (b.ComboName ?? b.Service.Name) : b.Service.Name,
                    ServiceType = b.ComboId.HasValue ? ServiceType.Combo : b.Service.ServiceType,
                    ThumbnailUrl = b.ComboId.HasValue ? (b.Combo != null ? b.Combo.ThumbnailUrl : b.Service.ThumbnailUrl) : b.Service.ThumbnailUrl,
                    Status = b.Status,
                    TotalAmount = b.TotalAmount,
                    DiscountAmount = b.DiscountAmount,
                    FinalAmount = b.FinalAmount,
                    PaymentStatus = b.Payment != null ? b.Payment.PaymentStatus : (PaymentStatus?)null,
                    NumberOfGuests = b.NumberOfGuests,
                    CheckInDate = b.CheckInDate,
                    CheckOutDate = b.CheckOutDate,
                    StartDate = b.CheckInDate ?? b.BookingDetails
                        .Where(bd => bd.TourSchedule != null)
                        .Select(bd => bd.TourSchedule!.StartDate)
                        .FirstOrDefault(),
                    EndDate = b.CheckOutDate ?? b.BookingDetails
                        .Where(bd => bd.TourSchedule != null)
                        .Select(bd => bd.TourSchedule!.EndDate)
                        .FirstOrDefault(),
                    BookingDate = b.BookingDate,
                    PartnerId = b.PartnerId,
                    PartnerName = b.Partner.BusinessName,
                    CustomerName = b.ContactName,
                    ComboId = b.ComboId,
                    ComboName = b.ComboName,
                    CommercialStatus = b.CommercialStatus,
                    FulfillmentStatus = b.FulfillmentStatus,
                    CanPay = b.CommercialStatus == BookingCommercialStatus.PendingPayment && b.FulfillmentStatus == BookingFulfillmentStatus.AwaitingPartner && b.Status == BookingStatus.Pending,
                    CanCancel = _commerceService.CanCancel(b),
                    CanRefund = BookingRefundHelper.CanRefund(b, requestedAtUtc)
                };
            }).ToList();

            return new
            {
                Items = items,
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize)
            };
        }

        private async Task ReleaseComboResourcesAsync(Booking booking)
        {
            var comboScheduleGroups = booking.ComboBookingItems
                .Where(item => item.TourScheduleId.HasValue)
                .GroupBy(item => new
                {
                    ScheduleId = item.TourScheduleId!.Value,
                    item.TourScheduleRunId
                })
                .Select(group => new
                {
                    group.Key.ScheduleId,
                    group.Key.TourScheduleRunId,
                    Quantity = group.Sum(line => line.Quantity)
                })
                .ToList();

            foreach (var scheduleGroup in comboScheduleGroups)
            {
                await ReleaseAssignedRunAsync(
                    scheduleGroup.ScheduleId,
                    scheduleGroup.TourScheduleRunId,
                    scheduleGroup.Quantity);
            }

            foreach (var roomGroup in booking.ComboBookingItems
                .Where(item => item.RoomId.HasValue && item.CheckInDate.HasValue && item.CheckOutDate.HasValue)
                .GroupBy(item => new
                {
                    RoomId = item.RoomId!.Value,
                    CheckInDate = item.CheckInDate!.Value.Date,
                    CheckOutDate = item.CheckOutDate!.Value.Date
                }))
            {
                var quantity = roomGroup.Sum(item => item.Quantity);
                await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE RoomAvailabilities SET AvailableCount = AvailableCount + {0} " +
                    "WHERE RoomId = {1} AND Date >= {2} AND Date < {3}",
                    quantity,
                    roomGroup.Key.RoomId,
                    roomGroup.Key.CheckInDate,
                    roomGroup.Key.CheckOutDate);
            }
        }

        private async Task AdjustComboServiceBookingCountsAsync(Booking booking, int delta)
        {
            var serviceIds = booking.ComboBookingItems
                .Select(item => item.ServiceId)
                .Distinct()
                .ToList();
            if (!serviceIds.Any())
                return;

            var services = await _context.Services
                .Where(service => serviceIds.Contains(service.Id))
                .ToListAsync();

            foreach (var service in services)
            {
                service.TotalBookings = Math.Max(0, service.TotalBookings + delta);
            }
        }

        private static List<(Guid ScheduleId, int Quantity)> BuildScheduleQuantityUpdates(
            List<BookingDetailItemDto> tourDetails,
            Dictionary<Guid, (Tour Tour, TourSchedule Schedule)> schedulesById)
        {
            return tourDetails
                .GroupBy(detail => detail.TourScheduleId!.Value)
                .Select(group =>
                {
                    return (
                        ScheduleId: group.Key,
                        Quantity: group.Sum(detail => detail.Quantity)
                    );
                })
                .ToList();
        }

        private sealed class AssignedScheduleRunInfo
        {
            public Guid ScheduleId { get; init; }
            public Guid RunId { get; init; }
            public int RunIndex { get; init; }
            public DateTime StartDate { get; init; }
            public DateTime EndDate { get; init; }
        }

        private static int GetScheduleTotalCapacity(TourSchedule schedule)
        {
            return Math.Max(schedule.RunCount, 1) * Math.Max(schedule.AvailableSlots, 0);
        }

        private static int GetScheduleRemainingCapacity(TourSchedule schedule)
        {
            return Math.Max(0, GetScheduleTotalCapacity(schedule) - Math.Max(schedule.BookedSlots, 0));
        }

        private static decimal ResolveTourScheduleTierPrice(TourSchedule schedule, TourPricingTier tier, decimal fallbackBasePrice)
        {
            var customPrice = schedule.PricingOverrides
                .FirstOrDefault(item => item.TourPricingTierId == tier.Id)
                ?.CustomPrice;

            if (customPrice.HasValue && customPrice.Value > 0)
                return customPrice.Value;

            if (tier.UnitPrice > 0)
                return tier.UnitPrice;

            if (schedule.PriceOverride.HasValue && schedule.PriceOverride.Value > 0)
                return schedule.PriceOverride.Value;

            return fallbackBasePrice;
        }

        private static decimal ResolveLowestTourSchedulePrice(TourSchedule schedule, decimal fallbackBasePrice)
        {
            var tierPrices = schedule.Tour?.TourPricingTiers?
                .Select(tier => ResolveTourScheduleTierPrice(schedule, tier, fallbackBasePrice))
                .Where(price => price > 0)
                .ToList();

            if (tierPrices != null && tierPrices.Count > 0)
                return tierPrices.Min();

            if (schedule.PriceOverride.HasValue && schedule.PriceOverride.Value > 0)
                return schedule.PriceOverride.Value;

            return fallbackBasePrice;
        }

        private static void ValidateTourBooking(
            List<BookingDetailItemDto> tourDetails,
            Dictionary<Guid, (Tour Tour, TourSchedule Schedule)> schedulesById)
        {
            if (!tourDetails.Any())
                return;

            var distinctScheduleIds = tourDetails
                .Select(detail => detail.TourScheduleId!.Value)
                .Distinct()
                .ToList();
            if (distinctScheduleIds.Count != 1)
                throw new BusinessException("Các nhóm giá của tour phải thuộc cùng một phiên khởi hành.");

            if (!schedulesById.TryGetValue(distinctScheduleIds[0], out var selectedSchedule))
                throw new BusinessException("Không tìm thấy lịch tour đã chọn.");

            var totalParticipants = tourDetails.Sum(detail => detail.Quantity);
            if (totalParticipants > selectedSchedule.Tour.MaxParticipants)
                throw new BusinessException("Tổng số khách không nằm trong giới hạn của gói tour.");

            if (tourDetails.Any(detail => !detail.TourPricingTierId.HasValue))
                throw new BusinessException("Khi đặt tour theo bảng giá, mọi dòng tour phải chọn một mức giá.");

            foreach (var tierGroup in tourDetails.GroupBy(detail => detail.TourPricingTierId!.Value))
            {
                var pricingTier = selectedSchedule.Tour.TourPricingTiers
                    .FirstOrDefault(tier => tier.Id == tierGroup.Key);
                if (pricingTier == null)
                    throw new BusinessException("Mức giá đã chọn không thuộc gói tour của phiên khởi hành này.");
            }
        }

        private async Task<Dictionary<Guid, AssignedScheduleRunInfo>> AssignRunsToSchedulesAsync(
            IEnumerable<(Guid ScheduleId, int Quantity)> scheduleUpdates,
            Dictionary<Guid, (Tour Tour, TourSchedule Schedule)> schedulesById)
        {
            var assignments = new Dictionary<Guid, AssignedScheduleRunInfo>();
            foreach (var scheduleUpdate in scheduleUpdates
                .GroupBy(item => item.ScheduleId)
                .Select(group => new { ScheduleId = group.Key, Quantity = group.Sum(item => item.Quantity) }))
            {
                if (!schedulesById.TryGetValue(scheduleUpdate.ScheduleId, out var scheduleEntry))
                    throw new BusinessException("KhĂ´ng tĂ¬m tháº¥y lá»‹ch tour Ä‘Ă£ chá»n.");

                var assignedRun = await AssignRunForScheduleAsync(
                    scheduleEntry.Schedule,
                    scheduleEntry.Tour,
                    scheduleUpdate.Quantity);
                assignments[scheduleUpdate.ScheduleId] = assignedRun;
            }

            return assignments;
        }

        private async Task<AssignedScheduleRunInfo> AssignRunForScheduleAsync(
            TourSchedule schedule,
            Tour tour,
            int quantity)
        {
            var minParticipants = Math.Max(tour.MinParticipants, 1);
            var candidates = await _context.TourScheduleRuns
                .Where(run => run.TourScheduleId == schedule.Id && run.Status == TourScheduleStatus.Active)
                .OrderBy(run => run.StartDate)
                .ThenBy(run => run.RunIndex)
                .Select(run => new
                {
                    run.Id,
                    run.RunIndex,
                    run.StartDate,
                    run.EndDate,
                    run.MaxParticipants,
                    run.BookedSlots
                })
                .ToListAsync();

            var orderedCandidates = candidates
                .Where(run => Math.Max(run.MaxParticipants - run.BookedSlots, 0) >= quantity)
                .OrderBy(run => run.BookedSlots >= minParticipants ? 1 : 0)
                .ThenByDescending(run => run.BookedSlots >= minParticipants ? 0 : run.BookedSlots)
                .ThenBy(run => run.StartDate)
                .ThenBy(run => run.RunIndex)
                .ToList();

            foreach (var candidate in orderedCandidates)
            {
                var updated = await _context.Database.ExecuteSqlRawAsync(
                    "UPDATE TourScheduleRuns SET BookedSlots = BookedSlots + {0}, Status = CASE WHEN BookedSlots + {0} >= MaxParticipants THEN {1} ELSE {2} END WHERE Id = {3} AND Status = {2} AND BookedSlots + {0} <= MaxParticipants",
                    quantity,
                    (int)TourScheduleStatus.Full,
                    (int)TourScheduleStatus.Active,
                    candidate.Id);
                if (updated == 0)
                    continue;

                await IncrementParentScheduleAggregateAsync(schedule.Id, quantity);
                return new AssignedScheduleRunInfo
                {
                    ScheduleId = schedule.Id,
                    RunId = candidate.Id,
                    RunIndex = candidate.RunIndex,
                    StartDate = candidate.StartDate,
                    EndDate = candidate.EndDate
                };
            }

            var remaining = await GetGroupedScheduleRemainingCapacityAsync(schedule.Id);
            throw new BusinessException(
                remaining > 0
                    ? $"Tour nĂ y khĂ´ng cĂ²n má»™t lÆ°á»£t khá»Ÿi hĂ nh nĂ o Ä‘á»§ chá»— cho {quantity} khĂ¡ch. Vui lĂ²ng giáº£m sá»‘ lÆ°á»£ng hoáº·c chá»n lá»‹ch khĂ¡c."
                    : "Tour nĂ y Ä‘Ã£ háº¿t chá»—. Vui lĂ²ng chá»n lá»‹ch khĂ¡c.");
        }

        private async Task IncrementParentScheduleAggregateAsync(Guid scheduleId, int quantity)
        {
            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE TourSchedules SET BookedSlots = BookedSlots + {0}, Status = CASE WHEN BookedSlots + {0} >= ((CASE WHEN RunCount < 1 THEN 1 ELSE RunCount END) * AvailableSlots) THEN {1} ELSE {2} END WHERE Id = {3}",
                quantity,
                (int)TourScheduleStatus.Full,
                (int)TourScheduleStatus.Active,
                scheduleId);
        }

        private async Task DecrementParentScheduleAggregateAsync(Guid scheduleId, int quantity)
        {
            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE TourSchedules SET BookedSlots = CASE WHEN BookedSlots - {0} < 0 THEN 0 ELSE BookedSlots - {0} END, Status = CASE WHEN BookedSlots - {0} >= ((CASE WHEN RunCount < 1 THEN 1 ELSE RunCount END) * AvailableSlots) THEN {1} ELSE {2} END WHERE Id = {3}",
                quantity,
                (int)TourScheduleStatus.Full,
                (int)TourScheduleStatus.Active,
                scheduleId);
        }

        private async Task<int> GetGroupedScheduleRemainingCapacityAsync(Guid scheduleId)
        {
            var runs = await _context.TourScheduleRuns
                .Where(run => run.TourScheduleId == scheduleId && run.Status == TourScheduleStatus.Active)
                .Select(run => new { run.MaxParticipants, run.BookedSlots })
                .ToListAsync();

            return runs.Sum(run => Math.Max(run.MaxParticipants - run.BookedSlots, 0));
        }

        private async Task<bool> CanScheduleAccommodateBookingAsync(Guid scheduleId, int quantity)
        {
            return await _context.TourScheduleRuns
                .AnyAsync(run =>
                    run.TourScheduleId == scheduleId &&
                    run.Status == TourScheduleStatus.Active &&
                    run.BookedSlots + quantity <= run.MaxParticipants);
        }

        private async Task ReleaseAssignedRunAsync(Guid? scheduleId, Guid? scheduleRunId, int quantity)
        {
            if (!scheduleId.HasValue || quantity <= 0)
                return;

            if (!scheduleRunId.HasValue)
            {
                await DecrementParentScheduleAggregateAsync(scheduleId.Value, quantity);
                return;
            }

            var updated = await _context.Database.ExecuteSqlRawAsync(
                "UPDATE TourScheduleRuns SET BookedSlots = CASE WHEN BookedSlots - {0} < 0 THEN 0 ELSE BookedSlots - {0} END, Status = CASE WHEN Status = {1} AND BookedSlots - {0} < MaxParticipants THEN {2} ELSE Status END WHERE Id = {3}",
                quantity,
                (int)TourScheduleStatus.Full,
                (int)TourScheduleStatus.Active,
                scheduleRunId.Value);

            if (updated > 0)
                await DecrementParentScheduleAggregateAsync(scheduleId.Value, quantity);
        }

        // Fix #14: Added userId filter to prevent unauthorized access to other users' bookings
        public async Task<BookingDetailDto> GetBookingByIdAsync(Guid userId, Guid bookingId)
        {
            var booking = await _context.Bookings
                .Include(b => b.Service)
                    .ThenInclude(service => service.Homestay)
                .Include(b => b.Combo)
                .Include(b => b.Partner)
                .Include(b => b.Payment)
                .Include(b => b.RefundRequest)
                .Include(b => b.Voucher)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Room)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.TourSchedule)
                    .ThenInclude(ts => ts!.Tour)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.TourScheduleRun)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.TourPricingTier)
                        .ThenInclude(tier => tier!.Tour)
                .Include(b => b.ComboBookingItems)
                    .ThenInclude(cbi => cbi.ComboItem)
                .Include(b => b.ComboBookingItems)
                    .ThenInclude(cbi => cbi.Service)
                .Include(b => b.ComboBookingItems)
                    .ThenInclude(cbi => cbi.Room)
                .Include(b => b.ComboBookingItems)
                    .ThenInclude(cbi => cbi.TourSchedule)
                .Include(b => b.ComboBookingItems)
                    .ThenInclude(cbi => cbi.TourScheduleRun)
                .Include(b => b.ComboBookingItems)
                    .ThenInclude(cbi => cbi.TourPricingTier)
                .Include(b => b.BookingComponents)
                    .ThenInclude(component => component.Service)
                        .ThenInclude(service => service.Homestay)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.UserId == userId);

            if (booking == null)
                throw new BusinessException("Không tìm thấy đặt chỗ");

            return new BookingDetailDto
            {
                Id = booking.Id,
                BookingCode = booking.BookingCode,
                ServiceId = booking.ServiceId,
                ServiceName = booking.ComboId.HasValue ? (booking.ComboName ?? booking.Service.Name) : booking.Service.Name,
                ServiceType = booking.ComboId.HasValue ? ServiceType.Combo : booking.Service.ServiceType,
                ThumbnailUrl = booking.ComboId.HasValue ? (booking.Combo?.ThumbnailUrl ?? booking.Service.ThumbnailUrl) : booking.Service.ThumbnailUrl,
                Address = booking.Service.Address,
                Status = booking.Status,
                TotalAmount = booking.TotalAmount,
                DiscountAmount = booking.DiscountAmount,
                FinalAmount = booking.FinalAmount,
                NumberOfGuests = booking.NumberOfGuests,
                ContactName = booking.ContactName,
                ContactPhone = booking.ContactPhone,
                ContactEmail = booking.ContactEmail,
                SpecialRequests = booking.SpecialRequests,
                CheckInDate = booking.CheckInDate,
                CheckOutDate = booking.CheckOutDate,
                StartDate = booking.CheckInDate ?? booking.BookingDetails
                    .FirstOrDefault(bd => bd.TourSchedule != null)
                    ?.TourSchedule?.StartDate,
                EndDate = booking.CheckOutDate ?? booking.BookingDetails
                    .FirstOrDefault(bd => bd.TourSchedule != null)
                    ?.TourSchedule?.EndDate,
                BookingDate = booking.BookingDate,
                ConfirmedAt = booking.ConfirmedAt,
                CompletedAt = booking.CompletedAt,
                CancelledAt = booking.CancelledAt,
                CancellationReason = booking.CancellationReason,
                ExpiresAt = booking.ExpiresAt,
                PartnerId = booking.PartnerId,
                PartnerName = booking.Partner.BusinessName,
                CustomerName = booking.ContactName,
                VoucherCode = booking.Voucher?.Code,
                ComboId = booking.ComboId,
                ComboName = booking.ComboName,
                ComboOriginalAmount = booking.ComboBookingItems.Sum(cbi => cbi.SubTotal),
                ComboBundleDiscountAmount = booking.ComboId.HasValue
                    ? Math.Max(0, booking.ComboBookingItems.Sum(cbi => cbi.SubTotal) - booking.TotalAmount)
                    : null,
                CommercialStatus = booking.CommercialStatus,
                FulfillmentStatus = booking.FulfillmentStatus,
                CanPay = _commerceService.CanPay(booking),
                CanCancel = _commerceService.CanCancel(booking),
                CanRefund = BookingRefundHelper.CanRefund(booking, DateTime.UtcNow),
                RefundEligibleAmount = BookingRefundHelper.BuildRefundPreview(booking, DateTime.UtcNow).RefundEligibleAmount,
                RefundEligibilityMessage = BookingRefundHelper.BuildRefundPreview(booking, DateTime.UtcNow).EligibilityMessage,
                RefundComponents = booking.ComboId.HasValue
                    ? BookingRefundHelper.BuildRefundPreview(booking, DateTime.UtcNow).Components
                    : new List<RefundPreviewComponentDto>(),
                RefundSummary = booking.RefundRequest != null ? new RefundSummaryDto
                {
                    Id = booking.RefundRequest.Id,
                    Status = booking.RefundRequest.Status,
                    RequestedAmount = booking.RefundRequest.RefundAmount,
                    ApprovedAmount = booking.RefundRequest.Status == RefundStatus.Processed
                        ? booking.RefundRequest.RefundAmount
                        : null,
                    Reason = booking.RefundRequest.Reason,
                    AdminNote = booking.RefundRequest.AdminNote,
                    RequestedAt = booking.RefundRequest.CreatedAt,
                    ProcessedAt = booking.RefundRequest.ProcessedAt
                } : null,
                Payment = booking.Payment != null ? new PaymentInfoDto
                {
                    Id = booking.Payment.Id,
                    Amount = booking.Payment.Amount,
                    WalletAmount = booking.Payment.WalletAmount,
                    VnPayAmount = booking.Payment.VnPayAmount,
                    PaymentMethod = booking.Payment.PaymentMethod,
                    PaymentStatus = booking.Payment.PaymentStatus,
                    PaidAt = booking.Payment.PaidAt
                } : null,
                Payments = booking.Payment != null ? new List<PaymentInfoDto>
                {
                    new PaymentInfoDto
                    {
                        Id = booking.Payment.Id,
                        Amount = booking.Payment.Amount,
                        WalletAmount = booking.Payment.WalletAmount,
                        VnPayAmount = booking.Payment.VnPayAmount,
                        PaymentMethod = booking.Payment.PaymentMethod,
                        PaymentStatus = booking.Payment.PaymentStatus,
                        PaidAt = booking.Payment.PaidAt
                    }
                } : new List<PaymentInfoDto>(),
                Details = booking.BookingDetails.Select(bd => new BookingDetailLineDto
                {
                    Id = bd.Id,
                    RoomName = bd.Room?.Name,
                    TourPackageName = bd.TourPricingTier?.Tour?.Name ?? bd.TourSchedule?.Tour?.Name,
                    TourPricingTierName = bd.TourPricingTier?.Name,
                    TourScheduleRunId = bd.TourScheduleRunId,
                    StartDate = bd.TourSchedule?.StartDate,
                    EndDate = bd.TourSchedule?.EndDate,
                    TourScheduleRunInfo = bd.TourScheduleRun != null ? $"Run {bd.TourScheduleRun.RunIndex}" : null,
                    Quantity = bd.Quantity,
                    UnitPrice = bd.UnitPrice,
                    SubTotal = bd.SubTotal
                }).ToList(),
                ComboItems = booking.ComboBookingItems
                    .OrderBy(cbi => cbi.ComboItem != null ? cbi.ComboItem.DisplayOrder : int.MaxValue)
                    .ThenBy(cbi => cbi.CreatedAt)
                    .Select(cbi => new ComboBookingItemDto
                    {
                        Id = cbi.Id,
                        ComboItemId = cbi.ComboItemId,
                        DisplayOrder = cbi.ComboItem?.DisplayOrder ?? int.MaxValue,
                        ServiceId = cbi.ServiceId,
                        ServiceName = cbi.Service.Name,
                        ServiceType = cbi.Service.ServiceType,
                        ThumbnailUrl = cbi.Service.ThumbnailUrl,
                        RoomId = cbi.RoomId,
                        RoomName = cbi.Room?.Name,
                        TourScheduleId = cbi.TourScheduleId,
                        TourScheduleRunId = cbi.TourScheduleRunId,
                        TourScheduleRunInfo = cbi.TourScheduleRun != null ? $"Run {cbi.TourScheduleRun.RunIndex}" : null,
                        TourPricingTierId = cbi.TourPricingTierId,
                        TourPricingTierName = cbi.TourPricingTier?.Name,
                        CheckInDate = cbi.CheckInDate,
                        CheckOutDate = cbi.CheckOutDate,
                        StartDate = cbi.StartDate,
                        EndDate = cbi.EndDate,
                        Quantity = cbi.Quantity,
                        UnitPrice = cbi.UnitPrice,
                        SubTotal = cbi.SubTotal
                    })
                    .ToList()
            };
        }

        public async Task<object> CancelBookingAsync(Guid userId, Guid bookingId, string? reason = null)
        {
            var booking = await _context.Bookings
                .Include(b => b.Payment)
                .Include(b => b.Service).ThenInclude(s => s.Homestay)
                .Include(b => b.ComboBookingItems).ThenInclude(cbi => cbi.Room)
                .Include(b => b.ComboBookingItems).ThenInclude(cbi => cbi.TourSchedule)
                    .ThenInclude(ts => ts!.Tour)
                .Include(b => b.ComboBookingItems).ThenInclude(cbi => cbi.Service).ThenInclude(service => service.Homestay)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.TourSchedule)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.Room)
                .Include(b => b.BookingComponents).ThenInclude(component => component.Service).ThenInclude(service => service.Homestay)
                .Include(b => b.RefundRequest)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.UserId == userId);

            if (booking == null)
                throw new BusinessException("Không tìm thấy đặt chỗ");

            if (!_commerceService.CanCancel(booking))
                throw new BusinessException("Không thể hủy đặt chỗ ở trạng thái hiện tại");

            var requestedAtUtc = DateTime.UtcNow;
            var refundPreview = BookingRefundHelper.BuildRefundPreview(booking, requestedAtUtc);
            var refundAmount = booking.CommercialStatus == BookingCommercialStatus.Paid
                ? refundPreview.RefundEligibleAmount
                : 0;

            // Release tour slots in both cases
            foreach (var detail in booking.BookingDetails.Where(bd => bd.TourScheduleId.HasValue))
                await ReleaseAssignedRunAsync(detail.TourScheduleId, detail.TourScheduleRunId, detail.Quantity);

            // Release homestay room availability
            var roomDetails = booking.BookingDetails.Where(bd => bd.RoomId.HasValue).ToList();
            if (roomDetails.Any() && booking.CheckInDate.HasValue && booking.CheckOutDate.HasValue)
            {
                var cin = booking.CheckInDate.Value.Date;
                var cout = booking.CheckOutDate.Value.Date;
                foreach (var detail in roomDetails)
                {
                    var qty = detail.Quantity;
                    var roomId = detail.RoomId!.Value;
                    await _context.Database.ExecuteSqlRawAsync(
                        "UPDATE RoomAvailabilities SET AvailableCount = AvailableCount + {0} " +
                        "WHERE RoomId = {1} AND Date >= {2} AND Date < {3}",
                        qty, roomId, cin, cout);
                }
            }

            if (booking.ComboBookingItems.Any())
            {
                await ReleaseComboResourcesAsync(booking);
            }

            if (booking.ComboBookingItems.Any())
            {
                await AdjustComboServiceBookingCountsAsync(booking, -1);
            }
            else if (booking.Service != null)
                booking.Service.TotalBookings = Math.Max(0, booking.Service.TotalBookings - 1);

            // Reverse voucher usage
            if (booking.VoucherId.HasValue)
            {
                var voucher = await _context.Vouchers.FindAsync(booking.VoucherId);
                if (voucher != null) voucher.UsedCount = Math.Max(0, voucher.UsedCount - 1);
                var usage = await _context.VoucherUsages.FirstOrDefaultAsync(vu => vu.BookingId == booking.Id);
                if (usage != null) _context.VoucherUsages.Remove(usage);
            }

            if (refundAmount > 0)
            {
                booking.CommercialStatus = BookingCommercialStatus.RefundPending;
                booking.FulfillmentStatus = BookingFulfillmentStatus.Cancelled;
                booking.Status = _commerceService.GetLegacyBookingStatus(booking);
                booking.CancelledAt = DateTime.UtcNow;
                booking.UpdatedAt = DateTime.UtcNow;
                booking.CancellationReason = reason;

                var refundRequest = new RefundRequest
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    UserId = userId,
                    Reason = reason ?? "Người dùng hủy đặt chỗ",
                    RefundAmount = refundAmount,
                    Status = RefundStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                };
                _context.RefundRequests.Add(refundRequest);

                await _context.SaveChangesAsync();
                await _commerceService.EnsureRefundCaseAsync(refundRequest, booking);

                // Auto-process refund: credit wallet immediately per cancellation policy
                var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
                if (wallet == null)
                {
                    wallet = new Wallet
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        Balance = 0,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Wallets.Add(wallet);
                }

                var balanceBefore = wallet.Balance;
                wallet.Balance += refundAmount;
                wallet.UpdatedAt = DateTime.UtcNow;

                _context.WalletTransactions.Add(new WalletTransaction
                {
                    Id = Guid.NewGuid(),
                    WalletId = wallet.Id,
                    BookingId = booking.Id,
                    Amount = refundAmount,
                    BalanceBefore = balanceBefore,
                    BalanceAfter = wallet.Balance,
                    Type = WalletTransactionType.Refund,
                    Description = $"Tự động hoàn tiền cho đặt chỗ #{booking.BookingCode}",
                    CreatedAt = DateTime.UtcNow
                });

                refundRequest.Status = RefundStatus.Processed;
                refundRequest.ProcessedAt = DateTime.UtcNow;
                refundRequest.AdminNote = "Tự động hoàn tiền theo chính sách hủy";

                await _commerceService.CompleteRefundAsync(booking, refundRequest, refundAmount, booking.PartnerId);

                await _notificationService.SendNotificationAsync(
                    userId,
                    "Hoàn tiền thành công",
                    $"Đặt chỗ #{booking.BookingCode} đã được hủy. Số tiền {refundAmount:N0} VNĐ đã được hoàn về Ví VNS của bạn.",
                    NotificationType.RefundProcessed,
                    booking.Id
                );

                var cancelEmail = booking.ContactEmail;
                if (!string.IsNullOrEmpty(cancelEmail))
                {
                    var svcName = booking.ComboName ?? booking.Service?.Name ?? "Dịch vụ VNS";
                    _ = _emailService.SendEmailAsync(
                        cancelEmail,
                        $"Đặt chỗ #{booking.BookingCode} đã hủy - Hoàn tiền {refundAmount:N0} VNĐ",
                        $"<h2>Xác nhận hủy đặt chỗ và hoàn tiền</h2>" +
                        $"<p>Xin chào <b>{booking.ContactName}</b>,</p>" +
                        $"<p>Đặt chỗ <b>#{booking.BookingCode}</b> cho dịch vụ <b>{svcName}</b> đã được hủy thành công.</p>" +
                        $"<p><b>Số tiền đã hoàn:</b> {refundAmount:N0} VNĐ</p>" +
                        $"<p>Số tiền đã được chuyển vào Ví VNS của bạn.</p>" +
                        (!string.IsNullOrEmpty(reason) ? $"<p><b>Lý do:</b> {reason}</p>" : "") +
                        $"<p>Trân trọng,<br/>Đội ngũ VNS</p>"
                    );
                }

                return new
                {
                    Message = "Hủy đặt chỗ thành công. Tiền hoàn đã được chuyển vào Ví VNS.",
                    RefundAmount = refundAmount,
                    RefundEligibilityMessage = refundPreview.EligibilityMessage
                };
            }
            else
            {
                booking.FulfillmentStatus = BookingFulfillmentStatus.Cancelled;
                if (booking.CommercialStatus == BookingCommercialStatus.Paid)
                    booking.CommercialStatus = BookingCommercialStatus.Forfeited;
                booking.Status = _commerceService.GetLegacyBookingStatus(booking);
                booking.CancelledAt = DateTime.UtcNow;
                booking.UpdatedAt = DateTime.UtcNow;
                booking.CancellationReason = reason;

                await _context.SaveChangesAsync();
                await _commerceService.ReleaseReservationsAsync(booking.Id, InventoryReservationStatus.Released);

                await _notificationService.SendNotificationAsync(
                    userId,
                    "Hủy đặt chỗ",
                    $"Đặt chỗ #{booking.BookingCode} đã được hủy thành công",
                    NotificationType.BookingCancelled,
                    booking.Id
                );

                var cancelEmail = booking.ContactEmail;
                if (!string.IsNullOrEmpty(cancelEmail))
                {
                    var svcName = booking.ComboName ?? booking.Service?.Name ?? "Dịch vụ VNS";
                    _ = _emailService.SendEmailAsync(
                        cancelEmail,
                        $"Đặt chỗ #{booking.BookingCode} đã hủy",
                        $"<h2>Thông báo hủy đặt chỗ</h2>" +
                        $"<p>Xin chào <b>{booking.ContactName}</b>,</p>" +
                        $"<p>Đặt chỗ <b>#{booking.BookingCode}</b> cho dịch vụ <b>{svcName}</b> đã được hủy thành công.</p>" +
                        (!string.IsNullOrEmpty(reason) ? $"<p><b>Lý do:</b> {reason}</p>" : "") +
                        $"<p>Trân trọng,<br/>Đội ngũ VNS</p>"
                    );
                }

                return new
                {
                    Message = "Hủy đặt chỗ thành công",
                    RefundAmount = 0m,
                    RefundEligibilityMessage = refundPreview.EligibilityMessage
                };
            }
        }

        public async Task<object> CancelPartnerBookingAsync(Guid userId, Guid bookingId, string? reason = null)
        {
            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            if (partner == null)
                throw new BusinessException("Không tìm thấy đối tác");

            var booking = await _context.Bookings
                .Include(b => b.Payment)
                .Include(b => b.Service)
                .Include(b => b.ComboBookingItems).ThenInclude(cbi => cbi.Room)
                .Include(b => b.ComboBookingItems).ThenInclude(cbi => cbi.TourSchedule)
                    .ThenInclude(ts => ts!.Tour)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.TourSchedule)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.Room)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.PartnerId == partner.Id);

            if (booking == null)
                throw new BusinessException("Không tìm thấy đặt chỗ");

            if (booking.CommercialStatus != BookingCommercialStatus.Paid
                || (booking.FulfillmentStatus != BookingFulfillmentStatus.AwaitingPartner
                    && booking.FulfillmentStatus != BookingFulfillmentStatus.Confirmed))
                throw new BusinessException("Không thể hủy đặt chỗ ở trạng thái hiện tại");

            booking.FulfillmentStatus = BookingFulfillmentStatus.Cancelled;
            booking.CommercialStatus = booking.Payment != null && booking.Payment.PaymentStatus == PaymentStatus.Completed
                ? BookingCommercialStatus.Refunded
                : booking.CommercialStatus;
            booking.Status = _commerceService.GetLegacyBookingStatus(booking);
            booking.CancelledAt = DateTime.UtcNow;
            booking.UpdatedAt = DateTime.UtcNow;
            booking.CancellationReason = reason ?? "Đối tác hủy đặt chỗ";

            // Refund toàn bộ tiền đã thanh toán về ví VNS của người dùng
            if (booking.Payment != null && booking.Payment.PaymentStatus == PaymentStatus.Completed)
            {
                var totalRefund = booking.Payment.Amount;
                var wallet = await _context.Wallets.FirstOrDefaultAsync(w => w.UserId == booking.UserId);
                if (wallet == null)
                {
                    wallet = new Wallet
                    {
                        Id = Guid.NewGuid(),
                        UserId = booking.UserId,
                        Balance = 0,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Wallets.Add(wallet);
                }

                if (totalRefund > 0)
                {
                    var balanceBefore = wallet.Balance;
                    wallet.Balance += totalRefund;
                    wallet.UpdatedAt = DateTime.UtcNow;

                    _context.WalletTransactions.Add(new WalletTransaction
                    {
                        Id = Guid.NewGuid(),
                        WalletId = wallet.Id,
                        BookingId = booking.Id,
                        Amount = totalRefund,
                        BalanceBefore = balanceBefore,
                        BalanceAfter = wallet.Balance,
                        Type = WalletTransactionType.Refund,
                        Description = $"Hoàn tiền đặt chỗ #{booking.BookingCode} (đối tác hủy)",
                        CreatedAt = DateTime.UtcNow
                    });
                }

                booking.Payment.PaymentStatus = PaymentStatus.Refunded;
            }

            // Release tour slots
            foreach (var detail in booking.BookingDetails.Where(bd => bd.TourScheduleId.HasValue))
                await ReleaseAssignedRunAsync(detail.TourScheduleId, detail.TourScheduleRunId, detail.Quantity);

            // Release homestay room availability
            var partnerRoomDetails = booking.BookingDetails.Where(bd => bd.RoomId.HasValue).ToList();
            if (partnerRoomDetails.Any() && booking.CheckInDate.HasValue && booking.CheckOutDate.HasValue)
            {
                var cin = booking.CheckInDate.Value.Date;
                var cout = booking.CheckOutDate.Value.Date;
                foreach (var detail in partnerRoomDetails)
                {
                    var qty = detail.Quantity;
                    var roomId = detail.RoomId!.Value;
                    await _context.Database.ExecuteSqlRawAsync(
                        "UPDATE RoomAvailabilities SET AvailableCount = AvailableCount + {0} " +
                        "WHERE RoomId = {1} AND Date >= {2} AND Date < {3}",
                        qty, roomId, cin, cout);
                }
            }

            if (booking.ComboBookingItems.Any())
            {
                await ReleaseComboResourcesAsync(booking);
                await AdjustComboServiceBookingCountsAsync(booking, -1);
            }
            else if (booking.Service != null)
                booking.Service.TotalBookings = Math.Max(0, booking.Service.TotalBookings - 1);

            // Reverse voucher usage
            if (booking.VoucherId.HasValue)
            {
                var voucher = await _context.Vouchers.FindAsync(booking.VoucherId);
                if (voucher != null) voucher.UsedCount = Math.Max(0, voucher.UsedCount - 1);
                var usage = await _context.VoucherUsages.FirstOrDefaultAsync(vu => vu.BookingId == booking.Id);
                if (usage != null) _context.VoucherUsages.Remove(usage);
            }

            await _context.SaveChangesAsync();
            if (booking.Payment != null && booking.Payment.PaymentStatus == PaymentStatus.Refunded)
            {
                var syntheticRefundRequest = new RefundRequest
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    UserId = booking.UserId,
                    Reason = booking.CancellationReason ?? "Partner cancelled booking",
                    RefundAmount = booking.Payment.Amount,
                    Status = RefundStatus.Processed,
                    AdminNote = reason,
                    CreatedAt = booking.CancelledAt ?? DateTime.UtcNow,
                    ProcessedAt = DateTime.UtcNow,
                    ProcessedBy = userId
                };
                _context.RefundRequests.Add(syntheticRefundRequest);
                await _context.SaveChangesAsync();
                await _commerceService.EnsureRefundCaseAsync(syntheticRefundRequest, booking);
                await _commerceService.CompleteRefundAsync(booking, syntheticRefundRequest, syntheticRefundRequest.RefundAmount, booking.PartnerId);
            }

            // Thông báo cho người dùng
            await _notificationService.SendNotificationAsync(
                booking.UserId,
                "Đặt chỗ đã bị hủy",
                $"Đặt chỗ #{booking.BookingCode} đã bị đối tác hủy. Số tiền đã được hoàn về ví VNS của bạn.",
                NotificationType.BookingCancelled,
                booking.Id
            );

            // Gửi email thông báo hủy + hoàn tiền
            var contactEmail = booking.ContactEmail;
            if (!string.IsNullOrEmpty(contactEmail))
            {
                var refundAmount = booking.Payment?.Amount ?? booking.FinalAmount;
                var serviceName = booking.ComboName ?? booking.Service?.Name ?? "Dịch vụ VNS";
                var cancelReason = booking.CancellationReason ?? "Đối tác hủy đặt chỗ";
                _ = _emailService.SendEmailAsync(
                    contactEmail,
                    $"Đặt chỗ #{booking.BookingCode} đã bị hủy - Hoàn tiền {refundAmount:N0} VNĐ",
                    $"<h2>Thông báo hủy đặt chỗ</h2>" +
                    $"<p>Xin chào <b>{booking.ContactName}</b>,</p>" +
                    $"<p>Đặt chỗ <b>#{booking.BookingCode}</b> cho dịch vụ <b>{serviceName}</b> đã bị hủy.</p>" +
                    $"<p><b>Lý do hủy:</b> {cancelReason}</p>" +
                    $"<p><b>Số tiền hoàn:</b> {refundAmount:N0} VNĐ</p>" +
                    $"<p>Số tiền đã được hoàn về <b>Ví VNS</b> của bạn. Bạn có thể kiểm tra số dư trong ứng dụng.</p>" +
                    $"<p>Trân trọng,<br/>Đội ngũ VNS</p>"
                );
            }

            return new { Message = "Hủy đặt chỗ thành công. Tiền đã được hoàn về ví VNS của người dùng." };
        }

        public async Task<object> GetPartnerBookingsAsync(Guid userId, PartnerBookingFilterDto filter)
        {
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1) filter.PageSize = 10;
            if (filter.PageSize > 100) filter.PageSize = 100;

            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            if (partner == null) throw new BusinessException("Không tìm thấy đối tác");

            var query = _context.Bookings
                .Include(b => b.Service)
                    .ThenInclude(service => service.Homestay)
                .Include(b => b.Combo)
                .Include(b => b.User)
                .Include(b => b.Payment)
                .Include(b => b.RefundRequest)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.TourSchedule)
                .Include(b => b.BookingComponents)
                    .ThenInclude(component => component.Service)
                        .ThenInclude(service => service.Homestay)
                .Where(b => b.PartnerId == partner.Id)
                .AsQueryable();

            if (filter.Status.HasValue)
                query = query.Where(b => b.Status == filter.Status.Value);

            if (filter.CommercialStatus.HasValue)
                query = query.Where(b => b.CommercialStatus == filter.CommercialStatus.Value);

            if (filter.CommercialStatuses != null && filter.CommercialStatuses.Count > 0)
                query = query.Where(b => filter.CommercialStatuses.Contains(b.CommercialStatus));

            if (filter.ExcludedCommercialStatuses != null && filter.ExcludedCommercialStatuses.Count > 0)
                query = query.Where(b => !filter.ExcludedCommercialStatuses.Contains(b.CommercialStatus));

            if (filter.FulfillmentStatus.HasValue)
                query = query.Where(b => b.FulfillmentStatus == filter.FulfillmentStatus.Value);

            if (filter.FulfillmentStatuses != null && filter.FulfillmentStatuses.Count > 0)
                query = query.Where(b => filter.FulfillmentStatuses.Contains(b.FulfillmentStatus));

            if (filter.FromDate.HasValue)
                query = query.Where(b => b.BookingDate >= filter.FromDate.Value);

            if (filter.ToDate.HasValue)
                query = query.Where(b => b.BookingDate <= filter.ToDate.Value);

            if (filter.ServiceId.HasValue)
                query = query.Where(b => b.ServiceId == filter.ServiceId.Value);

            if (filter.ServiceType.HasValue)
            {
                var serviceType = (ServiceType)filter.ServiceType.Value;
                query = serviceType == ServiceType.Combo
                    ? query.Where(b => b.ComboId.HasValue)
                    : query.Where(b => b.ComboId == null && b.Service.ServiceType == serviceType);
            }

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(b => b.BookingCode.ToLower().Contains(kw)
                    || b.Service.Name.ToLower().Contains(kw)
                    || (b.ComboName != null && b.ComboName.ToLower().Contains(kw))
                    || b.ContactName.ToLower().Contains(kw));
            }

            var totalCount = await query.CountAsync();
            var bookings = await query
                .OrderByDescending(b => b.BookingDate)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            var requestedAtUtc = DateTime.UtcNow;
            var items = bookings.Select(b =>
            {
                return new BookingListDto
                {
                    Id = b.Id,
                    UserId = b.UserId,
                    BookingCode = b.BookingCode,
                    ServiceName = b.ComboId.HasValue ? (b.ComboName ?? b.Service.Name) : b.Service.Name,
                    ServiceType = b.ComboId.HasValue ? ServiceType.Combo : b.Service.ServiceType,
                    ThumbnailUrl = b.ComboId.HasValue ? (b.Combo != null ? b.Combo.ThumbnailUrl : b.Service.ThumbnailUrl) : b.Service.ThumbnailUrl,
                    Status = b.Status,
                    TotalAmount = b.TotalAmount,
                    DiscountAmount = b.DiscountAmount,
                    FinalAmount = b.FinalAmount,
                    PaymentMethod = b.Payment != null ? b.Payment.PaymentMethod : (PaymentMethod?)null,
                    PaymentStatus = b.Payment != null ? b.Payment.PaymentStatus : (PaymentStatus?)null,
                    PaidAmount = b.Payment != null ? b.Payment.Amount : 0,
                    WalletAmount = b.Payment != null ? b.Payment.WalletAmount : 0,
                    VnPayAmount = b.Payment != null ? b.Payment.VnPayAmount : 0,
                    NumberOfGuests = b.NumberOfGuests,
                    CheckInDate = b.CheckInDate,
                    CheckOutDate = b.CheckOutDate,
                    StartDate = b.CheckInDate ?? b.BookingDetails
                        .Where(bd => bd.TourSchedule != null)
                        .Select(bd => bd.TourSchedule!.StartDate)
                        .FirstOrDefault(),
                    EndDate = b.CheckOutDate ?? b.BookingDetails
                        .Where(bd => bd.TourSchedule != null)
                        .Select(bd => bd.TourSchedule!.EndDate)
                        .FirstOrDefault(),
                    BookingDate = b.BookingDate,
                    ExpiresAt = b.ExpiresAt,
                    PartnerId = b.PartnerId,
                    CustomerName = b.ContactName,
                    ContactEmail = b.ContactEmail,
                    ContactPhone = b.ContactPhone,
                    Address = b.Service.Address,
                    ComboId = b.ComboId,
                    ComboName = b.ComboName,
                    CommercialStatus = b.CommercialStatus,
                    FulfillmentStatus = b.FulfillmentStatus,
                    CanPay = b.CommercialStatus == BookingCommercialStatus.PendingPayment && b.FulfillmentStatus == BookingFulfillmentStatus.AwaitingPartner && b.Status == BookingStatus.Pending,
                    CanCancel = _commerceService.CanCancel(b),
                    CanRefund = BookingRefundHelper.CanRefund(b, requestedAtUtc),
                    CanPartnerConfirm = b.CommercialStatus == BookingCommercialStatus.Paid && b.FulfillmentStatus == BookingFulfillmentStatus.AwaitingPartner,
                    CanPartnerComplete = b.CommercialStatus == BookingCommercialStatus.Paid && b.FulfillmentStatus == BookingFulfillmentStatus.Confirmed,
                    CanPartnerCancel = b.CommercialStatus == BookingCommercialStatus.Paid && (b.FulfillmentStatus == BookingFulfillmentStatus.AwaitingPartner || b.FulfillmentStatus == BookingFulfillmentStatus.Confirmed)
                };
            }).ToList();

            if (items.Count > 0)
            {
                await EnrichPartnerBookingOperationalSnapshotsAsync(items);
            }

            return new
            {
                Items = items,
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize)
            };
        }

        private async Task EnrichPartnerBookingOperationalSnapshotsAsync(List<BookingListDto> items)
        {
            var bookingIds = items.Select(item => item.Id).Distinct().ToList();
            if (bookingIds.Count == 0)
            {
                return;
            }

            var bookings = await _context.Bookings
                .AsNoTracking()
                .Where(b => bookingIds.Contains(b.Id))
                .Include(b => b.Service)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.Room)
                .Include(b => b.BookingDetails)
                    .ThenInclude(bd => bd.TourScheduleRun)
                        .ThenInclude(run => run!.TourSchedule)
                            .ThenInclude(schedule => schedule!.Tour)
                .Include(b => b.ComboBookingItems)
                    .ThenInclude(cbi => cbi.Service)
                .Include(b => b.ComboBookingItems)
                    .ThenInclude(cbi => cbi.Room)
                .Include(b => b.ComboBookingItems)
                    .ThenInclude(cbi => cbi.TourScheduleRun)
                        .ThenInclude(run => run!.TourSchedule)
                            .ThenInclude(schedule => schedule!.Tour)
                .ToListAsync();

            var roomStayKeys = CollectRoomStayKeys(bookings);
            var roomRemainingByStay = roomStayKeys.Count > 0
                ? await LoadRoomRemainingByStayAsync(roomStayKeys)
                : new Dictionary<RoomStayKey, int>();

            var snapshotByBookingId = bookings.ToDictionary(
                booking => booking.Id,
                booking => BuildBookingOperationalSnapshots(booking, roomRemainingByStay));

            foreach (var item in items)
            {
                item.OperationalSnapshots = snapshotByBookingId.TryGetValue(item.Id, out var snapshots)
                    ? snapshots
                    : new List<BookingOperationalSnapshotDto>();
            }
        }

        private static HashSet<RoomStayKey> CollectRoomStayKeys(IEnumerable<Booking> bookings)
        {
            var keys = new HashSet<RoomStayKey>();

            foreach (var booking in bookings)
            {
                if (booking.ComboId.HasValue)
                {
                    foreach (var comboItem in booking.ComboBookingItems.Where(item => item.RoomId.HasValue))
                    {
                        if (comboItem.CheckInDate.HasValue && comboItem.CheckOutDate.HasValue)
                        {
                            keys.Add(new RoomStayKey(
                                comboItem.RoomId!.Value,
                                comboItem.CheckInDate.Value.Date,
                                comboItem.CheckOutDate.Value.Date));
                        }
                    }

                    continue;
                }

                foreach (var detail in booking.BookingDetails.Where(detail => detail.RoomId.HasValue))
                {
                    if (booking.CheckInDate.HasValue && booking.CheckOutDate.HasValue)
                    {
                        keys.Add(new RoomStayKey(
                            detail.RoomId!.Value,
                            booking.CheckInDate.Value.Date,
                            booking.CheckOutDate.Value.Date));
                    }
                }
            }

            return keys;
        }

        private async Task<Dictionary<RoomStayKey, int>> LoadRoomRemainingByStayAsync(HashSet<RoomStayKey> roomStayKeys)
        {
            var result = new Dictionary<RoomStayKey, int>();
            if (roomStayKeys.Count == 0)
            {
                return result;
            }

            var roomIds = roomStayKeys.Select(key => key.RoomId).Distinct().ToList();
            var minDate = roomStayKeys.Min(key => DateOnly.FromDateTime(key.CheckInDate));
            var maxDate = roomStayKeys.Max(key => DateOnly.FromDateTime(key.CheckOutDate));

            var availabilityRows = await _context.RoomAvailabilities
                .AsNoTracking()
                .Where(availability => roomIds.Contains(availability.RoomId)
                    && availability.Date >= minDate
                    && availability.Date < maxDate)
                .ToListAsync();

            var roomsWithAvailability = availabilityRows
                .Select(availability => availability.RoomId)
                .ToHashSet();

            var roomQuantities = await _context.Rooms
                .AsNoTracking()
                .Where(room => roomIds.Contains(room.Id))
                .ToDictionaryAsync(room => room.Id, room => room.Quantity);

            var minDateTime = roomStayKeys.Min(key => key.CheckInDate);
            var maxDateTime = roomStayKeys.Max(key => key.CheckOutDate);

            var directRoomUsage = await _context.BookingDetails
                .AsNoTracking()
                .Where(detail => detail.RoomId.HasValue
                    && roomIds.Contains(detail.RoomId.Value)
                    && detail.Booking.Status != BookingStatus.Cancelled
                    && detail.Booking.Status != BookingStatus.Refunded
                    && detail.Booking.CheckInDate.HasValue
                    && detail.Booking.CheckOutDate.HasValue
                    && detail.Booking.CheckInDate.Value < maxDateTime
                    && detail.Booking.CheckOutDate.Value > minDateTime)
                .Select(detail => new RoomUsageSnapshot
                {
                    RoomId = detail.RoomId!.Value,
                    CheckInDate = detail.Booking.CheckInDate!.Value,
                    CheckOutDate = detail.Booking.CheckOutDate!.Value,
                    Quantity = detail.Quantity
                })
                .ToListAsync();

            var comboRoomUsage = await _context.ComboBookingItems
                .AsNoTracking()
                .Where(item => item.RoomId.HasValue
                    && roomIds.Contains(item.RoomId.Value)
                    && item.Booking.Status != BookingStatus.Cancelled
                    && item.Booking.Status != BookingStatus.Refunded
                    && item.CheckInDate.HasValue
                    && item.CheckOutDate.HasValue
                    && item.CheckInDate.Value < maxDateTime
                    && item.CheckOutDate.Value > minDateTime)
                .Select(item => new RoomUsageSnapshot
                {
                    RoomId = item.RoomId!.Value,
                    CheckInDate = item.CheckInDate!.Value,
                    CheckOutDate = item.CheckOutDate!.Value,
                    Quantity = item.Quantity
                })
                .ToListAsync();

            var allRoomUsage = directRoomUsage
                .Concat(comboRoomUsage)
                .ToList();

            foreach (var stayKey in roomStayKeys)
            {
                if (roomsWithAvailability.Contains(stayKey.RoomId))
                {
                    var stayDates = Enumerable
                        .Range(0, Math.Max((stayKey.CheckOutDate - stayKey.CheckInDate).Days, 0))
                        .Select(offset => DateOnly.FromDateTime(stayKey.CheckInDate.AddDays(offset)))
                        .ToList();

                    var availabilityByDate = availabilityRows
                        .Where(availability => availability.RoomId == stayKey.RoomId
                            && availability.Date >= DateOnly.FromDateTime(stayKey.CheckInDate)
                            && availability.Date < DateOnly.FromDateTime(stayKey.CheckOutDate))
                        .ToDictionary(availability => availability.Date, availability => availability);

                    var hasFullRange = stayDates.All(date => availabilityByDate.ContainsKey(date));
                    result[stayKey] = hasFullRange && stayDates.Count > 0
                        ? stayDates.Min(date => availabilityByDate[date].AvailableCount)
                        : 0;

                    continue;
                }

                var roomQuantity = roomQuantities.TryGetValue(stayKey.RoomId, out var quantity)
                    ? quantity
                    : 0;

                var overlappingQuantity = allRoomUsage
                    .Where(usage => usage.RoomId == stayKey.RoomId
                        && usage.CheckInDate < stayKey.CheckOutDate
                        && usage.CheckOutDate > stayKey.CheckInDate)
                    .Sum(usage => usage.Quantity);

                result[stayKey] = Math.Max(roomQuantity - overlappingQuantity, 0);
            }

            return result;
        }

        private static List<BookingOperationalSnapshotDto> BuildBookingOperationalSnapshots(
            Booking booking,
            IReadOnlyDictionary<RoomStayKey, int> roomRemainingByStay)
        {
            var snapshots = new List<BookingOperationalSnapshotDto>();
            var canHighlightAttention = booking.FulfillmentStatus != BookingFulfillmentStatus.Completed
                && booking.FulfillmentStatus != BookingFulfillmentStatus.Cancelled;

            if (booking.ComboId.HasValue)
            {
                var homestayItems = booking.ComboBookingItems
                    .Where(item => item.RoomId.HasValue && item.Room != null)
                    .GroupBy(item => item.RoomId!.Value)
                    .Select(group => group.First())
                    .ToList();

                foreach (var item in homestayItems)
                {
                    var serviceName = item.Service?.Name ?? booking.ComboName ?? booking.Service.Name;
                    var stayKey = item.CheckInDate.HasValue && item.CheckOutDate.HasValue
                        ? new RoomStayKey(item.RoomId!.Value, item.CheckInDate.Value.Date, item.CheckOutDate.Value.Date)
                        : (RoomStayKey?)null;
                    var remaining = stayKey.HasValue && roomRemainingByStay.TryGetValue(stayKey.Value, out var roomsLeft)
                        ? roomsLeft
                        : (int?)null;

                    snapshots.Add(BuildHomestayOperationalSnapshot(
                        serviceName,
                        item.Room!,
                        item.Quantity,
                        item.CheckInDate,
                        item.CheckOutDate,
                        remaining,
                        canHighlightAttention));
                }

                var tourItems = booking.ComboBookingItems
                    .Where(item => item.TourScheduleRunId.HasValue && item.TourScheduleRun != null)
                    .GroupBy(item => item.TourScheduleRunId!.Value)
                    .Select(group => group.First())
                    .ToList();

                foreach (var item in tourItems)
                {
                    var serviceName = item.Service?.Name ?? booking.ComboName ?? booking.Service.Name;
                    snapshots.Add(BuildTourOperationalSnapshot(
                        serviceName,
                        item.TourScheduleRun!,
                        canHighlightAttention));
                }

                return snapshots;
            }

            var roomDetails = booking.BookingDetails
                .Where(detail => detail.RoomId.HasValue && detail.Room != null)
                .GroupBy(detail => detail.RoomId!.Value)
                .Select(group => new
                {
                    Room = group.First().Room!,
                    Quantity = group.Sum(detail => detail.Quantity)
                })
                .ToList();

            foreach (var roomDetail in roomDetails)
            {
                var stayKey = booking.CheckInDate.HasValue && booking.CheckOutDate.HasValue
                    ? new RoomStayKey(roomDetail.Room.Id, booking.CheckInDate.Value.Date, booking.CheckOutDate.Value.Date)
                    : (RoomStayKey?)null;
                var remaining = stayKey.HasValue && roomRemainingByStay.TryGetValue(stayKey.Value, out var roomsLeft)
                    ? roomsLeft
                    : (int?)null;

                snapshots.Add(BuildHomestayOperationalSnapshot(
                    booking.Service.Name,
                    roomDetail.Room,
                    roomDetail.Quantity,
                    booking.CheckInDate,
                    booking.CheckOutDate,
                    remaining,
                    canHighlightAttention));
            }

            var tourRuns = booking.BookingDetails
                .Where(detail => detail.TourScheduleRunId.HasValue && detail.TourScheduleRun != null)
                .GroupBy(detail => detail.TourScheduleRunId!.Value)
                .Select(group => group.First().TourScheduleRun!)
                .ToList();

            foreach (var run in tourRuns)
            {
                snapshots.Add(BuildTourOperationalSnapshot(
                    booking.Service.Name,
                    run,
                    canHighlightAttention));
            }

            return snapshots;
        }

        private static BookingOperationalSnapshotDto BuildTourOperationalSnapshot(
            string serviceName,
            TourScheduleRun run,
            bool canHighlightAttention)
        {
            var minimumParticipants = Math.Max(run.TourSchedule?.Tour?.MinParticipants ?? 1, 1);
            var maximumParticipants = Math.Max(run.MaxParticipants, 0);
            var currentParticipants = Math.Max(run.BookedSlots, 0);
            var remainingParticipants = Math.Max(maximumParticipants - currentParticipants, 0);
            var hasReachedMinimum = currentParticipants >= minimumParticipants;

            return new BookingOperationalSnapshotDto
            {
                ServiceType = ServiceType.Tour,
                ServiceName = serviceName,
                PrimaryLabel = run.RunIndex.ToString(),
                IsAttention = canHighlightAttention && !hasReachedMinimum,
                MinimumUnits = minimumParticipants,
                CurrentUnits = currentParticipants,
                MaximumUnits = maximumParticipants,
                RemainingUnits = remainingParticipants
            };
        }

        private static BookingOperationalSnapshotDto BuildHomestayOperationalSnapshot(
            string serviceName,
            Room room,
            int bookedQuantity,
            DateTime? checkInDate,
            DateTime? checkOutDate,
            int? remainingRooms,
            bool canHighlightAttention)
        {
            return new BookingOperationalSnapshotDto
            {
                ServiceType = ServiceType.Homestay,
                ServiceName = serviceName,
                PrimaryLabel = room.Name,
                IsAttention = canHighlightAttention && remainingRooms.HasValue && remainingRooms.Value <= 0,
                CurrentUnits = bookedQuantity,
                MaximumUnits = room.Quantity,
                RemainingUnits = remainingRooms,
                CheckInDate = checkInDate,
                CheckOutDate = checkOutDate
            };
        }

        private readonly record struct RoomStayKey(Guid RoomId, DateTime CheckInDate, DateTime CheckOutDate);

        private sealed class RoomUsageSnapshot
        {
            public Guid RoomId { get; set; }
            public DateTime CheckInDate { get; set; }
            public DateTime CheckOutDate { get; set; }
            public int Quantity { get; set; }
        }

        public async Task<object> GetPartnerBookingDetailAsync(Guid userId, Guid bookingId)
        {
            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            if (partner == null) throw new BusinessException("Không tìm thấy đối tác");

            var booking = await _context.Bookings
                .Include(b => b.Service)
                .Include(b => b.Combo)
                .Include(b => b.User)
                .Include(b => b.Payment)
                .Include(b => b.RefundRequest)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.Room)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.TourSchedule)
                    .ThenInclude(ts => ts!.Tour)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.TourScheduleRun)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.TourPricingTier)
                    .ThenInclude(tier => tier!.Tour)
                .Include(b => b.ComboBookingItems).ThenInclude(cbi => cbi.ComboItem)
                .Include(b => b.ComboBookingItems).ThenInclude(cbi => cbi.Service)
                .Include(b => b.ComboBookingItems).ThenInclude(cbi => cbi.Room)
                .Include(b => b.ComboBookingItems).ThenInclude(cbi => cbi.TourSchedule)
                .Include(b => b.ComboBookingItems).ThenInclude(cbi => cbi.TourScheduleRun)
                .Include(b => b.ComboBookingItems).ThenInclude(cbi => cbi.TourPricingTier)
                .Include(b => b.BookingComponents).ThenInclude(component => component.Service).ThenInclude(service => service.Homestay)
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.PartnerId == partner.Id);

            if (booking == null)
                throw new BusinessException("Không tìm thấy đặt chỗ");

            var requestedAtUtc = DateTime.UtcNow;
            var refundPreview = BookingRefundHelper.BuildRefundPreview(booking, requestedAtUtc);

            return new BookingDetailDto
            {
                Id = booking.Id,
                UserId = booking.UserId,
                BookingCode = booking.BookingCode,
                ServiceId = booking.ServiceId,
                ServiceName = booking.ComboId.HasValue ? (booking.ComboName ?? booking.Service.Name) : booking.Service.Name,
                ServiceType = booking.ComboId.HasValue ? ServiceType.Combo : booking.Service.ServiceType,
                ThumbnailUrl = booking.ComboId.HasValue ? (booking.Combo?.ThumbnailUrl ?? booking.Service.ThumbnailUrl) : booking.Service.ThumbnailUrl,
                Address = booking.Service.Address,
                Status = booking.Status,
                TotalAmount = booking.TotalAmount,
                DiscountAmount = booking.DiscountAmount,
                FinalAmount = booking.FinalAmount,
                NumberOfGuests = booking.NumberOfGuests,
                ContactName = booking.ContactName,
                ContactPhone = booking.ContactPhone,
                ContactEmail = booking.ContactEmail,
                SpecialRequests = booking.SpecialRequests,
                CheckInDate = booking.CheckInDate,
                CheckOutDate = booking.CheckOutDate,
                StartDate = booking.CheckInDate ?? booking.BookingDetails
                    .FirstOrDefault(bd => bd.TourSchedule != null)
                    ?.TourSchedule?.StartDate,
                EndDate = booking.CheckOutDate ?? booking.BookingDetails
                    .FirstOrDefault(bd => bd.TourSchedule != null)
                    ?.TourSchedule?.EndDate,
                BookingDate = booking.BookingDate,
                ConfirmedAt = booking.ConfirmedAt,
                CompletedAt = booking.CompletedAt,
                CancelledAt = booking.CancelledAt,
                CancellationReason = booking.CancellationReason,
                ExpiresAt = booking.ExpiresAt,
                PartnerId = booking.PartnerId,
                PartnerName = booking.Service.Partner?.BusinessName ?? "",
                CustomerName = booking.ContactName,
                ComboId = booking.ComboId,
                ComboName = booking.ComboName,
                ComboOriginalAmount = booking.ComboBookingItems.Sum(cbi => cbi.SubTotal),
                ComboBundleDiscountAmount = booking.ComboId.HasValue
                    ? Math.Max(0, booking.ComboBookingItems.Sum(cbi => cbi.SubTotal) - booking.TotalAmount)
                    : null,
                CommercialStatus = booking.CommercialStatus,
                FulfillmentStatus = booking.FulfillmentStatus,
                CanPay = _commerceService.CanPay(booking),
                CanCancel = _commerceService.CanCancel(booking),
                CanRefund = BookingRefundHelper.CanRefund(booking, requestedAtUtc),
                RefundEligibleAmount = refundPreview.RefundEligibleAmount,
                RefundEligibilityMessage = refundPreview.EligibilityMessage,
                RefundComponents = booking.ComboId.HasValue ? refundPreview.Components : new List<RefundPreviewComponentDto>(),
                CanPartnerConfirm = booking.CommercialStatus == BookingCommercialStatus.Paid
                    && booking.FulfillmentStatus == BookingFulfillmentStatus.AwaitingPartner,
                CanPartnerComplete = booking.CommercialStatus == BookingCommercialStatus.Paid
                    && booking.FulfillmentStatus == BookingFulfillmentStatus.Confirmed,
                CanPartnerCancel = booking.CommercialStatus == BookingCommercialStatus.Paid
                    && (booking.FulfillmentStatus == BookingFulfillmentStatus.AwaitingPartner
                        || booking.FulfillmentStatus == BookingFulfillmentStatus.Confirmed),
                RefundSummary = booking.RefundRequest != null ? new RefundSummaryDto
                {
                    Id = booking.RefundRequest.Id,
                    Status = booking.RefundRequest.Status,
                    RequestedAmount = booking.RefundRequest.RefundAmount,
                    ApprovedAmount = booking.RefundRequest.Status == RefundStatus.Processed
                        ? booking.RefundRequest.RefundAmount
                        : null,
                    Reason = booking.RefundRequest.Reason,
                    AdminNote = booking.RefundRequest.AdminNote,
                    RequestedAt = booking.RefundRequest.CreatedAt,
                    ProcessedAt = booking.RefundRequest.ProcessedAt
                } : null,
                Payment = booking.Payment != null ? new PaymentInfoDto
                {
                    Id = booking.Payment.Id,
                    Amount = booking.Payment.Amount,
                    WalletAmount = booking.Payment.WalletAmount,
                    VnPayAmount = booking.Payment.VnPayAmount,
                    PaymentMethod = booking.Payment.PaymentMethod,
                    PaymentStatus = booking.Payment.PaymentStatus,
                    PaidAt = booking.Payment.PaidAt
                } : null,
                Payments = booking.Payment != null ? new List<PaymentInfoDto>
                {
                    new PaymentInfoDto
                    {
                        Id = booking.Payment.Id,
                        Amount = booking.Payment.Amount,
                        WalletAmount = booking.Payment.WalletAmount,
                        VnPayAmount = booking.Payment.VnPayAmount,
                        PaymentMethod = booking.Payment.PaymentMethod,
                        PaymentStatus = booking.Payment.PaymentStatus,
                        PaidAt = booking.Payment.PaidAt
                    }
                } : new List<PaymentInfoDto>(),
                Details = booking.BookingDetails.Select(bd => new BookingDetailLineDto
                {
                    Id = bd.Id,
                    RoomName = bd.Room?.Name,
                    TourPackageName = bd.TourPricingTier?.Tour?.Name ?? bd.TourSchedule?.Tour?.Name,
                    TourPricingTierName = bd.TourPricingTier?.Name,
                    TourScheduleRunId = bd.TourScheduleRunId,
                    StartDate = bd.TourSchedule?.StartDate,
                    EndDate = bd.TourSchedule?.EndDate,
                    TourScheduleRunInfo = bd.TourScheduleRun != null ? $"Run {bd.TourScheduleRun.RunIndex}" : null,
                    Quantity = bd.Quantity,
                    UnitPrice = bd.UnitPrice,
                    SubTotal = bd.SubTotal
                }).ToList(),
                ComboItems = booking.ComboBookingItems
                    .OrderBy(cbi => cbi.ComboItem != null ? cbi.ComboItem.DisplayOrder : int.MaxValue)
                    .ThenBy(cbi => cbi.CreatedAt)
                    .Select(cbi => new ComboBookingItemDto
                    {
                        Id = cbi.Id,
                        ComboItemId = cbi.ComboItemId,
                        DisplayOrder = cbi.ComboItem?.DisplayOrder ?? int.MaxValue,
                        ServiceId = cbi.ServiceId,
                        ServiceName = cbi.Service.Name,
                        ServiceType = cbi.Service.ServiceType,
                        ThumbnailUrl = cbi.Service.ThumbnailUrl,
                        RoomId = cbi.RoomId,
                        RoomName = cbi.Room?.Name,
                        TourScheduleId = cbi.TourScheduleId,
                        TourScheduleRunId = cbi.TourScheduleRunId,
                        TourScheduleRunInfo = cbi.TourScheduleRun != null ? $"Run {cbi.TourScheduleRun.RunIndex}" : null,
                        TourPricingTierId = cbi.TourPricingTierId,
                        TourPricingTierName = cbi.TourPricingTier?.Name,
                        CheckInDate = cbi.CheckInDate,
                        CheckOutDate = cbi.CheckOutDate,
                        StartDate = cbi.StartDate,
                        EndDate = cbi.EndDate,
                        Quantity = cbi.Quantity,
                        UnitPrice = cbi.UnitPrice,
                        SubTotal = cbi.SubTotal
                    })
                    .ToList()
            };
        }

        public async Task<object> ConfirmBookingAsync(Guid userId, Guid bookingId)
        {
            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            if (partner == null) throw new BusinessException("Không tìm thấy đối tác");

            var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId && b.PartnerId == partner.Id);
            if (booking == null)
                throw new BusinessException("Không tìm thấy đặt chỗ");

            if (booking.CommercialStatus != BookingCommercialStatus.Paid
                || booking.FulfillmentStatus != BookingFulfillmentStatus.AwaitingPartner)
                throw new BusinessException("Chỉ có thể xác nhận đặt chỗ đã thanh toán");

            booking.FulfillmentStatus = BookingFulfillmentStatus.Confirmed;
            booking.Status = _commerceService.GetLegacyBookingStatus(booking);
            booking.ConfirmedAt = DateTime.UtcNow;
            booking.UpdatedAt = DateTime.UtcNow;
            booking.ExpiresAt = null;

            await _context.SaveChangesAsync();

            await _notificationService.SendNotificationAsync(
                booking.UserId,
                "Đặt chỗ đã xác nhận",
                $"Đặt chỗ #{booking.BookingCode} đã được đối tác xác nhận",
                NotificationType.BookingConfirmed,
                booking.Id
            );

            // Gửi email thông tin chuyến đi
            var service = await _context.Services.FindAsync(booking.ServiceId);
            var email = booking.ContactEmail;
            if (!string.IsNullOrEmpty(email))
            {
                _ = _emailService.SendTripInfoEmailAsync(
                    email, booking.BookingCode, booking.ComboName ?? service?.Name ?? "Dịch vụ VNS",
                    booking.ContactName, booking.NumberOfGuests,
                    booking.CheckInDate, booking.CheckOutDate);
            }

            return new { Message = "Xác nhận đặt chỗ thành công" };
        }

        public async Task<object> CompleteBookingAsync(Guid userId, Guid bookingId)
        {
            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            if (partner == null) throw new BusinessException("Không tìm thấy đối tác");

            var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId && b.PartnerId == partner.Id);
            if (booking == null)
                throw new BusinessException("Không tìm thấy đặt chỗ");

            if (booking.CommercialStatus != BookingCommercialStatus.Paid
                || booking.FulfillmentStatus != BookingFulfillmentStatus.Confirmed)
                throw new BusinessException("Không thể hoàn thành đặt chỗ ở trạng thái hiện tại");

            booking.FulfillmentStatus = BookingFulfillmentStatus.Completed;
            booking.Status = _commerceService.GetLegacyBookingStatus(booking);
            booking.CompletedAt = DateTime.UtcNow;
            booking.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            await _commerceService.ReleasePartnerReceivableAsync(booking);

            await _notificationService.SendNotificationAsync(
                booking.UserId,
                "Hoàn thành chuyến đi",
                $"Đặt chỗ #{booking.BookingCode} đã hoàn thành. Hãy để lại đánh giá nhé!",
                NotificationType.ReviewReminder,
                booking.Id
            );

            return new { Message = "Hoàn thành đặt chỗ thành công" };
        }

        public async Task ExpireBookingsAsync()
        {
            var expiredBookings = await _context.Bookings
                .Include(b => b.Payment)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.TourSchedule)
                .Include(b => b.ComboBookingItems).ThenInclude(cbi => cbi.Room)
                .Include(b => b.ComboBookingItems).ThenInclude(cbi => cbi.TourSchedule)
                    .ThenInclude(ts => ts!.Tour)
                .Include(b => b.Service)
                .Where(b => b.CommercialStatus == BookingCommercialStatus.PendingPayment
                    && b.ExpiresAt.HasValue
                    && b.ExpiresAt.Value <= DateTime.UtcNow
                    && (b.Payment == null || b.Payment.PaymentStatus != PaymentStatus.Completed))
                .ToListAsync();

            foreach (var booking in expiredBookings)
            {
                await _commerceService.ExpireBookingAsync(booking);

                // Fix #9: Release tour slots for expired bookings
                foreach (var detail in booking.BookingDetails.Where(bd => bd.TourScheduleId.HasValue))
                    await ReleaseAssignedRunAsync(detail.TourScheduleId, detail.TourScheduleRunId, detail.Quantity);

                // Release homestay room availability for expired bookings
                var expireRoomDetails = booking.BookingDetails.Where(bd => bd.RoomId.HasValue).ToList();
                if (expireRoomDetails.Any() && booking.CheckInDate.HasValue && booking.CheckOutDate.HasValue)
                {
                    var cin = booking.CheckInDate.Value.Date;
                    var cout = booking.CheckOutDate.Value.Date;
                    foreach (var detail in expireRoomDetails)
                    {
                        var qty = detail.Quantity;
                        var roomId = detail.RoomId!.Value;
                        await _context.Database.ExecuteSqlRawAsync(
                            "UPDATE RoomAvailabilities SET AvailableCount = AvailableCount + {0} " +
                            "WHERE RoomId = {1} AND Date >= {2} AND Date < {3}",
                            qty, roomId, cin, cout);
                    }
                }

                if (booking.ComboBookingItems.Any())
                {
                    await ReleaseComboResourcesAsync(booking);
                    await AdjustComboServiceBookingCountsAsync(booking, -1);
                }
                else if (booking.Service != null)
                {
                    booking.Service.TotalBookings = Math.Max(0, booking.Service.TotalBookings - 1);
                }

                // Fix #9 & #10: Reverse voucher usage on expire
                if (booking.VoucherId.HasValue)
                {
                    var voucher = await _context.Vouchers.FindAsync(booking.VoucherId);
                    if (voucher != null) voucher.UsedCount = Math.Max(0, voucher.UsedCount - 1);
                    var usage = await _context.VoucherUsages.FirstOrDefaultAsync(vu => vu.BookingId == booking.Id);
                    if (usage != null) _context.VoucherUsages.Remove(usage);
                }
            }

            if (expiredBookings.Any())
                await _context.SaveChangesAsync();
        }

        public async Task AutoCompleteConfirmedBookingsAsync()
        {
            var today = DateTime.UtcNow.Date;
            var bookingsToComplete = await _context.Bookings
                .Where(b => b.CommercialStatus == BookingCommercialStatus.Paid
                    && b.FulfillmentStatus == BookingFulfillmentStatus.Confirmed
                    && b.CheckOutDate.HasValue
                    && b.CheckOutDate.Value.Date < today
                    && b.CompletedAt == null)
                .ToListAsync();

            foreach (var booking in bookingsToComplete)
            {
                booking.FulfillmentStatus = BookingFulfillmentStatus.Completed;
                booking.Status = _commerceService.GetLegacyBookingStatus(booking);
                booking.CompletedAt = DateTime.UtcNow;
                booking.UpdatedAt = DateTime.UtcNow;
            }

            if (bookingsToComplete.Any())
            {
                await _context.SaveChangesAsync();

                foreach (var booking in bookingsToComplete)
                {
                    await _commerceService.ReleasePartnerReceivableAsync(booking);

                    await _notificationService.SendNotificationAsync(
                        booking.UserId,
                        "Hoàn thành chuyến đi",
                        $"Đặt chỗ #{booking.BookingCode} đã hoàn thành. Hãy để lại đánh giá nhé!",
                        NotificationType.ReviewReminder,
                        booking.Id
                    );
                }
            }
        }

        public async Task<object> GetScheduleAvailabilityAsync(Guid scheduleId)
        {
            var schedule = await _context.TourSchedules.FindAsync(scheduleId);
            if (schedule == null)
                throw new BusinessException("Không tìm thấy lịch tour");

            return new
            {
                ScheduleId = schedule.Id,
                AvailableSlots = schedule.AvailableSlots,
                RunCount = Math.Max(schedule.RunCount, 1),
                TotalCapacity = GetScheduleTotalCapacity(schedule),
                BookedSlots = schedule.BookedSlots,
                RemainingSlots = GetScheduleRemainingCapacity(schedule),
                Status = schedule.Status.ToString()
            };
        }
        private sealed class ComboQuoteResolvedItem
        {
            public Guid ComboItemId { get; set; }
            public Guid ServiceId { get; set; }
            public string ServiceName { get; set; } = string.Empty;
            public ServiceType ServiceType { get; set; }
            public Guid? RoomId { get; set; }
            public string? RoomName { get; set; }
            public Guid? TourScheduleId { get; set; }
            public Guid? TourPricingTierId { get; set; }
            public string? TourPricingTierName { get; set; }
            public DateTime? CheckInDate { get; set; }
            public DateTime? CheckOutDate { get; set; }
            public DateTime? StartDate { get; set; }
            public DateTime? EndDate { get; set; }
            public int Quantity { get; set; }
            public decimal UnitPrice { get; set; }
            public decimal SubTotal { get; set; }

            public ComboQuoteSelectionSnapshot ToSnapshot()
            {
                return new ComboQuoteSelectionSnapshot
                {
                    ComboItemId = ComboItemId,
                    ServiceId = ServiceId,
                    RoomId = RoomId,
                    TourScheduleId = TourScheduleId,
                    TourPricingTierId = TourPricingTierId,
                    CheckInDate = CheckInDate,
                    CheckOutDate = CheckOutDate,
                    Quantity = Quantity,
                };
            }

            public ComboBookingQuoteItemDto ToDto()
            {
                return new ComboBookingQuoteItemDto
                {
                    ComboItemId = ComboItemId,
                    ServiceId = ServiceId,
                    ServiceName = ServiceName,
                    ServiceType = ServiceType,
                    RoomId = RoomId,
                    RoomName = RoomName,
                    TourScheduleId = TourScheduleId,
                    TourPricingTierId = TourPricingTierId,
                    TourPricingTierName = TourPricingTierName,
                    CheckInDate = CheckInDate,
                    CheckOutDate = CheckOutDate,
                    StartDate = StartDate,
                    EndDate = EndDate,
                    Quantity = Quantity,
                    UnitPrice = UnitPrice,
                    SubTotal = SubTotal,
                };
            }
        }

        private sealed class ComboQuoteSelectionSnapshot
        {
            public Guid ComboItemId { get; set; }
            public Guid ServiceId { get; set; }
            public Guid? RoomId { get; set; }
            public Guid? TourScheduleId { get; set; }
            public Guid? TourPricingTierId { get; set; }
            public DateTime? CheckInDate { get; set; }
            public DateTime? CheckOutDate { get; set; }
            public int Quantity { get; set; }
        }
    }
}

