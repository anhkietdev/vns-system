using Microsoft.EntityFrameworkCore;
using VNS.API.Data;
using VNS.API.Models.Entities;
using VNS.API.Models.Enums;
using VNS.API.Services.Interfaces;

namespace VNS.API.Services.Implementations
{
    public class CommerceService : ICommerceService
    {
        private readonly VNSDbContext _context;

        public CommerceService(VNSDbContext context)
        {
            _context = context;
        }

        public async Task EnsureBookingArtifactsAsync(Booking booking, Service primaryService)
        {
            if (!await _context.BookingComponents.AnyAsync(item => item.BookingId == booking.Id))
            {
                if (booking.ComboBookingItems.Any())
                {
                    foreach (var item in booking.ComboBookingItems)
                    {
                        _context.BookingComponents.Add(new BookingComponent
                        {
                            Id = Guid.NewGuid(),
                            BookingId = booking.Id,
                            ServiceId = item.ServiceId,
                            ComboItemId = item.ComboItemId,
                            ComponentType = BookingComponentType.ComboItem,
                            ServiceType = item.Service.ServiceType,
                            ServiceNameSnapshot = item.Service.Name,
                            RoomId = item.RoomId,
                            TourScheduleId = item.TourScheduleId,
                            TourScheduleRunId = item.TourScheduleRunId,
                            TourPricingTierId = item.TourPricingTierId,
                            CheckInDate = item.CheckInDate,
                            CheckOutDate = item.CheckOutDate,
                            StartDate = item.StartDate,
                            EndDate = item.EndDate,
                            Quantity = item.Quantity,
                            UnitPrice = item.UnitPrice,
                            SubTotal = item.SubTotal,
                            CancellationPolicyTypeSnapshot = item.Service.CancellationPolicyType,
                            CancellationPolicyDescriptionSnapshot = item.Service.CancellationPolicyDescription,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
                else if (booking.BookingDetails.Any())
                {
                    foreach (var detail in booking.BookingDetails)
                    {
                        _context.BookingComponents.Add(new BookingComponent
                        {
                            Id = Guid.NewGuid(),
                            BookingId = booking.Id,
                            ServiceId = booking.ServiceId,
                            ComponentType = BookingComponentType.Primary,
                            ServiceType = primaryService.ServiceType,
                            ServiceNameSnapshot = primaryService.Name,
                            RoomId = detail.RoomId,
                            TourScheduleId = detail.TourScheduleId,
                            TourScheduleRunId = detail.TourScheduleRunId,
                            TourPricingTierId = detail.TourPricingTierId,
                            CheckInDate = booking.CheckInDate,
                            CheckOutDate = booking.CheckOutDate,
                            StartDate = detail.TourSchedule?.StartDate ?? booking.CheckInDate,
                            EndDate = detail.TourSchedule?.EndDate ?? booking.CheckOutDate,
                            Quantity = detail.Quantity,
                            UnitPrice = detail.UnitPrice,
                            SubTotal = detail.SubTotal,
                            CancellationPolicyTypeSnapshot = primaryService.CancellationPolicyType,
                            CancellationPolicyDescriptionSnapshot = primaryService.CancellationPolicyDescription,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
                else
                {
                    _context.BookingComponents.Add(new BookingComponent
                    {
                        Id = Guid.NewGuid(),
                        BookingId = booking.Id,
                        ServiceId = booking.ServiceId,
                        ComponentType = BookingComponentType.Primary,
                        ServiceType = primaryService.ServiceType,
                        ServiceNameSnapshot = primaryService.Name,
                        CheckInDate = booking.CheckInDate,
                        CheckOutDate = booking.CheckOutDate,
                        StartDate = booking.CheckInDate,
                        EndDate = booking.CheckOutDate,
                        Quantity = Math.Max(1, booking.NumberOfGuests),
                        UnitPrice = booking.TotalAmount,
                        SubTotal = booking.TotalAmount,
                        CancellationPolicyTypeSnapshot = primaryService.CancellationPolicyType,
                        CancellationPolicyDescriptionSnapshot = primaryService.CancellationPolicyDescription,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            await _context.SaveChangesAsync();
            await EnsureBookingArtifactsAsync(booking);
        }

        public async Task EnsureBookingArtifactsAsync(Booking booking)
        {
            booking.Status = GetLegacyBookingStatus(booking);

            if (booking.Payment != null)
                booking.Payment.PaymentStatus = MapLegacyPaymentStatus(booking.CommercialStatus, booking.Payment.PaymentStatus);

            var components = await _context.BookingComponents
                .Where(item => item.BookingId == booking.Id)
                .ToListAsync();

            if (components.Any() && !await _context.InventoryReservations.AnyAsync(item => item.BookingId == booking.Id))
            {
                foreach (var component in components)
                {
                    if (component.RoomId.HasValue)
                    {
                        _context.InventoryReservations.Add(new InventoryReservation
                        {
                            Id = Guid.NewGuid(),
                            BookingId = booking.Id,
                            BookingComponentId = component.Id,
                            ReservationType = InventoryReservationType.Room,
                            Status = InventoryReservationStatus.Active,
                            RoomId = component.RoomId,
                            CheckInDate = component.CheckInDate,
                            CheckOutDate = component.CheckOutDate,
                            StartDate = component.StartDate,
                            EndDate = component.EndDate,
                            Quantity = component.Quantity,
                            ReservedAt = DateTime.UtcNow
                        });
                    }

                    if (component.TourScheduleId.HasValue)
                    {
                        _context.InventoryReservations.Add(new InventoryReservation
                        {
                            Id = Guid.NewGuid(),
                            BookingId = booking.Id,
                            BookingComponentId = component.Id,
                            ReservationType = InventoryReservationType.TourSchedule,
                            Status = InventoryReservationStatus.Active,
                            TourScheduleId = component.TourScheduleId,
                            TourScheduleRunId = component.TourScheduleRunId,
                            StartDate = component.StartDate,
                            EndDate = component.EndDate,
                            Quantity = component.Quantity,
                            ReservedAt = DateTime.UtcNow
                        });
                    }
                }

                await _context.SaveChangesAsync();
            }

            await EnsurePaymentOrderAsync(booking);
        }

        public async Task<PaymentOrder> EnsurePaymentOrderAsync(Booking booking)
        {
            var paymentOrder = await _context.PaymentOrders
                .Include(item => item.Attempts)
                .FirstOrDefaultAsync(item => item.BookingId == booking.Id);

            if (paymentOrder != null)
                return paymentOrder;

            paymentOrder = new PaymentOrder
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                Amount = booking.FinalAmount,
                Status = MapPaymentOrderStatus(booking.CommercialStatus),
                PaidAt = booking.Payment?.PaidAt,
                CreatedAt = booking.CreatedAt,
                UpdatedAt = booking.UpdatedAt
            };

            _context.PaymentOrders.Add(paymentOrder);
            await _context.SaveChangesAsync();
            return paymentOrder;
        }

        public async Task<PaymentAttempt> CreatePaymentAttemptAsync(
            Booking booking,
            PaymentMethod paymentMethod,
            decimal amount,
            decimal walletAmount,
            decimal vnPayAmount,
            string? idempotencyToken = null)
        {
            var paymentOrder = await EnsurePaymentOrderAsync(booking);
            var attempt = new PaymentAttempt
            {
                Id = Guid.NewGuid(),
                PaymentOrderId = paymentOrder.Id,
                PaymentMethod = paymentMethod,
                Amount = amount,
                WalletAmount = walletAmount,
                VnPayAmount = vnPayAmount,
                Status = PaymentAttemptStatus.Pending,
                IdempotencyToken = idempotencyToken,
                CreatedAt = DateTime.UtcNow
            };

            _context.PaymentAttempts.Add(attempt);
            paymentOrder.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return attempt;
        }

        public async Task CompletePaymentAsync(
            Booking booking,
            PaymentAttempt attempt,
            PaymentStatus legacyPaymentStatus,
            string? externalTransactionId,
            string? gatewayResponseCode,
            string? callbackPayload = null)
        {
            var paymentOrder = await EnsurePaymentOrderAsync(booking);

            attempt.Status = PaymentAttemptStatus.Completed;
            attempt.ExternalTransactionId = externalTransactionId;
            attempt.GatewayResponseCode = gatewayResponseCode;
            attempt.CallbackPayload = callbackPayload;
            attempt.CompletedAt = DateTime.UtcNow;

            paymentOrder.Status = PaymentOrderStatus.Paid;
            paymentOrder.PaidAt = DateTime.UtcNow;
            paymentOrder.UpdatedAt = DateTime.UtcNow;

            booking.CommercialStatus = BookingCommercialStatus.Paid;
            if (booking.FulfillmentStatus == BookingFulfillmentStatus.Cancelled && booking.CancelledAt == null)
                booking.FulfillmentStatus = BookingFulfillmentStatus.AwaitingPartner;

            booking.UpdatedAt = DateTime.UtcNow;
            booking.ExpiresAt = null;
            booking.Status = GetLegacyBookingStatus(booking);

            if (booking.Payment != null)
            {
                booking.Payment.PaymentStatus = legacyPaymentStatus;
                booking.Payment.PaidAt = DateTime.UtcNow;
            }

            if (!await _context.SettlementEntries.AnyAsync(item =>
                    item.BookingId == booking.Id &&
                    item.EntryType == SettlementEntryType.PaymentCaptured))
            {
                _context.SettlementEntries.Add(new SettlementEntry
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    PartnerId = booking.PartnerId,
                    PaymentOrderId = paymentOrder.Id,
                    EntryType = SettlementEntryType.PaymentCaptured,
                    GrossAmount = booking.FinalAmount,
                    PartnerDelta = 0,
                    PlatformDelta = 0,
                    Description = $"Captured payment for booking #{booking.BookingCode}",
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
        }

        public async Task<bool> ReleasePartnerReceivableAsync(Booking booking)
        {
            if (booking.CommercialStatus != BookingCommercialStatus.Paid
                || booking.FulfillmentStatus != BookingFulfillmentStatus.Completed)
            {
                return false;
            }

            var paymentOrder = await EnsurePaymentOrderAsync(booking);
            var hasReleaseEntry = await _context.SettlementEntries.AnyAsync(item =>
                item.BookingId == booking.Id &&
                item.EntryType == SettlementEntryType.PartnerReceivableReleased);

            if (hasReleaseEntry)
                return false;

            var commissionRate = await _context.Partners
                .Where(item => item.Id == booking.PartnerId)
                .Select(item => item.CommissionRate)
                .FirstOrDefaultAsync();
            var commissionAmount = Math.Round(booking.FinalAmount * commissionRate / 100m, 2, MidpointRounding.AwayFromZero);
            var partnerNetAmount = booking.FinalAmount - commissionAmount;

            _context.SettlementEntries.Add(new SettlementEntry
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                PartnerId = booking.PartnerId,
                PaymentOrderId = paymentOrder.Id,
                EntryType = SettlementEntryType.PartnerReceivableReleased,
                GrossAmount = booking.FinalAmount,
                PartnerDelta = partnerNetAmount,
                PlatformDelta = commissionAmount,
                Description = $"Released partner receivable for booking #{booking.BookingCode}",
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task FailPaymentAsync(
            Booking booking,
            PaymentAttempt attempt,
            string? failureReason,
            string? gatewayResponseCode = null,
            string? callbackPayload = null)
        {
            var paymentOrder = await EnsurePaymentOrderAsync(booking);

            attempt.Status = PaymentAttemptStatus.Failed;
            attempt.FailureReason = failureReason;
            attempt.GatewayResponseCode = gatewayResponseCode;
            attempt.CallbackPayload = callbackPayload;
            attempt.CompletedAt = DateTime.UtcNow;

            paymentOrder.UpdatedAt = DateTime.UtcNow;
            booking.UpdatedAt = DateTime.UtcNow;

            if (booking.Payment != null)
                booking.Payment.PaymentStatus = PaymentStatus.Failed;

            booking.Status = GetLegacyBookingStatus(booking);
            await _context.SaveChangesAsync();
        }

        public async Task ExpireBookingAsync(Booking booking)
        {
            booking.CommercialStatus = BookingCommercialStatus.Expired;
            booking.FulfillmentStatus = BookingFulfillmentStatus.Cancelled;
            booking.UpdatedAt = DateTime.UtcNow;
            booking.Status = BookingStatus.Expired;

            if (booking.Payment != null)
                booking.Payment.PaymentStatus = PaymentStatus.Failed;

            var paymentOrder = await EnsurePaymentOrderAsync(booking);
            paymentOrder.Status = PaymentOrderStatus.Expired;
            paymentOrder.UpdatedAt = DateTime.UtcNow;

            foreach (var attempt in await _context.PaymentAttempts
                         .Where(item => item.PaymentOrderId == paymentOrder.Id && item.Status == PaymentAttemptStatus.Pending)
                         .ToListAsync())
            {
                attempt.Status = PaymentAttemptStatus.Expired;
                attempt.CompletedAt = DateTime.UtcNow;
                attempt.FailureReason = "Booking expired before payment completion.";
            }

            await ReleaseReservationsAsync(booking.Id, InventoryReservationStatus.Expired);
            await _context.SaveChangesAsync();
        }

        public async Task ReleaseReservationsAsync(Guid bookingId, InventoryReservationStatus status)
        {
            var reservations = await _context.InventoryReservations
                .Where(item => item.BookingId == bookingId && item.Status == InventoryReservationStatus.Active)
                .ToListAsync();

            foreach (var reservation in reservations)
            {
                reservation.Status = status;
                reservation.ReleasedAt = DateTime.UtcNow;
            }

            if (reservations.Any())
                await _context.SaveChangesAsync();
        }

        public async Task EnsureRefundCaseAsync(RefundRequest refundRequest, Booking booking)
        {
            var refundCase = await _context.RefundCases.FirstOrDefaultAsync(item => item.Id == refundRequest.RefundCaseId);
            if (refundCase != null)
                return;

            refundCase = new RefundCase
            {
                Id = Guid.NewGuid(),
                BookingId = refundRequest.BookingId,
                UserId = refundRequest.UserId,
                Reason = refundRequest.Reason,
                RequestedAmount = refundRequest.RefundAmount,
                Status = MapRefundCaseStatus(refundRequest.Status),
                CreatedAt = refundRequest.CreatedAt,
                DecisionNote = refundRequest.AdminNote,
                DecidedAt = refundRequest.ProcessedAt,
                DecidedBy = refundRequest.ProcessedBy
            };

            refundRequest.RefundCaseId = refundCase.Id;
            _context.RefundCases.Add(refundCase);
            booking.CommercialStatus = BookingCommercialStatus.RefundPending;
            booking.Status = GetLegacyBookingStatus(booking);
            await _context.SaveChangesAsync();
        }

        public async Task CompleteRefundAsync(Booking booking, RefundRequest refundRequest, decimal amount, Guid? partnerId)
        {
            var refundCase = await _context.RefundCases.FirstOrDefaultAsync(item => item.Id == refundRequest.RefundCaseId);
            if (refundCase == null)
            {
                await EnsureRefundCaseAsync(refundRequest, booking);
                refundCase = await _context.RefundCases.FirstAsync(item => item.Id == refundRequest.RefundCaseId);
            }

            refundCase.Status = RefundCaseStatus.Processed;
            refundCase.ApprovedAmount = amount;
            refundCase.DecidedAt = DateTime.UtcNow;

            if (!await _context.RefundExecutions.AnyAsync(item => item.RefundCaseId == refundCase.Id && item.Status == RefundExecutionStatus.Completed))
            {
                _context.RefundExecutions.Add(new RefundExecution
                {
                    Id = Guid.NewGuid(),
                    RefundCaseId = refundCase.Id,
                    Destination = RefundDestination.Wallet,
                    Amount = amount,
                    Status = RefundExecutionStatus.Completed,
                    ProcessedAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                });
            }

            booking.CommercialStatus = BookingCommercialStatus.Refunded;
            booking.FulfillmentStatus = BookingFulfillmentStatus.Cancelled;
            booking.UpdatedAt = DateTime.UtcNow;
            booking.Status = GetLegacyBookingStatus(booking);

            var paymentOrder = await EnsurePaymentOrderAsync(booking);
            paymentOrder.Status = PaymentOrderStatus.Refunded;
            paymentOrder.UpdatedAt = DateTime.UtcNow;

            if (booking.Payment != null)
                booking.Payment.PaymentStatus = PaymentStatus.Refunded;

            var refundProportion = booking.FinalAmount <= 0
                ? 0
                : Math.Min(1m, Math.Round(amount / booking.FinalAmount, 8, MidpointRounding.AwayFromZero));

            var releasedCommission = await _context.SettlementEntries
                .Where(item => item.BookingId == booking.Id && item.EntryType == SettlementEntryType.PartnerReceivableReleased)
                .SumAsync(item => (decimal?)item.PlatformDelta) ?? 0;
            var releasedPartnerAmount = await _context.SettlementEntries
                .Where(item => item.BookingId == booking.Id && item.EntryType == SettlementEntryType.PartnerReceivableReleased)
                .SumAsync(item => (decimal?)item.PartnerDelta) ?? 0;

            var commissionReversal = Math.Round(releasedCommission * refundProportion, 2, MidpointRounding.AwayFromZero);
            var partnerReversal = releasedPartnerAmount > 0
                ? Math.Round(releasedPartnerAmount * refundProportion, 2, MidpointRounding.AwayFromZero)
                : 0;

            _context.SettlementEntries.Add(new SettlementEntry
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                PartnerId = partnerId ?? booking.PartnerId,
                PaymentOrderId = paymentOrder.Id,
                RefundCaseId = refundCase.Id,
                EntryType = SettlementEntryType.RefundProcessed,
                GrossAmount = amount,
                PartnerDelta = -partnerReversal,
                PlatformDelta = -commissionReversal,
                Description = $"Refund processed for booking #{booking.BookingCode}",
                CreatedAt = DateTime.UtcNow
            });

            await ReleaseReservationsAsync(booking.Id, InventoryReservationStatus.Released);
            await _context.SaveChangesAsync();
        }

        public async Task AddPayoutSettlementAsync(PartnerPayout payout)
        {
            if (await _context.SettlementEntries.AnyAsync(item =>
                    item.PartnerPayoutId == payout.Id &&
                    item.EntryType == SettlementEntryType.PayoutCompleted))
                return;

            _context.SettlementEntries.Add(new SettlementEntry
            {
                Id = Guid.NewGuid(),
                PartnerId = payout.PartnerId,
                PartnerPayoutId = payout.Id,
                EntryType = SettlementEntryType.PayoutCompleted,
                GrossAmount = payout.NetAmount,
                PartnerDelta = -payout.NetAmount,
                PlatformDelta = 0,
                Description = $"Partner payout {payout.Id}",
                CreatedAt = payout.PaidAt ?? DateTime.UtcNow
            });

            await _context.SaveChangesAsync();
        }

        public BookingStatus GetLegacyBookingStatus(Booking booking)
        {
            if (booking.CommercialStatus == BookingCommercialStatus.Expired)
                return BookingStatus.Expired;

            if (booking.CommercialStatus == BookingCommercialStatus.RefundPending)
                return BookingStatus.RefundPending;

            if (booking.CommercialStatus == BookingCommercialStatus.Refunded)
                return BookingStatus.Refunded;

            if (booking.CommercialStatus == BookingCommercialStatus.Forfeited)
                return BookingStatus.Cancelled;

            return booking.FulfillmentStatus switch
            {
                BookingFulfillmentStatus.AwaitingPartner => BookingStatus.Pending,
                BookingFulfillmentStatus.Confirmed => BookingStatus.Confirmed,
                BookingFulfillmentStatus.Completed => BookingStatus.Completed,
                BookingFulfillmentStatus.Cancelled => BookingStatus.Cancelled,
                BookingFulfillmentStatus.NoShow => BookingStatus.NoShow,
                _ => BookingStatus.Pending
            };
        }

        public bool CanPay(Booking booking)
        {
            return booking.CommercialStatus == BookingCommercialStatus.PendingPayment
                && booking.FulfillmentStatus == BookingFulfillmentStatus.AwaitingPartner
                && booking.Status == BookingStatus.Pending;
        }

        public bool CanCancel(Booking booking)
        {
            if (booking.FulfillmentStatus != BookingFulfillmentStatus.AwaitingPartner
                && booking.FulfillmentStatus != BookingFulfillmentStatus.Confirmed)
                return false;

            if (booking.CheckInDate.HasValue && booking.CheckInDate.Value.Date <= DateTime.UtcNow.Date)
                return false;

            return true;
        }

        public bool CanRefund(Booking booking)
        {
            return booking.CommercialStatus == BookingCommercialStatus.Paid
                && booking.FulfillmentStatus != BookingFulfillmentStatus.Completed
                && booking.FulfillmentStatus != BookingFulfillmentStatus.Cancelled
                && booking.RefundRequest == null;
        }

        private static PaymentOrderStatus MapPaymentOrderStatus(BookingCommercialStatus status)
        {
            return status switch
            {
                BookingCommercialStatus.Paid => PaymentOrderStatus.Paid,
                BookingCommercialStatus.RefundPending => PaymentOrderStatus.Paid,
                BookingCommercialStatus.Refunded => PaymentOrderStatus.Refunded,
                BookingCommercialStatus.Forfeited => PaymentOrderStatus.Paid,
                BookingCommercialStatus.Expired => PaymentOrderStatus.Expired,
                _ => PaymentOrderStatus.Pending
            };
        }

        private static PaymentStatus MapLegacyPaymentStatus(BookingCommercialStatus status, PaymentStatus current)
        {
            return status switch
            {
                BookingCommercialStatus.Paid => PaymentStatus.Completed,
                BookingCommercialStatus.Refunded => PaymentStatus.Refunded,
                BookingCommercialStatus.Forfeited => current,
                BookingCommercialStatus.Expired => PaymentStatus.Failed,
                _ => current
            };
        }

        private static RefundCaseStatus MapRefundCaseStatus(RefundStatus status)
        {
            return status switch
            {
                RefundStatus.Processed => RefundCaseStatus.Processed,
                _ => RefundCaseStatus.Pending
            };
        }
    }
}
