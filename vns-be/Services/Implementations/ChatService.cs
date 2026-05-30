using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Helpers;
using VNS.API.Hubs;
using VNS.API.Models.DTOs.Chat;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public class ChatService : IChatService
    {
        private readonly VNSDbContext _context;
        private readonly IHubContext<ChatHub> _chatHub;

        public ChatService(VNSDbContext context, IHubContext<ChatHub> chatHub)
        {
            _context = context;
            _chatHub = chatHub;
        }

        public async Task<object> GetConversationsAsync(Guid userId)
        {
            var user = await _context.Users.Include(u => u.Partner).FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) throw new BusinessException("Không tìm thấy người dùng");

            IQueryable<ChatConversation> query;

            if (user.Role == UserRole.Partner && user.Partner != null)
            {
                query = _context.ChatConversations
                    .Include(c => c.User)
                    .Include(c => c.Partner)
                    .Where(c => c.PartnerId == user.Partner.Id);
            }
            else
            {
                query = _context.ChatConversations
                    .Include(c => c.User)
                    .Include(c => c.Partner)
                    .Where(c => c.UserId == userId);
            }

            var conversations = await query
                .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
                .ToListAsync();

            var result = new List<ConversationDto>();
            foreach (var conv in conversations)
            {
                var lastMessage = await _context.ChatMessages
                    .Where(m => m.ConversationId == conv.Id)
                    .OrderByDescending(m => m.SentAt)
                    .FirstOrDefaultAsync();

                var unreadCount = await _context.ChatMessages
                    .CountAsync(m => m.ConversationId == conv.Id && !m.IsRead && m.SenderId != userId);

                result.Add(new ConversationDto
                {
                    Id = conv.Id,
                    UserId = conv.UserId,
                    UserName = conv.User.FullName,
                    UserAvatarUrl = conv.User.AvatarUrl,
                    PartnerId = conv.PartnerId,
                    PartnerName = conv.Partner.BusinessName,
                    PartnerLogoUrl = conv.Partner.LogoUrl,
                    LastMessage = lastMessage?.Content,
                    LastMessageAt = conv.LastMessageAt,
                    UnreadCount = unreadCount
                });
            }

            return result;
        }

        public async Task<object> GetMessagesAsync(Guid userId, Guid conversationId, int page, int pageSize)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            if (pageSize > 100) pageSize = 100;

            var conversation = await _context.ChatConversations
                .FirstOrDefaultAsync(c => c.Id == conversationId);

            if (conversation == null)
                throw new BusinessException("Không tìm thấy hội thoại");

            var query = _context.ChatMessages
                .Include(m => m.Sender)
                .Where(m => m.ConversationId == conversationId)
                .OrderByDescending(m => m.SentAt);

            var totalCount = await query.CountAsync();
            var messages = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(m => new MessageDto
                {
                    Id = m.Id,
                    ConversationId = m.ConversationId,
                    SenderId = m.SenderId,
                    SenderName = m.Sender.FullName,
                    SenderAvatarUrl = m.Sender.AvatarUrl,
                    MessageType = m.MessageType,
                    Content = m.Content,
                    ImageUrl = m.ImageUrl,
                    IsRead = m.IsRead,
                    SentAt = m.SentAt
                })
                .ToListAsync();

            // Reverse to show oldest first
            messages.Reverse();

            return new
            {
                Items = messages,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            };
        }

        public async Task<object> SendMessageAsync(Guid userId, SendMessageDto dto)
        {
            ChatConversation? conversation = null;

            if (dto.ConversationId.HasValue)
            {
                conversation = await _context.ChatConversations.FindAsync(dto.ConversationId.Value);
            }
            else if (dto.PartnerId.HasValue)
            {
                // Find or create conversation
                var user = await _context.Users.Include(u => u.Partner).FirstOrDefaultAsync(u => u.Id == userId);
                if (user == null) throw new BusinessException("Không tìm thấy người dùng");

                Guid actualUserId;
                Guid actualPartnerId;

                if (user.Role == UserRole.Partner && user.Partner != null)
                {
                    // Partner sending to user - in this case PartnerId in dto is actually the user's partner they want to chat with
                    // But the conversation model has UserId (customer) and PartnerId (business partner)
                    // Since this partner is sending, check if there's a conversation
                    actualPartnerId = user.Partner.Id;
                    // Here dto.PartnerId actually represents the userId of the customer
                    actualUserId = dto.PartnerId.Value;
                    conversation = await _context.ChatConversations
                        .FirstOrDefaultAsync(c => c.UserId == actualUserId && c.PartnerId == actualPartnerId);
                }
                else
                {
                    actualUserId = userId;
                    actualPartnerId = dto.PartnerId.Value;
                    conversation = await _context.ChatConversations
                        .FirstOrDefaultAsync(c => c.UserId == userId && c.PartnerId == dto.PartnerId.Value);
                }

                if (conversation == null)
                {
                    conversation = new ChatConversation
                    {
                        Id = Guid.NewGuid(),
                        UserId = actualUserId,
                        PartnerId = actualPartnerId,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.ChatConversations.Add(conversation);
                }
            }

            if (conversation == null)
                throw new BusinessException("Vui lòng cung cấp ConversationId hoặc PartnerId");

            var message = new ChatMessage
            {
                Id = Guid.NewGuid(),
                ConversationId = conversation.Id,
                SenderId = userId,
                MessageType = dto.MessageType,
                Content = dto.Content,
                ImageUrl = dto.ImageUrl,
                IsRead = false,
                SentAt = DateTime.UtcNow
            };

            _context.ChatMessages.Add(message);
            conversation.LastMessageAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var sender = await _context.Users.FindAsync(userId);
            var messageDto = new MessageDto
            {
                Id = message.Id,
                ConversationId = message.ConversationId,
                SenderId = message.SenderId,
                SenderName = sender?.FullName ?? "",
                SenderAvatarUrl = sender?.AvatarUrl,
                MessageType = message.MessageType,
                Content = message.Content,
                ImageUrl = message.ImageUrl,
                IsRead = message.IsRead,
                SentAt = message.SentAt
            };

            // Send via SignalR
            await _chatHub.Clients.Group(conversation.Id.ToString()).SendAsync("ReceiveMessage", messageDto);

            return messageDto;
        }

        public async Task<object> MarkAsReadAsync(Guid userId, Guid conversationId)
        {
            var unreadMessages = await _context.ChatMessages
                .Where(m => m.ConversationId == conversationId && !m.IsRead && m.SenderId != userId)
                .ToListAsync();

            foreach (var msg in unreadMessages)
                msg.IsRead = true;

            await _context.SaveChangesAsync();

            return new { MarkedCount = unreadMessages.Count };
        }
    }
}
