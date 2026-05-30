namespace VNS.API.Services.Interfaces
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string body);
        Task SendOtpEmailAsync(string toEmail, string otp);
        Task SendPasswordChangedEmailAsync(string toEmail, string fullName);
        Task SendPaymentSuccessEmailAsync(string toEmail, string bookingCode, string serviceName, decimal amount, string paymentMethod);
        Task SendTripInfoEmailAsync(string toEmail, string bookingCode, string serviceName, string contactName, int numberOfGuests, DateTime? checkIn, DateTime? checkOut);
    }
}
