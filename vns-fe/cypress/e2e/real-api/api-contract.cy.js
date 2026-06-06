/// <reference types="cypress" />
/**
 * API Contract Test — Gọi backend thật, verify response fields
 * Bắt lỗi: field name sai, status number vs string, missing fields
 */

const API = Cypress.env("apiUrl") || "http://localhost:5272";

let adminToken, managerToken, partnerToken, userToken;

function futureDate(offsetDays = 14) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function futureDateTime(offsetDays = 14, time = "08:00:00") {
  return `${futureDate(offsetDays)}T${time}`;
}

describe("API Contract Tests — Real Backend", () => {
  before(() => {
    // Login tất cả roles, lấy token thật
    cy.request("POST", `${API}/api/Auth/login`, { email: "admin@vns.vn", password: "Admin@123" })
      .then((res) => { adminToken = res.body.data.token; });
    cy.request("POST", `${API}/api/Auth/login`, { email: "manager@vns.vn", password: "Manager@123" })
      .then((res) => { managerToken = res.body.data.token; });
    cy.request("POST", `${API}/api/Auth/login`, { email: "tuan.le@partner.vn", password: "Partner@123" })
      .then((res) => { partnerToken = res.body.data.token; });
    cy.request("POST", `${API}/api/Auth/login`, { email: "an.nguyen@gmail.com", password: "User@123" })
      .then((res) => { userToken = res.body.data.token; });
  });

  // ========== AUTH ==========
  describe("Auth", () => {
    it("POST /api/Auth/login trả đúng fields", () => {
      cy.request("POST", `${API}/api/Auth/login`, { email: "admin@vns.vn", password: "Admin@123" }).then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.success).to.be.true;
        expect(res.body.data).to.have.property("token");
        expect(res.body.data).to.have.property("user");
        expect(res.body.data.user).to.have.property("id");
        expect(res.body.data.user).to.have.property("fullName");
        expect(res.body.data.user).to.have.property("email");
        expect(res.body.data.user).to.have.property("role");
        expect(res.body.data.user.role).to.be.a("number");
      });
    });

    it("POST /api/Auth/login sai password → 400", () => {
      cy.request({ method: "POST", url: `${API}/api/Auth/login`, body: { email: "admin@vns.vn", password: "wrong" }, failOnStatusCode: false }).then((res) => {
        expect(res.status).to.be.oneOf([400, 401]);
      });
    });
  });

  // ========== SERVICE (Public) ==========
  describe("Service (Public)", () => {
    it("GET /api/Service trả đúng fields", () => {
      cy.request(`${API}/api/Service`).then((res) => {
        expect(res.body.success).to.be.true;
        const items = res.body.data.items || res.body.data;
        expect(items).to.be.an("array").and.have.length.greaterThan(0);
        const svc = items[0];
        // Verify field names khớp với frontend expects
        expect(svc).to.have.property("id");
        expect(svc).to.have.property("name"); // NOT "title"
        expect(svc).to.have.property("serviceType");
        expect(svc.serviceType).to.be.a("number"); // 0, 1
        expect(svc).to.have.property("basePrice");
        expect(svc).to.have.property("thumbnailUrl");
        expect(svc).to.have.property("averageRating");
        expect(svc).to.have.property("totalReviews");
        expect(svc).to.have.property("destinationName"); // NOT "location"
      });
    });

    it("GET /api/Service/{id} trả tour details đầy đủ", () => {
      cy.request(`${API}/api/Service`).then((listRes) => {
        const tour = (listRes.body.data.items || listRes.body.data).find((s) => s.serviceType === 1);
        if (!tour) return; // skip if no tours
        cy.request(`${API}/api/Service/${tour.id}`).then((res) => {
          const d = res.body.data;
          expect(d).to.have.property("tour");
          expect(d).to.have.property("tourPackages");
          expect(d.tourPackages).to.be.an("array").and.have.length.greaterThan(0);

          const pkg = d.tourPackages[0];
          expect(pkg).to.have.property("name");
          expect(pkg).to.have.property("duration");
          expect(pkg).to.have.property("maxParticipants");
          expect(pkg).to.have.property("meetingPoint");
          expect(pkg).to.have.property("pricingTiers");
          expect(pkg.pricingTiers).to.be.an("array");
          expect(pkg).to.have.property("images");
          expect(pkg.images).to.be.an("array");
          expect(pkg).to.have.property("schedules");
          expect(pkg.schedules).to.be.an("array");
          if (pkg.schedules.length > 0) {
            expect(pkg.schedules[0]).to.have.property("startDate");
            expect(pkg.schedules[0]).to.have.property("availableSlots");
          }
          expect(pkg).to.have.property("itineraries");
          if (pkg.itineraries.length > 0) {
            expect(pkg.itineraries[0]).to.have.property("dayNumber");
            expect(pkg.itineraries[0]).to.have.property("title");
            expect(pkg.itineraries[0]).to.have.property("activityType");
          }

          // Legacy fallback should still point to the first package
          expect(d.tour.name).to.eq(pkg.name);
        });
      });
    });

    it("GET /api/Service/{id} trả homestay details đầy đủ", () => {
      cy.request(`${API}/api/Service`).then((listRes) => {
        const hs = (listRes.body.data.items || listRes.body.data).find((s) => s.serviceType === 0);
        if (!hs) return;
        cy.request(`${API}/api/Service/${hs.id}`).then((res) => {
          const d = res.body.data;
          expect(d).to.have.property("homestay");
          expect(d.homestay).to.have.property("checkInTime");
          expect(d.homestay).to.have.property("checkOutTime");
          expect(d.homestay).to.have.property("rooms");
          expect(d.homestay.rooms).to.be.an("array");
          if (d.homestay.rooms.length > 0) {
            expect(d.homestay.rooms[0]).to.have.property("name"); // NOT "roomName"
            expect(d.homestay.rooms[0]).to.have.property("maxGuests"); // NOT "maxOccupancy"
            expect(d.homestay.rooms[0]).to.have.property("quantity"); // NOT "numberOfRooms"
            expect(d.homestay.rooms[0]).to.have.property("basePrice");
            expect(d.homestay.rooms[0]).to.have.property("holidayPrice");
          }
        });
      });
    });
  });

  // ========== BOOKING (User) ==========
  describe("Booking (User)", () => {
    it("GET /api/Booking trả đúng fields — status là number", () => {
      cy.request({ url: `${API}/api/Booking`, headers: { Authorization: `Bearer ${userToken}` } }).then((res) => {
        expect(res.body.success).to.be.true;
        const items = res.body.data.items || res.body.data;
        if (items.length === 0) return;
        const b = items[0];
        expect(b).to.have.property("bookingCode");
        expect(b).to.have.property("serviceName");
        expect(b).to.have.property("status");
        expect(b.status).to.be.a("number"); // Frontend phải map number→string
        expect(b).to.have.property("finalAmount");
        expect(b).to.have.property("numberOfGuests"); // NOT "quantity" or "guests"
        expect(b).to.have.property("checkInDate"); // NOT "startDate"
      });
    });

    it("GET /api/Booking/{id} trả payment nested + details array", () => {
      cy.request({ url: `${API}/api/Booking`, headers: { Authorization: `Bearer ${userToken}` } }).then((listRes) => {
        const items = listRes.body.data.items || listRes.body.data;
        if (items.length === 0) return;
        cy.request({ url: `${API}/api/Booking/${items[0].id}`, headers: { Authorization: `Bearer ${userToken}` } }).then((res) => {
          const d = res.body.data;
          expect(d).to.have.property("payment");
          if (d.payment) {
            expect(d.payment).to.have.property("paymentMethod");
            expect(d.payment.paymentMethod).to.be.a("number"); // NOT string
            expect(d.payment).to.have.property("paidAt"); // NOT "paymentDate"
          }
          expect(d).to.have.property("details");
          expect(d.details).to.be.an("array");
          expect(d).to.have.property("contactName"); // NOT "customerName" in some places
          expect(d).to.have.property("contactPhone");
          expect(d).to.have.property("contactEmail");
          expect(d).to.have.property("specialRequests"); // NOT "notes"
        });
      });
    });
  });

  // ========== PARTNER SERVICE CRUD ==========
  describe("Partner Service CRUD", () => {
    let createdServiceId;

    it("POST /api/PartnerService/tour — tạo tour nhiều package với pricing tiers", () => {
      cy.request(`${API}/api/Destination`).then((destRes) => {
        const destId = (destRes.body.data.items || destRes.body.data)[0].id;
        cy.request({
          method: "POST",
          url: `${API}/api/PartnerService/tour`,
          headers: { Authorization: `Bearer ${partnerToken}` },
          body: {
            name: "CY Test Tour",
            description: "- Cypress test\n- Multi package flow",
            destinationId: destId,
            address: "Hạ Long, Quảng Ninh",
            latitude: 20.95,
            longitude: 107.08,
            packages: [
              {
                name: "Standard package",
                duration: "1 ngày",
                maxParticipants: 10,
                minParticipants: 1,
                meetingPoint: "Tuan Chau Marina",
                cancellationPolicyType: 1,
                cancellationPolicyDescription: "Test policy",
                includes: ["Ăn trưa", "Hướng dẫn viên"],
                excludes: ["Chi tiêu cá nhân"],
                images: [
                  { imageUrl: "https://picsum.photos/seed/cy-tour-standard/800/600", displayOrder: 0, isCover: true },
                ],
                pricingTiers: [
                  { name: "Người lớn", description: "Từ 12 tuổi", unitPrice: 750000, minQuantity: 1, maxQuantity: 10, displayOrder: 0 },
                  { name: "Trẻ em", description: "Từ 5 đến 11 tuổi", unitPrice: 500000, minQuantity: 0, maxQuantity: 5, displayOrder: 1 },
                ],
                sessions: [
                  { startDate: futureDateTime(14, "08:00:00"), endDate: futureDateTime(14, "17:00:00"), availableSlots: 12 },
                ],
                itinerary: [
                  { dayNumber: 1, title: "Đón khách", description: "Đón tại bến cảng", startTime: "08:00:00", location: "Tuan Chau Marina", activityType: "pickup" },
                ],
              },
              {
                name: "Premium package",
                duration: "2 ngày 1 đêm",
                maxParticipants: 6,
                minParticipants: 1,
                meetingPoint: "Tuan Chau Marina",
                cancellationPolicyType: 2,
                cancellationPolicyDescription: "Premium policy",
                includes: ["Cabin riêng", "Ăn tối"],
                excludes: ["Đồ uống"],
                images: [
                  { imageUrl: "https://picsum.photos/seed/cy-tour-premium/800/600", displayOrder: 0, isCover: true },
                ],
                pricingTiers: [
                  { name: "Người lớn", description: "Cabin premium", unitPrice: 1250000, minQuantity: 1, maxQuantity: 6, displayOrder: 0 },
                ],
                sessions: [
                  { startDate: futureDateTime(21, "09:00:00"), endDate: futureDateTime(22, "15:00:00"), availableSlots: 6 },
                ],
                itinerary: [
                  { dayNumber: 1, title: "Nhận cabin", description: "Lên tàu và nhận cabin", startTime: "09:00:00", location: "Tuan Chau Marina", activityType: "pickup" },
                ],
              },
            ],
          },
        }).then((res) => {
          expect(res.status).to.eq(200);
          expect(res.body.data).to.have.property("serviceId");
          createdServiceId = res.body.data.serviceId;
        });
      });
    });

    it("GET /api/PartnerService/{id} — verify tour tạo xong có packages + schedule + itinerary", () => {
      cy.request({
        url: `${API}/api/PartnerService/${createdServiceId}`,
        headers: { Authorization: `Bearer ${partnerToken}` },
      }).then((res) => {
        const d = res.body.data;
        expect(d.name).to.eq("CY Test Tour");
        expect(d.basePrice).to.eq(500000);
        expect(d.tour).to.not.be.null;
        expect(d.tourPackages).to.have.length(2);
        expect(d.tourPackages[0].pricingTiers).to.have.length(2);
        expect(d.tourPackages[0].schedules).to.have.length(1);
        expect(d.tourPackages[0].itineraries).to.have.length(1);
        expect(d.tourPackages[0].itineraries[0].title).to.eq("Đón khách");
        expect(d.tour.name).to.eq("Standard package");
      });
    });

    it("PUT /api/PartnerService/{id} — update name, verify persist", () => {
      cy.request({
        method: "PUT",
        url: `${API}/api/PartnerService/${createdServiceId}`,
        headers: { Authorization: `Bearer ${partnerToken}` },
        body: { name: "CY Updated Tour", basePrice: 800000 },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
      // Verify persist
      cy.request({
        url: `${API}/api/PartnerService/${createdServiceId}`,
        headers: { Authorization: `Bearer ${partnerToken}` },
      }).then((res) => {
        expect(res.body.data.name).to.eq("CY Updated Tour");
        expect(res.body.data.basePrice).to.eq(800000);
      });
    });

    it("DELETE /api/PartnerService/{id} — xóa thật, GET lại phải 404/500", () => {
      cy.request({
        method: "DELETE",
        url: `${API}/api/PartnerService/${createdServiceId}`,
        headers: { Authorization: `Bearer ${partnerToken}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
      });
      // Verify deleted
      cy.request({
        url: `${API}/api/PartnerService/${createdServiceId}`,
        headers: { Authorization: `Bearer ${partnerToken}` },
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([404, 500]); // Service không còn tồn tại
      });
    });
  });

  // ========== VOUCHER CRUD ==========
  describe("Voucher CRUD", () => {
    let voucherId;

    it("POST /api/AdminVoucher — tạo voucher với name", () => {
      cy.request({
        method: "POST",
        url: `${API}/api/AdminVoucher`,
        headers: { Authorization: `Bearer ${managerToken}` },
        body: {
          code: "CYTEST99",
          name: "CY Test Voucher",
          voucherType: 1,
          discountValue: 50000,
          totalQuantity: 100,
          startDate: "2026-04-01T00:00:00",
          endDate: "2026-06-01T00:00:00",
        },
      }).then((res) => {
        expect(res.status).to.eq(200);
        voucherId = res.body.data.id;
      });
    });

    it("GET /api/AdminVoucher — verify name persist (không chỉ Code)", () => {
      cy.request({
        url: `${API}/api/AdminVoucher`,
        headers: { Authorization: `Bearer ${managerToken}` },
      }).then((res) => {
        const items = res.body.data.items;
        const v = items.find((i) => i.code === "CYTEST99");
        expect(v).to.exist;
        expect(v.name).to.eq("CY Test Voucher"); // Bug cũ: name = Code
      });
    });

    it("PUT /api/AdminVoucher/{id} — update name, verify persist", () => {
      cy.request({
        method: "PUT",
        url: `${API}/api/AdminVoucher/${voucherId}`,
        headers: { Authorization: `Bearer ${managerToken}` },
        body: { name: "CY Updated Voucher" },
      }).then((res) => { expect(res.status).to.eq(200); });

      cy.request({
        url: `${API}/api/AdminVoucher`,
        headers: { Authorization: `Bearer ${managerToken}` },
      }).then((res) => {
        const v = res.body.data.items.find((i) => i.id === voucherId);
        expect(v.name).to.eq("CY Updated Voucher");
      });
    });

    it("DELETE /api/AdminVoucher/{id} — hard delete, verify biến mất", () => {
      cy.request({
        method: "DELETE",
        url: `${API}/api/AdminVoucher/${voucherId}`,
        headers: { Authorization: `Bearer ${managerToken}` },
      }).then((res) => { expect(res.status).to.eq(200); });

      cy.request({
        url: `${API}/api/AdminVoucher`,
        headers: { Authorization: `Bearer ${managerToken}` },
      }).then((res) => {
        const v = res.body.data.items.find((i) => i.id === voucherId);
        expect(v).to.be.undefined; // Bug cũ: soft delete → vẫn xuất hiện
      });
    });
  });

  // ========== PARTNER VERIFY (Manager) ==========
  describe("Partner Verification", () => {
    it("PUT /api/AdminPartner/{id}/verify — body phải dùng isApproved, không phải status", () => {
      cy.request({
        url: `${API}/api/AdminPartner/pending`,
        headers: { Authorization: `Bearer ${managerToken}` },
      }).then((res) => {
        const pending = res.body.data.items;
        if (pending.length === 0) return;
        const partnerId = pending[0].id;

        // Gửi đúng body: isApproved
        cy.request({
          method: "PUT",
          url: `${API}/api/AdminPartner/${partnerId}/verify`,
          headers: { Authorization: `Bearer ${managerToken}` },
          body: { isApproved: true },
        }).then((verifyRes) => {
          expect(verifyRes.status).to.eq(200);
          expect(verifyRes.body.message).to.contain("Phê duyệt"); // NOT "Từ chối"
        });
      });
    });
  });

  // ========== PARTNER PROFILE UPDATE ==========
  describe("Partner Profile", () => {
    it("PUT /api/PartnerProfile — update fullName + phoneNumber, verify persist", () => {
      cy.request({
        method: "PUT",
        url: `${API}/api/PartnerProfile`,
        headers: { Authorization: `Bearer ${partnerToken}` },
        body: { fullName: "CY Updated Name", phoneNumber: "0999888777" },
      }).then((res) => { expect(res.status).to.eq(200); });

      cy.request({
        url: `${API}/api/PartnerProfile`,
        headers: { Authorization: `Bearer ${partnerToken}` },
      }).then((res) => {
        // Field name phải là phoneNumber, NOT phone
        expect(res.body.data).to.have.property("phoneNumber");
        expect(res.body.data.phoneNumber).to.eq("0999888777");
      });
    });
  });

  // ========== NOTIFICATION ==========
  describe("Notification fields", () => {
    it("GET /api/Notification — type là number, content (NOT message)", () => {
      cy.request({
        url: `${API}/api/Notification`,
        headers: { Authorization: `Bearer ${userToken}` },
      }).then((res) => {
        const items = res.body.data.items || res.body.data;
        if (items.length === 0) return;
        const n = items[0];
        expect(n).to.have.property("type");
        expect(n.type).to.be.a("number"); // NOT string
        expect(n).to.have.property("content"); // NOT "message"
        expect(n).to.have.property("referenceId"); // NOT "relatedId"
        expect(n).to.have.property("isRead"); // NOT "read"
      });
    });
  });

  // ========== WALLET ==========
  describe("Wallet fields", () => {
    it("GET /api/Wallet/transactions — type là number", () => {
      cy.request({
        url: `${API}/api/Wallet/transactions`,
        headers: { Authorization: `Bearer ${userToken}` },
      }).then((res) => {
        const items = res.body.data.items || res.body.data;
        if (items.length === 0) return;
        const t = items[0];
        expect(t).to.have.property("type");
        expect(t.type).to.be.a("number"); // NOT string like "payment"
        expect(t).to.have.property("description"); // NOT "title"
        expect(t).to.have.property("amount");
      });
    });
  });

  // ========== CHAT ==========
  describe("Chat fields", () => {
    it("GET /api/Chat/conversations — partnerName (NOT partnerBusinessName)", () => {
      cy.request({
        url: `${API}/api/Chat/conversations`,
        headers: { Authorization: `Bearer ${userToken}` },
      }).then((res) => {
        const items = Array.isArray(res.body.data) ? res.body.data : res.body.data.items || [];
        if (items.length === 0) return;
        const c = items[0];
        expect(c).to.have.property("partnerName"); // NOT "partnerBusinessName"
        expect(c).to.have.property("lastMessage"); // NOT "lastMessageContent"
        expect(c).to.have.property("lastMessageAt"); // NOT "updatedAt"
      });
    });
  });

  // ========== DESTINATION ==========
  describe("Destination fields", () => {
    it("GET /api/Destination — imageUrl (NOT thumbnailUrl)", () => {
      cy.request(`${API}/api/Destination`).then((res) => {
        const items = res.body.data.items || res.body.data;
        expect(items.length).to.be.greaterThan(0);
        const d = items[0];
        expect(d).to.have.property("imageUrl"); // NOT "thumbnailUrl" or "image"
        expect(d).to.have.property("province"); // NOT "location"
      });
    });
  });
});
