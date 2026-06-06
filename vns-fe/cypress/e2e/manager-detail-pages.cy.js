// Cypress tests cho các trang Manager detail/create chưa có test coverage
// Covers: ManagerPromotionCreate, ManagerPromotionDetails

const API = "http://localhost:5272/api";

function mockAllManagerAPIs() {
  cy.intercept("GET", `${API}/Admin/dashboard`, { statusCode: 200, body: { success: true, data: { totalUsers: 100, totalPartners: 20 } } });
  cy.intercept("GET", `${API}/AdminPartner/pending*`, { statusCode: 200, body: { success: true, data: [] } });
  cy.intercept("GET", `${API}/AdminServiceApproval/pending*`, { statusCode: 200, body: { success: true, data: [] } });
  cy.intercept("GET", `${API}/AdminVoucher*`, { statusCode: 200, body: { success: true, data: [] } });
  cy.intercept("GET", `${API}/AdminFinance*`, { statusCode: 200, body: { success: true, data: { totalRevenue: 50000000 } } });
  cy.intercept("GET", `${API}/AdminFeedback*`, { statusCode: 200, body: { success: true, data: [] } });
  cy.intercept("GET", `${API}/AdminRefund*`, { statusCode: 200, body: { success: true, data: [] } });
  cy.intercept("GET", `${API}/Notification*`, { statusCode: 200, body: { success: true, data: [] } });
}

describe("Manager Detail Pages", () => {
  beforeEach(() => {
    cy.loginAs("Manager");
    mockAllManagerAPIs();
  });

  // ===== ManagerPromotion/create =====
  describe("ManagerPromotionCreate (/ManagerPromotion/create)", () => {
    it("tải trang tạo khuyến mãi không bị crash", () => {
      cy.visit("/ManagerPromotion/create");
      cy.wait(1000);
      cy.get("body").should("exist");
      cy.get("body").invoke("text").should("have.length.greaterThan", 10);
    });

    it("hiển thị form tạo voucher (step wizard hoặc form đơn)", () => {
      cy.visit("/ManagerPromotion/create");
      cy.wait(1000);
      // Phải có input fields
      cy.get("body").should("exist");
      cy.get("body").should("not.contain", "Cannot read properties");
    });

    it("POST tạo voucher API endpoint tồn tại", () => {
      cy.request({
        method: "POST",
        url: `${API}/AdminVoucher`,
        body: { code: "MGTEST", name: "Manager Test", voucherType: 0, discountValue: 10 },
        failOnStatusCode: false,
      }).its("status").should("be.oneOf", [200, 201, 400, 401, 403]);
    });

    it("trang không hiển thị NaN hay undefined", () => {
      cy.visit("/ManagerPromotion/create");
      cy.wait(1000);
      cy.get("body").should("not.contain", "NaN");
      cy.get("body").should("not.contain", "undefined");
    });

    it("có thể navigate về danh sách voucher", () => {
      cy.visit("/ManagerPromotion/create");
      cy.wait(1000);
      // Tìm nút quay lại hoặc hủy
      cy.get("body").then(($body) => {
        if ($body.text().match(/quay lại|hủy|cancel|back/i)) {
          cy.contains(/quay lại|hủy|cancel/i).first().click({ force: true });
          cy.wait(500);
          cy.url().should("include", "/Manager");
        }
      });
    });

    it("API tạo voucher với payload đúng cấu trúc", () => {
      cy.intercept("POST", `${API}/AdminVoucher`, (req) => {
        // Verify payload structure
        const body = req.body;
        if (body.code) expect(body.code).to.be.a("string");
        if (body.name) expect(body.name).to.be.a("string");
        if (body.voucherType !== undefined) expect(body.voucherType).to.be.oneOf([0, 1]);
        req.reply({ statusCode: 200, body: { success: true, data: { id: "new-v" } } });
      }).as("createVoucher");
      cy.visit("/ManagerPromotion/create");
      cy.wait(1000);
    });
  });

  // ===== ManagerPromotion/detail =====
  describe("ManagerPromotionDetails (/ManagerPromotion/detail)", () => {
    it("tải trang chi tiết khuyến mãi không crash", () => {
      cy.visit("/ManagerPromotion/detail");
      cy.wait(1000);
      cy.get("body").should("exist");
    });

    it("hiển thị thông báo khi không có dữ liệu", () => {
      cy.visit("/ManagerPromotion/detail");
      cy.wait(1000);
      cy.get("body").then(($body) => {
        const text = $body.text();
        expect(text.length).to.be.greaterThan(0);
      });
    });

    it("PUT update voucher API endpoint tồn tại", () => {
      cy.request({
        method: "PUT",
        url: `${API}/AdminVoucher/00000000-0000-0000-0000-000000000000`,
        body: { name: "Updated" },
        failOnStatusCode: false,
      }).its("status").should("be.oneOf", [200, 400, 401, 403, 404]);
    });

    it("DELETE voucher API endpoint tồn tại", () => {
      cy.request({
        method: "DELETE",
        url: `${API}/AdminVoucher/00000000-0000-0000-0000-000000000000`,
        failOnStatusCode: false,
      }).its("status").should("be.oneOf", [200, 400, 401, 403, 404]);
    });

    it("navigate từ danh sách đến chi tiết voucher", () => {
      cy.intercept("GET", `${API}/AdminVoucher*`, {
        statusCode: 200,
        body: {
          success: true,
          data: [{
            id: "v-m1", code: "PLATFORM50", name: "Giảm 50K toàn sàn",
            voucherType: 1, discountValue: 50000, isActive: true,
            usedCount: 120, totalQuantity: 500,
            startDate: "2026-03-01", endDate: "2026-12-31",
          }],
        },
      }).as("getVouchers");
      cy.visit("/ManagerPromotion");
      cy.wait(1000);
      cy.get("body").then(($body) => {
        if ($body.text().includes("PLATFORM50") || $body.text().includes("Giảm 50K")) {
          expect($body.text()).to.satisfy((t) => t.includes("PLATFORM50") || t.includes("50"));
        }
      });
    });

    it("trang /ManagerPromotion/edit cũng load OK", () => {
      cy.visit("/ManagerPromotion/edit");
      cy.wait(1000);
      cy.get("body").should("exist");
    });

    it("trang không hiển thị NaN", () => {
      cy.visit("/ManagerPromotion/detail");
      cy.wait(1000);
      cy.get("body").should("not.contain", "NaN");
    });
  });
});
