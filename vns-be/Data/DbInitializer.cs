using VNS.API.Models.Entities;
using VNS.API.Models.Enums;

namespace VNS.API.Data
{
    public static class DbInitializer
    {
        public static void Seed(VNSDbContext context)
        {
            if (context.Users.Any()) return;

            var adminId = Guid.NewGuid();
            var managerId = Guid.NewGuid();
            var user1Id = Guid.NewGuid();
            var user2Id = Guid.NewGuid();
            var partnerUser1Id = Guid.NewGuid();
            var partnerUser2Id = Guid.NewGuid();
            var partnerUser3Id = Guid.NewGuid();

            var admin = new User
            {
                Id = adminId,
                FullName = "Quản trị viên VNS",
                Email = "admin@vns.vn",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                PhoneNumber = "0901000001",
                Role = UserRole.Admin,
                IsActive = true,
                IsEmailVerified = true,
                AvatarUrl = "https://ui-avatars.com/api/?name=Admin+VNS&background=0066cc&color=fff&size=200",
                CreatedAt = DateTime.UtcNow
            };

            var manager = new User
            {
                Id = managerId,
                FullName = "Quản lý VNS",
                Email = "manager@vns.vn",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Manager@123"),
                PhoneNumber = "0901000002",
                Role = UserRole.Manager,
                IsActive = true,
                IsEmailVerified = true,
                AvatarUrl = "https://ui-avatars.com/api/?name=Manager+VNS&background=28a745&color=fff&size=200",
                CreatedAt = DateTime.UtcNow
            };

            var user1 = new User
            {
                Id = user1Id,
                FullName = "Nguyễn Văn An",
                Email = "an.nguyen@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("User@123"),
                PhoneNumber = "0912345678",
                Role = UserRole.User,
                IsActive = true,
                IsEmailVerified = true,
                Gender = "Nam",
                DateOfBirth = new DateTime(1995, 5, 15),
                AvatarUrl = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
                CreatedAt = DateTime.UtcNow
            };

            var user2 = new User
            {
                Id = user2Id,
                FullName = "Trần Thị Bình",
                Email = "binh.tran@gmail.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("User@123"),
                PhoneNumber = "0923456789",
                Role = UserRole.User,
                IsActive = true,
                IsEmailVerified = true,
                Gender = "Nữ",
                DateOfBirth = new DateTime(1998, 8, 20),
                AvatarUrl = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
                CreatedAt = DateTime.UtcNow
            };

            var partnerUser1 = new User
            {
                Id = partnerUser1Id,
                FullName = "Lê Minh Tuấn",
                Email = "tuan.le@partner.vn",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Partner@123"),
                PhoneNumber = "0934567890",
                Role = UserRole.Partner,
                IsActive = true,
                IsEmailVerified = true,
                AvatarUrl = "https://ui-avatars.com/api/?name=Minh+Tuan&background=ff6600&color=fff&size=200",
                CreatedAt = DateTime.UtcNow
            };

            var partnerUser2 = new User
            {
                Id = partnerUser2Id,
                FullName = "Phạm Thị Hương",
                Email = "huong.pham@partner.vn",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Partner@123"),
                PhoneNumber = "0945678901",
                Role = UserRole.Partner,
                IsActive = true,
                IsEmailVerified = true,
                AvatarUrl = "https://ui-avatars.com/api/?name=Thi+Huong&background=cc0066&color=fff&size=200",
                CreatedAt = DateTime.UtcNow
            };

            var partnerUser3 = new User
            {
                Id = partnerUser3Id,
                FullName = "Hoàng Đức Anh",
                Email = "anh.hoang@partner.vn",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Partner@123"),
                PhoneNumber = "0956789012",
                Role = UserRole.Partner,
                IsActive = true,
                IsEmailVerified = true,
                AvatarUrl = "https://ui-avatars.com/api/?name=Duc+Anh&background=6600cc&color=fff&size=200",
                CreatedAt = DateTime.UtcNow
            };

            context.Users.AddRange(admin, manager, user1, user2, partnerUser1, partnerUser2, partnerUser3);

            context.Wallets.AddRange(
                new Wallet { Id = Guid.NewGuid(), UserId = adminId, Balance = 0, CreatedAt = DateTime.UtcNow },
                new Wallet { Id = Guid.NewGuid(), UserId = managerId, Balance = 0, CreatedAt = DateTime.UtcNow },
                new Wallet { Id = Guid.NewGuid(), UserId = user1Id, Balance = 0, CreatedAt = DateTime.UtcNow },
                new Wallet { Id = Guid.NewGuid(), UserId = user2Id, Balance = 0, CreatedAt = DateTime.UtcNow },
                new Wallet { Id = Guid.NewGuid(), UserId = partnerUser1Id, Balance = 0, CreatedAt = DateTime.UtcNow },
                new Wallet { Id = Guid.NewGuid(), UserId = partnerUser2Id, Balance = 0, CreatedAt = DateTime.UtcNow },
                new Wallet { Id = Guid.NewGuid(), UserId = partnerUser3Id, Balance = 0, CreatedAt = DateTime.UtcNow }
            );

            context.Partners.AddRange(
                new Partner { Id = Guid.NewGuid(), UserId = partnerUser1Id, BusinessName = "Lữ Hành Việt", VerificationStatus = PartnerVerificationStatus.Approved, IsActive = true, CreatedAt = DateTime.UtcNow },
                new Partner { Id = Guid.NewGuid(), UserId = partnerUser2Id, BusinessName = "Homestay Hương", VerificationStatus = PartnerVerificationStatus.Approved, IsActive = true, CreatedAt = DateTime.UtcNow },
                new Partner { Id = Guid.NewGuid(), UserId = partnerUser3Id, BusinessName = "Duc Anh Travel", VerificationStatus = PartnerVerificationStatus.Approved, IsActive = true, CreatedAt = DateTime.UtcNow }
            );

            context.Destinations.AddRange(
                new Destination { Id = Guid.NewGuid(), Name = "Hà Nội", Description = "Thủ đô ngàn năm văn hiến với phố cổ, ẩm thực đường phố và các di tích lịch sử nổi tiếng.", Province = "Hà Nội", ImageUrl = "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=800&h=600&fit=crop", Latitude = 21.0285, Longitude = 105.8542, IsPopular = true, CreatedAt = DateTime.UtcNow },
                new Destination { Id = Guid.NewGuid(), Name = "Đà Nẵng", Description = "Thành phố đáng sống nhất Việt Nam với bãi biển tuyệt đẹp, cầu Vàng và nhiều điểm du lịch hấp dẫn.", Province = "Đà Nẵng", ImageUrl = "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800&h=600&fit=crop", Latitude = 16.0544, Longitude = 108.2022, IsPopular = true, CreatedAt = DateTime.UtcNow },
                new Destination { Id = Guid.NewGuid(), Name = "Hội An", Description = "Phố cổ quyến rũ với đèn lồng, ẩm thực và kiến trúc cổ kính bên dòng sông Thu Bồn.", Province = "Quảng Nam", ImageUrl = "https://images.unsplash.com/photo-1536514498073-50e69d39c6cf?w=800&h=600&fit=crop", Latitude = 15.8801, Longitude = 108.3380, IsPopular = true, CreatedAt = DateTime.UtcNow },
                new Destination { Id = Guid.NewGuid(), Name = "Phú Quốc", Description = "Đảo ngọc với bãi biển trong xanh, rừng nguyên sinh và hải sản tươi ngon.", Province = "Kiên Giang", ImageUrl = "https://images.unsplash.com/photo-1573790387438-4da905039392?w=800&h=600&fit=crop", Latitude = 10.2270, Longitude = 103.9670, IsPopular = true, CreatedAt = DateTime.UtcNow },
                new Destination { Id = Guid.NewGuid(), Name = "Nha Trang", Description = "Thành phố biển xinh đẹp với vịnh biển nổi tiếng thế giới và các hoạt động giải trí sôi động.", Province = "Khánh Hòa", ImageUrl = "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&h=600&fit=crop", Latitude = 12.2388, Longitude = 109.1967, IsPopular = true, CreatedAt = DateTime.UtcNow },
                new Destination { Id = Guid.NewGuid(), Name = "Sapa", Description = "Thị trấn mù sương với ruộng bậc thang tuyệt đẹp, văn hóa dân tộc độc đáo và đỉnh Fansipan.", Province = "Lào Cai", ImageUrl = "https://images.unsplash.com/photo-1570481662006-a3a1374699e8?w=800&h=600&fit=crop", Latitude = 22.3364, Longitude = 103.8438, IsPopular = true, CreatedAt = DateTime.UtcNow },
                new Destination { Id = Guid.NewGuid(), Name = "Huế", Description = "Cố đô với hoàng thành uy nghiêm, lăng tẩm vua chúa và ẩm thực cung đình tinh tế.", Province = "Thừa Thiên Huế", ImageUrl = "https://images.unsplash.com/photo-1580974511812-0d3343085ac0?w=800&h=600&fit=crop", Latitude = 16.4637, Longitude = 107.5909, IsPopular = true, CreatedAt = DateTime.UtcNow },
                new Destination { Id = Guid.NewGuid(), Name = "Hạ Long", Description = "Vịnh Hạ Long - di sản thiên nhiên thế giới với hàng nghìn đảo đá vôi hùng vĩ.", Province = "Quảng Ninh", ImageUrl = "https://images.unsplash.com/photo-1528127269322-539801943592?w=800&h=600&fit=crop", Latitude = 20.9101, Longitude = 107.1839, IsPopular = true, CreatedAt = DateTime.UtcNow },
                new Destination { Id = Guid.NewGuid(), Name = "Đà Lạt", Description = "Thành phố ngàn hoa với khí hậu mát mẻ quanh năm, thác nước và đồi chè xanh ngát.", Province = "Lâm Đồng", ImageUrl = "https://images.unsplash.com/photo-1586862073633-eb2a7aee3547?w=800&h=600&fit=crop", Latitude = 11.9404, Longitude = 108.4583, IsPopular = true, CreatedAt = DateTime.UtcNow },
                new Destination { Id = Guid.NewGuid(), Name = "Hồ Chí Minh", Description = "Thành phố năng động nhất Việt Nam với nhịp sống sôi động, ẩm thực đa dạng và kiến trúc đặc sắc.", Province = "Hồ Chí Minh", ImageUrl = "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&h=600&fit=crop", Latitude = 10.8231, Longitude = 106.6297, IsPopular = true, CreatedAt = DateTime.UtcNow }
            );

            context.SaveChanges();

            // Idempotent partner seeding — always runs, only creates if missing
            if (!context.Partners.Any())
            {
                var partnerEmails = new[] { "tuan.le@partner.vn", "huong.pham@partner.vn", "anh.hoang@partner.vn" };
                var partnerUsers = context.Users.Where(u => partnerEmails.Contains(u.Email)).ToList();
                foreach (var user in partnerUsers)
                {
                    if (!context.Partners.Any(p => p.UserId == user.Id))
                    {
                        context.Partners.Add(new Partner
                        {
                            Id = Guid.NewGuid(),
                            UserId = user.Id,
                            BusinessName = user.FullName + " Travel",
                            VerificationStatus = PartnerVerificationStatus.Approved,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
                context.SaveChanges();
            }
        }
    }
}
