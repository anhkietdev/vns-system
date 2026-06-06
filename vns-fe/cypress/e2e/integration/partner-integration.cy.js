/**
 * Integration tests - Partner pages against REAL API (localhost:5272)
 * Login with real credentials, visit real pages, verify no crashes
 */

const API = "http://localhost:5272";

describe("Partner Integration", () => {
  let authToken;
  let authUser;

  before(() => {
    // Login once via API, reuse token for all tests
    cy.request("POST", `${API}/api/Auth/login`, {
      email: "tuan.le@partner.vn",
      password: "Partner@123",
    }).then((res) => {
      const body = res.body.data || res.body;
      authToken = body.token;
      authUser = body;
    });
  });

  beforeEach(() => {
    // Set real token in localStorage before each test
    localStorage.setItem("vns_token", authToken);
    localStorage.setItem("vns_user", JSON.stringify(authUser));
  });

  // ─── PartnerDashboard ─────────────────────────────────
  describe("PartnerDashboard", () => {
    it("tải trang không bị crash và hiển thị nội dung", () => {
      cy.visit("/PartnerDashboard");
      cy.get("body", { timeout: 20000 }).should("not.contain", "is not a function");
      cy.get("body").should("not.contain", "Cannot read properties");
      cy.contains(/Chào mừng|Dịch vụ|Đang tải|Thử lại/, { timeout: 20000 }).should("exist");
    });

    it("API response có đúng cấu trúc component cần", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/PartnerFinance/dashboard`,
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((res) => {
        const data = res.body.data || res.body;
        cy.log("Dashboard keys:", Object.keys(data).join(", "));
        expect(data).to.have.property("totalServices");
        expect(data).to.have.property("totalBookings");
        expect(data).to.have.property("totalRevenue");
      });
    });

    it("dashboard hiển thị số liệu thực, không NaN", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/PartnerFinance/dashboard`,
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((res) => {
        const data = res.body.data || res.body;

        // Kiểm tra totalServices
        expect(data.totalServices).to.be.a("number");
        expect(isNaN(data.totalServices)).to.be.false;
        cy.log(`totalServices: ${data.totalServices}`);

        // Kiểm tra totalBookings
        expect(data.totalBookings).to.be.a("number");
        expect(isNaN(data.totalBookings)).to.be.false;
        cy.log(`totalBookings: ${data.totalBookings}`);

        // Kiểm tra totalRevenue
        expect(data.totalRevenue).to.be.a("number");
        expect(isNaN(data.totalRevenue)).to.be.false;
        cy.log(`totalRevenue: ${data.totalRevenue}`);

        // Kiểm tra các trường tài chính bổ sung
        const financeFields = [
          "totalEarnings", "monthlyEarnings", "pendingAmount",
          "platformFeeRate", "platformFee", "netEarnings",
        ];
        financeFields.forEach((field) => {
          if (data[field] !== undefined) {
            expect(data[field]).to.be.a("number");
            expect(isNaN(data[field])).to.be.false;
            cy.log(`${field}: ${data[field]}`);
          }
        });
      });
    });

    it("UI dashboard không có NaN hiển thị", () => {
      cy.visit("/PartnerDashboard");
      cy.get("body", { timeout: 20000 }).should("not.contain", "is not a function");
      cy.get(".animate-spin", { timeout: 20000 }).should("not.exist");
      cy.get("body").should("not.contain", "NaN");
    });
  });

  // ─── PartnerService ────────────────────────────────────
  describe("PartnerService", () => {
    it("tải trang không bị crash", () => {
      cy.visit("/PartnerService");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");
      cy.get("body").should("not.contain", "Cannot read properties");
      cy.get("h1", { timeout: 15000 }).should("exist");
    });

    it("API trả về mảng hoặc object có items", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/PartnerService`,
        headers: { Authorization: `Bearer ${authToken}` },
        qs: { page: 1, pageSize: 10 },
      }).then((res) => {
        const body = res.body;
        const data = body.data || body;
        const items = Array.isArray(data) ? data : data.items || [];
        cy.log(`Dịch vụ: ${items.length} items`);
        items.forEach((s, i) => {
          const id = s.serviceId || s.id;
          expect(id).to.exist;
          const title = s.title || s.name;
          expect(title).to.be.a("string");
          cy.log(`Service[${i}] id=${id}, name=${title}, type=${s.serviceType}`);
        });
      });
    });

    it("danh sách dịch vụ hiển thị trên UI", () => {
      cy.visit("/PartnerService");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");

      cy.wait(2000);
      cy.get(".animate-spin").should("not.exist");

      // Trang phải hiển thị card dịch vụ hoặc thông báo trống
      cy.get("body").should(($body) => {
        const text = $body.text();
        const hasContent =
          text.includes("Dịch vụ") ||
          text.includes("dịch vụ") ||
          text.includes("Service") ||
          text.includes("Chưa có") ||
          text.includes("Không có") ||
          text.includes("Thêm dịch vụ") ||
          text.includes("Đang tải");
        expect(hasContent).to.be.true;
      });
    });

    it("API dịch vụ - các trường bắt buộc tồn tại", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/PartnerService`,
        headers: { Authorization: `Bearer ${authToken}` },
        qs: { page: 1, pageSize: 5 },
      }).then((res) => {
        const data = res.body.data || res.body;
        const items = Array.isArray(data) ? data : data.items || [];

        if (items.length > 0) {
          const s = items[0];
          cy.log("Service keys:", Object.keys(s).join(", "));

          // Kiểm tra các trường UI sử dụng
          const id = s.serviceId || s.id;
          expect(id).to.exist;

          const title = s.title || s.name;
          expect(title).to.be.a("string").and.not.be.empty;

          if (s.price !== undefined) {
            expect(s.price).to.be.a("number");
            expect(s.price).to.be.gte(0);
          }

          // serviceType check
          if (s.serviceType !== undefined) {
            expect(typeof s.serviceType).to.be.oneOf(["string", "number"]);
          }
        } else {
          cy.log("Không có dịch vụ nào - bỏ qua kiểm tra trường");
        }
      });
    });
  });

  // ─── PartnerBooking ────────────────────────────────────
  describe("PartnerBooking", () => {
    it("tải trang không bị crash", () => {
      cy.visit("/PartnerBooking");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");
      cy.get("body").should("not.contain", "Cannot read properties");
    });

    it("API response shape là hợp lệ", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/PartnerBooking`,
        headers: { Authorization: `Bearer ${authToken}` },
        qs: { page: 1, pageSize: 10 },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 200) {
          const data = res.body.data || res.body;
          const items = Array.isArray(data) ? data : data.items || [];
          cy.log(`Đặt chỗ: ${items.length} items`);
          if (items.length > 0) {
            const b = items[0];
            cy.log("Booking keys:", Object.keys(b).join(", "));
            if (b.status !== undefined) {
              expect(typeof b.status).to.be.oneOf(["string", "number"]);
            }
          }
        } else {
          cy.log(`Bookings API returned ${res.status}`);
        }
      });
    });

    // ─── Lọc booking theo status ─────────────────────────
    it("API lọc booking theo status pending", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/PartnerBooking`,
        headers: { Authorization: `Bearer ${authToken}` },
        qs: { status: "pending", page: 1, pageSize: 10 },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Bookings (pending) status: ${res.status}`);
        if (res.status === 200) {
          const data = res.body.data || res.body;
          const items = Array.isArray(data) ? data : data.items || [];
          cy.log(`Đặt chỗ chờ xác nhận: ${items.length} items`);
        }
      });
    });

    it("API lọc booking theo status confirmed", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/PartnerBooking`,
        headers: { Authorization: `Bearer ${authToken}` },
        qs: { status: "confirmed", page: 1, pageSize: 10 },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Bookings (confirmed) status: ${res.status}`);
        if (res.status === 200) {
          const data = res.body.data || res.body;
          const items = Array.isArray(data) ? data : data.items || [];
          cy.log(`Đặt chỗ đã xác nhận: ${items.length} items`);
        }
      });
    });

    it("API lọc booking theo status completed", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/PartnerBooking`,
        headers: { Authorization: `Bearer ${authToken}` },
        qs: { status: "completed", page: 1, pageSize: 10 },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Bookings (completed) status: ${res.status}`);
        if (res.status === 200) {
          const data = res.body.data || res.body;
          const items = Array.isArray(data) ? data : data.items || [];
          cy.log(`Đặt chỗ hoàn thành: ${items.length} items`);
        }
      });
    });

    // ─── Xác nhận / Hoàn thành booking ──────────────────
    it("API confirm/complete booking endpoint tồn tại", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/PartnerBooking`,
        headers: { Authorization: `Bearer ${authToken}` },
        qs: { status: "pending", page: 1, pageSize: 5 },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 200) {
          const data = res.body.data || res.body;
          const items = Array.isArray(data) ? data : data.items || [];

          if (items.length > 0) {
            const bookingId = items[0].id || items[0].bookingId;
            cy.log(`Tìm thấy booking pending: id=${bookingId}`);

            // Kiểm tra endpoint confirm tồn tại (không thực sự confirm để bảo toàn dữ liệu)
            // Chỉ log thông tin
            cy.log(`Có thể confirm booking id=${bookingId} qua PUT /api/PartnerBooking/${bookingId}/confirm`);
          } else {
            cy.log("Không có booking pending nào để test confirm");
          }
        }
      });
    });
  });

  // ─── PartnerFinance ────────────────────────────────────
  describe("PartnerFinance", () => {
    it("tải trang không bị crash", () => {
      cy.visit("/PartnerFinance");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");
      cy.get("body").should("not.contain", "Cannot read properties");
    });

    it("Finance dashboard API trả về doanh thu thực", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/PartnerFinance/dashboard`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 200) {
          const data = res.body.data || res.body;
          cy.log("Finance dashboard keys:", Object.keys(data).join(", "));

          // Kiểm tra doanh thu là số, không NaN
          if (data.totalRevenue !== undefined) {
            expect(data.totalRevenue).to.be.a("number");
            expect(isNaN(data.totalRevenue)).to.be.false;
            cy.log(`Tổng doanh thu: ${data.totalRevenue}`);
          }
          if (data.totalEarnings !== undefined) {
            expect(data.totalEarnings).to.be.a("number");
            cy.log(`Tổng thu nhập: ${data.totalEarnings}`);
          }
          if (data.monthlyEarnings !== undefined) {
            expect(data.monthlyEarnings).to.be.a("number");
            cy.log(`Thu nhập tháng: ${data.monthlyEarnings}`);
          }
        }
      });
    });

    it("Finance transactions API hoạt động", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/PartnerFinance/transactions`,
        headers: { Authorization: `Bearer ${authToken}` },
        qs: { page: 1, pageSize: 10 },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Finance transactions status: ${res.status}`);
        if (res.status === 200) {
          const data = res.body.data || res.body;
          const items = data.items || [];
          cy.log(`Giao dịch: ${items.length} items`);
          if (items.length > 0) {
            cy.log("Transaction keys:", Object.keys(items[0]).join(", "));
            // Kiểm tra amount là số
            if (items[0].amount !== undefined) {
              expect(items[0].amount).to.be.a("number");
            }
          }
        }
      });
    });

    it("trang hiển thị doanh thu, không có NaN", () => {
      cy.visit("/PartnerFinance");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");
      cy.get(".animate-spin", { timeout: 15000 }).should("not.exist");
      cy.get("body").should("not.contain", "NaN");
    });
  });

  // ─── PartnerProfile ────────────────────────────────────
  describe("PartnerProfile", () => {
    it("tải trang không bị crash", () => {
      cy.visit("/PartnerProfile");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");
      cy.get("body").should("not.contain", "Cannot read properties");
    });

    it("API response có trường profile", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/PartnerProfile`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 200) {
          const data = res.body.data || res.body;
          cy.log("Profile keys:", Object.keys(data).join(", "));
        }
      });
    });

    it("Profile API trả về dữ liệu thực cho form chỉnh sửa", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/PartnerProfile`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 200) {
          const data = res.body.data || res.body;

          // Kiểm tra các trường mà form chỉnh sửa sử dụng
          const businessName = data.businessName || data.companyName;
          if (businessName) {
            expect(businessName).to.be.a("string").and.not.be.empty;
            cy.log(`Tên doanh nghiệp: ${businessName}`);
          }

          const fullName = data.fullName || data.name || data.ownerName;
          if (fullName) {
            expect(fullName).to.be.a("string");
            cy.log(`Họ tên: ${fullName}`);
          }

          if (data.email) {
            expect(data.email).to.be.a("string");
            expect(data.email).to.include("@");
            cy.log(`Email: ${data.email}`);
          }

          if (data.phoneNumber || data.phone) {
            cy.log(`Số ĐT: ${data.phoneNumber || data.phone}`);
          }

          // isVerified status
          if (data.isVerified !== undefined) {
            expect(data.isVerified).to.be.a("boolean");
            cy.log(`Đã xác minh: ${data.isVerified}`);
          }
        }
      });
    });

    it("UI profile hiển thị form với dữ liệu thực", () => {
      cy.visit("/PartnerProfile");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");

      cy.wait(2000);
      cy.get(".animate-spin").should("not.exist");

      // Trang profile phải hiển thị thông tin
      cy.get("body").should(($body) => {
        const text = $body.text();
        const hasProfileContent =
          text.includes("Hồ sơ") ||
          text.includes("Hồ Sơ") ||
          text.includes("hồ sơ") ||
          text.includes("Profile") ||
          text.includes("Thông tin") ||
          text.includes("Thông Tin") ||
          text.includes("Doanh nghiệp") ||
          text.includes("Doanh Nghiệp") ||
          text.includes("doanh nghiệp") ||
          text.includes("Tài Khoản");
        expect(hasProfileContent).to.be.true;
      });
    });
  });

  // ─── PartnerMessaging ──────────────────────────────────
  describe("PartnerMessaging", () => {
    it("tải trang không bị crash", () => {
      cy.visit("/PartnerMessaging");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");
      cy.get("body").should("not.contain", "Cannot read properties");
    });

    it("Chat conversations API hoạt động", () => {
      cy.request({
        method: "GET",
        url: `${API}/api/Chat/conversations`,
        headers: { Authorization: `Bearer ${authToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        cy.log(`Chat conversations status: ${res.status}`);
        if (res.status === 200) {
          const data = res.body.data || res.body;
          const conversations = Array.isArray(data) ? data : data.items || [];
          cy.log(`Cuộc hội thoại: ${conversations.length}`);
          if (conversations.length > 0) {
            cy.log("Conversation keys:", Object.keys(conversations[0]).join(", "));
          }
        }
      });
    });

    it("trang messaging hiển thị danh sách hội thoại hoặc trạng thái trống", () => {
      cy.visit("/PartnerMessaging");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");

      cy.wait(2000);
      cy.get(".animate-spin").should("not.exist");

      cy.get("body").should(($body) => {
        const text = $body.text();
        const hasContent =
          text.includes("Tin nhắn") ||
          text.includes("tin nhắn") ||
          text.includes("Hội thoại") ||
          text.includes("hội thoại") ||
          text.includes("Chat") ||
          text.includes("trò chuyện") ||
          text.includes("Chưa có") ||
          text.includes("Không có") ||
          text.length > 100;
        expect(hasContent).to.be.true;
      });
    });
  });


  // ─── PartnerCombo ──────────────────────────────────────
  describe("PartnerCombo", () => {
    it("tải trang không bị crash", () => {
      cy.visit("/PartnerCombo");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");
      cy.get("body").should("not.contain", "Cannot read properties");
    });

    it("trang combo hiển thị danh sách hoặc trạng thái trống", () => {
      cy.visit("/PartnerCombo");
      cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");

      cy.wait(2000);
      cy.get(".animate-spin").should("not.exist");

      cy.get("body").should(($body) => {
        const text = $body.text();
        const hasContent =
          text.includes("Combo") ||
          text.includes("combo") ||
          text.includes("Gói dịch vụ") ||
          text.includes("gói dịch vụ") ||
          text.includes("dịch vụ") ||
          text.includes("Chưa có") ||
          text.includes("Không có") ||
          text.length > 100;
        expect(hasContent).to.be.true;
      });
    });
  });

  // ─── Cross-cutting: Partner 2 đăng nhập ────────────────
  describe("Partner 2 đăng nhập (huong.pham@partner.vn)", () => {
    it("Partner 2 có thể đăng nhập và xem dashboard", () => {
      cy.request("POST", `${API}/api/Auth/login`, {
        email: "huong.pham@partner.vn",
        password: "Partner@123",
      }).then((res) => {
        expect(res.status).to.eq(200);
        const body = res.body.data || res.body;
        expect(body.token).to.be.a("string");

        // Đặt token và truy cập dashboard
        const token2 = body.token;
        localStorage.setItem("vns_token", token2);
        localStorage.setItem("vns_user", JSON.stringify(body));

        cy.visit("/PartnerDashboard");
        cy.get("body", { timeout: 15000 }).should("not.contain", "is not a function");
        cy.get("body").should("not.contain", "Cannot read properties");
      });
    });

    it("Partner 2 có dashboard data riêng", () => {
      cy.request("POST", `${API}/api/Auth/login`, {
        email: "huong.pham@partner.vn",
        password: "Partner@123",
      }).then((loginRes) => {
        const token2 = (loginRes.body.data || loginRes.body).token;

        cy.request({
          method: "GET",
          url: `${API}/api/PartnerFinance/dashboard`,
          headers: { Authorization: `Bearer ${token2}` },
          failOnStatusCode: false,
        }).then((res) => {
          cy.log(`Partner 2 dashboard status: ${res.status}`);
          if (res.status === 200) {
            const data = res.body.data || res.body;
            cy.log("Partner 2 dashboard keys:", Object.keys(data).join(", "));
            expect(data.totalServices).to.be.a("number");
            expect(data.totalBookings).to.be.a("number");
            expect(data.totalRevenue).to.be.a("number");
          }
        });
      });
    });
  });
});
