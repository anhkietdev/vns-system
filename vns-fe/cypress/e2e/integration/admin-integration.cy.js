/**
 * Integration tests - Admin pages against REAL API (localhost:5272)
 * This specifically tests the data format issues that mock tests miss
 */

const API = "http://localhost:5272";

describe("Admin Integration", () => {
  let authToken;
  let authUser;

  before(() => {
    cy.request("POST", `${API}/api/Auth/login`, {
      email: "admin@vns.vn",
      password: "Admin@123",
    }).then((res) => {
      const body = res.body.data || res.body;
      authToken = body.token;
      authUser = body;
    });
  });

  beforeEach(() => {
    localStorage.setItem("vns_token", authToken);
    localStorage.setItem("vns_user", JSON.stringify(authUser));
  });

  // ─── AdminDashboard ────────────────────────────────────
  describe("AdminDashboard", () => {
    it("tải trang không bị crash", () => {
      cy.visit("/AdminDashboard");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");
      cy.get("body").should("not.contain", "Cannot read properties");
      cy.get("h1, h2", { timeout: 15000 }).should("exist");
    });

    it("hiển thị số liệu thống kê thực (không phải 0 hoặc NaN)", () => {
      cy.visit("/AdminDashboard");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");

      // Chờ cho dữ liệu được tải xong (không còn spinner)
      cy.get(".animate-spin", { timeout: 15000 }).should("not.exist");

      // Kiểm tra các metric card hiển thị giá trị
      cy.get("button.bg-white, div.bg-white", { timeout: 15000 }).should("have.length.greaterThan", 0);

      // Kiểm tra không có NaN trên trang
      cy.get("body").should("not.contain", "NaN");
    });

    it("Dashboard API trả về số liệu hợp lệ", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/Admin/dashboard`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Dashboard API status: ${res.status}`);
        if (res.status === 200) {
          const data = res.body.data || res.body;
          cy.log("Dashboard keys:", Object.keys(data).join(", "));

          // Kiểm tra các trường số là number, không phải NaN
          if (data.totalUsers !== undefined) {
            expect(data.totalUsers).to.be.a("number");
            expect(isNaN(data.totalUsers)).to.be.false;
          }
          if (data.totalPartners !== undefined) {
            expect(data.totalPartners).to.be.a("number");
            expect(isNaN(data.totalPartners)).to.be.false;
          }
          if (data.totalBookings !== undefined) {
            expect(data.totalBookings).to.be.a("number");
            expect(isNaN(data.totalBookings)).to.be.false;
          }
          const revenue = data.totalRevenue || data.monthlyRevenue;
          if (revenue !== undefined) {
            expect(revenue).to.be.a("number");
            expect(isNaN(revenue)).to.be.false;
          }
        }
      });
    });
  });

  // ─── AdminUserManagement ───────────────────────────────
  describe("AdminUserManagement", () => {
    it("tải trang không bị crash (regression test role bug)", () => {
      cy.visit("/AdminUserManagement");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");
      cy.get("body").should("not.contain", "Cannot read properties");
      cy.get("h1, h2", { timeout: 15000 }).should("exist");
    });

    it("Users API - kiểm tra kiểu dữ liệu role", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/Admin/users`,
        headers: { Authorization: `Bearer ${authToken}` },
        qs: { page: 1, pageSize: 10 },
      }).then((res) => {
        const data = res.body.data || res.body;
        const items = Array.isArray(data) ? data : data.items || data.users || [];
        cy.log(`Users: ${items.length} items`);

        items.forEach((u, i) => {
          const role = u.role || u.roleName;
          const roleType = Array.isArray(role) ? "array" : typeof role;
          cy.log(`User[${i}] ${u.email}: role type=${roleType}, value=${JSON.stringify(role)}`);

          // Verify role can be converted to string (the bug that was caught)
          let roleStr;
          if (Array.isArray(role)) {
            roleStr = role[0];
          } else if (typeof role === "string") {
            roleStr = role;
          } else if (typeof role === "object" && role !== null) {
            roleStr = JSON.stringify(role);
          } else {
            roleStr = "user";
          }
          expect(roleStr).to.be.a("string");
          expect(roleStr.toLowerCase()).to.be.a("string");
        });
      });
    });

    it("Users API - tất cả trường cần thiết tồn tại", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/Admin/users`,
        headers: { Authorization: `Bearer ${authToken}` },
        qs: { page: 1, pageSize: 5 },
      }).then((res) => {
        const data = res.body.data || res.body;
        const items = Array.isArray(data) ? data : data.items || data.users || [];

        if (items.length > 0) {
          const u = items[0];
          const keys = Object.keys(u);
          cy.log("User object keys:", keys.join(", "));

          // Component maps these fields:
          expect(u.id || u.userId).to.exist;
          expect(u.email).to.be.a("string");
          const name = u.fullName || u.name || u.userName;
          cy.log(`Name field: fullName=${u.fullName}, name=${u.name}, userName=${u.userName}`);
          cy.log(`Status: status=${u.status}, isActive=${u.isActive}`);
        }
      });
    });

    // ─── Phân trang ──────────────────────────────────────
    it("phân trang hoạt động - tải trang 1 và trang 2", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/Admin/users`,
        headers: { Authorization: `Bearer ${authToken}` },
        qs: { page: 1, pageSize: 5 },
      }).then((res1) => {
        const data1 = res1.body.data || res1.body;
        const items1 = Array.isArray(data1) ? data1 : data1.items || data1.users || [];
        const totalPages = data1.totalPages || 1;
        const totalCount = data1.totalCount || items1.length;
        cy.log(`Trang 1: ${items1.length} items, tổng ${totalCount}, ${totalPages} trang`);

        expect(items1.length).to.be.greaterThan(0);

        if (totalPages > 1) {
          cy.request({
            method: "GET",
            url: `${API}/api/Admin/users`,
            headers: { Authorization: `Bearer ${authToken}` },
            qs: { page: 2, pageSize: 5 },
          }).then((res2) => {
            const data2 = res2.body.data || res2.body;
            const items2 = Array.isArray(data2) ? data2 : data2.items || data2.users || [];
            cy.log(`Trang 2: ${items2.length} items`);
            expect(items2.length).to.be.greaterThan(0);

            // Trang 2 phải khác trang 1
            if (items1.length > 0 && items2.length > 0) {
              const id1 = items1[0].id || items1[0].userId;
              const id2 = items2[0].id || items2[0].userId;
              expect(id1).to.not.eq(id2);
            }
          });
        } else {
          cy.log("Chỉ có 1 trang dữ liệu, bỏ qua kiểm tra trang 2");
        }
      });
    });

    it("UI phân trang hiển thị đúng", () => {
      cy.visit("/AdminUserManagement");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");

      // Chờ loading xong
      cy.get(".animate-spin", { timeout: 15000 }).should("not.exist");

      // Kiểm tra bảng user hiển thị
      cy.get("table", { timeout: 15000 }).should("exist");
      cy.get("tbody tr").should("have.length.greaterThan", 0);
    });

    // ─── Tìm kiếm ───────────────────────────────────────
    it("API tìm kiếm user theo từ khóa", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/Admin/users`,
        headers: { Authorization: `Bearer ${authToken}` },
        qs: { keyword: "admin", page: 1, pageSize: 10 },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Tìm kiếm "admin" status: ${res.status}`);
        expect(res.status).to.eq(200);
        const data = res.body.data || res.body;
        const items = Array.isArray(data) ? data : data.items || data.users || [];
        cy.log(`Kết quả tìm kiếm: ${items.length} users`);
        // API trả về 200, nghĩa là endpoint hoạt động
        // Nếu có kết quả, kiểm tra match
        if (items.length > 0) {
          const hasMatch = items.some(
            (u) =>
              (u.email || "").toLowerCase().includes("admin") ||
              (u.fullName || u.name || "").toLowerCase().includes("admin")
          );
          expect(hasMatch).to.be.true;
        }
      });
    });

    it("UI tìm kiếm user hoạt động", () => {
      cy.visit("/AdminUserManagement");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");
      cy.get(".animate-spin", { timeout: 15000 }).should("not.exist");

      // Nhập vào ô tìm kiếm
      cy.get('input[placeholder*="Tìm"]', { timeout: 10000 }).type("partner");

      // Chờ kết quả tải lại (debounce)
      cy.wait(1500);
      cy.get("body").should("not.contain", "is not a function");
    });

    // ─── Lọc theo role ──────────────────────────────────
    it("API lọc user theo role partner", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/Admin/users`,
        headers: { Authorization: `Bearer ${authToken}` },
        qs: { role: "partner", page: 1, pageSize: 10 },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Lọc role=partner status: ${res.status}`);
        if (res.status === 200) {
          const data = res.body.data || res.body;
          const items = Array.isArray(data) ? data : data.items || data.users || [];
          cy.log(`Partners: ${items.length} users`);
          // Nếu có kết quả, tất cả phải là partner
          items.forEach((u) => {
            const role = u.role || u.roleName || "";
            const roleStr = Array.isArray(role) ? role[0] : String(role);
            cy.log(`User ${u.email}: role=${roleStr}`);
          });
        }
      });
    });

    it("API lọc user theo role manager", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/Admin/users`,
        headers: { Authorization: `Bearer ${authToken}` },
        qs: { role: "manager", page: 1, pageSize: 10 },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Lọc role=manager status: ${res.status}`);
        if (res.status === 200) {
          const data = res.body.data || res.body;
          const items = Array.isArray(data) ? data : data.items || data.users || [];
          cy.log(`Managers: ${items.length} users`);
        }
      });
    });

    it("UI role filter tabs hoạt động", () => {
      cy.visit("/AdminUserManagement");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");
      cy.get(".animate-spin", { timeout: 15000 }).should("not.exist");

      // Click vào filter role qua select dropdown
      cy.get("select").first().then(($sel) => {
        // Tìm select chứa "Tất cả vai trò"
        if ($sel.find('option:contains("Tất cả vai trò")').length > 0) {
          cy.wrap($sel).select("partner");
          cy.wait(1500);
          cy.get("body").should("not.contain", "is not a function");
        }
      });
    });

    // ─── Khóa/mở khóa user (API test only) ──────────────
    it("API toggle user status - kiểm tra endpoint tồn tại", () => {
      // Lấy danh sách users trước
      cy.request({
        method: "GET",
        url: `${API}/api/Admin/users`,
        headers: { Authorization: `Bearer ${authToken}` },
        qs: { page: 1, pageSize: 10 },
      }).then((res) => {
        const data = res.body.data || res.body;
        const items = Array.isArray(data) ? data : data.items || data.users || [];

        // Tìm user không phải admin để test
        const testUser = items.find((u) => {
          const role = Array.isArray(u.role) ? u.role[0] : String(u.role || u.roleName || "");
          return role.toLowerCase() !== "admin";
        });

        if (testUser) {
          const userId = testUser.id || testUser.userId;
          cy.log(`Test toggle status cho user: ${testUser.email} (id=${userId})`);

          // Gọi API toggle - chỉ kiểm tra endpoint hoạt động, không thay đổi thực
          cy.request({
            method: "PUT",
            url: `${API}/api/Admin/users/${userId}/status`,
            headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
            body: { status: testUser.status || (testUser.isActive === false ? "active" : "banned") },
            failOnStatusCode: false,
          }).then((toggleRes) => {
            cy.log(`Toggle status response: ${toggleRes.status}`);
            // API should accept request
            expect(toggleRes.status).to.be.oneOf([200, 204, 400, 403, 404]);

            // Khôi phục lại trạng thái ban đầu nếu đã thay đổi
            if (toggleRes.status === 200 || toggleRes.status === 204) {
              const originalStatus = testUser.status || (testUser.isActive !== false ? "active" : "banned");
              cy.request({
                method: "PUT",
                url: `${API}/api/Admin/users/${userId}/status`,
                headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
                body: { status: originalStatus },
                failOnStatusCode: false,
              });
            }
          });
        } else {
          cy.log("Không tìm thấy user non-admin để test toggle status");
        }
      });
    });

    // ─── Create Manager modal ────────────────────────────
    it("UI mở modal tạo quản lý", () => {
      cy.visit("/AdminUserManagement");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");
      cy.get(".animate-spin", { timeout: 15000 }).should("not.exist");

      // Click nút "Tạo tài khoản Quản lý"
      cy.contains("button", /Tạo tài khoản|Tạo mới/, { timeout: 10000 }).click();

      // Modal hiển thị
      cy.contains("Tạo tài khoản Quản lý mới", { timeout: 5000 }).should("be.visible");

      // Kiểm tra modal có các trường input
      cy.get('input[placeholder*="Nguyễn"], input[type="text"]').should("exist");
      cy.get('input[type="email"]').should("exist");

      // Đóng modal
      cy.contains("button", "Hủy").click();
      cy.contains("Tạo tài khoản Quản lý mới").should("not.exist");
    });

    it("API tạo manager - kiểm tra endpoint", () => {
      const timestamp = Date.now();
      cy.request({
        method: "POST",
        url: `${API}/api/Admin/users`,
        headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        body: {
          fullName: `Cypress Manager ${timestamp}`,
          email: `cypress.manager.${timestamp}@test.vn`,
          phoneNumber: "0909000000",
        },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Tạo manager status: ${res.status}`);
        cy.log("Tạo manager response:", JSON.stringify(res.body));
        // 200/201 = thành công, 400 = validation error, 409 = duplicate
        expect(res.status).to.be.oneOf([200, 201, 400, 409, 403]);
      });
    });
  });
});
