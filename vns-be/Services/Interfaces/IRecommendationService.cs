namespace VNS.API.Services.Interfaces
{
    public interface IRecommendationService
    {
        Task<object> GetPersonalizedRecommendationsAsync(Guid userId, int count = 10);
        Task<object> GetTrendingServicesAsync(int count = 10);
        Task<object> GetSimilarServicesAsync(Guid serviceId, int count = 5);
        Task<object> GetRecommendedDestinationsAsync(Guid? userId, int count = 5);
    }
}
