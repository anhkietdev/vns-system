using VNS.API.Models.DTOs.Admin;
using VNS.API.Models.DTOs.Partner;
using VNS.API.Models.DTOs.Review;

namespace VNS.API.Services.Interfaces
{
    public interface IReviewService
    {
        Task<object> CreateReviewAsync(Guid userId, CreateReviewDto dto);
        Task<object> UpdateReviewAsync(Guid userId, Guid reviewId, CreateReviewDto dto);
        Task<object> DeleteReviewAsync(Guid userId, Guid reviewId);
        Task<object> GetServiceReviewsAsync(Guid serviceId, int page, int pageSize, string? sortBy);
        Task<object> GetUserReviewsAsync(Guid userId);
        Task<object> RespondToReviewAsync(Guid userId, Guid reviewId, ReviewResponseDto dto);
        Task<object> GetPartnerReviewsAsync(Guid userId, PartnerReviewFilterDto filter);
        Task<object> GetAllFeedbackAsync(FeedbackFilterDto filter);
        Task<object> UpdateReviewVisibilityAsync(Guid reviewId, bool isVisible, string? status = null);
        Task<object> DeleteReviewAsync(Guid reviewId);
    }
}
