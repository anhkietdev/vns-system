/// <reference types="cypress" />
/**
 * E2E Test — Partner tour detail uses package-first read-only flow
 */

const API = Cypress.env("apiUrl") || "http://localhost:5272";

describe("E2E: Partner Tour Package Detail", () => {
  beforeEach(() => {
    cy.request("POST", `${API}/api/Auth/login`, {
      email: "tuan.le@partner.vn",
      password: "Partner@123",
    }).then((res) => {
      const data = res.body.data;
      localStorage.setItem("vns_token", data.token);
      localStorage.setItem(
        "vns_user",
        JSON.stringify({ token: data.token, user: data.user, role: "Partner" }),
      );
    });
  });

  it("Danh sách dịch vụ hiển thị tour seed với giá base từ pricing tier rẻ nhất", () => {
    cy.visit("/PartnerService");

    cy.contains("Tour du thuyền Vịnh Hạ Long 2 ngày 1 đêm").should("exist");
    cy.contains("2.590.000").should("exist");
  });

  it("Chi tiết tour render package cards với pricing tiers, itinerary, sessions và images", () => {
    cy.visit("/PartnerService");
    cy.contains("Tour du thuyền Vịnh Hạ Long 2 ngày 1 đêm").click();

    cy.contains("Tour du thuyền Vịnh Hạ Long 2 ngày 1 đêm").should("exist");
    cy.contains("Hạ Long").should("exist");
    cy.contains("Tổng đặt chỗ").should("exist");

    cy.contains("Gói tour").click();
    cy.contains("Gói tiêu chuẩn - Cabin Deluxe").should("exist");
    cy.contains("Gói cao cấp - Cabin Balcony").should("exist");
    cy.contains("Người lớn").should("exist");
    cy.contains("Trẻ em").should("exist");
    cy.contains("Đón khách và check-in du thuyền").should("exist");
    cy.contains("Slot còn").should("exist");
    cy.get("img").should("have.length.greaterThan", 0);
  });

  it("Tour detail là read-only trong phase này", () => {
    cy.visit("/PartnerService");
    cy.contains("Tour ẩm thực đường phố Hà Nội").click();

    cy.contains("Gói tour").click();
    cy.contains("Chỉnh sửa").should("not.exist");
  });
});
