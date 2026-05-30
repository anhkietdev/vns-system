namespace VNS.API.Services.Interfaces
{
    public interface IFavoriteService
    {
        Task<object> ToggleFavoriteAsync(Guid userId, Guid serviceId);
        Task<object> GetFavoritesAsync(Guid userId, int page, int pageSize);
    }
}
