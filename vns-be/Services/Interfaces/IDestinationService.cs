namespace VNS.API.Services.Interfaces
{
    public interface IDestinationService
    {
        Task<object> GetAllAsync();
        Task<object> GetByIdAsync(Guid id);
        Task<object> GetPopularAsync(int count);
        Task<object> CreateAsync(string name, string? description, string province, string? imageUrl, double? lat, double? lng, bool isPopular);
        Task<object> UpdateAsync(Guid id, string? name, string? description, string? province, string? imageUrl, bool? isPopular);
        Task<object> DeleteAsync(Guid id);
    }
}
