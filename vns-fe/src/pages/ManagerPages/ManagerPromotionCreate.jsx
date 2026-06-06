import React, { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Gift, Loader2, Percent, DollarSign, Tag, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { managerService } from "../../services/managerService";

const discountTypeOptions = [
  { value: "PERCENT", label: "Phần trăm", hint: "Giảm theo phần trăm trên toàn bộ đơn đặt chỗ" },
  { value: "FIXED", label: "Số tiền cố định", hint: "Giảm một khoản tiền cố định trên toàn bộ đơn đặt chỗ" },
];

const serviceTypeOptions = [
  { value: "ALL", label: "Tất cả dịch vụ" },
  { value: "TOUR", label: "Tour" },
  { value: "HOMESTAY", label: "Homestay" },
  { value: "COMBO", label: "Combo" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "INACTIVE", label: "Tạm tắt" },
];

const mapServiceTypeToPayload = (value) => {
  switch (value) {
    case "HOMESTAY":
      return 0;
    case "TOUR":
      return 1;
    case "COMBO":
      return 3;
    default:
      return null;
  }
};

const formatMoney = (value) =>
  value ? `${Number(value).toLocaleString("vi-VN")} đ` : "—";

const toIsoStartOfDay = (dateValue) => {
  const date = new Date(`${dateValue}T00:00:00`);
  return date.toISOString();
};

const toIsoEndOfDay = (dateValue) => {
  const date = new Date(`${dateValue}T23:59:59`);
  return date.toISOString();
};

const ManagerPromotionCreate = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    discountType: "PERCENT",
    discountValue: "",
    minOrderValue: "",
    maxDiscountAmount: "",
    usageLimit: "",
    usagePerUser: "",
    applicableServiceType: "ALL",
    startDate: "",
    endDate: "",
    status: "ACTIVE",
  });

  const update = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validationErrors = useMemo(() => {
    const nextErrors = [];
    const code = formData.code.trim();
    const discountValue = Number(formData.discountValue);
    const minOrderValue = formData.minOrderValue === "" ? null : Number(formData.minOrderValue);
    const maxDiscountAmount = formData.maxDiscountAmount === "" ? null : Number(formData.maxDiscountAmount);
    const usageLimit = Number(formData.usageLimit);
    const usagePerUser = formData.usagePerUser === "" ? null : Number(formData.usagePerUser);

    if (!code) nextErrors.push("Mã voucher là bắt buộc.");
    if (code && !/^[A-Z0-9_-]{3,50}$/.test(code)) {
      nextErrors.push("Mã voucher chỉ được chứa chữ in hoa, số, gạch ngang hoặc gạch dưới.");
    }
    if (!formData.name.trim()) nextErrors.push("Tên voucher là bắt buộc.");
    if (!formData.discountValue || Number.isNaN(discountValue) || discountValue <= 0) {
      nextErrors.push("Giá trị giảm phải lớn hơn 0.");
    }
    if (formData.discountType === "PERCENT" && discountValue > 100) {
      nextErrors.push("Giảm theo phần trăm không được vượt quá 100%.");
    }
    if (minOrderValue !== null && (Number.isNaN(minOrderValue) || minOrderValue < 0)) {
      nextErrors.push("Đơn hàng tối thiểu không hợp lệ.");
    }
    if (formData.discountType === "PERCENT" && maxDiscountAmount !== null && (Number.isNaN(maxDiscountAmount) || maxDiscountAmount <= 0)) {
      nextErrors.push("Mức giảm tối đa phải lớn hơn 0 khi dùng phần trăm.");
    }
    if (!formData.usageLimit || Number.isNaN(usageLimit) || usageLimit <= 0) {
      nextErrors.push("Tổng lượt sử dụng phải lớn hơn 0.");
    }
    if (usagePerUser !== null && (Number.isNaN(usagePerUser) || usagePerUser <= 0)) {
      nextErrors.push("Lượt dùng tối đa mỗi khách phải lớn hơn 0 nếu có nhập.");
    }
    if (usagePerUser !== null && usageLimit > 0 && usagePerUser > usageLimit) {
      nextErrors.push("Lượt dùng tối đa mỗi khách không được lớn hơn tổng lượt sử dụng.");
    }
    if (!formData.startDate || !formData.endDate) {
      nextErrors.push("Vui lòng chọn ngày bắt đầu và ngày kết thúc.");
    }
    if (formData.startDate && formData.endDate) {
      const start = new Date(`${formData.startDate}T00:00:00`);
      const end = new Date(`${formData.endDate}T23:59:59`);
      if (start >= end) {
        nextErrors.push("Ngày bắt đầu phải sớm hơn ngày kết thúc.");
      }
    }

    return nextErrors;
  }, [formData]);

  const handleSubmit = async () => {
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setErrors([]);

    const payload = {
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      voucherType: formData.discountType === "PERCENT" ? 0 : 1,
      discountValue: Number(formData.discountValue),
      minOrderAmount: formData.minOrderValue === "" ? null : Number(formData.minOrderValue),
      maxDiscountAmount:
        formData.discountType === "PERCENT" && formData.maxDiscountAmount !== ""
          ? Number(formData.maxDiscountAmount)
          : null,
      totalQuantity: Number(formData.usageLimit),
      userUsageLimit: formData.usagePerUser === "" ? null : Number(formData.usagePerUser),
      applicableServiceType: mapServiceTypeToPayload(formData.applicableServiceType),
      startDate: toIsoStartOfDay(formData.startDate),
      endDate: toIsoEndOfDay(formData.endDate),
      isActive: formData.status === "ACTIVE",
    };

    try {
      await managerService.createVoucher(payload);
      navigate("/ManagerPromotion");
    } catch (err) {
      const apiErrors = err?.response?.data?.errors;
      const apiMessage = err?.response?.data?.message || err?.message || "Tạo voucher thất bại.";
      const detailLines = apiErrors
        ? Object.values(apiErrors).flat().filter(Boolean)
        : [];
      setErrors(detailLines.length ? [apiMessage, ...detailLines] : [apiMessage]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => navigate("/ManagerPromotion")}
            className="rounded-lg p-2 text-[#5a6577] hover:bg-[#edf1f4] hover:text-[#3d4654]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#1a2332]">Tạo voucher</h1>
            <p className="text-sm text-[#5a6577]">
              Voucher áp dụng cho toàn bộ đơn đặt chỗ, không áp dụng theo từng hạng mục riêng lẻ.
            </p>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold">Không thể tạo voucher</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {errors.map((message, index) => (
                <li key={`${message}-${index}`}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-[#e8ecf0] bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-[#e6f5f7] p-2 text-primary">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1a2332]">Thông tin cơ bản</h2>
                  <p className="text-sm text-[#5a6577]">Mã, tên và ghi chú hiển thị cho voucher.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#3d4654]">
                    Mã voucher <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => update("code", e.target.value.toUpperCase())}
                    placeholder="VD: SUMMER10"
                    className="w-full rounded-xl border border-[#e8ecf0] bg-white px-4 py-2.5 font-mono focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#3d4654]">
                    Tên voucher <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="VD: Ưu đãi mùa hè"
                    className="w-full rounded-xl border border-[#e8ecf0] bg-white px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-[#3d4654]">Mô tả</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Mô tả ngắn về điều kiện hoặc chiến dịch của voucher"
                  className="w-full rounded-xl border border-[#e8ecf0] bg-white px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#e8ecf0] bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-[#eef5ff] p-2 text-[#245b95]">
                  <Percent className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1a2332]">Mức giảm và điều kiện</h2>
                  <p className="text-sm text-[#5a6577]">Đây là các điều kiện áp dụng cho toàn bộ booking.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#3d4654]">
                    Loại giảm giá <span className="text-red-500">*</span>
                  </label>
                  <div className="grid gap-3">
                    {discountTypeOptions.map((option) => (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => update("discountType", option.value)}
                        className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                          formData.discountType === option.value
                            ? "border-primary bg-primary/5"
                            : "border-[#e8ecf0] hover:border-[#cfd6dd]"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold text-[#1a2332]">
                          {option.value === "PERCENT" ? (
                            <Percent className="h-4 w-4 text-primary" />
                          ) : (
                            <DollarSign className="h-4 w-4 text-primary" />
                          )}
                          {option.label}
                        </div>
                        <p className="mt-1 text-xs text-[#5a6577]">{option.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[#3d4654]">
                      Giá trị giảm <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={formData.discountType === "PERCENT" ? 100 : undefined}
                      value={formData.discountValue}
                      onChange={(e) => update("discountValue", e.target.value)}
                      placeholder={formData.discountType === "PERCENT" ? "VD: 10" : "VD: 100000"}
                      className="w-full rounded-xl border border-[#e8ecf0] bg-white px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#3d4654]">
                        Đơn hàng tối thiểu
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.minOrderValue}
                        onChange={(e) => update("minOrderValue", e.target.value)}
                        placeholder="Không bắt buộc"
                        className="w-full rounded-xl border border-[#e8ecf0] bg-white px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#3d4654]">
                        Giảm tối đa {formData.discountType === "PERCENT" ? "(tuỳ chọn)" : "(không áp dụng)"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.maxDiscountAmount}
                        onChange={(e) => update("maxDiscountAmount", e.target.value)}
                        placeholder={formData.discountType === "PERCENT" ? "VD: 150000" : "Chỉ dùng cho %"}
                        disabled={formData.discountType !== "PERCENT"}
                        className="w-full rounded-xl border border-[#e8ecf0] bg-white px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-[#f4f6f8] disabled:text-[#8d95a3]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#e8ecf0] bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-[#f6efe7] p-2 text-[#b45309]">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1a2332]">Phạm vi áp dụng</h2>
                  <p className="text-sm text-[#5a6577]">Chọn nhóm dịch vụ mà voucher có thể áp dụng.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#3d4654]">
                    Loại dịch vụ
                  </label>
                  <select
                    value={formData.applicableServiceType}
                    onChange={(e) => update("applicableServiceType", e.target.value)}
                    className="w-full rounded-xl border border-[#e8ecf0] bg-white px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    {serviceTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#3d4654]">
                    Trạng thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => update("status", e.target.value)}
                    className="w-full rounded-xl border border-[#e8ecf0] bg-white px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#e8ecf0] bg-white p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-[#f7f0ff] p-2 text-[#7c3aed]">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#1a2332]">Hiệu lực và giới hạn</h2>
                  <p className="text-sm text-[#5a6577]">Thiết lập thời gian hiệu lực và số lượt dùng.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#3d4654]">
                    Ngày bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => update("startDate", e.target.value)}
                    className="w-full rounded-xl border border-[#e8ecf0] bg-white px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#3d4654]">
                    Ngày kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => update("endDate", e.target.value)}
                    className="w-full rounded-xl border border-[#e8ecf0] bg-white px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#3d4654]">
                    Tổng lượt sử dụng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) => update("usageLimit", e.target.value)}
                    placeholder="VD: 500"
                    className="w-full rounded-xl border border-[#e8ecf0] bg-white px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#3d4654]">
                    Lượt dùng tối đa mỗi khách
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usagePerUser}
                    onChange={(e) => update("usagePerUser", e.target.value)}
                    placeholder="Để trống nếu không giới hạn"
                    className="w-full rounded-xl border border-[#e8ecf0] bg-white px-4 py-2.5 focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-[#e8ecf0] bg-white p-6">
              <h2 className="text-lg font-semibold text-[#1a2332]">Tóm tắt voucher</h2>
              <div className="mt-4 space-y-4 text-sm text-[#5a6577]">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#8d95a3]">Mã voucher</p>
                  <p className="mt-1 font-mono text-base font-semibold text-primary">
                    {formData.code.trim() || "CHƯA_NHẬP"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#8d95a3]">Mức giảm</p>
                  <p className="mt-1 text-[#1a2332]">
                    {formData.discountValue
                      ? formData.discountType === "PERCENT"
                        ? `${formData.discountValue}%`
                        : formatMoney(formData.discountValue)
                      : "—"}
                  </p>
                  {formData.discountType === "PERCENT" && formData.maxDiscountAmount && (
                    <p className="mt-1 text-xs text-[#5a6577]">
                      Giảm tối đa {formatMoney(formData.maxDiscountAmount)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#8d95a3]">Điều kiện</p>
                  <p className="mt-1 text-[#1a2332]">
                    {formData.minOrderValue ? `Đơn tối thiểu ${formatMoney(formData.minOrderValue)}` : "Không yêu cầu đơn tối thiểu"}
                  </p>
                  <p className="mt-1 text-[#1a2332]">
                    {formData.usagePerUser
                      ? `Tối đa ${formData.usagePerUser} lượt mỗi khách`
                      : "Không giới hạn lượt mỗi khách"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[#8d95a3]">Phạm vi</p>
                  <p className="mt-1 text-[#1a2332]">
                    {serviceTypeOptions.find((option) => option.value === formData.applicableServiceType)?.label}
                  </p>
                  <p className="mt-1 text-[#1a2332]">
                    {statusOptions.find((option) => option.value === formData.status)?.label}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#e8ecf0] bg-white p-6">
              <h2 className="text-lg font-semibold text-[#1a2332]">Lưu ý</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#5a6577]">
                <li>Voucher áp dụng cho toàn bộ giá trị booking, không áp dụng theo từng item.</li>
                <li>Voucher phần trăm có thể giới hạn mức giảm tối đa.</li>
                <li>Nếu để trống “Lượt dùng tối đa mỗi khách”, voucher sẽ không giới hạn theo từng người dùng.</li>
                <li>Voucher chỉ có hiệu lực trong khoảng ngày bạn cấu hình.</li>
              </ul>
            </section>
          </aside>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/ManagerPromotion")}
            className="rounded-lg border border-[#e8ecf0] px-5 py-2.5 text-[#3d4654] hover:bg-[#f9fafb]"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            {submitting ? "Đang tạo..." : "Tạo voucher"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagerPromotionCreate;
