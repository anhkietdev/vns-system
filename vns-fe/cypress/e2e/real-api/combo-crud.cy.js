/// <reference types="cypress" />
/**
 * Combo CRUD Test — Real backend
 * Test full flow: Create → Read → Update → Delete → Verify
 */

const API = Cypress.env("apiUrl") || "http://localhost:5272";

describe("Combo CRUD — Real Backend", () => {
  let partnerToken, serviceIds = [], comboId;

  before(() => {
    cy.request("POST", `${API}/api/Auth/login`, { email: "tuan.le@partner.vn", password: "Partner@123" })
      .then((res) => { partnerToken = res.body.data.token; });
  });

  it("Lấy ít nhất 2 services của partner", () => {
    cy.request({
      url: `${API}/api/PartnerService`,
      headers: { Authorization: `Bearer ${partnerToken}` },
    }).then((res) => {
      const items = res.body.data.items || res.body.data;
      expect(items.length).to.be.greaterThan(1);
      serviceIds = items.slice(0, 2).map((s) => s.id);
    });
  });

  it("POST /api/PartnerCombo — tạo combo từ 2 services", () => {
    cy.request({
      method: "POST",
      url: `${API}/api/PartnerCombo`,
      headers: { Authorization: `Bearer ${partnerToken}` },
      body: {
        name: "CY Combo Test",
        description: "Cypress combo test",
        comboPrice: 800000,
        serviceIds,
      },
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.data).to.have.property("id");
      comboId = res.body.data.id;
    });
  });

  it("POST /api/PartnerCombo — combo < 2 services → 400", () => {
    cy.request({
      method: "POST",
      url: `${API}/api/PartnerCombo`,
      headers: { Authorization: `Bearer ${partnerToken}` },
      body: { name: "Bad combo", comboPrice: 100, serviceIds: [serviceIds[0]] },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it("GET /api/PartnerCombo — list chứa combo vừa tạo", () => {
    cy.request({
      url: `${API}/api/PartnerCombo`,
      headers: { Authorization: `Bearer ${partnerToken}` },
    }).then((res) => {
      expect(res.body.success).to.be.true;
      const combos = res.body.data;
      expect(combos).to.be.an("array");
      const found = combos.find((c) => c.id === comboId);
      expect(found).to.exist;
      expect(found.name).to.eq("CY Combo Test");
      expect(found.comboPrice).to.eq(800000);
      expect(found.serviceCount).to.eq(2);
      expect(found.services).to.have.length(2);

      // Verify service fields mapping
      found.services.forEach((s) => {
        expect(s).to.have.property("serviceId");
        expect(s).to.have.property("name");
        expect(s).to.have.property("serviceType");
        expect(s.serviceType).to.be.a("number");
        expect(s).to.have.property("basePrice");
      });
    });
  });

  it("GET /api/PartnerCombo/{id} — detail đầy đủ", () => {
    cy.request({
      url: `${API}/api/PartnerCombo/${comboId}`,
      headers: { Authorization: `Bearer ${partnerToken}` },
    }).then((res) => {
      const d = res.body.data;
      expect(d.name).to.eq("CY Combo Test");
      expect(d.description).to.eq("Cypress combo test");
      expect(d.comboPrice).to.eq(800000);
      expect(d.services).to.have.length(2);
      // Detail should have destinationName
      d.services.forEach((s) => {
        expect(s).to.have.property("destinationName");
        expect(s).to.have.property("description");
      });
    });
  });

  it("GET /api/Combo — public API hiển thị combo active", () => {
    cy.request(`${API}/api/Combo`).then((res) => {
      expect(res.body.success).to.be.true;
      const combos = res.body.data;
      const found = combos.find((c) => c.id === comboId);
      expect(found).to.exist;
      expect(found).to.have.property("partnerName");
      expect(found.partnerName).to.be.a("string").and.not.be.empty;
    });
  });

  it("PUT /api/PartnerCombo/{id} — update name + price, verify persist", () => {
    cy.request({
      method: "PUT",
      url: `${API}/api/PartnerCombo/${comboId}`,
      headers: { Authorization: `Bearer ${partnerToken}` },
      body: { name: "CY Updated Combo", comboPrice: 750000 },
    }).then((res) => {
      expect(res.status).to.eq(200);
    });

    // Verify
    cy.request({
      url: `${API}/api/PartnerCombo/${comboId}`,
      headers: { Authorization: `Bearer ${partnerToken}` },
    }).then((res) => {
      expect(res.body.data.name).to.eq("CY Updated Combo");
      expect(res.body.data.comboPrice).to.eq(750000);
    });
  });

  it("DELETE /api/PartnerCombo/{id} — hard delete, verify biến mất", () => {
    cy.request({
      method: "DELETE",
      url: `${API}/api/PartnerCombo/${comboId}`,
      headers: { Authorization: `Bearer ${partnerToken}` },
    }).then((res) => {
      expect(res.status).to.eq(200);
    });

    // Verify gone from list
    cy.request({
      url: `${API}/api/PartnerCombo`,
      headers: { Authorization: `Bearer ${partnerToken}` },
    }).then((res) => {
      const found = res.body.data.find((c) => c.id === comboId);
      expect(found).to.be.undefined;
    });

    // Verify 404 on detail
    cy.request({
      url: `${API}/api/PartnerCombo/${comboId}`,
      headers: { Authorization: `Bearer ${partnerToken}` },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(404);
    });
  });

  it("Auth: không token → 401", () => {
    cy.request({
      url: `${API}/api/PartnerCombo`,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });
});
