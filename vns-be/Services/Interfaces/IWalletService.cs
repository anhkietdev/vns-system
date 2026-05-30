namespace VNS.API.Services.Interfaces
{
    public interface IWalletService
    {
        Task<object> GetWalletAsync(Guid userId);
        Task<object> GetTransactionsAsync(Guid userId, int page, int pageSize);
        Task<object> TopUpAsync(Guid userId, decimal amount, string ipAddress);
        Task<string> ProcessTopUpCallbackAsync(IQueryCollection queryCollection);
        Task<string> ProcessTopUpCallbackRawAsync(string rawQuery);
    }
}
