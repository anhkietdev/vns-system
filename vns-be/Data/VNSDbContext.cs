using Microsoft.EntityFrameworkCore;
using VNS.API.Models.Entities;

namespace VNS.API.Data
{
    public class VNSDbContext : DbContext
    {
        public VNSDbContext(DbContextOptions<VNSDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Partner> Partners => Set<Partner>();
        public DbSet<PartnerDocument> PartnerDocuments => Set<PartnerDocument>();
        public DbSet<PartnerPayout> PartnerPayouts => Set<PartnerPayout>();
        public DbSet<Destination> Destinations => Set<Destination>();
        public DbSet<Service> Services => Set<Service>();
        public DbSet<ServiceChangeRequest> ServiceChangeRequests => Set<ServiceChangeRequest>();
        public DbSet<ServiceImage> ServiceImages => Set<ServiceImage>();
        public DbSet<Tour> Tours => Set<Tour>();
        public DbSet<TourSchedule> TourSchedules => Set<TourSchedule>();
        public DbSet<TourScheduleRun> TourScheduleRuns => Set<TourScheduleRun>();
        public DbSet<TourSchedulePricingOverride> TourSchedulePricingOverrides => Set<TourSchedulePricingOverride>();
        public DbSet<TourItinerary> TourItineraries => Set<TourItinerary>();
        public DbSet<TourImage> TourImages => Set<TourImage>();
        public DbSet<TourPricingTier> TourPricingTiers => Set<TourPricingTier>();
        public DbSet<Homestay> Homestays => Set<Homestay>();
        public DbSet<Room> Rooms => Set<Room>();
        public DbSet<RoomImage> RoomImages => Set<RoomImage>();
        public DbSet<RoomAmenity> RoomAmenities => Set<RoomAmenity>();
        public DbSet<RoomAvailability> RoomAvailabilities => Set<RoomAvailability>();
        public DbSet<VietnamPublicHoliday> VietnamPublicHolidays => Set<VietnamPublicHoliday>();
        public DbSet<HomestayAmenity> HomestayAmenities => Set<HomestayAmenity>();
        public DbSet<Booking> Bookings => Set<Booking>();
        public DbSet<BookingComponent> BookingComponents => Set<BookingComponent>();
        public DbSet<BookingDetail> BookingDetails => Set<BookingDetail>();
        public DbSet<InventoryReservation> InventoryReservations => Set<InventoryReservation>();
        public DbSet<Payment> Payments => Set<Payment>();
        public DbSet<PaymentOrder> PaymentOrders => Set<PaymentOrder>();
        public DbSet<PaymentAttempt> PaymentAttempts => Set<PaymentAttempt>();
        public DbSet<Wallet> Wallets => Set<Wallet>();
        public DbSet<WalletTransaction> WalletTransactions => Set<WalletTransaction>();
        public DbSet<Review> Reviews => Set<Review>();
        public DbSet<ReviewImage> ReviewImages => Set<ReviewImage>();
        public DbSet<Voucher> Vouchers => Set<Voucher>();
        public DbSet<VoucherUsage> VoucherUsages => Set<VoucherUsage>();
        public DbSet<Favorite> Favorites => Set<Favorite>();
        public DbSet<ChatConversation> ChatConversations => Set<ChatConversation>();
        public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
        public DbSet<Notification> Notifications => Set<Notification>();
        public DbSet<RefundRequest> RefundRequests => Set<RefundRequest>();
        public DbSet<RefundCase> RefundCases => Set<RefundCase>();
        public DbSet<RefundExecution> RefundExecutions => Set<RefundExecution>();
        public DbSet<SettlementEntry> SettlementEntries => Set<SettlementEntry>();
        public DbSet<Combo> Combos => Set<Combo>();
        public DbSet<ComboItem> ComboItems => Set<ComboItem>();
        public DbSet<ComboBookingItem> ComboBookingItems => Set<ComboBookingItem>();
        public DbSet<ComboBookingQuote> ComboBookingQuotes => Set<ComboBookingQuote>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Combo
            modelBuilder.Entity<Combo>(e => {
                e.Property(c => c.OriginalPrice).HasColumnType("decimal(18,2)");
                e.Property(c => c.ComboPrice).HasColumnType("decimal(18,2)");
                e.Property(c => c.DiscountValue).HasColumnType("decimal(18,2)");
            });
            modelBuilder.Entity<ComboItem>(e => {
                e.HasOne(ci => ci.Service).WithMany().HasForeignKey(ci => ci.ServiceId).OnDelete(DeleteBehavior.NoAction);
            });
            modelBuilder.Entity<ComboBookingQuote>(e => {
                e.Property(item => item.OriginalAmount).HasColumnType("decimal(18,2)");
                e.Property(item => item.ComboDiscountAmount).HasColumnType("decimal(18,2)");
                e.Property(item => item.FinalAmount).HasColumnType("decimal(18,2)");
                e.HasOne(item => item.Combo).WithMany().HasForeignKey(item => item.ComboId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne(item => item.User).WithMany().HasForeignKey(item => item.UserId).OnDelete(DeleteBehavior.Restrict);
                e.HasIndex(item => new { item.UserId, item.ExpiresAt });
            });
            modelBuilder.Entity<ComboBookingItem>(e => {
                e.Property(cbi => cbi.UnitPrice).HasColumnType("decimal(18,2)");
                e.Property(cbi => cbi.SubTotal).HasColumnType("decimal(18,2)");
                e.HasOne(cbi => cbi.Booking).WithMany(b => b.ComboBookingItems).HasForeignKey(cbi => cbi.BookingId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne(cbi => cbi.Combo).WithMany(c => c.ComboBookingItems).HasForeignKey(cbi => cbi.ComboId).OnDelete(DeleteBehavior.NoAction);
                e.HasOne(cbi => cbi.ComboItem).WithMany(ci => ci.ComboBookingItems).HasForeignKey(cbi => cbi.ComboItemId).OnDelete(DeleteBehavior.NoAction);
                e.HasOne(cbi => cbi.Service).WithMany().HasForeignKey(cbi => cbi.ServiceId).OnDelete(DeleteBehavior.NoAction);
                e.HasOne(cbi => cbi.Room).WithMany().HasForeignKey(cbi => cbi.RoomId).OnDelete(DeleteBehavior.NoAction);
                e.HasOne(cbi => cbi.TourSchedule).WithMany().HasForeignKey(cbi => cbi.TourScheduleId).OnDelete(DeleteBehavior.NoAction);
                e.HasOne(cbi => cbi.TourPricingTier).WithMany().HasForeignKey(cbi => cbi.TourPricingTierId).OnDelete(DeleteBehavior.NoAction);
            });
            modelBuilder.Entity<TourSchedulePricingOverride>(e => {
                e.Property(item => item.CustomPrice).HasColumnType("decimal(18,2)");
                e.HasIndex(item => new { item.TourScheduleId, item.TourPricingTierId }).IsUnique();
                e.HasOne(item => item.TourSchedule)
                    .WithMany(schedule => schedule.PricingOverrides)
                    .HasForeignKey(item => item.TourScheduleId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasOne(item => item.TourPricingTier)
                    .WithMany(tier => tier.SchedulePricingOverrides)
                    .HasForeignKey(item => item.TourPricingTierId)
                    .OnDelete(DeleteBehavior.NoAction);
            });
            modelBuilder.Entity<TourScheduleRun>(e => {
                e.HasIndex(item => new { item.TourScheduleId, item.RunIndex }).IsUnique();
                e.HasOne(item => item.TourSchedule)
                    .WithMany(schedule => schedule.ScheduleRuns)
                    .HasForeignKey(item => item.TourScheduleId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
            modelBuilder.Entity<Booking>(e => {
                e.HasOne(b => b.Combo).WithMany().HasForeignKey(b => b.ComboId).OnDelete(DeleteBehavior.NoAction);
                e.HasIndex(b => new { b.UserId, b.IdempotencyKey })
                    .IsUnique()
                    .HasFilter("[IdempotencyKey] IS NOT NULL");
            });
            modelBuilder.Entity<BookingComponent>(e => {
                e.Property(item => item.UnitPrice).HasColumnType("decimal(18,2)");
                e.Property(item => item.SubTotal).HasColumnType("decimal(18,2)");
                e.HasOne(item => item.Booking)
                    .WithMany(booking => booking.BookingComponents)
                    .HasForeignKey(item => item.BookingId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasOne(item => item.Service)
                    .WithMany()
                    .HasForeignKey(item => item.ServiceId)
                    .OnDelete(DeleteBehavior.NoAction);
                e.HasOne(item => item.ComboItem)
                    .WithMany()
                    .HasForeignKey(item => item.ComboItemId)
                    .OnDelete(DeleteBehavior.NoAction);
            });
            modelBuilder.Entity<InventoryReservation>(e => {
                e.HasOne(item => item.Booking)
                    .WithMany(booking => booking.InventoryReservations)
                    .HasForeignKey(item => item.BookingId)
                    .OnDelete(DeleteBehavior.NoAction);
                e.HasOne(item => item.BookingComponent)
                    .WithMany(component => component.InventoryReservations)
                    .HasForeignKey(item => item.BookingComponentId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasIndex(item => new { item.BookingId, item.Status });
            });
            modelBuilder.Entity<PaymentOrder>(e => {
                e.Property(item => item.Amount).HasColumnType("decimal(18,2)");
                e.HasOne(item => item.Booking)
                    .WithOne(booking => booking.PaymentOrder)
                    .HasForeignKey<PaymentOrder>(item => item.BookingId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
            modelBuilder.Entity<PaymentAttempt>(e => {
                e.Property(item => item.Amount).HasColumnType("decimal(18,2)");
                e.Property(item => item.WalletAmount).HasColumnType("decimal(18,2)");
                e.Property(item => item.VnPayAmount).HasColumnType("decimal(18,2)");
                e.HasOne(item => item.PaymentOrder)
                    .WithMany(order => order.Attempts)
                    .HasForeignKey(item => item.PaymentOrderId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasIndex(item => new { item.PaymentOrderId, item.CreatedAt });
            });
            modelBuilder.Entity<RefundCase>(e => {
                e.Property(item => item.RequestedAmount).HasColumnType("decimal(18,2)");
                e.Property(item => item.ApprovedAmount).HasColumnType("decimal(18,2)");
                e.HasOne(item => item.Booking)
                    .WithMany(booking => booking.RefundCases)
                    .HasForeignKey(item => item.BookingId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasOne(item => item.User)
                    .WithMany()
                    .HasForeignKey(item => item.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
            modelBuilder.Entity<RefundExecution>(e => {
                e.Property(item => item.Amount).HasColumnType("decimal(18,2)");
                e.HasOne(item => item.RefundCase)
                    .WithMany(refundCase => refundCase.Executions)
                    .HasForeignKey(item => item.RefundCaseId)
                    .OnDelete(DeleteBehavior.Cascade);
            });
            modelBuilder.Entity<SettlementEntry>(e => {
                e.Property(item => item.GrossAmount).HasColumnType("decimal(18,2)");
                e.Property(item => item.PartnerDelta).HasColumnType("decimal(18,2)");
                e.Property(item => item.PlatformDelta).HasColumnType("decimal(18,2)");
                e.HasOne(item => item.Booking)
                    .WithMany(booking => booking.SettlementEntries)
                    .HasForeignKey(item => item.BookingId)
                    .OnDelete(DeleteBehavior.Restrict);
                e.HasOne(item => item.PaymentOrder)
                    .WithMany()
                    .HasForeignKey(item => item.PaymentOrderId)
                    .OnDelete(DeleteBehavior.Restrict);
                e.HasOne(item => item.RefundCase)
                    .WithMany()
                    .HasForeignKey(item => item.RefundCaseId)
                    .OnDelete(DeleteBehavior.Restrict);
                e.HasOne(item => item.PartnerPayout)
                    .WithMany()
                    .HasForeignKey(item => item.PartnerPayoutId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Unique constraints
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<Booking>()
                .HasIndex(b => b.BookingCode)
                .IsUnique();

            modelBuilder.Entity<Voucher>()
                .HasIndex(v => v.Code)
                .IsUnique();

            modelBuilder.Entity<VietnamPublicHoliday>()
                .HasIndex(h => h.Date)
                .IsUnique();

            modelBuilder.Entity<Wallet>()
                .HasIndex(w => w.UserId)
                .IsUnique();

            // One-to-one: User <-> Wallet
            modelBuilder.Entity<User>()
                .HasOne(u => u.Wallet)
                .WithOne(w => w.User)
                .HasForeignKey<Wallet>(w => w.UserId);

            // One-to-one: User <-> Partner
            modelBuilder.Entity<User>()
                .HasOne(u => u.Partner)
                .WithOne(p => p.User)
                .HasForeignKey<Partner>(p => p.UserId);

            // One-to-one: Service <-> Homestay
            modelBuilder.Entity<Service>()
                .HasOne(s => s.Homestay)
                .WithOne(h => h.Service)
                .HasForeignKey<Homestay>(h => h.ServiceId);

            modelBuilder.Entity<ServiceChangeRequest>()
                .HasOne(cr => cr.Service)
                .WithMany(s => s.ChangeRequests)
                .HasForeignKey(cr => cr.ServiceId)
                .OnDelete(DeleteBehavior.Cascade);

            // One-to-one: Booking <-> Payment
            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Payment)
                .WithOne(p => p.Booking)
                .HasForeignKey<Payment>(p => p.BookingId);

            // One-to-one: Booking <-> Review
            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Review)
                .WithOne(r => r.Booking)
                .HasForeignKey<Review>(r => r.BookingId);

            // One-to-one: Booking <-> RefundRequest
            modelBuilder.Entity<Booking>()
                .HasOne(b => b.RefundRequest)
                .WithOne(r => r.Booking)
                .HasForeignKey<RefundRequest>(r => r.BookingId);

            // Favorite unique constraint
            modelBuilder.Entity<Favorite>()
                .HasIndex(f => new { f.UserId, f.ServiceId })
                .IsUnique();

            // Disable cascade delete for Favorite to avoid cycles
            modelBuilder.Entity<Favorite>()
                .HasOne(f => f.User)
                .WithMany(u => u.Favorites)
                .HasForeignKey(f => f.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Favorite>()
                .HasOne(f => f.Service)
                .WithMany(s => s.Favorites)
                .HasForeignKey(f => f.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            // ChatConversation unique per user-partner
            modelBuilder.Entity<ChatConversation>()
                .HasIndex(c => new { c.UserId, c.PartnerId })
                .IsUnique();

            // Disable cascade delete for Booking to avoid cycles
            modelBuilder.Entity<Booking>()
                .HasOne(b => b.User)
                .WithMany(u => u.Bookings)
                .HasForeignKey(b => b.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Partner)
                .WithMany(p => p.Bookings)
                .HasForeignKey(b => b.PartnerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Service)
                .WithMany(s => s.Bookings)
                .HasForeignKey(b => b.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<BookingDetail>()
                .HasOne(bd => bd.TourScheduleRun)
                .WithMany(run => run.BookingDetails)
                .HasForeignKey(bd => bd.TourScheduleRunId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<ComboBookingItem>()
                .HasOne(cbi => cbi.TourScheduleRun)
                .WithMany(run => run.ComboBookingItems)
                .HasForeignKey(cbi => cbi.TourScheduleRunId)
                .OnDelete(DeleteBehavior.NoAction);

            modelBuilder.Entity<Booking>()
                .HasOne(b => b.Voucher)
                .WithMany(v => v.Bookings)
                .HasForeignKey(b => b.VoucherId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Review>()
                .HasOne(r => r.User)
                .WithMany(u => u.Reviews)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Review>()
                .HasOne(r => r.Service)
                .WithMany(s => s.Reviews)
                .HasForeignKey(r => r.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(m => m.Sender)
                .WithMany(u => u.SentMessages)
                .HasForeignKey(m => m.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<RefundRequest>()
                .HasOne(r => r.User)
                .WithMany(u => u.RefundRequests)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<VoucherUsage>()
                .HasOne(vu => vu.User)
                .WithMany(u => u.VoucherUsages)
                .HasForeignKey(vu => vu.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<VoucherUsage>()
                .HasOne(vu => vu.Booking)
                .WithMany(b => b.VoucherUsages)
                .HasForeignKey(vu => vu.BookingId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<WalletTransaction>()
                .HasOne(wt => wt.Booking)
                .WithMany(b => b.WalletTransactions)
                .HasForeignKey(wt => wt.BookingId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Notification>()
                .HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ChatConversation>()
                .HasOne(c => c.User)
                .WithMany(u => u.ChatConversations)
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ChatConversation>()
                .HasOne(c => c.Partner)
                .WithMany(p => p.ChatConversations)
                .HasForeignKey(c => c.PartnerId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
