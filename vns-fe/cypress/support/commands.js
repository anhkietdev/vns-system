// --- Fake JWT token generator ---
// Creates a valid-looking JWT with the given role embedded
function fakeJwt(role) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      sub: "test-user-id-123",
      email: "test@vns.com",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": role,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  );
  const signature = btoa("fake-signature");
  return `${header}.${payload}.${signature}`;
}

// --- Login command ---
Cypress.Commands.add("loginAs", (role) => {
  const token = fakeJwt(role);
  const userData = {
    token,
    role,
    user: {
      userId: "test-user-id-123",
      id: "test-user-id-123",
      partnerId: "test-partner-id-123",
      email: "test@vns.com",
      fullName: `Test ${role}`,
      businessName: "VNS Test Business",
      isVerified: true,
    },
  };
  localStorage.setItem("vns_token", token);
  localStorage.setItem("vns_user", JSON.stringify(userData));
});

// --- Mock all Partner APIs ---
Cypress.Commands.add("mockPartnerAPIs", () => {
  // Profile
  cy.intercept("GET", "**/api/PartnerProfile", {
    statusCode: 200,
    body: { success: true, data: { businessName: "VNS Test Business", fullName: "Test Partner", isVerified: true } },
  }).as("getProfile");

  cy.intercept("GET", "**/api/PartnerProfile/documents", {
    statusCode: 200,
    body: { success: true, data: [] },
  }).as("getDocuments");

  // Dashboard
  cy.intercept("GET", "**/api/PartnerFinance/dashboard", {
    statusCode: 200,
    body: {
      success: true,
      data: {
        totalServices: 5, activeServices: 3, totalBookings: 12, pendingBookings: 2,
        confirmedBookings: 5, completedBookings: 4, cancelledBookings: 1,
        totalRevenue: 15000000, revenueGrowth: 12, averageRating: 4.5, totalReviews: 8,
        totalEarnings: 15000000, monthlyEarnings: 3000000, pendingAmount: 500000,
        platformFeeRate: 10, platformFee: 1500000, netEarnings: 13500000,
        totalTransactions: 20,
      },
    },
  }).as("getDashboard");

  // Bookings
  cy.intercept("GET", "**/api/PartnerBooking*", {
    statusCode: 200,
    body: {
      success: true,
      data: {
        items: [
          {
            id: 1, bookingCode: "BK001", customerName: "Nguyễn Văn A", serviceName: "Homestay Đà Lạt",
            serviceType: "Homestay", bookingDate: "2026-03-20", checkInDate: "2026-04-01",
            totalAmount: 2500000, status: "pending", paymentStatus: "paid",
          },
          {
            id: 2, bookingCode: "BK002", customerName: "Trần Thị B", serviceName: "Tour Hạ Long",
            serviceType: "Tour", bookingDate: "2026-03-18", tourDate: "2026-04-05",
            totalAmount: 3500000, status: "confirmed", paymentStatus: "paid", participants: 4,
          },
        ],
        totalCount: 2, totalPages: 1,
      },
    },
  }).as("getBookings");

  // Services (PartnerService endpoint) - use route matcher for cross-origin
  cy.intercept({ method: "GET", url: /\/api\/PartnerService(\?.*)?$/ }, {
    statusCode: 200,
    body: {
      success: true,
      data: {
        items: [
          {
            id: "svc-1", name: "Homestay Đà Lạt View Đẹp", address: "Đà Lạt, Lâm Đồng",
            serviceType: 0, basePrice: 800000, averageRating: 4.5, totalReviews: 12,
            isActive: true, approvalStatus: 1, thumbnailUrl: "", createdAt: "2026-03-01T00:00:00Z",
          },
          {
            id: "svc-2", name: "Tour Hạ Long 2N1Đ", address: "Quảng Ninh",
            serviceType: 1, basePrice: 2500000, averageRating: 4.8, totalReviews: 25,
            isActive: true, approvalStatus: 1, thumbnailUrl: "", createdAt: "2026-03-02T00:00:00Z",
          },
        ],
        totalCount: 2, totalPages: 1,
      },
    },
  }).as("getServices");

  // Finance - transactions
  cy.intercept("GET", "**/api/PartnerFinance/transactions*", {
    statusCode: 200,
    body: {
      success: true,
      data: {
        items: [
          { id: "TXN001", transactionDate: "2026-03-20", amount: 2500000, type: "booking", description: "Homestay Đà Lạt", status: "completed" },
          { id: "TXN002", transactionDate: "2026-03-18", amount: 500000, type: "refund", description: "Hoàn tiền Tour", status: "completed" },
        ],
      },
    },
  }).as("getTransactions");

  // Finance - payouts
  cy.intercept("GET", "**/api/PartnerFinance/payouts*", {
    statusCode: 200,
    body: { success: true, data: { items: [] } },
  }).as("getPayouts");

  // Chat
  cy.intercept("GET", "**/api/Chat/conversations", {
    statusCode: 200,
    body: { success: true, data: [] },
  }).as("getConversations");
  // Partner services (own)
  cy.intercept("GET", "**/api/PartnerService*", {
    statusCode: 200,
    body: { success: true, data: { items: [] } },
  }).as("getPartnerServices");

  // Notifications
  cy.intercept("GET", "**/api/Notification*", {
    statusCode: 200,
    body: { success: true, data: { items: [] } },
  }).as("getNotifications");

  cy.intercept("GET", "**/api/Notification/unread-count", {
    statusCode: 200,
    body: { success: true, data: 0 },
  }).as("getUnreadCount");
});

