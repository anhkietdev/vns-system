using VNS.API.Models.DTOs.Chat;

namespace VNS.API.Services.Interfaces
{
    public interface IChatService
    {
        Task<object> GetConversationsAsync(Guid userId);
        Task<object> GetMessagesAsync(Guid userId, Guid conversationId, int page, int pageSize);
        Task<object> SendMessageAsync(Guid userId, SendMessageDto dto);
        Task<object> MarkAsReadAsync(Guid userId, Guid conversationId);
    }
}
