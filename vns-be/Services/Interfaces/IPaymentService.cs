namespace VNS.API.Services.Interfaces
{
    public interface IPaymentService
    {
        Task<object> CreateVnPayUrlAsync(Guid userId, Guid bookingId, string ipAddress);
        Task<string> ProcessVnPayCallbackAsync(IQueryCollection queryCollection);
        Task<object> PayWithWalletAsync(Guid userId, Guid bookingId);
        Task<object> PayCombinedAsync(Guid userId, Guid bookingId, decimal walletAmount, string ipAddress);
    }
}
