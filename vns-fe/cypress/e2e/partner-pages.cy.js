describe("Partner Pages", () => {
  beforeEach(() => {
    cy.loginAs("Partner");
  });

  // ─── PartnerDashboard ──────────────────────────────────
  describe("PartnerDashboard", () => {
    it("shows loading spinner while APIs pending", () => {
      cy.intercept("GET", "**/api/PartnerProfile", { delay: 2000, statusCode: 200, body: { success: true, data: {} } });
      cy.intercept("GET", "**/api/PartnerFinance/dashboard", { delay: 2000, statusCode: 200, body: { success: true, data: {} } });
      cy.intercept("GET", "**/api/PartnerBooking*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerDashboard");
      cy.contains("Đang tải dữ liệu").should("be.visible");
    });

    it("shows data on success", () => {
      cy.mockPartnerAPIs();
      cy.visit("/PartnerDashboard");

      cy.contains("Chào mừng trở lại").should("be.visible");
      cy.contains("Dịch vụ").should("be.visible");
      cy.contains("Đặt chỗ").should("be.visible");
      cy.contains("Doanh thu").should("be.visible");
      cy.contains("Đánh giá").should("be.visible");
      cy.contains("Đặt chỗ gần đây").should("be.visible");
    });

    it("shows error when API fails (500)", () => {
      cy.intercept("GET", "**/api/PartnerProfile", { statusCode: 500, body: { message: "Server Error" } });
      cy.intercept("GET", "**/api/PartnerFinance/dashboard", { statusCode: 500, body: { message: "Server Error" } });
      cy.intercept("GET", "**/api/PartnerBooking*", { statusCode: 500, body: { message: "Server Error" } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerDashboard");
      cy.contains("Không thể tải dữ liệu").should("be.visible");
      cy.contains("Thử lại").should("be.visible");
    });

    it("shows empty state when no bookings", () => {
      cy.intercept("GET", "**/api/PartnerProfile", { statusCode: 200, body: { success: true, data: { businessName: "Test" } } });
      cy.intercept("GET", "**/api/PartnerFinance/dashboard", {
        statusCode: 200,
        body: { success: true, data: { totalServices: 0, totalBookings: 0, totalRevenue: 0, pendingBookings: 0, confirmedBookings: 0, completedBookings: 0, cancelledBookings: 0 } },
      });
      cy.intercept("GET", "**/api/PartnerBooking*", { statusCode: 200, body: { success: true, data: { items: [], totalCount: 0 } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerDashboard");
      cy.contains("Chưa có đặt chỗ nào").should("be.visible");
    });
  });

  // ─── PartnerService ──────────────────────────────────────
  describe("PartnerService", () => {
    it("shows loading spinner", () => {
      cy.intercept("GET", "http://localhost:5272/api/PartnerService*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerService");
      cy.contains("Đang tải dịch vụ").should("be.visible");
    });

    it("shows services on success", () => {
      cy.intercept("GET", "http://localhost:5272/api/PartnerService*", {
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
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerService");

      cy.wait("@getServices");
      cy.contains("Dịch vụ của tôi").should("be.visible");
      cy.contains("Homestay Đà Lạt View Đẹp").should("be.visible");
      cy.contains("Tour Hạ Long 2N1Đ").should("be.visible");
    });

    it("shows error on API failure", () => {
      cy.intercept("GET", "http://localhost:5272/api/PartnerService*", { statusCode: 500, body: { message: "Server Error" } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerService");
      cy.contains("Không thể tải dữ liệu").should("be.visible");
      cy.contains("Thử lại").should("be.visible");
    });

    it("shows empty state when no services", () => {
      cy.intercept("GET", "http://localhost:5272/api/PartnerService*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerService");
      cy.contains("Chưa có dịch vụ nào").should("be.visible");
    });

    it("search filters services", () => {
      cy.intercept("GET", "http://localhost:5272/api/PartnerService*", {
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
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerService");

      cy.wait("@getServices");
      cy.get('input[placeholder*="Tìm kiếm"]').type("Homestay");
      cy.contains("Homestay Đà Lạt View Đẹp").should("be.visible");
      cy.contains("Tour Hạ Long 2N1Đ").should("not.exist");
    });

    it("opens add service modal", () => {
      cy.mockPartnerAPIs();
      cy.visit("/PartnerService");

      cy.contains("Thêm dịch vụ mới").click();
      // Modal should appear (PartnerServiceModal)
      cy.get(".fixed").should("be.visible");
    });
  });

  // ─── PartnerBooking ──────────────────────────────────────
  describe("PartnerBooking", () => {
    it("shows loading spinner", () => {
      cy.intercept("GET", "**/api/PartnerBooking*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerBooking");
      cy.contains("Đang tải danh sách đặt chỗ").should("be.visible");
    });

    it("shows bookings on success", () => {
      cy.mockPartnerAPIs();
      cy.visit("/PartnerBooking");

      cy.contains("Quản lý đặt chỗ").should("be.visible");
      cy.contains("BK001").should("be.visible");
      cy.contains("Nguyễn Văn A").should("be.visible");
    });

    it("shows error on API failure", () => {
      cy.intercept("GET", "**/api/PartnerBooking*", { statusCode: 500, body: { message: "Server Error" } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerBooking");
      cy.contains("Không thể tải danh sách đặt chỗ").should("be.visible");
      cy.contains("Thử lại").should("be.visible");
    });

    it("shows empty state when no bookings", () => {
      cy.intercept("GET", "**/api/PartnerBooking*", { statusCode: 200, body: { success: true, data: { items: [], totalCount: 0, totalPages: 1 } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerBooking");
      cy.contains("Không có đặt chỗ nào").should("exist");
    });

    it("confirm booking button works", () => {
      cy.mockPartnerAPIs();
      cy.intercept("PUT", "**/api/PartnerBooking/*/confirm", { statusCode: 200, body: { success: true } }).as("confirmBooking");

      cy.visit("/PartnerBooking");
      cy.contains("Xác nhận").first().click();
      cy.wait("@confirmBooking");
    });
  });

  // ─── PartnerFinance ──────────────────────────────────────
  describe("PartnerFinance", () => {
    it("shows loading spinner", () => {
      cy.intercept("GET", "**/api/PartnerFinance/dashboard", { delay: 2000, statusCode: 200, body: { success: true, data: {} } });
      cy.intercept("GET", "**/api/PartnerFinance/transactions*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/PartnerFinance/payouts*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerFinance");
      cy.contains("Đang tải dữ liệu tài chính").should("be.visible");
    });

    it("shows finance data on success", () => {
      cy.mockPartnerAPIs();
      cy.visit("/PartnerFinance");

      cy.contains("Tài chính").should("be.visible");
      cy.contains("Tổng thu nhập").should("be.visible");
      cy.contains("Giao dịch gần đây").should("be.visible");
    });

    it("shows error on API failure", () => {
      cy.intercept("GET", "**/api/PartnerFinance/dashboard", { statusCode: 500, body: { message: "Error" } });
      cy.intercept("GET", "**/api/PartnerFinance/transactions*", { statusCode: 500, body: { message: "Error" } });
      cy.intercept("GET", "**/api/PartnerFinance/payouts*", { statusCode: 500, body: { message: "Error" } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerFinance");
      cy.contains("Đã xảy ra lỗi").should("be.visible");
      cy.contains("Thử lại").should("be.visible");
    });

    it("opens withdraw modal", () => {
      cy.mockPartnerAPIs();
      cy.visit("/PartnerFinance");

      cy.contains("Yêu cầu rút tiền").click();
      cy.contains("Số tiền muốn rút").should("be.visible");
      cy.contains("Xác nhận rút tiền").should("be.visible");
    });
  });

  // ─── PartnerProfile ──────────────────────────────────────
  describe("PartnerProfile", () => {
    it("shows loading spinner", () => {
      cy.intercept("GET", "**/api/PartnerProfile", { delay: 2000, statusCode: 200, body: { success: true, data: {} } });
      cy.intercept("GET", "**/api/PartnerProfile/documents", { delay: 2000, statusCode: 200, body: { success: true, data: [] } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerProfile");
      cy.contains("Đang tải hồ sơ").should("be.visible");
    });

    it("shows profile on success", () => {
      cy.mockPartnerAPIs();
      cy.visit("/PartnerProfile");

      cy.contains("Hồ Sơ Đối Tác").should("be.visible");
    });

    it("shows profile page even when API returns rejected (allSettled)", () => {
      // PartnerProfile uses Promise.allSettled so it won't throw on API failure
      // It will show the page with empty/default form data
      cy.intercept("GET", "**/api/PartnerProfile", { statusCode: 500, body: { message: "Error" } });
      cy.intercept("GET", "**/api/PartnerProfile/documents", { statusCode: 500, body: { message: "Error" } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerProfile");
      // Page still renders because allSettled doesn't throw
      cy.contains("Hồ Sơ Đối Tác").should("be.visible");
    });
  });

  // ─── PartnerMessaging ────────────────────────────────────
  describe("PartnerMessaging", () => {
    it("shows loading spinner", () => {
      cy.intercept("GET", "**/api/Chat/conversations", { delay: 2000, statusCode: 200, body: { success: true, data: [] } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerMessaging");
      cy.contains("Đang tải tin nhắn").should("be.visible");
    });

    it("shows empty state when no conversations", () => {
      cy.intercept("GET", "**/api/Chat/conversations", { statusCode: 200, body: { success: true, data: [] } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerMessaging");
      cy.contains("Chưa có tin nhắn nào").should("be.visible");
    });
  });

  // ─── PartnerCombo ────────────────────────────────────────
  describe("PartnerCombo", () => {
    it("shows loading spinner", () => {
      cy.intercept("GET", "http://localhost:5272/api/PartnerService*", { delay: 2000, statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "http://localhost:5272/api/PartnerService*", { delay: 2000, statusCode: 200, body: [] });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerCombo");
      cy.contains("Đang tải dịch vụ").should("be.visible");
    });

    it("shows combo page on success", () => {
      cy.mockPartnerAPIs();
      cy.visit("/PartnerCombo");
      cy.contains("Combo dịch vụ").should("be.visible");
    });

    it("shows empty state", () => {
      cy.intercept("GET", "http://localhost:5272/api/PartnerService*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "http://localhost:5272/api/PartnerService*", { statusCode: 200, body: [] });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerCombo");
      cy.contains("Chưa có dịch vụ nào").should("be.visible");
    });

    it("shows error on API failure", () => {
      cy.intercept("GET", "http://localhost:5272/api/PartnerService*", { statusCode: 500, body: { message: "Error" } });
      cy.intercept("GET", "http://localhost:5272/api/PartnerService*", { statusCode: 500, body: { message: "Error" } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.visit("/PartnerCombo");
      cy.contains("Không thể tải danh sách dịch vụ").should("be.visible");
    });
  });
});
