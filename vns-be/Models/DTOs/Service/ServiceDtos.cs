using VNS.API.Models.Enums;

namespace VNS.API.Models.DTOs.Service
{
    public class ServiceListDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public ServiceType ServiceType { get; set; }
        public Guid DestinationId { get; set; }
        public string? Address { get; set; }
        public decimal BasePrice { get; set; }
        public decimal? DiscountPrice { get; set; }
        public string? ThumbnailUrl { get; set; }
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public int TotalBookings { get; set; }
        public string? DestinationName { get; set; }
        public Guid PartnerId { get; set; }
        public string? PartnerName { get; set; }
        public ServiceApprovalStatus ApprovalStatus { get; set; }
        public string? RejectionReason { get; set; }
        public bool HasPendingChanges { get; set; }
        public bool IsActive { get; set; }
    }

    public class ServiceDetailDto
    {
        public Guid Id { get; set; }
        public Guid PartnerId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public ServiceType ServiceType { get; set; }
        public Guid DestinationId { get; set; }
        public string? Address { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public decimal BasePrice { get; set; }
        public decimal? DiscountPrice { get; set; }
        public string? ThumbnailUrl { get; set; }
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public int TotalBookings { get; set; }
        public CancellationPolicyType CancellationPolicyType { get; set; }
        public string? CancellationPolicyDescription { get; set; }
        public ServiceApprovalStatus ApprovalStatus { get; set; }
        public string? RejectionReason { get; set; }
        public bool HasPendingChanges { get; set; }
        public Guid? PendingChangeId { get; set; }
        public bool IsActive { get; set; }
        public string? DestinationName { get; set; }
        public string? PartnerName { get; set; }
        public string? PartnerPhone { get; set; }
        public List<ServiceImageDto> Images { get; set; } = new();
        public TourDetailDto? Tour { get; set; }
        public List<TourDetailDto> TourPackages { get; set; } = new();
        public HomestayDetailDto? Homestay { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ServiceImageDto
    {
        public Guid Id { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
    }

    public class TourDetailDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Duration { get; set; } = string.Empty;
        public int MaxParticipants { get; set; }
        public int MinParticipants { get; set; }
        public int BookingCutoffHours { get; set; }
        public string? MeetingPoint { get; set; }
        public CancellationPolicyType CancellationPolicyType { get; set; }
        public string? CancellationPolicyDescription { get; set; }
        public int DisplayOrder { get; set; }
        public List<string> IncludedItems { get; set; } = new();
        public List<string> ExcludedItems { get; set; } = new();
        public List<TourImageDto> Images { get; set; } = new();
        public List<TourPricingTierDto> PricingTiers { get; set; } = new();
        public List<TourScheduleDto> Schedules { get; set; } = new();
        public List<TourItineraryDto> Itineraries { get; set; } = new();
    }

    public class TourImageDto
    {
        public Guid Id { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool IsCover { get; set; }
    }

    public class TourPricingTierDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal UnitPrice { get; set; }
        public int MinQuantity { get; set; }
        public int MaxQuantity { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class TourScheduleDto
    {
        public Guid Id { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int RunCount { get; set; }
        public int AvailableSlots { get; set; }
        public int BookedSlots { get; set; }
        public decimal? PriceOverride { get; set; }
        public List<TourSchedulePricingOverrideDto> PricingOverrides { get; set; } = new();
        public TourScheduleStatus Status { get; set; }
    }

    public class TourSchedulePricingOverrideDto
    {
        public Guid TourPricingTierId { get; set; }
        public int TierDisplayOrder { get; set; }
        public string TierName { get; set; } = string.Empty;
        public decimal CustomPrice { get; set; }
    }

    public class TourItineraryDto
    {
        public Guid Id { get; set; }
        public int DayNumber { get; set; }
        public int DisplayOrder { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public TimeSpan? StartTime { get; set; }
        public TimeSpan? EndTime { get; set; }
        public string? Location { get; set; }
        public string? ActivityType { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class HomestayDetailDto
    {
        public Guid Id { get; set; }
        public TimeSpan CheckInTime { get; set; }
        public TimeSpan CheckOutTime { get; set; }
        public int MinNights { get; set; }
        public int MaxNights { get; set; }
        public DateTime? AvailableFrom { get; set; }
        public DateTime? AvailableTo { get; set; }
        public List<RoomDto> Rooms { get; set; } = new();
        public List<AmenityDto> Amenities { get; set; } = new();
    }

    public class RoomDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? BedType { get; set; }
        public int BedCount { get; set; }
        public int MaxGuests { get; set; }
        public int Quantity { get; set; }
        public decimal BasePrice { get; set; }
        public decimal? WeekendPrice { get; set; }
        public decimal? HolidayPrice { get; set; }
        public string? ImageUrl { get; set; }
        public List<RoomImageDto> Images { get; set; } = new();
        public List<AmenityDto> Amenities { get; set; } = new();
        public List<RoomAvailabilityDto> Availability { get; set; } = new();
        public bool IsActive { get; set; }
    }

    public class RoomImageDto
    {
        public Guid Id { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool IsCover { get; set; }
    }

    public class AmenityDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Icon { get; set; }
    }

    public class RoomAvailabilityDto
    {
        public Guid Id { get; set; }
        public DateOnly Date { get; set; }
        public int AvailableCount { get; set; }
        public decimal? PriceOverride { get; set; }
        public bool IsBlocked { get; set; }
    }

    public class ServiceFilterDto
    {
        public string? Keyword { get; set; }
        public ServiceType? ServiceType { get; set; }
        public Guid? DestinationId { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public double? MinRating { get; set; }
        public DateTime? Date { get; set; } // Lọc service khả dụng theo ngày
        public string? SortBy { get; set; } // price_asc, price_desc, rating, popular, newest
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }

    public class CreateTourDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public ServiceType? ServiceType { get; set; }
        public Guid? DestinationId { get; set; }
        public string? Address { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public decimal BasePrice { get; set; }
        public decimal? DiscountPrice { get; set; }
        public string? ThumbnailUrl { get; set; }
        public CancellationPolicyType CancellationPolicyType { get; set; }
        public string? CancellationPolicyDescription { get; set; }
        public List<string> ImageUrls { get; set; } = new();
        // Tour specific
        public string Duration { get; set; } = string.Empty;
        public int MaxParticipants { get; set; }
        public int MinParticipants { get; set; }
        public int BookingCutoffHours { get; set; } = 24;
        public List<CreateTourScheduleDto> Schedules { get; set; } = new();
        public List<CreateTourItineraryDto> Itineraries { get; set; } = new();
        public List<CreateTourPackageDto> Packages { get; set; } = new();
    }

    public class CreateTourPackageDto
    {
        public string Name { get; set; } = string.Empty;
        public string Duration { get; set; } = string.Empty;
        public int MaxParticipants { get; set; }
        public int MinParticipants { get; set; }
        public int BookingCutoffHours { get; set; } = 24;
        public string? MeetingPoint { get; set; }
        public CancellationPolicyType CancellationPolicyType { get; set; }
        public string? CancellationPolicyDescription { get; set; }
        public List<string> Includes { get; set; } = new();
        public List<string> Excludes { get; set; } = new();
        public List<CreateTourImageDto> Images { get; set; } = new();
        public List<CreateTourPricingTierDto> PricingTiers { get; set; } = new();
        public List<CreateTourScheduleDto> Sessions { get; set; } = new();
        public List<CreateTourItineraryDto> Itinerary { get; set; } = new();
    }

    public class CreateTourImageDto
    {
        public string ImageUrl { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool IsCover { get; set; }
    }

    public class CreateTourPricingTierDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal UnitPrice { get; set; }
        public int MinQuantity { get; set; } = 1;
        public int MaxQuantity { get; set; } = 1;
        public int DisplayOrder { get; set; }
    }

    public class CreateTourScheduleDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int RunCount { get; set; } = 1;
        public int AvailableSlots { get; set; }
        public decimal? PriceOverride { get; set; }
        public List<CreateTourSchedulePricingOverrideDto> PricingOverrides { get; set; } = new();
    }

    public class CreateTourSchedulePricingOverrideDto
    {
        public int TierDisplayOrder { get; set; }
        public decimal? CustomPrice { get; set; }
    }

    public class CreateTourItineraryDto
    {
        public int DayNumber { get; set; }
        public int DisplayOrder { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public TimeSpan? StartTime { get; set; }
        public TimeSpan? EndTime { get; set; }
        public string? Location { get; set; }
        public string? ActivityType { get; set; }
        public string? ImageUrl { get; set; }
    }

    public class CreateHomestayDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public Guid? DestinationId { get; set; }
        public string? Address { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public decimal BasePrice { get; set; }
        public decimal? DiscountPrice { get; set; }
        public string? ThumbnailUrl { get; set; }
        public CancellationPolicyType CancellationPolicyType { get; set; }
        public string? CancellationPolicyDescription { get; set; }
        public List<string> ImageUrls { get; set; } = new();
        // Homestay specific
        public string CheckInTime { get; set; } = "14:00:00";
        public string CheckOutTime { get; set; } = "12:00:00";
        public int MinNights { get; set; } = 1;
        public int MaxNights { get; set; } = 30;
        public DateTime? AvailableFrom { get; set; }
        public DateTime? AvailableTo { get; set; }
        public List<CreateRoomAvailabilityWindowDto> AvailabilityWindows { get; set; } = new();
        public List<CreateRoomDto> Rooms { get; set; } = new();
        public List<CreateAmenityDto> Amenities { get; set; } = new();
    }

    public class CreateRoomAvailabilityWindowDto
    {
        public string RoomKey { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int? AvailableCount { get; set; }
    }

    public class CreateRoomDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? BedType { get; set; }
        public int BedCount { get; set; } = 1;
        public int MaxGuests { get; set; }
        public int Quantity { get; set; } = 1;
        public decimal BasePrice { get; set; }
        public decimal? WeekendPrice { get; set; }
        public decimal? HolidayPrice { get; set; }
        public string? ImageUrl { get; set; }
        public List<CreateRoomImageDto> Images { get; set; } = new();
        public List<CreateAmenityDto> Amenities { get; set; } = new();
    }

    public class CreateRoomImageDto
    {
        public string ImageUrl { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool IsCover { get; set; }
    }

    public class CreateAmenityDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Icon { get; set; }
    }

    public class UpdateServiceDto
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public Guid? DestinationId { get; set; }
        public ServiceType? ServiceType { get; set; }
        public string? Address { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public decimal? BasePrice { get; set; }
        public decimal? DiscountPrice { get; set; }
        public string? ThumbnailUrl { get; set; }
        public CancellationPolicyType? CancellationPolicyType { get; set; }
        public string? CancellationPolicyDescription { get; set; }
        public bool? IsActive { get; set; }
        public string? CheckInTime { get; set; }
        public string? CheckOutTime { get; set; }
        public int? MinNights { get; set; }
        public int? MaxNights { get; set; }
        public List<CreateAmenityDto>? Amenities { get; set; }
        public List<UpdateRoomDto> Rooms { get; set; } = new();
        public List<UpdateRoomAvailabilityWindowDto>? AvailabilityWindows { get; set; }
        public List<CreateTourPackageDto>? TourPackages { get; set; }
    }

    public class UpdateRoomDto
    {
        public Guid? Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? BedType { get; set; }
        public int BedCount { get; set; } = 1;
        public int MaxGuests { get; set; }
        public int Quantity { get; set; } = 1;
        public decimal BasePrice { get; set; }
        public decimal? WeekendPrice { get; set; }
        public decimal? HolidayPrice { get; set; }
        public string? ImageUrl { get; set; }
        public List<CreateRoomImageDto>? Images { get; set; }
        public List<CreateAmenityDto>? Amenities { get; set; }
    }

    public class UpdateRoomAvailabilityWindowDto
    {
        public Guid RoomId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int AvailableCount { get; set; }
        public bool IsBlocked { get; set; }
    }
}
