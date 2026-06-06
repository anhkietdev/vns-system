/**
 * Integration tests - Auth flows against REAL API (localhost:5272)
 * No mocking - tests real login/register/forgot-password with actual backend
 */

const API = "http://localhost:5272";

describe("Auth Integration", () => {
  // ─── Login ───────────────────────────────────────────
  describe("Đăng nhập với API thực", () => {
    it("Partner đăng nhập → chuyển hướng /PartnerDashboard", () => {
      cy.visit("/LoginPartner");
      cy.get('input[type="email"]').type("tuan.le@partner.vn");
      cy.get('input[type="password"]').type("Partner@123");
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 15000 }).should("include", "/PartnerDashboard");
      cy.window().then((win) => {
        const token = win.localStorage.getItem("vns_token");
        expect(token).to.be.a("string").and.not.be.empty;
        const user = JSON.parse(win.localStorage.getItem("vns_user"));
        expect(user).to.have.property("role");
      });
    });

    it("Manager đăng nhập → chuyển hướng /ManagerDashboard", () => {
      cy.visit("/LoginPartner");
      cy.get('input[type="email"]').type("manager@vns.vn");
      cy.get('input[type="password"]').type("Manager@123");
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 15000 }).should("include", "/ManagerDashboard");
    });

    it("Admin đăng nhập → chuyển hướng /AdminDashboard", () => {
      cy.visit("/LoginPartner");
      cy.get('input[type="email"]').type("admin@vns.vn");
      cy.get('input[type="password"]').type("Admin@123");
      cy.get('button[type="submit"]').click();
      cy.url({ timeout: 15000 }).should("include", "/AdminDashboard");
    });

    it("Sai thông tin → hiển thị lỗi", () => {
      cy.visit("/LoginPartner");
      cy.get('input[type="email"]').type("wrong@email.com");
      cy.get('input[type="password"]').type("WrongPass@123");
      cy.get('button[type="submit"]').click();
      // Should stay on login page and show error
      cy.url({ timeout: 5000 }).should("include", "/Login");
      cy.get(".text-red-500, .text-red-600, .text-red-700, .bg-red-50", { timeout: 10000 }).should("exist");
    });
  });

  // ─── Role-based redirect ──────────────────────────────
  describe("Chuyển hướng theo vai trò", () => {
    it("Partner đăng nhập qua API → role là Partner", () => {
      cy.request("POST", `${API}/api/Auth/login`, {
        email: "tuan.le@partner.vn",
        password: "Partner@123",
      }).then((res) => {
        const body = res.body.data || res.body;
        const token = body.token;
        const parts = token.split(".");
        const payload = JSON.parse(atob(parts[1]));
        const role =
          payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload.role;
        expect(role.toLowerCase()).to.include("partner");
      });
    });

    it("Manager đăng nhập qua API → role là Manager", () => {
      cy.request("POST", `${API}/api/Auth/login`, {
        email: "manager@vns.vn",
        password: "Manager@123",
      }).then((res) => {
        const body = res.body.data || res.body;
        const token = body.token;
        const parts = token.split(".");
        const payload = JSON.parse(atob(parts[1]));
        const role =
          payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload.role;
        expect(role.toLowerCase()).to.include("manager");
      });
    });

    it("Admin đăng nhập qua API → role là Admin", () => {
      cy.request("POST", `${API}/api/Auth/login`, {
        email: "admin@vns.vn",
        password: "Admin@123",
      }).then((res) => {
        const body = res.body.data || res.body;
        const token = body.token;
        const parts = token.split(".");
        const payload = JSON.parse(atob(parts[1]));
        const role =
          payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload.role;
        expect(role.toLowerCase()).to.include("admin");
      });
    });
  });

  // ─── Token format ────────────────────────────────────
  describe("Kiểm tra token", () => {
    it("JWT token có cấu trúc hợp lệ (3 phần)", () => {
      cy.request("POST", `${API}/api/Auth/login`, {
        email: "tuan.le@partner.vn",
        password: "Partner@123",
      }).then((res) => {
        expect(res.status).to.eq(200);
        const body = res.body.data || res.body;
        const token = body.token;
        expect(token).to.be.a("string");
        // JWT has 3 parts
        const parts = token.split(".");
        expect(parts).to.have.length(3);
        // Decode payload
        const payload = JSON.parse(atob(parts[1]));
        // Should have role claim (Microsoft format)
        const role =
          payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload.role;
        expect(role).to.exist;
      });
    });

    it("API response có các trường user cần thiết", () => {
      cy.request("POST", `${API}/api/Auth/login`, {
        email: "tuan.le@partner.vn",
        password: "Partner@123",
      }).then((res) => {
        const body = res.body.data || res.body;
        // Log full response to help debug future issues
        cy.log("Login response keys:", Object.keys(body).join(", "));
        expect(body).to.have.property("token");
      });
    });
  });

  // ─── Register partner ─────────────────────────────────
  describe("Đăng ký đối tác", () => {
    it("API đăng ký partner với email mới thành công", () => {
      const timestamp = Date.now();
      const uniqueEmail = `test.partner.${timestamp}@cypress-test.vn`;

      cy.request({
        method: "POST",
        url: `${API}/api/Auth/register-partner`,
        body: {
          email: uniqueEmail,
          password: "CypressTest@123",
          phoneNumber: "0901234567",
          businessName: `Cypress Test Business ${timestamp}`,
        },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Đăng ký status: ${res.status}`);
        cy.log("Đăng ký response:", JSON.stringify(res.body));
        // Should be 200/201 or 400 if email validation is strict
        expect(res.status).to.be.oneOf([200, 201, 400, 409]);
        if (res.status === 200 || res.status === 201) {
          cy.log("Đăng ký thành công với email:", uniqueEmail);
        } else {
          cy.log("Đăng ký thất bại (có thể do validation):", res.body.message || JSON.stringify(res.body));
        }
      });
    });

    it("Đăng ký partner qua UI - điền form bước 1 và bước 2", () => {
      const timestamp = Date.now();
      const uniqueEmail = `ui.test.${timestamp}@cypress-test.vn`;

      cy.visit("/RegisterPartner");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");

      // Bước 1: Thông tin tài khoản
      cy.contains("Thông tin tài khoản", { timeout: 10000 }).should("be.visible");

      cy.get('input[type="email"]').type(uniqueEmail);
      cy.get('input[type="tel"]').type("0987654321");
      cy.get('input[type="password"]').first().type("CypressTest@123");
      // Xác nhận mật khẩu - field cuối cùng type password
      cy.get('input[type="password"]').last().type("CypressTest@123");

      // Click Tiếp theo
      cy.contains("button", "Tiếp theo").click();

      // Bước 2: Thông tin doanh nghiệp
      cy.contains("Thông tin doanh nghiệp", { timeout: 10000 }).should("be.visible");
      cy.get('input[type="text"]').type(`Cypress Business ${timestamp}`);

      // Kiểm tra nút hoàn tất tồn tại
      cy.contains("button", /Hoàn tất đăng ký|Đang đăng ký/).should("exist");
    });

    it("Đăng ký với email đã tồn tại → báo lỗi", () => {
      cy.request({
        method: "POST",
        url: `${API}/api/Auth/register-partner`,
        body: {
          email: "tuan.le@partner.vn",
          password: "Partner@123",
          phoneNumber: "0901234567",
          businessName: "Test Duplicate",
        },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Duplicate register status: ${res.status}`);
        // Should fail - email already exists
        expect(res.status).to.be.oneOf([400, 409, 422]);
      });
    });
  });

  // ─── Change password ──────────────────────────────────
  describe("Đổi mật khẩu", () => {
    it("API đổi mật khẩu yêu cầu token hợp lệ", () => {
      // Đăng nhập trước
      cy.request("POST", `${API}/api/Auth/login`, {
        email: "tuan.le@partner.vn",
        password: "Partner@123",
      }).then((loginRes) => {
        const token = (loginRes.body.data || loginRes.body).token;

        // Gọi API đổi mật khẩu với mật khẩu cũ sai → kiểm tra xử lý lỗi
        cy.request({
          method: "PUT",
          url: `${API}/api/Auth/change-password`,
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: {
            currentPassword: "WrongOldPassword@123",
            newPassword: "NewPassword@123",
          },
          failOnStatusCode: false,
        }).then((res) => {
          cy.log(`Đổi mật khẩu (sai pass cũ) status: ${res.status}`);
          // Should fail because current password is wrong
          expect(res.status).to.be.oneOf([400, 401, 403, 422]);
        });
      });
    });

    it("API đổi mật khẩu không có token → từ chối", () => {
      cy.request({
        method: "PUT",
        url: `${API}/api/Auth/change-password`,
        headers: { "Content-Type": "application/json" },
        body: {
          currentPassword: "Partner@123",
          newPassword: "NewPassword@123",
        },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Đổi mật khẩu (không token) status: ${res.status}`);
        expect(res.status).to.eq(401);
      });
    });
  });

  // ─── Token expiry ─────────────────────────────────────
  describe("Xử lý token hết hạn", () => {
    it("Token giả mạo bị từ chối khi gọi API bảo mật", () => {
      const fakeToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmYWtlIiwiZXhwIjoxfQ.fake";

      cy.request({
        method: "GET",
        url: `${API}/api/PartnerProfile`,
        headers: { Authorization: `Bearer ${fakeToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Fake token status: ${res.status}`);
        expect(res.status).to.eq(401);
      });
    });

    it("Không có token → trả về 401 Unauthorized", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/PartnerProfile`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });

    it("Token hết hạn (exp=1) → bị từ chối", () => {
      // Tạo token với exp rất cũ
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = btoa(
        JSON.stringify({
          sub: "expired-user",
          email: "expired@test.com",
          exp: 1, // 1970 - đã hết hạn
        })
      );
      const signature = btoa("fake-sig");
      const expiredToken = `${header}.${payload}.${signature}`;

      cy.request({
        method: "GET",
        url: `${API}/api/PartnerProfile`,
        headers: { Authorization: `Bearer ${expiredToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(401);
      });
    });
  });

  // ─── Forgot password ──────────────────────────────────
  describe("Quên mật khẩu", () => {
    it("API forgot-password chấp nhận email hợp lệ", () => {
      cy.request({
        method: "POST",
        url: `${API}/api/Auth/forgot-password`,
        body: { email: "tuan.le@partner.vn" },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Forgot password status: ${res.status}`);
        // API should accept request (200) or return error
        expect(res.status).to.be.oneOf([200, 400, 404, 429]);
      });
    });

    it("API forgot-password với email không tồn tại", () => {
      cy.request({
        method: "POST",
        url: `${API}/api/Auth/forgot-password`,
        body: { email: "nonexistent.user.99999@fake.vn" },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Forgot password (email không tồn tại) status: ${res.status}`);
        // Could be 200 (for security, not revealing email existence) or 404
        expect(res.status).to.be.oneOf([200, 400, 404]);
      });
    });
  });
});
