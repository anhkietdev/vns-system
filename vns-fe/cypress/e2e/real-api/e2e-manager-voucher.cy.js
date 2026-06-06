/// <reference types="cypress" />
/**
 * E2E Test — Manager Voucher CRUD + Partner Verify
 */

const API = Cypress.env("apiUrl") || "http://localhost:5272";

describe("E2E: Manager — Voucher CRUD", () => {
  beforeEach(() => {
    cy.request("POST", `${API}/api/Auth/login`, { email: "manager@vns.vn", password: "Manager@123" }).then((res) => {
      const data = res.body.data;
      localStorage.setItem("vns_token", data.token);
      localStorage.setItem("vns_user", JSON.stringify({ token: data.token, user: data.user, role: "Manager" }));
    });
  });

  it("Tạo voucher — name phải persist (không chỉ code)", () => {
    cy.visit("/ManagerPromotion");
    cy.contains("Tạo khuyến mãi").click();

    // Điền form
    cy.url().should("include", "/create");
    cy.get("input").eq(0).type("Voucher E2E Test"); // name
    cy.get("input").eq(1).type("CYTEST_E2E"); // code
    // Fill required fields...

    // Verify trên API rằng name persist
    cy.request({
      method: "POST", url: `${API}/api/AdminVoucher`,
      headers: { Authorization: `Bearer ${localStorage.getItem("vns_token")}` },
      body: { code: "CYE2E_MGR", name: "Manager E2E Voucher", voucherType: 0, discountValue: 15, totalQuantity: 50, startDate: "2026-04-01T00:00:00", endDate: "2026-06-01T00:00:00" },
    }).then((res) => {
      expect(res.body.data.id).to.exist;
      const vid = res.body.data.id;

      // GET list — verify name
      cy.request({ url: `${API}/api/AdminVoucher`, headers: { Authorization: `Bearer ${localStorage.getItem("vns_token")}` } }).then((listRes) => {
        const v = listRes.body.data.items.find((i) => i.id === vid);
        expect(v.name).to.eq("Manager E2E Voucher"); // BUG CATCH: name persist

        // Update name
        cy.request({ method: "PUT", url: `${API}/api/AdminVoucher/${vid}`, headers: { Authorization: `Bearer ${localStorage.getItem("vns_token")}` }, body: { name: "Updated E2E" } });
        cy.request({ url: `${API}/api/AdminVoucher`, headers: { Authorization: `Bearer ${localStorage.getItem("vns_token")}` } }).then((r2) => {
          expect(r2.body.data.items.find((i) => i.id === vid).name).to.eq("Updated E2E");
        });

        // Delete — hard delete
        cy.request({ method: "DELETE", url: `${API}/api/AdminVoucher/${vid}`, headers: { Authorization: `Bearer ${localStorage.getItem("vns_token")}` } });
        cy.request({ url: `${API}/api/AdminVoucher`, headers: { Authorization: `Bearer ${localStorage.getItem("vns_token")}` } }).then((r3) => {
          expect(r3.body.data.items.find((i) => i.id === vid)).to.be.undefined; // BUG CATCH
        });
      });
    });
  });

  it("Service Approval — hiển thị đầy đủ detail khi click", () => {
    cy.visit("/ManagerServiceApproval");

    // Phải có danh sách services (không chỉ pending)
    cy.get("body").then(($body) => {
      if ($body.text().includes("Không có dịch vụ")) return; // skip if empty

      // Click service đầu tiên
      cy.get(".space-y-3 > button").first().click();

      // Verify chi tiết panel hiển thị
      cy.contains("Chi tiết dịch vụ").should("exist");
      cy.contains("Mô tả").should("exist");
      cy.contains("Đối tác").should("exist");
      cy.contains("Điểm đến").should("exist");

      // Nếu là tour phải có thông tin tour
      cy.get("body").then(($detail) => {
        if ($detail.text().includes("Thông tin Tour")) {
          cy.contains("Thời lượng").should("exist");
          cy.contains("Số người").should("exist");
        }
        if ($detail.text().includes("Thông tin Homestay")) {
          cy.contains("Nhận phòng").should("exist");
          cy.contains("Trả phòng").should("exist");
        }
      });
    });
  });
});

describe("E2E: Manager — Partner Verification", () => {
  it("Verify partner gửi đúng body {isApproved: true}", () => {
    // Intercept để capture request body
    cy.intercept("PUT", `${API}/api/AdminPartner/*/verify`).as("verifyReq");

    cy.request("POST", `${API}/api/Auth/login`, { email: "manager@vns.vn", password: "Manager@123" }).then((res) => {
      const data = res.body.data;
      localStorage.setItem("vns_token", data.token);
      localStorage.setItem("vns_user", JSON.stringify({ token: data.token, user: data.user, role: "Manager" }));
    });

    cy.visit("/ManagerAccountManagement");

    cy.get("body").then(($body) => {
      if ($body.text().includes("Không có đối tác")) return;

      // Click Xem Chi Tiết
      cy.contains("Xem Chi Tiết").first().click();

      // Nếu có nút Phê Duyệt
      cy.get("body").then(($detail) => {
        if ($detail.find("button:contains('Phê Duyệt')").length > 0) {
          cy.contains("Phê Duyệt").click();

          // Verify request body
          cy.wait("@verifyReq").then((interception) => {
            const body = interception.request.body;
            expect(body).to.have.property("isApproved", true); // BUG CATCH: phải là isApproved, KHÔNG PHẢI status
            expect(body).to.not.have.property("status"); // Không được gửi status
          });
        }
      });
    });
  });
});
