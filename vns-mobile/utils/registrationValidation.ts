import { t } from "@/i18n";

export type RegistrationValues = {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
};

export type RegistrationErrors = Partial<Record<keyof RegistrationValues, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10,11}$/;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

export function isPasswordStrongEnough(password: string) {
  const normalizedPassword = password.normalize("NFKC");

  return (
    normalizedPassword.trim().length > 0 &&
    normalizedPassword.length >= PASSWORD_MIN_LENGTH &&
    normalizedPassword.length <= PASSWORD_MAX_LENGTH
  );
}

export function validateRegistrationValues(values: RegistrationValues): RegistrationErrors {
  const errors: RegistrationErrors = {};
  const normalizedPhone = values.phoneNumber.replace(/\s/g, "");

  if (!values.fullName.trim()) {
    errors.fullName = t("validation.fullNameRequired");
  }

  if (!values.email.trim()) {
    errors.email = t("validation.emailRequired");
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = t("validation.emailInvalid");
  }

  if (!normalizedPhone) {
    errors.phoneNumber = t("validation.phoneRequired");
  } else if (!PHONE_REGEX.test(normalizedPhone)) {
    errors.phoneNumber = t("validation.phoneInvalid");
  }

  if (!values.password) {
    errors.password = t("validation.passwordRequired");
  } else if (!isPasswordStrongEnough(values.password)) {
    errors.password = t("validation.passwordMin");
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = t("validation.confirmRequired");
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = t("validation.confirmMismatch");
  }

  return errors;
}