// --- Mock all Manager APIs ---
Cypress.Commands.add("mockManagerAPIs", () => {
  cy.intercept("GET", "**/api/Admin/dashboard", {
    statusCode: 200,
    body: {
      success: true,
      data: {
        totalPartners: 25, verifiedPartners: 20, pendingVerification: 5,
        totalUsers: 150, activeServices: 40, pendingServices: 3,
        totalBookings: 200, monthlyRevenue: 50000000, platformFees: 5000000,
      },
    },
  }).as("getDashboard");

  // Pending verifications
  cy.intercept("GET", "**/api/AdminPartner/pending*", {
    statusCode: 200,
    body: {
      success: true,
      data: {
        items: [
          { id: 1, businessName: "Resort ABC", type: "Đối tác mới", submittedDate: "20/03/2026" },
          { id: 2, businessName: "Tour XYZ", type: "Đối tác mới", submittedDate: "19/03/2026" },
        ],
        totalCount: 2, totalPages: 1,
      },
    },
  }).as("getPendingVerifications");

  // Pending services
  cy.intercept("GET", "**/api/AdminServiceApproval/pending*", {
    statusCode: 200,
    body: {
      success: true,
      data: {
        items: [
          { id: 1, serviceName: "Homestay Sapa", partnerName: "Resort ABC", serviceType: "Homestay", submittedDate: "20/03/2026" },
        ],
        totalCount: 1, totalPages: 1,
      },
    },
  }).as("getPendingServices");

  // Refunds
  cy.intercept("GET", "**/api/AdminRefund*", {
    statusCode: 200,
    body: {
      success: true,
      data: {
        items: [
          { id: 1, bookingCode: "BK100", customerName: "Lê Văn C", amount: 1500000, reason: "Thay đổi kế hoạch", status: "pending", requestDate: "2026-03-15" },
        ],
        totalCount: 1, totalPages: 1,
      },
    },
  }).as("getRefunds");

  // Feedback
  cy.intercept("GET", "**/api/AdminFeedback*", {
    statusCode: 200,
    body: {
      success: true,
      data: {
        items: [
          { id: 1, userName: "Nguyễn Văn D", serviceName: "Tour Hạ Long", rating: 5, comment: "Rất tuyệt vời!", createdAt: "2026-03-20", isVisible: true },
        ],
        totalCount: 1, totalPages: 1,
      },
    },
  }).as("getFeedback");

  // Vouchers
  cy.intercept("GET", "**/api/AdminVoucher*", {
    statusCode: 200,
    body: {
      success: true,
      data: {
        items: [
          { id: 1, code: "SALE10", discountPercent: 10, maxDiscount: 500000, usageCount: 5, maxUsage: 100, isActive: true, expiryDate: "2026-06-30" },
        ],
        totalCount: 1, totalPages: 1,
      },
    },
  }).as("getVouchers");

  // Finance
  cy.intercept("GET", "**/api/AdminFinance/revenue*", {
    statusCode: 200,
    body: { success: true, data: { totalRevenue: 50000000, platformFees: 5000000, netRevenue: 45000000 } },
  }).as("getRevenue");

  cy.intercept("GET", "**/api/AdminFinance/payouts*", {
    statusCode: 200,
    body: { success: true, data: { items: [], totalCount: 0 } },
  }).as("getFinancePayouts");

  cy.intercept("GET", "**/api/AdminFinance/transactions*", {
    statusCode: 200,
    body: { success: true, data: { items: [], totalCount: 0 } },
  }).as("getFinanceTransactions");

  // Notifications
  cy.intercept("GET", "**/api/Notification*", {
    statusCode: 200,
    body: { success: true, data: { items: [] } },
  }).as("getNotifications");

  cy.intercept("GET", "**/api/Notification/unread-count", {
    statusCode: 200,
    body: { success: true, data: 0 },
  }).as("getUnreadCount");

  // Users for account management
  cy.intercept("GET", "**/api/Admin/users*", {
    statusCode: 200,
    body: {
      success: true,
      data: {
        items: [
          { id: 1, fullName: "Manager Test", email: "manager@test.com", role: "Manager", isActive: true, region: "Hà Nội" },
        ],
        totalCount: 1, totalPages: 1,
      },
    },
  }).as("getUsers");
});

// --- Mock all Admin APIs ---
Cypress.Commands.add("mockAdminAPIs", () => {
  cy.intercept("GET", "**/api/Admin/dashboard", {
    statusCode: 200,
    body: {
      success: true,
      data: {
        totalUsers: 500, totalPartners: 50, monthlyRevenue: 100000000,
        totalBookings: 1000, recentActivities: [
          { type: "user_registered", text: "Người dùng mới đăng ký", detail: "user@test.com", time: "2 phút trước" },
        ],
      },
    },
  }).as("getDashboard");

  cy.intercept("GET", "**/api/Admin/users*", {
    statusCode: 200,
    body: {
      success: true,
      data: {
        items: [
          { id: 1, fullName: "Admin User", email: "admin@test.com", role: "Admin", isActive: true },
          { id: 2, fullName: "Manager User", email: "manager@test.com", role: "Manager", isActive: true, region: "Hà Nội" },
          { id: 3, fullName: "Partner User", email: "partner@test.com", role: "Partner", isActive: true },
        ],
        totalCount: 3, totalPages: 1,
      },
    },
  }).as("getUsers");

  // Notifications
  cy.intercept("GET", "**/api/Notification*", {
    statusCode: 200,
    body: { success: true, data: { items: [] } },
  }).as("getNotifications");

  cy.intercept("GET", "**/api/Notification/unread-count", {
    statusCode: 200,
    body: { success: true, data: 0 },
  }).as("getUnreadCount");
});
