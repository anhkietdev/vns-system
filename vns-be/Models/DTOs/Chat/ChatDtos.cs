using VNS.API.Models.Enums;

namespace VNS.API.Models.DTOs.Chat
{
    public class SendMessageDto
    {
        public Guid? ConversationId { get; set; }
        public Guid? PartnerId { get; set; }
        public string? Content { get; set; }
        public string? ImageUrl { get; set; }
        public ChatMessageType MessageType { get; set; } = ChatMessageType.Text;
    }

    public class ConversationDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string? UserAvatarUrl { get; set; }
        public Guid PartnerId { get; set; }
        public string PartnerName { get; set; } = string.Empty;
        public string? PartnerLogoUrl { get; set; }
        public string? LastMessage { get; set; }
        public DateTime? LastMessageAt { get; set; }
        public int UnreadCount { get; set; }
    }

    public class MessageDto
    {
        public Guid Id { get; set; }
        public Guid ConversationId { get; set; }
        public Guid SenderId { get; set; }
        public string SenderName { get; set; } = string.Empty;
        public string? SenderAvatarUrl { get; set; }
        public ChatMessageType MessageType { get; set; }
        public string? Content { get; set; }
        public string? ImageUrl { get; set; }
        public bool IsRead { get; set; }
        public DateTime SentAt { get; set; }
    }
}
