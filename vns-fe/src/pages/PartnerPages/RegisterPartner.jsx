import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  Phone,
  Building,
  Eye,
  EyeOff,
  Check,
  ArrowLeft,
  User,
} from "lucide-react";
import { useToast } from "../../feedback/FeedbackProvider";
import { authService } from "../../services/authService";
import { normalizeError } from "../../utils/normalizeError";
import { validateRegistrationValues } from "../../utils/registrationValidation";

export default function RegisterPartner() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    businessName: "",
  });
  const navigate = useNavigate();
  const toast = useToast();

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({
      ...prev,
      [field]: "",
      submit: "",
    }));
  };

  const validateStep = (step) => {
    const validationErrors = validateRegistrationValues(formData, {
      requireBusinessName: step >= 2,
    });

    const nextErrors = {};

    if (step === 1) {
      nextErrors.fullName = validationErrors.fullName || "";
      nextErrors.email = validationErrors.email || "";
      nextErrors.phoneNumber = validationErrors.phoneNumber || "";
      nextErrors.password = validationErrors.password || "";
      nextErrors.confirmPassword = validationErrors.confirmPassword || "";
    }

    if (step === 2) {
      nextErrors.businessName = validationErrors.businessName || "";
    }

    setErrors((prev) => ({
      ...prev,
      ...nextErrors,
      submit: "",
    }));

    const visibleErrors = Object.values(nextErrors).filter(Boolean);
    if (visibleErrors.length > 0) {
      toast.error("Vui lòng kiểm tra lại các trường được đánh dấu.", {
        details: visibleErrors,
      });
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setLoading(true);

    try {
      await authService.registerPartner({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phoneNumber: formData.phoneNumber.replace(/\s/g, "").trim(),
        businessName: formData.businessName.trim(),
      });

      toast.success("Đăng ký thành công.");
      navigate("/LoginPartner", {
        state: { message: "Đăng ký thành công! Vui lòng đăng nhập." },
      });
    } catch (err) {
      const normalized = normalizeError(err);
      const submitMessage = normalized.details?.[0] || normalized.message || "Đăng ký thất bại, vui lòng thử lại.";
      setErrors((prev) => ({ ...prev, submit: submitMessage }));
      toast.error(submitMessage, {
        title: normalized.title,
        details: normalized.details,
      });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full pl-10 pr-4 py-3 border ${
      errors[field] ? "border-red-500" : "border-gray-200"
    } rounded-xl focus:outline-none focus:border-primary transition-colors`;

  return (
    <div className="min-h-screen bg-bg-light flex items-center justify-center py-8 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Đăng ký đối tác VNS</h1>
          <p className="text-gray-600 text-sm">Đăng ký tài khoản đối tác</p>
        </div>

        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2].map((step, i) => (
              <div key={step} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`w-8 h-1 mr-4 ${
                      currentStep >= step ? "bg-primary" : "bg-gray-200"
                    }`}
                  />
                )}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    currentStep >= step
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {currentStep > step ? <Check className="w-4 h-4" /> : step}
                </div>
              </div>
            ))}
          </div>
        </div>

        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Thông tin tài khoản
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Họ và tên
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  placeholder="Nhập họ và tên"
                  className={inputClass("fullName")}
                />
              </div>
              {errors.fullName && (
                <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Nhập email của bạn"
                  className={inputClass("email")}
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số điện thoại
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  placeholder="Nhập số điện thoại"
                  className={inputClass("phoneNumber")}
                />
              </div>
              {errors.phoneNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  placeholder="Tối thiểu 8 ký tự, có số và ký tự đặc biệt"
                  className={`${inputClass("password")} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className={`${inputClass("confirmPassword")} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 rounded-xl transition-colors"
            >
              Tiếp theo
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <button
                onClick={handleBack}
                className="mr-3 text-gray-600 hover:text-primary"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-gray-800">
                Thông tin doanh nghiệp
              </h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên doanh nghiệp
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange("businessName", e.target.value)}
                  placeholder="Nhập tên doanh nghiệp"
                  className={inputClass("businessName")}
                />
              </div>
              {errors.businessName && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.businessName}
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800">
                <strong>Lưu ý:</strong> Tài khoản đối tác sẽ được xem xét và phê duyệt
                bởi quản lý trước khi sử dụng.
              </p>
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {errors.submit}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Đang đăng ký..." : "Hoàn tất đăng ký"}
            </button>
          </div>
        )}

        <div className="text-center mt-6 space-y-2">
          <a
            href="/LoginPartner"
            className="text-primary hover:underline text-sm"
          >
            Đã có tài khoản? Đăng nhập
          </a>
          <p className="text-xs text-gray-500">
            Cần trợ giúp? Liên hệ với quản trị viên của bạn
          </p>
        </div>
      </div>
    </div>
  );
}
