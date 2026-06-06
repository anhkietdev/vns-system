describe("Authentication", () => {
  // ─── Login Page ────────────────────────────────────────────
  describe("Login Page", () => {
    beforeEach(() => {
      cy.visit("/LoginPartner");
    });

    it("renders login form correctly", () => {
      cy.contains("VNS Login").should("be.visible");
      cy.get('input[name="email"]').should("be.visible");
      cy.get('input[name="password"]').should("be.visible");
      cy.get('button[type="submit"]').contains("Đăng nhập").should("be.visible");
      cy.contains("Tạo tài khoản").should("be.visible");
      cy.contains("Quên mật khẩu?").should("be.visible");
    });

    it("shows validation error on empty submit", () => {
      cy.get('button[type="submit"]').click();
      cy.contains("Vui lòng nhập cả email và mật khẩu").should("be.visible");
    });

    it("shows error when only email is filled", () => {
      cy.get('input[name="email"]').type("test@example.com");
      cy.get('button[type="submit"]').click();
      cy.contains("Vui lòng nhập cả email và mật khẩu").should("be.visible");
    });

    it("login success as Partner → redirect to /PartnerDashboard", () => {
      cy.intercept("POST", "**/api/Auth/login", {
        statusCode: 200,
        body: {
          success: true,
          data: {
            token: `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({
              sub: "1",
              "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Partner",
              exp: Math.floor(Date.now() / 1000) + 3600,
            }))}.${btoa("sig")}`,
            user: { id: 1, email: "partner@test.com", fullName: "Partner Test" },
          },
        },
      }).as("loginRequest");

      // Mock APIs that PartnerDashboard calls on load
      cy.intercept("GET", "**/api/PartnerProfile", { statusCode: 200, body: { success: true, data: { businessName: "Test" } } });
      cy.intercept("GET", "**/api/PartnerFinance/dashboard", { statusCode: 200, body: { success: true, data: { totalServices: 0, totalBookings: 0, totalRevenue: 0 } } });
      cy.intercept("GET", "**/api/PartnerBooking*", { statusCode: 200, body: { success: true, data: { items: [], totalCount: 0 } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.get('input[name="email"]').type("partner@test.com");
      cy.get('input[name="password"]').type("password123");
      cy.get('button[type="submit"]').click();

      cy.wait("@loginRequest");
      cy.url().should("include", "/PartnerDashboard");
    });

    it("login success as Manager → redirect to /ManagerDashboard", () => {
      cy.intercept("POST", "**/api/Auth/login", {
        statusCode: 200,
        body: {
          success: true,
          data: {
            token: `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({
              sub: "2",
              "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Manager",
              exp: Math.floor(Date.now() / 1000) + 3600,
            }))}.${btoa("sig")}`,
            user: { id: 2, email: "manager@test.com" },
          },
        },
      }).as("loginRequest");

      cy.intercept("GET", "**/api/Admin/dashboard", { statusCode: 200, body: { success: true, data: { totalPartners: 0 } } });
      cy.intercept("GET", "**/api/AdminPartner/pending*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/AdminServiceApproval/pending*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.get('input[name="email"]').type("manager@test.com");
      cy.get('input[name="password"]').type("password123");
      cy.get('button[type="submit"]').click();

      cy.wait("@loginRequest");
      cy.url().should("include", "/ManagerDashboard");
    });

    it("login success as Admin → redirect to /AdminDashboard", () => {
      cy.intercept("POST", "**/api/Auth/login", {
        statusCode: 200,
        body: {
          success: true,
          data: {
            token: `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({
              sub: "3",
              "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": "Admin",
              exp: Math.floor(Date.now() / 1000) + 3600,
            }))}.${btoa("sig")}`,
            user: { id: 3, email: "admin@test.com" },
          },
        },
      }).as("loginRequest");

      cy.intercept("GET", "**/api/Admin/dashboard", { statusCode: 200, body: { success: true, data: { totalUsers: 0 } } });
      cy.intercept("GET", "**/api/Admin/users*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification*", { statusCode: 200, body: { success: true, data: { items: [] } } });
      cy.intercept("GET", "**/api/Notification/unread-count", { statusCode: 200, body: { success: true, data: 0 } });

      cy.get('input[name="email"]').type("admin@test.com");
      cy.get('input[name="password"]').type("password123");
      cy.get('button[type="submit"]').click();

      cy.wait("@loginRequest");
      cy.url().should("include", "/AdminDashboard");
    });

    it("shows error when API fails", () => {
      cy.intercept("POST", "**/api/Auth/login", {
        statusCode: 500,
        body: { message: "Lỗi máy chủ" },
      }).as("loginFail");

      cy.get('input[name="email"]').type("test@test.com");
      cy.get('input[name="password"]').type("wrong");
      cy.get('button[type="submit"]').click();

      cy.wait("@loginFail");
      cy.get(".bg-red-50").should("be.visible");
    });

    it("shows loading state during login", () => {
      cy.intercept("POST", "**/api/Auth/login", {
        statusCode: 200,
        body: { success: true, data: { token: "fake" } },
        delay: 1000,
      });

      cy.get('input[name="email"]').type("test@test.com");
      cy.get('input[name="password"]').type("password");
      cy.get('button[type="submit"]').click();
      cy.contains("Đang đăng nhập...").should("be.visible");
    });
  });

  // ─── Register Page ────────────────────────────────────────
  describe("Register Page", () => {
    beforeEach(() => {
      cy.visit("/RegisterPartner");
    });

    it("renders step 1 form correctly", () => {
      cy.contains("VNS Partner").should("be.visible");
      cy.contains("Đăng ký tài khoản đối tác").should("be.visible");
      cy.get('input[type="email"]').should("be.visible");
      cy.get('input[type="tel"]').should("be.visible");
      cy.contains("Tiếp theo").should("be.visible");
    });

    it("shows validation errors on step 1 empty submit", () => {
      cy.contains("Tiếp theo").click();
      cy.contains("Email là bắt buộc").should("be.visible");
      cy.contains("Số điện thoại là bắt buộc").should("be.visible");
      cy.contains("Mật khẩu là bắt buộc").should("be.visible");
    });

    it("validates email format", () => {
      cy.get('input[type="email"]').type("invalid-email");
      cy.get('input[type="tel"]').type("0987654321");
      cy.get('input[placeholder="Tối thiểu 6 ký tự"]').type("password123");
      cy.get('input[placeholder="Nhập lại mật khẩu"]').type("password123");
      cy.contains("Tiếp theo").click();
      cy.contains("Email không hợp lệ").should("be.visible");
    });

    it("validates password match", () => {
      cy.get('input[type="email"]').type("test@test.com");
      cy.get('input[type="tel"]').type("0987654321");
      cy.get('input[placeholder="Tối thiểu 6 ký tự"]').type("password123");
      cy.get('input[placeholder="Nhập lại mật khẩu"]').type("different");
      cy.contains("Tiếp theo").click();
      cy.contains("Mật khẩu xác nhận không khớp").should("be.visible");
    });

    it("navigates to step 2 and validates business name", () => {
      cy.get('input[type="email"]').type("test@test.com");
      cy.get('input[type="tel"]').type("0987654321");
      cy.get('input[placeholder="Tối thiểu 6 ký tự"]').type("password123");
      cy.get('input[placeholder="Nhập lại mật khẩu"]').type("password123");
      cy.contains("Tiếp theo").click();

      // Step 2 should show
      cy.contains("Thông tin doanh nghiệp").should("be.visible");
      cy.contains("Hoàn tất đăng ký").click();
      cy.contains("Tên doanh nghiệp là bắt buộc").should("be.visible");
    });

    it("register success → redirect to login with message", () => {
      cy.intercept("POST", "**/api/Auth/register-partner", {
        statusCode: 200,
        body: { success: true },
      }).as("register");

      // Fill step 1
      cy.get('input[type="email"]').type("new@test.com");
      cy.get('input[type="tel"]').type("0987654321");
      cy.get('input[placeholder="Tối thiểu 6 ký tự"]').type("password123");
      cy.get('input[placeholder="Nhập lại mật khẩu"]').type("password123");
      cy.contains("Tiếp theo").click();

      // Fill step 2
      cy.get('input[placeholder="Nhập tên doanh nghiệp"]').type("Test Business");
      cy.contains("Hoàn tất đăng ký").click();

      cy.wait("@register");
      cy.url().should("include", "/LoginPartner");
      cy.contains("Đăng ký thành công").should("be.visible");
    });

    it("register API fail → shows error", () => {
      cy.intercept("POST", "**/api/Auth/register-partner", {
        statusCode: 400,
        body: { message: "Email đã tồn tại" },
      }).as("registerFail");

      cy.get('input[type="email"]').type("existing@test.com");
      cy.get('input[type="tel"]').type("0987654321");
      cy.get('input[placeholder="Tối thiểu 6 ký tự"]').type("password123");
      cy.get('input[placeholder="Nhập lại mật khẩu"]').type("password123");
      cy.contains("Tiếp theo").click();

      cy.get('input[placeholder="Nhập tên doanh nghiệp"]').type("Test Business");
      cy.contains("Hoàn tất đăng ký").click();

      cy.wait("@registerFail");
      cy.get(".bg-red-50").should("be.visible");
    });
  });

  // ─── Forgot Password ─────────────────────────────────────
  describe("Forgot Password", () => {
    beforeEach(() => {
      cy.visit("/ForgotPassword");
    });

    it("renders step 1 - email form", () => {
      cy.contains("Quên mật khẩu").should("be.visible");
      cy.contains("Nhập email để nhận mã OTP").should("be.visible");
      cy.get('input[type="email"]').should("be.visible");
      cy.contains("Gửi mã OTP").should("be.visible");
    });

    it("validates empty email", () => {
      cy.contains("Gửi mã OTP").click();
      cy.contains("Vui lòng nhập email").should("be.visible");
    });

    it("step 1 → step 2: send OTP success", () => {
      cy.intercept("POST", "**/api/Auth/forgot-password", {
        statusCode: 200,
        body: { success: true },
      }).as("sendOtp");

      cy.get('input[type="email"]').type("test@test.com");
      cy.contains("Gửi mã OTP").click();

      cy.wait("@sendOtp");
      cy.contains("Mã OTP đã được gửi").should("be.visible");
      cy.contains("Xác minh OTP").should("be.visible");
    });

    it("step 2 → step 3: verify OTP success", () => {
      cy.intercept("POST", "**/api/Auth/forgot-password", { statusCode: 200, body: { success: true } }).as("sendOtp");
      cy.intercept("POST", "**/api/Auth/verify-otp", { statusCode: 200, body: { success: true } }).as("verifyOtp");

      cy.get('input[type="email"]').type("test@test.com");
      cy.contains("Gửi mã OTP").click();
      cy.wait("@sendOtp");

      // Wait for step 2 to render
      cy.get('input[placeholder="Nhập mã OTP từ email"]', { timeout: 10000 }).should("be.visible").type("123456");
      cy.contains("button", "Xác minh OTP").click();
      cy.wait("@verifyOtp");

      cy.contains("OTP hợp lệ").should("be.visible");
    });

    it("step 3: reset password success → redirect login", () => {
      cy.intercept("POST", "**/api/Auth/forgot-password", { statusCode: 200, body: { success: true } }).as("sendOtp");
      cy.intercept("POST", "**/api/Auth/verify-otp", { statusCode: 200, body: { success: true } }).as("verifyOtp");
      cy.intercept("POST", "**/api/Auth/reset-password", { statusCode: 200, body: { success: true } }).as("resetPass");

      cy.get('input[type="email"]').type("test@test.com");
      cy.contains("Gửi mã OTP").click();
      cy.wait("@sendOtp");

      cy.get('input[placeholder="Nhập mã OTP từ email"]', { timeout: 10000 }).should("be.visible").type("123456");
      cy.contains("button", "Xác minh OTP").click();
      cy.wait("@verifyOtp");

      cy.get('input[placeholder="Tối thiểu 6 ký tự"]', { timeout: 10000 }).should("be.visible").type("newpassword");
      cy.get('input[placeholder="Nhập lại mật khẩu mới"]').type("newpassword");
      cy.contains("button", "Đặt lại mật khẩu").click();
      cy.wait("@resetPass");

      cy.url().should("include", "/LoginPartner");
    });

    it("OTP verification fails → shows error", () => {
      cy.intercept("POST", "**/api/Auth/forgot-password", { statusCode: 200, body: { success: true } }).as("sendOtp");
      cy.intercept("POST", "**/api/Auth/verify-otp", { statusCode: 400, body: { message: "OTP không hợp lệ" } }).as("verifyFail");

      cy.get('input[type="email"]').type("test@test.com");
      cy.contains("Gửi mã OTP").click();
      cy.wait("@sendOtp");

      cy.get('input[placeholder="Nhập mã OTP từ email"]', { timeout: 10000 }).should("be.visible").type("000000");
      cy.contains("button", "Xác minh OTP").click();
      cy.wait("@verifyFail");

      cy.get(".bg-red-50").should("be.visible");
    });
  });
});
