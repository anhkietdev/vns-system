import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowLeft, Eye, EyeOff, Check } from "lucide-react";
import { authService } from "../../services/authService";

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: email, 2: otp, 3: new password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Email không hợp lệ.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authService.forgotPassword(email);
      setSuccess("Mã OTP đã được gửi đến email của bạn.");
      setStep(2);
    } catch (err) {
      setError(err.message || "Gửi yêu cầu thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError("Vui lòng nhập mã OTP.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authService.verifyOtp(email, otp);
      setSuccess("OTP hợp lệ. Vui lòng đặt mật khẩu mới.");
      setStep(3);
    } catch (err) {
      setError(err.message || "Mã OTP không hợp lệ hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      setError("Vui lòng nhập mật khẩu mới.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authService.resetPassword(email, otp, newPassword);
      navigate("/LoginPartner", {
        state: { message: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập." },
      });
    } catch (err) {
      setError(err.message || "Đặt lại mật khẩu thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ["Nhập email", "Xác minh OTP", "Mật khẩu mới"];

  return (
    <div className="bg-bg-light min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-primary w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Quên mật khẩu
            </h2>
            <p className="text-gray-500 text-sm">
              {step === 1 && "Nhập email để nhận mã OTP"}
              {step === 2 && "Nhập mã OTP được gửi đến email của bạn"}
              {step === 3 && "Tạo mật khẩu mới cho tài khoản"}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8 gap-2">
            {[1, 2, 3].map((s, i) => (
              <div key={s} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`w-6 h-0.5 mx-1 ${
                      step > i ? "bg-primary" : "bg-gray-200"
                    }`}
                  />
                )}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    step > s
                      ? "bg-primary text-white"
                      : step === s
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                </div>
              </div>
            ))}
          </div>

          {/* Step labels */}
          <div className="flex justify-between text-xs text-gray-500 mb-6 px-1">
            {stepLabels.map((label, i) => (
              <span
                key={i}
                className={step === i + 1 ? "text-primary font-medium" : ""}
              >
                {label}
              </span>
            ))}
          </div>

          {success && step !== 1 && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4">
              {success}
            </div>
          )}

          {/* Step 1: Email */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="Nhập email đã đăng ký"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Đang gửi..." : "Gửi mã OTP"}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mã OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    setError("");
                  }}
                  placeholder="Nhập mã OTP từ email"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors bg-gray-50 focus:bg-white text-center text-lg tracking-widest font-mono"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Mã OTP được gửi đến:{" "}
                  <span className="font-medium text-gray-700">{email}</span>
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Đang xác minh..." : "Xác minh OTP"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError("");
                  setSuccess("");
                  setOtp("");
                }}
                className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-primary text-sm py-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Gửi lại OTP
              </button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors bg-gray-50 focus:bg-white"
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
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary transition-colors bg-gray-50 focus:bg-white"
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
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Đang đặt lại..." : "Đặt lại mật khẩu"}
              </button>
            </form>
          )}

          <div className="text-center mt-6">
            <a
              href="/LoginPartner"
              className="text-primary text-sm font-medium hover:underline"
            >
              Quay lại đăng nhập
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
