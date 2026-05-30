using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Helpers;
using VNS.API.Models.Entities;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public class DestinationService : IDestinationService
    {
        private readonly VNSDbContext _context;

        public DestinationService(VNSDbContext context)
        {
            _context = context;
        }

        public async Task<object> GetAllAsync()
        {
            var destinations = await _context.Destinations
                .OrderByDescending(d => d.IsPopular)
                .ThenBy(d => d.Name)
                .Select(d => new
                {
                    d.Id,
                    d.Name,
                    d.Description,
                    d.Province,
                    d.ImageUrl,
                    d.Latitude,
                    d.Longitude,
                    d.IsPopular,
                    ServiceCount = d.Services.Count(s => s.IsActive && s.ApprovalStatus == Models.Enums.ServiceApprovalStatus.Approved)
                })
                .ToListAsync();

            return destinations;
        }

        public async Task<object> GetPopularAsync(int count)
        {
            if (count < 1) count = 10;
            if (count > 50) count = 50;

            var destinations = await _context.Destinations
                .Where(d => d.IsPopular)
                .OrderBy(d => d.Name)
                .Take(count)
                .Select(d => new
                {
                    d.Id,
                    d.Name,
                    d.Description,
                    d.Province,
                    d.ImageUrl,
                    d.Latitude,
                    d.Longitude,
                    d.IsPopular,
                    ServiceCount = d.Services.Count(s => s.IsActive && s.ApprovalStatus == Models.Enums.ServiceApprovalStatus.Approved)
                })
                .ToListAsync();

            return destinations;
        }

        public async Task<object> GetByIdAsync(Guid id)
        {
            var destination = await _context.Destinations
                .Include(d => d.Services.Where(s => s.IsActive && s.ApprovalStatus == Models.Enums.ServiceApprovalStatus.Approved))
                    .ThenInclude(s => s.Partner)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (destination == null)
                throw new BusinessException("Không tìm thấy điểm đến");

            return new
            {
                destination.Id,
                destination.Name,
                destination.Description,
                destination.Province,
                destination.ImageUrl,
                destination.Latitude,
                destination.Longitude,
                destination.IsPopular,
                Services = destination.Services.Select(s => new
                {
                    s.Id,
                    s.Name,
                    s.Description,
                    s.ServiceType,
                    s.BasePrice,
                    s.DiscountPrice,
                    s.ThumbnailUrl,
                    s.AverageRating,
                    s.TotalReviews,
                    s.TotalBookings,
                    PartnerName = s.Partner.BusinessName
                })
            };
        }

        public async Task<object> CreateAsync(string name, string? description, string province, string? imageUrl, double? lat, double? lng, bool isPopular)
        {
            var destination = new Destination
            {
                Id = Guid.NewGuid(),
                Name = name,
                Description = description,
                Province = province,
                ImageUrl = imageUrl,
                Latitude = lat,
                Longitude = lng,
                IsPopular = isPopular,
                CreatedAt = DateTime.UtcNow
            };

            _context.Destinations.Add(destination);
            await _context.SaveChangesAsync();

            return new { Id = destination.Id, Message = "Tạo điểm đến thành công" };
        }

        public async Task<object> UpdateAsync(Guid id, string? name, string? description, string? province, string? imageUrl, bool? isPopular)
        {
            var destination = await _context.Destinations.FindAsync(id);
            if (destination == null) throw new BusinessException("Không tìm thấy điểm đến");

            if (name != null) destination.Name = name;
            if (description != null) destination.Description = description;
            if (province != null) destination.Province = province;
            if (imageUrl != null) destination.ImageUrl = imageUrl;
            if (isPopular.HasValue) destination.IsPopular = isPopular.Value;

            await _context.SaveChangesAsync();
            return new { Message = "Cập nhật điểm đến thành công" };
        }

        public async Task<object> DeleteAsync(Guid id)
        {
            var destination = await _context.Destinations.FindAsync(id);
            if (destination == null) throw new BusinessException("Không tìm thấy điểm đến");

            _context.Destinations.Remove(destination);
            await _context.SaveChangesAsync();

            return new { Message = "Xóa điểm đến thành công" };
        }
    }
}
