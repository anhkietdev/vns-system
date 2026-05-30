using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Models.DTOs.Service;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public class FavoriteService : IFavoriteService
    {
        private readonly VNSDbContext _context;

        public FavoriteService(VNSDbContext context)
        {
            _context = context;
        }

        public async Task<object> ToggleFavoriteAsync(Guid userId, Guid serviceId)
        {
            var existing = await _context.Favorites
                .FirstOrDefaultAsync(f => f.UserId == userId && f.ServiceId == serviceId);

            if (existing != null)
            {
                _context.Favorites.Remove(existing);
                await _context.SaveChangesAsync();
                return new { IsFavorite = false, Message = "Đã xóa khỏi yêu thích" };
            }

            var service = await _context.Services.FindAsync(serviceId);
            if (service == null)
                throw new Exception("Không tìm thấy dịch vụ");

            if (!service.IsActive)
                throw new Exception("Dịch vụ không khả dụng");

            var favorite = new Favorite
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ServiceId = serviceId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Favorites.Add(favorite);
            await _context.SaveChangesAsync();

            return new { IsFavorite = true, Message = "Đã thêm vào yêu thích" };
        }

        public async Task<object> GetFavoritesAsync(Guid userId, int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Favorites
                .Include(f => f.Service)
                    .ThenInclude(s => s.Partner)
                .Include(f => f.Service)
                    .ThenInclude(s => s.Destination)
                .Where(f => f.UserId == userId && f.Service.IsActive)
                .OrderByDescending(f => f.CreatedAt);

            var totalCount = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(f => new ServiceListDto
                {
                    Id = f.Service.Id,
                    Name = f.Service.Name,
                    Description = f.Service.Description,
                    ServiceType = f.Service.ServiceType,
                    Address = f.Service.Address,
                    BasePrice = f.Service.BasePrice,
                    DiscountPrice = f.Service.DiscountPrice,
                    ThumbnailUrl = f.Service.ThumbnailUrl,
                    AverageRating = f.Service.AverageRating,
                    TotalReviews = f.Service.TotalReviews,
                    TotalBookings = f.Service.TotalBookings,
                    DestinationName = f.Service.Destination.Name,
                    PartnerName = f.Service.Partner.BusinessName,
                    ApprovalStatus = f.Service.ApprovalStatus,
                    IsActive = f.Service.IsActive
                })
                .ToListAsync();

            return new
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            };
        }
    }
}
