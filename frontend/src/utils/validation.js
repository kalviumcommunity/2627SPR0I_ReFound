const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  if (!email.trim()) return "Enter your email.";
  if (!EMAIL_RE.test(email.trim())) return "Enter a valid email address.";
  return "";
}

export function validatePassword(password) {
  if (!password) return "Enter a password.";
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Use at least one letter and one number.";
  return "";
}

export function validateLoginForm({ email, password }) {
  return {
    email: validateEmail(email),
    password: password ? "" : "Enter your password.",
  };
}

export function validateSignupForm({ name, studentId, email, password, confirmPassword }) {
  return {
    name: name.trim() ? "" : "Enter your full name.",
    studentId: studentId.trim() ? "" : "Enter your student ID.",
    email: validateEmail(email),
    password: validatePassword(password),
    confirmPassword: !confirmPassword
      ? "Confirm your password."
      : confirmPassword !== password
        ? "Passwords do not match."
        : "",
  };
}

export const hasErrors = (errors) => Object.values(errors).some(Boolean);
