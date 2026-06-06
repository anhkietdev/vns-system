/// <reference types="cypress" />
/**
 * Combo Logic Test — Kiểm tra combo có đúng nghiệp vụ theo CLAUDE.md không
 *
 * CLAUDE.md yêu cầu: "Quản lý dịch vụ (tour, phòng, combo)"
 * Combo = gói kết hợp nhiều dịch vụ (tour + homestay + activity)
 */

const API = Cypress.env("apiUrl") || "http://localhost:5272";

describe("Combo Logic — Kiểm tra theo CLAUDE.md", () => {
  let partnerToken;

  before(() => {
    cy.request("POST", `${API}/api/Auth/login`, { email: "tuan.le@partner.vn", password: "Partner@123" })
      .then((res) => { partnerToken = res.body.data.token; });
  });

  it("Backend: ServiceType enum KHÔNG có Combo (thiếu)", () => {
    // ServiceType: 0=Homestay, 1=Tour, 2=Activity — không có 3=Combo
    // Đây là GAP so với CLAUDE.md
    cy.request(`${API}/api/Service`).then((res) => {
      const items = res.body.data.items || res.body.data;
      const types = [...new Set(items.map((s) => s.serviceType))];
      cy.log(`ServiceTypes found: ${JSON.stringify(types)}`);
      // Chỉ có 0, 1, 2 — không có 3 (Combo)
      expect(types.every((t) => t <= 2)).to.be.true;
    });
  });

  it("PartnerCombo page: hiện tại chỉ list services giống PartnerService", () => {
    cy.request({
      url: `${API}/api/PartnerService`,
      headers: { Authorization: `Bearer ${partnerToken}` },
    }).then((res) => {
      const items = res.body.data.items || res.body.data || [];
      // PartnerCombo gọi cùng API getOwnServices — trả tất cả services
      // Không có filter combo riêng
      cy.log(`PartnerService trả ${items.length} services`);
      // Mỗi item KHÔNG có field "includedServices" hay "comboItems"
      items.forEach((s) => {
        expect(s).to.not.have.property("includedServices");
        expect(s).to.not.have.property("comboItems");
      });
    });
  });

  it("API: Không có endpoint tạo combo (kết hợp nhiều service)", () => {
    // Thử gọi endpoint combo — expected 404
    cy.request({
      url: `${API}/api/PartnerService/combo`,
      method: "POST",
      headers: { Authorization: `Bearer ${partnerToken}` },
      body: { name: "Test Combo", serviceIds: [] },
      failOnStatusCode: false,
    }).then((res) => {
      // Endpoint không tồn tại
      expect(res.status).to.be.oneOf([404, 405, 400]);
    });
  });

  it("Frontend mapping: PartnerCombo dùng đúng API fields", () => {
    // Verify mapping không bị crash khi render
    cy.request({
      url: `${API}/api/PartnerService`,
      headers: { Authorization: `Bearer ${partnerToken}` },
    }).then((res) => {
      const items = res.body.data.items || res.body.data || [];
      items.forEach((s) => {
        // Fields mà PartnerCombo cần — phải tồn tại
        expect(s).to.have.property("id");
        expect(s).to.have.property("name"); // NOT "title"
        expect(s).to.have.property("basePrice"); // NOT "originalPrice"
        expect(s).to.have.property("serviceType");
        expect(s.serviceType).to.be.a("number");
        // discountPrice có thể null — OK
        // thumbnailUrl có thể null — OK
        // destinationName có thể undefined cho service mới — OK
      });
    });
  });

  it("Delete combo (service): hard delete, verify biến mất", () => {
    // Tạo service test
    cy.request(`${API}/api/Destination`).then((destRes) => {
      const destId = (destRes.body.data.items || destRes.body.data)[0].id;
      cy.request({
        method: "POST",
        url: `${API}/api/PartnerService/tour`,
        headers: { Authorization: `Bearer ${partnerToken}` },
        body: { name: "CY Combo Delete Test", destinationId: destId, basePrice: 100, duration: "1h", maxParticipants: 5, minParticipants: 1, schedules: [], itineraries: [] },
      }).then((createRes) => {
        const svcId = createRes.body.data.serviceId;

        // Delete
        cy.request({
          method: "DELETE",
          url: `${API}/api/PartnerService/${svcId}`,
          headers: { Authorization: `Bearer ${partnerToken}` },
        }).then((delRes) => {
          expect(delRes.status).to.eq(200);
        });

        // Verify biến mất
        cy.request({
          url: `${API}/api/PartnerService/${svcId}`,
          headers: { Authorization: `Bearer ${partnerToken}` },
          failOnStatusCode: false,
        }).then((getRes) => {
          expect(getRes.status).to.be.oneOf([404, 500]);
        });
      });
    });
  });
});

/**
 * BÁO CÁO GAP — Combo vs CLAUDE.md
 *
 * CLAUDE.md yêu cầu: "Quản lý dịch vụ (tour, phòng, combo)"
 *
 * ❌ Backend THIẾU:
 *   - Không có ServiceType.Combo trong enum
 *   - Không có Combo entity (kết hợp nhiều serviceIds)
 *   - Không có API tạo/quản lý combo riêng
 *
 * ⚠️ Frontend WORKAROUND:
 *   - PartnerCombo hiện list tất cả services giống PartnerService
 *   - Không có logic kết hợp nhiều service thành 1 combo
 *   - Mapping đã fix đúng (name, basePrice, destinationName)
 *
 * ✅ CẦN TRIỂN KHAI để đúng nghiệp vụ:
 *   1. Thêm Combo entity: { id, name, description, serviceIds[], totalPrice, discountPrice }
 *   2. Thêm API: POST /api/PartnerService/combo, GET /api/Combo
 *   3. PartnerCombo page: chọn services → tạo combo → set giá combo
 */
