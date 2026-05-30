using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Helpers;
using VNS.API.Models.DTOs.Admin;
using VNS.API.Models.DTOs.Partner;
using VNS.API.Models.DTOs.Review;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public class ReviewService : IReviewService
    {
        private readonly VNSDbContext _context;
        private readonly ICloudinaryService _cloudinaryService;

        public ReviewService(VNSDbContext context, ICloudinaryService cloudinaryService)
        {
            _context = context;
            _cloudinaryService = cloudinaryService;
        }

        public async Task<object> CreateReviewAsync(Guid userId, CreateReviewDto dto)
        {
            var booking = await _context.Bookings
                .Include(b => b.Service)
                .Include(b => b.Review)
                .FirstOrDefaultAsync(b => b.Id == dto.BookingId && b.UserId == userId);

            if (booking == null)
                throw new BusinessException("Không tìm thấy đặt chỗ");

            if (booking.Status != BookingStatus.Completed)
                throw new BusinessException("Chỉ có thể đánh giá sau khi hoàn thành chuyến đi");

            if (booking.Review != null)
                throw new BusinessException("Bạn đã đánh giá đặt chỗ này rồi");

            if (dto.Rating < 1 || dto.Rating > 5)
                throw new BusinessException("Đánh giá phải từ 1 đến 5 sao");

            if (dto.Images != null && dto.Images.Count > 10)
                throw new BusinessException("Tối đa 10 ảnh cho mỗi đánh giá");

            var review = new Review
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                UserId = userId,
                ServiceId = booking.ServiceId,
                Rating = dto.Rating,
                Comment = dto.Comment,
                IsVisible = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Reviews.Add(review);

            if (dto.Images != null && dto.Images.Any())
            {
                foreach (var image in dto.Images)
                {
                    var imageUrl = await _cloudinaryService.UploadImageAsync(image, "vns/reviews");
                    _context.ReviewImages.Add(new ReviewImage
                    {
                        Id = Guid.NewGuid(),
                        ReviewId = review.Id,
                        ImageUrl = imageUrl,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();

            var service = booking.Service;
            var avgRating = await _context.Reviews
                .Where(r => r.ServiceId == service.Id && r.IsVisible)
                .AverageAsync(r => (double?)r.Rating) ?? 0;
            service.AverageRating = Math.Round(avgRating, 1);
            service.TotalReviews = await _context.Reviews.CountAsync(r => r.ServiceId == service.Id && r.IsVisible);
            service.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new
            {
                Id = review.Id,
                Rating = review.Rating,
                Comment = review.Comment,
                Message = "Đánh giá thành công"
            };
        }

        public async Task<object> GetServiceReviewsAsync(Guid serviceId, int page, int pageSize, string? sortBy)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var query = _context.Reviews
                .Include(r => r.User)
                .Include(r => r.ReviewImages)
                .Where(r => r.ServiceId == serviceId && r.IsVisible)
                .AsQueryable();

            query = sortBy switch
            {
                "newest" => query.OrderByDescending(r => r.CreatedAt),
                "oldest" => query.OrderBy(r => r.CreatedAt),
                "highest" => query.OrderByDescending(r => r.Rating),
                "lowest" => query.OrderBy(r => r.Rating),
                _ => query.OrderByDescending(r => r.CreatedAt)
            };

            var totalCount = await query.CountAsync();

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new ReviewListDto
                {
                    Id = r.Id,
                    BookingId = r.BookingId,
                    ServiceId = r.ServiceId,
                    ServiceName = r.Service.Name,
                    UserName = r.User.FullName,
                    UserAvatarUrl = r.User.AvatarUrl,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    PartnerResponse = r.PartnerResponse,
                    PartnerRespondedAt = r.PartnerRespondedAt,
                    ImageUrls = r.ReviewImages.Select(ri => ri.ImageUrl).ToList(),
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();

            var ratingStats = await _context.Reviews
                .Where(r => r.ServiceId == serviceId && r.IsVisible)
                .GroupBy(r => r.Rating)
                .Select(g => new { Rating = g.Key, Count = g.Count() })
                .ToListAsync();

            var avgRating = ratingStats.Any() ? ratingStats.Sum(r => r.Rating * r.Count) / (double)ratingStats.Sum(r => r.Count) : 0;

            return new
            {
                Items = items,
                TotalCount = totalCount,
                AverageRating = Math.Round(avgRating, 1),
                RatingStats = Enumerable.Range(1, 5).Select(i => new
                {
                    Stars = i,
                    Count = ratingStats.FirstOrDefault(r => r.Rating == i)?.Count ?? 0
                }),
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            };
        }

        public async Task<object> GetUserReviewsAsync(Guid userId)
        {
            return await _context.Reviews
                .Include(r => r.Service)
                .Include(r => r.ReviewImages)
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new ReviewListDto
                {
                    Id = r.Id,
                    BookingId = r.BookingId,
                    ServiceId = r.ServiceId,
                    ServiceName = r.Service.Name,
                    UserName = r.User.FullName,
                    UserAvatarUrl = r.User.AvatarUrl,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    PartnerResponse = r.PartnerResponse,
                    PartnerRespondedAt = r.PartnerRespondedAt,
                    ImageUrls = r.ReviewImages.Select(ri => ri.ImageUrl).ToList(),
                    CreatedAt = r.CreatedAt,
                    IsVisible = r.IsVisible,
                    AdminStatus = r.AdminStatus.ToString().ToLower()
                })
                .ToListAsync();
        }

        public async Task<object> RespondToReviewAsync(Guid userId, Guid reviewId, ReviewResponseDto dto)
        {
            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            if (partner == null) throw new BusinessException("Không tìm thấy đối tác");

            var review = await _context.Reviews
                .Include(r => r.Booking)
                .FirstOrDefaultAsync(r => r.Id == reviewId && r.Booking.PartnerId == partner.Id);

            if (review == null)
                throw new BusinessException("Không tìm thấy đánh giá");

            if (!string.IsNullOrEmpty(review.PartnerResponse))
                throw new BusinessException("Bạn đã phản hồi đánh giá này rồi");

            review.PartnerResponse = dto.Response;
            review.PartnerRespondedAt = DateTime.UtcNow;
            review.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return new { Message = "Phản hồi đánh giá thành công" };
        }

        public async Task<object> GetPartnerReviewsAsync(Guid userId, PartnerReviewFilterDto filter)
        {
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1) filter.PageSize = 10;
            if (filter.PageSize > 100) filter.PageSize = 100;

            var partner = await _context.Partners.FirstOrDefaultAsync(p => p.UserId == userId);
            if (partner == null) throw new BusinessException("Không tìm thấy đối tác");

            var query = _context.Reviews
                .Include(r => r.User)
                .Include(r => r.Service)
                .Include(r => r.ReviewImages)
                .Where(r => r.Booking.PartnerId == partner.Id)
                .AsQueryable();

            if (filter.ServiceId.HasValue)
                query = query.Where(r => r.ServiceId == filter.ServiceId.Value);

            if (filter.MinRating.HasValue)
                query = query.Where(r => r.Rating >= filter.MinRating.Value);

            if (filter.MaxRating.HasValue)
                query = query.Where(r => r.Rating <= filter.MaxRating.Value);

            if (filter.HasResponse.HasValue)
            {
                if (filter.HasResponse.Value)
                    query = query.Where(r => r.PartnerResponse != null);
                else
                    query = query.Where(r => r.PartnerResponse == null);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(r => new PartnerReviewListDto
                {
                    Id = r.Id,
                    UserName = r.User.FullName,
                    UserAvatar = r.User.AvatarUrl,
                    ServiceId = r.ServiceId,
                    ServiceName = r.Service.Name,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    ImageUrls = r.ReviewImages.Select(ri => ri.ImageUrl).ToList(),
                    PartnerResponse = r.PartnerResponse,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();

            return new
            {
                Items = items,
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize)
            };
        }

        public async Task<object> GetAllFeedbackAsync(FeedbackFilterDto filter)
        {
            if (filter.Page < 1) filter.Page = 1;
            if (filter.PageSize < 1) filter.PageSize = 10;
            if (filter.PageSize > 100) filter.PageSize = 100;

            var query = _context.Reviews
                .Include(r => r.User)
                .Include(r => r.Service)
                .Include(r => r.ReviewImages)
                .AsQueryable();

            if (!string.IsNullOrEmpty(filter.Keyword))
            {
                var kw = filter.Keyword.ToLower();
                query = query.Where(r => r.User.FullName.ToLower().Contains(kw)
                    || r.Service.Name.ToLower().Contains(kw)
                    || (r.Comment != null && r.Comment.ToLower().Contains(kw)));
            }

            if (filter.MinRating.HasValue)
                query = query.Where(r => r.Rating >= filter.MinRating.Value);

            if (filter.MaxRating.HasValue)
                query = query.Where(r => r.Rating <= filter.MaxRating.Value);

            if (filter.IsVisible.HasValue)
                query = query.Where(r => r.IsVisible == filter.IsVisible.Value);

            if (filter.ServiceId.HasValue)
                query = query.Where(r => r.ServiceId == filter.ServiceId.Value);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(r => r.CreatedAt)
                .Skip((filter.Page - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .Select(r => new FeedbackListItemDto
                {
                    Id = r.Id,
                    UserId = r.UserId,
                    UserName = r.User.FullName,
                    UserAvatar = r.User.AvatarUrl,
                    ServiceId = r.ServiceId,
                    ServiceName = r.Service.Name,
                    Rating = r.Rating,
                    Comment = r.Comment,
                    ImageUrls = r.ReviewImages.Select(ri => ri.ImageUrl).ToList(),
                    IsVisible = r.IsVisible,
                    AdminStatus = r.AdminStatus.ToString().ToLower(),
                    PartnerResponse = r.PartnerResponse,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();

            return new
            {
                Items = items,
                TotalCount = totalCount,
                Page = filter.Page,
                PageSize = filter.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / filter.PageSize)
            };
        }

        public async Task<object> UpdateReviewVisibilityAsync(Guid reviewId, bool isVisible, string? status = null)
        {
            var review = await _context.Reviews.FindAsync(reviewId);
            if (review == null) throw new BusinessException("Không tìm thấy đánh giá");

            review.IsVisible = isVisible;
            // Cập nhật trạng thái xử lý (new/reviewed/actioned)
            if (!string.IsNullOrEmpty(status))
            {
                if (Enum.TryParse<ReviewStatus>(status, true, out var parsed))
                    review.AdminStatus = parsed;
            }
            review.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Recalculate service average rating
            var visibleReviews = await _context.Reviews
                .Where(r => r.ServiceId == review.ServiceId && r.IsVisible)
                .ToListAsync();

            var service = await _context.Services.FindAsync(review.ServiceId);
            if (service != null)
            {
                service.AverageRating = visibleReviews.Any() ? visibleReviews.Average(r => r.Rating) : 0;
                service.TotalReviews = visibleReviews.Count;
                service.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return new { Message = "Cập nhật đánh giá thành công", AdminStatus = review.AdminStatus.ToString() };
        }

        public async Task<object> UpdateReviewAsync(Guid userId, Guid reviewId, CreateReviewDto dto)
        {
            var review = await _context.Reviews
                .Include(r => r.Service)
                .FirstOrDefaultAsync(r => r.Id == reviewId && r.UserId == userId);

            if (review == null)
                throw new BusinessException("Không tìm thấy đánh giá hoặc bạn không có quyền chỉnh sửa");

            if (dto.Rating < 1 || dto.Rating > 5)
                throw new BusinessException("Đánh giá phải từ 1 đến 5 sao");

            review.Rating = dto.Rating;
            review.Comment = dto.Comment;
            review.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var service = review.Service;
            var avgRating = await _context.Reviews
                .Where(r => r.ServiceId == service.Id && r.IsVisible)
                .AverageAsync(r => (double?)r.Rating) ?? 0;
            service.AverageRating = Math.Round(avgRating, 1);
            service.TotalReviews = await _context.Reviews.CountAsync(r => r.ServiceId == service.Id && r.IsVisible);
            service.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new
            {
                Id = review.Id,
                Rating = review.Rating,
                Comment = review.Comment,
                Message = "Cập nhật đánh giá thành công"
            };
        }

        public async Task<object> DeleteReviewAsync(Guid userId, Guid reviewId)
        {
            var review = await _context.Reviews
                .Include(r => r.ReviewImages)
                .FirstOrDefaultAsync(r => r.Id == reviewId && r.UserId == userId);

            if (review == null)
                throw new BusinessException("Không tìm thấy đánh giá hoặc bạn không có quyền xóa");

            var serviceId = review.ServiceId;

            _context.ReviewImages.RemoveRange(review.ReviewImages);
            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();

            var service = await _context.Services.FindAsync(serviceId);
            if (service != null)
            {
                var avgRating = await _context.Reviews
                    .Where(r => r.ServiceId == serviceId && r.IsVisible)
                    .AverageAsync(r => (double?)r.Rating) ?? 0;
                service.AverageRating = Math.Round(avgRating, 1);
                service.TotalReviews = await _context.Reviews.CountAsync(r => r.ServiceId == serviceId && r.IsVisible);
                service.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return new { Message = "Xóa đánh giá thành công" };
        }

        public async Task<object> DeleteReviewAsync(Guid reviewId)
        {
            var review = await _context.Reviews
                .Include(r => r.ReviewImages)
                .FirstOrDefaultAsync(r => r.Id == reviewId);

            if (review == null) throw new BusinessException("Không tìm thấy đánh giá");

            var serviceId = review.ServiceId;

            _context.ReviewImages.RemoveRange(review.ReviewImages);
            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();

            // Recalculate service average rating
            var visibleReviews = await _context.Reviews
                .Where(r => r.ServiceId == serviceId && r.IsVisible)
                .ToListAsync();

            var service = await _context.Services.FindAsync(serviceId);
            if (service != null)
            {
                service.AverageRating = visibleReviews.Any() ? visibleReviews.Average(r => r.Rating) : 0;
                service.TotalReviews = visibleReviews.Count;
                service.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return new { Message = "Xóa đánh giá thành công" };
        }
    }
}
