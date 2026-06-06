const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10,11}$/;


export function validateRegistrationValues(values, options = {}) {
  const errors = {};
  const normalizedPhone = (values.phoneNumber || "").replace(/\s/g, "");

  if (!values.fullName?.trim()) {
    errors.fullName = "Họ và tên là bắt buộc.";
  }

  if (!values.email?.trim()) {
    errors.email = "Email là bắt buộc.";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Email không hợp lệ.";
  }

  if (!normalizedPhone) {
    errors.phoneNumber = "Số điện thoại là bắt buộc.";
  } else if (!PHONE_REGEX.test(normalizedPhone)) {
    errors.phoneNumber = "Số điện thoại phải gồm 10-11 chữ số.";
  }

  if (!values.password) {
    errors.password = "Mật khẩu là bắt buộc.";
  } else if (values.password.length < 8 || values.password.length > 32) {
    errors.password = "Mật khẩu phải có từ 8 đến 32 ký tự.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Vui lòng xác nhận mật khẩu.";
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Mật khẩu xác nhận không khớp.";
  }

  if (options.requireBusinessName && !values.businessName?.trim()) {
    errors.businessName = "Tên doanh nghiệp là bắt buộc.";
  }

  return errors;
}
