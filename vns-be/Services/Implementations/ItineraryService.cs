using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Itinerary;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public class ItineraryService : IItineraryService
    {
        private readonly VNSDbContext _context;
        private readonly IBookingService _bookingService;

        public ItineraryService(VNSDbContext context, IBookingService bookingService)
        {
            _context = context;
            _bookingService = bookingService;
        }

        // ──────────────────────────────────────────────
        //  GET FULL TIMELINE
        // ──────────────────────────────────────────────

        public async Task<object> GetUserTimelineAsync(Guid userId, ItineraryFilterDto filter)
        {
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1) filter.PageSize = 10;
            if (filter.PageSize > 100) filter.PageSize = 100;

            var query = _context.Bookings
                .Include(b => b.Service).ThenInclude(s => s.Destination)
                .Include(b => b.Service).ThenInclude(s => s.Partner)
                .Include(b => b.Service).ThenInclude(s => s.Homestay)
                .Include(b => b.Service).ThenInclude(s => s.Tours).ThenInclude(t => t.TourSchedules)
                .Include(b => b.Service).ThenInclude(s => s.Tours).ThenInclude(t => t.TourItineraries)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.Room)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.TourSchedule).ThenInclude(ts => ts!.Tour)
                .Include(b => b.Payment)
                .Where(b => b.UserId == userId)
                .AsQueryable();

            if (filter.Period == "upcoming")
            {
                query = query.Where(b => b.Status == BookingStatus.Confirmed
                    || b.Status == BookingStatus.InProgress);
            }
            else if (filter.Period == "past")
            {
                query = query.Where(b => b.Status == BookingStatus.Completed
                    || b.Status == BookingStatus.Cancelled
                    || b.Status == BookingStatus.Refunded);
            }

            if (filter.FromDate.HasValue)
                query = query.Where(b => b.BookingDate >= filter.FromDate.Value);

            if (filter.ToDate.HasValue)
                query = query.Where(b => b.BookingDate <= filter.ToDate.Value);

            if (!string.IsNullOrEmpty(filter.Status))
            {
                if (Enum.TryParse<BookingStatus>(filter.Status, true, out var status))
                    query = query.Where(b => b.Status == status);
            }

            var bookings = await query
                .OrderBy(b => b.CheckInDate ?? b.BookingDate)
                .ToListAsync();

            var allDayItems = new List<(DateTime Date, ItineraryTimelineItemDto Item)>();
            var allMarkers = new List<MapMarkerDto>();

            foreach (var booking in bookings)
            {
                var items = ExpandBookingToDayItems(booking);
                allDayItems.AddRange(items.DayItems);
                allMarkers.AddRange(items.Markers);
            }

            var sortedDays = allDayItems
                .GroupBy(x => x.Date.Date)
                .OrderBy(g => g.Key)
                .ToList();

            var trips = GroupDaysIntoTrips(sortedDays, allMarkers, bookings);

            var now = DateTime.UtcNow;
            var upcomingCount = bookings.Count(b => b.Status == BookingStatus.Confirmed
                && b.CheckInDate.HasValue && b.CheckInDate.Value >= now);
            var inProgressCount = bookings.Count(b => b.Status == BookingStatus.InProgress
                || (b.Status == BookingStatus.Confirmed
                    && b.CheckInDate.HasValue && b.CheckInDate.Value.Date <= now.Date
                    && b.CheckOutDate.HasValue && b.CheckOutDate.Value.Date >= now.Date));
            var completedCount = bookings.Count(b => b.Status == BookingStatus.Completed);
            var activeStatuses = new[] { BookingStatus.Confirmed, BookingStatus.InProgress };

            return new UserItineraryDto
            {
                Trips = trips,
                TotalActiveBookings = bookings.Count(b => activeStatuses.Contains(b.Status)),
                UpcomingCount = upcomingCount,
                InProgressCount = inProgressCount,
                CompletedCount = completedCount
            };
        }

        // ──────────────────────────────────────────────
        //  GET TRIP DETAIL
        // ──────────────────────────────────────────────

        public async Task<object> GetTripDetailAsync(Guid userId, string tripId)
        {
            if (!tripId.StartsWith("trip-") || !long.TryParse(tripId.Replace("trip-", ""), out var startTicks))
                throw new BusinessException("Mã chuyến đi không hợp lệ");

            var tripStart = new DateTime(startTicks, DateTimeKind.Utc);

            var bookings = await _context.Bookings
                .Include(b => b.Service).ThenInclude(s => s.Destination)
                .Include(b => b.Service).ThenInclude(s => s.Partner)
                .Include(b => b.Service).ThenInclude(s => s.Homestay)
                .Include(b => b.Service).ThenInclude(s => s.Tours).ThenInclude(t => t.TourSchedules)
                .Include(b => b.Service).ThenInclude(s => s.Tours).ThenInclude(t => t.TourItineraries)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.Room)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.TourSchedule).ThenInclude(ts => ts!.Tour)
                .Include(b => b.Payment)
                .Where(b => b.UserId == userId
                    && (b.CheckInDate >= tripStart || b.CheckInDate == null))
                .OrderBy(b => b.CheckInDate ?? b.BookingDate)
                .ToListAsync();

            var allDayItems = new List<(DateTime Date, ItineraryTimelineItemDto Item)>();
            var allMarkers = new List<MapMarkerDto>();

            foreach (var booking in bookings)
            {
                var items = ExpandBookingToDayItems(booking);
                allDayItems.AddRange(items.DayItems);
                allMarkers.AddRange(items.Markers);
            }

            var sortedDays = allDayItems
                .GroupBy(x => x.Date.Date)
                .OrderBy(g => g.Key)
                .ToList();

            var tripEnd = tripStart;
            var tripDays = new List<(DateTime Date, ItineraryTimelineItemDto Item)>();
            foreach (var dayGroup in sortedDays)
            {
                var date = dayGroup.Key;
                if (tripDays.Count > 0 && (date - tripEnd).TotalDays > 2)
                    break;
                tripDays.AddRange(dayGroup);
                if (date > tripEnd) tripEnd = date;
            }

            if (tripDays.Count == 0)
                throw new NotFoundException("Không tìm thấy chuyến đi");

            var result = BuildTripFromDayItems(tripDays, allMarkers, tripStart, tripEnd);
            if (result == null)
                throw new NotFoundException("Không tìm thấy chuyến đi");

            return result;
        }

        // ──────────────────────────────────────────────
        //  GET MAP DATA
        // ──────────────────────────────────────────────

        public async Task<object> GetMapDataAsync(Guid userId, DateTime? fromDate, DateTime? toDate)
        {
            var from = fromDate ?? DateTime.UtcNow.AddMonths(-1);
            var to = toDate ?? DateTime.UtcNow.AddMonths(3);

            var bookings = await _context.Bookings
                .Include(b => b.Service)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.TourSchedule)
                .Where(b => b.UserId == userId
                    && (b.Status == BookingStatus.Confirmed
                        || b.Status == BookingStatus.InProgress
                        || b.Status == BookingStatus.Completed)
                    && b.CheckInDate >= from
                    && b.CheckInDate <= to)
                .ToListAsync();

            var markers = new List<MapMarkerDto>();

            foreach (var booking in bookings)
            {
                if (booking.Service.Latitude.HasValue && booking.Service.Longitude.HasValue)
                {
                    var date = booking.CheckInDate ?? booking.BookingDate;
                    markers.Add(new MapMarkerDto
                    {
                        BookingId = booking.Id,
                        Title = booking.Service.Name,
                        Latitude = booking.Service.Latitude,
                        Longitude = booking.Service.Longitude,
                        Address = booking.Service.Address,
                        ServiceType = booking.Service.ServiceType.ToString(),
                        Date = date,
                        IconType = booking.Service.ServiceType.ToString().ToLower()
                    });
                }

                if (booking.Service.ServiceType == ServiceType.Tour)
                {
                    var tour = booking.Service.Tours.FirstOrDefault();
                    if (tour?.MeetingPoint != null)
                    {
                        markers.Add(new MapMarkerDto
                        {
                            BookingId = booking.Id,
                            Title = $"Điểm hẹn: {tour.MeetingPoint}",
                            Latitude = booking.Service.Latitude,
                            Longitude = booking.Service.Longitude,
                            Address = tour.MeetingPoint,
                            ServiceType = "meeting_point",
                            Date = booking.CheckInDate ?? booking.BookingDate,
                            IconType = "meeting"
                        });
                    }
                }
            }

            var validMarkers = markers.Where(m => m.Latitude.HasValue && m.Longitude.HasValue).ToList();
            MapBoundsDto? bounds = null;
            if (validMarkers.Any())
            {
                bounds = new MapBoundsDto
                {
                    MinLat = validMarkers.Min(m => m.Latitude!.Value),
                    MaxLat = validMarkers.Max(m => m.Latitude!.Value),
                    MinLng = validMarkers.Min(m => m.Longitude!.Value),
                    MaxLng = validMarkers.Max(m => m.Longitude!.Value)
                };
            }

            return new
            {
                Markers = markers,
                Bounds = bounds,
                MarkerCount = markers.Count
            };
        }

        // ──────────────────────────────────────────────
        //  GET UPCOMING
        // ──────────────────────────────────────────────

        public async Task<object> GetUpcomingAsync(Guid userId)
        {
            var now = DateTime.UtcNow;
            var nextWeek = now.AddDays(7);

            var bookings = await _context.Bookings
                .Include(b => b.Service).ThenInclude(s => s.Destination)
                .Include(b => b.Service).ThenInclude(s => s.Partner)
                .Include(b => b.Service).ThenInclude(s => s.Homestay)
                .Include(b => b.Service).ThenInclude(s => s.Tours).ThenInclude(t => t.TourSchedules)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.Room)
                .Include(b => b.BookingDetails).ThenInclude(bd => bd.TourSchedule)
                .Include(b => b.Payment)
                .Where(b => b.UserId == userId
                    && (b.Status == BookingStatus.Confirmed || b.Status == BookingStatus.InProgress)
                    && b.CheckInDate.HasValue
                    && b.CheckInDate >= now
                    && b.CheckInDate <= nextWeek)
                .OrderBy(b => b.CheckInDate)
                .ToListAsync();

            var dayItems = new List<(DateTime Date, ItineraryTimelineItemDto Item)>();

            foreach (var booking in bookings)
            {
                var expanded = ExpandBookingToDayItems(booking);
                dayItems.AddRange(expanded.DayItems);
            }

            var groupedByDay = dayItems
                .GroupBy(x => x.Date.Date)
                .OrderBy(g => g.Key)
                .Select(g => new ItineraryDayDto
                {
                    Date = g.Key,
                    DayLabel = FormatDayLabel(g.Key),
                    DayNumber = (g.Key - now.Date).Days + 1,
                    DayTotalCost = g.Sum(x => x.Item.EstimatedCost),
                    Items = g.OrderBy(x =>
                    {
                        var item = x.Item;
                        return item.ItemType == "checkin" ? 0
                            : item.TimeDisplay != null && !item.TimeDisplay.Contains("Cả ngày") ? 1
                            : 2;
                    })
                    .ThenBy(x => x.Item.ServiceType)
                    .Select(x => x.Item)
                    .ToList()
                })
                .ToList();

            return new
            {
                Days = groupedByDay,
                TotalUpcoming = bookings.Count,
                NextBooking = bookings.FirstOrDefault()?.Service.Name
            };
        }

        // ──────────────────────────────────────────────
        //  CANCEL BOOKING
        // ──────────────────────────────────────────────

        public async Task<object> CancelBookingAsync(Guid userId, Guid bookingId, string? reason)
        {
            return await _bookingService.CancelBookingAsync(userId, bookingId, reason);
        }

        // ══════════════════════════════════════════════
        //  PRIVATE HELPERS
        // ══════════════════════════════════════════════

        private (List<(DateTime Date, ItineraryTimelineItemDto Item)> DayItems, List<MapMarkerDto> Markers)
            ExpandBookingToDayItems(Booking booking)
        {
            var dayItems = new List<(DateTime Date, ItineraryTimelineItemDto Item)>();
            var markers = new List<MapMarkerDto>();
            var svc = booking.Service;
            if (svc == null) return (dayItems, markers);

            var canCancel = booking.Status == BookingStatus.Confirmed;

            if (svc.ServiceType == ServiceType.Homestay && booking.CheckInDate.HasValue && booking.CheckOutDate.HasValue)
            {
                ExpandHomestayBooking(booking, svc, dayItems, markers, canCancel);
            }
            else if (svc.ServiceType == ServiceType.Tour)
            {
                ExpandTourBooking(booking, svc, dayItems, markers, canCancel);
            }
            else
            {
                var date = booking.CheckInDate ?? booking.BookingDate;
                dayItems.Add((date, new ItineraryTimelineItemDto
                {
                    BookingId = booking.Id,
                    BookingCode = booking.BookingCode,
                    ServiceId = svc.Id,
                    ServiceName = svc.Name,
                    ServiceType = svc.ServiceType.ToString(),
                    ThumbnailUrl = svc.ThumbnailUrl,
                    Description = svc.Description,
                    Address = svc.Address,
                    Latitude = svc.Latitude,
                    Longitude = svc.Longitude,
                    TimeDisplay = "Cả ngày",
                    NumberOfGuests = booking.NumberOfGuests,
                    BookingStatus = booking.Status.ToString(),
                    CanCancel = canCancel,
                    CancellationPolicy = svc.CancellationPolicyType.ToString(),
                    CancellationPolicyDescription = svc.CancellationPolicyDescription,
                    ContactName = booking.ContactName,
                    ContactPhone = booking.ContactPhone,
                    PartnerName = svc.Partner?.BusinessName,
                    DestinationName = svc.Destination?.Name,
                    ItemType = "booking",
                    Note = booking.SpecialRequests,
                    EstimatedCost = booking.FinalAmount
                }));

                AddMarkerIfHasCoords(markers, booking.Id, svc.Name, svc.Latitude, svc.Longitude,
                    svc.Address, svc.ServiceType.ToString(), date, "Cả ngày");
            }

            return (dayItems, markers);
        }

        private void ExpandHomestayBooking(Booking booking, Service svc,
            List<(DateTime Date, ItineraryTimelineItemDto Item)> dayItems,
            List<MapMarkerDto> markers, bool canCancel)
        {
            var checkIn = booking.CheckInDate!.Value;
            var checkOut = booking.CheckOutDate!.Value;
            var homestay = svc.Homestay;
            var checkInTime = homestay?.CheckInTime ?? new TimeSpan(14, 0, 0);
            var checkOutTime = homestay?.CheckOutTime ?? new TimeSpan(12, 0, 0);

            var numberOfNights = (int)(checkOut.Date - checkIn.Date).TotalDays;
            var costPerNight = numberOfNights > 0 ? booking.FinalAmount / numberOfNights : booking.FinalAmount;

            for (var date = checkIn.Date; date < checkOut.Date; date = date.AddDays(1))
            {
                bool isCheckInDay = date == checkIn.Date;
                bool isCheckOutDay = date.AddDays(1) == checkOut.Date;

                var roomNames = booking.BookingDetails
                    .Where(bd => bd.Room != null)
                    .Select(bd => bd.Room!.Name)
                    .Distinct()
                    .ToList();

                dayItems.Add((date, new ItineraryTimelineItemDto
                {
                    BookingId = booking.Id,
                    BookingCode = booking.BookingCode,
                    ServiceId = svc.Id,
                    ServiceName = svc.Name,
                    ServiceType = "Homestay",
                    ThumbnailUrl = svc.ThumbnailUrl,
                    Description = svc.Description,
                    Address = svc.Address,
                    Latitude = svc.Latitude,
                    Longitude = svc.Longitude,
                    RoomName = roomNames.Any() ? string.Join(", ", roomNames) : null,
                    NumberOfGuests = booking.NumberOfGuests,
                    BookingStatus = booking.Status.ToString(),
                    CanCancel = canCancel,
                    CancellationPolicy = svc.CancellationPolicyType.ToString(),
                    CancellationPolicyDescription = svc.CancellationPolicyDescription,
                    ContactName = booking.ContactName,
                    ContactPhone = booking.ContactPhone,
                    PartnerName = svc.Partner?.BusinessName,
                    DestinationName = svc.Destination?.Name,
                    ItemType = isCheckInDay ? "checkin"
                        : isCheckOutDay ? "checkout" : "stay",
                    TimeDisplay = isCheckInDay ? $"Nhận phòng từ {checkInTime:hh\\:mm}"
                        : isCheckOutDay ? $"Trả phòng trước {checkOutTime:hh\\:mm}"
                        : "Cả ngày",
                    Note = isCheckInDay ? $"Nhận phòng từ {checkInTime:hh\\:mm}"
                        : isCheckOutDay ? $"Trả phòng trước {checkOutTime:hh\\:mm}"
                        : null,
                    EstimatedCost = costPerNight
                }));

                if (isCheckInDay)
                {
                    AddMarkerIfHasCoords(markers, booking.Id, svc.Name, svc.Latitude, svc.Longitude,
                        svc.Address, "Homestay", date, $"Nhận phòng {checkInTime:hh\\:mm}");
                }
            }
        }

        private void ExpandTourBooking(Booking booking, Service svc,
            List<(DateTime Date, ItineraryTimelineItemDto Item)> dayItems,
            List<MapMarkerDto> markers, bool canCancel)
        {
            var tour = svc.Tours.FirstOrDefault();

            if (tour == null)
            {
                dayItems.Add((booking.BookingDate, new ItineraryTimelineItemDto
                {
                    BookingId = booking.Id,
                    BookingCode = booking.BookingCode,
                    ServiceId = svc.Id,
                    ServiceName = svc.Name,
                    ServiceType = "Tour",
                    ThumbnailUrl = svc.ThumbnailUrl,
                    Address = svc.Address,
                    Latitude = svc.Latitude,
                    Longitude = svc.Longitude,
                    NumberOfGuests = booking.NumberOfGuests,
                    BookingStatus = booking.Status.ToString(),
                    CanCancel = canCancel,
                    PartnerName = svc.Partner?.BusinessName,
                    ItemType = "tour",
                    EstimatedCost = booking.FinalAmount
                }));
                return;
            }

            // Count total days across all tour schedules for this booking
            var totalTourDays = booking.BookingDetails
                .Where(bd => bd.TourSchedule != null)
                .SelectMany(bd =>
                {
                    var s = bd.TourSchedule!;
                    var days = (int)(s.EndDate.Date - s.StartDate.Date).TotalDays + 1;
                    return Enumerable.Range(0, days).Select(_ => 1);
                })
                .Sum();
            if (totalTourDays == 0) totalTourDays = 1;

            var costPerDay = booking.FinalAmount / totalTourDays;

            foreach (var detail in booking.BookingDetails.Where(bd => bd.TourSchedule != null))
            {
                var schedule = detail.TourSchedule!;
                var startDate = schedule.StartDate;
                var endDate = schedule.EndDate;

                for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
                {
                    var dayNumber = (date - startDate.Date).Days + 1;
                    var dayItineraries = tour.TourItineraries
                        .Where(ti => ti.DayNumber == dayNumber)
                        .OrderBy(ti => ti.DisplayOrder)
                        .ToList();
                    var firstItinerary = dayItineraries.FirstOrDefault();
                    var combinedTitle = dayItineraries.Count > 1
                        ? string.Join(" | ", dayItineraries.Select(ti => ti.Title))
                        : firstItinerary?.Title;
                    var combinedDescription = dayItineraries.Count > 1
                        ? string.Join("\n", dayItineraries.Select(ti => $"- {ti.Title}: {ti.Description}"))
                        : firstItinerary?.Description ?? svc.Description;
                    var combinedTimeDisplay = dayItineraries.Count > 1
                        ? $"Ngày {dayNumber}/{tour.Duration}"
                        : firstItinerary?.StartTime.HasValue == true
                            ? $"{firstItinerary.StartTime:hh\\:mm} - {firstItinerary.EndTime:hh\\:mm}"
                            : schedule.StartDate.Date == schedule.EndDate.Date
                                ? "Cả ngày"
                                : $"Ngày {dayNumber}/{tour.Duration}";

                    dayItems.Add((date, new ItineraryTimelineItemDto
                    {
                        BookingId = booking.Id,
                        BookingCode = booking.BookingCode,
                        BookingDetailId = detail.Id,
                        ServiceId = svc.Id,
                        ServiceName = tour.Name,
                        ServiceType = "Tour",
                        ThumbnailUrl = svc.ThumbnailUrl,
                        Description = combinedDescription,
                        Address = firstItinerary?.Location ?? svc.Address,
                        Latitude = svc.Latitude,
                        Longitude = svc.Longitude,
                        MeetingPoint = tour.MeetingPoint,
                        Duration = tour.Duration,
                        TimeDisplay = combinedTimeDisplay,
                        NumberOfGuests = detail.Quantity,
                        BookingStatus = booking.Status.ToString(),
                        CanCancel = canCancel,
                        CancellationPolicy = svc.CancellationPolicyType.ToString(),
                        CancellationPolicyDescription = svc.CancellationPolicyDescription,
                        ContactName = booking.ContactName,
                        ContactPhone = booking.ContactPhone,
                        PartnerName = svc.Partner?.BusinessName,
                        DestinationName = svc.Destination?.Name,
                        ItemType = "tour",
                        Note = combinedTitle,
                        EstimatedCost = costPerDay
                    }));

                    if (date == startDate.Date)
                    {
                        AddMarkerIfHasCoords(markers, booking.Id, tour.Name, svc.Latitude, svc.Longitude,
                            tour.MeetingPoint ?? svc.Address, "Tour", date,
                            firstItinerary?.StartTime.HasValue == true
                                ? firstItinerary.StartTime.Value.ToString(@"hh\:mm")
                                : "Cả ngày");
                    }
                }
            }

            if (!booking.BookingDetails.Any(bd => bd.TourSchedule != null))
            {
                var date = booking.CheckInDate ?? booking.BookingDate;
                dayItems.Add((date, new ItineraryTimelineItemDto
                {
                    BookingId = booking.Id,
                    BookingCode = booking.BookingCode,
                    ServiceId = svc.Id,
                    ServiceName = tour.Name,
                    ServiceType = "Tour",
                    ThumbnailUrl = svc.ThumbnailUrl,
                    Description = svc.Description,
                    MeetingPoint = tour.MeetingPoint,
                    Duration = tour.Duration,
                    TimeDisplay = "Cả ngày",
                    NumberOfGuests = booking.NumberOfGuests,
                    BookingStatus = booking.Status.ToString(),
                    CanCancel = canCancel,
                    CancellationPolicy = svc.CancellationPolicyType.ToString(),
                    PartnerName = svc.Partner?.BusinessName,
                    DestinationName = svc.Destination?.Name,
                    ItemType = "tour",
                    EstimatedCost = booking.FinalAmount
                }));

                AddMarkerIfHasCoords(markers, booking.Id, tour.Name, svc.Latitude, svc.Longitude,
                    tour.MeetingPoint ?? svc.Address, "Tour", date, null);
            }
        }

        private List<ItineraryTripDto> GroupDaysIntoTrips(
            List<IGrouping<DateTime, (DateTime Date, ItineraryTimelineItemDto Item)>> sortedDayGroups,
            List<MapMarkerDto> allMarkers,
            List<Booking> bookings)
        {
            var trips = new List<ItineraryTripDto>();
            if (sortedDayGroups.Count == 0) return trips;

            var tripIndex = 0;
            var currentTripStart = sortedDayGroups[0].Key;
            var currentTripEnd = currentTripStart;
            var currentTripDayItems = new List<(DateTime Date, ItineraryTimelineItemDto Item)>();

            foreach (var dayGroup in sortedDayGroups)
            {
                var date = dayGroup.Key;

                if (currentTripDayItems.Count > 0 && (date - currentTripEnd).TotalDays > 2)
                {
                    trips.Add(BuildTripFromDayItems(currentTripDayItems, allMarkers, currentTripStart, currentTripEnd, tripIndex++));
                    currentTripStart = date;
                    currentTripDayItems.Clear();
                }

                currentTripDayItems.AddRange(dayGroup);
                if (date > currentTripEnd) currentTripEnd = date;
            }

            if (currentTripDayItems.Count > 0)
            {
                trips.Add(BuildTripFromDayItems(currentTripDayItems, allMarkers, currentTripStart, currentTripEnd, tripIndex));
            }

            return trips;
        }

        private ItineraryTripDto BuildTripFromDayItems(
            List<(DateTime Date, ItineraryTimelineItemDto Item)> dayItems,
            List<MapMarkerDto> allMarkers,
            DateTime tripStart,
            DateTime tripEnd,
            int tripIndex = 0)
        {
            var groupedByDay = dayItems
                .GroupBy(x => x.Date.Date)
                .OrderBy(g => g.Key)
                .ToList();

            var destinations = dayItems
                .Select(x => x.Item.DestinationName)
                .Where(d => d != null)
                .GroupBy(d => d!)
                .OrderByDescending(g => g.Count())
                .FirstOrDefault();

            var primaryDest = destinations?.Key ?? "";
            var monthName = tripStart.ToString("MMMM", new System.Globalization.CultureInfo("vi-VN"));
            var year = tripStart.Year;
            var tripName = string.IsNullOrEmpty(primaryDest)
                ? $"Chuyến đi tháng {monthName} {year}"
                : $"Chuyến đi {primaryDest} - tháng {monthName} {year}";

            var bookingIds = dayItems.Select(x => x.Item.BookingId).Distinct().ToHashSet();

            var tripMarkers = allMarkers
                .Where(m => bookingIds.Contains(m.BookingId))
                .ToList();

            var days = groupedByDay.Select(g => new ItineraryDayDto
            {
                Date = g.Key,
                DayLabel = FormatDayLabel(g.Key),
                DayNumber = (g.Key - tripStart.Date).Days + 1,
                DayTotalCost = g.Sum(x => x.Item.EstimatedCost),
                Items = g.OrderBy(x =>
                {
                    var item = x.Item;
                    return item.ItemType == "checkin" ? 0
                        : item.TimeDisplay != null && !item.TimeDisplay.Contains("Cả ngày") ? 1
                        : 2;
                })
                .ThenBy(x => x.Item.ServiceType)
                .Select(x => x.Item)
                .ToList()
            }).ToList();

            MapBoundsDto? bounds = null;
            var validMarkers = tripMarkers.Where(m => m.Latitude.HasValue && m.Longitude.HasValue).ToList();
            if (validMarkers.Any())
            {
                bounds = new MapBoundsDto
                {
                    MinLat = validMarkers.Min(m => m.Latitude!.Value),
                    MaxLat = validMarkers.Max(m => m.Latitude!.Value),
                    MinLng = validMarkers.Min(m => m.Longitude!.Value),
                    MaxLng = validMarkers.Max(m => m.Longitude!.Value)
                };
            }

            return new ItineraryTripDto
            {
                TripId = $"trip-{tripStart.Ticks}",
                Name = tripName,
                StartDate = tripStart,
                EndDate = tripEnd,
                TotalDays = days.Count,
                BookingCount = bookingIds.Count,
                TotalCost = days.Sum(d => d.DayTotalCost),
                PrimaryDestination = primaryDest,
                Days = days,
                MapMarkers = tripMarkers,
                MapBounds = bounds
            };
        }

        private static string FormatDayLabel(DateTime date)
        {
            var dayOfWeek = date.DayOfWeek switch
            {
                DayOfWeek.Monday => "Thứ Hai",
                DayOfWeek.Tuesday => "Thứ Ba",
                DayOfWeek.Wednesday => "Thứ Tư",
                DayOfWeek.Thursday => "Thứ Năm",
                DayOfWeek.Friday => "Thứ Sáu",
                DayOfWeek.Saturday => "Thứ Bảy",
                DayOfWeek.Sunday => "Chủ Nhật",
                _ => ""
            };
            return $"{dayOfWeek}, {date:dd/MM/yyyy}";
        }

        private static void AddMarkerIfHasCoords(
            List<MapMarkerDto> markers,
            Guid bookingId,
            string title,
            double? latitude,
            double? longitude,
            string? address,
            string serviceType,
            DateTime date,
            string? timeDisplay)
        {
            if (latitude.HasValue && longitude.HasValue)
            {
                markers.Add(new MapMarkerDto
                {
                    BookingId = bookingId,
                    Title = title,
                    Latitude = latitude,
                    Longitude = longitude,
                    Address = address,
                    ServiceType = serviceType,
                    Date = date,
                    TimeDisplay = timeDisplay,
                    IconType = serviceType.ToLower()
                });
            }
        }
    }
}
