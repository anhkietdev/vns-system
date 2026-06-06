describe("Admin Pages", () => {
  beforeEach(() => {
    cy.loginAs("Admin");
  });

  // ─── AdminDashboard ────────────────────────────────────
  describe("AdminDashboard", () => {
    it("shows loading spinner", () => {
      cy.intercept("GET", "**/api/Admin/dashboard", { delay: 2000, statusCode: 200, body: { success: true, data: {} } });
      cy.intercept("GET", "**/api/Admin/users*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/AdminDashboard");
      cy.get(".animate-spin").should("be.visible");
    });

    it("shows dashboard data on success", () => {
      cy.mockAdminAPIs();
      cy.visit("/AdminDashboard");

      cy.contains("Bảng điều khiển Quản trị").should("be.visible");
      cy.contains("Người dùng").should("be.visible");
      cy.contains("Đối tác").should("be.visible");
    });

    it("shows error on API failure", () => {
      cy.intercept("GET", "**/api/Admin/dashboard", { statusCode: 500, body: { message: "Server Error" } });
      cy.intercept("GET", "**/api/Admin/users*", { statusCode: 500, body: { message: "Server Error" } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/AdminDashboard");
      cy.contains("Lỗi tải dữ liệu").should("be.visible");
      cy.contains("Thử lại").should("be.visible");
    });

    it("shows empty activities when none", () => {
      cy.intercept("GET", "**/api/Admin/dashboard", {
        statusCode: 200,
        body: { success: true, data: { totalUsers: 0, totalPartners: 0, monthlyRevenue: 0, totalBookings: 0, recentActivities: [] } },
      });
      cy.intercept("GET", "**/api/Admin/users*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/AdminDashboard");
      cy.contains("Chưa có tài khoản quản lý nào").should("be.visible");
    });
  });

  // ─── AdminUserManagement ───────────────────────────────
  describe("AdminUserManagement", () => {
    it("shows loading spinner", () => {
      cy.intercept("GET", "**/api/Admin/users*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/AdminUserManagement");
      cy.contains("Đang tải danh sách người dùng").should("be.visible");
    });

    it("shows users on success", () => {
      cy.mockAdminAPIs();
      cy.visit("/AdminUserManagement");

      cy.contains("Quản lý người dùng").should("be.visible");
      cy.contains("Admin User").should("be.visible");
      cy.contains("Manager User").should("be.visible");
    });

    it("shows error on API failure", () => {
      cy.intercept("GET", "**/api/Admin/users*", { statusCode: 500, body: { message: "Không thể tải danh sách người dùng" } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/AdminUserManagement");
      cy.contains("Không thể tải danh sách người dùng").should("be.visible");
    });

    it("shows empty state when no users", () => {
      cy.intercept("GET", "**/api/Admin/users*", { statusCode: 200, body: { success: true, data: { items: [], totalCount: 0 } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/AdminUserManagement");
      cy.contains("Không tìm thấy người dùng nào").should("be.visible");
    });
  });
});
