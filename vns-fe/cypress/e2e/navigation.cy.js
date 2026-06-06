describe("Navigation & Routing", () => {
  // Helper to mock all notification APIs
  const mockNotifications = () => {
    cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
    cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });
  };

  // ─── Partner Sidebar Navigation ────────────────────────
  describe("Partner Navigation", () => {
    beforeEach(() => {
      cy.loginAs("Partner");
      cy.mockPartnerAPIs();
    });

    it("loads PartnerDashboard directly", () => {
      cy.visit("/PartnerDashboard");
      cy.contains("Chào mừng trở lại").should("be.visible");
    });

    it("loads PartnerService directly", () => {
      cy.visit("/PartnerService");
      cy.contains("Dịch vụ của tôi").should("be.visible");
    });

    it("loads PartnerBooking directly", () => {
      cy.visit("/PartnerBooking");
      cy.contains("Quản lý đặt chỗ").should("be.visible");
    });

    it("loads PartnerFinance directly", () => {
      cy.visit("/PartnerFinance");
      cy.contains("Tài chính").should("be.visible");
    });

    it("loads PartnerProfile directly", () => {
      cy.visit("/PartnerProfile");
      cy.contains("Hồ Sơ Đối Tác").should("be.visible");
    });

    it("loads PartnerMessaging directly", () => {
      cy.intercept("GET", "**/api/Chat/conversations", { statusCode: 200, body: { success: true, data: [] } });
      cy.visit("/PartnerMessaging");
      cy.contains("Tin nhắn").should("be.visible");
    });
  });

  // ─── Manager Sidebar Navigation ────────────────────────
  describe("Manager Navigation", () => {
    beforeEach(() => {
      cy.loginAs("Manager");
      cy.mockManagerAPIs();
    });

    it("loads ManagerDashboard directly", () => {
      cy.visit("/ManagerDashboard");
      cy.contains("Bảng điều khiển Quản lý", { timeout: 15000 }).should("be.visible");
    });

    it("loads ManagerServiceApproval directly", () => {
      cy.visit("/ManagerServiceApproval");
      cy.contains("Duyệt dịch vụ", { timeout: 15000 }).should("be.visible");
    });

    it("loads ManagerAccountManagement directly", () => {
      cy.visit("/ManagerAccountManagement");
      cy.contains("Xác Minh Đối Tác", { timeout: 15000 }).should("be.visible");
    });

    it("loads ManagerPromotion directly", () => {
      cy.visit("/ManagerPromotion");
      cy.contains("Khuyến mãi", { timeout: 15000 }).should("be.visible");
    });

    it("loads ManagerFeedback directly", () => {
      cy.visit("/ManagerFeedback");
      cy.contains("Quản Lý Phản Hồi", { timeout: 15000 }).should("be.visible");
    });
  });

  // ─── Admin Sidebar Navigation ──────────────────────────
  describe("Admin Navigation", () => {
    beforeEach(() => {
      cy.loginAs("Admin");
      cy.mockAdminAPIs();
    });

    it("loads AdminDashboard directly", () => {
      cy.visit("/AdminDashboard");
      cy.contains("Bảng điều khiển Quản trị").should("be.visible");
    });

    it("loads AdminUserManagement directly", () => {
      cy.visit("/AdminUserManagement");
      cy.contains("Quản lý người dùng").should("be.visible");
    });
  });

  // ─── Logout ────────────────────────────────────────────
  describe("Logout", () => {
    it("logout clears localStorage and redirects to login", () => {
      cy.loginAs("Partner");
      cy.mockPartnerAPIs();
      cy.visit("/PartnerDashboard");

      // Wait for dashboard to load
      cy.contains("Chào mừng trở lại", { timeout: 15000 }).should("be.visible");

      // Verify localStorage has data
      cy.window().then((win) => {
        expect(win.localStorage.getItem("vns_token")).to.not.be.null;
        expect(win.localStorage.getItem("vns_user")).to.not.be.null;
      });

      // Click logout button (SideBar uses a div, not aside/nav)
      cy.contains("button", "Đăng xuất").click();

      // Should redirect to login and clear storage
      cy.url().should("include", "/LoginPartner");
      cy.window().then((win) => {
        expect(win.localStorage.getItem("vns_token")).to.be.null;
        expect(win.localStorage.getItem("vns_user")).to.be.null;
      });
    });
  });

  // ─── Public Routes ─────────────────────────────────────
  describe("Public Routes", () => {
    it("/ loads login page", () => {
      cy.visit("/");
      cy.contains("VNS Login").should("be.visible");
    });

    it("/LoginPartner loads login page", () => {
      cy.visit("/LoginPartner");
      cy.contains("VNS Login").should("be.visible");
    });

    it("/RegisterPartner loads register page", () => {
      cy.visit("/RegisterPartner");
      cy.contains("VNS Partner").should("be.visible");
    });

    it("/ForgotPassword loads forgot password page", () => {
      cy.visit("/ForgotPassword");
      cy.contains("Quên mật khẩu").should("be.visible");
    });
  });
});
