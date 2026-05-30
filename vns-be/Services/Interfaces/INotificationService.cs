using VNS.API.Models.Enums;

namespace VNS.API.Services.Interfaces
{
    public interface INotificationService
    {
        Task<object> GetNotificationsAsync(Guid userId, int page, int pageSize);
        Task<int> GetUnreadCountAsync(Guid userId);
        Task<object> MarkAsReadAsync(Guid userId, Guid notificationId);
        Task<object> MarkAllAsReadAsync(Guid userId);
        Task SendNotificationAsync(Guid userId, string title, string? content, NotificationType type, Guid? referenceId = null);
    }
}
