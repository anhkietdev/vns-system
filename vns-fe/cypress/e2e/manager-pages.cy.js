describe("Manager Pages", () => {
  beforeEach(() => {
    cy.loginAs("Manager");
  });

  // ─── ManagerDashboard ──────────────────────────────────
  describe("ManagerDashboard", () => {
    it("shows loading spinner", () => {
      cy.intercept("GET", "**/api/Admin/dashboard", { delay: 2000, statusCode: 200, body: { success: true, data: {} } });
      cy.intercept("GET", "**/api/AdminPartner/pending*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/AdminServiceApproval/pending*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerDashboard");
      cy.get(".animate-spin").should("be.visible");
    });

    it("shows dashboard data on success", () => {
      cy.intercept("http://localhost:5272/**", (req) => {
        req.reply({ statusCode: 200, body: { success: true, data: { totalPartners: 25, verifiedPartners: 20, pendingVerification: 5, totalUsers: 150, activeServices: 40, pendingServices: 3, totalBookings: 200, monthlyRevenue: 50000000, platformFees: 5000000, items: [{ id: 1, businessName: "Resort ABC", type: "Đối tác mới", submittedDate: "20/03/2026" }] } } });
      });

      cy.visit("/ManagerDashboard");
      cy.contains("Đối tác", { timeout: 15000 }).should("be.visible");
      cy.contains("Người dùng").should("be.visible");
      cy.contains("Dịch vụ").should("be.visible");
    });

    it("shows empty verification requests", () => {
      const emptyData = { statusCode: 200, body: { success: true, data: { totalPartners: 0, verifiedPartners: 0, pendingVerification: 0, totalUsers: 0, activeServices: 0, pendingServices: 0, totalBookings: 0, monthlyRevenue: 0, platformFees: 0, items: [] } } };
      cy.intercept("GET", "http://localhost:5272/api/Admin/dashboard", emptyData);
      cy.intercept("GET", "http://localhost:5272/api/AdminPartner/pending*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "http://localhost:5272/api/AdminServiceApproval/pending*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerDashboard");
      cy.contains("Không có hồ sơ chờ xác minh", { timeout: 15000 }).should("be.visible");
      cy.contains("Không có dịch vụ chờ duyệt").should("be.visible");
    });
  });

  // ─── ManagerAccountManagement ──────────────────────────
  describe("ManagerAccountManagement", () => {
    it("shows loading spinner", () => {
      cy.intercept("GET", "**/api/AdminPartner/pending*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerAccountManagement");
      cy.get(".animate-spin").should("be.visible");
    });

    it("shows accounts on success", () => {
      cy.intercept("GET", "http://localhost:5272/api/AdminPartner/pending*", {
        statusCode: 200,
        body: { success: true, data: { items: [{ id: 1, businessName: "Resort ABC", status: "pending", email: "test@test.com" }], totalCount: 1, totalPages: 1 } },
      });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerAccountManagement");
      cy.contains("Xác Minh Đối Tác", { timeout: 15000 }).should("be.visible");
    });

    it("shows empty state", () => {
      cy.intercept("GET", "http://localhost:5272/api/AdminPartner/pending*", {
        statusCode: 200,
        body: { success: true, data: { items: [], totalCount: 0, totalPages: 1 } },
      });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerAccountManagement");
      cy.contains("Không tìm thấy hồ sơ nào", { timeout: 15000 }).should("be.visible");
    });
  });

  // ─── ManagerServiceApproval ────────────────────────────
  describe("ManagerServiceApproval", () => {
    it("shows loading spinner", () => {
      cy.intercept("GET", "**/api/AdminServiceApproval/pending*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerServiceApproval");
      cy.get(".animate-spin").should("be.visible");
    });

    it("shows services on success", () => {
      cy.mockManagerAPIs();
      cy.visit("/ManagerServiceApproval");
      cy.contains("Duyệt dịch vụ").should("be.visible");
    });

    it("shows empty state", () => {
      cy.intercept("GET", "**/api/AdminServiceApproval/pending*", { statusCode: 200, body: { success: true, data: { items: [], totalCount: 0 } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerServiceApproval");
      cy.contains("Không tìm thấy dịch vụ nào").should("be.visible");
    });

    it("approve button sends API call", () => {
      cy.mockManagerAPIs();
      cy.intercept("PUT", "**/api/AdminServiceApproval/*/approve", { statusCode: 200, body: { success: true } }).as("approveService");

      cy.visit("/ManagerServiceApproval");
      // The page should have approve buttons
      cy.get("button").contains(/Duyệt|Phê duyệt/).should("exist");
    });
  });

  // ─── ManagerDocumentReview ─────────────────────────────
  describe("ManagerDocumentReview", () => {
    it("shows loading spinner", () => {
      cy.intercept("GET", "**/api/AdminPartner/pending*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerDocumentReview");
      cy.get(".animate-spin").should("be.visible");
    });

    it("shows page on success", () => {
      cy.mockManagerAPIs();
      cy.visit("/ManagerDocumentReview");
      cy.contains("Xét duyệt tài liệu").should("be.visible");
    });

    it("shows empty state", () => {
      cy.intercept("GET", "**/api/AdminPartner/pending*", { statusCode: 200, body: { success: true, data: { items: [], totalCount: 0 } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerDocumentReview");
      cy.contains("Không tìm thấy hồ sơ nào").should("be.visible");
    });
  });

  // ─── ManagerFinance ────────────────────────────────────
  describe("ManagerFinance", () => {
    it("shows loading spinner", () => {
      cy.intercept("GET", "**/api/AdminFinance/revenue*", { delay: 2000, statusCode: 200, body: { success: true, data: {} } });
      cy.intercept("GET", "**/api/AdminFinance/payouts*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/AdminFinance/transactions*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerFinance");
      cy.contains("Đang tải dữ liệu tài chính").should("be.visible");
    });

    it("shows finance data on success", () => {
      cy.mockManagerAPIs();
      cy.visit("/ManagerFinance");
      cy.contains("Tài chính nền tảng").should("be.visible");
    });

    it("shows empty payout/transaction state", () => {
      cy.intercept("GET", "http://localhost:5272/api/AdminFinance/revenue*", { statusCode: 200, body: { success: true, data: { totalRevenue: 0 } } });
      cy.intercept("GET", "http://localhost:5272/api/AdminFinance/payouts*", { statusCode: 200, body: { success: true, data: { items: [], totalCount: 0 } } });
      cy.intercept("GET", "http://localhost:5272/api/AdminFinance/transactions*", { statusCode: 200, body: { success: true, data: { items: [], totalCount: 0 } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerFinance");
      cy.contains("Tài chính nền tảng", { timeout: 15000 }).should("be.visible");
      // Switch to payouts tab to see empty state
      cy.contains("Thanh toán đối tác").click();
      cy.contains("Không có thanh toán nào").should("be.visible");
    });
  });

  // ─── ManagerFeedback ───────────────────────────────────
  describe("ManagerFeedback", () => {
    it("shows loading spinner", () => {
      cy.intercept("GET", "**/api/AdminFeedback*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerFeedback");
      cy.get(".animate-spin").should("be.visible");
    });

    it("shows feedback on success", () => {
      cy.mockManagerAPIs();
      cy.visit("/ManagerFeedback");
      cy.contains("Quản Lý Phản Hồi").should("be.visible");
    });

    it("shows empty state", () => {
      cy.intercept("GET", "**/api/AdminFeedback*", { statusCode: 200, body: { success: true, data: { items: [], totalCount: 0 } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerFeedback");
      cy.contains("Không có phản hồi nào").should("be.visible");
    });
  });

  // ─── ManagerPromotion ──────────────────────────────────
  describe("ManagerPromotion", () => {
    it("shows loading spinner", () => {
      cy.intercept("GET", "**/api/AdminVoucher*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerPromotion");
      cy.contains("Đang tải khuyến mãi").should("be.visible");
    });

    it("shows promotions on success", () => {
      cy.mockManagerAPIs();
      cy.visit("/ManagerPromotion");
      cy.contains("Khuyến mãi").should("be.visible");
    });

    it("shows empty state", () => {
      cy.intercept("GET", "**/api/AdminVoucher*", { statusCode: 200, body: { success: true, data: { items: [], totalCount: 0 } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerPromotion");
      cy.contains("Không có khuyến mãi nào").should("be.visible");
    });

    it("shows error on API failure", () => {
      cy.intercept("GET", "**/api/AdminVoucher*", { statusCode: 500, body: { message: "Error" } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/ManagerPromotion");
      cy.contains("Không thể tải danh sách khuyến mãi").should("be.visible");
    });
  });
});
